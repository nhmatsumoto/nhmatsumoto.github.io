import html
import json
import re
import unicodedata
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any
from .constants import ROOT, CONFIG_PATH, DEFAULT_BUILD_CONFIG, DEFAULT_MATH_CONFIG, DEFAULT_DATABASE_CONFIG

HEADING_RE = re.compile(r"^(?P<level>#{1,6})\s+(?P<content>.+)$")
UNORDERED_LIST_RE = re.compile(r"^[*\-+]\s+(.+)$")
ORDERED_LIST_RE = re.compile(r"^\d+\.\s+(.+)$")

def is_special_block_start(line: str) -> bool:
    s = line.strip()
    return any([
        s.startswith("```"),
        HEADING_RE.match(s),
        UNORDERED_LIST_RE.match(s),
        ORDERED_LIST_RE.match(s),
        s.startswith(">"),
        s == "---"
    ])

def now_local() -> datetime:
    return datetime.now().astimezone()

def load_toml(path: Path) -> dict[str, Any]:
    import tomllib
    with path.open("rb") as handle:
        return tomllib.load(handle)

def load_blog_config() -> dict[str, dict[str, Any]]:
    raw = load_toml(CONFIG_PATH)
    build = DEFAULT_BUILD_CONFIG | raw.get("build", {})
    math = DEFAULT_MATH_CONFIG | raw.get("math", {})
    analytics = {
        "enabled": True,
        "container_id": "",
        "container_id_env": "GTM_CONTAINER_ID",
        "measurement_id": "",
        "measurement_id_env": "GA_MEASUREMENT_ID",
        "allowed_hostnames": ["nhmatsumoto.github.io"],
        "debug": False,
    } | raw.get("analytics", {})
    database = DEFAULT_DATABASE_CONFIG | raw.get("database", {})
    return {"build": build, "math": math, "analytics": analytics, "database": database}

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

def normalize_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return []

def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only.lower()).strip("-")
    return slug or "item"

def localized_field_entries(source: dict[str, Any], field: str) -> list[tuple[str, Any]]:
    prefix = f"{field}_"
    entries: list[tuple[str, Any]] = []
    for key, value in source.items():
        if not key.startswith(prefix):
            continue
        suffix = key[len(prefix):].strip()
        if not suffix or value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        entries.append((suffix, value))
    return entries

def copy_localized_fields(
    source: dict[str, Any],
    target: dict[str, Any],
    source_field: str,
    *,
    target_field: str | None = None,
    transform: Callable[[Any], Any] | None = None,
) -> None:
    output_field = target_field or source_field
    for suffix, value in localized_field_entries(source, source_field):
        target[f"{output_field}_{suffix}"] = transform(value) if transform else value

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

def site_href(site: dict[str, str], path: str) -> str:
    base = str(site.get("base_url", "") or "").rstrip("/")
    clean_path = str(path or "").lstrip("/")
    if not clean_path:
        return f"{base}/"
    return f"{base}/{clean_path}"

def resolve_url(site: dict[str, str], url: str) -> str:
    clean_url = str(url or "").strip()
    if not clean_url:
        return ""
    if clean_url.startswith(("http://", "https://", "mailto:", "#")):
        return clean_url
    return site_href(site, clean_url if clean_url.startswith("/") else f"/{clean_url}")


def resolve_optional_url(site: dict[str, str], url: str) -> str:
    return resolve_url(site, url) if str(url or "").strip() else ""

def md5_of_content(content: str) -> str:
    import hashlib
    return hashlib.md5(content.encode("utf-8")).hexdigest()[:8]

def format_rfc822(dt: datetime) -> str:
    from email.utils import format_datetime
    return format_datetime(dt)

def minify_js(content: str) -> str:
    """Safely remove comments and redundant whitespace."""
    # Remove multi-line comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    # Remove single line comments
    content = re.sub(r'(?<!:)\/\/.*?\n', '\n', content)
    # Collapse spaces on same line
    content = re.sub(r'[ \t]+', ' ', content)
    # Strip whitespace from start/end of lines
    content = re.sub(r'^[ \t]+|[ \t]+$', '', content, flags=re.MULTILINE)
    # Remove empty lines
    content = re.sub(r'\n\s*\n', '\n', content)
    return content.strip()

def minify_css(content: str) -> str:
    """Safer CSS minifier."""
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'\s+', ' ', content)
    for c in '{}:;,':
        content = content.replace(f' {c}', c).replace(f'{c} ', c)
    return content.strip()
