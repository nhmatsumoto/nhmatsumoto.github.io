from __future__ import annotations

import html
import json
import subprocess
from pathlib import Path
from typing import Any

from engine.constants import (
    DOCUMENT_FIELD_ORDER,
    MANAGED_GIT_PATHS,
    POST_FIELD_ORDER,
    PROJECT_FIELD_ORDER,
    ROOT,
    SITE_FIELD_ORDER,
)
from engine.generator import build_site
from engine.i18n import default_locale, load_i18n, locale_suffixes, translate
from engine.loader import (
    load_documents,
    load_posts,
    load_projects,
    load_site,
    normalise_document,
    normalise_post,
    normalise_project,
    normalise_site,
)
from engine.postgres_store import (
    delete_post as delete_database_post,
    ensure_schema,
    load_raw_posts,
    mirror_to_toml_enabled,
    save_post as save_database_post,
    status as database_status,
)
from engine.renderer.components import (
    render_badge_list,
    render_markdown,
    render_stack_list,
    render_status_badge,
    render_tag_list,
)
from engine.utils import load_blog_config, load_toml, now_local, write_text

PROJECT_LOCALIZED_PREFIXES = (
    "name_",
    "headline_",
    "summary_",
    "overview_",
    "problem_solution_",
    "architecture_",
    "stack_notes_",
    "production_notes_",
    "adr_",
    "roadmap_",
    "impact_",
    "trade_offs_",
    "lessons_",
)

DOCUMENT_LOCALIZED_PREFIXES = (
    "title_",
    "summary_",
    "body_",
)


def _format_toml_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, list):
        return "[" + ", ".join(json.dumps(str(item), ensure_ascii=False) for item in value) + "]"
    text = str(value or "")
    if "\n" in text:
        text = text.rstrip()
        if "'''" not in text:
            return "'''\n" + text + "\n'''"
        escaped = text.replace("\\", "\\\\").replace('"""', '\\"""')
        return '"""\n' + escaped + '\n"""'
    return json.dumps(text, ensure_ascii=False)


def _write_toml(path: Path, values: dict[str, Any], field_order: list[str]) -> None:
    keys = [key for key in field_order if key in values]
    keys.extend(sorted(key for key in values if key not in keys and not key.startswith("_")))
    lines = [f"{key} = {_format_toml_value(values[key])}" for key in keys]
    write_text(path, "\n".join(lines).rstrip() + "\n")


def _posts_dir() -> Path:
    config = load_blog_config()
    return ROOT / config["build"]["posts_dir"]


def _projects_dir() -> Path:
    config = load_blog_config()
    return ROOT / config["build"]["projects_dir"]


def _documents_dir() -> Path:
    config = load_blog_config()
    return ROOT / config["build"]["documents_dir"]


def _site_path() -> Path:
    config = load_blog_config()
    return ROOT / config["build"]["site_file"]


def _load_toml_posts(include_drafts: bool = True) -> list[dict[str, Any]]:
    posts_dir = _posts_dir()
    posts: list[dict[str, Any]] = []
    if not posts_dir.exists():
        return posts
    for path in sorted(posts_dir.glob("*.toml")):
        post = normalise_post(load_toml(path), source_path=path)
        if include_drafts or post["status"] == "published":
            posts.append(post)
    return sorted(posts, key=lambda item: item["published_dt"], reverse=True)


def _find_source(items: list[dict[str, Any]], field_name: str, field_value: str) -> Path | None:
    for item in items:
        if str(item.get(field_name, "") or "").strip() != field_value:
            continue
        source_path = item.get("source_path")
        if source_path:
            return Path(source_path)
    return None


def _resolve_root_path(path_value: str) -> Path:
    raw = Path(str(path_value).strip())
    candidate = raw if raw.is_absolute() else ROOT / raw
    resolved = candidate.resolve()
    resolved.relative_to(ROOT.resolve())
    return resolved


def _relative_root_path(path: Path) -> str:
    return path.resolve().relative_to(ROOT.resolve()).as_posix()


def _parse_csv_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if not isinstance(value, str):
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _parse_multiline_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if not isinstance(value, str):
        return []
    return [
        line.strip().removeprefix("-").strip().removeprefix("*").strip()
        for line in value.replace("\r\n", "\n").split("\n")
        if line.strip()
    ]


