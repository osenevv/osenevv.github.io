import { chromium } from 'playwright';

const base = process.env.PORTFOLIO_URL ?? 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage();

const pages = [
  ['homepage', '/#/'],
  ['ZettelLinker note', '/#/note/Projects%2FZettelLinker'],
  ['Yapper note', '/#/note/Projects%2FYapper'],
  ['Mafia Tracker note', '/#/note/Projects%2FMafia%20Tracker'],
];

let ok = true;
for (const [name, hash] of pages) {
  await page.goto(base + hash, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const count = await page.locator('.demo').count();
  const want = name === 'homepage' ? 3 : 0;
  if (count !== want) ok = false;
  console.log(`${count === want ? 'OK  ' : 'FAIL'} ${name}: ${count} demo(s), expected ${want}`);
}

await browser.close();
process.exit(ok ? 0 : 1);
