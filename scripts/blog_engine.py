from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
import tomllib
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "blog.toml"

DEFAULT_BUILD_CONFIG = {
    "site_file": "content/site.toml",
    "system_file": "content/system.toml",
    "i18n_file": "content/i18n.toml",
    "posts_dir": "content/posts",
    "projects_dir": "content/projects",
    "documents_dir": "content/documents",
    "publications_dir": "publications",
    "projects_output_dir": "projects",
    "documents_output_dir": "documents",
    "home_file": "index.html",
    "archive_file": "publications/index.html",
    "project_index_file": "projects/index.html",
    "documents_index_file": "documents/index.html",
    "about_file": "about/index.html",
    "search_index_file": "assets/search-index.json",
    "i18n_asset_file": "assets/i18n.json",
    "posts_on_home": 6,
    "projects_on_home": 3,
    "documents_on_home": 4,
}

DEFAULT_MATH_CONFIG = {
    "enabled": True,
    "script_url": "https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js",
    "inline_delimiter": "%%",
    "block_delimiter": "%%%",
}

DEFAULT_SITE = {
    "title": "Meu Blog",
    "headline": "Vida prática, software e tecnologia.",
    "description": "Blog estático gerado localmente.",
    "language": "pt-BR",
    "author": "Autor",
    "base_url": "",
    "github_url": "",
    "linkedin_url": "",
    "home_title": "Publicações recentes",
    "home_intro": "",
    "about": "",
    "footer_note": "",
}

DEFAULT_I18N = {
    "default_locale": "pt-BR",
    "supported_locales": ["pt-BR", "pt-PT", "ja-JP"],
    "language_names": {
        "pt-BR": "Português (Brasil)",
        "pt-PT": "Português",
        "ja-JP": "日本語",
    },
    "aliases": {
        "pt": "pt-PT",
        "pt-br": "pt-BR",
        "pt-pt": "pt-PT",
        "ja": "ja-JP",
        "ja-jp": "ja-JP",
    },
    "timezones": {},
    "strings": {},
}

SITE_FIELD_ORDER = [
    "title",
    "headline",
    "description",
    "language",
    "author",
    "base_url",
    "github_url",
    "linkedin_url",
    "home_title",
    "home_intro",
    "about",
    "footer_note",
]

POST_FIELD_ORDER = [
    "id",
    "slug",
    "title",
    "summary",
    "published_at",
    "updated_at",
    "status",
    "tags",
    "badges",
    "repo_url",
    "code_url",
    "featured",
    "has_asciimath",
    "body",
]

MANAGED_GIT_PATHS = [
    ".github",
    ".gitignore",
    "README.md",
    "about",
    "assets",
    "blog.toml",
    "content",
    "documents",
    "editor",
    "index.html",
    "plans",
    "projects",
    "publications",
    "scripts",
]

UNORDERED_LIST_RE = re.compile(r"^[-*]\s+(?P<content>.+)$")
ORDERED_LIST_RE = re.compile(r"^\d+\.\s+(?P<content>.+)$")
HEADING_RE = re.compile(r"^(#{1,6})\s+(?P<content>.+)$")
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
STRONG_RE = re.compile(r"\*\*(.+?)\*\*")
EMPHASIS_RE = re.compile(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)")

MONTHS_PT = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
]

MONTHS_SHORT_PT = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
]

STATUS_LABELS = {
    "research": "research",
    "in_progress": "in progress",
    "production": "production",
}


def now_local() -> datetime:
    return datetime.now().astimezone()


def load_toml(path: Path) -> dict[str, Any]:
    with path.open("rb") as handle:
        return tomllib.load(handle)


def load_blog_config() -> dict[str, dict[str, Any]]:
    raw = load_toml(CONFIG_PATH)
    build = DEFAULT_BUILD_CONFIG | raw.get("build", {})
    math = DEFAULT_MATH_CONFIG | raw.get("math", {})
    return {"build": build, "math": math}


def normalize_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return []


def normalise_site(raw: dict[str, Any]) -> dict[str, str]:
    site = DEFAULT_SITE | raw
    return {key: str(site.get(key, "") or "") for key in SITE_FIELD_ORDER}


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


def load_i18n() -> dict[str, Any]:
    config = load_blog_config()
    i18n_path = ROOT / config["build"]["i18n_file"]
    if not i18n_path.exists():
        return DEFAULT_I18N.copy()

    raw = load_toml(i18n_path)
    supported_locales = normalize_string_list(raw.get("supported_locales", [])) or list(DEFAULT_I18N["supported_locales"])
    default_locale = str(raw.get("default_locale", "") or DEFAULT_I18N["default_locale"])
    if default_locale not in supported_locales:
        supported_locales.insert(0, default_locale)

    language_names = {
        str(key): str(value)
        for key, value in (DEFAULT_I18N["language_names"] | raw.get("language_names", {})).items()
    }
    aliases = {
        str(key).strip().lower(): str(value).strip()
        for key, value in (DEFAULT_I18N["aliases"] | raw.get("aliases", {})).items()
    }
    timezones = {str(key): str(value) for key, value in raw.get("timezones", {}).items()}

    return {
        "default_locale": default_locale,
        "supported_locales": supported_locales,
        "language_names": language_names,
        "aliases": aliases,
        "timezones": timezones,
        "strings": raw.get("strings", {}),
    }


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_datetime(value: str | None) -> datetime:
    if not value:
        return now_local()

    cleaned = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        return now_local()

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=now_local().tzinfo)
    return parsed


def parse_int(value: Any, default: int = 0) -> int:
    if isinstance(value, int):
        return value
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def default_locale(site: dict[str, str], i18n: dict[str, Any]) -> str:
    language = str(site.get("language", "") or "").strip()
    supported = i18n.get("supported_locales", [])
    if language and language in supported:
        return language
    configured_default = str(i18n.get("default_locale", "") or "").strip()
    if configured_default in supported:
        return configured_default
    return supported[0] if supported else DEFAULT_I18N["default_locale"]


def translate(i18n: dict[str, Any], locale: str, key: str, fallback: str = "") -> str:
    if not key:
        return fallback

    path = [part for part in key.split(".") if part]

    def lookup(target_locale: str) -> str | None:
        node: Any = i18n.get("strings", {}).get(target_locale, {})
        for part in path:
            if not isinstance(node, dict) or part not in node:
                return None
            node = node[part]
        return str(node) if node is not None else None

    resolved = lookup(locale)
    if resolved is not None:
        return resolved

    configured_default = str(i18n.get("default_locale", "") or DEFAULT_I18N["default_locale"])
    resolved = lookup(configured_default)
    if resolved is not None:
        return resolved

    return fallback


def format_long_date(value: datetime) -> str:
    return f"{value.day} de {MONTHS_PT[value.month - 1]} de {value.year}"


def format_short_date(value: datetime) -> str:
    return f"{value.day:02d} {MONTHS_SHORT_PT[value.month - 1]} {value.year}"


def format_long_date_for_locale(value: datetime, locale: str) -> str:
    if locale == "ja-JP":
        return f"{value.year}年{value.month}月{value.day}日"
    return format_long_date(value)


def format_short_date_for_locale(value: datetime, locale: str) -> str:
    if locale == "ja-JP":
        return f"{value.year}/{value.month:02d}/{value.day:02d}"
    return format_short_date(value)


def make_post_id(dt: datetime | None = None) -> str:
    stamp = dt or now_local()
    return stamp.strftime("%Y%m%d-%H%M%S")


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only.lower()).strip("-")
    return slug or "item"


def plain_text_from_markdown(text: str) -> str:
    plain = text
    plain = re.sub(r"```.*?```", " ", plain, flags=re.DOTALL)
    plain = re.sub(r"`([^`]+)`", r"\1", plain)
    plain = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", plain)
    plain = re.sub(r"[#>*_\-\[\]]", " ", plain)
    plain = re.sub(r"\s+", " ", plain)
    return plain.strip()


def summarize_body(body: str, limit: int = 180) -> str:
    plain = plain_text_from_markdown(body)
    if len(plain) <= limit:
        return plain
    return plain[: limit - 1].rstrip() + "…"


def reading_time_minutes(text: str) -> int:
    words = len(plain_text_from_markdown(text).split())
    return max(1, round(words / 220)) if words else 1


def find_post_file(post_id: str) -> Path | None:
    posts_dir = ROOT / load_blog_config()["build"]["posts_dir"]
    matches = sorted(posts_dir.glob(f"{post_id}-*.toml"))
    return matches[0] if matches else None


def resolve_url(site: dict[str, str], url: str) -> str:
    clean_url = str(url or "").strip()
    if not clean_url:
        return ""
    if clean_url.startswith(("http://", "https://", "mailto:", "#")):
        return clean_url
    return site_href(site, clean_url if clean_url.startswith("/") else f"/{clean_url}")


def resolve_optional_url(site: dict[str, str], url: str) -> str:
    return resolve_url(site, url) if str(url or "").strip() else ""


