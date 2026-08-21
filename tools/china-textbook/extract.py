"""Turn PDFs into page-chunked Markdown so the AI can grep instead of eating binary files."""

from __future__ import annotations

import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from paths import PDF_ROOT, TEXT_ROOT, STATUS_JSON, ensure_local_dirs

PAGE_CHUNK = 15
MIN_CHARS_PER_PAGE = 40
DEFAULT_DPI = 140


def text_dir_for(book_path: str) -> Path:
    return TEXT_ROOT / Path(book_path).with_suffix("")


def load_status() -> dict:
    if STATUS_JSON.exists():
        return json.loads(STATUS_JSON.read_text(encoding="utf-8"))
    return {"books": {}}


def save_status(status: dict) -> None:
    ensure_local_dirs()
    STATUS_JSON.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")


def _extract_with_pymupdf(pdf_path: Path) -> list[str]:
    import pymupdf  # type: ignore

    pages = []
    with pymupdf.open(pdf_path) as doc:
        for page in doc:
            pages.append((page.get_text("text") or "").strip())
    return pages


def _extract_with_pypdf(pdf_path: Path) -> list[str]:
    from pypdf import PdfReader  # type: ignore

    reader = PdfReader(str(pdf_path))
    pages = []
    for page in reader.pages:
        pages.append((page.extract_text() or "").strip())
    return pages


def extract_embedded_text(pdf_path: Path) -> tuple[list[str], str]:
    try:
        return _extract_with_pymupdf(pdf_path), "pymupdf"
    except ImportError:
        pass
    try:
        return _extract_with_pypdf(pdf_path), "pypdf"
    except ImportError as exc:
        raise RuntimeError(
            "缺少 PDF 抽取库。请先安装：\n  pip install -r tools/china-textbook/requirements.txt"
        ) from exc


def looks_scanned(pages: list[str]) -> bool:
    if not pages:
        return True
    nonempty = [page for page in pages if page]
    if not nonempty:
        return True
    avg = sum(len(page) for page in nonempty) / len(nonempty)
    return avg < MIN_CHARS_PER_PAGE


