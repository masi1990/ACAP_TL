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


def find_clause2_y(page) -> float | None:
    hits = page.search_for("Normative")
    for h in hits:
        # Prefer heading near left margin on a "2 … Normative" line
        if h.x0 < 200:
            return float(h.y0)
    # Fallback: search text blocks
    for b in page.get_text("dict").get("blocks", []):
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            text = " ".join(s["text"] for s in line.get("spans", [])).strip()
            if text.lower().startswith("2") and "normative" in text.lower():
                return float(line["bbox"][1])
    return None


def find_scope_page(doc) -> int:
    """Locate the body page that opens Clause 1 Scope (not the TOC listing)."""
    scored: list[tuple[int, int]] = []
    for i, page in enumerate(doc):
        text = page.get_text("text")
        lower = text.lower()
        is_toc = (
            "table of contents" in lower
            or re.search(r"(?m)^\s*contents\s*$", text) is not None
            or (text.count("Scope") >= 1 and "This African" not in text and len(text) < 1200 and text.count("\n") > 20)
        )
        has_spec_sentence = (
            "This African Standard specifies" in text
            or "This African standard specifies" in text
            or "specifies the requirements" in lower
        )
        # Body page: real Scope prose, not a TOC line item
        if has_spec_sentence and "Scope" in text:
            score = 100 + (10 if "Normative" in text else 0)
            scored.append((score, i))
            continue
        if is_toc:
            continue
        if (
            re.search(r"(?m)^\s*1\s*$", text)
            and re.search(r"(?m)^\s*Scope\s*$", text)
            and has_spec_sentence
        ):
            scored.append((80, i))
    if scored:
        scored.sort(reverse=True)
        return scored[0][1]
    for i, page in enumerate(doc):
        text = page.get_text("text")
        if "This African Standard specifies" in text or "This African standard specifies" in text:
            return i
    return min(6, max(0, len(doc) - 1))


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
        label = f"Page {n}"
        if i == 0:
            label = "Cover"
        access = "locked"
        note = None
        image_name = f"page-{n:02d}.png"

        if i < scope_idx:
            access = "free"
            img.save(out_dir / image_name, "PNG")
        elif i == scope_idx:
            cut_y = find_clause2_y(page)
            if cut_y is not None:
                crop_h = max(80, int(cut_y * zoom) - 10)
            else:
                crop_h = int(img.height * 0.35)
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
            # Locked full page (includes clause 2+) heavily blurred — not used as free
            blur_locked(img).save(out_dir / image_name, "PNG")
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
                    "note": "Clause 2 Normative references and later text are locked.",
                }
            )
            continue
        else:
            blur_locked(img).save(out_dir / image_name, "PNG")

        pages_meta.append(
            {
                "n": n if i != scope_idx else n,
                "label": label if access == "free" else f"{label} (locked)",
                "access": access,
                "image": image_name,
                "note": note,
            }
        )

    return {
        "pageCount": len(doc),
        "scopePage": scope_idx + 1,
        "mode": "public",
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
