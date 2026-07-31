import { $, component$, useContext } from "@builder.io/qwik";
import { ThemeContext, THEME_STORAGE_KEY } from "../../lib/theme/context";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { Icon } from "../icon/icon";
import { ICON_MOON, ICON_SUN } from "../../lib/icons";

interface ThemeToggleProps {
  class?: string;
}

export const ThemeToggle = component$<ThemeToggleProps>(({ class: className }) => {
  const themeSignal = useContext(ThemeContext);
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  const onToggle = $(() => {
    const next = themeSignal.value === "dark" ? "light" : "dark";
    themeSignal.value = next;
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* localStorage unavailable (private mode, etc.) — theme just won't persist */
    }
  });

  return (
    <button
      class={`nav-btn-icon nav-btn-theme ${className ?? ""}`}
      type="button"
      onClick$={onToggle}
      aria-label={t("nav.theme")}
    >
      <Icon
        paths={themeSignal.value === "dark" ? ICON_SUN : ICON_MOON}
        class={themeSignal.value === "dark" ? "theme-icon-sun" : "theme-icon-moon"}
      />
    </button>
  );
});