def tesseract_langs() -> str | None:
    binary = shutil.which("tesseract")
    if not binary:
        return None
    try:
        listed = subprocess.check_output([binary, "--list-langs"], text=True, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        return "eng"
    langs = set(listed.splitlines())
    if "chi_sim" in langs and "eng" in langs:
        return "chi_sim+eng"
    if "chi_sim" in langs:
        return "chi_sim"
    if "eng" in langs:
        return "eng"
    return None


def ocr_png_tesseract(png_path: Path, langs: str) -> str:
    output = subprocess.check_output(
        ["tesseract", str(png_path), "stdout", "-l", langs, "--psm", "6"],
        text=True,
        stderr=subprocess.DEVNULL,
    )
    return output.strip()


def ocr_png_rapidocr(png_path: Path, engine) -> str:
    result = engine(str(png_path))
    lines = []
    payload = result
    if hasattr(result, "txts"):
        payload = list(zip(getattr(result, "boxes", []), result.txts, getattr(result, "scores", [])))
    if not payload:
        return ""
    for item in payload:
        if isinstance(item, str):
            lines.append(item)
            continue
        if isinstance(item, (list, tuple)):
            if len(item) >= 2 and isinstance(item[1], str):
                lines.append(item[1])
            elif item and isinstance(item[0], str):
                lines.append(item[0])
    return "\n".join(line.strip() for line in lines if line and str(line).strip())


def make_ocr_backend() -> tuple[str, object]:
    langs = tesseract_langs()
    if langs:
        return f"tesseract:{langs}", langs
    try:
        from rapidocr import RapidOCR  # type: ignore

        return "rapidocr", RapidOCR()
    except ImportError as exc:
        raise RuntimeError(
            "扫描件需要 OCR。任选一种即可：\n"
            "  1) 安装 tesseract，并加上中文语言包（macOS: brew install tesseract tesseract-lang）\n"
            "  2) pip install rapidocr onnxruntime"
        ) from exc


def ocr_pdf_pages(pdf_path: Path, page_count: int, start: int, end: int, dpi: int) -> tuple[list[str], str]:
    import pymupdf  # type: ignore

    backend_name, backend = make_ocr_backend()
    pages = [""] * page_count
    tmp_dir = pdf_path.parent / ".ocr-tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    try:
        with pymupdf.open(pdf_path) as doc:
            for index in range(start, end):
                png_path = tmp_dir / f"p{index + 1:04d}.png"
                pix = doc[index].get_pixmap(dpi=dpi)
                png_path.write_bytes(pix.tobytes("png"))
                if backend_name.startswith("tesseract:"):
                    text = ocr_png_tesseract(png_path, backend)  # langs string
                else:
                    text = ocr_png_rapidocr(png_path, backend)
                pages[index] = text
                png_path.unlink(missing_ok=True)
                print(f"  OCR {index + 1}/{end} ({backend_name}, {len(text)} 字)")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    return pages, backend_name


def write_chunks(book: dict, pages: list[str], engine: str, scanned: bool, used_ocr: bool) -> list[Path]:
    ensure_local_dirs()
    out_dir = text_dir_for(book["path"])
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.md"):
        old.unlink()

    nonempty = sum(1 for page in pages if page.strip())
    index_lines = [
        f"# {book['title']}",
        "",
        f"- 学段：{book['stage']}",
        f"- 学科：{book['subject']}",
        f"- 原始路径：`{book['path']}`",
        f"- 页数：{len(pages)}",
        f"- 有文字的页：{nonempty}",
        f"- 抽取引擎：{engine}",
        f"- 扫描件：{'是' if scanned else '否'}",
        f"- 使用 OCR：{'是' if used_ocr else '否'}",
        f"- 抽取时间：{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        "",
        "阅读建议：不要一次读完全书。先看本目录，再打开对应页码的分片。",
        "",
    ]

    if nonempty == 0:
        index_lines.extend(
            [
                "这部 PDF 几乎抽不出文字，多半是扫描件。",
                "请加上 `--ocr` 再抽一次，例如：",
                "",
                f'```bash',
                f'python3 tools/china-textbook/cli.py extract --query "{book["title"]}" --ocr --pages 1-20',
                "```",
                "",
            ]
        )
        index_path = out_dir / "README.md"
        index_path.write_text("\n".join(index_lines), encoding="utf-8")
        return [index_path]

    written: list[Path] = []
    total = len(pages)
    first_content = next((i for i, page in enumerate(pages) if page.strip()), 0)
    last_content = max(i for i, page in enumerate(pages) if page.strip())
    start = first_content - (first_content % PAGE_CHUNK)
    for index in range(start, last_content + 1, PAGE_CHUNK):
        end = min(total, index + PAGE_CHUNK)
        slice_pages = pages[index:end]
        if not any(page.strip() for page in slice_pages):
            continue
        chunk_name = f"p{index + 1:04d}-{end:04d}.md"
        body = [
            f"# {book['title']} 第 {index + 1}-{end} 页",
            "",
            f"来源：`{book['path']}`",
            "",
        ]
        for page_no, text in enumerate(slice_pages, start=index + 1):
            body.append(f"## 第 {page_no} 页")
            body.append("")
            body.append(text.strip() or "（本页无文字）")
            body.append("")
        chunk_path = out_dir / chunk_name
        chunk_path.write_text("\n".join(body), encoding="utf-8")
        written.append(chunk_path)
        index_lines.append(f"- [第 {index + 1}-{end} 页]({chunk_name})")

    index_path = out_dir / "README.md"
    index_path.write_text("\n".join(index_lines) + "\n", encoding="utf-8")
    written.append(index_path)
    return written


def parse_page_range(spec: str | None, page_count: int) -> tuple[int, int]:
    if not spec:
        return 0, page_count
    text = spec.replace(" ", "")
    if "-" in text:
        left, right = text.split("-", 1)
        start = int(left) if left else 1
        end = int(right) if right else page_count
    else:
        start = 1
        end = int(text)
    start = max(1, start)
    end = min(page_count, end)
    if end < start:
        raise ValueError(f"页码范围无效：{spec}")
    return start - 1, end


def extract_book(
    book: dict,
    ocr: bool = False,
    pages: str | None = None,
    dpi: int = DEFAULT_DPI,
) -> dict:
    pdf_path = PDF_ROOT / book["path"]
    if not pdf_path.exists():
        raise FileNotFoundError(f"还没有本地 PDF：{pdf_path}。请先 download / merge。")

    embedded, engine = extract_embedded_text(pdf_path)
    scanned = looks_scanned(embedded)
    start, end = parse_page_range(pages, len(embedded))
    used_ocr = False
    final_pages = list(embedded)
    if ocr and scanned:
        ocr_pages, ocr_engine = ocr_pdf_pages(pdf_path, len(embedded), start, end, dpi)
        for index in range(start, end):
            final_pages[index] = ocr_pages[index]
        engine = ocr_engine
        used_ocr = True
    elif pages:
        masked = [""] * len(embedded)
        for index in range(start, end):
            masked[index] = embedded[index]
        final_pages = masked

    written = write_chunks(book, final_pages, engine, scanned, used_ocr)
    chars = sum(len(page) for page in final_pages)
    result = {
        "title": book["title"],
        "path": book["path"],
        "pages": len(embedded),
        "chars": chars,
        "engine": engine,
        "scanned": scanned,
        "ocr": used_ocr,
        "text_dir": str(text_dir_for(book["path"])),
        "files": [str(path) for path in written],
    }
    status = load_status()
    entry = status.setdefault("books", {}).setdefault(book["path"], {})
    entry.update(
        {
            "title": book["title"],
            "extracted": chars > 0,
            "scanned": scanned,
            "ocr": used_ocr,
            "pages": len(embedded),
            "chars": chars,
            "engine": engine,
            "text_dir": result["text_dir"],
        }
    )
    save_status(status)
    return result
