from __future__ import annotations

import argparse
import html
import json
import shutil
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

from content_db import DEFAULT_DB_PATH, LANGUAGES, connect, ensure_schema, log_build  # noqa: E402
from engine.loader import load_site, load_system  # noqa: E402
from engine.renderer.components import render_icon, render_stack_list, render_tag_list  # noqa: E402
from engine.utils import now_local  # noqa: E402
from translation_service import consolidate_translations, export_translations  # noqa: E402

DEFAULT_OUTPUT_DIR = ROOT / "dist"

NAV_SECTIONS = [
    ("home", "nav.home", "home"),
    ("about", "nav.about", "user-round"),
    ("projects", "nav.projects", "folder-kanban"),
    ("posts", "nav.posts", "newspaper"),
    ("daily", "nav.daily", "calendar-days"),
    ("docs", "nav.docs", "file-text"),
    ("contact", "nav.contact", "mail"),
]

KIND_LABELS = {
    "post": "publicacao",
    "daily": "daily",
    "project": "projeto",
    "document": "documento",
    "section": "section",
}

KIND_ICONS = {
    "post": "newspaper",
    "daily": "calendar-days",
    "project": "folder-kanban",
    "document": "file-text",
    "section": "layout-template",
}


def esc(value: Any, *, quote: bool = True) -> str:
    return html.escape(str(value or ""), quote=quote)


def safe_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c")


def language_value(item: dict[str, Any], field: str, language: str = "pt-BR") -> str:
    translation = item.get("translations", {}).get(language, {})
    return str(translation.get(field, "") or "")


def ui(payload: dict[str, Any], key: str, language: str = "pt-BR") -> str:
    return str(payload.get("ui", {}).get(language, {}).get(key, key.split(".")[-1]) or "")


def content_id(content_key: str) -> str:
    return (
        str(content_key)
        .replace(".", "-")
        .replace("/", "-")
        .replace("_", "-")
        .strip("-")
    )


