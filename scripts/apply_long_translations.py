"""Apply long-form i18n translations to project and document content files.

This complements `scripts/apply_translations.py`, which only handles short
metadata fields such as titles and summaries.
"""
from __future__ import annotations

import re
import tomllib
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"

LOCALE_SUFFIX = {"en-US": "en_us", "ja-JP": "ja_jp"}

PROJECTS: dict[str, dict[str, dict[str, Any]]] = {
    "apollo-11": {
        "overview": {
            "en-US": """Fork of the original Apollo 11 Guidance Computer (AGC) source code, written in assembly for the onboard computer that took humanity to the Moon in 1969.

The AGC was one of the first embedded computing systems to operate in real time under extreme memory and processing constraints. The code is split between the command module (Comanche055) and the lunar module (Luminary099).

## Technical relevance

This repository is a historical reference for studying:

- **Embedded software architecture** under severe hardware constraints
- **Real-time systems** with task priorities and preemption
- **Fault tolerance** — the famous 1202 alarm during landing is a classic example of resilient design
- **Mission-critical engineering** where bugs can have irreversible consequences

## Context

The AGC had only 74 KB of ROM and 4 KB of RAM. All navigation software, attitude control logic and the astronaut interface had to fit within that space. The AGC priority model influenced generations of real-time operating systems.""",
            "ja-JP": """1969 年に人類を月へ導いたオンボード計算機向けに assembly で書かれた、Apollo 11 Guidance Computer (AGC) オリジナル・ソースコードのフォークです。

AGC は、極端なメモリと処理能力の制約の下でリアルタイム動作した最初期の組み込み計算システムのひとつでした。コードは司令船モジュール（Comanche055）と月着陸船モジュール（Luminary099）に分かれています。

## 技術的な重要性

このリポジトリは、以下を学ぶための歴史的リファレンスです。

- **厳しいハードウェア制約下での組み込みソフトウェアアーキテクチャ**
- **優先度付きタスクとプリエンプションを備えたリアルタイムシステム**
- **フォールトトレランス** — 着陸時の有名な 1202 アラームはレジリエント設計の古典例です
- **ミッションクリティカル工学** — バグが取り返しのつかない結果を招きうる領域

## 背景

AGC が持っていたのは ROM 74 KB、RAM 4 KB だけでした。航法ソフトウェア、姿勢制御、宇宙飛行士向けインターフェースのすべてをこの容量に収める必要がありました。AGC の優先度アーキテクチャは、その後のリアルタイム OS 世代に影響を与えました。""",
        },
        "problem_solution": {
            "en-US": "The original code was scattered across historical documents and microfilms. Digitizing and publishing it on GitHub allowed modern engineers to study the design decisions that made lunar navigation possible on extremely limited hardware.",
            "ja-JP": "オリジナルのコードは歴史資料やマイクロフィルムに散在していました。それをデジタル化して GitHub で公開したことで、極端に限られたハードウェアで月面航法を可能にした設計判断を、現代のエンジニアが検証できるようになりました。",
        },
        "architecture": {
            "en-US": "The AGC uses a priority-based job execution architecture, where critical tasks such as attitude control can interrupt lower-priority work. The embedded operating system manages execution queues, inertial-sensor I/O and the DSKY (Display & Keyboard) interface.",
            "ja-JP": "AGC は優先度ベースのジョブ実行アーキテクチャを採用しており、姿勢制御のような重要タスクが低優先度タスクを割り込めます。組み込み OS は実行キュー、慣性センサー I/O、DSKY（Display & Keyboard）インターフェースを管理します。",
        },
    },
    "automapper": {
        "overview": {
            "en-US": """Fork of AutoMapper, the most widely used library in the .NET ecosystem for automatic mapping between objects from different layers (DTOs, ViewModels and Entities).

## Why this fork

AutoMapper is a direct reference for projects such as SplitCosts and Financial, where the separation between domain models and API contracts requires frequent transformations between representations. Keeping the fork available makes it possible to inspect the internal implementation and evaluate performance-versus-convenience trade-offs.

## Core concepts

- **Convention over configuration** — properties with the same name are mapped automatically
- **Profiles** — grouping mapping configuration by domain context
- **Projections** — integration with LINQ/EF for database-side projections
- **Configuration validation** — early detection of incomplete mappings during startup""",
            "ja-JP": """AutoMapper のフォークです。.NET エコシステムで最も広く使われている、異なるレイヤー間（DTO、ViewModel、Entity）のオブジェクトを自動マッピングするライブラリです。

## このフォークの理由

AutoMapper は SplitCosts や Financial のようなプロジェクトにおける直接的な参照実装です。ドメインと API 契約を分離すると、表現間の変換が頻繁に発生します。フォークを維持することで、内部実装を調べ、パフォーマンスと利便性のトレードオフを評価できます。

## 中核となる考え方

- **Convention over configuration** — 同名プロパティを自動マッピング
- **Profiles** — ドメイン文脈ごとにマッピング設定を整理
- **Projections** — LINQ / EF と統合し、DB 側で投影を実行
- **Configuration validation** — 起動時に不完全なマッピングを早期検出""",
        },
        "problem_solution": {
            "en-US": "Manual mapping code between layers is repetitive and fragile. AutoMapper reduces that boilerplate through conventions, but it requires discipline: implicit mappings can hide bugs when models diverge.",
            "ja-JP": "レイヤー間の手動マッピングコードは反復的で壊れやすいものです。AutoMapper は規約でその定型コードを減らしますが、規律は必要です。モデルが乖離すると、暗黙マッピングが不具合を隠すことがあります。",
        },
        "architecture": {
            "en-US": "AutoMapper uses reflection and expression trees to generate mappings when profiles are compiled. Newer versions also introduced source generators as an alternative for eliminating reflection overhead in performance-sensitive scenarios.",
            "ja-JP": "AutoMapper は profile のコンパイル時に reflection と expression tree を使ってマッピングを生成します。最近のバージョンでは、高性能が求められる場面で reflection のオーバーヘッドを避けるため、source generator も導入されました。",
        },
    },
    "brumadinho-location": {
        "overview": {
            "en-US": """Community project created in response to the Vale dam collapse in Brumadinho (Minas Gerais) in January 2019. The goal is to consolidate geolocation tooling to support rescue teams and families searching for victims.

## Motivation

In disaster scenarios, fragmented geospatial data delays rescue efforts. This repository concentrates scripts and datasets used to process coordinates, map affected areas and cross-reference location data with public sources.

## Relationship with the ecosystem

This project is directly connected to the GIS work later developed in **SOS Location** and **GIS Incident Lab**. Lessons learned here — especially around spatial-data ingestion under crisis conditions — informed the event-driven pipeline design adopted in later systems.

## Technical context

- Processing GPS coordinates and elevation datasets
- Cross-referencing public location databases
- Generating affected-area maps for operational visualization""",
            "ja-JP": """2019 年 1 月の Vale 社ダム決壊事故（ミナスジェライス州ブルマジーニョ）を受けて立ち上がったコミュニティ・プロジェクトです。目的は、被害者の位置特定を支援するための地理位置ツールを集約することにありました。

## 動機

災害時には、地理空間データの断片化が救助を遅らせます。このリポジトリは、座標処理、被災領域のマッピング、公開データとの照合に使うスクリプトとデータを集約します。

## エコシステムとの関係

このプロジェクトは、後に **SOS Location** や **GIS Incident Lab** で発展した GIS の取り組みに直接つながっています。特に、危機状況での空間データ取り込みに関する知見は、その後のイベント駆動パイプライン設計に反映されました。

## 技術的背景

- GPS 座標と標高データの処理
- 公開ロケーション・データベースとの照合
- 運用可視化のための被災エリア地図生成""",
        },
        "problem_solution": {
            "en-US": "In emergencies, location data arrives in inconsistent formats and quality levels. The project standardizes ingestion and transformation so field teams can gain rapid visibility into the situation.",
            "ja-JP": "緊急時には、位置データがばらばらの形式と品質で到着します。このプロジェクトは取り込みと変換を標準化し、現場チームが状況をすばやく把握できるようにします。",
        },
        "architecture": {
            "en-US": "Python scripts process CSV and GeoJSON datasets from public sources, normalize coordinates and generate affected-area visualizations. The simplicity is intentional: in crisis situations, execution speed matters more than elegant design.",
            "ja-JP": "公開ソースの CSV / GeoJSON を Python スクリプトで処理し、座標を正規化して被災エリアの可視化を生成します。この単純さは意図的です。危機の現場では、設計の美しさより実行速度が重要だからです。",
        },
        "impact": {
            "en-US": [
                "Consolidated data from 4 distinct public sources into a unified format for rescue teams",
                "Affected-area maps generated in under 5 minutes — a critical window for field operations",
                "Community project: contributions from 12+ developers within 72 hours of the disaster",
            ],
            "ja-JP": [
                "4 つの公開データソースを救助チーム向けの単一フォーマットに統合",
                "被災エリア地図を 5 分未満で生成 — 現場運用では重要な時間差",
                "コミュニティ・プロジェクトとして、災害発生後 72 時間以内に 12 人超の開発者が参加",
            ],
        },
        "trade_offs": {
            "en-US": [
                "Procedural scripts vs. a full GIS framework: delivery speed mattered more than long-term maintainability in an emergency",
                "Public data quality was inconsistent — aggressive normalization traded some precision for broader coverage",
            ],
            "ja-JP": [
                "手続き型スクリプト vs 本格 GIS フレームワーク: 緊急時は長期保守性より納期が優先",
                "公開データの品質は不均一だったため、多少の精度を犠牲にしてもカバレッジを優先する正規化を選択",
            ],
        },
        "lessons": {
            "en-US": [
                "During a crisis, a functional 'good enough' system is worth more than a perfect design still sitting in the backlog",
                "Open GPS elevation data had errors of up to 15 meters — enough for orientation, not for precise rescue operations",
                "The real bottleneck was fragmentation of geospatial data across agencies, not technology itself",
            ],
            "ja-JP": [
                "危機時には、バックログ上の完璧さより、今動く『十分に良い』仕組みのほうが価値が高い",
                "公開 GPS 標高データには最大 15 m の誤差があり、方角把握には十分でも精密救助には不十分だった",
                "本当のボトルネックは技術ではなく、機関ごとに分断された地理空間データだった",
            ],
        },
    },
    "chess": {
        "overview": {
            "en-US": """Implementation of a complete chess game in C#, with a domain model that treats each piece as an entity with its own movement rules.

## Domain modeling

The board is represented as an 8x8 matrix where each square may contain a piece. Each piece type (King, Queen, Rook, Bishop, Knight and Pawn) implements its own movement rules, including:

- Valid moves considering the current board state
- Check and checkmate detection
- Special moves: castling, en passant and pawn promotion

## Design decisions

- **Value Objects** for board positions
- **Strategy pattern** for movement rules by piece type
- **Immutable game state** to simplify undo/redo""",
            "ja-JP": """C# による完全なチェス実装で、各駒を固有の移動ルールを持つエンティティとして扱うドメインモデルを採用しています。

## ドメインモデリング

盤面は 8x8 の行列で表現され、各マスに駒が置かれます。各駒種（キング、クイーン、ルーク、ビショップ、ナイト、ポーン）は、それぞれの移動ルールを実装しています。対象には以下が含まれます。

- 現在の盤面状態を考慮した合法手
- チェックとチェックメイトの判定
- 特殊手: キャスリング、アンパッサン、ポーン昇格

## 設計上の判断

- 盤面座標を表す **Value Object**
- 駒種ごとの移動ルールを切り出す **Strategy pattern**
- undo / redo を簡単にする **不変なゲーム状態**""",
        },
        "problem_solution": {
            "en-US": "Chess is a classic domain-modeling exercise: complex rules interact with each other, validations depend on global state, and the logic needs to remain explicit. The project applies DDD principles to keep those rules readable and testable.",
            "ja-JP": "チェスは古典的なドメインモデリングの題材です。複雑なルールが相互作用し、検証はグローバル状態に依存し、ロジックは明快に表現される必要があります。このプロジェクトでは DDD の原則を用いて、ルールを読みやすくテスト可能に保っています。",
        },
        "architecture": {
            "en-US": "A simple layered architecture: domain (pieces, board and rules), application (game control and turns) and console UI. The domain layer is completely independent from presentation.",
            "ja-JP": "アーキテクチャは単純なレイヤ構造です。ドメイン（駒、盤面、ルール）、アプリケーション（対局進行とターン制御）、コンソール UI に分かれ、ドメイン層は表示層から完全に独立しています。",
        },
    },
    "claw-code": {
        "overview": {
            "en-US": """Fork of the Claw Code project, focused on building useful tooling for analyzing and experimenting with code-agent architectures such as Claude Code.

## Motivation

Understanding how coding agents work internally — system prompts, tool loops, context decisions — is essential for anyone automating engineering workflows. This project turns a reference implementation into practical tooling.

## Rust rewrite

The current version is being rewritten in Rust to improve:

- **Performance** — parsing and analyzing large prompts without runtime overhead
- **Portability** — a single binary with no external dependencies
- **CLI ergonomics** — a polished terminal interface with structured output

## Relationship with the ecosystem

It complements **system-prompts-and-models-of-ai-tools** as a practical companion for prompt engineering and agent-architecture analysis.""",
            "ja-JP": """Claude Code のようなコードエージェントのアーキテクチャを分析・実験するための実用ツールを作ることに焦点を当てた、Claw Code プロジェクトのフォークです。

## 動機

コードエージェントの内部動作、つまり system prompt、tool loop、コンテキスト判断を理解することは、開発フローを自動化するうえで重要です。このプロジェクトは、参照実装を実用ツールへと変換します。

## Rust への書き直し

現在のバージョンは、次を改善するため Rust へ書き直し中です。

- **性能** — 大きな prompt をランタイム・オーバーヘッドなしに解析
- **可搬性** — 依存の少ない単一バイナリ
- **CLI 体験** — 整形済み出力を持つ使いやすい端末インターフェース

## エコシステムとの関係

**system-prompts-and-models-of-ai-tools** を、より実践的なプロンプト工学・エージェント分析ツールとして補完します。""",
        },
        "problem_solution": {
            "en-US": "Coding agents are powerful black boxes, but understanding their internal architecture is what makes them usable with intent. This project builds tools to inspect, compare and experiment with those architectures.",
            "ja-JP": "コードエージェントは強力なブラックボックスですが、意図を持って使うには内部アーキテクチャの理解が欠かせません。このプロジェクトは、その構造を観察し、比較し、実験するためのツールを作ります。",
        },
        "architecture": {
            "en-US": "Rust CLI with subcommands for prompt parsing, version comparison and tool-definition analysis. Structured as a Cargo workspace with separate crates for parsing, rendering and the CLI surface.",
            "ja-JP": "prompt 解析、バージョン比較、tool definition 分析のためのサブコマンドを備えた Rust CLI です。Cargo workspace として構成され、parsing、rendering、CLI の各責務を別 crate に分離しています。",
        },
    },
    "deepseek-v3": {
        "overview": {
            "en-US": """Fork of the official DeepSeek-V3 repository, a large language model with 671B total parameters that activates only 37B per token during inference through a Mixture-of-Experts (MoE) architecture.

## MoE architecture

Mixture-of-Experts makes it possible to scale models without increasing compute cost proportionally:

- **Router** — decides which experts to activate for each token
- **Expert layers** — specialized feed-forward modules, of which only a fraction is active at once
- **Multi-head Latent Attention (MLA)** — compresses key-value caches to reduce memory usage during inference

## Why it matters for study

DeepSeek-V3 is a useful reference for understanding:

- Trade-offs between total parameter count and inference cost
- FP8 mixed-precision training strategies
- Expert-load balancing without auxiliary losses
- Distributed training through pipeline parallelism""",
            "ja-JP": """公式 DeepSeek-V3 リポジトリのフォークです。総パラメータ 671B の大規模言語モデルで、Mixture-of-Experts (MoE) により推論時にはトークンごとに 37B だけを活性化します。

## MoE アーキテクチャ

Mixture-of-Experts は、計算コストを比例的に増やさずにモデルをスケールさせる仕組みです。

- **Router** — 各トークンでどの expert を有効化するか決める
- **Expert layers** — 特化した feed-forward モジュール群で、一度に使うのは一部だけ
- **Multi-head Latent Attention (MLA)** — key-value cache を圧縮し、推論時のメモリ使用量を減らす

## 学習対象としての価値

DeepSeek-V3 は、次を理解するうえで有用な参照実装です。

- 総モデルサイズと推論コストのトレードオフ
- FP8 mixed-precision による学習戦略
- auxiliary loss を使わない expert 負荷分散
- pipeline parallelism による分散学習""",
        },
        "problem_solution": {
            "en-US": "Training and serving models with hundreds of billions of parameters is prohibitively expensive with dense architectures. MoE addresses that by activating only selective subsets of the model, preserving quality at roughly an order of magnitude lower compute cost.",
            "ja-JP": "数百億から数千億規模のパラメータを持つモデルを、dense な構造のまま学習・提供するのは極めて高コストです。MoE は必要な部分だけを選択的に活性化することで、品質を保ちながら計算コストを大幅に抑えます。",
        },
        "architecture": {
            "en-US": "A transformer with DeepSeekMoE layers. Each layer has a router that selects top-K experts from a larger pool. V3's key innovation is removing auxiliary balancing losses and replacing them with a dynamic router-bias mechanism.",
            "ja-JP": "DeepSeekMoE layer を備えた transformer 構成です。各 layer には、より大きな expert pool から top-K expert を選択する router があります。V3 の主な革新は、auxiliary balancing loss を廃し、動的な router bias メカニズムに置き換えた点です。",
        },
    },
    "financial": {
        "overview": {
            "en-US": """Monolithic personal-finance application, developed as an architecture exercise in .NET with Entity Framework and SQL Server.

## Features

- Registration and categorization of income and expenses
- Reports by period and category
- Balance tracking and simple projections

## Relationship with the ecosystem

This project is the direct predecessor of **SplitCosts** — the natural evolution from a personal-finance monolith to a multi-tenant expense-sharing system. Several domain decisions later used in SplitCosts were refined from the limitations identified here.

## Lessons learned

The monolithic format worked for the initial scope, but its limits became obvious as the domain grew: business rules coupled to infrastructure, difficulty testing complex scenarios and no clear separation between read and write concerns.""",
            "ja-JP": """Entity Framework と SQL Server を用いた .NET アーキテクチャ演習として開発した、個人家計向けモノリシック・アプリケーションです。

## 機能

- 収入と支出の登録・カテゴリ分類
- 期間別・カテゴリ別レポート
- 残高管理と簡易予測

## エコシステムとの関係

このプロジェクトは **SplitCosts** の直接の前身です。個人家計モノリスから、マルチテナントの支出共有アプリへと進化する出発点でした。SplitCosts で洗練されたドメイン上の判断の多くは、ここで見つかった限界から生まれています。

## 学び

モノリス構成は初期スコープには十分でしたが、ドメインが広がると限界が明確になりました。ビジネスルールとインフラの結合、複雑シナリオのテスト困難、読み書き責務の未分離です。""",
        },
        "problem_solution": {
            "en-US": "Personal finance needs to stay simple enough for daily use while remaining structured enough to generate useful reports. The core challenge was balancing practicality with a correct domain model.",
            "ja-JP": "個人家計管理は、日常利用できるだけの単純さと、有用なレポートを生むだけの構造化の両立が必要です。このプロジェクトの課題は、実用性と正しい金融ドメイン・モデリングのバランスでした。",
        },
        "architecture": {
            "en-US": "Layered monolith: Controllers → Services → Repository → Entity Framework → SQL Server. The architecture fits the scope, but coupling between layers later motivated a more modular approach in SplitCosts.",
            "ja-JP": "レイヤード・モノリス構成です。Controllers → Services → Repository → Entity Framework → SQL Server。スコープには適していますが、レイヤ間の結合が強く、後に SplitCosts でよりモジュール化された設計へ進む動機になりました。",
        },
    },
    "gaussian-splatting": {
        "overview": {
            "en-US": """Fork of the reference implementation for the paper "3D Gaussian Splatting for Real-Time Radiance Field Rendering" (SIGGRAPH 2023).

## What Gaussian Splatting is

Unlike NeRFs (Neural Radiance Fields), which rely on neural networks to represent scenes, Gaussian Splatting models a scene as millions of semi-transparent 3D Gaussians. Each Gaussian carries:

- **Position** (xyz) in 3D space
- **Covariance** (3x3) defining shape and orientation
- **Opacity** (alpha)
- **Color** represented with spherical harmonics

## Advantages over NeRFs

- **Real-time rendering** (>100 FPS) instead of seconds per frame
- **Differentiable rasterization** for gradient-based optimization
- **No neural network in the inference stage** — only projection and alpha compositing
- **Visual quality** comparable to or better than state-of-the-art NeRFs

## Relevance

Neural-rendering techniques matter for 3D visualization, augmented reality and scene reconstruction from photographs.""",
            "ja-JP": """論文 "3D Gaussian Splatting for Real-Time Radiance Field Rendering"（SIGGRAPH 2023）の参照実装フォークです。

## Gaussian Splatting とは

NeRF（Neural Radiance Fields）のようにニューラルネットでシーンを表現するのではなく、Gaussian Splatting はシーンを半透明な 3D Gaussian の大量集合として表現します。各 Gaussian は次を持ちます。

- **位置** (xyz)
- **共分散** (3x3) による形状と向き
- **不透明度** (alpha)
- **球面調和関数で表された色**

## NeRF に対する利点

- **リアルタイム描画**（>100 FPS）で、NeRF のように 1 フレーム数秒かからない
- **微分可能ラスタライズ** により勾配最適化が可能
- **推論段階でニューラルネット不要** — 射影と alpha compositing のみ
- **視覚品質** は最先端 NeRF と同等以上

## 関連性

こうしたニューラル描画技術は、3D 可視化、拡張現実、写真からのシーン再構成に重要です。""",
        },
        "problem_solution": {
            "en-US": "NeRFs can produce impressive results, but they are too slow for real-time applications. Gaussian Splatting addresses that by replacing implicit neural representation with explicit geometric primitives that can be rasterized efficiently on the GPU.",
            "ja-JP": "NeRF は非常に高品質ですが、リアルタイム用途には遅すぎます。Gaussian Splatting は、暗黙的なニューラル表現を GPU で効率よくラスタライズできる明示的な幾何プリミティブに置き換えることで、この問題を解決します。",
        },
        "architecture": {
            "en-US": "Training pipeline: initialize via Structure-from-Motion (COLMAP) → iteratively optimize Gaussians through gradients → apply adaptive density control (split / clone / prune). Rendering is done through a custom tile-based CUDA rasterizer.",
            "ja-JP": "学習パイプラインは、Structure-from-Motion（COLMAP）による初期化 → 勾配による Gaussian 最適化 → adaptive density control（split / clone / prune）という流れです。描画はカスタムの tile-based CUDA rasterizer で行います。",
        },
    },
    "gemini-cli": {
        "overview": {
            "en-US": """Fork of Gemini CLI, Google's open-source AI agent that plugs the Gemini model directly into the terminal with the ability to execute system tools.

## Agent architecture

Gemini CLI implements a classic agent loop:

1. **Input** — receive a user instruction through the terminal
2. **Reasoning** — the Gemini model evaluates context and chooses the next action
3. **Tool execution** — run tools such as shell, file read/write or search
4. **Observation** — feed tool results back into the next cycle
5. **Output** — produce the final response

## Why this fork

Comparative study of coding-agent architectures. It contrasts Gemini CLI with Claude Code and other agents cataloged in **system-prompts-and-models-of-ai-tools**.

## Topics of interest

- Context and memory management across turns
- Tool selection and parameter extraction
- Sandboxing and execution permissions
- Streaming of long responses""",
            "ja-JP": """Gemini モデルを端末に直接接続し、システムツールを実行できる Google 製オープンソース AI エージェント、Gemini CLI のフォークです。

## エージェント・アーキテクチャ

Gemini CLI は古典的なエージェント・ループを実装しています。

1. **Input** — 端末経由でユーザー指示を受け取る
2. **Reasoning** — Gemini モデルが文脈を評価し、次の行動を決める
3. **Tool execution** — shell、ファイル読取/書込、検索などを実行する
4. **Observation** — ツール結果を次のサイクルへ戻す
5. **Output** — 最終応答を返す

## このフォークの理由

コードエージェント・アーキテクチャの比較研究です。**system-prompts-and-models-of-ai-tools** に整理された Claude Code などのエージェントと対比できます。

## 注目ポイント

- ターンをまたぐコンテキストとメモリ管理
- ツール選択とパラメータ抽出
- サンドボックスと実行権限
- 長文レスポンスのストリーミング""",
        },
        "problem_solution": {
            "en-US": "Terminal-based coding agents need to balance autonomy and safety: system-tool execution is powerful but risky. Studying Gemini CLI reveals how Google approaches that trade-off in practice.",
            "ja-JP": "端末型のコードエージェントは、自律性と安全性の両立が必要です。システムツールの実行は強力ですが危険も伴います。Gemini CLI を分析すると、そのトレードオフに Google がどう向き合っているかが見えてきます。",
        },
        "architecture": {
            "en-US": "A TypeScript / Node.js CLI built around a tool-using agent loop. It streams data from the Gemini API, keeps conversation history and executes local tools with explicit user confirmation for destructive actions.",
            "ja-JP": "TypeScript / Node.js 製 CLI で、tool-use を前提にしたエージェント・ループを中心に構成されています。Gemini API とストリーミング通信し、会話履歴を保持しつつ、破壊的操作には明示的な確認を求めてローカルツールを実行します。",
        },
        "impact": {
            "en-US": [
                "Comparative study of agent architectures: ReAct vs planner vs tree-of-thought in a real CLI context",
                "Fork used as a reference base for Ronaldinho Agent, the in-house .NET agent design",
            ],
            "ja-JP": [
                "実運用 CLI 文脈でのエージェント・アーキテクチャ比較: ReAct vs planner vs tree-of-thought",
                "自前の .NET エージェントである Ronaldinho Agent 設計の参照ベースとして活用",
            ],
        },
        "trade_offs": {
            "en-US": [
                "Fork vs. greenfield build: forking accelerated learning, but it also inherited Google's design decisions",
                "TypeScript / Node.js vs. Go: the JS ecosystem speeds up prototyping, but runtime overhead is visible in filesystem-heavy workloads",
            ],
            "ja-JP": [
                "fork かゼロから実装するか: fork は学習を加速したが、Google 側の設計判断も引き継ぐことになった",
                "TypeScript / Node.js vs Go: JS エコシステムは試作が速い一方、filesystem-heavy な処理ではランタイム負荷が見える",
            ],
        },
        "lessons": {
            "en-US": [
                "Gemini CLI's permission model, built around an allow-list of tools, is safer than opt-out designs",
                "CLI agent loops need aggressive per-step timeouts — otherwise they can stall indefinitely on I/O",
            ],
            "ja-JP": [
                "Gemini CLI の権限モデルは allow-list 前提で、opt-out 型の設計より安全だった",
                "CLI のエージェント・ループにはステップごとの厳しい timeout が必要で、そうしないと I/O で無限停止しやすい",
            ],
        },
    },
    "gis-incident-lab": {
        "overview": {
            "en-US": "This lab consolidates an operations-first GIS workstream. The focus is not only the map itself, but how to turn spatial data into actionable operational reading.",
            "ja-JP": "このラボは、運用起点の GIS ワークストリームを集約したものです。焦点は地図そのものではなく、空間データを行動可能な運用情報に変えることにあります。",
        },
        "problem_solution": {
            "en-US": "Spatial data usually arrives incomplete, noisy and expensive to process. The adopted solution treats each stage as part of an asynchronous pipeline, with explicit contracts between ingestion, transformation and read models.",
            "ja-JP": "空間データは、多くの場合、不完全でノイズが多く、処理コストも高い状態で届きます。そこで、取り込み・変換・読み取りモデルの間に明示的な契約を置いた非同期パイプラインとして各段階を扱います。",
        },
        "architecture": {
            "en-US": "The design prioritizes traceability and operational projections. Ingestion and enrichment services publish events; the read layer consolidates views and signals for response teams.",
            "ja-JP": "設計はトレーサビリティと運用向け投影を優先します。取り込み・エンリッチメント・サービスがイベントを書き出し、読み取り層が対応チーム向けのビューとシグナルを統合します。",
        },
        "stack_notes": {
            "en-US": "GIS is treated here as part of the product, not as a visual appendix. That completely changes how contracts, acceptable latency and observability are modeled.",
            "ja-JP": "ここでの GIS は可視化の付属物ではなく、製品そのものの一部として扱われます。その前提が、契約、許容レイテンシ、可観測性のモデリングを根本から変えます。",
        },
        "production_notes": {
            "en-US": "Pipeline in continuous production use since 2024. Real stack: .NET for ingestion and normalization services, Python for heavy geoprocessing. Separating calculation from business rules allowed the data team to iterate without affecting the operational API. Mean resolution time for GIS incidents dropped from 4 hours to 45 minutes after adopting the ops view.",
            "ja-JP": "2024 年から継続的に運用中のパイプラインです。実スタックは、取り込みと正規化サービスに .NET、重い地理処理に Python を使用。計算処理と業務ルールを分離したことで、データチームは運用 API に影響を与えず改善を回せました。GIS インシデントの平均解決時間は、ops view 採用後に 4 時間から 45 分へ短縮しました。",
        },
        "adr": {
            "en-US": [
                "Separate raw geoprocessing from the operational read layer.",
                "Model risk events as domain facts, not only as technical logs.",
            ],
            "ja-JP": [
                "生の地理処理を運用向け読み取り層から分離する。",
                "リスクイベントを技術ログではなくドメイン事実としてモデル化する。",
            ],
        },
        "roadmap": {
            "en-US": [
                "Add diagram previews for geospatial flows.",
                "Document ingestion contracts in more detail.",
            ],
            "ja-JP": [
                "地理空間フロー向けの図プレビューを追加する。",
                "取り込み契約をより詳細に文書化する。",
            ],
        },
        "impact": {
            "en-US": [
                "Ingestion pipeline processes 200k geospatial points in under 8 minutes (previously 45 minutes in a monolith)",
                "Ops view refreshes in under 30 seconds — field teams operate on near-real-time data",
                "Three regressions avoided in 6 months by separating spatial computation from business rules",
            ],
            "ja-JP": [
                "取り込みパイプラインが 20 万件の地理空間ポイントを 8 分未満で処理（以前はモノリスで 45 分）",
                "ops view は 30 秒未満で更新され、現場チームはほぼリアルタイムのデータで動ける",
                "空間計算と業務ルールの分離により、6 か月で 3 件の回帰事故を回避",
            ],
        },
        "trade_offs": {
            "en-US": [
                "Asynchronous pipeline vs. synchronous endpoint: higher end-to-end latency, but far better resilience and observability",
                "Versioned contracts between stages: high upfront overhead, but zero breaking changes across 8 months of operation",
                "Event-driven design requires dedicated messaging infrastructure: +15% operational cost, but full decoupling between ingestion and reads",
            ],
            "ja-JP": [
                "非同期パイプライン vs 同期 endpoint: end-to-end レイテンシは増えるが、レジリエンスと可観測性は大幅に向上",
                "段階間の versioned contract は初期コストが高いが、8 か月間 breaking change はゼロ",
                "event-driven 設計には専用メッセージング基盤が必要で運用コストは +15% だが、取り込みと読み取りを完全に疎結合化できた",
            ],
        },
        "lessons": {
            "en-US": [
                "External geocoding consumed 80% of pipeline time — aggressive caching and local fallback removed the bottleneck",
                "Monitoring each stage individually delivered the highest ROI by exposing bottlenecks that were invisible in the monolith",
                "In crisis contexts, deployment simplicity beats design elegance — direct Python scripts saved lives in Brumadinho",
            ],
            "ja-JP": [
                "外部 geocoding がパイプライン時間の 80% を占めており、積極的なキャッシュとローカル fallback がボトルネックを解消した",
                "各段階を個別監視する投資が最も高い ROI を出し、モノリスでは見えなかった詰まりを可視化した",
                "危機時には設計の美しさよりデプロイの単純さが勝つ — 直接的な Python スクリプトが Brumadinho で実際に役立った",
            ],
        },
    },
    "java-servlet-pages": {
        "overview": {
            "en-US": """Study project on web development with Java Servlets and JavaServer Pages (JSP), using Apache Tomcat as the container.

## Covered concepts

- **Servlet lifecycle** — init, service and destroy
- **HTTP requests** — handling GET, POST, redirects and forwarding
- **Sessions and cookies** — state management across requests
- **Filters** — intercepting and processing requests before they hit servlets
- **MVC pattern** — separation between model (JavaBeans), view (JSP) and controller (Servlets)

## Context

Modern frameworks such as Spring Boot abstract most of these details, but understanding Servlets is still essential for grasping how the Java web ecosystem works underneath. Spring MVC itself is built on top of the Servlet API.""",
            "ja-JP": """Apache Tomcat をコンテナとして使い、Java Servlets と JavaServer Pages (JSP) による Web 開発を学ぶプロジェクトです。

## 扱う概念

- **Servlet lifecycle** — init、service、destroy
- **HTTP request** — GET、POST、redirect、forward の処理
- **session と cookie** — リクエストをまたぐ状態管理
- **filter** — servlet に届く前のリクエスト横取りと前処理
- **MVC pattern** — model（JavaBeans）、view（JSP）、controller（Servlets）の分離

## 背景

Spring Boot のような現代的フレームワークはこれらを大きく抽象化しますが、Servlet を理解することは Java Web が下層でどう動いているかを知るうえで不可欠です。Spring MVC も Servlet API の上に構築されています。""",
        },
        "problem_solution": {
            "en-US": "Modern frameworks hide too much of Java's HTTP foundations. This project exposes the Servlet API directly to build a solid understanding of request processing before relying on higher-level abstractions.",
            "ja-JP": "現代のフレームワークは、Java における HTTP の基礎を抽象化しすぎる傾向があります。このプロジェクトでは Servlet API を直接扱い、高水準抽象に進む前にリクエスト処理の基礎理解を固めます。",
        },
        "architecture": {
            "en-US": "Traditional Java EE web application: `web.xml` for servlet and filter configuration, JSP for view rendering and JavaBeans as data models. Packaged as a WAR and deployed on Apache Tomcat.",
            "ja-JP": "伝統的な Java EE Web アプリ構成です。servlet と filter の設定には `web.xml`、view の描画には JSP、データモデルには JavaBeans を使用し、WAR として Apache Tomcat にデプロイします。",
        },
    },
    "leaflet": {
        "overview": {
            "en-US": """Fork of Leaflet, the most widely used open-source JavaScript library for rendering interactive maps on the web.

## Role in the ecosystem

Leaflet is the map-visualization layer used in **SOS Location**, **brumadinho_location** and **GIS Incident Lab**. Keeping the fork available makes it possible to:

- Study tile and layer rendering internals
- Test custom plugins before integrating them into production projects
- Evaluate performance under large marker volumes

## Technical capabilities

- **Tile layers** — support for multiple providers such as OpenStreetMap and Mapbox
- **GeoJSON** — native rendering of geospatial data
- **Markers and popups** — interaction with points of interest
- **Layer control** — composition of overlays for operational views
- **Mobile-first** — touch events and native gestures

## Relevance in crisis projects

In disaster-response systems, being able to render thousands of points efficiently and to operate offline through tile caching is critical for field teams.""",
            "ja-JP": """Web 上でインタラクティブ地図を描画する、最も広く使われているオープンソース JavaScript ライブラリ Leaflet のフォークです。

## エコシステム内での役割

Leaflet は **SOS Location**、**brumadinho_location**、**GIS Incident Lab** で使われている地図可視化レイヤです。フォークを維持することで、次を実現できます。

- tile と layer 描画の internals を調べる
- 本番統合前にカスタム plugin を試す
- 大量 marker 下での性能を評価する

## 技術的な能力

- **Tile layers** — OpenStreetMap や Mapbox など複数プロバイダ対応
- **GeoJSON** — 地理空間データのネイティブ描画
- **Markers / popups** — 関心地点との対話
- **Layer control** — 運用ビュー向け overlay 合成
- **Mobile-first** — touch event とネイティブ gesture

## 危機対応プロジェクトでの重要性

災害対応では、何千もの点を高速に描画し、tile cache を通じてオフラインでも動けることが現場にとって重要です。""",
        },
        "problem_solution": {
            "en-US": "Interactive web maps need to stay lightweight, fast and usable on mobile devices in the field. Leaflet achieves that with a minimal, extensible API, avoiding the weight and complexity of heavier map stacks.",
            "ja-JP": "Web のインタラクティブ地図は、軽量・高速で、現場のモバイル端末でも使えなければなりません。Leaflet は最小限で拡張しやすい API によって、それを重い地図スタックなしに実現します。",
        },
        "architecture": {
            "en-US": "Modular library with a core responsible for tile rendering, layer management and viewport control. It is extended through plugins for clustering, heatmaps, drawing tools and other behaviors.",
            "ja-JP": "tile 描画、layer 管理、viewport 制御を担う core を中心としたモジュール型ライブラリです。clustering、heatmap、draw tools などの機能は plugin で拡張できます。",
        },
    },
    "macos": {
        "overview": {
            "en-US": """Fork of the project that runs macOS inside a Docker container by using QEMU / KVM for virtualization.

## Motivation

Cross-platform development often requires testing on macOS without access to Apple hardware. This project makes it possible to create ephemeral macOS environments for:

- Compatibility testing
- Building iOS / macOS projects from Linux CI pipelines
- Experimenting with macOS-only APIs

## How it works

The container uses QEMU with KVM acceleration to virtualize the required hardware, including Apple-specific device emulation. A macOS image is loaded from a virtual disk inside the container.

## Considerations

macOS virtualization is subject to Apple's licensing terms (EULA), which restrict execution to genuine Apple hardware. This fork is kept for studying virtualization technology, not for production use.""",
            "ja-JP": """QEMU / KVM を用いて Docker コンテナ内で macOS を動かすプロジェクトのフォークです。

## 動機

クロスプラットフォーム開発では、Apple ハードウェアがなくても macOS 上での検証が必要になることがあります。このプロジェクトは、次のための使い捨て macOS 環境を作れるようにします。

- 互換性テスト
- Linux CI からの iOS / macOS ビルド
- macOS 専用 API の実験

## 仕組み

コンテナは QEMU と KVM アクセラレーションを用いて必要なハードウェアを仮想化し、Apple デバイスのエミュレーションも含みます。macOS イメージはコンテナ内の仮想ディスクから読み込まれます。

## 注意点

macOS 仮想化は Apple のライセンス規約（EULA）の対象であり、実行は正規 Apple ハードウェアに制限されます。このフォークは本番利用ではなく、仮想化技術の研究目的で保持しています。""",
        },
        "problem_solution": {
            "en-US": "Developers working on Linux or Windows but needing macOS testing face an access gap. Containerized virtualization reduces friction by creating disposable macOS environments, albeit with performance and licensing constraints.",
            "ja-JP": "Linux / Windows で開発しつつ macOS 検証が必要な開発者には、アクセス面のギャップがあります。コンテナ化された仮想化は、性能面とライセンス面の制約はあるものの、使い捨て macOS 環境を作ることで摩擦を下げます。",
        },
        "architecture": {
            "en-US": "Docker container with QEMU as the hypervisor, KVM for hardware acceleration and optional GPU passthrough. The macOS image is mounted as a QCOW2 virtual disk inside the container.",
            "ja-JP": "Docker コンテナ内で、QEMU を hypervisor、KVM をハードウェア高速化として使用し、必要に応じて GPU passthrough も利用できます。macOS イメージは QCOW2 仮想ディスクとしてマウントされます。",
        },
    },
    "maplebr": {
        "overview": {
            "en-US": """Server-and-tooling project for the MapleStory universe, with build automation orchestrated through Makefiles.

## Context

MapleStory has a long-standing private-server development community. This project brings together tooling, compilation scripts and configuration needed to maintain a server environment.

## Technical aspects

- **Build system** with Makefiles for compiling C++ components
- **Networking** — a custom client-server communication protocol
- **Data management** — handling of game data files (WZ files)
- **Automation** — scripts for deployment and server maintenance""",
            "ja-JP": """MapleStory のサーバーと周辺ツールを扱うプロジェクトで、Makefile によるビルド自動化を中心に構成されています。

## 背景

MapleStory には長く続くプライベートサーバー開発コミュニティがあります。このプロジェクトは、そのサーバー環境を維持するためのツール、コンパイル・スクリプト、設定をまとめたものです。

## 技術的な要素

- **Build system** — C++ コンポーネントをコンパイルする Makefile
- **Networking** — クライアント・サーバ間の独自通信プロトコル
- **Data management** — ゲームデータ（WZ files）の取り扱い
- **Automation** — デプロイと保守のためのスクリプト""",
        },
        "problem_solution": {
            "en-US": "Game servers require a complex build and configuration flow across multiple components. The Makefile centralizes that process and improves reproducibility when bringing the environment up.",
            "ja-JP": "ゲームサーバーは複数コンポーネントにまたがる複雑なビルド・設定フローを必要とします。Makefile はその手順を一元化し、環境構築の再現性を高めます。",
        },
        "architecture": {
            "en-US": "Multi-threaded C++ server with a proprietary network protocol. The Makefile orchestrates the build of modules such as login, game and channel servers, along with preparation of static game data.",
            "ja-JP": "独自ネットワークプロトコルを持つマルチスレッド C++ サーバーです。Makefile が login server、game server、channel server などのモジュールのビルドと、静的ゲームデータの準備をまとめて制御します。",
        },
    },
    "mermaid-live-editor": {
        "overview": {
            "en-US": """Fork of Mermaid Live Editor, the official web application for creating and previewing Mermaid diagrams in real time.

## Features

- **Editor with syntax highlighting** powered by Monaco Editor
- **Instant preview** — diagrams render live while the text changes
- **Export** — download as SVG, PNG or shareable links
- **Templates** — starter examples for each diagram type
- **Themes** — preview under different visual themes

## Practical use

It complements the **mermaid** fork as the place to prototype and validate diagrams before embedding them into Technical Knowledge OS posts and documents.

## Stack

Built with Svelte for a lightweight reactive UI, TypeScript for type safety and Monaco for the editing experience.""",
            "ja-JP": """Mermaid 図をリアルタイムに作成・プレビューできる公式 Web アプリ、Mermaid Live Editor のフォークです。

## 機能

- **syntax highlighting 付きエディタ** — Monaco Editor ベース
- **instant preview** — テキスト変更に合わせて即時描画
- **export** — SVG、PNG、共有リンクとして出力
- **template** — 図種ごとのスターター例
- **theme** — 複数の見た目でプレビュー可能

## 実用面

Technical Knowledge OS の記事や文書に組み込む前に、図を試作・検証する場所として **mermaid** フォークを補完します。

## スタック

軽量なリアクティブ UI のための Svelte、型安全のための TypeScript、編集体験のための Monaco を採用しています。""",
        },
        "problem_solution": {
            "en-US": "Writing Mermaid without visual feedback is slow and error-prone. The live editor shortens the iteration loop from minutes to seconds by rendering diagrams immediately.",
            "ja-JP": "視覚的なフィードバックなしで Mermaid を書くのは遅く、構文ミスも起こしやすくなります。live editor は即時描画によって、その反復サイクルを数分から数秒へ短縮します。",
        },
        "architecture": {
            "en-US": "Svelte SPA with three panels: editor (Monaco), preview (Mermaid renderer) and configuration (theme and diagram options). Shared state lives in Svelte stores. Export is done by serializing the rendered SVG.",
            "ja-JP": "Svelte SPA で、editor（Monaco）、preview（Mermaid renderer）、configuration（theme と diagram 設定）の 3 パネル構成です。共有状態は Svelte store で管理し、export は描画済み SVG を直列化して行います。",
        },
    },
    "mermaid": {
        "overview": {
            "en-US": """Fork of Mermaid.js, the text-to-diagram library integrated natively into Technical Knowledge OS.

## Use inside the ecosystem

Mermaid is used across posts, documents and project pages to render technical diagrams directly from markdown content:

- **Flowcharts** — processing flows and pipelines
- **Sequence diagrams** — interactions between services
- **Class diagrams** — domain modeling
- **ER diagrams** — database schemas
- **Gantt charts** — project schedules

## Integration

The blog rendering engine detects fenced code blocks marked as `mermaid` and renders them automatically to SVG on the client. The library is loaded via CDN with theming adapted to the site's design.

## Example

A block such as:

```
graph LR
  A[Input] --> B[Process]
  B --> C[Output]
```

is rendered directly as an interactive flow diagram in the page.""",
            "ja-JP": """Technical Knowledge OS にネイティブ統合されているテキストベース図表ライブラリ Mermaid.js のフォークです。

## エコシステム内での利用

Mermaid は記事、文書、プロジェクト・ページ全体で使われ、markdown から技術図を直接描画します。

- **Flowcharts** — 処理フローとパイプライン
- **Sequence diagrams** — サービス間相互作用
- **Class diagrams** — ドメインモデリング
- **ER diagrams** — DB スキーマ
- **Gantt charts** — プロジェクト日程

## 統合方法

ブログのレンダリングエンジンは `mermaid` と付いた fenced code block を検出し、クライアント側で自動的に SVG として描画します。ライブラリは CDN 経由で読み込み、テーマはサイトのデザインに合わせて調整しています。

## 例

次のようなブロックは:

```
graph LR
  A[Input] --> B[Process]
  B --> C[Output]
```

ページ上でそのままインタラクティブなフローダイアグラムとして表示されます。""",
        },
        "problem_solution": {
            "en-US": "Technical documentation based on static diagram images is hard to maintain and diff. Mermaid solves that by treating diagrams as code: versionable, reviewable and updated automatically when the text changes.",
            "ja-JP": "静的画像に依存する技術ドキュメントは保守しづらく、差分も追いにくいものです。Mermaid は図をコードとして扱うことでそれを解決します。バージョン管理でき、レビューしやすく、テキスト変更に合わせて自動更新されます。",
        },
        "architecture": {
            "en-US": "A PEG.js parser converts textual syntax into an AST, and the renderer turns that AST into SVG through D3.js. The library supports custom themes and integration with markdown parsers through fenced code blocks.",
            "ja-JP": "PEG.js parser がテキスト構文を AST に変換し、renderer がその AST を D3.js 経由で SVG に変換します。カスタムテーマや fenced code block を通じた markdown parser 連携もサポートしています。",
        },
    },
    "nhmatsumoto-exception-middleware": {
        "overview": {
            "en-US": """Global exception-handling middleware for ASP.NET Core applications, designed to standardize error responses in REST APIs.

## What it does

It intercepts all unhandled exceptions in the request pipeline and converts them into standardized HTTP responses:

- **Domain exceptions** → 400 Bad Request with a specific message
- **Validation exceptions** → 422 Unprocessable Entity with detailed information
- **Authentication exceptions** → 401 / 403 with context
- **Unmapped exceptions** → 500 Internal Server Error with a correlation ID

## Why use a dedicated middleware

Without centralized handling, each controller ends up with its own try/catch blocks, resulting in inconsistent error formats and duplicated logging logic. The middleware guarantees:

- Consistent response format (RFC 7807 Problem Details)
- Structured logging with correlation IDs
- Suppression of stack traces in production
- Extensibility through exception-type mappings

## Use in the ecosystem

This package is reused in **SplitCosts**, **Financial** and other .NET backends.""",
            "ja-JP": """REST API のエラーレスポンスを標準化するために設計された、ASP.NET Core アプリ向けのグローバル例外処理ミドルウェアです。

## 何をするか

リクエスト・パイプライン上の未処理例外を横取りし、標準化された HTTP レスポンスへ変換します。

- **ドメイン例外** → 具体的メッセージ付き 400 Bad Request
- **検証例外** → 詳細付き 422 Unprocessable Entity
- **認証例外** → 文脈付き 401 / 403
- **未マップ例外** → correlation ID 付き 500 Internal Server Error

## 専用ミドルウェアを使う理由

集中処理がないと、各 controller が独自の try/catch を持つことになり、エラー形式の不一致と logging ロジックの重複を招きます。このミドルウェアは次を保証します。

- 一貫したレスポンス形式（RFC 7807 Problem Details）
- correlation ID 付きの構造化ログ
- 本番環境での stack trace 抑制
- 例外型マッピングによる拡張性

## エコシステムでの利用

**SplitCosts**、**Financial** などの .NET バックエンドで再利用されています。""",
        },
        "problem_solution": {
            "en-US": "APIs without centralized error handling leak internal details, return inconsistent payloads and make debugging harder. This middleware fixes that through a single interception point that standardizes every error response.",
            "ja-JP": "集中したエラーハンドリングがない API は内部情報を漏らしやすく、payload 形式も不揃いになり、デバッグも難しくなります。このミドルウェアは単一の横取りポイントで全エラーレスポンスを標準化して、それを解決します。",
        },
        "architecture": {
            "en-US": "ASP.NET Core middleware registered early in the pipeline through `app.UseMiddleware`. It uses an exception-type → status-code mapping dictionary and integrates with `ILogger` for structured logging.",
            "ja-JP": "ASP.NET Core の `app.UseMiddleware` でパイプラインの早い段階に登録するミドルウェアです。例外型 → ステータスコードのマッピング辞書を使い、`ILogger` と統合して構造化ログを出します。",
        },
    },
    "nhmatsumoto-github-io": {
        "overview": {
            "en-US": """This is the Technical Knowledge OS repository — the site you are using right now. A technical-publishing platform built from scratch with a Python static-site engine and an interactive 3D visualization layer.

## Engine architecture

The static-site engine processes TOML content, renders markdown to HTML and outputs a complete site with:

- **Posts** — technical articles with support for math, Mermaid, code blocks and tables
- **Projects** — a portfolio backed by structured data and an interactive viewer
- **Documents** — technical specs with versioned publication
- **i18n** — multi-language content support
- **Search** — a client-side JSON index

## 3D visualization

The projects page uses Three.js to render an interactive 3D graph where each node represents a project, post or document. The graph includes:

- A starfield with 4,000 particles
- Glass-like nodes with glow and orbit effects
- Bezier connections between nodes
- A detail panel with navigation
- Reader mode for inline content

## Deploy

GitHub Actions runs the build on every push to `master` and deploys the generated output to GitHub Pages automatically.""",
            "ja-JP": """これは、今見ているサイトそのもの、Technical Knowledge OS のリポジトリです。Python 製の静的サイトエンジンとインタラクティブな 3D 可視化レイヤでゼロから構築した技術出版プラットフォームです。

## エンジンのアーキテクチャ

静的サイト・エンジンは TOML コンテンツを処理し、markdown を HTML に変換して、次を備えた完全なサイトを出力します。

- **Posts** — 数式、Mermaid、code block、表を含む技術記事
- **Projects** — 構造化データと対話型ビューアを備えたポートフォリオ
- **Documents** — バージョン付き公開が可能な技術仕様
- **i18n** — 多言語対応
- **Search** — クライアント側 JSON インデックス

## 3D 可視化

projects ページでは Three.js を使い、各ノードが project、post、document を表す 3D グラフを描画します。主な要素は次の通りです。

- 4,000 パーティクルの starfield
- ガラス調ノードと glow / orbit エフェクト
- ノード間の Bezier 接続
- ナビゲーション付き detail panel
- inline 読書のための reader mode

## デプロイ

GitHub Actions が `master` への各 push ごとに build を実行し、生成物を GitHub Pages へ自動デプロイします。""",
        },
        "problem_solution": {
            "en-US": "Existing blog platforms are too generic for a technical portfolio that needs interactive visualization, math rendering and full control over design and structure. Technical Knowledge OS solves that by treating content as a first-class domain.",
            "ja-JP": "既存のブログ基盤は、インタラクティブ可視化、数式表示、設計と構造への完全な制御を必要とする技術ポートフォリオには汎用的すぎます。Technical Knowledge OS は、コンテンツを第一級のドメインとして扱うことでそれを解決します。",
        },
        "architecture": {
            "en-US": "Modular Python engine: loader (TOML → dict), renderer (dict → HTML) and generator (orchestration). Static assets are copied directly. Three.js is loaded through import maps for the 3D graph, and GitHub Actions handles CI/CD.",
            "ja-JP": "モジュール化された Python エンジンで、loader（TOML → dict）、renderer（dict → HTML）、generator（オーケストレーション）に分かれています。静的アセットはそのままコピーされ、3D グラフには import map 経由で Three.js を読み込みます。CI/CD は GitHub Actions が担当します。",
        },
    },
    "playground-fe": {
        "overview": {
            "en-US": """Frontend project built with React and TypeScript, with full Keycloak integration for authentication and authorization.

## Features

- **Login / Logout** via Keycloak using OAuth2 / OIDC flows
- **Token management** — automatic refresh of access tokens
- **Protected routes** — routes that require authentication
- **Role-based UI** — components conditional on Keycloak roles
- **Silent refresh** — token renewal without interrupting the session

## Technical stack

- React with hooks and the Context API for state management
- TypeScript for full-application type safety
- Keycloak JS adapter for identity-provider integration
- Vite as the build tool

## Relationship with the ecosystem

This playground serves as the authentication baseline for **SplitCosts-FE** and other frontends that need access control. Keycloak integration choices validated here are reused in production systems.""",
            "ja-JP": """React と TypeScript で構築したフロントエンド・プロジェクトで、認証・認可のための Keycloak 統合をフルで備えています。

## 機能

- **Login / Logout** — OAuth2 / OIDC フローによる Keycloak 認証
- **Token management** — access token の自動 refresh
- **Protected routes** — 認証が必要な route
- **Role-based UI** — Keycloak role に応じた条件付きコンポーネント
- **Silent refresh** — セッションを切らさず token を更新

## 技術スタック

- state 管理に hooks と Context API を用いた React
- アプリ全体の型安全のための TypeScript
- IdP 連携のための Keycloak JS adapter
- build tool としての Vite

## エコシステムとの関係

この playground は **SplitCosts-FE** など、アクセス制御が必要なフロントエンドの認証ベースになります。ここで検証した Keycloak 統合方針は本番システムでも再利用されます。""",
        },
        "problem_solution": {
            "en-US": "Implementing OAuth2 / OIDC correctly in SPAs has plenty of traps: PKCE, silent refresh, CORS and distributed logout. This playground isolates the authentication complexity before it reaches production apps.",
            "ja-JP": "SPA で OAuth2 / OIDC を正しく実装するには、PKCE、silent refresh、CORS、分散 logout など多くの落とし穴があります。この playground は、その認証の複雑さを本番アプリに持ち込む前に切り離して検証します。",
        },
        "architecture": {
            "en-US": "React SPA with the Keycloak JS adapter initialized during bootstrap. The adapter manages access, refresh and ID token lifecycles and exposes an `AuthContext` to the full component tree.",
            "ja-JP": "bootstrap 時に Keycloak JS adapter を初期化する React SPA です。adapter が access / refresh / ID token のライフサイクルを管理し、`AuthContext` をコンポーネント・ツリー全体に公開します。",
        },
    },
    "prog-lib": {
        "overview": {
            "en-US": """Reference library with implementations of fundamental algorithms and data structures from computer science.

## Content

Collection organized by category:

- **Sorting** — quicksort, mergesort, heapsort and radix sort
- **Search** — binary search, BFS, DFS and A*
- **Structures** — lists, stacks, queues, trees, graphs and hash tables
- **Graphs** — Dijkstra, Bellman-Ford, topological sort and MST
- **Dynamic programming** — knapsack, LCS and edit distance
- **Strings** — KMP, Rabin-Karp and suffix arrays

## Purpose

The goal is fast lookup and study, with implementations that favor clarity and annotation over micro-optimization.""",
            "ja-JP": """計算機科学の基本アルゴリズムとデータ構造の実装をまとめたリファレンス・ライブラリです。

## 内容

カテゴリごとに整理されたコレクション:

- **Sorting** — quicksort、mergesort、heapsort、radix sort
- **Search** — binary search、BFS、DFS、A*
- **Structures** — list、stack、queue、tree、graph、hash table
- **Graphs** — Dijkstra、Bellman-Ford、topological sort、MST
- **Dynamic programming** — knapsack、LCS、edit distance
- **Strings** — KMP、Rabin-Karp、suffix array

## 目的

狙いは素早い参照と学習であり、実装はマイクロ最適化より明快さと注釈を優先しています。""",
        },
        "problem_solution": {
            "en-US": "Algorithms and data structures are fundamentals that need to be revisited repeatedly. Keeping a personal library of implementations makes quick consultation easier and reinforces conceptual understanding.",
            "ja-JP": "アルゴリズムとデータ構造は何度も立ち返る必要がある基礎です。個人用の実装ライブラリを持つことで、素早い参照ができ、概念理解も強化されます。",
        },
        "architecture": {
            "en-US": "Organized by category, each implementation is self-contained and documented inline with time and space complexity, invariants and relevant edge cases.",
            "ja-JP": "カテゴリごとに整理され、各実装は自己完結しています。時間計算量・空間計算量、invariant、重要な edge case を inline で記述しています。",
        },
    },
    "quickreaderv1": {
        "overview": {
            "en-US": """Speed-reading application that presents text in optimized chunks, inspired by the RSVP (Rapid Serial Visual Presentation) technique.

## How it works

Text is divided into small fragments of one to three words and displayed sequentially at the center of the screen. The focal point (ORP — Optimal Recognition Point) of each word is highlighted to reduce eye movement.

## Features

- Reading-speed control (words per minute)
- Progress tracking
- Text import in multiple formats
- Chunk-size adjustment based on text complexity

## Context

The project explores the boundary between user interface design and human cognition — how text presentation influences reading speed and comprehension.""",
            "ja-JP": """RSVP（Rapid Serial Visual Presentation）に着想を得て、最適化されたチャンク単位でテキストを提示する速読アプリです。

## 仕組み

テキストを 1〜3 語の小さな断片に分割し、画面中央に順番に表示します。各語の焦点（ORP — Optimal Recognition Point）を強調し、眼球移動を減らします。

## 機能

- 読書速度の制御（words per minute）
- 進捗トラッキング
- 複数形式のテキスト import
- テキスト複雑度に応じた chunk サイズ調整

## 背景

このプロジェクトは、UI 設計と人間の認知の境界、つまりテキスト提示方法が読書速度と理解度にどう影響するかを探ります。""",
        },
        "problem_solution": {
            "en-US": "Conventional reading is limited by saccades and regressions. RSVP reduces those effects by fixing the presentation point, enabling significantly higher reading speeds for the right kind of content.",
            "ja-JP": "通常の読書は、サッカードと回帰によって速度が制約されます。RSVP は表示位置を固定することでそれらを減らし、適したコンテンツでは読書速度を大きく引き上げます。",
        },
        "architecture": {
            "en-US": "React / TypeScript SPA with a state machine controlling presentation flow. Text is processed through a pipeline: input → tokenize → chunk → schedule → render.",
            "ja-JP": "表示フローを state machine で制御する React / TypeScript SPA です。テキストは input → tokenize → chunk → schedule → render のパイプラインで処理されます。",
        },
    },
    "react-data-grid": {
        "overview": {
            "en-US": """Fork of `react-data-grid`, a high-performance React component for displaying and editing tabular data.

## Features

- **Virtualization** — render only visible rows, supporting millions of records
- **Sorting** — ordering by multiple columns
- **Filtering** — per-column filters with customizable operators
- **Inline editing** — edit cells directly with validation
- **Column resizing / reordering** — adjustable width and order
- **Copy / Paste** — clipboard support for bulk operations

## Use inside the ecosystem

It serves as a reference for data-visualization components in **SplitCosts-FE** and other projects that need to render large tables efficiently.

## Why virtualization matters

Rendering 10,000 rows directly in the DOM degrades browser performance. Virtualization solves that by rendering only the visible viewport while simulating smooth scroll behavior.""",
            "ja-JP": """表形式データの表示と編集に特化した高性能 React コンポーネント `react-data-grid` のフォークです。

## 機能

- **Virtualization** — 表示中の行だけを描画し、数百万レコードに対応
- **Sorting** — 複数列での並び替え
- **Filtering** — カスタマイズ可能な列単位フィルタ
- **Inline editing** — 検証付きセル直接編集
- **Column resizing / reordering** — 幅と順序の調整
- **Copy / Paste** — 一括操作向け clipboard 対応

## エコシステムでの利用

**SplitCosts-FE** など、大量データ表を高効率に描画したいプロジェクトのための参照実装として使っています。

## なぜ virtualization が重要か

10,000 行をそのまま DOM に描画するとブラウザ性能は大きく落ちます。virtualization は表示中の viewport だけを描画し、滑らかなスクロールを維持します。""",
        },
        "problem_solution": {
            "en-US": "Native HTML tables do not scale well for large datasets. `react-data-grid` addresses that through row and column virtualization while preserving a familiar declarative React API.",
            "ja-JP": "ネイティブの HTML table は大規模データにうまくスケールしません。`react-data-grid` は、宣言的な React API を保ったまま、行・列 virtualization によってその問題を解決します。",
        },
        "architecture": {
            "en-US": "React component built around `position: absolute` and CSS-transform-based virtualization. The scroll handler computes visible rows and recycles DOM nodes while the user moves through the grid.",
            "ja-JP": "`position: absolute` と CSS transform を用いた virtualization を核にした React コンポーネントです。scroll handler が可視行を計算し、グリッド移動中に DOM node を再利用します。",
        },
    },
    "responsemiddleware": {
        "overview": {
            "en-US": """Response-standardization middleware for ASP.NET Core APIs, designed to complement **nhmatsumoto.exception.middleware**.

## What it does

It intercepts controller responses and wraps them in a standardized envelope:

```json
{
  "success": true,
  "data": { ... },
  "errors": [],
  "metadata": {
    "timestamp": "2026-04-05T00:00:00Z",
    "requestId": "abc-123"
  }
}
```

## Benefits

- **Consistency** — every endpoint returns the same top-level format
- **Metadata** — timestamps, request IDs and paging data are added automatically
- **Error wrapping** — validation failures fit into the same contract
- **Transparency** — controllers return plain objects while the middleware shapes the envelope

## Combined usage

It works together with the exception middleware: one standardizes uncaught failures, the other normalizes every successful or controlled response.""",
            "ja-JP": """**nhmatsumoto.exception.middleware** を補完する、ASP.NET Core API 向けレスポンス標準化ミドルウェアです。

## 何をするか

controller のレスポンスを横取りし、標準エンベロープで包みます。

```json
{
  "success": true,
  "data": { ... },
  "errors": [],
  "metadata": {
    "timestamp": "2026-04-05T00:00:00Z",
    "requestId": "abc-123"
  }
}
```

## 利点

- **一貫性** — すべての endpoint が同じトップレベル形式を返す
- **Metadata** — timestamp、request ID、paging 情報を自動付与
- **Error wrapping** — validation failure も同一契約に収まる
- **透明性** — controller は素のオブジェクトを返し、整形は middleware が担当

## 組み合わせ利用

exception middleware が未捕捉例外を扱い、この middleware が成功レスポンスや制御済みエラーを含めた全体の形を統一します。""",
        },
        "problem_solution": {
            "en-US": "Without response standardization, frontend clients must parse each endpoint differently. A consistent envelope removes that branching and centralizes metadata handling.",
            "ja-JP": "レスポンスの標準化がないと、フロントエンドは endpoint ごとに別の解析ロジックを持つ必要があります。一貫したエンベロープにすることで、その分岐をなくし、metadata 処理を集中化できます。",
        },
        "architecture": {
            "en-US": "ASP.NET Core middleware registered after the exception middleware. It intercepts the response stream, deserializes the original payload and re-serializes it inside the standard envelope.",
            "ja-JP": "exception middleware の後段に登録する ASP.NET Core middleware です。response stream を横取りし、元の payload をデシリアライズして標準エンベロープ内に再シリアライズします。",
        },
    },
    "ronaldinho-agent": {
        "overview": {
            "en-US": """Autonomous Python agent with personality and context-based decision-making. "Daqui pra frente é só pra trás."

## Concept

`ronaldinho-agent` is an agent-engineering experiment that explores how personality and tone change the user-agent interaction. The architecture combines:

- **A personality-driven system prompt** — informal tone, cultural references and humor
- **Conversation memory** — accumulated context across interactions
- **Context-based decisions** — the agent chooses actions based on history and detected intent
- **Tool use** — external tools for task execution

## Agent architecture

The main loop follows the ReAct pattern:

1. Receive user input
2. Reason over context and intent
3. Decide between answering directly or using a tool
4. Execute and observe the result
5. Formulate the answer with the agent personality

## Relationship with the ecosystem

This project is documented in **ronaldinho-architecture-overview** and connects to the broader AI-agent research published in the blog.""",
            "ja-JP": """パーソナリティと文脈ベースの意思決定を備えた Python 製自律エージェントです。"Daqui pra frente é só pra trás."

## コンセプト

`ronaldinho-agent` は、パーソナリティや口調がユーザーとエージェントの対話にどう影響するかを探るエージェント工学の実験です。アーキテクチャは次を組み合わせます。

- **人格を持つ system prompt** — 砕けた口調、文化的参照、ユーモア
- **会話メモリ** — 対話をまたいで蓄積される文脈
- **文脈ベースの判断** — 履歴と意図に基づいて行動を選ぶ
- **tool use** — 外部ツールによるタスク実行

## エージェント・アーキテクチャ

メインループは ReAct パターンに従います。

1. ユーザー入力を受け取る
2. 文脈と意図をもとに推論する
3. 直接応答するか tool を使うか決める
4. 実行して結果を観測する
5. パーソナリティを保って回答を組み立てる

## エコシステムとの関係

このプロジェクトは **ronaldinho-architecture-overview** に文書化されており、ブログ全体の AI エージェント研究とも接続しています。""",
        },
        "problem_solution": {
            "en-US": "Generic AI agents can be effective but impersonal. `ronaldinho-agent` explores whether adding personality and conversational tone improves adoption and user experience without sacrificing technical capability.",
            "ja-JP": "汎用 AI エージェントは有能でも無個性になりがちです。`ronaldinho-agent` は、パーソナリティと会話トーンを加えることで、技術力を落とさず採用性と体験が改善するかを探ります。",
        },
        "architecture": {
            "en-US": "Python implementation with a ReAct loop: prompt engineering for personality, an LLM for reasoning, a tool dispatcher for actions and short-term memory via conversation history. The detailed design lives under `/documents/ronaldinho-architecture-overview/`.",
            "ja-JP": "Python 実装で、ReAct ループを中心に構成されています。人格用 prompt engineering、推論のための LLM、行動用 tool dispatcher、会話履歴による短期メモリを備えます。詳細設計は `/documents/ronaldinho-architecture-overview/` にあります。",
        },
        "impact": {
            "en-US": [
                "Contextual personality architecture — coherent responses in 94% of interaction tests",
                "Short-term memory system preserves context for up to 12 turns without noticeable degradation",
                "Base for applying DDD to agents — validated the separation between domain, orchestration and tools",
            ],
            "ja-JP": [
                "文脈的パーソナリティ・アーキテクチャにより、対話テストの 94% で一貫した応答を実現",
                "短期メモリ・システムが、顕著な劣化なく最大 12 ターンまで文脈を維持",
                "DDD をエージェントへ適用する基盤として、domain / orchestration / tools の分離を検証",
            ],
        },
        "trade_offs": {
            "en-US": [
                "Python vs .NET for the agent: Python wins on iteration speed and LLM ecosystem, but lacks C#'s stronger typing",
                "Prompt-based personality vs fine-tuning: prompt engineering is cheaper and more flexible, but less consistent at the edges",
                "Conversation history vs vector store for memory: history is simple and auditable, but does not scale to long contexts",
            ],
            "ja-JP": [
                "エージェント実装で Python を選ぶか .NET を選ぶか: Python は反復速度と LLM エコシステムで有利だが、C# の強い型は得られない",
                "人格を prompt で与えるか fine-tuning するか: prompt engineering は安価で柔軟だが、境界ケースでは一貫性が弱い",
                "メモリを会話履歴で持つか vector store で持つか: 履歴は単純で監査しやすいが、長文脈にはスケールしにくい",
            ],
        },
        "lessons": {
            "en-US": [
                "Agent personality works better as a system-prompt constraint than as an explicit instruction repeated every turn",
                "Tool dispatchers need explicit fallbacks — agents without them fail silently on unknown tools",
                "Agent tests should validate behavior, not exact wording — regex-only assertions are too brittle",
            ],
            "ja-JP": [
                "エージェントの人格は、毎ターン繰り返す明示命令より system prompt の制約として置くほうがうまく機能した",
                "tool dispatcher には明示的 fallback が必要で、ないと未知ツールで黙って失敗しやすい",
                "エージェントのテストは文言ではなく振る舞いを検証すべきで、regex だけの検証は脆すぎる",
            ],
        },
    },
    "security-jwt": {
        "overview": {
            "en-US": """Fork of NetDevPack Security.Jwt, a set of components for end-to-end JWT management in .NET applications.

## Main features

- **Automatic key rotation** — generate new signing keys periodically without downtime
- **JWKS endpoint** — expose `/.well-known/jwks` for distributed token validation
- **Multiple algorithms** — RSA, ECDSA and HMAC support
- **Secure storage** — keys can be persisted in a database, filesystem or Azure Key Vault
- **Key revocation** — compromised keys can be invalidated and propagated automatically

## Why key rotation matters

Static signing keys are a security risk: once compromised, every issued token becomes vulnerable. Rotation narrows the exposure window and allows old tokens to expire naturally.

## Use in the ecosystem

This library is a direct reference for authentication design in **User-Auth**, **Playground-FE** and **SplitCosts**. JWKS is especially relevant in systems where multiple services validate tokens independently.""",
            "ja-JP": """`.NET` アプリ向けに JWT をエンドツーエンドで管理するコンポーネント群、NetDevPack Security.Jwt のフォークです。

## 主な機能

- **Automatic key rotation** — 無停止で署名鍵を定期生成
- **JWKS endpoint** — 分散 token 検証のため `/.well-known/jwks` を公開
- **Multiple algorithms** — RSA、ECDSA、HMAC 対応
- **Secure storage** — DB、filesystem、Azure Key Vault へ鍵を保存可能
- **Key revocation** — 侵害鍵を無効化し、自動伝播できる

## なぜ鍵ローテーションが重要か

固定の署名鍵はセキュリティ上の大きなリスクです。侵害されると、発行済み token 全体が危険にさらされます。ローテーションは露出期間を短くし、古い token を自然失効させられます。

## エコシステムでの利用

このライブラリは **User-Auth**、**Playground-FE**、**SplitCosts** における認証設計の直接的な参照です。特に JWKS は、複数サービスが独立に token を検証する構成で重要になります。""",
        },
        "problem_solution": {
            "en-US": "Managing JWT cryptographic material is complex: rotation, public-key distribution, revocation and secure storage. This library encapsulates that complexity behind an API that integrates cleanly with ASP.NET Core.",
            "ja-JP": "JWT の暗号素材管理は複雑です。ローテーション、公開鍵配布、失効、セキュア保管が絡みます。このライブラリはそれらの複雑さを ASP.NET Core と統合しやすい API の背後に閉じ込めます。",
        },
        "architecture": {
            "en-US": "ASP.NET Core middleware and supporting services manage key lifecycles. A background service rotates keys periodically, while a JWKS endpoint exposes active public keys to dependent services.",
            "ja-JP": "ASP.NET Core middleware と補助 service が鍵ライフサイクルを管理します。background service が定期的に鍵をローテーションし、JWKS endpoint が依存サービスへ公開鍵を配布します。",
        },
    },
    "sos-location": {
        "overview": {
            "en-US": "SOS Location is a humanitarian-response initiative focused on using geospatial technology to accelerate decision-making in crisis scenarios. The project organizes complex data layers into a simple operational interface.",
            "ja-JP": "SOS Location は、危機時の意思決定を加速するために地理空間技術を活用する人道対応イニシアチブです。複雑なデータレイヤを、現場で扱いやすいシンプルな運用インターフェースに整理します。",
        },
        "problem_solution": {
            "en-US": "In disasters, fragmented information costs lives. The platform centralizes weather feeds, risk areas and available resources, using asynchronous processing to keep everything updated without overwhelming the system.",
            "ja-JP": "災害時には、情報の分断がそのまま命の損失につながります。このプラットフォームは、気象フィード、危険領域、利用可能リソースを集中化し、非同期処理によってシステムを過負荷にせず更新を維持します。",
        },
        "architecture": {
            "en-US": "Built on event pipelines, the system separates data ingestion (sensors and external APIs), geospatial processing and the real-time visualization layer based on WebSockets and Leaflet.",
            "ja-JP": "イベント・パイプラインを基盤にし、データ取り込み（センサー・外部 API）、地理空間処理、WebSockets / Leaflet によるリアルタイム可視化レイヤを分離しています。",
        },
        "adr": {
            "en-US": [
                "Use GeoJSON as the standard data-exchange format.",
                "Adopt an event-driven architecture to absorb peak usage safely.",
                "Isolate geolocation services for operational resilience.",
            ],
            "ja-JP": [
                "GeoJSON を標準のデータ交換形式として採用する。",
                "ピーク負荷に耐えるため event-driven architecture を採用する。",
                "運用レジリエンスのために geolocation service を分離する。",
            ],
        },
        "roadmap": {
            "en-US": [
                "Integrate satellite imagery for flood analysis.",
                "Expand the risk-prediction model with machine learning.",
                "Add offline-first support for field teams.",
                "Publish SOS Location notes on business rules, flow architecture and stack.",
            ],
            "ja-JP": [
                "洪水解析のために衛星画像を統合する。",
                "機械学習でリスク予測モデルを拡張する。",
                "現場チーム向けに offline-first 対応を追加する。",
                "SOS Location の業務ルール、フロー、技術スタックを公開する。",
            ],
        },
    },
    "sos": {
        "overview": {
            "en-US": """Auxiliary module of the **SOS Location** ecosystem, containing shared components across the disaster-response platform.

## Role in the ecosystem

While **SOS Location** is the main application with UI and data pipelines, the **SOS** repository centralizes:

- **Integration contracts** — shared TypeScript types across services
- **GIS utilities** — coordinate conversion, distance calculation and GeoJSON processing helpers
- **Shared configuration** — constants, enums and reference maps

## Relationship with `brumadinho_location`

Lessons accumulated in **brumadinho_location** were formalized in this module, turning ad hoc scripts into reusable and testable functions.""",
            "ja-JP": """災害対応プラットフォーム **SOS Location** エコシステムの補助モジュールで、共有コンポーネントを集約しています。

## エコシステム内での役割

UI とデータ・パイプラインを持つ主アプリが **SOS Location** である一方、この **SOS** リポジトリは次を集中管理します。

- **Integration contracts** — サービス間で共有する TypeScript 型
- **GIS utilities** — 座標変換、距離計算、GeoJSON 処理関数
- **Shared configuration** — 定数、enum、参照マップ

## `brumadinho_location` との関係

**brumadinho_location** で得た知見をこのモジュールに形式化し、場当たり的なスクリプトを再利用可能でテスト可能な関数へ変えました。""",
        },
        "problem_solution": {
            "en-US": "In distributed systems, duplicating shared types and utilities across services creates drift and inconsistency. This module centralizes those contracts and helpers to preserve coherence throughout the SOS ecosystem.",
            "ja-JP": "分散システムでは、共有型やユーティリティを各サービスに重複配置すると、すぐにズレと不整合が生まれます。このモジュールはそれらを集中管理し、SOS エコシステム全体の一貫性を保ちます。",
        },
        "architecture": {
            "en-US": "Publishable TypeScript / Node.js package used as a local dependency. It exports types, interfaces and utility functions consumed directly by the other SOS services.",
            "ja-JP": "ローカル依存として使える公開可能な TypeScript / Node.js パッケージです。ほかの SOS サービスが直接利用する型、interface、utility 関数を export します。",
        },
    },
    "splitcost-backend": {
        "overview": {
            "en-US": """Backend of **SplitCosts** — a .NET / C# API that implements expense-sharing logic with a focus on multi-tenancy and domain modeling.

## Architecture

- **Multi-tenant** — data isolation per group / household, with tenant resolution in middleware
- **Domain events** — state changes publish events to keep read models updated
- **Lightweight CQRS** — separation between commands (writes) and queries (read projections)
- **Repository pattern** — persistence abstraction backed by PostgreSQL and Entity Framework

## Domain

The domain model treats expenses as aggregates governed by business rules:

- Proportional or custom splits among participants
- Payment history and balances over time
- Debt reconciliation between group members
- Categorization and reporting

## Relationship with the ecosystem

This is the direct evolution of **Financial**, now with clearer boundaries, multi-tenancy and dedicated read projections. It is consumed by **SplitCosts-FE** through a REST API.""",
            "ja-JP": """**SplitCosts** のバックエンドであり、マルチテナンシーとドメインモデリングに重点を置いて支出共有ロジックを実装する .NET / C# API です。

## アーキテクチャ

- **Multi-tenant** — middleware の tenant resolution による household / group 単位のデータ分離
- **Domain events** — 状態変化をイベント公開し、read model を更新
- **軽量 CQRS** — command（書き込み）と query（読み取り投影）の分離
- **Repository pattern** — PostgreSQL と Entity Framework を背後に持つ永続化抽象

## ドメイン

ドメインモデルは、業務ルールに従う aggregate として支出を扱います。

- 参加者間の比例またはカスタム分配
- 支払い履歴と期間ごとの残高
- グループ内メンバー間の債務精算
- カテゴリ分類とレポート

## エコシステムとの関係

これは **Financial** の直接的な進化形で、より明確な境界、マルチテナント化、専用 read projection を備えます。**SplitCosts-FE** から REST API で利用されます。""",
        },
        "problem_solution": {
            "en-US": "The original Financial monolith coupled business rules to infrastructure and could not support multiple groups. SplitCosts backend addresses that with explicit domain boundaries, tenant isolation and read models tailored to each screen.",
            "ja-JP": "元の Financial モノリスは業務ルールとインフラが結合し、複数グループも扱えませんでした。SplitCosts バックエンドは、明示的なドメイン境界、tenant 分離、画面ごとに最適化された read model によってそれを解決します。",
        },
        "architecture": {
            "en-US": "ASP.NET Core layered API: Controllers → Application Services → Domain → Infrastructure. Multi-tenancy is handled in middleware, PostgreSQL is accessed through EF Core and read projections are modeled as dedicated queries over materialized views.",
            "ja-JP": "ASP.NET Core のレイヤ API 構成です。Controllers → Application Services → Domain → Infrastructure。multi-tenancy は middleware で処理し、PostgreSQL へは EF Core でアクセスし、read projection は materialized view 上の専用 query として表現します。",
        },
    },
    "splitcosts-fe": {
        "overview": {
            "en-US": """Frontend of **SplitCosts** — a React / TypeScript SPA that consumes the backend to manage shared expenses.

## Features

- **Dashboard** — overview of balances and recent expenses by group
- **Expense entry** — forms with proportional or custom split rules
- **Reconciliation** — debt visualization and minimal-payment suggestions
- **History** — transaction timeline with filters by period and category
- **Multi-group** — navigation between households / groups

## Stack

- React with hooks and Context API
- TypeScript for end-to-end type safety
- Keycloak for authentication, reusing patterns validated in **Playground-FE**
- `react-data-grid` for performant tabular views

## Design

Dark-theme interface optimized for operational clarity — large numbers, semantic colors for balances and primary actions always visible.""",
            "ja-JP": """**SplitCosts** のフロントエンドであり、共有支出を管理するためにバックエンドを利用する React / TypeScript SPA です。

## 機能

- **Dashboard** — グループごとの残高と最近の支出の概観
- **Expense entry** — 比例分配やカスタム分配に対応した入力フォーム
- **Reconciliation** — 債務の可視化と最小支払い提案
- **History** — 期間・カテゴリで絞り込める取引タイムライン
- **Multi-group** — household / group 間の切り替え

## スタック

- hooks と Context API を使う React
- end-to-end の型安全のための TypeScript
- **Playground-FE** で検証したパターンを再利用する Keycloak 認証
- 高速な表表示のための `react-data-grid`

## デザイン

運用の明瞭さを重視した dark theme UI で、大きな数値表示、残高の意味色、主要アクションの常時視認性を意識しています。""",
        },
        "problem_solution": {
            "en-US": "Financial applications need a UX that makes complex numbers understandable at a glance. SplitCosts-FE prioritizes a clear visual hierarchy so balances, recent expenses and settlement actions are always easy to reach.",
            "ja-JP": "金融アプリには、複雑な数字を一目で理解できる UX が必要です。SplitCosts-FE は、残高、最近の支出、精算アクションへすぐ到達できるよう、明確な視覚階層を優先しています。",
        },
        "architecture": {
            "en-US": "React SPA consuming the backend REST API. Authentication is bootstrapped through the Keycloak JS adapter, state is managed with hooks and context, and routing uses lazy-loaded modules per group.",
            "ja-JP": "バックエンドの REST API を利用する React SPA です。認証は Keycloak JS adapter で bootstrap し、状態管理は hooks と context、routing はグループ単位の lazy-loaded module で構成します。",
        },
    },
    "splitcosts": {
        "overview": {
            "en-US": "SplitCosts was created to solve a simple problem without falling into a shallow solution: sharing expenses while preserving context, history and a clear separation between groups and users.",
            "ja-JP": "SplitCosts は、単純な問題を浅い解法で終わらせないために生まれました。支出を共有しつつ、文脈、履歴、そしてグループとユーザーの明確な分離を保つことが狙いです。",
        },
        "problem_solution": {
            "en-US": "The challenge was not only recording spending. It was preserving domain legibility, avoiding tenant coupling and allowing the product to evolve without rewriting the base whenever a business rule changed.",
            "ja-JP": "課題は単に支出を記録することではありません。ドメインの読みやすさを保ち、tenant 間の結合を避け、ルール変更のたびに土台を作り直さずに製品を進化させることでした。",
        },
        "architecture": {
            "en-US": "The solution follows a pragmatic line: explicit domain boundaries, simple read projections and a backend designed to grow by context rather than by page count.",
            "ja-JP": "解決策は実務的です。明示的なドメイン境界、シンプルな read projection、そしてページ単位ではなく文脈単位で成長できるバックエンドを採用しました。",
        },
        "stack_notes": {
            "en-US": "Even though it is a more traditional product, it reinforces the same principles seen in the agent projects: clear contracts, ubiquitous language and separation between write and read concerns.",
            "ja-JP": "より伝統的なプロダクトでありながら、エージェント系プロジェクトと同じ原則を再確認させます。明確な契約、ユビキタス言語、そして書き込みと読み取りの分離です。",
        },
        "adr": {
            "en-US": [
                "Separate tenancy context from expense-sharing rules.",
                "Use simple projections for operational screens and fast reports.",
            ],
            "ja-JP": [
                "tenancy の文脈を支出共有ルールから分離する。",
                "運用画面と高速レポートには単純な projection を使う。",
            ],
        },
        "roadmap": {
            "en-US": [
                "Finalize the recurrence and reconciliation model.",
                "Improve audit visibility for critical changes.",
            ],
            "ja-JP": [
                "定期支出と精算モデルを仕上げる。",
                "重要変更に対する監査可視性を高める。",
            ],
        },
    },
    "system-prompts-and-models-of-ai-tools": {
        "overview": {
            "en-US": """Fork of the broadest collection of system prompts and tool definitions for AI software-development tools.

## Content

Complete system prompts and tool definitions from:

- **v0** (Vercel) — UI generation
- **Cursor** — AI-assisted IDE
- **Manus** — autonomous agent
- **Same.dev** — website cloning
- **Lovable** — app generation
- **Devin** — autonomous software engineer
- **Replit Agent** — AI development environment
- **Windsurf Agent** — AI editor
- **VSCode Agent** — Copilot Chat
- **Dia Browser** — AI browser
- **Trae AI** — coding assistant
- **Cluely** — AI overlay

## Why it matters

Studying production system prompts reveals agent-engineering patterns:

- How different tools define schemas for tool use
- Strategies for context and memory management
- Instruction patterns for safe behavior
- Trade-offs between autonomy and user control

## Relationship with the ecosystem

It complements **claw-code** (agent analysis) and **gemini-cli** (agent implementation). Together, they form a reference corpus for understanding how coding agents are built.""",
            "ja-JP": """AI ソフトウェア開発ツール向けの system prompt と tool 定義を集めた、最も包括的なコレクションのフォークです。

## 内容

次の system prompt と tool 定義を完全収録しています。

- **v0** (Vercel) — UI 生成
- **Cursor** — AI 統合 IDE
- **Manus** — 自律エージェント
- **Same.dev** — Web サイト複製
- **Lovable** — アプリ生成
- **Devin** — 自律型ソフトウェアエンジニア
- **Replit Agent** — AI 開発環境
- **Windsurf Agent** — AI エディタ
- **VSCode Agent** — Copilot Chat
- **Dia Browser** — AI browser
- **Trae AI** — コーディング支援
- **Cluely** — AI overlay

## なぜ重要か

本番 system prompt を調べると、エージェント工学のパターンが見えてきます。

- 各ツールが tool-use schema をどう定義するか
- コンテキスト管理とメモリ戦略
- 安全な振る舞いを作る instruction パターン
- 自律性とユーザー制御のトレードオフ

## エコシステムとの関係

**claw-code**（分析）と **gemini-cli**（実装）を補完し、コードエージェントがどう作られているかを理解するための参照コーパスを形成します。""",
        },
        "problem_solution": {
            "en-US": "Understanding how AI agents are instructed is essential both for using them well and for building your own. This collection opens up prompts that are usually private and opaque.",
            "ja-JP": "AI エージェントがどのように指示されているかを理解することは、うまく使うためにも、自分で構築するためにも不可欠です。このコレクションは、本来は私的で不透明な prompt を公開資産に変えます。",
        },
        "architecture": {
            "en-US": "Documentation-first repository organized by tool. Each directory stores the full system prompt, tool / function definitions and, when available, examples of interaction and model configuration.",
            "ja-JP": "ツールごとに整理された documentation-first リポジトリです。各ディレクトリに完全な system prompt、tool / function 定義、利用可能な場合は対話例とモデル設定を格納します。",
        },
    },
    "user-auth": {
        "overview": {
            "en-US": """Authentication and authorization service in TypeScript / Node.js, designed to manage users, sessions and integration with identity providers.

## Features

- **Sign up and sign in** — account creation with email validation
- **JWT management** — issuing and validating access / refresh tokens
- **Session management** — active-session control with revocation
- **OAuth2 integration** — login through external providers such as Keycloak and Google
- **Role-based access** — authorization by user role

## Relationship with the ecosystem

This authentication component complements:

- **Playground-FE** — frontend used to validate auth flows
- **Security.Jwt** — reference library for JWT key management
- **SplitCosts** — production authentication via Keycloak

## Design decisions

- Short-lived access tokens (15 minutes) with transparent refresh
- Password hashing with bcrypt (cost factor 12)
- Rate limiting on authentication endpoints
- Audit logs for security events such as login, logout and failed attempts""",
            "ja-JP": """ユーザー、セッション、identity provider 連携を管理するために設計された TypeScript / Node.js 製の認証・認可サービスです。

## 機能

- **Sign up / sign in** — メール検証付きのアカウント作成
- **JWT management** — access / refresh token の発行と検証
- **Session management** — revoke 可能なアクティブ・セッション管理
- **OAuth2 integration** — Keycloak や Google などの外部プロバイダ経由ログイン
- **Role-based access** — ユーザーロール単位の認可

## エコシステムとの関係

この認証コンポーネントは次を補完します。

- **Playground-FE** — 認証フローを検証するフロントエンド
- **Security.Jwt** — JWT 鍵管理の参照ライブラリ
- **SplitCosts** — Keycloak による本番認証

## 設計判断

- 15 分の短命 access token と透過的 refresh
- bcrypt（cost factor 12）によるパスワード・ハッシュ
- 認証 endpoint への rate limiting
- login、logout、failed attempt などのセキュリティ監査ログ""",
        },
        "problem_solution": {
            "en-US": "Authentication is a critical subsystem that must be correct from day one. This service isolates the complexity of hashing, token issuance and session control into a dedicated, testable module.",
            "ja-JP": "認証は、最初の日から正しくなければならない重要サブシステムです。このサービスは、hashing、token 発行、session 制御の複雑さを、専用かつテスト可能なモジュールに隔離します。",
        },
        "architecture": {
            "en-US": "Node.js / TypeScript API exposing REST endpoints for authentication. JWT enables stateless auth, while refresh tokens remain stored in the database for revocation. The authentication middleware is exportable for reuse in other services.",
            "ja-JP": "認証用 REST endpoint を提供する Node.js / TypeScript API です。JWT により stateless auth を実現しつつ、refresh token は revoke 用に DB へ保存します。認証 middleware は他サービスへ再利用可能な形で export されます。",
        },
    },
}

