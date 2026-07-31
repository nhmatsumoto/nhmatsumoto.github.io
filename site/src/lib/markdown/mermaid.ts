// Escapes &, < and > so the raw Mermaid source survives as literal text
// inside the rendered HTML — mermaid.js (client-side) reads this div's
// textContent verbatim, so `-->` and `<br/>` must round-trip as those exact
// characters rather than being parsed as HTML by the browser first. This is
// the same escaping the legacy site required hand-authoring; here it's
// derived automatically from a real ```mermaid fenced code block.
function escapeForTextNode(source: string): string {
  return source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function mermaidToShellHtml(source: string): string {
  const escaped = escapeForTextNode(source);
  return `<div class="diagram-shell mermaid-shell" data-language="mermaid">  <div class="diagram-shell-header"><span class="diagram-shell-label">Mermaid</span></div>  <div class="diagram-shell-content"><div class="mermaid">${escaped}</div></div></div>`;
}
