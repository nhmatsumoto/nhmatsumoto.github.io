from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Any

from .i18n import load_i18n, locale_suffixes
from .utils import load_blog_config

try:
    import psycopg
    from psycopg.rows import dict_row
except ModuleNotFoundError:  # pragma: no cover - optional local dependency
    psycopg = None
    dict_row = None


IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def database_config() -> dict[str, Any]:
    return load_blog_config().get("database", {})


def database_url() -> str:
    config = database_config()
    url_env = str(config.get("url_env", "BLOG_DATABASE_URL") or "").strip()
    fallback_env = str(config.get("fallback_url_env", "DATABASE_URL") or "").strip()
    configured_url = str(config.get("url", "") or "").strip()
    return (
        (os.environ.get(url_env, "") if url_env else "").strip()
        or (os.environ.get(fallback_env, "") if fallback_env else "").strip()
        or configured_url
    )


def is_configured() -> bool:
    config = database_config()
    return bool(config.get("enabled", False) or database_url())


def mirror_to_toml_enabled() -> bool:
    config = database_config()
    return bool(config.get("mirror_to_toml", True))


def _schema_name() -> str:
    schema = str(database_config().get("schema", "public") or "public").strip()
    if not IDENTIFIER_RE.match(schema):
        raise RuntimeError("Invalid PostgreSQL schema name.")
    return schema


def _qualified(table: str) -> str:
    return f'"{_schema_name()}"."{table}"'


def _connect():
    if psycopg is None:
        raise RuntimeError("psycopg is not installed. Install requirements.txt to enable PostgreSQL.")
    url = database_url()
    if not url:
        raise RuntimeError("PostgreSQL URL is not configured.")
    return psycopg.connect(url, row_factory=dict_row)


