"""Verify local photo provenance, variant files and font licensing without network calls."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
photos=root/'frontend/assets/images/photos'
manifest=json.loads((photos/'sources.json').read_text())
assert len(manifest)==14
total=0
for key,record in manifest.items():
    assert record['license']=='https://unsplash.com/license'
    assert record['source'].startswith('https://images.unsplash.com/photo-')
    assert record['retrieved'] and record['alt'] and 'not a member' in record['usage']
    for variant in record['variants']:
        file=photos/variant['file']
        data=file.read_bytes()
        assert data[:4]==b'RIFF' and data[8:12]==b'WEBP',str(file)
        assert len(data)==variant['bytes'] and len(data)<500000,str(file)
        total+=len(data)
assert (root/'frontend/assets/fonts/InterVariable.woff2').read_bytes()[:4]==b'wOF2'
assert 'SIL OPEN FONT LICENSE' in (root/'frontend/assets/fonts/OFL.txt').read_text()
assert not list((root/'frontend/assets/images').rglob('*portrait*')),'Stock member portraits are not allowed'
print(f'PASS: 14 photo source records, responsive WebP variants ({total:,} bytes total), local Inter and font license')
