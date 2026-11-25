import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { DomainPage } from "../../components/domain-page/domain-page";
import { AlgorithmsGuide } from "../../components/domain-page/algorithms-guide";
import { getPostsByDomain } from "../../lib/content/posts";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export const useAlgorithmsPosts = routeLoader$(() =>
  getPostsByDomain("algorithms"),
);

export default component$(() => {
  const posts = useAlgorithmsPosts();
  return <>
      <DomainPage domain="algorithms" posts={posts.value} />
      <div class="layout-container"><AlgorithmsGuide /></div>
    </>;
});

export const head: DocumentHead = {
  title: `Algoritmos e estruturas de dados | ${SITE_NAME}`,
  meta: [
    {
      name: "description",
      content:
        "Trilha de estudo sobre algoritmos, estruturas de dados, busca e grafos.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/algorithms/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-domain" },
    { name: "x-has-math", content: "false" },
  ],
};
