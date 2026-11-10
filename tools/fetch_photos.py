"""Fetch licensed editorial assets once; the application serves the local variants.

Run with Python 3 and Pillow installed. No image host is contacted at runtime.
Source images: https://unsplash.com/license (retrieved 2026-11-01).
These illustrative photographs do not depict or endorse registered members.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import io, json, urllib.request
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'frontend/assets/images/photos'
PHOTOS = {
    'hero': ('1522071820081-009f0129c71c', 'People working together around a table with laptops'),
    'study': ('1522202176988-66273c2fd55f', 'A group sharing ideas and studying together'),
    'project': ('1519389950473-47ba0277781c', 'A project team working together with laptops'),
    'workshop': ('1531482615713-2afd69097998', 'Participants learning together during a workshop'),
    'ai': ('1553877522-43269d4ea984', 'A person working at a shared table with a laptop'),
    'ml': ('1516321318423-f06f85e504b3', 'Hands reviewing information on a laptop'),
    'security': ('1550751827-4bd374c3f58b', 'Technology equipment in a security environment'),
    'software': ('1555066931-4365d14bab8c', 'Software source code on a computer screen'),
    'web': ('1460925895917-afdab827c52f', 'Website analytics and design work on a laptop'),
    'mobile': ('1512941937669-90a1b58e7e9c', 'A phone used for mobile application work'),
    'data': ('1551288049-bebda4e38f71', 'Charts and data displayed on a screen'),
    'network': ('1518770660439-4636190af475', 'Electronic components and connected hardware'),
    'cloud': ('1558494949-ef010cbdcc31', 'Server equipment used for computing infrastructure'),
    'devops': ('1497366811353-6870744d04b2', 'A shared workspace for collaborative projects'),
}

def fetch(entry):
    key, (photo, alt) = entry
    source = f'https://images.unsplash.com/photo-{photo}'
    request = urllib.request.Request(source + '?w=1800&q=88&fit=max&fm=jpg', headers={'User-Agent':'FriendsFinder-academic-assets/1.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
        original = ImageOps.exif_transpose(Image.open(io.BytesIO(response.read()))).convert('RGB')
    widths = (640, 1280) if key != 'hero' else (640, 1280, 1800)
    for width in widths:
        image = original.copy()
        image.thumbnail((width, 1600))
        image.save(OUT / f'{key}-{width}.webp', 'WEBP', quality=80, method=6)
    return key, {'source':source, 'license':'https://unsplash.com/license', 'retrieved':'2026-11-01',
                 'alt':alt, 'widths':list(widths), 'usage':'Illustrative environment; not a member identity or endorsement',
                 'variants':[{'file':f'{key}-{w}.webp','bytes':(OUT/f'{key}-{w}.webp').stat().st_size} for w in widths]}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        manifest = dict(pool.map(fetch, PHOTOS.items()))
    (OUT / 'sources.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f'Downloaded {len(manifest)} source photos and responsive WebP variants.')
