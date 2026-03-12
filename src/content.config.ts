import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const publicationsCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const docsCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  'publications': publicationsCollection,
  'docs': docsCollection,
};
