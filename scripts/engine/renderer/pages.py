import html
import json
from typing import Any
from .base import render_layout
from .components import (
    render_hero,
    render_navigation_section,
    render_publications_grouped_section,
    render_brain_map_section,
    render_project_card,
    render_breadcrumbs,
    render_metric_list,
    render_localized_date,
    render_reading_time,
    render_badge_list,
    render_tag_list,
    render_markdown,
    render_status_badge,
    render_stack_list,
    render_pagination_controls,
    render_documents_section,
    render_impact_bar,
    render_trade_offs_section,
    render_lessons_section,
    render_evidence_highlights,
)
from ..utils import site_href, normalize_string_list, load_blog_config
from ..i18n import translate

def render_home_page(site: dict[str, str], system: dict[str, Any], posts: list[dict[str, Any]], projects: list[dict[str, Any]], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    config = load_blog_config()["build"]
    publications = sorted(posts + documents, key=lambda x: x.get("published_dt"), reverse=True)
    limit = int(config.get("posts_on_home", 10))
    proj_limit = int(config.get("projects_on_home", 3))
    content = f"""
    {render_hero(site, system, posts, projects, i18n, locale)}
    {render_evidence_highlights(posts, projects, i18n, locale)}
    {render_navigation_section(system, documents, i18n, locale)}
    {render_publications_grouped_section(system, publications, i18n, locale, limit=limit)}
    {render_brain_map_section(site, system, i18n, locale)}
    <section class="section-panel">
      <header class="section-header">
        <p class="section-kicker" data-i18n="nav.projects">{html.escape(translate(i18n, locale, "nav.projects", "projects"))}</p>
        <h2 id="projects-title" data-i18n="sections.projects_title">{html.escape(translate(i18n, locale, "sections.projects_title", "Core systems"))}</h2>
      </header>
      <ol class="resource-list project-collection">
        {"".join(render_project_card(p, i18n, locale) for p in projects[:proj_limit])}
      </ol>
    </section>
    """
    return render_layout(page_title=f"{site['title']} | Technical Knowledge OS", page_description=site["description"], site=site, system=system, body_class="page-home", canonical_path="/", has_math=False, content=content, active_nav="", i18n=i18n, locale=locale)

def render_archive_page(site: dict[str, str], system: dict[str, Any], publications: list[dict[str, Any]], i18n: dict[str, Any], locale: str, *, current_page: int = 1, total_pages: int = 1) -> str:
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.posts", "posts"), "url": "", "key": "nav.posts"}], i18n, locale)
    pagination = render_pagination_controls(site, current_page, total_pages, "/publications/", i18n, locale)
    content = f"""
    {breadcrumbs}
    {render_publications_grouped_section(system, publications, i18n, locale, show_header=False)}
    {pagination}
    """
    return render_layout(page_title=f"Posts - Page {current_page} | {site['title']}", page_description="Archive of publications.", site=site, system=system, body_class="page-archive", canonical_path=f"/publications/page/{current_page}/" if current_page > 1 else "/publications/", has_math=any(p.get('has_math') for p in publications), content=content, active_nav="posts", i18n=i18n, locale=locale)

def _safe_truncate(text: str, limit: int = 1200) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit]
    para = cut.rfind("\n\n")
    if para > limit // 3:
        return cut[:para].rstrip() + "\n..."
    line = cut.rfind("\n")
    if line > limit // 3:
        return cut[:line].rstrip() + "\n..."
    return cut.rstrip() + "..."

def _build_project_body(item: dict[str, Any]) -> str:
    """Assemble a markdown body from project fields for rich rendering."""
    parts = []
    ov = (item.get("overview") or "").strip()
    if ov:
        parts.append(ov)
    ps = (item.get("problem_solution") or "").strip()
    if ps and ps != "Sincronizado via Technical Knowledge OS build engine.":
        parts.append(f"## Problema & Solução\n\n{ps}")
    arch = (item.get("architecture") or "").strip()
    if arch and arch != "Repositório público no GitHub.":
        parts.append(f"## Arquitetura\n\n{arch}")
    dp = (item.get("diagram_preview") or "").strip()
    if dp:
        parts.append(f"```\n{dp}\n```")
    sn = (item.get("stack_notes") or "").strip()
    if sn:
        parts.append(f"## Stack & Tecnologias\n\n{sn}")
    adr = item.get("adr") or []
    if adr:
        parts.append("## Decisões Arquiteturais\n\n" + "\n".join(f"- {a}" for a in adr))
    rm = item.get("roadmap") or []
    if rm:
        parts.append("## Roadmap\n\n" + "\n".join(f"- {r}" for r in rm))
    impact = item.get("impact") or []
    if impact:
        parts.append("## Impacto & Resultados\n\n" + "\n".join(f"- {m}" for m in impact))
    trade_offs = item.get("trade_offs") or []
    if trade_offs:
        parts.append("## Trade-offs & Decisões\n\n" + "\n".join(f"- {t}" for t in trade_offs))
    lessons = item.get("lessons") or []
    if lessons:
        parts.append("## Lições Aprendidas\n\n" + "\n".join(f"- {le}" for le in lessons))
    pn = (item.get("production_notes") or "").strip()
    if pn:
        parts.append(f"## Notas de Produção\n\n{pn}")
    return "\n\n".join(parts) if parts else item.get("summary", "")

