import { component$, useContext } from "@builder.io/qwik";
import { Icon } from "../icon/icon";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";
import { ICON_ARROW_UP_RIGHT, ICON_GIT_BRANCH, ICON_SQUARE_TERMINAL } from "../../lib/icons";

export const Footer = component$(() => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <footer class="site-footer">
      <div class="layout-container site-footer-inner">
        <p>
          <span>{t("footer.developed_by")}</span>{" "}
          <a
            href="https://github.com/nhmatsumoto"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon paths={ICON_GIT_BRANCH} class="footer-icon" />
            <span>NHMatsumoto</span>
            <Icon paths={ICON_ARROW_UP_RIGHT} class="external-icon" />
          </a>
          <span class="footer-separator" aria-hidden="true">
            |
          </span>
          <a
            href="https://github.com/nhmatsumoto/nhmatsumoto.github.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon paths={ICON_SQUARE_TERMINAL} class="footer-icon" />
            <span>{t("footer.blog_engine")}</span>
            <Icon paths={ICON_ARROW_UP_RIGHT} class="external-icon" />
          </a>
        </p>
      </div>
    </footer>
  );
});
