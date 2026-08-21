"""把人教版初中数学（含五四学制）下载到 55中 书架，并按年级放好。"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from catalog import load_catalog, format_size  # noqa: E402
from download import download_book  # noqa: E402
from merge import merge_all  # noqa: E402
from paths import PDF_ROOT, REPO_ROOT  # noqa: E402

SHELF_ROOT = REPO_ROOT / "55中" / "数学"
GRADES = ("六年级", "七年级", "八年级", "九年级")
SHELF_INDEX = REPO_ROOT / "55中" / "书架目录.md"


def is_pep_junior_math(book: dict) -> bool:
    if book.get("subject") != "数学":
        return False
    if "人教版" not in book.get("publisher", "") and "人教版" not in book.get("path", ""):
        return False
    stage = book.get("stage", "")
    return stage == "初中" or stage.startswith("初中")


def grade_of(book: dict) -> str | None:
    blob = book["title"] + book["path"]
    for grade in GRADES:
        if grade in blob:
            return grade
    return None


def term_of(book: dict) -> str:
    blob = book["title"]
    if "上册" in blob:
        return "上册"
    if "下册" in blob:
        return "下册"
    if "全一册" in blob:
        return "全一册"
    return "全册"


def is_54(book: dict) -> bool:
    blob = book["stage"] + book["title"] + book["path"]
    return "五四" in blob or "五•四" in blob or "五·四" in blob


def shelf_name(book: dict) -> str:
    grade = grade_of(book) or "未分年级"
    term = term_of(book)
    if is_54(book):
        return f"人教版·五四学制·{grade}{term}.pdf"
    return f"人教版·{grade}{term}.pdf"


def selected_books() -> list[dict]:
    catalog = load_catalog()
    books = [book for book in catalog["books"] if is_pep_junior_math(book)]
    books.sort(key=lambda book: (GRADES.index(grade_of(book) or "九年级"), 0 if not is_54(book) else 1, term_of(book)))
    return books


def copy_to_shelf(book: dict) -> Path:
    grade = grade_of(book)
    if not grade:
        raise RuntimeError(f"看不出年级：{book['path']}")
    dest_dir = SHELF_ROOT / grade
    dest_dir.mkdir(parents=True, exist_ok=True)
    src = PDF_ROOT / book["path"]
    dest = dest_dir / shelf_name(book)
    shutil.copy2(src, dest)
    return dest


def write_index(copied: list[tuple[dict, Path]]) -> None:
    lines = [
        "# 55中 · 数学书架",
        "",
        "这里只放**人教版初中数学**。普通初中（六三学制）和五四学制都有。",
        "打开对应年级的文件夹就能看到书。",
        "",
        f"现在架子上有 {len(copied)} 本。",
        "",
    ]
    by_grade: dict[str, list[tuple[dict, Path]]] = {grade: [] for grade in GRADES}
    for book, path in copied:
        grade = grade_of(book)
        if grade:
            by_grade[grade].append((book, path))
    for grade in GRADES:
        items = by_grade[grade]
        if not items:
            continue
        lines.append(f"## {grade}")
        lines.append("")
        for book, path in items:
            label = "五四学制" if is_54(book) else "普通初中"
            size = format_size(path.stat().st_size)
            lines.append(f"- {path.name}（{label}，{size}）")
        lines.append("")
    SHELF_INDEX.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    books = selected_books()
    if not books:
        raise SystemExit("目录里没有找到人教版初中数学。")
    print(f"准备请 {len(books)} 本书进 55中 书架")
    copied = []
    for book in books:
        print(f"↓ {book['title']} ({format_size(book['size_bytes'])})")
        download_book(book)
    merge_all()
    for book in books:
        dest = copy_to_shelf(book)
        copied.append((book, dest))
        print(f"→ {dest.relative_to(REPO_ROOT)}")
    write_index(copied)
    status = {"books": [str(path.relative_to(REPO_ROOT)) for _, path in copied]}
    (REPO_ROOT / "55中" / "status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"完成。书架目录：{SHELF_INDEX}")


if __name__ == "__main__":
    main()
