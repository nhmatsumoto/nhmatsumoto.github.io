#!/usr/bin/env python3
from __future__ import annotations

import argparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve a static directory locally.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--dir", default=str(ROOT / "dist"))
    args = parser.parse_args()

    directory = Path(args.dir).resolve()
    handler = lambda *handler_args, **handler_kwargs: SimpleHTTPRequestHandler(  # noqa: E731
        *handler_args,
        directory=str(directory),
        **handler_kwargs,
    )
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Serving {directory} at http://{args.host}:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
