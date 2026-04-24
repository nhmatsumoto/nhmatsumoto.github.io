import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from .constants import ROOT, DEFAULT_SITE, SITE_FIELD_ORDER, STATUS_LABELS
from .utils import (
    load_blog_config, load_toml, parse_datetime, parse_int, slugify, 
    summarize_body, reading_time_minutes, now_local, normalize_string_list,
    localized_field_entries
)


def normalise_site(raw: dict[str, Any]) -> dict[str, str]:
    site = DEFAULT_SITE | raw
    result = {key: str(site.get(key, "") or "") for key in SITE_FIELD_ORDER}
    for key, value in raw.items():
        if key not in result and isinstance(value, str):
            result[key] = value
    return result

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


def _localized_string_values(raw: dict[str, Any], fields: list[str]) -> list[str]:
    values: list[str] = []
    for field in fields:
        base = raw.get(field)
        if isinstance(base, str) and base.strip():
            values.append(base)
        for _, value in localized_field_entries(raw, field):
            if isinstance(value, str) and value.strip():
                values.append(value)
    return values


def _has_math_content(values: list[str], config: dict[str, Any]) -> bool:
    inline = config["math"]["inline_delimiter"]
    block = config["math"]["block_delimiter"]
    return any(
        inline in value
        or block in value
        or "\\(" in value
        or "\\[" in value
        or "`am:" in value
        for value in values
    )


def _load_localized_document_bodies(raw: dict[str, Any]) -> dict[str, str]:
    localized_bodies: dict[str, str] = {}

    for suffix, value in localized_field_entries(raw, "body"):
        text = str(value or "")
        if text.strip():
            localized_bodies[f"body_{suffix}"] = text.rstrip() + "\n"

    for suffix, value in localized_field_entries(raw, "source_path"):
        source_relative = str(value or "").strip()
        if not source_relative:
            continue
        source_file = ROOT / source_relative
        if not source_file.exists():
            continue
        localized_bodies[f"body_{suffix}"] = source_file.read_text(encoding="utf-8").rstrip() + "\n"

    return localized_bodies


