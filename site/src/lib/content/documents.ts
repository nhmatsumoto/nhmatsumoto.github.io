import matter from "gray-matter";
import { renderMarkdown } from "../markdown/pipeline";
import type { DocumentEntry, DocumentFrontmatter } from "./schema";
import { isContentVisibility, isDocumentKind, isKnowledgeDomain } from "./knowledge";

const rawFiles = import.meta.glob("/src/content/documents/*/index.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function slugFromPath(path: string): string {
  const match = path.match(/\/src\/content\/documents\/([^/]+)\/index\.md$/);
  if (!match) throw new Error(`Unexpected document content path: ${path}`);
  return match[1];
}

interface ParsedDocument {
  slug: string;
  frontmatter: DocumentFrontmatter;
  body: string;
}

const parsed: ParsedDocument[] = Object.entries(rawFiles).flatMap(([path, raw]) => {
  const { data, content } = matter(raw);
  const slug = slugFromPath(path);
  if (!isContentVisibility(data.visibility)) {
    throw new Error(`Document "${slug}" must set visibility to "draft" or "published".`);
  }
  if (data.visibility === "draft") return [];
  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error(`Published document "${slug}" must have a title.`);
  }
  if (typeof data.description !== "string" || !data.description.trim()) {
    throw new Error(`Published document "${slug}" must have a description.`);
  }
  if (!isKnowledgeDomain(data.domain) || !isDocumentKind(data.kind)) {
    throw new Error(`Published document "${slug}" must define a recognized domain and kind.`);
  }
  if (typeof data.version !== "string" || !Array.isArray(data.tags)) {
    throw new Error(`Published document "${slug}" must define a version and tags array.`);
  }
  return [{
    slug,
    frontmatter: data as DocumentFrontmatter,
    body: content,
  }];
});

let renderedCache: Promise<DocumentEntry[]> | null = null;

// Rendering (Shiki/mermaid) is async, so this can't be eager module-level
// work like the frontmatter parse above — it's memoized because SSG calls
// getAllDocuments()/getDocumentBySlug() once per route, and re-running the
// Shiki highlighter for every page would be wasteful for a collection that
// never changes within a single build.
function getAllRendered(): Promise<DocumentEntry[]> {
  if (!renderedCache) {
    renderedCache = Promise.all(
      parsed.map(async (doc) => ({
        slug: doc.slug,
        frontmatter: doc.frontmatter,
        html: await renderMarkdown(doc.body),
      })),
    );
  }
  return renderedCache;
}

export function getAllDocuments(): Promise<DocumentEntry[]> {
  return getAllRendered();
}

export async function getDocumentBySlug(slug: string): Promise<DocumentEntry | undefined> {
  const documents = await getAllRendered();
  return documents.find((doc) => doc.slug === slug);
}

/** Slugs only, no rendering — for onStaticGenerate, which doesn't need HTML. */
export function getAllDocumentSlugs(): string[] {
  return parsed.map((doc) => doc.slug);
}
