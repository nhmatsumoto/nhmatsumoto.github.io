import html
import json
from datetime import datetime
from typing import Any
from ..utils import (
    site_href,
    normalize_string_list,
    slugify,
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
    locale_suffixes,
)

def render_markdown(text: str) -> str:
    import re
    from ..constants import WIKILINK_RE, LINK_RE, STRONG_RE, EMPHASIS_RE, INLINE_CODE_RE

    lines = text.replace("\r\n", "\n").split("\n")
    parts: list[str] = []
    i = 0
    ordered_list_re = re.compile(r"^(\d+)\.\s+(.+)$")
    image_re = re.compile(r'^!\[(.*?)\]\((\S+?)(?:\s+"(.*?)")?\)$')
    rule_re = re.compile(r"^([-*_])\1{2,}$")

    def render_inline(s: str) -> str:
        s = html.escape(s)
        protected_math: list[str] = []

        def stash_math(fragment: str) -> str:
            protected_math.append(fragment)
            return f"\x00MATH{len(protected_math) - 1}\x00"

        def restore_math(value: str) -> str:
            for index, fragment in enumerate(protected_math):
                value = value.replace(f"\x00MATH{index}\x00", fragment)
            return value

        # Protect math before inline-code parsing so AsciiMath backticks remain
        # visible to MathJax instead of becoming <code> elements.
        s = re.sub(
            r"`am:\s*(.+?)`",
            lambda match: stash_math(f'<span class="math-asciimath">`{match.group(1).strip()}`</span>'),
            s,
        )
        s = re.sub(
            r"\\\((.+?)\\\)",
            lambda match: stash_math(f'<span class="math-inline">\\({match.group(1)}\\)</span>'),
            s,
        )
        s = re.sub(
            r"(?<!\$)\$(?!\$)(.+?)(?<!\\)\$(?!\$)",
            lambda match: stash_math(f'<span class="math-inline">${match.group(1)}$</span>'),
            s,
        )
        s = STRONG_RE.sub(r"<strong>\1</strong>", s)
        s = EMPHASIS_RE.sub(r"<em>\1</em>", s)
        s = INLINE_CODE_RE.sub(r"<code>\1</code>", s)
        s = WIKILINK_RE.sub(r'<a class="wikilink" href="/posts/\1/">\2</a>' if r"\2" else r'<a class="wikilink" href="/posts/\1/">\1</a>', s)
        s = LINK_RE.sub(r'<a href="\2">\1</a>', s)
        return restore_math(s)

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # 1. Code Blocks
        if stripped.startswith("```"):
            language = stripped[3:].strip()
            block = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block.append(lines[i])
                i += 1
            if i < len(lines): i += 1
            
            content = "\n".join(block)
            if language == "mermaid":
                parts.append(f'<div class="mermaid">{html.escape(content)}</div>')
            else:
                parts.append(
                    f'<div class="code-shell" data-language="{html.escape(language)}">'
                    f'  <div class="code-shell-header"><span class="code-shell-label">{html.escape(language or "text")}</span>'
                    f'  <button class="code-shell-copy" aria-label="Copy"><i data-lucide="copy"></i></button></div>'
                    f'  <pre><code>{html.escape(content)}</code></pre></div>'
                )
            continue

        # 2. Block Math ($$)
        if stripped.startswith("$$"):
            block = [stripped]
            i += 1
            # If the block math is on a single line like $$formula$$, handle it
            if not stripped.endswith("$$") or len(stripped) == 2:
                while i < len(lines):
                    block.append(lines[i])
                    if lines[i].strip().endswith("$$"):
                        i += 1
                        break
                    i += 1
            else:
                i += 1
            parts.append(f'<div class="math-block">{chr(10).join(block)}</div>')
            continue

        # 2.5. Horizontal Rules
        if rule_re.match(stripped):
            parts.append('<hr class="prose-divider">')
            i += 1
            continue

        # 3. Headings
        if stripped.startswith("#"):
            match = re.match(r"^(#+)\s+(.+)$", stripped)
            if match:
                level = len(match.group(1))
                parts.append(f"<h{level}>{render_inline(match.group(2))}</h{level}>")
                i += 1
                continue

        # 3.5. Blockquotes
        if stripped.startswith(">"):
            quote_lines: list[str] = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(lines[i].strip()[1:].lstrip())
                i += 1

            quote_paragraphs: list[str] = []
            current_quote: list[str] = []
            for quote_line in quote_lines:
                if quote_line:
                    current_quote.append(quote_line)
                    continue
                if current_quote:
                    quote_paragraphs.append(" ".join(current_quote))
                    current_quote = []
            if current_quote:
                quote_paragraphs.append(" ".join(current_quote))

            inner = "".join(f"<p>{render_inline(paragraph)}</p>" for paragraph in quote_paragraphs if paragraph)
            parts.append(f"<blockquote>{inner}</blockquote>")
            continue

        # 3.6. Standalone Images
        image_match = image_re.match(stripped)
        if image_match:
            alt_text, src, title = image_match.groups()
            caption = (title or alt_text).strip()
            figcaption = f"<figcaption>{render_inline(caption)}</figcaption>" if caption else ""
            parts.append(
                f'<figure class="post-figure">'
                f'<img src="{html.escape(src, quote=True)}" alt="{html.escape(alt_text, quote=True)}" loading="lazy" decoding="async">'
                f"{figcaption}</figure>"
            )
            i += 1
            continue

        # 4. Tables
        if "|" in stripped and i + 1 < len(lines) and re.match(r"^[\s|:-]+$", lines[i+1].strip()):
            table_lines = []
            while i < len(lines) and "|" in lines[i]:
                table_lines.append(lines[i])
                i += 1
            
            if len(table_lines) >= 2:
                header_raw = table_lines[0].strip("|").split("|")
                # Skip separator at index 1
                body_raw = [row.strip("|").split("|") for row in table_lines[2:]]
                
                ths = "".join(f"<th>{render_inline(h.strip())}</th>" for h in header_raw)
                trs = "".join(
                    f'<tr>{"".join(f"<td>{render_inline(c.strip())}</td>" for c in row)}</tr>'
                    for row in body_raw
                )
                parts.append(
                    f'<div class="table-wrapper"><table><thead><tr>{ths}</tr></thead>'
                    f'<tbody>{trs}</tbody></table></div>'
                )
                continue

        # 5. Lists (Simple)
        if stripped.startswith(("- ", "* ", "+ ")):
            list_items = []
            while i < len(lines) and lines[i].strip().startswith(("- ", "* ", "+ ")):
                list_items.append(f"<li>{render_inline(lines[i].strip()[2:])}</li>")
                i += 1
            parts.append(f"<ul>{' '.join(list_items)}</ul>")
            continue

        # 5.5. Ordered Lists
        ordered_match = ordered_list_re.match(stripped)
        if ordered_match:
            list_items = []
            start = int(ordered_match.group(1))
            while i < len(lines):
                current_match = ordered_list_re.match(lines[i].strip())
                if not current_match:
                    break
                list_items.append(f"<li>{render_inline(current_match.group(2))}</li>")
                i += 1
            start_attr = f' start="{start}"' if start != 1 else ""
            parts.append(f"<ol{start_attr}>{' '.join(list_items)}</ol>")
            continue

        # 6. Paragraph (Default)
        parts.append(f"<p>{render_inline(stripped)}</p>")
        i += 1

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

