"""Download PEP junior/senior math and file by grade into 五十五中."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from catalog import load_catalog
from download import download_book
from merge import merge_all
from paths import PDF_ROOT, REPO_ROOT


def resolve_dest() -> Path:
    desktop = Path(r"D:\Desktop\五十五中")
    if desktop.parent.exists():
        return desktop
    return REPO_ROOT / "五十五中"


DEST_ROOT = resolve_dest()

FOLDER_ORDER = [
    "初中数学-人教版/七年级",
    "初中数学-人教版/八年级",
    "初中数学-人教版/九年级",
    "初中数学-人教版-五四学制/六年级",
    "初中数学-人教版-五四学制/七年级",
    "初中数学-人教版-五四学制/八年级",
    "初中数学-人教版-五四学制/九年级",
    "高中数学-人教A版/高一",
    "高中数学-人教A版/高二",
    "高中数学-人教B版/高一",
    "高中数学-人教B版/高二",
]


def pick_books(catalog: dict) -> list[dict]:
    chosen = []
    for book in catalog["books"]:
        if book["subject"] != "数学":
            continue
        pub = book["publisher"]
        stage = book["stage"]
        if stage == "高中" and ("人教版（A版）" in pub or "人教版（B版）" in pub):
            chosen.append(book)
        elif stage == "初中" and pub == "人教版-人民教育出版社":
            chosen.append(book)
        elif stage == "初中（五•四学制）" and pub == "人教版-人民教育出版社":
            chosen.append(book)
    return chosen


def grade_folder_and_name(book: dict) -> tuple[str, str]:
    title = book["title"]
    pub = book["publisher"]
    stage = book["stage"]

    if stage == "初中":
        for grade in ("七年级", "八年级", "九年级"):
            if grade in title:
                half = "上册" if "上册" in title else "下册"
                return f"初中数学-人教版/{grade}", f"数学{grade}{half}.pdf"
    if stage == "初中（五•四学制）":
        for grade in ("六年级", "七年级", "八年级", "九年级"):
            if grade in title:
                half = "上册" if "上册" in title else "下册"
                return f"初中数学-人教版-五四学制/{grade}", f"数学{grade}{half}-五四学制.pdf"

    if "人教版（A版）" in pub:
        edition = "高中数学-人教A版"
        if "选择性必修" in title:
            number = "第三册" if "第三册" in title else "第二册" if "第二册" in title else "第一册"
            return f"{edition}/高二", f"数学A版-选择性必修{number}.pdf"
        number = "第二册" if "第二册" in title else "第一册"
        return f"{edition}/高一", f"数学A版-必修{number}.pdf"

    if "人教版（B版）" in pub:
        edition = "高中数学-人教B版"
        if "选择性必修" in title:
            number = "第三册" if "第三册" in title else "第二册" if "第二册" in title else "第一册"
            return f"{edition}/高二", f"数学B版-选择性必修{number}.pdf"
        for number in ("第四册", "第三册", "第二册", "第一册"):
            if number in title:
                return f"{edition}/高一", f"数学B版-必修{number}.pdf"

    raise ValueError(f"无法归类：{book['path']}")


def write_index(entries: list[tuple[str, str, int]]) -> None:
    total_mb = sum(size for _, _, size in entries) / 1024 / 1024
    lines = [
        "五十五中 · 人教版数学课本",
        "",
        "按年级分好的书架。目标位置：",
        r"D:\Desktop\五十五中",
        "",
        f"一共 {len(entries)} 本，大约 {total_mb:.0f} MB。",
        "",
    ]
    grouped: dict[str, list[tuple[str, int]]] = {}
    for folder, name, size in entries:
        grouped.setdefault(folder, []).append((name, size))
    for folder in FOLDER_ORDER:
        if folder not in grouped:
            continue
        lines.append(folder.replace("/", "  /  "))
        for name, size in sorted(grouped[folder]):
            lines.append(f"  · {name}    {size / 1024 / 1024:.1f} MB")
        lines.append("")
    (DEST_ROOT / "目录.txt").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    catalog = load_catalog()
    books = pick_books(catalog)
    print(f"准备 {len(books)} 册")
    DEST_ROOT.mkdir(parents=True, exist_ok=True)
    entries = []
    for book in books:
        folder, name = grade_folder_and_name(book)
        print(f"↓ {name}")
        download_book(book)
        merge_all()
        src = PDF_ROOT / book["path"]
        if not src.exists():
            raise FileNotFoundError(src)
        dest_dir = DEST_ROOT / folder
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / name
        shutil.copy2(src, dest)
        entries.append((folder, name, dest.stat().st_size))
        print(f"  -> {dest.relative_to(DEST_ROOT)} ({dest.stat().st_size / 1024 / 1024:.1f} MB)")
    write_index(entries)
    (DEST_ROOT / "status.json").write_text(
        json.dumps({"books": len(entries), "root": str(DEST_ROOT)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"完成：{DEST_ROOT}")


if __name__ == "__main__":
    main()
