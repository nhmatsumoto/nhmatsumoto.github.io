import matter from "gray-matter";
import { renderMarkdown } from "../markdown/pipeline";
import type { ProjectEntry, ProjectFrontmatter } from "./schema";
import { isContentVisibility, isKnowledgeDomain, isProjectStatus } from "./knowledge";

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
  .flatMap(([path, raw]) => {
    const { data, content } = matter(raw);
    const slug = slugFromPath(path);
    if (!isContentVisibility(data.visibility)) {
      throw new Error(`Project "${slug}" must set visibility to "draft" or "published".`);
    }
    if (data.visibility === "draft") return [];
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw new Error(`Published project "${slug}" must have a title.`);
    }
    if (typeof data.description !== "string" || !data.description.trim()) {
      throw new Error(`Published project "${slug}" must have a description.`);
    }
    if (!isKnowledgeDomain(data.domain)) {
      throw new Error(`Published project "${slug}" must use a recognized knowledge domain.`);
    }
    if (!isProjectStatus(data.status)) {
      throw new Error(`Published project "${slug}" must use a recognized lifecycle status.`);
    }
    if (!Array.isArray(data.stack) || !Array.isArray(data.tags)) {
      throw new Error(`Published project "${slug}" must define stack and tags arrays.`);
    }
    return {
      slug,
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
