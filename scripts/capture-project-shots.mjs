import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, '..', 'public');
const yapperHtml = process.env.YAPPER_HTML ?? '/tmp/portfolio-screens/Yapper/yapper/web_static/index.html';
const zettelHtml = join(out, 'zettellinker-ui-snapshot.html');

function ensureZettelLinkerHtml() {
  const html = readFileSync(zettelHtml, 'utf8');
  if (!html.includes('<title>ZettelLinker</title>')) {
    throw new Error('missing public/zettellinker-ui-snapshot.html — run scripts/extract-zettellinker-ui.mjs');
  }
}

async function captureYapper(page) {
  await page.goto(`file://${yapperHtml}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(out, 'yapper-app.jpg'), type: 'jpeg', quality: 88, fullPage: false });
  console.log('Wrote public/yapper-app.jpg');
}

async function captureZettelLinker(page) {
  ensureZettelLinkerHtml();
  await page.goto(`file://${zettelHtml}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const vault = document.getElementById('vaultPath');
    if (vault) vault.value = '~/Documents/portfolio/src/vault';
    const log = document.getElementById('log');
    if (log) log.innerText = '[Ready]';
  });
  await page.screenshot({
    path: join(out, 'zettellinker-app.jpg'),
    type: 'jpeg',
    quality: 88,
    fullPage: true,
  });
  console.log('Wrote public/zettellinker-app.jpg (ui_server HTML from zettlellinker repo)');
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  await captureYapper(page);
} catch (e) {
  console.warn('Yapper capture skipped:', e.message);
}
await captureZettelLinker(page);
await browser.close();
