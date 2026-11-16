#!/usr/bin/env python3
"""Rasterize a standard PDF into free (Clause 1 only) + locked/blurred preview pages."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore
from PIL import Image, ImageDraw, ImageFilter

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
            elif any(phrase in folded for phrase in CLAUSE2_PHRASES) or any(phrase in logical for phrase in ARABIC_CLAUSE2):
                ys.append(y0)
    if not ys:
        return None
    cut = min(ys)
    above = [y for y in number_ys if cut - 80 <= y < cut]
    if above:
        cut = min(above)
    return cut


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


def render(page, zoom: float = 2.0) -> Image.Image:
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def blur_locked(img: Image.Image) -> Image.Image:
    blurred = img.filter(ImageFilter.GaussianBlur(radius=22))
    overlay = Image.new("RGB", img.size, (35, 35, 35))
    return Image.blend(blurred, overlay, 0.3)


def generate_public_preview(doc, out_dir: Path, zoom: float = 2.0) -> dict:
    """Clause-1-only free pages; later pages blurred/locked (public store)."""
    scope_idx = find_scope_page(doc)
    pages_meta = []

    for i, page in enumerate(doc):
        n = i + 1
        img = render(page, zoom)
        label = "Cover" if i == 0 else f"Page {n}"
        image_name = f"page-{n:02d}.png"
        before_scope = scope_idx is not None and i < scope_idx

        if before_scope:
            img.save(out_dir / image_name, "PNG")
            pages_meta.append(
                {
                    "n": n,
                    "label": label,
                    "access": "free",
                    "image": image_name,
                    "note": None,
                }
            )
            continue

        if i == scope_idx:
            cut_y = find_clause2_y(page)
            blur_locked(img).save(out_dir / image_name, "PNG")
            if cut_y is None and has_clause2_heading(page.get_text("text")):
                pages_meta.append(
                    {
                        "n": n,
                        "label": f"Page {n} (Clause 2+ locked)",
                        "access": "locked",
                        "image": image_name,
                        "note": "Clause 2 and later text are locked.",
                    }
                )
                continue
            if cut_y is None:
                scope_img = img
            else:
                crop_h = max(80, int(cut_y * zoom) - 10)
                scope_img = img.crop((0, 0, img.width, min(crop_h, img.height)))
            canvas = Image.new("RGB", (img.width, scope_img.height + 90), (255, 255, 255))
            canvas.paste(scope_img, (0, 0))
            draw = ImageDraw.Draw(canvas)
            draw.rectangle(
                [32, scope_img.height + 18, img.width - 32, scope_img.height + 70],
                fill=(15, 42, 36),
            )
            scope_name = f"page-{n:02d}-scope-only.png"
            canvas.save(out_dir / scope_name, "PNG")
            pages_meta.append(
                {
                    "n": n,
                    "label": "1 Scope (Clause 1 only)",
                    "access": "free",
                    "image": scope_name,
                    "note": "Free preview ends after Clause 1 Scope. Clause 2+ is not shown.",
                    "scopeOnly": True,
                }
            )
            pages_meta.append(
                {
                    "n": n + 0.1,
                    "label": f"Page {n} (Clause 2+ locked)",
                    "access": "locked",
                    "image": image_name,
                    "note": "Clause 2 and later text are locked.",
                }
            )
            continue

        blur_locked(img).save(out_dir / image_name, "PNG")
        pages_meta.append(
            {
                "n": n,
                "label": f"{label} (locked)",
                "access": "locked",
                "image": image_name,
                "note": None,
            }
        )

    return {
        "pageCount": len(doc),
        "scopePage": 0 if scope_idx is None else scope_idx + 1,
        "mode": "public",
        "cutoff": "clause-1-i18n",
        "pages": pages_meta,
    }


def generate_full_preview(doc, out_dir: Path, zoom: float = 2.0) -> dict:
    """All pages clear and unlocked — authenticated admin full-standard preview."""
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
                "note": "Full standard — authenticated admin preview",
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
