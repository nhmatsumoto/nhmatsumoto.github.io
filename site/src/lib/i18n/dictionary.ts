export type Locale = "pt-BR" | "en" | "ja";

export const LOCALES: Locale[] = ["pt-BR", "en", "ja"];

export const LOCALE_INDEX: Record<Locale, 0 | 1 | 2> = {
  "pt-BR": 0,
  en: 1,
  ja: 2,
};

export const SHORT_LABEL: Record<Locale, string> = {
  "pt-BR": "PT",
  en: "EN",
  ja: "日本語",
};

export type DictionaryEntry = [pt: string, en: string, ja: string];

export const dictionary: Record<string, DictionaryEntry> = {
  "brand.name": ["Site", "Site", "サイト"],
  "nav.home": ["início", "Home", "ホーム"],
  "nav.about": ["sobre", "About", "プロフィール"],
  "nav.posts": ["publicações", "Posts", "記事"],
  "nav.fundamentals": ["fundamentos", "Fundamentals", "基礎"],
  "nav.ai": ["ia", "AI", "AI"],
  "nav.projects": ["projetos", "Projects", "プロジェクト"],
  "nav.documents": ["documentos", "Documents", "ドキュメント"],
  "nav.contact": ["contato", "Contact", "連絡先"],
  "nav.menu_open": ["Abrir menu", "Open menu", "メニューを開く"],
  "nav.theme": ["alternar tema", "Toggle theme", "テーマを切り替える"],
  "nav.locale": ["mudar idioma", "Change language", "言語を変更"],

  "accessibility.skip_to_content": ["Ir para o conteúdo", "Skip to content", "本文へスキップ"],
  "accessibility.breadcrumbs": ["Você está aqui", "You are here", "現在地"],
  "accessibility.pagination": ["Paginação", "Pagination", "ページ送り"],

  "actions.code": ["código", "Code", "コード"],
  "actions.copied": ["Copiado!", "Copied!", "コピーしました！"],
  "actions.copy": ["Copiar código", "Copy code", "コードをコピー"],
  "actions.open_docs": ["abrir docs", "Open docs", "ドキュメントを開く"],
  "actions.read_article": ["Abrir", "Read", "読む"],
  "actions.repo": ["repo", "Repo", "リポジトリ"],
  "actions.view_architecture": ["ver arquitetura", "View architecture", "アーキテクチャを見る"],
  "actions.view_project": ["Ver", "View", "見る"],

  "kinds.document": ["documento", "Document", "ドキュメント"],
  "kinds.post": ["publicação", "Post", "記事"],
  "kinds.project": ["projeto", "Project", "プロジェクト"],
  "pagination.next": ["próxima", "Next", "次へ"],
  "pagination.prev": ["anterior", "Previous", "前へ"],
  "status.published": ["publicado", "published", "公開済み"],
  "post.reading_time_unit": [" min", " min", " 分"],

  "sections.documents_title": ["Documentos", "Documents", "ドキュメント"],
  "sections.navigation_kicker": ["navegação", "navigation", "ナビゲーション"],
  "sections.navigation_title": ["Seções", "Sections", "セクション"],
  "sections.posts_title": ["Publicações", "Posts", "記事"],
  "sections.projects_title": ["Projetos", "Projects", "プロジェクト"],
  "sections.related_content": ["Relacionados", "Related", "関連項目"],

  "pages.fundamentals.title": ["Fundamentos", "Fundamentals", "基礎"],
  "pages.fundamentals.description": ["", "", ""],
  "pages.ai.title": ["IA", "AI", "AI"],
  "pages.ai.description": ["", "", ""],
  "pages.archive.title": ["Publicações", "Posts", "記事"],
  "pages.archive.description": ["", "", ""],
  "pages.contact.title": ["Contato", "Contact", "連絡先"],
  "pages.contact.description": ["", "", ""],
  "pages.document.kicker": ["documento", "document", "ドキュメント"],
  "pages.document.meta": ["Metadados", "Metadata", "メタデータ"],
  "pages.documents.title": ["Documentos", "Documents", "ドキュメント"],
  "pages.documents.description": ["", "", ""],
  "pages.post.kicker": ["publicação", "post", "記事"],
  "pages.post.metadata": ["Metadados", "Metadata", "メタデータ"],
  "pages.project.impact": ["Impacto", "Impact", "成果"],
  "pages.project.kicker": ["projeto", "project", "プロジェクト"],
  "pages.project.lessons": ["Lições", "Lessons", "学び"],
  "pages.project.stack": ["Stack", "Stack", "スタック"],
  "pages.project.status": ["Status", "Status", "ステータス"],
  "pages.project.trade_offs": ["Decisões", "Decisions", "意思決定"],
  "pages.projects.title": ["Projetos", "Projects", "プロジェクト"],
  "pages.projects.description": ["", "", ""],

  "search.title": ["Buscar", "Search", "検索"],
  "search.hint": [
    "Digite para filtrar. Setas navegam, Enter abre e Esc fecha.",
    "Type to filter. Arrow keys navigate, Enter opens and Esc closes.",
    "入力して絞り込みます。矢印キーで移動、Enterで開き、Escで閉じます。",
  ],
  "search.empty": ["Nenhum resultado.", "No results.", "結果がありません。"],
  "search.placeholder": ["Buscar", "Search", "検索"],
  "search.aria_dialog": ["Busca", "Search", "検索"],
  "search.aria_close": ["Fechar busca", "Close search", "検索を閉じる"],
};
