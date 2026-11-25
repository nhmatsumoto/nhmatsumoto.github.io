import { component$, useContext } from "@builder.io/qwik";
import { PostCard } from "../post-card/post-card";
import { Icon } from "../icon/icon";
import { KNOWLEDGE_DOMAINS, type KnowledgeDomain } from "../../lib/content/knowledge";
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

      <section class="domain-page-collection">
        <header class="domain-collection-header">
          <div>
            <p class="section-kicker">{t("home.collection_kicker")}</p>
            <h2>{t("domain.collection_title")}</h2>
          </div>
          <span class="domain-collection-count">{String(posts.length).padStart(2, "0")}</span>
        </header>
        {posts.length > 0 ? (
          <ol class="entry-list">
            {posts.map((post) => (
              <PostCard post={post} key={post.slug} />
            ))}
          </ol>
        ) : (
          <div class="collection-empty-state domain-empty-state">
            <span class="collection-empty-mark" aria-hidden="true">∅</span>
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
