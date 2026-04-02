from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
import tomllib
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "blog.toml"

DEFAULT_BUILD_CONFIG = {
    "site_file": "content/site.toml",
    "posts_dir": "content/posts",
    "publications_dir": "publications",
    "home_file": "index.html",
    "archive_file": "publications/index.html",
    "posts_on_home": 6,
}

DEFAULT_MATH_CONFIG = {
    "enabled": True,
    "script_url": "https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js",
    "inline_delimiter": "%%",
    "block_delimiter": "%%%",
}

DEFAULT_SITE = {
    "title": "Meu Blog",
    "headline": "Vida prática, software e tecnologia.",
    "description": "Blog estático gerado localmente.",
    "language": "pt-BR",
    "author": "Autor",
    "base_url": "",
    "github_url": "",
    "linkedin_url": "",
    "home_title": "Publicações recentes",
    "home_intro": "",
    "about": "",
    "footer_note": "",
}

SITE_FIELD_ORDER = [
    "title",
    "headline",
    "description",
    "language",
    "author",
    "base_url",
    "github_url",
    "linkedin_url",
    "home_title",
    "home_intro",
    "about",
    "footer_note",
]

POST_FIELD_ORDER = [
    "id",
    "slug",
    "title",
    "summary",
    "published_at",
    "updated_at",
    "status",
    "tags",
    "has_asciimath",
    "body",
]

MANAGED_GIT_PATHS = [
    ".gitignore",
    "README.md",
    "assets",
    "blog.toml",
    "content",
    "editor",
    "index.html",
    "plans",
    "publications",
    "scripts",
]

UNORDERED_LIST_RE = re.compile(r"^[-*]\s+(?P<content>.+)$")
ORDERED_LIST_RE = re.compile(r"^\d+\.\s+(?P<content>.+)$")
HEADING_RE = re.compile(r"^(#{1,6})\s+(?P<content>.+)$")
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
STRONG_RE = re.compile(r"\*\*(.+?)\*\*")
EMPHASIS_RE = re.compile(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)")

MONTHS_PT = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
]

MONTHS_SHORT_PT = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
]


def now_local() -> datetime:
    return datetime.now().astimezone()


def load_toml(path: Path) -> dict[str, Any]:
    with path.open("rb") as handle:
        return tomllib.load(handle)


def load_blog_config() -> dict[str, dict[str, Any]]:
    raw = load_toml(CONFIG_PATH)
    build = DEFAULT_BUILD_CONFIG | raw.get("build", {})
    math = DEFAULT_MATH_CONFIG | raw.get("math", {})
    return {"build": build, "math": math}


def normalise_site(raw: dict[str, Any]) -> dict[str, str]:
    site = DEFAULT_SITE | raw
    return {key: str(site.get(key, "") or "") for key in SITE_FIELD_ORDER}


def load_site() -> dict[str, str]:
    config = load_blog_config()
    site_path = ROOT / config["build"]["site_file"]
    return normalise_site(load_toml(site_path))


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def parse_datetime(value: str | None) -> datetime:
    if not value:
        return now_local()

    cleaned = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        return now_local()

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=now_local().tzinfo)
    return parsed


def format_long_date(value: datetime) -> str:
    return f"{value.day} de {MONTHS_PT[value.month - 1]} de {value.year}"


def format_short_date(value: datetime) -> str:
    return f"{value.day:02d} {MONTHS_SHORT_PT[value.month - 1]} {value.year}"


def make_post_id(dt: datetime | None = None) -> str:
    stamp = dt or now_local()
    return stamp.strftime("%Y%m%d-%H%M%S")


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only.lower()).strip("-")
    return slug or "post"


def summarize_body(body: str, limit: int = 180) -> str:
    plain = re.sub(r"[#>`*_~-]", "", body)
    plain = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", plain)
    plain = " ".join(segment.strip() for segment in plain.splitlines() if segment.strip())
    if len(plain) <= limit:
        return plain
    return plain[: limit - 1].rstrip() + "…"


def normalize_tags(raw_tags: Any) -> list[str]:
    if isinstance(raw_tags, list):
        return [str(tag).strip() for tag in raw_tags if str(tag).strip()]
    if isinstance(raw_tags, str):
        return [tag.strip() for tag in raw_tags.split(",") if tag.strip()]
    return []


