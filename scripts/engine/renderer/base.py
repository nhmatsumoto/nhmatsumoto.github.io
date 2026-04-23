import html
import json
import os
import re
from typing import Any
from ..utils import site_href, normalize_string_list
from ..i18n import translate
from .components import NAV_ICON_BY_KEY, render_icon

GA_MEASUREMENT_ID_RE = re.compile(r"^G-[A-Z0-9]+$")
GTM_CONTAINER_ID_RE = re.compile(r"^GTM-[A-Z0-9]+$")


def analytics_id_from_config(analytics: dict[str, Any], id_key: str, env_key: str, default_env: str) -> str:
    env_name = str(analytics.get(env_key, default_env) or "").strip()
    value = str(os.environ.get(env_name, "") if env_name else "").strip()
    if not value:
        value = str(analytics.get(id_key, "") or "").strip()
    return value.upper()


def render_google_tag_manager_head(config: dict[str, Any], container_id: str) -> str:
    analytics = config.get("analytics", {})
    allowed_hostnames = normalize_string_list(analytics.get("allowed_hostnames", []))
    container_json = json.dumps(container_id)
    hosts_json = json.dumps(allowed_hostnames)
    return f"""<!-- Google Tag Manager -->
    <script>
      (function (w, d, s, l, i, allowedHostnames) {{
        var hostname = w.location.hostname;
        if (allowedHostnames.length && allowedHostnames.indexOf(hostname) === -1) {{
          return;
        }}

        w[l] = w[l] || [];
        w[l].push({{ 'gtm.start': new Date().getTime(), event: 'gtm.js' }});
        var f = d.getElementsByTagName(s)[0];
        var j = d.createElement(s);
        var dl = l != 'dataLayer' ? '&l=' + l : '';
        j.async = true;
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
        f.parentNode.insertBefore(j, f);
      }})(window, document, 'script', 'dataLayer', {container_json}, {hosts_json});
    </script>
    <!-- End Google Tag Manager -->"""


def render_google_tag_manager_body(config: dict[str, Any], container_id: str) -> str:
    analytics = config.get("analytics", {})
    allowed_hostnames = normalize_string_list(analytics.get("allowed_hostnames", []))
    hosts_json = html.escape(json.dumps(allowed_hostnames), quote=True)
    src = f"https://www.googletagmanager.com/ns.html?id={html.escape(container_id)}"
    return (
        '<noscript data-analytics-noscript="gtm" '
        f"data-allowed-hostnames=\"{hosts_json}\">"
        f'<iframe src="{src}" height="0" width="0" style="display:none;visibility:hidden"></iframe>'
        "</noscript>"
    )


def render_google_analytics_head(config: dict[str, Any], measurement_id: str) -> str:
    analytics = config.get("analytics", {})
    allowed_hostnames = normalize_string_list(analytics.get("allowed_hostnames", []))
    debug = bool(analytics.get("debug", False))
    measurement_json = json.dumps(measurement_id)
    hosts_json = json.dumps(allowed_hostnames)
    debug_json = json.dumps(debug)
    return f"""<!-- Google tag (gtag.js) -->
    <script>
      (function (window, document, measurementId, allowedHostnames, debugMode) {{
        var hostname = window.location.hostname;
        if (allowedHostnames.length && allowedHostnames.indexOf(hostname) === -1) {{
          return;
        }}

        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () {{ window.dataLayer.push(arguments); }};
        window.gtag('js', new Date());
        window.gtag('config', measurementId, {{ debug_mode: debugMode }});

        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
        document.head.appendChild(script);
      }})(window, document, {measurement_json}, {hosts_json}, {debug_json});
    </script>"""


def resolve_analytics_ids(config: dict[str, Any]) -> tuple[str, str]:
    analytics = config.get("analytics", {})
    if not analytics.get("enabled", True):
        return "", ""

    container_id = analytics_id_from_config(analytics, "container_id", "container_id_env", "GTM_CONTAINER_ID")
    measurement_id = analytics_id_from_config(analytics, "measurement_id", "measurement_id_env", "GA_MEASUREMENT_ID")
    if not GTM_CONTAINER_ID_RE.match(container_id):
        container_id = ""
    if not GA_MEASUREMENT_ID_RE.match(measurement_id):
        measurement_id = ""
    return container_id, measurement_id


def render_analytics_head(config: dict[str, Any]) -> str:
    container_id, measurement_id = resolve_analytics_ids(config)
    if container_id:
        return render_google_tag_manager_head(config, container_id)
    if measurement_id:
        return render_google_analytics_head(config, measurement_id)
    return ""


def render_analytics_body(config: dict[str, Any]) -> str:
    container_id, _ = resolve_analytics_ids(config)
    if not container_id:
        return ""
    return render_google_tag_manager_body(config, container_id)


