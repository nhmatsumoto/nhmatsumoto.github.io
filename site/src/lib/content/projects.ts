import matter from "gray-matter";
import { renderMarkdown } from "../markdown/pipeline";
import type { ProjectEntry, ProjectFrontmatter } from "./schema";

const rawFiles = import.meta.glob("/src/content/projects/*/index.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function slugFromPath(path: string): string {
  const match = path.match(/\/src\/content\/projects\/([^/]+)\/index\.md$/);
  if (!match) throw new Error(`Unexpected project content path: ${path}`);
  return match[1];
}

interface ParsedProject {
  slug: string;
  frontmatter: ProjectFrontmatter;
  body: string;
}

const parsed: ParsedProject[] = Object.entries(rawFiles)
  .map(([path, raw]) => {
    const { data, content } = matter(raw);
    return {
      slug: slugFromPath(path),
      frontmatter: data as ProjectFrontmatter,
      body: content,
    };
  })
  .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));

let renderedCache: Promise<ProjectEntry[]> | null = null;

function getAllRendered(): Promise<ProjectEntry[]> {
  if (!renderedCache) {
    renderedCache = Promise.all(
      parsed.map(async (project) => ({
        slug: project.slug,
        frontmatter: project.frontmatter,
        html: await renderMarkdown(project.body),
      })),
    );
  }
  return renderedCache;
}

export function getAllProjects(): Promise<ProjectEntry[]> {
  return getAllRendered();
}

export async function getProjectBySlug(slug: string): Promise<ProjectEntry | undefined> {
  const projects = await getAllRendered();
  return projects.find((project) => project.slug === slug);
}

export function getAllProjectSlugs(): string[] {
  return parsed.map((project) => project.slug);
}