def render_projects_flow_data(posts: list[dict[str, Any]], projects: list[dict[str, Any]], documents: list[dict[str, Any]]) -> str:
    unified_items = []

    for item in posts:
        unified_items.append({
            "id": f"post-{item['slug']}",
            "kind": "post",
            "name": item["title"],
            "headline": item["summary"],
            "summary": item["summary"],
            "status": "production",
            "stack": item["tags"],
            "url": item["url"],
            "resolved_url": item.get("resolved_url", ""),
            "repo_url": item.get("repo_url", ""),
            "has_math": item.get("has_math", False),
            "body_html": render_markdown(item.get("body", "") or item["summary"]),
        })

    for item in projects:
        body_md = _build_project_body(item)
        unified_items.append({
            "id": f"project-{item['slug']}",
            "kind": "project",
            "name": item["name"],
            "headline": item.get("headline", ""),
            "summary": item["summary"],
            "status": item["status"],
            "stack": item["stack"],
            "url": item["url"],
            "resolved_url": item.get("resolved_url", ""),
            "repo_url": item.get("repo_url", ""),
            "has_math": item.get("has_math", False),
            "body_html": render_markdown(body_md),
        })

    for item in documents:
        unified_items.append({
            "id": f"document-{item['slug']}",
            "kind": "document",
            "name": item["title"],
            "headline": item["summary"],
            "summary": item["summary"],
            "status": "production",
            "stack": item["tags"],
            "url": item["url"],
            "resolved_url": item.get("resolved_url", ""),
            "repo_url": "",
            "has_math": False,
            "body_html": render_markdown(item.get("body", "") or item["summary"]),
        })

    return json.dumps(unified_items, ensure_ascii=False).replace("<", "\\u003c")

