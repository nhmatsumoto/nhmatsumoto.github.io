from __future__ import annotations

from blog_engine import build_site


def main() -> None:
    result = build_site()
    print(
        "Build concluído: "
        f"{result['published_posts']} post(s), "
        f"{result['published_projects']} projeto(s), "
        f"{result['published_documents']} documento(s)."
    )
    for path in result["generated_files"]:
        print(f"- {path}")


if __name__ == "__main__":
    main()
