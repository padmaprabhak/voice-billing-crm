"""
Canonical synonym map — covers ALL product categories, not just electronics.
"""
from __future__ import annotations

SYNONYM_MAP: dict[str, str] = {
    # ── Mobile / Phone ───────────────────────────────────────────────
    "phone": "mobile", "phones": "mobile", "cellphone": "mobile",
    "cellphones": "mobile", "smartphone": "mobile", "smartphones": "mobile",
    "handset": "mobile", "handsets": "mobile", "iphone": "mobile",
    "android": "mobile", "moves": "mobile",   # STT mishear fix

    # ── Laptop ───────────────────────────────────────────────────────
    "laptop": "laptop", "laptops": "laptop", "notebook": "laptop",
    "notebooks": "laptop", "chromebook": "laptop", "chromebooks": "laptop",

    # ── Desktop ──────────────────────────────────────────────────────
    "desktop": "desktop", "desktops": "desktop", "pc": "desktop",
    "computer": "desktop", "computers": "desktop",

    # ── Television ───────────────────────────────────────────────────
    "tv": "television", "tvs": "television", "telly": "television",
    "television": "television", "televisions": "television",

    # ── Tablet ───────────────────────────────────────────────────────
    "tablet": "tablet", "tablets": "tablet",
    "ipad": "tablet", "ipads": "tablet",

    # ── Audio ────────────────────────────────────────────────────────
    "headphone": "headphone", "headphones": "headphone",
    "earphone": "headphone",  "earphones": "headphone",
    "earbud": "headphone",    "earbuds": "headphone",
    "airpod": "headphone",    "airpods": "headphone",
    "speaker": "speaker",     "speakers": "speaker",

    # ── Camera ───────────────────────────────────────────────────────
    "camera": "camera", "cameras": "camera", "dslr": "camera",

    # ── Peripherals ──────────────────────────────────────────────────
    "printer": "printer",   "printers": "printer",
    "keyboard": "keyboard", "keyboards": "keyboard",
    "mouse": "mouse",       "mice": "mouse",
    "monitor": "monitor",   "monitors": "monitor",
    "screen": "monitor",    "display": "monitor",

    # ── Networking ───────────────────────────────────────────────────
    "router": "router",  "routers": "router",
    "modem": "modem",    "modems": "modem",

    # ── Storage ──────────────────────────────────────────────────────
    "harddisk": "hard disk", "harddrive": "hard disk",
    "hdd": "hard disk",      "ssd": "ssd",
    "pendrive": "pen drive",  "usb": "pen drive",
    "flashdrive": "pen drive",

    # ── Accessories ──────────────────────────────────────────────────
    "charger": "charger", "chargers": "charger",
    "cable": "cable",     "cables": "cable",
    "adapter": "adapter", "adapters": "adapter",
    "cover": "cover",     "case": "cover",
    "powerbank": "power bank", "power bank": "power bank",
    "battery": "battery", "batteries": "battery",

    # ── Furniture ────────────────────────────────────────────────────
    "chair": "chair",   "chairs": "chair",
    "table": "table",   "tables": "table",
    "desk": "desk",     "desks": "desk",
    "shelf": "shelf",   "shelves": "shelf",
    "cabinet": "cabinet", "cabinets": "cabinet",
    "sofa": "sofa",     "sofas": "sofa",
    "bed": "bed",       "beds": "bed",
    "cupboard": "cupboard", "wardrobe": "wardrobe",

    # ── Stationery / Office ───────────────────────────────────────────
    "pen": "pen",       "pens": "pen",
    "pencil": "pencil", "pencils": "pencil",
    "notebook": "notebook",
    "paper": "paper",   "papers": "paper",
    "stapler": "stapler", "staplers": "stapler",
    "scissors": "scissors",
    "folder": "folder", "folders": "folder",
    "file": "file",     "files": "file",

    # ── Clothing / Textiles ───────────────────────────────────────────
    "shirt": "shirt",   "shirts": "shirt",
    "trouser": "trouser", "trousers": "trouser",
    "pant": "trouser",  "pants": "trouser",
    "dress": "dress",   "dresses": "dress",
    "saree": "saree",   "sarees": "saree",
    "kurta": "kurta",   "kurtas": "kurta",
    "jacket": "jacket", "jackets": "jacket",
    "shoe": "shoe",     "shoes": "shoe",
    "sandal": "sandal", "sandals": "sandal",
    "bag": "bag",       "bags": "bag",

    # ── Food / Grocery ────────────────────────────────────────────────
    "rice": "rice",     "wheat": "wheat",
    "flour": "flour",   "sugar": "sugar",
    "oil": "oil",       "salt": "salt",
    "dal": "dal",       "milk": "milk",
    "butter": "butter", "cheese": "cheese",

    # ── Hardware / Tools ─────────────────────────────────────────────
    "hammer": "hammer", "hammers": "hammer",
    "drill": "drill",   "drills": "drill",
    "screw": "screw",   "screws": "screw",
    "bolt": "bolt",     "bolts": "bolt",
    "pipe": "pipe",     "pipes": "pipe",
    "wire": "wire",     "wires": "wire",

    # ── Medical / Pharma ─────────────────────────────────────────────
    "tablet": "tablet",   # also a tablet (pill) — context decides
    "medicine": "medicine", "medicines": "medicine",
    "syrup": "syrup",     "syringes": "syringe",
    "glove": "glove",     "gloves": "glove",
    "mask": "mask",       "masks": "mask",

    # ── Vehicles / Parts ─────────────────────────────────────────────
    "tyre": "tyre",    "tyres": "tyre",
    "tire": "tyre",    "tires": "tyre",
    "battery": "battery",
    "engine": "engine", "engines": "engine",

    # ── Services ─────────────────────────────────────────────────────
    "service": "service", "services": "service",
    "repair": "repair",   "maintenance": "maintenance",
    "installation": "installation", "consultation": "consultation",
    "design": "design",   "development": "development",
    "training": "training",
}


def resolve_synonym(word: str) -> str:
    clean = word.lower().strip()
    return SYNONYM_MAP.get(clean, clean)


def normalize_item_name(raw: str) -> str:
    """
    Normalize a raw extracted item name:
      1. Lowercase and strip
      2. Try full phrase in synonym map
      3. Try de-pluralised word
      4. Return as-is (still useful for fuzzy DB matching)
    """
    token = raw.lower().strip()

    if token in SYNONYM_MAP:
        return SYNONYM_MAP[token]

    # Try simple de-pluralisation
    if token.endswith("s") and not token.endswith("ss") and len(token) > 3:
        singular = token[:-1]
        if singular in SYNONYM_MAP:
            return SYNONYM_MAP[singular]
        # Return singular for cleaner fuzzy matching
        return singular

    return token