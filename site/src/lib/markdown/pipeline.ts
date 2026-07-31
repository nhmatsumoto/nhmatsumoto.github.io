import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

// Base pipeline for Fase 1: plain markdown -> the same HTML shape the legacy
// generator produced for prose (headings, paragraphs, lists, bold/code).
// Fase 2 adds custom remark/rehype plugins on top of this for ```csharp
// (Shiki, build-time) and ```mermaid (kept as raw text for the client island)
// fenced blocks — see the migration plan for why those are a separate phase.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

export function renderMarkdown(markdown: string): string {
  return String(processor.processSync(markdown));
}
