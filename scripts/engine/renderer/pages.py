import html
import json
import math
from typing import Any
from ..i18n import translate, render_localized_date, format_short_date_for_locale
from ..utils import (
    site_href, slugify, summarize_body, parse_datetime, reading_time_minutes,
    load_blog_config, ROOT
)
from .base import render_layout
from .components import (
    render_breadcrumbs, render_tag_list, render_badge_list, 
    render_stack_list, render_status_badge, render_metric_list, 
    render_reading_time, render_developer_profile
)

def render_markdown(text: str) -> str:
    from ..constants import HEADING_RE, UNORDERED_LIST_RE, ORDERED_LIST_RE, INLINE_CODE_RE, LINK_RE, STRONG_RE, EMPHASIS_RE
    lines = text.splitlines()
    html_output = []
    in_list = False
    in_code = False
    
    for line in lines:
        if line.startswith("```"):
            if in_code:
                html_output.append("</code></pre>")
                in_code = False
            else:
                lang = line[3:].strip() or "text"
                html_output.append(f'<pre class="glass-terminal" data-lang="{html.escape(lang)}"><code>')
                in_code = True
            continue
            
        if in_code:
            html_output.append(html.escape(line))
            continue
            
        m = HEADING_RE.match(line)
        if m:
            level = len(m.group(1))
            content = m.group("content")
            html_output.append(f"<h{level}>{html.escape(content)}</h{level}>")
            continue
            
        m = UNORDERED_LIST_RE.match(line)
        if m:
            if not in_list: html_output.append("<ul>")
            html_output.append(f"<li>{html.escape(m.group('content'))}</li>")
            in_list = True
            continue
            
        if in_list:
            html_output.append("</ul>")
            in_list = False
            
        if not line.strip():
            continue
            
        processed = html.escape(line)
        processed = INLINE_CODE_RE.sub(r"<code>\1</code>", processed)
        processed = LINK_RE.sub(r'<a href="\2">\1</a>', processed)
        processed = STRONG_RE.sub(r"<strong>\1</strong>", processed)
        processed = EMPHASIS_RE.sub(r"<em>\1</em>", processed)
        html_output.append(f"<p>{processed}</p>")
        
    if in_list: html_output.append("</ul>")
    if in_code: html_output.append("</code></pre>")
    return "\n".join(html_output)

def render_markdown_or_empty(text: str | None, i18n: dict[str, Any], locale: str) -> str:
    if not text or not text.strip():
        fallback = translate(i18n, locale, "common.empty_content", "Content in progress.")
        return f'<p class="empty-state" data-i18n="common.empty_content">{html.escape(fallback)}</p>'
    return render_markdown(text)

