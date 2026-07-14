/* Self-contained i18n engine + dictionary (pt-BR / en / ja).
   Runs independently of blog.js. Swaps [data-i18n] text and
   [data-i18n-aria-label] labels, persists choice, wires the locale switcher. */
(() => {
  "use strict";

  const STORAGE_KEY = "site-locale";
  const LOCALES = ["pt-BR", "en", "ja"];
  const HTML_LANG = { "pt-BR": "pt-BR", en: "en", ja: "ja" };
  const SHORT = { "pt-BR": "PT", en: "EN", ja: "日本語" };

  // key: [pt-BR, en, ja]
  const D = {
    // ---- navigation ----
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

    // ---- accessibility ----
    "accessibility.skip_to_content": ["Ir para o conteúdo", "Skip to content", "本文へスキップ"],
    "accessibility.breadcrumbs": ["Você está aqui", "You are here", "現在地"],
    "accessibility.pagination": ["Paginação", "Pagination", "ページ送り"],

    // ---- actions ----
    "actions.code": ["código", "Code", "コード"],
    "actions.copied": ["Copiado!", "Copied!", "コピーしました！"],
    "actions.copy": ["Copiar código", "Copy code", "コードをコピー"],
    "actions.open_docs": ["abrir docs", "Open docs", "ドキュメントを開く"],
    "actions.read_article": ["Abrir", "Read", "読む"],
    "actions.repo": ["repo", "Repo", "リポジトリ"],
    "actions.view_architecture": ["ver arquitetura", "View architecture", "アーキテクチャを見る"],
    "actions.view_project": ["Ver", "View", "見る"],
    "common.agent_generated": ["gerado por agente", "agent-generated", "エージェント生成"],

    // ---- footer ----
    "footer.blog_engine": ["blog engine", "blog engine", "ブログエンジン"],
    "footer.developed_by": ["desenvolvido por", "developed by", "開発"],

    // ---- kinds ----
    "kinds.document": ["documento", "Document", "ドキュメント"],
    "kinds.post": ["publicação", "Post", "記事"],
    "kinds.project": ["projeto", "Project", "プロジェクト"],

    // ---- pagination ----
    "pagination.next": ["próxima", "Next", "次へ"],
    "pagination.prev": ["anterior", "Previous", "前へ"],

    // ---- profile handle (kept across locales) ----
    "profile.handle": ["@nhmatsumoto · Brasil / Japão", "@nhmatsumoto · Brazil / Japan", "@nhmatsumoto · ブラジル / 日本"],
    "home.kicker": ["engineering notebook", "engineering notebook", "engineering notebook"],

    // ---- section blocks (home + listings) ----
    "sections.category_agents": ["agents", "agents", "agents"],
    "sections.category_apis": ["apis", "apis", "apis"],
    "sections.category_architecture": ["architecture", "architecture", "architecture"],
    "sections.category_domain": ["domain", "domain", "domain"],
    "sections.documents_title": ["Sistema de documentação", "Documentation system", "ドキュメントシステム"],
    "sections.documents_copy": [
      "Notas em markdown organizadas por domínio, arquitetura, agentes e APIs, com versionamento e marcação de conteúdo gerado por agente.",
      "Markdown notes organized by domain, architecture, agents and APIs, with versioning and agent-generated content tagging.",
      "ドメイン・アーキテクチャ・エージェント・APIごとに整理したMarkdownノート。バージョン管理とエージェント生成コンテンツの明示付きです。"
    ],
    "sections.navigation_kicker": ["navegação", "navigation", "ナビゲーション"],
    "sections.navigation_title": ["Sitemap e categorias", "Sitemap and categories", "サイトマップとカテゴリ"],
    "sections.navigation_copy": [
      "Links diretos para publicações, projetos, documentos e as categorias mais relevantes.",
      "Direct links to posts, projects, documents and the most relevant categories.",
      "記事・プロジェクト・ドキュメント、そして主要なカテゴリへの直接リンクです。"
    ],
    "sections.posts_title": ["Publicações recentes", "Recent posts", "最近の記事"],
    "sections.posts_copy": [
      "Textos com tempo de leitura, tags, badges e links diretos para repositórios quando fizer sentido.",
      "Writing with reading time, tags, badges and direct repository links where it makes sense.",
      "読了時間・タグ・バッジ付きの記事。必要に応じてリポジトリへの直接リンクも添えます。"
    ],
    "sections.projects_title": ["Sistemas centrais", "Core systems", "主要システム"],
    "sections.projects_copy": [
      "Projetos tratados como ativos de longo prazo: arquitetura, stack, status, roadmap e documentos de apoio.",
      "Projects treated as long-term assets: architecture, stack, status, roadmap and supporting documents.",
      "アーキテクチャ・スタック・ステータス・ロードマップ・関連ドキュメントを備えた、長期資産としてのプロジェクトです。"
    ],
    "sections.related_content": ["Continue explorando", "Keep exploring", "さらに見る"],
    "sections.related_content_copy": [
      "Conteudos conectados por tags, projeto e documentacao.",
      "Content connected by tags, project and documentation.",
      "タグ・プロジェクト・ドキュメントでつながるコンテンツです。"
    ],

    // ---- page headers ----
    "pages.fundamentals.title": ["Fundamentos e Padrões de Projeto", "Fundamentals and Design Patterns", "基礎とデザインパターン"],
    "pages.fundamentals.description": [
      "Base de engenharia de software: algoritmos, estruturas de dados, princípios de design, testes e padrões de projeto aplicados.",
      "Software engineering foundations: algorithms, data structures, design principles, testing and applied design patterns.",
      "ソフトウェア工学の基礎:アルゴリズム、データ構造、設計原則、テスト、応用デザインパターン。"
    ],
    "pages.ai.title": ["Inteligência Artificial", "Artificial Intelligence", "人工知能"],
    "pages.ai.description": [
      "Trilha de inteligência artificial do básico ao avançado: do perceptron e redes neurais até agentes e LLMs.",
      "An artificial intelligence track from basics to advanced: from the perceptron and neural networks to agents and LLMs.",
      "パーセプトロンやニューラルネットワークからエージェント、LLMまで、基礎から応用までのAIトラック。"
    ],
    "pages.archive.title": ["Todas as publicações", "All posts", "すべての記事"],
    "pages.archive.description": [
      "Fluxo de escrita sobre arquitetura, experimentos, modelagem de domínio e heurísticas operacionais.",
      "A stream of writing on architecture, experiments, domain modeling and operational heuristics.",
      "アーキテクチャ、実験、ドメインモデリング、運用のヒューリスティクスについて書き続ける場です。"
    ],
    "pages.contact.title": ["Contato", "Contact", "連絡先"],
    "pages.contact.description": [
      "Canais principais para acompanhar trabalho, conversar e seguir a trilha pública do site.",
      "Main channels to follow the work, get in touch and follow the site's public trail.",
      "仕事の様子を追い、連絡を取り、サイトの公開記録をたどるための主要なチャネルです。"
    ],
    "pages.document.kicker": ["documento", "document", "ドキュメント"],
    "pages.document.meta": ["Metadados do documento", "Document metadata", "ドキュメントのメタデータ"],
    "pages.documents.title": ["Sistema de documentos", "Document system", "ドキュメントシステム"],
    "pages.documents.description": [
      "Documentos agrupados por domínio, arquitetura, agentes e APIs para manter decisões acessíveis.",
      "Documents grouped by domain, architecture, agents and APIs to keep decisions accessible.",
      "意思決定を参照しやすく保つため、ドメイン・アーキテクチャ・エージェント・APIごとに整理したドキュメントです。"
    ],
    "pages.post.kicker": ["publicação", "post", "記事"],
    "pages.post.metadata": ["Metadados", "Metadata", "メタデータ"],
    "pages.project.impact": ["Impacto & Resultados", "Impact & Results", "インパクトと成果"],
    "pages.project.kicker": ["projeto", "project", "プロジェクト"],
    "pages.project.lessons": ["Lições Aprendidas", "Lessons Learned", "学んだこと"],
    "pages.project.stack": ["Stack", "Stack", "スタック"],
    "pages.project.status": ["Status", "Status", "ステータス"],
    "pages.project.trade_offs": ["Trade-offs & Decisões", "Trade-offs & Decisions", "トレードオフと意思決定"],
    "pages.projects.title": ["Sistemas centrais", "Core systems", "主要システム"],
    "pages.projects.description": [
      "Projetos apresentados como sistemas: problema, solução, arquitetura, stack, ADRs e roadmap.",
      "Projects presented as systems: problem, solution, architecture, stack, ADRs and roadmap.",
      "問題・解決策・アーキテクチャ・スタック・ADR・ロードマップという形で、プロジェクトをシステムとして紹介します。"
    ],

    // ---- home: start here ----
    "home.start_here_kicker": ["comece por aqui", "start here", "はじめに"],
    "home.start_here_title": ["Trilha curta de entrada", "A short starting trail", "最初のガイド"],
    "home.start_here_copy": [
      "Uma sequencia curta para entender a proposta do site, ver o sistema principal e chegar na documentacao conectada.",
      "A short sequence to understand the site, see the main system and reach the connected documentation.",
      "サイトの趣旨を理解し、主要なシステムを見て、関連ドキュメントにたどり着くための短い導線です。"
    ],

    // ---- home: profile / notebook (fixed page content) ----
    "home.profile_bio": [
      "Software engineer brasileiro no Japão. Trabalho com backend, arquitetura e APIs em .NET/C#, construindo sistemas claros, úteis e sustentáveis.",
      "Brazilian software engineer based in Japan. I work with backend, architecture and APIs in .NET/C#, building systems that are clear, useful and sustainable.",
      "日本在住のブラジル人ソフトウェアエンジニア。.NET/C#でのバックエンド・アーキテクチャ・API開発を中心に、明快で役立つ、持続可能なシステムをつくっています。"
    ],
    "home.intro_p1": [
      "Caderno técnico onde registro projetos, decisões de arquitetura e estudos sobre software e engenharia. Cada publicação documenta algo que construí, testei ou aprendi.",
      "A technical notebook where I record projects, architecture decisions and studies on software and engineering. Every post documents something I built, tested or learned.",
      "プロジェクト、アーキテクチャ上の意思決定、ソフトウェアやエンジニアリングに関する学びを記録する技術ノートです。各記事は、私がつくり、試し、学んだことの記録です。"
    ],
    "home.intro_p2": [
      "Minha base é backend em .NET/C#, com trabalho contínuo em APIs, banco de dados e front-end. Aqui a técnica se conecta a produto, contexto e à prática de construir software de verdade.",
      "My foundation is backend in .NET/C#, with ongoing work in APIs, databases and the front-end. Here the craft connects to product, context and the real practice of building software.",
      "軸は.NET/C#によるバックエンドで、API・データベース・フロントエンドにも継続的に取り組んでいます。ここでは技術を、プロダクト・文脈・実際にソフトウェアをつくる営みと結びつけています。"
    ],
    "home.stack_kicker": ["stack principal", "main stack", "主なスタック"],
    "home.profile_kicker": ["perfil profissional", "professional profile", "プロフェッショナル・プロフィール"],
    "home.profile_title": ["Senior Software Engineer", "Senior Software Engineer", "シニア・ソフトウェアエンジニア"],
    "home.profile_copy": [
      ".NET, C#, React e TypeScript aplicados a sistemas distribuídos e arquiteturas de alta performance. Mais recentemente, orquestração de agentes e avaliação de LLMs.",
      ".NET, C#, React and TypeScript applied to distributed systems and high-performance architectures. More recently, agent orchestration and LLM evaluation.",
      ".NET・C#・React・TypeScriptを、分散システムと高性能アーキテクチャに応用しています。近年はエージェントのオーケストレーションとLLMの評価にも取り組んでいます。"
    ],
    "home.profile_body": [
      "Desenvolvedor de software desde 2016, com atuação em tecnologia, manufatura, finanças, telecomunicações, educação e mobilidade urbana. Contribuí em sistemas de pagamento, plataformas de gestão escolar, soluções de telecom e aplicações de mobilidade urbana, sempre defendendo boas práticas de arquitetura como SOLID, DDD e Clean Architecture para escrever código limpo, sustentável e escalável.",
      "Software developer since 2016, working across technology, manufacturing, finance, telecommunications, education and urban mobility. I have contributed to payment systems, school management platforms, telecom solutions and urban mobility applications, always advocating architectural best practices such as SOLID, DDD and Clean Architecture to write clean, sustainable and scalable code.",
      "2016年からソフトウェア開発に携わり、テクノロジー、製造、金融、通信、教育、都市モビリティなど幅広い分野で仕事をしてきました。決済システム、学校管理プラットフォーム、通信ソリューション、都市モビリティ向けアプリなどに参加し、SOLID・DDD・クリーンアーキテクチャといった設計のベストプラクティスを重視して、クリーンで持続可能かつスケーラブルなコードを書いてきました。"
    ],
    "home.metric_since": ["atuando com software desde", "working in software since", "ソフトウェア開発歴"],
    "home.metric_sectors": ["setores de atuação", "industries worked in", "携わった業界"],
    "home.metric_english": ["inglês profissional", "professional English", "ビジネス英語"],
    "home.detail_sectors": ["setores", "industries", "業界"],
    "home.detail_focus": ["foco atual", "current focus", "現在の注力領域"],
    "home.detail_practices": ["práticas e arquitetura", "practices and architecture", "プラクティスと設計"],
    "home.detail_certs": ["certificações e formação", "certifications and education", "資格と学歴"],
    "home.sector_payments": ["Pagamentos", "Payments", "決済"],
    "home.sector_telecom": ["Telecom", "Telecom", "通信"],
    "home.sector_mobility": ["Mobilidade urbana", "Urban mobility", "都市モビリティ"],
    "home.sector_education": ["Educação", "Education", "教育"],
    "home.sector_finance": ["Finanças", "Finance", "金融"],
    "home.sector_manufacturing": ["Manufatura", "Manufacturing", "製造"],
    "home.sector_erp": ["ERP", "ERP", "ERP"],

    // ---- about (fixed page content) ----
    "about.summary": [
      "Software engineer brasileiro no Japão, com base forte em backend, arquitetura, produto e sistemas que precisam ser claros, úteis e sustentáveis.",
      "Brazilian software engineer based in Japan, with a strong foundation in backend, architecture, product and systems that need to be clear, useful and sustainable.",
      "日本在住のブラジル人ソフトウェアエンジニア。バックエンド、アーキテクチャ、プロダクト、そして明快で役立ち持続可能である必要のあるシステムに強みがあります。"
    ],
    "about.hero_kicker": ["perfil profissional", "professional profile", "プロフェッショナル・プロフィール"],
    "about.hero_title": [
      "Construo software com foco em clareza, arquitetura e impacto real.",
      "I build software focused on clarity, architecture and real impact.",
      "明快さ、アーキテクチャ、そして実際のインパクトを重視してソフトウェアをつくっています。"
    ],
    "about.hero_lede": [
      "Minha base está em backend, .NET/C#, SQL Server, arquitetura de sistemas e produto. Tenho experiência em consultoria, sistemas corporativos e projetos próprios, com interesse especial por agentes, GIS, documentação técnica e soluções que reduzem atrito operacional.",
      "My foundation is backend, .NET/C#, SQL Server, systems architecture and product. I have experience in consulting, enterprise systems and my own projects, with a special interest in agents, GIS, technical documentation and solutions that reduce operational friction.",
      "軸はバックエンド、.NET/C#、SQL Server、システムアーキテクチャ、そしてプロダクトです。コンサルティング、業務システム、個人プロジェクトの経験があり、特にエージェント、GIS、技術ドキュメント、運用の摩擦を減らすソリューションに関心があります。"
    ],
    "about.meta_1": ["Brasil -> Japão", "Brazil -> Japan", "ブラジル → 日本"],
    "about.meta_2": ["Backend & arquitetura", "Backend & architecture", "バックエンドと設計"],
    "about.meta_3": ["Produto & documentação", "Product & documentation", "プロダクトとドキュメント"],
    "about.action_projects": ["Projetos", "Projects", "プロジェクト"],
    "about.focus_kicker": ["atuação", "focus", "活動領域"],
    "about.focus_title": ["Onde eu gero valor", "Where I add value", "私が価値を生む場所"],
    "about.card1_title": ["Backend e arquitetura", "Backend and architecture", "バックエンドと設計"],
    "about.card1_body": [
      "Sistemas em .NET/C#, APIs, SQL Server, modelagem de domínio e decisões que mantêm o software compreensível.",
      "Systems in .NET/C#, APIs, SQL Server, domain modeling and decisions that keep software understandable.",
      ".NET/C#によるシステム、API、SQL Server、ドメインモデリング、そしてソフトウェアを理解しやすく保つための意思決定。"
    ],
    "about.card2_title": ["Produto e contexto", "Product and context", "プロダクトと文脈"],
    "about.card2_body": [
      "Tradução de problemas reais em fluxos, regras, dados e interfaces que ajudam uma operação a funcionar melhor.",
      "Translating real problems into flows, rules, data and interfaces that help an operation run better.",
      "現実の課題を、業務がより良く回るためのフロー・ルール・データ・インターフェースへと落とし込みます。"
    ],
    "about.card3_title": ["Escrita técnica", "Technical writing", "テクニカルライティング"],
    "about.card3_body": [
      "Documentação, artigos, decisões arquiteturais e registros que tornam conhecimento reutilizável.",
      "Documentation, articles, architectural decisions and records that make knowledge reusable.",
      "ドキュメント、記事、アーキテクチャ上の意思決定、そして知識を再利用可能にする記録。"
    ],
    "about.exp_kicker": ["trajetória", "experience", "これまでの歩み"],
    "about.exp_title": ["Experiência em resumo", "Experience in brief", "経歴の概要"],
    "about.exp1_label": ["Brasil", "Brazil", "ブラジル"],
    "about.exp1_title": [
      "Software em consultoria, produto e sistemas corporativos",
      "Software in consulting, product and enterprise systems",
      "コンサルティング、プロダクト、業務システムでのソフトウェア開発"
    ],
    "about.exp1_body": [
      "Atuação em domínios como pagamentos, mobilidade, recuperação financeira, telecom, educação, ERP e sistemas internos.",
      "Work across domains such as payments, mobility, financial recovery, telecom, education, ERP and internal systems.",
      "決済、モビリティ、債権回収、通信、教育、ERP、社内システムなど、さまざまなドメインでの実務。"
    ],
    "about.exp2_label": ["Base técnica", "Technical base", "技術的な軸"],
    "about.exp2_title": [
      "Backend, dados e arquitetura compreensível",
      "Backend, data and understandable architecture",
      "バックエンド、データ、そして理解しやすいアーキテクチャ"
    ],
    "about.exp2_body": [
      "Consolidação em .NET/C#, SQL Server, APIs, modelagem e soluções orientadas a regras de negócio.",
      "Consolidation in .NET/C#, SQL Server, APIs, modeling and business-rule-driven solutions.",
      ".NET/C#、SQL Server、API、モデリング、そしてビジネスルール駆動のソリューションでの積み重ね。"
    ],
    "about.exp3_label": ["Japão", "Japan", "日本"],
    "about.exp3_title": [
      "Disciplina operacional e visão de manufatura",
      "Operational discipline and a manufacturing perspective",
      "運用の規律と製造現場の視点"
    ],
    "about.exp3_body": [
      "Vivência em fábricas como Murata e NGK, na manufatura de componentes eletrônicos essenciais, sem abandonar o estudo e a construção em software.",
      "Experience in factories such as Murata and NGK, manufacturing essential electronic components, without ever setting aside studying and building software.",
      "村田製作所やNGKなどの工場で、重要な電子部品の製造に携わりました。その間もソフトウェアの学習と開発を続けています。"
    ],
    "about.toolkit_kicker": ["stack e interesses", "stack and interests", "スタックと関心領域"],
    "about.toolkit_title": ["Tecnologias e temas", "Technologies and topics", "技術とテーマ"],
    "about.story_kicker": ["contexto", "context", "背景"],
    "about.story_title": ["A história por trás do trabalho", "The story behind the work", "仕事の背景にある物語"],
    "about.story_p1": [
      "Venho de uma criação humilde no Brasil, filho de agricultores e estudante de escola pública. Comecei cedo na tecnologia, aprendendo HTML, CSS e JavaScript por fóruns, blogs, grupos, Stack Overflow e muita documentação em inglês.",
      "I come from a humble upbringing in Brazil, the son of farmers and a public-school student. I started early in technology, learning HTML, CSS and JavaScript through forums, blogs, groups, Stack Overflow and a lot of English documentation.",
      "ブラジルの農家に生まれ、公立学校で学んだ質素な生い立ちです。早くから技術に触れ、フォーラムやブログ、コミュニティ、Stack Overflow、そして多くの英語ドキュメントを通じてHTML・CSS・JavaScriptを学びました。"
    ],
    "about.story_p2": [
      "Minha entrada profissional em TI veio depois de uma decisão difícil: interromper um tecnólogo em ADS para focar no que podia mudar minha vida de forma mais direta naquele momento. Não foi uma saída da área, foi uma escolha prática para entrar nela.",
      "My professional start in IT came after a hard decision: pausing a Systems Development degree to focus on what could change my life more directly at that moment. It was not leaving the field, but a practical choice to enter it.",
      "IT業界でのキャリアは、難しい決断のあとに始まりました。当時、より直接的に人生を変えられることに集中するため、システム開発の学位課程を中断したのです。それは業界から離れることではなく、業界に入るための現実的な選択でした。"
    ],
    "about.story_p3": [
      "Hoje vivo no Japão e sigo com a mesma direção: voltar ao mercado de tecnologia para construir soluções úteis, humanas e bem pensadas. Este site é parte desse movimento, reunindo projetos, estudos e escrita técnica em um lugar público.",
      "Today I live in Japan and I keep the same direction: returning to the tech industry to build useful, human and well-thought-out solutions. This site is part of that move, gathering projects, studies and technical writing in one public place.",
      "現在は日本で暮らし、同じ方向を目指し続けています。役に立ち、人間的で、よく考えられたソリューションをつくるために、テクノロジー業界へ戻ること。このサイトはその一歩であり、プロジェクト・学び・技術的な文章を公開の場に集めています。"
    ],

    // ---- contact cards ----
    "contact.card_site": [
      "Entrada principal para publicações, projetos e documentos.",
      "Main entry point for posts, projects and documents.",
      "記事・プロジェクト・ドキュメントへのメイン入口です。"
    ],
    "contact.card_rss": [
      "Feed para acompanhar novas publicações sem depender de rede social.",
      "A feed to follow new posts without relying on social media.",
      "SNSに頼らず新しい記事を追えるフィードです。"
    ],
    "contact.card_linkedin": [
      "Perfil profissional e ponto direto para conversa sobre trabalho.",
      "Professional profile and a direct point for work conversations.",
      "プロフェッショナル・プロフィールであり、仕事の相談への直接の窓口です。"
    ],
    "contact.card_github": [
      "Repositórios, experimentos, engine do site e histórico público de implementação.",
      "Repositories, experiments, the site engine and a public implementation history.",
      "リポジトリ、実験、サイトのエンジン、そして公開された実装の履歴です。"
    ]
  };

  const idx = (loc) => LOCALES.indexOf(loc);

  const getLocale = () => {
    try {
      const s = window.localStorage.getItem(STORAGE_KEY);
      if (s && LOCALES.includes(s)) return s;
    } catch {}
    return "pt-BR";
  };

  const setStored = (loc) => {
    try { window.localStorage.setItem(STORAGE_KEY, loc); } catch {}
  };

  const apply = (loc) => {
    const i = idx(loc);
    if (i < 0) return;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const row = D[el.getAttribute("data-i18n")];
      if (row && typeof row[i] === "string") el.textContent = row[i];
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      const row = D[el.getAttribute("data-i18n-aria-label")];
      if (row && typeof row[i] === "string") el.setAttribute("aria-label", row[i]);
    });
    document.documentElement.setAttribute("lang", HTML_LANG[loc]);
    if (document.body) document.body.setAttribute("data-locale", loc);
    document.querySelectorAll("[data-locale-code]").forEach((el) => { el.textContent = SHORT[loc]; });
  };

  const cycle = () => {
    const next = LOCALES[(idx(getLocale()) + 1) % LOCALES.length];
    setStored(next);
    apply(next);
  };

  const init = () => {
    // Optional deep-link override: /?lang=en | ja | pt (also jp/pt-br)
    try {
      const q = new URLSearchParams(window.location.search).get("lang");
      const map = { pt: "pt-BR", "pt-br": "pt-BR", br: "pt-BR", en: "en", ja: "ja", jp: "ja" };
      if (q && map[q.toLowerCase()]) setStored(map[q.toLowerCase()]);
    } catch {}
    apply(getLocale());
    document.querySelectorAll("[data-locale-toggle]").forEach((btn) => {
      btn.addEventListener("click", cycle);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
