from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any

from content_db import (
    DEFAULT_DB_PATH,
    LANGUAGES,
    connect,
    ensure_database,
    ensure_schema,
    import_sources,
    normalize_language,
    rows_by_content,
)
from engine.utils import now_local

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXPORT_PATH = ROOT / "dist" / "assets" / "translations.json"

LANGUAGE_NAMES = {
    "pt-BR": "Portugues (Brasil)",
    "en": "English",
    "ja": "日本語",
}

UI_STRINGS = {
    "pt-BR": {
        "nav.home": "inicio",
        "nav.about": "sobre",
        "nav.projects": "projetos",
        "nav.posts": "publicacoes",
        "nav.daily": "daily",
        "nav.docs": "documentos",
        "nav.contact": "contato",
        "actions.open": "abrir",
        "actions.close": "fechar",
        "actions.details": "ler no painel",
        "actions.language": "idioma",
        "actions.theme": "tema",
        "sections.projects.kicker": "sistemas",
        "sections.posts.kicker": "publicacoes",
        "sections.daily.kicker": "atividade",
        "sections.docs.kicker": "documentos",
        "sections.contact.kicker": "contato",
        "meta.generated": "gerado estaticamente",
    },
    "en": {
        "nav.home": "home",
        "nav.about": "about",
        "nav.projects": "projects",
        "nav.posts": "posts",
        "nav.daily": "daily",
        "nav.docs": "docs",
        "nav.contact": "contact",
        "actions.open": "open",
        "actions.close": "close",
        "actions.details": "read inline",
        "actions.language": "language",
        "actions.theme": "theme",
        "sections.projects.kicker": "systems",
        "sections.posts.kicker": "posts",
        "sections.daily.kicker": "activity",
        "sections.docs.kicker": "documents",
        "sections.contact.kicker": "contact",
        "meta.generated": "statically generated",
    },
    "ja": {
        "nav.home": "ホーム",
        "nav.about": "自己紹介",
        "nav.projects": "プロジェクト",
        "nav.posts": "記事",
        "nav.daily": "日誌",
        "nav.docs": "ドキュメント",
        "nav.contact": "連絡",
        "actions.open": "開く",
        "actions.close": "閉じる",
        "actions.details": "本文を読む",
        "actions.language": "言語",
        "actions.theme": "テーマ",
        "sections.projects.kicker": "システム",
        "sections.posts.kicker": "記事",
        "sections.daily.kicker": "活動",
        "sections.docs.kicker": "ドキュメント",
        "sections.contact.kicker": "連絡",
        "meta.generated": "静的生成",
    },
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _inline_markdown(value: str) -> str:
    text = html.escape(value)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def _render_body(value: str) -> str:
    text = _text(value)
    if not text:
        return ""

    lines = text.replace("\r\n", "\n").split("\n")
    parts: list[str] = []
    paragraph: list[str] = []
    index = 0

    def flush_paragraph() -> None:
        if paragraph:
            parts.append(f"<p>{_inline_markdown(' '.join(paragraph))}</p>")
            paragraph.clear()

    while index < len(lines):
        raw = lines[index]
        stripped = raw.strip()

        if not stripped:
            flush_paragraph()
            index += 1
            continue

        if stripped.startswith("```"):
            flush_paragraph()
            language = stripped[3:].strip() or "text"
            index += 1
            block: list[str] = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                block.append(lines[index])
                index += 1
            if index < len(lines):
                index += 1
            code = html.escape("\n".join(block))
            parts.append(
                '<div class="code-shell" data-language="{}">'
                '<div class="code-shell-header">'
                '<div class="code-shell-controls"><span class="control-dot close"></span><span class="control-dot minimize"></span><span class="control-dot maximize"></span></div>'
                '<div class="code-shell-title"><span class="code-shell-label">{}</span></div>'
                "</div>"
                '<div class="code-shell-content"><pre><code>{}</code></pre></div>'
                "</div>".format(html.escape(language), html.escape(language.upper()), code)
            )
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            level = min(6, len(heading.group(1)) + 1)
            parts.append(f"<h{level}>{_inline_markdown(heading.group(2))}</h{level}>")
            index += 1
            continue

        if stripped.startswith(("- ", "* ")):
            flush_paragraph()
            items: list[str] = []
            while index < len(lines) and lines[index].strip().startswith(("- ", "* ")):
                items.append(f"<li>{_inline_markdown(lines[index].strip()[2:])}</li>")
                index += 1
            parts.append(f"<ul>{''.join(items)}</ul>")
            continue

        ordered = re.match(r"^\d+\.\s+(.+)$", stripped)
        if ordered:
            flush_paragraph()
            items = []
            while index < len(lines):
                match = re.match(r"^\d+\.\s+(.+)$", lines[index].strip())
                if not match:
                    break
                items.append(f"<li>{_inline_markdown(match.group(1))}</li>")
                index += 1
            parts.append(f"<ol>{''.join(items)}</ol>")
            continue

        if stripped.startswith(">"):
            flush_paragraph()
            quote_lines = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                quote_lines.append(lines[index].strip()[1:].strip())
                index += 1
            parts.append(f"<blockquote><p>{_inline_markdown(' '.join(quote_lines))}</p></blockquote>")
            continue

        paragraph.append(stripped)
        index += 1

    flush_paragraph()
    return "\n".join(parts)


def _fallback_translation(
    content_key: str,
    language: str,
    translations: dict[str, dict[str, Any]],
    missing: list[dict[str, str]],
) -> dict[str, Any]:
    language = normalize_language(language)
    base = translations.get("pt-BR", {})
    current = translations.get(language, {})
    resolved: dict[str, Any] = {}

    for field in ("title", "summary", "body"):
        raw = _text(current.get(field, ""))
        fallback = _text(base.get(field, ""))
        if raw:
            resolved[field] = raw
            resolved[f"{field}_fallback"] = False
            continue
        resolved[field] = fallback
        resolved[f"{field}_fallback"] = bool(fallback and language != "pt-BR")
        base_metadata = base.get("metadata") if isinstance(base.get("metadata"), dict) else {}
        title_can_be_shared = field == "title" and base_metadata.get("kind") == "project"
        if language != "pt-BR" and fallback and not title_can_be_shared:
            missing.append({"content_key": content_key, "language": language, "field": field})

    resolved["body_html"] = _render_body(resolved.get("body", ""))
    resolved["metadata"] = current.get("metadata") if isinstance(current.get("metadata"), dict) else {}
    return resolved


def consolidate_translations(
    db_path: str | Path | None = None,
    *,
    sync_source: bool = False,
) -> dict[str, Any]:
    path = ensure_database(db_path or DEFAULT_DB_PATH)
    with connect(path) as conn:
        ensure_schema(conn)
        if sync_source:
            import_sources(conn, overwrite=True)

        rows = rows_by_content(conn)
        missing: list[dict[str, str]] = []
        contents: dict[str, Any] = {}
        sections: dict[str, Any] = {}
        by_section: dict[str, list[str]] = {section: [] for section in ("home", "about", "projects", "posts", "daily", "docs", "contact")}

        for row in rows:
            content_key = row["content_key"]
            metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
            translations = row.get("translations") if isinstance(row.get("translations"), dict) else {}
            if "pt-BR" not in translations:
                translations["pt-BR"] = {
                    "title": row.get("title", ""),
                    "summary": row.get("summary", ""),
                    "body": row.get("body", ""),
                    "metadata": metadata,
                }

            resolved_translations = {
                language: _fallback_translation(content_key, language, translations, missing)
                for language in LANGUAGES
            }

            item = {
                "contentKey": content_key,
                "section": row.get("section", ""),
                "sourceType": row.get("source_type", ""),
                "sourcePath": row.get("source_path", ""),
                "slug": row.get("slug", ""),
                "metadata": metadata,
                "translations": resolved_translations,
                "updatedAt": row.get("updated_at", ""),
            }
            contents[content_key] = item
            by_section.setdefault(row.get("section", ""), []).append(content_key)
            if content_key.startswith("section."):
                section_id = content_key.split(".", 1)[1]
                sections[section_id] = item

        return {
            "schema": "nhmatsumoto.single-page.translations.v1",
            "generatedAt": now_local().isoformat(timespec="seconds"),
            "defaultLanguage": "pt-BR",
            "languages": list(LANGUAGES),
            "languageNames": LANGUAGE_NAMES,
            "ui": UI_STRINGS,
            "sections": sections,
            "bySection": by_section,
            "contents": contents,
            "missing": missing,
            "stats": {
                "contents": len(contents),
                "missing": len(missing),
            },
        }


def validate_translations(db_path: str | Path | None = None) -> list[dict[str, str]]:
    return consolidate_translations(db_path).get("missing", [])


def export_translations(
    output_path: str | Path | None = None,
    *,
    db_path: str | Path | None = None,
    sync_source: bool = False,
) -> dict[str, Any]:
    payload = consolidate_translations(db_path, sync_source=sync_source)
    target = Path(output_path) if output_path else DEFAULT_EXPORT_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"path": str(target), "stats": payload["stats"], "missing": payload["missing"]}


def main() -> None:
    parser = argparse.ArgumentParser(description="Export consolidated local translations.")
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH), help="SQLite database path.")
    parser.add_argument("--output", default=str(DEFAULT_EXPORT_PATH), help="Output JSON path.")
    parser.add_argument("--sync-source", action="store_true", help="Overwrite database rows from source TOML/Markdown before export.")
    parser.add_argument("--validate", action="store_true", help="Only print missing translations.")
    args = parser.parse_args()

    if args.validate:
        print(json.dumps(validate_translations(args.db), ensure_ascii=False, indent=2))
        return

    print(
        json.dumps(
            export_translations(args.output, db_path=args.db, sync_source=args.sync_source),
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