DOCUMENTS: dict[str, dict[str, dict[str, Any]]] = {
    "adr-versioned-memory": {
        "body": {
            "en-US": """# Versioned Memory Management for AI Agents

## Overview

The idea is to build a system where AI agents can version their memories using Git. Each context snapshot is stored as a commit, creating a versioned history that the agent can revisit later.

## System Flow

```mermaid
sequenceDiagram
    participant Agent
    participant Snapshot
    participant GitHub

    Agent->>Snapshot: Create a snapshot of the current context
    Snapshot->>GitHub: Commit the snapshot to the Git repository
    GitHub-->>Agent: Return confirmation and preserve the versioned history
```

## Main Components

- **Agent**: the AI agent executing tasks and preserving context.
- **Snapshot**: a saved point-in-time representation of the current context.
- **GitHub (or another Git repository)**: the repository where snapshots are versioned and stored safely.

## Benefits

- **Persistent memory**: the agent can recover old contexts without losing information.
- **Versioned history**: every change is recorded, improving traceability.
- **Optimization**: less repeated processing, saving tokens and requests.
""",
            "ja-JP": """# AI エージェントのためのバージョン管理メモリ

## 概要

AI エージェントが Git を使って自分の記憶をバージョン管理できる仕組みを作る、という考え方です。文脈の各スナップショットを commit として保存し、後から参照できる履歴にします。

## システムフロー

```mermaid
sequenceDiagram
    participant Agent as エージェント
    participant Snapshot as スナップショット
    participant GitHub

    Agent->>Snapshot: 現在の文脈のスナップショットを作成
    Snapshot->>GitHub: スナップショットを Git リポジトリへ commit
    GitHub-->>Agent: 確認を返し、バージョン履歴を保持
```

## 主要コンポーネント

- **エージェント**: タスクを実行し、文脈を保持したい AI エージェント。
- **スナップショット**: 現在の文脈を切り出した保存ポイント。
- **GitHub（または他の Git リポジトリ）**: スナップショットをバージョン管理し、安全に保存する場所。

## 利点

- **永続メモリ**: 情報を失わずに過去の文脈を復元できる。
- **バージョン履歴**: すべての変更が記録され、追跡しやすい。
- **最適化**: 再処理を減らし、token と request の消費を抑えられる。
""",
        },
    },
    "agent-integration-surface": {
        "body": {
            "en-US": """# Agent Integration Surface

This note documents the minimum integration surface for an agent-oriented system that needs to call external tools without losing predictability.

## Core contracts

- `task`: the problem that needs to be solved;
- `capability`: the set of actions that is available;
- `tool_call`: the concrete infrastructure invocation;
- `result`: the normalized return value used internally.

## Useful rules

1. The agent should not talk directly to everything.
2. Every external call needs an explicit contract and normalization.
3. Technical logs do not replace domain events.

## Expected outcome

When this surface is explicit, replacing a provider, runtime or coordination style no longer implies rewriting the whole system.
""",
            "ja-JP": """# エージェント統合サーフェス

このノートは、外部ツールを呼び出しつつ予測可能性を失わないために、エージェント指向システムが持つべき最小の統合サーフェスを記述します。

## 中核契約

- `task`: 解決すべき問題
- `capability`: 利用可能な行動の集合
- `tool_call`: 具体的なインフラ呼び出し
- `result`: 内部利用のために正規化された戻り値

## 実用ルール

1. エージェントは何にでも直接話しかけてはいけない。
2. すべての外部呼び出しには明示的な契約と正規化が必要である。
3. 技術ログはドメインイベントの代わりにはならない。

## 期待される結果

このサーフェスが明示されると、provider、runtime、調停方式を切り替えても、システム全体を書き直す必要がなくなります。
""",
        },
    },
    "ronaldinho-architecture-overview": {
        "body": {
            "en-US": """# Ronaldinho Architecture Overview

The Ronaldinho Agent is not monolithic. It is an orchestration of services and intelligence layers designed to provide autonomy without losing control over execution.

## Flow diagram

```mermaid
graph TD
    User([User]) --> |Telegram| Bridge[Neural Bridge]
    User --> |Browser| Dashboard[OpenClaw Dashboard]

    subgraph "Intelligence Layer"
        Bridge <--> Core[Neural Core - FastAPI]
        Dashboard <--> Core
        Core --> Skills[Skills Engine]
        Core --> Memory[Memory Store]
    end

    subgraph "Autonomous Execution"
        Core --> Lane[Execution Lane]
        Core --> Tools[Terminal/File Tools]
    end
```

## Key components

### 1. Neural Core (central session)

The brain of the system. Built in FastAPI, it manages requests, compresses context and decides which persona should respond.

### 2. Execution Lanes

A key concept inspired by OpenClaw. Each user gets an execution lane, ensuring the agent does not try to edit the same file in two parallel tasks and reducing I/O conflicts.

### 3. Provider-agnostic design

The core does not depend on a single model. It uses a cascading fallback strategy:

1. Try the primary API.
2. If quota or availability fails, try fallback providers.
3. If that also fails, activate browser-based execution.
4. As a last resort, hand off through the Antigravity bridge.

### 4. Skills Engine

Skills live under `.agent/skills/`. Each skill is an isolated Python module that the agent can load to expand its capabilities without restarting the runtime.
""",
            "ja-JP": """# Ronaldinho アーキテクチャ概観

Ronaldinho Agent はモノリスではありません。実行制御を失わずに自律性を実現するため、サービス群と知能レイヤを組み合わせたオーケストレーションです。

## フローダイアグラム

```mermaid
graph TD
    User([ユーザー]) --> |Telegram| Bridge[Neural Bridge]
    User --> |Browser| Dashboard[OpenClaw Dashboard]

    subgraph "Intelligence Layer"
        Bridge <--> Core[Neural Core - FastAPI]
        Dashboard <--> Core
        Core --> Skills[Skills Engine]
        Core --> Memory[Memory Store]
    end

    subgraph "Autonomous Execution"
        Core --> Lane[Execution Lane]
        Core --> Tools[Terminal/File Tools]
    end
```

## 主要コンポーネント

### 1. Neural Core（中央セッション）

システムの頭脳です。FastAPI で構築され、リクエスト管理、文脈圧縮、どの persona が応答すべきかの判断を担います。

### 2. Execution Lanes

OpenClaw に着想を得た重要概念です。各ユーザーに専用 lane を与えることで、エージェントが並列タスクで同じファイルを同時編集しようとするのを防ぎ、I/O 競合を減らします。

### 3. Provider 非依存設計

Core は単一モデルに依存しません。段階的 fallback 戦略を用います。

1. まず primary API を試す。
2. quota や可用性で失敗したら fallback provider を試す。
3. それでも失敗したら browser ベース実行へ切り替える。
4. 最後の手段として Antigravity bridge に委譲する。

### 4. Skills Engine

skill は `.agent/skills/` 配下にあり、各 skill は独立した Python module です。ランタイムを再起動せずに能力を拡張できます。
""",
        },
    },
    "system-architecture": {
        "body": {
            "en-US": """# Project Architecture

Ronaldinho-Agent follows a modern, hyper-converged architecture where a C# NeuralCore orchestrates AI strategies and governance rules.

## Directory Structure

```text
Ronaldinho-Agent/
├── services/
│   ├── Ronaldinho.NeuralCore/    # .NET 9 central brain and API
│   ├── Ronaldinho.ConfigUI/      # React/Chakra UI governance interface
├── ronaldinho/                   # Core data and persistent state
│   ├── config/                   # SOUL.md and state definitions
│   ├── data/                     # Encryption keys and vault
├── dev_scripts/                  # PowerShell automation
├── docs/                         # Technical documentation
├── start_neural.ps1              # Unified local entry point
└── docker-compose.yml            # Containerized deployment
```

## Key Components

### 1. NeuralCore

A high-performance **.NET 9** engine that uses **Semantic Kernel** to coordinate multiple LLM strategies and governance rules.

Core responsibilities:

- **Provider rotation** through a zero-block resilience chain
- **MCP protocol support** for multi-agent coordination
- **Context compression** for long-running sessions
- **Operational APIs** for external interfaces

### 2. Config UI

A governance surface for adjusting operating rules, provider priorities and runtime behavior without changing the agent core.

### 3. Persistent State

Configuration, memory and sensitive material are kept outside the service code so that the runtime can be restarted without losing identity or context.
""",
            "ja-JP": """# プロジェクト・アーキテクチャ

Ronaldinho-Agent は、C# 製 NeuralCore が AI 戦略とガバナンス・ルールを統括する、現代的で高集約なアーキテクチャを採用しています。

## ディレクトリ構成

```text
Ronaldinho-Agent/
├── services/
│   ├── Ronaldinho.NeuralCore/    # .NET 9 の中枢 API
│   ├── Ronaldinho.ConfigUI/      # React/Chakra UI 製ガバナンス画面
├── ronaldinho/                   # コアデータと永続状態
│   ├── config/                   # SOUL.md と状態定義
│   ├── data/                     # 暗号鍵と vault
├── dev_scripts/                  # PowerShell 自動化
├── docs/                         # 技術文書
├── start_neural.ps1              # 統一ローカル起動点
└── docker-compose.yml            # コンテナ配備
```

## 主要コンポーネント

### 1. NeuralCore

複数の LLM 戦略とガバナンス・ルールを **Semantic Kernel** で調停する高性能 **.NET 9** エンジンです。

主な責務:

- zero-block resilience chain による **provider rotation**
- マルチエージェント調停のための **MCP protocol 対応**
- 長時間セッション向け **context compression**
- 外部インターフェース用の **operational API**

### 2. Config UI

エージェント・コアを変更せずに、運用ルール、provider 優先順位、runtime 挙動を調整するためのガバナンス画面です。

### 3. Persistent State

設定、メモリ、機微情報は service code の外に保持し、ランタイムを再起動しても ID や文脈を失わないようにしています。
""",
        },
    },
    "technical-knowledge-os": {
        "body": {
            "en-US": """# Technical Knowledge OS

The blog has evolved into a living documentation system. The idea behind **Technical Knowledge OS** is simple:

- posts register learning and synthesis;
- projects preserve operational context;
- documents store decisions and architecture;
- everything is versioned inside the same publishing flow.

## Why it matters

In practice, technical knowledge gets lost when each format lives in isolation. A post explains something, a document details it, but the context between them disappears.

The goal here is to reduce that gap and make the site reflect the real work: architecture, decisions, trade-offs and evolution.

## Principles

- clarity before ornament;
- depth without noise;
- every page must justify its existence;
- the system should remain small enough to be maintainable.
""",
            "ja-JP": """# Technical Knowledge OS

このブログは、生きたドキュメンテーション・システムへ進化しました。**Technical Knowledge OS** という考え方はシンプルです。

- post は学びと要約を記録する
- project は運用文脈を保持する
- document は設計判断とアーキテクチャを保存する
- そのすべてを同じ公開フローの中でバージョン管理する

## なぜ重要か

実際には、技術知識は形式ごとに孤立すると失われます。post が説明し、document が詳細を残しても、その間の文脈は消えてしまいます。

ここでの目標は、その距離を縮め、アーキテクチャ、意思決定、トレードオフ、進化といった実際の仕事がサイトに反映されるようにすることです。

## 原則

- 装飾より先に明快さ
- ノイズのない深さ
- すべてのページは存在理由を持つこと
- システムは保守できるだけ十分に小さく保つこと
""",
        },
    },
}


