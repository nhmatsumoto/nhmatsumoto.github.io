import type {
  ContentVisibility,
  DocumentKind,
  KnowledgeDomain,
  PostKind,
  ProjectStatus,
} from "./knowledge";

export interface DocumentFrontmatter {
  title: string;
  description: string;
  version: string;
  domain: KnowledgeDomain;
  kind: DocumentKind;
  visibility: ContentVisibility;
  tags: string[];
}

export interface DocumentEntry {
  slug: string;
  frontmatter: DocumentFrontmatter;
  html: string;
}

export interface PostFrontmatter {
  title: string;
  description: string;
  domain: KnowledgeDomain;
  kind: PostKind;
  status: ContentVisibility;
  date: string;
  readingTime: number;
  hasMath: boolean;
  tags: string[];
  badges: string[];
  tradeoffs?: string[];
  lessons?: string[];
}

export interface PostEntry {
  slug: string;
  frontmatter: PostFrontmatter;
  html: string;
}

export interface ProjectFrontmatter {
  title: string;
  description: string;
  domain: KnowledgeDomain;
  visibility: ContentVisibility;
  status: ProjectStatus;
  stack: string[];
  tags: string[];
  repoUrl?: string;
  tradeoffs?: string[];
  lessons?: string[];
}

export interface ProjectEntry {
  slug: string;
  frontmatter: ProjectFrontmatter;
  html: string;
}