def find_post_file(post_id: str) -> Path | None:
    posts_dir = ROOT / load_blog_config()["build"]["posts_dir"]
    matches = sorted(posts_dir.glob(f"{post_id}-*.toml"))
    return matches[0] if matches else None


def normalise_post(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    published_dt = parse_datetime(str(raw.get("published_at", "") or ""))
    updated_dt = parse_datetime(str(raw.get("updated_at", "") or ""))
    post_id = str(raw.get("id", "") or "").strip() or make_post_id(published_dt)
    title = str(raw.get("title", "") or "").strip() or "Sem título"
    slug = slugify(str(raw.get("slug", "") or "").strip() or title)
    body = str(raw.get("body", "") or "")
    summary = str(raw.get("summary", "") or "").strip() or summarize_body(body)
    status = str(raw.get("status", "") or "draft").strip().lower()
    tags = normalize_tags(raw.get("tags", []))
    has_asciimath = bool(raw.get("has_asciimath", False))
    output_dir_name = f"{post_id}-{slug}"
    config = load_blog_config()
    publications_dir = config["build"]["publications_dir"]

    return {
        "id": post_id,
        "slug": slug,
        "title": title,
        "summary": summary,
        "published_at": published_dt.isoformat(timespec="seconds"),
        "updated_at": updated_dt.isoformat(timespec="seconds"),
        "status": status,
        "tags": tags,
        "has_asciimath": has_asciimath
        or config["math"]["inline_delimiter"] in body
        or config["math"]["block_delimiter"] in body,
        "body": body.rstrip() + "\n" if body.strip() else "",
        "published_dt": published_dt,
        "updated_dt": updated_dt,
        "source_path": source_path,
        "output_dir_name": output_dir_name,
        "url": f"/{publications_dir}/{output_dir_name}/",
    }


def post_to_api(post: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in post.items()
        if key
        not in {
            "published_dt",
            "updated_dt",
            "source_path",
            "output_dir_name",
        }
    }


def load_posts(include_drafts: bool = True) -> list[dict[str, Any]]:
    posts_dir = ROOT / load_blog_config()["build"]["posts_dir"]
    posts_dir.mkdir(parents=True, exist_ok=True)

    posts: list[dict[str, Any]] = []
    for path in sorted(posts_dir.glob("*.toml")):
        post = normalise_post(load_toml(path), source_path=path)
        if include_drafts or post["status"] == "published":
            posts.append(post)

    posts.sort(key=lambda item: (item["published_dt"], item["id"]), reverse=True)
    return posts


def toml_quote(value: str) -> str:
    if "\n" in value:
        escaped = value.replace("\\", "\\\\").replace('"""', '\\"""')
        return f'"""\n{escaped.rstrip()}\n"""'
    return json.dumps(value, ensure_ascii=False)


def toml_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, list):
        items = ", ".join(json.dumps(str(item), ensure_ascii=False) for item in value)
        return f"[{items}]"
    return toml_quote(str(value))


def render_toml_document(data: dict[str, Any], field_order: list[str]) -> str:
    lines: list[str] = []
    for key in field_order:
        if key not in data:
            continue
        lines.append(f"{key} = {toml_value(data[key])}")
        if key == "has_asciimath":
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def save_site(site_data: dict[str, Any]) -> dict[str, str]:
    site = normalise_site(site_data)
    site_path = ROOT / load_blog_config()["build"]["site_file"]
    write_text(site_path, render_toml_document(site, SITE_FIELD_ORDER))
    return site


def save_post(post_data: dict[str, Any]) -> dict[str, Any]:
    incoming = dict(post_data)
    now_iso = now_local().isoformat(timespec="seconds")
    if not str(incoming.get("published_at", "") or "").strip():
        incoming["published_at"] = now_iso
    incoming["updated_at"] = now_iso

    post = normalise_post(incoming)
    posts_dir = ROOT / load_blog_config()["build"]["posts_dir"]
    posts_dir.mkdir(parents=True, exist_ok=True)

    destination = posts_dir / f"{post['id']}-{post['slug']}.toml"
    existing = find_post_file(post["id"])
    write_text(
        destination,
        render_toml_document(
            {
                key: post[key]
                for key in POST_FIELD_ORDER
            },
            POST_FIELD_ORDER,
        ),
    )

    if existing and existing != destination and existing.exists():
        existing.unlink()

    return normalise_post(load_toml(destination), source_path=destination)


