import html
import json
from typing import Any

from .base import render_layout
from .components import (
    render_navigation_section,
    render_brain_map_section,
    render_post_card,
    render_project_card,
    render_daily_card,
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
    render_related_posts,
)
from ..utils import site_href, normalize_string_list, load_blog_config, copy_localized_fields
from ..i18n import translate, localized_value, locale_suffixes


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


def _build_daily_localization_payload(entry: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "title": entry["title"],
        "summary": entry["summary"],
        "body_html": render_markdown(entry.get("body", "")),
    }
    copy_localized_fields(entry, payload, "title")
    copy_localized_fields(entry, payload, "summary")
    copy_localized_fields(entry, payload, "body", target_field="body_html", transform=lambda value: render_markdown(str(value or "")))
    return payload


def _build_project_body(item: dict[str, Any], i18n: dict[str, Any] | None = None, locale: str = "pt-BR") -> str:
    def h(key: str, fallback: str) -> str:
        return translate(i18n or {}, locale, key, fallback) if i18n else fallback

    parts = []
    overview = str(localized_value(item, "overview", locale, i18n, "") or "").strip()
    if overview:
        parts.append(overview)

    problem_solution = str(localized_value(item, "problem_solution", locale, i18n, "") or "").strip()
    if problem_solution and problem_solution != "Sincronizado via Technical Knowledge OS build engine.":
        parts.append(f"## {h('pages.project.problem_solution', 'Problema e solução')}\n\n{problem_solution}")

    architecture = str(localized_value(item, "architecture", locale, i18n, "") or "").strip()
    if architecture and architecture != "Repositório público no GitHub.":
        parts.append(f"## {h('pages.project.architecture', 'Arquitetura')}\n\n{architecture}")

    diagram_preview = (item.get("diagram_preview") or "").strip()
    if diagram_preview:
        parts.append(f"```\n{diagram_preview}\n```")

    stack_notes = str(localized_value(item, "stack_notes", locale, i18n, "") or "").strip()
    if stack_notes:
        parts.append(f"## {h('pages.project.stack_notes', 'Stack e tecnologias')}\n\n{stack_notes}")

    for field, key, fallback in [
        ("adr", "pages.project.adr", "ADRs"),
        ("roadmap", "pages.project.roadmap", "Roadmap"),
        ("impact", "pages.project.impact", "Impacto e resultados"),
        ("trade_offs", "pages.project.trade_offs", "Trade-offs e decisões"),
        ("lessons", "pages.project.lessons", "Lições aprendidas"),
    ]:
        values = localized_value(item, field, locale, i18n, item.get(field) or []) or []
        if values:
            parts.append(f"## {h(key, fallback)}\n\n" + "\n".join(f"- {value}" for value in values))

    production_notes = str(localized_value(item, "production_notes", locale, i18n, "") or "").strip()
    if production_notes:
        parts.append(f"## {h('pages.project.production_notes', 'Notas de produção')}\n\n{production_notes}")

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


