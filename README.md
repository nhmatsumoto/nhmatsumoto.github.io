# nhmatsumoto.github.io

Site publicado em `https://nhmatsumoto.github.io/`.

## Estrutura

- `site/`: código-fonte do site — projeto [Qwik City](https://qwik.dev/qwikcity/overview/) com adapter estático (SSG). Todo o conteúdo (posts, projetos, documentos), componentes, estilos e rotas vivem aqui. Veja `site/README.md` para detalhes do projeto Qwik em si.
- `.github/workflows/deploy-pages.yml`: workflow que builda `site/` e publica `site/dist/` no GitHub Pages.
- `LICENSE`, `resume.md`: arquivos auxiliares do repositório, fora do conteúdo publicado.

## Publicação

O deploy roda automaticamente em push para `master`:

1. `npm ci` em `site/`.
2. `npm run build.client` e `npm run build.server` (gera `site/dist/`, incluindo HTML estático de todas as rotas, `sitemap.xml`, `feed.xml` e `robots.txt`).
3. `site/dist/` é publicado no GitHub Pages via Actions.

`site/dist/` não é versionado — é gerado a cada deploy.

## Desenvolvimento local

```bash
cd site
npm install
npm run start        # dev server com SSR (vite --mode ssr)
```

Para validar um build de produção localmente:

```bash
cd site
npm run build.client
npm run build.server
npx vite preview --outDir dist
```

> `npm run build` (o orquestrador `qwik build`, que roda type-check + lint + build) tem um bug conhecido de compatibilidade com npm ≥ 9: o CLI do Qwik injeta a flag `--pretty` sem o separador `--` ao chamar `npm run build.types`, e o npm passa a rejeitá-la como flag desconhecida (`EUNKNOWNCONFIG`). Rode `npm run build.types`, `npm run lint`, `npm run build.client` e `npm run build.server` separadamente como contorno — é exatamente o que o workflow de deploy faz.

## Observações

- Novas alterações de conteúdo (posts, projetos, documentos) entram em `site/src/content/`.
- Este repositório já teve uma versão anterior do site (HTML/CSS/JS estático publicado direto da raiz). Ela foi removida após a migração para Qwik; o histórico do git preserva esses arquivos caso sejam necessários para referência.
