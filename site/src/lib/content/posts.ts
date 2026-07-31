import matter from "gray-matter";
import { renderMarkdown } from "../markdown/pipeline";
import type { PostEntry, PostFrontmatter } from "./schema";

const rawFiles = import.meta.glob("/src/content/posts/*/index.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function slugFromPath(path: string): string {
  const match = path.match(/\/src\/content\/posts\/([^/]+)\/index\.md$/);
  if (!match) throw new Error(`Unexpected post content path: ${path}`);
  return match[1];
}

interface ParsedPost {
  slug: string;
  frontmatter: PostFrontmatter;
  body: string;
}

const parsed: ParsedPost[] = Object.entries(rawFiles)
  .map(([path, raw]) => {
    const { data, content } = matter(raw);
    return {
      slug: slugFromPath(path),
      frontmatter: data as PostFrontmatter,
      body: content,
    };
  })
  // Newest first — every listing/pagination/RSS consumer reads this order
  // directly rather than re-sorting, so it only needs to be correct once.
  .sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date));

let renderedCache: Promise<PostEntry[]> | null = null;

function getAllRendered(): Promise<PostEntry[]> {
  if (!renderedCache) {
    renderedCache = Promise.all(
      parsed.map(async (post) => ({
        slug: post.slug,
        frontmatter: post.frontmatter,
        html: await renderMarkdown(post.body),
      })),
    );
  }
  return renderedCache;
}

export function getAllPosts(): Promise<PostEntry[]> {
  return getAllRendered();
}

export async function getPostBySlug(slug: string): Promise<PostEntry | undefined> {
  const posts = await getAllRendered();
  return posts.find((post) => post.slug === slug);
}

/** Slugs only, no rendering — for onStaticGenerate / sitemap / search index. */
export function getAllPostSlugs(): string[] {
  return parsed.map((post) => post.slug);
}

export const POSTS_PER_PAGE = 10;

export function getPostPageCount(): number {
  return Math.max(1, Math.ceil(parsed.length / POSTS_PER_PAGE));
}
