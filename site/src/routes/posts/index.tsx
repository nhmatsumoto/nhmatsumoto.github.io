import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getAllPosts, POSTS_PER_PAGE, getPostPageCount } from "../../lib/content/posts";
import { PostListing } from "../../components/post-listing/post-listing";
import { SITE_ORIGIN } from "../../lib/site-config";

export const usePosts = routeLoader$(async () => {
  const posts = await getAllPosts();
  return {
    posts: posts.slice(0, POSTS_PER_PAGE),
    pageCount: getPostPageCount(),
  };
});

export default component$(() => {
  const data = usePosts();
  return (
    <PostListing posts={data.value.posts} currentPage={1} pageCount={data.value.pageCount} />
  );
});

export const head: DocumentHead = {
  title: "Publicações | nhmatsumoto.github.io",
  meta: [
    {
      name: "description",
      content:
        "Fluxo de escrita sobre arquitetura, experimentos, modelagem de domínio e heurísticas operacionais.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/posts/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-archive" },
    { name: "x-has-math", content: "false" },
  ],
};
