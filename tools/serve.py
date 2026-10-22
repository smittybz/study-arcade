"""Runs Study Arcade on http://localhost:8766

    python3 tools/serve.py            (from the StudyArcade folder)

Two Godot games need "cross-origin isolation" to run, which a plain file
server doesn't give them. This server adds those headers only inside game
folders that contain a file named `.isolate`. Every other page stays normal,
so games embedded from other websites can still load.
"""
import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".wasm": "application/wasm",
        ".pck": "application/octet-stream",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def isolated(self):
        # games/<group>/<game>/... -> is there a games/<group>/<game>/.isolate file?
        parts = self.path.split("?", 1)[0].strip("/").split("/")
        if len(parts) < 3 or parts[0] != "games":
            return False
        return os.path.isfile(os.path.join(ROOT, *parts[:3], ".isolate"))

    def end_headers(self):
        if self.isolated():
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the terminal quiet


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Study Arcade is running at http://localhost:{PORT}  (Ctrl+C to stop)")
        httpd.serve_forever()
