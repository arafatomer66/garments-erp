import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'docs', 'screenshots', 'dashboard.png');

const WEB = process.env.WEB_URL ?? 'http://localhost:4200';
const EMAIL = process.env.DEMO_EMAIL ?? 'owner@demo.local';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'demo-owner-pw1';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  defaultViewport: { width: 1600, height: 1100, deviceScaleFactor: 2 },
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[console error]', msg.text());
  });

  console.log('→ login page');
  await page.goto(`${WEB}/auth/login`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Fill login (PrimeNG inputs use IDs from inputId/id)
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.type('#email', EMAIL, { delay: 8 });
  await page.type('#password', PASSWORD, { delay: 8 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
    page.click('p-button button, button[type="submit"]'),
  ]);

  // Make sure we're on dashboard
  console.log('→ waiting for dashboard');
  await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for KPI tiles to render
  await page.waitForSelector('.kpi-tile', { timeout: 10000 });
  // Let charts settle
  await new Promise((r) => setTimeout(r, 1500));

  // Screenshot full page
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('✓ screenshot saved:', outPath);
} finally {
  await browser.close();
}