def is_special_block_start(stripped: str) -> bool:
    return bool(
        stripped == "---"
        or stripped.startswith("```")
        or stripped.startswith(">")
        or HEADING_RE.match(stripped)
        or UNORDERED_LIST_RE.match(stripped)
        or ORDERED_LIST_RE.match(stripped)
    )


def render_inline(text: str) -> str:
    placeholders: dict[str, str] = {}

    def stash_code(match: re.Match[str]) -> str:
        token = f"__CODE_{len(placeholders)}__"
        placeholders[token] = f"<code>{html.escape(match.group(1))}</code>"
        return token

    text_with_tokens = INLINE_CODE_RE.sub(stash_code, text)
    escaped = html.escape(text_with_tokens)
    escaped = LINK_RE.sub(
        lambda match: (
            f'<a href="{html.escape(html.unescape(match.group(2)), quote=True)}">'
            f"{match.group(1)}</a>"
        ),
        escaped,
    )
    escaped = STRONG_RE.sub(r"<strong>\1</strong>", escaped)
    escaped = EMPHASIS_RE.sub(r"<em>\1</em>", escaped)

    for token, replacement in placeholders.items():
        escaped = escaped.replace(token, replacement)

    return escaped


def collect_list(lines: list[str], start_index: int, ordered: bool) -> tuple[str, int]:
    pattern = ORDERED_LIST_RE if ordered else UNORDERED_LIST_RE
    items: list[str] = []
    index = start_index

    while index < len(lines):
        stripped = lines[index].strip()
        match = pattern.match(stripped)
        if not match:
            break

        item_lines = [match.group("content")]
        index += 1

        while index < len(lines):
            next_line = lines[index]
            next_stripped = next_line.strip()
            if not next_stripped:
                break
            if is_special_block_start(next_stripped):
                break
            if next_line.startswith(("  ", "\t")):
                item_lines.append(next_stripped)
                index += 1
                continue
            break

        items.append(" ".join(item_lines))
        if index < len(lines) and not lines[index].strip():
            index += 1
            break

    tag = "ol" if ordered else "ul"
    content = "".join(f"<li>{render_inline(item)}</li>" for item in items)
    return f"<{tag}>{content}</{tag}>", index


def render_markdown(text: str) -> str:
    lines = text.replace("\r\n", "\n").split("\n")
    parts: list[str] = []
    index = 0

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()

        if not stripped:
            index += 1
            continue

        if stripped.startswith("```"):
            language = stripped[3:].strip()
            code_lines: list[str] = []
            index += 1

            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(lines[index])
                index += 1

            if index < len(lines):
                index += 1

            class_attr = f' class="language-{html.escape(language)}"' if language else ""
            code_block = html.escape("\n".join(code_lines))
            parts.append(f"<pre><code{class_attr}>{code_block}</code></pre>")
            continue

        heading = HEADING_RE.match(stripped)
        if heading:
            level = len(heading.group(1))
            content = render_inline(heading.group("content"))
            parts.append(f"<h{level}>{content}</h{level}>")
            index += 1
            continue

        if stripped == "---":
            parts.append("<hr>")
            index += 1
            continue

        if stripped.startswith(">"):
            quote_lines: list[str] = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                quote_lines.append(lines[index].strip()[1:].lstrip())
                index += 1
            inner = render_markdown("\n".join(quote_lines))
            parts.append(f"<blockquote>{inner}</blockquote>")
            continue

        if UNORDERED_LIST_RE.match(stripped):
            rendered_list, index = collect_list(lines, index, ordered=False)
            parts.append(rendered_list)
            continue

        if ORDERED_LIST_RE.match(stripped):
            rendered_list, index = collect_list(lines, index, ordered=True)
            parts.append(rendered_list)
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            next_stripped = lines[index].strip()
            if not next_stripped or is_special_block_start(next_stripped):
                break
            paragraph_lines.append(next_stripped)
            index += 1

        parts.append(f"<p>{render_inline(' '.join(paragraph_lines))}</p>")

    return "\n".join(parts)


def render_tag_list(tags: list[str]) -> str:
    if not tags:
        return ""
    items = "".join(f"<li>{html.escape(tag)}</li>" for tag in tags)
    return f'<ul class="tag-list">{items}</ul>'


