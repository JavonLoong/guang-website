"""Download selected textbooks from GitHub without cloning the 43GB repo."""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from catalog import format_size
from paths import PDF_ROOT, RAW_BASE, STATUS_JSON, ensure_local_dirs


class DownloadError(RuntimeError):
    pass


def raw_url(relative_path: str) -> str:
    encoded = "/".join(urllib.parse.quote(part, safe="") for part in relative_path.split("/"))
    return f"{RAW_BASE}/{encoded}"


def local_pdf_path(relative_path: str) -> Path:
    return PDF_ROOT / relative_path


def file_complete(path: Path, expected_size: int | None = None) -> bool:
    if not path.exists() or path.stat().st_size <= 0:
        return False
    if expected_size is not None and expected_size > 0 and path.stat().st_size != expected_size:
        return False
    return True


def download_file(relative_path: str, expected_size: int | None = None, timeout: int = 180) -> Path:
    ensure_local_dirs()
    dest = local_pdf_path(relative_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if file_complete(dest, expected_size):
        return dest

    url = raw_url(relative_path)
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "guang-website-china-textbook-downloader"},
    )
    tmp = dest.with_suffix(dest.suffix + ".part")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response, tmp.open("wb") as handle:
            while True:
                chunk = response.read(1024 * 256)
                if not chunk:
                    break
                handle.write(chunk)
        if expected_size and tmp.stat().st_size != expected_size:
            raise DownloadError(
                f"{relative_path} 下载大小不符：得到 {tmp.stat().st_size}，期望 {expected_size}"
            )
        tmp.replace(dest)
    except Exception:
        if tmp.exists():
            tmp.unlink()
        raise
    return dest


def load_status() -> dict:
    if STATUS_JSON.exists():
        return json.loads(STATUS_JSON.read_text(encoding="utf-8"))
    return {"books": {}}


def save_status(status: dict) -> None:
    ensure_local_dirs()
    STATUS_JSON.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")


def download_book(book: dict, pause: float = 0.15) -> list[Path]:
    saved = []
    if book["kind"] == "split":
        # Split parts do not include per-file sizes in the catalog; skip exact size check.
        for relative in book["files"]:
            path = download_file(relative)
            saved.append(path)
            time.sleep(pause)
    else:
        path = download_file(book["files"][0], expected_size=book.get("size_bytes"))
        saved.append(path)
    status = load_status()
    status["books"][book["path"]] = {
        "title": book["title"],
        "downloaded": True,
        "kind": book["kind"],
        "files": [str(path.relative_to(PDF_ROOT)) for path in saved],
        "size_bytes": book["size_bytes"],
    }
    save_status(status)
    return saved


def summarize_selection(books: list[dict]) -> str:
    total = sum(book["size_bytes"] for book in books)
    return f"{len(books)} 册，约 {format_size(total)}"
