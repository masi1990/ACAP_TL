"""Shared text helpers for African Standard PDFs in EN, FR, PT, and AR."""
from __future__ import annotations

import re
import unicodedata

SCOPE_HEADINGS = (
    "scope",
    "champ d'application",
    "domaine d'application",
    "objet et domaine d'application",
    "campo de aplicacao",
    "objetivo e campo de aplicacao",
    "objectivo e campo de aplicacao",
    "objecto e campo de aplicacao",
    "ambito de aplicacao",
    "ambito",
)
ARABIC_SCOPE_HEADINGS = ("نطاق التطبيق", "مجال التطبيق", "المجال")
CLAUSE2_PHRASES = (
    "normative reference",
    "references normatives",
    "referencias normativas",
)
ARABIC_CLAUSE2 = ("المراجع المعيارية", "المراجع القياسية")
TOC_MARKERS = (
    "table of contents",
    "contents",
    "table des matieres",
    "sommaire",
    "sumario",
    "indice",
    "conteudo",
)
ARABIC_TOC = ("المحتويات", "الفهرس", "فهرس")
ARABIC_HINTS = (
    "المجال",
    "نطاق التطبيق",
    "مجال التطبيق",
    "المراجع المعيارية",
    "المراجع القياسية",
    "تحدد",
    "يحدد",
    "تختص",
    "المصطلحات",
    "التعاريف",
    "المحتويات",
    "الفهرس",
    "هذه المواصفة",
    "التعبئة",
    "الوسم",
)


def fold_latin(text: str) -> str:
    text = text.lower().replace("’", "'").replace("ʼ", "'").replace("`", "'")
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def _arabic_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    arabic = [c for c in letters if "\u0600" <= c <= "\u06FF" or "\uFE70" <= c <= "\uFEFF"]
    return len(arabic) / len(letters)


def _arabic_key(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    return re.sub(r"[\u064B-\u065F\u0670\u0640]", "", text)


def _hint_score(text: str) -> int:
    return sum(len(hint) for hint in ARABIC_HINTS if hint in text)


def _article_score(text: str) -> int:
    """Logical Arabic puts the definite article ال at the start of words."""
    normalized = text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    score = 0
    for word in normalized.split():
        bare = word[1:] if word[:1] in "وفس" else word
        if bare.startswith("ال") and len(bare) >= 4:
            score += 1
    return score


def logical_line(line: str) -> str:
    """Flip an Arabic line that PyMuPDF returned in visual order."""
    if _arabic_ratio(line) < 0.6:
        return line
    key = _arabic_key(line)
    rev = key[::-1]
    key_score = _hint_score(key) * 10 + _article_score(key)
    rev_score = _hint_score(rev) * 10 + _article_score(rev)
    if rev_score > key_score:
        return rev
    if key_score > rev_score:
        return key
    if any("\uFE70" <= ch <= "\uFEFF" for ch in line):
        return rev
    return key


def logical_text(text: str) -> str:
    return "\n".join(logical_line(line) for line in text.splitlines())


def _strip_clause_number(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^\d+(?:\.\d+)*[\s.]*", "", text)
    text = re.sub(r"[\s.]*\d+(?:\.\d+)*$", "", text)
    return text.strip()


def is_toc_line(text: str) -> bool:
    return text.count(".") >= 3 or "…" in text


def is_scope_heading_line(text: str) -> bool:
    raw = logical_line(text).strip()
    if not raw or is_toc_line(raw):
        return False
    compact = _strip_clause_number(raw)
    if any(compact == heading or compact.startswith(heading + " ") for heading in ARABIC_SCOPE_HEADINGS):
        return True
    folded = fold_latin(compact)
    return any(folded == heading or folded.startswith(heading + " ") for heading in SCOPE_HEADINGS)


def has_specifying_sentence(text: str) -> bool:
    logical = logical_text(text)
    folded = fold_latin(logical)
    return bool(
        re.search(r"specifie", folded)
        or re.search(r"\bespecifica\b", folded)
        or "aplica-se" in folded
        or re.search(r"\bestabelece\b", folded)
        or any(hint in logical for hint in ("تحدد", "يحدد", "تختص"))
    )


def has_clause2_heading(text: str) -> bool:
    logical = logical_text(text)
    folded = fold_latin(logical)
    return any(phrase in folded for phrase in CLAUSE2_PHRASES) or any(phrase in logical for phrase in ARABIC_CLAUSE2)


def is_toc_page(text: str) -> bool:
    for line in text.splitlines():
        logical = logical_line(line).strip()
        if not logical:
            continue
        folded = fold_latin(logical)
        if folded in TOC_MARKERS:
            return True
        if any(logical == heading or logical.startswith(heading + " ") for heading in ARABIC_TOC):
            return True
    return text.count("...") >= 3 or text.count("…") >= 3