def render_post_card(post: dict[str, Any]) -> str:
    return f"""
    <li class="post-list-item">
      <article class="post-card">
        <header class="post-card-header">
          <p class="post-card-meta">
            <time datetime="{html.escape(post['published_at'])}">{format_short_date(post['published_dt'])}</time>
          </p>
          <h3><a href="{html.escape(post['resolved_url'])}">{html.escape(post['title'])}</a></h3>
        </header>
        <p>{html.escape(post['summary'])}</p>
        {render_tag_list(post['tags'])}
      </article>
    </li>
    """.strip()


def render_site_nav(site: dict[str, str]) -> str:
    docs_path = ROOT / "docs" / "architecture" / "index.html"
    docs_link = (
        f'<li><a href="{site_href(site, "/docs/architecture/index.html")}">Documentação</a></li>'
        if docs_path.exists()
        else ""
    )
    github_link = (
        f'<li><a href="{html.escape(site["github_url"], quote=True)}" rel="noopener noreferrer" target="_blank">GitHub</a></li>'
        if site["github_url"]
        else ""
    )
    linkedin_link = (
        f'<li><a href="{html.escape(site["linkedin_url"], quote=True)}" rel="noopener noreferrer" target="_blank">LinkedIn</a></li>'
        if site["linkedin_url"]
        else ""
    )
    return f"""
    <nav class="site-nav" aria-label="Principal">
      <a class="site-mark" href="{site_href(site, "/")}">{html.escape(site['title'])}</a>
      <ul>
        <li><a href="{site_href(site, "/")}">Início</a></li>
        <li><a href="{site_href(site, "/publications/")}">Publicações</a></li>
        {docs_link}
        {github_link}
        {linkedin_link}
      </ul>
    </nav>
    """


def render_footer(site: dict[str, str]) -> str:
    note = html.escape(site["footer_note"]) if site["footer_note"] else "Publicado localmente e versionado por Git."
    return f"""
    <footer class="site-footer">
      <p>{note}</p>
    </footer>
    """


def canonical_url(site: dict[str, str], path: str) -> str:
    base_url = site["base_url"].rstrip("/")
    if not base_url:
        return path
    return f"{base_url}/{path.lstrip('/')}"


def site_path_prefix(site: dict[str, str]) -> str:
    base_url = site.get("base_url", "").strip()
    if not base_url:
        return ""
    parsed = urlsplit(base_url)
    path = parsed.path.rstrip("/")
    return path if path != "/" else ""


def site_href(site: dict[str, str], path: str) -> str:
    prefix = site_path_prefix(site)
    clean_path = path if path.startswith("/") else f"/{path}"
    if not prefix:
        return clean_path
    return f"{prefix}{clean_path}"


def render_layout(
    *,
    page_title: str,
    page_description: str,
    site: dict[str, str],
    body_class: str,
    canonical_path: str,
    has_math: bool,
    content: str,
) -> str:
    config = load_blog_config()
    math = config["math"]
    math_meta = ""
    if has_math and math["enabled"]:
        math_meta = f"""
    <meta name="x-asciimath-inline" content="{html.escape(math['inline_delimiter'], quote=True)}">
    <meta name="x-asciimath-block" content="{html.escape(math['block_delimiter'], quote=True)}">
    <meta name="x-asciimath-script" content="{html.escape(math['script_url'], quote=True)}">
    """

    return f"""<!DOCTYPE html>
<html lang="{html.escape(site['language'], quote=True)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{html.escape(page_title)}</title>
    <meta name="description" content="{html.escape(page_description, quote=True)}">
    <link rel="canonical" href="{html.escape(canonical_url(site, canonical_path), quote=True)}">
    <link rel="stylesheet" href="{site_href(site, "/assets/styles.css")}">
    {math_meta}
  </head>
  <body class="{html.escape(body_class, quote=True)}" data-has-math="{str(has_math).lower()}">
    <div class="site-shell">
      <header class="site-header">
        {render_site_nav(site)}
        <div class="hero">
          <p class="eyebrow">{html.escape(site['headline'])}</p>
        </div>
      </header>
      <main class="site-main">
        {content}
      </main>
      {render_footer(site)}
    </div>
    <script src="{site_href(site, "/assets/blog.js")}" defer></script>
  </body>
</html>
"""


