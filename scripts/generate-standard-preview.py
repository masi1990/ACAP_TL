#!/usr/bin/env python3
"""Rasterize a standard PDF for store/admin preview.

Public mode (all standards): starting pages through Clause 1 Scope inclusive.
Clause 2+ pages are omitted. If Scope shares a page with Clause 2, crop below Scope.
Full mode: every page exact and unlocked (admin / free-to-read).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from standard_text import (  # noqa: E402
    ARABIC_CLAUSE2,
    CLAUSE2_PHRASES,
    fold_latin,
    has_clause2_heading,
    has_specifying_sentence,
    is_scope_heading_line,
    is_toc_line,
    is_toc_page,
    logical_line,
    scope_page_label,
)

CLAUSE2_NEEDLES = (
    "Normative references",
    "Normative reference",
    "Références normatives",
    "Referências normativas",
    "Referencias normativas",
    "المراجع المعيارية",
    "المراجع القياسية",
)


def find_scope_page(doc) -> int | None:
    """Body page that opens Clause 1. None when the scope heading cannot be found."""
    scored: list[tuple[int, int]] = []
    for i, page in enumerate(doc):
        text = page.get_text("text")
        if is_toc_page(text):
            continue
        heading = any(is_scope_heading_line(line) for line in text.splitlines())
        sentence = has_specifying_sentence(text)
        if not heading and not sentence:
            continue
        score = (100 if heading and sentence else 70 if heading else 40) + (
            10 if has_clause2_heading(text) else 0
        )
        scored.append((score, i))
    if not scored:
        return None
    scored.sort(reverse=True)
    return scored[0][1]


def find_clause2_y(page) -> float | None:
    """Y just above Clause 2 (normative references), in any published language."""
    ys: list[float] = []
    number_ys: list[float] = []
    for needle in CLAUSE2_NEEDLES:
        for hit in page.search_for(needle):
            if hit.x0 < 420:
                ys.append(float(hit.y0))
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = " ".join(span["text"] for span in line.get("spans", [])).strip()
            if not text or is_toc_line(text):
                continue
            logical = logical_line(text)
            folded = fold_latin(logical)
            y0 = float(line["bbox"][1])
            if re.fullmatch(r"2(?:\.0)?", folded):
                number_ys.append(y0)
            elif any(phrase in folded for phrase in CLAUSE2_PHRASES) or any(
                phrase in logical for phrase in ARABIC_CLAUSE2
            ):
                ys.append(y0)
    if not ys:
        return None
    cut = min(ys)
    above = [y for y in number_ys if cut - 80 <= y < cut]
    if above:
        cut = min(above)
    return cut


def render(page, zoom: float = 2.75) -> Image.Image:
    """Render the full PDF page media box at high resolution for readability."""
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False, annots=True)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def scope_page_image(page, zoom: float = 2.75) -> Image.Image:
    """Scope page as published; blank any Clause 2+ text that shares the page."""
    img = render(page, zoom)
    cut_y = find_clause2_y(page)
    if cut_y is None:
        return img
    crop_h = max(120, int(cut_y * zoom) - 8)
    crop_h = min(crop_h, img.height)
    out = Image.new("RGB", img.size, (255, 255, 255))
    out.paste(img.crop((0, 0, img.width, crop_h)), (0, 0))
    return out


def generate_public_preview(doc, out_dir: Path, zoom: float = 2.75) -> dict:
    """Starting pages through Clause 1 Scope inclusive; Clause 2+ omitted."""
    scope_idx = find_scope_page(doc)
    last_free = scope_idx if scope_idx is not None else 0
    pages_meta = []
    scope_text = doc[scope_idx].get_text("text") if scope_idx is not None else ""
    clause1_label = scope_page_label(scope_text) if scope_text else "1 Scope"

    for i in range(last_free + 1):
        page = doc[i]
        n = i + 1
        if scope_idx is not None and i == scope_idx:
            img = scope_page_image(page, zoom)
            label = clause1_label
        else:
            img = render(page, zoom)
            if i == 0:
                label = "Cover"
            elif is_toc_page(page.get_text("text")):
                label = "Contents"
            else:
                label = f"Page {n}"
        image_name = f"page-{n:02d}.png"
        img.save(out_dir / image_name, "PNG")
        pages_meta.append(
            {
                "n": n,
                "label": label,
                "access": "free",
                "image": image_name,
                "note": None,
                **({"scopeOnly": True} if scope_idx is not None and i == scope_idx else {}),
            }
        )

    # Full extracted text so Node can build TOC / Clause 1 HTML in the PDF's language.
    full_text = "\n".join(page.get_text("text") for page in doc)
    (out_dir / "preview-text.txt").write_text(full_text, encoding="utf-8")

    return {
        "pageCount": len(doc),
        "scopePage": 0 if scope_idx is None else scope_idx + 1,
        "mode": "public",
        "cutoff": "start-through-clause1",
        "scopeLabel": clause1_label,
        "pages": pages_meta,
    }


def generate_full_preview(doc, out_dir: Path, zoom: float = 2.75) -> dict:
    """All pages clear and unlocked — authenticated admin / free-to-read preview."""
    pages_meta = []
    for i, page in enumerate(doc):
        n = i + 1
        img = render(page, zoom)
        image_name = f"page-{n:02d}.png"
        img.save(out_dir / image_name, "PNG")
        label = "Cover" if i == 0 else f"Page {n}"
        pages_meta.append(
            {
                "n": n,
                "label": label,
                "access": "free",
                "image": image_name,
                "note": None,
            }
        )
    return {
        "pageCount": len(doc),
        "scopePage": 1,
        "mode": "full",
        "pages": pages_meta,
    }


def main() -> int:
    if len(sys.argv) < 3:
        print(
            "usage: generate-standard-preview.py <pdf> <out_dir> [--full]",
            file=sys.stderr,
        )
        return 2
    pdf_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    full = "--full" in sys.argv[3:]
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    manifest = generate_full_preview(doc, out_dir) if full else generate_public_preview(doc, out_dir)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
