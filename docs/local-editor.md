# Editor local SQLite

Este fluxo adiciona um painel local separado do site publicado. Ele nao substitui o editor antigo em `scripts/editor_server.py`; serve para a saida single-page em `dist/`.

## Comando

```bash
python3 scripts/local_editor.py
```

Padrao:

- URL: `http://127.0.0.1:4174/`
- Banco: `data/content.sqlite3`
- Idiomas: `pt-BR`, `en`, `ja`

Para mudar porta ou banco:

```bash
python3 scripts/local_editor.py --port 4180 --db data/content.sqlite3
```

## O que o painel faz

- Lista as sections `home`, `about`, `projects`, `posts`, `daily`, `docs` e `contact`.
- Lista os conteudos importados dos TOMLs, Markdown e historico Git local.
- Edita `title`, `summary` e `body` por idioma.
- Mostra campos sem traducao propria.
- Salva no SQLite local.
- Exporta `dist/assets/translations.json`.
- Executa o build `dist/index.html`.

## Banco local

O schema fica em `scripts/content_db.py` e usa quatro tabelas:

- `sections`
- `contents`
- `translations`
- `build_logs`

O banco e local e nao deve ser publicado no GitHub Pages. A `.gitignore` ignora `data/*.sqlite3` e arquivos auxiliares do SQLite.

## Sincronizar fontes

O botao `Sincronizar fontes` reimporta TOML/Markdown para o SQLite com sobrescrita. Use com cuidado: ele descarta edicoes feitas apenas no banco quando a mesma chave existir na fonte.

Para inicializar ou sincronizar por terminal:

```bash
python3 scripts/content_db.py --init
python3 scripts/content_db.py --sync-source
```

## Exportar traducoes

```bash
python3 scripts/export_translations.py
```

Saida:

```text
dist/assets/translations.json
```

O JSON tambem e embutido em `dist/index.html` durante o build para a troca de idioma funcionar mesmo quando o HTML for aberto diretamente do arquivo local.
