#!/usr/bin/env python3
"""Capture the ZettelLinker desktop window. Run from portfolio root:

  PYTHONPATH=/path/to/zettlellinker/src python3 scripts/capture-zettellinker-gui.py

Uses macOS screencapture (no Pillow). Default PYTHONPATH: /tmp/portfolio-screens/zettlellinker/src
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
import tkinter as tk
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "zettellinker-app.jpg"
SRC = os.environ.get("ZETTELLINKER_SRC", "/tmp/portfolio-screens/zettlellinker/src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from zettellinker.gui_app import ZettelLinkerApp  # noqa: E402


def main() -> None:
    root = tk.Tk()
    app = ZettelLinkerApp(root)
    root.lift()
    root.attributes("-topmost", True)
    root.update_idletasks()
    root.update()
    time.sleep(0.8)
    root.focus_force()
    x, y = root.winfo_rootx(), root.winfo_rooty()
    w, h = root.winfo_width(), root.winfo_height()
    # Title bar + shadow
    pad = 32
    region = f"{x},{y},{w},{h + pad}"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["screencapture", "-x", "-R", region, str(OUT)], check=True)
    root.destroy()
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
