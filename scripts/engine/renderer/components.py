import html
import json
from datetime import datetime
from typing import Any
from ..utils import (
    site_href,
    normalize_string_list,
    summarize_body,
    HEADING_RE,
    UNORDERED_LIST_RE,
    ORDERED_LIST_RE,
    is_special_block_start,
)
from ..i18n import (
    translate,
    format_short_date_for_locale,
    format_long_date_for_locale,
)

def render_markdown(text: str) -> str:
    """Mock markdown renderer that ports the original code-shell and mermaid support."""
    # This should be a more robust implementation, but for now we'll match the original's structure
    # where possible or use a library if available. The original had a custom parser.
    # We will use the original's custom parser logic if it was in the backup.
    
    lines = text.replace("\r\n", "\n").split("\n")
    parts: list[str] = []
    index = 0

    def render_inline(s: str) -> str:
        s = html.escape(s)
        s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
        s = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", s)
        s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
        s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
        return s

    import re

    while index < len(lines):
        stripped = lines[index].strip()
        if not stripped:
            index += 1
            continue

        if stripped.startswith("```"):
            language = stripped[3:].strip()
            code_lines = []
            index += 1
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(lines[index])
                index += 1
            if index < len(lines): index += 1
            
            if language == "mermaid":
                parts.append(f'<div class="mermaid">{"\n".join(code_lines)}</div>')
            else:
                code_content = html.escape("\n".join(code_lines))
                lang_display = language if language else "text"
                parts.append(
                    f'<div class="code-shell" data-language="{html.escape(language)}">'
                    f'  <div class="code-shell-header">'
                    f'    <span class="code-shell-label">{html.escape(lang_display)}</span>'
                    f'    <button class="code-shell-copy" aria-label="Copy code">'
                    f'      <i data-lucide="copy"></i>'
                    f'    </button>'
                    f'  </div>'
                    f'  <pre><code class="language-{html.escape(language)}">{code_content}</code></pre>'
                    f'</div>'
                )
            continue

        # Simple Paragraph/Heading fallback
        if stripped.startswith("#"):
            level = len(re.match(r"#+", stripped).group(0))
            content = stripped.lstrip("#").strip()
            parts.append(f"<h{level}>{render_inline(content)}</h{level}>")
            index += 1
            continue

        parts.append(f"<p>{render_inline(stripped)}</p>")
        index += 1

    return "\n".join(parts)

def render_localized_date(value: datetime, locale: str, style: str = "long") -> str:
    if style == "short":
        label = format_short_date_for_locale(value, locale)
    else:
        label = format_long_date_for_locale(value, locale)
    return (
        f'<time datetime="{html.escape(value.isoformat(timespec="seconds"), quote=True)}" '
        f'data-localize-date="{html.escape(style, quote=True)}">{html.escape(label)}</time>'
    )

def render_reading_time(minutes: int, i18n: dict[str, Any], locale: str) -> str:
    template = translate(i18n, locale, "templates.reading_time", "{minutes} min read")
    label = template.replace("{minutes}", str(minutes))
    return f'<span data-reading-time="{minutes}">{html.escape(label)}</span>'

def render_tag_list(tags: list[str], class_name: str = "tag-list") -> str:
    if not tags: return ""
    items = "".join(f'<span class="tag">{html.escape(tag)}</span>' for tag in tags)
    return f'<div class="{class_name}">{items}</div>'

def render_badge_list(items: list[str]) -> str:
    if not items: return ""
    badges = "".join(f'<span class="badge">{html.escape(item)}</span>' for item in items)
    return f'<div class="badge-list">{badges}</div>'

def render_stack_list(items: list[str]) -> str:
    if not items: return ""
    chips = "".join(f'<span class="stack-chip">{html.escape(item)}</span>' for item in items)
    return f'<div class="stack-list">{chips}</div>'

def render_status_badge(status: str, i18n: dict[str, Any], locale: str) -> str:
    label = translate(i18n, locale, f"status.{status}", status.replace("_", " "))
    return f'<span class="status-chip status-{html.escape(status)}" data-status-key="status.{html.escape(status)}">{html.escape(label)}</span>'

