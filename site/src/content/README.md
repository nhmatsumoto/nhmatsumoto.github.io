# Content model

The content collections under `posts/`, `projects/`, and `documents/` are
publication sources. Only entries marked `published` are included in the
static site, search index, RSS feed, and sitemap. Keep work in `draft` until
its structure and evidence are complete.

## Knowledge entries

Every published post needs a domain (`architecture`, `ai`, `infrastructure`,
or `security`), a kind (`article`, `decision`, `experiment`, or `runbook`),
and these H2 sections in order:

1. Contexto e problema
2. Objetivo e restrições
3. Arquitetura e decisões
4. Implementação e evidências
5. Operação e riscos
6. Resultado e próximos passos

Use `../../content-templates/knowledge-entry.md` as the general outline or
`../../content-templates/architecture-decision.md` for an ADR. The content loader
checks the metadata and section order before generating any published entry.

## Systems and artifacts

Projects use an explicit lifecycle status alongside publication visibility.
Technical documents use a kind (`adr`, `runbook`, or `reference`), a domain,
and publication visibility. Templates are in `../../content-templates/`.
