import { chromium } from 'playwright';
import { spawn } from 'child_process';

const vite = spawn('npx', ['vite', 'preview', '--port', '4173'], { cwd: process.cwd(), stdio: 'pipe' });

await new Promise((resolve) => setTimeout(resolve, 1500));

try {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('http://localhost:4173/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const checks = [];

  const avatar = await page.$('.hero-avatar');
  checks.push(['avatar', !!(avatar && (await avatar.isVisible()))]);

  const graph = await page.$('.hero-graph-stage .graph-stage');
  checks.push(['hero knowledge graph', !!(graph && (await graph.isVisible()))]);

  const about = await page.$('.about');
  checks.push(['about section', !!(about && (await about.isVisible()))]);

  const previewCount = await page.$$eval('.project-preview', (els) => els.length);
  checks.push(['no crowded project preview cards', previewCount === 0]);

  const projectRows = await page.$$eval('.project-row', (els) => els.length);
  checks.push(['clean project rows', projectRows >= 3]);

  const arrows = await page.$$eval('.project-row-arrow, .op-arrow', (els) => els.length);
  checks.push(['no decorative arrows near names', arrows === 0]);

  for (const [label, ok] of checks) {
    console.log(`[${ok ? 'OK' : 'FAIL'}] ${label}`);
  }

  await page.screenshot({ path: 'scripts/ui-overhaul-check.png', fullPage: false });
  console.log('Saved screenshot to scripts/ui-overhaul-check.png');

  const failed = checks.filter(([, ok]) => !ok);
  await browser.close();
  if (failed.length) process.exitCode = 1;
} finally {
  vite.kill();
}
