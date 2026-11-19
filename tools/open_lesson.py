"""Open a lesson of the textbook in the browser, starting the local server first if it is not running.

    python tools/open_lesson.py 1            # lesson 1
    python tools/open_lesson.py              # cover and contents
    python tools/open_lesson.py --sandbox    # the joint sandbox
    python tools/open_lesson.py --atlas      # the exercise atlas
    python tools/open_lesson.py --review     # the review cards
    python tools/open_lesson.py --glossary   # the glossary
    ... --no-browser --port 8799                                             # check without opening a tab

Works from PowerShell, cmd and Git Bash. The server (tools/serve.py: site/ with HTTP Range, so audio can
start mid-clip) keeps running in the background after this script ends.
"""
import argparse
import os
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOK = "therapeutic-exercise"


def up(port):
    try:
        socket.create_connection(("127.0.0.1", port), timeout=.3).close()
        return True
    except OSError:
        return False


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("lesson", nargs="?", type=int, help="lesson number (omit for the contents)")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-browser", action="store_true")
    ap.add_argument("--sandbox", action="store_true", help="open the joint sandbox")
    ap.add_argument("--atlas", action="store_true", help="open the exercise atlas")
    ap.add_argument("--review", action="store_true", help="open the review cards")
    ap.add_argument("--glossary", action="store_true", help="open the glossary")
    a = ap.parse_args()

    if not up(a.port):
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
        subprocess.Popen([sys.executable, str(ROOT / "tools" / "serve.py"), str(a.port)], cwd=ROOT,
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         creationflags=flags, start_new_session=os.name != "nt")
        for _ in range(50):
            if up(a.port):
                break
            time.sleep(.1)
        else:
            sys.exit(f"The server did not start on port {a.port}.")
        print(f"Started the textbook server on port {a.port}.")

    page = "sandbox/" if a.sandbox else "atlas/" if a.atlas else "review/" if a.review else "glossary/" if a.glossary else ""
    if a.lesson and not (a.sandbox or a.atlas or a.review or a.glossary):
        folder = f"ch{a.lesson:03d}"
        if (ROOT / "site" / BOOK / folder / "index.html").exists():
            page = folder + "/"
        else:
            print(f"Lesson {a.lesson} is not ready yet; opening the contents.")
            page = "#contents"
    url = f"http://localhost:{a.port}/{BOOK}/{page}"
    if not a.no_browser:
        webbrowser.open(url)
    print(url)


if __name__ == "__main__":
    main()
