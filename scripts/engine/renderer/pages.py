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
    render_related_posts,
)
from ..utils import site_href, normalize_string_list, load_blog_config, copy_localized_fields
from ..i18n import translate, localized_value, locale_suffixes

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

def _has_complete_localized_coverage(
    item: dict[str, Any],
    fields: list[str],
    locale: str,
    i18n: dict[str, Any] | None = None,
) -> bool:
    present_fields = [
        field
        for field in fields
        if isinstance(item.get(field), str) and str(item.get(field) or "").strip()
    ]
    if not present_fields:
        return False

    for field in present_fields:
        field_has_locale_value = False
        for suffix in locale_suffixes(locale, i18n):
            key = f"{field}_{suffix}"
            if key not in item:
                continue
            value = item.get(key)
            if isinstance(value, str):
                if value.strip():
                    field_has_locale_value = True
                    break
                continue
            if value is not None:
                field_has_locale_value = True
                break
        if not field_has_locale_value:
            return False
    return True


def _build_post_localization_payload(post: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "title": post["title"],
        "summary": post["summary"],
        "body_html": render_markdown(post.get("body", "")),
    }
    copy_localized_fields(post, payload, "title")
    copy_localized_fields(post, payload, "summary")
    copy_localized_fields(post, payload, "body", target_field="body_html", transform=lambda value: render_markdown(str(value or "")))
    return payload

def _build_project_body(item: dict[str, Any], i18n: dict[str, Any] | None = None, locale: str = "pt-BR") -> str:
    """Assemble a markdown body from project fields for rich rendering."""
    from ..i18n import translate as _t
    def h(key: str, fallback: str) -> str:
        return _t(i18n or {}, locale, key, fallback) if i18n else fallback

    parts = []
    ov = str(localized_value(item, "overview", locale, i18n, "") or "").strip()
    if ov:
        parts.append(ov)
    ps = str(localized_value(item, "problem_solution", locale, i18n, "") or "").strip()
    if ps and ps != "Sincronizado via Technical Knowledge OS build engine.":
        parts.append(f"## {h('pages.project.problem_solution', 'Problema & Solução')}\n\n{ps}")
    arch = str(localized_value(item, "architecture", locale, i18n, "") or "").strip()
    if arch and arch != "Repositório público no GitHub.":
        parts.append(f"## {h('pages.project.architecture', 'Arquitetura')}\n\n{arch}")
    dp = (item.get("diagram_preview") or "").strip()
    if dp:
        parts.append(f"```\n{dp}\n```")
    sn = str(localized_value(item, "stack_notes", locale, i18n, "") or "").strip()
    if sn:
        parts.append(f"## {h('pages.project.stack_notes', 'Stack & Tecnologias')}\n\n{sn}")
    adr = localized_value(item, "adr", locale, i18n, item.get("adr") or []) or []
    if adr:
        parts.append(f"## {h('pages.project.adr', 'ADRs')}\n\n" + "\n".join(f"- {a}" for a in adr))
    rm = localized_value(item, "roadmap", locale, i18n, item.get("roadmap") or []) or []
    if rm:
        parts.append(f"## {h('pages.project.roadmap', 'Roadmap')}\n\n" + "\n".join(f"- {r}" for r in rm))
    impact = localized_value(item, "impact", locale, i18n, item.get("impact") or []) or []
    if impact:
        parts.append(f"## {h('pages.project.impact', 'Impacto & Resultados')}\n\n" + "\n".join(f"- {m}" for m in impact))
    trade_offs = localized_value(item, "trade_offs", locale, i18n, item.get("trade_offs") or []) or []
    if trade_offs:
        parts.append(f"## {h('pages.project.trade_offs', 'Trade-offs & Decisões')}\n\n" + "\n".join(f"- {t}" for t in trade_offs))
    lessons = localized_value(item, "lessons", locale, i18n, item.get("lessons") or []) or []
    if lessons:
        parts.append(f"## {h('pages.project.lessons', 'Lições Aprendidas')}\n\n" + "\n".join(f"- {le}" for le in lessons))
    pn = str(localized_value(item, "production_notes", locale, i18n, "") or "").strip()
    if pn:
        parts.append(f"## {h('pages.project.production_notes', 'Notas de Produção')}\n\n{pn}")
    return "\n\n".join(parts) if parts else item.get("summary", "")


