# nhmatsumoto.github.io

Repositorio estatico publicado em `https://nhmatsumoto.github.io/`.

Este branch contem o artefato final do site: HTML, CSS, JavaScript, sitemap, feed e arquivos auxiliares prontos para o GitHub Pages servir a partir da raiz do repositorio.

## Estrutura atual

- `index.html`: pagina inicial.
- `posts/`, `publications/`, `fundamentos/`, `ia/`, `projects/`, `documents/`, `about/`, `contact/`: rotas estaticas publicadas.
- `assets/styles.css`: estilos globais.
- `assets/blog.js`: comportamento client-side, busca e internacionalizacao da interface.
- `assets/search-index.json`: indice local consumido pela busca.
- `feed.xml`, `sitemap.xml`, `robots.txt`, `.nojekyll`: arquivos de publicacao.
- `.github/workflows/deploy-pages.yml`: workflow que envia a raiz do repositorio para o GitHub Pages.

## Publicacao

O deploy roda automaticamente em push para `master`.

O workflow nao executa build neste branch. Ele faz checkout, configura GitHub Pages, empacota `.` e publica o conteudo estatico diretamente.

## Validacao local

```bash
node --check assets/blog.js
python3 -m http.server 8123
```

Depois, abra `http://127.0.0.1:8123/`.

## Observacoes

- Para evitar processamento do Jekyll no GitHub Pages, `.nojekyll` deve permanecer versionado.
- Novas alteracoes de conteudo neste branch devem atualizar diretamente os arquivos estaticos correspondentes.
