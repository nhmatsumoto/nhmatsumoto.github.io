import { component$, useContext } from "@builder.io/qwik";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";

interface CollectionEmptyStateProps {
  titleKey?: string;
  descriptionKey?: string;
  href?: string;
  linkKey?: string;
}

export const CollectionEmptyState = component$<CollectionEmptyStateProps>(
  ({
    titleKey = "collection.empty_title",
    descriptionKey = "collection.empty_description",
    href,
    linkKey = "home.view_method",
  }) => {
    const localeSignal = useContext(LocaleContext);
    const t = (key: string) => translate(key, localeSignal.value);

    return (
      <div class="collection-empty-state">
        <span class="collection-empty-mark" aria-hidden="true">∅</span>
        <div>
          <h3>{t(titleKey)}</h3>
          <p>{t(descriptionKey)}</p>
          {href && (
            <a class="systems-inline-link" href={href}>
              {t(linkKey)}
              <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>
    );
  },
);
