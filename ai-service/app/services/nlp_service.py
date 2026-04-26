"""
NLP Service — production-grade, fully dynamic.

Key algorithm: find the first quantity token in the transcript,
then scan (qty → noun) pairs from that point forward.
This correctly handles "one laptop and 3 iPad" without
swallowing "and" into the noun.
"""
from __future__ import annotations

import logging
import re
from typing import Optional

from app.utils.synonyms import normalize_item_name

logger = logging.getLogger(__name__)

# ── Number words ─────────────────────────────────────────────────────
_W2N: dict[str, int] = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40,
    "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80,
    "ninety": 90, "hundred": 100,
}
_W2N_KEYS = set(_W2N.keys())

# These words can NEVER be product nouns
_STOP = frozenset({
    "and", "or", "the", "a", "an", "of", "for", "to", "in", "on", "at",
    "with", "by", "from", "into", "create", "make", "generate", "invoice",
    "bill", "order", "purchase", "buy", "units", "unit", "pieces", "piece",
    "items", "item", "quantity", "nos", "number", "each", "total",
    "me", "us", "them", "my", "our", "please", "kindly", "some", "few",
    "new", "add", "prepare", "issue", "raise", "plus", "also", "then",
})

# ── Compiled patterns ────────────────────────────────────────────────
_W2N_ALT   = "|".join(sorted(_W2N_KEYS, key=len, reverse=True))
_RE_CREATE = re.compile(r"\b(create|generate|make|prepare|raise|issue|new|add|produce)\b", re.I)
_RE_UPDATE = re.compile(r"\b(update|edit|modify|change|correct|fix|revise)\b", re.I)
_RE_QUERY  = re.compile(r"\b(show|list|find|get|fetch|check|view|search|display)\b", re.I)

_CUST_RE = re.compile(
    r"\b(?:for|to)\s+"
    r"([A-Za-z][a-zA-Z]+(?:\s+[A-Za-z][a-zA-Z]+){0,2})"
    r"(?=\s*,|\s+\d|\s+(?:" + _W2N_ALT + r")\b|$)",
)