def sort_items(items: list[dict[str, Any]], section: str) -> list[dict[str, Any]]:
    def int_value(value: Any, default: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    if section in {"posts", "daily"}:
        return sorted(items, key=lambda item: str(item.get("metadata", {}).get("published_at", "")), reverse=True)
    if section in {"projects", "docs"}:
        return sorted(
            items,
            key=lambda item: (
                -int(bool(item.get("metadata", {}).get("featured", False))),
                int_value(item.get("metadata", {}).get("order", 9999), 9999),
                language_value(item, "title").lower(),
            ),
        )
    return items


def render_tags(tags: list[str]) -> str:
    return render_tag_list([str(tag) for tag in tags if str(tag or "").strip()])


def render_status(metadata: dict[str, Any]) -> str:
    status = str(metadata.get("status", "") or "").strip()
    if not status:
        return ""
    return f'<span class="status-chip status-{esc(status)}">{esc(status.replace("_", " "))}</span>'


def render_meta_line(item: dict[str, Any]) -> str:
    metadata = item.get("metadata", {})
    kind = str(metadata.get("kind", item.get("sourceType", "")) or "item")
    icon = KIND_ICONS.get(kind, "circle")
    label = KIND_LABELS.get(kind, kind)
    parts = [
        f'<span class="entry-kind">{render_icon(icon, "site-icon entry-icon")}<span class="icon-label">{esc(label)}</span></span>'
    ]
    published = str(metadata.get("published_at", "") or "").strip()
    if published:
        parts.append(
            f'<span class="entry-meta">{render_icon("calendar-days", "site-icon entry-icon")}<time datetime="{esc(published)}">{esc(published[:10])}</time></span>'
        )
    reading_time = metadata.get("reading_time")
    if reading_time:
        parts.append(
            f'<span class="entry-meta">{render_icon("clock-3", "site-icon entry-icon")}<span>{esc(reading_time)} min</span></span>'
        )
    status = render_status(metadata)
    if status:
        parts.append(status)
    separator = '<span class="entry-eyebrow-dot" aria-hidden="true">·</span>'
    return f'<p class="entry-eyebrow">{separator.join(parts)}</p>'


def render_item_card(item: dict[str, Any], payload: dict[str, Any]) -> str:
    key = item["contentKey"]
    metadata = item.get("metadata", {})
    title = language_value(item, "title")
    summary = language_value(item, "summary")
    body_html = language_value(item, "body_html")
    anchor = content_id(key)
    tags = metadata.get("tags", [])
    stack = metadata.get("stack", [])
    tags_html = render_tags(tags) if isinstance(tags, list) else ""
    stack_html = render_stack_list(stack[:6]) if isinstance(stack, list) and stack else ""
    detail_html = ""
    if body_html:
        detail_html = f"""
        <details class="single-page-detail" id="{esc(anchor)}">
          <summary>
            <span data-ui-key="actions.details">{esc(ui(payload, "actions.details"))}</span>
            {render_icon("chevron-down", "site-icon detail-icon")}
          </summary>
          <div class="prose single-page-detail-body" data-content-key="{esc(key)}" data-content-field="body">{body_html}</div>
        </details>
        """

    return f"""
    <li class="entry single-page-entry" data-single-page-card data-content-card="{esc(key)}">
      <article class="entry-card single-page-card">
        {render_meta_line(item)}
        <h3 class="entry-title">
          <a href="#{esc(anchor)}" data-content-key="{esc(key)}" data-content-field="title">{esc(title)}</a>
        </h3>
        <p class="entry-lede" data-content-key="{esc(key)}" data-content-field="summary">{esc(summary)}</p>
        {stack_html}
        {tags_html}
        {detail_html}
      </article>
    </li>
    """


def section_item(payload: dict[str, Any], section: str) -> dict[str, Any]:
    return payload["sections"].get(section) or payload["contents"].get(f"section.{section}") or {
        "contentKey": f"section.{section}",
        "section": section,
        "translations": {"pt-BR": {"title": section, "summary": "", "body": "", "body_html": ""}},
        "metadata": {"kind": "section"},
    }


def render_section_header(payload: dict[str, Any], section: str, kicker_key: str | None = None) -> str:
    item = section_item(payload, section)
    key = item["contentKey"]
    title = language_value(item, "title")
    summary = language_value(item, "summary")
    kicker = ui(payload, kicker_key or f"nav.{section}")
    return f"""
    <header class="page-header single-page-section-header">
      <section class="page-heading">
        <p class="section-kicker" data-ui-key="{esc(kicker_key or f'nav.{section}')}">{esc(kicker)}</p>
        <h2 data-content-key="{esc(key)}" data-content-field="title">{esc(title)}</h2>
        <p data-content-key="{esc(key)}" data-content-field="summary">{esc(summary)}</p>
      </section>
    </header>
    """


def render_home(payload: dict[str, Any], site: dict[str, str]) -> str:
    item = section_item(payload, "home")
    key = item["contentKey"]
    title = language_value(item, "title")
    summary = language_value(item, "summary")
    body_html = language_value(item, "body_html")
    return f"""
    <section id="home" class="single-page-section single-page-home" data-section="home" tabindex="-1">
      <div class="layout-container home-shell">
        <header class="home-header">
          <section class="about-profile-card home-profile-card profile" aria-labelledby="home-profile-name">
            <div class="about-profile-avatar profile-avatar">
              <img src="assets/images/profile/profile.gif" alt="{esc(site.get('author', 'Hiro Matsumoto'))}" width="400" height="300" loading="eager">
            </div>
            <div class="about-profile-main profile-main">
              <p class="about-profile-handle">@nhmatsumoto · Brasil / Japao</p>
              <h1 id="home-profile-name" class="home-profile-name profile-name">{esc(site.get("author", "Hiro Matsumoto"))}</h1>
              <p class="about-profile-bio profile-bio">{esc(site.get("headline", ""))}</p>
            </div>
          </section>
        </header>

        <section class="notebook-hero section-panel single-page-hero" aria-labelledby="single-page-home-title">
          <div class="notebook-hero-copy">
            <p class="section-kicker" data-ui-key="nav.home">{esc(ui(payload, "nav.home"))}</p>
            <h2 id="single-page-home-title" class="notebook-hero-title" data-content-key="{esc(key)}" data-content-field="title">{esc(title)}</h2>
            <p class="notebook-hero-summary" data-content-key="{esc(key)}" data-content-field="summary">{esc(summary)}</p>
            <div class="prose notebook-intro" data-content-key="{esc(key)}" data-content-field="body">{body_html}</div>
          </div>
        </section>
      </div>
    </section>
    """


def render_about(payload: dict[str, Any]) -> str:
    item = section_item(payload, "about")
    key = item["contentKey"]
    return f"""
    <section id="about" class="single-page-section" data-section="about" tabindex="-1">
      <div class="layout-container page-stack">
        {render_section_header(payload, "about", "nav.about")}
        <article class="post-shell prose notebook-sheet about-narrative" data-content-key="{esc(key)}" data-content-field="body">
          {language_value(item, "body_html")}
        </article>
      </div>
    </section>
    """


def render_collection(payload: dict[str, Any], section: str, kicker_key: str) -> str:
    keys = [key for key in payload.get("bySection", {}).get(section, []) if not key.startswith("section.")]
    items = [payload["contents"][key] for key in keys if key in payload["contents"]]
    items = sort_items(items, section)
    cards = "\n".join(render_item_card(item, payload) for item in items)
    empty = '<p class="empty-state">Nenhum item encontrado.</p>' if not cards else ""
    return f"""
    <section id="{esc(section)}" class="single-page-section" data-section="{esc(section)}" tabindex="-1">
      <div class="layout-container page-stack page-stack-wide">
        {render_section_header(payload, section, kicker_key)}
        <section class="section-panel single-page-list-panel">
          <ol class="entry-list single-page-entry-list">
            {cards}
          </ol>
          {empty}
        </section>
      </div>
    </section>
    """


def render_contact(payload: dict[str, Any], system: dict[str, Any]) -> str:
    item = section_item(payload, "contact")
    key = item["contentKey"]
    cards = []
    for link in system.get("contact", {}).get("links", []):
        label = str(link.get("label", "") or "").strip()
        url = str(link.get("url", "") or "").strip()
        description = str(link.get("description", "") or "").strip()
        if not label or not url:
            continue
        cards.append(
            f"""
            <article class="resource-card contact-card">
              <p class="card-type">{esc(link.get("kind", "link"))}</p>
              <h3><a href="{esc(url)}" target="_blank" rel="noopener noreferrer">{esc(label)}</a></h3>
              <p class="card-summary">{esc(description)}</p>
              <p class="contact-url">{esc(url)}</p>
            </article>
            """
        )
    return f"""
    <section id="contact" class="single-page-section" data-section="contact" tabindex="-1">
      <div class="layout-container page-stack">
        {render_section_header(payload, "contact", "nav.contact")}
        <article class="post-shell prose notebook-sheet" data-content-key="{esc(key)}" data-content-field="body">
          {language_value(item, "body_html")}
        </article>
        <section class="section-panel">
          <div class="contact-grid">
            {"".join(cards)}
          </div>
        </section>
      </div>
    </section>
    """


def nav_links(payload: dict[str, Any]) -> str:
    parts = []
    for section, key, icon in NAV_SECTIONS:
        active = " is-active" if section == "home" else ""
        current = ' aria-current="page"' if section == "home" else ""
        parts.append(
            f"""
            <a class="nav-link{active}"{current} href="#{esc(section)}" data-nav-section="{esc(section)}">
              {render_icon(icon, "site-icon nav-link-icon")}
              <span class="icon-label" data-ui-key="{esc(key)}">{esc(ui(payload, key))}</span>
            </a>
            """
        )
    return "".join(parts)


def render_nav(payload: dict[str, Any]) -> str:
    links = nav_links(payload)
    language_buttons = "".join(
        f'<button type="button" class="language-option" data-language-option="{esc(language)}">{esc(language)}</button>'
        for language in LANGUAGES
    )
    return f"""
    <nav class="navbar single-page-navbar" data-nav-shell>
      <div class="layout-container navbar-mobile">
        <div class="navbar-left">
          <button class="nav-btn-icon nav-btn-menu navbar-toggle mobile-only" type="button" data-nav-toggle aria-label="Abrir menu" aria-controls="mobile-drawer" aria-expanded="false">
            <i data-lucide="menu" class="menu-icon-open"></i>
            <i data-lucide="x" class="menu-icon-close hidden"></i>
          </button>
          <div class="nav-brand desktop-only">
            <a class="nav-title" href="#home"><span class="brand-accent">NHM</span>ATSUMOTO</a>
          </div>
        </div>

        <div class="navbar-center">
          <div class="nav-brand navbar-brand-mobile mobile-only">
            <a class="nav-title" href="#home"><span class="brand-accent">NHM</span>ATSUMOTO</a>
          </div>
          <div class="nav-primary-links desktop-only">{links}</div>
        </div>

        <div class="nav-actions navbar-right">
          <div class="nav-group">
            <button class="nav-btn-icon nav-btn-locale" type="button" data-language-cycle aria-label="Trocar idioma">
              <i data-lucide="languages"></i>
              <span class="locale-label" data-language-label>PT-BR</span>
            </button>
            <button class="nav-btn-icon nav-btn-theme" type="button" data-theme-toggle aria-label="Alternar tema">
              <i data-lucide="moon" class="theme-icon-moon"></i>
              <i data-lucide="sun" class="theme-icon-sun hidden"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
    <div class="nav-drawer" id="mobile-drawer" aria-hidden="true">
      <div class="drawer-backdrop" data-nav-toggle></div>
      <div class="drawer-content">
        <div class="drawer-links">{links}</div>
        <div class="single-page-language-options" aria-label="Language">{language_buttons}</div>
      </div>
    </div>
    """


def render_html(payload: dict[str, Any]) -> str:
    site = load_site()
    system = load_system()
    title = site.get("title", "nhmatsumoto.github.io")
    description = site.get("description", "")
    canonical = site.get("base_url", "").rstrip("/") or "."
    generated = now_local().isoformat(timespec="seconds")

    body = "\n".join(
        [
            render_home(payload, site),
            render_about(payload),
            render_collection(payload, "projects", "sections.projects.kicker"),
            render_collection(payload, "posts", "sections.posts.kicker"),
            render_collection(payload, "daily", "sections.daily.kicker"),
            render_collection(payload, "docs", "sections.docs.kicker"),
            render_contact(payload, system),
        ]
    )

    embedded_payload = safe_json(payload)
    return f"""<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{esc(title)} | single page</title>
    <meta name="description" content="{esc(description)}">
    <link rel="canonical" href="{esc(canonical)}/">
    <meta property="og:title" content="{esc(title)}">
    <meta property="og:description" content="{esc(description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="{esc(canonical)}/">
    <meta name="twitter:card" content="summary">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/styles.css">
    <script src="https://unpkg.com/lucide@latest" defer></script>
    <script id="single-page-translations" type="application/json">{embedded_payload}</script>
    <script src="assets/app.js" defer></script>
  </head>
  <body class="page-home page-single" data-default-language="pt-BR" data-language="pt-BR">
    <a class="skip-link" href="#content">Ir para o conteudo</a>
    <div class="site-shell">
      {render_nav(payload)}
      <main class="site-main single-page-main" id="content">
        {body}
      </main>
      <footer class="site-footer">
        <div class="layout-container site-footer-inner">
          <p>
            <span data-ui-key="meta.generated">{esc(ui(payload, "meta.generated"))}</span>
            <span class="footer-separator" aria-hidden="true">|</span>
            <span>{esc(generated)}</span>
          </p>
        </div>
      </footer>
    </div>
    <noscript>
      <div class="layout-container single-page-noscript">A navegacao por anchors funciona sem JavaScript; a troca de idioma exige JavaScript.</div>
    </noscript>
  </body>
</html>
"""


def copy_assets(output_dir: Path, translations_result: dict[str, Any]) -> None:
    assets_dir = output_dir / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "assets" / "styles.css", assets_dir / "styles.css")
    shutil.copy2(ROOT / "assets" / "app.js", assets_dir / "app.js")
    translations_path = Path(translations_result["path"])
    if translations_path.resolve() != (assets_dir / "translations.json").resolve():
        shutil.copy2(translations_path, assets_dir / "translations.json")
    images_src = ROOT / "assets" / "images"
    images_dst = assets_dir / "images"
    if images_src.exists():
        if images_dst.exists():
            shutil.rmtree(images_dst)
        shutil.copytree(images_src, images_dst)