def _build_project_localization_payload(project: dict[str, Any], i18n: dict[str, Any], locale: str) -> dict[str, Any]:
    payload = {
        "name": project["name"],
        "headline": project.get("headline", ""),
        "summary": project["summary"],
        "body_html": render_markdown(_build_project_body(project, i18n, locale)),
    }
    copy_localized_fields(project, payload, "name")
    copy_localized_fields(project, payload, "headline")
    copy_localized_fields(project, payload, "summary")

    long_fields = [
        "overview",
        "problem_solution",
        "architecture",
        "stack_notes",
        "production_notes",
        "adr",
        "roadmap",
        "impact",
        "trade_offs",
        "lessons",
    ]
    for supported_locale in i18n.get("supported_locales", []):
        if not _has_complete_localized_coverage(project, long_fields, supported_locale, i18n):
            continue
        localized_body = render_markdown(_build_project_body(project, i18n, supported_locale))
        for suffix in locale_suffixes(supported_locale, i18n):
            key = f"body_html_{suffix}"
            if key not in payload:
                payload[key] = localized_body
    return payload


def _build_document_localization_payload(document: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "title": document["title"],
        "summary": document["summary"],
        "body_html": render_markdown(document.get("body", "")),
    }
    copy_localized_fields(document, payload, "title")
    copy_localized_fields(document, payload, "summary")
    copy_localized_fields(document, payload, "body", target_field="body_html", transform=lambda value: render_markdown(str(value or "")))
    return payload

def render_projects_flow_data(posts: list[dict[str, Any]], projects: list[dict[str, Any]], documents: list[dict[str, Any]], i18n: dict[str, Any] | None = None, locale: str = "pt-BR") -> str:
    unified_items = []

    for item in posts:
        post_payload = {
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
        }
        copy_localized_fields(item, post_payload, "title")
        copy_localized_fields(item, post_payload, "summary")
        copy_localized_fields(item, post_payload, "body", target_field="body_html", transform=lambda value: render_markdown(str(value or "")))
        unified_items.append(post_payload)

    for item in projects:
        project_payload = {
            "id": f"project-{item['slug']}",
            "kind": "project",
            "status": item["status"],
            "stack": item["stack"],
            "url": item["url"],
            "resolved_url": item.get("resolved_url", ""),
            "repo_url": item.get("repo_url", ""),
            "has_math": item.get("has_math", False),
        }
        project_payload.update(_build_project_localization_payload(item, i18n or {}, locale))
        unified_items.append(project_payload)

    for item in documents:
        document_payload = {
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
            "has_math": item.get("has_math", False),
        }
        document_payload.update(_build_document_localization_payload(item))
        unified_items.append(document_payload)

    return json.dumps(unified_items, ensure_ascii=False).replace("<", "\\u003c")

