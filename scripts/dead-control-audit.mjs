/**
 * @file dead-control-audit.mjs
 * @description Find buttons that do nothing when pressed.
 *
 * A <Button> is live if it has an onClick, submits a form, is disabled, or is
 * wrapped in a <Link>/<a> that navigates. Anything else renders as a perfectly
 * convincing control and then ignores you — which teaches people the app is
 * broken faster than an error message would.
 *
 * Usage: node scripts/dead-control-audit.mjs [pathFilter]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const filter = process.argv[2] ?? '';

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.tsx') ? [full] : [];
  });
}

/** Reads the whole opening tag from `<Button` to its matching `>`, braces aware. */
function readTag(src, start) {
  let depth = 0;
  for (let i = start; i < src.length; i += 1) {
    const c = src[i];
    if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0) return src.slice(start, i + 1);
  }
  return src.slice(start, start + 400);
}

const findings = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, '/');
  if (filter && !rel.includes(filter)) continue;

  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  for (const match of src.matchAll(/<Button(?=[\s>])/g)) {
    const tag = readTag(src, match.index);
    const lineNo = src.slice(0, match.index).split('\n').length;

    // Live by its own attributes?
    if (/\bonClick=/.test(tag)) continue;
    if (/\btype="submit"/.test(tag)) continue;
    if (/\bdisabled(\s|=|$)/.test(tag) && !/disabled=\{false\}/.test(tag)) {
      // A permanently disabled button is intentional, not dead.
      if (/disabled\s*$/.test(tag) || /disabled=\{(true|!)/.test(tag)) continue;
    }

    // Skip JSDoc examples — they are comments, not rendered controls.
    if (/^\s*\*/.test(lines[lineNo - 1] ?? '')) continue;

    // Live by being wrapped in something that navigates? The button sits inside
    // a <Link>/<a> when the nearest preceding opening tag comes after the
    // nearest preceding closing one. Counting tags in a line window gets this
    // wrong the moment a sibling link closes just above.
    const before = src.slice(0, match.index);
    const lastIndexOfPattern = (re) => {
      let last = -1;
      for (const m of before.matchAll(re)) last = m.index;
      return last;
    };
    // `<a` may be followed by a newline when its attributes are wrapped.
    const lastOpen = Math.max(
      lastIndexOfPattern(/<Link(?=[\s>])/g),
      lastIndexOfPattern(/<a(?=[\s>])/g),
    );
    const lastClose = Math.max(
      lastIndexOfPattern(/<\/Link>/g),
      lastIndexOfPattern(/<\/a>/g),
    );
    if (lastOpen > lastClose) continue;

    const label =
      tag.match(/aria-label="([^"]+)"/)?.[1] ??
      lines[lineNo - 1]?.trim().slice(0, 40) ??
      '?';

    // The visible text usually sits on the next line for multi-line buttons.
    const text = (lines[lineNo] ?? '').trim().replace(/[{}<>]/g, '').slice(0, 36);

    findings.push({ file: rel, line: lineNo, label: text || label });
  }
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

console.log(`${findings.length} buttons with no action, across ${byFile.size} files\n`);
for (const [file, items] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${file}  (${items.length})`);
  for (const i of items) console.log(`   ${String(i.line).padStart(4)}  ${i.label}`);
}

process.exit(findings.length ? 1 : 0);
