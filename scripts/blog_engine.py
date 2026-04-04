from __future__ import annotations

import html
import json
import math
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
    "inline_delimiter": "$",
    "block_delimiter": "$$",
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
WIKILINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")

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

    category = str(raw.get("category", "") or (tags[0] if tags else "engineering")).strip().lower()
    return {
        "id": post_id,
        "slug": slug,
        "kind": "article",
        "category": category,
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
        "has_math": bool(raw.get("has_asciimath", False)) 
        or any(load_blog_config()["math"]["inline_delimiter"] in str(raw.get(f, "")) for f in ["overview", "problem_solution", "architecture", "stack_notes"])
        or any(load_blog_config()["math"]["block_delimiter"] in str(raw.get(f, "")) for f in ["overview", "problem_solution", "architecture", "stack_notes"]),
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
    tags = normalize_string_list(raw.get("tags", []))
    return {
        "slug": slug,
        "kind": "document",
        "title": str(raw.get("title", "") or "").strip() or "Untitled Document",
        "summary": str(raw.get("summary", "") or "").strip() or summarize_body(body),
        "category": category,
        "version": str(raw.get("version", "") or "").strip() or "v1",
        "tags": tags,
        "agent_generated_tag": bool(raw.get("agent_generated_tag", False)),
        "order": parse_int(raw.get("order", 999)),
        "body": body.rstrip() + "\n" if body.strip() else "",
        "source_path": source_path,
        "url": f"/documents/{slug}/",
        "published_dt": now_local(),
        "has_math": bool(raw.get("has_asciimath", False))
        or load_blog_config()["math"]["inline_delimiter"] in body
        or load_blog_config()["math"]["block_delimiter"] in body,
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
    text = STRONG_RE.sub(r"<strong>\1</strong>", escaped)
    text = EMPHASIS_RE.sub(r"<em>\1</em>", text)
    
    # Wikilinks [[slug|label]] or [[slug]]
    def repl_wikilink(m: re.Match) -> str:
        target = m.group(1).strip()
        label = m.group(2).strip() if m.group(2) else target
        # Simplified: assumes internal links are relative to site root
        # In a real engine, we'd need to resolve the type (post/project/doc)
        # For now, we use a generic resolver pattern or assume publications
        return f'<a href="/publications/{target}/" class="wikilink">[[{label}]]</a>'
        
    text = WIKILINK_RE.sub(repl_wikilink, text)
    
    for token, replacement in placeholders.items():
        text = text.replace(token, replacement)

    return text


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
                parts.append(f'<div class="mermaid">{"\n".join(code_lines)}</div>')
            else:
                code_content = html.escape("\n".join(code_lines))
                lang_display = language if language else "text"
                parts.append(
                    f'<div class="code-shell" data-language="{html.escape(language)}">'
                    f'  <div class="code-shell-header">'
                    f'    <span class="code-shell-label">{html.escape(lang_display)}</span>'
                    f'    <button class="code-shell-copy" aria-label="Copy code">'
                    f'      <i data-lucide="copy"></i>'
                    f'    </button>'
                    f'  </div>'
                    f'  <pre><code class="language-{html.escape(language)}">{code_content}</code></pre>'
                    f'</div>'
                )
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
    items = "".join(f'<span class="tag">{html.escape(tag)}</span>' for tag in tags)
    return f'<div class="{class_name}">{items}</div>'


def render_badge_list(items: list[str]) -> str:
    if not items:
        return ""
    badges = "".join(f'<span class="badge">{html.escape(item)}</span>' for item in items)
    return f'<div class="badge-list">{badges}</div>'


def render_stack_list(items: list[str]) -> str:
    if not items:
        return ""
    chips = "".join(f'<span class="stack-chip">{html.escape(item)}</span>' for item in items)
    return f'<div class="stack-list">{chips}</div>'


def render_status_badge(status: str, i18n: dict[str, Any], locale: str) -> str:
    fallback = STATUS_LABELS.get(status, status.replace("_", " "))
    label = translate(i18n, locale, f"status.{status}", fallback)
    return f'<span class="status-chip status-{html.escape(status)}" data-status-key="{html.escape(f"status.{status}", quote=True)}">{html.escape(label)}</span>'




def render_metric_list(items: list[str], *, escape_items: bool = True) -> str:
    metrics = [item for item in items if item]
    if not metrics:
        return ""
    
    def prep(it):
        return html.escape(it) if escape_items else it
        
    content = " &middot; ".join(f'<span class="metric">{prep(item)}</span>' for item in metrics)
    return f'<div class="card-metrics">{content}</div>'


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

    pill_links = "".join(
        f'<a class="nav-pill" href="{nav_url(site, item)}" '
        f'{(f"aria-current=\"page\"") if item == active_nav else ""} '
        f'data-i18n="{html.escape(f"nav.{item}", quote=True)}">'
        f'{html.escape(translate(i18n, locale, f"nav.{item}", item))}</a>'
        for item in nav_items
    )

    return f"""
    <nav class="nav-shell" data-nav-shell>
      <div class="nav-brand">
        <a class="nav-title" href="{site_href(site, "/")}"><span class="brand-accent">NHM</span> / OS</a>
      </div>
      
      <div class="nav-menu desktop-only">
        {pill_links}
      </div>

      <div class="nav-actions">
        <div class="nav-group desktop-only">
          {pill_links}
        </div>
        <div class="nav-divider desktop-only"></div>
        <button class="nav-button" type="button" data-open-palette aria-label="{html.escape(search_label, quote=True)}">
          <i data-lucide="search"></i>
        </button>
        <button class="nav-button" type="button" data-theme-toggle aria-label="Toggle theme">
          <i data-lucide="moon" class="theme-icon-moon"></i>
          <i data-lucide="sun" class="theme-icon-sun hidden"></i>
        </button>
        <button class="nav-button mobile-only" type="button" data-nav-toggle aria-label="Toggle menu">
          <i data-lucide="menu" class="nav-icon-menu"></i>
          <i data-lucide="x" class="nav-icon-close hidden"></i>
        </button>
        <a class="nav-cta desktop-only" href="{html.escape(cta_url, quote=True)}" target="_blank" rel="noopener noreferrer">
          <span data-i18n="nav.cta">{html.escape(cta_label)}</span>
          <i data-lucide="arrow-up-right"></i>
        </a>
      </div>

      <div class="nav-drawer" data-nav-menu hidden>
        <div class="drawer-backdrop" data-nav-toggle></div>
        <div class="drawer-content">
          <div class="drawer-header">
            <span class="nav-title"><span class="brand-accent">NHM</span> / OS</span>
            <button class="nav-button" type="button" data-nav-toggle>
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="drawer-links">
            {pill_links}
          </div>
          <div class="drawer-footer">
            <a class="nav-cta" href="{html.escape(cta_url, quote=True)}" target="_blank" rel="noopener noreferrer">
              <span data-i18n="nav.cta">{html.escape(cta_label)}</span>
              <i data-lucide="arrow-up-right"></i>
            </a>
          </div>
        </div>
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
<html lang="{html.escape(locale, quote=True)}" data-theme="dark">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <title>{html.escape(page_title)}</title>
    <meta name="description" content="{html.escape(page_description, quote=True)}">
    <link rel="canonical" href="{html.escape(canonical_url(site, canonical_path), quote=True)}">
    <link rel="stylesheet" href="{site_href(site, '/assets/styles.css')}">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', () => {{
        mermaid.initialize({{ startOnLoad: true, theme: 'dark' }});
        lucide.createIcons();
      }});
    </script>
    {math_meta}
  </head>
  <body class="{html.escape(body_class, quote=True)}" data-has-math="{str(has_math).lower()}" data-default-locale="{html.escape(locale, quote=True)}">
    <a class="skip-link" href="#content" data-i18n="accessibility.skip_to_content">{html.escape(translate(i18n, locale, "accessibility.skip_to_content", "Ir para o conteúdo"))}</a>
    
    {render_site_nav(site, system, active_nav, i18n, locale)}

    <div class="site-shell">
      <main class="site-main" id="content">
        {content}
      </main>
      {render_footer(site, system)}
    </div>
    {render_palette(site, i18n, locale)}
    <script id="site-i18n" type="application/json">{i18n_payload}</script>
    <script src="{site_href(site, '/assets/blog.js')}" defer></script>
    <script src="{site_href(site, '/assets/graphview.js')}" defer></script>
  </body>
</html>
"""


def render_post_card(post: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
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
        <header class="card-headline">
          <div class="card-meta">
            <span class="card-type" data-i18n="kinds.post">{html.escape(translate(i18n, locale, "kinds.post", "post"))}</span>
            {metrics}
          </div>
          {render_badge_list(post["badges"])}
        </header>
        <div class="card-content">
          <h3><a href="{html.escape(post['resolved_url'])}">{html.escape(post['title'])}</a></h3>
          <p class="card-summary">{html.escape(post['summary'])}</p>
        </div>
        <footer>
          {render_tag_list(post["tags"])}
        </footer>
      </article>
    </li>
    """.strip()


def render_project_card(project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    preview = (
        f'<div class="card-preview"><code>{html.escape(project["diagram_preview"])}</code></div>'
        if project["diagram_preview"]
        else ""
    )
    return f"""
    <li>
      <article class="resource-card project-card">
        <header class="card-headline">
          <span class="card-type" data-i18n="kinds.project">{html.escape(translate(i18n, locale, "kinds.project", "project"))}</span>
          <div class="card-state">{render_status_badge(project["status"], i18n, locale)}</div>
        </header>
        <div class="card-content">
          <h3><a href="{html.escape(project['resolved_url'])}">{html.escape(project['name'])}</a></h3>
          <p class="card-summary">{html.escape(project['summary'])}</p>
          {render_stack_list(project["stack"])}
          {render_badge_list(project["badges"])}
          {preview}
        </div>
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
        <header class="card-headline">
          <span class="card-type">{html.escape(document['category'])}</span>
          <span class="card-version">v{html.escape(document['version'])}</span>
        </header>
        <div class="card-content">
          <h3><a href="{html.escape(document['resolved_url'])}">{html.escape(document['title'])}</a></h3>
          <p class="card-summary">{html.escape(document['summary'])}</p>
          <div class="document-flags">
            {agent_tag}
          </div>
        </div>
        <footer>
          {render_tag_list(document["tags"])}
        </footer>
      </article>
    </li>
    """.strip()

def render_publication_card(item: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    if item["kind"] == "article":
        return render_post_card(item, i18n, locale)
    return render_document_card(item, i18n, locale)

def render_publications_grouped_section(
    system: dict[str, Any],
    publications: list[dict[str, Any]],
    i18n: dict[str, Any],
    locale: str,
    *,
    limit: int | None = None,
) -> str:
    items = publications[:limit] if limit is not None else publications
    groups = docs_by_category(items)
    blocks = []
    
    layout_docs = system.get("layout", {}).get("documents", {})
    order = normalize_string_list(layout_docs.get("navigation", []))
    
    sorted_categories = order if order else sorted(groups.keys())
    
    for category in sorted_categories:
        group_items = groups.get(category, [])
        if not group_items:
            continue
        cards = "\n".join(render_publication_card(item, i18n, locale) for item in group_items)
        blocks.append(f"""
        <section class="publication-group">
          <header class="group-header">
            <h3>{html.escape(category.upper())}</h3>
          </header>
          <ul class="resource-list">
            {cards}
          </ul>
        </section>
        """)

    empty_msg = translate(i18n, locale, "empty.publications", "No publications found.")
    content = "\n".join(blocks) if blocks else f'<p class="empty-state">{html.escape(empty_msg)}</p>'

    return f"""
    <section class="section-panel" aria-labelledby="pubs-title">
      <header class="section-header">
        <p class="section-kicker" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "publications"))}</p>
        <h2 id="pubs-title" data-i18n="sections.publications_title">{html.escape(translate(i18n, locale, "sections.publications_title", "Technical Knowledge OS"))}</h2>
        <p class="section-copy" data-i18n="sections.publications_copy">{html.escape(translate(i18n, locale, "sections.publications_copy", "Unified stream of architecture documents, technical articles and research notes."))}</p>
      </header>
      <div class="publications-grid">
        {content}
      </div>
    </section>
    """

def render_pagination_controls(
    site: dict[str, str],
    current_page: int,
    total_pages: int,
    base_url: str,
    i18n: dict[str, Any],
    locale: str,
) -> str:
    if total_pages <= 1:
        return ""

    def page_url(p: int) -> str:
        if p == 1:
            return site_href(site, base_url.rstrip("/") + "/")
        return site_href(site, f"{base_url.rstrip('/')}/page/{p}/")

    links = []
    
    # Previous Link
    if current_page > 1:
        links.append(f'<a href="{page_url(current_page - 1)}" class="pagination-link pagination-prev" data-i18n="pagination.prev">← {html.escape(translate(i18n, locale, "pagination.prev", "previous"))}</a>')
    else:
        links.append(f'<span class="pagination-link pagination-disabled">← {html.escape(translate(i18n, locale, "pagination.prev", "previous"))}</span>')

    # Page Numbers
    for p in range(1, total_pages + 1):
        is_active = p == current_page
        active_class = " pagination-active" if is_active else ""
        links.append(f'<a href="{page_url(p)}" class="pagination-link{active_class}">{p}</a>')

    # Next Link
    if current_page < total_pages:
        links.append(f'<a href="{page_url(current_page + 1)}" class="pagination-link pagination-next" data-i18n="pagination.next">{html.escape(translate(i18n, locale, "pagination.next", "next"))} →</a>')
    else:
        links.append(f'<span class="pagination-link pagination-disabled">{html.escape(translate(i18n, locale, "pagination.next", "next"))} →</span>')

    return f"""
    <nav class="pagination-container" aria-label="Pagination">
      <div class="pagination-inner">
        {"".join(links)}
      </div>
    </nav>
    """



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
    feels = normalize_string_list(identity.get("feeling", []))

    main_project = next((project for project in projects if project["featured"]), projects[0] if projects else None)
    recent_article = posts[0] if posts else None

    highlight_cards: list[str] = []
    if main_project:
        highlight_cards.append(
            f"""
            <article class="highlight-card h-full">
              <p class="card-type" data-i18n="home.highlight_main_project">{html.escape(translate(i18n, locale, "home.highlight_main_project", "main project"))}</p>
              <h2 class="text-3xl font-bold tracking-tighter mb-2"><a href="{html.escape(main_project['resolved_url'])}">{html.escape(main_project['name'])}</a></h2>
              <p class="text-muted text-sm leading-relaxed">{html.escape(main_project['summary'])}</p>
              <div class="mt-auto pt-4 flex gap-2">
                {render_stack_list(main_project["stack"][:3])}
              </div>
            </article>
            """.strip()
        )
    if recent_article:
        highlight_cards.append(
            f"""
            <article class="highlight-card h-full">
              <p class="card-type" data-i18n="home.highlight_recent_article">{html.escape(translate(i18n, locale, "home.highlight_recent_article", "recent article"))}</p>
              <h2 class="text-3xl font-bold tracking-tighter mb-2"><a href="{html.escape(recent_article['resolved_url'])}">{html.escape(recent_article['title'])}</a></h2>
              <p class="text-muted text-sm leading-relaxed">{html.escape(recent_article['summary'])}</p>
              <div class="mt-auto pt-4 flex items-center justify-between">
                {render_localized_date(recent_article["published_dt"], locale, "short")}
                <span class="text-xs font-mono opacity-50">{recent_article["reading_time"]}m</span>
              </div>
            </article>
            """.strip()
        )

    return f"""
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="hero-eyebrow">{html.escape(concept)}</p>
        <h1 class="hero-title" data-i18n="sections.welcome_message">
          {html.escape(headline)}
        </h1>
        <p class="hero-description">
          {html.escape(site['description'])}
        </p>
        <div class="hero-pills">
          {''.join(f'<span class="hero-pill">{html.escape(item)}</span>' for item in feels)}
        </div>
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