class NlpService:

    def detect_intent(self, transcript: str) -> dict:
        if not transcript or not transcript.strip():
            raise ValueError("Transcript is empty")

        cleaned  = self._clean(transcript)
        intent   = self._intent(cleaned)
        customer = self._customer(transcript)
        items    = self._extract_items(cleaned)
        discount = self._discount(cleaned)
        due      = self._due_days(cleaned)
        notes    = self._notes(transcript)
        conf     = self._confidence(customer, items, intent)

        print(f"[NLP] intent={intent} customer={customer!r} "
              f"items={[(i['name'],i['quantity']) for i in items]} conf={conf}")
        logger.info("NLP intent=%s customer=%r items=%s conf=%.2f",
                    intent, customer,
                    [(i["name"], i["quantity"]) for i in items], conf)

        return {
            "intent":          intent,
            "confidence":      conf,
            "customerName":    customer,
            "customerId":      None,
            "items":           items,
            "discountPercent": discount,
            "notes":           notes,
            "dueInDays":       due,
        }

    def extract_entities(self, transcript: str) -> dict:
        r = self.detect_intent(transcript)
        return {"entities": {k: r[k] for k in
                ("customerName", "items", "discountPercent", "notes", "dueInDays")}}

    # ── Private ───────────────────────────────────────────────────────

    @staticmethod
    def _clean(text: str) -> str:
        t = re.sub(r"\s+", " ", text.lower().strip())
        t = re.sub(r"\b(please|kindly|can you|could you|i want|i need|i would like)\b", "", t)
        return t.strip()

    @staticmethod
    def _intent(c: str) -> str:
        if _RE_CREATE.search(c): return "CREATE_INVOICE"
        if _RE_UPDATE.search(c): return "UPDATE_INVOICE"
        if _RE_QUERY.search(c):  return "QUERY_INVOICE"
        return "CREATE_INVOICE"

    @staticmethod
    def _customer(original: str) -> Optional[str]:
        m = _CUST_RE.search(original)
        if m:
            name = m.group(1).strip().rstrip(".,")
            words = name.split()
            if not any(w.lower() in _STOP or w.lower() in _W2N_KEYS for w in words):
                if not re.search(r"\d", name) and len(name) >= 2:
                    return name.title()
        return None

    @staticmethod
    def _get_item_section(cleaned: str) -> str:
        """
        Return the part of the transcript starting from the FIRST
        quantity token (digit or number-word).  This skips the
        preamble ("create invoice for Padma") entirely.
        """
        tokens = cleaned.split()
        for idx, tok in enumerate(tokens):
            t = tok.rstrip(".,")
            if t.isdigit() or t.lower() in _W2N_KEYS:
                return " ".join(tokens[idx:])
        return ""

    @classmethod
    def _extract_items(cls, cleaned: str) -> list[dict]:
        """
        Scan tokens from the first quantity onwards.
        For each quantity, collect the following non-stopword, non-quantity
        noun words (up to 2).  Stop noun collection at the next quantity
        or at a stopword that is immediately followed by a quantity.
        """
        section = cls._get_item_section(cleaned)
        if not section:
            return []

        tokens = section.split()
        found: dict[str, dict] = {}
        i = 0

        while i < len(tokens):
            tok = tokens[i].rstrip(".,").lower()

            # Is this a quantity token?
            if tok.isdigit():
                qty = int(tok)
            elif tok in _W2N_KEYS:
                qty = _W2N[tok]
            else:
                i += 1
                continue

            if qty <= 0:
                i += 1
                continue

            # Collect noun tokens after the quantity
            noun_parts: list[str] = []
            j = i + 1

            while j < len(tokens) and len(noun_parts) < 2:
                word = tokens[j].rstrip(".,")
                wl   = word.lower()

                # Skip stopwords — but if the NEXT token is a new quantity, stop here
                if wl in _STOP:
                    j += 1
                    if j < len(tokens):
                        peek = tokens[j].rstrip(".,").lower()
                        if peek.isdigit() or peek in _W2N_KEYS:
                            break   # new item starts
                    continue

                # New quantity → start of next item
                if wl.isdigit() or wl in _W2N_KEYS:
                    break

                noun_parts.append(word)
                j += 1

            i = j

            if not noun_parts:
                continue

            # Clean trailing stopwords that may have crept in
            while noun_parts and noun_parts[-1].lower() in _STOP:
                noun_parts.pop()

            if not noun_parts:
                continue

            raw       = " ".join(noun_parts).lower().strip()
            canonical = normalize_item_name(raw)

            if not canonical or canonical.lower() in _STOP:
                continue

            if canonical in found:
                found[canonical]["quantity"] += qty
            else:
                found[canonical] = {
                    "name":     canonical,
                    "rawName":  raw,
                    "quantity": qty,
                }

        return list(found.values())

    @staticmethod
    def _discount(c: str) -> Optional[float]:
        m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:discount|off)", c, re.I)
        return float(m.group(1)) if m else None

    @staticmethod
    def _due_days(c: str) -> int:
        patterns = [
            r"due\s+in\s+(\d+)\s+days?",
            r"payment\s+(?:in|within)\s+(\d+)\s+days?",
            r"net[- ]?(\d+)",
            r"within\s+(\d+)\s+days?",
        ]
        for p in patterns:
            m = re.search(p, c, re.I)
            if m:
                return int(m.group(1))
        return 30

    @staticmethod
    def _notes(original: str) -> Optional[str]:
        m = re.search(
            r"(?:add\s+(?:a\s+)?note|with\s+(?:a\s+)?note|remark|comment)"
            r"[:\s]+[\"']?(.+?)[\"']?(?:\.|$)",
            original, re.I,
        )
        return m.group(1).strip().strip("\"'") if m else None

    @staticmethod
    def _confidence(customer, items, intent) -> float:
        score = 0.5
        if customer: score += 0.2
        if items:    score += min(0.25, 0.1 * len(items))
        if intent != "UNKNOWN": score += 0.05
        return round(min(score, 1.0), 4)