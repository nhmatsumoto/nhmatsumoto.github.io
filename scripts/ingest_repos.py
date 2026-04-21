import json
import os
from pathlib import Path

ROOT = Path(__file__).parent.parent
REPOS_FILE = ROOT / "repos_raw.json"
OUTPUT_DIR = ROOT / "content" / "projects"

def slugify(v: str) -> str:
    import re
    return re.sub(r"[^a-zA-Z0-9]+", "-", v.lower()).strip("-")

def main():
    if not REPOS_FILE.exists():
        print(f"File {REPOS_FILE} not found.")
        return

    with open(REPOS_FILE, "r", encoding="utf-8") as f:
        repos = json.load(f)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    count = 0
    for repo in repos:
        # Ingest ALL repositories from the dump
        slug = slugify(repo["name"])
        target_file = OUTPUT_DIR / f"{slug}.toml"
        
        # Don't overwrite manually curated projects
        if target_file.exists():
            content = target_file.read_text(encoding="utf-8")
            if 'featured = true' in content: # Curated projects are usually featured
                print(f"Skipping featured project: {slug}")
                continue

        name = repo["name"]
        # Default description if missing
        description = repo.get("description") or f"Repositório {name} sincronizado via GitHub."
        url = repo["html_url"]
        created_at = repo["created_at"]
        language = repo.get("language")
        topics = repo.get("topics", [])
        is_fork = repo.get("fork", False)
        
        # Create TOML content SAFELY using json.dumps for strings
        toml_content = f"""name = {json.dumps(name, ensure_ascii=False)}
slug = {json.dumps(slug, ensure_ascii=False)}
headline = {json.dumps(description, ensure_ascii=False)}
summary = {json.dumps(description, ensure_ascii=False)}
status = "published"
featured = false
order = 999
repo_url = {json.dumps(url, ensure_ascii=False)}
code_url = {json.dumps(url, ensure_ascii=False)}
published_at = "{created_at}"
tags = {json.dumps(topics + ([language] if language else []) + (["fork"] if is_fork else []), ensure_ascii=False)}

overview = \"\"\"
{description}

Este projeto foi sincronizado automaticamente do GitHub.
\"\"\"

problem_solution = "Sincronizado via Technical Knowledge OS build engine."
architecture = "Repositório público no GitHub."
"""
        target_file.write_text(toml_content, encoding="utf-8")
        count += 1
        print(f"Ingested: {slug}")

    print(f"Done! Ingested {count} repositories.")

if __name__ == "__main__":
    main()
