/**
 * One-time extraction: legacy posts/<slug>/index.html (pre-rendered HTML,
 * no source markdown exists) -> site/src/content/posts/<slug>/index.md
 * (frontmatter + markdown, mermaid/code fences reconstructed from the
 * rendered diagram-shell/code-shell markup). Throwaway tooling — not part
 * of the app build, run manually via `npx tsx scripts/import-legacy-html.ts`.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  yamlString,
  yamlList,
  buildTurndown,
  extractEvidence,
  bodyToMarkdown,
  parseHtml,
} from "./extract-shared";

const LEGACY_POSTS_DIR = join(import.meta.dirname, "../../posts");
const OUT_DIR = join(import.meta.dirname, "../src/content/posts");

const SKIP_DIRS = new Set(["page", "design-patterns-csharp"]);

function extractOne(slug: string, turndown: ReturnType<typeof buildTurndown>) {
  const htmlPath = join(LEGACY_POSTS_DIR, slug, "index.html");
  const html = readFileSync(htmlPath, "utf-8");
  const doc = parseHtml(html);

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
  const bodyMarkdown = bodyToMarkdown(doc, bodyEl, turndown);

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
