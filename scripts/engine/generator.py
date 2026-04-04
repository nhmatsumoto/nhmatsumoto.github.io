import json
import math
import shutil
import subprocess
from pathlib import Path
from typing import Any
from .constants import ROOT, MANAGED_GIT_PATHS, WIKILINK_RE
from .utils import (
    load_blog_config, write_text, write_json, site_href, 
    resolve_optional_url, now_local
)
from .loader import load_site, load_system, load_posts, load_projects, load_documents
from .i18n import load_i18n, default_locale
from .renderer.pages import (
    render_home_page, render_archive_page, render_projects_index_page,
    render_documents_index_page, render_about_page, render_post_page,
    render_project_page, render_document_page
)

def build_search_index(site: dict[str, str], posts: list[dict[str, Any]], projects: list[dict[str, Any]], documents: list[dict[str, Any]], i18n: dict[str, Any], locale: str) -> list[dict[str, Any]]:
    from .utils import summarize_body
    from .i18n import translate
    items = [
        {"title": site["title"], "url": site_href(site, "/"), "kind": "home", "summary": site["description"]},
        {"title": translate(i18n, locale, "nav.about", "About"), "url": site_href(site, "/about/"), "kind": "about", "summary": summarize_body(site["about"])}
    ]
    for p in posts: items.append({"title": p["title"], "url": p["resolved_url"], "kind": "post", "summary": p["summary"], "keywords": p["tags"]})
    for p in projects: items.append({"title": p["name"], "url": p["resolved_url"], "kind": "project", "summary": p["summary"], "keywords": p["stack"]})
    for d in documents: items.append({"title": d["title"], "url": d["resolved_url"], "kind": "document", "summary": d["summary"], "keywords": d["tags"]})
    return items

def clean_output_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    for child in path.iterdir():
        if child.is_dir(): shutil.rmtree(child)
        else: child.unlink()

def build_site(output_dir: Path | None = None) -> dict[str, Any]:
    config = load_blog_config()["build"]
    site = load_site()
    system = load_system()
    i18n = load_i18n()
    locale = default_locale(site, i18n)
    site["language"] = locale
    
    posts = load_posts(include_drafts=False)
    projects = load_projects()
    documents = load_documents()
    
    target_root = output_dir if output_dir else ROOT
    
    # Resolve URLs
    for p in posts:
        p["resolved_url"] = site_href(site, p["url"])
        p["resolved_repo_url"] = resolve_optional_url(site, p["repo_url"])
        p["resolved_code_url"] = resolve_optional_url(site, p["code_url"])
    for p in projects:
        p["resolved_url"] = site_href(site, p["url"])
        p["resolved_repo_url"] = resolve_optional_url(site, p["repo_url"])
        p["resolved_code_url"] = resolve_optional_url(site, p["code_url"] or p["repo_url"])
        p["resolved_architecture_url"] = resolve_optional_url(site, p["architecture_url"])
    for d in documents:
        d["resolved_url"] = site_href(site, d["url"])

    # Clean directories
    for dname in [config["publications_dir"], config["projects_output_dir"], config["documents_output_dir"], Path(config["about_file"]).parent]:
        clean_output_directory(target_root / dname)

    # Mirror assets
    src_assets = ROOT / "assets"
    dst_assets = target_root / "assets"
    if src_assets.exists():
        dst_assets.mkdir(parents=True, exist_ok=True)
        for item in src_assets.iterdir():
            if item.is_dir():
                # For directories like images/ thumbnails/, copy tree
                d_dst = dst_assets / item.name
                if d_dst.exists(): shutil.rmtree(d_dst)
                shutil.copytree(item, d_dst)
            else:
                shutil.copy2(item, dst_assets / item.name)

    generated_paths: list[str] = []
    
    # Render static pages
    write_text(target_root / config["home_file"], render_projects_index_page(site, system, posts, projects, documents, i18n, locale))
    write_text(target_root / config["project_index_file"], render_projects_index_page(site, system, posts, projects, documents, i18n, locale))
    write_text(target_root / config["documents_index_file"], render_documents_index_page(site, system, documents, i18n, locale))
    write_text(target_root / config["about_file"], render_about_page(site, system, i18n, locale))

    # Pagination for Publications (Posts + Documents)
    all_publications = sorted(posts + documents, key=lambda x: x.get("published_dt", now_local()), reverse=True)
    items_per_page = int(config.get("posts_per_page", 12))
    total_pages = math.ceil(len(all_publications) / items_per_page) if all_publications else 1
    
    for p in range(1, total_pages + 1):
        page_items = all_publications[(p-1)*items_per_page : p*items_per_page]
        dest = target_root / config["archive_file"] if p == 1 else target_root / config["publications_dir"] / "page" / str(p) / "index.html"
        write_text(dest, render_archive_page(site, system, page_items, i18n, locale, current_page=p, total_pages=total_pages))

    # Render items
    for idx, post in enumerate(posts):
        dest = target_root / config["publications_dir"] / post["output_dir_name"] / "index.html"
        write_text(dest, render_post_page(site, system, post, posts[idx-1] if idx > 0 else None, posts[idx+1] if idx+1 < len(posts) else None, i18n, locale))
    for p in projects: write_text(target_root / config["projects_output_dir"] / p["slug"] / "index.html", render_project_page(site, system, p, i18n, locale))
    for d in documents: write_text(target_root / config["documents_output_dir"] / d["slug"] / "index.html", render_document_page(site, system, d, i18n, locale))

    # Assets & Index
    write_json(target_root / "assets/graph-data.json", build_graph_data(posts, projects, documents))
    write_json(target_root / config["search_index_file"], build_search_index(site, posts, projects, documents, i18n, locale))
    write_json(target_root / config["i18n_asset_file"], {
        "defaultLocale": i18n.get("default_locale", locale),
        "supportedLocales": i18n.get("supported_locales", []),
        "strings": i18n.get("strings", {}),
    })

    return {
        "published_posts": len(posts),
        "updated_at": now_local().isoformat(timespec="seconds"),
    }

