/**
 * One-time extraction: legacy posts/<slug>/index.html (pre-rendered HTML,
 * no source markdown exists) -> site/src/content/posts/<slug>/index.md
 * (frontmatter + markdown, mermaid/code fences reconstructed from the
 * rendered diagram-shell/code-shell markup). Throwaway tooling — not part
 * of the app build, run manually via `npx tsx scripts/import-legacy-html.ts`.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

const LEGACY_POSTS_DIR = join(import.meta.dirname, "../../posts");
const OUT_DIR = join(import.meta.dirname, "../src/content/posts");

const SKIP_DIRS = new Set(["page", "design-patterns-csharp"]);

function yamlString(value: string): string {
  // Simple, safe-enough YAML scalar quoting for our controlled content.
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yamlList(values: string[]): string {
  if (values.length === 0) return "[]";
  return "\n" + values.map((v) => `  - ${yamlString(v)}`).join("\n");
}

function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  // Content is generated, not hand-authored markdown round-tripping through
  // HTML — disable escaping so LaTeX (`\alpha_1`, `x^2`, etc.) in MathJax
  // posts survives intact instead of getting `_`/`*` escaped by default.
  td.escape = (text: string) => text;

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

  // Evidence sections (trade-offs/lessons) are extracted separately into
  // frontmatter (see extractEvidence) — drop them here so they don't also
  // end up duplicated in the markdown body.
  td.addRule("dropEvidenceSection", {
    filter: (node) =>
      node.nodeName === "SECTION" && node.classList.contains("evidence-section"),
    replacement: () => "",
  });

  return td;
}

interface Evidence {
  tradeoffs: string[];
  lessons: string[];
}

function extractEvidence(doc: Document): Evidence {
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

function extractOne(slug: string, turndown: TurndownService) {
  const htmlPath = join(LEGACY_POSTS_DIR, slug, "index.html");
  const html = readFileSync(htmlPath, "utf-8");
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const title = doc.querySelector("h1[data-page-title]")?.textContent?.trim();
  const description = doc.querySelector("p[data-page-summary]")?.textContent?.trim();
  const dateEl = doc.querySelector(".post-meta-hero time[datetime]");
  const date = dateEl?.getAttribute("datetime");
  const readingTimeAttr = doc.querySelector("[data-reading-time]")?.getAttribute("data-reading-time");
  const hasMath = doc.querySelector("body")?.getAttribute("data-has-math") === "true";

  const sidebar = doc.querySelector("aside.page-sidebar");
  const tags = Array.from(sidebar?.querySelectorAll(".tag-list .tag") ?? []).map(
    (el) => el.textContent?.trim() ?? "",
  );
  const badges = Array.from(sidebar?.querySelectorAll(".badge-list .badge") ?? []).map(
    (el) => el.textContent?.trim() ?? "",
  );

  const bodyEl = doc.querySelector("[data-page-body]");
  if (!title || !description || !date || !bodyEl) {
    throw new Error(`Missing required field(s) for ${slug}: title=${!!title} description=${!!description} date=${!!date} body=${!!bodyEl}`);
  }

  const { tradeoffs, lessons } = extractEvidence(doc);

  // Extract Mermaid source directly from our own DOM (whitespace intact)
  // and swap each diagram-shell for a plain-text placeholder *before*
  // turndown ever sees the HTML — see buildTurndown() for why this can't
  // just be a turndown replacement rule.
  const mermaidBlocks: string[] = [];
  bodyEl.querySelectorAll(".mermaid-shell").forEach((shellEl) => {
    const source = shellEl.querySelector(".mermaid")?.textContent ?? "";
    mermaidBlocks.push(source.trim());
    const placeholder = doc.createTextNode(
      `@@MERMAID_BLOCK_${mermaidBlocks.length - 1}@@`,
    );
    shellEl.replaceWith(placeholder);
  });

  let bodyMarkdown = turndown
    .turndown(bodyEl.innerHTML)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  mermaidBlocks.forEach((source, i) => {
    bodyMarkdown = bodyMarkdown.replace(
      `@@MERMAID_BLOCK_${i}@@`,
      () => `\`\`\`mermaid\n${source}\n\`\`\``,
    );
  });
  bodyMarkdown = bodyMarkdown.replace(/\n{3,}/g, "\n\n").trim();

  const frontmatterLines = [
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `date: ${yamlString(date)}`,
    `readingTime: ${readingTimeAttr ? Number(readingTimeAttr) : 1}`,
    `hasMath: ${hasMath}`,
    `tags: ${yamlList(tags)}`,
    `badges: ${yamlList(badges)}`,
  ];
  if (tradeoffs.length) frontmatterLines.push(`tradeoffs: ${yamlList(tradeoffs)}`);
  if (lessons.length) frontmatterLines.push(`lessons: ${yamlList(lessons)}`);

  const fileContent = `---\n${frontmatterLines.join("\n")}\n---\n\n${bodyMarkdown}\n`;

  const outDir = join(OUT_DIR, slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.md"), fileContent, "utf-8");
}

function main() {
  const slugs = readdirSync(LEGACY_POSTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !SKIP_DIRS.has(d.name))
    .map((d) => d.name);

  const turndown = buildTurndown();
  let ok = 0;
  for (const slug of slugs) {
    try {
      extractOne(slug, turndown);
      ok++;
    } catch (err) {
      console.error(`FAILED: ${slug}`, err);
    }
  }
  console.log(`Extracted ${ok}/${slugs.length} posts into ${OUT_DIR}`);
}

main();
