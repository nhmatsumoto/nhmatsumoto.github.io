import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { DomainPage } from "../../components/domain-page/domain-page";
import { getPostsByDomain } from "../../lib/content/posts";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export const useInfrastructurePosts = routeLoader$(() => getPostsByDomain("infrastructure"));

export default component$(() => {
  const posts = useInfrastructurePosts();
  return <DomainPage domain="infrastructure" posts={posts.value} />;
});

export const head: DocumentHead = {
  title: `Infraestrutura | ${SITE_NAME}`,
  meta: [
    { name: "description", content: "Entrega, nuvem, observabilidade, confiabilidade e custo." },
    { property: "og:url", content: `${SITE_ORIGIN}/infrastructure/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-domain" },
    { name: "x-has-math", content: "false" },
  ],
};
