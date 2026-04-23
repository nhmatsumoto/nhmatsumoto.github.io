from pathlib import Path
from typing import Any
from .constants import ROOT, DEFAULT_SITE, SITE_FIELD_ORDER, STATUS_LABELS
from .utils import (
    load_blog_config, load_toml, parse_datetime, parse_int, slugify, 
    summarize_body, reading_time_minutes, now_local, normalize_string_list,
    localized_field_entries
)


def normalise_site(raw: dict[str, Any]) -> dict[str, str]:
    site = DEFAULT_SITE | raw
    result = {key: str(site.get(key, "") or "") for key in SITE_FIELD_ORDER}
    for key, value in raw.items():
        if key not in result and isinstance(value, str):
            result[key] = value
    return result

def load_site() -> dict[str, str]:
    config = load_blog_config()
    site_path = ROOT / config["build"]["site_file"]
    return normalise_site(load_toml(site_path))

def load_system() -> dict[str, Any]:
    config = load_blog_config()
    system_path = ROOT / config["build"]["system_file"]
    if not system_path.exists():
        return {}
    return load_toml(system_path)


def _localized_string_values(raw: dict[str, Any], fields: list[str]) -> list[str]:
    values: list[str] = []
    for field in fields:
        base = raw.get(field)
        if isinstance(base, str) and base.strip():
            values.append(base)
        for _, value in localized_field_entries(raw, field):
            if isinstance(value, str) and value.strip():
                values.append(value)
    return values


def _has_math_content(values: list[str], config: dict[str, Any]) -> bool:
    inline = config["math"]["inline_delimiter"]
    block = config["math"]["block_delimiter"]
    return any(
        inline in value
        or block in value
        or "\\(" in value
        or "\\[" in value
        or "`am:" in value
        for value in values
    )


def _load_localized_document_bodies(raw: dict[str, Any]) -> dict[str, str]:
    localized_bodies: dict[str, str] = {}

    for suffix, value in localized_field_entries(raw, "body"):
        text = str(value or "")
        if text.strip():
            localized_bodies[f"body_{suffix}"] = text.rstrip() + "\n"

    for suffix, value in localized_field_entries(raw, "source_path"):
        source_relative = str(value or "").strip()
        if not source_relative:
            continue
        source_file = ROOT / source_relative
        if not source_file.exists():
            continue
        localized_bodies[f"body_{suffix}"] = source_file.read_text(encoding="utf-8").rstrip() + "\n"

    return localized_bodies