def normalise_post(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    published_dt = parse_datetime(str(raw.get("published_at", "") or ""))
    updated_dt = parse_datetime(str(raw.get("updated_at", "") or ""))
    post_id = str(raw.get("id", "") or "").strip() or make_post_id(published_dt)
    title = str(raw.get("title", "") or "").strip() or "Sem título"
    slug = slugify(str(raw.get("slug", "") or "").strip() or title)
    body = str(raw.get("body", "") or "")
    summary = str(raw.get("summary", "") or "").strip() or summarize_body(body)
    status = str(raw.get("status", "") or "draft").strip().lower()
    tags = normalize_string_list(raw.get("tags", []))
    badges = normalize_string_list(raw.get("badges", []))
    has_asciimath = bool(raw.get("has_asciimath", False))
    output_dir_name = f"{post_id}-{slug}"
    config = load_blog_config()
    publications_dir = config["build"]["publications_dir"]

    return {
        "id": post_id,
        "slug": slug,
        "title": title,
        "summary": summary,
        "published_at": published_dt.isoformat(timespec="seconds"),
        "updated_at": updated_dt.isoformat(timespec="seconds"),
        "status": status,
        "tags": tags,
        "badges": badges,
        "repo_url": str(raw.get("repo_url", "") or "").strip(),
        "code_url": str(raw.get("code_url", "") or "").strip(),
        "featured": bool(raw.get("featured", False)),
        "has_asciimath": has_asciimath
        or config["math"]["inline_delimiter"] in body
        or config["math"]["block_delimiter"] in body,
        "body": body.rstrip() + "\n" if body.strip() else "",
        "published_dt": published_dt,
        "updated_dt": updated_dt,
        "reading_time": reading_time_minutes(body),
        "source_path": source_path,
        "output_dir_name": output_dir_name,
        "url": f"/{publications_dir}/{output_dir_name}/",
    }


def normalise_project(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    name = str(raw.get("name", "") or "").strip() or "Untitled Project"
    slug = slugify(str(raw.get("slug", "") or "").strip() or name)
    status = str(raw.get("status", "") or "research").strip().lower()
    if status not in STATUS_LABELS:
        status = "research"

    return {
        "slug": slug,
        "name": name,
        "headline": str(raw.get("headline", "") or "").strip(),
        "summary": str(raw.get("summary", "") or "").strip(),
        "status": status,
        "status_label": STATUS_LABELS[status],
        "stack": normalize_string_list(raw.get("stack", [])),
        "badges": normalize_string_list(raw.get("badges", [])),
        "repo_url": str(raw.get("repo_url", "") or "").strip(),
        "code_url": str(raw.get("code_url", "") or "").strip(),
        "docs_url": str(raw.get("docs_url", "") or "").strip(),
        "architecture_url": str(raw.get("architecture_url", "") or "").strip(),
        "featured": bool(raw.get("featured", False)),
        "order": parse_int(raw.get("order", 999)),
        "diagram_preview": str(raw.get("diagram_preview", "") or "").rstrip(),
        "overview": str(raw.get("overview", "") or "").strip(),
        "problem_solution": str(raw.get("problem_solution", "") or "").strip(),
        "architecture": str(raw.get("architecture", "") or "").strip(),
        "stack_notes": str(raw.get("stack_notes", "") or "").strip(),
        "adr": normalize_string_list(raw.get("adr", [])),
        "roadmap": normalize_string_list(raw.get("roadmap", [])),
        "source_path": source_path,
        "url": f"/projects/{slug}/",
    }


def normalise_document(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    slug = slugify(str(raw.get("slug", "") or "").strip() or str(raw.get("title", "") or "document"))
    source_relative = str(raw.get("source_path", "") or "").strip()
    body = str(raw.get("body", "") or "")
    if source_relative:
        source_file = ROOT / source_relative
        if source_file.exists():
            body = source_file.read_text(encoding="utf-8")

    category = str(raw.get("category", "") or "architecture").strip().lower()
    return {
        "slug": slug,
        "title": str(raw.get("title", "") or "").strip() or "Untitled Document",
        "summary": str(raw.get("summary", "") or "").strip() or summarize_body(body),
        "category": category,
        "version": str(raw.get("version", "") or "").strip() or "v1",
        "tags": normalize_string_list(raw.get("tags", [])),
        "agent_generated_tag": bool(raw.get("agent_generated_tag", False)),
        "order": parse_int(raw.get("order", 999)),
        "body": body.rstrip() + "\n" if body.strip() else "",
        "source_path": source_path,
        "url": f"/documents/{slug}/",
    }


def load_posts(include_drafts: bool = True) -> list[dict[str, Any]]:
    posts_dir = ROOT / load_blog_config()["build"]["posts_dir"]
    posts_dir.mkdir(parents=True, exist_ok=True)

    posts: list[dict[str, Any]] = []
    for path in sorted(posts_dir.glob("*.toml")):
        post = normalise_post(load_toml(path), source_path=path)
        if include_drafts or post["status"] == "published":
            posts.append(post)

    posts.sort(
        key=lambda item: (item["featured"], item["published_dt"], item["id"]),
        reverse=True,
    )
    return posts


def load_projects() -> list[dict[str, Any]]:
    projects_dir = ROOT / load_blog_config()["build"]["projects_dir"]
    projects_dir.mkdir(parents=True, exist_ok=True)

    projects = [normalise_project(load_toml(path), source_path=path) for path in sorted(projects_dir.glob("*.toml"))]
    projects.sort(key=lambda item: (not item["featured"], item["order"], item["name"].lower()))
    return projects


def load_documents() -> list[dict[str, Any]]:
    documents_dir = ROOT / load_blog_config()["build"]["documents_dir"]
    documents_dir.mkdir(parents=True, exist_ok=True)

    documents = [normalise_document(load_toml(path), source_path=path) for path in sorted(documents_dir.glob("*.toml"))]
    documents.sort(key=lambda item: (item["category"], item["order"], item["title"].lower()))
    return documents


def toml_quote(value: str) -> str:
    if "\n" in value:
        escaped = value.replace("\\", "\\\\").replace('"""', '\\"""')
        return f'"""\n{escaped.rstrip()}\n"""'
    return json.dumps(value, ensure_ascii=False)


def toml_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, list):
        items = ", ".join(json.dumps(str(item), ensure_ascii=False) for item in value)
        return f"[{items}]"
    return toml_quote(str(value))


def render_toml_document(data: dict[str, Any], field_order: list[str]) -> str:
    lines: list[str] = []
    for key in field_order:
        if key not in data:
            continue
        lines.append(f"{key} = {toml_value(data[key])}")
        if key in {"featured", "has_asciimath"}:
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def save_site(site_data: dict[str, Any]) -> dict[str, str]:
    site = normalise_site(site_data)
    site_path = ROOT / load_blog_config()["build"]["site_file"]
    write_text(site_path, render_toml_document(site, SITE_FIELD_ORDER))
    return site


def save_post(post_data: dict[str, Any]) -> dict[str, Any]:
    incoming = dict(post_data)
    now_iso = now_local().isoformat(timespec="seconds")
    if not str(incoming.get("published_at", "") or "").strip():
        incoming["published_at"] = now_iso
    incoming["updated_at"] = now_iso

    post = normalise_post(incoming)
    posts_dir = ROOT / load_blog_config()["build"]["posts_dir"]
    posts_dir.mkdir(parents=True, exist_ok=True)

    destination = posts_dir / f"{post['id']}-{post['slug']}.toml"
    existing = find_post_file(post["id"])
    write_text(
        destination,
        render_toml_document({key: post[key] for key in POST_FIELD_ORDER}, POST_FIELD_ORDER),
    )

    if existing and existing != destination and existing.exists():
        existing.unlink()

    return normalise_post(load_toml(destination), source_path=destination)


def post_to_api(post: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in post.items()
        if key
        not in {
            "published_dt",
            "updated_dt",
            "source_path",
            "output_dir_name",
            "resolved_url",
        }
    }


def is_special_block_start(stripped: str) -> bool:
    return bool(
        stripped == "---"
        or stripped.startswith("```")
        or stripped.startswith(">")
        or HEADING_RE.match(stripped)
        or UNORDERED_LIST_RE.match(stripped)
        or ORDERED_LIST_RE.match(stripped)
    )


def render_inline(text: str) -> str:
    placeholders: dict[str, str] = {}

    def stash_code(match: re.Match[str]) -> str:
        token = f"__CODE_{len(placeholders)}__"
        placeholders[token] = f"<code>{html.escape(match.group(1))}</code>"
        return token

    text_with_tokens = INLINE_CODE_RE.sub(stash_code, text)
    escaped = html.escape(text_with_tokens)
    
    # Image support: ![alt](url)
    escaped = re.sub(
        r"!\[([^\]]*)\]\(([^)]+)\)",
        lambda match: (
            f'<figure class="kg-image-card">'
            f'<img src="{html.escape(html.unescape(match.group(2)), quote=True)}" alt="{html.escape(match.group(1), quote=True)}">'
            f'{f"<figcaption>{html.escape(match.group(1))}</figcaption>" if match.group(1) else ""}'
            f"</figure>"
        ),
        escaped,
    )

    escaped = LINK_RE.sub(
        lambda match: (
            f'<a href="{html.escape(html.unescape(match.group(2)), quote=True)}">'
            f"{match.group(1)}</a>"
        ),
        escaped,
    )
    escaped = STRONG_RE.sub(r"<strong>\1</strong>", escaped)
    escaped = EMPHASIS_RE.sub(r"<em>\1</em>", escaped)

    for token, replacement in placeholders.items():
        escaped = escaped.replace(token, replacement)

    return escaped


def collect_list(lines: list[str], start_index: int, ordered: bool) -> tuple[str, int]:
    pattern = ORDERED_LIST_RE if ordered else UNORDERED_LIST_RE
    items: list[str] = []
    index = start_index

    while index < len(lines):
        stripped = lines[index].strip()
        match = pattern.match(stripped)
        if not match:
            break

        item_lines = [match.group("content")]
        index += 1

        while index < len(lines):
            next_line = lines[index]
            next_stripped = next_line.strip()
            if not next_stripped:
                break
            if is_special_block_start(next_stripped):
                break
            if next_line.startswith(("  ", "\t")):
                item_lines.append(next_stripped)
                index += 1
                continue
            break

        items.append(" ".join(item_lines))
        if index < len(lines) and not lines[index].strip():
            index += 1
            break

    tag = "ol" if ordered else "ul"
    content = "".join(f"<li>{render_inline(item)}</li>" for item in items)
    return f"<{tag}>{content}</{tag}>", index


def render_markdown(text: str) -> str:
    lines = text.replace("\r\n", "\n").split("\n")
    parts: list[str] = []
    index = 0

    while index < len(lines):
        stripped = lines[index].strip()

        if not stripped:
            index += 1
            continue

        if stripped.startswith("```"):
            language = stripped[3:].strip()
            code_lines: list[str] = []
            index += 1

            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(lines[index])
                index += 1

            if index < len(lines):
                index += 1

            if language == "mermaid":
                parts.append(f'<div class="mermaid">{"".join(code_lines)}</div>')
            else:
                class_attr = f' class="language-{html.escape(language)}"' if language else ""
                code_block = html.escape("\n".join(code_lines))
                parts.append(f"<pre><code{class_attr}>{code_block}</code></pre>")
            continue

        heading = HEADING_RE.match(stripped)
        if heading:
            level = len(heading.group(1))
            parts.append(f"<h{level}>{render_inline(heading.group('content'))}</h{level}>")
            index += 1
            continue

        if stripped == "---":
            parts.append("<hr>")
            index += 1
            continue

        if stripped.startswith(">"):
            quote_lines: list[str] = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                quote_lines.append(lines[index].strip()[1:].lstrip())
                index += 1
            parts.append(f"<blockquote>{render_markdown(chr(10).join(quote_lines))}</blockquote>")
            continue

        if UNORDERED_LIST_RE.match(stripped):
            rendered_list, index = collect_list(lines, index, ordered=False)
            parts.append(rendered_list)
            continue

        if ORDERED_LIST_RE.match(stripped):
            rendered_list, index = collect_list(lines, index, ordered=True)
            parts.append(rendered_list)
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            next_stripped = lines[index].strip()
            if not next_stripped or is_special_block_start(next_stripped):
                break
            paragraph_lines.append(next_stripped)
            index += 1

        parts.append(f"<p>{render_inline(' '.join(paragraph_lines))}</p>")

    return "\n".join(parts)


def render_markdown_or_empty(text: str, i18n: dict[str, Any], locale: str) -> str:
    if text.strip():
        return render_markdown(text)
    return f'<p data-i18n="common.content_in_preparation">{html.escape(translate(i18n, locale, "common.content_in_preparation", "Conteúdo em preparação."))}</p>'


def render_i18n_text(tag: str, key: str, text: str, attrs: str = "") -> str:
    return f'<{tag} data-i18n="{html.escape(key, quote=True)}"{attrs}>{html.escape(text)}</{tag}>'


def render_localized_date(value: datetime, locale: str, style: str = "long") -> str:
    if style == "short":
        label = format_short_date_for_locale(value, locale)
    else:
        label = format_long_date_for_locale(value, locale)
    return (
        f'<time datetime="{html.escape(value.isoformat(timespec="seconds"), quote=True)}" '
        f'data-localize-date="{html.escape(style, quote=True)}">{html.escape(label)}</time>'
    )


def reading_time_label(minutes: int, i18n: dict[str, Any], locale: str) -> str:
    template = translate(i18n, locale, "templates.reading_time", "{minutes} min read")
    return template.replace("{minutes}", str(minutes))


def render_reading_time(minutes: int, i18n: dict[str, Any], locale: str) -> str:
    return f'<span data-reading-time="{minutes}">{html.escape(reading_time_label(minutes, i18n, locale))}</span>'


def render_tag_list(tags: list[str], class_name: str = "tag-list") -> str:
    if not tags:
        return ""
    items = "".join(f"<li>{html.escape(tag)}</li>" for tag in tags)
    return f'<ul class="{class_name}">{items}</ul>'


def render_badge_list(items: list[str]) -> str:
    if not items:
        return ""
    badges = "".join(f'<li class="badge">{html.escape(item)}</li>' for item in items)
    return f'<ul class="badge-list">{badges}</ul>'


def render_stack_list(items: list[str]) -> str:
    if not items:
        return ""
    chips = "".join(f"<li>{html.escape(item)}</li>" for item in items)
    return f'<ul class="stack-list">{chips}</ul>'


def render_status_badge(status: str, i18n: dict[str, Any], locale: str) -> str:
    fallback = STATUS_LABELS.get(status, status.replace("_", " "))
    label = translate(i18n, locale, f"status.{status}", fallback)
    return f'<span class="status-chip status-{html.escape(status)}" data-status-key="{html.escape(f"status.{status}", quote=True)}">{html.escape(label)}</span>'


def render_action_links(links: list[tuple[str, str]], i18n: dict[str, Any], locale: str) -> str:
    active = [(label, url) for label, url in links if url]
    if not active:
        return ""
    fragments: list[str] = []
    for label_key, url in active:
        attrs = ' target="_blank" rel="noopener noreferrer"' if url.startswith("http") else ""
        fallback = label_key.rsplit(".", 1)[-1].replace("_", " ")
        label = translate(i18n, locale, label_key, fallback)
        fragments.append(
            f'<li><a href="{html.escape(url, quote=True)}"{attrs} data-i18n="{html.escape(label_key, quote=True)}">{html.escape(label)}</a></li>'
        )
    items = "".join(fragments)
    return f'<ul class="action-list">{items}</ul>'


def render_metric_list(items: list[str], *, escape_items: bool = True) -> str:
    metrics = [item for item in items if item]
    if not metrics:
        return ""
    if escape_items:
        content = "".join(f"<li>{html.escape(item)}</li>" for item in metrics)
    else:
        content = "".join(f"<li>{item}</li>" for item in metrics)
    return f'<ul class="metric-list">{content}</ul>'


def render_breadcrumbs(items: list[dict[str, str]], i18n: dict[str, Any], locale: str) -> str:
    if not items:
        return ""

    crumbs: list[str] = []
    for item in items:
        label = item.get("label", "")
        key = item.get("key", "")
        attr = f' data-i18n="{html.escape(key, quote=True)}"' if key else ""
        if item.get("url"):
            crumbs.append(
                f'<li><a href="{html.escape(item["url"], quote=True)}"{attr}>{html.escape(label)}</a></li>'
            )
        else:
            crumbs.append(
                f'<li><span aria-current="page"{attr}>{html.escape(label)}</span></li>'
            )

    aria_label = translate(i18n, locale, "accessibility.breadcrumbs", "Breadcrumbs")
    return (
        f'<nav class="breadcrumbs" aria-label="{html.escape(aria_label, quote=True)}" '
        f'data-i18n-aria-label="accessibility.breadcrumbs">'
        f'<ol class="breadcrumb-list">{"".join(crumbs)}</ol>'
        f"</nav>"
    )


def docs_by_category(documents: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for document in documents:
        grouped[document["category"]].append(document)
    return dict(grouped)


def canonical_url(site: dict[str, str], path: str) -> str:
    base_url = site["base_url"].rstrip("/")
    if not base_url:
        return path
    return f"{base_url}/{path.lstrip('/')}"


def site_path_prefix(site: dict[str, str]) -> str:
    base_url = site.get("base_url", "").strip()
    if not base_url:
        return ""
    parsed = urlsplit(base_url)
    path = parsed.path.rstrip("/")
    return path if path != "/" else ""


def site_href(site: dict[str, str], path: str) -> str:
    prefix = site_path_prefix(site)
    clean_path = path if path.startswith("/") else f"/{path}"
    if not prefix:
        return clean_path
    return f"{prefix}{clean_path}"


def theme_css(system: dict[str, Any]) -> str:
    colors = system.get("design", {}).get("colors", {})
    typography = system.get("design", {}).get("typography", {})
    ux = system.get("ux", {})
    
    # Light theme defaults
    bg = "#ffffff"
    surface = "#f8f9fa"
    text = "#1a1a1a"
    muted = "#666666"
    accent = "#2563eb" # Royal blue
    border = "rgba(0, 0, 0, 0.08)"

    accents = normalize_string_list(colors.get("accent", [])) or [accent, "#7c3aed"]
    headings = normalize_string_list(typography.get("headings", [])) or ["Inter", "system-ui"]
    body_font = ["Lora", "Charter", "serif"]
    code_font = str(typography.get("code", "JetBrains Mono") or "JetBrains Mono")
    reading_width = str(ux.get("reading_width", "720px") or "720px")

    def font_stack(fonts: list[str], fallback: str) -> str:
        return ", ".join([f'"{font}"' for font in fonts] + [fallback])

    return f"""
    <style>
      :root {{
        --bg: {bg};
        --surface: {surface};
        --surface-strong: #f1f3f5;
        --surface-soft: #ffffff;
        --border: {border};
        --accent: {accents[0]};
        --accent-secondary: {accents[1] if len(accents) > 1 else accents[0]};
        --accent-soft: rgba(37, 99, 235, 0.08);
        --text: {text};
        --muted: {muted};
        --font-heading: "Inter", system-ui, sans-serif;
        --font-body: "Lora", serif;
        --font-ui: "Inter", system-ui, sans-serif;
        --font-code: "JetBrains Mono", monospace;
        --reading-width: {reading_width};
        --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
        --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        --shadow-lg: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      }}
    </style>
    """


def nav_url(site: dict[str, str], item: str) -> str:
    mapping = {
        "posts": "/publications/",
        "projects": "/projects/",
        "documents": "/documents/",
        "about": "/about/",
    }
    return site_href(site, mapping.get(item, "/"))


def render_locale_switcher(i18n: dict[str, Any], locale: str) -> str:
    supported = i18n.get("supported_locales", [])
    language_names = i18n.get("language_names", {})
    options = "".join(
        f'<option value="{html.escape(code, quote=True)}"{" selected" if code == locale else ""}>'
        f"{html.escape(language_names.get(code, code))}</option>"
        for code in supported
    )
    label = translate(i18n, locale, "accessibility.language_switcher", "Selecionar idioma")
    return f"""
    <label class="locale-switcher">
      <span class="visually-hidden" data-i18n="accessibility.language_switcher">{html.escape(label)}</span>
      <select class="locale-select" data-locale-switcher aria-label="{html.escape(label, quote=True)}" data-i18n-aria-label="accessibility.language_switcher">
        {options}
      </select>
    </label>
    """


def render_site_nav(site: dict[str, str], system: dict[str, Any], active_nav: str, i18n: dict[str, Any], locale: str) -> str:
    header = system.get("layout", {}).get("header", {})
    nav_items = normalize_string_list(header.get("nav", [])) or ["posts", "projects", "documents", "about"]
    cta_label = translate(i18n, locale, "nav.cta", str(header.get("cta", "open work / contact") or "open work / contact"))
    search_label = translate(i18n, locale, "nav.search", str(header.get("search", "command palette") or "command palette"))
    cta_url = site.get("linkedin_url") or site.get("github_url") or "#"
    tagline = str(site.get("headline", "") or "").strip()

    link_fragments: list[str] = []
    for item in nav_items:
        current_attr = ' aria-current="page"' if item == active_nav else ""
        label = translate(i18n, locale, f"nav.{item}", item)
        link_fragments.append(
            f'<li><a href="{nav_url(site, item)}"{current_attr} data-i18n="{html.escape(f"nav.{item}", quote=True)}">{html.escape(label)}</a></li>'
        )
    links = "".join(link_fragments)
    nav_aria = translate(i18n, locale, "accessibility.primary_navigation", "Primary navigation")
    mark_current = ' aria-current="page"' if not active_nav else ""
    tagline_html = f'<p class="nav-tagline">{html.escape(tagline)}</p>' if tagline else ""

    return f"""
    <nav class="site-nav" aria-label="{html.escape(nav_aria, quote=True)}" data-i18n-aria-label="accessibility.primary_navigation">
      <div class="nav-brand">
        <a class="site-mark" href="{site_href(site, "/")}"{mark_current}>{html.escape(site["title"])}</a>
        {tagline_html}
      </div>
      
      <div class="nav-links" role="navigation">
        <ul class="nav-links-list">
          {links}
        </ul>
      </div>

      <button class="nav-search-btn" type="button" data-open-palette aria-label="{html.escape(search_label, quote=True)}" data-i18n-aria-label="nav.search">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span class="search-shortcut">⌘K</span>
      </button>

      <div class="site-nav-actions">
        <button class="locale-cycle-btn" type="button" data-locale-toggle aria-label="{html.escape(translate(i18n, locale, "nav.language_action", "trocar idioma"), quote=True)}" data-i18n-aria-label="nav.language_action">
          <span class="locale-current">{html.escape(locale.split('-')[0].upper())}</span>
        </button>
        <a class="cta-link" href="{html.escape(cta_url, quote=True)}" rel="noopener noreferrer" target="_blank" data-i18n="nav.cta">{html.escape(cta_label)}</a>
      </div>
    </nav>
    """


def render_footer(site: dict[str, str], system: dict[str, Any]) -> str:
    blog = system.get("blog", {})
    identity = system.get("identity", {})
    footer_note = site["footer_note"] or "Publicado localmente e versionado por Git."
    focus = render_tag_list(normalize_string_list(blog.get("focus", [])), "footer-pills")
    references = render_tag_list(normalize_string_list(identity.get("references", [])), "footer-pills")

    return f"""
    <footer class="site-footer">
      <div>
        <p class="footer-label">{html.escape(str(blog.get("concept", "technical notebook") or "technical notebook"))}</p>
        <p>{html.escape(footer_note)}</p>
      </div>
      <div class="footer-meta">
        {focus}
        {references}
      </div>
    </footer>
    """


def render_palette(site: dict[str, str], i18n: dict[str, Any], locale: str) -> str:
    aria_label = translate(i18n, locale, "accessibility.command_palette", "Command palette")
    placeholder = translate(i18n, locale, "palette.placeholder", "Search posts, projects and documents")
    close_label = translate(i18n, locale, "palette.close", "Close")
    hint = translate(i18n, locale, "palette.hint", "Use Ctrl/⌘ K to open, Enter to open the first result, Esc to close.")
    return f"""
    <div class="palette-shell" hidden data-command-palette data-search-index="{site_href(site, '/assets/search-index.json')}">
      <div class="palette-backdrop" data-close-palette></div>
      <div class="palette-panel" role="dialog" aria-modal="true" aria-label="{html.escape(aria_label, quote=True)}" data-i18n-aria-label="accessibility.command_palette">
        <div class="palette-head">
          <input class="palette-input" type="search" placeholder="{html.escape(placeholder, quote=True)}" data-palette-input data-i18n-placeholder="palette.placeholder">
          <button class="palette-close" type="button" data-close-palette data-i18n="palette.close">{html.escape(close_label)}</button>
        </div>
        <p class="palette-hint" data-i18n="palette.hint">{html.escape(hint)}</p>
        <ul class="palette-results" data-palette-results></ul>
      </div>
    </div>
    """


def render_layout(
    *,
    page_title: str,
    page_description: str,
    site: dict[str, str],
    system: dict[str, Any],
    body_class: str,
    canonical_path: str,
    has_math: bool,
    content: str,
    active_nav: str,
    i18n: dict[str, Any],
    locale: str,
) -> str:
    config = load_blog_config()
    math = config["math"]
    math_meta = ""
    if has_math and math["enabled"]:
        math_meta = f"""
    <meta name="x-asciimath-inline" content="{html.escape(math['inline_delimiter'], quote=True)}">
    <meta name="x-asciimath-block" content="{html.escape(math['block_delimiter'], quote=True)}">
    <meta name="x-asciimath-script" content="{html.escape(math['script_url'], quote=True)}">
    """

    i18n_payload = json.dumps(
        {
            "defaultLocale": str(i18n.get("default_locale", locale) or locale),
            "supportedLocales": i18n.get("supported_locales", []),
            "languageNames": i18n.get("language_names", {}),
            "aliases": i18n.get("aliases", {}),
            "timezones": i18n.get("timezones", {}),
            "strings": i18n.get("strings", {}),
        },
        ensure_ascii=False,
    ).replace("<", "\\u003c")

    return f"""<!DOCTYPE html>
<html lang="{html.escape(locale, quote=True)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>{html.escape(page_title)}</title>
    <meta name="description" content="{html.escape(page_description, quote=True)}">
    <link rel="canonical" href="{html.escape(canonical_url(site, canonical_path), quote=True)}">
    <link rel="stylesheet" href="{site_href(site, '/assets/styles.css')}">
    {theme_css(system)}
    {math_meta}
  </head>
  <body class="{html.escape(body_class, quote=True)}" data-has-math="{str(has_math).lower()}" data-default-locale="{html.escape(locale, quote=True)}">
    <a class="skip-link" href="#content" data-i18n="accessibility.skip_to_content">{html.escape(translate(i18n, locale, "accessibility.skip_to_content", "Ir para o conteúdo"))}</a>
    <div class="site-shell">
      <header class="site-header">
        {render_site_nav(site, system, active_nav, i18n, locale)}
      </header>
      <main class="site-main" id="content">
        {content}
      </main>
      {render_footer(site, system)}
    </div>
    {render_palette(site, i18n, locale)}
    <script id="site-i18n" type="application/json">{i18n_payload}</script>
    <script src="{site_href(site, '/assets/blog.js')}" defer></script>
  </body>
</html>
"""


def render_post_card(post: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    actions = render_action_links(
        [
            ("actions.repo", post.get("resolved_repo_url", "")),
            ("actions.code", post.get("resolved_code_url", "")),
        ],
        i18n,
        locale,
    )
    metrics = render_metric_list(
        [
            render_localized_date(post["published_dt"], locale, "short"),
            render_reading_time(post["reading_time"], i18n, locale),
        ],
        escape_items=False,
    )
    return f"""
    <li>
      <article class="resource-card post-card">
        <div class="card-headline">
          <p class="card-type" data-i18n="kinds.post">{html.escape(translate(i18n, locale, "kinds.post", "post"))}</p>
          {render_badge_list(post["badges"])}
        </div>
        <h3><a href="{html.escape(post['resolved_url'])}">{html.escape(post['title'])}</a></h3>
        <p class="card-summary">{html.escape(post['summary'])}</p>
        {metrics}
        {render_tag_list(post["tags"])}
        {actions}
      </article>
    </li>
    """.strip()


def render_project_card(project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    actions = render_action_links(
        [
            ("actions.view_architecture", project.get("resolved_architecture_url", "")),
            ("actions.view_code", project.get("resolved_code_url", "")),
            ("actions.open_docs", project.get("resolved_docs_url", "")),
        ],
        i18n,
        locale,
    )
    preview = (
        f'<pre class="diagram-preview"><code>{html.escape(project["diagram_preview"])}</code></pre>'
        if project["diagram_preview"]
        else ""
    )
    return f"""
    <li>
      <article class="resource-card project-card">
        <div class="card-headline">
          <p class="card-type" data-i18n="kinds.project">{html.escape(translate(i18n, locale, "kinds.project", "project"))}</p>
          <div class="card-state">{render_status_badge(project["status"], i18n, locale)}</div>
        </div>
        <h3><a href="{html.escape(project['resolved_url'])}">{html.escape(project['name'])}</a></h3>
        <p class="card-summary">{html.escape(project['summary'])}</p>
        {render_stack_list(project["stack"])}
        {render_badge_list(project["badges"])}
        {preview}
        {actions}
      </article>
    </li>
    """.strip()


def render_document_card(document: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    agent_tag = (
        f'<span class="mini-flag" data-i18n="common.agent_generated">{html.escape(translate(i18n, locale, "common.agent_generated", "agent-generated"))}</span>'
        if document["agent_generated_tag"]
        else ""
    )
    return f"""
    <li>
      <article class="resource-card document-card">
        <div class="card-headline">
          <p class="card-type">{html.escape(document['category'])}</p>
          <p class="card-version">{html.escape(document['version'])}</p>
        </div>
        <h3><a href="{html.escape(document['resolved_url'])}">{html.escape(document['title'])}</a></h3>
        <p class="card-summary">{html.escape(document['summary'])}</p>
        <div class="document-flags">
          {agent_tag}
        </div>
        {render_tag_list(document["tags"])}
      </article>
    </li>
    """.strip()


def render_hero(
    site: dict[str, str],
    system: dict[str, Any],
    posts: list[dict[str, Any]],
    projects: list[dict[str, Any]],
    i18n: dict[str, Any],
    locale: str,
) -> str:
    blog = system.get("blog", {})
    hero = system.get("layout", {}).get("hero", {})
    identity = system.get("identity", {})
    headline = str(hero.get("headline", site["home_title"]) or site["home_title"])
    hero_stack = normalize_string_list(hero.get("stack", []))
    concept = str(blog.get("concept", "technical notebook") or "technical notebook")
    style = str(blog.get("style", "minimalist engineering notebook") or "minimalist engineering notebook")
    feelings = normalize_string_list(identity.get("feeling", []))

    main_project = next((project for project in projects if project["featured"]), projects[0] if projects else None)
    recent_article = posts[0] if posts else None

    highlight_cards: list[str] = []
    if main_project:
        highlight_cards.append(
            f"""
            <article class="highlight-card">
              <p class="card-type" data-i18n="home.highlight_main_project">{html.escape(translate(i18n, locale, "home.highlight_main_project", "main project"))}</p>
              <h2><a href="{html.escape(main_project['resolved_url'])}">{html.escape(main_project['name'])}</a></h2>
              <p>{html.escape(main_project['summary'])}</p>
            </article>
            """.strip()
        )
    if recent_article:
        highlight_cards.append(
            f"""
            <article class="highlight-card">
              <p class="card-type" data-i18n="home.highlight_recent_article">{html.escape(translate(i18n, locale, "home.highlight_recent_article", "recent article"))}</p>
              <h2><a href="{html.escape(recent_article['resolved_url'])}">{html.escape(recent_article['title'])}</a></h2>
              <p>{html.escape(recent_article['summary'])}</p>
            </article>
            """.strip()
        )

    return f"""
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">{html.escape(concept)}</p>
        <h1>{html.escape(headline)}</h1>
        <p class="hero-intro">{html.escape(site['description'])}</p>
        <div class="hero-meta">
          <span>{html.escape(style)}</span>
          {''.join(f'<span>{html.escape(item)}</span>' for item in feelings)}
        </div>
        {render_stack_list(hero_stack)}
      </div>
      <div class="hero-highlights">
        {''.join(highlight_cards)}
      </div>
    </section>
    """


def render_posts_section(
    system: dict[str, Any],
    posts: list[dict[str, Any]],
    i18n: dict[str, Any],
    locale: str,
    *,
    limit: int | None = None,
    show_controls: bool = True,
) -> str:
    layout_posts = system.get("layout", {}).get("posts", {})
    view_options = normalize_string_list(layout_posts.get("view", [])) or ["list", "grid"]
    tag_filters = normalize_string_list(layout_posts.get("tags", []))
    items = posts[:limit] if limit is not None else posts
    default_view = view_options[0]
    empty_posts = translate(i18n, locale, "empty.posts", "No posts published yet.")
    cards = (
        "\n".join(render_post_card(post, i18n, locale) for post in items)
        if items
        else f'<li><p class="empty-state" data-i18n="empty.posts">{html.escape(empty_posts)}</p></li>'
    )
    controls = ""
    if show_controls:
        controls = f"""
        <div class="section-controls">
          <div class="pill-row">{''.join(f'<span class="pill">{html.escape(tag)}</span>' for tag in tag_filters)}</div>
          <div class="view-switch" data-post-view data-default-view="{html.escape(default_view)}">
            {''.join(f'<button type="button" data-view-option="{html.escape(option)}" data-i18n="{html.escape(f"view.{option}", quote=True)}">{html.escape(translate(i18n, locale, f"view.{option}", option))}</button>' for option in view_options)}
          </div>
        </div>
        """
    return f"""
    <section class="section-panel" aria-labelledby="posts-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "posts"))}</p>
          <h2 id="posts-title" data-i18n="sections.posts_title">{html.escape(translate(i18n, locale, "sections.posts_title", "Recent writing"))}</h2>
        </div>
        <p class="section-copy" data-i18n="sections.posts_copy">{html.escape(translate(i18n, locale, "sections.posts_copy", "Posts with reading time, tags, badges and direct links to repositories where it makes sense."))}</p>
      </header>
      {controls}
      <ol class="resource-list post-collection" data-post-collection data-view="{html.escape(default_view)}">
        {cards}
      </ol>
    </section>
    """


def render_projects_section(projects: list[dict[str, Any]], i18n: dict[str, Any], locale: str, *, limit: int | None = None) -> str:
    items = projects[:limit] if limit is not None else projects
    empty_projects = translate(i18n, locale, "empty.projects", "No projects available.")
    cards = (
        "\n".join(render_project_card(project, i18n, locale) for project in items)
        if items
        else f'<li><p class="empty-state" data-i18n="empty.projects">{html.escape(empty_projects)}</p></li>'
    )
    return f"""
    <section class="section-panel" aria-labelledby="projects-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="nav.projects">{html.escape(translate(i18n, locale, "nav.projects", "projects"))}</p>
          <h2 id="projects-title" data-i18n="sections.projects_title">{html.escape(translate(i18n, locale, "sections.projects_title", "Core systems"))}</h2>
        </div>
        <p class="section-copy" data-i18n="sections.projects_copy">{html.escape(translate(i18n, locale, "sections.projects_copy", "Projects are treated as long-lived assets: architecture, stack, status, roadmap and supporting documents."))}</p>
      </header>
      <ol class="resource-list project-collection">
        {cards}
      </ol>
    </section>
    """


def render_documents_section(
    system: dict[str, Any],
    documents: list[dict[str, Any]],
    i18n: dict[str, Any],
    locale: str,
    *,
    limit: int | None = None,
    grouped: bool = False,
) -> str:
    layout_docs = system.get("layout", {}).get("documents", {})
    categories = normalize_string_list(layout_docs.get("navigation", []))
    items = documents[:limit] if limit is not None else documents

    if grouped:
        groups = docs_by_category(documents)
        blocks = []
        for category in categories or sorted(groups):
            docs_in_category = groups.get(category, [])
            if not docs_in_category:
                continue
            cards = "\n".join(render_document_card(document, i18n, locale) for document in docs_in_category)
            blocks.append(
                f"""
                <section class="document-group">
                  <header class="document-group-head">
                    <h3>{html.escape(category)}</h3>
                  </header>
                  <ol class="resource-list document-collection">
                    {cards}
                  </ol>
                </section>
                """.strip()
            )
        empty_documents = translate(i18n, locale, "empty.documents", "No documents indexed yet.")
        content = "\n".join(blocks) if blocks else f'<p class="empty-state" data-i18n="empty.documents">{html.escape(empty_documents)}</p>'
    else:
        cards = "\n".join(render_document_card(document, i18n, locale) for document in items)
        empty_state = f'<li><p class="empty-state" data-i18n="empty.documents">{html.escape(translate(i18n, locale, "empty.documents", "No documents indexed yet."))}</p></li>'
        content = f'<ol class="resource-list document-collection">{cards or empty_state}</ol>'

    return f"""
    <section class="section-panel" aria-labelledby="documents-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="nav.documents">{html.escape(translate(i18n, locale, "nav.documents", "documents"))}</p>
          <h2 id="documents-title" data-i18n="sections.documents_title">{html.escape(translate(i18n, locale, "sections.documents_title", "Documentation system"))}</h2>
        </div>
        <p class="section-copy" data-i18n="sections.documents_copy">{html.escape(translate(i18n, locale, "sections.documents_copy", "Markdown-backed notes organized by domain, architecture, agents and APIs, with version markers and agent-generated tags."))}</p>
      </header>
      {content}
    </section>
    """


def render_about_teaser(system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    key_idea = system.get("key_idea", {})
    structure = system.get("structure", {})
    next_steps = system.get("next_steps", {})
    tree = normalize_string_list(structure.get("tree", []))
    options = normalize_string_list(next_steps.get("options", []))
    return f"""
    <section class="section-panel about-teaser" aria-labelledby="about-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="nav.about">{html.escape(translate(i18n, locale, "nav.about", "about"))}</p>
          <h2 id="about-title">{html.escape(str(key_idea.get('definition', 'living technical documentation system') or 'living technical documentation system'))}</h2>
        </div>
        <p class="section-copy" data-i18n="sections.about_copy">{html.escape(translate(i18n, locale, "sections.about_copy", "The site is organized more like a structured codebase than a personal landing page."))}</p>
      </header>
      <div class="about-grid">
        <pre class="tree-block"><code>{html.escape(chr(10).join(tree))}</code></pre>
        <ul class="next-step-list">{''.join(f'<li>{html.escape(item)}</li>' for item in options)}</ul>
      </div>
    </section>
    """


def render_home_page(
    site: dict[str, str],
    system: dict[str, Any],
    posts: list[dict[str, Any]],
    projects: list[dict[str, Any]],
    documents: list[dict[str, Any]],
    i18n: dict[str, Any],
    locale: str,
) -> str:
    config = load_blog_config()["build"]
    content = f"""
    {render_hero(site, system, posts, projects, i18n, locale)}
    {render_posts_section(system, posts, i18n, locale, limit=int(config['posts_on_home']))}
    {render_projects_section(projects, i18n, locale, limit=int(config['projects_on_home']))}
    {render_documents_section(system, documents, i18n, locale, limit=int(config['documents_on_home']))}
    {render_about_teaser(system, i18n, locale)}
    """
    return render_layout(
        page_title=f"{site['title']} | Technical Knowledge OS",
        page_description=site["description"],
        site=site,
        system=system,
        body_class="page-home",
        canonical_path="/",
        has_math=False,
        content=content,
        active_nav="",
        i18n=i18n,
        locale=locale,
    )


def render_archive_page(site: dict[str, str], system: dict[str, Any], posts: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.posts", "posts"), "url": "", "key": "nav.posts"},
        ],
        i18n,
        locale,
    )
    content = f"""
    {breadcrumbs}
    <section class="page-heading">
      <p class="section-kicker" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "posts"))}</p>
      <h1 data-i18n="pages.archive.title">{html.escape(translate(i18n, locale, "pages.archive.title", "All publications"))}</h1>
      <p data-i18n="pages.archive.description">{html.escape(translate(i18n, locale, "pages.archive.description", "Writing stream for architecture notes, experiments, domain modeling and operating heuristics."))}</p>
    </section>
    {render_posts_section(system, posts, i18n, locale, show_controls=True)}
    """
    return render_layout(
        page_title=f"Posts | {site['title']}",
        page_description="Arquivo completo das publicações do blog.",
        site=site,
        system=system,
        body_class="page-archive",
        canonical_path="/publications/",
        has_math=False,
        content=content,
        active_nav="posts",
        i18n=i18n,
        locale=locale,
    )


def render_projects_index_page(site: dict[str, str], system: dict[str, Any], projects: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.projects", "projects"), "url": "", "key": "nav.projects"},
        ],
        i18n,
        locale,
    )
    content = f"""
    {breadcrumbs}
    <section class="page-heading">
      <p class="section-kicker" data-i18n="nav.projects">{html.escape(translate(i18n, locale, "nav.projects", "projects"))}</p>
      <h1 data-i18n="pages.projects.title">{html.escape(translate(i18n, locale, "pages.projects.title", "Core section"))}</h1>
      <p data-i18n="pages.projects.description">{html.escape(translate(i18n, locale, "pages.projects.description", "Projects are presented as systems: problem, solution, architecture, stack, ADRs and roadmap."))}</p>
    </section>
    {render_projects_section(projects, i18n, locale)}
    """
    return render_layout(
        page_title=f"Projects | {site['title']}",
        page_description="Core projects and technical work.",
        site=site,
        system=system,
        body_class="page-projects",
        canonical_path="/projects/",
        has_math=False,
        content=content,
        active_nav="projects",
        i18n=i18n,
        locale=locale,
    )


def render_documents_index_page(site: dict[str, str], system: dict[str, Any], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.documents", "documents"), "url": "", "key": "nav.documents"},
        ],
        i18n,
        locale,
    )
    content = f"""
    {breadcrumbs}
    <section class="page-heading">
      <p class="section-kicker" data-i18n="nav.documents">{html.escape(translate(i18n, locale, "nav.documents", "documents"))}</p>
      <h1 data-i18n="pages.documents.title">{html.escape(translate(i18n, locale, "pages.documents.title", "Docs system"))}</h1>
      <p data-i18n="pages.documents.description">{html.escape(translate(i18n, locale, "pages.documents.description", "Documents are grouped by domain, architecture, agents and APIs. The goal is to keep decisions discoverable."))}</p>
    </section>
    {render_documents_section(system, documents, i18n, locale, grouped=True)}
    """
    return render_layout(
        page_title=f"Documents | {site['title']}",
        page_description="System documents and architecture notes.",
        site=site,
        system=system,
        body_class="page-documents",
        canonical_path="/documents/",
        has_math=False,
        content=content,
        active_nav="documents",
        i18n=i18n,
        locale=locale,
    )


def render_about_page(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    structure = system.get("structure", {})
    next_steps = system.get("next_steps", {})
    architecture = system.get("architecture", {}).get("frontend", {})
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.about", "about"), "url": "", "key": "nav.about"},
        ],
        i18n,
        locale,
    )
    content = f"""
    {breadcrumbs}
    <section class="page-heading">
      <p class="section-kicker" data-i18n="nav.about">{html.escape(translate(i18n, locale, "nav.about", "about"))}</p>
      <h1 data-i18n="pages.about.title">{html.escape(translate(i18n, locale, "pages.about.title", "Minimalist engineering notebook"))}</h1>
      <p>{html.escape(site['headline'])}</p>
    </section>

    <section class="page-grid">
      <article class="section-panel prose">
        <h2 data-i18n="pages.about.operating_model">{html.escape(translate(i18n, locale, "pages.about.operating_model", "Operating model"))}</h2>
        {render_markdown_or_empty(site['about'], i18n, locale)}
      </article>

      <aside class="section-panel sidebar-panel">
        <h2 data-i18n="pages.about.structure">{html.escape(translate(i18n, locale, "pages.about.structure", "Structure"))}</h2>
        <pre class="tree-block"><code>{html.escape(chr(10).join(normalize_string_list(structure.get('tree', []))))}</code></pre>
        <h3 data-i18n="pages.about.next_steps">{html.escape(translate(i18n, locale, "pages.about.next_steps", "Next steps"))}</h3>
        <ul class="next-step-list">{''.join(f'<li>{html.escape(item)}</li>' for item in normalize_string_list(next_steps.get('options', [])))}</ul>
        <h3 data-i18n="pages.about.future_frontend">{html.escape(translate(i18n, locale, "pages.about.future_frontend", "Future frontend options"))}</h3>
        {render_stack_list(normalize_string_list(architecture.get('framework', [])))}
      </aside>
    </section>
    """
    return render_layout(
        page_title=f"About | {site['title']}",
        page_description=site["description"],
        site=site,
        system=system,
        body_class="page-about",
        canonical_path="/about/",
        has_math=False,
        content=content,
        active_nav="about",
        i18n=i18n,
        locale=locale,
    )


def render_post_navigation(
    previous_post: dict[str, Any] | None,
    next_post: dict[str, Any] | None,
    i18n: dict[str, Any],
    locale: str,
) -> str:
    previous_link = (
        f'<a class="pager-link" href="{html.escape(previous_post["resolved_url"])}">← {html.escape(previous_post["title"])}</a>'
        if previous_post
        else f'<span class="pager-link pager-link-disabled" data-i18n="pages.post.newer_empty">{html.escape(translate(i18n, locale, "pages.post.newer_empty", "No newer text"))}</span>'
    )
    next_link = (
        f'<a class="pager-link" href="{html.escape(next_post["resolved_url"])}">{html.escape(next_post["title"])} →</a>'
        if next_post
        else f'<span class="pager-link pager-link-disabled" data-i18n="pages.post.older_empty">{html.escape(translate(i18n, locale, "pages.post.older_empty", "No older text"))}</span>'
    )
    return f"""
    <nav class="post-pager" aria-label="{html.escape(translate(i18n, locale, 'pages.post.navigation', 'Post navigation'), quote=True)}" data-i18n-aria-label="pages.post.navigation">
      {previous_link}
      {next_link}
    </nav>
    """


def render_post_page(
    site: dict[str, str],
    system: dict[str, Any],
    post: dict[str, Any],
    previous_post: dict[str, Any] | None,
    next_post: dict[str, Any] | None,
    i18n: dict[str, Any],
    locale: str,
) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.posts", "posts"), "url": site_href(site, "/publications/"), "key": "nav.posts"},
            {"label": post["title"], "url": ""},
        ],
        i18n,
        locale,
    )
    sidebar = f"""
    <aside class="sidebar-panel">
      <h2 data-i18n="pages.post.metadata">{html.escape(translate(i18n, locale, "pages.post.metadata", "Metadata"))}</h2>
      {render_metric_list([render_localized_date(post["published_dt"], locale, "long"), render_reading_time(post["reading_time"], i18n, locale)], escape_items=False)}
      {render_badge_list(post['badges'])}
      {render_tag_list(post['tags'])}
      {render_action_links([('actions.repo', post.get('resolved_repo_url', '')), ('actions.code', post.get('resolved_code_url', ''))], i18n, locale)}
    </aside>
    """
    content = f"""
    {breadcrumbs}
    <section class="page-grid">
      <article class="post-shell prose">
        <header class="post-header">
          <p class="section-kicker" data-i18n="pages.post.kicker">{html.escape(translate(i18n, locale, "pages.post.kicker", "post"))}</p>
          <h1>{html.escape(post['title'])}</h1>
          <p class="post-summary">{html.escape(post['summary'])}</p>
          <div class="post-meta">
            {render_localized_date(post['published_dt'], locale, 'long')}
            {render_reading_time(post['reading_time'], i18n, locale)}
          </div>
          <div class="post-actions">
            <a class="subtle-button" href="{site_href(site, '/publications/')}" data-i18n="pages.post.back">{html.escape(translate(i18n, locale, "pages.post.back", "Back to posts"))}</a>
            <button class="subtle-button" type="button" data-copy-link data-i18n="pages.post.copy_link">{html.escape(translate(i18n, locale, "pages.post.copy_link", "Copy link"))}</button>
          </div>
        </header>
        {render_markdown(post['body'])}
      </article>
      {sidebar}
    </section>
    {render_post_navigation(previous_post, next_post, i18n, locale)}
    """
    return render_layout(
        page_title=f"{post['title']} | {site['title']}",
        page_description=post["summary"],
        site=site,
        system=system,
        body_class="page-post",
        canonical_path=post["url"],
        has_math=post["has_asciimath"],
        content=content,
        active_nav="posts",
        i18n=i18n,
        locale=locale,
    )


def render_project_page(site: dict[str, str], system: dict[str, Any], project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    adr_list = "".join(f"<li>{html.escape(item)}</li>" for item in project["adr"]) or "<li>ADR list in progress.</li>"
    roadmap_list = "".join(f"<li>{html.escape(item)}</li>" for item in project["roadmap"]) or "<li>Roadmap in progress.</li>"
    preview = (
        f'<pre class="diagram-preview large"><code>{html.escape(project["diagram_preview"])}</code></pre>'
        if project["diagram_preview"]
        else ""
    )
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.projects", "projects"), "url": site_href(site, "/projects/"), "key": "nav.projects"},
            {"label": project["name"], "url": ""},
        ],
        i18n,
        locale,
    )
    sidebar = f"""
    <aside class="sidebar-panel">
      <h2 data-i18n="pages.project.status">{html.escape(translate(i18n, locale, "pages.project.status", "Status"))}</h2>
      <p>{render_status_badge(project['status'], i18n, locale)}</p>
      <h3 data-i18n="pages.project.stack">{html.escape(translate(i18n, locale, "pages.project.stack", "Stack"))}</h3>
      {render_stack_list(project['stack'])}
      <h3 data-i18n="pages.project.actions">{html.escape(translate(i18n, locale, "pages.project.actions", "Actions"))}</h3>
      {render_action_links([('actions.view_architecture', project.get('resolved_architecture_url', '')), ('actions.view_code', project.get('resolved_code_url', '')), ('actions.open_docs', project.get('resolved_docs_url', '')), ('actions.repo', project.get('resolved_repo_url', ''))], i18n, locale)}
    </aside>
    """
    content = f"""
    {breadcrumbs}
    <section class="page-grid">
      <article class="project-shell prose">
        <header class="post-header">
          <p class="section-kicker" data-i18n="pages.project.kicker">{html.escape(translate(i18n, locale, "pages.project.kicker", "project"))}</p>
          <h1>{html.escape(project['name'])}</h1>
          <p class="post-summary">{html.escape(project['headline'] or project['summary'])}</p>
          {render_badge_list(project['badges'])}
        </header>

        <section>
          <h2 data-i18n="pages.project.overview">{html.escape(translate(i18n, locale, "pages.project.overview", "Overview"))}</h2>
          {render_markdown_or_empty(project['overview'], i18n, locale)}
        </section>
        <section>
          <h2 data-i18n="pages.project.problem_solution">{html.escape(translate(i18n, locale, "pages.project.problem_solution", "Problem solution"))}</h2>
          {render_markdown_or_empty(project['problem_solution'], i18n, locale)}
        </section>
        <section>
          <h2 data-i18n="pages.project.architecture">{html.escape(translate(i18n, locale, "pages.project.architecture", "Architecture"))}</h2>
          {render_markdown_or_empty(project['architecture'], i18n, locale)}
          {preview}
        </section>
        <section>
          <h2 data-i18n="pages.project.stack">{html.escape(translate(i18n, locale, "pages.project.stack", "Stack"))}</h2>
          {render_stack_list(project['stack'])}
          {render_markdown_or_empty(project['stack_notes'], i18n, locale)}
        </section>
        <section>
          <h2 data-i18n="pages.project.adr">{html.escape(translate(i18n, locale, "pages.project.adr", "ADR"))}</h2>
          <ul>{adr_list}</ul>
        </section>
        <section>
          <h2 data-i18n="pages.project.roadmap">{html.escape(translate(i18n, locale, "pages.project.roadmap", "Roadmap"))}</h2>
          <ul>{roadmap_list}</ul>
        </section>
      </article>
      {sidebar}
    </section>
    """
    return render_layout(
        page_title=f"{project['name']} | {site['title']}",
        page_description=project["summary"],
        site=site,
        system=system,
        body_class="page-project",
        canonical_path=project["url"],
        has_math=False,
        content=content,
        active_nav="projects",
        i18n=i18n,
        locale=locale,
    )