def render_home_page(
    site: dict[str, str],
    system: dict[str, Any],
    posts: list[dict[str, Any]],
    daily_entries: list[dict[str, Any]],
    projects: list[dict[str, Any]],
    documents: list[dict[str, Any]],
    i18n: dict[str, Any],
    locale: str,
) -> str:
    config = load_blog_config()["build"]
    posts_limit = int(config.get("posts_on_home", 6))
    daily_limit = int(config.get("daily_on_home", 4))
    projects_limit = int(config.get("projects_on_home", 3))

    intro = site.get("home_intro", "").strip()
    quick_links = [
        ("nav.about", "/about/"),
        ("nav.posts", "/posts/"),
        ("nav.daily", "/daily/"),
        ("nav.contact", "/contact/"),
    ]
    quick_links_html = "".join(
        f'<a class="notebook-link-chip" href="{html.escape(site_href(site, url))}" data-i18n="{html.escape(key)}">{html.escape(translate(i18n, locale, key, key.split(".")[-1]))}</a>'
        for key, url in quick_links
    )

    hero_metrics = [
        (translate(i18n, locale, "nav.posts", "posts"), len(posts)),
        (translate(i18n, locale, "nav.daily", "daily"), len(daily_entries)),
        (translate(i18n, locale, "nav.projects", "projects"), len(projects)),
        (translate(i18n, locale, "nav.documents", "documents"), len(documents)),
    ]
    hero_metrics_html = "".join(
        f'<div class="notebook-stat"><span class="notebook-stat-value">{value}</span><span class="notebook-stat-label">{html.escape(label)}</span></div>'
        for label, value in hero_metrics
    )

    content = f"""
    <section class="notebook-hero section-panel" aria-labelledby="home-title">
      <div class="notebook-hero-grid">
        <div class="notebook-hero-copy">
          <p class="section-kicker">{html.escape(translate(i18n, locale, "home.kicker", "engineering notebook"))}</p>
          <h1 id="home-title" class="notebook-hero-title">{html.escape(site.get("home_title") or site.get("headline") or site["title"])}</h1>
          <p class="notebook-hero-summary">{html.escape(site["description"])}</p>
          <div class="prose notebook-intro">{render_markdown(intro)}</div>
          <div class="notebook-link-row">{quick_links_html}</div>
        </div>
        <aside class="notebook-hero-aside">
          <div class="notebook-stat-grid">{hero_metrics_html}</div>
          <div class="notebook-status-card">
            <p class="section-kicker">{html.escape(translate(i18n, locale, "home.focus_kicker", "foco atual"))}</p>
            <p>{html.escape(system.get("identity", {}).get("developer", {}).get("role", "Software Engineer"))}</p>
            <p class="muted-copy">{html.escape(site.get("headline", ""))}</p>
          </div>
        </aside>
      </div>
    </section>
    <section class="section-panel" aria-labelledby="posts-title">
      <header class="section-header">
        <p class="section-kicker" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "posts"))}</p>
        <h2 id="posts-title" data-i18n="sections.posts_title">{html.escape(translate(i18n, locale, "sections.posts_title", "Publicações recentes"))}</h2>
        <p class="section-copy" data-i18n="sections.posts_copy">{html.escape(translate(i18n, locale, "sections.posts_copy", "Ensaios técnicos, decisões de arquitetura e aprendizado aplicado."))}</p>
      </header>
      <ul class="resource-list post-collection notebook-card-grid">
        {"".join(render_post_card(post, i18n, locale) for post in posts[:posts_limit])}
      </ul>
    </section>
    <section class="section-panel" aria-labelledby="daily-title">
      <header class="section-header">
        <p class="section-kicker" data-i18n="nav.daily">{html.escape(translate(i18n, locale, "nav.daily", "daily"))}</p>
        <h2 id="daily-title" data-i18n="pages.daily.title">{html.escape(translate(i18n, locale, "pages.daily.title", "Daily notes"))}</h2>
        <p class="section-copy" data-i18n="pages.daily.description">{html.escape(translate(i18n, locale, "pages.daily.description", "Notas curtas de progresso, ideias e trilha sonora de trabalho."))}</p>
      </header>
      <ol class="resource-list daily-collection timeline-collection">
        {"".join(render_daily_card(entry, i18n, locale, compact=True) for entry in daily_entries[:daily_limit])}
      </ol>
    </section>
    <section class="section-panel" aria-labelledby="projects-title">
      <header class="section-header">
        <p class="section-kicker" data-i18n="nav.projects">{html.escape(translate(i18n, locale, "nav.projects", "projects"))}</p>
        <h2 id="projects-title" data-i18n="sections.projects_title">{html.escape(translate(i18n, locale, "sections.projects_title", "Projetos relevantes"))}</h2>
        <p class="section-copy" data-i18n="sections.projects_copy">{html.escape(translate(i18n, locale, "sections.projects_copy", "Sistemas que concentram arquitetura, trade-offs e execução prática."))}</p>
      </header>
      <ol class="resource-list project-collection notebook-card-grid">
        {"".join(render_project_card(project, i18n, locale) for project in projects[:projects_limit])}
      </ol>
    </section>
    {render_navigation_section(system, documents, i18n, locale)}
    {render_brain_map_section(site, system, i18n, locale, compact=True, counts={"posts": len(posts), "projects": len(projects), "documents": len(documents)})}
    """
    return render_layout(
        page_title=f"{site['title']} | engineering notebook",
        page_description=site["description"],
        site=site,
        system=system,
        body_class="page-home",
        canonical_path="/",
        has_math=False,
        content=content,
        active_nav="home",
        i18n=i18n,
        locale=locale,
    )


