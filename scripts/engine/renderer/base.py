import html
import json
from typing import Any
from ..i18n import translate, default_locale
from ..utils import load_blog_config, site_href

def render_navigation_section(site: dict[str, str], i18n: dict[str, Any], locale: str, active_nav: str = "") -> str:
    links = [
        {"label": translate(i18n, locale, "nav.home", "home"), "url": "/", "key": "nav.home", "id": "home"},
        {"label": translate(i18n, locale, "nav.posts", "posts"), "url": "/publications/", "key": "nav.posts", "id": "posts"},
        {"label": translate(i18n, locale, "nav.projects", "projects"), "url": "/projects/", "key": "nav.projects", "id": "projects"},
        {"label": translate(i18n, locale, "nav.documents", "documents"), "url": "/documents/", "key": "nav.documents", "id": "documents"},
        {"label": translate(i18n, locale, "nav.about", "about"), "url": "/about/", "key": "nav.about", "id": "about"},
    ]
    
    html_links = []
    for link in links:
        is_active = active_nav == link["id"] or active_nav == link["url"].strip("/")
        active_class = ' active' if is_active else ''
        aria_current = ' aria-current="page"' if is_active else ''
        href = site_href(site, link["url"])
        html_links.append(
            f'<a class="nav-link{active_class}" href="{html.escape(href)}"{aria_current} data-i18n="{link["key"]}">{html.escape(link["label"])}</a>'
        )
    return "\n".join(html_links)

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
    extra_scripts: list[str] | None = None,
) -> str:
    config = load_blog_config()
    math = config["math"]
    math_meta = ""
    if has_math and math["enabled"]:
        math_meta = f"""
    <meta name="x-asciimath-inline" content="{html.escape(math['inline_delimiter'], quote=True)}">
    <meta name="x-asciimath-block" content="{html.escape(math['block_delimiter'], quote=True)}">
    <script src="{html.escape(math['script_url'], quote=True)}" async></script>
    """

    scripts_html = ""
    if extra_scripts:
        for s in extra_scripts:
            scripts_html += f'<script src="{site_href(site, f"/assets/{s}")}" defer></script>\n'

    return f"""<!DOCTYPE html>
<html lang="{html.escape(locale)}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{html.escape(page_title)}</title>
    <meta name="description" content="{html.escape(page_description)}">
    <link rel="canonical" href="{html.escape(site_href(site, canonical_path))}">
    <link rel="stylesheet" href="{site_href(site, "/assets/styles.css")}">
    {math_meta}
    <script src="{site_href(site, "/assets/blog.js")}" defer></script>
    {scripts_html}
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>">
</head>
<body class="{html.escape(body_class)}">
    <header class="main-nav">
        <div class="nav-container">
            <a href="{site_href(site, "/")}" class="nav-brand">
                <span class="brand-glyph">TK</span>
                <span class="brand-name">OS.</span>
            </a>
            <nav class="nav-menu">
                {render_navigation_section(site, i18n, locale, active_nav)}
            </nav>
            <div class="nav-actions">
                <button class="icon-button" id="search-toggle" aria-label="{html.escape(translate(i18n, locale, 'actions.search', 'Search'), quote=True)}" data-i18n-aria-label="actions.search">
                   <i data-lucide="search"></i>
                </button>
                <div class="locale-selector">
                    <button class="icon-button" id="locale-toggle" aria-label="Language">
                        <i data-lucide="languages"></i>
                    </button>
                    <div class="locale-dropdown" id="locale-dropdown">
                        {render_locale_options(i18n)}
                    </div>
                </div>
            </div>
            <button class="mobile-toggle" aria-label="Menu">
                <i data-lucide="menu"></i>
            </button>
        </div>
    </header>

    <main id="content">
        <div class="content-container">
            {content}
        </div>
    </main>

    <footer class="main-footer">
        <div class="footer-container">
            <div class="footer-info">
                <p>&copy; {datetime.now().year} {html.escape(str(site.get('author') or 'Hiro Matsumoto'))}. {html.escape(str(site.get('footer_note') or ''))}</p>
                <p class="footer-meta" data-i18n="common.generated">Built with custom SSG v2.</p>
            </div>
            <div class="footer-social">
                <a href="{html.escape(site.get('github_url', ''))}" target="_blank" rel="noopener">GitHub</a>
                <a href="{html.escape(site.get('linkedin_url', ''))}" target="_blank" rel="noopener">LinkedIn</a>
            </div>
        </div>
    </footer>

    <!-- Search Overlay -->
    <div id="search-overlay" class="search-overlay">
        <div class="search-modal">
            <div class="search-header">
                <i data-lucide="search"></i>
                <input type="text" id="search-input" placeholder="{html.escape(translate(i18n, locale, 'actions.search_placeholder', 'Search knowledge...'), quote=True)}" data-i18n-placeholder="actions.search_placeholder">
                <button id="search-close" class="close-button">ESC</button>
            </div>
            <div id="search-results" class="search-results"></div>
        </div>
    </div>

    <script src="https://unpkg.com/lucide@latest"></script>
    <script>lucide.createIcons();</script>
    <script src="{site_href(site, "/assets/blog.js")}" defer></script>
</body>
</html>
"""

def render_locale_options(i18n: dict[str, Any]) -> str:
    locales = i18n.get("supported_locales", [])
    names = i18n.get("language_names", {})
    return "\n".join(
        f'<button class="locale-option" data-locale="{l}">{html.escape(names.get(l, l))}</button>'
        for l in locales
    )

from datetime import datetime