def render_home_page(site: dict[str, str], posts: list[dict[str, Any]]) -> str:
    featured_posts = posts[: int(load_blog_config()["build"]["posts_on_home"])]
    post_cards = "\n".join(render_post_card(post) for post in featured_posts)
    if not post_cards:
        post_cards = '<li class="post-list-item"><p class="empty-state">Nenhuma publicação publicada ainda.</p></li>'

    content = f"""
    <section class="home-hero">
      <div>
        <p class="section-kicker">Blog</p>
        <h1>{html.escape(site['home_title'])}</h1>
      </div>
      <div class="home-copy prose">
        {render_markdown(site['home_intro'])}
      </div>
    </section>

    <section class="home-grid">
      <section class="content-panel" aria-labelledby="recent-posts-title">
        <header class="section-header">
          <p class="section-kicker">Publicações</p>
          <h2 id="recent-posts-title">Últimos textos</h2>
        </header>
        <ol class="post-list">
          {post_cards}
        </ol>
        <p class="section-link"><a href="{site_href(site, "/publications/")}">Ver arquivo completo</a></p>
      </section>

      <aside class="content-panel content-panel-aside" aria-labelledby="about-title">
        <header class="section-header">
          <p class="section-kicker">Autor</p>
          <h2 id="about-title">Por que este blog existe</h2>
        </header>
        <div class="prose">
          {render_markdown(site['about'])}
        </div>
      </aside>
    </section>
    """

    return render_layout(
        page_title=f"{site['title']} | Blog",
        page_description=site["description"],
        site=site,
        body_class="page-home",
        canonical_path="/",
        has_math=False,
        content=content,
    )


def render_archive_page(site: dict[str, str], posts: list[dict[str, Any]]) -> str:
    items = "\n".join(render_post_card(post) for post in posts)
    if not items:
        items = '<li class="post-list-item"><p class="empty-state">Nenhuma publicação encontrada.</p></li>'

    content = f"""
    <section class="page-heading">
      <p class="section-kicker">Arquivo</p>
      <h1>Todas as publicações</h1>
      <p>Os posts publicados são gerados a partir de arquivos TOML versionados no repositório.</p>
    </section>

    <section class="content-panel" aria-labelledby="archive-title">
      <header class="section-header">
        <h2 id="archive-title">Arquivo completo</h2>
      </header>
      <ol class="post-list">
        {items}
      </ol>
    </section>
    """

    return render_layout(
        page_title=f"Publicações | {site['title']}",
        page_description="Arquivo completo das publicações do blog.",
        site=site,
        body_class="page-archive",
        canonical_path="/publications/",
        has_math=False,
        content=content,
    )


def render_post_navigation(previous_post: dict[str, Any] | None, next_post: dict[str, Any] | None) -> str:
    previous_link = (
        f'<a class="pager-link" href="{html.escape(previous_post["resolved_url"])}">← {html.escape(previous_post["title"])}</a>'
        if previous_post
        else '<span class="pager-link pager-link-disabled">Sem texto mais novo</span>'
    )
    next_link = (
        f'<a class="pager-link" href="{html.escape(next_post["resolved_url"])}">{html.escape(next_post["title"])} →</a>'
        if next_post
        else '<span class="pager-link pager-link-disabled">Sem texto anterior</span>'
    )
    return f"""
    <nav class="post-pager" aria-label="Navegação entre posts">
      {previous_link}
      {next_link}
    </nav>
    """


def render_post_page(
    site: dict[str, str],
    post: dict[str, Any],
    previous_post: dict[str, Any] | None,
    next_post: dict[str, Any] | None,
) -> str:
    content = f"""
    <article class="post-shell">
      <header class="post-header">
        <p class="section-kicker">Publicação</p>
        <h1>{html.escape(post['title'])}</h1>
        <p class="post-summary">{html.escape(post['summary'])}</p>
        <div class="post-meta">
          <time datetime="{html.escape(post['published_at'])}">{format_long_date(post['published_dt'])}</time>
          <span>Atualizado em {format_short_date(post['updated_dt'])}</span>
        </div>
        {render_tag_list(post['tags'])}
        <div class="post-actions">
          <a class="subtle-button" href="{site_href(site, "/publications/")}">Voltar ao arquivo</a>
          <button class="subtle-button" type="button" data-copy-link>Copiar link</button>
        </div>
      </header>

      <div class="post-body prose">
        {render_markdown(post['body'])}
      </div>
    </article>
    {render_post_navigation(previous_post, next_post)}
    """

    return render_layout(
        page_title=f"{post['title']} | {site['title']}",
        page_description=post["summary"],
        site=site,
        body_class="page-post",
        canonical_path=post["url"],
        has_math=post["has_asciimath"],
        content=content,
    )