def render_site_nav(site: dict[str, str], system: dict[str, Any], active_nav: str, i18n: dict[str, Any], locale: str) -> str:
    search_label = translate(i18n, locale, "nav.search", "search")
    search_aria = translate(i18n, locale, "accessibility.command_palette", "Command palette")
    supported_locales = i18n.get("supported_locales", [])
    locale_codes = " · ".join(str(code).split("-")[0].upper() for code in supported_locales if code)
    nav_items = [
        ("about", "nav.about", "/about/"),
        ("posts", "nav.posts", "/posts/"),
        ("daily", "nav.daily", "/daily/"),
        ("projects", "nav.projects", "/projects/"),
        ("documents", "nav.documents", "/documents/"),
    ]
    def render_nav_link(key: str, i18n_key: str, url: str) -> str:
        active_class = " is-active" if active_nav == key else ""
        current_attr = ' aria-current="page"' if active_nav == key else ""
        label = translate(i18n, locale, i18n_key, key)
        return (
            f'<a class="nav-link{active_class}"{current_attr} href="{site_href(site, url)}">'
            f'{render_icon(NAV_ICON_BY_KEY.get(i18n_key, "circle"), "site-icon nav-link-icon")}'
            f'<span class="icon-label" data-i18n="{html.escape(i18n_key)}">{html.escape(label)}</span></a>'
        )

    primary_links = "".join(render_nav_link(key, i18n_key, url) for key, i18n_key, url in nav_items)
    return f"""
    <nav class="nav-shell" data-nav-shell>
      <div class="nav-brand">
        <a class="nav-title" href="{site_href(site, "/")}"><span class="brand-accent">NHM</span>ATSUMOTO</a>
      </div>
      <div class="nav-primary-links">{primary_links}</div>
      <div class="nav-actions">
        <button class="nav-btn-icon nav-btn-search" type="button" data-open-palette aria-label="{html.escape(search_aria)}" data-i18n-aria-label="accessibility.command_palette">
          <i data-lucide="search"></i>
          <span class="nav-btn-label" data-i18n="nav.search">{html.escape(search_label)}</span>
          <span class="nav-btn-shortcut" aria-hidden="true">Ctrl/⌘ K</span>
        </button>
        <button class="nav-btn-icon nav-btn-locale" type="button" data-locale-toggle aria-label="{html.escape(translate(i18n, locale, "nav.language_action", "Switch language"))}" data-i18n-aria-label="nav.language_action">
          <i data-lucide="languages"></i>
          <span class="locale-label" data-locale-label>{html.escape(locale.upper())}</span>
          {f'<span class="locale-available" aria-hidden="true">{html.escape(locale_codes)}</span>' if locale_codes else ""}
        </button>
        <button class="nav-btn-icon nav-btn-theme" type="button" data-theme-toggle aria-label="{html.escape(translate(i18n, locale, "nav.theme", "Toggle theme"))}" data-i18n-aria-label="nav.theme"><i data-lucide="moon" class="theme-icon-moon"></i><i data-lucide="sun" class="theme-icon-sun hidden"></i></button>
      </div>
    </nav>
    """

def render_footer(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    github_url = site.get("github_url", "https://github.com/nhmatsumoto")
    engine_url = site.get("engine_url") or f"{github_url}/nhmatsumoto.github.io"
    developed_by = translate(i18n, locale, "footer.developed_by", "desenvolvido por")
    blog_engine = translate(i18n, locale, "footer.blog_engine", "blog engine")
    return f"""
    <footer class="site-footer">
      <p>
        <span data-i18n="footer.developed_by">{html.escape(developed_by)}</span>
        <a href="{github_url}" target="_blank" rel="noopener noreferrer">{render_icon("git-branch", "site-icon footer-icon")}<span>NHMatsumoto</span>{render_icon("arrow-up-right", "site-icon external-icon")}</a>
        <span class="footer-separator" aria-hidden="true">|</span>
        <a href="{engine_url}" target="_blank" rel="noopener noreferrer">{render_icon("square-terminal", "site-icon footer-icon")}<span data-i18n="footer.blog_engine">{html.escape(blog_engine)}</span>{render_icon("arrow-up-right", "site-icon external-icon")}</a>
      </p>
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
          {render_icon("search", "site-icon palette-head-icon")}
          <input class="palette-input" type="search" placeholder="{html.escape(placeholder)}" data-palette-input data-i18n-placeholder="palette.placeholder">
          <button class="palette-close" type="button" data-close-palette>{render_icon("x", "site-icon palette-close-icon")}<span data-i18n="palette.close">{html.escape(close_label)}</span></button>
        </div>
        <p class="palette-hint" data-i18n="palette.hint">{html.escape(hint)}</p>
        <ul class="palette-results" data-palette-results></ul>
      </div>
    </div>
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
    analytics_head_html = render_analytics_head(config)
    analytics_body_html = render_analytics_body(config)

    import_map = {"imports": {"zustand": "https://unpkg.com/zustand@4.4.1/esm/vanilla.mjs"}}
    import_map_html = f'<script type="importmap">{json.dumps(import_map)}</script>'

    return f"""<!DOCTYPE html>
<html lang="{html.escape(locale)}" data-theme="dark">
  <head>
    {analytics_head_html}
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <title>{html.escape(page_title)}</title><meta name="description" content="{html.escape(page_description)}">
    <link rel="canonical" href="{html.escape(site_href(site, canonical_path))}">
    {rss_link}
    {og_html}
    <link rel="stylesheet" href="{site_href(site, '/assets/' + hashed('styles.css'))}">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>document.addEventListener('DOMContentLoaded', () => {{ mermaid.initialize({{ startOnLoad: false, theme: 'dark' }}); lucide.createIcons(); }});</script>
    {math_meta}
    {import_map_html}
  </head>
  <body class="{html.escape(body_class)}" data-has-math="{str(has_math).lower()}" data-default-locale="{html.escape(locale)}" data-locale="{html.escape(locale)}">
    {analytics_body_html}
    <a class="skip-link" href="#content" data-i18n="accessibility.skip_to_content">{html.escape(translate(i18n, locale, "accessibility.skip_to_content", "Ir para o conteúdo"))}</a>
    {render_site_nav(site, system, active_nav, i18n, locale)}
    <div class="site-shell">
      <main class="site-main" id="content">{content}</main>
      {render_footer(site, system, i18n, locale)}
    </div>
    {render_palette(site, i18n, locale)}
    <div class="sidebar-backdrop" data-sidebar-toggle></div>
    <script id="site-i18n" type="application/json">{i18n_payload}</script>
    <script src="{site_href(site, '/assets/' + hashed('blog.js'))}" type="module"></script>
    {scripts_html}
  </body>
</html>
"""