def render_archive_page(site: dict[str, str], system: dict[str, Any], posts: list[dict[str, Any]], i18n: dict[str, Any], locale: str, *, current_page: int = 1, total_pages: int = 1) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.posts", "posts"), "url": "", "key": "nav.posts"},
        ],
        i18n,
        locale,
    )
    pagination = render_pagination_controls(site, current_page, total_pages, "/posts/", i18n, locale)
    content = f"""
    {breadcrumbs}
    <section class="page-heading">
      <p class="section-kicker" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "posts"))}</p>
      <h1 data-i18n="pages.archive.title">{html.escape(translate(i18n, locale, "pages.archive.title", "Publicações"))}</h1>
      <p data-i18n="pages.archive.description">{html.escape(translate(i18n, locale, "pages.archive.description", "Escrita técnica organizada por clareza, ritmo e utilidade prática."))}</p>
    </section>
    <section class="section-panel">
      <ul class="resource-list post-collection notebook-card-grid">
        {"".join(render_post_card(post, i18n, locale) for post in posts)}
      </ul>
    </section>
    {pagination}
    """
    return render_layout(
        page_title=f"Posts | {site['title']}",
        page_description=translate(i18n, locale, "pages.archive.description", "Escrita técnica organizada por clareza, ritmo e utilidade prática."),
        site=site,
        system=system,
        body_class="page-archive",
        canonical_path=f"/posts/page/{current_page}/" if current_page > 1 else "/posts/",
        has_math=any(post.get("has_math") for post in posts),
        content=content,
        active_nav="posts",
        i18n=i18n,
        locale=locale,
    )


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
    flow_data = render_projects_flow_data(posts, projects, documents, i18n, locale)
    content = f"""
    <div class="project-flow-shell">
      <div class="project-flow-wrapper" data-project-flow></div>
    </div>
    <script id="projects-data" type="application/json">{flow_data}</script>
    """
    has_math = any(post.get("has_math") for post in posts) or any(project.get("has_math") for project in projects)
    return render_layout(
        page_title=f"Projects | {site['title']}",
        page_description=translate(i18n, locale, "pages.projects.description", "Visual exploration of projects and connected notes."),
        site=site,
        system=system,
        body_class="page-projects",
        canonical_path="/projects/",
        has_math=has_math,
        content=content,
        active_nav="projects",
        i18n=i18n,
        locale=locale,
        extra_scripts=["projects.js?module=true"],
    )


def render_documents_index_page(site: dict[str, str], system: dict[str, Any], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.documents", "documents"), "url": "", "key": "nav.documents"},
        ],
        i18n,
        locale,
    )
    content = f"""
    {breadcrumbs}
    <section class="page-heading">
      <p class="section-kicker" data-i18n="nav.documents">{html.escape(translate(i18n, locale, "nav.documents", "documents"))}</p>
      <h1 data-i18n="pages.documents.title">{html.escape(translate(i18n, locale, "pages.documents.title", "Documents"))}</h1>
      <p data-i18n="pages.documents.description">{html.escape(translate(i18n, locale, "pages.documents.description", "Documentação técnica organizada por domínio, arquitetura e integrações."))}</p>
    </section>
    {render_documents_section(system, documents, i18n, locale, grouped=True)}
    """
    return render_layout(
        page_title=f"Documents | {site['title']}",
        page_description=translate(i18n, locale, "pages.documents.description", "Documentação técnica organizada por domínio, arquitetura e integrações."),
        site=site,
        system=system,
        body_class="page-documents",
        canonical_path="/documents/",
        has_math=False,
        content=content,
        active_nav="documents",
        i18n=i18n,
        locale=locale,
    )


