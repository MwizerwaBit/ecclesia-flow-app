/**
 * @file nav-smoke.mjs
 * @description Drive the mobile menu and confirm it opens and navigates.
 *
 * The header's menu button was wired to a console.log, so every destination
 * outside the four bottom tabs was unreachable below 1024px. This asserts that
 * it is not silently broken again.
 *
 * Usage: node scripts/nav-smoke.mjs
 */
import puppeteer from 'puppeteer-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ORIGIN = 'http://localhost:5173';

const CASES = [
  // `expect` is a destination the role can reach; `absent` is one the permission
  // filter should have removed, so this also checks that nav never offers a
  // link that lands on Access Denied.
  { role: 'staff', start: '/staff/dashboard', expect: 'Offering batches', absent: 'Structure' },
  { role: 'board', start: '/board/dashboard', expect: 'White-label' },
  { role: 'platform_admin', start: '/platform/dashboard', expect: 'Erasure Queue' },
];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'shell',
  args: ['--no-sandbox', '--disable-gpu'],
});

let failures = 0;

for (const { role, start, expect, absent } of CASES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (r) =>
      localStorage.setItem(
        'ecclesia-auth',
        JSON.stringify({
          state: {
            session: {
              user: {
                id: `u-${r}`, firstName: 'S', lastName: 'T', email: 's@x.org',
                role: r, tenantId: 't1', mfaEnabled: true, createdAt: '2022-01-01',
              },
              accessToken: 'm',
              expiresAt: Date.now() + 3.6e6,
            },
          },
          version: 0,
        }),
      ),
    role,
  );

  await page.goto(`${ORIGIN}${start}`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 700));

  const menu = await page.$('button[aria-label="Open menu"]');
  if (!menu) {
    console.log(`FAIL ${role}: no menu button at 390px`);
    failures += 1;
    await page.close();
    continue;
  }

  await menu.click();
  await new Promise((r) => setTimeout(r, 400));

  const result = await page.evaluate(
    (label, forbidden) => {
      const drawer = document.querySelector('[role="dialog"][aria-label="Navigation"]');
      if (!drawer) return { open: false };
      const links = [...drawer.querySelectorAll('a')].map((a) => a.textContent.trim());
      return {
        open: true,
        count: links.length,
        has: links.some((l) => l.includes(label)),
        leaked: forbidden ? links.filter((l) => l.includes(forbidden)) : [],
      };
    },
    expect,
    absent ?? null,
  );

  if (!result.open) {
    console.log(`FAIL ${role}: menu button did not open a drawer`);
    failures += 1;
  } else if (!result.has) {
    console.log(`FAIL ${role}: drawer has ${result.count} links but not "${expect}"`);
    failures += 1;
  } else if (result.leaked.length) {
    console.log(`FAIL ${role}: drawer offers "${absent}", which this role cannot open`);
    failures += 1;
  } else {
    console.log(
      `ok   ${role}: ${result.count} destinations, incl. "${expect}"` +
        (absent ? `, and "${absent}" correctly hidden` : ''),
    );
  }

  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} failing` : '\nmobile navigation reachable for every role');
process.exit(failures ? 1 : 0);