_DAILY_LOOKBACK_DAYS = 30
_DAILY_MAX_RELATED_PATHS = 5
_DAILY_MAX_TAGS = 4
_DAILY_MAX_HIGHLIGHTS = 3
_DAILY_COMMIT_SENTINEL = "---COMMIT---"
_DAILY_SUBJECT_PREFIX_RE = re.compile(
    r"^(feat|fix|refactor|chore|docs|style|perf|build|test|ci|ui|deploy|publish|i18n)\s*:\s*",
    re.IGNORECASE,
)
_DAILY_THEME_LABELS = {
    "layout": {
        "pt-BR": "layout",
        "en-US": "layout",
        "ja-JP": "レイアウト",
    },
    "navbar": {
        "pt-BR": "navegação",
        "en-US": "navigation",
        "ja-JP": "ナビゲーション",
    },
    "mobile": {
        "pt-BR": "mobile",
        "en-US": "mobile",
        "ja-JP": "モバイル",
    },
    "profile": {
        "pt-BR": "perfil",
        "en-US": "profile",
        "ja-JP": "プロフィール",
    },
    "i18n": {
        "pt-BR": "localização",
        "en-US": "localization",
        "ja-JP": "ローカライズ",
    },
    "posts": {
        "pt-BR": "posts",
        "en-US": "posts",
        "ja-JP": "記事",
    },
    "projects": {
        "pt-BR": "projetos",
        "en-US": "projects",
        "ja-JP": "プロジェクト",
    },
    "documents": {
        "pt-BR": "documentação",
        "en-US": "documentation",
        "ja-JP": "ドキュメント",
    },
    "build": {
        "pt-BR": "build estático",
        "en-US": "static build",
        "ja-JP": "静的ビルド",
    },
    "renderer": {
        "pt-BR": "renderers",
        "en-US": "renderers",
        "ja-JP": "レンダラー",
    },
    "mermaid": {
        "pt-BR": "diagramas Mermaid",
        "en-US": "Mermaid diagrams",
        "ja-JP": "Mermaid 図",
    },
    "code": {
        "pt-BR": "blocos de código",
        "en-US": "code blocks",
        "ja-JP": "コードブロック",
    },
    "content": {
        "pt-BR": "conteúdo",
        "en-US": "content",
        "ja-JP": "コンテンツ",
    },
}
_DAILY_HIGHLIGHTS = {
    "layout": {
        "pt-BR": "Ajustes no shell visual, no ritmo vertical e na largura de leitura compartilhada.",
        "en-US": "Adjusted the visual shell, vertical rhythm, and shared reading width.",
        "ja-JP": "ビジュアルシェル、縦方向のリズム、共通の読み幅を調整しました。",
    },
    "navbar": {
        "pt-BR": "Refinos na navegação, no toggle mobile e nos controles de idioma e tema.",
        "en-US": "Refined navigation, the mobile toggle, and the language and theme controls.",
        "ja-JP": "ナビゲーション、モバイルトグル、言語とテーマの操作を改善しました。",
    },
    "mobile": {
        "pt-BR": "Revisão do comportamento responsivo para evitar compressão e quebras estranhas em telas pequenas.",
        "en-US": "Reworked responsive behavior to avoid cramped layouts and odd breaks on small screens.",
        "ja-JP": "小さな画面でレイアウトが詰まったり不自然に折り返したりしないように見直しました。",
    },
    "profile": {
        "pt-BR": "Reposicionamento do bloco de perfil, avatar e links de contato para melhorar hierarquia e alinhamento.",
        "en-US": "Repositioned the profile block, avatar, and contact links to improve hierarchy and alignment.",
        "ja-JP": "プロフィールブロック、アバター、連絡先リンクを再配置し、階層と整列を改善しました。",
    },
    "i18n": {
        "pt-BR": "Atualização dos rótulos e descrições em pt-BR, en-US e ja-JP sem quebrar o layout.",
        "en-US": "Updated labels and descriptions across pt-BR, en-US, and ja-JP without breaking the layout.",
        "ja-JP": "pt-BR、en-US、ja-JP のラベルと説明を更新しつつ、レイアウト崩れを防ぎました。",
    },
    "posts": {
        "pt-BR": "Ampliação ou revisão da trilha pública de posts e páginas editoriais.",
        "en-US": "Expanded or revised the public stream of posts and editorial pages.",
        "ja-JP": "公開されている記事や編集ページの流れを拡張または見直しました。",
    },
    "projects": {
        "pt-BR": "Ajustes na vitrine de projetos, status e documentação conectada.",
        "en-US": "Adjusted the project showcase, status presentation, and connected documentation.",
        "ja-JP": "プロジェクト一覧、ステータス表示、関連ドキュメントを調整しました。",
    },
    "documents": {
        "pt-BR": "Organização de documentos técnicos e páginas de apoio para manter decisões acessíveis.",
        "en-US": "Organized technical documents and support pages to keep decisions accessible.",
        "ja-JP": "意思決定にアクセスしやすいように技術ドキュメントと補助ページを整理しました。",
    },
    "build": {
        "pt-BR": "Ajustes no pipeline estático e na geração do site para manter a publicação consistente.",
        "en-US": "Adjusted the static pipeline and site generation flow to keep publishing consistent.",
        "ja-JP": "公開の整合性を保つために静的パイプラインとサイト生成を調整しました。",
    },
    "renderer": {
        "pt-BR": "Refatoração de renderers, componentes e shell compartilhado entre páginas.",
        "en-US": "Refactored renderers, components, and the shared shell across pages.",
        "ja-JP": "ページ間で共有するレンダラー、コンポーネント、シェルを整理しました。",
    },
    "mermaid": {
        "pt-BR": "Melhorias no tratamento de diagramas Mermaid e no fallback de conteúdo técnico.",
        "en-US": "Improved Mermaid diagram handling and the fallback experience for technical content.",
        "ja-JP": "Mermaid 図の扱いと技術コンテンツのフォールバック表示を改善しました。",
    },
    "code": {
        "pt-BR": "Refino da renderização e legibilidade de blocos de código e conteúdo técnico.",
        "en-US": "Refined the rendering and readability of code blocks and technical content.",
        "ja-JP": "コードブロックと技術コンテンツの表示と読みやすさを改善しました。",
    },
    "content": {
        "pt-BR": "Atualização incremental de conteúdo técnico, cópia editorial e páginas de apoio.",
        "en-US": "Incrementally updated technical content, editorial copy, and support pages.",
        "ja-JP": "技術コンテンツ、編集コピー、補助ページを段階的に更新しました。",
    },
}


def _ordered_unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        item = str(value or "").strip()
        if not item or item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


