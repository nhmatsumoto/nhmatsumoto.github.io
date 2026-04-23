from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import re
import tomllib
from binascii import Error as Base64Error
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from blog_engine import (
    build_site,
    database_status,
    delete_document,
    delete_post,
    delete_project,
    default_locale,
    document_to_api,
    export_database_posts_to_toml,
    git_status,
    import_toml_posts_to_database,
    load_blog_config,
    load_documents,
    load_i18n,
    load_posts,
    load_projects,
    load_site,
    normalise_document,
    normalise_post,
    normalise_project,
    post_to_api,
    project_to_api,
    publish_changes,
    render_document_preview,
    render_post_preview,
    render_project_preview,
    save_document,
    save_post,
    save_project,
    save_site,
)

ROOT = Path(__file__).resolve().parents[1]
EDITOR_DIR   = ROOT / "editor"
PROJECTS_DIR = ROOT / "content" / "projects"

SECTION_TYPES = ["intro", "problem", "solution", "architecture", "stack", "code", "diagram", "text"]
SECTION_ANIMATIONS = ["fade", "slide_right", "zoom", "typewriter", "matrix_rain", "expand_node"]


def unique_asset_path(directory: Path, filename: str) -> Path:
    stem = Path(filename).stem or "image"
    suffix = Path(filename).suffix or ".png"
    candidate = directory / f"{stem}{suffix}"
    index = 1
    while candidate.exists():
        candidate = directory / f"{stem}-{index}{suffix}"
        index += 1
    return candidate


