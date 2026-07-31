import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getAllDocuments } from "../../lib/content/documents";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { DocumentCard } from "../../components/document-card/document-card";
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
          <DocumentCard doc={doc} key={doc.slug} />
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
