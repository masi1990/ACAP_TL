#!/usr/bin/env python3
"""Extract PDF text, flipping visual-order Arabic lines back to reading order."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from standard_text import logical_text

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: extract-pdf-text.py <pdf> <out.txt>", file=sys.stderr)
        return 2
    doc = fitz.open(sys.argv[1])
    parts = [logical_text(page.get_text("text")) for page in doc]
    Path(sys.argv[2]).write_text("\n".join(parts), encoding="utf-8")
    print(len(doc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
