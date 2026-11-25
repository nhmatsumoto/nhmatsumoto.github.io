import matter from "gray-matter";
import { renderMarkdown } from "../markdown/pipeline";
import type { PostEntry, PostFrontmatter } from "./schema";
import {
  isContentVisibility,
  isKnowledgeDomain,
  isPostKind,
  REQUIRED_ARTICLE_SECTIONS,
} from "./knowledge";

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
  .flatMap(([path, raw]) => {
    const { data, content } = matter(raw);
    const slug = slugFromPath(path);
    if (!isContentVisibility(data.status)) {
      throw new Error(`Post "${slug}" must set status to "draft" or "published".`);
    }
    if (data.status === "draft") return [];

    if (typeof data.title !== "string" || !data.title.trim()) {
      throw new Error(`Published post "${slug}" must have a title.`);
    }
    if (typeof data.description !== "string" || !data.description.trim()) {
      throw new Error(`Published post "${slug}" must have a description.`);
    }
    if (!isKnowledgeDomain(data.domain)) {
      throw new Error(`Published post "${slug}" must use a recognized knowledge domain.`);
    }
    if (!isPostKind(data.kind)) {
      throw new Error(`Published post "${slug}" must use a recognized post kind.`);
    }
    if (typeof data.date !== "string" || Number.isNaN(Date.parse(data.date))) {
      throw new Error(`Published post "${slug}" must have a valid ISO date.`);
    }
    if (!Number.isFinite(data.readingTime) || data.readingTime < 0) {
      throw new Error(`Published post "${slug}" must have a non-negative readingTime.`);
    }
    if (typeof data.hasMath !== "boolean" || !Array.isArray(data.tags) || !Array.isArray(data.badges)) {
      throw new Error(`Published post "${slug}" must define hasMath, tags, and badges.`);
    }
    if (
      (data.tradeoffs !== undefined && !Array.isArray(data.tradeoffs)) ||
      (data.lessons !== undefined && !Array.isArray(data.lessons))
    ) {
      throw new Error(`Published post "${slug}" must define tradeoffs and lessons as arrays.`);
    }

    const headings = Array.from(content.matchAll(/^##\s+(.+?)\s*#*\s*$/gm), (match) =>
      normalizeHeading(match[1]),
    );
    let previousHeadingIndex = -1;
    for (const requiredSection of REQUIRED_ARTICLE_SECTIONS) {
      const headingIndex = headings.indexOf(normalizeHeading(requiredSection));
      if (headingIndex === -1) {
        throw new Error(
          `Published post "${slug}" must include the H2 section "${requiredSection}".`,
        );
      }
      if (headingIndex < previousHeadingIndex) {
        throw new Error(
          `Required sections in published post "${slug}" must follow the editorial order.`,
        );
      }
      previousHeadingIndex = headingIndex;
    }

    return {
      slug,
      frontmatter: data as PostFrontmatter,
      body: content,
    };
  })
  // Newest first — every listing/pagination/RSS consumer reads this order
  // directly rather than re-sorting, so it only needs to be correct once.
  .sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date));

function normalizeHeading(value: string): string {
  return value
    .replace(/^\d+[.)-]\s*/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

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

export async function getPostsByDomain(domain: PostFrontmatter["domain"]): Promise<PostEntry[]> {
  const posts = await getAllRendered();
  return posts.filter((post) => post.frontmatter.domain === domain);
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
