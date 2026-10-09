"""Normalise CRLF files to LF so the repo is internally consistent."""
from pathlib import Path

TARGETS = {'.ts', '.tsx', '.css', '.json', '.mjs', '.html', '.md'}
roots = [Path('src'), Path('scripts'), Path('.')]

converted = []
seen = set()

for root in roots:
    if not root.exists():
        continue
    files = root.rglob('*') if root.name != '.' else root.glob('*')
    for p in files:
        if not p.is_file() or p.suffix not in TARGETS:
            continue
        key = str(p.resolve())
        if key in seen or 'node_modules' in key or 'dist' in key:
            continue
        seen.add(key)
        raw = p.read_bytes()
        if b'\r\n' in raw:
            p.write_bytes(raw.replace(b'\r\n', b'\n'))
            converted.append(p.as_posix())

print(f'{len(converted)} files normalised to LF')
for c in converted:
    print('  ', c)
