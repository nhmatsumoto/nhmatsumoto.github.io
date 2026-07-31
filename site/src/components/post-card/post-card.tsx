import { component$, useContext } from "@builder.io/qwik";
import { Icon } from "../icon/icon";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { formatDateShort } from "../../lib/format-date";
import { ICON_ARROW_RIGHT, ICON_CALENDAR_DAYS, ICON_CLOCK_3, ICON_NEWSPAPER } from "../../lib/icons";
import type { PostEntry } from "../../lib/content/schema";

interface PostCardProps {
  post: PostEntry;
}

export const PostCard = component$<PostCardProps>(({ post }) => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);
  const dateText = formatDateShort(post.frontmatter.date, localeSignal.value);

  return (
    <li class="entry">
      <article class="entry-card entry-card-post">
        <p class="entry-eyebrow">
          <span class="entry-kind">
            <Icon paths={ICON_NEWSPAPER} class="entry-icon" />
            <span class="icon-label">{t("kinds.post")}</span>
          </span>
          <span class="entry-eyebrow-dot" aria-hidden="true">
            ·
          </span>
          <span class="entry-meta">
            <Icon paths={ICON_CALENDAR_DAYS} class="entry-icon" />
            <time dateTime={post.frontmatter.date}>{dateText}</time>
          </span>
          <span class="entry-eyebrow-dot" aria-hidden="true">
            ·
          </span>
          <span class="entry-meta">
            <Icon paths={ICON_CLOCK_3} class="entry-icon" />
            <span>{post.frontmatter.readingTime} min de leitura</span>
          </span>
        </p>
        <h3 class="entry-title">
          <a href={`/posts/${post.slug}/`}>{post.frontmatter.title}</a>
        </h3>
        <p class="entry-lede">{post.frontmatter.description}</p>
        <a class="entry-cta" href={`/posts/${post.slug}/`}>
          <span class="icon-label">{t("actions.read_article")}</span>
          <Icon paths={ICON_ARROW_RIGHT} class="entry-cta-arrow" />
        </a>
      </article>
    </li>
  );
});
