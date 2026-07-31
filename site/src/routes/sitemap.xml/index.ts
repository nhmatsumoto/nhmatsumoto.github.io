import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllPostSlugs } from "../../lib/content/posts";
import { getAllProjectSlugs } from "../../lib/content/projects";
import { getAllDocumentSlugs } from "../../lib/content/documents";
import { SITE_ORIGIN } from "../../lib/site-config";

// Hand-rolled instead of the static adapter's built-in generator so the
// /publications/ noindex redirect stubs can be excluded — they're not
// content, they'd just be duplicate-content noise for crawlers.
export const onGet: RequestHandler = async ({ send }) => {
  const staticPaths = [
    "/",
    "/posts/",
    "/posts/page/2/",
    "/posts/page/3/",
    "/projects/",
    "/documents/",
    "/fundamentos/",
    "/ia/",
    "/about/",
    "/contact/",
  ];

  const postUrls = getAllPostSlugs().map((slug) => `/posts/${slug}/`);
  const projectUrls = getAllProjectSlugs().map((slug) => `/projects/${slug}/`);
  const documentUrls = getAllDocumentSlugs().map((slug) => `/documents/${slug}/`);

  const urls = [...staticPaths, ...postUrls, ...projectUrls, ...documentUrls];

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((path) => `<url><loc>${SITE_ORIGIN}${path}</loc></url>`).join("\n") +
    "\n</urlset>\n";

  send(
    new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    }),
  );
};
