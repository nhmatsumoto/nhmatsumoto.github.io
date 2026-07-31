import { component$, useVisibleTask$ } from "@builder.io/qwik";

const FEEDBACK_MS = 2000;

/**
 * Mounted once (root layout). Delegated click listener for every
 * `.code-shell-copy` button on the page — the code-shell markup is static
 * HTML (from Shiki at build time), so there's no per-button Qwik component
 * to attach a handler to individually.
 */
export const CodeCopyHandler = component$(() => {
  useVisibleTask$(() => {
    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        ".code-shell-copy",
      );
      if (!button) return;

      const shell = button.closest(".code-shell");
      const codeEl = shell?.querySelector("pre code");
      const text = codeEl?.textContent ?? "";
      if (!text) return;

      navigator.clipboard.writeText(text).then(() => {
        button.classList.add("is-copied");
        setTimeout(() => button.classList.remove("is-copied"), FEEDBACK_MS);
      });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, { strategy: "document-ready" });

  return null;
});
