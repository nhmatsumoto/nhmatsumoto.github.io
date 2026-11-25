import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { DomainPage } from "../../components/domain-page/domain-page";
import { getPostsByDomain } from "../../lib/content/posts";
import { SITE_NAME, SITE_ORIGIN } from "../../lib/site-config";

export const useDotnetPosts = routeLoader$(() => getPostsByDomain("dotnet"));

export default component$(() => {
  const posts = useDotnetPosts();
  return <DomainPage domain="dotnet" posts={posts.value} />;
});

export const head: DocumentHead = {
  title: `.NET e C# | ${SITE_NAME}`,
  meta: [
    {
      name: "description",
      content: "Referências de .NET, C#, Dapper e FluentValidation.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/dotnet/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-domain" },
    { name: "x-has-math", content: "false" },
  ],
};
