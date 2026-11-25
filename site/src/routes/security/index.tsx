import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { DomainPage } from "../../components/domain-page/domain-page";
import { getPostsByDomain } from "../../lib/content/posts";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export const useSecurityPosts = routeLoader$(() => getPostsByDomain("security"));

export default component$(() => {
  const posts = useSecurityPosts();
  return <DomainPage domain="security" posts={posts.value} />;
});

export const head: DocumentHead = {
  title: `Segurança | ${SITE_NAME}`,
  meta: [
    { name: "description", content: "Modelagem de ameaças, identidade, proteção e resposta." },
    { property: "og:url", content: `${SITE_ORIGIN}/security/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-domain" },
    { name: "x-has-math", content: "false" },
  ],
};
