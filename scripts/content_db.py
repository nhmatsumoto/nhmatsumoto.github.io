from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from collections.abc import Iterable
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT / "data" / "content.sqlite3"
LANGUAGES = ("pt-BR", "en", "ja")
SECTION_ORDER = ("home", "about", "projects", "posts", "daily", "docs", "contact")

if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

from engine.i18n import load_i18n, localized_value, translate  # noqa: E402
from engine.loader import load_daily, load_documents, load_posts, load_projects, load_site, load_system  # noqa: E402
from engine.renderer.pages import _build_project_body  # noqa: E402
from engine.utils import now_local, summarize_body  # noqa: E402


def utc_now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def db_path_from(value: str | Path | None = None) -> Path:
    return Path(value).expanduser().resolve() if value else DEFAULT_DB_PATH


def connect(db_path: str | Path | None = None) -> sqlite3.Connection:
    path = db_path_from(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS sections (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL DEFAULT 0,
          enabled INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS contents (
          content_key TEXT PRIMARY KEY,
          section TEXT NOT NULL,
          source_type TEXT NOT NULL DEFAULT '',
          source_path TEXT NOT NULL DEFAULT '',
          slug TEXT NOT NULL DEFAULT '',
          title TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL DEFAULT '',
          body TEXT NOT NULL DEFAULT '',
          metadata TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(section) REFERENCES sections(id)
        );

        CREATE TABLE IF NOT EXISTS translations (
          content_key TEXT NOT NULL,
          language TEXT NOT NULL,
          title TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL DEFAULT '',
          body TEXT NOT NULL DEFAULT '',
          metadata TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (content_key, language),
          FOREIGN KEY(content_key) REFERENCES contents(content_key) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS build_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          status TEXT NOT NULL,
          message TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_contents_section ON contents(section);
        CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language);
        """
    )
    seed_sections(conn)
    conn.commit()


def seed_sections(conn: sqlite3.Connection) -> None:
    titles = {
        "home": "Home",
        "about": "About",
        "projects": "Projects",
        "posts": "Posts",
        "daily": "Daily",
        "docs": "Docs",
        "contact": "Contact",
    }
    for index, section in enumerate(SECTION_ORDER):
        conn.execute(
            """
            INSERT INTO sections (id, title, sort_order, enabled, updated_at)
            VALUES (?, ?, ?, 1, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            (section, titles[section], index, utc_now()),
        )


def log_build(conn: sqlite3.Connection, action: str, status: str, message: str = "") -> None:
    conn.execute(
        "INSERT INTO build_logs (action, status, message, created_at) VALUES (?, ?, ?, ?)",
        (action, status, message, utc_now()),
    )
    conn.commit()


def normalize_language(language: str) -> str:
    value = str(language or "").strip()
    lowered = value.lower().replace("_", "-")
    if lowered in {"pt", "pt-br", "ptbr"}:
        return "pt-BR"
    if lowered in {"en", "en-us", "enus"}:
        return "en"
    if lowered in {"ja", "ja-jp", "jajp", "jp"}:
        return "ja"
    return value if value in LANGUAGES else "pt-BR"


def source_suffixes(language: str) -> list[str]:
    language = normalize_language(language)
    if language == "pt-BR":
        return ["pt_br", "pt"]
    if language == "en":
        return ["en_us", "en"]
    if language == "ja":
        return ["ja_jp", "ja"]
    return [language.lower().replace("-", "_")]


def localized_source_value(source: dict[str, Any], field: str, language: str, fallback: Any = "") -> Any:
    language = normalize_language(language)
    if language == "pt-BR":
        value = source.get(field, fallback)
        if isinstance(value, str):
            return value if value.strip() else fallback
        return value if value is not None else fallback

    for suffix in source_suffixes(language):
        key = f"{field}_{suffix}"
        if key not in source:
            continue
        value = source.get(key)
        if isinstance(value, str):
            if value.strip():
                return value
            continue
        if value is not None:
            return value
    return fallback


def json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, sort_keys=True)


def json_loads(value: str | None) -> Any:
    if not value:
        return {}
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return {}


def has_content(conn: sqlite3.Connection) -> bool:
    return bool(conn.execute("SELECT 1 FROM contents LIMIT 1").fetchone())


def upsert_content(
    conn: sqlite3.Connection,
    *,
    content_key: str,
    section: str,
    source_type: str = "",
    source_path: str = "",
    slug: str = "",
    title: str = "",
    summary: str = "",
    body: str = "",
    metadata: dict[str, Any] | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO contents
          (content_key, section, source_type, source_path, slug, title, summary, body, metadata, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(content_key) DO UPDATE SET
          section = excluded.section,
          source_type = excluded.source_type,
          source_path = excluded.source_path,
          slug = excluded.slug,
          title = excluded.title,
          summary = excluded.summary,
          body = excluded.body,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
        """,
        (
            content_key,
            section,
            source_type,
            source_path,
            slug,
            title,
            summary,
            body,
            json_dumps(metadata or {}),
            utc_now(),
        ),
    )


def insert_content_if_missing(
    conn: sqlite3.Connection,
    *,
    content_key: str,
    section: str,
    source_type: str = "",
    source_path: str = "",
    slug: str = "",
    title: str = "",
    summary: str = "",
    body: str = "",
    metadata: dict[str, Any] | None = None,
) -> bool:
    before = conn.total_changes
    conn.execute(
        """
        INSERT OR IGNORE INTO contents
          (content_key, section, source_type, source_path, slug, title, summary, body, metadata, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            content_key,
            section,
            source_type,
            source_path,
            slug,
            title,
            summary,
            body,
            json_dumps(metadata or {}),
            utc_now(),
        ),
    )
    return conn.total_changes > before


def upsert_translation(
    conn: sqlite3.Connection,
    *,
    content_key: str,
    language: str,
    title: str = "",
    summary: str = "",
    body: str = "",
    metadata: dict[str, Any] | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO translations
          (content_key, language, title, summary, body, metadata, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(content_key, language) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          body = excluded.body,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
        """,
        (
            content_key,
            normalize_language(language),
            title,
            summary,
            body,
            json_dumps(metadata or {}),
            utc_now(),
        ),
    )


def insert_translation_if_missing(
    conn: sqlite3.Connection,
    *,
    content_key: str,
    language: str,
    title: str = "",
    summary: str = "",
    body: str = "",
    metadata: dict[str, Any] | None = None,
) -> bool:
    before = conn.total_changes
    conn.execute(
        """
        INSERT OR IGNORE INTO translations
          (content_key, language, title, summary, body, metadata, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            content_key,
            normalize_language(language),
            title,
            summary,
            body,
            json_dumps(metadata or {}),
            utc_now(),
        ),
    )
    return conn.total_changes > before


def list_sections(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT id, title, sort_order, enabled, updated_at FROM sections ORDER BY sort_order, id"
    ).fetchall()
    return [dict(row) for row in rows]


def list_contents(conn: sqlite3.Connection, section: str | None = None) -> list[dict[str, Any]]:
    params: list[Any] = []
    where = ""
    if section:
        where = "WHERE section = ?"
        params.append(section)
    rows = conn.execute(
        f"""
        SELECT content_key, section, source_type, source_path, slug, title, summary, body, metadata, updated_at
        FROM contents
        {where}
        ORDER BY section, content_key
        """,
        params,
    ).fetchall()
    result = []
    for row in rows:
        item = dict(row)
        item["metadata"] = json_loads(item.get("metadata"))
        result.append(item)
    return result


def get_content(conn: sqlite3.Connection, content_key: str) -> dict[str, Any] | None:
    row = conn.execute(
        """
        SELECT content_key, section, source_type, source_path, slug, title, summary, body, metadata, updated_at
        FROM contents
        WHERE content_key = ?
        """,
        (content_key,),
    ).fetchone()
    if not row:
        return None
    item = dict(row)
    item["metadata"] = json_loads(item.get("metadata"))
    item["translations"] = get_translations(conn, content_key)
    return item


def get_translations(conn: sqlite3.Connection, content_key: str) -> dict[str, dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT content_key, language, title, summary, body, metadata, updated_at
        FROM translations
        WHERE content_key = ?
        ORDER BY language
        """,
        (content_key,),
    ).fetchall()
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        item = dict(row)
        language = normalize_language(item.pop("language"))
        item["metadata"] = json_loads(item.get("metadata"))
        result[language] = item
    return result


def rows_by_content(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    contents = list_contents(conn)
    for item in contents:
        item["translations"] = get_translations(conn, item["content_key"])
    return contents


def _relative_source_path(item: dict[str, Any]) -> str:
    source_path = str(item.get("source_path", "") or "").strip()
    if not source_path:
        return ""
    try:
        return Path(source_path).resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return source_path


def _section_body_from_about(system: dict[str, Any], language: str, i18n: dict[str, Any]) -> str:
    source_locale = {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[normalize_language(language)]
    sections = system.get("about", {}).get("sections", [])
    parts: list[str] = []
    for section in sections:
        title = str(localized_value(section, "title", source_locale, i18n, "") or "").strip()
        body = str(localized_value(section, "body", source_locale, i18n, "") or "").strip()
        if title and body:
            parts.append(f"## {title}\n\n{body}")
    if parts:
        return "\n\n".join(parts)
    return ""


def _source_records() -> list[dict[str, Any]]:
    site = load_site()
    system = load_system()
    i18n = load_i18n()
    records: list[dict[str, Any]] = []

    section_specs = [
        (
            "section.home",
            "home",
            "section",
            "home",
            {
                "pt-BR": {
                    "title": site.get("home_title", "engineering notebook"),
                    "summary": site.get("description", ""),
                    "body": site.get("home_intro", ""),
                },
                "en": {
                    "title": localized_source_value(site, "home_title", "en", site.get("home_title", "")),
                    "summary": localized_source_value(site, "description", "en", site.get("description", "")),
                    "body": localized_source_value(site, "home_intro", "en", ""),
                },
                "ja": {
                    "title": localized_source_value(site, "home_title", "ja", site.get("home_title", "")),
                    "summary": localized_source_value(site, "description", "ja", site.get("description", "")),
                    "body": localized_source_value(site, "home_intro", "ja", ""),
                },
            },
            {"kind": "section", "order": 0},
        ),
        (
            "section.about",
            "about",
            "section",
            "about",
            {
                lang: {
                    "title": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.about.title", "About"),
                    "summary": str(
                        localized_value(
                            system.get("about", {}),
                            "lede",
                            {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang],
                            i18n,
                            site.get("headline", ""),
                        )
                        or ""
                    ),
                    "body": _section_body_from_about(system, lang, i18n) or site.get("about", ""),
                }
                for lang in LANGUAGES
            },
            {"kind": "section", "order": 1},
        ),
        (
            "section.projects",
            "projects",
            "section",
            "projects",
            {
                lang: {
                    "title": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.projects.title", "Projects"),
                    "summary": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.projects.description", ""),
                    "body": "",
                }
                for lang in LANGUAGES
            },
            {"kind": "section", "order": 2},
        ),
        (
            "section.posts",
            "posts",
            "section",
            "posts",
            {
                lang: {
                    "title": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.archive.title", "Posts"),
                    "summary": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.archive.description", ""),
                    "body": "",
                }
                for lang in LANGUAGES
            },
            {"kind": "section", "order": 3},
        ),
        (
            "section.daily",
            "daily",
            "section",
            "daily",
            {
                lang: {
                    "title": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.daily.title", "Daily"),
                    "summary": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.daily.description", ""),
                    "body": "",
                }
                for lang in LANGUAGES
            },
            {"kind": "section", "order": 4},
        ),
        (
            "section.docs",
            "docs",
            "section",
            "docs",
            {
                lang: {
                    "title": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.documents.title", "Docs"),
                    "summary": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.documents.description", ""),
                    "body": "",
                }
                for lang in LANGUAGES
            },
            {"kind": "section", "order": 5},
        ),
        (
            "section.contact",
            "contact",
            "section",
            "contact",
            {
                lang: {
                    "title": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.contact.title", "Contact"),
                    "summary": translate(i18n, {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang], "pages.contact.description", ""),
                    "body": str(
                        localized_value(
                            system.get("contact", {}),
                            "intro",
                            {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}[lang],
                            i18n,
                            "",
                        )
                        or ""
                    ),
                }
                for lang in LANGUAGES
            },
            {"kind": "section", "order": 6},
        ),
    ]

    for key, section, source_type, slug, translations, metadata in section_specs:
        records.append(
            {
                "content_key": key,
                "section": section,
                "source_type": source_type,
                "source_path": "",
                "slug": slug,
                "translations": translations,
                "metadata": metadata,
            }
        )

    for item in load_projects():
        translations: dict[str, dict[str, str]] = {}
        for lang, source_locale in {"pt-BR": "pt-BR", "en": "en-US", "ja": "ja-JP"}.items():
            fallback_title = item.get("name", "") if lang == "pt-BR" else ""
            fallback_summary = item.get("summary", "") if lang == "pt-BR" else ""
            title = str(localized_source_value(item, "name", lang, fallback_title) or "")
            summary = str(
                localized_source_value(
                    item,
                    "headline",
                    lang,
                    localized_source_value(item, "summary", lang, fallback_summary),
                )
                or ""
            )
            translations[lang] = {
                "title": title,
                "summary": summary,
                "body": _build_project_body(item, i18n, source_locale),
            }
        records.append(
            {
                "content_key": f"project.{item['slug']}",
                "section": "projects",
                "source_type": "project",
                "source_path": _relative_source_path(item),
                "slug": item["slug"],
                "translations": translations,
                "metadata": {
                    "kind": "project",
                    "order": item.get("order", 0),
                    "status": item.get("status", ""),
                    "stack": item.get("stack", []),
                    "tags": item.get("tags", []),
                    "badges": item.get("badges", []),
                    "featured": bool(item.get("featured")),
                    "repo_url": item.get("repo_url", ""),
                    "code_url": item.get("code_url", ""),
                    "docs_url": item.get("docs_url", ""),
                    "architecture_url": item.get("architecture_url", ""),
                },
            }
        )

    for item in load_posts(include_drafts=False):
        translations = {
            lang: {
                "title": str(localized_source_value(item, "title", lang, item.get("title", "") if lang == "pt-BR" else "") or ""),
                "summary": str(localized_source_value(item, "summary", lang, item.get("summary", "") if lang == "pt-BR" else "") or ""),
                "body": str(localized_source_value(item, "body", lang, item.get("body", "") if lang == "pt-BR" else "") or ""),
            }
            for lang in LANGUAGES
        }
        records.append(
            {
                "content_key": f"post.{item['id']}",
                "section": "posts",
                "source_type": "post",
                "source_path": _relative_source_path(item),
                "slug": item["slug"],
                "translations": translations,
                "metadata": {
                    "kind": "post",
                    "published_at": item.get("published_at", ""),
                    "updated_at": item.get("updated_at", ""),
                    "reading_time": item.get("reading_time", 1),
                    "tags": item.get("tags", []),
                    "badges": item.get("badges", []),
                    "featured": bool(item.get("featured")),
                    "repo_url": item.get("repo_url", ""),
                    "code_url": item.get("code_url", ""),
                },
            }
        )

    for item in load_daily(include_drafts=False):
        translations = {
            lang: {
                "title": str(localized_source_value(item, "title", lang, item.get("title", "") if lang == "pt-BR" else "") or ""),
                "summary": str(localized_source_value(item, "summary", lang, item.get("summary", "") if lang == "pt-BR" else "") or ""),
                "body": str(localized_source_value(item, "body", lang, item.get("body", "") if lang == "pt-BR" else "") or ""),
            }
            for lang in LANGUAGES
        }
        records.append(
            {
                "content_key": f"daily.{item['id']}",
                "section": "daily",
                "source_type": "daily",
                "source_path": "",
                "slug": item["slug"],
                "translations": translations,
                "metadata": {
                    "kind": "daily",
                    "published_at": item.get("published_at", ""),
                    "updated_at": item.get("updated_at", ""),
                    "reading_time": item.get("reading_time", 1),
                    "tags": item.get("tags", []),
                    "related_paths": item.get("related_paths", []),
                    "commit_count": item.get("commit_count", 0),
                },
            }
        )

    for item in load_documents():
        translations = {
            lang: {
                "title": str(localized_source_value(item, "title", lang, item.get("title", "") if lang == "pt-BR" else "") or ""),
                "summary": str(localized_source_value(item, "summary", lang, item.get("summary", "") if lang == "pt-BR" else "") or ""),
                "body": str(localized_source_value(item, "body", lang, item.get("body", "") if lang == "pt-BR" else "") or ""),
            }
            for lang in LANGUAGES
        }
        records.append(
            {
                "content_key": f"document.{item['slug']}",
                "section": "docs",
                "source_type": "document",
                "source_path": _relative_source_path(item),
                "slug": item["slug"],
                "translations": translations,
                "metadata": {
                    "kind": "document",
                    "order": item.get("order", 0),
                    "category": item.get("category", ""),
                    "version": item.get("version", ""),
                    "tags": item.get("tags", []),
                    "agent_generated_tag": item.get("agent_generated_tag", ""),
                },
            }
        )

    return records


def import_sources(conn: sqlite3.Connection, *, overwrite: bool = False) -> dict[str, int]:
    ensure_schema(conn)
    imported_contents = 0
    imported_translations = 0

    for record in _source_records():
        translations = record["translations"]
        pt = translations.get("pt-BR", {})
        summary = str(pt.get("summary", "") or "")
        body = str(pt.get("body", "") or "")
        title = str(pt.get("title", "") or "")
        if not summary and body:
            summary = summarize_body(body)

        payload = {
            "content_key": record["content_key"],
            "section": record["section"],
            "source_type": record.get("source_type", ""),
            "source_path": record.get("source_path", ""),
            "slug": record.get("slug", ""),
            "title": title,
            "summary": summary,
            "body": body,
            "metadata": record.get("metadata", {}),
        }
        if overwrite:
            upsert_content(conn, **payload)
            imported_contents += 1
        elif insert_content_if_missing(conn, **payload):
            imported_contents += 1

        for language in LANGUAGES:
            value = translations.get(language, {})
            translation_payload = {
                "content_key": record["content_key"],
                "language": language,
                "title": str(value.get("title", "") or ""),
                "summary": str(value.get("summary", "") or ""),
                "body": str(value.get("body", "") or ""),
                "metadata": record.get("metadata", {}),
            }
            if overwrite:
                upsert_translation(conn, **translation_payload)
                imported_translations += 1
            elif insert_translation_if_missing(conn, **translation_payload):
                imported_translations += 1

    conn.commit()
    log_build(conn, "import_sources", "ok", f"{imported_contents} contents, {imported_translations} translations")
    return {"contents": imported_contents, "translations": imported_translations}


def ensure_database(db_path: str | Path | None = None, *, import_if_empty: bool = True) -> Path:
    path = db_path_from(db_path)
    with connect(path) as conn:
        ensure_schema(conn)
        if import_if_empty and not has_content(conn):
            import_sources(conn, overwrite=False)
    return path


def save_editor_payload(conn: sqlite3.Connection, payload: dict[str, Any]) -> dict[str, Any]:
    content_key = str(payload.get("content_key", "") or "").strip()
    if not content_key:
        raise ValueError("content_key is required")

    current = get_content(conn, content_key)
    section = str(payload.get("section", "") or (current or {}).get("section", "") or "posts")
    slug = str(payload.get("slug", "") or (current or {}).get("slug", "") or content_key.split(".")[-1])
    source_type = str(payload.get("source_type", "") or (current or {}).get("source_type", "") or "manual")
    source_path = str(payload.get("source_path", "") or (current or {}).get("source_path", ""))
    metadata = payload.get("metadata")
    if not isinstance(metadata, dict):
        metadata = (current or {}).get("metadata", {}) if current else {}

    translations = payload.get("translations", {})
    if not isinstance(translations, dict):
        translations = {}
    pt = translations.get("pt-BR") or translations.get("pt") or {}
    if not isinstance(pt, dict):
        pt = {}

    upsert_content(
        conn,
        content_key=content_key,
        section=section,
        source_type=source_type,
        source_path=source_path,
        slug=slug,
        title=str(pt.get("title", "") or payload.get("title", "") or (current or {}).get("title", "")),
        summary=str(pt.get("summary", "") or payload.get("summary", "") or (current or {}).get("summary", "")),
        body=str(pt.get("body", "") or payload.get("body", "") or (current or {}).get("body", "")),
        metadata=metadata,
    )

    for language in LANGUAGES:
        value = translations.get(language, {})
        if not isinstance(value, dict):
            value = {}
        existing = (current or {}).get("translations", {}).get(language, {})
        upsert_translation(
            conn,
            content_key=content_key,
            language=language,
            title=str(value.get("title", existing.get("title", "")) or ""),
            summary=str(value.get("summary", existing.get("summary", "")) or ""),
            body=str(value.get("body", existing.get("body", "")) or ""),
            metadata=metadata,
        )

    conn.commit()
    return get_content(conn, content_key) or {}


def database_summary(conn: sqlite3.Connection) -> dict[str, Any]:
    content_count = conn.execute("SELECT COUNT(*) FROM contents").fetchone()[0]
    translation_count = conn.execute("SELECT COUNT(*) FROM translations").fetchone()[0]
    missing_count = 0
    for item in rows_by_content(conn):
        for language in LANGUAGES:
            t = item["translations"].get(language, {})
            if not any(str(t.get(field, "") or "").strip() for field in ("title", "summary", "body")):
                missing_count += 1
    return {
        "path": str(db_path_from()),
        "contents": content_count,
        "translations": translation_count,
        "missingTranslationSlots": missing_count,
        "updatedAt": now_local().isoformat(timespec="seconds"),
    }


def delete_contents(conn: sqlite3.Connection, keys: Iterable[str]) -> int:
    count = 0
    for key in keys:
        before = conn.total_changes
        conn.execute("DELETE FROM contents WHERE content_key = ?", (key,))
        if conn.total_changes > before:
            count += 1
    conn.commit()
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="SQLite content database for the single-page build.")
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH), help="SQLite database path.")
    parser.add_argument("--init", action="store_true", help="Create schema and import sources if empty.")
    parser.add_argument("--sync-source", action="store_true", help="Overwrite database rows from TOML/Markdown sources.")
    parser.add_argument("--summary", action="store_true", help="Print database summary as JSON.")
    args = parser.parse_args()

    with connect(args.db) as conn:
        ensure_schema(conn)
        result: dict[str, Any] = {}
        if args.init:
            if not has_content(conn):
                result["import"] = import_sources(conn, overwrite=False)
            else:
                result["import"] = {"contents": 0, "translations": 0}
        if args.sync_source:
            result["sync"] = import_sources(conn, overwrite=True)
        if args.summary or not result:
            result["summary"] = database_summary(conn)
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
