"""Local cache layout for ChinaTextbook. PDFs stay out of git."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOL_ROOT = Path(__file__).resolve().parent
DATA_DIR = TOOL_ROOT / "data"
CATALOG_JSON = DATA_DIR / "catalog.json"
CATALOG_MD = DATA_DIR / "catalog.md"

LOCAL_ROOT = REPO_ROOT / "textbook"
PDF_ROOT = LOCAL_ROOT / "pdfs"
TEXT_ROOT = LOCAL_ROOT / "text"
STATUS_JSON = LOCAL_ROOT / "status.json"

UPSTREAM_REPO = "TapXWorld/ChinaTextbook"
UPSTREAM_BRANCH = "master"
UPSTREAM_URL = f"https://github.com/{UPSTREAM_REPO}"
RAW_BASE = f"https://raw.githubusercontent.com/{UPSTREAM_REPO}/{UPSTREAM_BRANCH}"


def ensure_local_dirs() -> None:
    for path in (PDF_ROOT, TEXT_ROOT, DATA_DIR):
        path.mkdir(parents=True, exist_ok=True)