def _daily_should_keep_path(path: str) -> bool:
    clean = str(path or "").strip()
    if not clean:
        return False
    if clean in {"index.html", "feed.xml", "sitemap.xml", "assets/search-index.json", "assets/i18n.json"}:
        return False
    if clean.startswith(("_site/", "about/", "contact/", "daily/", "documents/", "graph/", "posts/", "projects/", "publications/")):
        return False
    if clean.startswith("content/daily/"):
        return False
    if clean.startswith(("scripts/", "assets/", "docs/", "editor/", ".github/")):
        return True
    if clean.startswith(("content/posts/", "content/projects/", "content/documents/")):
        return True
    if clean in {"content/i18n.toml", "content/site.toml", "content/system.toml", "README.md", "blog.toml", "repos.json", "repos_raw.json"}:
        return True
    return False


def _clean_daily_subject(subject: str) -> str:
    cleaned = _DAILY_SUBJECT_PREFIX_RE.sub("", str(subject or "").strip())
    return re.sub(r"\s+", " ", cleaned).strip()


def _daily_theme_label(theme: str, locale: str) -> str:
    labels = _DAILY_THEME_LABELS.get(theme, {})
    return str(labels.get(locale) or labels.get("pt-BR") or theme).strip()


def _join_daily_items(items: list[str], locale: str) -> str:
    cleaned = [str(item or "").strip() for item in items if str(item or "").strip()]
    if not cleaned:
        return ""
    if len(cleaned) == 1:
        return cleaned[0]
    if locale == "ja-JP":
        return "、".join(cleaned[:-1]) + "と" + cleaned[-1]
    conjunction = "and" if locale == "en-US" else "e"
    if len(cleaned) == 2:
        return f"{cleaned[0]} {conjunction} {cleaned[1]}"
    return ", ".join(cleaned[:-1]) + f", {conjunction} " + cleaned[-1]


def _daily_commit_count_text(count: int, locale: str) -> str:
    if locale == "ja-JP":
        return f"{count}件のコミット"
    noun = "commit" if count == 1 else "commits"
    return f"{count} {noun}"


def _daily_area_labels(paths: list[str], locale: str) -> list[str]:
    labels: list[str] = []
    mappings = [
        (
            lambda path: path == "assets/styles.css",
            {"pt-BR": "CSS global", "en-US": "global CSS", "ja-JP": "グローバルCSS"},
        ),
        (
            lambda path: path == "assets/blog.js",
            {"pt-BR": "interações do navbar", "en-US": "navbar interactions", "ja-JP": "ナビゲーションの挙動"},
        ),
        (
            lambda path: path.startswith("scripts/engine/renderer/"),
            {"pt-BR": "renderers do site", "en-US": "site renderers", "ja-JP": "サイトのレンダラー"},
        ),
        (
            lambda path: path.startswith("scripts/engine/") or path == "scripts/build.py" or path == "scripts/blog_engine.py",
            {"pt-BR": "pipeline estático", "en-US": "static pipeline", "ja-JP": "静的パイプライン"},
        ),
        (
            lambda path: path == "content/i18n.toml",
            {"pt-BR": "traduções", "en-US": "translations", "ja-JP": "翻訳"},
        ),
        (
            lambda path: path.startswith("content/posts/"),
            {"pt-BR": "posts", "en-US": "posts", "ja-JP": "記事"},
        ),
        (
            lambda path: path.startswith("content/projects/"),
            {"pt-BR": "projetos", "en-US": "projects", "ja-JP": "プロジェクト"},
        ),
        (
            lambda path: path.startswith(("content/documents/", "docs/")),
            {"pt-BR": "documentação", "en-US": "documentation", "ja-JP": "ドキュメント"},
        ),
        (
            lambda path: path.startswith("editor/"),
            {"pt-BR": "editor", "en-US": "editor", "ja-JP": "エディタ"},
        ),
    ]
    for matcher, localized in mappings:
        if any(matcher(path) for path in paths):
            labels.append(localized.get(locale) or localized["pt-BR"])
    return labels[:3]


def _daily_highlights_for_themes(themes: list[str], locale: str) -> list[str]:
    highlights = [
        _DAILY_HIGHLIGHTS.get(theme, {}).get(locale) or _DAILY_HIGHLIGHTS.get(theme, {}).get("pt-BR")
        for theme in themes
    ]
    filtered = [item for item in highlights if item]
    if not filtered:
        fallbacks = {
            "pt-BR": "Revisão incremental do código-fonte e da camada pública do site.",
            "en-US": "Incremental review of the source code and the site's public layer.",
            "ja-JP": "ソースコードと公開レイヤーを段階的に見直しました。",
        }
        return [fallbacks.get(locale, fallbacks["pt-BR"])]
    return filtered[:_DAILY_MAX_HIGHLIGHTS]


