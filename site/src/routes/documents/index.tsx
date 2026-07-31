import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getAllDocuments } from "../../lib/content/documents";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { Icon } from "../../components/icon/icon";
import {
  ICON_ARROW_RIGHT,
  ICON_FILE_TEXT,
  ICON_FOLDER,
  ICON_GIT_BRANCH,
} from "../../lib/icons";
import { SITE_ORIGIN } from "../../lib/site-config";

export const useDocuments = routeLoader$(() => getAllDocuments());

export default component$(() => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);
  const documents = useDocuments();

  return (
    <div class="layout-container">
      <header class="page-header">
        <h1>{t("pages.documents.title")}</h1>
        <p class="section-copy">{t("pages.documents.description")}</p>
      </header>

      <ol class="entry-list">
        {documents.value.map((doc) => (
          <li class="entry" key={doc.slug}>
            <article class="entry-card entry-card-document document-item">
              <p class="entry-eyebrow document-meta">
                <span class="entry-kind">
                  <Icon paths={ICON_FILE_TEXT} class="entry-icon" />
                  <span class="icon-label">{t("kinds.document")}</span>
                </span>
                <span class="entry-eyebrow-dot" aria-hidden="true">
                  ·
                </span>
                <span class="entry-meta">
                  <Icon paths={ICON_FOLDER} class="entry-icon" />
                  {doc.frontmatter.category}
                </span>
                <span class="entry-eyebrow-dot" aria-hidden="true">
                  ·
                </span>
                <span class="entry-meta entry-version">
                  <Icon paths={ICON_GIT_BRANCH} class="entry-icon" />
                  {doc.frontmatter.version}
                </span>
              </p>
              <h3 class="entry-title document-title">
                <a href={`/documents/${doc.slug}/`}>{doc.frontmatter.title}</a>
              </h3>
              <p class="entry-lede document-description">
                {doc.frontmatter.description}
              </p>
              <a class="entry-cta" href={`/documents/${doc.slug}/`}>
                <span class="icon-label">{t("actions.open_docs")}</span>
                <Icon paths={ICON_ARROW_RIGHT} class="entry-cta-arrow" />
              </a>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Documentos | nhmatsumoto.github.io",
  meta: [
    {
      name: "description",
      content:
        "Documentos agrupados por domínio, arquitetura, agentes e APIs para manter decisões acessíveis.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/documents/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-documents" },
    { name: "x-has-math", content: "false" },
  ],
};
