import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  type DocumentHead,
  type StaticGenerateHandler,
} from "@builder.io/qwik-city";
import { getAllPosts, POSTS_PER_PAGE, getPostPageCount } from "../../../../lib/content/posts";
import { PostListing } from "../../../../components/post-listing/post-listing";
import { SITE_ORIGIN } from "../../../../lib/site-config";

export const usePosts = routeLoader$(async ({ params, status }) => {
  const pageNum = Number(params.num);
  const pageCount = getPostPageCount();
  if (!Number.isInteger(pageNum) || pageNum < 2 || pageNum > pageCount) {
    status(404);
    throw new Error(`Invalid posts page: ${params.num}`);
  }
  const posts = await getAllPosts();
  const start = (pageNum - 1) * POSTS_PER_PAGE;
  return {
    posts: posts.slice(start, start + POSTS_PER_PAGE),
    pageCount,
    pageNum,
  };
});

export const onStaticGenerate: StaticGenerateHandler = () => {
  const pageCount = getPostPageCount();
  const pages = [];
  for (let n = 2; n <= pageCount; n++) pages.push({ num: String(n) });
  return { params: pages };
};

export default component$(() => {
  const data = usePosts();
  return (
    <PostListing
      posts={data.value.posts}
      currentPage={data.value.pageNum}
      pageCount={data.value.pageCount}
    />
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePosts);
  return {
    title: `Publicações — página ${data.pageNum} | nhmatsumoto.github.io`,
    meta: [
      {
        name: "description",
        content:
          "Fluxo de escrita sobre arquitetura, experimentos, modelagem de domínio e heurísticas operacionais.",
      },
      { property: "og:url", content: `${SITE_ORIGIN}/posts/page/${data.pageNum}/` },
      { property: "og:type", content: "website" },
      { name: "x-body-class", content: "page-archive" },
      { name: "x-has-math", content: "false" },
    ],
  };
};
