import html
import json
from typing import Any
from ..utils import site_href, normalize_string_list
from ..i18n import translate

def render_site_nav(site: dict[str, str], system: dict[str, Any], active_nav: str, i18n: dict[str, Any], locale: str) -> str:
    header = system.get("layout", {}).get("header", {})
    nav_items = normalize_string_list(header.get("nav", [])) or ["posts", "projects", "documents", "about"]
    
    def nav_url(item):
        mapping = {"posts": "/publications/", "projects": "/projects/", "documents": "/documents/", "about": "/about/"}
        return site_href(site, mapping.get(item, "/"))

    pill_links = "".join(
        f'<a class="nav-pill" href="{nav_url(it)}" '
        f'{"aria-current=\"page\"" if it == active_nav else ""} '
        f'data-i18n="nav.{it}">'
        f'{html.escape(translate(i18n, locale, f"nav.{it}", it))}</a>'
        for it in nav_items
    )

    search_label = translate(i18n, locale, "nav.search", "command palette")
    return f"""
    <nav class="nav-shell" data-nav-shell>
      <div class="nav-brand">
        <a class="nav-title" href="{site_href(site, "/")}"><span class="brand-accent">NHM</span>ATSUMOTO</a>
      </div>
      <div class="nav-menu desktop-only">{pill_links}</div>
      <div class="nav-actions">
        <div class="nav-divider desktop-only"></div>
        <button class="nav-button" type="button" data-open-palette aria-label="{html.escape(search_label)}"><i data-lucide="search"></i></button>
        <button class="nav-button" type="button" data-theme-toggle aria-label="Toggle theme"><i data-lucide="moon" class="theme-icon-moon"></i><i data-lucide="sun" class="theme-icon-sun hidden"></i></button>
        <button class="nav-button mobile-only" type="button" data-nav-toggle aria-label="Toggle menu"><i data-lucide="menu" class="nav-icon-menu"></i><i data-lucide="x" class="nav-icon-close hidden"></i></button>
      </div>
      <div class="nav-drawer" data-nav-menu hidden>
        <div class="drawer-backdrop" data-nav-toggle></div>
        <div class="drawer-content">
          <div class="drawer-header"><span class="nav-title"><span class="brand-accent">NHM</span>ATSUMOTO</span><button class="nav-button" type="button" data-nav-toggle><i data-lucide="x"></i></button></div>
          <div class="drawer-links">{pill_links}</div>
          <div class="drawer-footer"><div class="drawer-social">
            {"".join(f'<a class="drawer-social-link" href="{html.escape(url)}" target="_blank" rel="noopener noreferrer"><i data-lucide="{icon}"></i><span>{label}</span></a>' for label, icon, url in [("GitHub", "github", site.get("github_url", "")), ("LinkedIn", "linkedin", site.get("linkedin_url", ""))] if url)}
          </div></div>
        </div>
      </div>
    </nav>
    """

def render_footer(site: dict[str, str], system: dict[str, Any]) -> str:
    github_url = site.get("github_url", "https://github.com/nhmatsumoto")
    engine_url = f"{github_url}/nhmatsumoto-blog-engine"
    return f"""
    <footer class="site-footer">
      <p>desenvolvido por <a href="{github_url}" target="_blank" rel="noopener noreferrer">NHMatsumoto</a> | <a href="{engine_url}" target="_blank" rel="noopener noreferrer">blog engine</a></p>
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
      <div class="palette-panel" role="dialog" aria-modal="true" aria-label="{html.escape(aria_label)}" data-i18n-aria-label="accessibility.command_palette">
        <div class="palette-head">
          <input class="palette-input" type="search" placeholder="{html.escape(placeholder)}" data-palette-input data-i18n-placeholder="palette.placeholder">
          <button class="palette-close" type="button" data-close-palette data-i18n="palette.close">{html.escape(close_label)}</button>
        </div>
        <p class="palette-hint" data-i18n="palette.hint">{html.escape(hint)}</p>
        <ul class="palette-results" data-palette-results></ul>
      </div>
    </div>
    """

def render_layout(*, page_title: str, page_description: str, site: dict[str, str], system: dict[str, Any], body_class: str, canonical_path: str, has_math: bool, content: str, active_nav: str, i18n: dict[str, Any], locale: str, extra_scripts: list[str] | None = None) -> str:
    from ..utils import load_blog_config
    config = load_blog_config()
    math_config = config.get("math", {})
    math_meta = ""
    if has_math and math_config.get("enabled"):
        math_meta = (
            '<script>window.MathJax = { '
            'tex: { inlineMath: [["\\\\(", "\\\\)"], ["$", "$"]], displayMath: [["$$", "$$"]] }, '
            'loader: { load: ["input/tex", "output/chtml"] } '
            '};</script>'
            f'<script src="{html.escape(math_config.get("script_url", ""))}" id="MathJax-script" async></script>'
        )

    i18n_payload = json.dumps({
        "defaultLocale": i18n.get("default_locale", locale),
        "supportedLocales": i18n.get("supported_locales", []),
        "languageNames": i18n.get("language_names", {}),
        "strings": i18n.get("strings", {}),
    }, ensure_ascii=False).replace("<", "\\u003c")
    scripts_html = "\n    ".join(
        f'<script src="{site_href(site, f"/assets/{s.split("?")[0]}")}" {"type=\"module\"" if "?module=true" in s else "defer"}></script>'
        for s in (extra_scripts or [])
    )

    return f"""<!DOCTYPE html>
<html lang="{html.escape(locale)}" data-theme="dark">
  <head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <title>{html.escape(page_title)}</title><meta name="description" content="{html.escape(page_description)}">
    <link rel="canonical" href="{html.escape(site_href(site, canonical_path))}">
    <link rel="stylesheet" href="{site_href(site, '/assets/styles.css')}">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>document.addEventListener('DOMContentLoaded', () => {{ mermaid.initialize({{ startOnLoad: true, theme: 'dark' }}); lucide.createIcons(); }});</script>
    {math_meta}
  </head>
  <body class="{html.escape(body_class)}" data-has-math="{str(has_math).lower()}" data-default-locale="{html.escape(locale)}">
    <a class="skip-link" href="#content" data-i18n="accessibility.skip_to_content">{html.escape(translate(i18n, locale, "accessibility.skip_to_content", "Ir para o conteúdo"))}</a>
    {render_site_nav(site, system, active_nav, i18n, locale)}
    <div class="site-shell">
      <main class="site-main" id="content">{content}</main>
      {render_footer(site, system)}
    </div>
    {render_palette(site, i18n, locale)}
    <script id="site-i18n" type="application/json">{i18n_payload}</script>
    <script src="{site_href(site, '/assets/blog.js')}" defer></script>
    <script src="{site_href(site, '/assets/graphview.js')}" defer></script>
    <script src="{site_href(site, '/assets/btree-view.js')}" defer></script>
    {scripts_html}
  </body>
</html>
"""