def render_about_page(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    sections = system.get("about", {}).get("sections", [])
    section_html = []
    for section in sections:
        title = str(section.get("title", "") or "").strip()
        body = str(section.get("body", "") or "").strip()
        if not title or not body:
            continue
        section_html.append(
            f'<section class="notebook-subsection"><h2>{html.escape(title)}</h2><div class="prose">{render_markdown(body)}</div></section>'
        )

    if not section_html:
        section_html.append(f'<section class="notebook-subsection"><div class="prose">{render_markdown(site.get("about", ""))}</div></section>')

    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.about", "about"), "url": "", "key": "nav.about"},
        ],
        i18n,
        locale,
    )
    content = f"""
    {breadcrumbs}
    <section class="page-heading">
      <p class="section-kicker" data-i18n="nav.about">{html.escape(translate(i18n, locale, "nav.about", "about"))}</p>
      <h1 data-i18n="pages.about.title">{html.escape(translate(i18n, locale, "pages.about.title", "Sobre"))}</h1>
      <p>{html.escape(site.get("headline", ""))}</p>
    </section>
    <section class="page-grid notebook-two-column">
      <article class="post-shell prose notebook-sheet">
        {"".join(section_html)}
      </article>
      <aside class="sidebar-panel notebook-meta-panel">
        <div class="sidebar-header"><h2>{html.escape(translate(i18n, locale, "pages.about.facts", "Snapshot"))}</h2></div>
        <div class="meta-stack">
          <p><strong>{html.escape(translate(i18n, locale, "pages.about.location", "Base"))}:</strong> {html.escape(system.get("identity", {}).get("developer", {}).get("location", "Brasil / Remote"))}</p>
          <p><strong>{html.escape(translate(i18n, locale, "pages.about.role", "Atuação"))}:</strong> {html.escape(system.get("identity", {}).get("developer", {}).get("role", "Software Engineer"))}</p>
          <p><strong>{html.escape(translate(i18n, locale, "pages.about.focus", "Foco"))}:</strong> {html.escape(site.get("headline", ""))}</p>
        </div>
      </aside>
    </section>
    """
    return render_layout(
        page_title=f"About | {site['title']}",
        page_description=site["description"],
        site=site,
        system=system,
        body_class="page-about",
        canonical_path="/about/",
        has_math=False,
        content=content,
        active_nav="about",
        i18n=i18n,
        locale=locale,
    )


def render_contact_page(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    links = system.get("contact", {}).get("links", [])
    cards = []
    for item in links:
        label = str(item.get("label", "") or "").strip()
        url = str(item.get("url", "") or "").strip()
        description = str(item.get("description", "") or "").strip()
        if not label or not url:
            continue
        cards.append(
            f"""
            <article class="resource-card contact-card">
              <p class="card-type">{html.escape(str(item.get("kind", "link") or "link"))}</p>
              <h2><a href="{html.escape(url)}" target="_blank" rel="noopener noreferrer">{html.escape(label)}</a></h2>
              <p class="card-summary">{html.escape(description)}</p>
              <p class="contact-url">{html.escape(url)}</p>
            </article>
            """
        )

    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.contact", "contact"), "url": "", "key": "nav.contact"},
        ],
        i18n,
        locale,
    )
    content = f"""
    {breadcrumbs}
    <section class="page-heading">
      <p class="section-kicker" data-i18n="nav.contact">{html.escape(translate(i18n, locale, "nav.contact", "contact"))}</p>
      <h1 data-i18n="pages.contact.title">{html.escape(translate(i18n, locale, "pages.contact.title", "Contato"))}</h1>
      <p data-i18n="pages.contact.description">{html.escape(translate(i18n, locale, "pages.contact.description", "Canais principais para acompanhar trabalho, conversar e seguir a trilha pública do site."))}</p>
    </section>
    <section class="section-panel">
      <div class="contact-grid">
        {"".join(cards)}
      </div>
    </section>
    """
    return render_layout(
        page_title=f"Contact | {site['title']}",
        page_description=translate(i18n, locale, "pages.contact.description", "Canais principais para acompanhar trabalho, conversar e seguir a trilha pública do site."),
        site=site,
        system=system,
        body_class="page-contact",
        canonical_path="/contact/",
        has_math=False,
        content=content,
        active_nav="contact",
        i18n=i18n,
        locale=locale,
    )