def render_document_page(site: dict[str, str], system: dict[str, Any], document: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.documents", "documents"), "url": site_href(site, "/documents/"), "key": "nav.documents"},
            {"label": document["title"], "url": ""},
        ],
        i18n,
        locale,
    )
    sidebar = f"""
    <aside class="sidebar-panel">
      <h2 data-i18n="pages.document.meta">{html.escape(translate(i18n, locale, "pages.document.meta", "Document meta"))}</h2>
      <p class="doc-version">{html.escape(document['version'])}</p>
      <p class="doc-category">{html.escape(document['category'])}</p>
      {f'<p class="mini-flag" data-i18n="common.agent_generated">{html.escape(translate(i18n, locale, "common.agent_generated", "agent-generated"))}</p>' if document['agent_generated_tag'] else ''}
      {render_tag_list(document['tags'])}
    </aside>
    """
    content = f"""
    {breadcrumbs}
    <section class="page-grid">
      <article class="document-shell prose">
        <header class="post-header">
          <p class="section-kicker" data-i18n="pages.document.kicker">{html.escape(translate(i18n, locale, "pages.document.kicker", "document"))}</p>
          <h1>{html.escape(document['title'])}</h1>
          <p class="post-summary">{html.escape(document['summary'])}</p>
        </header>
        {render_markdown_or_empty(document['body'], i18n, locale)}
      </article>
      {sidebar}
    </section>
    """
    return render_layout(
        page_title=f"{document['title']} | {site['title']}",
        page_description=document["summary"],
        site=site,
        system=system,
        body_class="page-document",
        canonical_path=document["url"],
        has_math=False,
        content=content,
        active_nav="documents",
        i18n=i18n,
        locale=locale,
    )


