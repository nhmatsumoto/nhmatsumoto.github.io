# Site

Static website built with Qwik City and Vite.

## Structure

- `site/src/routes/`: page and endpoint routes.
- `site/src/components/`: shared interface components.
- `site/src/content/`: empty content collections for posts, projects, and documents.
- `site/src/lib/`: site configuration, localization, and content loaders.
- `site/src/global.css` and `site/public/assets/styles.css`: interface styles.
- `.github/workflows/deploy-pages.yml`: static hosting workflow.

## Development

```bash
cd site
npm install
npm run start
```

## Build

```bash
cd site
npm run build.client
npm run build.server
```
