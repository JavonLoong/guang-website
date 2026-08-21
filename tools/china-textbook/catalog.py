"""Build and query the ChinaTextbook file catalog (metadata only)."""

from __future__ import annotations

import json
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone

from paths import CATALOG_JSON, CATALOG_MD, DATA_DIR, UPSTREAM_BRANCH, UPSTREAM_REPO, UPSTREAM_URL

TREE_API = f"https://api.github.com/repos/{UPSTREAM_REPO}/git/trees/{UPSTREAM_BRANCH}?recursive=1"
SKIP_PREFIXES = (".cache/",)
SKIP_NAMES = {"README.md"}


def load_catalog() -> dict:
    if not CATALOG_JSON.exists():
        raise FileNotFoundError(f"找不到目录文件 {CATALOG_JSON}，请先运行: python3 tools/china-textbook/cli.py refresh")
    return json.loads(CATALOG_JSON.read_text(encoding="utf-8"))


def format_size(n: int) -> str:
    if n >= 1024 ** 3:
        return f"{n / 1024 ** 3:.1f}GB"
    if n >= 1024 ** 2:
        return f"{n / 1024 ** 2:.1f}MB"
    if n >= 1024:
        return f"{n / 1024:.0f}KB"
    return f"{n}B"


def parse_meta(path: str) -> tuple[str, str, str, str]:
    parts = path.split("/")
    stage = parts[0] if parts else ""
    subject = parts[1] if len(parts) > 1 else ""
    publisher = ""
    if len(parts) > 2 and not parts[2].lower().endswith((".pdf", ".djvu")):
        publisher = parts[2]
    title = parts[-1]
    for suffix in (".pdf", ".djvu"):
        if title.lower().endswith(suffix):
            title = title[: -len(suffix)]
            break
    return stage, subject, publisher, title


def _is_split_part(name: str) -> bool:
    lower = name.lower()
    return ".pdf." in lower and not lower.endswith(".pdf")


def books_from_tree(tree: list[dict]) -> list[dict]:
    grouped: dict[str, dict] = {}
    for entry in tree:
        if entry.get("type") != "blob":
            continue
        path = entry["path"]
        name = path.rsplit("/", 1)[-1]
        if path.startswith(SKIP_PREFIXES) or name in SKIP_NAMES:
            continue
        size = int(entry.get("size") or 0)
        if _is_split_part(name):
            base = name.split(".pdf.")[0] + ".pdf"
            directory = path.rsplit("/", 1)[0] if "/" in path else ""
            logical = f"{directory}/{base}" if directory else base
            rec = grouped.setdefault(logical, {"parts": [], "size": 0, "kind": "split"})
            rec["parts"].append({"path": path, "size": size, "name": name})
            rec["size"] += size
            rec["kind"] = "split"
            continue
        if not name.lower().endswith((".pdf", ".djvu")):
            continue
        rec = grouped.setdefault(path, {"parts": [], "size": 0, "kind": "file"})
        rec["file"] = path
        rec["size"] += size
        rec["ext"] = name.rsplit(".", 1)[-1].lower()
        if not rec["parts"]:
            rec["kind"] = "file"

    books = []
    for logical, rec in sorted(grouped.items()):
        stage, subject, publisher, title = parse_meta(logical)
        parts = sorted(rec.get("parts") or [], key=lambda item: item["name"])
        files = [item["path"] for item in parts] if parts else [rec.get("file", logical)]
        books.append(
            {
                "title": title,
                "stage": stage,
                "subject": subject,
                "publisher": publisher,
                "path": logical,
                "kind": "split" if parts else rec.get("kind", "file"),
                "ext": rec.get("ext", "pdf"),
                "size_bytes": rec["size"],
                "part_count": len(files),
                "files": files,
            }
        )
    return books


def fetch_tree(token: str | None = None) -> list[dict]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "guang-website-china-textbook-catalog",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(TREE_API, headers=headers)
    with urllib.request.urlopen(request, timeout=120) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if payload.get("truncated"):
        raise RuntimeError("GitHub tree API 返回 truncated=true，目录不完整，请稍后重试。")
    return payload.get("tree") or []


def render_markdown(catalog: dict) -> str:
    books = catalog["books"]
    stats = catalog["stats"]
    lines = [
        "# ChinaTextbook 目录（只有文件清单，没有教材正文）",
        "",
        f"- 上游仓库：<{catalog['source']['url']}>",
        f"- 生成时间：{catalog['generated_at']}",
        f"- 册数：{stats['books']}（其中分卷 {stats['split_books']} 册）",
        f"- 大约体积：{format_size(stats['total_bytes'])}",
        "",
        "AI 用法：先在本文件里搜书名，再运行",
        "",
        "```bash",
        'python3 tools/china-textbook/cli.py prepare --query "线性代数"',
        "```",
        "",
        "然后去 `textbook/text/` 读抽取出来的 Markdown，不要直接打开几十 MB 的 PDF。",
        "",
    ]
    grouped: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
    for book in books:
        grouped[book["stage"]][book["subject"]].append(book)

    for stage in sorted(grouped):
        lines.append(f"## {stage}")
        lines.append("")
        for subject in sorted(grouped[stage]):
            lines.append(f"### {subject}")
            lines.append("")
            for book in grouped[stage][subject]:
                flag = f"split×{book['part_count']}" if book["kind"] == "split" else book["ext"]
                publisher = f" · {book['publisher']}" if book["publisher"] else ""
                lines.append(
                    f"- {book['title']}{publisher} | {format_size(book['size_bytes'])} | {flag} | `{book['path']}`"
                )
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def save_catalog(books: list[dict], generated_at: str | None = None) -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    catalog = {
        "source": {
            "repo": UPSTREAM_REPO,
            "url": UPSTREAM_URL,
            "branch": UPSTREAM_BRANCH,
            "note": "仅收录文件清单，不含教材正文。PDF 请按需从上游仓库下载，供个人学习使用。",
        },
        "generated_at": generated_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stats": {
            "books": len(books),
            "split_books": sum(1 for book in books if book["kind"] == "split"),
            "total_bytes": sum(book["size_bytes"] for book in books),
            "stages": dict(Counter(book["stage"] for book in books)),
        },
        "books": books,
    }
    CATALOG_JSON.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    CATALOG_MD.write_text(render_markdown(catalog), encoding="utf-8")
    return catalog


def refresh_catalog(token: str | None = None) -> dict:
    tree = fetch_tree(token)
    books = books_from_tree(tree)
    return save_catalog(books)


def match_books(catalog: dict, query: str | None = None, stage: str | None = None, subject: str | None = None) -> list[dict]:
    books = catalog["books"]
    needles = [item.strip().lower() for item in (query or "").split() if item.strip()]

    def hit(book: dict) -> bool:
        if stage and stage not in book["stage"] and stage not in book["path"]:
            return False
        if subject and subject not in book["subject"] and subject not in book["path"]:
            return False
        if not needles:
            return True
        haystack = " ".join(
            [book["title"], book["stage"], book["subject"], book["publisher"], book["path"]]
        ).lower()
        return all(needle in haystack for needle in needles)

    return [book for book in books if hit(book)]
