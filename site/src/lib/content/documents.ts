import matter from "gray-matter";
import { renderMarkdown } from "../markdown/pipeline";
import type { DocumentEntry, DocumentFrontmatter } from "./schema";

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

const documents: DocumentEntry[] = Object.entries(rawFiles).map(
  ([path, raw]) => {
    const { data, content } = matter(raw);
    return {
      slug: slugFromPath(path),
      frontmatter: data as DocumentFrontmatter,
      html: renderMarkdown(content),
    };
  },
);

export function getAllDocuments(): DocumentEntry[] {
  return documents;
}

export function getDocumentBySlug(slug: string): DocumentEntry | undefined {
  return documents.find((doc) => doc.slug === slug);
}
