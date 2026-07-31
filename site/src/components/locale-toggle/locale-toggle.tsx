import { $, component$, useContext } from "@builder.io/qwik";
import { LocaleContext, LOCALE_STORAGE_KEY } from "../../lib/i18n/context";
import { LOCALES, SHORT_LABEL } from "../../lib/i18n/dictionary";
import { translate } from "../../lib/i18n/translate";
import { Icon } from "../icon/icon";
import { ICON_LANGUAGES } from "../../lib/icons";

interface LocaleToggleProps {
  class?: string;
}

export const LocaleToggle = component$<LocaleToggleProps>(({ class: className }) => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  const onToggle = $(() => {
    const currentIndex = LOCALES.indexOf(localeSignal.value);
    const next = LOCALES[(currentIndex + 1) % LOCALES.length];
    localeSignal.value = next;
    document.documentElement.setAttribute("lang", next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* localStorage unavailable — locale just won't persist */
    }
  });

  return (
    <button
      class={`nav-btn-icon nav-btn-locale ${className ?? ""}`}
      type="button"
      onClick$={onToggle}
      aria-label={t("nav.locale")}
    >
      <Icon paths={ICON_LANGUAGES} />
      <span class="nav-locale-code">{SHORT_LABEL[localeSignal.value]}</span>
    </button>
  );
});
