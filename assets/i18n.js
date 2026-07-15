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
      "Conteúdos conectados por tags, projeto e documentação.",
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
      "Engenheiro de software brasileiro no Japão. Backend em .NET/C#, arquitetura e uma preferência teimosa por sistemas claros, bem documentados e que resolvem problemas de verdade.",
      "Brazilian software engineer in Japan. Backend in .NET/C#, architecture and a stubborn preference for clear, well documented systems that solve real problems.",
      "日本在住のブラジル人ソフトウェアエンジニア。.NET/C#のバックエンドと設計を軸に、明確でよく文書化された、本当に役に立つシステムにこだわっています。"
    ],
    "about.hero_kicker": ["perfil profissional", "professional profile", "プロフェッショナル・プロフィール"],
    "about.hero_title": [
      "Gosto de pegar problemas confusos e devolver sistemas que se explicam sozinhos.",
      "I like taking messy problems and returning systems that explain themselves.",
      "複雑な問題を、自ら語るような明快なシステムに変えるのが好きです。"
    ],
    "about.hero_lede": [
      "Aprendi a programar em fóruns e documentação em inglês, trabalhei com consultoria e sistemas corporativos no Brasil e hoje vivo no Japão, onde a rotina de fábrica me ensinou uma disciplina que levo para o código. Escrevo aqui do jeito que penso: direto, com contexto e sem enfeite. Se algo não ajuda a entender ou operar um sistema, eu corto. Meus interesses atuais giram em torno de DDD, agentes de IA e a arte de documentar decisões antes que elas virem lenda.",
      "I learned to code on forums and English documentation, worked in consulting and corporate systems in Brazil, and today I live in Japan, where factory routine taught me a discipline I carry into code. I write here the way I think: direct, with context, no ornament. If something does not help to understand or operate a system, I cut it. My current interests revolve around DDD, AI agents and the craft of documenting decisions before they turn into legend.",
      "フォーラムと英語のドキュメントでプログラミングを学び、ブラジルではコンサルティングと企業システムに携わり、現在は日本で暮らしています。工場で身につけた規律を、そのままコードに持ち込んでいます。書き方も考え方と同じで、率直に、文脈を添えて、飾らずに。システムの理解や運用に役立たないものは削ります。今の関心はDDD、AIエージェント、そして意思決定が伝説になる前に文書化する技術です。"
    ],
    "about.meta_1": ["Brasil -> Japão", "Brazil -> Japan", "ブラジル → 日本"],
    "about.meta_2": ["Backend & arquitetura", "Backend & architecture", "バックエンドと設計"],
    "about.meta_3": ["Produto & documentação", "Product & documentation", "プロダクトとドキュメント"],
    "about.action_projects": ["Projetos", "Projects", "プロジェクト"],
    "about.now_kicker": ["agora", "now", "現在"],
    "about.now_title": ["No que estou de olho", "What I am up to", "いま取り組んでいること"],
    "about.now_1": [
      "Trilha de IA do site: do perceptron até LLMs, publicada em camadas.",
      "The site's AI track: from the perceptron to LLMs, published in layers.",
      "サイトのAIトラック:パーセプトロンからLLMまで段階的に公開中。"
    ],
    "about.now_2": [
      "Fundamentos e padrões de projeto como acervo vivo, não como apostila.",
      "Software fundamentals and design patterns as a living collection, not a handout.",
      "基礎とデザインパターンを、配布資料ではなく生きたアーカイブとして。"
    ],
    "about.now_3": [
      "Agentes de IA orquestrados com DDD, do vocabulário ao código.",
      "AI agents orchestrated with DDD, from vocabulary to code.",
      "DDDで編成するAIエージェント。ユビキタス言語からコードまで。"
    ],
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
    ],

    // ---- entry status ----
    "status.published": ["publicado", "published", "公開済み"],

    // ---- home: certifications ----
    "home.cert_neural": [
      "Redes Neurais Artificiais em Python",
      "Artificial Neural Networks in Python",
      "Pythonによる人工ニューラルネットワーク"
    ],
    "home.cert_aspnet": [
      "Dominando o ASP.NET MVC Core",
      "Mastering ASP.NET Core MVC",
      "ASP.NET Core MVCマスター講座"
    ],
    "home.cert_ads": [
      "Análise e Desenvolvimento de Sistemas, UNINTER (2016)",
      "Systems Analysis and Development, UNINTER (2016)",
      "システム分析・開発、UNINTER（2016年）"
    ],

    // ---- about: toolkit chips ----
    "about.chip_architecture": ["Arquitetura", "Architecture", "アーキテクチャ"],
    "about.chip_agents": ["Agentes", "Agents", "エージェント"],
    "about.chip_product": ["Produto", "Product", "プロダクト"],
    "about.chip_documentation": ["Documentação", "Documentation", "ドキュメント"],

    // ---- search palette ----
    "search.title": ["Buscar no site", "Search the site", "サイト内検索"],
    "search.hint": [
      "Digite para filtrar. Setas navegam, Enter abre e Esc fecha.",
      "Type to filter. Arrow keys navigate, Enter opens and Esc closes.",
      "入力して絞り込みます。矢印キーで移動、Enterで開き、Escで閉じます。"
    ],
    "search.empty": [
      "Nenhum resultado encontrado.",
      "No results found.",
      "検索結果がありません。"
    ],
    "search.placeholder": [
      "Buscar publicações, projetos, documentos e notas",
      "Search posts, projects, documents and notes",
      "記事・プロジェクト・ドキュメント・ノートを検索"
    ],
    "search.aria_dialog": ["Busca", "Search", "検索"],
    "search.aria_close": ["Fechar busca", "Close search", "検索を閉じる"],
    // ---- project descriptions ----
    "projects.lede_nhmatsumoto_github_io": [
      "Technical Knowledge OS — blog e portfolio com engine de geração estática e navegação estruturada.",
      "Technical Knowledge OS — a blog and portfolio with a static-generation engine and structured navigation.",
      "Technical Knowledge OS — 静的生成エンジンと構造化ナビゲーションを備えたブログ兼ポートフォリオです。"
    ],
    "projects.lede_splitcosts": [
      "Compartilhamento de despesas com foco em clareza, fronteiras de tenancy e simplicidade operacional.",
      "Expense sharing focused on clarity, tenancy boundaries and operational simplicity.",
      "明快さ、テナント境界、運用のシンプルさを重視した支出共有システムです。"
    ],
    "projects.lede_gis_incident_lab": [
      "Mapeamento operacional para resposta a incidentes, análise de risco e pipelines espaciais.",
      "Operational mapping for incident response, risk analysis and spatial pipelines.",
      "インシデント対応、リスク分析、空間データパイプラインのための運用マッピングです。"
    ],
    "projects.lede_brumadinho_location": [
      "Ferramentas para ajudar no resgate e localização das vítimas do rompimento da barragem de Brumadinho/MG.",
      "Tools to support the rescue and location of victims of the Brumadinho dam collapse in Minas Gerais.",
      "ミナスジェライス州ブルマジーニョのダム決壊事故で、被災者の救助と位置特定を支援するツールです。"
    ],
    "projects.lede_apollo_11": [
      "Código-fonte original do Apollo 11 Guidance Computer (AGC) para os módulos de comando e lunar.",
      "Original source code of the Apollo 11 Guidance Computer (AGC) for the command and lunar modules.",
      "アポロ11号の司令船・月着陸船向け誘導コンピューター（AGC）のオリジナルソースコードです。"
    ],
    "projects.lede_automapper": [
      "Mapeador objeto-para-objeto baseado em convenções para .NET.",
      "A convention-based object-to-object mapper for .NET.",
      "規約ベースの.NET向けオブジェクト間マッパーです。"
    ],
    "projects.lede_chess": [
      "Implementação de xadrez em C# com modelagem de domínio orientada a regras.",
      "A chess implementation in C# with rule-driven domain modeling.",
      "ルール駆動のドメインモデリングによるC#のチェス実装です。"
    ],
    "projects.lede_claw_code": [
      "Better Harness Tools — ferramentas para análise e experimentação com Claude Code, em reescrita para Rust.",
      "Better Harness Tools: tooling for analysis and experimentation with Claude Code, being rewritten in Rust.",
      "Better Harness Tools。Claude Codeの分析と実験のためのツール群で、Rustへ書き換え中です。"
    ],
    "projects.lede_deepseek_v3": [
      "Referência de implementação do modelo DeepSeek-V3 — arquitetura Mixture-of-Experts para LLMs de larga escala.",
      "Reference implementation of the DeepSeek-V3 model: a Mixture-of-Experts architecture for large-scale LLMs.",
      "DeepSeek-V3モデルのリファレンス実装。大規模LLM向けのMixture-of-Expertsアーキテクチャです。"
    ],
    "projects.lede_financial": [
      "Monolito para gestão financeira pessoal em C#/.NET.",
      "A monolith for personal finance management in C#/.NET.",
      "C#/.NETによる個人資産管理のモノリスです。"
    ],
    "projects.lede_gaussian_splatting": [
      "Implementação de referência de 3D Gaussian Splatting para renderização de campos de radiância em tempo real.",
      "Reference implementation of 3D Gaussian Splatting for real-time radiance field rendering.",
      "リアルタイム放射輝度場レンダリングのための3D Gaussian Splattingのリファレンス実装です。"
    ],
    "projects.lede_gemini_cli": [
      "Agente de IA open-source que traz o poder do Gemini direto para o terminal.",
      "An open-source AI agent that brings the power of Gemini straight to the terminal.",
      "Geminiの力をターミナルへ直接届けるオープンソースAIエージェントです。"
    ],
    "projects.lede_java_servlet_pages": [
      "Aplicação web com Java Servlets e JSP — fundamentos de desenvolvimento web no ecossistema Java.",
      "A web application built with Java Servlets and JSP: web development fundamentals in the Java ecosystem.",
      "Java ServletsとJSPによるWebアプリケーション。JavaエコシステムにおけるWeb開発の基礎です。"
    ],
    "projects.lede_leaflet": [
      "Biblioteca JavaScript para mapas interativos mobile-friendly — referência para projetos GIS.",
      "A JavaScript library for mobile-friendly interactive maps and a reference for GIS projects.",
      "モバイル対応のインタラクティブ地図のためのJavaScriptライブラリ。GISプロジェクトの定番です。"
    ],
    "projects.lede_macos": [
      "macOS virtualizado dentro de um container Docker — experimentação com virtualização de sistemas operacionais.",
      "Virtualized macOS inside a Docker container: experimenting with operating system virtualization.",
      "Dockerコンテナ内で仮想化されたmacOS。OS仮想化の実験です。"
    ],
    "projects.lede_maplebr": [
      "Projeto MapleBR — servidor e ferramentas para o ecossistema MapleStory.",
      "The MapleBR project: server and tooling for the MapleStory ecosystem.",
      "MapleBRプロジェクト。MapleStoryエコシステム向けのサーバーとツール群です。"
    ],
    "projects.lede_mermaid_live_editor": [
      "Editor ao vivo para criação, preview e compartilhamento de diagramas Mermaid.",
      "A live editor for creating, previewing and sharing Mermaid diagrams.",
      "Mermaid図の作成、プレビュー、共有のためのライブエディタです。"
    ],
    "projects.lede_mermaid": [
      "Geração de diagramas como fluxogramas e diagramas de sequência a partir de texto, similar a markdown.",
      "Generates diagrams such as flowcharts and sequence diagrams from markdown-like text.",
      "Markdownに似たテキストからフローチャートやシーケンス図などを生成します。"
    ],
    "projects.lede_nhmatsumoto_exception_middleware": [
      "GlobalExceptionMiddleware para .NET Core — tratamento centralizado de exceções em APIs.",
      "GlobalExceptionMiddleware for .NET Core: centralized exception handling for APIs.",
      ".NET Core向けGlobalExceptionMiddleware。APIの例外を一元的に処理します。"
    ],
    "projects.lede_playground_fe": [
      "Frontend React/TypeScript com integração Keycloak — base para aplicações com controle de acesso.",
      "A React/TypeScript frontend with Keycloak integration: a base for applications with access control.",
      "Keycloakと連携するReact/TypeScriptフロントエンド。アクセス制御を備えたアプリケーションの土台です。"
    ],
    "projects.lede_prog_lib": [
      "Biblioteca de referência com algoritmos e estruturas de dados para estudo e consulta.",
      "A reference library of algorithms and data structures for study and consultation.",
      "学習と参照のためのアルゴリズムとデータ構造のリファレンスライブラリです。"
    ],
    "projects.lede_quickreaderv1": [
      "Aplicação de leitura rápida em TypeScript — speed reading com chunking de texto.",
      "A speed reading application in TypeScript with text chunking.",
      "テキストのチャンク化による、TypeScript製の速読アプリです。"
    ],
    "projects.lede_react_data_grid": [
      "Componente React de data grid com funcionalidades avançadas e alta customização.",
      "A React data grid component with advanced features and deep customization.",
      "高度な機能と高いカスタマイズ性を備えたReactのデータグリッドコンポーネントです。"
    ],
    "projects.lede_responsemiddleware": [
      "Middleware de padronização de respostas HTTP para APIs .NET Core.",
      "HTTP response standardization middleware for .NET Core APIs.",
      ".NET Core APIのHTTPレスポンスを標準化するミドルウェアです。"
    ],
    "projects.lede_security_jwt": [
      "JWT Manager para .NET — rotação automática de chaves, suporte a JWKS e armazenamento seguro de chaves criptográficas.",
      "A JWT manager for .NET: automatic key rotation, JWKS support and secure storage of cryptographic keys.",
      ".NET向けJWTマネージャー。鍵の自動ローテーション、JWKS対応、暗号鍵の安全な保管を備えます。"
    ],
    "projects.lede_sos": [
      "Módulo auxiliar do ecossistema SOS Location — componentes compartilhados para resposta a desastres.",
      "An auxiliary module of the SOS Location ecosystem: shared components for disaster response.",
      "SOS Locationエコシステムの補助モジュール。災害対応のための共有コンポーネントです。"
    ],
    "projects.lede_splitcost_backend": [
      "Backend do SplitCosts — API .NET com multi-tenant, domain events e projeções de leitura.",
      "The SplitCosts backend: a .NET API with multi-tenancy, domain events and read projections.",
      "SplitCostsのバックエンド。マルチテナント、ドメインイベント、読み取りプロジェクションを備えた.NET APIです。"
    ],
    "projects.lede_splitcosts_fe": [
      "Frontend do SplitCosts — SPA React/TypeScript com UX focada em clareza operacional.",
      "The SplitCosts frontend: a React/TypeScript SPA with UX focused on operational clarity.",
      "SplitCostsのフロントエンド。運用の明快さを重視したUXのReact/TypeScript SPAです。"
    ],
    "projects.lede_system_prompts_and_models_of_ai_tools": [
      "Coleção completa de system prompts, tools e modelos de AI tools como v0, Cursor, Devin, Replit e outros.",
      "A complete collection of system prompts, tools and models of AI tools such as v0, Cursor, Devin and Replit.",
      "v0、Cursor、Devin、ReplitなどのAIツールのシステムプロンプト、ツール、モデルの網羅的なコレクションです。"
    ],
    "projects.lede_user_auth": [
      "Serviço de autenticação em TypeScript — gestão de usuários, sessões e integração com identity providers.",
      "An authentication service in TypeScript: user management, sessions and identity provider integration.",
      "TypeScript製の認証サービス。ユーザー管理、セッション、IDプロバイダー連携を担います。"
    ],
    // ---- post and document titles/summaries ----
    "documents.title_adr_versioned_memory": [
      "ADR 003 - Memória Versionada",
      "ADR 003 - Versioned Memory",
      "ADR 003 - バージョン管理されたメモリ"
    ],
    "documents.lede_adr_versioned_memory": [
      "Decisão arquitetural sobre snapshots de memória e persistência de contexto em workflows com agentes.",
      "Architectural decision on memory snapshots and context persistence in agent workflows.",
      "エージェントワークフローにおけるメモリスナップショットとコンテキスト永続化に関するアーキテクチャ決定です。"
    ],
    "documents.title_agent_integration_surface": [
      "Superfície de Integração de Agentes",
      "Agent Integration Surface",
      "エージェント統合サーフェス"
    ],
    "documents.lede_agent_integration_surface": [
      "Contratos mínimos para expor ferramentas e serviços a um runtime orientado a agentes.",
      "Minimal contracts for exposing tools and services to an agent-oriented runtime.",
      "エージェント指向ランタイムへツールやサービスを公開するための最小限の契約です。"
    ],
    "documents.title_ronaldinho_architecture_overview": [
      "Visão Geral da Arquitetura do Ronaldinho",
      "Ronaldinho Architecture Overview",
      "Ronaldinhoアーキテクチャ概要"
    ],
    "documents.lede_ronaldinho_architecture_overview": [
      "Resumo da arquitetura do Ronaldinho Agent e das escolhas de modularidade do runtime.",
      "A summary of the Ronaldinho Agent architecture and the runtime modularity choices.",
      "Ronaldinho Agentのアーキテクチャとランタイムのモジュール性に関する選択のまとめです。"
    ],
    "documents.title_system_architecture": [
      "Arquitetura do Sistema",
      "System Architecture",
      "システムアーキテクチャ"
    ],
    "documents.lede_system_architecture": [
      "Visão estrutural das fronteiras do sistema e do racional arquitetural do projeto.",
      "A structural view of the system boundaries and the project's architectural rationale.",
      "システム境界とプロジェクトのアーキテクチャ上の根拠を構造的に示します。"
    ],
    "documents.title_technical_knowledge_os": [
      "Technical Knowledge OS",
      "Technical Knowledge OS",
      "Technical Knowledge OS"
    ],
    "documents.lede_technical_knowledge_os": [
      "A definição operacional do blog como sistema vivo de documentação técnica.",
      "The operational definition of the blog as a living technical documentation system.",
      "生きた技術ドキュメントシステムとしてのブログの運用上の定義です。"
    ],
    "posts.title_2026_04_03_0800_dapper_vs_efcore_dapper_vs_efcore_performance": [
      "Dapper vs EF Core: Quando a Performance Supera a Abstração",
      "Dapper vs EF Core: When Performance Outweighs Abstraction",
      "Dapper vs EF Core：パフォーマンスが抽象化を上回るとき"
    ],
    "posts.lede_2026_04_03_0800_dapper_vs_efcore_dapper_vs_efcore_performance": [
      "Uma análise comparativa sobre ORMs no ecossistema .NET, focando em ciclos de vida de objetos, rastreamento e overhead de consulta.",
      "A comparative analysis of ORMs in the .NET ecosystem, focusing on object lifecycles, change tracking and query overhead.",
      ".NETエコシステムのORMを比較分析し、オブジェクトのライフサイクル、変更追跡、クエリのオーバーヘッドに注目します。"
    ],
    "posts.title_2026_04_03_0810_clean_code_solid_boas_praticas_clean_code_solid": [
      "Clean Code & SOLID: O Custo da Dívida Técnica",
      "Clean Code & SOLID: The Cost of Technical Debt",
      "Clean Code & SOLID：技術的負債のコスト"
    ],
    "posts.lede_2026_04_03_0810_clean_code_solid_boas_praticas_clean_code_solid": [
      "Uma análise sobre a manutenibilidade de longo prazo, de nomes de variáveis expressivos aos cinco princípios de arquitetura de classes.",
      "A look at long-term maintainability, from expressive variable names to the five principles of class architecture.",
      "表現力のある変数名からクラス設計の5原則まで、長期的な保守性を考察します。"
    ],
    "posts.title_2026_04_03_0820_design_patterns_design_patterns_gang_of_four_moderno": [
      "Design Patterns: O que ainda é Relevante no C# Moderno?",
      "Design Patterns: What Still Matters in Modern C#?",
      "デザインパターン：モダンC#で今も有効なものは？"
    ],
    "posts.lede_2026_04_03_0820_design_patterns_design_patterns_gang_of_four_moderno": [
      "Uma revisão crítica dos padrões GoF, analisando como o C# 12 e 13 tornaram alguns obsoletos através de registros e correspondência de padrões.",
      "A critical review of the GoF patterns, examining how C# 12 and 13 made some of them obsolete through records and pattern matching.",
      "GoFパターンを批判的に見直し、C# 12と13のレコードやパターンマッチングによって一部が不要になった経緯を検証します。"
    ],
    "posts.title_2026_04_03_0830_engenharia_cognitiva_engenharia_cognitive_agentes_ia": [
      "Engenharia Cognitiva: Como Agentes de IA 'Pensam'",
      "Cognitive Engineering: How AI Agents 'Think'",
      "認知エンジニアリング：AIエージェントはどう「考える」のか"
    ],
    "posts.lede_2026_04_03_0830_engenharia_cognitiva_engenharia_cognitive_agentes_ia": [
      "Uma análise sobre a orquestração de pensamento em LLMs, do ciclo Percepção-Ação à estrutura de memória de curto e longo prazo (RAG).",
      "An analysis of thought orchestration in LLMs, from the perception-action loop to short and long-term memory structures (RAG).",
      "知覚と行動のループから短期・長期記憶の構造（RAG）まで、LLMにおける思考のオーケストレーションを分析します。"
    ],
    "posts.title_2026_04_03_0840_flutter_dart_flutter_arquitetura_dart": [
      "Flutter & Dart: Arquitetura de Estados e Performance Mobile",
      "Flutter & Dart: State Architecture and Mobile Performance",
      "Flutter & Dart：状態管理アーキテクチャとモバイルパフォーマンス"
    ],
    "posts.lede_2026_04_03_0840_flutter_dart_flutter_arquitetura_dart": [
      "Uma análise técnica sobre a renderização do Skia/Impeller e como padrões como Riverpod e Bloc afetam o ciclo de vida do widget.",
      "A technical look at Skia/Impeller rendering and how patterns like Riverpod and Bloc affect the widget lifecycle.",
      "Skia/Impellerのレンダリングと、RiverpodやBlocのようなパターンがウィジェットのライフサイクルへ与える影響を技術的に解説します。"
    ],
    "posts.title_2026_04_03_0850_performance_dotnet_performance_dotnet_pre_compilacao": [
      "Performance no .NET: JIT, AOT e o Custo da Alocação de Memória",
      ".NET Performance: JIT, AOT and the Cost of Memory Allocation",
      ".NETパフォーマンス：JIT、AOT、メモリ割り当てのコスト"
    ],
    "posts.lede_2026_04_03_0850_performance_dotnet_performance_dotnet_pre_compilacao": [
      "Uma análise profunda sobre o runtime do .NET, focando em Garbage Collector (GC), Just-In-Time compilation e Native AOT para microsserviços.",
      "A deep dive into the .NET runtime, focusing on the Garbage Collector (GC), Just-In-Time compilation and Native AOT for microservices.",
      "ガベージコレクター（GC）、Just-In-Timeコンパイル、マイクロサービス向けNative AOTに注目した.NETランタイムの詳細な分析です。"
    ],
    "posts.title_2026_04_03_0900_orquestrador_agentes_ddd": [
      "Orquestrador de agentes com DDD: traduzindo linguagem natural em Linguagem Ubíqua",
      "Agent orchestration with DDD: translating natural language into Ubiquitous Language",
      "DDDによるエージェントオーケストレーション：自然言語をユビキタス言語へ変換する"
    ],
    "posts.lede_2026_04_03_0900_orquestrador_agentes_ddd": [
      "Documento técnico sobre como converter linguagem natural em artefatos de DDD usando orquestração de múltiplos agentes de IA.",
      "A technical document on converting natural language into DDD artifacts using multi-agent AI orchestration.",
      "複数のAIエージェントによるオーケストレーションで、自然言語をDDDの成果物へ変換する方法を扱う技術ドキュメントです。"
    ],
    "posts.title_2026_04_03_0900_redes_neurais_redes_neurais_do_zero_python": [
      "Redes Neurais do Zero: Implementação Matemática em Python",
      "Neural Networks from Scratch: A Mathematical Implementation in Python",
      "ゼロから作るニューラルネットワーク：Pythonによる数学的実装"
    ],
    "posts.lede_2026_04_03_0900_redes_neurais_redes_neurais_do_zero_python": [
      "Uma jornada do neurônio de McCulloch-Pitts ao Backpropagation, implementando uma rede neural densa usando apenas NumPy.",
      "A journey from the McCulloch-Pitts neuron to backpropagation, implementing a dense neural network using only NumPy.",
      "McCulloch-Pittsニューロンからバックプロパゲーションまで、NumPyだけで全結合ニューラルネットワークを実装する旅です。"
    ],
    "posts.title_2026_04_03_0910_sistemas_de_tipagem_sistemas_de_tipagem_estatico_vs_dinamico": [
      "Sistemas de Tipagem: Estático vs Dinâmico - Tradeoffs Semânticos",
      "Type Systems: Static vs Dynamic - Semantic Tradeoffs",
      "型システム：静的 vs 動的 - セマンティクスのトレードオフ"
    ],
    "posts.lede_2026_04_03_0910_sistemas_de_tipagem_sistemas_de_tipagem_estatico_vs_dinamico": [
      "Uma análise sobre a segurança de tempo de compilação versus a agilidade de tempo de execução, explorando tipagem forte, fraca e duck typing.",
      "An analysis of compile-time safety versus runtime agility, exploring strong and weak typing and duck typing.",
      "コンパイル時の安全性と実行時の柔軟性を比較し、強い型付け、弱い型付け、ダックタイピングを探ります。"
    ],
    "posts.title_2026_04_03_0920_tdd_tdd_ciclo_vermelho_verde_refactor": [
      "TDD: O Ciclo Red-Green-Refactor como Proteção de Domínio",
      "TDD: The Red-Green-Refactor Cycle as Domain Protection",
      "TDD：ドメインを守るRed-Green-Refactorサイクル"
    ],
    "posts.lede_2026_04_03_0920_tdd_tdd_ciclo_vermelho_verde_refactor": [
      "Uma análise técnica sobre o Test-Driven Development, de como testes falhos garantem que o código realmente funciona ao refactor seguro.",
      "A technical look at Test-Driven Development, from how failing tests prove the code really works to safe refactoring.",
      "失敗するテストがコードの正しさを保証する仕組みから安全なリファクタリングまで、テスト駆動開発を技術的に解説します。"
    ],
    "posts.title_2026_04_03_0930_typescript_avancado_typescript_tipagem_avancada": [
      "TypeScript Avançado: Mapeamento de Tipos e Generics Complexos",
      "Advanced TypeScript: Mapped Types and Complex Generics",
      "上級TypeScript：マップ型と複雑なジェネリクス"
    ],
    "posts.lede_2026_04_03_0930_typescript_avancado_typescript_tipagem_avancada": [
      "Uma análise profunda sobre o sistema de tipos Turing-complete do TypeScript, explorando tipos condicionais, inferência e utilitários de transformação.",
      "A deep dive into TypeScript's Turing-complete type system, exploring conditional types, inference and transformation utilities.",
      "条件型、型推論、変換ユーティリティを探りながら、チューリング完全なTypeScriptの型システムを深く掘り下げます。"
    ],
    "posts.title_2026_04_03_1000_neuroplasticidade_agentes": [
      "“Neuroplasticidade” em sistemas de agentes: feedback, memória e melhoria contínua",
      "“Neuroplasticity” in agent systems: feedback, memory and continuous improvement",
      "エージェントシステムにおける「神経可塑性」：フィードバック、メモリ、継続的改善"
    ],
    "posts.lede_2026_04_03_1000_neuroplasticidade_agentes": [
      "Uma proposta de arquitetura para agentes de IA que aprendem e evoluem através de ciclos de feedback e memória curada.",
      "A proposed architecture for AI agents that learn and evolve through feedback loops and curated memory.",
      "フィードバックループとキュレーションされたメモリを通じて学習し進化するAIエージェントのアーキテクチャ提案です。"
    ],
    "posts.title_2026_04_03_1100_poc_minerando_logs": [
      "PoC: minerando logs de conversas para gerar posts com rastreabilidade e privacidade (LGPD)",
      "PoC: mining conversation logs to generate posts with traceability and privacy (LGPD)",
      "PoC：会話ログをマイニングし、追跡可能性とプライバシー（LGPD）を備えた記事を生成する"
    ],
    "posts.lede_2026_04_03_1100_poc_minerando_logs": [
      "Documento conceitual sobre como extrair conhecimento técnico de logs de chat anonimizados e transformá-los em conteúdo publicável.",
      "A conceptual document on extracting technical knowledge from anonymized chat logs and turning it into publishable content.",
      "匿名化されたチャットログから技術的知見を抽出し、公開可能なコンテンツへ変換する方法の概念ドキュメントです。"
    ],
    "posts.title_2026_04_03_1200_fluxo_pensamento_agentes": [
      "A anatomia do pensamento em agentes: transformando intenção em execução",
      "The anatomy of agent thinking: turning intention into execution",
      "エージェント思考の解剖学：意図を実行へ変える"
    ],
    "posts.lede_2026_04_03_1200_fluxo_pensamento_agentes": [
      "Uma análise sobre como o 'Chain of Thought' e a estruturação de planos permitem que agentes de IA resolvam tarefas complexas com precisão.",
      "An analysis of how Chain of Thought and structured planning let AI agents solve complex tasks with precision.",
      "Chain of Thoughtと構造化されたプランニングによって、AIエージェントが複雑なタスクを正確に解決する仕組みを分析します。"
    ],
    "posts.title_2026_04_03_1600_sistemas_orientados_a_filas": [
      "Resiliência e Escala: Sistemas orientados a Filas de Mensageria",
      "Resilience and Scale: Message Queue-Oriented Systems",
      "レジリエンスとスケール：メッセージキュー指向システム"
    ],
    "posts.lede_2026_04_03_1600_sistemas_orientados_a_filas": [
      "Por que desacoplar sistemas com filas (RabbitMQ, Azure Service Bus) é o segredo para arquiteturas distribuídas inquebráveis.",
      "Why decoupling systems with queues (RabbitMQ, Azure Service Bus) is the secret to unbreakable distributed architectures.",
      "キュー（RabbitMQ、Azure Service Bus）によるシステムの疎結合化が、壊れない分散アーキテクチャの鍵である理由です。"
    ],
    "posts.title_2026_04_03_2000_algoritmos_busca_ordenacao_com_big_o": [
      "Algoritmos e Big O: Entendendo a Eficiência do Código",
      "Algorithms and Big O: Understanding Code Efficiency",
      "アルゴリズムとBig O：コードの効率を理解する"
    ],
    "posts.lede_2026_04_03_2000_algoritmos_busca_ordenacao_com_big_o": [
      "Uma introdução intuitiva à complexidade de algoritmos (Tempo e Espaço) e por que o Big O é a métrica definitiva para escalabilidade.",
      "An intuitive introduction to algorithm complexity (time and space) and why Big O is the definitive metric for scalability.",
      "アルゴリズムの計算量（時間と空間）を直感的に紹介し、Big Oがスケーラビリティの決定的な指標である理由を説明します。"
    ],
    "posts.title_2026_04_03_2100_estruturas_de_dados_pilha_fila_arvores": [
      "Excelência em Dados: Pilhas, Filas e Árvores",
      "Excellence in Data: Stacks, Queues and Trees",
      "データの卓越性：スタック、キュー、木構造"
    ],
    "posts.lede_2026_04_03_2100_estruturas_de_dados_pilha_fila_arvores": [
      "Por que a escolha da estrutura de dados correta é mais importante do que o próprio algoritmo para a performance de sistemas complexos.",
      "Why choosing the right data structure matters more than the algorithm itself for the performance of complex systems.",
      "複雑なシステムのパフォーマンスにおいて、適切なデータ構造の選択がアルゴリズムそのものより重要である理由です。"
    ],
    "posts.title_2026_04_03_2300_simulacao_fisica_particulas_monte_carlo": [
      "Simulação de Partículas: O poder dos Métodos de Monte Carlo",
      "Particle Simulation: The Power of Monte Carlo Methods",
      "粒子シミュレーション：モンテカルロ法の力"
    ],
    "posts.lede_2026_04_03_2300_simulacao_fisica_particulas_monte_carlo": [
      "Explorando a simulação do universo e sistemas complexos usando estatística, caminhos aleatórios e leis da física codificadas.",
      "Exploring the simulation of the universe and complex systems using statistics, random walks and encoded laws of physics.",
      "統計、ランダムウォーク、コード化された物理法則を使って、宇宙と複雑系のシミュレーションを探ります。"
    ],
    "posts.title_2026_04_03_2600_ia_inspirada_pela_fisica_redes_neurais": [
      "IA Inspirada pela Física: Entropia e Energia nas Redes Neurais",
      "Physics-Inspired AI: Entropy and Energy in Neural Networks",
      "物理に着想を得たAI：ニューラルネットワークにおけるエントロピーとエネルギー"
    ],
    "posts.lede_2026_04_03_2600_ia_inspirada_pela_fisica_redes_neurais": [
      "Como conceitos térmicos e de mecânica estatística moldam o treinamento de IAs modernas, de Hopfield Networks a Diffusion Models.",
      "How thermal and statistical mechanics concepts shape the training of modern AIs, from Hopfield Networks to Diffusion Models.",
      "Hopfield NetworksからDiffusion Modelsまで、熱力学と統計力学の概念が現代のAI学習をどう形づくるかを解説します。"
    ],
    "posts.title_2026_04_05_0400_biomatematica_araucaria_biomatematica_araucaria_angustifolia": [
      "A Bio-matemática da Araucária: Modelagem e Simetria",
      "The Biomathematics of the Araucaria: Modeling and Symmetry",
      "アラウカリアのバイオ数学：モデリングと対称性"
    ],
    "posts.lede_2026_04_05_0400_biomatematica_araucaria_biomatematica_araucaria_angustifolia": [
      "Uma exploração sobre os padrões matemáticos que regem a estrutura da Araucaria angustifolia, de verticilos a séries exponenciais de crescimento.",
      "An exploration of the mathematical patterns behind the structure of Araucaria angustifolia, from whorls to exponential growth series.",
      "輪生から指数的な成長系列まで、Araucaria angustifoliaの構造を支配する数学的パターンを探ります。"
    ],
    "posts.title_20260402_203000_ddd_boundaries_for_agent_systems": [
      "Limites de DDD para sistemas com agentes",
      "DDD boundaries for agent systems",
      "エージェントシステムのためのDDD境界"
    ],
    "posts.lede_20260402_203000_ddd_boundaries_for_agent_systems": [
      "Notas práticas sobre como separar domínio, execução de tools e políticas de coordenação em sistemas com agentes.",
      "Practical notes on separating domain, tool execution and coordination policies in agent systems.",
      "エージェントシステムにおいて、ドメイン、ツール実行、調整ポリシーを分離するための実践ノートです。"
    ],
    "posts.title_20260404_artificial_pulse_tech_tecnologia_pulso_hemp_hpm": [
      "Tecnologia de Pulso: Do HEMP ao Micro-ondas de Alta Potência",
      "Pulse Technology: From HEMP to High-Power Microwaves",
      "パルス技術：HEMPから高出力マイクロ波まで"
    ],
    "posts.lede_20260404_artificial_pulse_tech_tecnologia_pulso_hemp_hpm": [
      "Uma análise técnica sobre a geração artificial de pulsos eletromagnéticos, do Efeito Compton ao Gerador de Compressão de Fluxo.",
      "A technical analysis of artificial electromagnetic pulse generation, from the Compton Effect to the Flux Compression Generator.",
      "コンプトン効果から磁束圧縮発生器まで、人工的な電磁パルス生成の技術的分析です。"
    ],
    "posts.title_20260404_astro_electromagnetics_sopros_estelares_astrofisica_impulso": [
      "Sopros Estelares: De Supernovas a Space Weather",
      "Stellar Bursts: From Supernovae to Space Weather",
      "星々の息吹：超新星から宇宙天気まで"
    ],
    "posts.lede_20260404_astro_electromagnetics_sopros_estelares_astrofisica_impulso": [
      "Anatomia dos fenômenos astrofísicos que geram emissões eletromagnéticas extremas e seu impacto nos sistemas tecnológicos.",
      "The anatomy of astrophysical phenomena that produce extreme electromagnetic emissions and their impact on technological systems.",
      "極端な電磁放射を生む天体物理現象の構造と、それが技術システムへ与える影響です。"
    ],
    "posts.title_20260404_demp_physics_fisica_demp_pulsos_dispersos": [
      "A Física dos Pulsos Dispersos: Além do EMP Convencional",
      "The Physics of Dispersed Pulses: Beyond Conventional EMP",
      "分散パルスの物理学：従来のEMPを超えて"
    ],
    "posts.lede_20260404_demp_physics_fisica_demp_pulsos_dispersos": [
      "Uma exploração profunda sobre os fenômenos de DEMP, GRBs e a dissipação de pulsos eletromagnéticos em meios dispersivos.",
      "A deep exploration of DEMP phenomena, GRBs and the dissipation of electromagnetic pulses in dispersive media.",
      "DEMP現象、ガンマ線バースト、分散性媒質における電磁パルスの減衰を深く探ります。"
    ],
    "posts.title_20260404_electromagnetic_resilience_resiliencia_eletromagnetica_acoplamento": [
      "Engenharia de Resiliência Eletromagnética e Acoplamento",
      "Electromagnetic Resilience Engineering and Coupling",
      "電磁レジリエンス工学とカップリング"
    ],
    "posts.lede_20260404_electromagnetic_resilience_resiliencia_eletromagnetica_acoplamento": [
      "Do ponto zero à ruptura de junções: como circuitos reais falham sob transientes de alta intensidade.",
      "From ground zero to junction breakdown: how real circuits fail under high-intensity transients.",
      "爆心地から接合部の破壊まで、実際の回路が高強度トランジェントの下でどう故障するかを解説します。"
    ],
    "posts.title_20260406_093000_ronaldinho_agent_persona_tooling": [
      "Ronaldinho Agent: persona, memória curta e tool use sem virar produto separado",
      "Ronaldinho Agent: persona, short-term memory and tool use without becoming a separate product",
      "Ronaldinho Agent：ペルソナ、短期記憶、ツール使用を別プロダクト化せずに実現する"
    ],
    "posts.lede_20260406_093000_ronaldinho_agent_persona_tooling": [
      "Registro do ronaldinho-agent como experimento de engenharia de agentes: o que foi validado, quais trade-offs apareceram e por que ele faz mais sentido como publicação do que como rota principal do site.",
      "A record of the ronaldinho-agent as an agent engineering experiment: what was validated, which trade-offs emerged and why it makes more sense as a publication than as the site's main route.",
      "エージェントエンジニアリングの実験としてのronaldinho-agentの記録。何が検証され、どんなトレードオフが現れ、なぜサイトのメインルートではなく記事として残すのが妥当なのかをまとめます。"
    ]
  };

  // template per locale for [data-reading-time]; {n} is the minute count
  const READING_TIME = ["{n} min de leitura", "{n} min read", "読了時間 {n}分"];

  // month names per locale for [data-localize-date]
  const MONTHS_SHORT = {
    "pt-BR": ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  };
  const MONTHS_LONG = {
    "pt-BR": ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  };

  const formatDate = (iso, variant, loc) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return null;
    const [, y, mo, d] = m;
    const mi = parseInt(mo, 10) - 1;
    const day = parseInt(d, 10);
    if (loc === "ja") return `${y}年${mi + 1}月${day}日`;
    if (loc === "en") {
      return variant === "long"
        ? `${MONTHS_LONG.en[mi]} ${day}, ${y}`
        : `${MONTHS_SHORT.en[mi]} ${day}, ${y}`;
    }
    return variant === "long"
      ? `${day} de ${MONTHS_LONG["pt-BR"][mi]} de ${y}`
      : `${d} ${MONTHS_SHORT["pt-BR"][mi]} ${y}`;
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
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const row = D[el.getAttribute("data-i18n-placeholder")];
      if (row && typeof row[i] === "string") el.setAttribute("placeholder", row[i]);
    });
    document.querySelectorAll("[data-status-key]").forEach((el) => {
      const row = D[el.getAttribute("data-status-key")];
      if (row && typeof row[i] === "string") el.textContent = row[i];
    });
    document.querySelectorAll("[data-reading-time]").forEach((el) => {
      const n = el.getAttribute("data-reading-time");
      if (n) el.textContent = READING_TIME[i].replace("{n}", n);
    });
    document.querySelectorAll("[data-localize-date]").forEach((el) => {
      const out = formatDate(el.getAttribute("datetime"), el.getAttribute("data-localize-date"), loc);
      if (out) el.textContent = out;
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

  // lets scripts that inject markup later (e.g. the search palette) re-apply
  window.__i18nApply = () => apply(getLocale());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