def render_daily_index_page(site: dict[str, str], system: dict[str, Any], daily_entries: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.daily", "daily"), "url": "", "key": "nav.daily"},
        ],
        i18n,
        locale,
    )
    content = f"""
    {breadcrumbs}
    <section class="page-heading">
      <p class="section-kicker" data-i18n="nav.daily">{html.escape(translate(i18n, locale, "nav.daily", "daily"))}</p>
      <h1 data-i18n="pages.daily.title">{html.escape(translate(i18n, locale, "pages.daily.title", "Daily notes"))}</h1>
      <p data-i18n="pages.daily.description">{html.escape(translate(i18n, locale, "pages.daily.description", "Linha do tempo de notas curtas, progresso diário e o que está tocando durante o trabalho."))}</p>
    </section>
    <section class="section-panel">
      <ol class="resource-list daily-collection timeline-collection">
        {"".join(render_daily_card(entry, i18n, locale) for entry in daily_entries)}
      </ol>
    </section>
    """
    return render_layout(
        page_title=f"Daily | {site['title']}",
        page_description=translate(i18n, locale, "pages.daily.description", "Linha do tempo de notas curtas, progresso diário e o que está tocando durante o trabalho."),
        site=site,
        system=system,
        body_class="page-daily",
        canonical_path="/daily/",
        has_math=False,
        content=content,
        active_nav="daily",
        i18n=i18n,
        locale=locale,
    )


def render_post_page(site: dict[str, str], system: dict[str, Any], post: dict[str, Any], previous_post: Any, next_post: Any, i18n: dict[str, Any], locale: str, *, related_posts: list | None = None) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.posts", "posts"), "url": site_href(site, "/posts/"), "key": "nav.posts"},
            {"label": post["title"], "url": ""},
        ],
        i18n,
        locale,
    )
    metrics_html = render_metric_list(
        [render_localized_date(post["published_dt"], locale, "long"), render_reading_time(post["reading_time"], i18n, locale)],
        escape_items=False,
    )
    badges_html = render_badge_list(post.get("badges", []))
    tags_html = render_tag_list(post.get("tags", []))
    impact_html = render_impact_bar(post.get("impact", []))
    actions_html = "".join(
        link
        for link in [
            f'<a class="sidebar-link" href="{post["resolved_repo_url"]}" target="_blank" rel="noopener">repo</a>' if post.get("resolved_repo_url") else "",
            f'<a class="sidebar-link" href="{post["resolved_code_url"]}" target="_blank" rel="noopener">code</a>' if post.get("resolved_code_url") else "",
        ]
        if link
    )
    sidebar = f"""
    <aside class="sidebar-panel notebook-meta-panel post-meta-panel">
      <div class="post-sidebar-section post-sidebar-section-meta">
        <div class="sidebar-header"><h2 data-i18n="pages.post.metadata">{html.escape(translate(i18n, locale, "pages.post.metadata", "Metadata"))}</h2></div>
        {metrics_html}
      </div>
      {f'<div class="post-sidebar-section">{badges_html}</div>' if badges_html else ""}
      {f'<div class="post-sidebar-section">{tags_html}</div>' if tags_html else ""}
      {f'<div class="post-sidebar-section">{impact_html}</div>' if impact_html else ""}
      {f'<div class="sidebar-actions">{actions_html}</div>' if actions_html else ""}
    </aside>
    """
    related_html = render_related_posts(related_posts or [], i18n, locale)
    page_payload = json.dumps(_build_post_localization_payload(post), ensure_ascii=False).replace("<", "\\u003c")
    content = f"""
    {breadcrumbs}
    <section class="page-grid notebook-two-column post-reading-layout">
      <article class="post-shell prose notebook-sheet post-reading-article">
        <header class="post-header post-reading-header">
          <div class="post-header-meta">
            <p class="section-kicker" data-i18n="pages.post.kicker">{html.escape(translate(i18n, locale, "pages.post.kicker", "post"))}</p>
            <div class="post-meta post-meta-hero">{render_localized_date(post['published_dt'], locale, 'long')}{render_reading_time(post['reading_time'], i18n, locale)}</div>
          </div>
          <h1 data-page-title>{html.escape(post['title'])}</h1>
          <p class="post-summary post-deck" data-page-summary>{html.escape(post['summary'])}</p>
        </header>
        <div class="post-body" data-page-body>{render_markdown(post['body'])}</div>
        {render_trade_offs_section(post.get("trade_offs", []))}
        {render_lessons_section(post.get("lessons", []))}
      </article>
      {sidebar}
    </section>
    <script id="page-content-data" type="application/json">{page_payload}</script>
    {related_html}
    """
    og = {
        "title": post["title"],
        "description": post["summary"],
        "url": site_href(site, post["url"]),
        "type": "article",
        "twitter_card": "summary",
    }
    return render_layout(
        page_title=f"{post['title']} | {site['title']}",
        page_description=post["summary"],
        site=site,
        system=system,
        body_class="page-post",
        canonical_path=post["url"],
        has_math=post.get("has_math", False),
        content=content,
        active_nav="posts",
        i18n=i18n,
        locale=locale,
        og=og,
    )