def _daily_score_themes(subject: str, paths: list[str]) -> Counter[str]:
    lowered = subject.lower()
    scores: Counter[str] = Counter()

    def bump(theme: str, amount: int = 1) -> None:
        scores[theme] += amount

    if any(token in lowered for token in ["navbar", "nav ", " nav", "drawer", "toggle", "menu"]):
        bump("navbar", 3)
    if any(token in lowered for token in ["mobile", "responsive"]):
        bump("mobile", 2)
    if any(token in lowered for token in ["layout", "spacing", "typography", "reading", "shell", "footer", "breadcrumb", "grid", "home", "about"]):
        bump("layout", 2)
    if any(token in lowered for token in ["profile", "avatar", "contact"]):
        bump("profile", 2)
    if any(token in lowered for token in ["i18n", "locale", "localization", "language"]):
        bump("i18n", 2)
    if any(token in lowered for token in ["post", "article", "publication"]):
        bump("posts", 1)
    if any(token in lowered for token in ["project", "portfolio"]):
        bump("projects", 1)
    if any(token in lowered for token in ["document", "docs"]):
        bump("documents", 1)
    if any(token in lowered for token in ["render", "renderer", "build", "generate", "static site", "feed"]):
        bump("renderer", 1)
        bump("build", 1)
    if any(token in lowered for token in ["mermaid", "diagram"]):
        bump("mermaid", 2)
    if any(token in lowered for token in ["highlight", "syntax", "code block"]):
        bump("code", 2)
    if any(token in lowered for token in ["content", "copy"]):
        bump("content", 1)

    for path in paths:
        if path == "assets/styles.css":
            bump("layout", 3)
        elif path == "assets/blog.js":
            bump("navbar", 2)
            bump("mobile", 1)
        elif path.startswith("scripts/engine/renderer/"):
            bump("renderer", 2)
            bump("layout", 1)
        elif path.startswith("scripts/engine/") or path in {"scripts/build.py", "scripts/blog_engine.py"}:
            bump("build", 2)
        elif path == "content/i18n.toml":
            bump("i18n", 3)
        elif path.startswith("content/posts/"):
            bump("posts", 2)
            bump("content", 1)
        elif path.startswith("content/projects/"):
            bump("projects", 2)
            bump("content", 1)
        elif path.startswith(("content/documents/", "docs/")):
            bump("documents", 2)
            bump("content", 1)
        elif path.startswith("editor/"):
            bump("code", 1)
        elif path.startswith(".github/"):
            bump("build", 1)

    if not scores:
        bump("content", 1)
        bump("build", 1)
    return scores


def _daily_title_from_themes(themes: list[str], locale: str) -> str:
    labels = [_daily_theme_label(theme, locale) for theme in themes[:2] if _daily_theme_label(theme, locale)]
    if not labels:
        fallbacks = {
            "pt-BR": "Atividade de engenharia",
            "en-US": "Engineering activity",
            "ja-JP": "エンジニアリング活動",
        }
        return fallbacks.get(locale, fallbacks["pt-BR"])
    title = _join_daily_items(labels, locale)
    return title[:1].upper() + title[1:] if locale != "ja-JP" and title else title


def _daily_summary_from_day(themes: list[str], areas: list[str], commit_count: int, locale: str) -> str:
    theme_text = _join_daily_items([_daily_theme_label(theme, locale) for theme in themes[:3]], locale)
    area_text = _join_daily_items(areas, locale)
    commit_text = _daily_commit_count_text(commit_count, locale)
    if locale == "en-US":
        return (
            f"The day gathered {commit_text} focused on {theme_text}. "
            f"The work touched {area_text or 'the shared site surface'} and refined the public notebook incrementally."
        )
    if locale == "ja-JP":
        return (
            f"この日は{theme_text}を中心に{commit_text}がありました。"
            f"変更は{area_text or '共有のサイト基盤'}に及び、公開ノートブックを段階的に整えました。"
        )
    focus_phrase = "voltado a" if commit_count == 1 else "voltados a"
    return (
        f"O dia reuniu {commit_text} {focus_phrase} {theme_text}. "
        f"As mudanças passaram por {area_text or 'a superfície compartilhada do site'} e refinaram o caderno público de forma incremental."
    )


