"""Rebuild split PDFs the same way upstream mergePDFs.go does: binary concat."""

from __future__ import annotations

from pathlib import Path

from paths import PDF_ROOT


def is_split_part(path: Path) -> bool:
    name = path.name.lower()
    return ".pdf." in name and not name.endswith(".pdf")


def discover_split_groups(root: Path | None = None) -> dict[Path, list[Path]]:
    root = root or PDF_ROOT
    grouped: dict[Path, list[Path]] = {}
    if not root.exists():
        return grouped
    for path in root.rglob("*"):
        if not path.is_file() or not is_split_part(path):
            continue
        base_name = path.name.split(".pdf.")[0] + ".pdf"
        merged = path.with_name(base_name)
        grouped.setdefault(merged, []).append(path)
    for merged, parts in grouped.items():
        parts.sort(key=lambda item: item.name)
    return grouped


def merge_group(merged: Path, parts: list[Path], delete_parts: bool = True) -> Path:
    merged.parent.mkdir(parents=True, exist_ok=True)
    tmp = merged.with_suffix(merged.suffix + ".merging")
    with tmp.open("wb") as out:
        for part in parts:
            with part.open("rb") as handle:
                while True:
                    chunk = handle.read(1024 * 1024)
                    if not chunk:
                        break
                    out.write(chunk)
    tmp.replace(merged)
    if delete_parts:
        for part in parts:
            part.unlink(missing_ok=True)
    return merged


def merge_all(root: Path | None = None, delete_parts: bool = True) -> list[Path]:
    merged_paths = []
    for merged, parts in discover_split_groups(root).items():
        if merged.exists() and all(not part.exists() for part in parts):
            continue
        merged_paths.append(merge_group(merged, parts, delete_parts=delete_parts))
    return merged_paths