def render_icon(name: str, class_name: str = "site-icon") -> str:
    classes = " ".join(part for part in [class_name] if part)
    return (
        f'<i class="{html.escape(classes, quote=True)}" '
        f'data-lucide="{html.escape(name, quote=True)}" aria-hidden="true"></i>'
    )

NAV_ICON_BY_KEY = {
    "nav.home": "home",
    "nav.about": "user-round",
    "nav.posts": "newspaper",
    "nav.daily": "calendar-days",
    "nav.contact": "mail",
    "nav.projects": "folder-kanban",
    "nav.documents": "file-text",
}

KIND_ICON_BY_KIND = {
    "post": "newspaper",
    "daily": "calendar-days",
    "project": "folder-kanban",
    "document": "file-text",
}

def _label_span(label: str, key: str | None = None) -> str:
    attr = f' data-i18n="{html.escape(key)}"' if key else ""
    return f'<span class="icon-label"{attr}>{html.escape(label)}</span>'

def _entry_kind(kind: str, label: str, i18n_key: str) -> str:
    icon = KIND_ICON_BY_KIND.get(kind, "circle")
    return (
        f'<span class="entry-kind">{render_icon(icon, "site-icon entry-icon")}'
        f'{_label_span(label, i18n_key)}</span>'
    )

