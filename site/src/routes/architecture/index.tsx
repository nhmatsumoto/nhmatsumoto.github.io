import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { DomainPage } from "../../components/domain-page/domain-page";
import { getPostsByDomain } from "../../lib/content/posts";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export const useArchitecturePosts = routeLoader$(() => getPostsByDomain("architecture"));

export default component$(() => {
  const posts = useArchitecturePosts();
  return <DomainPage domain="architecture" posts={posts.value} />;
});

export const head: DocumentHead = {
  title: `Arquitetura | ${SITE_NAME}`,
  meta: [
    { name: "description", content: "Limites, qualidade, decisões e evolução de sistemas." },
    { property: "og:url", content: `${SITE_ORIGIN}/architecture/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-domain" },
    { name: "x-has-math", content: "false" },
  ],
};