def normalise_post(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    published_dt = parse_datetime(str(raw.get("published_at", "") or ""))
    updated_dt = parse_datetime(str(raw.get("updated_at", "") or ""))
    post_id = str(raw.get("id", "") or "").strip() or published_dt.strftime("%Y%m%d-%H%M%S")
    title = str(raw.get("title", "") or "").strip()
    if not title:
        title = str(next((value for _, value in localized_field_entries(raw, "title")), "") or "").strip() or "Sem título"
    slug = slugify(str(raw.get("slug", "") or "").strip() or title)
    body = str(raw.get("body", "") or "")
    if not body:
        body = str(next((value for _, value in localized_field_entries(raw, "body")), "") or "")
    summary = str(raw.get("summary", "") or "").strip()
    if not summary:
        summary = str(next((value for _, value in localized_field_entries(raw, "summary")), "") or "").strip() or summarize_body(body)
    status = str(raw.get("status", "") or "draft").strip().lower()
    tags = normalize_string_list(raw.get("tags", []))
    badges = normalize_string_list(raw.get("badges", []))
    has_math = bool(raw.get("has_math", raw.get("has_asciimath", False)))
    output_dir_name = f"{post_id}-{slug}"
    config = load_blog_config()
    publications_dir = config["build"]["publications_dir"]

    res = {
        "id": post_id,
        "slug": slug,
        "kind": "article",
        "category": str(raw.get("category", "") or (tags[0] if tags else "engineering")).strip().lower(),
        "title": title,
        "summary": summary,
        "published_at": published_dt.isoformat(timespec="seconds"),
        "updated_at": updated_dt.isoformat(timespec="seconds"),
        "status": status,
        "tags": tags,
        "badges": badges,
        "repo_url": str(raw.get("repo_url", "") or "").strip(),
        "code_url": str(raw.get("code_url", "") or "").strip(),
        "project_url": str(raw.get("project_url", "") or "").strip(),
        "featured": bool(raw.get("featured", False)),
        "has_math": has_math
        or _has_math_content(_localized_string_values(raw, ["body"]), config),
        "body": body.rstrip() + "\n" if body.strip() else "",
        "published_dt": published_dt,
        "updated_dt": updated_dt,
        "reading_time": reading_time_minutes(body),
        "source_path": source_path,
        "output_dir_name": output_dir_name,
        "url": f"/{publications_dir}/{output_dir_name}/",
        "impact": normalize_string_list(raw.get("impact", [])),
        "trade_offs": normalize_string_list(raw.get("trade_offs", [])),
        "lessons": normalize_string_list(raw.get("lessons", [])),
    }

    # Add localized fields
    for k, v in raw.items():
        if any(k.startswith(p) for p in ["title_", "summary_", "body_"]):
            res[k] = v
    return res

def normalise_daily(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    published_dt = parse_datetime(str(raw.get("published_at", "") or ""))
    updated_dt = parse_datetime(str(raw.get("updated_at", "") or raw.get("published_at", "") or ""))
    daily_id = str(raw.get("id", "") or "").strip() or published_dt.strftime("%Y%m%d-%H%M%S")
    title = str(raw.get("title", "") or "").strip()
    if not title:
        title = str(next((value for _, value in localized_field_entries(raw, "title")), "") or "").strip() or "Nota"
    slug = slugify(str(raw.get("slug", "") or "").strip() or title)
    body = str(raw.get("body", "") or "")
    if not body:
        body = str(next((value for _, value in localized_field_entries(raw, "body")), "") or "")
    summary = str(raw.get("summary", "") or "").strip()
    if not summary:
        summary = str(next((value for _, value in localized_field_entries(raw, "summary")), "") or "").strip() or summarize_body(body, limit=120)
    status = str(raw.get("status", "") or "draft").strip().lower()
    tags = normalize_string_list(raw.get("tags", []))
    mood = str(raw.get("mood", "") or "").strip()
    soundtrack = str(raw.get("soundtrack", "") or "").strip()
    spotify = str(raw.get("spotify", "") or "").strip()
    now_playing = str(raw.get("now_playing", "") or "").strip()
    output_dir_name = f"{daily_id}-{slug}"
    config = load_blog_config()
    daily_output_dir = config["build"].get("daily_output_dir", "daily")

    res = {
        "id": daily_id,
        "slug": slug,
        "kind": "daily",
        "category": "daily",
        "title": title,
        "summary": summary,
        "published_at": published_dt.isoformat(timespec="seconds"),
        "updated_at": updated_dt.isoformat(timespec="seconds"),
        "status": status,
        "tags": tags,
        "body": body.rstrip() + "\n" if body.strip() else "",
        "published_dt": published_dt,
        "updated_dt": updated_dt,
        "reading_time": reading_time_minutes(body),
        "source_path": source_path,
        "output_dir_name": output_dir_name,
        "url": f"/{daily_output_dir}/{output_dir_name}/",
        "mood": mood,
        "soundtrack": soundtrack,
        "spotify": spotify,
        "now_playing": now_playing,
        "has_math": False,
    }

    for k, v in raw.items():
        if any(k.startswith(p) for p in ["title_", "summary_", "body_", "mood_", "soundtrack_", "now_playing_"]):
            res[k] = v
    return res

def normalise_project(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    name = str(raw.get("name", "") or "").strip()
    if not name:
        name = str(next((value for _, value in localized_field_entries(raw, "name")), "") or "").strip() or "Untitled Project"
    slug = slugify(str(raw.get("slug", "") or "").strip() or name)
    status = str(raw.get("status", "") or "research").strip().lower()
    if status not in STATUS_LABELS:
        status = "research"
    
    headline = str(raw.get("headline", "") or "").strip()
    if not headline:
        headline = str(next((value for _, value in localized_field_entries(raw, "headline")), "") or "").strip()

    summary = str(raw.get("summary", "") or "").strip()
    if not summary:
        summary = str(next((value for _, value in localized_field_entries(raw, "summary")), "") or "").strip() or headline

    config = load_blog_config()
    res = {
        "slug": slug,
        "kind": "project",
        "name": name,
        "headline": headline,
        "summary": summary,
        "status": status,
        "status_label": STATUS_LABELS[status],
        "tags": normalize_string_list(raw.get("tags", [])),
        "stack": normalize_string_list(raw.get("stack", [])),
        "badges": normalize_string_list(raw.get("badges", [])),
        "repo_url": str(raw.get("repo_url", "") or "").strip(),
        "code_url": str(raw.get("code_url", "") or "").strip(),
        "docs_url": str(raw.get("docs_url", "") or "").strip(),
        "architecture_url": str(raw.get("architecture_url", "") or "").strip(),
        "featured": bool(raw.get("featured", False)),
        "order": parse_int(raw.get("order", 999)),
        "diagram_preview": str(raw.get("diagram_preview", "") or "").rstrip(),
        "diagram_format": str(raw.get("diagram_format", "") or "").strip().lower(),
        "overview": str(raw.get("overview", "") or "").strip(),
        "problem_solution": str(raw.get("problem_solution", "") or "").strip(),
        "architecture": str(raw.get("architecture", "") or "").strip(),
        "stack_notes": str(raw.get("stack_notes", "") or "").strip(),
        "adr": normalize_string_list(raw.get("adr", [])),
        "roadmap": normalize_string_list(raw.get("roadmap", [])),
        "impact": normalize_string_list(raw.get("impact", [])),
        "trade_offs": normalize_string_list(raw.get("trade_offs", [])),
        "lessons": normalize_string_list(raw.get("lessons", [])),
        "production_notes": str(raw.get("production_notes", "") or "").strip(),
        "source_path": source_path,
        "url": f"/projects/{slug}/",
        "has_math": bool(raw.get("has_math", raw.get("has_asciimath", False)))
        or _has_math_content(_localized_string_values(raw, ["overview", "problem_solution", "architecture", "stack_notes", "production_notes"]), config),
    }

    # Add localized fields
    for k, v in raw.items():
        if any(
            k.startswith(p)
            for p in [
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
            ]
        ):
            res[k] = v
    return res

def normalise_document(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    slug = slugify(str(raw.get("slug", "") or "").strip() or str(raw.get("title", "") or "document"))
    source_relative = str(raw.get("source_path", "") or "").strip()
    body = str(raw.get("body", "") or "")
    localized_bodies = _load_localized_document_bodies(raw)
    if source_relative:
        source_file = ROOT / source_relative
        if source_file.exists():
            body = source_file.read_text(encoding="utf-8")
    if not body:
        body = str(next(iter(localized_bodies.values()), "") or "")
    config = load_blog_config()
    document_bodies = [body, *localized_bodies.values()]

    category = str(raw.get("category", "") or "architecture").strip().lower()
    published_dt = parse_datetime(str(raw.get("published_at", "") or "")) or now_local()
    title = str(raw.get("title", "") or "").strip()
    if not title:
        title = str(next((value for _, value in localized_field_entries(raw, "title")), "") or "").strip() or "Untitled Document"
    summary = str(raw.get("summary", "") or "").strip()
    if not summary:
        summary = str(next((value for _, value in localized_field_entries(raw, "summary")), "") or "").strip() or summarize_body(body)
    res = {
        "slug": slug,
        "kind": "document",
        "title": title,
        "summary": summary,
        "category": category,
        "version": str(raw.get("version", "") or "").strip() or "v1",
        "tags": normalize_string_list(raw.get("tags", [])),
        "agent_generated_tag": bool(raw.get("agent_generated_tag", False)),
        "order": parse_int(raw.get("order", 999)),
        "body": body.rstrip() + "\n" if body.strip() else "",
        "published_dt": published_dt,
        "source_path": source_path,
        "body_source_path": source_relative,
        "url": f"/documents/{slug}/",
        "has_math": bool(raw.get("has_math", raw.get("has_asciimath", False)))
        or _has_math_content([value for value in document_bodies if isinstance(value, str) and value.strip()], config),
    }
    res.update(localized_bodies)

    for k, v in raw.items():
        if any(k.startswith(p) for p in ["title_", "summary_", "body_"]):
            res[k] = v
    return res

def load_posts(include_drafts: bool = False) -> list[dict[str, Any]]:
    from . import postgres_store

    database_posts = postgres_store.load_raw_posts(include_drafts=include_drafts)
    if database_posts is not None:
        posts = [normalise_post(raw, source_path=None) for raw in database_posts]
        return sorted(posts, key=lambda x: x["published_dt"], reverse=True)

    config = load_blog_config()
    posts_dir = ROOT / config["build"]["posts_dir"]
    posts = []
    if posts_dir.exists():
        for path in posts_dir.glob("*.toml"):
            post = normalise_post(load_toml(path), source_path=path)
            if include_drafts or post["status"] == "published":
                posts.append(post)
    return sorted(posts, key=lambda x: x["published_dt"], reverse=True)

def load_daily(include_drafts: bool = False) -> list[dict[str, Any]]:
    config = load_blog_config()
    daily_dir = ROOT / config["build"].get("daily_dir", "content/daily")
    entries = []
    if daily_dir.exists():
        for path in sorted(daily_dir.glob("*.toml")):
            entry = normalise_daily(load_toml(path), source_path=path)
            if include_drafts or entry["status"] == "published":
                entries.append(entry)
    return sorted(entries, key=lambda x: x["published_dt"], reverse=True)

def load_projects() -> list[dict[str, Any]]:
    config = load_blog_config()
    projects_dir = ROOT / config["build"]["projects_dir"]
    projects = []
    if projects_dir.exists():
        for path in sorted(projects_dir.glob("*.toml")):
            projects.append(normalise_project(load_toml(path), source_path=path))
    return sorted(projects, key=lambda x: x["order"])

def load_documents() -> list[dict[str, Any]]:
    config = load_blog_config()
    documents_dir = ROOT / config["build"]["documents_dir"]
    documents = []
    if documents_dir.exists():
        for path in sorted(documents_dir.glob("*.toml")):
            documents.append(normalise_document(load_toml(path), source_path=path))
    return sorted(documents, key=lambda x: x["order"])