def _entry_meta(icon: str, content: str, class_name: str = "entry-meta") -> str:
    return f'<span class="{html.escape(class_name)}">{render_icon(icon, "site-icon entry-icon")}{content}</span>'

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
        label_html = _label_span(label, key) if key else html.escape(label)
        if url:
            icon_html = render_icon(NAV_ICON_BY_KEY.get(key, "chevron-right"), "site-icon breadcrumb-icon") if key else ""
            crumbs.append(f'<li><a href="{html.escape(url)}">{icon_html}{label_html}</a></li>')
        else:
            crumbs.append(f'<li><span aria-current="page">{label_html}</span></li>')
    aria_label = translate(i18n, locale, "accessibility.breadcrumbs", "Breadcrumbs")
    return f'<nav class="breadcrumbs" aria-label="{html.escape(aria_label)}" data-i18n-aria-label="accessibility.breadcrumbs"><ol class="breadcrumb-list">{"".join(crumbs)}</ol></nav>'

def _entry_eyebrow(parts: list[str]) -> str:
    cleaned = [p for p in parts if p]
    if not cleaned:
        return ""
    separator = '<span class="entry-eyebrow-dot" aria-hidden="true">·</span>'
    return f'<p class="entry-eyebrow">{separator.join(cleaned)}</p>'

def _entry_cta(url: str, label: str, aria_key: str) -> str:
    return (
        f'<a class="entry-cta" href="{html.escape(url)}">'
        f'{_label_span(label, aria_key)}{render_icon("arrow-right", "site-icon entry-cta-arrow")}'
        f'</a>'
    )

