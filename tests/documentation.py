"""Check local Markdown links, anchors, and balanced code fences in tracked project docs."""
from pathlib import Path
import re
from urllib.parse import unquote
root=Path(__file__).resolve().parents[1]
paths=[*sorted(root.glob('*.md')),*sorted((root/'docs').glob('*.md'))]
links=0
for path in paths:
    text=path.read_text(encoding='utf-8')
    assert len(re.findall(r'^```',text,re.M))%2==0,f'{path}: unclosed code fence'
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)',text):
        if target.startswith(('https://','http://','mailto:')):continue
        filepart,_,anchor=target.partition('#')
        dest=path.parent/unquote(filepart) if filepart else path
        assert dest.is_file(),f'{path.name}: missing {target}'
        if anchor:
            headings=re.findall(r'^#{1,6}\s+(.+)$',dest.read_text(encoding='utf-8'),re.M)
            slugs=[re.sub(r'[^\w\- ]','',h.lower()).replace(' ','-') for h in headings]
            assert anchor in slugs,f'{path.name}: missing anchor {target}'
        links+=1
print(f'PASS: {len(paths)} Markdown files, {links} local links/anchors, balanced code fences')