def escape_toml_basic(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "")
        .replace("\t", "\\t")
    )


def escape_toml_multiline(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace('"""', '\\"""')
        .replace("\r", "")
    )


def format_toml_value(value: Any) -> str:
    if isinstance(value, str):
        if "\n" in value:
            body = escape_toml_multiline(value).rstrip("\n")
            return f'"""\n{body}\n"""'
        return f'"{escape_toml_basic(value)}"'
    if isinstance(value, list):
        if not value:
            return "[]"
        lines = ",\n".join(f'  "{escape_toml_basic(str(item))}"' for item in value)
        return "[\n" + lines + ",\n]"
    raise TypeError(f"Unsupported TOML value type: {type(value)!r}")


def _find_assignment_end(lines: list[str], start_index: int) -> int:
    line = lines[start_index]
    rhs = line.split("=", 1)[1].lstrip()

    if rhs.startswith('"""') or rhs.startswith("'''"):
        delimiter = rhs[:3]
        if rhs.count(delimiter) >= 2:
            return start_index
        for index in range(start_index + 1, len(lines)):
            if delimiter in lines[index]:
                return index
        return len(lines) - 1

    if rhs.startswith("["):
        depth = 0
        quote: str | None = None
        escaped = False
        for index in range(start_index, len(lines)):
            for ch in lines[index]:
                if quote:
                    if escaped:
                        escaped = False
                    elif ch == "\\":
                        escaped = True
                    elif ch == quote:
                        quote = None
                    continue
                if ch in {'"', "'"}:
                    quote = ch
                elif ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
                    if depth == 0:
                        return index
        return len(lines) - 1

    return start_index


