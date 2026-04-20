"""Apply i18n title/summary translations to TOML content files.

The engine normalizes `en-US` → `en_us` when resolving `title_<locale>` keys
(see scripts/engine/i18n.py :: locale_suffixes and assets/blog.js ::
localeFieldKeys). So localized TOML fields MUST use lowercase+underscore
suffixes: `title_en_us`, `summary_ja_jp`, etc.

Line-based insertion preserving file ordering and body strings. Skips fields
that are already present. Also cleans up legacy dash/uppercase suffixes
(`title_en-US`) that the resolver cannot match.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"

# TOML suffix that matches the engine's normalized locale_suffixes()
LOCALE_SUFFIX = {"en-US": "en_us", "ja-JP": "ja_jp"}

# (slug) -> {field -> {locale -> value}}
# Fields: title, summary, name, headline (per item type)
POSTS: dict[str, dict[str, dict[str, str]]] = {
    "alan-turing-computacao-enigma": {
        "title": {
            "en-US": "Alan Turing: The Enigma Code and the Birth of AI",
            "ja-JP": "アラン・チューリング：エニグマ暗号と AI の誕生",
        },
        "summary": {
            "en-US": "A tribute to the father of modern computing, from breaking the Enigma to laying the theoretical foundations of Artificial Intelligence.",
            "ja-JP": "エニグマ解読から人工知能の理論的基盤の構築まで、現代コンピューティングの父へのオマージュ。",
        },
    },
    "algoritmos-busca-ordenacao-com-big-o": {
        "title": {
            "en-US": "Algorithms and Big O: Understanding Code Efficiency",
            "ja-JP": "アルゴリズムと Big O：コード効率の理解",
        },
        "summary": {
            "en-US": "An intuitive introduction to algorithmic complexity (time and space) and why Big O is the definitive metric for scalability.",
            "ja-JP": "アルゴリズムの計算量（時間と空間）への直感的な入門と、Big O がスケーラビリティの決定的な指標である理由。",
        },
    },
    "boas-praticas-clean-code-solid": {
        "title": {
            "en-US": "Clean Code & SOLID: The Cost of Technical Debt",
            "ja-JP": "Clean Code と SOLID：技術的負債のコスト",
        },
        "summary": {
            "en-US": "An analysis of long-term maintainability, from expressive variable names to the five principles of class architecture.",
            "ja-JP": "表現力のある変数名からクラス設計の五原則まで、長期的な保守性に関する分析。",
        },
    },
    "computacao-quantica-qbits-vs-bits": {
        "title": {
            "en-US": "Quantum Computing: Power Beyond Bits",
            "ja-JP": "量子コンピューティング：ビットを超えた力",
        },
        "summary": {
            "en-US": "A clear view on qubits, superposition, and how quantum power can solve problems impossible for classical computers.",
            "ja-JP": "量子ビット、重ね合わせ、そして古典コンピュータでは不可能な問題を量子の力がどう解くかについての明瞭な概観。",
        },
    },
    "daniel-kahneman-raciocinio-economico": {
        "title": {
            "en-US": "Daniel Kahneman: Thinking, Fast and Slow — Behavioral Economics",
            "ja-JP": "ダニエル・カーネマン：ファスト & スロー — 行動経済学",
        },
        "summary": {
            "en-US": "A tribute to the psychologist who won the Nobel in Economics by proving humans are not as rational as they like to believe.",
            "ja-JP": "人間は自分が信じるほど合理的ではないことを証明し、ノーベル経済学賞を受賞した心理学者へのオマージュ。",
        },
    },
    "dapper-vs-efcore-performance": {
        "title": {
            "en-US": "Dapper vs EF Core: When Performance Beats Abstraction",
            "ja-JP": "Dapper vs EF Core：パフォーマンスが抽象化を上回るとき",
        },
        "summary": {
            "en-US": "A comparative analysis of ORMs in the .NET ecosystem, focused on object lifecycles, tracking, and query overhead.",
            "ja-JP": ".NET エコシステムにおける ORM の比較分析。オブジェクトのライフサイクル、トラッキング、クエリオーバーヘッドに注目。",
        },
    },
    "design-patterns-gang-of-four-moderno": {
        "title": {
            "en-US": "Design Patterns: What Still Matters in Modern C#?",
            "ja-JP": "デザインパターン：モダン C# で今も有効なのは？",
        },
        "summary": {
            "en-US": "A critical review of GoF patterns, analyzing how C# 12 and 13 made some obsolete through records and pattern matching.",
            "ja-JP": "GoF パターンの批判的レビュー。C# 12/13 のレコードやパターンマッチングによって陳腐化したものを分析。",
        },
    },
    "engenharia-cognitive-agentes-ia": {
        "title": {
            "en-US": "Cognitive Engineering: How AI Agents 'Think'",
            "ja-JP": "認知エンジニアリング：AI エージェントはどう「考える」のか",
        },
        "summary": {
            "en-US": "An analysis of thought orchestration in LLMs, from the perception-action loop to short- and long-term memory (RAG).",
            "ja-JP": "LLM における思考のオーケストレーション分析。知覚・行動ループから短期・長期記憶（RAG）まで。",
        },
    },
    "estruturas-de-dados-pilha-fila-arvores": {
        "title": {
            "en-US": "Excellence in Data: Stacks, Queues and Trees",
            "ja-JP": "データの美学：スタック、キュー、ツリー",
        },
        "summary": {
            "en-US": "Why choosing the right data structure matters more than the algorithm itself for the performance of complex systems.",
            "ja-JP": "複雑なシステムのパフォーマンスにおいて、アルゴリズムよりも適切なデータ構造の選択が重要である理由。",
        },
    },
    "flutter-arquitetura-dart": {
        "title": {
            "en-US": "Flutter & Dart: State Architecture and Mobile Performance",
            "ja-JP": "Flutter と Dart：状態アーキテクチャとモバイルパフォーマンス",
        },
        "summary": {
            "en-US": "A technical analysis of Skia/Impeller rendering and how patterns like Riverpod and Bloc affect the widget lifecycle.",
            "ja-JP": "Skia/Impeller レンダリングの技術分析と、Riverpod や Bloc といったパターンがウィジェットのライフサイクルに与える影響。",
        },
    },
    "fluxo-pensamento-agentes": {
        "title": {
            "en-US": "The Anatomy of Thought in Agents: Turning Intent into Execution",
            "ja-JP": "エージェントの思考の解剖：意図を実行へと変える",
        },
        "summary": {
            "en-US": "An analysis of how Chain of Thought and plan structuring enable AI agents to solve complex tasks with precision.",
            "ja-JP": "Chain of Thought と計画の構造化によって、AI エージェントが複雑なタスクを正確に解決する仕組みの分析。",
        },
    },
    "bill-gates-microsoft-historia": {
        "title": {
            "en-US": "Bill Gates and Microsoft: From the Desktop to Ubiquity",
            "ja-JP": "ビル・ゲイツとマイクロソフト：デスクトップから遍在へ",
        },
        "summary": {
            "en-US": "An analysis of Gates' vision of 'a computer on every desk' and how Microsoft shaped the modern software industry.",
            "ja-JP": "「すべての机にコンピュータを」というゲイツのビジョンと、マイクロソフトが現代ソフトウェア産業を形作った歩みの分析。",
        },
    },
    "ia-inspirada-pela-fisica-redes-neurais": {
        "title": {
            "en-US": "Physics-Inspired AI: Entropy and Energy in Neural Networks",
            "ja-JP": "物理学に着想を得た AI：ニューラルネットのエントロピーとエネルギー",
        },
        "summary": {
            "en-US": "How thermal and statistical-mechanics concepts shape the training of modern AI, from Hopfield Networks to Diffusion Models.",
            "ja-JP": "熱力学や統計力学の概念が、Hopfield Network から Diffusion Model まで、現代 AI の学習をいかに形作ってきたか。",
        },
    },
    "introducao-intuitiva-fisica-quantica": {
        "title": {
            "en-US": "The Quantum Universe: Beyond Classical Logic",
            "ja-JP": "量子宇宙：古典論理の先へ",
        },
        "summary": {
            "en-US": "An intuitive journey through quantum physics. Superposition, entanglement, and why the observer changes reality.",
            "ja-JP": "量子物理への直感的な旅。重ね合わせ、もつれ、そして観測者がなぜ現実を変えるのか。",
        },
    },
    "neuroplasticidade-agentes": {
        "title": {
            "en-US": "'Neuroplasticity' in Agent Systems: Feedback, Memory and Continuous Improvement",
            "ja-JP": "エージェントシステムにおける「神経可塑性」：フィードバック・記憶・継続的改善",
        },
        "summary": {
            "en-US": "An architecture proposal for AI agents that learn and evolve through feedback cycles and curated memory.",
            "ja-JP": "フィードバック・サイクルとキュレートされた記憶を通じて学習・進化する AI エージェントのアーキテクチャ提案。",
        },
    },
    "orquestrador-agentes-ddd": {
        "title": {
            "en-US": "DDD Agent Orchestrator: Translating Natural Language into Ubiquitous Language",
            "ja-JP": "DDD エージェント・オーケストレーター：自然言語をユビキタス言語へ",
        },
        "summary": {
            "en-US": "Technical note on converting natural language into DDD artifacts via multi-agent AI orchestration.",
            "ja-JP": "複数の AI エージェントのオーケストレーションを用いて、自然言語を DDD のアーティファクトに変換する技術ノート。",
        },
    },
    "performance-dotnet-pre-compilacao": {
        "title": {
            "en-US": ".NET Performance: JIT, AOT and the Cost of Memory Allocation",
            "ja-JP": ".NET のパフォーマンス：JIT、AOT、メモリ割り当てのコスト",
        },
        "summary": {
            "en-US": "A deep dive into the .NET runtime focused on the Garbage Collector, Just-In-Time compilation and Native AOT for microservices.",
            "ja-JP": ".NET ランタイムの深堀り。GC、JIT、マイクロサービス向け Native AOT に焦点を当てて。",
        },
    },
    "poc-minerando-logs": {
        "title": {
            "en-US": "PoC: Mining Conversation Logs to Generate Posts with Traceability and Privacy (LGPD)",
            "ja-JP": "PoC：対話ログを採掘し、追跡性とプライバシー（LGPD）を両立した記事を生成",
        },
        "summary": {
            "en-US": "Concept note on extracting technical knowledge from anonymized chat logs and turning them into publishable content.",
            "ja-JP": "匿名化されたチャットログから技術的知見を抽出し、公開可能なコンテンツに変換する構想ノート。",
        },
    },
    "projeto-manhattan-bomba-atomica": {
        "title": {
            "en-US": "The Manhattan Project: The Science of the Bomb",
            "ja-JP": "マンハッタン計画：爆弾の科学",
        },
        "summary": {
            "en-US": "An analysis of the largest scientific-military effort in history, from Einstein and Oppenheimer to the Trinity tests.",
            "ja-JP": "史上最大の科学的・軍事的努力の分析。アインシュタインとオッペンハイマーからトリニティ実験まで。",
        },
    },
    "redes-neurais-do-zero-python": {
        "title": {
            "en-US": "Neural Networks from Scratch: Mathematical Implementation in Python",
            "ja-JP": "ゼロから作るニューラルネット：Python による数学的実装",
        },
        "summary": {
            "en-US": "A journey from the McCulloch-Pitts neuron to backpropagation, implementing a dense neural network using only NumPy.",
            "ja-JP": "マッカロック・ピッツのニューロンから誤差逆伝播まで。NumPy だけで密結合ニューラルネットを実装する旅。",
        },
    },
    "richard-feynman-prazer-descobrir": {
        "title": {
            "en-US": "Richard Feynman: The Pleasure of Finding Things Out and Quantum Thinking",
            "ja-JP": "リチャード・ファインマン：発見する喜びと量子的思考",
        },
        "summary": {
            "en-US": "A tribute to the genius who taught the world to think from first principles, from particle physics to nanotechnology.",
            "ja-JP": "素粒子物理から ナノテクノロジー まで、第一原理から考えることを世界に教えた天才へのオマージュ。",
        },
    },
    "segunda-guerra-mundial-tecnologia": {
        "title": {
            "en-US": "World War II: The Engine of Technological Innovation",
            "ja-JP": "第二次世界大戦：技術革新のエンジン",
        },
        "summary": {
            "en-US": "How the largest conflict in history forced the birth of radar, digital computers and jet engines.",
            "ja-JP": "史上最大の紛争が、レーダー、デジタルコンピュータ、ジェットエンジンの誕生をいかに強制したか。",
        },
    },
    "simulacao-fisica-particulas-monte-carlo": {
        "title": {
            "en-US": "Particle Simulation: The Power of Monte Carlo Methods",
            "ja-JP": "粒子シミュレーション：モンテカルロ法の威力",
        },
        "summary": {
            "en-US": "Exploring the simulation of the universe and complex systems using statistics, random walks and encoded laws of physics.",
            "ja-JP": "統計、ランダムウォーク、コード化された物理法則を用いた宇宙と複雑系のシミュレーション探求。",
        },
    },
    "sistemas-de-tipagem-estatico-vs-dinamico": {
        "title": {
            "en-US": "Type Systems: Static vs Dynamic — Semantic Tradeoffs",
            "ja-JP": "型システム：静的 vs 動的 — 意味論的トレードオフ",
        },
        "summary": {
            "en-US": "An analysis of compile-time safety vs runtime agility, exploring strong, weak and duck typing.",
            "ja-JP": "コンパイル時の安全性と実行時の機敏さの対立。強い型付け・弱い型付け・ダックタイピングを探る。",
        },
    },
    "sistemas-orientados-a-filas": {
        "title": {
            "en-US": "Resilience and Scale: Queue-Oriented Systems",
            "ja-JP": "レジリエンスとスケール：キュー指向システム",
        },
        "summary": {
            "en-US": "Why decoupling systems with queues (RabbitMQ, Azure Service Bus) is the secret to unbreakable distributed architectures.",
            "ja-JP": "キュー（RabbitMQ、Azure Service Bus）による疎結合が、壊れない分散アーキテクチャの秘訣である理由。",
        },
    },
    "tdd-ciclo-vermelho-verde-refactor": {
        "title": {
            "en-US": "TDD: The Red-Green-Refactor Cycle as Domain Protection",
            "ja-JP": "TDD：ドメインを守る Red-Green-Refactor サイクル",
        },
        "summary": {
            "en-US": "A technical analysis of Test-Driven Development: from failing tests that prove code actually works to safe refactors.",
            "ja-JP": "テスト駆動開発の技術分析。コードが実際に動くことを保証する失敗テストから、安全なリファクタリングまで。",
        },
    },
    "typescript-tipagem-avancada": {
        "title": {
            "en-US": "Advanced TypeScript: Type Mapping and Complex Generics",
            "ja-JP": "上級 TypeScript：型マッピングと複雑なジェネリクス",
        },
        "summary": {
            "en-US": "A deep analysis of TypeScript's Turing-complete type system, covering conditional types, inference and transformation utilities.",
            "ja-JP": "チューリング完全な TypeScript 型システムの深堀り。条件型、型推論、変換ユーティリティを扱う。",
        },
    },
    "sos-location-business-rules": {
        "title": {
            "en-US": "SOS Location: Business Rules, Contracts and Operations",
            "ja-JP": "SOS Location：ビジネスルール、契約、運用",
        },
        "summary": {
            "en-US": "Complete catalog of the business rules that sustain SOS Location.",
            "ja-JP": "SOS Location を支えるビジネスルールの完全なカタログ。",
        },
    },
    "sos-location-flow-architecture": {
        "title": {
            "en-US": "SOS Location: Flows, Architecture and Diagrams",
            "ja-JP": "SOS Location：フロー、アーキテクチャ、図解",
        },
        "summary": {
            "en-US": "Description of SOS Location pipelines, diagrams and code examples.",
            "ja-JP": "SOS Location のパイプライン、ダイアグラム、コード例の解説。",
        },
    },
    "sos-location-stack": {
        "title": {
            "en-US": "SOS Location: Technologies, Tools and Examples",
            "ja-JP": "SOS Location：技術スタック、ツール、サンプル",
        },
        "summary": {
            "en-US": "Full overview of SOS Location's stack, key concepts and code examples.",
            "ja-JP": "SOS Location のスタック、主要概念、コード例の総覧。",
        },
    },
    "sos-location-webgl-3d-city-engine": {
        "title": {
            "en-US": "SOS Location: WebGL 3D City Engine for Real-Time Visualization",
            "ja-JP": "SOS Location：リアルタイム都市可視化のための WebGL 3D エンジン",
        },
        "summary": {
            "en-US": "How we built a WebGL 2.0 engine with Three.js to render full cities with terrain, 3D buildings and live disaster layers.",
            "ja-JP": "Three.js による WebGL 2.0 エンジンを構築し、地形・3D 建物・ライブ災害レイヤを含む都市全体をどうレンダリングしたか。",
        },
    },
    "sos-location-clean-architecture-dotnet10": {
        "title": {
            "en-US": "SOS Location: Clean Architecture + CQRS on .NET 10",
            "ja-JP": "SOS Location：.NET 10 で Clean Architecture + CQRS",
        },
        "summary": {
            "en-US": "Clean Architecture, CQRS with MediatR and domain events in the SOS Location backend. How we structured code for crisis-scenario resilience.",
            "ja-JP": "SOS Location バックエンドにおける Clean Architecture、MediatR による CQRS、ドメインイベント。危機シナリオに耐える構造化の実践。",
        },
    },
    "sos-location-postgis-spatial-intelligence": {
        "title": {
            "en-US": "SOS Location: PostGIS and Spatial Intelligence for Disaster Response",
            "ja-JP": "SOS Location：災害対応のための PostGIS と空間インテリジェンス",
        },
        "summary": {
            "en-US": "PostGIS turns PostgreSQL into a geospatial engine. How we use GIST indexes, ST_DWithin and line-of-sight for real-time tactical decisions.",
            "ja-JP": "PostGIS は PostgreSQL を地理空間エンジンへと変える。GIST インデックス、ST_DWithin、見通し線をリアルタイム戦術判断にどう活かすか。",
        },
    },
    "sos-location-ml-risk-neural-models": {
        "title": {
            "en-US": "SOS Location: Neural Risk Models with PyTorch and Semantic Segmentation",
            "ja-JP": "SOS Location：PyTorch とセマンティックセグメンテーションによるニューラル・リスクモデル",
        },
        "summary": {
            "en-US": "SOSLocation.ML uses PyTorch to predict risk in disaster zones. How we train semantic segmentation models to identify critical areas in satellite imagery and GIS data.",
            "ja-JP": "SOSLocation.ML は PyTorch で災害地域のリスクを予測する。衛星画像と GIS データから重要領域を特定するセマンティックセグメンテーションモデルの訓練方法。",
        },
    },
    "biomatematica-araucaria-angustifolia": {
        "title": {
            "en-US": "The Bio-Mathematics of the Araucaria: Modeling and Symmetry",
            "ja-JP": "アラウカリアの生物数学：モデリングと対称性",
        },
        "summary": {
            "en-US": "An exploration of the mathematical patterns that govern the structure of Araucaria angustifolia, from whorls to exponential growth series.",
            "ja-JP": "Araucaria angustifolia の構造を支配する数学的パターンの探求。輪生から指数関数的成長系列まで。",
        },
    },
    "primeiro-post": {
        "title": {
            "en-US": "Welcome to My New Blog",
            "ja-JP": "新しいブログへようこそ",
        },
        "summary": {
            "en-US": "The starting point of Technical Knowledge OS: a versioned engineering notebook focused on architecture, distributed systems and living documentation.",
            "ja-JP": "Technical Knowledge OS の出発点：アーキテクチャ、分散システム、生きたドキュメンテーションに焦点を当てた、バージョン管理されたエンジニアリング・ノートブック。",
        },
    },
    "gis-pipelines-with-event-driven-services": {
        "title": {
            "en-US": "GIS Pipelines with Event-Driven Services",
            "ja-JP": "イベント駆動サービスによる GIS パイプライン",
        },
        "summary": {
            "en-US": "How to handle geospatial ingestion, async processing and operational reads without turning the backend into an accidental monolith.",
            "ja-JP": "地理空間データの取り込み、非同期処理、運用向け読み取りを、バックエンドを偶発的なモノリスにせずに扱う方法。",
        },
    },
    "ddd-boundaries-for-agent-systems": {
        "title": {
            "en-US": "DDD Boundaries for Agent Systems",
            "ja-JP": "エージェントシステムのための DDD 境界",
        },
        "summary": {
            "en-US": "Practical notes on separating domain, tool execution and coordination policies in agent-based systems.",
            "ja-JP": "エージェントベースのシステムにおいて、ドメイン、ツール実行、調整ポリシーを分離する実践的なノート。",
        },
    },
    "tecnologia-pulso-hemp-hpm": {
        "title": {
            "en-US": "Pulse Technology: From HEMP to High-Power Microwaves",
            "ja-JP": "パルス技術：HEMP から高出力マイクロ波まで",
        },
        "summary": {
            "en-US": "A technical analysis of artificial electromagnetic pulse generation, from the Compton effect to the flux compression generator.",
            "ja-JP": "人工電磁パルス生成の技術分析。コンプトン効果から磁束圧縮発電機まで。",
        },
    },
    "sopros-estelares-astrofisica-impulso": {
        "title": {
            "en-US": "Stellar Blasts: From Supernovae to Space Weather",
            "ja-JP": "星々の息吹：超新星から宇宙天気へ",
        },
        "summary": {
            "en-US": "Anatomy of astrophysical phenomena that produce extreme electromagnetic emissions and their impact on technological systems.",
            "ja-JP": "極端な電磁放射を生み出す天体物理学的現象の解剖と、それが技術システムに及ぼす影響。",
        },
    },
    "brain-map-topology-hiro": {
        "title": {
            "en-US": "Knowledge Topologies: The Hiro Graph",
            "ja-JP": "知識のトポロジー：Hiro グラフ",
        },
        "summary": {
            "en-US": "Exploring the implementation of a D3.js hierarchy to visualize technical intelligence in a non-linear way.",
            "ja-JP": "技術的知性を非線形に可視化するための D3.js ハイアラーキー実装の探求。",
        },
    },
    "fisica-demp-pulsos-dispersos": {
        "title": {
            "en-US": "The Physics of Dispersed Pulses: Beyond Conventional EMP",
            "ja-JP": "分散パルスの物理学：従来の EMP を超えて",
        },
        "summary": {
            "en-US": "A deep exploration of DEMP phenomena, GRBs and the dissipation of electromagnetic pulses in dispersive media.",
            "ja-JP": "DEMP 現象、ガンマ線バースト、分散性媒質中の電磁パルス減衰の深い考察。",
        },
    },
    "resiliencia-eletromagnetica-acoplamento": {
        "title": {
            "en-US": "Electromagnetic Resilience Engineering and Coupling",
            "ja-JP": "電磁レジリエンス工学と結合",
        },
        "summary": {
            "en-US": "From ground zero to junction breakdown: how real circuits fail under high-intensity transients.",
            "ja-JP": "グラウンド・ゼロから接合破壊まで：現実の回路が高強度過渡現象下でどう壊れるか。",
        },
    },
    "technical-knowledge-os-v2": {
        "title": {
            "en-US": "The Awakening of Technical Knowledge OS v2",
            "ja-JP": "Technical Knowledge OS v2 の覚醒",
        },
        "summary": {
            "en-US": "A journey through the modularization of the rendering engine and the concept of an operating system for technical intellect.",
            "ja-JP": "レンダリングエンジンのモジュール化と、技術的知性のための OS という構想を巡る旅。",
        },
    },
}

PROJECTS: dict[str, dict[str, dict[str, str]]] = {
    "apollo-11": {
        "headline": {
            "en-US": "Original Apollo 11 Guidance Computer (AGC) source code for the command and lunar modules.",
            "ja-JP": "アポロ 11 号誘導コンピュータ（AGC）の指令船・月着陸船オリジナル・ソースコード。",
        },
        "summary": {
            "en-US": "Original Apollo 11 Guidance Computer (AGC) source code, including the command and lunar modules — a historical reference for embedded software engineering.",
            "ja-JP": "アポロ 11 号誘導コンピュータ（AGC）の指令船・月着陸船オリジナル・ソースコード。組み込みソフトウェア工学の歴史的リファレンス。",
        },
    },
    "automapper": {
        "headline": {
            "en-US": "A convention-based object-to-object mapper in .NET.",
            "ja-JP": ".NET 向けの規約ベース・オブジェクト間マッパー。",
        },
        "summary": {
            "en-US": "Convention-based object-to-object mapping library for .NET — removes boilerplate when transforming data across layers.",
            "ja-JP": "規約ベースの .NET 用オブジェクトマッピング・ライブラリ。レイヤー間のデータ変換における定型コードを排除する。",
        },
    },
    "brumadinho-location": {
        "headline": {
            "en-US": "Tools to help with the rescue and location of victims of the Brumadinho/MG dam collapse.",
            "ja-JP": "ブルマジーニョ（ミナスジェライス州）ダム決壊被害者の救助・位置特定を支援するツール。",
        },
        "summary": {
            "en-US": "Set of geospatial tools to support the rescue and localization of victims of the Brumadinho/MG disaster, using public data and reference coordinates.",
            "ja-JP": "公的データと参照座標を用い、ブルマジーニョ／MG 災害の被害者救助と位置特定を支援する地理空間ツール群。",
        },
    },
    "chess": {
        "headline": {
            "en-US": "Chess engine in C# with rule-driven domain modeling.",
            "ja-JP": "ルール駆動ドメインモデリングによる C# のチェスエンジン。",
        },
        "summary": {
            "en-US": "Chess game implemented in C# with a focus on domain modeling, move validation and board representation.",
            "ja-JP": "ドメインモデリング、着手の検証、盤面表現に焦点を置いた C# 実装のチェスゲーム。",
        },
    },
    "claw-code": {
        "headline": {
            "en-US": "Better Harness Tools — tools for analyzing and experimenting with Claude Code, being rewritten in Rust.",
            "ja-JP": "Better Harness Tools — Claude Code の分析と実験のためのツール群。Rust への書き直しが進行中。",
        },
        "summary": {
            "en-US": "Analysis and experimentation tooling for code-agent architectures, currently being rewritten in Rust for performance and portability.",
            "ja-JP": "コード系エージェントのアーキテクチャを分析・実験するツール群。パフォーマンスと移植性を狙って Rust への書き直し中。",
        },
    },
    "deepseek-v3": {
        "headline": {
            "en-US": "Reference implementation of the DeepSeek-V3 model — a Mixture-of-Experts architecture for large-scale LLMs.",
            "ja-JP": "DeepSeek-V3 モデルのリファレンス実装 — 大規模 LLM のための Mixture-of-Experts アーキテクチャ。",
        },
        "summary": {
            "en-US": "Fork of DeepSeek-V3, a language model with Mixture-of-Experts (MoE) and Multi-head Latent Attention for efficient large-scale inference.",
            "ja-JP": "DeepSeek-V3 のフォーク。Mixture-of-Experts（MoE）と Multi-head Latent Attention を備え、大規模推論を効率化する言語モデル。",
        },
    },
    "financial": {
        "headline": {
            "en-US": "Personal finance management monolith in C#/.NET.",
            "ja-JP": "C#/.NET による個人家計管理モノリス。",
        },
        "summary": {
            "en-US": "Monolithic personal finance application developed in C#/.NET, focused on expense control, categorization and reporting.",
            "ja-JP": "C#/.NET で開発されたモノリシックな個人家計アプリ。支出管理、分類、レポーティングに注力。",
        },
    },
    "gaussian-splatting": {
        "headline": {
            "en-US": "Reference implementation of 3D Gaussian Splatting for real-time radiance field rendering.",
            "ja-JP": "リアルタイム放射輝度場レンダリングのための 3D Gaussian Splatting リファレンス実装。",
        },
        "summary": {
            "en-US": "Fork of the original 3D Gaussian Splatting implementation — a neural rendering technique that represents 3D scenes as sets of Gaussians for real-time rendering.",
            "ja-JP": "3D Gaussian Splatting オリジナル実装のフォーク。3D シーンをガウス分布の集合で表現し、リアルタイムレンダリングを行うニューラル描画技法。",
        },
    },
    "gemini-cli": {
        "headline": {
            "en-US": "Open-source AI agent that brings Gemini's power directly to the terminal.",
            "ja-JP": "Gemini の力を端末に直接もたらすオープンソース AI エージェント。",
        },
        "summary": {
            "en-US": "Fork of Gemini CLI — Google's AI agent that runs directly in the terminal with access to system tools, code editing and filesystem navigation.",
            "ja-JP": "Gemini CLI のフォーク。Google の AI エージェントが、システムツール・コード編集・ファイルシステム走査を備えて端末内で直接動作する。",
        },
    },
    "gis-incident-lab": {
        "headline": {
            "en-US": "Operational mapping for incident response, risk analysis and spatial pipelines.",
            "ja-JP": "インシデント対応、リスク分析、空間パイプラインのための運用マッピング。",
        },
        "summary": {
            "en-US": "Lab applied to GIS, geospatial data ingestion and operational projections for response teams.",
            "ja-JP": "GIS、地理空間データの取り込み、対応チーム向け運用投影に特化したラボ。",
        },
    },
    "java-servlet-pages": {
        "headline": {
            "en-US": "Web application with Java Servlets and JSP — fundamentals of web development in the Java ecosystem.",
            "ja-JP": "Java Servlet と JSP を用いた Web アプリケーション — Java エコシステムにおける Web 開発の基礎。",
        },
        "summary": {
            "en-US": "Study project using Java Servlets and JSP, covering HTTP request lifecycle, sessions, filters and the server-side MVC pattern.",
            "ja-JP": "Java Servlet と JSP を用いた学習プロジェクト。HTTP リクエストのライフサイクル、セッション、フィルター、サーバ側 MVC を扱う。",
        },
    },
    "leaflet": {
        "headline": {
            "en-US": "JavaScript library for mobile-friendly interactive maps — reference for GIS projects.",
            "ja-JP": "モバイル対応のインタラクティブマップ用 JavaScript ライブラリ — GIS プロジェクトのリファレンス。",
        },
        "summary": {
            "en-US": "Fork of Leaflet, the most popular JavaScript library for interactive maps, used as a base in the ecosystem's GIS projects.",
            "ja-JP": "Leaflet のフォーク。インタラクティブマップで最も人気のある JavaScript ライブラリで、エコシステム内の GIS プロジェクトの基盤として利用。",
        },
    },
    "macos": {
        "headline": {
            "en-US": "macOS virtualized inside a Docker container — experiments with OS-level virtualization.",
            "ja-JP": "Docker コンテナ内で仮想化された macOS — OS 仮想化の実験。",
        },
        "summary": {
            "en-US": "Fork of Docker-OSX: macOS virtualization inside Docker containers for compatibility testing and cross-platform development.",
            "ja-JP": "Docker-OSX のフォーク。Docker コンテナ内で macOS を仮想化し、互換性テストとクロスプラットフォーム開発を可能にする。",
        },
    },
    "maplebr": {
        "headline": {
            "en-US": "MapleBR project — server and tooling for the MapleStory ecosystem.",
            "ja-JP": "MapleBR プロジェクト — MapleStory エコシステムのサーバーとツール群。",
        },
        "summary": {
            "en-US": "Project with tooling and configuration for MapleStory servers, including build scripts and Makefile-based automation.",
            "ja-JP": "MapleStory サーバー向けのツールと構成を含むプロジェクト。ビルドスクリプトと Makefile による自動化を備える。",
        },
    },
    "mermaid-live-editor": {
        "headline": {
            "en-US": "Live editor for creating, previewing and sharing Mermaid diagrams.",
            "ja-JP": "Mermaid ダイアグラムを作成・プレビュー・共有するためのライブエディタ。",
        },
        "summary": {
            "en-US": "Fork of Mermaid Live Editor — a web app for real-time Mermaid diagram editing with instant preview and export.",
            "ja-JP": "Mermaid Live Editor のフォーク。Mermaid 図をリアルタイム編集し、即時プレビューとエクスポートを行う Web アプリ。",
        },
    },
    "mermaid": {
        "headline": {
            "en-US": "Generation of diagrams (flowcharts, sequence diagrams, etc.) from text, similar to markdown.",
            "ja-JP": "Markdown のようにテキストからフローチャートやシーケンス図などのダイアグラムを生成。",
        },
        "summary": {
            "en-US": "Fork of Mermaid.js — a text-based diagram generator used extensively across the Technical Knowledge OS for visual documentation.",
            "ja-JP": "Mermaid.js のフォーク。Technical Knowledge OS の可視的ドキュメンテーション全体で広く使われる、テキストベースのダイアグラム生成ツール。",
        },
    },
    "nhmatsumoto-exception-middleware": {
        "headline": {
            "en-US": "GlobalExceptionMiddleware for .NET Core — centralized exception handling for APIs.",
            "ja-JP": ".NET Core 向け GlobalExceptionMiddleware — API の集中例外処理。",
        },
        "summary": {
            "en-US": "Global exception-handling middleware for ASP.NET Core, standardizing error responses and logging across web applications.",
            "ja-JP": "ASP.NET Core 向けのグローバル例外処理ミドルウェア。エラーレスポンスとログを Web アプリ全体で標準化する。",
        },
    },
    "nhmatsumoto-github-io": {
        "headline": {
            "en-US": "Technical Knowledge OS — blog and portfolio with a static site engine and interactive 3D visualization.",
            "ja-JP": "Technical Knowledge OS — 静的サイト生成エンジンとインタラクティブ 3D 可視化を備えたブログ兼ポートフォリオ。",
        },
        "summary": {
            "en-US": "Personal site and Technical Knowledge OS: static site engine in Python, interactive 3D visualization with Three.js, knowledge graph system and deploy via GitHub Pages.",
            "ja-JP": "個人サイト兼 Technical Knowledge OS。Python による静的サイト生成、Three.js を用いた 3D インタラクティブ可視化、知識グラフ、GitHub Pages での配信。",
        },
    },
    "playground-fe": {
        "headline": {
            "en-US": "React/TypeScript frontend with Keycloak integration — base for applications with access control.",
            "ja-JP": "Keycloak と連携した React/TypeScript フロントエンド — アクセス制御を持つアプリの基盤。",
        },
        "summary": {
            "en-US": "Frontend project in React and TypeScript with Keycloak integration for authentication, serving as a base for future developments requiring access control.",
            "ja-JP": "認証に Keycloak を統合した React・TypeScript フロントエンド。アクセス制御を必要とする将来の開発の基盤として利用。",
        },
    },
    "prog-lib": {
        "headline": {
            "en-US": "Reference library with algorithms and data structures for study and lookup.",
            "ja-JP": "学習と参照のためのアルゴリズム・データ構造リファレンス・ライブラリ。",
        },
        "summary": {
            "en-US": "Collection of classic algorithm and data-structure implementations, organized as a reference library for study and quick lookup.",
            "ja-JP": "古典的なアルゴリズムとデータ構造の実装コレクション。学習と素早い参照のためのライブラリとして整理。",
        },
    },
    "quickreaderv1": {
        "headline": {
            "en-US": "Speed-reading application in TypeScript — text chunking for rapid reading.",
            "ja-JP": "TypeScript で書かれた速読アプリ — テキストをチャンクに分割して高速読破。",
        },
        "summary": {
            "en-US": "Speed-reading app in TypeScript that presents text in optimized chunks for rapid reading, with speed control and progress tracking.",
            "ja-JP": "最適化されたチャンクで素早くテキストを表示する TypeScript 製の速読アプリ。速度制御と進捗追跡を備える。",
        },
    },
    "react-data-grid": {
        "headline": {
            "en-US": "React data grid component with advanced features and high customization.",
            "ja-JP": "高度な機能と高いカスタマイズ性を備えた React データグリッドコンポーネント。",
        },
        "summary": {
            "en-US": "Fork of react-data-grid — React data table component with sorting, filtering, inline editing and virtualization for large datasets.",
            "ja-JP": "react-data-grid のフォーク。ソート、フィルタ、インライン編集、大規模データの仮想化に対応した React データテーブル・コンポーネント。",
        },
    },
    "responsemiddleware": {
        "headline": {
            "en-US": "HTTP response standardization middleware for .NET Core APIs.",
            "ja-JP": ".NET Core API のための HTTP レスポンス標準化ミドルウェア。",
        },
        "summary": {
            "en-US": "ASP.NET Core middleware that standardizes HTTP responses by wrapping controller results in a consistent envelope with success/error metadata.",
            "ja-JP": "ASP.NET Core ミドルウェア。コントローラの結果を成功／失敗メタデータを含む一貫したエンベロープで包み、HTTP レスポンスを標準化する。",
        },
    },
    "ronaldinho-agent": {
        "headline": {
            "en-US": "Autonomous Python agent with personality and context-based decision-making.",
            "ja-JP": "パーソナリティと文脈に基づく意思決定能力を備えた Python 製自律エージェント。",
        },
        "summary": {
            "en-US": "Autonomous Python agent with a personality inspired by Ronaldinho Gaúcho — decision architecture based on context, memory and conversational interaction.",
            "ja-JP": "ロナウジーニョ・ガウーショに着想を得たパーソナリティを持つ Python 自律エージェント。文脈・記憶・会話的対話に基づく意思決定アーキテクチャ。",
        },
    },
    "security-jwt": {
        "headline": {
            "en-US": "JWT Manager for .NET — automatic key rotation, JWKS support and secure cryptographic key storage.",
            "ja-JP": ".NET 向け JWT マネージャー — 鍵の自動ローテーション、JWKS 対応、暗号鍵の安全保管。",
        },
        "summary": {
            "en-US": ".NET library for end-to-end JWT management: automatic key rotation, JWKS endpoint, multi-algorithm support and secure cryptographic material storage.",
            "ja-JP": "エンドツーエンドの JWT 管理を提供する .NET ライブラリ。鍵の自動ローテーション、JWKS エンドポイント、複数アルゴリズム対応、暗号材料の安全保管。",
        },
    },
    "sos-location": {
        "name": {
            "en-US": "SOS Location",
            "ja-JP": "SOS Location",
        },
        "headline": {
            "en-US": "Open-source platform for monitoring, mapping and coordinating natural disaster response.",
            "ja-JP": "自然災害対応の監視・マッピング・調整を行うオープンソース・プラットフォーム。",
        },
        "summary": {
            "en-US": "Disaster management platform that integrates geospatial data, weather and humanitarian resources in real time.",
            "ja-JP": "地理空間データ、気象情報、人道支援リソースをリアルタイムで統合する災害管理プラットフォーム。",
        },
    },
    "sos": {
        "headline": {
            "en-US": "Helper module of the SOS Location ecosystem — shared components for disaster response.",
            "ja-JP": "SOS Location エコシステムの補助モジュール — 災害対応のための共有コンポーネント。",
        },
        "summary": {
            "en-US": "Helper module of the SOS Location ecosystem with shared components, utilities and integration contracts for disaster-response services.",
            "ja-JP": "SOS Location エコシステムの補助モジュール。災害対応サービス向けの共有コンポーネント、ユーティリティ、連携契約を提供。",
        },
    },
    "splitcost-backend": {
        "headline": {
            "en-US": "SplitCosts backend — .NET API with multi-tenant, domain events and read projections.",
            "ja-JP": "SplitCosts バックエンド — マルチテナント、ドメインイベント、読み取り投影を備えた .NET API。",
        },
        "summary": {
            "en-US": "SplitCosts backend in .NET/C# with multi-tenant architecture, domain events, read/write context separation and operational projections.",
            "ja-JP": ".NET/C# による SplitCosts バックエンド。マルチテナント構造、ドメインイベント、読み書きコンテキストの分離、運用投影を備える。",
        },
    },
    "splitcosts-fe": {
        "headline": {
            "en-US": "SplitCosts frontend — React/TypeScript SPA focused on operational clarity.",
            "ja-JP": "SplitCosts フロントエンド — 運用の明瞭さに焦点を置いた React/TypeScript SPA。",
        },
        "summary": {
            "en-US": "SplitCosts frontend in React/TypeScript with Keycloak auth, expense visualization, balances and reconciliation, consuming the SplitCost-Backend via REST API.",
            "ja-JP": "React/TypeScript による SplitCosts フロントエンド。Keycloak 認証、支出可視化、残高、照合機能を備え、SplitCost-Backend を REST API 経由で利用。",
        },
    },
    "splitcosts": {
        "headline": {
            "en-US": "Expense sharing focused on clarity, tenancy boundaries and operational simplicity.",
            "ja-JP": "明瞭さ、テナント境界、運用上のシンプルさに焦点を置いた支出分担アプリ。",
        },
        "summary": {
            "en-US": "Household finance management application with focus on multi-tenant, UX and operational consistency.",
            "ja-JP": "マルチテナント、UX、運用一貫性を重視した家計管理アプリケーション。",
        },
    },
    "system-prompts-and-models-of-ai-tools": {
        "headline": {
            "en-US": "Complete collection of system prompts, tools and models of AI tooling such as v0, Cursor, Devin, Replit and others.",
            "ja-JP": "v0、Cursor、Devin、Replit など、AI ツールのシステムプロンプト・ツール・モデルの完全コレクション。",
        },
        "summary": {
            "en-US": "Fork of the complete collection of AI tooling system prompts: v0, Cursor, Manus, Same.dev, Lovable, Devin, Replit Agent, Windsurf, VSCode Agent and others — a reference for prompt engineering.",
            "ja-JP": "AI ツールのシステムプロンプト完全コレクションのフォーク：v0、Cursor、Manus、Same.dev、Lovable、Devin、Replit Agent、Windsurf、VSCode Agent など — プロンプトエンジニアリングのリファレンス。",
        },
    },
    "user-auth": {
        "headline": {
            "en-US": "Authentication service in TypeScript — user management, sessions and identity-provider integration.",
            "ja-JP": "TypeScript 製認証サービス — ユーザー管理、セッション、ID プロバイダー連携。",
        },
        "summary": {
            "en-US": "Authentication and authorization service in TypeScript/Node.js with user management, sessions and integration with identity providers such as Keycloak.",
            "ja-JP": "TypeScript/Node.js による認証・認可サービス。ユーザー管理、セッション、Keycloak など ID プロバイダーとの連携を提供。",
        },
    },
}

DOCUMENTS: dict[str, dict[str, dict[str, str]]] = {
    "adr-versioned-memory": {
        "title": {
            "en-US": "ADR 003 — Versioned Memory",
            "ja-JP": "ADR 003 — バージョン管理された記憶",
        },
        "summary": {
            "en-US": "Architectural decision on memory snapshots and context persistence in agent-oriented workflows.",
            "ja-JP": "エージェント指向ワークフローにおける記憶スナップショットとコンテキスト永続化に関するアーキテクチャ決定。",
        },
    },
    "agent-integration-surface": {
        "title": {
            "en-US": "Agent Integration Surface",
            "ja-JP": "エージェント統合サーフェス",
        },
        "summary": {
            "en-US": "Minimal contracts for exposing tools and services to an agent-oriented runtime.",
            "ja-JP": "エージェント指向のランタイムに対して、ツールとサービスを公開する最小契約。",
        },
    },
    "ronaldinho-architecture-overview": {
        "title": {
            "en-US": "Ronaldinho Architecture Overview",
            "ja-JP": "Ronaldinho アーキテクチャ概観",
        },
        "summary": {
            "en-US": "Overview of the Ronaldinho Agent architecture and runtime modularity choices.",
            "ja-JP": "Ronaldinho Agent のアーキテクチャとランタイム・モジュラリティ選定の概観。",
        },
    },
    "system-architecture": {
        "title": {
            "en-US": "System Architecture",
            "ja-JP": "システムアーキテクチャ",
        },
        "summary": {
            "en-US": "Structural view of the system's boundaries and its architectural rationale.",
            "ja-JP": "システム境界の構造的俯瞰と、その背後にある設計根拠。",
        },
    },
    "technical-knowledge-os": {
        "title": {
            "en-US": "Technical Knowledge OS",
            "ja-JP": "Technical Knowledge OS",
        },
        "summary": {
            "en-US": "The operational definition of the blog as a living system of technical documentation.",
            "ja-JP": "ブログを生きた技術ドキュメンテーション・システムとして運用する定義。",
        },
    },
}


def escape_toml_basic(value: str) -> str:
    """Escape a string for a TOML basic string literal."""
    return (
        value.replace("\\", "\\\\")
             .replace('"', '\\"')
             .replace("\n", "\\n")
             .replace("\r", "")
             .replace("\t", "\\t")
    )


def _strip_legacy_locale_keys(text: str, field: str) -> str:
    """Remove legacy dash/uppercase locale keys like ``field_en-US = "..."``.
    Keeps only underscore+lowercase suffixes (``field_en_us``) going forward.
    """
    legacy_suffixes = ["en-US", "ja-JP"]
    for suffix in legacy_suffixes:
        key = f"{field}_{suffix}"
        text = re.sub(
            rf'^\s*{re.escape(key)}\s*=\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*\n',
            "",
            text,
            flags=re.MULTILINE,
        )
    return text


def insert_localized_fields(text: str, field: str, locales: dict[str, str]) -> str:
    """Insert ``field_en_us = "..."`` and ``field_ja_jp = "..."`` right after the
    first line matching ``field = ...`` (regardless of whether it's a basic
    string, triple-quoted literal, etc.). Skip any locale already present.
    ``locales`` is keyed by CLDR tag (en-US / ja-JP) and mapped to the TOML
    underscore suffix via ``LOCALE_SUFFIX``.
    """
    # Clean up any legacy dash/uppercase variants first so re-runs converge.
    text = _strip_legacy_locale_keys(text, field)

    pattern = re.compile(
        rf'^(?P<line>{re.escape(field)}\s*=\s*(?:'
        r'"""(?:[^"\\]|\\.|"(?!""))*"""'
        r"|'''(?:[^'\\]|\\.|'(?!''))*'''"
        r'|"(?:[^"\\]|\\.)*"'
        r"|'(?:[^'\\]|\\.)*'"
        r'))',
        re.MULTILINE | re.DOTALL,
    )
    match = pattern.search(text)
    if not match:
        return text

    to_insert = []
    for locale, value in locales.items():
        suffix = LOCALE_SUFFIX.get(locale, locale.lower().replace("-", "_"))
        key = f"{field}_{suffix}"
        if re.search(rf'^\s*{re.escape(key)}\s*=', text, re.MULTILINE):
            continue
        to_insert.append(f'{key} = "{escape_toml_basic(value)}"')

    if not to_insert:
        return text

    insert_at = match.end()
    return text[:insert_at] + "\n" + "\n".join(to_insert) + text[insert_at:]


def apply_to_file(path: Path, spec: dict[str, dict[str, str]]) -> bool:
    """Apply translations for the given file. Returns True if file changed."""
    original = path.read_text(encoding="utf-8")
    updated = original
    for field, locales in spec.items():
        updated = insert_localized_fields(updated, field, locales)
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def build_slug_to_path(folder: Path) -> dict[str, Path]:
    """Index TOML files by their `slug` value (fallback to filename stem)."""
    import tomllib
    mapping: dict[str, Path] = {}
    for p in sorted(folder.glob("*.toml")):
        try:
            data = tomllib.loads(p.read_text(encoding="utf-8"))
            slug = str(data.get("slug") or p.stem).strip()
        except Exception:
            slug = p.stem
        mapping[slug] = p
    return mapping


def main() -> None:
    stats = {"changed": 0, "unchanged": 0, "missing": []}

    def run(folder: Path, table: dict[str, dict[str, dict[str, str]]]):
        slug_to_path = build_slug_to_path(folder)
        for slug, spec in table.items():
            path = slug_to_path.get(slug)
            if not path:
                stats["missing"].append((folder.name, slug))
                continue
            changed = apply_to_file(path, spec)
            if changed:
                stats["changed"] += 1
                print(f"[updated] {path.relative_to(ROOT)}")
            else:
                stats["unchanged"] += 1

    run(CONTENT / "posts", POSTS)
    run(CONTENT / "projects", PROJECTS)
    run(CONTENT / "documents", DOCUMENTS)

    print()
    print(f"changed: {stats['changed']}")
    print(f"unchanged (already localized): {stats['unchanged']}")
    if stats["missing"]:
        print("MISSING slugs:")
        for folder, slug in stats["missing"]:
            print(f"  - {folder}/{slug}")


if __name__ == "__main__":
    main()
