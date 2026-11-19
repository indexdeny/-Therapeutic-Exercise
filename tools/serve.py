"""Static server for the textbook with HTTP Range support, so the player can start a clip mid-way.

    python tools/serve.py [port]          # serves site/ on http://localhost:8765/

python -m http.server ignores Range headers, and browsers then cannot seek inside audio. This server
answers a single byte range with 206 Partial Content and tells the browser not to cache files, so lessons
rebuilt during work are picked up on reload.
"""
import http.server
import os
import re
import sys
from functools import partial
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
RANGE = re.compile(r"bytes=(\d*)-(\d*)$")


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_head(self):
        self.range_left = None
        m = RANGE.match(self.headers.get("Range", "").strip())
        path = self.translate_path(self.path)
        if not m or not os.path.isfile(path):
            return super().send_head()
        f = open(path, "rb")
        size = os.fstat(f.fileno()).st_size
        a, b = m.groups()
        start, end = (max(0, size - int(b)), size - 1) if a == "" else (int(a), min(int(b), size - 1) if b else size - 1)
        if start >= size or end < start:
            f.close()
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return None
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        f.seek(start)
        self.range_left = end - start + 1
        return f

    def copyfile(self, src, dst):
        if self.range_left is None:
            return super().copyfile(src, dst)
        while self.range_left > 0:
            buf = src.read(min(65536, self.range_left))
            if not buf:
                break
            dst.write(buf)
            self.range_left -= len(buf)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(Handler, directory=str(SITE))).serve_forever()