def render_daily_page(site: dict[str, str], system: dict[str, Any], entry: dict[str, Any], previous_entry: Any, next_entry: Any, i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.daily", "daily"), "url": site_href(site, "/daily/"), "key": "nav.daily"},
            {"label": entry["title"], "url": ""},
        ],
        i18n,
        locale,
    )
    meta_lines = [
        render_localized_date(entry["published_dt"], locale, "long"),
        render_reading_time(entry["reading_time"], i18n, locale),
    ]
    if entry.get("mood"):
        meta_lines.append(f"<span>{html.escape(entry['mood'])}</span>")
    if entry.get("now_playing"):
        meta_lines.append(f"<span>{html.escape(entry['now_playing'])}</span>")
    soundtrack_link = ""
    if entry.get("resolved_spotify_url"):
        soundtrack_link = f'<a class="sidebar-link" href="{entry["resolved_spotify_url"]}" target="_blank" rel="noopener">spotify</a>'

    page_payload = json.dumps(_build_daily_localization_payload(entry), ensure_ascii=False).replace("<", "\\u003c")
    content = f"""
    {breadcrumbs}
    <section class="page-grid notebook-two-column">
      <article class="post-shell prose notebook-sheet">
        <header class="post-header">
          <p class="section-kicker" data-i18n="pages.daily.kicker">{html.escape(translate(i18n, locale, "pages.daily.kicker", "daily"))}</p>
          <h1 data-page-title>{html.escape(entry['title'])}</h1>
          <p class="post-summary" data-page-summary>{html.escape(entry['summary'])}</p>
          <div class="post-meta">{"".join(meta_lines)}</div>
        </header>
        <div data-page-body>{render_markdown(entry['body'])}</div>
      </article>
      <aside class="sidebar-panel notebook-meta-panel">
        <div class="sidebar-header"><h2>{html.escape(translate(i18n, locale, "pages.daily.meta", "Contexto"))}</h2></div>
        {render_tag_list(entry.get("tags", []))}
        <div class="meta-stack">
          {f'<p><strong>{html.escape(translate(i18n, locale, "pages.daily.mood", "Mood"))}:</strong> {html.escape(entry["mood"])}</p>' if entry.get("mood") else ""}
          {f'<p><strong>{html.escape(translate(i18n, locale, "pages.daily.soundtrack", "Soundtrack"))}:</strong> {html.escape(entry["soundtrack"])}</p>' if entry.get("soundtrack") else ""}
          {f'<p><strong>{html.escape(translate(i18n, locale, "pages.daily.now_playing", "Tocando"))}:</strong> {html.escape(entry["now_playing"])}</p>' if entry.get("now_playing") else ""}
        </div>
        <div class="sidebar-actions">{soundtrack_link}</div>
      </aside>
    </section>
    <script id="page-content-data" type="application/json">{page_payload}</script>
    """
    return render_layout(
        page_title=f"{entry['title']} | {site['title']}",
        page_description=entry["summary"],
        site=site,
        system=system,
        body_class="page-daily-entry",
        canonical_path=entry["url"],
        has_math=False,
        content=content,
        active_nav="daily",
        i18n=i18n,
        locale=locale,
    )


