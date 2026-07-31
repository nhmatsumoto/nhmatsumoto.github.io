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

export interface PostFrontmatter {
  title: string;
  description: string;
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
