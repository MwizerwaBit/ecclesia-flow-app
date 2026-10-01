/**
 * @file link-audit.mjs
 * @description Cross-reference every navigation target in the source against the
 * routes the router actually defines.
 *
 * Catches the two failure modes a type checker cannot see:
 *   - DEAD    a <Link to="..."> or navigate(...) pointing at no route
 *   - ORPHAN  a defined route nothing links to, so it can only be reached by
 *             typing the URL
 *
 * Usage: node scripts/link-audit.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.tsx') || full.endsWith('.ts') ? [full] : [];
  });
}

const files = walk(SRC);

// ── 1. Routes the router defines ────────────────────────────────────────────
const routerSrc = readFileSync(join(SRC, 'routes', 'index.tsx'), 'utf8');

/** Route groups are `path: '/x'` on the parent and relative paths on children. */
const routes = new Set();
let base = '';
for (const line of routerSrc.split('\n')) {
  // A parent group declares its path at two-space indent. Everything after it
  // is a child until the next parent — inline or spread across lines.
  const parent = line.match(/^ {2}path:\s*'([^']+)'/);
  if (parent) {
    base = parent[1] === '/' ? '' : parent[1];
    routes.add(parent[1]);
    continue;
  }
  const child = line.match(/(?:^|\{)\s*path:\s*'([^']+)'/);
  if (child) {
    const path = child[1];
    // Absolute children (the standalone error routes) are not nested under base.
    routes.add(path.startsWith('/') ? path : `${base}/${path}`.replace(/\/+/g, '/'));
    continue;
  }
  if (/index:\s*true/.test(line)) routes.add(base || '/');
}

/** A concrete href matches a route pattern if the static segments line up. */
const patterns = [...routes]
  .map((r) => ({
    route: r,
    params: (r.match(/:/g) ?? []).length,
    re: new RegExp(`^${r.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/')}$`),
  }))
  // Fewest params wins, so /staff/members/export is not swallowed by
  // /staff/members/:id and then reported as an orphan.
  .sort((a, b) => a.params - b.params || b.route.length - a.route.length);

const matchRoute = (href) => patterns.find((p) => p.re.test(href))?.route;

// ── 2. Every navigation target in the source ────────────────────────────────
const links = new Map(); // href -> Set<file>

for (const file of files) {
  if (file.endsWith(join('routes', 'index.tsx'))) continue;
  const src = readFileSync(file, 'utf8');
  const rel = relative(SRC, file).replace(/\\/g, '/');

  for (const m of src.matchAll(/\bto=["'`](\/[^"'`${}]*)["'`]/g)) add(m[1], rel);
  for (const m of src.matchAll(/\bto=\{`(\/[^`]*)`\}/g)) add(m[1], rel);
  for (const m of src.matchAll(/navigate\(\s*["'`](\/[^"'`${}]*)["'`]/g)) add(m[1], rel);
  for (const m of src.matchAll(/navigate\(\s*`(\/[^`]*)`/g)) add(m[1], rel);
  for (const m of src.matchAll(/href:\s*["'](\/[^"']*)["']/g)) add(m[1], rel);
}

function add(href, file) {
  // Template holes and query strings are not part of the path.
  const clean = href.replace(/\$\{[^}]*\}/g, ':p').split('?')[0].replace(/\/$/, '') || '/';
  if (!links.has(clean)) links.set(clean, new Set());
  links.get(clean).add(file);
}

// ── 3. Report ───────────────────────────────────────────────────────────────
const dead = [];
const linked = new Set();

for (const [href, where] of [...links].sort()) {
  const hit = matchRoute(href);
  if (hit) linked.add(hit);
  else dead.push(`${href}\n      from ${[...where].join(', ')}`);
}

// Routes nothing points at. Detail/landing routes reached only by a dynamic
// href still count as linked via their pattern.
const orphans = [...routes]
  .filter((r) => !linked.has(r))
  .filter((r) => !['/403', '/404', '/500', '/offline', '/subscription-expired', '*'].includes(r))
  .sort();

console.log(`routes defined: ${routes.size}   distinct hrefs: ${links.size}\n`);

console.log(`DEAD LINKS (${dead.length})`);
console.log(dead.length ? dead.map((d) => '  ' + d).join('\n') : '  none');

console.log(`\nORPHAN ROUTES — nothing links here (${orphans.length})`);
console.log(orphans.length ? orphans.map((o) => '  ' + o).join('\n') : '  none');

process.exit(dead.length ? 1 : 0);
