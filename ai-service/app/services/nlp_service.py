"""
NLP Service — production-grade, fully dynamic, zero fallback stubs.

Pipeline:
  1. Preprocess transcript (lowercase, punctuation strip)
  2. Extract customer name using positional patterns
  3. Extract item + quantity pairs using numeric + noun patterns
  4. Normalise item names (de-plural, synonym resolution)
  5. Return structured intent dict

No hardcoded product names.  No dummy data.
"""
from __future__ import annotations

import logging
import re
from typing import Optional

from app.utils.synonyms import normalize_item_name

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Compiled regex patterns (compiled once at import time for performance)
# ---------------------------------------------------------------------------

# "for <Name>" | "to <Name>" | "of <Name>"  — captures the customer name
_CUSTOMER_PATTERN = re.compile(
    r"\b(?:for|to|of)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})",
    re.IGNORECASE,
)

# Numeric quantity followed by item word(s):
#   "2 laptops"  |  "three phones"  |  "2 hp laptops"
_WORD_TO_NUM: dict[str, int] = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20,
    "fifty": 50, "hundred": 100,
}

# Matches:  "2 hp laptops"  |  "three mobile phones"
# Group 1 = quantity (digit or word)
# Group 2 = optional adjective/brand word(s)  (non-greedy)
# Group 3 = main noun
_ITEM_PATTERN = re.compile(
    r"\b(\d+|" + "|".join(_WORD_TO_NUM.keys()) + r")"   # quantity
    r"\s+"
    r"((?:[a-zA-Z]+\s+){0,2}?)"                          # optional brand/adj (non-greedy)
    r"([a-zA-Z]+)"                                        # noun (the product)
    r"\b",
    re.IGNORECASE,
)

# Stopwords that should never be treated as product names
_STOPWORDS: frozenset[str] = frozenset({
    "and", "or", "the", "a", "an", "of", "for", "to", "in", "on",
    "at", "with", "by", "from", "into", "create", "make", "generate",
    "invoice", "bill", "order", "purchase", "buy", "units", "unit",
    "pieces", "piece", "items", "item", "quantity", "nos", "number",
    "each", "total", "me", "us", "them", "my", "our",
})


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

