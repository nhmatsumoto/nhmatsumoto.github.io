from pathlib import Path
from typing import Any
from .constants import ROOT, DEFAULT_SITE, SITE_FIELD_ORDER, STATUS_LABELS
from .utils import (
    load_blog_config, load_toml, parse_datetime, parse_int, slugify, 
    summarize_body, reading_time_minutes, now_local, normalize_string_list
)


def normalise_site(raw: dict[str, Any]) -> dict[str, str]:
    site = DEFAULT_SITE | raw
    return {key: str(site.get(key, "") or "") for key in SITE_FIELD_ORDER}

def load_site() -> dict[str, str]:
    config = load_blog_config()
    site_path = ROOT / config["build"]["site_file"]
    return normalise_site(load_toml(site_path))

def load_system() -> dict[str, Any]:
    config = load_blog_config()
    system_path = ROOT / config["build"]["system_file"]
    if not system_path.exists():
        return {}
    return load_toml(system_path)

def normalise_post(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    published_dt = parse_datetime(str(raw.get("published_at", "") or ""))
    updated_dt = parse_datetime(str(raw.get("updated_at", "") or ""))
    post_id = str(raw.get("id", "") or "").strip() or published_dt.strftime("%Y%m%d-%H%M%S")
    title = str(raw.get("title", "") or "").strip() or "Sem título"
    slug = slugify(str(raw.get("slug", "") or "").strip() or title)
    body = str(raw.get("body", "") or "")
    summary = str(raw.get("summary", "") or "").strip() or summarize_body(body)
    status = str(raw.get("status", "") or "draft").strip().lower()
    tags = normalize_string_list(raw.get("tags", []))
    badges = normalize_string_list(raw.get("badges", []))
    has_math = bool(raw.get("has_math", raw.get("has_asciimath", False)))
    output_dir_name = f"{post_id}-{slug}"
    config = load_blog_config()
    publications_dir = config["build"]["publications_dir"]

    return {
        "id": post_id,
        "slug": slug,
        "kind": "article",
        "category": str(raw.get("category", "") or (tags[0] if tags else "engineering")).strip().lower(),
        "title": title,
        "summary": summary,
        "published_at": published_dt.isoformat(timespec="seconds"),
        "updated_at": updated_dt.isoformat(timespec="seconds"),
        "status": status,
        "tags": tags,
        "badges": badges,
        "repo_url": str(raw.get("repo_url", "") or "").strip(),
        "code_url": str(raw.get("code_url", "") or "").strip(),
        "featured": bool(raw.get("featured", False)),
        "has_math": has_math
        or config["math"]["inline_delimiter"] in body
        or config["math"]["block_delimiter"] in body
        or "\\(" in body,
        "body": body.rstrip() + "\n" if body.strip() else "",
        "published_dt": published_dt,
        "updated_dt": updated_dt,
        "reading_time": reading_time_minutes(body),
        "source_path": source_path,
        "output_dir_name": output_dir_name,
        "url": f"/{publications_dir}/{output_dir_name}/",
    }

def normalise_project(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    name = str(raw.get("name", "") or "").strip() or "Untitled Project"
    slug = slugify(str(raw.get("slug", "") or "").strip() or name)
    status = str(raw.get("status", "") or "research").strip().lower()
    if status not in STATUS_LABELS:
        status = "research"
    
    config = load_blog_config()
    return {
        "slug": slug,
        "name": name,
        "headline": str(raw.get("headline", "") or "").strip(),
        "summary": str(raw.get("summary", "") or "").strip(),
        "status": status,
        "status_label": STATUS_LABELS[status],
        "stack": normalize_string_list(raw.get("stack", [])),
        "badges": normalize_string_list(raw.get("badges", [])),
        "repo_url": str(raw.get("repo_url", "") or "").strip(),
        "code_url": str(raw.get("code_url", "") or "").strip(),
        "docs_url": str(raw.get("docs_url", "") or "").strip(),
        "architecture_url": str(raw.get("architecture_url", "") or "").strip(),
        "featured": bool(raw.get("featured", False)),
        "order": parse_int(raw.get("order", 999)),
        "diagram_preview": str(raw.get("diagram_preview", "") or "").rstrip(),
        "overview": str(raw.get("overview", "") or "").strip(),
        "problem_solution": str(raw.get("problem_solution", "") or "").strip(),
        "architecture": str(raw.get("architecture", "") or "").strip(),
        "stack_notes": str(raw.get("stack_notes", "") or "").strip(),
        "adr": normalize_string_list(raw.get("adr", [])),
        "roadmap": normalize_string_list(raw.get("roadmap", [])),
        "source_path": source_path,
        "url": f"/projects/{slug}/",
        "has_math": bool(raw.get("has_math", raw.get("has_asciimath", False)))
        or any(config["math"]["inline_delimiter"] in str(raw.get(f, "")) for f in ["overview", "problem_solution", "architecture", "stack_notes"])
        or any(config["math"]["block_delimiter"] in str(raw.get(f, "")) for f in ["overview", "problem_solution", "architecture", "stack_notes"]),
    }

def normalise_document(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    slug = slugify(str(raw.get("slug", "") or "").strip() or str(raw.get("title", "") or "document"))
    source_relative = str(raw.get("source_path", "") or "").strip()
    body = str(raw.get("body", "") or "")
    if source_relative:
        source_file = ROOT / source_relative
        if source_file.exists():
            body = source_file.read_text(encoding="utf-8")

    category = str(raw.get("category", "") or "architecture").strip().lower()
    published_dt = parse_datetime(str(raw.get("published_at", "") or "")) or now_local()
    return {
        "slug": slug,
        "kind": "document",
        "title": str(raw.get("title", "") or "").strip() or "Untitled Document",
        "summary": str(raw.get("summary", "") or "").strip() or summarize_body(body),
        "category": category,
        "version": str(raw.get("version", "") or "").strip() or "v1",
        "tags": normalize_string_list(raw.get("tags", [])),
        "agent_generated_tag": bool(raw.get("agent_generated_tag", False)),
        "order": parse_int(raw.get("order", 999)),
        "body": body.rstrip() + "\n" if body.strip() else "",
        "published_dt": published_dt,
        "source_path": source_path,
        "url": f"/documents/{slug}/",
    }

def load_posts(include_drafts: bool = False) -> list[dict[str, Any]]:
    config = load_blog_config()
    posts_dir = ROOT / config["build"]["posts_dir"]
    posts = []
    if posts_dir.exists():
        for path in posts_dir.glob("*.toml"):
            post = normalise_post(load_toml(path), source_path=path)
            if include_drafts or post["status"] == "published":
                posts.append(post)
    return sorted(posts, key=lambda x: x["published_dt"], reverse=True)

def load_projects() -> list[dict[str, Any]]:
    config = load_blog_config()
    projects_dir = ROOT / config["build"]["projects_dir"]
    projects = []
    if projects_dir.exists():
        for path in sorted(projects_dir.glob("*.toml")):
            projects.append(normalise_project(load_toml(path), source_path=path))
    return sorted(projects, key=lambda x: x["order"])

def load_documents() -> list[dict[str, Any]]:
    config = load_blog_config()
    documents_dir = ROOT / config["build"]["documents_dir"]
    documents = []
    if documents_dir.exists():
        for path in sorted(documents_dir.glob("*.toml")):
            documents.append(normalise_document(load_toml(path), source_path=path))
    return sorted(documents, key=lambda x: x["order"])
