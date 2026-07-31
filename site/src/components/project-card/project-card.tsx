import { component$, useContext } from "@builder.io/qwik";
import { Icon } from "../icon/icon";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import {
  ICON_ARROW_RIGHT,
  ICON_ARROW_UP_RIGHT,
  ICON_CODE_2,
  ICON_FOLDER_KANBAN,
} from "../../lib/icons";
import type { ProjectEntry } from "../../lib/content/schema";

interface ProjectCardProps {
  project: ProjectEntry;
}

export const ProjectCard = component$<ProjectCardProps>(({ project }) => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <li class="entry">
      <article class="entry-card entry-card-project">
        <p class="entry-eyebrow">
          <span class="entry-kind">
            <Icon paths={ICON_FOLDER_KANBAN} class="entry-icon" />
            <span class="icon-label">{t("kinds.project")}</span>
          </span>
          <span class="entry-eyebrow-dot" aria-hidden="true">
            ·
          </span>
          <span class="entry-status entry-status-published">
            {project.frontmatter.status}
          </span>
        </p>
        <h3 class="entry-title">
          <a href={`/projects/${project.slug}/`}>{project.frontmatter.title}</a>
        </h3>
        <p class="entry-lede">{project.frontmatter.description}</p>
        <div class="stack-list">
          {project.frontmatter.stack.map((item) => (
            <span class="stack-chip" key={item}>
              {item}
            </span>
          ))}
        </div>
        <a class="entry-cta" href={`/projects/${project.slug}/`}>
          <span class="icon-label">{t("actions.view_project")}</span>
          <Icon paths={ICON_ARROW_RIGHT} class="entry-cta-arrow" />
        </a>
        {project.frontmatter.repoUrl && (
          <div class="entry-card-links">
            <a
              class="entry-card-link"
              href={project.frontmatter.repoUrl}
              target="_blank"
              rel="noopener"
            >
              <Icon paths={ICON_CODE_2} class="entry-icon" />
              <span>{t("actions.code")}</span>
              <Icon paths={ICON_ARROW_UP_RIGHT} class="external-icon" />
            </a>
          </div>
        )}
      </article>
    </li>
  );
});
