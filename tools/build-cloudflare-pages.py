#!/usr/bin/env python3
"""Build the existing site for Pages Free without modifying source content.

Run from the repository root: python3 tools/build-cloudflare-pages.py
Cloudflare build output directory: cloudflare-dist
Only Python's standard library is required; no Functions or paid storage.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 25 * 1024 * 1024
INDEX_TARGET = 8 * 1024 * 1024
PDF_CHUNK = 1024 * 1024
MARKER = ".examfusion-cloudflare-build"
PRIVATE_ROOTS = {".github", "tools", "audits", "cloudflare", "deploy"}
PRIVATE_FILES = {"AGENTS.md", "README.md", "CLOUDFLARE_SETUP.md", "CNAME", ".gitignore", ".nojekyll"}


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, str):
        data = data.encode("utf-8")
    path.write_bytes(data)


def read_index(text):
    match = re.search(r"window\.(\w+)\s*=", text)
    if not match:
        raise ValueError("Large JS file is not a supported search index")
    rhs = text[match.end():]
    appending = re.match(r"\s*\(window\." + re.escape(match.group(1)) + r"\s*\|\|\s*\[\]\)\.concat\(", rhs)
    begin = match.end() + (appending.end() if appending else len(rhs) - len(rhs.lstrip()))
    groups, consumed = json.JSONDecoder().raw_decode(text[begin:])
    if not isinstance(groups, list) or text[begin + consumed:].strip() not in {";", ");"}:
        raise ValueError("Unexpected search-index format; refusing to discard JavaScript")
    return match.group(1), bool(appending), groups


def split_group(group):
    encoded = compact(group).encode()
    if len(encoded) <= INDEX_TARGET - 1024:
        yield group
        return
    snippets = group.get("x")
    if not isinstance(snippets, list) or len(snippets) < 2:
        raise ValueError("One search record exceeds the part size limit")
    middle = len(snippets) // 2
    for lo, hi in ((0, middle), (middle, len(snippets))):
        child = dict(group)
        child["x"] = snippets[lo:hi]
        if isinstance(group.get("a"), list) and len(group["a"]) == len(snippets):
            child["a"] = group["a"][lo:hi]
        yield from split_group(child)


def build_index(relative, raw, output):
    name, append, original = read_index(raw.decode("utf-8"))
    folder = Path("_cf-assets") / digest(raw)[:24]
    parts, batch, size = [], [], 0
    prefix = f"window.{name}=window.{name}||[];\nwindow.{name}.push.apply(window.{name},"

    def flush():
        nonlocal batch, size
        if not batch:
            return
        target = folder / f"part-{len(parts):04d}.js"
        write(output / target, prefix + "[" + ",".join(batch) + "]);\n")
        parts.append("/" + target.as_posix())
        batch, size = [], 0

    for group in original:
        for fragment in split_group(group):
            encoded = compact(fragment)
            encoded_size = len(encoded.encode()) + 1
            if batch and size + encoded_size > INDEX_TARGET:
                flush()
            batch.append(encoded)
            size += encoded_size
    flush()
    initial = f"(window.{name}||[])" if append else "[]"
    bootstrap = (f"window.{name}={initial};\n"
                 "if(typeof importScripts!==\"function\")throw new Error(\"Use the search part loader\");\n"
                 f"importScripts.apply(null,{compact(parts)});\n")
    write(output / relative, bootstrap)
    return {"parts": parts, "global": name, "groups": len(original),
            "snippets": sum(len(g.get("x", [])) for g in original), "sha256": digest(raw)}


def build_pdf(relative, raw, output):
    folder = Path("_cf-assets") / digest(raw)[:24]
    parts = []
    check = hashlib.sha256()
    for number, begin in enumerate(range(0, len(raw), PDF_CHUNK)):
        target = folder / f"part-{number:04d}.bin"
        block = raw[begin:begin + PDF_CHUNK]
        write(output / target, block)
        check.update((output / target).read_bytes())
        parts.append("/" + target.as_posix())
    if check.hexdigest() != digest(raw):
        raise ValueError("PDF byte verification failed")
    return {"parts": parts, "chunkSize": PDF_CHUNK, "length": len(raw),
            "filename": relative.name, "sha256": digest(raw)}


def inject_route_compatibility(path, relative):
    # Pages removes .html from URLs. Restore the existing URL in history before
    # app scripts read it, so saved routes, back navigation and deep links agree.
    # This is a history update, not a network redirect.
    source = path.read_text(encoding="utf-8")
    if relative.name == "404.html":
        return
    canonical = quote("/" + relative.as_posix(), safe="/")
    preserve_root = "if(location.pathname==='/' )return;" if relative.as_posix() == "index.html" else ""
    script = ("<script id=\"efp-pages-route\">(function(){" + preserve_root +
              "var p=" + compact(canonical) + ";if(location.pathname!==p)history.replaceState(" +
              "history.state,'',p+location.search+location.hash)})();</script>")
    match = re.search(r"<head\b[^>]*>", source, re.I)
    if match:
        source = source[:match.end()] + script + source[match.end():]
    else:
        # Some existing content documents omit an explicit head tag.
        source = script + source
    path.write_text(source, encoding="utf-8")


def build(output):
    source_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    indexes, pdfs, oversized = {}, {}, []
    for filename in tracked:
        if not filename:
            continue
        relative = Path(filename)
        if relative.parts[0] in PRIVATE_ROOTS or relative.name in PRIVATE_FILES or relative.parts[0].startswith("."):
            continue
        source = ROOT / relative
        if not source.is_file() or source.is_symlink():
            raise ValueError(f"Missing or unsupported source: {filename}")
        if source.stat().st_size <= LIMIT:
            target = output / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            continue
        raw = source.read_bytes()
        oversized.append({"path": filename, "bytes": len(raw), "sha256": digest(raw)})
        if relative.suffix == ".js" and relative.name.startswith("search-snippets-"):
            indexes["/" + relative.as_posix()] = build_index(relative, raw, output)
        elif relative.suffix.lower() == ".pdf":
            pdfs["/" + relative.as_posix()] = build_pdf(relative, raw, output)
        else:
            raise ValueError(f"Oversized asset needs preparation: {filename}")

    # The existing worker imports the bootstrap synchronously. Its browser
    # fallback loads the exact same parts sequentially, without blocking the UI.
    logic_path = output / "search-logic.js"
    logic = logic_path.read_text()
    needle = "function efLoadSearchIndexScript(url, globalName) {"
    if logic.count(needle) != 1:
        raise ValueError("Search fallback changed; update the Cloudflare integration")
    part_map = {path: record["parts"] for path, record in indexes.items()}
    branch = ("\n  var cfParts=EFP_CF_INDEX_PARTS[decodeURIComponent(new URL(url,document.baseURI).pathname)];"
              "\n  if(cfParts)return efLoadCloudflareSearchParts(url,globalName,cfParts);\n")
    logic = "var EFP_CF_INDEX_PARTS=" + compact(part_map) + ";\n" + logic.replace(needle, needle + branch)
    logic += "\n" + (ROOT / "cloudflare/search-fallback.js").read_text()
    logic_path.write_text(logic)

    runtime = "var EFP_CF_PDFS=" + compact(pdfs) + ";\n" + (ROOT / "cloudflare/pdf-assets.js").read_text()
    write(output / "cf-pdf-assets.js", runtime)
    viewer_path = output / "Crux-Tricks/viewer-v2.js"
    viewer = viewer_path.read_text()
    needle = "task=pdfjsLib.getDocument(options)"
    if viewer.count(needle) != 1:
        raise ValueError("PDF loader changed; update the Cloudflare integration")
    viewer = viewer.replace(needle, "task=EFP_CF_PDF.getDocument(pdfjsLib,options)")
    viewer_path.write_text(viewer)
    html_path = output / "Crux-Tricks/viewer.html"
    html = html_path.read_text()
    viewer_tag = re.search(r'<script\s+src="viewer-v2\.js[^\"]*"', html)
    if not viewer_tag:
        raise ValueError("PDF viewer script tag was not found")
    html = html[:viewer_tag.start()] + '<script src="/cf-pdf-assets.js"></script>' + html[viewer_tag.start():]
    html_path.write_text(html)

    # Reuse the real early analytics exclusion guard on the generated page.
    index_html = (ROOT / "index.html").read_text()
    guard = re.search(r'<script id="efp-analytics-guard">.*?</script>', index_html, re.S)
    if not guard:
        raise ValueError("Analytics exclusion guard was not found")
    open_html = ('<!doctype html><html lang="en"><head><meta charset="utf-8">' + guard.group() +
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Open PDF | ExamFusion Prep</title>'
        '<style>body{font:17px/1.6 system-ui,sans-serif;max-width:40rem;margin:12vh auto;padding:24px;color:#172033}'
        'h1{font-size:22px;overflow-wrap:anywhere}progress{width:100%;height:18px}a{color:#1855c7}</style></head>'
        '<body><h1 id="title">Open PDF</h1><p id="status" role="status">Opening your PDF…</p>'
        '<progress id="progress" max="1" value="0"></progress><p><a id="download" hidden>Download PDF</a></p>'
        '<script src="/cf-pdf-assets.js"></script><script src="/cf-open-pdf.js"></script></body></html>')
    write(output / "open-original-pdf.html", open_html)
    write(output / "cf-open-pdf.js", (ROOT / "cloudflare/open-pdf.js").read_text())
    if not (output / "404.html").exists():
        write(output / "404.html", '<!doctype html><html lang="en"><head><meta charset="utf-8">' + guard.group() +
              '<title>Page not found | ExamFusion Prep</title></head><body><h1>Page not found</h1>'
              '<p><a href="/">Go to ExamFusion Prep</a></p></body></html>')

    redirects = []
    for path in pdfs:
        redirects.append(quote(path, safe="/") + " /open-original-pdf.html?file=" + quote(path, safe="") + " 302")
    existing = output / "_redirects"
    write(existing, "\n".join(redirects) + "\n" + (existing.read_text() if existing.exists() else ""))
    headers = output / "_headers"
    write(headers, (headers.read_text() if headers.exists() else "") +
          "\n/service-worker.js\n  Cache-Control: no-cache\n"
          "/_cf-assets/*\n  Cache-Control: public, max-age=31536000, immutable\n")
    for path in list(output.rglob("*.html")):
        inject_route_compatibility(path, path.relative_to(output))

    revision = digest(runtime.encode() + logic.encode() + viewer.encode() + source_commit.encode())[:12]
    worker_path = output / "service-worker.js"
    worker = worker_path.read_text()
    worker, count = re.subn(r'(const CACHE_VERSION = ")([^"]+)(";)',
                            lambda m: m[1] + m[2] + "-cf-" + revision + m[3], worker, count=1)
    if count != 1:
        raise ValueError("Service-worker cache version was not found")
    worker = worker.replace("const APP_SHELL = [", 'const APP_SHELL = [\n  "/cf-pdf-assets.js",\n  "/cf-open-pdf.js",\n  "/open-original-pdf.html",', 1)
    worker = worker.replace('if (url.pathname === "/owner-debug.js" ||',
                            'if (url.pathname === "/cf-pdf-assets.js" ||\n'
                            '      url.pathname === "/cf-open-pdf.js" ||\n'
                            '      url.pathname === "/owner-debug.js" ||', 1)
    worker_path.write_text(worker)
    report = {"sourceCommit": source_commit,
              "sourceOversized": oversized, "indexes": indexes, "pdfs": pdfs,
              "pdfDelivery": "byte-identical static ranges; no recompression", "revision": revision}
    write(output / "cloudflare-build-report.json", json.dumps(report, indent=2, ensure_ascii=False))
    write(output / MARKER, "Generated by tools/build-cloudflare-pages.py\n")
    files = [p for p in output.rglob("*") if p.is_file()]
    too_large = [str(p.relative_to(output)) for p in files if p.stat().st_size > LIMIT]
    if too_large or len(files) > 20000:
        raise ValueError(f"Pages Free limits exceeded: {len(files)} files; oversized={too_large}")
    if (output / "functions").exists() or (output / "_worker.js").exists():
        raise ValueError("This deployment must remain entirely static")
    print(f"Pages build ready: {len(files)} files; largest {max(p.stat().st_size for p in files)/1024/1024:.2f} MiB")
    print(f"Prepared {len(indexes)} search indexes and {len(pdfs)} byte-identical PDFs; no Functions")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "cloudflare-dist")
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT.is_relative_to(output):
        raise ValueError("Output cannot replace the repository or its parents")
    if output.exists() and not (output / MARKER).is_file():
        raise ValueError("Refusing to replace a directory without a Cloudflare build marker")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".efp-pages-", dir=output.parent) as temporary:
        stage = Path(temporary) / "site"
        stage.mkdir()
        build(stage)
        if output.exists():
            shutil.rmtree(output)
        shutil.move(str(stage), str(output))
    print(f"Output: {output}")


if __name__ == "__main__":
    main()
