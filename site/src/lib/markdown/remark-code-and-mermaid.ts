import { visit } from "unist-util-visit";
import type { Root, Code, Html } from "mdast";
import { codeToShellHtml } from "./code-shell";
import { mermaidToShellHtml } from "./mermaid";

/**
 * Replaces fenced code blocks with pre-rendered HTML:
 * - ```mermaid  -> the diagram-shell markup, rendered client-side by the
 *   MermaidDiagram island (see components/mermaid-diagram).
 * - anything else -> build-time Shiki-highlighted code-shell markup.
 *
 * Runs as a remark plugin (before remark-rehype) so the resulting `html`
 * mdast nodes pass through as raw HTML, same mechanism used for any other
 * inline HTML in the markdown source.
 */
export function remarkCodeAndMermaid() {
  return async (tree: Root) => {
    const replacements: Array<() => Promise<void>> = [];

    visit(tree, "code", (node: Code) => {
      const target = node as unknown as Html;
      const lang = node.lang;
      const value = node.value;

      replacements.push(async () => {
        const html =
          lang === "mermaid"
            ? mermaidToShellHtml(value)
            : await codeToShellHtml(value, lang ?? null);
        target.type = "html";
        (target as unknown as Code).lang = undefined;
        target.value = html;
      });
    });

    for (const replace of replacements) {
      await replace();
    }
  };
}