def build_graph_data(posts, projects, documents):
    from .utils import load_toml, slugify
    
    graph_config_path = ROOT / "config/graph.toml"
    graph_config = load_toml(graph_config_path) if graph_config_path.exists() else {}
    
    nodes = []
    links = []
    node_map = {}
    
    # 1. Hiro Node
    hiro_cfg = graph_config.get("hiro", {})
    hiro_id = "hiro"
    nodes.append({
        "id": hiro_id,
        "title": hiro_cfg.get("label", "Hiro"),
        "kind": "central",
        "color": hiro_cfg.get("color", "#FFFFFF"),
        "glow": True,
        "size": 20
    })
    
    # 2. Category Nodes
    categories = graph_config.get("categories", {})
    tag_to_cat = {}
    
    for cat_id, cat_cfg in categories.items():
        nodes.append({
            "id": cat_id,
            "title": cat_cfg.get("label", cat_id),
            "kind": "group",
            "color": cat_cfg.get("color", "#00C2FF"),
            "size": 15
        })
        links.append({"source": hiro_id, "target": cat_id, "value": 3})
        
        for tag in cat_cfg.get("tags", []):
            tag_to_cat[tag.lower()] = cat_id

    # 3. Topic Nodes (from tags)
    all_tags = set()
    for res in posts + documents:
        for tag in res.get("tags", []):
            all_tags.add(tag.lower())
    for p in projects:
        for tag in p.get("stack", []):
            all_tags.add(tag.lower())
            
    topic_map = {}
    for tag in all_tags:
        topic_id = f"topic-{slugify(tag)}"
        topic_map[tag] = topic_id
        cat_id = tag_to_cat.get(tag)
        
        nodes.append({
            "id": topic_id,
            "title": tag,
            "kind": "topic",
            "color": categories.get(cat_id, {}).get("color", "#64748b") if cat_id else "#64748b",
            "size": 10
        })
        
        if cat_id:
            links.append({"source": cat_id, "target": topic_id, "value": 2})

    # 4. Publication Nodes
    flat = []
    for p in posts: flat.append((p, "post"))
    for p in projects: flat.append((p, "project"))
    for d in documents: flat.append((d, "document"))
    
    for res, kind in flat:
        slug = res.get("slug")
        node_map[slug] = {
            "id": slug, 
            "title": res.get("title") or res.get("name"), 
            "kind": kind, 
            "url": res.get("resolved_url"),
            "size": 8 if kind == "project" else 6
        }
        nodes.append(node_map[slug])
        
        # Link topics to publications
        res_tags = res.get("tags", []) if kind != "project" else res.get("stack", [])
        for tag in res_tags:
            tag_lower = tag.lower()
            if tag_lower in topic_map:
                links.append({"source": topic_map[tag_lower], "target": slug, "value": 1})
    
    # 5. Wikilinks (existing logic)
    for res, _ in flat:
        body = res.get("body", "") or res.get("overview", "") or ""
        for target, _ in WIKILINK_RE.findall(body):
            target_slug = target.strip()
            if target_slug in node_map:
                links.append({"source": res.get("slug"), "target": target_slug, "value": 1})
                
    return {"nodes": nodes, "links": links}

def publish_changes(message: str, push: bool = False) -> dict[str, Any]:
    build_site()
    # Git logic (kept similar to original for now)
    subprocess.run(["git", "add", "--", *MANAGED_GIT_PATHS], cwd=ROOT, check=True)
    subprocess.run(["git", "commit", "-m", message or "publish: update blog"], cwd=ROOT, check=True)
    if push: subprocess.run(["git", "push"], cwd=ROOT, check=True)
    return {"status": "published"}
