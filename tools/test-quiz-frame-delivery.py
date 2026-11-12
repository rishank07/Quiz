"""Check score-frame delivery without building or changing the real site."""
import ast
import importlib.util
import re
import json
import tempfile
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("pages_build", ROOT / "tools/build-cloudflare-pages.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)
style_url = "/quiz-unattempted.css?v=" + build.digest((ROOT / "quiz-unattempted.css").read_bytes())[:12]
guard = '<script id="efp-analytics-guard">window.preview=true</script>'
with tempfile.TemporaryDirectory() as folder:
    for number, original in enumerate([
        '<!doctype html><html><head>' + guard + '</head><body>QUIZ_CONTENT</body></html>',
        '<!doctype html><html><head>' + guard + '<link id="efp-quiz-score-style" rel="stylesheet" href="/quiz-unattempted.css?v=OLD"></head><body>QUIZ_CONTENT</body></html>',
        '<!doctype html><html><HEAD>' + guard + '</HEAD><body>QUIZ_CONTENT</body></html>',
        '<html><body>QUIZ_CONTENT</body></html>',
    ]):
        target = Path(folder) / f"quiz-{number}.html"
        target.write_text(original, encoding="utf-8")
        build.inject_route_compatibility(target, Path("Books/quiz.html"), style_url)
        rendered = target.read_text(encoding="utf-8")
        assert rendered.count('id="efp-quiz-score-style"') == 1
        assert 'data-efp-current-quiz-frame' in rendered
        assert 'href="' + style_url + '"' in rendered
        assert "QUIZ_CONTENT" in rendered
        assert "?v=OLD" not in rendered
        if guard in original:
            assert rendered.index(guard) < rendered.index('id="efp-quiz-score-style"')
        assert 'id="efp-pages-route"' in rendered
    # All cached URL shapes point to one content-addressed runtime. Matching
    # text in question data must never be rewritten as though it were a tag.
    runtime_url = "/_cf-assets/rapid-practice-0123456789abcdef.js"
    for old_url in ["/rapid-practice-deeplink.js?v=OLD", "../../../../../rapid-practice-deeplink.js?v=OLD", "/rapid-practice-deeplink.js"]:
        target = Path(folder) / "runtime.html"
        target.write_text('<html><head>' + guard + '<script src="' + old_url + '"></script></head><body>QUIZ_CONTENT</body></html>')
        build.inject_route_compatibility(target, Path("Current Affairs/quiz.html"), style_url, runtime_url)
        rendered = target.read_text()
        assert 'src="' + runtime_url + '"' in rendered
        assert old_url not in rendered and "QUIZ_CONTENT" in rendered
        assert rendered.index(guard) < rendered.index(runtime_url)
    hub = ROOT / "Current Affairs/Topic Names/Rapid Practice.html"
    listed = ast.literal_eval(re.search(r"\bconst\s+DATA\s*=\s*(\[.*?\]);", hub.read_text(encoding="utf-8"), re.S)[1])
    quizzes = sorted(hub.with_suffix("").rglob("*.html"))
    assert len(quizzes) == len(listed) and quizzes
    assert {quiz.resolve() for quiz in quizzes} == {(hub.parent / unquote(row[3])).resolve() for row in listed}
    catalog = json.loads((ROOT / "tools/data/ca-curated-options-20261104.json").read_text(encoding="utf-8"))
    assert set(catalog) <= {quiz.relative_to(ROOT).as_posix() for quiz in quizzes}
    for quiz in quizzes:
        original = quiz.read_text(encoding="utf-8")
        target = Path(folder) / "catalog-quiz.html"
        target.write_text(original, encoding="utf-8")
        route = quiz.relative_to(ROOT)
        curated = catalog.get(route.as_posix())
        build.inject_route_compatibility(target, route, style_url, runtime_url, curated)
        rendered = target.read_text(encoding="utf-8")
        assert rendered.count('src="' + runtime_url + '"') == 1, str(quiz)
        master = r'<script[^>]*id=["\']master-data["\'][^>]*>([\s\S]*?)</script>'
        assert re.search(master, original)[1] == re.search(master, rendered)[1], str(quiz)
        curation = r'<script type="application/json" id="efp-ca-curated-options">(.*?)</script>'
        inserted = re.findall(curation, rendered, re.S)
        if curated is None:
            assert inserted == re.findall(curation, original, re.S), str(quiz)
        else:
            assert len(inserted) == 1 and json.loads(inserted[0]) == curated, str(quiz)
            assert rendered.index('efp-ca-curated-options') < rendered.index('</body>')
    # Actual built source shapes, with question/data bodies left untouched.
    samples = [
        "Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Name_Changes_2026_Current_Affairs_Rapid_Practice.html",
        "Books/Lucent's Objective/Ecology/Ecology and Environment.html",
        "Original Practice/History_Complete_Practice.html",
        "Original Practice/Mixed_Practice.html",
    ]
    for filename in samples:
        original = (ROOT / filename).read_text(encoding="utf-8")
        target = Path(folder) / "sample.html"
        target.write_text(original, encoding="utf-8")
        build.inject_route_compatibility(target, Path(filename), style_url)
        rendered = target.read_text(encoding="utf-8")
        assert rendered.count('id="efp-quiz-score-style"') == 1
        assert 'href="' + style_url + '"' in rendered
        assert original.split("</head>", 1)[1] == rendered.split("</head>", 1)[1]
print("PASS direct content-versioned CSS, old loader bypass, analytics ordering and untouched quiz data")