def render_projects_index_page(site: dict[str, str], system: dict[str, Any], posts: list[dict[str, Any]], projects: list[dict[str, Any]], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.projects", "projects"), "url": "", "key": "nav.projects"}], i18n, locale)
    flow_data = render_projects_flow_data(posts, projects, documents)
    content = f"""
    <script type="importmap">
    {{
      "imports": {{
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
        "@tweenjs/tween.js": "https://unpkg.com/@tweenjs/tween.js@23.0.0/dist/tween.esm.js"
      }}
    }}
    </script>
    <div class="project-flow-shell">
      <div class="project-flow-wrapper" data-project-flow></div>
      <aside class="project-detail-panel" data-project-panel data-open="false" aria-hidden="true">
        <div class="panel-header" data-reveal><div class="panel-title-group"><span class="panel-role card-type" data-panel-role></span><h2 class="panel-name" data-panel-name></h2></div><button class="nav-button panel-close" type="button" data-panel-close aria-label="Close"><i data-lucide="x"></i></button></div>
        <div class="panel-scroll-body">
          <p class="panel-headline" data-panel-headline data-reveal></p><p class="panel-summary" data-panel-summary data-reveal></p><div class="panel-stack" data-panel-stack data-reveal></div>
        </div>
        <div class="panel-actions" data-reveal><a class="panel-cta nav-cta" href="#" data-panel-link><i data-lucide="eye"></i> {html.escape(translate(i18n, locale, "actions.view_project", "Ver"))} <i data-lucide="arrow-right"></i></a></div>
      </aside>
    </div>
    <script id="projects-data" type="application/json">{flow_data}</script>
    """
    has_math = any(p.get("has_math") for p in posts) or any(p.get("has_math") for p in projects)
    return render_layout(page_title=f"Projects | {site['title']}", page_description="Visual exploration of the ecosystem.", site=site, system=system, body_class="page-projects", canonical_path="/projects/", has_math=has_math, content=content, active_nav="/projects/", i18n=i18n, locale=locale, extra_scripts=["projects.js?module=true"])

def render_documents_index_page(site: dict[str, str], system: dict[str, Any], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.documents", "documents"), "url": "", "key": "nav.documents"}], i18n, locale)
    content = f"""{breadcrumbs}<section class="page-heading"><p class="section-kicker" data-i18n="nav.documents">{html.escape(translate(i18n, locale, "nav.documents", "documents"))}</p><h1 data-i18n="pages.documents.title">{html.escape(translate(i18n, locale, "pages.documents.title", "Docs system"))}</h1><p data-i18n="pages.documents.description">{html.escape(translate(i18n, locale, "pages.documents.description", "Documents are grouped by domain..."))}</p></section>{render_documents_section(system, documents, i18n, locale, grouped=True)}"""
    return render_layout(page_title=f"Documents | {site['title']}", page_description="System docs.", site=site, system=system, body_class="page-documents", canonical_path="/documents/", has_math=False, content=content, active_nav="documents", i18n=i18n, locale=locale)

def render_about_page(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    structure = system.get("structure", {})
    next_steps = system.get("next_steps", {})
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.about", "about"), "url": "", "key": "nav.about"}], i18n, locale)
    content = f"""{breadcrumbs}<section class="page-heading"><p class="section-kicker" data-i18n="nav.about">{html.escape(translate(i18n, locale, "nav.about", "about"))}</p><h1 data-i18n="pages.about.title">{html.escape(translate(i18n, locale, "pages.about.title", "Minimalist engineering notebook"))}</h1><p>{html.escape(site.get('headline', ""))}</p></section><section class="page-grid"><article class="section-panel prose"><h2 data-i18n="pages.about.operating_model">{html.escape(translate(i18n, locale, "pages.about.operating_model", "Operating model"))}</h2>{render_markdown(site.get('about', ""))}</article><aside class="section-panel sidebar-panel"><h2 data-i18n="pages.about.structure">{html.escape(translate(i18n, locale, "pages.about.structure", "Structure"))}</h2><pre class="tree-block"><code>{html.escape(chr(10).join(normalize_string_list(structure.get('tree', []))))}</code></pre><h3 data-i18n="pages.about.next_steps">{html.escape(translate(i18n, locale, "pages.about.next_steps", "Next steps"))}</h3><ul class="next-step-list">{''.join(f'<li>{html.escape(it)}</li>' for it in normalize_string_list(next_steps.get('options', [])))}</ul></aside></section>"""
    return render_layout(page_title=f"About | {site['title']}", page_description=site["description"], site=site, system=system, body_class="page-about", canonical_path="/about/", has_math=False, content=content, active_nav="about", i18n=i18n, locale=locale)

def render_post_page(site: dict[str, str], system: dict[str, Any], post: dict[str, Any], previous_post: Any, next_post: Any, i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.posts", "posts"), "url": site_href(site, "/publications/"), "key": "nav.posts"}, {"label": post["title"], "url": ""}], i18n, locale)
    evidence_html = render_impact_bar(post.get("impact", [])) + render_trade_offs_section(post.get("trade_offs", [])) + render_lessons_section(post.get("lessons", []))
    sidebar = f"""<aside class="sidebar-panel"><h2 data-i18n="pages.post.metadata">{html.escape(translate(i18n, locale, "pages.post.metadata", "Metadata"))}</h2>{render_metric_list([render_localized_date(post["published_dt"], locale, "long"), render_reading_time(post["reading_time"], i18n, locale)], escape_items=False)}{render_badge_list(post.get('badges', []))}{render_tag_list(post.get('tags', []))}{render_impact_bar(post.get("impact", []))}<div class="sidebar-actions">{f'<a class="sidebar-link" href="{post["resolved_repo_url"]}" target="_blank" rel="noopener">repo</a>' if post.get("resolved_repo_url") else ""}{f'<a class="sidebar-link" href="{post["resolved_code_url"]}" target="_blank" rel="noopener">code</a>' if post.get("resolved_code_url") else ""}</div></aside>"""
    back_url = site_href(site, f"/projects/?select=post-{post['slug']}")
    content = f"""{breadcrumbs}<section class="page-grid"><article class="post-shell prose"><header class="post-header"><div class="header-top-row"><p class="section-kicker" data-i18n="pages.post.kicker">{html.escape(translate(i18n, locale, "pages.post.kicker", "post"))}</p><a href="{back_url}" class="nav-button panel-close" title="Voltar ao mapa"><i data-lucide="arrow-left"></i></a></div><h1>{html.escape(post['title'])}</h1><p class="post-summary">{html.escape(post['summary'])}</p><div class="post-meta">{render_localized_date(post['published_dt'], locale, "long")}{render_reading_time(post['reading_time'], i18n, locale)}</div></header>{render_markdown(post['body'])}{render_trade_offs_section(post.get("trade_offs", []))}{render_lessons_section(post.get("lessons", []))}<footer class="post-author"><p><strong>Autor:</strong> {html.escape(str(site.get('author') or 'Hiro Matsumoto'))}</p></footer></article>{sidebar}</section>"""
    return render_layout(page_title=f"{post['title']} | {site['title']}", page_description=post["summary"], site=site, system=system, body_class="page-post", canonical_path=post["url"], has_math=post.get("has_math", False), content=content, active_nav="posts", i18n=i18n, locale=locale)

def render_project_page(site: dict[str, str], system: dict[str, Any], project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.projects", "projects"), "url": site_href(site, "/projects/"), "key": "nav.projects"}, {"label": project["name"], "url": ""}], i18n, locale)
    production_html = f'<section><h2>Notas de Produção</h2>{render_markdown(project["production_notes"])}</section>' if project.get("production_notes") else ""
    sidebar = f"""<aside class="sidebar-panel"><h2 data-i18n="pages.project.status">{html.escape(translate(i18n, locale, "pages.project.status", "Status"))}</h2><p>{render_status_badge(project['status'], i18n, locale)}</p><h3 data-i18n="pages.project.stack">{html.escape(translate(i18n, locale, "pages.project.stack", "Stack"))}</h3>{render_stack_list(project['stack'])}{render_impact_bar(project.get("impact", []))}<div class="sidebar-actions">{f'<a class="sidebar-link" href="{project["resolved_architecture_url"]}">architecture</a>' if project.get("resolved_architecture_url") else ""}{f'<a class="sidebar-link" href="{project["resolved_code_url"]}" target="_blank" rel="noopener">code</a>' if project.get("resolved_code_url") else ""}</div></aside>"""
    back_url = site_href(site, f"/projects/?select=project-{project['slug']}")
    content = f"""{breadcrumbs}<section class="page-grid"><article class="project-shell prose"><header class="post-header"><div class="header-top-row"><p class="section-kicker" data-i18n="pages.project.kicker">{html.escape(translate(i18n, locale, "pages.project.kicker", "project"))}</p><a href="{back_url}" class="nav-button panel-close" title="Voltar ao mapa"><i data-lucide="arrow-left"></i></a></div><h1>{html.escape(project['name'])}</h1><p class="post-summary">{html.escape(project['headline'] or project['summary'])}</p>{render_badge_list(project.get('badges', []))}</header><section><h2 data-i18n="pages.project.overview">{html.escape(translate(i18n, locale, "pages.project.overview", "Overview"))}</h2>{render_markdown(project.get('overview', ""))}</section><section><h2 data-i18n="pages.project.architecture">{html.escape(translate(i18n, locale, "pages.project.architecture", "Architecture"))}</h2>{render_markdown(project.get('architecture', ""))}{f'<pre class="diagram-preview large"><code>{html.escape(project["diagram_preview"])}</code></pre>' if project.get("diagram_preview") else ""}</section>{production_html}{render_trade_offs_section(project.get("trade_offs", []))}{render_lessons_section(project.get("lessons", []))}</article>{sidebar}</section>"""
    return render_layout(page_title=f"{project['name']} | {site['title']}", page_description=project["summary"], site=site, system=system, body_class="page-project", canonical_path=project["url"], has_math=project.get("has_math", False), content=content, active_nav="projects", i18n=i18n, locale=locale, extra_scripts=["canvas-reader.js"])

def render_document_page(site: dict[str, str], system: dict[str, Any], document: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.documents", "documents"), "url": site_href(site, "/documents/"), "key": "nav.documents"}, {"label": document["title"], "url": ""}], i18n, locale)
    sidebar = f"""<aside class="sidebar-panel"><h2 data-i18n="pages.document.meta">{html.escape(translate(i18n, locale, "pages.document.meta", "Document meta"))}</h2><p class="doc-version">{html.escape(document['version'])}</p><p class="doc-category">{html.escape(document['category'])}</p>{render_tag_list(document.get('tags', []))}</aside>"""
    back_url = site_href(site, f"/projects/?select=document-{document['slug']}")
    content = f"""{breadcrumbs}<section class="page-grid"><article class="document-shell prose"><header class="post-header"><div class="header-top-row"><p class="section-kicker" data-i18n="pages.document.kicker">{html.escape(translate(i18n, locale, "pages.document.kicker", "document"))}</p><a href="{back_url}" class="nav-button panel-close" title="Voltar ao mapa"><i data-lucide="arrow-left"></i></a></div><h1>{html.escape(document['title'])}</h1><p class="post-summary">{html.escape(document['summary'])}</p></header>{render_markdown(document.get('body', ""))}</article>{sidebar}</section>"""
    return render_layout(page_title=f"{document['title']} | {site['title']}", page_description=document["summary"], site=site, system=system, body_class="page-document", canonical_path=document["url"], has_math=False, content=content, active_nav="documents", i18n=i18n, locale=locale)