def render_metric_list(items: list[str], *, escape_items: bool = True) -> str:
    metrics = [html.escape(it) if escape_items else it for it in items if it]
    if not metrics: return ""
    content = " &middot; ".join(f'<span class="metric">{it}</span>' for it in metrics)
    return f'<div class="card-metrics">{content}</div>'

def render_breadcrumbs(items: list[dict[str, str]], i18n: dict[str, Any], locale: str) -> str:
    if not items: return ""
    crumbs = []
    for item in items:
        label, key, url = item.get("label", ""), item.get("key", ""), item.get("url")
        attr = f' data-i18n="{html.escape(key)}"' if key else ""
        if url:
            crumbs.append(f'<li><a href="{html.escape(url)}"{attr}>{html.escape(label)}</a></li>')
        else:
            crumbs.append(f'<li><span aria-current="page"{attr}>{html.escape(label)}</span></li>')
    aria_label = translate(i18n, locale, "accessibility.breadcrumbs", "Breadcrumbs")
    return f'<nav class="breadcrumbs" aria-label="{html.escape(aria_label)}" data-i18n-aria-label="accessibility.breadcrumbs"><ol class="breadcrumb-list">{"".join(crumbs)}</ol></nav>'

def render_post_card(post: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    metrics = render_metric_list([
        render_localized_date(post["published_dt"], locale, "short"),
        render_reading_time(post["reading_time"], i18n, locale)
    ], escape_items=False)
    return f"""
    <li>
      <article class="resource-card post-card">
        <header class="card-headline">
          <div class="card-meta">
            <span class="card-type" data-i18n="kinds.post">{html.escape(translate(i18n, locale, "kinds.post", "post"))}</span>
            {metrics}
          </div>
          {render_badge_list(post["badges"])}
        </header>
        <div class="card-content">
          <h3><a href="{html.escape(post['resolved_url'])}">{html.escape(post['title'])}</a></h3>
          <p class="card-summary">{html.escape(post['summary'])}</p>
        </div>
        <footer>{render_tag_list(post["tags"])}</footer>
      </article>
    </li>
    """.strip()

def render_project_card(project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    preview = f'<div class="card-preview"><code>{html.escape(project["diagram_preview"])}</code></div>' if project["diagram_preview"] else ""
    return f"""
    <li>
      <article class="resource-card project-card">
        <header class="card-headline">
          <span class="card-type" data-i18n="kinds.project">{html.escape(translate(i18n, locale, "kinds.project", "project"))}</span>
          <div class="card-state">{render_status_badge(project["status"], i18n, locale)}</div>
        </header>
        <div class="card-content">
          <h3><a href="{html.escape(project['resolved_url'])}">{html.escape(project['name'])}</a></h3>
          <p class="card-summary">{html.escape(project['summary'])}</p>
          {render_stack_list(project["stack"])}
          {render_badge_list(project["badges"])}
          {preview}
        </div>
      </article>
    </li>
    """.strip()

def render_document_card(document: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    agent_tag = f'<span class="mini-flag" data-i18n="common.agent_generated">{html.escape(translate(i18n, locale, "common.agent_generated", "agent-generated"))}</span>' if document["agent_generated_tag"] else ""
    return f"""
    <li>
      <article class="resource-card document-card">
        <header class="card-headline">
          <span class="card-type">{html.escape(document['category'])}</span>
          <span class="card-version">v{html.escape(document['version'])}</span>
        </header>
        <div class="card-content">
          <h3><a href="{html.escape(document['resolved_url'])}">{html.escape(document['title'])}</a></h3>
          <p class="card-summary">{html.escape(document['summary'])}</p>
          <div class="document-flags">{agent_tag}</div>
        </div>
        <footer>{render_tag_list(document["tags"])}</footer>
      </article>
    </li>
    """.strip()

def render_publication_card(item: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    if item.get("kind") == "article": return render_post_card(item, i18n, locale)
    return render_document_card(item, i18n, locale)

def render_publications_grouped_section(system: dict[str, Any], publications: list[dict[str, Any]], i18n: dict[str, Any], locale: str, *, limit: int | None = None) -> str:
    items = publications[:limit] if limit is not None else publications
    from collections import defaultdict
    groups = defaultdict(list)
    for p in items: groups[p.get("category", "untyped")].append(p)
    
    layout_docs = system.get("layout", {}).get("documents", {})
    order = normalize_string_list(layout_docs.get("navigation", []))
    sorted_categories = order if order else sorted(groups.keys())
    
    blocks = []
    for cat in sorted_categories:
        group_items = groups.get(cat, [])
        if not group_items: continue
        cards = "\n".join(render_publication_card(it, i18n, locale) for it in group_items)
        blocks.append(f"""
        <section class="publication-group">
          <header class="group-header"><h3>{html.escape(cat.upper())}</h3></header>
          <ul class="resource-list">{cards}</ul>
        </section>
        """)

    empty_msg = translate(i18n, locale, "empty.publications", "No publications found.")
    content = "\n".join(blocks) if blocks else f'<p class="empty-state">{html.escape(empty_msg)}</p>'
    return f"""
    <section class="section-panel" aria-labelledby="pubs-title">
      <header class="section-header">
        <p class="section-kicker" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "publications"))}</p>
        <h2 id="pubs-title" data-i18n="sections.publications_title">{html.escape(translate(i18n, locale, "sections.publications_title", "Technical Knowledge OS"))}</h2>
        <p class="section-copy" data-i18n="sections.publications_copy">{html.escape(translate(i18n, locale, "sections.publications_copy", "Unified stream of architecture documents, technical articles and research notes."))}</p>
      </header>
      <div class="publications-grid">{content}</div>
    </section>
    """

def render_brain_map_section(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    links = [("nav.projects", site_href(site, "/projects/")), ("nav.posts", site_href(site, "/publications/")), ("nav.documents", site_href(site, "/documents/")), ("nav.about", site_href(site, "/about/"))]
    link_rows = "".join(f'<a class="brain-map-link" href="{html.escape(url)}" data-i18n="{html.escape(key)}">{html.escape(translate(i18n, locale, key, key.split(".")[-1]))}</a>' for key, url in links)
    return f"""
    <section class="section-panel brain-map-panel" aria-labelledby="brain-map-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="nav.graph">{html.escape(translate(i18n, locale, "nav.graph", "Mapa cerebral"))}</p>
          <h2 id="brain-map-title" data-i18n="sections.brain_map_title">{html.escape(translate(i18n, locale, "sections.brain_map_title", "Mapa cerebral vivo"))}</h2>
        </div>
        <p data-i18n="sections.brain_map_copy">{html.escape(translate(i18n, locale, "sections.brain_map_copy", "Use este mapa para navegar, ver conexões entre pensamentos e explorar os fluxos que formam o meu cérebro técnico."))}</p>
      </header>
      <div class="brain-map-shell">
        <div class="brain-map-links" aria-label="Mapa cerebral">{link_rows}</div>
        <div class="brain-map-canvas" data-knowledge-graph data-brain-map data-full-screen="false"></div>
      </div>
    </section>
    """

def render_developer_profile(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    dev = system.get("identity", {}).get("developer", {})
    hero = system.get("layout", {}).get("hero", {})
    name = str(dev.get("name") or site.get("author") or "Developer").strip()
    handle = str(dev.get("handle") or "").strip()
    role = str(dev.get("role") or "").strip()
    location = str(dev.get("location") or "").strip()
    stack = normalize_string_list(hero.get("stack", []))
    links = []
    if site.get("github_url"): links.append(f'<a class="profile-social-link" href="{html.escape(site["github_url"])}" target="_blank" rel="noopener noreferrer"><i data-lucide="github"></i><span>GitHub</span><i data-lucide="arrow-up-right" class="link-arrow"></i></a>')
    if site.get("linkedin_url"): links.append(f'<a class="profile-social-link" href="{html.escape(site["linkedin_url"])}" target="_blank" rel="noopener noreferrer"><i data-lucide="linkedin"></i><span>LinkedIn</span><i data-lucide="arrow-up-right" class="link-arrow"></i></a>')
    
    return f"""
    <article class="highlight-card profile-card">
      <p class="card-type" data-i18n="kinds.developer">{html.escape(translate(i18n, locale, "kinds.developer", "developer"))}</p>
      <div class="profile-identity">
        <div class="profile-avatar-block"><div class="profile-initials">{html.escape(name[:2].upper())}</div></div>
        <div class="profile-info"><h2 class="profile-name">{html.escape(name)}</h2>{f'<span class="profile-handle">{html.escape(handle)}</span>' if handle else ""}</div>
      </div>
      {f'<p class="profile-role">{html.escape(role)}</p>' if role else ""}
      {f'<p class="profile-location"><i data-lucide="map-pin"></i>{html.escape(location)}</p>' if location else ""}
      {render_stack_list(stack[:5])}
      <div class="profile-social">{" ".join(links)}</div>
    </article>
    """.strip()

def render_hero(site: dict[str, str], system: dict[str, Any], posts: list[dict[str, Any]], projects: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    hero = system.get("layout", {}).get("hero", {})
    headline = str(hero.get("headline") or site.get("home_title", "Welcome"))
    concept = str(system.get("blog", {}).get("concept", "technical notebook"))
    feels = normalize_string_list(system.get("identity", {}).get("feeling", []))
    
    highlight_cards = [render_developer_profile(site, system, i18n, locale)]
    main_proj = next((p for p in projects if p.get("featured")), projects[0] if projects else None)
    if main_proj:
        highlight_cards.append(f"""
        <article class="highlight-card h-full">
          <p class="card-type" data-i18n="home.highlight_main_project">{html.escape(translate(i18n, locale, "home.highlight_main_project", "main project"))}</p>
          <h2 class="text-3xl font-bold tracking-tighter mb-2"><a href="{html.escape(main_proj['resolved_url'])}">{html.escape(main_proj['name'])}</a></h2>
          <p class="text-muted text-sm leading-relaxed">{html.escape(main_proj['summary'])}</p>
          <div class="mt-auto pt-4 flex gap-2">{render_stack_list(main_proj["stack"][:3])}</div>
        </article>
        """.strip())
    
    if posts:
        p = posts[0]
        highlight_cards.append(f"""
        <article class="highlight-card h-full">
          <p class="card-type" data-i18n="home.highlight_recent_article">{html.escape(translate(i18n, locale, "home.highlight_recent_article", "recent article"))}</p>
          <h2 class="text-3xl font-bold tracking-tighter mb-2"><a href="{html.escape(p['resolved_url'])}">{html.escape(p['title'])}</a></h2>
          <p class="text-muted text-sm leading-relaxed">{html.escape(p['summary'])}</p>
          <div class="mt-auto pt-4 flex items-center justify-between">{render_localized_date(p["published_dt"], locale, "short")}<span class="text-xs font-mono opacity-50">{p["reading_time"]}m</span></div>
        </article>
        """.strip())

    return f"""
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="hero-eyebrow">{html.escape(concept)}</p>
        <h1 class="hero-title" data-i18n="sections.welcome_message">{html.escape(headline)}</h1>
        <p class="hero-description">{html.escape(site['description'])}</p>
        <div class="hero-pills">{''.join(f'<span class="hero-pill">{html.escape(it)}</span>' for it in feels)}</div>
      </div>
      <div class="hero-highlights">{''.join(highlight_cards)}</div>
    </section>
    """

def render_navigation_section(system: dict[str, Any], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    categories = sorted({d["category"] for d in documents if d.get("category")})
    nav_items = [("nav.posts", "/publications/"), ("nav.projects", "/projects/"), ("nav.documents", "/documents/"), ("nav.about", "/about/")] 
    nav_items += [(f"sections.category_{c}", f"/documents/?category={c}") for c in categories]
    
    links = "\n".join(f'<a class="nav-link" href="{html.escape(url)}" data-i18n="{html.escape(key)}">{html.escape(translate(i18n, locale, key, key.split(".")[-1].replace("_", " ")))}</a>' for key, url in nav_items)
    
    return f"""
    <section class="section-panel navigation-grid" aria-labelledby="nav-grid-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="sections.navigation_kicker">{html.escape(translate(i18n, locale, "sections.navigation_kicker", "navegação"))}</p>
          <h2 id="nav-grid-title" data-i18n="sections.navigation_title">{html.escape(translate(i18n, locale, "sections.navigation_title", "Sitemap e categorias"))}</h2>
        </div>
        <p data-i18n="sections.navigation_copy">{html.escape(translate(i18n, locale, "sections.navigation_copy", "Links diretos para publicações, projetos, documentos e categorias mais relevantes."))}</p>
      </header>
      <div class="navigation-grid-links">{links}</div>
    </section>
    """
def render_pagination_controls(site: dict[str, str], current_page: int, total_pages: int, base_url: str, i18n: dict[str, Any], locale: str) -> str:
    if total_pages <= 1: return ""
    def page_url(p: int) -> str:
        if p == 1: return site_href(site, base_url.rstrip("/") + "/")
        return site_href(site, f"{base_url.rstrip('/')}/page/{p}/")
    links = []
    if current_page > 1:
        links.append(f'<a href="{page_url(current_page - 1)}" class="pagination-link pagination-prev" data-i18n="pagination.prev">← {html.escape(translate(i18n, locale, "pagination.prev", "previous"))}</a>')
    else:
        links.append(f'<span class="pagination-link pagination-disabled">← {html.escape(translate(i18n, locale, "pagination.prev", "previous"))}</span>')
    for p in range(1, total_pages + 1):
        active_class = " pagination-active" if p == current_page else ""
        links.append(f'<a href="{page_url(p)}" class="pagination-link{active_class}">{p}</a>')
    if current_page < total_pages:
        links.append(f'<a href="{page_url(current_page + 1)}" class="pagination-link pagination-next" data-i18n="pagination.next">{html.escape(translate(i18n, locale, "pagination.next", "next"))} →</a>')
    else:
        links.append(f'<span class="pagination-link pagination-disabled">{html.escape(translate(i18n, locale, "pagination.next", "next"))} →</span>')
    return f'<nav class="pagination-container" aria-label="Pagination"><div class="pagination-inner">{"".join(links)}</div></nav>'

def render_documents_section(system: dict[str, Any], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str, *, limit: int | None = None, grouped: bool = False) -> str:
    items = documents[:limit] if limit is not None else documents
    if grouped:
        from collections import defaultdict
        groups = defaultdict(list)
        for d in documents: groups[d["category"]].append(d)
        layout_docs = system.get("layout", {}).get("documents", {})
        categories = normalize_string_list(layout_docs.get("navigation", []))
        blocks = []
        for category in categories or sorted(groups):
            docs_in_category = groups.get(category, [])
            if not docs_in_category: continue
            cards = "\n".join(render_document_card(d, i18n, locale) for d in docs_in_category)
            blocks.append(f'<section class="document-group"><header class="document-group-head"><h3>{html.escape(category)}</h3></header><ol class="resource-list document-collection">{cards}</ol></section>')
        empty_msg = translate(i18n, locale, "empty.documents", "No documents indexed yet.")
        content = "\n".join(blocks) if blocks else f'<p class="empty-state" data-i18n="empty.documents">{html.escape(empty_msg)}</p>'
    else:
        cards = "\n".join(render_document_card(d, i18n, locale) for d in items)
        empty_state = f'<li><p class="empty-state" data-i18n="empty.documents">{html.escape(translate(i18n, locale, "empty.documents", "No documents indexed yet."))}</p></li>'
        content = f'<ol class="resource-list document-collection">{cards or empty_state}</ol>'
    return f"""
    <section class="section-panel" aria-labelledby="documents-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="nav.documents">{html.escape(translate(i18n, locale, "nav.documents", "documents"))}</p>
          <h2 id="documents-title" data-i18n="sections.documents_title">{html.escape(translate(i18n, locale, "sections.documents_title", "Documentation system"))}</h2>
        </div>
        <p class="section-copy" data-i18n="sections.documents_copy">{html.escape(translate(i18n, locale, "sections.documents_copy", "Markdown-backed notes organized by domain, architecture, agents and APIs, with version markers and agent-generated tags."))}</p>
      </header>
      {content}
    </section>
    """
