#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SITEMAP = ROOT / "sitemap.xml"
CANONICAL = '<link rel="canonical" href="https://examfusionprep.com/">'


def patch_index(text: str) -> str:
    if CANONICAL not in text:
        anchor = '  <link rel="manifest" href="./manifest.webmanifest">\n'
        if anchor not in text:
            raise SystemExit("homepage manifest marker not found")
        text = text.replace(anchor, anchor + f'  {CANONICAL}\n', 1)

    old_tail = 'Affairs for SSC • Railway • UPSC • BPSC</p>'
    new_tail = 'Affairs for SSC • Railway • <span style="white-space:nowrap">UPSC • BPSC</span></p>'
    if old_tail in text:
        text = text.replace(old_tail, new_tail, 1)
    elif new_tail not in text:
        raise SystemExit("homepage exam subtitle marker not found")

    return text


def patch_sitemap(text: str) -> str:
    text = text.replace(
        'xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"',
        'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        1,
    )
    text = text.replace(
        '<loc>https://examfusionprep.com/index.html</loc>',
        '<loc>https://examfusionprep.com/</loc>',
        1,
    )
    return text


def write_if_changed(path: Path, new: str) -> bool:
    old = path.read_text(encoding="utf-8")
    if new == old:
        return False
    path.write_text(new, encoding="utf-8", newline="\n")
    return True


def main() -> None:
    index_old = INDEX.read_text(encoding="utf-8")
    sitemap_old = SITEMAP.read_text(encoding="utf-8")

    changed = []
    if write_if_changed(INDEX, patch_index(index_old)):
        changed.append("index.html")
    if write_if_changed(SITEMAP, patch_sitemap(sitemap_old)):
        changed.append("sitemap.xml")

    if changed:
        print("Updated: " + ", ".join(changed))
    else:
        print("Homepage SEO and mobile subtitle already current")


if __name__ == "__main__":
    main()
