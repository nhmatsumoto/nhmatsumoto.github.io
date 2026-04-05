import html
import json
from typing import Any
from ..utils import site_href, normalize_string_list
from ..i18n import translate

def render_site_nav(site: dict[str, str], system: dict[str, Any], active_nav: str, i18n: dict[str, Any], locale: str) -> str:
    search_label = translate(i18n, locale, "nav.search", "command palette")
    return f"""
    <nav class="nav-shell" data-nav-shell>
      <div class="nav-brand">
        <a class="nav-title" href="{site_href(site, "/")}"><span class="brand-accent">NHM</span>ATSUMOTO</a>
      </div>
      <div class="nav-actions">
        <button class="nav-btn-icon nav-btn-search" type="button" data-open-palette aria-label="{html.escape(search_label)}"><i data-lucide="search"></i></button>
        <button class="nav-btn-icon nav-btn-vis" type="button" data-vis-toggle aria-label="Toggle Tree/Atom View"><i data-lucide="git-branch"></i></button>
        <button class="nav-btn-icon nav-btn-locale" type="button" data-locale-toggle aria-label="Toggle language"><i data-lucide="languages"></i><span class="locale-label" data-locale-label>PT</span></button>
        <button class="nav-btn-icon nav-btn-theme" type="button" data-theme-toggle aria-label="Toggle theme"><i data-lucide="moon" class="theme-icon-moon"></i><i data-lucide="sun" class="theme-icon-sun hidden"></i></button>
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

def render_intelligence_panel(site: dict[str, str], i18n: dict[str, Any], locale: str) -> str:
    close_label = translate(i18n, locale, "actions.close", "Fechar")
    view_label = translate(i18n, locale, "actions.view_content", "Ver conteúdo")
    return f"""
    <aside class="intelligence-panel" data-intelligence-panel data-open="false" aria-hidden="true">
      <div class="panel-backdrop" data-panel-close></div>
      <div class="panel-content">
        <div class="panel-header" data-reveal>
          <div class="panel-title-group">
            <span class="panel-role card-type" data-panel-role></span>
            <h2 class="panel-name" data-panel-name></h2>
            <div class="panel-meta-row" data-panel-meta-row></div>
          </div>
          <button class="nav-button panel-close" type="button" data-panel-close aria-label="{html.escape(close_label)}">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="panel-scroll-body">
          <p class="panel-headline" data-panel-headline data-reveal></p>
          <div class="panel-summary prose" data-panel-summary data-reveal></div>
          <div class="panel-stack" data-panel-stack data-reveal></div>
          <div class="panel-metrics" data-panel-metrics data-reveal></div>
        </div>
        <div class="panel-actions" data-reveal>
          <a class="panel-cta nav-cta" href="#" data-panel-link>
            <i data-lucide="eye"></i> {html.escape(view_label)} <i data-lucide="arrow-right"></i>
          </a>
        </div>
      </div>
    </aside>
    """

def render_og_tags(og: dict[str, str]) -> str:
    tags = [
        f'<meta property="og:title" content="{html.escape(og["title"])}">',
        f'<meta property="og:description" content="{html.escape(og["description"])}">',
        f'<meta property="og:url" content="{html.escape(og["url"])}">',
        f'<meta property="og:type" content="{html.escape(og.get("type", "article"))}">',
        f'<meta name="twitter:card" content="{html.escape(og.get("twitter_card", "summary"))}">',
        f'<meta name="twitter:title" content="{html.escape(og["title"])}">',
        f'<meta name="twitter:description" content="{html.escape(og["description"])}">',
    ]
    if og.get("image"):
        tags += [
            f'<meta property="og:image" content="{html.escape(og["image"])}">',
            f'<meta name="twitter:image" content="{html.escape(og["image"])}">',
        ]
    return "\n    ".join(tags)

def render_layout(*, page_title: str, page_description: str, site: dict[str, str], system: dict[str, Any], body_class: str, canonical_path: str, has_math: bool, content: str, active_nav: str, i18n: dict[str, Any], locale: str, extra_scripts: list[str] | None = None, og: dict[str, str] | None = None) -> str:
    from ..utils import load_blog_config
    config = load_blog_config()
    math_config = config.get("math", {})
    math_meta = ""
    if has_math and math_config.get("enabled"):
        math_meta = (
            '<script>window.MathJax = { '
            'tex: { inlineMath: [["\\\\(", "\\\\)"], ["$", "$"]], displayMath: [["$$", "$$"]] }, '
            'asciimath: { delimiters: [["`", "`"]] }, '
            'loader: { load: ["input/tex", "input/asciimath", "output/chtml"] } '
            '};</script>'
            f'<script src="{html.escape(math_config.get("script_url", ""))}" id="MathJax-script" async></script>'
        )

    i18n_payload = json.dumps({
        "defaultLocale": i18n.get("default_locale", locale),
        "supportedLocales": i18n.get("supported_locales", []),
        "languageNames": i18n.get("language_names", {}),
        "strings": i18n.get("strings", {}),
    }, ensure_ascii=False).replace("<", "\\u003c")

    asset_manifest: dict[str, str] = system.get("asset_manifest", {})

    def hashed(name: str) -> str:
        return asset_manifest.get(name, name)

    scripts_html = "\n    ".join(
        f'<script src="{site_href(site, f"/assets/{hashed(s.split(chr(63))[0])}")}" {"type=\"module\"" if "?module=true" in s else "defer"}></script>'
        for s in (extra_scripts or [])
    )

    rss_file = config.get("build", {}).get("rss_file", "feed.xml")
    rss_link = f'<link rel="alternate" type="application/rss+xml" title="{html.escape(site.get("title", ""))} RSS" href="{html.escape(site_href(site, "/" + rss_file))}">'

    og_html = f"\n    {render_og_tags(og)}" if og else ""

    import_map = {
        "imports": {
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
            "@tweenjs/tween.js": "https://unpkg.com/@tweenjs/tween.js@23.0.0/dist/tween.esm.js",
            "zustand": "https://unpkg.com/zustand@4.4.1/esm/vanilla.mjs"
        }
    }
    import_map_html = f'<script type="importmap">{json.dumps(import_map)}</script>'

    return f"""<!DOCTYPE html>