def render_brain_map_section(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    links = [
        ("nav.projects", site_href(site, "/projects/")),
        ("nav.posts", site_href(site, "/publications/")),
        ("nav.documents", site_href(site, "/documents/")),
        ("nav.about", site_href(site, "/about/")),
    ]
    link_rows = "".join(
        f'<a class="brain-map-link" href="{html.escape(url, quote=True)}" data-i18n="{html.escape(key, quote=True)}">{html.escape(translate(i18n, locale, key, key.split(".")[-1]))}</a>'
        for key, url in links
    )
    return f"""
    <section class="section-panel brain-map-panel" aria-labelledby="brain-map-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="nav.graph">{html.escape(translate(i18n, locale, "nav.graph", "Mapa cerebral"))}</p>
          <h2 id="brain-map-title" data-i18n="sections.brain_map_title">{html.escape(translate(i18n, locale, "sections.brain_map_title", "Mapa cerebral vivo"))}</h2>
        </div>
        <p data-i18n="sections.brain_map_copy">{html.escape(translate(i18n, locale, "sections.brain_map_copy", "Use este mapa para navegar, ver conexões entre pensamentos e explorar os fluxos que formam o meu cérebro técnico."))}</p>
      </header>
      <div class="brain-map-shell">
        <div class="brain-map-links" aria-label="Mapa cerebral">
          {link_rows}
        </div>
        <div class="brain-map-canvas" data-knowledge-graph data-brain-map data-full-screen="false"></div>
      </div>
    </section>
    """


def render_navigation_section(
    system: dict[str, Any],
    posts: list[dict[str, Any]],
    projects: list[dict[str, Any]],
    documents: list[dict[str, Any]],
    i18n: dict[str, Any],
    locale: str,
) -> str:
    categories = sorted({doc["category"] for doc in documents if doc["category"]})
    nav_items = (
        [
            ("nav.posts", "/publications/"),
            ("nav.projects", "/projects/"),
            ("nav.documents", "/documents/"),
            ("nav.about", "/about/"),
        ]
        + [(f"sections.category_{cat}", f"/documents/?category={cat}") for cat in categories if cat]
    )

    links = "\n".join(
        f'<a class="nav-link" href="{html.escape(url, quote=True)}" data-i18n="{html.escape(key, quote=True)}">'
        f"{html.escape(translate(i18n, locale, key, key.split('.')[-1].replace('_', ' ')))}"
        "</a>"
        for key, url in nav_items
    )

    return f"""
    <section class="section-panel navigation-grid" aria-labelledby="nav-grid-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="sections.navigation_kicker">{html.escape(translate(i18n, locale, 'sections.navigation_kicker', 'navegação'))}</p>
          <h2 id="nav-grid-title" data-i18n="sections.navigation_title">{html.escape(translate(i18n, locale, 'sections.navigation_title', 'Sitemap e categorias'))}</h2>
        </div>
        <p data-i18n="sections.navigation_copy">{html.escape(translate(i18n, locale, 'sections.navigation_copy', 'Links diretos para publicações, projetos, documentos e categorias mais relevantes.'))}</p>
      </header>
      <div class="navigation-grid-links">
        {links}
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
    publications = sorted(posts + documents, key=lambda x: x.get("published_dt", now_local()), reverse=True)
    content = f"""
    {render_hero(site, system, posts, projects, i18n, locale)}
    {render_navigation_section(system, posts, projects, documents, i18n, locale)}
    {render_publications_grouped_section(system, publications, i18n, locale, limit=int(config.get('posts_on_home', 10)))}
    {render_brain_map_section(site, system, i18n, locale)}
    {render_projects_section(projects, i18n, locale, limit=int(config['projects_on_home']))}
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


def render_archive_page(
    site: dict[str, str],
    system: dict[str, Any],
    publications: list[dict[str, Any]],
    i18n: dict[str, Any],
    locale: str,
    *,
    current_page: int = 1,
    total_pages: int = 1,
) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.posts", "posts"), "url": "", "key": "nav.posts"},
        ],
        i18n,
        locale,
    )
    
    pagination = render_pagination_controls(site, current_page, total_pages, "/publications/", i18n, locale)
    
    content = f"""
    {breadcrumbs}
    <section class="page-heading">
      <p class="section-kicker" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "posts"))}</p>
      <h1 data-i18n="pages.archive.title">{html.escape(translate(i18n, locale, "pages.archive.title", "All publications"))}</h1>
      <p data-i18n="pages.archive.description">{html.escape(translate(i18n, locale, "pages.archive.description", "Writing stream for architecture notes, experiments, domain modeling and operating heuristics."))}</p>
    </section>
    {render_publications_grouped_section(system, publications, i18n, locale)}
    {pagination}
    """
    return render_layout(
        page_title=f"Posts - Page {current_page} | {site['title']}",
        page_description="Arquivo completo das publicações do blog.",
        site=site,
        system=system,
        body_class="page-archive",
        canonical_path=f"/publications/page/{current_page}/" if current_page > 1 else "/publications/",
        has_math=any(p.get('has_math') for p in publications),
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
      <div class="sidebar-actions">
        <a class="sidebar-link" href="{post.get('resolved_repo_url', '')}" target="_blank" rel="noopener" data-i18n="actions.repo">repo</a>
        <a class="sidebar-link" href="{post.get('resolved_code_url', '')}" target="_blank" rel="noopener" data-i18n="actions.code">code</a>
      </div>
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
            <footer class="post-author">
              <p><strong>Autor:</strong> {html.escape(str(site.get('author') or 'Hiro Matsumoto'))}</p>
            </footer>
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
      <div class="sidebar-actions">
        <a class="sidebar-link" href="{project.get('resolved_architecture_url', '')}" data-i18n="actions.view_architecture">architecture</a>
        <a class="sidebar-link" href="{project.get('resolved_code_url', '')}" target="_blank" rel="noopener" data-i18n="actions.view_code">code</a>
      </div>
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
        has_math=project.get("has_math", False),
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


def build_site(output_dir: Path | None = None) -> dict[str, Any]:
    config = load_blog_config()["build"]
    site = load_site()
    system = load_system()
    i18n = load_i18n()
    locale = default_locale(site, i18n)
    site["language"] = locale
    posts = load_posts(include_drafts=False)
    projects = load_projects()
    documents = load_documents()

    # Se output_dir for definido, redirecionamos as saídas para dentro de _site
    target_root = output_dir if output_dir else ROOT

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

    publications_dir = target_root / config["publications_dir"]
    projects_dir = target_root / config["projects_output_dir"]
    documents_dir = target_root / config["documents_output_dir"]
    about_dir = target_root / Path(config["about_file"]).parent

    clean_output_directory(publications_dir)
    clean_output_directory(projects_dir)
    clean_output_directory(documents_dir)
    clean_output_directory(about_dir)

    generated_paths: list[str] = []

    home_path = target_root / config["home_file"]
    archive_path = target_root / config["archive_file"]
    project_index_path = target_root / config["project_index_file"]
    documents_index_path = target_root / config["documents_index_file"]
    about_path = target_root / config["about_file"]
    graph_data_path = target_root / "assets/graph-data.json"
    search_index_path = target_root / config["search_index_file"]
    i18n_asset_path = target_root / config["i18n_asset_file"]

    write_text(home_path, render_home_page(site, system, posts, projects, documents, i18n, locale))
    generated_paths.append(str(home_path.relative_to(target_root)))

    # Pagination Logic for Publications
    all_publications = sorted(posts + documents, key=lambda x: x.get("published_dt", now_local()), reverse=True)
    items_per_page = int(config.get("posts_per_page", 12))
    total_pages = math.ceil(len(all_publications) / items_per_page) if all_publications else 1

    for p in range(1, total_pages + 1):
        start = (p - 1) * items_per_page
        end = start + items_per_page
        page_items = all_publications[start:end]
        
        if p == 1:
            destination = archive_path
        else:
            page_dir = publications_dir / "page" / str(p)
            page_dir.mkdir(parents=True, exist_ok=True)
            destination = page_dir / "index.html"
            
        write_text(destination, render_archive_page(site, system, page_items, i18n, locale, current_page=p, total_pages=total_pages))
        generated_paths.append(str(destination.relative_to(target_root)))

    write_text(project_index_path, render_projects_index_page(site, system, projects, i18n, locale))
    generated_paths.append(str(project_index_path.relative_to(target_root)))

    write_text(documents_index_path, render_documents_index_page(site, system, documents, i18n, locale))
    generated_paths.append(str(documents_index_path.relative_to(target_root)))

    write_text(about_path, render_about_page(site, system, i18n, locale))
    generated_paths.append(str(about_path.relative_to(target_root)))

    for index, post in enumerate(posts):
        previous_post = posts[index - 1] if index > 0 else None
        next_post = posts[index + 1] if index + 1 < len(posts) else None
        destination = publications_dir / post["output_dir_name"] / "index.html"
        write_text(destination, render_post_page(site, system, post, previous_post, next_post, i18n, locale))
        generated_paths.append(str(destination.relative_to(target_root)))

    for project in projects:
        destination = projects_dir / project["slug"] / "index.html"
        write_text(destination, render_project_page(site, system, project, i18n, locale))
        generated_paths.append(str(destination.relative_to(target_root)))

    for document in documents:
        destination = documents_dir / document["slug"] / "index.html"
        write_text(destination, render_document_page(site, system, document, i18n, locale))
        generated_paths.append(str(destination.relative_to(target_root)))

    # Generate Knowledge Graph Data (Zettelkasten)
    graph_nodes = []
    graph_links = []
    node_map = {}

    all_resources = [
        *[(p, "post") for p in posts],
        *[(p, "project") for p in projects],
        *[(p, "document") for p in documents]
    ]

    for res, kind in all_resources:
        slug = res.get("slug")
        title = res.get("title") or res.get("name") or slug
        node_map[slug] = {"id": slug, "title": title, "kind": kind, "url": res.get("resolved_url")}
        graph_nodes.append(node_map[slug])

    for res, kind in all_resources:
        body = res.get("body", "") or res.get("overview", "") or ""
        links = WIKILINK_RE.findall(body)
        for target_slug, _ in links:
            target_slug = target_slug.strip()
            if target_slug in node_map:
                graph_links.append({"source": res.get("slug"), "target": target_slug})

    write_json(graph_data_path, {"nodes": graph_nodes, "links": graph_links})
    generated_paths.append(str(graph_data_path.relative_to(target_root)))

    search_index = build_search_index(site, posts, projects, documents, i18n, locale)
    write_json(search_index_path, search_index)
    generated_paths.append(str(search_index_path.relative_to(target_root)))

    write_json(i18n_asset_path, {
        "defaultLocale": i18n.get("default_locale", locale),
        "supportedLocales": i18n.get("supported_locales", []),
        "languageNames": i18n.get("language_names", {}),
        "aliases": i18n.get("aliases", {}),
        "timezones": i18n.get("timezones", {}),
        "strings": i18n.get("strings", {}),
    })
    generated_paths.append(str(i18n_asset_path.relative_to(target_root)))

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


if __name__ == "__main__":
    import sys
    
    # Default to building into _site/ for safety and clarity
    output = ROOT / "_site"
    if len(sys.argv) > 1:
        output = Path(sys.argv[1]).resolve()
        
    print(f"Building Technical Knowledge OS v2 -> {output}...")
    result = build_site(output_dir=output)
    print(f"Done! Generated {len(result['generated_files'])} files.")
    print(f"Stats: {result['published_posts']} articles, {result['published_projects']} projects, {result['published_documents']} documents.")
