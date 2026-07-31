/**
 * One-time extraction: legacy projects/<slug>/index.html ->
 * site/src/content/projects/<slug>/index.md. Throwaway tooling — run
 * manually via `npx tsx scripts/import-legacy-projects.ts`.
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

const LEGACY_DIR = join(import.meta.dirname, "../../projects");
const OUT_DIR = join(import.meta.dirname, "../src/content/projects");

function extractOne(slug: string, turndown: ReturnType<typeof buildTurndown>) {
  const html = readFileSync(join(LEGACY_DIR, slug, "index.html"), "utf-8");
  const doc = parseHtml(html);

  const title = doc.querySelector("h1[data-page-title]")?.textContent?.trim();
  const description = doc.querySelector("p[data-page-summary]")?.textContent?.trim();
  const status = doc.querySelector(".status-chip")?.textContent?.trim() ?? "publicado";
  const repoUrl = doc.querySelector(".sidebar-actions .sidebar-link")?.getAttribute("href") ?? undefined;

  const sidebar = doc.querySelector("aside.page-sidebar");
  const stack = Array.from(sidebar?.querySelectorAll(".stack-list .stack-chip") ?? []).map(
    (el) => el.textContent?.trim() ?? "",
  );
  const tags = Array.from(sidebar?.querySelectorAll(".tag-list .tag") ?? []).map(
    (el) => el.textContent?.trim() ?? "",
  );

  const bodyEl = doc.querySelector("[data-page-body]");
  if (!title || !description || !bodyEl) {
    throw new Error(`Missing required field(s) for ${slug}: title=${!!title} description=${!!description} body=${!!bodyEl}`);
  }

  const { tradeoffs, lessons } = extractEvidence(doc);
  const bodyMarkdown = bodyToMarkdown(doc, bodyEl, turndown);

  const frontmatterLines = [
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `status: ${yamlString(status)}`,
    `stack: ${yamlList(stack)}`,
    `tags: ${yamlList(tags)}`,
  ];
  if (repoUrl) frontmatterLines.push(`repoUrl: ${yamlString(repoUrl)}`);
  if (tradeoffs.length) frontmatterLines.push(`tradeoffs: ${yamlList(tradeoffs)}`);
  if (lessons.length) frontmatterLines.push(`lessons: ${yamlList(lessons)}`);

  const fileContent = `---\n${frontmatterLines.join("\n")}\n---\n\n${bodyMarkdown}\n`;

  const outDir = join(OUT_DIR, slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.md"), fileContent, "utf-8");
}

function main() {
  const slugs = readdirSync(LEGACY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
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
  console.log(`Extracted ${ok}/${slugs.length} projects into ${OUT_DIR}`);
}

main();
