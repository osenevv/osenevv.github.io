import { chromium } from 'playwright';

const BASE = process.env.PORTFOLIO_URL ?? 'http://localhost:5173/#/';
const SAMPLE = `- Build RAG pipelines and vector search in Python
- 5+ years of experience with LLMs
- Deep knowledge of LangChain and Pinecone
- Coordinate corporate payroll in SAP`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForSelector('[data-embed="landing"] textarea', { timeout: 60000 });
await page.waitForTimeout(12000);

const root = page.locator('[data-embed="landing"]');
await root.locator('textarea').fill(SAMPLE);
await root.locator('[data-action="match"]').click();
await page.waitForTimeout(5000);

const html = await root.locator('.jd-results').innerHTML();
const text = await root.locator('.jd-results').innerText();

const checks = {
  sourceLinks: /Source:/i.test(html) && (html.match(/class="internal-link"/g) ?? []).length >= 1,
  punchyVerdict: /Perfect Match|Strong Match|Ready to Ship on Day 1|I Can Build This|High Architecture Overlap/i.test(text),
  productionReady: /Direct Match|Production-Ready/i.test(text),
  fastRamp: /Fast Ramp/i.test(text),
  outOfScope: /Out of Scope/i.test(text) && /Outside portfolio scope/i.test(text),
  interviewCta: /Schedule a call with me/i.test(text),
  noLearnMore: !/learn more/i.test(html),
};

await browser.close();

console.log('--- Fit check sample verification ---');
console.log(text.trim());
console.log('\n--- Assertions ---');
for (const [k, ok] of Object.entries(checks)) {
  console.log(`${ok ? 'OK' : 'FAIL'}: ${k}`);
}
if (!Object.values(checks).every(Boolean)) process.exit(1);
