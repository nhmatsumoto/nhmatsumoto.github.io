import { component$, useContext } from "@builder.io/qwik";
import { PostCard } from "../post-card/post-card";
import { Icon } from "../icon/icon";
import {
  KNOWLEDGE_DOMAINS,
  KNOWLEDGE_HUBS,
  topicSlug,
  type KnowledgeDomain,
} from "../../lib/content/knowledge";
import type { PostEntry } from "../../lib/content/schema";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";

interface DomainPageProps {
  domain: KnowledgeDomain;
  posts: PostEntry[];
}

export const DomainPage = component$<DomainPageProps>(({ domain, posts }) => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);
  const domainInfo = KNOWLEDGE_DOMAINS.find((item) => item.slug === domain)!;
  const hub = KNOWLEDGE_HUBS[domain];

  return (
    <div class="layout-container domain-page">
      <header class="page-header domain-page-header">
        <div class="domain-page-mark">
          <Icon paths={domainInfo.icon} />
          <span>DOMAIN / {domain.toUpperCase()}</span>
        </div>
        <h1>{t(domainInfo.titleKey)}</h1>
        <p class="domain-page-description">{t(domainInfo.descriptionKey)}</p>
      </header>

      <section class="reference-hub-map" aria-label={t("hub.map_title")}>
        <header class="systems-section-header">
          <p class="section-kicker systems-kicker">{t("hub.map_kicker")}</p>
          <h2>{t("hub.map_title")}</h2>
        </header>
        <div class="reference-hub-grid">
          {hub.groups.map((group) => (
            <article class="reference-hub-card" key={group.titleKey}>
              <h3>{t(group.titleKey)}</h3>
              {"ordered" in group && group.ordered ? (
                <ol class="reference-topic-list reference-topic-list-ordered">
                  {group.topics.map((topic) => (
                    <li id={`topic-${topicSlug(topic)}`} key={topic}>
                      {topic}
                    </li>
                  ))}
                </ol>
              ) : (
                <ul class="reference-topic-list">
                  {group.topics.map((topic) => (
                    <li id={`topic-${topicSlug(topic)}`} key={topic}>
                      {topic}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
          {"related" in hub &&
            hub.related.map((related) => (
              <a
                class="reference-hub-card reference-related-card"
                href={related.href}
                key={related.href}
              >
                <span>{t("hub.related_kicker")}</span>
                <h3>{t(related.titleKey)}</h3>
              </a>
            ))}
        </div>
      </section>

      <section class="domain-page-collection">
        <header class="domain-collection-header">
          <div>
            <p class="section-kicker">{t("home.collection_kicker")}</p>
            <h2>{t("domain.collection_title")}</h2>
          </div>
          <span class="domain-collection-count">
            {String(posts.length).padStart(2, "0")}
          </span>
        </header>
        {posts.length > 0 ? (
          <ol class="entry-list">
            {posts.map((post) => (
              <PostCard post={post} key={post.slug} />
            ))}
          </ol>
        ) : (
          <div class="collection-empty-state domain-empty-state">
            <span class="collection-empty-mark" aria-hidden="true">
              ∅
            </span>
            <div>
              <h3>{t("domain.empty_title")}</h3>
              <p>{t("domain.empty_description")}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
});