def ensure_schema() -> None:
    if not is_configured():
        return

    schema = _schema_name()
    with _connect() as conn:
        conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')
        conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {_qualified("blog_posts")} (
                id TEXT PRIMARY KEY,
                slug TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                category TEXT NOT NULL DEFAULT 'engineering',
                published_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL,
                tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
                badges TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
                repo_url TEXT NOT NULL DEFAULT '',
                code_url TEXT NOT NULL DEFAULT '',
                featured BOOLEAN NOT NULL DEFAULT FALSE,
                has_math BOOLEAN NOT NULL DEFAULT FALSE,
                impact TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
                trade_offs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
                lessons TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
        conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {_qualified("blog_post_translations")} (
                post_id TEXT NOT NULL REFERENCES {_qualified("blog_posts")}(id) ON DELETE CASCADE,
                locale TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT '',
                summary TEXT NOT NULL DEFAULT '',
                body TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                modified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (post_id, locale)
            )
            """
        )
        conn.execute(
            f'CREATE INDEX IF NOT EXISTS blog_posts_status_published_idx ON {_qualified("blog_posts")} (status, published_at DESC)'
        )


def _iso(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    return str(value or "")


def _locale_suffix(locale: str, i18n: dict[str, Any]) -> str:
    suffixes = locale_suffixes(locale, i18n)
    return suffixes[0] if suffixes else locale.replace("-", "_").lower()


def _localized_value(post: dict[str, Any], field: str, locale: str, i18n: dict[str, Any]) -> str:
    for suffix in locale_suffixes(locale, i18n):
        key = f"{field}_{suffix}"
        if key in post:
            return str(post.get(key, "") or "")
    return ""


def _translations_from_post(post: dict[str, Any], i18n: dict[str, Any], default_locale: str) -> list[dict[str, str]]:
    supported = list(dict.fromkeys([default_locale, *i18n.get("supported_locales", [])]))
    translations: list[dict[str, str]] = []
    for locale in supported:
        if locale == default_locale:
            title = str(post.get("title", "") or "")
            summary = str(post.get("summary", "") or "")
            body = str(post.get("body", "") or "")
        else:
            title = _localized_value(post, "title", locale, i18n)
            summary = _localized_value(post, "summary", locale, i18n)
            body = _localized_value(post, "body", locale, i18n)

        if locale == default_locale or title.strip() or summary.strip() or body.strip():
            translations.append(
                {
                    "locale": locale,
                    "title": title,
                    "summary": summary,
                    "body": body,
                }
            )
    return translations


def save_post(post: dict[str, Any], *, i18n: dict[str, Any], default_locale: str) -> dict[str, Any]:
    ensure_schema()
    post_id = str(post.get("id", "") or "").strip()
    if not post_id:
        raise RuntimeError("Post id is required.")

    with _connect() as conn:
        conn.execute(
            f"""
            INSERT INTO {_qualified("blog_posts")} (
                id, slug, status, category, published_at, updated_at, tags, badges,
                repo_url, code_url, featured, has_math, impact, trade_offs, lessons,
                modified_at
            )
            VALUES (
                %(id)s, %(slug)s, %(status)s, %(category)s, %(published_at)s, %(updated_at)s,
                %(tags)s, %(badges)s, %(repo_url)s, %(code_url)s, %(featured)s, %(has_math)s,
                %(impact)s, %(trade_offs)s, %(lessons)s, now()
            )
            ON CONFLICT (id) DO UPDATE SET
                slug = EXCLUDED.slug,
                status = EXCLUDED.status,
                category = EXCLUDED.category,
                published_at = EXCLUDED.published_at,
                updated_at = EXCLUDED.updated_at,
                tags = EXCLUDED.tags,
                badges = EXCLUDED.badges,
                repo_url = EXCLUDED.repo_url,
                code_url = EXCLUDED.code_url,
                featured = EXCLUDED.featured,
                has_math = EXCLUDED.has_math,
                impact = EXCLUDED.impact,
                trade_offs = EXCLUDED.trade_offs,
                lessons = EXCLUDED.lessons,
                modified_at = now()
            """,
            {
                "id": post_id,
                "slug": post.get("slug", ""),
                "status": post.get("status", "draft"),
                "category": post.get("category", "engineering"),
                "published_at": post.get("published_at"),
                "updated_at": post.get("updated_at"),
                "tags": post.get("tags", []),
                "badges": post.get("badges", []),
                "repo_url": post.get("repo_url", ""),
                "code_url": post.get("code_url", ""),
                "featured": bool(post.get("featured", False)),
                "has_math": bool(post.get("has_math", False)),
                "impact": post.get("impact", []),
                "trade_offs": post.get("trade_offs", []),
                "lessons": post.get("lessons", []),
            },
        )

        active_locales: list[str] = []
        for translation in _translations_from_post(post, i18n, default_locale):
            active_locales.append(translation["locale"])
            conn.execute(
                f"""
                INSERT INTO {_qualified("blog_post_translations")} (
                    post_id, locale, title, summary, body, modified_at
                )
                VALUES (%s, %s, %s, %s, %s, now())
                ON CONFLICT (post_id, locale) DO UPDATE SET
                    title = EXCLUDED.title,
                    summary = EXCLUDED.summary,
                    body = EXCLUDED.body,
                    modified_at = now()
                """,
                (
                    post_id,
                    translation["locale"],
                    translation["title"],
                    translation["summary"],
                    translation["body"],
                ),
            )

        conn.execute(
            f"""
            DELETE FROM {_qualified("blog_post_translations")}
            WHERE post_id = %s AND NOT (locale = ANY(%s))
            """,
            (post_id, active_locales),
        )

    return post


def delete_post(post_id: str) -> bool:
    ensure_schema()
    with _connect() as conn:
        result = conn.execute(
            f"DELETE FROM {_qualified('blog_posts')} WHERE id = %s RETURNING id",
            (post_id,),
        )
        return result.fetchone() is not None


def _load_translation_rows(post_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    if not post_ids:
        return {}
    with _connect() as conn:
        rows = conn.execute(
            f"""
            SELECT post_id, locale, title, summary, body
            FROM {_qualified("blog_post_translations")}
            WHERE post_id = ANY(%s)
            ORDER BY locale
            """,
            (post_ids,),
        ).fetchall()

    grouped: dict[str, list[dict[str, Any]]] = {post_id: [] for post_id in post_ids}
    for row in rows:
        grouped.setdefault(str(row["post_id"]), []).append(row)
    return grouped


def _row_to_raw_post(row: dict[str, Any], translations: list[dict[str, Any]], i18n: dict[str, Any]) -> dict[str, Any]:
    default_locale = str(i18n.get("default_locale", "pt-BR") or "pt-BR")
    default_translation = next((item for item in translations if item.get("locale") == default_locale), None)
    fallback_translation = default_translation or (translations[0] if translations else {})

    raw = {
        "id": str(row.get("id", "") or ""),
        "slug": str(row.get("slug", "") or ""),
        "status": str(row.get("status", "draft") or "draft"),
        "category": str(row.get("category", "engineering") or "engineering"),
        "published_at": _iso(row.get("published_at")),
        "updated_at": _iso(row.get("updated_at")),
        "tags": list(row.get("tags") or []),
        "badges": list(row.get("badges") or []),
        "repo_url": str(row.get("repo_url", "") or ""),
        "code_url": str(row.get("code_url", "") or ""),
        "featured": bool(row.get("featured", False)),
        "has_math": bool(row.get("has_math", False)),
        "impact": list(row.get("impact") or []),
        "trade_offs": list(row.get("trade_offs") or []),
        "lessons": list(row.get("lessons") or []),
        "title": str(fallback_translation.get("title", "") or ""),
        "summary": str(fallback_translation.get("summary", "") or ""),
        "body": str(fallback_translation.get("body", "") or ""),
        "available_locales": [
            str(item.get("locale", "") or "")
            for item in translations
            if str(item.get("title", "") or item.get("summary", "") or item.get("body", "")).strip()
        ],
    }

    for item in translations:
        locale = str(item.get("locale", "") or "").strip()
        if not locale:
            continue
        suffix = _locale_suffix(locale, i18n)
        raw[f"title_{suffix}"] = str(item.get("title", "") or "")
        raw[f"summary_{suffix}"] = str(item.get("summary", "") or "")
        raw[f"body_{suffix}"] = str(item.get("body", "") or "")

        if locale == default_locale:
            raw["title"] = raw[f"title_{suffix}"] or raw["title"]
            raw["summary"] = raw[f"summary_{suffix}"] or raw["summary"]
            raw["body"] = raw[f"body_{suffix}"] or raw["body"]

    return raw


def load_raw_posts(include_drafts: bool = False) -> list[dict[str, Any]] | None:
    if not is_configured():
        return None
    try:
        ensure_schema()
        status_clause = "" if include_drafts else "WHERE status = 'published'"
        with _connect() as conn:
            rows = conn.execute(
                f"""
                SELECT id, slug, status, category, published_at, updated_at, tags, badges,
                       repo_url, code_url, featured, has_math, impact, trade_offs, lessons
                FROM {_qualified("blog_posts")}
                {status_clause}
                ORDER BY published_at DESC, id DESC
                """
            ).fetchall()
        i18n = load_i18n()
        grouped = _load_translation_rows([str(row["id"]) for row in rows])
        return [_row_to_raw_post(row, grouped.get(str(row["id"]), []), i18n) for row in rows]
    except Exception:
        return None


def status() -> dict[str, Any]:
    configured = is_configured()
    if not configured:
        return {
            "mode": "toml",
            "configured": False,
            "available": False,
            "driver": "psycopg3" if psycopg is not None else "missing",
            "message": "PostgreSQL is not configured; using TOML files.",
        }
    if psycopg is None:
        return {
            "mode": "toml",
            "configured": True,
            "available": False,
            "driver": "missing",
            "message": "PostgreSQL configured, but psycopg is not installed.",
        }
    try:
        with _connect() as conn:
            conn.execute("SELECT 1")
        return {
            "mode": "postgresql",
            "configured": True,
            "available": True,
            "driver": "psycopg3",
            "schema": _schema_name(),
            "message": "PostgreSQL connection available.",
        }
    except Exception as exc:
        return {
            "mode": "toml",
            "configured": True,
            "available": False,
            "driver": "psycopg3",
            "schema": database_config().get("schema", "public"),
            "message": f"PostgreSQL unavailable; using TOML fallback. {exc}",
        }
