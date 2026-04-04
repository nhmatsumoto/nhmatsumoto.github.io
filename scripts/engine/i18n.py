import html
from datetime import datetime
from typing import Any
from .constants import DEFAULT_I18N, MONTHS_PT, MONTHS_SHORT_PT, ROOT
from .utils import load_blog_config, load_toml, normalize_string_list

def load_i18n() -> dict[str, Any]:
    config = load_blog_config()
    i18n_path = ROOT / config["build"]["i18n_file"]
    if not i18n_path.exists():
        return DEFAULT_I18N.copy()

    raw = load_toml(i18n_path)
    supported_locales = normalize_string_list(raw.get("supported_locales", [])) or list(DEFAULT_I18N["supported_locales"])
    default_locale_val = str(raw.get("default_locale", "") or DEFAULT_I18N["default_locale"])
    if default_locale_val not in supported_locales:
        supported_locales.insert(0, default_locale_val)

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
        "default_locale": default_locale_val,
        "supported_locales": supported_locales,
        "language_names": language_names,
        "aliases": aliases,
        "timezones": timezones,
        "strings": raw.get("strings", {}),
    }

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

def format_long_date_for_locale(value: datetime, locale: str) -> str:
    if locale == "ja-JP":
        return f"{value.year}年{value.month}月{value.day}日"
    return f"{value.day} de {MONTHS_PT[value.month - 1]} de {value.year}"

def format_short_date_for_locale(value: datetime, locale: str) -> str:
    if locale == "ja-JP":
        return f"{value.year}/{value.month:02d}/{value.day:02d}"
    return f"{value.day:02d} {MONTHS_SHORT_PT[value.month - 1]} {value.year}"

def render_localized_date(dt: datetime, locale: str, style: str = "long") -> str:
    if style == "short":
        label = format_short_date_for_locale(dt, locale)
    else:
        label = format_long_date_for_locale(dt, locale)
    return f'<time datetime="{dt.isoformat()}">{html.escape(label)}</time>'
