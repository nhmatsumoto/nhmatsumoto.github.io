# nhmatsumoto-blog-engine

`nhmatsumoto-blog-engine` é um Technical Knowledge OS publicado em GitHub Pages; o objetivo é funcionar como um notebook técnico vivo e um mapa cerebral navegável.

- posts
- projetos
- documentos
- páginas estáticas geradas a partir de TOML e Markdown

- posts
- projetos
- documentos
- páginas estáticas geradas a partir de TOML e Markdown

## Direção atual

O site segue um modelo de **minimalist engineering notebook** com um SOS Location fixado como projeto principal e um mapa cerebral que mapeia os pensamentos publicados:

- foco em clareza, profundidade e ausência de distração
- navegação fixa com `posts`, `projects`, `documents` e `about`
- command palette local para busca rápida
- cards com tags, badges, reading time e links técnicos
- seção de projetos com arquitetura, roadmap e documentação relacionada

## Estrutura

- `blog.toml`: configuração do build
- `content/site.toml`: metadados principais do site
- `content/system.toml`: especificação estrutural e visual em TOML
- `content/posts/*.toml`: posts publicados
- `content/projects/*.toml`: projetos e páginas de projeto
- `content/documents/*.toml`: índice de documentos e metadados
- `docs/`: fontes Markdown da documentação
- `assets/`: CSS, JavaScript e índice de busca gerado
- `editor/`: editor localhost
- `scripts/build.py`: build estático
- `scripts/editor_server.py`: servidor local do editor
- `plans/*.toml`: planos e histórico das features

## Fluxo de publicação

1. Editar `content/*.toml` e, quando necessário, os Markdown em `docs/`.
2. Rodar `python3 scripts/build.py`.
3. Revisar os HTMLs gerados em:
   - `index.html`
   - `publications/`
   - `projects/`
   - `documents/`
   - `about/`
4. Fazer `git commit` e `git push`.
5. O workflow em `.github/workflows/deploy-pages.yml` publica o site no GitHub Pages.

## Comandos

```bash
python3 scripts/build.py
python3 scripts/editor_server.py
```

O editor local sobe por padrão em `http://127.0.0.1:4173/`.

## Formato dos posts

```toml
id = "20260403-221500"
slug = "meu-post"
title = "Meu post"
summary = "Resumo curto."
published_at = "2026-04-03T22:15:00+09:00"
updated_at = "2026-04-03T22:15:00+09:00"
status = "published"
tags = ["dotnet", "ddd"]
badges = ["architecture", "experiment"]
repo_url = "https://github.com/usuario/repositorio"
code_url = "https://github.com/usuario/repositorio/tree/main/src"
featured = false
has_asciimath = false

body = """
# Título

Texto do post.
"""
```

Cada publicação gera um diretório versionado em:

```text
publications/<id>-<slug>/index.html
```

## Documentação viva

Os documentos são descritos em `content/documents/*.toml` e podem apontar para Markdown em `docs/`:

```toml
slug = "system-architecture"
title = "System Architecture"
summary = "Visão estrutural do sistema."
category = "architecture"
version = "v1"
tags = ["architecture", "system"]
agent_generated_tag = false
order = 1
source_path = "docs/architecture.md"
```

## Recursos implementados

- command palette com índice gerado em `assets/search-index.json`
- mapa cerebral vivo (section “Mapa cerebral vivo”) que replica as conexões do meu cérebro técnico
- páginas dedicadas para posts, projetos, documentos e about
- cards de projeto com status, stack, diagrama e ações
- documents indexado por categoria: `domain`, `architecture`, `agents`, `apis`
- renderização de Markdown e suporte a AsciiMath
- deploy automático em GitHub Pages a cada push no `master`

## Observações

- `publications/`, `projects/`, `documents/` e `about/` são saídas geradas.
- o editor local continua focado em posts e metadados principais do site.
- a especificação de produto e design permanece versionada em TOML.
