import { component$, useContext } from "@builder.io/qwik";
import { PostCard } from "../post-card/post-card";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import type { PostEntry } from "../../lib/content/schema";

interface PostListingProps {
  posts: PostEntry[];
  currentPage: number;
  pageCount: number;
}

export const PostListing = component$<PostListingProps>(
  ({ posts, currentPage, pageCount }) => {
    const localeSignal = useContext(LocaleContext);
    const t = (key: string) => translate(key, localeSignal.value);

    const prevHref = currentPage <= 2 ? "/posts/" : `/posts/page/${currentPage - 1}/`;
    const nextHref = `/posts/page/${currentPage + 1}/`;

    return (
      <div class="layout-container">
        <header class="page-header">
          <h1>{t("pages.archive.title")}</h1>
          <p class="section-copy">{t("pages.archive.description")}</p>
        </header>

        <ol class="entry-list">
          {posts.map((post) => (
            <PostCard post={post} key={post.slug} />
          ))}
        </ol>

        {pageCount > 1 && (
          <nav class="pagination" aria-label={t("accessibility.pagination")}>
            {currentPage > 1 && (
              <a class="pagination-link" href={prevHref}>
                {t("pagination.prev")}
              </a>
            )}
            {currentPage < pageCount && (
              <a class="pagination-link" href={nextHref}>
                {t("pagination.next")}
              </a>
            )}
          </nav>
        )}
      </div>
    );
  },
);
