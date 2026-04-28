# Build single-page

## Auditoria da arquitetura atual

O site atual e um gerador estatico proprio em Python. O ponto de entrada principal e `scripts/build.py`, que chama `engine.generator.build_site()` e renderiza paginas HTML para a raiz do repositorio ou para `_site/`.

Fontes reais de conteudo:

- `content/site.toml`: identidade do site, home, descricao e sobre.
- `content/system.toml`: especificacao visual, dados do perfil, contato e secoes estruturais.
- `content/i18n.toml`: strings de interface e aliases de locale.
- `content/posts/*.toml`: publicacoes.
- `content/projects/*.toml`: projetos.
- `content/documents/*.toml`: documentos indexados.
- `docs/**/*.md`: corpo Markdown usado por alguns documentos.
- Historico Git local: usado por `load_daily()` para gerar daily notes.

Rotas atuais geradas:

- `/`
- `/about/`
- `/contact/`
- `/posts/` e paginas paginadas
- `/posts/<slug>/`
- `/daily/`
- `/projects/` e `/projects/<slug>/`
- `/documents/` e `/documents/<slug>/`
- `/publications/` como rota legada para posts

CSS e layout:

- O design visual fica concentrado em `assets/styles.css`.
- O estilo principal e um notebook tecnico/blueprint com grid de fundo, navbar fixa, cards editoriais, blocos de codigo, paineis e responsividade mobile.
- Os renderers em `scripts/engine/renderer/` ja preservam a hierarquia visual de posts, projetos, documentos e home.

Sistema de traducao atual:

- `content/i18n.toml` usa `pt-BR`, `en-US` e `ja-JP`.
- Conteudos TOML usam sufixos como `_en_us` e `_ja_jp`.
- O novo fluxo single-page normaliza o frontend para `pt-BR`, `en` e `ja`, mas continua importando os campos existentes.

Dependencias reais:

- Runtime publicado: HTML/CSS/JS estatico.
- Tooling local: Python stdlib, SQLite stdlib e os modulos ja existentes do gerador.
- Dependencia opcional existente: `psycopg[binary]` para o editor antigo com PostgreSQL.

## Plano incremental

1. Manter o gerador atual e suas rotas sem remocao.
2. Importar as fontes atuais para SQLite local.
3. Consolidar traducoes em um JSON unico.
4. Gerar `dist/index.html` com sections internas.
5. Copiar assets relativos para `dist/assets/`.
6. Usar `assets/app.js` com JavaScript vanilla para hash navigation, item ativo, tema e idioma.
7. Publicar somente `dist/` quando quiser usar a versao single-page.

## Arquitetura implementada

Fluxo:

```text
Painel localhost
  -> data/content.sqlite3
  -> scripts/translation_service.py
  -> dist/assets/translations.json
  -> scripts/build_single_page.py
  -> dist/index.html
  -> assets/app.js
  -> GitHub Pages
```

Arquivos principais:

- `scripts/content_db.py`: schema SQLite, importacao de fontes e operacoes de edicao.
- `scripts/translation_service.py`: consolidacao, validacao e exportacao de traducoes.
- `scripts/export_translations.py`: wrapper CLI.
- `scripts/build_single_page.py`: gerador de `dist/index.html`.
- `scripts/local_editor.py`: painel local em `localhost`.
- `scripts/serve.py`: servidor estatico simples.
- `assets/app.js`: navegacao por hash, active nav, tema e troca de idioma.
- `assets/styles.css`: camada CSS adicional escopada a `body.page-single`.

## Comandos

Inicializar banco:

```bash
python3 scripts/content_db.py --init
```

Rodar editor local:

```bash
python3 scripts/local_editor.py
```

Exportar traducoes:

```bash
python3 scripts/export_translations.py
```

Gerar HTML unico:

```bash
python3 scripts/build_single_page.py
```

Servir `dist/`:

```bash
python3 scripts/serve.py --port 8000
```

## Saida publicada

O build gera:

- `dist/index.html`
- `dist/assets/styles.css`
- `dist/assets/app.js`
- `dist/assets/translations.json`
- `dist/assets/images/**` para manter assets visuais usados no HTML

O HTML final nao depende do painel editor nem de API em producao. A navegacao usa anchors e hash, entao refresh direto em `/#posts`, `/#projects` ou qualquer outro hash funciona no GitHub Pages.

## Publicacao no GitHub Pages

Opcoes:

- Usar `dist/` como artifact de Pages no workflow.
- Copiar o conteudo de `dist/` para a raiz apenas quando decidir substituir a saida atual.

Nao publique `data/content.sqlite3`.

## Limitacoes conhecidas

- O single-page inclui muitos conteudos inline; o HTML pode crescer conforme posts e documentos aumentarem.
- O editor SQLite nao grava de volta nos TOMLs. Ele e uma camada local para a saida `dist/`.
- O build single-page reaproveita o parser Markdown atual; blocos complexos dependem do mesmo comportamento do gerador existente.
- Daily notes continuam derivadas do historico Git local no momento da importacao/sincronizacao.