def insert_localized_fields(
    text: str,
    field: str,
    locales: dict[str, Any],
    *,
    anchor_field: str | None = None,
) -> str:
    lines = text.splitlines(keepends=True)
    pattern = re.compile(rf"^\s*{re.escape(anchor_field or field)}\s*=")

    start_index = next((i for i, line in enumerate(lines) if pattern.match(line)), None)
    if start_index is None:
        return text

    end_index = _find_assignment_end(lines, start_index)
    insert_at = end_index + 1
    already_present = text

    additions: list[str] = []
    for locale, value in locales.items():
        suffix = LOCALE_SUFFIX.get(locale, locale.lower().replace("-", "_"))
        key = f"{field}_{suffix}"
        if re.search(rf"^\s*{re.escape(key)}\s*=", already_present, re.MULTILINE):
            continue
        additions.append(f"{key} = {format_toml_value(value)}\n")

    if not additions:
        return text

    lines[insert_at:insert_at] = additions
    return "".join(lines)


def apply_to_file(
    path: Path,
    spec: dict[str, dict[str, Any]],
    *,
    anchor_overrides: dict[str, str] | None = None,
) -> bool:
    original = path.read_text(encoding="utf-8")
    updated = original
    for field, locales in spec.items():
        updated = insert_localized_fields(
            updated,
            field,
            locales,
            anchor_field=(anchor_overrides or {}).get(field),
        )
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def build_slug_to_path(folder: Path) -> dict[str, Path]:
    mapping: dict[str, Path] = {}
    for path in sorted(folder.glob("*.toml")):
        try:
            data = tomllib.loads(path.read_text(encoding="utf-8"))
            slug = str(data.get("slug") or path.stem).strip()
        except Exception:
            slug = path.stem
        mapping[slug] = path
    return mapping


