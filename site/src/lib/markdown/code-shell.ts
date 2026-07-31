import { codeToHtml } from "shiki";

const LANGUAGE_LABELS: Record<string, string> = {
  csharp: "C#",
  cs: "C#",
  typescript: "TypeScript",
  ts: "TypeScript",
  tsx: "TSX",
  javascript: "JavaScript",
  js: "JavaScript",
  jsx: "JSX",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  bash: "Bash",
  shell: "Shell",
  sh: "Shell",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  text: "TEXT",
  plaintext: "TEXT",
};

function languageLabel(lang: string): string {
  return LANGUAGE_LABELS[lang.toLowerCase()] ?? lang.toUpperCase();
}

// Copy-icon SVG copied verbatim from the legacy site's code-shell markup.
const COPY_ICON = `<svg class="lucide lucide-copy copy-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>`;

export async function codeToShellHtml(code: string, rawLang: string | null): Promise<string> {
  const lang = rawLang || "text";
  const highlighted = await codeToHtml(code, {
    lang: isKnownLang(lang) ? lang : "text",
    theme: "github-dark",
  });
  const label = languageLabel(lang);

  return `<div class="code-shell" data-language="${lang}">  <div class="code-shell-header">    <div class="code-shell-controls"><span class="control-dot close"></span><span class="control-dot minimize"></span><span class="control-dot maximize"></span></div>    <div class="code-shell-title"><span class="code-shell-label">${label}</span></div>    <button class="code-shell-copy" type="button" aria-label="Copy code">${COPY_ICON}<span class="copy-feedback">Copiado!</span></button>  </div>  <div class="code-shell-content">${highlighted}</div></div>`;
}

// Shiki throws on unknown languages instead of silently falling back — check
// against its bundled language list first so odd/typo'd fence languages in
// content degrade to plain text instead of failing the whole build.
import { bundledLanguages } from "shiki";

function isKnownLang(lang: string): boolean {
  return lang.toLowerCase() in bundledLanguages;
}
