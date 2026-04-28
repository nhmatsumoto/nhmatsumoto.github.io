from __future__ import annotations

import argparse
import json
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

from build_single_page import build_single_page  # noqa: E402
from content_db import (  # noqa: E402
    DEFAULT_DB_PATH,
    LANGUAGES,
    connect,
    database_summary,
    ensure_database,
    ensure_schema,
    get_content,
    import_sources,
    list_contents,
    list_sections,
    save_editor_payload,
)
from translation_service import consolidate_translations, export_translations  # noqa: E402


EDITOR_HTML = """<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Single Page Local Editor</title>
    <style>
      :root { color-scheme: dark; --bg: #10131a; --panel: #171c25; --line: #2a3342; --text: #eef3fb; --muted: #99a6ba; --accent: #34c6ff; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 system-ui, sans-serif; }
      button, input, textarea, select { font: inherit; color: inherit; }
      button { background: #202838; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; padding: 8px 10px; }
      button.primary { border-color: var(--accent); color: var(--accent); }
      button.danger { color: #ff8d8d; }
      input, textarea, select { background: #0d1118; border: 1px solid var(--line); border-radius: 6px; padding: 8px; width: 100%; }
      textarea { min-height: 180px; resize: vertical; }
      header { align-items: center; border-bottom: 1px solid var(--line); display: flex; gap: 16px; justify-content: space-between; padding: 16px 20px; }
      header h1 { font-size: 18px; margin: 0; }
      header p { color: var(--muted); margin: 2px 0 0; }
      .shell { display: grid; grid-template-columns: 320px 1fr; min-height: calc(100vh - 73px); }
      aside { border-right: 1px solid var(--line); overflow: auto; padding: 16px; }
      main { overflow: auto; padding: 16px; }
      .toolbar, .row { display: flex; flex-wrap: wrap; gap: 8px; }
      .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
      .section-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
      .section-tabs button[aria-current="true"] { border-color: var(--accent); color: var(--accent); }
      .list { display: grid; gap: 8px; list-style: none; margin: 0; padding: 0; }
      .list button { text-align: left; width: 100%; }
      .list small { color: var(--muted); display: block; }
      .form-grid { display: grid; gap: 12px; }
      .lang-grid { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .field span { color: var(--muted); display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; }
      .notice { color: var(--accent); min-height: 20px; }
      .missing { color: #ffd166; }
      .meta { color: var(--muted); font-size: 12px; }
      @media (max-width: 900px) { .shell { grid-template-columns: 1fr; } aside { border-right: 0; border-bottom: 1px solid var(--line); } .lang-grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>Single Page Local Editor</h1>
        <p>SQLite local -> traducoes -> dist/index.html</p>
      </div>
      <div class="toolbar">
        <button id="sync-source">Sincronizar fontes</button>
        <button id="export-json">Exportar traducoes</button>
        <button id="build-page" class="primary">Gerar HTML unico</button>
      </div>
    </header>
    <div class="shell">
      <aside>
        <div class="panel">
          <p id="db-summary" class="meta">Carregando banco...</p>
          <p id="missing-summary" class="missing"></p>
        </div>
        <div class="section-tabs" id="section-tabs"></div>
        <ul class="list" id="content-list"></ul>
      </aside>
      <main>
        <div class="panel">
          <div class="toolbar">
            <button id="save" class="primary">Salvar no SQLite</button>
          </div>
          <p class="notice" id="notice"></p>
          <div id="empty">Selecione um item para editar titulo, resumo e corpo por idioma.</div>
          <form id="editor" class="form-grid" hidden>
            <label class="field">
              <span>content_key</span>
              <input name="content_key" readonly>
            </label>
            <div class="row">
              <label class="field" style="flex:1">
                <span>section</span>
                <input name="section">
              </label>
              <label class="field" style="flex:1">
                <span>slug</span>
                <input name="slug">
              </label>
              <label class="field" style="flex:1">
                <span>source_type</span>
                <input name="source_type">
              </label>
            </div>
            <div class="lang-grid" id="lang-grid"></div>
          </form>
        </div>
      </main>
    </div>
    <script>
      const languages = ["pt-BR", "en", "ja"];
      let state = null;
      let current = null;
      let activeSection = "home";

      const $ = (selector) => document.querySelector(selector);
      const notice = (message) => { $("#notice").textContent = message; };

      async function request(url, options = {}) {
        const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Erro na requisicao");
        return payload;
      }

      function renderTabs() {
        const box = $("#section-tabs");
        box.innerHTML = "";
        for (const section of state.sections) {
          const button = document.createElement("button");
          button.textContent = section.id;
          button.type = "button";
          button.setAttribute("aria-current", section.id === activeSection);
          button.onclick = () => { activeSection = section.id; renderTabs(); renderList(); };
          box.appendChild(button);
        }
      }

      function missingCount(key) {
        return state.missing.filter((item) => item.content_key === key).length;
      }

      function renderList() {
        const list = $("#content-list");
        const items = state.contents.filter((item) => item.section === activeSection);
        list.innerHTML = "";
        for (const item of items) {
          const li = document.createElement("li");
          const button = document.createElement("button");
          button.type = "button";
          button.innerHTML = `<strong>${item.title || item.content_key}</strong><small>${item.content_key} ${missingCount(item.content_key) ? " · faltam traducoes" : ""}</small>`;
          button.onclick = () => loadContent(item.content_key);
          li.appendChild(button);
          list.appendChild(li);
        }
      }

      function renderEditor() {
        $("#empty").hidden = true;
        $("#editor").hidden = false;
        $("#editor").content_key.value = current.content_key;
        $("#editor").section.value = current.section;
        $("#editor").slug.value = current.slug || "";
        $("#editor").source_type.value = current.source_type || "";
        const grid = $("#lang-grid");
        grid.innerHTML = "";
        for (const language of languages) {
          const data = current.translations[language] || {};
          const div = document.createElement("section");
          div.className = "panel";
          div.dataset.language = language;
          div.innerHTML = `
            <h2>${language}</h2>
            <label class="field"><span>Titulo</span><input name="title" value=""></label>
            <label class="field"><span>Resumo</span><textarea name="summary" rows="4"></textarea></label>
            <label class="field"><span>Corpo Markdown</span><textarea name="body" rows="14"></textarea></label>
          `;
          div.querySelector('[name="title"]').value = data.title || "";
          div.querySelector('[name="summary"]').value = data.summary || "";
          div.querySelector('[name="body"]').value = data.body || "";
          grid.appendChild(div);
        }
      }

      async function loadContent(key) {
        current = await request(`/api/content?key=${encodeURIComponent(key)}`);
        renderEditor();
        notice(`Editando ${key}`);
      }

      async function loadState() {
        state = await request("/api/state");
        $("#db-summary").textContent = `${state.summary.contents} conteudos · ${state.summary.translations} traducoes · ${state.summary.path}`;
        $("#missing-summary").textContent = state.missing.length ? `${state.missing.length} campos sem traducao propria` : "Sem pendencias de traducao.";
        renderTabs();
        renderList();
      }

      function collectPayload() {
        const form = $("#editor");
        const translations = {};
        for (const section of document.querySelectorAll("[data-language]")) {
          const language = section.dataset.language;
          translations[language] = {
            title: section.querySelector('[name="title"]').value,
            summary: section.querySelector('[name="summary"]').value,
            body: section.querySelector('[name="body"]').value,
          };
        }
        return {
          content_key: form.content_key.value,
          section: form.section.value,
          slug: form.slug.value,
          source_type: form.source_type.value,
          source_path: current.source_path || "",
          metadata: current.metadata || {},
          translations,
        };
      }

      $("#save").onclick = async () => {
        if (!current) return;
        current = await request("/api/save", { method: "POST", body: JSON.stringify(collectPayload()) });
        notice("Salvo no SQLite.");
        await loadState();
      };

      $("#sync-source").onclick = async () => {
        const result = await request("/api/import", { method: "POST", body: JSON.stringify({ overwrite: true }) });
        notice(`Fontes sincronizadas: ${result.import.contents} conteudos, ${result.import.translations} traducoes.`);
        await loadState();
      };

      $("#export-json").onclick = async () => {
        const result = await request("/api/export", { method: "POST", body: "{}" });
        notice(`Exportado: ${result.path}`);
      };

      $("#build-page").onclick = async () => {
        const result = await request("/api/build", { method: "POST", body: "{}" });
        notice(`Gerado: ${result.output}`);
      };

      loadState().catch((error) => notice(error.message));
    </script>
  </body>
</html>
"""