def render_post_item(post: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    return f"""
    <div class="post-item">
      <div class="post-item-meta">
        {render_localized_date(post['published_dt'], locale, 'short')}
        {render_tag_list(post['tags'][:1])}
      </div>
      <h3 class="post-item-title"><a href="{html.escape(post['resolved_url'])}">{html.escape(post['title'])}</a></h3>
      <p class="post-item-summary">{html.escape(post['summary'])}</p>
    </div>
    """

def render_featured_project(project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    return f"""
    <div class="project-featured-card">
      <div class="project-card-header">
        {render_status_badge(project['status'], i18n, locale)}
        <h3 class="project-card-title"><a href="{html.escape(project['resolved_url'])}">{html.escape(project['name'])}</a></h3>
      </div>
      <p class="project-card-summary">{html.escape(project['headline'])}</p>
      {render_stack_list(project['stack'][:3])}
    </div>
    """

def render_home_page(site: dict[str, str], system: dict[str, Any], posts: list[dict[str, Any]], projects: list[dict[str, Any]], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    config = load_blog_config()["build"]
    recent_posts = posts[:int(config.get("posts_on_home", 6))]
    featured_projects = [p for p in projects if p.get("featured")][:int(config.get("projects_on_home", 3))]
    
    posts_html = "".join(render_post_item(p, i18n, locale) for p in recent_posts)
    projects_html = "".join(render_featured_project(p, i18n, locale) for p in featured_projects)
    
    return render_layout(
        page_title=site["title"],
        page_description=site["description"],
        site=site,
        system=system,
        body_class="page-home",
        canonical_path="/",
        has_math=False,
        content=f"""
        <section class="home-hero">
            <h1 class="hero-title">{html.escape(site.get('home_title', 'Publicações recentes'))}</h1>
            <p class="hero-intro">{html.escape(site.get('home_intro', ''))}</p>
        </section>
        
        <div class="home-grid">
            <section class="home-posts">
                <h2 class="section-title" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "posts"))}</h2>
                <div class="posts-list">{posts_html}</div>
                <div class="section-actions">
                    <a href="{site_href(site, '/publications/')}" class="subtle-link" data-i18n="actions.view_all_posts">Ver todas as publicações →</a>
                </div>
            </section>
            
            <aside class="home-sidebar">
                <section class="home-projects">
                    <h2 class="section-title" data-i18n="nav.projects">{html.escape(translate(i18n, locale, "nav.projects", "projects"))}</h2>
                    <div class="projects-featured-list">{projects_html}</div>
                </section>
                {render_developer_profile(site, i18n, locale)}
            </aside>
        </div>
        """,
        active_nav="home",
        i18n=i18n,
        locale=locale,
    )

def render_archive_page(site: dict[str, str], system: dict[str, Any], items: list[dict[str, Any]], i18n: dict[str, Any], locale: str, current_page: int = 1, total_pages: int = 1) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.posts", "posts"), "url": "", "key": "nav.posts"},
        ],
        i18n,
        locale,
    )
    
    pagination_html = ""
    if total_pages > 1:
        prev_link = f'<a href="{site_href(site, f"/publications/page/{current_page-1}/" if current_page > 2 else "/publications/")}" class="pager-link">←</a>' if current_page > 1 else '<span class="pager-link disabled">←</span>'
        next_link = f'<a href="{site_href(site, f"/publications/page/{current_page+1}/")}" class="pager-link">→</a>' if current_page < total_pages else '<span class="pager-link disabled">→</span>'
        pagination_html = f'<nav class="pagination">{prev_link}<span class="page-info">{current_page} / {total_pages}</span>{next_link}</nav>'

    items_html = "".join(f"""
    <div class="archive-item">
      <span class="archive-date">{format_short_date_for_locale(item['published_dt'], locale) if 'published_dt' in item else item.get('version', '')}</span>
      <h3 class="archive-title"><a href="{html.escape(item['resolved_url'])}">{html.escape(item['title'])}</a></h3>
      {render_tag_list(item['tags'][:2])}
    </div>
    """ for item in items)

    return render_layout(
        page_title=f"Archive - Page {current_page} | {site['title']}",
        page_description=f"Archive of all technical publications and documents. Page {current_page}.",
        site=site,
        system=system,
        body_class="page-archive",
        canonical_path=f"/publications/page/{current_page}/" if current_page > 1 else "/publications/",
        has_math=False,
        content=f"""
        {breadcrumbs}
        <section class="page-heading">
            <h1 data-i18n="pages.archive.title">{html.escape(translate(i18n, locale, "pages.archive.title", "Archive"))}</h1>
            <p data-i18n="pages.archive.description">{html.escape(translate(i18n, locale, "pages.archive.description", "All posts and documents in reverse chronological order."))}</p>
        </section>
        <div class="archive-list">{items_html}</div>
        {pagination_html}
        """,
        active_nav="posts",
        i18n=i18n,
        locale=locale,
    )

def render_projects_index_page(site: dict[str, str], system: dict[str, Any], posts: list[dict[str, Any]], projects: list[dict[str, Any]], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    # Unified Publication Graph Logic
    graph_payload = []
    all_items = [
        *[(p, "post") for p in posts],
        *[(p, "project") for p in projects],
        *[(p, "document") for p in documents]
    ]
    
    for item, kind in all_items:
        graph_payload.append({
            "title": item.get("title") or item.get("name"),
            "url": item["resolved_url"],
            "kind": kind,
            "summary": item.get("summary") or item.get("headline", ""),
            "tags": item.get("tags", []) or item.get("stack", []),
            "badges": item.get("badges", []),
            "status": item.get("status", "published")
        })
    
    payload_json = json.dumps(graph_payload, ensure_ascii=False).replace("<", "\\u003c")
    
    content = f"""
    <div id="projects-graph-container" class="projects-graph-container">
       <canvas id="projects-canvas"></canvas>
       <div id="graph-controls" class="graph-controls">
         <button id="graph-reset" title="Reset View"><i data-lucide="refresh-cw"></i></button>
         <div class="graph-legend">
           <span class="legend-item"><span class="dot dot-post"></span> Post</span>
           <span class="legend-item"><span class="dot dot-project"></span> Project</span>
           <span class="legend-item"><span class="dot dot-document"></span> Doc</span>
         </div>
       </div>
       <div id="project-detail-panel" class="project-detail-panel">
         <button id="detail-close" class="detail-close">×</button>
         <div id="detail-content" class="detail-content">
           <p class="detail-placeholder">Select a node to explore details</p>
         </div>
       </div>
    </div>
    <script id="graph-data" type="application/json">{payload_json}</script>
    """
    
    page_title = translate(i18n, locale, "pages.projects.title", "Ecossistema de Conhecimento")
    page_description = translate(i18n, locale, "pages.projects.description", "Exploração visual do ecossistema de conhecimento.")

    return render_layout(
        page_title=page_title,
        page_description=page_description,
        site=site,
        system=system,
        body_class="page-projects",
        canonical_path="/projects/",
        has_math=False,
        content=content,
        active_nav="/projects/",
        i18n=i18n,
        locale=locale,
        extra_scripts=["projects.js"],
    )

def render_project_page(site: dict[str, str], system: dict[str, Any], project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    from .base import render_layout
    adr_list = "".join(f"<li>{html.escape(item)}</li>" for item in project["adr"]) or "<li>ADR list in progress.</li>"
    roadmap_list = "".join(f"<li>{html.escape(item)}</li>" for item in project["roadmap"]) or "<li>Roadmap in progress.</li>"
    preview = f'<pre class="diagram-preview large"><code>{html.escape(project["diagram_preview"])}</code></pre>' if project["diagram_preview"] else ""
    
    def load_project_sections(slug: str) -> list[dict[str, Any]]:
        from ..constants import ROOT
        json_path = ROOT / "content" / "projects" / slug / "sections.json"
        if json_path.exists():
            try: return json.loads(json_path.read_text(encoding="utf-8"))
            except: pass
        return []

    sections = load_project_sections(project["slug"])
    canvas_reader = ""
    if sections:
        sections_json = json.dumps(sections, ensure_ascii=False).replace("<", "\\u003c")
        canvas_reader = f"""
        <section class="canvas-reader-section">
          <div class="canvas-reader-header">
            <div class="canvas-reader-tabs">
              <button class="canvas-tab active" data-tab="canvas" type="button">Canvas</button>
              <button class="canvas-tab" data-tab="static" type="button">Article</button>
            </div>
          </div>
          <div class="canvas-reader-shell" data-section-reader></div>
        </section>
        <script id="sections-data" type="application/json">{sections_json}</script>
        """

    breadcrumbs = render_breadcrumbs([
        {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
        {"label": translate(i18n, locale, "nav.projects", "projects"), "url": site_href(site, "/projects/"), "key": "nav.projects"},
        {"label": project["name"], "url": ""},
    ], i18n, locale)

    return render_layout(
        page_title=f"{project['name']} | {site['title']}",
        page_description=project["summary"],
        site=site,
        system=system,
        body_class="page-project",
        canonical_path=project["url"],
        has_math=project.get("has_math", False),
        content=f"""
        {breadcrumbs}
        {canvas_reader}
        <section class="page-grid">
            <article class="project-shell prose">
                <header class="post-header">
                    <h1>{html.escape(project['name'])}</h1>
                    <p class="post-summary">{html.escape(project['headline'])}</p>
                </header>
                <section><h2>Overview</h2>{render_markdown_or_empty(project['overview'], i18n, locale)}</section>
                <section><h2>Architecture</h2>{render_markdown_or_empty(project['architecture'], i18n, locale)}{preview}</section>
                <section><h2>ADR</h2><ul>{adr_list}</ul></section>
            </article>
            <aside class="sidebar-panel">
                {render_status_badge(project['status'], i18n, locale)}
                <h3>Stack</h3>{render_stack_list(project['stack'])}
            </aside>
        </section>
        """,
        active_nav="projects",
        i18n=i18n,
        locale=locale,
        extra_scripts=["canvas-reader.js"] if sections else None
    )

def render_post_page(site: dict[str, str], system: dict[str, Any], post: dict[str, Any], previous_post: dict[str, Any] | None, next_post: dict[str, Any] | None, i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([
        {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
        {"label": translate(i18n, locale, "nav.posts", "posts"), "url": site_href(site, "/publications/"), "key": "nav.posts"},
        {"label": post["title"], "url": ""},
    ], i18n, locale)

    prev_link = f'<a href="{html.escape(previous_post["resolved_url"])}">← {html.escape(previous_post["title"])}</a>' if previous_post else ""
    nxt_link = f'<a href="{html.escape(next_post["resolved_url"])}">{html.escape(next_post["title"])} →</a>' if next_post else ""

    return render_layout(
        page_title=f"{post['title']} | {site['title']}",
        page_description=post["summary"],
        site=site,
        system=system,
        body_class="page-post",
        canonical_path=post["url"],
        has_math=post["has_asciimath"],
        content=f"""
        {breadcrumbs}
        <article class="post-shell prose">
            <header class="post-header">
                <h1>{html.escape(post['title'])}</h1>
                <div class="post-meta">{render_localized_date(post['published_dt'], locale, 'long')}</div>
            </header>
            {render_markdown(post['body'])}
            <nav class="post-pager">{prev_link} {nxt_link}</nav>
        </article>
        """,
        active_nav="posts",
        i18n=i18n,
        locale=locale
    )

def render_documents_index_page(site: dict[str, str], system: dict[str, Any], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([
        {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
        {"label": translate(i18n, locale, "nav.documents", "documents"), "url": "", "key": "nav.documents"},
    ], i18n, locale)
    
    docs_html = "".join(f"""
    <div class="doc-card">
      <h3><a href="{html.escape(d['resolved_url'])}">{html.escape(d['title'])}</a></h3>
      <p>{html.escape(d['summary'])}</p>
    </div>
    """ for d in documents)

    return render_layout(
        page_title=f"Documents | {site['title']}",
        page_description="System documents and architecture notes.",
        site=site,
        system=system,
        body_class="page-documents",
        canonical_path="/documents/",
        has_math=False,
        content=f"{breadcrumbs}<div class='docs-grid'>{docs_html}</div>",
        active_nav="documents",
        i18n=i18n,
        locale=locale
    )

def render_document_page(site: dict[str, str], system: dict[str, Any], document: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([
        {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
        {"label": translate(i18n, locale, "nav.documents", "documents"), "url": site_href(site, "/documents/"), "key": "nav.documents"},
        {"label": document["title"], "url": ""},
    ], i18n, locale)

    return render_layout(
        page_title=f"{document['title']} | {site['title']}",
        page_description=document["summary"],
        site=site,
        system=system,
        body_class="page-document",
        canonical_path=document["url"],
        has_math=False,
        content=f"""
        {breadcrumbs}
        <article class="document-shell prose">
            <header class="post-header">
                <h1>{html.escape(document['title'])}</h1>
            </header>
            {render_markdown_or_empty(document['body'], i18n, locale)}
        </article>
        """,
        active_nav="documents",
        i18n=i18n,
        locale=locale
    )

def render_about_page(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([
        {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
        {"label": translate(i18n, locale, "nav.about", "about"), "url": "", "key": "nav.about"},
    ], i18n, locale)
    
    return render_layout(
        page_title=f"About | {site['title']}",
        page_description=site["description"],
        site=site,
        system=system,
        body_class="page-about",
        canonical_path="/about/",
        has_math=False,
        content=f"""
        {breadcrumbs}
        <section class="prose">
            <h1>About</h1>
            {render_markdown_or_empty(site['about'], i18n, locale)}
        </section>
        """,
        active_nav="about",
        i18n=i18n,
        locale=locale
    )
