import html
from typing import Any
from ..utils import site_href, format_rfc822


def _abs_url(site: dict, path: str) -> str:
    base = str(site.get("base_url", "") or "").rstrip("/")
    clean = str(path or "").lstrip("/")
    return f"{base}/{clean}" if clean else f"{base}/"


def generate_sitemap(
    site: dict[str, str],
    posts: list[dict[str, Any]],
    projects: list[dict[str, Any]],
    documents: list[dict[str, Any]],
    total_pages: int,
    config: dict[str, Any],
) -> str:
    base_url = str(site.get("base_url", "") or "").rstrip("/")
    if not base_url:
        return ""

    urls: list[str] = []

    def entry(loc: str, changefreq: str, priority: str, lastmod: str = "") -> str:
        mod = f"    <lastmod>{html.escape(lastmod)}</lastmod>\n" if lastmod else ""
        return (
            f"  <url>\n"
            f"    <loc>{html.escape(loc)}</loc>\n"
            f"{mod}"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            f"  </url>"
        )

    urls.append(entry(f"{base_url}/", "weekly", "1.0"))
    urls.append(entry(f"{base_url}/about/", "monthly", "0.7"))

    # Paginated archive
    for p in range(1, total_pages + 1):
        path = "/publications/" if p == 1 else f"/publications/page/{p}/"
        urls.append(entry(f"{base_url}{path}", "weekly", "0.6"))

    urls.append(entry(f"{base_url}/projects/", "weekly", "0.8"))
    urls.append(entry(f"{base_url}/documents/", "monthly", "0.7"))

    for post in posts:
        lastmod = ""
        dt = post.get("updated_dt") or post.get("published_dt")
        if dt and hasattr(dt, "date"):
            lastmod = dt.date().isoformat()
        urls.append(entry(f"{base_url}{post['url']}", "monthly", "0.9", lastmod))

    for project in projects:
        urls.append(entry(f"{base_url}{project['url']}", "monthly", "0.8"))

    for document in documents:
        urls.append(entry(f"{base_url}{document['url']}", "monthly", "0.7"))

    body = "\n".join(urls)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n"
        "</urlset>\n"
    )


def generate_rss_feed(
    site: dict[str, str],
    posts: list[dict[str, Any]],
    config: dict[str, Any],
) -> str:
    base_url = str(site.get("base_url", "") or "").rstrip("/")
    if not base_url:
        return ""

    limit = int(config.get("rss_items", 20))
    feed_url = f"{base_url}/{config.get('rss_file', 'feed.xml')}"
    site_url = f"{base_url}/"
    title = html.escape(site.get("title", "Blog"))
    description = html.escape(site.get("description", ""))

    items: list[str] = []
    sorted_posts = sorted(
        posts,
        key=lambda p: p.get("published_dt") or p.get("updated_dt"),
        reverse=True,
    )
    for post in sorted_posts[:limit]:
        post_url = f"{base_url}{post['url']}"
        dt = post.get("published_dt")
        pub_date = format_rfc822(dt) if dt else ""
        post_title = html.escape(post.get("title", ""))
        summary = post.get("summary", "")
        items.append(
            f"    <item>\n"
            f"      <title>{post_title}</title>\n"
            f"      <link>{html.escape(post_url)}</link>\n"
            f"      <description><![CDATA[{summary}]]></description>\n"
            f"      <pubDate>{html.escape(pub_date)}</pubDate>\n"
            f"      <guid isPermaLink=\"true\">{html.escape(post_url)}</guid>\n"
            f"    </item>"
        )

    items_xml = "\n".join(items)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        f"    <title>{title}</title>\n"
        f"    <link>{html.escape(site_url)}</link>\n"
        f"    <description>{description}</description>\n"
        f'    <atom:link href="{html.escape(feed_url)}" rel="self" type="application/rss+xml"/>\n'
        f"{items_xml}\n"
        "  </channel>\n"
        "</rss>\n"
    )