def render_project_page(site: dict[str, str], system: dict[str, Any], project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.projects", "projects"), "url": site_href(site, "/projects/"), "key": "nav.projects"},
            {"label": project["name"], "url": ""},
        ],
        i18n,
        locale,
    )
    sidebar = f"""
    <aside class="sidebar-panel notebook-meta-panel">
      <div class="sidebar-header"><h2 data-i18n="pages.project.status">{html.escape(translate(i18n, locale, "pages.project.status", "Status"))}</h2></div>
      <p>{render_status_badge(project['status'], i18n, locale)}</p>
      <h3 data-i18n="pages.project.stack">{html.escape(translate(i18n, locale, "pages.project.stack", "Stack"))}</h3>
      {render_stack_list(project['stack'])}
      {render_impact_bar(project.get("impact", []))}
      <div class="sidebar-actions">
        {f'<a class="sidebar-link" href="{project["resolved_architecture_url"]}">architecture</a>' if project.get("resolved_architecture_url") else ""}
        {f'<a class="sidebar-link" href="{project["resolved_code_url"]}" target="_blank" rel="noopener">code</a>' if project.get("resolved_code_url") else ""}
      </div>
    </aside>
    """
    page_payload_obj = _build_project_localization_payload(project, i18n, locale)
    page_payload = json.dumps(page_payload_obj, ensure_ascii=False).replace("<", "\\u003c")
    content = f"""
    {breadcrumbs}
    <section class="page-grid notebook-two-column">
      <article class="project-shell prose notebook-sheet">
        <header class="post-header">
          <p class="section-kicker" data-i18n="pages.project.kicker">{html.escape(translate(i18n, locale, "pages.project.kicker", "project"))}</p>
          <h1 data-page-title>{html.escape(project['name'])}</h1>
          <p class="post-summary" data-page-summary>{html.escape(project['headline'] or project['summary'])}</p>
          {render_badge_list(project.get('badges', []))}
        </header>
        <div data-page-body>{page_payload_obj["body_html"]}</div>
      </article>
      {sidebar}
    </section>
    <script id="page-content-data" type="application/json">{page_payload}</script>
    """
    og = {
        "title": project["name"],
        "description": project.get("summary") or project.get("headline", ""),
        "url": site_href(site, project["url"]),
        "type": "website",
        "twitter_card": "summary",
    }
    return render_layout(
        page_title=f"{project['name']} | {site['title']}",
        page_description=project["summary"],
        site=site,
        system=system,
        body_class="page-project",
        canonical_path=project["url"],
        has_math=project.get("has_math", False),
        content=content,
        active_nav="projects",
        i18n=i18n,
        locale=locale,
        extra_scripts=["canvas-reader.js"],
        og=og,
    )


def render_document_page(site: dict[str, str], system: dict[str, Any], document: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.documents", "documents"), "url": site_href(site, "/documents/"), "key": "nav.documents"},
            {"label": document["title"], "url": ""},
        ],
        i18n,
        locale,
    )
    sidebar = f"""
    <aside class="sidebar-panel notebook-meta-panel">
      <div class="sidebar-header"><h2 data-i18n="pages.document.meta">{html.escape(translate(i18n, locale, "pages.document.meta", "Document meta"))}</h2></div>
      <p class="doc-version">{html.escape(document['version'])}</p>
      <p class="doc-category">{html.escape(document['category'])}</p>
      {render_tag_list(document.get('tags', []))}
    </aside>
    """
    page_payload_obj = _build_document_localization_payload(document)
    page_payload = json.dumps(page_payload_obj, ensure_ascii=False).replace("<", "\\u003c")
    content = f"""
    {breadcrumbs}
    <section class="page-grid notebook-two-column">
      <article class="document-shell prose notebook-sheet">
        <header class="post-header">
          <p class="section-kicker" data-i18n="pages.document.kicker">{html.escape(translate(i18n, locale, "pages.document.kicker", "document"))}</p>
          <h1 data-page-title>{html.escape(document['title'])}</h1>
          <p class="post-summary" data-page-summary>{html.escape(document['summary'])}</p>
        </header>
        <div data-page-body>{page_payload_obj["body_html"]}</div>
      </article>
      {sidebar}
    </section>
    <script id="page-content-data" type="application/json">{page_payload}</script>
    """
    return render_layout(
        page_title=f"{document['title']} | {site['title']}",
        page_description=document["summary"],
        site=site,
        system=system,
        body_class="page-document",
        canonical_path=document["url"],
        has_math=document.get("has_math", False),
        content=content,
        active_nav="documents",
        i18n=i18n,
        locale=locale,
    )
