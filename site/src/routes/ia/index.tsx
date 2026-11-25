import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { DomainPage } from "../../components/domain-page/domain-page";
import { getPostsByDomain } from "../../lib/content/posts";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export const useAiPosts = routeLoader$(() => getPostsByDomain("ai"));

export default component$(() => {
  const posts = useAiPosts();
  return <DomainPage domain="ai" posts={posts.value} />;
});

export const head: DocumentHead = {
  title: `IA | ${SITE_NAME}`,
  meta: [
    { name: "description", content: "Modelos, agentes, avaliação e integração com produtos e sistemas." },
    { property: "og:url", content: `${SITE_ORIGIN}/ia/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-domain" },
    { name: "x-has-math", content: "false" },
  ],
};
