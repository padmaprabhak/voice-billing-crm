"""
Canonical synonym map.
Keys   → variants spoken by users
Values → canonical product name sent to backend for DB matching
All keys and values are lowercase.
"""

SYNONYM_MAP: dict[str, str] = {
    # Mobile / Phone
    "phone":        "mobile",
    "phones":       "mobile",
    "cellphone":    "mobile",
    "cellphones":   "mobile",
    "smartphone":   "mobile",
    "smartphones":  "mobile",
    "handset":      "mobile",
    "handsets":     "mobile",
    "iphone":       "mobile",
    "android":      "mobile",

    # Laptop / Computer
    "laptop":       "laptop",
    "laptops":      "laptop",
    "notebook":     "laptop",
    "notebooks":    "laptop",
    "chromebook":   "laptop",
    "chromebooks":  "laptop",

    # Desktop
    "desktop":      "desktop",
    "desktops":     "desktop",
    "pc":           "desktop",
    "computer":     "desktop",
    "computers":    "desktop",
    "tower":        "desktop",

    # Television
    "tv":           "television",
    "tvs":          "television",
    "television":   "television",
    "televisions":  "television",
    "telly":        "television",

    # Tablet
    "tablet":       "tablet",
    "tablets":      "tablet",
    "ipad":         "tablet",
    "ipads":        "tablet",

    # Headphones / Audio
    "headphone":    "headphone",
    "headphones":   "headphone",
    "earphone":     "headphone",
    "earphones":    "headphone",
    "earbud":       "headphone",
    "earbuds":      "headphone",
    "airpod":       "headphone",
    "airpods":      "headphone",

    # Camera
    "camera":       "camera",
    "cameras":      "camera",
    "dslr":         "camera",

    # Printer
    "printer":      "printer",
    "printers":     "printer",

    # Keyboard / Mouse
    "keyboard":     "keyboard",
    "keyboards":    "keyboard",
    "mouse":        "mouse",
    "mice":         "mouse",

    # Monitor
    "monitor":      "monitor",
    "monitors":     "monitor",
    "screen":       "monitor",
    "display":      "monitor",

    # Router / Networking
    "router":       "router",
    "routers":      "router",
    "wifi":         "router",
    "modem":        "modem",
    "modems":       "modem",

    # Storage
    "harddisk":     "hard disk",
    "harddrive":    "hard disk",
    "hdd":          "hard disk",
    "ssd":          "ssd",
    "pendrive":     "pen drive",
    "usb":          "pen drive",
    "flashdrive":   "pen drive",

    # Accessories
    "charger":      "charger",
    "chargers":     "charger",
    "cable":        "cable",
    "cables":       "cable",
    "adapter":      "adapter",
    "adapters":     "adapter",
    "cover":        "cover",
    "case":         "cover",
    "powerbank":    "power bank",
    "battery":      "battery",
    "batteries":    "battery",

    # Furniture
    "chair":        "chair",
    "chairs":       "chair",
    "table":        "table",
    "tables":       "table",
    "desk":         "desk",
    "desks":        "desk",

    # Stationery
    "pen":          "pen",
    "pens":         "pen",
    "pencil":       "pencil",
    "pencils":      "pencil",
    "notebook":     "notebook",
    "notebooks":    "notebook",
    "paper":        "paper",
    "stapler":      "stapler",
    "staplers":     "stapler",
}


def resolve_synonym(word: str) -> str:
    """
    Return canonical product name for a given word.
    Falls through to the original word if no synonym found.
    """
    clean = word.lower().strip()
    return SYNONYM_MAP.get(clean, clean)


def normalize_item_name(raw: str) -> str:
    """
    Normalize a raw extracted item name:
      1. lowercase
      2. strip whitespace
      3. remove trailing 's' for simple plurals not in synonym map
      4. resolve through synonym map
    """
    token = raw.lower().strip()

    # First try exact synonym lookup
    if token in SYNONYM_MAP:
        return SYNONYM_MAP[token]

    # Try naive de-pluralisation (only for words ending in 's' not 'ss')
    if token.endswith("s") and not token.endswith("ss") and len(token) > 3:
        singular = token[:-1]
        if singular in SYNONYM_MAP:
            return SYNONYM_MAP[singular]
        # Return singular if still no match
        return singular

    return token