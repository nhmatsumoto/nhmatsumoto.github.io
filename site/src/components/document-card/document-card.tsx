import { component$, useContext } from "@builder.io/qwik";
import { Icon } from "../icon/icon";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import {
  ICON_ARROW_RIGHT,
  ICON_FILE_TEXT,
} from "../../lib/icons";
import type { DocumentEntry } from "../../lib/content/schema";

interface DocumentCardProps {
  doc: DocumentEntry;
}

export const DocumentCard = component$<DocumentCardProps>(({ doc }) => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <li class="entry">
      <article class="entry-card entry-card-document document-item">
        <p class="entry-eyebrow document-meta">
          <span class="entry-kind">
            <Icon paths={ICON_FILE_TEXT} class="entry-icon" />
            <span class="icon-label">{t(`document.kind.${doc.frontmatter.kind}`)}</span>
          </span>
          <span class="entry-eyebrow-dot" aria-hidden="true">·</span>
          <span class="entry-meta">{t(`domain.${doc.frontmatter.domain}.title`)}</span>
          <span class="entry-eyebrow-dot" aria-hidden="true">·</span>
          <span class="entry-status entry-status-published">
            {t(`document.visibility.${doc.frontmatter.visibility}`)}
          </span>
        </p>
        <h3 class="entry-title document-title">
          <a href={`/documents/${doc.slug}/`}>{doc.frontmatter.title}</a>
        </h3>
        <p class="entry-lede document-description">{doc.frontmatter.description}</p>
        <a class="entry-cta" href={`/documents/${doc.slug}/`}>
          <span class="icon-label">{t("actions.open_docs")}</span>
          <Icon paths={ICON_ARROW_RIGHT} class="entry-cta-arrow" />
        </a>
      </article>
    </li>
  );
});
