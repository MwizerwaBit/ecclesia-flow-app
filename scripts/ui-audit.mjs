/**
 * @file ui-audit.mjs
 * @description Render the app at the 390x844 design baseline and report layout defects.
 *
 * Exists because a clean `tsc` and a clean lint say nothing about whether a
 * screen is legible. This caught a tailwind-merge misconfiguration that had been
 * silently stripping every font-size class off `<Text>` — invisible to the type
 * checker, obvious the moment a heading was measured.
 *
 * Drives the Edge install already on the machine via puppeteer-core, so there is
 * no browser download.
 *
 * Usage (dev server must be running):
 *   node scripts/ui-audit.mjs <role> <route> [route...]
 *   node scripts/ui-audit.mjs staff /staff/dashboard /staff/finance
 *
 * Add --shots=<dir> to also write full-page screenshots.
 *
 * Note for Git Bash: prefix with MSYS_NO_PATHCONV=1 or the leading slash in each
 * route gets rewritten into a Windows path before Node ever sees it.
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ORIGIN = process.env.UI_AUDIT_ORIGIN ?? 'http://localhost:5173';

/** The design baseline. Every screen is designed here first. */
const BASELINE = { width: 390, height: 844 };

/** Named widths the audit can run at. Desktop matters once the sidebar appears. */
const VIEWPORTS = {
  mobile: BASELINE,
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
};

/** Comfortable touch target. WCAG 2.5.5 AAA; the product's users skew older. */
const MIN_TAP_PX = 44;

const TOKENS = ['display', 'h1', 'h2', 'h3', 'body-lg', 'body-sm', 'body', 'caption', 'label', 'number'];

const args = process.argv.slice(2);
const shotsArg = args.find((a) => a.startsWith('--shots='));
const shotsDir = shotsArg?.slice('--shots='.length);
const atArg = args.find((a) => a.startsWith('--at='));
const at = atArg?.slice('--at='.length) ?? 'mobile';
const VIEWPORT = VIEWPORTS[at] ?? BASELINE;
const [role = 'staff', ...routes] = args.filter((a) => !a.startsWith('--'));

if (shotsDir) mkdirSync(shotsDir, { recursive: true });

const session = {
  user: {
    id: `u-${role}`,
    firstName: 'Sarah',
    lastName: 'Thompson',
    email: 'sarah@stjudes.org',
    role,
    tenantId: 't1',
    tenantName: "St. Jude's Cathedral",
    tenantSlug: 'stjudes',
    mfaEnabled: true,
    createdAt: '2022-08-01T00:00:00Z',
  },
  accessToken: `mock-${role}-token`,
  expiresAt: Date.now() + 3_600_000,
};

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'shell',
  args: ['--no-sandbox', '--disable-gpu'],
});

const page = await browser.newPage();
await page.setViewport({ ...VIEWPORT, deviceScaleFactor: shotsDir ? 2 : 1 });

const problems = [];
page.on('pageerror', (e) => problems.push(`PAGEERROR ${e.message}`));
page.on('console', (m) => m.type() === 'error' && problems.push(m.text().slice(0, 120)));

// Seed the persisted zustand session on the app origin before routing anywhere.
await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded' });
await page.evaluate(
  (key, value) => localStorage.setItem(key, value),
  'ecclesia-auth',
  JSON.stringify({ state: { session }, version: 0 }),
);

let failures = 0;