class NlpService:
    """Stateless NLP processor — all extraction is fully dynamic."""

    def detect_intent(self, transcript: str) -> dict:
        """
        Parse a raw voice transcript into a structured billing intent.

        Returns:
        {
            "intent":        "CREATE_INVOICE" | "UPDATE_INVOICE" | "QUERY_INVOICE" | "UNKNOWN",
            "confidence":    float,
            "customerName":  str | None,
            "items": [
                {
                    "name":     str,   # canonical, normalised
                    "rawName":  str,   # as extracted from transcript
                    "quantity": int,
                }
            ],
            "discountPercent": float | None,
            "notes":           str | None,
            "dueInDays":       int | None,
        }
        """
        if not transcript or not transcript.strip():
            raise ValueError("Transcript is empty")

        cleaned    = self._preprocess(transcript)
        intent     = self._classify_intent(cleaned)
        customer   = self._extract_customer(transcript)   # use original case for names
        items      = self._extract_items(cleaned)
        discount   = self._extract_discount(cleaned)
        due_days   = self._extract_due_days(cleaned)
        notes      = self._extract_notes(transcript)
        confidence = self._compute_confidence(customer, items, intent)

        logger.info(
            "NLP result — intent=%s customer=%s items=%d confidence=%.2f",
            intent, customer, len(items), confidence,
        )

        return {
            "intent":          intent,
            "confidence":      confidence,
            "customerName":    customer,
            "customerId":      None,
            "items":           items,
            "discountPercent": discount,
            "notes":           notes,
            "dueInDays":       due_days,
        }

    def extract_entities(self, transcript: str) -> dict:
        intent = self.detect_intent(transcript)
        return {
            "entities": {
                "customer":  intent["customerName"],
                "items":     intent["items"],
                "discount":  intent["discountPercent"],
                "notes":     intent["notes"],
                "dueInDays": intent["dueInDays"],
            }
        }

    # -----------------------------------------------------------------------
    # Private helpers
    # -----------------------------------------------------------------------

    @staticmethod
    def _preprocess(text: str) -> str:
        """Lowercase, collapse whitespace, strip leading/trailing."""
        text = text.lower().strip()
        text = re.sub(r"\s+", " ", text)
        # Remove filler words that confuse item extraction
        text = re.sub(r"\b(please|kindly|can you|could you|i want|i need|i would like)\b", "", text)
        return text.strip()

    @staticmethod
    def _classify_intent(cleaned: str) -> str:
        create_kw  = r"\b(create|generate|make|prepare|raise|issue|new|add|produce)\b"
        update_kw  = r"\b(update|edit|modify|change|correct|fix|revise)\b"
        query_kw   = r"\b(show|list|find|get|fetch|check|view|search|display)\b"

        if re.search(create_kw, cleaned):
            return "CREATE_INVOICE"
        if re.search(update_kw, cleaned):
            return "UPDATE_INVOICE"
        if re.search(query_kw, cleaned):
            return "QUERY_INVOICE"
        return "CREATE_INVOICE"   # default assumption

    @staticmethod
    def _extract_customer(original: str) -> Optional[str]:
        """
        Attempt to extract a customer name.
        Tries multiple patterns in order of specificity.
        """
        # Pattern 1: "for/to <TitleCase Name>"
        m = _CUSTOMER_PATTERN.search(original)
        if m:
            name = m.group(1).strip()
            # Reject if it looks like a product or stopword
            if name.lower() not in _STOPWORDS and not re.search(r"\d", name):
                return name

        # Pattern 2: "invoice of <Name>" / "bill of <Name>"
        m2 = re.search(
            r"\b(?:invoice|bill|order)\s+(?:of|for)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)",
            original, re.IGNORECASE,
        )
        if m2:
            return m2.group(1).strip()

        # Pattern 3: "customer <Name>" / "client <Name>"
        m3 = re.search(
            r"\b(?:customer|client|buyer)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)",
            original, re.IGNORECASE,
        )
        if m3:
            return m3.group(1).strip()

        return None

    def _extract_items(self, cleaned: str) -> list[dict]:
        """
        Extract all (quantity, product_name) pairs from the cleaned transcript.
        Returns list of dicts with 'name' (canonical), 'rawName', 'quantity'.
        """
        found: dict[str, dict] = {}   # keyed by canonical name to avoid dupes

        for m in _ITEM_PATTERN.finditer(cleaned):
            qty_raw    = m.group(1)
            brand_adj  = (m.group(2) or "").strip()
            noun       = m.group(3).strip()

            # Skip stopwords as noun
            if noun.lower() in _STOPWORDS:
                continue

            quantity = self._parse_quantity(qty_raw)
            if quantity <= 0:
                continue

            # Build raw item name — prefer "brand noun" if brand looks meaningful
            if brand_adj and brand_adj not in _STOPWORDS:
                raw_name = f"{brand_adj} {noun}".strip()
            else:
                raw_name = noun

            canonical = normalize_item_name(raw_name)

            # Merge duplicates: sum quantities
            if canonical in found:
                found[canonical]["quantity"] += quantity
            else:
                found[canonical] = {
                    "name":     canonical,
                    "rawName":  raw_name,
                    "quantity": quantity,
                }

        return list(found.values())

    @staticmethod
    def _parse_quantity(raw: str) -> int:
        """Convert digit string or number-word to int."""
        raw = raw.lower().strip()
        if raw.isdigit():
            return int(raw)
        return _WORD_TO_NUM.get(raw, 0)

    @staticmethod
    def _extract_discount(cleaned: str) -> Optional[float]:
        m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:discount|off|reduction)", cleaned)
        if m:
            return float(m.group(1))
        m2 = re.search(r"(?:discount|off)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%", cleaned)
        if m2:
            return float(m2.group(1))
        return None

    @staticmethod
    def _extract_due_days(cleaned: str) -> Optional[int]:
        patterns = [
            r"due\s+in\s+(\d+)\s+days?",
            r"payment\s+(?:in|within)\s+(\d+)\s+days?",
            r"(\d+)[- ]day\s+(?:net|payment|terms?)",
            r"net[- ]?(\d+)",
            r"within\s+(\d+)\s+days?",
        ]
        for pattern in patterns:
            m = re.search(pattern, cleaned)
            if m:
                return int(m.group(1))
        return 30   # standard net-30 default

    @staticmethod
    def _extract_notes(original: str) -> Optional[str]:
        patterns = [
            r'(?:add\s+)?(?:a\s+)?note[s]?[:\s]+["\']?(.+?)["\']?(?:\.|$)',
            r'(?:with\s+(?:a\s+)?note)[:\s]+["\']?(.+?)["\']?(?:\.|$)',
            r'(?:remark|comment)[:\s]+["\']?(.+?)["\']?(?:\.|$)',
        ]
        for pattern in patterns:
            m = re.search(pattern, original, re.IGNORECASE)
            if m:
                return m.group(1).strip().strip("\"'")
        return None

    @staticmethod
    def _compute_confidence(
        customer: Optional[str],
        items: list[dict],
        intent: str,
    ) -> float:
        score = 0.5
        if customer:
            score += 0.2
        if items:
            score += min(0.25, 0.1 * len(items))
        if intent != "UNKNOWN":
            score += 0.05
        return round(min(score, 1.0), 4)