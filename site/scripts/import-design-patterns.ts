/**
 * One-time extraction for the orphaned posts/design-patterns-csharp/ tree
 * (bespoke template, never linked from any listing, not migrated in earlier
 * phases). Each category page (criacionais/estruturais/comportamentais)
 * becomes its own post under site/src/content/posts/. Unlike the standard
 * posts, code here is plain <pre><code> (not pre-highlighted) and diagrams
 * are plain <pre class="mermaid"> — simpler to extract than the Shiki-baked
 * posts, since there's no whitespace-collapse trap to work around (both are
 * already inside <pre>, which turndown preserves).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseHtml } from "./extract-shared";

const LEGACY_DIR = join(import.meta.dirname, "../../posts/design-patterns-csharp");
const OUT_DIR = join(import.meta.dirname, "../src/content/posts");

function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function yamlList(values: string[]): string {
  if (values.length === 0) return "[]";
  return "\n" + values.map((v) => `  - ${yamlString(v)}`).join("\n");
}

interface CategoryPage {
  slug: string;
  file: string;
  title: string;
  description: string;
  date: string;
  intro: string;
}

const CATEGORIES: CategoryPage[] = [
  {
    slug: "design-patterns-csharp-criacionais",
    file: "criacionais/index.html",
    title: "Padrões criacionais em C#",
    description: "Cinco padrões para controlar como objetos e famílias de objetos são construídos.",
    date: "2026-04-03T07:00:00+09:00",
    intro:
      "Os exemplos são deliberadamente pequenos para evidenciar a colaboração entre os participantes. Em produção, combine-os com DI, logging, cancelamento, tratamento de falhas e testes.",
  },
  {
    slug: "design-patterns-csharp-estruturais",
    file: "estruturais/index.html",
    title: "Padrões estruturais em C#",
    description: "Sete padrões para compor classes e objetos sem criar acoplamento rígido.",
    date: "2026-04-03T07:05:00+09:00",
    intro: "",
  },
  {
    slug: "design-patterns-csharp-comportamentais",
    file: "comportamentais/index.html",
    title: "Padrões comportamentais em C#",
    description: "Dez padrões para distribuir responsabilidades, comunicação e algoritmos.",
    date: "2026-04-03T07:10:00+09:00",
    intro: "",
  },
];

function decodeEntities(text: string): string {
  const div = parseHtml(`<div>${text}</div>`).querySelector("div")!;
  return div.textContent ?? "";
}

function extractCategory(cat: CategoryPage): string {
  const html = readFileSync(join(LEGACY_DIR, cat.file), "utf-8");
  const doc = parseHtml(html);

  const introFromDoc = doc.querySelector(".dp-hero p:nth-of-type(2)")?.textContent?.trim();
  const intro = cat.intro || introFromDoc || "";

  const patterns = Array.from(doc.querySelectorAll("section.pattern"));
  const parts: string[] = [];
  if (intro) parts.push(intro);

  for (const section of patterns) {
    const name = section.querySelector("h2")?.textContent?.trim() ?? "";
    const paragraphs = Array.from(section.querySelectorAll(":scope > p, :scope > h3"));
    parts.push(`## ${name}`);

    let cursor: Element | null = section.firstElementChild;
    while (cursor) {
      if (cursor.tagName === "P" && cursor.classList.contains("intent")) {
        parts.push(cursor.textContent?.trim() ?? "");
      } else if (cursor.tagName === "H3") {
        parts.push(`### ${cursor.textContent?.trim()}`);
      } else if (cursor.tagName === "P") {
        parts.push(cursor.textContent?.trim() ?? "");
      } else if (cursor.tagName === "PRE" && cursor.classList.contains("mermaid")) {
        const source = decodeEntities(cursor.innerHTML).trim();
        parts.push(`\`\`\`mermaid\n${source}\n\`\`\``);
      } else if (cursor.tagName === "PRE") {
        const code = decodeEntities(cursor.innerHTML).trim();
        parts.push(`\`\`\`csharp\n${code}\n\`\`\``);
      }
      cursor = cursor.nextElementSibling;
    }
    void paragraphs;
  }

  const body = parts.filter(Boolean).join("\n\n");

  const frontmatterLines = [
    `title: ${yamlString(cat.title)}`,
    `description: ${yamlString(cat.description)}`,
    `date: ${yamlString(cat.date)}`,
    `readingTime: 4`,
    `hasMath: false`,
    `tags: ${yamlList(["design-patterns", "csharp", "dotnet", "gof"])}`,
    `badges: ${yamlList(["arquitetura", "dotnet", "design"])}`,
  ];

  return `---\n${frontmatterLines.join("\n")}\n---\n\n${body}\n`;
}

function main() {
  for (const cat of CATEGORIES) {
    const content = extractCategory(cat);
    const outDir = join(OUT_DIR, cat.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.md"), content, "utf-8");
    console.log(`Wrote ${cat.slug}`);
  }
}

main();
