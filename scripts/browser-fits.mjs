import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const jobsPath = join(dir, 'run-fits.mts');
const raw = readFileSync(jobsPath, 'utf8');
const jobsBlock = raw.match(/const JOBS[^=]*= (\[[\s\S]*?\n\]);/)?.[1];
if (!jobsBlock) throw new Error('Could not parse JOBS from run-fits.mts');
const JOBS = new Function(`return ${jobsBlock}`)();

const browser = await chromium.launch();
const page = await browser.newPage();
const base = process.env.PORTFOLIO_URL ?? 'http://localhost:5173/#/';
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForSelector('[data-embed="landing"] textarea', { timeout: 60000 });
await page.waitForTimeout(12000);
await page.locator('#fit').scrollIntoViewIfNeeded();

const out = [];

for (const job of JOBS) {
  const root = page.locator('[data-embed="landing"]');
  await root.locator('textarea').fill(job.text);
  await root.locator('[data-action="match"]').click();
  await page.waitForTimeout(4000);
  const text = await root.locator('.jd-results').innerText();
  out.push(`\n${'='.repeat(72)}\n${job.id}. ${job.title}\n${'='.repeat(72)}\n${text.trim() || '(no results)'}`);
}

await browser.close();
console.log(out.join('\n'));