def build_single_page(
    output_dir: str | Path | None = None,
    *,
    db_path: str | Path | None = None,
    sync_source: bool = False,
) -> dict[str, Any]:
    target = Path(output_dir) if output_dir else DEFAULT_OUTPUT_DIR
    target.mkdir(parents=True, exist_ok=True)
    assets_dir = target / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    payload = consolidate_translations(db_path or DEFAULT_DB_PATH, sync_source=sync_source)
    translations_result = export_translations(assets_dir / "translations.json", db_path=db_path or DEFAULT_DB_PATH)
    copy_assets(target, translations_result)
    index_html = render_html(payload)
    (target / "index.html").write_text(index_html, encoding="utf-8")

    with connect(db_path or DEFAULT_DB_PATH) as conn:
        ensure_schema(conn)
        log_build(conn, "build_single_page", "ok", f"Generated {target / 'index.html'}")

    return {
        "output": str(target / "index.html"),
        "assets": [
            str(assets_dir / "styles.css"),
            str(assets_dir / "app.js"),
            str(assets_dir / "translations.json"),
        ],
        "stats": payload.get("stats", {}),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build dist/index.html as a GitHub Pages-ready single page.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT_DIR), help="Output directory.")
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH), help="SQLite database path.")
    parser.add_argument("--sync-source", action="store_true", help="Overwrite database rows from TOML/Markdown sources before build.")
    args = parser.parse_args()
    print(json.dumps(build_single_page(args.output, db_path=args.db, sync_source=args.sync_source), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