def _daily_source_text(locale: str) -> str:
    values = {
        "pt-BR": "Atividade pública derivada do histórico Git local dos últimos 30 dias.",
        "en-US": "Public activity derived from the local Git history from the last 30 days.",
        "ja-JP": "過去30日間のローカル Git 履歴から取得した公開アクティビティです。",
    }
    return values.get(locale, values["pt-BR"])


def _daily_body_from_day(
    summary: str,
    themes: list[str],
    related_paths: list[str],
    source_text: str,
    locale: str,
) -> str:
    if locale == "en-US":
        highlights_heading = "Highlights"
        paths_heading = "Related paths"
        source_heading = "Source"
    elif locale == "ja-JP":
        highlights_heading = "ハイライト"
        paths_heading = "関連パス"
        source_heading = "ソース"
    else:
        highlights_heading = "Destaques"
        paths_heading = "Caminhos relacionados"
        source_heading = "Fonte"

    highlights = _daily_highlights_for_themes(themes, locale)
    highlight_block = "\n".join(f"- {item}" for item in highlights)
    path_block = "\n".join(f"- `{path}`" for path in related_paths) if related_paths else "- `scripts/engine/`"
    return (
        f"{summary}\n\n"
        f"## {highlights_heading}\n"
        f"{highlight_block}\n\n"
        f"## {paths_heading}\n"
        f"{path_block}\n\n"
        f"## {source_heading}\n"
        f"{source_text}\n"
    )


