import { component$, Slot, useContext, useSignal } from "@builder.io/qwik";
import { Navbar } from "../components/site-shell/navbar";
import { MobileDrawer } from "../components/site-shell/mobile-drawer";
import { Footer } from "../components/site-shell/footer";
import { MermaidRenderer } from "../components/mermaid-renderer/mermaid-renderer";
import { CodeCopyHandler } from "../components/code-copy-handler/code-copy-handler";
import { LocaleContext } from "../lib/i18n/context";
import { translate } from "../lib/i18n/translate";

export default component$(() => {
  const drawerOpen = useSignal(false);
  const localeSignal = useContext(LocaleContext);
  const t = (key: string) => translate(key, localeSignal.value);

  return (
    <>
      <a class="skip-link" href="#content">
        {t("accessibility.skip_to_content")}
      </a>

      <div class="site-shell">
        <Navbar drawerOpen={drawerOpen} />
        <MobileDrawer drawerOpen={drawerOpen} />

        <main class="site-main" id="content">
          <Slot />
        </main>

        <Footer />
      </div>

      <MermaidRenderer />
      <CodeCopyHandler />
    </>
  );
});
