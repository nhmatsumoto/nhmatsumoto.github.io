import { component$, useContext } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getAllProjects } from "../../lib/content/projects";
import { ProjectCard } from "../../components/project-card/project-card";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { SITE_ORIGIN } from "../../lib/site-config";

export const useProjects = routeLoader$(() => getAllProjects());

export default component$(() => {
  const projects = useProjects();
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <div class="layout-container">
      <header class="page-header">
        <h1>{t("pages.projects.title")}</h1>
        <p class="section-copy">{t("pages.projects.description")}</p>
      </header>

      <ol class="entry-list">
        {projects.value.map((project) => (
          <ProjectCard project={project} key={project.slug} />
        ))}
      </ol>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Projetos | nhmatsumoto.github.io",
  meta: [
    {
      name: "description",
      content:
        "Projetos apresentados como sistemas: problema, solução, arquitetura, stack, ADRs e roadmap.",
    },
    { property: "og:url", content: `${SITE_ORIGIN}/projects/` },
    { property: "og:type", content: "website" },
    { name: "x-body-class", content: "page-projects" },
    { name: "x-has-math", content: "false" },
  ],
};
