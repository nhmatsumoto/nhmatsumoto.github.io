# Site

Static website built with Qwik City and Vite.

## Structure

- `site/src/routes/`: page and endpoint routes.
- `site/src/components/`: shared interface components.
- `site/src/content/`: publication collections for knowledge, systems, and technical artifacts.
- `site/content-templates/`: article, ADR, project, and artifact outlines.
- `site/src/lib/`: site configuration, localization, and content loaders.
- `site/src/architecture.css` and `site/public/assets/styles.css`: interface styles.
- `.github/workflows/deploy-pages.yml`: static hosting workflow.

## Knowledge structure

Knowledge is grouped into architecture, AI, infrastructure, and security.
Published entries require a domain, kind, and a fixed sequence of sections:
context and problem, objective and constraints, architecture and decisions,
implementation and evidence, operation and risks, then results and next steps.
Entries marked `draft` stay out of the site. See
[`site/src/content/README.md`](site/src/content/README.md) before adding one.

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