def _has_content(value: Any) -> bool:
    if isinstance(value, list):
        return any(str(item).strip() for item in value)
    return bool(str(value or "").strip())


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def _supported_locales(i18n: dict[str, Any], site: dict[str, Any]) -> tuple[str, list[str]]:
    base_locale = default_locale(site, i18n)
    locales = list(dict.fromkeys([base_locale, *i18n.get("supported_locales", [])]))
    return base_locale, locales


def _primary_locale_suffix(locale: str, i18n: dict[str, Any]) -> str:
    suffixes = locale_suffixes(locale, i18n)
    return suffixes[0] if suffixes else locale.lower().replace("-", "_")


def _exact_localized_value(
    item: dict[str, Any],
    field: str,
    locale: str,
    i18n: dict[str, Any],
    base_locale: str,
    default: Any,
) -> Any:
    if locale == base_locale:
        return item.get(field, default)
    for suffix in locale_suffixes(locale, i18n):
        key = f"{field}_{suffix}"
        if key in item:
            return item.get(key, default)
    return default


def _post_payload_for_toml(post: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for key in [*POST_FIELD_ORDER, "category", "impact", "trade_offs", "lessons"]:
        if key in post:
            payload[key] = post[key]

    payload["has_math"] = bool(post.get("has_math", post.get("has_asciimath", False)))
    payload.pop("has_asciimath", None)

    for key, value in post.items():
        if key.startswith(("title_", "summary_", "body_")):
            payload[key] = value
    return payload


def _project_payload_for_toml(project: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for key in PROJECT_FIELD_ORDER:
        if key in project:
            payload[key] = project[key]

    payload["has_math"] = bool(project.get("has_math", project.get("has_asciimath", False)))
    payload.pop("has_asciimath", None)

    for key, value in project.items():
        if key.startswith(PROJECT_LOCALIZED_PREFIXES):
            payload[key] = value
    return payload


def _document_payload_for_toml(document: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for key in DOCUMENT_FIELD_ORDER:
        if key in {"source_path", "body"}:
            continue
        if key in document:
            payload[key] = document[key]

    if "published_at" not in payload and document.get("published_dt") is not None:
        payload["published_at"] = document["published_dt"].isoformat(timespec="seconds")

    body_source_path = str(document.get("body_source_path", "") or "").strip()
    if body_source_path:
        payload["source_path"] = body_source_path
    else:
        payload["body"] = str(document.get("body", "") or "")

    payload["has_math"] = bool(document.get("has_math", document.get("has_asciimath", False)))
    payload.pop("has_asciimath", None)

    for key, value in document.items():
        if key.startswith(DOCUMENT_LOCALIZED_PREFIXES):
            payload[key] = value
    return payload


def save_post_to_toml(post: dict[str, Any]) -> dict[str, Any]:
    posts_dir = _posts_dir()
    posts_dir.mkdir(parents=True, exist_ok=True)
    source_path = str(post.get("source_path", "") or "").strip()
    path = Path(source_path) if source_path else _find_source(_load_toml_posts(include_drafts=True), "id", post["id"])
    if path is None:
        path = posts_dir / f"{post['id']}-{post['slug']}.toml"
    _write_toml(path, _post_payload_for_toml(post), POST_FIELD_ORDER)
    return normalise_post(load_toml(path), source_path=path)


def save_project_to_toml(project: dict[str, Any]) -> dict[str, Any]:
    projects_dir = _projects_dir()
    projects_dir.mkdir(parents=True, exist_ok=True)
    source_path = str(project.get("source_path", "") or "").strip()
    path = Path(source_path) if source_path else _find_source(load_projects(), "slug", project["slug"])
    if path is None:
        path = projects_dir / f"{project['slug']}.toml"
    _write_toml(path, _project_payload_for_toml(project), PROJECT_FIELD_ORDER)
    return normalise_project(load_toml(path), source_path=path)


def save_document_to_toml(document: dict[str, Any]) -> dict[str, Any]:
    documents_dir = _documents_dir()
    documents_dir.mkdir(parents=True, exist_ok=True)
    source_path = str(document.get("source_path", "") or "").strip()
    path = Path(source_path) if source_path else _find_source(load_documents(), "slug", document["slug"])
    if path is None:
        path = documents_dir / f"{document['slug']}.toml"

    body_source_path = str(document.get("body_source_path", "") or "").strip()
    if body_source_path:
        source_file = _resolve_root_path(body_source_path)
        source_file.parent.mkdir(parents=True, exist_ok=True)
        body = str(document.get("body", "") or "")
        write_text(source_file, body.rstrip() + ("\n" if body.strip() else ""))
        document["body_source_path"] = _relative_root_path(source_file)

    _write_toml(path, _document_payload_for_toml(document), DOCUMENT_FIELD_ORDER)
    return normalise_document(load_toml(path), source_path=path)


def save_site(payload: dict[str, Any]) -> dict[str, str]:
    current = load_site()
    raw = current | {str(key): str(value or "") for key, value in payload.items()}
    site = normalise_site(raw)
    _write_toml(_site_path(), site, SITE_FIELD_ORDER)
    return load_site()


def _prepare_post_payload(payload: dict[str, Any]) -> dict[str, Any]:
    prepared = dict(payload)
    now = now_local().isoformat(timespec="seconds")
    if not str(prepared.get("published_at", "") or "").strip():
        prepared["published_at"] = now
    prepared["updated_at"] = now

    prepared["tags"] = _parse_csv_list(prepared.get("tags", []))
    prepared["badges"] = _parse_csv_list(prepared.get("badges", []))
    prepared["impact"] = _parse_multiline_list(prepared.get("impact", []))
    prepared["trade_offs"] = _parse_multiline_list(prepared.get("trade_offs", []))
    prepared["lessons"] = _parse_multiline_list(prepared.get("lessons", []))
    prepared["featured"] = bool(prepared.get("featured", False))
    prepared["has_math"] = bool(prepared.get("has_math", prepared.get("has_asciimath", False)))
    return prepared


def _prepare_project_payload(payload: dict[str, Any]) -> dict[str, Any]:
    prepared = dict(payload)
    prepared["status"] = str(prepared.get("status", "") or "published").strip().lower()
    prepared["stack"] = _parse_csv_list(prepared.get("stack", []))
    prepared["badges"] = _parse_csv_list(prepared.get("badges", []))
    prepared["order"] = _safe_int(prepared.get("order", 999), 999)
    prepared["featured"] = bool(prepared.get("featured", False))
    prepared["has_math"] = bool(prepared.get("has_math", prepared.get("has_asciimath", False)))

    for key, value in list(prepared.items()):
        if any(key == field or key.startswith(f"{field}_") for field in ["adr", "roadmap", "impact", "trade_offs", "lessons"]):
            prepared[key] = _parse_multiline_list(value)
    return prepared


def _prepare_document_payload(payload: dict[str, Any]) -> dict[str, Any]:
    prepared = dict(payload)
    now = now_local().isoformat(timespec="seconds")
    if not str(prepared.get("published_at", "") or "").strip():
        prepared["published_at"] = now
    prepared["tags"] = _parse_csv_list(prepared.get("tags", []))
    prepared["order"] = _safe_int(prepared.get("order", 999), 999)
    prepared["agent_generated_tag"] = bool(prepared.get("agent_generated_tag", False))
    prepared["has_math"] = bool(prepared.get("has_math", prepared.get("has_asciimath", False)))
    prepared["body_source_path"] = str(prepared.get("body_source_path", "") or "").strip()
    return prepared


def save_post(payload: dict[str, Any]) -> dict[str, Any]:
    prepared = _prepare_post_payload(payload)
    post = normalise_post(prepared)
    storage = database_status()

    if storage.get("available"):
        i18n = load_i18n()
        site = load_site()
        save_database_post(post, i18n=i18n, default_locale=default_locale(site, i18n))
        if mirror_to_toml_enabled():
            save_post_to_toml(post)
    else:
        post = save_post_to_toml(post)

    return post


def save_project(payload: dict[str, Any]) -> dict[str, Any]:
    prepared = _prepare_project_payload(payload)
    project = normalise_project(prepared, source_path=Path(payload["source_path"]) if payload.get("source_path") else None)
    return save_project_to_toml(project)


def save_document(payload: dict[str, Any]) -> dict[str, Any]:
    prepared = _prepare_document_payload(payload)
    raw = dict(prepared)
    if prepared.get("body_source_path"):
        raw["source_path"] = prepared["body_source_path"]
    else:
        raw.pop("source_path", None)
    document = normalise_document(raw, source_path=Path(payload["source_path"]) if payload.get("source_path") else None)
    document["body_source_path"] = prepared.get("body_source_path", "")
    return save_document_to_toml(document)


def delete_post(post_id: str) -> dict[str, Any]:
    post_id = str(post_id or "").strip()
    if not post_id:
        raise RuntimeError("Post id is required.")

    deleted = False
    storage = database_status()
    if storage.get("available"):
        deleted = delete_database_post(post_id)

    source_path = _find_source(_load_toml_posts(include_drafts=True), "id", post_id)
    if source_path and source_path.exists():
        source_path.unlink()
        deleted = True

    if not deleted:
        raise RuntimeError("Post not found.")
    return {"deleted": True, "id": post_id}


def delete_project(slug: str) -> dict[str, Any]:
    slug = str(slug or "").strip()
    if not slug:
        raise RuntimeError("Project slug is required.")
    source_path = _find_source(load_projects(), "slug", slug)
    if not source_path or not source_path.exists():
        raise RuntimeError("Project not found.")
    source_path.unlink()
    return {"deleted": True, "slug": slug}


def delete_document(slug: str) -> dict[str, Any]:
    slug = str(slug or "").strip()
    if not slug:
        raise RuntimeError("Document slug is required.")
    source_path = _find_source(load_documents(), "slug", slug)
    if not source_path or not source_path.exists():
        raise RuntimeError("Document not found.")
    source_path.unlink()
    return {"deleted": True, "slug": slug}


def import_toml_posts_to_database() -> dict[str, Any]:
    storage = database_status()
    if not storage.get("available"):
        raise RuntimeError(storage.get("message", "PostgreSQL is not available."))
    ensure_schema()
    i18n = load_i18n()
    site = load_site()
    locale = default_locale(site, i18n)
    posts = _load_toml_posts(include_drafts=True)
    for post in posts:
        save_database_post(post, i18n=i18n, default_locale=locale)
    return {"imported": len(posts)}


def export_database_posts_to_toml() -> dict[str, Any]:
    storage = database_status()
    if not storage.get("available"):
        raise RuntimeError(storage.get("message", "PostgreSQL is not available."))
    raw_posts = load_raw_posts(include_drafts=True) or []
    exported = 0
    for raw in raw_posts:
        save_post_to_toml(normalise_post(raw))
        exported += 1
    return {"exported": exported}


def post_to_api(post: dict[str, Any], *, include_content: bool = True) -> dict[str, Any]:
    i18n = load_i18n()
    site = load_site()
    base_locale, supported_locales = _supported_locales(i18n, site)
    payload: dict[str, Any] = {
        "id": post.get("id", ""),
        "slug": post.get("slug", ""),
        "status": post.get("status", "draft"),
        "category": post.get("category", ""),
        "title": post.get("title", ""),
        "summary": post.get("summary", ""),
        "published_at": post.get("published_at", ""),
        "updated_at": post.get("updated_at", ""),
        "tags": post.get("tags", []),
        "badges": post.get("badges", []),
        "repo_url": post.get("repo_url", ""),
        "code_url": post.get("code_url", ""),
        "featured": bool(post.get("featured", False)),
        "has_math": bool(post.get("has_math", False)),
        "has_asciimath": bool(post.get("has_math", False)),
        "url": post.get("url", ""),
        "reading_time": post.get("reading_time", 1),
        "source_path": str(post.get("source_path", "") or ""),
    }

    if include_content:
        payload["body"] = post.get("body", "")
        payload["impact"] = post.get("impact", [])
        payload["trade_offs"] = post.get("trade_offs", [])
        payload["lessons"] = post.get("lessons", [])

    available_locales: list[str] = []
    translations: dict[str, dict[str, Any]] = {}

    for locale in supported_locales:
        title = str(_exact_localized_value(post, "title", locale, i18n, base_locale, "") or "")
        summary = str(_exact_localized_value(post, "summary", locale, i18n, base_locale, "") or "")
        body = str(_exact_localized_value(post, "body", locale, i18n, base_locale, "") or "")
        if title.strip() or summary.strip() or body.strip():
            available_locales.append(locale)
        translations[locale] = {"title": title, "summary": summary}
        if include_content:
            translations[locale]["body"] = body

        suffix = _primary_locale_suffix(locale, i18n)
        payload[f"title_{suffix}"] = title
        payload[f"summary_{suffix}"] = summary
        if include_content:
            payload[f"body_{suffix}"] = body

    for key, value in post.items():
        if key.startswith(("title_", "summary_")) or (include_content and key.startswith("body_")):
            payload[key] = value

    payload["available_locales"] = available_locales
    payload["translations"] = translations
    return payload


def project_to_api(project: dict[str, Any], *, include_content: bool = True) -> dict[str, Any]:
    i18n = load_i18n()
    site = load_site()
    base_locale, supported_locales = _supported_locales(i18n, site)
    localized_fields = [
        "name",
        "headline",
        "summary",
        "overview",
        "problem_solution",
        "architecture",
        "stack_notes",
        "production_notes",
        "adr",
        "roadmap",
        "impact",
        "trade_offs",
        "lessons",
    ]

    payload: dict[str, Any] = {
        "slug": project.get("slug", ""),
        "name": project.get("name", ""),
        "headline": project.get("headline", ""),
        "summary": project.get("summary", ""),
        "status": project.get("status", "published"),
        "stack": project.get("stack", []),
        "badges": project.get("badges", []),
        "repo_url": project.get("repo_url", ""),
        "code_url": project.get("code_url", ""),
        "docs_url": project.get("docs_url", ""),
        "architecture_url": project.get("architecture_url", ""),
        "featured": bool(project.get("featured", False)),
        "order": project.get("order", 999),
        "diagram_preview": project.get("diagram_preview", ""),
        "diagram_format": project.get("diagram_format", ""),
        "has_math": bool(project.get("has_math", False)),
        "source_path": str(project.get("source_path", "") or ""),
        "url": project.get("url", ""),
    }

    if include_content:
        payload["overview"] = project.get("overview", "")
        payload["problem_solution"] = project.get("problem_solution", "")
        payload["architecture"] = project.get("architecture", "")
        payload["stack_notes"] = project.get("stack_notes", "")
        payload["adr"] = project.get("adr", [])
        payload["roadmap"] = project.get("roadmap", [])
        payload["impact"] = project.get("impact", [])
        payload["trade_offs"] = project.get("trade_offs", [])
        payload["lessons"] = project.get("lessons", [])
        payload["production_notes"] = project.get("production_notes", "")

    available_locales: list[str] = []
    translations: dict[str, dict[str, Any]] = {}

    for locale in supported_locales:
        entry: dict[str, Any] = {}
        for field in localized_fields:
            default = [] if field in {"adr", "roadmap", "impact", "trade_offs", "lessons"} else ""
            value = _exact_localized_value(project, field, locale, i18n, base_locale, default)
            entry[field] = value
            suffix = _primary_locale_suffix(locale, i18n)
            if include_content or field in {"name", "headline", "summary"}:
                payload[f"{field}_{suffix}"] = value
        if any(_has_content(value) for value in entry.values()):
            available_locales.append(locale)
        if include_content:
            translations[locale] = entry
        else:
            translations[locale] = {
                "name": entry["name"],
                "headline": entry["headline"],
                "summary": entry["summary"],
            }

    for key, value in project.items():
        if key.startswith(("name_", "headline_", "summary_")) or (include_content and key.startswith(PROJECT_LOCALIZED_PREFIXES)):
            payload[key] = value

    payload["available_locales"] = available_locales
    payload["translations"] = translations
    return payload


def document_to_api(document: dict[str, Any], *, include_content: bool = True) -> dict[str, Any]:
    i18n = load_i18n()
    site = load_site()
    base_locale, supported_locales = _supported_locales(i18n, site)
    payload: dict[str, Any] = {
        "slug": document.get("slug", ""),
        "title": document.get("title", ""),
        "summary": document.get("summary", ""),
        "category": document.get("category", ""),
        "version": document.get("version", "v1"),
        "tags": document.get("tags", []),
        "agent_generated_tag": bool(document.get("agent_generated_tag", False)),
        "order": document.get("order", 999),
        "published_at": document.get("published_dt").isoformat(timespec="seconds") if document.get("published_dt") else "",
        "has_math": bool(document.get("has_math", False)),
        "source_path": str(document.get("source_path", "") or ""),
        "body_source_path": str(document.get("body_source_path", "") or ""),
        "url": document.get("url", ""),
    }

    if include_content:
        payload["body"] = document.get("body", "")

    available_locales: list[str] = []
    translations: dict[str, dict[str, Any]] = {}

    for locale in supported_locales:
        title = str(_exact_localized_value(document, "title", locale, i18n, base_locale, "") or "")
        summary = str(_exact_localized_value(document, "summary", locale, i18n, base_locale, "") or "")
        body = str(_exact_localized_value(document, "body", locale, i18n, base_locale, "") or "")
        if title.strip() or summary.strip() or body.strip():
            available_locales.append(locale)
        translations[locale] = {"title": title, "summary": summary}
        if include_content:
            translations[locale]["body"] = body

        suffix = _primary_locale_suffix(locale, i18n)
        payload[f"title_{suffix}"] = title
        payload[f"summary_{suffix}"] = summary
        if include_content:
            payload[f"body_{suffix}"] = body

    for key, value in document.items():
        if key.startswith(("title_", "summary_")) or (include_content and key.startswith("body_")):
            payload[key] = value

    payload["available_locales"] = available_locales
    payload["translations"] = translations
    return payload


def render_post_preview(post: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    default = str(i18n.get("default_locale", "pt-BR") or "pt-BR")

    def exact(field: str) -> str:
        return str(_exact_localized_value(post, field, locale, i18n, default, "") or "")

    title = exact("title")
    summary = exact("summary")
    body = exact("body")
    tags = render_tag_list(post.get("tags", []))
    badges = render_badge_list(post.get("badges", []))
    if not title.strip() and not summary.strip() and not body.strip():
        body_html = '<p class="empty-preview">Sem conteúdo cadastrado para este idioma.</p>'
    else:
        body_html = render_markdown(body)
    return f"""
    <article class="preview-article preview-article-post">
      <header class="preview-header">
        <p class="section-kicker">{html.escape(locale)}</p>
        <h1>{html.escape(title)}</h1>
        <p class="post-summary">{html.escape(summary)}</p>
        {badges}
        {tags}
      </header>
      <div class="post-body">{body_html}</div>
    </article>
    """


def _build_project_markdown(project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    default = str(i18n.get("default_locale", "pt-BR") or "pt-BR")

    def exact(field: str, default_value: Any) -> Any:
        return _exact_localized_value(project, field, locale, i18n, default, default_value)

    def heading(key: str, fallback: str) -> str:
        return translate(i18n, locale, key, fallback)

    parts: list[str] = []
    overview = str(exact("overview", "") or "").strip()
    if overview:
        parts.append(overview)

    problem_solution = str(exact("problem_solution", "") or "").strip()
    if problem_solution:
        parts.append(f"## {heading('pages.project.problem_solution', 'Problema e solução')}\n\n{problem_solution}")

    architecture = str(exact("architecture", "") or "").strip()
    if architecture:
        parts.append(f"## {heading('pages.project.architecture', 'Arquitetura')}\n\n{architecture}")

    diagram_preview = str(project.get("diagram_preview", "") or "").strip()
    if diagram_preview:
        language = "mermaid" if str(project.get("diagram_format", "") or "").strip().lower() == "mermaid" else ""
        parts.append(f"```{language}\n{diagram_preview}\n```")

    stack_notes = str(exact("stack_notes", "") or "").strip()
    if stack_notes:
        parts.append(f"## {heading('pages.project.stack_notes', 'Stack e tecnologias')}\n\n{stack_notes}")

    for field, key, fallback in [
        ("adr", "pages.project.adr", "ADRs"),
        ("roadmap", "pages.project.roadmap", "Roadmap"),
        ("impact", "pages.project.impact", "Impacto e resultados"),
        ("trade_offs", "pages.project.trade_offs", "Trade-offs e decisões"),
        ("lessons", "pages.project.lessons", "Lições aprendidas"),
    ]:
        values = exact(field, []) or []
        if isinstance(values, str):
            values = _parse_multiline_list(values)
        if values:
            items = "\n".join(f"- {value}" for value in values if str(value).strip())
            parts.append(f"## {heading(key, fallback)}\n\n{items}")

    production_notes = str(exact("production_notes", "") or "").strip()
    if production_notes:
        parts.append(f"## {heading('pages.project.production_notes', 'Notas de produção')}\n\n{production_notes}")

    return "\n\n".join(part for part in parts if part.strip())


def render_project_preview(project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    default = str(i18n.get("default_locale", "pt-BR") or "pt-BR")
    name = str(_exact_localized_value(project, "name", locale, i18n, default, "") or "")
    headline = str(_exact_localized_value(project, "headline", locale, i18n, default, "") or "")
    summary = str(_exact_localized_value(project, "summary", locale, i18n, default, "") or "")
    body = _build_project_markdown(project, i18n, locale)
    body_html = render_markdown(body) if body.strip() else '<p class="empty-preview">Sem conteúdo cadastrado para este idioma.</p>'
    return f"""
    <article class="preview-article preview-article-project">
      <header class="preview-header">
        <p class="section-kicker">{html.escape(locale)}</p>
        <h1>{html.escape(name)}</h1>
        <p class="post-summary">{html.escape(headline or summary)}</p>
        <div class="preview-meta-row">
          {render_status_badge(str(project.get("status", "published") or "published"), i18n, locale)}
          <span class="preview-meta-chip">ordem {html.escape(str(project.get("order", 999)))}</span>
        </div>
        {render_badge_list(project.get("badges", []))}
        {render_stack_list(project.get("stack", []))}
      </header>
      <div class="post-body">{body_html}</div>
    </article>
    """


def render_document_preview(document: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    default = str(i18n.get("default_locale", "pt-BR") or "pt-BR")
    title = str(_exact_localized_value(document, "title", locale, i18n, default, "") or "")
    summary = str(_exact_localized_value(document, "summary", locale, i18n, default, "") or "")
    body = str(_exact_localized_value(document, "body", locale, i18n, default, "") or "")
    body_html = render_markdown(body) if body.strip() else '<p class="empty-preview">Sem conteúdo cadastrado para este idioma.</p>'
    meta_bits = [
        f'<span class="preview-meta-chip">{html.escape(str(document.get("category", "document") or "document"))}</span>',
        f'<span class="preview-meta-chip">{html.escape(str(document.get("version", "v1") or "v1"))}</span>',
    ]
    return f"""
    <article class="preview-article preview-article-document">
      <header class="preview-header">
        <p class="section-kicker">{html.escape(locale)}</p>
        <h1>{html.escape(title)}</h1>
        <p class="post-summary">{html.escape(summary)}</p>
        <div class="preview-meta-row">{''.join(meta_bits)}</div>
        {render_tag_list(document.get("tags", []))}
      </header>
      <div class="post-body">{body_html}</div>
    </article>
    """


def git_status() -> dict[str, list[str]]:
    result = subprocess.run(
        ["git", "status", "--short"],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    full = [line for line in result.stdout.splitlines() if line.strip()]
    managed = tuple(f"{path.rstrip('/')}/" for path in MANAGED_GIT_PATHS)
    managed_names = {path.rstrip("/") for path in MANAGED_GIT_PATHS}
    scoped: list[str] = []
    for line in full:
        path = line[3:].split(" -> ")[-1].strip()
        if path in managed_names or path.startswith(managed):
            scoped.append(line)
    return {"scoped": scoped, "full": full}


def publish_changes(message: str, push: bool = False) -> dict[str, Any]:
    build = build_site()
    subprocess.run(["git", "add", "--", *MANAGED_GIT_PATHS], cwd=ROOT, check=True)
    diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT, check=False)
    if diff.returncode == 0:
        return {"committed": False, "pushed": False, "message": "No blog changes to publish.", "build": build}

    subprocess.run(["git", "commit", "-m", message or "publish: update blog"], cwd=ROOT, check=True)
    pushed = False
    if push:
        subprocess.run(["git", "push"], cwd=ROOT, check=True)
        pushed = True
    return {"committed": True, "pushed": pushed, "message": "Published.", "build": build}
