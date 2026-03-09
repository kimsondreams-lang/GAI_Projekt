#!/usr/bin/env python3
import os
import json
import re
import hashlib
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

ROOT = Path(__file__).resolve().parents[1]
ARTICLES_DIR = ROOT / 'articles'
IMAGES_DIR = ROOT / 'images' / 'articles'
DOWNLOADS_DIR = IMAGES_DIR / 'downloads'
GENERATED_DIR = IMAGES_DIR / 'generated'

DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

def canon(s: str) -> str:
    return re.sub(r"[^a-z0-9\-]+", "-", str(s or '').strip().lower()).strip('-')

def fetch_image(url: str) -> bytes:
    req = Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; ImageFetcher/1.0)'
    })
    with urlopen(req, timeout=20) as resp:
        return resp.read()

def save_bytes(data: bytes, base_name: str) -> str:
    ext = '.jpg'
    name = base_name + ext
    out = DOWNLOADS_DIR / name
    out.write_bytes(data)
    rel = os.path.relpath(out, ROOT)
    return rel.replace('\\', '/')

def gen_svg(title: str, base_name: str) -> str:
    bg1 = '#0f2027'
    bg2 = '#2c5364'
    text = (title or 'Product').strip()
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg1}"/>
      <stop offset="100%" stop-color="{bg2}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g font-family="Inter, Arial, sans-serif" fill="#ffffff">
    <text x="60" y="140" font-size="72" font-weight="700">{text}</text>
    <text x="60" y="220" font-size="32" opacity="0.9">Lifestyle product preview</text>
  </g>
</svg>'''
    name = base_name + '.svg'
    out = GENERATED_DIR / name
    out.write_text(svg, encoding='utf-8')
    rel = os.path.relpath(out, ROOT)
    return rel.replace('\\', '/')

def process_article(path: Path) -> bool:
    data = json.loads(path.read_text(encoding='utf-8'))
    slug = canon(data.get('id') or data.get('title')) or path.stem

    def resolve_img(val: str, idx: int, title_hint: str) -> str:
        if not val:
            local = pick_local_image(data.get('title') or '', data.get('content') or '')
            if local:
                return local
            return gen_svg(title_hint, f'{slug}-auto-{idx}')
        v = str(val)
        if v.startswith('http://') or v.startswith('https://'):
            try:
                content = fetch_image(v)
                base = f'{slug}-{idx}-{hashlib.sha1(v.encode()).hexdigest()[:8]}'
                return save_bytes(content, base)
            except (URLError, HTTPError) as e:
                local = pick_local_image(data.get('title') or '', data.get('content') or '')
                if local:
                    return local
                return gen_svg(title_hint, f'{slug}-fallback-{idx}')
        # local path: ensure it exists
        target = ROOT / v
        if target.exists():
            return v.replace('\\', '/')
        # missing local -> generate
        local = pick_local_image(data.get('title') or '', data.get('content') or '')
        if local:
            return local
        return gen_svg(title_hint, f'{slug}-missing-{idx}')

    # main image
    data['image'] = resolve_img(data.get('image') or '', 0, data.get('title') or slug)

    # gallery: ensure at least 2 images
    gallery = data.get('gallery')
    if not isinstance(gallery, list):
        gallery = []
    # resolve existing
    resolved = []
    for i, g in enumerate(gallery):
        src = resolve_img((g or {}).get('src') or '', i+1, data.get('title') or slug)
        resolved.append({
            'src': src,
            'alt': (g or {}).get('alt') or data.get('title') or slug,
            'caption': (g or {}).get('caption') or ''
        })
    while len(resolved) < 2:
        idx = len(resolved) + 1
        src = gen_svg(data.get('title') or slug, f'{slug}-gen-{idx}')
        resolved.append({'src': src, 'alt': data.get('title') or slug, 'caption': ''})
    data['gallery'] = resolved

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding='utf-8')
    return True

def main():
    files = sorted([p for p in ARTICLES_DIR.glob('*.json')])
    changed = 0
    for p in files:
        try:
            if process_article(p):
                changed += 1
        except Exception as e:
            print(f'[WARN] failed {p.name}: {e}')
    print(f'[DONE] processed {changed} articles, outputs in {DOWNLOADS_DIR} and {GENERATED_DIR}')

if __name__ == '__main__':
    main()
LOCAL_ASSETS = [
    (re.compile(r"sony\s+wh\-?1000xm5", re.I), 'images/articles/sony-wh-1000xm5.jpg'),
    (re.compile(r"airpods\s+pro", re.I), 'images/articles/apple-airpods-pro-2.jpg'),
    (re.compile(r"wf\-?1000xm5", re.I), 'images/articles/sony-wf-1000xm5.jpg'),
    (re.compile(r"macbook\s+pro", re.I), 'images/articles/macbook-pro-m3.jpg'),
    (re.compile(r"galaxy\s+watch\s+6", re.I), 'images/articles/samsung-galaxy-watch-6.jpg'),
    (re.compile(r"iphone\s+15\s+pro\s+max|iphone\s+photography|camera\s+phone", re.I), 'images/articles/iphone-15-pro-max-camera.jpg'),
    (re.compile(r"iphone\s+16\s+pro\s+max", re.I), 'images/articles/iphone-16-pro-max.jpg'),
    (re.compile(r"holiday\s+tech|gift\s+guide", re.I), 'images/articles/holiday-tech-2025.jpg'),
]

def pick_local_image(title: str, content: str) -> str:
    blob = f"{title}\n{content}"
    for rx, path in LOCAL_ASSETS:
        if rx.search(blob):
            if (ROOT / path).exists():
                return path
    return ''

