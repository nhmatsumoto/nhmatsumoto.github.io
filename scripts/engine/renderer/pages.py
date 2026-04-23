import html
import json
from typing import Any

from .base import render_layout
from .components import (
    render_navigation_section,
    render_entry_card,
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
    render_related_content,
    render_icon,
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
        diagram_language = (item.get("diagram_format") or "mermaid").strip().lower()
        parts.append(f"```{diagram_language}\n{diagram_preview}\n```")

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


def _clean_html_fragment(markup: str) -> str:
    return "\n".join(line.rstrip() for line in markup.strip().splitlines())


def _profile_snapshot_field_id(item_id: str, field: str) -> str:
    safe_id = item_id.replace("-", "_")
    return f"snapshot_{safe_id}_{field}"


def _render_profile_snapshot(
    system: dict[str, Any],
    i18n: dict[str, Any],
    locale: str,
    *,
    field_attr: str = "",
    class_name: str = "about-snapshot-card",
) -> str:
    about = system.get("about", {})
    snapshot_items = about.get("snapshot_items", [])
    summary = str(localized_value(about, "snapshot_summary", locale, i18n, "") or "").strip()
    summary_attr = f' {field_attr}="snapshot_summary"' if field_attr else ""
    snapshot_html = []
    for item in snapshot_items:
        item_id = str(item.get("id", "") or "").strip()
        label = str(localized_value(item, "label", locale, i18n, "") or "").strip()
        value = str(localized_value(item, "value", locale, i18n, "") or "").strip()
        if not item_id or not label or not value:
            continue
        icon = str(item.get("icon", "sparkles") or "sparkles").strip()
        label_field = _profile_snapshot_field_id(item_id, "label")
        value_field = _profile_snapshot_field_id(item_id, "value")
        label_attr = f' {field_attr}="{html.escape(label_field)}"' if field_attr else ""
        value_attr = f' {field_attr}="{html.escape(value_field)}"' if field_attr else ""
        snapshot_html.append(
            _clean_html_fragment(
                f"""
            <li class="about-snapshot-item">
              {render_icon(icon, "site-icon about-snapshot-icon")}
              <span class="about-snapshot-label"{label_attr}>{html.escape(label)}</span>
              <span class="about-snapshot-value"{value_attr}>{html.escape(value)}</span>
            </li>
            """
            )
        )

    if not summary and not snapshot_html:
        return ""

    return _clean_html_fragment(
        f"""
    <aside class="{html.escape(class_name)}" aria-label="{html.escape(translate(i18n, locale, "pages.about.facts", "Snapshot"))}">
      <div class="about-snapshot-card-head">
        <p class="section-kicker" data-i18n="pages.about.facts">{html.escape(translate(i18n, locale, "pages.about.facts", "Snapshot"))}</p>
        <p class="about-snapshot-summary"{summary_attr}>{html.escape(summary)}</p>
      </div>
      <ul class="about-snapshot-list">
        {"".join(snapshot_html)}
      </ul>
    </aside>
    """
    )


def _contact_icon_name(item: dict[str, Any]) -> str:
    label = str(item.get("label", "") or "").strip().lower()
    kind = str(item.get("kind", "") or "").strip().lower()
    if "github" in label or kind == "code":
        return "git-branch"
    if "linkedin" in label or kind == "network":
        return "network"
    if "rss" in label or kind == "feed":
        return "rss"
    return "globe-2"


def _render_profile_contact_block(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str, *, title_id: str, compact: bool = False) -> str:
    links = system.get("contact", {}).get("links", [])
    link_items = []
    for item in links:
        label = str(item.get("label", "") or "").strip()
        url = str(item.get("url", "") or "").strip()
        description = str(localized_value(item, "description", locale, i18n, item.get("description", "")) or "").strip()
        if not label or not url:
            continue
        desc_payload: dict[str, Any] = {"description": description}
        for supported_locale in i18n.get("supported_locales", []):
            if supported_locale == locale:
                continue
            suffixes = locale_suffixes(supported_locale, i18n)
            if not suffixes:
                continue
            suffix = suffixes[0]
            desc_payload[f"description_{suffix}"] = str(localized_value(item, "description", supported_locale, i18n, description) or "").strip()
        payload_json = json.dumps(desc_payload, ensure_ascii=False).replace("<", "\\u003c")
        link_items.append(
            _clean_html_fragment(
                f"""
          <li class="profile-contact-item" data-contact-card>
            <a class="profile-contact-link" href="{html.escape(url)}" target="_blank" rel="noopener noreferrer">
              {render_icon(_contact_icon_name(item), "site-icon profile-contact-icon")}
              <span class="profile-contact-link-copy">
                <span class="profile-contact-label">{html.escape(label)}</span>
                {f'<span class="profile-contact-description" data-contact-description>{html.escape(description)}</span>' if not compact else ""}
              </span>
              {render_icon("arrow-up-right", "site-icon external-icon")}
            </a>
            <script type="application/json" data-contact-card-data>{payload_json}</script>
          </li>
          """
            )
        )
    if not link_items:
        return ""

    contact_kicker = html.escape(translate(i18n, locale, "nav.contact", "contato"))
    contact_label = html.escape(translate(i18n, locale, "pages.contact.title", "Contato"))
    contact_desc = html.escape(translate(i18n, locale, "pages.contact.description", "Canais principais para acompanhar trabalho, conversar e seguir a trilha pública do site."))
    class_attr = ' class="profile-contact-block profile-contact-compact"' if compact else ' class="profile-contact-block"'
    return _clean_html_fragment(
        f"""
        <section{class_attr} aria-labelledby="{html.escape(title_id)}">
          <p class="section-kicker profile-contact-kicker" data-i18n="nav.contact">{contact_kicker}</p>
          <h3 id="{html.escape(title_id)}" class="profile-contact-title" data-i18n="pages.contact.title">{contact_label}</h3>
          <p class="profile-contact-copy" data-i18n="pages.contact.description">{contact_desc}</p>
          <ul class="profile-contact-links">
            {"".join(link_items)}
          </ul>
        </section>
        """
    )


def _build_profile_localization_payload(system: dict[str, Any], i18n: dict[str, Any], locale: str, fallback_summary: str) -> dict[str, Any]:
    about = system.get("about", {})
    payload: dict[str, Any] = {
        "profile_name": "Hiro Matsumoto",
        "profile_handle": translate(i18n, locale, "profile.handle", "@nhmatsumoto · Brasil / Japão"),
        "profile_summary": str(localized_value(about, "lede", locale, i18n, fallback_summary) or "").strip(),
        "snapshot_summary": str(localized_value(about, "snapshot_summary", locale, i18n, "") or "").strip(),
    }

    for item in about.get("snapshot_items", []):
        item_id = str(item.get("id", "") or "").strip()
        if not item_id:
            continue
        payload[_profile_snapshot_field_id(item_id, "label")] = str(localized_value(item, "label", locale, i18n, "") or "").strip()
        payload[_profile_snapshot_field_id(item_id, "value")] = str(localized_value(item, "value", locale, i18n, "") or "").strip()

    for supported_locale in i18n.get("supported_locales", []):
        if supported_locale == locale:
            continue
        suffixes = locale_suffixes(supported_locale, i18n)
        if not suffixes:
            continue
        suffix = suffixes[0]
        payload[f"profile_handle_{suffix}"] = translate(i18n, supported_locale, "profile.handle", payload["profile_handle"])
        payload[f"profile_summary_{suffix}"] = str(localized_value(about, "lede", supported_locale, i18n, payload["profile_summary"]) or "").strip()
        payload[f"snapshot_summary_{suffix}"] = str(localized_value(about, "snapshot_summary", supported_locale, i18n, payload["snapshot_summary"]) or "").strip()
        for item in about.get("snapshot_items", []):
            item_id = str(item.get("id", "") or "").strip()
            if not item_id:
                continue
            label_field = _profile_snapshot_field_id(item_id, "label")
            value_field = _profile_snapshot_field_id(item_id, "value")
            payload[f"{label_field}_{suffix}"] = str(localized_value(item, "label", supported_locale, i18n, payload.get(label_field, "")) or "").strip()
            payload[f"{value_field}_{suffix}"] = str(localized_value(item, "value", supported_locale, i18n, payload.get(value_field, "")) or "").strip()
    return payload


def _render_profile_header(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str, *, include_snapshot: bool = False) -> str:
    about = system.get("about", {})
    lede = str(localized_value(about, "lede", locale, i18n, site.get("headline", "")) or "").strip()
    payload = _build_profile_localization_payload(system, i18n, locale, site.get("headline", ""))
    payload_json = json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c")
    shell_class = "profile-shell" if include_snapshot else "profile-shell profile-shell-compact"
    snapshot_html = (
        _render_profile_snapshot(system, i18n, locale, field_attr="data-profile-field", class_name="about-snapshot-card profile-shell-snapshot")
        if include_snapshot
        else ""
    )
    return _clean_html_fragment(
        f"""
    <section class="{shell_class}" aria-labelledby="profile-shell-name">
      <div class="about-profile-card profile-shell-card">
        <div class="about-profile-avatar">
          <img src="{html.escape(site_href(site, "/assets/images/profile/profile.gif"))}" alt="{html.escape(translate(i18n, locale, "profile.alt", "Hiro Matsumoto"))}" width="400" height="300" loading="eager">
        </div>
        <div class="about-profile-main">
          <p class="about-profile-handle" data-profile-field="profile_handle">{html.escape(translate(i18n, locale, "profile.handle", "@nhmatsumoto · Brasil / Japão"))}</p>
          <h2 id="profile-shell-name" class="profile-shell-name" data-profile-field="profile_name">Hiro Matsumoto</h2>
          <p class="about-profile-bio" data-profile-field="profile_summary">{html.escape(lede)}</p>
          {_render_profile_contact_block(site, system, i18n, locale, title_id="profile-shell-contact-title")}
        </div>
      </div>
      {snapshot_html}
    </section>
    <script id="profile-content-data" type="application/json">{payload_json}</script>
    """
    )


def _render_home_profile(site: dict[str, str], system: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    about = system.get("about", {})
    lede = str(localized_value(about, "lede", locale, i18n, site.get("headline", "")) or "").strip()
    view_label = html.escape(translate(i18n, locale, "actions.view_about", "Ver perfil completo"))
    payload = _build_profile_localization_payload(system, i18n, locale, site.get("headline", ""))
    payload_json = json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c")
    return f"""<div class="about-profile-card home-profile-card">
      <div class="about-profile-avatar">
        <img src="{html.escape(site_href(site, "/assets/images/profile/profile.gif"))}" alt="{html.escape(translate(i18n, locale, "profile.alt", "Hiro Matsumoto"))}" width="400" height="300" loading="lazy">
      </div>
      <div class="about-profile-main">
        <p class="about-profile-handle" data-i18n="profile.handle">{html.escape(translate(i18n, locale, "profile.handle", "@nhmatsumoto · Brasil / Japão"))}</p>
        <h2 id="home-profile-name" class="home-profile-name">Hiro Matsumoto</h2>
        <p class="about-profile-bio" data-profile-field="profile_summary">{html.escape(lede)}</p>
        {_render_profile_contact_block(site, system, i18n, locale, title_id="home-profile-contact-title", compact=True)}
        <a class="home-profile-link" href="{site_href(site, "/about/")}" aria-label="{view_label}">
          {render_icon("user-round", "site-icon home-profile-link-icon")}
          <span data-i18n="actions.view_about">{view_label}</span>
          {render_icon("arrow-right", "site-icon home-profile-link-arrow")}
        </a>
      </div>
    </div>
    <script id="profile-content-data" type="application/json">{payload_json}</script>"""


def _render_start_here_section(items: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    visible_items = [item for item in items if item][:3]
    if not visible_items:
        return ""
    cards = "".join(render_entry_card(item, i18n, locale) for item in visible_items)
    return f"""
    <section class="section-panel start-here-panel" aria-labelledby="start-here-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="home.start_here_kicker">{html.escape(translate(i18n, locale, "home.start_here_kicker", "start here"))}</p>
          <h2 id="start-here-title" data-i18n="home.start_here_title">{html.escape(translate(i18n, locale, "home.start_here_title", "Comece por aqui"))}</h2>
        </div>
        <p class="section-copy" data-i18n="home.start_here_copy">{html.escape(translate(i18n, locale, "home.start_here_copy", "Uma trilha curta para entender o notebook, ver o sistema principal e entrar na documentacao conectada."))}</p>
      </header>
      <ol class="entry-list entry-list-guided">
        {cards}
      </ol>
    </section>
    """


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
    home_summary = site.get("home_summary", "").strip()
    featured_post = next((post for post in posts if post.get("featured")), posts[0] if posts else None)
    featured_project = next((project for project in projects if project.get("featured")), projects[0] if projects else None)
    featured_document = documents[0] if documents else None
    start_here_items = [item for item in [featured_post, featured_project, featured_document] if item]

    intro_payload: dict[str, Any] = {"body_html": render_markdown(intro)}
    for supported_locale in i18n.get("supported_locales", []):
        for suffix in locale_suffixes(supported_locale, i18n):
            locale_intro = str(site.get(f"home_intro_{suffix}", "") or "").strip()
            if locale_intro:
                payload_key = f"body_html_{suffix}"
                if payload_key not in intro_payload:
                    intro_payload[payload_key] = render_markdown(locale_intro)
                break
    intro_payload_json = json.dumps(intro_payload, ensure_ascii=False).replace("<", "\\u003c")

    quick_links = [
        ("nav.about", "/about/"),
        ("nav.posts", "/posts/"),
        ("nav.daily", "/daily/"),
        ("nav.projects", "/projects/"),
    ]
    quick_links_html = "".join(
        f'<a class="notebook-link-chip" href="{html.escape(site_href(site, url))}" data-i18n="{html.escape(key)}">{html.escape(translate(i18n, locale, key, key.split(".")[-1]))}</a>'
        for key, url in quick_links
    )

    content = f"""
    <div class="layout-container home-shell">
      <header class="home-header">
        {_render_home_profile(site, system, i18n, locale)}
      </header>

      <div class="home-stack">
        <section class="notebook-hero section-panel" aria-labelledby="home-title">
          <div class="notebook-hero-copy">
            <p class="section-kicker" data-i18n="home.kicker">{html.escape(translate(i18n, locale, "home.kicker", "engineering notebook"))}</p>
            <h1 id="home-title" class="notebook-hero-title">{html.escape(site.get("home_title") or site.get("headline") or site["title"])}</h1>
            {f'<p class="notebook-hero-summary">{html.escape(home_summary)}</p>' if home_summary else ""}
            <div class="prose notebook-intro" data-page-body>{render_markdown(intro)}</div>
            <div class="notebook-link-row">{quick_links_html}</div>
          </div>
        </section>

        {_render_start_here_section(start_here_items, i18n, locale)}
        
        <div class="home-content-grid">
          <section class="section-panel" aria-labelledby="posts-title">
            <header class="section-header">
              <p class="section-kicker" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "posts"))}</p>
              <h2 id="posts-title" data-i18n="sections.posts_title">{html.escape(translate(i18n, locale, "sections.posts_title", "Publicações recentes"))}</h2>
              <p class="section-copy" data-i18n="sections.posts_copy">{html.escape(translate(i18n, locale, "sections.posts_copy", "Ensaios técnicos, decisões de arquitetura e aprendizado aplicado."))}</p>
            </header>
            <ol class="entry-list">
              {"".join(render_post_card(post, i18n, locale) for post in posts[:posts_limit])}
            </ol>
          </section>

          <section class="section-panel" aria-labelledby="daily-title">
            <header class="section-header">
              <p class="section-kicker" data-i18n="nav.daily">{html.escape(translate(i18n, locale, "nav.daily", "daily"))}</p>
              <h2 id="daily-title" data-i18n="pages.daily.title">{html.escape(translate(i18n, locale, "pages.daily.title", "Daily notes"))}</h2>
              <p class="section-copy" data-i18n="pages.daily.description">{html.escape(translate(i18n, locale, "pages.daily.description", "Notas curtas de progresso, ideias e trilha sonora de trabalho."))}</p>
            </header>
            <ol class="entry-list">
              {"".join(render_daily_card(entry, i18n, locale, compact=True) for entry in daily_entries[:daily_limit])}
            </ol>
          </section>

          <section class="section-panel" aria-labelledby="projects-title">
            <header class="section-header">
              <p class="section-kicker" data-i18n="nav.projects">{html.escape(translate(i18n, locale, "nav.projects", "projects"))}</p>
              <h2 id="projects-title" data-i18n="sections.projects_title">{html.escape(translate(i18n, locale, "sections.projects_title", "Projetos relevantes"))}</h2>
              <p class="section-copy" data-i18n="sections.projects_copy">{html.escape(translate(i18n, locale, "sections.projects_copy", "Sistemas que concentram arquitetura, trade-offs e execução prática."))}</p>
            </header>
            <ol class="entry-list">
              {"".join(render_project_card(project, i18n, locale) for project in projects[:projects_limit])}
            </ol>
          </section>
        </div>

        {render_documents_section(system, documents, i18n, locale, limit=3)}
        {render_navigation_section(site, system, documents, i18n, locale)}
      </div>
    </div>
    <script id="page-content-data" type="application/json">{intro_payload_json}</script>
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
    <div class="layout-container page-stack page-stack-wide">
      <header class="page-header">
        {breadcrumbs}
        <section class="page-heading">
          <p class="section-kicker" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "posts"))}</p>
          <h1 data-i18n="pages.archive.title">{html.escape(translate(i18n, locale, "pages.archive.title", "Publicações"))}</h1>
          <p data-i18n="pages.archive.description">{html.escape(translate(i18n, locale, "pages.archive.description", "Escrita técnica organizada por clareza, ritmo e utilidade prática."))}</p>
        </section>
      </header>
      <div class="page-content">
        <section class="section-panel">
          <ol class="entry-list">
            {"".join(render_post_card(post, i18n, locale) for post in posts)}
          </ol>
        </section>
        {pagination}
      </div>
    </div>
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


def render_projects_index_page(site: dict[str, str], system: dict[str, Any], posts: list[dict[str, Any]], projects: list[dict[str, Any]], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.projects", "projects"), "url": "", "key": "nav.projects"},
        ],
        i18n,
        locale,
    )
    content = f"""
    <div class="layout-container page-stack page-stack-wide">
      <header class="page-header">
        {breadcrumbs}
        <section class="page-heading">
          <p class="section-kicker" data-i18n="nav.projects">{html.escape(translate(i18n, locale, "nav.projects", "projects"))}</p>
          <h1 data-i18n="pages.projects.title">{html.escape(translate(i18n, locale, "pages.projects.title", "Projetos"))}</h1>
          <p data-i18n="pages.projects.description">{html.escape(translate(i18n, locale, "pages.projects.description", "Projetos apresentados como sistemas: problema, solução, arquitetura, stack, ADRs e roadmap."))}</p>
        </section>
      </header>
      <div class="page-content">
        <section class="section-panel">
          <ol class="entry-list">
            {"".join(render_project_card(project, i18n, locale) for project in projects)}
          </ol>
        </section>
      </div>
    </div>
    """
    has_math = any(project.get("has_math") for project in projects)
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
    <div class="layout-container page-stack page-stack-wide">
      <header class="page-header">
        {breadcrumbs}
        <section class="page-heading">
          <p class="section-kicker" data-i18n="nav.documents">{html.escape(translate(i18n, locale, "nav.documents", "documents"))}</p>
          <h1 data-i18n="pages.documents.title">{html.escape(translate(i18n, locale, "pages.documents.title", "Documents"))}</h1>
          <p data-i18n="pages.documents.description">{html.escape(translate(i18n, locale, "pages.documents.description", "Documentação técnica organizada por domínio, arquitetura e integrações."))}</p>
        </section>
      </header>
      <div class="page-content">
        {render_documents_section(system, documents, i18n, locale, grouped=True, show_header=False)}
      </div>
    </div>
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
    about = system.get("about", {})
    sections = about.get("sections", [])
    proof_points = about.get("proof_points", [])

    def render_about_proof_points(target_locale: str) -> str:
        cards = []
        for point in proof_points:
            title = str(localized_value(point, "title", target_locale, i18n, "") or "").strip()
            body = str(localized_value(point, "body", target_locale, i18n, "") or "").strip()
            if not title or not body:
                continue
            icon = str(point.get("icon", "sparkles") or "sparkles").strip()
            cards.append(
                f"""
                <article class="about-proof-card">
                  {render_icon(icon, "site-icon about-proof-icon")}
                  <h2>{html.escape(title)}</h2>
                  <p>{html.escape(body)}</p>
                </article>
                """
            )
        if not cards:
            return ""
        return f'<section class="about-proof-grid" aria-label="{html.escape(translate(i18n, target_locale, "pages.about.facts", "Snapshot"))}">{"".join(cards)}</section>'

    def render_about_sections(target_locale: str) -> str:
        section_html = []
        for section in sections:
            title = str(localized_value(section, "title", target_locale, i18n, "") or "").strip()
            body = str(localized_value(section, "body", target_locale, i18n, "") or "").strip()
            if not title or not body:
                continue
            section_html.append(
                f'<section class="notebook-subsection"><h2>{html.escape(title)}</h2><div class="prose">{render_markdown(body)}</div></section>'
            )

        if not section_html:
            section_html.append(f'<section class="notebook-subsection"><div class="prose">{render_markdown(site.get("about", ""))}</div></section>')
        return render_about_proof_points(target_locale) + "".join(section_html)

    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.about", "about"), "url": "", "key": "nav.about"},
        ],
        i18n,
        locale,
    )
    about_lede = str(localized_value(about, "lede", locale, i18n, site.get("headline", "")) or "").strip()

    page_data: dict[str, Any] = {
        "title": translate(i18n, locale, "pages.about.title", "Sobre"),
        "summary": about_lede,
        "body_html": render_about_sections(locale),
    }

    for supported_locale in i18n.get("supported_locales", []):
        if supported_locale == locale:
            continue
        suffixes = locale_suffixes(supported_locale, i18n)
        if not suffixes:
            continue
        suffix = suffixes[0]
        page_data[f"title_{suffix}"] = translate(i18n, supported_locale, "pages.about.title", page_data["title"])
        page_data[f"summary_{suffix}"] = str(localized_value(about, "lede", supported_locale, i18n, page_data["summary"]) or "").strip()
        page_data[f"body_html_{suffix}"] = render_about_sections(supported_locale)

    page_payload = json.dumps(page_data, ensure_ascii=False).replace("<", "\\u003c")
    content = f"""
    <div class="layout-container page-stack">
      <header class="page-header">
        {breadcrumbs}
        <section class="page-heading">
          <p class="section-kicker" data-i18n="nav.about">{html.escape(translate(i18n, locale, "nav.about", "about"))}</p>
          <h1 data-page-title>{html.escape(page_data["title"])}</h1>
          <p data-page-summary>{html.escape(page_data["summary"])}</p>
        </section>
      </header>
      <article class="post-shell prose notebook-sheet about-narrative" data-page-body>
        {page_data["body_html"]}
      </article>
    </div>
    <script id="page-content-data" type="application/json">{page_payload}</script>
    """
    return render_layout(
        page_title=f"{page_data['title']} | {site['title']}",
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
    for idx, item in enumerate(links):
        label = str(item.get("label", "") or "").strip()
        url = str(item.get("url", "") or "").strip()
        description = str(localized_value(item, "description", locale, i18n, item.get("description", "")) or "").strip()
        if not label or not url:
            continue
        desc_payload: dict[str, Any] = {"description": description}
        for supported_locale in i18n.get("supported_locales", []):
            if supported_locale == locale:
                continue
            suffixes = locale_suffixes(supported_locale, i18n)
            if not suffixes:
                continue
            suffix = suffixes[0]
            desc_payload[f"description_{suffix}"] = str(localized_value(item, "description", supported_locale, i18n, description) or "").strip()
        payload_json = json.dumps(desc_payload, ensure_ascii=False).replace("<", "\\u003c")
        cards.append(
            f"""
            <article class="resource-card contact-card" data-contact-card>
              <p class="card-type">{html.escape(str(item.get("kind", "link") or "link"))}</p>
              <h2><a href="{html.escape(url)}" target="_blank" rel="noopener noreferrer">{html.escape(label)}</a></h2>
              <p class="card-summary" data-contact-description>{html.escape(description)}</p>
              <p class="contact-url">{html.escape(url)}</p>
              <script type="application/json" data-contact-card-data>{payload_json}</script>
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
    <div class="layout-container page-stack">
      <header class="page-header">
        {breadcrumbs}
        <section class="page-heading">
          <p class="section-kicker" data-i18n="nav.contact">{html.escape(translate(i18n, locale, "nav.contact", "contact"))}</p>
          <h1 data-i18n="pages.contact.title">{html.escape(translate(i18n, locale, "pages.contact.title", "Contato"))}</h1>
          <p data-i18n="pages.contact.description">{html.escape(translate(i18n, locale, "pages.contact.description", "Canais principais para acompanhar trabalho, conversar e seguir a trilha pública do site."))}</p>
        </section>
      </header>
      <section class="section-panel">
        <div class="contact-grid">
          {"".join(cards)}
        </div>
      </section>
    </div>
    """
    return render_layout(
        page_title=f"{translate(i18n, locale, 'pages.contact.title', 'Contato')} | {site['title']}",
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
    <div class="layout-container page-stack page-stack-wide">
      <header class="page-header">
        {breadcrumbs}
        <section class="page-heading">
          <p class="section-kicker" data-i18n="nav.daily">{html.escape(translate(i18n, locale, "nav.daily", "daily"))}</p>
          <h1 data-i18n="pages.daily.title">{html.escape(translate(i18n, locale, "pages.daily.title", "Daily notes"))}</h1>
          <p data-i18n="pages.daily.description">{html.escape(translate(i18n, locale, "pages.daily.description", "Linha do tempo de notas curtas, progresso diário e o que está tocando durante o trabalho."))}</p>
        </section>
      </header>
      <div class="page-content">
        <section class="section-panel">
          <ol class="entry-list">
            {"".join(render_daily_card(entry, i18n, locale) for entry in daily_entries)}
          </ol>
        </section>
      </div>
    </div>
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


def render_post_page(
    site: dict[str, str],
    system: dict[str, Any],
    post: dict[str, Any],
    previous_post: Any,
    next_post: Any,
    i18n: dict[str, Any],
    locale: str,
    *,
    related_posts: list | None = None,
    related_items: list | None = None,
) -> str:
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
        [
            f'{render_icon("calendar-days", "site-icon meta-icon")}{render_localized_date(post["published_dt"], locale, "long")}',
            f'{render_icon("clock-3", "site-icon meta-icon")}{render_reading_time(post["reading_time"], i18n, locale)}',
        ],
        escape_items=False,
    )
    badges_html = render_badge_list(post.get("badges", []))
    tags_html = render_tag_list(post.get("tags", []))
    impact_html = render_impact_bar(post.get("impact", []), i18n, locale)
    repo_label = html.escape(translate(i18n, locale, "actions.repo", "repo"))
    code_label = html.escape(translate(i18n, locale, "actions.code", "code"))
    actions_html = "".join(
        link
        for link in [
            f'<a class="sidebar-link" href="{post["resolved_repo_url"]}" target="_blank" rel="noopener">{render_icon("git-branch", "site-icon sidebar-link-icon")}<span data-i18n="actions.repo">{repo_label}</span>{render_icon("arrow-up-right", "site-icon external-icon")}</a>' if post.get("resolved_repo_url") else "",
            f'<a class="sidebar-link" href="{post["resolved_code_url"]}" target="_blank" rel="noopener">{render_icon("code-2", "site-icon sidebar-link-icon")}<span data-i18n="actions.code">{code_label}</span>{render_icon("arrow-up-right", "site-icon external-icon")}</a>' if post.get("resolved_code_url") else "",
        ]
        if link
    )
    sidebar_sections = [
        f"""<div class="post-sidebar-section post-sidebar-section-meta">
          <div class="sidebar-header"><h2 data-i18n="pages.post.metadata">{html.escape(translate(i18n, locale, "pages.post.metadata", "Metadata"))}</h2></div>
          {metrics_html}
        </div>"""
    ]
    if badges_html:
        sidebar_sections.append(f'<div class="post-sidebar-section">{badges_html}</div>')
    if tags_html:
        sidebar_sections.append(f'<div class="post-sidebar-section">{tags_html}</div>')
    if impact_html:
        sidebar_sections.append(f'<div class="post-sidebar-section">{impact_html}</div>')
    if actions_html:
        sidebar_sections.append(f'<div class="sidebar-actions">{actions_html}</div>')
    sidebar_body = "\n        ".join(sidebar_sections)
    sidebar = f"""
    <aside class="page-sidebar post-detail-sidebar">
      <div class="sidebar-panel notebook-meta-panel post-meta-panel">
        {sidebar_body}
      </div>
    </aside>
    """.strip()
    post_body_sections = "".join(
        section
        for section in [
            render_trade_offs_section(post.get("trade_offs", []), i18n, locale),
            render_lessons_section(post.get("lessons", []), i18n, locale),
        ]
        if section
    )
    related_html = render_related_content(related_items or related_posts or [], i18n, locale)
    page_payload = json.dumps(_build_post_localization_payload(post), ensure_ascii=False).replace("<", "\\u003c")
    content = f"""
    <div class="layout-container post-reading-layout">
      <header class="page-header">
        {breadcrumbs}
      </header>
      <div class="page-two-column">
        {sidebar}
        <div class="page-main">
          <article class="post-shell prose notebook-sheet post-reading-article">
            <header class="post-header post-reading-header">
              <div class="post-header-meta">
                <p class="section-kicker" data-i18n="pages.post.kicker">{html.escape(translate(i18n, locale, "pages.post.kicker", "post"))}</p>
                <div class="post-meta post-meta-hero"><span class="post-meta-item">{render_icon("calendar-days", "site-icon meta-icon")}{render_localized_date(post['published_dt'], locale, 'long')}</span><span class="post-meta-item">{render_icon("clock-3", "site-icon meta-icon")}{render_reading_time(post['reading_time'], i18n, locale)}</span></div>
              </div>
              <h1 data-page-title>{html.escape(post['title'])}</h1>
              <p class="post-summary post-deck" data-page-summary>{html.escape(post['summary'])}</p>
            </header>
            <div class="post-body" data-page-body>{render_markdown(post['body'])}</div>{post_body_sections}
          </article>
        </div>
      </div>
    </div>
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


def render_daily_page(
    site: dict[str, str],
    system: dict[str, Any],
    entry: dict[str, Any],
    previous_entry: Any,
    next_entry: Any,
    i18n: dict[str, Any],
    locale: str,
    *,
    related_items: list | None = None,
) -> str:
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
        f'<span class="post-meta-item">{render_icon("calendar-days", "site-icon meta-icon")}{render_localized_date(entry["published_dt"], locale, "long")}</span>',
        f'<span class="post-meta-item">{render_icon("clock-3", "site-icon meta-icon")}{render_reading_time(entry["reading_time"], i18n, locale)}</span>',
    ]
    if entry.get("mood"):
        meta_lines.append(f'<span class="post-meta-item">{render_icon("activity", "site-icon meta-icon")}{html.escape(entry["mood"])}</span>')
    if entry.get("now_playing"):
        meta_lines.append(f'<span class="post-meta-item">{render_icon("music-2", "site-icon meta-icon")}{html.escape(entry["now_playing"])}</span>')
    soundtrack_link = ""
    if entry.get("resolved_spotify_url"):
        soundtrack_link = f'<a class="sidebar-link" href="{entry["resolved_spotify_url"]}" target="_blank" rel="noopener">{render_icon("music-2", "site-icon sidebar-link-icon")}<span>spotify</span>{render_icon("arrow-up-right", "site-icon external-icon")}</a>'

    page_payload = json.dumps(_build_daily_localization_payload(entry), ensure_ascii=False).replace("<", "\\u003c")
    content = f"""
    <div class="layout-container">
      <header class="page-header">
        {breadcrumbs}
      </header>
      <div class="page-two-column">
        <aside class="page-sidebar">
          <div class="sidebar-panel notebook-meta-panel">
            <div class="sidebar-header"><h2 data-i18n="pages.daily.meta">{html.escape(translate(i18n, locale, "pages.daily.meta", "Contexto"))}</h2></div>
            {render_tag_list(entry.get("tags", []))}
            <div class="meta-stack">
              {f'<p><strong data-i18n="pages.daily.mood">{html.escape(translate(i18n, locale, "pages.daily.mood", "Mood"))}</strong>: {html.escape(entry["mood"])}</p>' if entry.get("mood") else ""}
              {f'<p><strong data-i18n="pages.daily.soundtrack">{html.escape(translate(i18n, locale, "pages.daily.soundtrack", "Soundtrack"))}</strong>: {html.escape(entry["soundtrack"])}</p>' if entry.get("soundtrack") else ""}
              {f'<p><strong data-i18n="pages.daily.now_playing">{html.escape(translate(i18n, locale, "pages.daily.now_playing", "Tocando"))}</strong>: {html.escape(entry["now_playing"])}</p>' if entry.get("now_playing") else ""}
            </div>
            <div class="sidebar-actions">{soundtrack_link}</div>
          </div>
        </aside>
        <div class="page-main">
          <article class="post-shell prose notebook-sheet">
            <header class="post-header">
              <p class="section-kicker" data-i18n="pages.daily.kicker">{html.escape(translate(i18n, locale, "pages.daily.kicker", "daily"))}</p>
              <h1 data-page-title>{html.escape(entry['title'])}</h1>
              <p class="post-summary" data-page-summary>{html.escape(entry['summary'])}</p>
              <div class="post-meta">{"".join(meta_lines)}</div>
            </header>
            <div data-page-body>{render_markdown(entry['body'])}</div>
          </article>
        </div>
      </div>
    </div>
    <script id="page-content-data" type="application/json">{page_payload}</script>
    {render_related_content(related_items or [], i18n, locale)}
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


def render_project_page(
    site: dict[str, str],
    system: dict[str, Any],
    project: dict[str, Any],
    i18n: dict[str, Any],
    locale: str,
    *,
    related_items: list | None = None,
) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.projects", "projects"), "url": site_href(site, "/projects/"), "key": "nav.projects"},
            {"label": project["name"], "url": ""},
        ],
        i18n,
        locale,
    )
    sidebar_actions = "".join(
        link
        for link in [
            f'<a class="sidebar-link" href="{project["resolved_architecture_url"]}">{render_icon("network", "site-icon sidebar-link-icon")}<span data-i18n="actions.view_architecture">{html.escape(translate(i18n, locale, "actions.view_architecture", "architecture"))}</span></a>' if project.get("resolved_architecture_url") else "",
            f'<a class="sidebar-link" href="{project["resolved_docs_url"]}">{render_icon("book-open", "site-icon sidebar-link-icon")}<span data-i18n="actions.open_docs">{html.escape(translate(i18n, locale, "actions.open_docs", "docs"))}</span></a>' if project.get("resolved_docs_url") else "",
            f'<a class="sidebar-link" href="{project["resolved_code_url"]}" target="_blank" rel="noopener">{render_icon("code-2", "site-icon sidebar-link-icon")}<span data-i18n="actions.code">{html.escape(translate(i18n, locale, "actions.code", "code"))}</span>{render_icon("arrow-up-right", "site-icon external-icon")}</a>' if project.get("resolved_code_url") else "",
        ]
        if link
    )
    sidebar_sections = [
        f'<div class="sidebar-header"><h2 data-i18n="pages.project.status">{html.escape(translate(i18n, locale, "pages.project.status", "Status"))}</h2></div>',
        f"<p>{render_status_badge(project['status'], i18n, locale)}</p>",
        f'<h3 data-i18n="pages.project.stack">{html.escape(translate(i18n, locale, "pages.project.stack", "Stack"))}</h3>',
        render_stack_list(project["stack"]),
        render_tag_list(project.get("tags", [])),
        render_impact_bar(project.get("impact", []), i18n, locale),
        f'<div class="sidebar-actions">{sidebar_actions}</div>' if sidebar_actions else "",
    ]
    sidebar_body = "\n        ".join(section for section in sidebar_sections if section)
    sidebar = f"""
    <aside class="page-sidebar">
      <div class="sidebar-panel notebook-meta-panel">
        {sidebar_body}
      </div>
    </aside>
    """.strip()
    page_payload_obj = _build_project_localization_payload(project, i18n, locale)
    page_payload = json.dumps(page_payload_obj, ensure_ascii=False).replace("<", "\\u003c")
    badges_html = render_badge_list(project.get("badges", []))
    content = f"""
    <div class="layout-container post-reading-layout">
      <header class="page-header">
        {breadcrumbs}
      </header>
      <div class="page-two-column">
        {sidebar}
        <div class="page-main">
          <article class="project-shell prose notebook-sheet post-reading-article">
            <header class="post-header post-reading-header">
              <div class="post-header-meta">
                <p class="section-kicker" data-i18n="pages.project.kicker">{html.escape(translate(i18n, locale, "pages.project.kicker", "project"))}</p>
              </div>
              <h1 data-page-title>{html.escape(project['name'])}</h1>
              <p class="post-summary post-deck" data-page-summary>{html.escape(project['headline'] or project['summary'])}</p>{badges_html}
            </header>
            <div class="post-body" data-page-body>{page_payload_obj["body_html"]}</div>
          </article>
        </div>
      </div>
    </div>
    <script id="page-content-data" type="application/json">{page_payload}</script>
    {render_related_content(related_items or [], i18n, locale)}
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
        og=og,
    )


def render_document_page(
    site: dict[str, str],
    system: dict[str, Any],
    document: dict[str, Any],
    i18n: dict[str, Any],
    locale: str,
    *,
    related_items: list | None = None,
) -> str:
    breadcrumbs = render_breadcrumbs(
        [
            {"label": translate(i18n, locale, "nav.home", "home"), "url": site_href(site, "/"), "key": "nav.home"},
            {"label": translate(i18n, locale, "nav.documents", "documents"), "url": site_href(site, "/documents/"), "key": "nav.documents"},
            {"label": document["title"], "url": ""},
        ],
        i18n,
        locale,
    )
    metadata_label = html.escape(translate(i18n, locale, "pages.document.meta", "Document meta"))
    metadata_tags = render_tag_list(document.get("tags", []), "tag-list document-page-meta-tags")
    page_payload_obj = _build_document_localization_payload(document)
    page_payload = json.dumps(page_payload_obj, ensure_ascii=False).replace("<", "\\u003c")
    aside_meta = f"""
      <aside class="page-sidebar">
        <section class="document-page-meta" aria-label="{metadata_label}">
          <p class="document-page-meta-label" data-i18n="pages.document.meta">{metadata_label}</p>
          <div class="document-page-meta-row">
            <p class="doc-version">{render_icon("git-branch", "site-icon meta-icon")}{html.escape(document['version'])}</p>
            <p class="doc-category">{render_icon("folder", "site-icon meta-icon")}{html.escape(document['category'])}</p>
          </div>
          {metadata_tags}
        </section>
      </aside>
    """
    content = f"""
    <div class="layout-container post-reading-layout">
      <header class="page-header">
        {breadcrumbs}
      </header>
      <div class="page-two-column document-page-layout">
        {aside_meta}
        <div class="page-main">
          <article class="document-shell prose notebook-sheet post-reading-article">
            <header class="post-header post-reading-header">
              <div class="post-header-meta">
                <p class="section-kicker" data-i18n="pages.document.kicker">{html.escape(translate(i18n, locale, "pages.document.kicker", "document"))}</p>
              </div>
              <h1 data-page-title>{html.escape(document['title'])}</h1>
              <p class="post-summary post-deck" data-page-summary>{html.escape(document['summary'])}</p>
            </header>
            <div class="post-body" data-page-body>{page_payload_obj["body_html"]}</div>
          </article>
        </div>
      </div>
    </div>
    <script id="page-content-data" type="application/json">{page_payload}</script>
    {render_related_content(related_items or [], i18n, locale)}
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
