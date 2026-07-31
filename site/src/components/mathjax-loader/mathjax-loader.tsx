import { component$, useVisibleTask$ } from "@builder.io/qwik";

/**
 * Mounted once (root layout). Mirrors the legacy per-page conditional
 * MathJax script: only injects the CDN script + config when the page's
 * body has data-has-math="true" (set via the "x-has-math" head meta —
 * see root.tsx's AppBody), instead of loading it on every page.
 */
export const MathJaxLoader = component$(() => {
  useVisibleTask$(() => {
    if (document.body.getAttribute("data-has-math") !== "true") return;
    if (document.getElementById("MathJax-script")) return;

    (window as unknown as { MathJax: unknown }).MathJax = {
      tex: {
        inlineMath: [
          ["\\(", "\\)"],
          ["$", "$"],
        ],
        displayMath: [["$$", "$$"]],
      },
      asciimath: { delimiters: [["`", "`"]] },
      loader: { load: ["input/tex", "input/asciimath", "output/chtml"] },
    };

    const script = document.createElement("script");
    script.id = "MathJax-script";
    script.async = true;
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js";
    document.head.appendChild(script);
  }, { strategy: "document-ready" });

  return null;
});
