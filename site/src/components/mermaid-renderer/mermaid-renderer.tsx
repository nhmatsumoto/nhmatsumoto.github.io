import { component$, useContext, useVisibleTask$ } from "@builder.io/qwik";
import { ThemeContext } from "../../lib/theme/context";

/**
 * Mounted once (in the root layout), mirrors legacy blog.js: scan the whole
 * document for `.mermaid` nodes and only load the mermaid library if any
 * exist. Re-runs on theme change (tracked signal) — mermaid marks processed
 * nodes with `data-processed`, so re-rendering after a toggle means restoring
 * each node's original source text first, or `mermaid.run()` silently skips it.
 */
export const MermaidRenderer = component$(() => {
  const themeSignal = useContext(ThemeContext);

  useVisibleTask$(async ({ track }) => {
    const theme = track(() => themeSignal.value);
    const diagrams = document.querySelectorAll<HTMLElement>(".mermaid");
    if (diagrams.length === 0) return;

    const { default: mermaid } = await import("mermaid");
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "neutral",
    });

    for (const el of diagrams) {
      const original = el.getAttribute("data-mermaid-source") ?? el.textContent ?? "";
      el.setAttribute("data-mermaid-source", original);
      el.removeAttribute("data-processed");
      el.innerHTML = original;
    }

    await mermaid.run({ nodes: Array.from(diagrams) });
  }, { strategy: "document-ready" });
  // Explicit strategy: this component renders no DOM element of its own
  // (see below), so the default intersection-observer strategy would have
  // nothing to observe. document-ready also matches the legacy blog.js
  // behavior more closely (runs once the page is interactive, not on scroll).

  return null;
});