class LocalEditorHandler(BaseHTTPRequestHandler):
    server_version = "SinglePageLocalEditor/1.0"
    db_path: Path = DEFAULT_DB_PATH

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path in {"/", "/editor", "/editor/"}:
            self.send_html(EDITOR_HTML)
            return

        if parsed.path == "/api/state":
            self.handle_state()
            return

        if parsed.path == "/api/content":
            key = parse_qs(parsed.query).get("key", [""])[0]
            with connect(self.db_path) as conn:
                ensure_schema(conn)
                item = get_content(conn, key)
            if not item:
                self.send_error_json(HTTPStatus.NOT_FOUND, "Content not found.")
                return
            self.send_json(item)
            return

        if parsed.path == "/api/translations":
            self.send_json(consolidate_translations(self.db_path))
            return

        self.send_error_json(HTTPStatus.NOT_FOUND, "Route not found.")

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        try:
            payload = self.read_json()

            if parsed.path == "/api/save":
                with connect(self.db_path) as conn:
                    ensure_schema(conn)
                    saved = save_editor_payload(conn, payload)
                self.send_json(saved)
                return

            if parsed.path == "/api/import":
                overwrite = bool(payload.get("overwrite", False))
                with connect(self.db_path) as conn:
                    result = import_sources(conn, overwrite=overwrite)
                self.send_json({"import": result})
                return

            if parsed.path == "/api/export":
                self.send_json(export_translations(db_path=self.db_path))
                return

            if parsed.path == "/api/build":
                self.send_json(build_single_page(db_path=self.db_path))
                return

            self.send_error_json(HTTPStatus.NOT_FOUND, "Route not found.")
        except Exception as error:  # noqa: BLE001
            self.send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(error))

    def handle_state(self) -> None:
        with connect(self.db_path) as conn:
            ensure_schema(conn)
            missing = consolidate_translations(self.db_path).get("missing", [])
            self.send_json(
                {
                    "sections": list_sections(conn),
                    "contents": list_contents(conn),
                    "languages": list(LANGUAGES),
                    "missing": missing,
                    "summary": database_summary(conn) | {"path": str(self.db_path)},
                }
            )

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        data = json.loads(raw or "{}")
        if not isinstance(data, dict):
            raise ValueError("JSON body must be an object.")
        return data

    def send_html(self, text: str) -> None:
        body = text.encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status: HTTPStatus, message: str) -> None:
        self.send_json({"error": message}, status=status)


def main() -> None:
    parser = argparse.ArgumentParser(description="Local editor for the single-page SQLite translation flow.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4174)
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH))
    args = parser.parse_args()

    db_path = ensure_database(args.db)
    LocalEditorHandler.db_path = db_path
    server = ThreadingHTTPServer((args.host, args.port), LocalEditorHandler)
    print(f"Editor local: http://{args.host}:{args.port}/")
    print(f"SQLite: {db_path}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
