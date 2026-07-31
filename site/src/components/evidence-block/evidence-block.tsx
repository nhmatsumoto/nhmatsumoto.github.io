import { component$, useContext } from "@builder.io/qwik";
import { Icon } from "../icon/icon";
import { ICON_LIGHTBULB, ICON_SCALE } from "../../lib/icons";
import { LocaleContext } from "../../lib/i18n/context";
import { translate } from "../../lib/i18n/translate";

interface EvidenceBlockProps {
  tradeoffs?: string[];
  lessons?: string[];
}

export const EvidenceBlock = component$<EvidenceBlockProps>(({ tradeoffs, lessons }) => {
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <>
      {tradeoffs && tradeoffs.length > 0 && (
        <section class="evidence-section">
          <h2 class="evidence-title">{t("pages.project.trade_offs")}</h2>
          <ul class="tradeoff-list">
            {tradeoffs.map((item) => (
              <li class="tradeoff-item" key={item}>
                <Icon paths={ICON_SCALE} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {lessons && lessons.length > 0 && (
        <section class="evidence-section">
          <h2 class="evidence-title">{t("pages.project.lessons")}</h2>
          <ul class="lesson-list">
            {lessons.map((item) => (
              <li class="lesson-item" key={item}>
                <Icon paths={ICON_LIGHTBULB} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
});
