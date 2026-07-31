import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllPosts } from "../../../lib/content/posts";
import { getAllProjects } from "../../../lib/content/projects";
import { getAllDocuments } from "../../../lib/content/documents";

interface SearchEntry {
  title: string;
  url: string;
  kind: string;
  description: string;
}

// Generated from the same collections the routes render from — the legacy
// hand-maintained assets/search-index.json silently missed every
// /publications/ entry (it was a second, separately-updated list); deriving
// this from the content source of truth makes that class of bug structural.
export const onGet: RequestHandler = async ({ send }) => {
  const [posts, projects, documents] = await Promise.all([
    getAllPosts(),
    getAllProjects(),
    getAllDocuments(),
  ]);

  const entries: SearchEntry[] = [
    ...posts.map((p) => ({
      title: p.frontmatter.title,
      url: `/posts/${p.slug}/`,
      kind: "posts",
      description: p.frontmatter.description,
    })),
    ...projects.map((p) => ({
      title: p.frontmatter.title,
      url: `/projects/${p.slug}/`,
      kind: "projects",
      description: p.frontmatter.description,
    })),
    ...documents.map((d) => ({
      title: d.frontmatter.title,
      url: `/documents/${d.slug}/`,
      kind: "documents",
      description: d.frontmatter.description,
    })),
    { title: "Sobre", url: "/about/", kind: "about", description: "" },
    { title: "Contato", url: "/contact/", kind: "contact", description: "" },
  ];

  send(
    new Response(JSON.stringify(entries), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }),
  );
};
