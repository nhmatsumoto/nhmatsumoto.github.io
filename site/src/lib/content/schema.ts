export interface DocumentFrontmatter {
  title: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
}

export interface DocumentEntry {
  slug: string;
  frontmatter: DocumentFrontmatter;
  html: string;
}
