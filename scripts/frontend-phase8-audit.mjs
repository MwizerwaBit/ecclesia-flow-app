/**
 * @file frontend-phase8-audit.mjs
 * @description One-off audit of TODO.md's "## 8. Frontend" items against the
 * real backend (VITE_API_MODE=rest), using seeded accounts. Logs in as each
 * role, visits every route relevant to the 8 items, and records: HTTP
 * status of the page's own navigation, any console error, and a screenshot.
 *
 * Requires: backend running on :8001 (seeded), `npm run dev` on :5173,
 * .env.local with VITE_API_MODE=rest.
 *
 * Usage: node scripts/frontend-phase8-audit.mjs
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ORIGIN = 'http://localhost:5173';
const OUT_DIR = 'scripts/.audit-out';
fs.mkdirSync(OUT_DIR, { recursive: true });

const ACCOUNTS = {
  leader: { email: 'leader.st-judes-parish@seed.ecclesiaflow.dev', password: 'SeedData2026Pass' },
  board: { email: 'board.st-judes-parish@seed.ecclesiaflow.dev', password: 'SeedData2026Pass' },
  staff: { email: 'staff.st-judes-parish@seed.ecclesiaflow.dev', password: 'SeedData2026Pass' },
  platform: { email: 'platform-admin@seed.ecclesiaflow.dev', password: 'SeedData2026Pass' },
};

// { item: TODO.md item number, role, path, label }
const CASES = [
  { item: 1, role: null, path: '/register', label: 'registration-wizard' },
  { item: 1, role: 'leader', path: '/onboarding', label: 'onboarding-checklist' },
  { item: 2, role: 'board', path: '/staff/settings/billing', label: 'billing-settings' },
  { item: 3, role: 'platform', path: '/platform/orgs', label: 'platform-org-review-list' },
  { item: 4, role: 'board', path: '/staff/settings/modules', label: 'module-settings' },
  { item: 5, role: 'board', path: '/staff/team/structure', label: 'leadership-structure' },
  { item: 5, role: 'board', path: '/board/hierarchy', label: 'hierarchy-tree' },
  { item: 6, role: null, path: '/churches', label: 'choose-church' },
  { item: 6, role: 'staff', path: '/portal/groups', label: 'my-groups' },
  { item: 7, role: 'staff', path: '/staff/groups/roles', label: 'group-roles-editor' },
  { item: 7, role: 'board', path: '/staff/team', label: 'team-roster' },
  { item: 8, role: 'staff', path: '/staff/events/new', label: 'event-editor' },
  { item: 8, role: 'board', path: '/staff/events/reviews', label: 'review-queue' },
];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'shell',
  args: ['--no-sandbox', '--disable-gpu'],
  userDataDir: `${OUT_DIR}/profile-${Date.now()}`,
});

const sessions = {};

async function login(role) {
  if (sessions[role]) return sessions[role];
  const { email, password } = ACCOUNTS[role];
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await page.goto(`${ORIGIN}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type="submit"]')]);
  const url = page.url();
  console.log(`[login:${role}] -> ${url}${consoleErrors.length ? ` (console errors: ${consoleErrors.join(' | ')})` : ''}`);
  sessions[role] = page;
  return page;
}

let failures = 0;

for (const { item, role, path, label } of CASES) {
  const page = role ? await login(role) : await browser.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && res.url().includes('/api/v1/')) {
      failedRequests.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });

  await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle0', timeout: 15000 }).catch((e) => {
    failedRequests.push(`navigation error: ${e.message}`);
  });
  await new Promise((r) => setTimeout(r, 500)); // let a lazy-loaded screen finish its first fetch

  const finalUrl = page.url();
  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
  const landedOnError =
    finalUrl.includes('/403') || finalUrl.includes('/404') || finalUrl.includes('/500') || /something went wrong/i.test(bodyText);

  const screenshotPath = `${OUT_DIR}/item${item}-${label}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  const ok = !landedOnError && failedRequests.length === 0;
  if (!ok) failures++;
  console.log(
    `[item ${item}] ${label} (${role ?? 'anon'}) requested=${path} landed=${finalUrl.replace(ORIGIN, '')} ${ok ? 'OK' : 'ISSUE'}`
  );
  if (!ok) {
    if (landedOnError) console.log(`    landed on error page / "something went wrong" text`);
    for (const f of failedRequests) console.log(`    ${f}`);
    for (const c of consoleErrors.slice(0, 5)) console.log(`    console: ${c}`);
  }
}

await browser.close();
console.log(`\n${failures} issue(s) found out of ${CASES.length} cases. Screenshots in ${OUT_DIR}/`);
process.exit(failures > 0 ? 1 : 0);
