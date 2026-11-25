import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { DomainPage } from "../../components/domain-page/domain-page";
import { getPostsByDomain } from "../../lib/content/posts";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export const useDataPosts = routeLoader$(() => getPostsByDomain("data"));

export default component$(() => {
  const posts = useDataPosts();
  return <DomainPage domain="data" posts={posts.value} />;
});

export const head: DocumentHead = {
  title: `Dados | ${SITE_NAME}`,
  meta: [
    {
      name: "description",
      content:
        "Referências de SQL, SQL Server, MySQL, MariaDB, MongoDB e Dapper.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/data/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-domain" },
    { name: "x-has-math", content: "false" },
  ],
};
