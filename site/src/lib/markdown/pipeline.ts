import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { remarkCodeAndMermaid } from "./remark-code-and-mermaid";

// ```csharp (etc.) fences get build-time Shiki highlighting; ```mermaid
// fences become the diagram-shell markup for the client-side MermaidDiagram
// island. Both run as a remark plugin, before remark-rehype, replacing code
// nodes with raw HTML — same mechanism as any other inline HTML in markdown.
// Shiki's codeToHtml is async, so the whole pipeline (and renderMarkdown)
// must run through unified's async `.process()`, not `.processSync()`.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkCodeAndMermaid)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await processor.process(markdown);
  return String(result);
}
