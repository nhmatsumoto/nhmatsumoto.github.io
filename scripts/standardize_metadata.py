import os
from pathlib import Path

ROOT = Path(__file__).parent.parent
CONTENT_DIR = ROOT / "content"

def update_toml(path):
    content = path.read_text(encoding="utf-8")
    lines = content.splitlines()
    new_lines = []
    has_engine = False
    has_status = False
    
    for line in lines:
        if line.startswith("view_engine ="):
            has_engine = True
            new_lines.append('view_engine = "binary-tree"')
        elif line.startswith("status ="):
            has_status = True
            # Flip all to published to ensure visibility
            new_lines.append('status = "published"')
        else:
            new_lines.append(line)
            
    if not has_engine:
        # Insert before body or at end
        index = -1
        for i, line in enumerate(new_lines):
            if line.startswith("body =") or line.startswith("overview ="):
                index = i
                break
        if index != -1:
            new_lines.insert(index, 'view_engine = "binary-tree"')
        else:
            new_lines.append('view_engine = "binary-tree"')
            
    if not has_status:
        new_lines.insert(0, 'status = "published"')
        
    path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")

def main():
    count = 0
    for subdir in ["posts", "projects", "documents"]:
        dir_path = CONTENT_DIR / subdir
        if not dir_path.exists(): continue
        for path in dir_path.glob("*.toml"):
            update_toml(path)
            count += 1
            print(f"Standardized: {path.relative_to(CONTENT_DIR)}")
            
    print(f"Done! Standardized {count} files.")

if __name__ == "__main__":
    main()