<html lang="{html.escape(locale)}" data-theme="dark">
  <head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <title>{html.escape(page_title)}</title><meta name="description" content="{html.escape(page_description)}">
    <link rel="canonical" href="{html.escape(site_href(site, canonical_path))}">
    {rss_link}
    {og_html}
    <link rel="stylesheet" href="{site_href(site, '/assets/' + hashed('styles.css'))}">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>document.addEventListener('DOMContentLoaded', () => {{ mermaid.initialize({{ startOnLoad: true, theme: 'dark' }}); lucide.createIcons(); }});</script>
    {math_meta}
    {import_map_html}
  </head>
  <body class="{html.escape(body_class)}" data-has-math="{str(has_math).lower()}" data-default-locale="{html.escape(locale)}">
    <a class="skip-link" href="#content" data-i18n="accessibility.skip_to_content">{html.escape(translate(i18n, locale, "accessibility.skip_to_content", "Ir para o conteúdo"))}</a>
    {render_site_nav(site, system, active_nav, i18n, locale)}
    <div class="site-shell">
      <main class="site-main" id="content">{content}</main>
      {render_footer(site, system)}
      {render_intelligence_panel(site, i18n, locale)}
    </div>
    {render_palette(site, i18n, locale)}
    <div class="sidebar-backdrop" data-sidebar-toggle></div>
    <script id="site-i18n" type="application/json">{i18n_payload}</script>
    <script src="{site_href(site, '/assets/' + hashed('blog.js'))}" type="module"></script>
    <script src="{site_href(site, '/assets/' + hashed('graphview.js'))}" defer></script>
    <script src="{site_href(site, '/assets/' + hashed('btree-view.js'))}" defer></script>
    {scripts_html}
  </body>
</html>
"""
