import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

export function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function yamlList(values: string[]): string {
  if (values.length === 0) return "[]";
  return "\n" + values.map((v) => `  - ${yamlString(v)}`).join("\n");
}

export function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  td.escape = (text: string) => text;
  // Plain turndown has no opinion on <table> — it just flattens cell text
  // into loose lines, losing structure entirely. The GFM plugin adds a
  // proper `| a | b |` table rule (remark-gfm on the render side already
  // expects GFM tables, so this is the matching half of that pipe).
  td.use(gfm);

  td.addRule("codeShell", {
    filter: (node) =>
      node.nodeName === "DIV" && node.classList.contains("code-shell"),
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const lang = el.getAttribute("data-language") || "text";
      const code = el.querySelector("pre code")?.textContent ?? "";
      return `\n\n\`\`\`${lang}\n${code.replace(/\n$/, "")}\n\`\`\`\n\n`;
    },
  });

  td.addRule("dropEvidenceSection", {
    filter: (node) =>
      node.nodeName === "SECTION" && node.classList.contains("evidence-section"),
    replacement: () => "",
  });

  return td;
}

export interface Evidence {
  tradeoffs: string[];
  lessons: string[];
}

export function extractEvidence(doc: Document): Evidence {
  const tradeoffs: string[] = [];
  const lessons: string[] = [];
  doc.querySelectorAll(".evidence-section").forEach((section) => {
    const title = section.querySelector(".evidence-title")?.textContent ?? "";
    const items = Array.from(section.querySelectorAll("li span")).map(
      (span) => span.textContent?.trim() ?? "",
    );
    if (title.includes("Trade-offs")) tradeoffs.push(...items);
    else if (title.includes("Lições")) lessons.push(...items);
  });
  return { tradeoffs, lessons };
}

/**
 * Converts a body element's innerHTML to markdown, reconstructing ```mermaid
 * fences from .mermaid-shell blocks (extracted from the DOM directly, since
 * turndown collapses whitespace inside plain <div>s before its rules run —
 * see git history for the bug this works around).
 */
export function bodyToMarkdown(
  doc: Document,
  bodyEl: Element,
  turndown: TurndownService,
): string {
  const mermaidBlocks: string[] = [];
  bodyEl.querySelectorAll(".mermaid-shell").forEach((shellEl) => {
    const source = shellEl.querySelector(".mermaid")?.textContent ?? "";
    mermaidBlocks.push(source.trim());
    const placeholder = doc.createTextNode(
      `@@MERMAID_BLOCK_${mermaidBlocks.length - 1}@@`,
    );
    shellEl.replaceWith(placeholder);
  });

  let markdown = turndown
    .turndown(bodyEl.innerHTML)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  mermaidBlocks.forEach((source, i) => {
    markdown = markdown.replace(
      `@@MERMAID_BLOCK_${i}@@`,
      () => `\`\`\`mermaid\n${source}\n\`\`\``,
    );
  });

  return markdown.replace(/\n{3,}/g, "\n\n").trim();
}

export function parseHtml(html: string) {
  const dom = new JSDOM(html);
  return dom.window.document;
}
