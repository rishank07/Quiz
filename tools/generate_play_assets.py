from PIL import Image
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path('play-assets')
OUT.mkdir(exist_ok=True)

# 1) App icon: use the repository's REAL logo.png, only resize to Play Store dimensions.
logo = Image.open('logo.png').convert('RGBA')
logo = logo.resize((512, 512), Image.Resampling.LANCZOS)
logo.save(OUT / 'app-icon-512x512.png', 'PNG', optimize=True)

# 2) Feature graphic and phone screenshots: capture the REAL live ExamFusion Prep pages.
shots = [
    ('phone-home-1080x1920.png', 'https://examfusionprep.com/'),
    ('phone-current-affairs-1080x1920.png', 'https://examfusionprep.com/Current%20Affairs/Topic%20Names/2026/Month%20Wise/MAY2026.html'),
    ('phone-mind-maps-1080x1920.png', 'https://examfusionprep.com/Mind%20Maps/SubjectName.html'),
    ('phone-quiz-1080x1920.png', 'https://examfusionprep.com/Books/Ghatnachakra%20Purvalokan/History/Modern%20History/ChapterNames/Development%20of%20Press%20in%20Modern%20India.html'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Feature graphic: a clean, exact-size capture of the real homepage UI.
    page = browser.new_page(viewport={'width': 1024, 'height': 500}, device_scale_factor=1)
    page.goto('https://examfusionprep.com/', wait_until='networkidle', timeout=120000)
    page.screenshot(path=str(OUT / 'feature-graphic-1024x500.png'), full_page=False)
    page.close()

    # Phone screenshots: exact 1080x1920 portrait captures, no fake device frames/content.
    for filename, url in shots:
        page = browser.new_page(viewport={'width': 1080, 'height': 1920}, device_scale_factor=1)
        page.goto(url, wait_until='networkidle', timeout=120000)
        page.screenshot(path=str(OUT / filename), full_page=False)
        page.close()

    browser.close()

print('Generated Play Store assets in', OUT)
