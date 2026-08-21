#!/usr/bin/env python3
"""ChinaTextbook local helper: catalog, sparse download, merge, extract, search."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from catalog import format_size, load_catalog, match_books, refresh_catalog  # noqa: E402
from download import download_book, summarize_selection  # noqa: E402
from extract import extract_book, text_dir_for  # noqa: E402
from merge import merge_all  # noqa: E402
from paths import CATALOG_MD, PDF_ROOT, TEXT_ROOT  # noqa: E402


def die(message: str, code: int = 1) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(code)


def print_books(books: list[dict], limit: int | None = None) -> None:
    shown = books if limit is None else books[:limit]
    for book in shown:
        flag = f"split×{book['part_count']}" if book["kind"] == "split" else book["ext"]
        print(f"{format_size(book['size_bytes']):>8}  {flag:<10}  {book['path']}")
    if limit is not None and len(books) > limit:
        print(f"... 还有 {len(books) - limit} 册，请把 --query 写得更具体，或加 --all")


def cmd_refresh(_args: argparse.Namespace) -> None:
    token = os.environ.get("GITHUB_TOKEN")
    catalog = refresh_catalog(token)
    stats = catalog["stats"]
    print(f"已更新目录：{stats['books']} 册，约 {format_size(stats['total_bytes'])}")
    print(f"- {CATALOG_MD}")


def cmd_list(args: argparse.Namespace) -> None:
    catalog = load_catalog()
    books = match_books(catalog, query=args.query, stage=args.stage, subject=args.subject)
    print(summarize_selection(books))
    print_books(books, limit=None if args.all else args.limit)


def cmd_download(args: argparse.Namespace) -> None:
    catalog = load_catalog()
    books = match_books(catalog, query=args.query, stage=args.stage, subject=args.subject)
    if not books:
        die("没有匹配到教材，换个关键词试试。先看 tools/china-textbook/data/catalog.md")
    if not args.all and len(books) > args.limit:
        print(summarize_selection(books))
        print_books(books, limit=args.limit)
        die(f"匹配到 {len(books)} 册。请把 --query 写得更窄，或显式加上 --all（小心体积）。")
    total = sum(book["size_bytes"] for book in books)
    if total > args.max_mb * 1024 * 1024 and not args.force:
        die(
            f"即将下载 {summarize_selection(books)}，超过 --max-mb {args.max_mb}。"
            "确认后加 --force，或先缩小范围。"
        )
    print(f"开始下载 {summarize_selection(books)}")
    for book in books:
        print(f"↓ {book['path']} ({format_size(book['size_bytes'])})")
        download_book(book)
    merged = merge_all()
    if merged:
        print(f"已合并 {len(merged)} 个分卷 PDF")
    print(f"PDF 目录：{PDF_ROOT}")


def cmd_merge(_args: argparse.Namespace) -> None:
    merged = merge_all()
    if not merged:
        print("没有待合并的分卷。")
        return
    for path in merged:
        print(f"merged {path}")


def cmd_extract(args: argparse.Namespace) -> None:
    catalog = load_catalog()
    books = match_books(catalog, query=args.query, stage=args.stage, subject=args.subject)
    if not books:
        die("没有匹配到教材。")
    if not args.all and len(books) > args.limit:
        print_books(books, limit=args.limit)
        die(f"匹配到 {len(books)} 册，请缩小 --query 或加 --all。")
    for book in books:
        pdf_path = PDF_ROOT / book["path"]
        if not pdf_path.exists():
            print(f"skip (未下载): {book['path']}")
            continue
        print(f"抽取 {book['title']} ...")
        result = extract_book(
            book,
            ocr=getattr(args, "ocr", False),
            pages=getattr(args, "pages", None),
        )
        if result["ocr"]:
            state = f"OCR {result['chars']} 字 / {result['pages']} 页"
        elif result["scanned"]:
            state = "扫描件，无文字层。请加 --ocr"
        else:
            state = f"{result['pages']} 页 / {result['chars']} 字"
        print(f"✓ {book['title']}  [{state}]")
        print(f"  {result['text_dir']}")


def cmd_prepare(args: argparse.Namespace) -> None:
    cmd_download(args)
    cmd_extract(args)


def cmd_search(args: argparse.Namespace) -> None:
    if not TEXT_ROOT.exists():
        die("还没有抽取结果。先运行 prepare。")
    needle = args.query
    hits = 0
    for path in sorted(TEXT_ROOT.rglob("*.md")):
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        lines = text.splitlines()
        for lineno, line in enumerate(lines, start=1):
            if needle.lower() in line.lower():
                print(f"{path}:{lineno}:{line.strip()}")
                hits += 1
                if hits >= args.max_hits:
                    print(f"已显示 {hits} 条，后面省略。")
                    return
    print(f"共 {hits} 条。" if hits else "没有命中。可以换关键词，或确认这本书已经 prepare 过。")


def cmd_status(_args: argparse.Namespace) -> None:
    catalog = load_catalog()
    print(f"上游目录：{catalog['stats']['books']} 册，约 {format_size(catalog['stats']['total_bytes'])}")
    print(f"清单：{CATALOG_MD}")
    pdfs = list(PDF_ROOT.rglob("*.pdf")) if PDF_ROOT.exists() else []
    texts = (
        [path for path in TEXT_ROOT.rglob("README.md") if path != TEXT_ROOT / "README.md"]
        if TEXT_ROOT.exists()
        else []
    )
    print(f"本地 PDF：{len(pdfs)} 个，根目录 {PDF_ROOT}")
    print(f"已抽取教材：{len(texts)} 册，根目录 {TEXT_ROOT}")
    if not pdfs and not texts:
        print("还是空的。示例：")
        print('  python3 tools/china-textbook/cli.py prepare --query "线性代数" --ocr --pages 1-20')


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="把 ChinaTextbook 配到本机，并抽成 AI 能高效阅读的 Markdown。不要整库 43GB 克隆。"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("refresh", help="从 GitHub 刷新文件清单")
    sub.add_parser("status", help="看本地下载/抽取进度")
    sub.add_parser("merge", help="合并 textbook/pdfs 下的 .pdf.1/.pdf.2 分卷")

    def add_filter(p: argparse.ArgumentParser) -> None:
        p.add_argument("--query", "-q", default="", help="书名/学段/学科关键词，可空格拆成多个")
        p.add_argument("--stage", help="学段，如 小学 / 初中 / 高中 / 大学")
        p.add_argument("--subject", help="学科，如 数学 / 英语")
        p.add_argument("--limit", type=int, default=20, help="未加 --all 时最多处理多少册")
        p.add_argument("--all", action="store_true", help="处理全部匹配项")

    p_list = sub.add_parser("list", help="在目录里找书")
    add_filter(p_list)

    p_dl = sub.add_parser("download", help="按需下载匹配教材（不会克隆整库）")
    add_filter(p_dl)
    p_dl.add_argument("--max-mb", type=int, default=80, help="单次下载体积上限，防止误下整科")
    p_dl.add_argument("--force", action="store_true", help="允许超过 --max-mb")

    def add_extract_flags(p: argparse.ArgumentParser) -> None:
        p.add_argument("--ocr", action="store_true", help="扫描件没有文字层时，用 OCR 认字（慢，但 AI 才能搜）")
        p.add_argument("--pages", help="只处理页码范围，如 1-20")

    p_ex = sub.add_parser("extract", help="把已下载 PDF 抽成 Markdown 分片")
    add_filter(p_ex)
    add_extract_flags(p_ex)

    p_prep = sub.add_parser("prepare", help="下载 + 合并 + 抽取，给 AI 阅读用")
    add_filter(p_prep)
    add_extract_flags(p_prep)
    p_prep.add_argument("--max-mb", type=int, default=80, help="单次下载体积上限")
    p_prep.add_argument("--force", action="store_true", help="允许超过 --max-mb")

    p_search = sub.add_parser("search", help="在已抽取的 Markdown 里搜原文")
    p_search.add_argument("query", help="要搜的文本")
    p_search.add_argument("--max-hits", type=int, default=50)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    commands = {
        "refresh": cmd_refresh,
        "list": cmd_list,
        "download": cmd_download,
        "merge": cmd_merge,
        "extract": cmd_extract,
        "prepare": cmd_prepare,
        "search": cmd_search,
        "status": cmd_status,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