def render_post_preview(post: dict[str, Any]) -> str:
    return f"""
    <article class="post-shell preview-shell">
      <header class="post-header">
        <p class="section-kicker">Preview</p>
        <h1>{html.escape(post['title'])}</h1>
        <p class="post-summary">{html.escape(post['summary'])}</p>
      </header>
      <div class="post-body prose">
        {render_markdown(post['body'])}
      </div>
    </article>
    """.strip()


def build_site() -> dict[str, Any]:
    config = load_blog_config()
    site = load_site()
    posts = load_posts(include_drafts=False)
    for post in posts:
        post["resolved_url"] = site_href(site, post["url"])

    publications_dir = ROOT / config["build"]["publications_dir"]
    home_path = ROOT / config["build"]["home_file"]
    archive_path = ROOT / config["build"]["archive_file"]

    publications_dir.mkdir(parents=True, exist_ok=True)
    for child in publications_dir.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()

    generated_paths: list[str] = []

    home_html = render_home_page(site, posts)
    write_text(home_path, home_html)
    generated_paths.append(str(home_path.relative_to(ROOT)))

    archive_html = render_archive_page(site, posts)
    write_text(archive_path, archive_html)
    generated_paths.append(str(archive_path.relative_to(ROOT)))

    for index, post in enumerate(posts):
        previous_post = posts[index - 1] if index > 0 else None
        next_post = posts[index + 1] if index + 1 < len(posts) else None
        destination = publications_dir / post["output_dir_name"] / "index.html"
        html_content = render_post_page(site, post, previous_post, next_post)
        write_text(destination, html_content)
        generated_paths.append(str(destination.relative_to(ROOT)))

    return {
        "generated_files": generated_paths,
        "published_posts": len(posts),
        "updated_at": now_local().isoformat(timespec="seconds"),
    }


def run_git(args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        args,
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if check and completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip() or "Falha ao executar comando Git."
        raise RuntimeError(message)
    return completed


def parse_status_lines(output: str) -> list[str]:
    return [line for line in output.splitlines() if line.strip()]


def git_status() -> dict[str, Any]:
    scoped = run_git(["git", "status", "--short", "--", *MANAGED_GIT_PATHS], check=False)
    full = run_git(["git", "status", "--short"], check=False)
    return {
        "scoped": parse_status_lines(scoped.stdout),
        "full": parse_status_lines(full.stdout),
    }


def publish_changes(message: str, push: bool = False) -> dict[str, Any]:
    build_result = build_site()
    run_git(["git", "add", "--", *MANAGED_GIT_PATHS], check=True)
    staged = run_git(["git", "diff", "--cached", "--name-only", "--", *MANAGED_GIT_PATHS], check=False)
    staged_files = parse_status_lines(staged.stdout)

    if not staged_files:
        return {
            "committed": False,
            "pushed": False,
            "message": "Nenhuma mudança gerenciada pelo blog para commitar.",
            "build": build_result,
            "staged_files": [],
        }

    commit_message = message.strip() or "publish: update blog"
    commit_result = run_git(["git", "commit", "-m", commit_message], check=False)
    if commit_result.returncode != 0:
        raise RuntimeError(commit_result.stderr.strip() or commit_result.stdout.strip())

    pushed = False
    push_output = ""
    if push:
        push_result = run_git(["git", "push"], check=False)
        push_output = (push_result.stdout + "\n" + push_result.stderr).strip()
        if push_result.returncode != 0:
            raise RuntimeError(push_output or "Falha ao executar git push.")
        pushed = True

    return {
        "committed": True,
        "pushed": pushed,
        "message": commit_result.stdout.strip() or "Commit criado.",
        "build": build_result,
        "staged_files": staged_files,
        "push_output": push_output,
    }
