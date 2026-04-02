# Blog Estático em TOML

Blog pessoal publicado por GitHub Pages com:

- HTML semântico no destino final
- CSS e JavaScript manuais
- conteúdo persistido em `.toml`
- editor localhost para escrever, visualizar, buildar e commitar

## Estrutura

- `blog.toml`: configuração do build e do suporte a AsciiMath
- `content/site.toml`: metadados do blog
- `content/posts/*.toml`: posts versionados
- `assets/`: CSS e JavaScript do site público
- `editor/`: interface web do editor local
- `scripts/build.py`: gerador estático
- `scripts/editor_server.py`: servidor localhost do editor
- `plans/blog-mvp.toml`: plano da feature em TOML

## Fluxo de publicação

1. Editar `content/site.toml` e `content/posts/*.toml` diretamente ou usar o editor local.
2. Rodar o build estático.
3. Revisar o HTML gerado em `index.html` e `publications/`.
4. Fazer `git commit` e `git push`.
5. O GitHub Pages reflete a atualização após o push.

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
tags = ["tecnologia", "vida"]
has_asciimath = true

body = """
# Título

Texto do post.
"""
```

O diretório público de cada publicação é gerado a partir de `id + slug`, por exemplo:

```text
publications/20260403-221500-meu-post/index.html
```

## Markdown e AsciiMath

O renderizador local suporta o necessário para um blog simples:

- títulos
- parágrafos
- listas
- links
- blockquote
- blocos de código com ``` 

Para AsciiMath:

- inline: `%%x^2 + y^2%%`
- bloco: `%%%sum_(i=1)^n i%%%`

## Observações

- `publications/` é diretório gerado; o build recria seu conteúdo.
- o editor local faz preview usando o mesmo motor do build.
- o botão de publicar faz build antes de executar `git commit`.
