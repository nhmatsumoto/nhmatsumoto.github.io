import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { DomainPage } from "../../components/domain-page/domain-page";
import { getPostsByDomain } from "../../lib/content/posts";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export const useStackPosts = routeLoader$(() => getPostsByDomain("stacks"));

export default component$(() => {
  const posts = useStackPosts();
  return <DomainPage domain="stacks" posts={posts.value} />;
});

export const head: DocumentHead = {
  title: `Outras stacks | ${SITE_NAME}`,
  meta: [
    {
      name: "description",
      content:
        "Referências de React, JavaScript, TypeScript, HTML, CSS, Python e Java.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/stacks/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-domain" },
    { name: "x-has-math", content: "false" },
  ],
};