def load_sections(slug: str) -> list[dict]:
    """Load sections for a project from sections.json (or sections.toml fallback)."""
    json_path = PROJECTS_DIR / slug / "sections.json"
    if json_path.exists():
        try:
            return json.loads(json_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    toml_path = PROJECTS_DIR / slug / "sections.toml"
    if toml_path.exists():
        try:
            with open(toml_path, "rb") as f:
                data = tomllib.load(f)
            return data.get("section", [])
        except Exception:
            pass
    return []


def save_sections(slug: str, sections: list[dict]) -> None:
    dest = PROJECTS_DIR / slug
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "sections.json").write_text(
        json.dumps(sections, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def list_projects() -> list[dict]:
    result = []
    for path in sorted(PROJECTS_DIR.glob("*.toml")):
        try:
            with open(path, "rb") as f:
                data = tomllib.load(f)
            result.append({"slug": data.get("slug", path.stem), "name": data.get("name", path.stem)})
        except Exception:
            pass
    return result


class EditorRequestHandler(BaseHTTPRequestHandler):
    server_version = "LocalBlogEditor/0.1"

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        if parsed.path in {"/", "/editor", "/editor/"}:
            self.serve_file(EDITOR_DIR / "index.html")
            return

        if parsed.path in {"/editor/sections", "/editor/sections/"}:
            self.serve_file(EDITOR_DIR / "sections.html")
            return

        if parsed.path.startswith("/editor/"):
            relative_path = parsed.path.removeprefix("/editor/")
            self.serve_file((EDITOR_DIR / relative_path).resolve())
            return

        if parsed.path == "/api/projects":
            self.send_json(list_projects())
            return

        if parsed.path.startswith("/api/sections/"):
            slug = parsed.path.removeprefix("/api/sections/").strip("/")
            self.send_json(load_sections(slug))
            return

        if parsed.path == "/api/section-meta":
            self.send_json({"types": SECTION_TYPES, "animations": SECTION_ANIMATIONS})
            return

        if parsed.path == "/api/state":
            site = load_site()
            i18n = load_i18n()
            self.send_json(
                {
                    "site": site,
                    "posts": [post_to_api(post, include_content=False) for post in load_posts(include_drafts=True)],
                    "projects": [project_to_api(project, include_content=False) for project in load_projects()],
                    "documents": [document_to_api(document, include_content=False) for document in load_documents()],
                    "locales": {
                        "default": default_locale(site, i18n),
                        "supported": i18n.get("supported_locales", []),
                        "names": i18n.get("language_names", {}),
                    },
                    "storage": database_status(),
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

        if parsed.path == "/api/project":
            slug = parse_qs(parsed.query).get("slug", [""])[0].strip()
            project = next((item for item in load_projects() if item["slug"] == slug), None)
            if not project:
                self.send_error_json(HTTPStatus.NOT_FOUND, "Projeto não encontrado.")
                return
            self.send_json(project_to_api(project))
            return

        if parsed.path == "/api/document":
            slug = parse_qs(parsed.query).get("slug", [""])[0].strip()
            document = next((item for item in load_documents() if item["slug"] == slug), None)
            if not document:
                self.send_error_json(HTTPStatus.NOT_FOUND, "Documento não encontrado.")
                return
            self.send_json(document_to_api(document))
            return

        if parsed.path == "/api/git/status":
            self.send_json(git_status())
            return

        if parsed.path == "/api/storage/status":
            self.send_json(database_status())
            return

        self.send_error_json(HTTPStatus.NOT_FOUND, "Rota não encontrada.")

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        # Sections endpoint accepts a JSON array — bypass dict-only read_json_body
        if parsed.path.startswith("/api/sections/"):
            try:
                length = int(self.headers.get("Content-Length", "0") or 0)
                raw = self.rfile.read(length).decode("utf-8") if length else "[]"
                sections = json.loads(raw)
                if not isinstance(sections, list):
                    raise ValueError("Expected JSON array")
                slug = parsed.path.removeprefix("/api/sections/").strip("/")
                save_sections(slug, sections)
                self.send_json({"ok": True})
            except Exception as exc:
                self.send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
            return

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
                        "posts": [post_to_api(post, include_content=False) for post in load_posts(include_drafts=True)],
                        "projects": [project_to_api(project, include_content=False) for project in load_projects()],
                        "documents": [document_to_api(document, include_content=False) for document in load_documents()],
                        "storage": database_status(),
                    }
                )
                return

            if parsed.path == "/api/project/save":
                saved = save_project(payload)
                self.send_json(
                    {
                        "project": project_to_api(saved),
                        "posts": [post_to_api(post, include_content=False) for post in load_posts(include_drafts=True)],
                        "projects": [project_to_api(project, include_content=False) for project in load_projects()],
                        "documents": [document_to_api(document, include_content=False) for document in load_documents()],
                        "storage": database_status(),
                    }
                )
                return

            if parsed.path == "/api/document/save":
                saved = save_document(payload)
                self.send_json(
                    {
                        "document": document_to_api(saved),
                        "posts": [post_to_api(post, include_content=False) for post in load_posts(include_drafts=True)],
                        "projects": [project_to_api(project, include_content=False) for project in load_projects()],
                        "documents": [document_to_api(document, include_content=False) for document in load_documents()],
                        "storage": database_status(),
                    }
                )
                return

            if parsed.path == "/api/post/delete":
                result = delete_post(str(payload.get("id", "") or ""))
                self.send_json(
                    {
                        **result,
                        "posts": [post_to_api(post, include_content=False) for post in load_posts(include_drafts=True)],
                        "projects": [project_to_api(project, include_content=False) for project in load_projects()],
                        "documents": [document_to_api(document, include_content=False) for document in load_documents()],
                        "storage": database_status(),
                    }
                )
                return

            if parsed.path == "/api/project/delete":
                result = delete_project(str(payload.get("slug", "") or ""))
                self.send_json(
                    {
                        **result,
                        "posts": [post_to_api(post, include_content=False) for post in load_posts(include_drafts=True)],
                        "projects": [project_to_api(project, include_content=False) for project in load_projects()],
                        "documents": [document_to_api(document, include_content=False) for document in load_documents()],
                        "storage": database_status(),
                    }
                )
                return

            if parsed.path == "/api/document/delete":
                result = delete_document(str(payload.get("slug", "") or ""))
                self.send_json(
                    {
                        **result,
                        "posts": [post_to_api(post, include_content=False) for post in load_posts(include_drafts=True)],
                        "projects": [project_to_api(project, include_content=False) for project in load_projects()],
                        "documents": [document_to_api(document, include_content=False) for document in load_documents()],
                        "storage": database_status(),
                    }
                )
                return

            if parsed.path == "/api/post/preview":
                preview_post = normalise_post(payload)
                site = load_site()
                i18n = load_i18n()
                locale = str(payload.get("locale", "") or payload.get("_preview_locale", "") or "").strip()
                if not locale:
                    locale = default_locale(site, i18n)
                self.send_json({"html": render_post_preview(preview_post, i18n, locale)})
                return

            if parsed.path == "/api/project/preview":
                preview_project = normalise_project(payload)
                site = load_site()
                i18n = load_i18n()
                locale = str(payload.get("locale", "") or payload.get("_preview_locale", "") or "").strip()
                if not locale:
                    locale = default_locale(site, i18n)
                self.send_json({"html": render_project_preview(preview_project, i18n, locale)})
                return

            if parsed.path == "/api/document/preview":
                preview_payload = dict(payload)
                if preview_payload.get("body_source_path"):
                    preview_payload["source_path"] = preview_payload["body_source_path"]
                else:
                    preview_payload.pop("source_path", None)
                preview_document = normalise_document(preview_payload)
                site = load_site()
                i18n = load_i18n()
                locale = str(payload.get("locale", "") or payload.get("_preview_locale", "") or "").strip()
                if not locale:
                    locale = default_locale(site, i18n)
                self.send_json({"html": render_document_preview(preview_document, i18n, locale)})
                return

            if parsed.path == "/api/storage/import":
                self.send_json({"import": import_toml_posts_to_database(), "storage": database_status()})
                return

            if parsed.path == "/api/storage/export":
                self.send_json({"export": export_database_posts_to_toml(), "storage": database_status()})
                return

            if parsed.path == "/api/build":
                self.send_json({"build": build_site(), "git": git_status()})
                return

            if parsed.path == "/api/publish":
                message = str(payload.get("message", "") or "")
                push = bool(payload.get("push", False))
                self.send_json({"publish": publish_changes(message=message, push=push), "git": git_status()})
                return

            if parsed.path == "/api/upload":
                filename = str(payload.get("filename", "image.png"))
                content_base64 = str(payload.get("content", ""))
                
                # Basic validation
                if not content_base64:
                    self.send_error_json(HTTPStatus.BAD_REQUEST, "Conteúdo da imagem ausente.")
                    return
                
                # Sanitize filename
                filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
                
                # Save to assets/images/posts/
                image_dir = ROOT / "assets" / "images" / "posts"
                image_dir.mkdir(parents=True, exist_ok=True)
                
                image_path = unique_asset_path(image_dir, filename)
                
                # Handle base64 data URL
                if "," in content_base64:
                    content_base64 = content_base64.split(",")[1]
                
                try:
                    image_bytes = base64.b64decode(content_base64, validate=True)
                except (Base64Error, ValueError):
                    self.send_error_json(HTTPStatus.BAD_REQUEST, "Imagem em base64 inválida.")
                    return

                with open(image_path, "wb") as f:
                    f.write(image_bytes)
                
                # Build relative URL for markdown
                rel_url = f"/assets/images/posts/{image_path.name}"
                self.send_json({"url": rel_url})
                return

            self.send_error_json(HTTPStatus.NOT_FOUND, "Rota não encontrada.")
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
        except RuntimeError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
        except Exception as error:  # noqa: BLE001
            self.send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, f"Erro interno: {error}")

    def do_DELETE(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/post":
            self.send_error_json(HTTPStatus.NOT_FOUND, "Rota não encontrada.")
            return

        try:
            post_id = parse_qs(parsed.query).get("id", [""])[0].strip()
            result = delete_post(post_id)
            self.send_json(
                {
                    **result,
                    "posts": [post_to_api(post, include_content=False) for post in load_posts(include_drafts=True)],
                    "storage": database_status(),
                }
            )
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

        try:
            resolved.relative_to(EDITOR_DIR.resolve())
        except ValueError:
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