for (const route of routes) {
  problems.length = 0;
  await page.goto(`${ORIGIN}${route}`, { waitUntil: 'networkidle0', timeout: 30_000 });
  // Let lazy route chunks mount and the mock-latency queries settle.
  await new Promise((r) => setTimeout(r, 800));
  // Scroll to the end so the bottom-bar overlap check sees the last content.
  // The layouts scroll an inner div, not the window, so scroll whichever
  // element actually overflows.
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    for (const el of document.querySelectorAll('div')) {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 4) {
        el.scrollTop = el.scrollHeight;
      }
    }
  });
  await new Promise((r) => setTimeout(r, 300));

  const report = await page.evaluate(
    (tokens, minTap) => {
      const vw = document.documentElement.clientWidth;

      /** True when some ancestor scrolls horizontally, so sticking out is by design. */
      const inScroller = (el) => {
        for (let n = el.parentElement; n; n = n.parentElement) {
          const o = getComputedStyle(n).overflowX;
          if (o === 'auto' || o === 'scroll') return true;
        }
        return false;
      };

      const type = {};
      for (const el of document.querySelectorAll('*')) {
        const cls = (el.className || '').toString();
        const token = tokens.find((t) => new RegExp(`(^| )text-${t}( |$)`).test(cls));
        if (!token || type[token]) continue;
        const cs = getComputedStyle(el);
        type[token] = `${Math.round(parseFloat(cs.fontSize))}px/${cs.fontWeight} ${cs.fontFamily.split(',')[0].replace(/"/g, '')}`;
      }

      const wide = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (getComputedStyle(el).position === 'fixed') continue;
        if (r.right > vw + 1 && !inScroller(el)) {
          wide.push(`${el.tagName.toLowerCase()}.${cls0(el)} right=${Math.round(r.right)}`);
        }
      }
      function cls0(el) {
        return (el.className || '').toString().split(' ')[0] || '?';
      }

      // Content hidden under the fixed bottom bar. Measured after scrolling to
      // the end of the page: whatever still sits beneath the bar's top edge
      // there can never be read or tapped.
      const obscured = [];
      const bottomBars = [...document.querySelectorAll('nav, div')].filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' || cs.display === 'none') return false;
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.bottom >= window.innerHeight - 2 && r.width > vw * 0.6;
      });
      const barTop = bottomBars.length
        ? Math.min(...bottomBars.map((el) => el.getBoundingClientRect().top))
        : null;

      if (barTop !== null) {
        /** The bar's own labels are not "hidden under the bar". */
        const insideFixed = (el) => {
          for (let n = el; n; n = n.parentElement) {
            if (getComputedStyle(n).position === 'fixed') return true;
          }
          return false;
        };

        for (const el of document.querySelectorAll('main *, body > div *')) {
          if (insideFixed(el)) continue;
          if (el.querySelector('*')) continue; // leaf nodes only
          const text = (el.textContent || '').trim();
          if (!text) continue;
          const r = el.getBoundingClientRect();
          if (r.height === 0) continue;
          // Visible in the viewport but sitting under the bar.
          if (r.top < window.innerHeight && r.bottom > barTop + 2) {
            obscured.push(`"${text.slice(0, 24)}" bottom=${Math.round(r.bottom)} bar=${Math.round(barTop)}`);
          }
        }
      }

      const smallTaps = [];
      for (const el of document.querySelectorAll('button, a[href], input, select')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // A link wrapping a button collapses around it when the button uses a
        // negative margin to grow its hit area. The button is the real target.
        if (el.tagName === 'A' && el.querySelector('button')) continue;
        if (r.height < minTap) {
          const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 26);
          smallTaps.push(`${Math.round(r.height)}px "${label}"`);
        }
      }

      return {
        heading: document.querySelector('h1, h2')?.textContent?.trim().slice(0, 44) ?? null,
        // A screen with no h1 cannot be navigated by heading, which is how
        // screen-reader users move around a page.
        hasH1: Boolean(document.querySelector('h1')),
        type,
        pageOverflow: document.documentElement.scrollWidth > vw
          ? `${document.documentElement.scrollWidth} > ${vw}`
          : null,
        wide: [...new Set(wide)].slice(0, 5),
        smallTaps: [...new Set(smallTaps)].slice(0, 6),
        // Measured outside the chrome: the sidebar alone carries enough text to
        // mask a completely blank content column, which is exactly how a broken
        // layout once passed this check.
        obscured: [...new Set(obscured)].slice(0, 4),
        textLen: (() => {
          const clone = document.body.cloneNode(true);
          clone.querySelectorAll('nav, aside, header, [role="dialog"]').forEach((n) => n.remove());
          return (clone.innerText || '').trim().length;
        })(),
      };
    },
    TOKENS,
    MIN_TAP_PX,
  );

  if (shotsDir) {
    const name = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';
    await page.screenshot({ path: `${shotsDir}/${name}.png`, fullPage: true });
  }

  const bad =
    report.pageOverflow ||
    report.wide.length ||
    report.textLen < 40 ||
    report.obscured.length ||
    !report.hasH1 ||
    problems.length;
  if (bad) failures += 1;

  console.log(`\n${bad ? 'FAIL' : 'ok  '}  ${route}  "${report.heading}"`);
  console.log('      type ' + Object.entries(report.type).map(([k, v]) => `${k}=${v}`).join('  '));
  if (report.textLen < 40) console.log('      !! content column rendered empty');
  if (report.pageOverflow) console.log(`      !! horizontal page overflow ${report.pageOverflow}`);
  if (report.wide.length) console.log('      !! overflowing: ' + report.wide.join(' | '));
  if (report.obscured.length)
    console.log('      !! hidden under the bottom bar: ' + report.obscured.join(' | '));
  if (report.smallTaps.length) console.log(`      tap <${MIN_TAP_PX}px: ` + report.smallTaps.join(' | '));
  if (problems.length) console.log('      !! console: ' + problems.slice(0, 2).join(' | '));
}

await browser.close();
console.log(`\n${routes.length - failures}/${routes.length} routes clean`);
process.exit(failures ? 1 : 0);
