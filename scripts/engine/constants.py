import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "blog.toml"

DEFAULT_BUILD_CONFIG = {
    "site_file": "content/site.toml",
    "system_file": "content/system.toml",
    "i18n_file": "content/i18n.toml",
    "posts_dir": "content/posts",
    "daily_dir": "content/daily",
    "projects_dir": "content/projects",
    "documents_dir": "content/documents",
    "publications_dir": "posts",
    "legacy_publications_dir": "publications",
    "daily_output_dir": "daily",
    "projects_output_dir": "projects",
    "documents_output_dir": "documents",
    "home_file": "index.html",
    "archive_file": "posts/index.html",
    "daily_index_file": "daily/index.html",
    "project_index_file": "projects/index.html",
    "documents_index_file": "documents/index.html",
    "about_file": "about/index.html",
    "contact_file": "contact/index.html",
    "search_index_file": "assets/search-index.json",
    "i18n_asset_file": "assets/i18n.json",
    "posts_on_home": 6,
    "daily_on_home": 4,
    "projects_on_home": 3,
    "documents_on_home": 4,
    "sitemap_file": "sitemap.xml",
    "rss_file": "feed.xml",
    "rss_items": 20,
    "cleanup_dirs": ["_astro"],
}

DEFAULT_MATH_CONFIG = {
    "enabled": True,
    "script_url": "https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js",
    "inline_delimiter": "$",
    "block_delimiter": "$$",
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

DEFAULT_I18N = {
    "default_locale": "pt-BR",
    "supported_locales": ["pt-BR", "pt-PT", "ja-JP"],
    "language_names": {
        "pt-BR": "Português (Brasil)",
        "pt-PT": "Português",
        "ja-JP": "日本語",
    },
    "aliases": {
        "pt": "pt-PT",
        "pt-br": "pt-BR",
        "pt-pt": "pt-PT",
        "ja": "ja-JP",
        "ja-jp": "ja-JP",
    },
    "timezones": {},
    "strings": {},
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
    "badges",
    "repo_url",
    "code_url",
    "featured",
    "has_math",
    "body",
]

MANAGED_GIT_PATHS = [
    ".github",
    ".gitignore",
    "README.md",
    "about",
    "assets",
    "blog.toml",
    "content",
    "documents",
    "editor",
    "index.html",
    "plans",
    "daily",
    "posts",
    "projects",
    "publications",
    "scripts",
]

# Regex patterns for Markdown parsing
UNORDERED_LIST_RE = re.compile(r"^[-*]\s+(?P<content>.+)$")
ORDERED_LIST_RE = re.compile(r"^\d+\.\s+(?P<content>.+)$")
HEADING_RE = re.compile(r"^(#{1,6})\s+(?P<content>.+)$")
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
STRONG_RE = re.compile(r"\*\*(.+?)\*\*")
EMPHASIS_RE = re.compile(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)")
WIKILINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")

MONTHS_PT = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
]

MONTHS_SHORT_PT = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez"
]

STATUS_LABELS = {
    "research": "research",
    "in_progress": "in progress",
    "production": "production",
}
