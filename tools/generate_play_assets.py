from PIL import Image
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path('play-assets')
OUT.mkdir(exist_ok=True)

# App icon: use the repository's REAL logo.png, only resize to Play Store dimensions.
logo = Image.open('logo.png').convert('RGBA')
logo = logo.resize((512, 512), Image.Resampling.LANCZOS)
logo.save(OUT / 'app-icon-512x512.png', 'PNG', optimize=True)

# Real live-site pages to capture for Play Store phone screenshots.
shots = [
    ('phone-home-1080x1920.png', 'https://examfusionprep.com/'),
    ('phone-current-affairs-1080x1920.png', 'https://examfusionprep.com/Current%20Affairs/Topic%20Names/2026/Month%20Wise/MAY2026.html'),
    ('phone-mind-maps-1080x1920.png', 'https://examfusionprep.com/Mind%20Maps/SubjectName.html'),
    ('phone-quiz-1080x1920.png', 'https://examfusionprep.com/Books/Ghatnachakra%20Purvalokan/History/Modern%20History/ChapterNames/Development%20of%20Press%20in%20Modern%20India.html'),
]

ANDROID_UA = (
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) '
    'AppleWebKit/537.36 (KHTML, like Gecko) '
    'Chrome/142.0.0.0 Mobile Safari/537.36'
)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Feature graphic: exact-size capture of the REAL homepage UI.
    feature = browser.new_page(viewport={'width': 1024, 'height': 500}, device_scale_factor=1)
    feature.goto('https://examfusionprep.com/', wait_until='networkidle', timeout=120000)
    feature.screenshot(path=str(OUT / 'feature-graphic-1024x500.png'), full_page=False)
    feature.close()

    # REAL phone rendering: 360x640 CSS viewport at 3x DPR -> exact 1080x1920 PNG.
    # is_mobile/has_touch + Android UA ensure responsive mobile layout, not desktop layout.
    for filename, url in shots:
        page = browser.new_page(
            viewport={'width': 360, 'height': 640},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            user_agent=ANDROID_UA,
        )
        page.goto(url, wait_until='networkidle', timeout=120000)
        page.screenshot(path=str(OUT / filename), full_page=False, scale='device')
        page.close()

    browser.close()

print('Generated real mobile Play Store assets in', OUT)