def _build_entry_card_payload(item: dict[str, Any], fields: list[str], i18n: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for field in fields:
        value = item.get(field)
        if value is not None:
            payload[field] = value
        for lc in i18n.get("supported_locales", []):
            for suffix in locale_suffixes(lc, i18n):
                key = f"{field}_{suffix}"
                if item.get(key) and key not in payload:
                    payload[key] = item[key]
    return payload


def render_post_card(post: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    kind_label = translate(i18n, locale, "kinds.post", "post")
    date_html = render_localized_date(post["published_dt"], locale, "short")
    reading_html = render_reading_time(post["reading_time"], i18n, locale)
    eyebrow = _entry_eyebrow([
        _entry_kind("post", kind_label, "kinds.post"),
        _entry_meta("calendar-days", date_html),
        _entry_meta("clock-3", reading_html),
    ])
    cta_label = translate(i18n, locale, "actions.read_article", "Open")
    entry_payload = _build_entry_card_payload(post, ["title", "summary"], i18n)
    payload_json = json.dumps(entry_payload, ensure_ascii=False).replace("<", "\\u003c")
    return f"""
    <li class="entry" data-entry-card>
      <article class="entry-card entry-card-post">
        {eyebrow}
        <h3 class="entry-title"><a href="{html.escape(post['resolved_url'])}" data-entry-title>{html.escape(post['title'])}</a></h3>
        <p class="entry-lede" data-entry-lede>{html.escape(post['summary'])}</p>
        {_entry_cta(post['resolved_url'], cta_label, "actions.read_article")}
      </article>
      <script type="application/json" data-entry-card-data>{payload_json}</script>
    </li>
    """.strip()

def render_daily_card(entry: dict[str, Any], i18n: dict[str, Any], locale: str, *, compact: bool = False) -> str:
    kind_label = translate(i18n, locale, "kinds.daily", "daily")
    date_html = render_localized_date(entry["published_dt"], locale, "short")
    reading_html = render_reading_time(entry["reading_time"], i18n, locale)
    eyebrow = _entry_eyebrow([
        _entry_kind("daily", kind_label, "kinds.daily"),
        _entry_meta("calendar-days", date_html),
        _entry_meta("clock-3", reading_html),
    ])
    context_bits: list[str] = []
    if entry.get("mood"):
        context_bits.append(f'<span class="entry-context-item">{html.escape(entry["mood"])}</span>')
    if entry.get("now_playing") or entry.get("soundtrack"):
        track = entry.get("now_playing") or entry.get("soundtrack")
        context_bits.append(f'<span class="entry-context-item">{html.escape(track)}</span>')
    context_row = f'<p class="entry-context">{"".join(context_bits)}</p>' if context_bits else ""
    compact_class = " entry-card-compact" if compact else ""
    cta_label = translate(i18n, locale, "actions.read_article", "Open")
    entry_payload = _build_entry_card_payload(entry, ["title", "summary"], i18n)
    payload_json = json.dumps(entry_payload, ensure_ascii=False).replace("<", "\\u003c")
    return f"""
    <li class="entry" data-entry-card>
      <article class="entry-card entry-card-daily{compact_class}">
        {eyebrow}
        <h3 class="entry-title"><a href="{html.escape(entry['resolved_url'])}" data-entry-title>{html.escape(entry['title'])}</a></h3>
        <p class="entry-lede" data-entry-lede>{html.escape(entry['summary'])}</p>
        {context_row}
        {_entry_cta(entry['resolved_url'], cta_label, "actions.read_article")}
      </article>
      <script type="application/json" data-entry-card-data>{payload_json}</script>
    </li>
    """.strip()

def render_project_card(project: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    kind_label = translate(i18n, locale, "kinds.project", "project")
    status_key = project.get("status") or ""
    status_label = html.escape(translate(i18n, locale, f"status.{status_key}", status_key.replace("_", " "))) if status_key else ""
    eyebrow_parts = [_entry_kind("project", kind_label, "kinds.project")]
    if status_label:
        eyebrow_parts.append(
            f'<span class="entry-status entry-status-{html.escape(status_key)}" data-status-key="status.{html.escape(status_key)}">{status_label}</span>'
        )
    eyebrow = _entry_eyebrow(eyebrow_parts)
    lede = html.escape(project.get("headline") or project["summary"])
    stack_html = render_stack_list(project["stack"][:4]) if project.get("stack") else ""
    cta_label = translate(i18n, locale, "actions.view_project", "Ver projeto")
    secondary_links = []
    if project.get("resolved_code_url"):
        repo_label = html.escape(translate(i18n, locale, "actions.code", "repo"))
        secondary_links.append(
            f'<a class="entry-card-link" href="{html.escape(project["resolved_code_url"])}" target="_blank" rel="noopener">'
            f'{render_icon("code-2", "site-icon entry-icon")}'
            f'<span data-i18n="actions.code">{repo_label}</span>'
            f'{render_icon("arrow-up-right", "site-icon external-icon")}</a>'
        )
    if project.get("resolved_docs_url"):
        docs_label = html.escape(translate(i18n, locale, "actions.open_docs", "docs"))
        secondary_links.append(
            f'<a class="entry-card-link" href="{html.escape(project["resolved_docs_url"])}">'
            f'{render_icon("book-open", "site-icon entry-icon")}'
            f'<span data-i18n="actions.open_docs">{docs_label}</span></a>'
        )
    secondary_html = f'<div class="entry-card-links">{"".join(secondary_links)}</div>' if secondary_links else ""
    entry_payload = _build_entry_card_payload(project, ["name", "headline", "summary"], i18n)
    payload_json = json.dumps(entry_payload, ensure_ascii=False).replace("<", "\\u003c")
    return f"""
    <li class="entry" data-entry-card>
      <article class="entry-card entry-card-project">
        {eyebrow}
        <h3 class="entry-title"><a href="{html.escape(project['resolved_url'])}" data-entry-title>{html.escape(project['name'])}</a></h3>
        <p class="entry-lede" data-entry-lede>{lede}</p>
        {stack_html}
        {_entry_cta(project['resolved_url'], cta_label, "actions.view_project")}
        {secondary_html}
      </article>
      <script type="application/json" data-entry-card-data>{payload_json}</script>
    </li>
    """.strip()

def render_document_card(document: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    kind_label = translate(i18n, locale, "kinds.document", "document")
    category = str(document.get("category") or "").strip()
    version_raw = str(document.get("version") or "").strip()
    version_label = version_raw if version_raw.lower().startswith("v") else (f"v{version_raw}" if version_raw else "")
    eyebrow_parts = [_entry_kind("document", kind_label, "kinds.document")]
    if category:
        eyebrow_parts.append(_entry_meta("folder", html.escape(category)))
    if version_label:
        eyebrow_parts.append(_entry_meta("git-branch", html.escape(version_label), "entry-meta entry-version"))
    if document.get("agent_generated_tag"):
        agent_label = translate(i18n, locale, "common.agent_generated", "agent-generated")
        eyebrow_parts.append(
            f'<span class="entry-flag">{render_icon("bot", "site-icon entry-icon")}{_label_span(agent_label, "common.agent_generated")}</span>'
        )
    eyebrow = _entry_eyebrow(eyebrow_parts)
    cta_label = translate(i18n, locale, "actions.open_docs", "Open")
    entry_payload = _build_entry_card_payload(document, ["title", "summary"], i18n)
    payload_json = json.dumps(entry_payload, ensure_ascii=False).replace("<", "\\u003c")
    return f"""
    <li class="entry" data-entry-card>
      <article class="entry-card entry-card-document">
        {eyebrow}
        <h3 class="entry-title"><a href="{html.escape(document['resolved_url'])}" data-entry-title>{html.escape(document['title'])}</a></h3>
        <p class="entry-lede" data-entry-lede>{html.escape(document['summary'])}</p>
        {_entry_cta(document['resolved_url'], cta_label, "actions.open_docs")}
      </article>
      <script type="application/json" data-entry-card-data>{payload_json}</script>
    </li>
    """.strip()


def render_entry_card(item: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    kind = str(item.get("kind", "") or "").strip().lower()
    if kind in {"post", "article"}:
        return render_post_card(item, i18n, locale)
    if kind == "daily":
        return render_daily_card(item, i18n, locale)
    if kind == "project":
        return render_project_card(item, i18n, locale)
    return render_document_card(item, i18n, locale)

def render_publication_card(item: dict[str, Any], i18n: dict[str, Any], locale: str) -> str:
    if item.get("kind") == "article": return render_post_card(item, i18n, locale)
    return render_document_card(item, i18n, locale)

def render_publications_grouped_section(system: dict[str, Any], publications: list[dict[str, Any]], i18n: dict[str, Any], locale: str, *, limit: int | None = None, show_header: bool = True) -> str:
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
          <ol class="entry-list">{cards}</ol>
        </section>
        """)

    empty_msg = translate(i18n, locale, "empty.publications", "No publications found.")
    content = "\n".join(blocks) if blocks else f'<p class="empty-state" data-i18n="empty.publications">{html.escape(empty_msg)}</p>'
    header_html = ""
    if show_header:
        header_html = f"""
      <header class="section-header">
        <p class="section-kicker" data-i18n="nav.posts">{html.escape(translate(i18n, locale, "nav.posts", "publications"))}</p>
        <h2 id="pubs-title" data-i18n="sections.publications_title">{html.escape(translate(i18n, locale, "sections.publications_title", "Technical Knowledge OS"))}</h2>
        <p class="section-copy" data-i18n="sections.publications_copy">{html.escape(translate(i18n, locale, "sections.publications_copy", "Unified stream of architecture documents, technical articles and research notes."))}</p>
      </header>"""
    return f"""
    <section class="section-panel" aria-labelledby="pubs-title">
      {header_html}
      <div class="publications-grid">{content}</div>
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
    if site.get("github_url"): links.append(f'<a class="profile-social-link" href="{html.escape(site["github_url"])}" target="_blank" rel="noopener noreferrer"><i data-lucide="git-branch"></i><span>GitHub</span><i data-lucide="arrow-up-right" class="link-arrow"></i></a>')
    if site.get("linkedin_url"): links.append(f'<a class="profile-social-link" href="{html.escape(site["linkedin_url"])}" target="_blank" rel="noopener noreferrer"><i data-lucide="network"></i><span>LinkedIn</span><i data-lucide="arrow-up-right" class="link-arrow"></i></a>')
    
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

def render_navigation_section(site: dict[str, str], system: dict[str, Any], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    categories = sorted({d["category"] for d in documents if d.get("category")})
    nav_items = [("nav.about", "/about/"), ("nav.posts", "/posts/"), ("nav.daily", "/daily/"), ("nav.projects", "/projects/"), ("nav.documents", "/documents/")]
    nav_items += [(f"sections.category_{c}", f"/documents/#category-{slugify(c)}") for c in categories]
    
    links = "\n".join(
        f'<a class="nav-link" href="{html.escape(site_href(site, url) if str(url).startswith("/") else str(url))}">'
        f'{render_icon(NAV_ICON_BY_KEY.get(key, "folder"), "site-icon nav-link-icon")}'
        f'{_label_span(translate(i18n, locale, key, key.split(".")[-1].replace("category_", "").replace("_", " ")), key)}</a>'
        for key, url in nav_items
    )
    
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
        links.append(f'<a href="{page_url(current_page - 1)}" class="pagination-link pagination-prev">{render_icon("chevron-left", "site-icon pagination-icon")}{_label_span(translate(i18n, locale, "pagination.prev", "previous"), "pagination.prev")}</a>')
    else:
        links.append(f'<span class="pagination-link pagination-disabled">{render_icon("chevron-left", "site-icon pagination-icon")}{_label_span(translate(i18n, locale, "pagination.prev", "previous"), "pagination.prev")}</span>')
    for p in range(1, total_pages + 1):
        active_class = " pagination-active" if p == current_page else ""
        links.append(f'<a href="{page_url(p)}" class="pagination-link{active_class}">{p}</a>')
    if current_page < total_pages:
        links.append(f'<a href="{page_url(current_page + 1)}" class="pagination-link pagination-next">{_label_span(translate(i18n, locale, "pagination.next", "next"), "pagination.next")}{render_icon("chevron-right", "site-icon pagination-icon")}</a>')
    else:
        links.append(f'<span class="pagination-link pagination-disabled">{_label_span(translate(i18n, locale, "pagination.next", "next"), "pagination.next")}{render_icon("chevron-right", "site-icon pagination-icon")}</span>')
    pagination_label = translate(i18n, locale, "accessibility.pagination", "Pagination")
    return f'<nav class="pagination-container" aria-label="{html.escape(pagination_label)}" data-i18n-aria-label="accessibility.pagination"><div class="pagination-inner">{"".join(links)}</div></nav>'

def render_impact_bar(items: list[str], i18n: dict[str, Any] | None = None, locale: str = "pt-BR") -> str:
    if not items: return ""
    metrics = "".join(f'<li class="impact-metric"><i data-lucide="trending-up"></i><span>{html.escape(it)}</span></li>' for it in items)
    heading = translate(i18n or {}, locale, "pages.project.impact", "Impacto & Resultados")
    return f'<aside class="evidence-impact"><h3 class="evidence-title" data-i18n="pages.project.impact">{html.escape(heading)}</h3><ul class="impact-list">{metrics}</ul></aside>'

def render_trade_offs_section(items: list[str], i18n: dict[str, Any] | None = None, locale: str = "pt-BR") -> str:
    if not items: return ""
    rows = "".join(f'<li class="tradeoff-item"><i data-lucide="scale"></i><span>{html.escape(it)}</span></li>' for it in items)
    heading = translate(i18n or {}, locale, "pages.project.trade_offs", "Trade-offs & Decisões")
    return f'<section class="evidence-section"><h2 class="evidence-title" data-i18n="pages.project.trade_offs">{html.escape(heading)}</h2><ul class="tradeoff-list">{rows}</ul></section>'

def render_lessons_section(items: list[str], i18n: dict[str, Any] | None = None, locale: str = "pt-BR") -> str:
    if not items: return ""
    rows = "".join(f'<li class="lesson-item"><i data-lucide="lightbulb"></i><span>{html.escape(it)}</span></li>' for it in items)
    heading = translate(i18n or {}, locale, "pages.project.lessons", "Lições Aprendidas")
    return f'<section class="evidence-section"><h2 class="evidence-title" data-i18n="pages.project.lessons">{html.escape(heading)}</h2><ul class="lesson-list">{rows}</ul></section>'

def render_evidence_highlights(posts: list[dict[str, Any]], projects: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    cards = []
    all_items = [(p, "post") for p in posts] + [(p, "project") for p in projects]
    for item, kind in all_items:
        impact = item.get("impact", [])
        if not impact: continue
        name = item.get("title") or item.get("name", "")
        url = item.get("resolved_url") or item.get("url", "#")
        kind_label = translate(i18n, locale, f"kinds.{kind}", kind)
        metrics_html = "".join(f'<span class="highlight-metric">{html.escape(m)}</span>' for m in impact[:2])
        cards.append(f'<article class="evidence-card"><div class="evidence-card-head"><span class="card-type" data-i18n="kinds.{html.escape(kind)}">{html.escape(kind_label)}</span><h3><a href="{html.escape(url)}">{html.escape(name)}</a></h3></div><div class="evidence-card-metrics">{metrics_html}</div></article>')
    if not cards: return ""
    kicker = translate(i18n, locale, "sections.evidence_kicker", "evidência")
    title = translate(i18n, locale, "sections.evidence_title", "Resultados em produção")
    copy = translate(i18n, locale, "sections.evidence_copy", "Métricas, decisões arquiteturais e resultados concretos documentados nos projetos e publicações.")
    return f"""
    <section class="section-panel evidence-highlights" aria-labelledby="evidence-title">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="sections.evidence_kicker">{html.escape(kicker)}</p>
          <h2 id="evidence-title" data-i18n="sections.evidence_title">{html.escape(title)}</h2>
        </div>
        <p data-i18n="sections.evidence_copy">{html.escape(copy)}</p>
      </header>
      <div class="evidence-grid">{"".join(cards[:6])}</div>
    </section>
    """

def render_related_posts(posts: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    if not posts:
        return ""
    title = translate(i18n, locale, "sections.related_posts", "Posts relacionados")
    cards = "\n".join(render_post_card(p, i18n, locale) for p in posts)
    return f"""
    <section class="section-panel related-posts-panel">
      <header class="section-header">
        <h2 data-i18n="sections.related_posts">{html.escape(title)}</h2>
      </header>
      <ol class="entry-list">{cards}</ol>
    </section>
    """

def render_related_content(items: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> str:
    if not items:
        return ""
    title = translate(i18n, locale, "sections.related_content", "Continue explorando")
    copy = translate(
        i18n,
        locale,
        "sections.related_content_copy",
        "Conteudos conectados por tags, projeto ou documentacao.",
    )
    cards = "\n".join(render_entry_card(item, i18n, locale) for item in items)
    return f"""
    <section class="section-panel related-content-panel">
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="sections.navigation_kicker">{html.escape(translate(i18n, locale, "sections.navigation_kicker", "navegacao"))}</p>
          <h2 data-i18n="sections.related_content">{html.escape(title)}</h2>
        </div>
        <p class="section-copy" data-i18n="sections.related_content_copy">{html.escape(copy)}</p>
      </header>
      <ol class="entry-list">{cards}</ol>
    </section>
    """


def render_documents_section(
    system: dict[str, Any],
    documents: list[dict[str, Any]],
    i18n: dict[str, Any],
    locale: str,
    *,
    limit: int | None = None,
    grouped: bool = False,
    show_header: bool = True,
) -> str:
    items = documents[:limit] if limit is not None else documents
    if grouped:
        from collections import defaultdict
        groups = defaultdict(list)
        for d in items:
            groups[d["category"]].append(d)
        layout_docs = system.get("layout", {}).get("documents", {})
        categories = normalize_string_list(layout_docs.get("navigation", []))
        blocks = []
        for category in categories or sorted(groups):
            docs_in_category = groups.get(category, [])
            if not docs_in_category: continue
            cards = "\n".join(render_document_card(d, i18n, locale) for d in docs_in_category)
            blocks.append(
                f'<section class="document-group" id="category-{html.escape(slugify(category), quote=True)}">'
                f'<header class="document-group-head"><h3>{html.escape(category)}</h3></header>'
                f'<ol class="entry-list">{cards}</ol></section>'
            )
        empty_msg = translate(i18n, locale, "empty.documents", "No documents indexed yet.")
        content = "\n".join(blocks) if blocks else f'<p class="empty-state" data-i18n="empty.documents">{html.escape(empty_msg)}</p>'
    else:
        cards = "\n".join(render_document_card(d, i18n, locale) for d in items)
        empty_state = f'<li><p class="empty-state" data-i18n="empty.documents">{html.escape(translate(i18n, locale, "empty.documents", "No documents indexed yet."))}</p></li>'
        content = f'<ol class="entry-list">{cards or empty_state}</ol>'
    header_html = ""
    labelledby_attr = ""
    if show_header:
        labelledby_attr = ' aria-labelledby="documents-title"'
        header_html = f"""
      <header class="section-header">
        <div>
          <p class="section-kicker" data-i18n="nav.documents">{html.escape(translate(i18n, locale, "nav.documents", "documents"))}</p>
          <h2 id="documents-title" data-i18n="sections.documents_title">{html.escape(translate(i18n, locale, "sections.documents_title", "Documentation system"))}</h2>
        </div>
        <p class="section-copy" data-i18n="sections.documents_copy">{html.escape(translate(i18n, locale, "sections.documents_copy", "Markdown-backed notes organized by domain, architecture, agents and APIs, with version markers and agent-generated tags."))}</p>
      </header>
        """
    return f"""
    <section class="section-panel documents-panel{' documents-panel-condensed' if not show_header else ''}"{labelledby_attr}>
      {header_html}
      <div class="documents-panel-body">{content}</div>
    </section>
    """