def _load_git_daily_commits(days: int = _DAILY_LOOKBACK_DAYS) -> list[dict[str, Any]]:
    command = [
        "git",
        "log",
        f"--since={days} days ago",
        "--date=iso-strict",
        f"--pretty=format:{_DAILY_COMMIT_SENTINEL}%n%h|%ad|%s",
        "--name-only",
    ]
    try:
        result = subprocess.run(
            command,
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return []

    commits: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    header_pending = False

    for raw_line in result.stdout.splitlines():
        line = raw_line.rstrip("\n")
        if line == _DAILY_COMMIT_SENTINEL:
            if current and current.get("date"):
                commits.append(current)
            current = {"files": []}
            header_pending = True
            continue
        if current is None:
            continue
        if header_pending:
            parts = line.split("|", 2)
            if len(parts) != 3:
                current = None
                header_pending = False
                continue
            current["short_hash"] = parts[0].strip()
            current["committed_at"] = parts[1].strip()
            current["subject"] = parts[2].strip()
            current["date"] = parts[1].strip()[:10]
            header_pending = False
            continue
        if line.strip():
            current["files"].append(line.strip())

    if current and current.get("date"):
        commits.append(current)
    return commits


def _build_git_daily_entries(include_drafts: bool = False) -> list[dict[str, Any]]:
    del include_drafts
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for commit in _load_git_daily_commits():
        relevant_paths = _ordered_unique([path for path in commit.get("files", []) if _daily_should_keep_path(path)])
        if not relevant_paths:
            continue
        grouped[commit["date"]].append(
            {
                "short_hash": commit.get("short_hash", ""),
                "subject": _clean_daily_subject(commit.get("subject", "")),
                "committed_at": commit.get("committed_at", ""),
                "committed_dt": parse_datetime(commit.get("committed_at", "")),
                "paths": relevant_paths,
            }
        )

    entries: list[dict[str, Any]] = []
    config = load_blog_config()
    daily_output_dir = config["build"].get("daily_output_dir", "daily")

    for day_key, commits in grouped.items():
        sorted_commits = sorted(commits, key=lambda item: item["committed_dt"], reverse=True)
        latest_dt = sorted_commits[0]["committed_dt"]
        relevant_paths = _ordered_unique([path for commit in sorted_commits for path in commit["paths"]])
        related_paths = relevant_paths[:_DAILY_MAX_RELATED_PATHS]

        theme_scores: Counter[str] = Counter()
        for commit in sorted_commits:
            theme_scores.update(_daily_score_themes(commit["subject"], commit["paths"]))
        themes = [theme for theme, score in theme_scores.most_common() if score > 0][: _DAILY_MAX_TAGS]
        if not themes:
            themes = ["content", "build"]

        areas_pt = _daily_area_labels(related_paths, "pt-BR")
        areas_en = _daily_area_labels(related_paths, "en-US")
        areas_ja = _daily_area_labels(related_paths, "ja-JP")

        title_pt = _daily_title_from_themes(themes, "pt-BR")
        title_en = _daily_title_from_themes(themes, "en-US")
        title_ja = _daily_title_from_themes(themes, "ja-JP")
        summary_pt = _daily_summary_from_day(themes, areas_pt, len(sorted_commits), "pt-BR")
        summary_en = _daily_summary_from_day(themes, areas_en, len(sorted_commits), "en-US")
        summary_ja = _daily_summary_from_day(themes, areas_ja, len(sorted_commits), "ja-JP")
        source_pt = _daily_source_text("pt-BR")
        source_en = _daily_source_text("en-US")
        source_ja = _daily_source_text("ja-JP")

        slug_seed = title_en or title_pt or latest_dt.strftime("%Y-%m-%d")
        slug = slugify(slug_seed)
        entry_id = latest_dt.strftime("%Y%m%d-%H%M%S")
        output_dir_name = f"{entry_id}-{slug}"

        raw_entry = {
            "id": entry_id,
            "slug": slug,
            "title": title_pt,
            "title_en_us": title_en,
            "title_ja_jp": title_ja,
            "summary": summary_pt,
            "summary_en_us": summary_en,
            "summary_ja_jp": summary_ja,
            "published_at": latest_dt.isoformat(timespec="seconds"),
            "updated_at": latest_dt.isoformat(timespec="seconds"),
            "status": "published",
            "tags": themes,
            "source": source_pt,
            "source_en_us": source_en,
            "source_ja_jp": source_ja,
            "related_paths": related_paths,
            "commit_count": len(sorted_commits),
            "body": _daily_body_from_day(summary_pt, themes, related_paths, source_pt, "pt-BR"),
            "body_en_us": _daily_body_from_day(summary_en, themes, related_paths, source_en, "en-US"),
            "body_ja_jp": _daily_body_from_day(summary_ja, themes, related_paths, source_ja, "ja-JP"),
            "url": f"/{daily_output_dir}/{output_dir_name}/",
        }
        entries.append(normalise_daily(raw_entry))

    return sorted(entries, key=lambda item: item["published_dt"], reverse=True)

def normalise_post(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    published_dt = parse_datetime(str(raw.get("published_at", "") or ""))
    updated_dt = parse_datetime(str(raw.get("updated_at", "") or ""))
    post_id = str(raw.get("id", "") or "").strip() or published_dt.strftime("%Y%m%d-%H%M%S")
    title = str(raw.get("title", "") or "").strip()
    if not title:
        title = str(next((value for _, value in localized_field_entries(raw, "title")), "") or "").strip() or "Sem título"
    slug = slugify(str(raw.get("slug", "") or "").strip() or title)
    body = str(raw.get("body", "") or "")
    if not body:
        body = str(next((value for _, value in localized_field_entries(raw, "body")), "") or "")
    summary = str(raw.get("summary", "") or "").strip()
    if not summary:
        summary = str(next((value for _, value in localized_field_entries(raw, "summary")), "") or "").strip() or summarize_body(body)
    status = str(raw.get("status", "") or "draft").strip().lower()
    tags = normalize_string_list(raw.get("tags", []))
    badges = normalize_string_list(raw.get("badges", []))
    has_math = bool(raw.get("has_math", raw.get("has_asciimath", False)))
    output_dir_name = f"{post_id}-{slug}"
    config = load_blog_config()
    publications_dir = config["build"]["publications_dir"]

    res = {
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
        "project_url": str(raw.get("project_url", "") or "").strip(),
        "featured": bool(raw.get("featured", False)),
        "has_math": has_math
        or _has_math_content(_localized_string_values(raw, ["body"]), config),
        "body": body.rstrip() + "\n" if body.strip() else "",
        "published_dt": published_dt,
        "updated_dt": updated_dt,
        "reading_time": reading_time_minutes(body),
        "source_path": source_path,
        "output_dir_name": output_dir_name,
        "url": f"/{publications_dir}/{output_dir_name}/",
        "impact": normalize_string_list(raw.get("impact", [])),
        "trade_offs": normalize_string_list(raw.get("trade_offs", [])),
        "lessons": normalize_string_list(raw.get("lessons", [])),
    }

    # Add localized fields
    for k, v in raw.items():
        if any(k.startswith(p) for p in ["title_", "summary_", "body_"]):
            res[k] = v
    return res

def normalise_daily(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    published_dt = parse_datetime(str(raw.get("published_at", "") or ""))
    updated_dt = parse_datetime(str(raw.get("updated_at", "") or raw.get("published_at", "") or ""))
    daily_id = str(raw.get("id", "") or "").strip() or published_dt.strftime("%Y%m%d-%H%M%S")
    title = str(raw.get("title", "") or "").strip()
    if not title:
        title = str(next((value for _, value in localized_field_entries(raw, "title")), "") or "").strip() or "Nota"
    slug = slugify(str(raw.get("slug", "") or "").strip() or title)
    body = str(raw.get("body", "") or "")
    if not body:
        body = str(next((value for _, value in localized_field_entries(raw, "body")), "") or "")
    summary = str(raw.get("summary", "") or "").strip()
    if not summary:
        summary = str(next((value for _, value in localized_field_entries(raw, "summary")), "") or "").strip() or summarize_body(body, limit=120)
    status = str(raw.get("status", "") or "draft").strip().lower()
    tags = normalize_string_list(raw.get("tags", []))
    source = str(raw.get("source", "") or "").strip()
    if not source:
        source = str(next((value for _, value in localized_field_entries(raw, "source")), "") or "").strip()
    related_paths = normalize_string_list(raw.get("related_paths", []))
    commit_count = parse_int(raw.get("commit_count", 0), 0)
    output_dir_name = f"{daily_id}-{slug}"
    config = load_blog_config()
    daily_output_dir = config["build"].get("daily_output_dir", "daily")

    res = {
        "id": daily_id,
        "slug": slug,
        "kind": "daily",
        "category": "daily",
        "title": title,
        "summary": summary,
        "published_at": published_dt.isoformat(timespec="seconds"),
        "updated_at": updated_dt.isoformat(timespec="seconds"),
        "status": status,
        "tags": tags,
        "body": body.rstrip() + "\n" if body.strip() else "",
        "published_dt": published_dt,
        "updated_dt": updated_dt,
        "reading_time": reading_time_minutes(body),
        "source_path": source_path,
        "output_dir_name": output_dir_name,
        "url": f"/{daily_output_dir}/{output_dir_name}/",
        "source": source,
        "related_paths": related_paths,
        "commit_count": commit_count,
        "has_math": False,
    }

    for k, v in raw.items():
        if any(k.startswith(p) for p in ["title_", "summary_", "body_", "source_"]):
            res[k] = v
    return res

def normalise_project(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    name = str(raw.get("name", "") or "").strip()
    if not name:
        name = str(next((value for _, value in localized_field_entries(raw, "name")), "") or "").strip() or "Untitled Project"
    slug = slugify(str(raw.get("slug", "") or "").strip() or name)
    status = str(raw.get("status", "") or "research").strip().lower()
    if status not in STATUS_LABELS:
        status = "research"
    
    headline = str(raw.get("headline", "") or "").strip()
    if not headline:
        headline = str(next((value for _, value in localized_field_entries(raw, "headline")), "") or "").strip()

    summary = str(raw.get("summary", "") or "").strip()
    if not summary:
        summary = str(next((value for _, value in localized_field_entries(raw, "summary")), "") or "").strip() or headline

    config = load_blog_config()
    res = {
        "slug": slug,
        "kind": "project",
        "name": name,
        "headline": headline,
        "summary": summary,
        "status": status,
        "status_label": STATUS_LABELS[status],
        "tags": normalize_string_list(raw.get("tags", [])),
        "stack": normalize_string_list(raw.get("stack", [])),
        "badges": normalize_string_list(raw.get("badges", [])),
        "repo_url": str(raw.get("repo_url", "") or "").strip(),
        "code_url": str(raw.get("code_url", "") or "").strip(),
        "docs_url": str(raw.get("docs_url", "") or "").strip(),
        "architecture_url": str(raw.get("architecture_url", "") or "").strip(),
        "featured": bool(raw.get("featured", False)),
        "order": parse_int(raw.get("order", 999)),
        "diagram_preview": str(raw.get("diagram_preview", "") or "").rstrip(),
        "diagram_format": str(raw.get("diagram_format", "") or "").strip().lower(),
        "overview": str(raw.get("overview", "") or "").strip(),
        "problem_solution": str(raw.get("problem_solution", "") or "").strip(),
        "architecture": str(raw.get("architecture", "") or "").strip(),
        "stack_notes": str(raw.get("stack_notes", "") or "").strip(),
        "adr": normalize_string_list(raw.get("adr", [])),
        "roadmap": normalize_string_list(raw.get("roadmap", [])),
        "impact": normalize_string_list(raw.get("impact", [])),
        "trade_offs": normalize_string_list(raw.get("trade_offs", [])),
        "lessons": normalize_string_list(raw.get("lessons", [])),
        "production_notes": str(raw.get("production_notes", "") or "").strip(),
        "source_path": source_path,
        "url": f"/projects/{slug}/",
        "has_math": bool(raw.get("has_math", raw.get("has_asciimath", False)))
        or _has_math_content(_localized_string_values(raw, ["overview", "problem_solution", "architecture", "stack_notes", "production_notes"]), config),
    }

    # Add localized fields
    for k, v in raw.items():
        if any(
            k.startswith(p)
            for p in [
                "name_",
                "headline_",
                "summary_",
                "overview_",
                "problem_solution_",
                "architecture_",
                "stack_notes_",
                "production_notes_",
                "adr_",
                "roadmap_",
                "impact_",
                "trade_offs_",
                "lessons_",
            ]
        ):
            res[k] = v
    return res

def normalise_document(raw: dict[str, Any], source_path: Path | None = None) -> dict[str, Any]:
    slug = slugify(str(raw.get("slug", "") or "").strip() or str(raw.get("title", "") or "document"))
    source_relative = str(raw.get("source_path", "") or "").strip()
    body = str(raw.get("body", "") or "")
    localized_bodies = _load_localized_document_bodies(raw)
    if source_relative:
        source_file = ROOT / source_relative
        if source_file.exists():
            body = source_file.read_text(encoding="utf-8")
    if not body:
        body = str(next(iter(localized_bodies.values()), "") or "")
    config = load_blog_config()
    document_bodies = [body, *localized_bodies.values()]

    category = str(raw.get("category", "") or "architecture").strip().lower()
    published_dt = parse_datetime(str(raw.get("published_at", "") or "")) or now_local()
    title = str(raw.get("title", "") or "").strip()
    if not title:
        title = str(next((value for _, value in localized_field_entries(raw, "title")), "") or "").strip() or "Untitled Document"
    summary = str(raw.get("summary", "") or "").strip()
    if not summary:
        summary = str(next((value for _, value in localized_field_entries(raw, "summary")), "") or "").strip() or summarize_body(body)
    res = {
        "slug": slug,
        "kind": "document",
        "title": title,
        "summary": summary,
        "category": category,
        "version": str(raw.get("version", "") or "").strip() or "v1",
        "tags": normalize_string_list(raw.get("tags", [])),
        "agent_generated_tag": bool(raw.get("agent_generated_tag", False)),
        "order": parse_int(raw.get("order", 999)),
        "body": body.rstrip() + "\n" if body.strip() else "",
        "published_dt": published_dt,
        "source_path": source_path,
        "body_source_path": source_relative,
        "url": f"/documents/{slug}/",
        "has_math": bool(raw.get("has_math", raw.get("has_asciimath", False)))
        or _has_math_content([value for value in document_bodies if isinstance(value, str) and value.strip()], config),
    }
    res.update(localized_bodies)

    for k, v in raw.items():
        if any(k.startswith(p) for p in ["title_", "summary_", "body_"]):
            res[k] = v
    return res

def load_posts(include_drafts: bool = False) -> list[dict[str, Any]]:
    from . import postgres_store

    database_posts = postgres_store.load_raw_posts(include_drafts=include_drafts)
    if database_posts is not None:
        posts = [normalise_post(raw, source_path=None) for raw in database_posts]
        return sorted(posts, key=lambda x: x["published_dt"], reverse=True)

    config = load_blog_config()
    posts_dir = ROOT / config["build"]["posts_dir"]
    posts = []
    if posts_dir.exists():
        for path in posts_dir.glob("*.toml"):
            post = normalise_post(load_toml(path), source_path=path)
            if include_drafts or post["status"] == "published":
                posts.append(post)
    return sorted(posts, key=lambda x: x["published_dt"], reverse=True)

def load_daily(include_drafts: bool = False) -> list[dict[str, Any]]:
    entries = _build_git_daily_entries(include_drafts=include_drafts)
    return sorted(entries, key=lambda x: x["published_dt"], reverse=True)

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
