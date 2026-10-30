#!/usr/bin/env python3
"""Exercise all real PDF entry routes with synthetic bytes; no network required."""
import importlib.util
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("pages_build", ROOT / "tools/build-cloudflare-pages.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
_, _, documents = builder.read_index((ROOT / "Crux-Tricks/crux-manifest.js").read_text(encoding="utf-8"))
original_root = builder.ROOT

with tempfile.TemporaryDirectory(prefix="efp-pdf-routing-") as temporary:
    fixture = Path(temporary) / "source"
    output = Path(temporary) / "site"
    fixture.mkdir()
    output.mkdir()
    tracked = []
    def put(name, data):
        target = fixture / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data.encode("utf-8") if isinstance(data, str) else data)
        tracked.append(name)

    for name in ["Crux-Tricks/crux-manifest.js", "cloudflare/pdf-assets.js",
                 "cloudflare/open-pdf.js", "service-worker.js"]:
        put(name, (ROOT / name).read_bytes())
    guard = '<script id="efp-analytics-guard">window.previewExcluded=true;</script>'
    put("index.html", "<html><head>" + guard + "</head><body>Home</body></html>")
    put("Crux-Tricks/viewer.html", '<html><head>' + guard +
        '</head><body><script src="viewer-v2.js?v=test"></script></body></html>')
    put("Crux-Tricks/viewer-v2.js", "task=pdfjsLib.getDocument(options)")
    put("search-logic.js", "function efLoadSearchIndexScript(url, globalName) {}")
    put("cloudflare/search-fallback.js", "/* fixture search fallback */")
    put("quiz-unattempted.css", "body{color:black}")
    expected = {}
    for document in documents:
        name = "Crux-Tricks/" + unquote(document["pdf"])
        data = b"%PDF-1.4\n" + document["id"].encode() + b"\n%%EOF\n"
        if document["id"] in {"ct0467", "ct0468"}:
            data += b" " * (builder.LIMIT + 1 - len(data))
        put(name, data)
        expected["/" + name] = document["id"]

    def git_output(command, **kwargs):
        if command[1:] == ["rev-parse", "HEAD"]:
            return "routing-fixture-commit\n"
        if command[1:] == ["ls-files", "-z"]:
            return ("\0".join(tracked) + "\0").encode()
        raise AssertionError(command)
    builder.ROOT = fixture
    try:
        with patch.object(builder.subprocess, "check_output", side_effect=git_output):
            builder.build(output)
    finally:
        builder.ROOT = original_root

    report = json.loads((output / "cloudflare-build-report.json").read_text(encoding="utf-8"))
    routes = report["pdfReaderRoutes"]
    assert len(routes) == len(documents) == 591
    redirects = (output / "_redirects").read_text(encoding="utf-8").splitlines()
    assert len(redirects) == 591
    for source, doc_id in expected.items():
        route = routes[source]
        assert route["reader"] == "/Crux-Tricks/viewer?id=" + doc_id
        assert not (output / source.lstrip("/")).exists(), source
        rule = builder.quote(source, safe="/") + " " + route["reader"] + " 301"
        assert rule in redirects and len(rule) <= 1000
        original = (fixture / source.lstrip("/")).read_bytes()
        if "raw" in route:
            raw_path = route["raw"]
            assert raw_path.startswith("/_cf-assets/")
            assert (output / raw_path.lstrip("/")).read_bytes() == original
            assert not any(line.startswith(raw_path + " ") for line in redirects)
        else:
            asset = report["pdfs"][source]
            restored = b"".join((output / part.lstrip("/")).read_bytes() for part in asset["parts"])
            assert restored == original
    assert len(report["pdfs"]) == 2
    runtime = (output / "cf-pdf-assets.js").read_text(encoding="utf-8")
    assert "var EFP_CF_PDF_ROUTES=" in runtime
    headers = (output / "_headers").read_text(encoding="utf-8")
    assert "/_cf-assets/*\n  Cache-Control: public, max-age=31536000, immutable\n  X-Robots-Tag: noindex" in headers
    opener = (output / "open-original-pdf.html").read_text(encoding="utf-8")
    assert '<meta name="robots" content="noindex,follow">' in opener
    assert opener.index('id="efp-analytics-guard"') < opener.index("cf-open-pdf.js")
    assert not (output / "functions").exists() and not (output / "_worker.js").exists()
    print("PASS 591 permanent reader redirects, 589 original-byte assets, 2 chunked PDFs, no redirect loops, search exclusion and analytics guard")
