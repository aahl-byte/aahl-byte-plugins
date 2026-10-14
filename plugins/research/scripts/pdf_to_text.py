# /// script
# requires-python = ">=3.9"
# dependencies = ["pypdf>=4"]
# ///
"""Print the text of a PDF, from a URL or a local path, page by page.

Run it with uv, which supplies pypdf without a project venv:

    uv run --script pdf_to_text.py <url-or-path> --download-dir <scratch>/pdfs [--pages 1-6] [--out text.txt]

A URL is downloaded into a new, empty directory under --download-dir, and nothing from that directory
is ever executed. Exit 2 means the download failed or returned something that is not a PDF.
"""

import argparse
import pathlib
import sys
import tempfile
import urllib.request

from pypdf import PdfReader

USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) literature-scout"
PDF_MAGIC = b"%PDF"


def fetch(url: str, download_dir: pathlib.Path) -> pathlib.Path:
    download_dir.mkdir(parents=True, exist_ok=True)
    target_dir = pathlib.Path(tempfile.mkdtemp(prefix="pdf-", dir=download_dir))
    target = target_dir / "download"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        target.write_bytes(response.read())
    return target


def page_range(spec: str, count: int) -> range:
    if not spec:
        return range(count)
    first, _, last = spec.partition("-")
    start = max(int(first) - 1, 0)
    stop = min(int(last) if last else start + 1, count)
    return range(start, stop)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("source", help="a URL or a local PDF path")
    parser.add_argument("--download-dir", default="pdfs", help="parent of the per-download directory")
    parser.add_argument("--pages", default="", help="1-based page range, e.g. 1-6")
    parser.add_argument("--out", help="write the text here instead of stdout")
    args = parser.parse_args()

    try:
        if args.source.startswith(("http://", "https://")):
            path = fetch(args.source, pathlib.Path(args.download_dir))
        else:
            path = pathlib.Path(args.source)
        if path.read_bytes()[:4] != PDF_MAGIC:
            print(f"not a PDF: {args.source} (saved at {path})", file=sys.stderr)
            return 2
    except OSError as error:
        print(f"could not fetch {args.source}: {error}", file=sys.stderr)
        return 2

    reader = PdfReader(path)
    pages = page_range(args.pages, len(reader.pages))
    chunks = [f"=== page {i + 1} of {len(reader.pages)} ===\n{reader.pages[i].extract_text() or ''}" for i in pages]
    text = "\n\n".join(chunks)

    if args.out:
        pathlib.Path(args.out).write_text(text)
        print(f"{len(pages)} pages from {path} -> {args.out}", file=sys.stderr)
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
