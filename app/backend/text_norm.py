import unicodedata, re

STOP_CHARS = r"[^A-Z0-9\s]"
SPACE_RE = re.compile(r"\s+")

def normalize_name(name: str) -> str:
    if name is None:
        return ""
    s = unicodedata.normalize("NFKD", name).encode("ASCII", "ignore").decode("ASCII")
    s = s.upper()
    s = re.sub(STOP_CHARS, " ", s)
    s = SPACE_RE.sub(" ", s).strip()
    return s
