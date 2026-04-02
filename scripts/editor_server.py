from __future__ import annotations

import argparse
import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from blog_engine import (
    build_site,
    default_locale,
    git_status,
    load_i18n,
    load_posts,
    load_site,
    normalise_post,
    post_to_api,
    publish_changes,
    render_post_preview,
    save_post,
    save_site,
)

ROOT = Path(__file__).resolve().parents[1]
EDITOR_DIR = ROOT / "editor"


class EditorRequestHandler(BaseHTTPRequestHandler):
    server_version = "LocalBlogEditor/0.1"

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        if parsed.path in {"/", "/editor", "/editor/"}:
            self.serve_file(EDITOR_DIR / "index.html")
            return

        if parsed.path.startswith("/editor/"):
            relative_path = parsed.path.removeprefix("/editor/")
            self.serve_file((EDITOR_DIR / relative_path).resolve())
            return

        if parsed.path == "/api/state":
            self.send_json(
                {
                    "site": load_site(),
                    "posts": [post_to_api(post) for post in load_posts(include_drafts=True)],
                    "git": git_status(),
                }
            )
            return

        if parsed.path == "/api/post":
            post_id = parse_qs(parsed.query).get("id", [""])[0].strip()
            post = next((item for item in load_posts(include_drafts=True) if item["id"] == post_id), None)
            if not post:
                self.send_error_json(HTTPStatus.NOT_FOUND, "Post não encontrado.")
                return
            self.send_json(post_to_api(post))
            return

        if parsed.path == "/api/git/status":
            self.send_json(git_status())
            return

        self.send_error_json(HTTPStatus.NOT_FOUND, "Rota não encontrada.")

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        try:
            payload = self.read_json_body()

            if parsed.path == "/api/site/save":
                self.send_json({"site": save_site(payload)})
                return

            if parsed.path == "/api/post/save":
                saved = save_post(payload)
                self.send_json(
                    {
                        "post": post_to_api(saved),
                        "posts": [post_to_api(post) for post in load_posts(include_drafts=True)],
                    }
                )
                return

            if parsed.path == "/api/post/preview":
                preview_post = normalise_post(payload)
                site = load_site()
                i18n = load_i18n()
                self.send_json({"html": render_post_preview(preview_post, i18n, default_locale(site, i18n))})
                return

            if parsed.path == "/api/build":
                self.send_json({"build": build_site(), "git": git_status()})
                return

            if parsed.path == "/api/publish":
                message = str(payload.get("message", "") or "")
                push = bool(payload.get("push", False))
                self.send_json({"publish": publish_changes(message=message, push=push), "git": git_status()})
                return

            self.send_error_json(HTTPStatus.NOT_FOUND, "Rota não encontrada.")
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
        except RuntimeError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
        except Exception as error:  # noqa: BLE001
            self.send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, f"Erro interno: {error}")

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0") or 0)
        raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"
        try:
            data = json.loads(raw_body or "{}")
        except json.JSONDecodeError as error:
            raise ValueError("Corpo JSON inválido.") from error

        if not isinstance(data, dict):
            raise ValueError("O corpo da requisição deve ser um objeto JSON.")
        return data

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status: HTTPStatus, message: str) -> None:
        self.send_json({"error": message}, status=status)

    def serve_file(self, path: Path) -> None:
        try:
            resolved = path.resolve()
        except FileNotFoundError:
            self.send_error_json(HTTPStatus.NOT_FOUND, "Arquivo não encontrado.")
            return

        if not str(resolved).startswith(str(EDITOR_DIR.resolve())):
            self.send_error_json(HTTPStatus.FORBIDDEN, "Acesso negado.")
            return

        if not resolved.exists() or not resolved.is_file():
            self.send_error_json(HTTPStatus.NOT_FOUND, "Arquivo não encontrado.")
            return

        mime_type = mimetypes.guess_type(resolved.name)[0] or "application/octet-stream"
        content = resolved.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{mime_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)


def main() -> None:
    parser = argparse.ArgumentParser(description="Editor localhost do blog.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), EditorRequestHandler)
    print(f"Editor disponível em http://{args.host}:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