def render_post_preview(post: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    return f"""
    <article class="post-shell preview-shell prose">
      <header class="post-header">
        <p class="section-kicker" data-i18n="common.preview">{html.escape(translate(i18n, locale, "common.preview", "preview"))}</p>
        <h1>{html.escape(post['title'])}</h1>
        <p class="post-summary">{html.escape(post['summary'])}</p>
        <div class="post-meta">
          {render_reading_time(post['reading_time'], i18n, locale)}
        </div>
        {render_badge_list(post['badges'])}
        {render_tag_list(post['tags'])}
      </header>
      {render_markdown(post['body'])}
    </article>
    """.strip()


def build_search_index(
    site: dict[str, str],
    posts: list[dict[str, Any]],
    projects: list[dict[str, Any]],
    documents: list[dict[str, Any]],
    i18n: dict[str, Any],
    locale: str,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = [
        {
            "title": site["title"],
            "url": site_href(site, "/"),
            "kind": "home",
            "summary": site["description"],
            "keywords": ["home", "blog", "technical knowledge os"],
        },
        {
            "title": translate(i18n, locale, "nav.about", "About").title(),
            "url": site_href(site, "/about/"),
            "kind": "about",
            "summary": summarize_body(site["about"]),
            "keywords": ["about", "structure", "next steps"],
        },
    ]

    for post in posts:
        items.append(
            {
                "title": post["title"],
                "url": post["resolved_url"],
                "kind": "post",
                "summary": post["summary"],
                "keywords": post["tags"] + post["badges"],
            }
        )

    for project in projects:
        items.append(
            {
                "title": project["name"],
                "url": project["resolved_url"],
                "kind": "project",
                "summary": project["summary"],
                "keywords": project["stack"] + project["badges"] + [project["status"]],
            }
        )

    for document in documents:
        items.append(
            {
                "title": document["title"],
                "url": document["resolved_url"],
                "kind": "document",
                "summary": document["summary"],
                "keywords": document["tags"] + [document["category"], document["version"]],
            }
        )

    return items


def clean_output_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    for child in path.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


def build_site() -> dict[str, Any]:
    config = load_blog_config()["build"]
    site = load_site()
    system = load_system()
    i18n = load_i18n()
    locale = default_locale(site, i18n)
    site["language"] = locale
    posts = load_posts(include_drafts=False)
    projects = load_projects()
    documents = load_documents()

    for post in posts:
        post["resolved_url"] = site_href(site, post["url"])
        post["resolved_repo_url"] = resolve_optional_url(site, post["repo_url"])
        post["resolved_code_url"] = resolve_optional_url(site, post["code_url"])

    for project in projects:
        project["resolved_url"] = site_href(site, project["url"])
        project["resolved_repo_url"] = resolve_optional_url(site, project["repo_url"])
        project["resolved_code_url"] = resolve_optional_url(site, project["code_url"] or project["repo_url"])
        project["resolved_docs_url"] = resolve_optional_url(site, project["docs_url"])
        project["resolved_architecture_url"] = resolve_optional_url(site, project["architecture_url"])

    for document in documents:
        document["resolved_url"] = site_href(site, document["url"])

    publications_dir = ROOT / config["publications_dir"]
    projects_dir = ROOT / config["projects_output_dir"]
    documents_dir = ROOT / config["documents_output_dir"]
    about_dir = ROOT / Path(config["about_file"]).parent

    clean_output_directory(publications_dir)
    clean_output_directory(projects_dir)
    clean_output_directory(documents_dir)
    clean_output_directory(about_dir)

    generated_paths: list[str] = []

    home_path = ROOT / config["home_file"]
    archive_path = ROOT / config["archive_file"]
    project_index_path = ROOT / config["project_index_file"]
    documents_index_path = ROOT / config["documents_index_file"]
    about_path = ROOT / config["about_file"]
    search_index_path = ROOT / config["search_index_file"]
    i18n_asset_path = ROOT / config["i18n_asset_file"]

    write_text(home_path, render_home_page(site, system, posts, projects, documents, i18n, locale))
    generated_paths.append(str(home_path.relative_to(ROOT)))

    write_text(archive_path, render_archive_page(site, system, posts, i18n, locale))
    generated_paths.append(str(archive_path.relative_to(ROOT)))

    write_text(project_index_path, render_projects_index_page(site, system, projects, i18n, locale))
    generated_paths.append(str(project_index_path.relative_to(ROOT)))

    write_text(documents_index_path, render_documents_index_page(site, system, documents, i18n, locale))
    generated_paths.append(str(documents_index_path.relative_to(ROOT)))

    write_text(about_path, render_about_page(site, system, i18n, locale))
    generated_paths.append(str(about_path.relative_to(ROOT)))

    for index, post in enumerate(posts):
        previous_post = posts[index - 1] if index > 0 else None
        next_post = posts[index + 1] if index + 1 < len(posts) else None
        destination = publications_dir / post["output_dir_name"] / "index.html"
        write_text(destination, render_post_page(site, system, post, previous_post, next_post, i18n, locale))
        generated_paths.append(str(destination.relative_to(ROOT)))

    for project in projects:
        destination = projects_dir / project["slug"] / "index.html"
        write_text(destination, render_project_page(site, system, project, i18n, locale))
        generated_paths.append(str(destination.relative_to(ROOT)))

    for document in documents:
        destination = documents_dir / document["slug"] / "index.html"
        write_text(destination, render_document_page(site, system, document, i18n, locale))
        generated_paths.append(str(destination.relative_to(ROOT)))

    search_index = build_search_index(site, posts, projects, documents, i18n, locale)
    write_json(search_index_path, search_index)
    generated_paths.append(str(search_index_path.relative_to(ROOT)))

    write_json(i18n_asset_path, {
        "defaultLocale": i18n.get("default_locale", locale),
        "supportedLocales": i18n.get("supported_locales", []),
        "languageNames": i18n.get("language_names", {}),
        "aliases": i18n.get("aliases", {}),
        "timezones": i18n.get("timezones", {}),
        "strings": i18n.get("strings", {}),
    })
    generated_paths.append(str(i18n_asset_path.relative_to(ROOT)))

    return {
        "generated_files": generated_paths,
        "published_posts": len(posts),
        "published_projects": len(projects),
        "published_documents": len(documents),
        "updated_at": now_local().isoformat(timespec="seconds"),
    }


def run_git(args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        args,
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if check and completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip() or "Falha ao executar comando Git."
        raise RuntimeError(message)
    return completed


def parse_status_lines(output: str) -> list[str]:
    return [line for line in output.splitlines() if line.strip()]


def git_status() -> dict[str, Any]:
    scoped = run_git(["git", "status", "--short", "--", *MANAGED_GIT_PATHS], check=False)
    full = run_git(["git", "status", "--short"], check=False)
    return {
        "scoped": parse_status_lines(scoped.stdout),
        "full": parse_status_lines(full.stdout),
    }


def publish_changes(message: str, push: bool = False) -> dict[str, Any]:
    build_result = build_site()
    run_git(["git", "add", "--", *MANAGED_GIT_PATHS], check=True)
    staged = run_git(["git", "diff", "--cached", "--name-only", "--", *MANAGED_GIT_PATHS], check=False)
    staged_files = parse_status_lines(staged.stdout)

    if not staged_files:
        return {
            "committed": False,
            "pushed": False,
            "message": "Nenhuma mudança gerenciada pelo blog para commitar.",
            "build": build_result,
            "staged_files": [],
        }

    commit_message = message.strip() or "publish: update blog"
    commit_result = run_git(["git", "commit", "-m", commit_message], check=False)
    if commit_result.returncode != 0:
        raise RuntimeError(commit_result.stderr.strip() or commit_result.stdout.strip())

    pushed = False
    push_output = ""
    if push:
        push_result = run_git(["git", "push"], check=False)
        push_output = (push_result.stdout + "\n" + push_result.stderr).strip()
        if push_result.returncode != 0:
            raise RuntimeError(push_output or "Falha ao executar git push.")
        pushed = True

    return {
        "committed": True,
        "pushed": pushed,
        "message": commit_result.stdout.strip() or "Commit criado.",
        "build": build_result,
        "staged_files": staged_files,
        "push_output": push_output,
    }
