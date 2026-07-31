import { component$, useContext } from "@builder.io/qwik";
import { Icon } from "../icon/icon";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { ICON_HOME } from "../../lib/icons";

interface BreadcrumbItem {
  href: string;
  labelKey: string;
  icon: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  current: string;
}

export const Breadcrumbs = component$<BreadcrumbsProps>(({ items, current }) => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);
  return (
    <nav class="breadcrumbs" aria-label={t("accessibility.breadcrumbs")}>
      <ol class="breadcrumb-list">
        <li>
          <a href="/">
            <Icon paths={ICON_HOME} class="breadcrumb-icon" />
            <span class="icon-label">{t("nav.home")}</span>
          </a>
        </li>
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href}>
              <Icon paths={item.icon} class="breadcrumb-icon" />
              <span class="icon-label">{t(item.labelKey)}</span>
            </a>
          </li>
        ))}
        <li>
          <span aria-current="page">{current}</span>
        </li>
      </ol>
    </nav>
  );
});
