from __future__ import annotations

from blog_engine import build_site


def main() -> None:
    result = build_site()
    print(f"Build concluído: {result['published_posts']} post(s) publicado(s).")
    for path in result["generated_files"]:
        print(f"- {path}")


if __name__ == "__main__":
    main()
