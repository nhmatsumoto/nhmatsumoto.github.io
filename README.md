# nhmatsumoto-blog-engine

`nhmatsumoto-blog-engine` é um **Technical Knowledge OS** publicado no GitHub Pages.
O projeto funciona como um **engineering notebook vivo**: publicações longas, notas curtas, projetos e documentos técnicos gerados estaticamente.

## Stack e arquitetura atual

- **Gerador estático próprio em Python** (`scripts/build.py`)
- **Conteúdo versionado em TOML** (`content/`)
- **Renderização HTML estática** para `index.html`, `posts/`, `projects/`, `documents/`, `daily/`, `about/`, `contact/`
- **Design system minimalista** orientado à leitura longa (`assets/styles.css`)
- **Command palette local** + índice de busca gerado (`assets/search-index.json`)
- **i18n com locale default pt-BR** e suporte a `en-US` e `ja-JP`

## Implementações recentes (estado atual)

- Home organizada em bloco principal com hierarquia clara:
  - `home_title` (headline)
  - `description` (subheadline)
  - `home_intro` (introdução em parágrafos)
- Ajustes de ritmo visual e largura de leitura para manter conforto tipográfico.
- Seção `daily` integrada ao fluxo principal do site.
- Área de documentos técnicos com categorização por domínio/arquitetura/agentes/APIs.
- Publicações e projetos com metadados estruturados (tags, badges, status, links de repo/código quando aplicável).

## Estrutura do repositório

- `blog.toml`: configuração geral de build
- `content/site.toml`: metadados principais do site (inclui copy da home)
- `content/system.toml`: especificação estrutural/visual do sistema
- `content/i18n.toml`: idiomas suportados e strings de interface
- `content/posts/*.toml`: publicações
- `content/daily/*.toml`: notas diárias
- `content/projects/*.toml`: projetos
- `content/documents/*.toml`: índice de documentos
- `docs/`: fontes Markdown de documentação
- `scripts/`: engine de build/renderização
- `assets/`: CSS, JS e artefatos de busca/i18n
- `editor/`: editor local
- `_site/`: saída de build auxiliar

## Fluxo de publicação

1. Editar conteúdo em `content/*.toml` (e `docs/*.md` quando necessário).
2. Rodar build local:

```bash
python3 scripts/build.py
```

3. Revisar saídas geradas em:
   - `index.html`
   - `posts/`
   - `projects/`
   - `documents/`
   - `daily/`
   - `about/`
   - `contact/`
4. Commitar e publicar no branch principal.
5. O workflow de GitHub Pages faz o deploy.

## Comandos úteis

```bash
# dependência opcional do editor com PostgreSQL
python3 -m pip install -r requirements.txt

# build estático
python3 scripts/build.py

# editor local
python3 scripts/editor_server.py
```

Editor local (padrão): `http://127.0.0.1:4173/`

## PostgreSQL no editor

O editor continua funcionando com TOML quando não há banco configurado. Para usar PostgreSQL como store das publicações, defina a URL de conexão antes de iniciar o editor:

```bash
export BLOG_DATABASE_URL="postgresql://usuario:senha@localhost:5432/blog"
python3 scripts/editor_server.py
```

A primeira importação cria as tabelas `blog_posts` e `blog_post_translations`. O painel permite importar os TOMLs existentes para o banco e exportar de volta para TOML, mantendo o build estático compatível com GitHub Pages.

## Analytics (GTM / GA4)

A configuração de analytics fica em `blog.toml`.

```toml
[analytics]
enabled = true
container_id = "GTM-NJJFQ4JM"
container_id_env = "GTM_CONTAINER_ID"
measurement_id = ""
measurement_id_env = "GA_MEASUREMENT_ID"
allowed_hostnames = ["nhmatsumoto.github.io"]
debug = false
```

Também é possível sobrescrever por variável de ambiente:

```bash
GTM_CONTAINER_ID=GTM-XXXXXXXX python3 scripts/build.py
```

## Observações

- Diretórios como `posts/`, `projects/`, `documents/`, `daily/`, `about/` e `contact/` são saídas estáticas do build.
- A home é orientada por dados de `content/site.toml`, permitindo atualização de copy sem alterar template.
- O projeto prioriza legibilidade, rastreabilidade em git e simplicidade operacional.
