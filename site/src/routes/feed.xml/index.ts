import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllPosts } from "../../lib/content/posts";
import { SITE_ORIGIN, SITE_NAME } from "../../lib/site-config";

function toRfc822(iso: string): string {
  const date = new Date(iso);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][date.getUTCMonth()];
  const year = date.getUTCFullYear();
  // Reconstruct from the ISO string's own offset rather than the runtime's
  // local timezone, so the feed is stable regardless of where it's built.
  const offsetMatch = iso.match(/([+-]\d{2}:\d{2})$/);
  const offset = offsetMatch ? offsetMatch[1].replace(":", "") : "+0000";
  const timeMatch = iso.match(/T(\d{2}:\d{2}:\d{2})/);
  const time = timeMatch ? timeMatch[1] : "00:00:00";
  return `${weekday}, ${day} ${month} ${year} ${time} ${offset}`;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const onGet: RequestHandler = async ({ send }) => {
  const posts = await getAllPosts();

  const items = posts
    .map((post) => {
      const link = `${SITE_ORIGIN}/posts/${post.slug}/`;
      return (
        `    <item>\n` +
        `      <title>${escapeXml(post.frontmatter.title)}</title>\n` +
        `      <link>${link}</link>\n` +
        `      <description><![CDATA[${post.frontmatter.description}]]></description>\n` +
        `      <pubDate>${toRfc822(post.frontmatter.date)}</pubDate>\n` +
        `      <guid isPermaLink="true">${link}</guid>\n` +
        `    </item>`
      );
    })
    .join("\n");

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    "  <channel>\n" +
    `    <title>${SITE_NAME}</title>\n` +
    `    <link>${SITE_ORIGIN}/</link>\n` +
    "    <description>um caderno vivo sobre software, produto, cultura, cotidiano e ideias em construção</description>\n" +
    `    <atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>\n` +
    `${items}\n` +
    "  </channel>\n" +
    "</rss>\n";

  send(
    new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
    }),
  );
};