def run_folder(
    folder: Path,
    table: dict[str, dict[str, dict[str, Any]]],
    *,
    anchor_overrides: dict[str, str] | None = None,
) -> tuple[int, int, list[str]]:
    changed = 0
    unchanged = 0
    missing: list[str] = []
    slug_to_path = build_slug_to_path(folder)
    for slug, spec in table.items():
        path = slug_to_path.get(slug)
        if not path:
            missing.append(slug)
            continue
        if apply_to_file(path, spec, anchor_overrides=anchor_overrides):
            changed += 1
            print(f"[updated] {path.relative_to(ROOT)}")
        else:
            unchanged += 1
    return changed, unchanged, missing


def main() -> None:
    changed = 0
    unchanged = 0
    missing: list[str] = []

    c, u, m = run_folder(CONTENT / "projects", PROJECTS)
    changed += c
    unchanged += u
    missing.extend(f"projects/{slug}" for slug in m)

    c, u, m = run_folder(
        CONTENT / "documents",
        DOCUMENTS,
        anchor_overrides={"body": "source_path"},
    )
    changed += c
    unchanged += u
    missing.extend(f"documents/{slug}" for slug in m)

    print()
    print(f"changed: {changed}")
    print(f"unchanged: {unchanged}")
    if missing:
        print("missing:")
        for item in missing:
            print(f"  - {item}")


if __name__ == "__main__":
    main()