def render_projects_index_page(site: dict[str, str], system: dict[str, Any], posts: list[dict[str, Any]], projects: list[dict[str, Any]], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.projects", "projects"), "url": "", "key": "nav.projects"}], i18n, locale)
    flow_data = render_projects_flow_data(posts, projects, documents, i18n, locale)
    content = f"""
    <div class="project-flow-shell">
      <div class="project-flow-wrapper" data-project-flow></div>
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
    content = f"""{breadcrumbs}<section class="page-heading"><p class="section-kicker" data-i18n="nav.about">{html.escape(translate(i18n, locale, "nav.about", "about"))}</p><h1 data-i18n="pages.about.title">{html.escape(translate(i18n, locale, "pages.about.title", "Minimalist engineering notebook"))}</h1><p>{html.escape(site.get('headline', ""))}</p></section><section class="page-grid"><article class="section-panel prose"><div class="header-top-row"><h2 data-i18n="pages.about.operating_model">{html.escape(translate(i18n, locale, "pages.about.operating_model", "Operating model"))}</h2><button class="nav-button sidebar-toggle" type="button" data-sidebar-toggle title="Ver estrutura"><i data-lucide="info"></i></button></div>{render_markdown(site.get('about', ""))}</article><aside class="section-panel sidebar-panel"><div class="sidebar-header"><h2 data-i18n="pages.about.structure">{html.escape(translate(i18n, locale, "pages.about.structure", "Structure"))}</h2><button class="nav-button sidebar-close" type="button" data-sidebar-toggle><i data-lucide="x"></i></button></div><pre class="tree-block"><code>{html.escape(chr(10).join(normalize_string_list(structure.get('tree', []))))}</code></pre><h3 data-i18n="pages.about.next_steps">{html.escape(translate(i18n, locale, "pages.about.next_steps", "Next steps"))}</h3><ul class="next-step-list">{''.join(f'<li>{html.escape(it)}</li>' for it in normalize_string_list(next_steps.get('options', [])))}</ul></aside></section>"""
    return render_layout(page_title=f"About | {site['title']}", page_description=site["description"], site=site, system=system, body_class="page-about", canonical_path="/about/", has_math=False, content=content, active_nav="about", i18n=i18n, locale=locale)

def render_post_page(site: dict[str, str], system: dict[str, Any], post: dict[str, Any], previous_post: Any, next_post: Any, i18n: dict[str, Any], locale: str, *, related_posts: list | None = None) -> str:
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.posts", "posts"), "url": site_href(site, "/publications/"), "key": "nav.posts"}, {"label": post["title"], "url": ""}], i18n, locale)
    evidence_html = render_impact_bar(post.get("impact", [])) + render_trade_offs_section(post.get("trade_offs", [])) + render_lessons_section(post.get("lessons", []))
    sidebar = f"""<aside class="sidebar-panel"><div class="sidebar-header"><h2 data-i18n="pages.post.metadata">{html.escape(translate(i18n, locale, "pages.post.metadata", "Metadata"))}</h2><button class="nav-button sidebar-close" type="button" data-sidebar-toggle><i data-lucide="x"></i></button></div>{render_metric_list([render_localized_date(post["published_dt"], locale, "long"), render_reading_time(post["reading_time"], i18n, locale)], escape_items=False)}{render_badge_list(post.get('badges', []))}{render_tag_list(post.get('tags', []))}{render_impact_bar(post.get("impact", []))}<div class="sidebar-actions">{f'<a class="sidebar-link" href="{post["resolved_repo_url"]}" target="_blank" rel="noopener">repo</a>' if post.get("resolved_repo_url") else ""}{f'<a class="sidebar-link" href="{post["resolved_code_url"]}" target="_blank" rel="noopener">code</a>' if post.get("resolved_code_url") else ""}</div></aside>"""
    back_url = site_href(site, f"/projects/?select=post-{post['slug']}")
    related_html = render_related_posts(related_posts or [], i18n, locale)
    page_payload = json.dumps(_build_post_localization_payload(post), ensure_ascii=False).replace("<", "\\u003c")
    content = f"""{breadcrumbs}<section class="page-grid"><article class="post-shell prose"><header class="post-header"><div class="header-top-row"><p class="section-kicker" data-i18n="pages.post.kicker">{html.escape(translate(i18n, locale, "pages.post.kicker", "post"))}</p><div class="nav-group"><button class="nav-button sidebar-toggle" type="button" data-sidebar-toggle title="Mais informações"><i data-lucide="info"></i></button><a href="{back_url}" class="nav-button panel-close" title="Voltar ao mapa"><i data-lucide="arrow-left"></i></a></div></div><h1 data-page-title>{html.escape(post['title'])}</h1><p class="post-summary" data-page-summary>{html.escape(post['summary'])}</p><div class="post-meta">{render_localized_date(post['published_dt'], locale, "long")}{render_reading_time(post['reading_time'], i18n, locale)}</div></header><div data-page-body>{render_markdown(post['body'])}</div>{render_trade_offs_section(post.get("trade_offs", []))}{render_lessons_section(post.get("lessons", []))}<footer class="post-author"><p><strong>Autor:</strong> {html.escape(str(site.get('author') or 'Hiro Matsumoto'))}</p></footer></article>{sidebar}</section><script id="page-content-data" type="application/json">{page_payload}</script>{related_html}"""
    og = {
        "title": post["title"],
        "description": post["summary"],
        "url": site_href(site, post["url"]),
        "type": "article",
        "twitter_card": "summary",
    }
    return render_layout(page_title=f"{post['title']} | {site['title']}", page_description=post["summary"], site=site, system=system, body_class="page-post", canonical_path=post["url"], has_math=post.get("has_math", False), content=content, active_nav="posts", i18n=i18n, locale=locale, og=og)

def render_project_page(site: dict[str, str], system: dict[str, Any], project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.projects", "projects"), "url": site_href(site, "/projects/"), "key": "nav.projects"}, {"label": project["name"], "url": ""}], i18n, locale)
    sidebar = f"""<aside class="sidebar-panel"><div class="sidebar-header"><h2 data-i18n="pages.project.status">{html.escape(translate(i18n, locale, "pages.project.status", "Status"))}</h2><button class="nav-button sidebar-close" type="button" data-sidebar-toggle><i data-lucide="x"></i></button></div><p>{render_status_badge(project['status'], i18n, locale)}</p><h3 data-i18n="pages.project.stack">{html.escape(translate(i18n, locale, "pages.project.stack", "Stack"))}</h3>{render_stack_list(project['stack'])}{render_impact_bar(project.get("impact", []))}<div class="sidebar-actions">{f'<a class="sidebar-link" href="{project["resolved_architecture_url"]}">architecture</a>' if project.get("resolved_architecture_url") else ""}{f'<a class="sidebar-link" href="{project["resolved_code_url"]}" target="_blank" rel="noopener">code</a>' if project.get("resolved_code_url") else ""}</div></aside>"""
    back_url = site_href(site, f"/projects/?select=project-{project['slug']}")
    page_payload_obj = _build_project_localization_payload(project, i18n, locale)
    page_payload = json.dumps(page_payload_obj, ensure_ascii=False).replace("<", "\\u003c")
    content = f"""{breadcrumbs}<section class="page-grid"><article class="project-shell prose"><header class="post-header"><div class="header-top-row"><p class="section-kicker" data-i18n="pages.project.kicker">{html.escape(translate(i18n, locale, "pages.project.kicker", "project"))}</p><div class="nav-group"><button class="nav-button sidebar-toggle" type="button" data-sidebar-toggle title="Mais informações"><i data-lucide="info"></i></button><a href="{back_url}" class="nav-button panel-close" title="Voltar ao mapa"><i data-lucide="arrow-left"></i></a></div></div><h1 data-page-title>{html.escape(project['name'])}</h1><p class="post-summary" data-page-summary>{html.escape(project['headline'] or project['summary'])}</p>{render_badge_list(project.get('badges', []))}</header><div data-page-body>{page_payload_obj["body_html"]}</div></article>{sidebar}</section><script id="page-content-data" type="application/json">{page_payload}</script>"""
    og = {
        "title": project["name"],
        "description": project.get("summary") or project.get("headline", ""),
        "url": site_href(site, project["url"]),
        "type": "website",
        "twitter_card": "summary",
    }
    return render_layout(page_title=f"{project['name']} | {site['title']}", page_description=project["summary"], site=site, system=system, body_class="page-project", canonical_path=project["url"], has_math=project.get("has_math", False), content=content, active_nav="projects", i18n=i18n, locale=locale, extra_scripts=["canvas-reader.js"], og=og)

def render_document_page(site: dict[str, str], system: dict[str, Any], document: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs([{"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"}, {"label": translate(i18n, locale, "nav.documents", "documents"), "url": site_href(site, "/documents/"), "key": "nav.documents"}, {"label": document["title"], "url": ""}], i18n, locale)
    sidebar = f"""<aside class="sidebar-panel"><div class="sidebar-header"><h2 data-i18n="pages.document.meta">{html.escape(translate(i18n, locale, "pages.document.meta", "Document meta"))}</h2><button class="nav-button sidebar-close" type="button" data-sidebar-toggle><i data-lucide="x"></i></button></div><p class="doc-version">{html.escape(document['version'])}</p><p class="doc-category">{html.escape(document['category'])}</p>{render_tag_list(document.get('tags', []))}</aside>"""
    back_url = site_href(site, f"/projects/?select=document-{document['slug']}")
    page_payload_obj = _build_document_localization_payload(document)
    page_payload = json.dumps(page_payload_obj, ensure_ascii=False).replace("<", "\\u003c")
    content = f"""{breadcrumbs}<section class="page-grid"><article class="document-shell prose"><header class="post-header"><div class="header-top-row"><p class="section-kicker" data-i18n="pages.document.kicker">{html.escape(translate(i18n, locale, "pages.document.kicker", "document"))}</p><div class="nav-group"><button class="nav-button sidebar-toggle" type="button" data-sidebar-toggle title="Mais informações"><i data-lucide="info"></i></button><a href="{back_url}" class="nav-button panel-close" title="Voltar ao mapa"><i data-lucide="arrow-left"></i></a></div></div><h1 data-page-title>{html.escape(document['title'])}</h1><p class="post-summary" data-page-summary>{html.escape(document['summary'])}</p></header><div data-page-body>{page_payload_obj["body_html"]}</div></article>{sidebar}</section><script id="page-content-data" type="application/json">{page_payload}</script>"""
    return render_layout(page_title=f"{document['title']} | {site['title']}", page_description=document["summary"], site=site, system=system, body_class="page-document", canonical_path=document["url"], has_math=document.get("has_math", False), content=content, active_nav="documents", i18n=i18n, locale=locale)
