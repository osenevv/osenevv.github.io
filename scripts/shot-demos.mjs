import { chromium } from 'playwright';
import { spawn } from 'child_process';

const vite = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], { cwd: process.cwd(), stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 1500));

let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`);
  if (!ok) failed = true;
};
const wait = (page, ms) => page.waitForTimeout(ms);

try {
  const browser = await chromium.launch();

  for (const [name, width] of [
    ['desktop', 1280],
    ['mobile', 375],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: width > 800 ? 900 : 2400 }, deviceScaleFactor: 2 });
    await page.goto('http://localhost:4174/#/', { waitUntil: 'domcontentloaded' });
    await page.mouse.move(0, 0);
    await page.locator('.demo').first().evaluate((d) => scrollTo(0, d.getBoundingClientRect().top + scrollY - 60));

    // Autoplay for ~22 s: sample state and bounds every 500 ms.
    const seen = { zl2: false, zlBack: false, rec: false, filed: false, night: false, out: false };
    let outOfBounds = 0;
    for (let t = 0; t < 44; t++) {
      const s = await page.$$eval('.demo', (demos) =>
        demos.map((d) => {
          const stage = d.querySelector('.demo-stage');
          const r = d.getBoundingClientRect();
          const row = d.closest('.project-row').getBoundingClientRect();
          const sr = stage.getBoundingClientRect();
          const culprit = [...stage.querySelectorAll('*')].find((n) => {
            const b = n.getBoundingClientRect();
            return b.width && (b.bottom > sr.bottom + 1 || b.right > sr.right + 1) && !n.closest('.zl-note');
          });
          return {
            demo: d.dataset.demo,
            culprit: culprit ? String(culprit.className.baseVal ?? culprit.className) : '',
            phase: d.dataset.phase,
            state: d.dataset.state,
            night: d.classList.contains('is-night'),
            out: d.querySelectorAll('.mt-seat.is-out').length,
            cards: d.querySelectorAll('.yp-card').length,
            bounds: !(stage.scrollHeight > stage.clientHeight + 1 || stage.scrollWidth > stage.clientWidth + 1 || r.right > row.right + 1),
          };
        }),
      );
      const [zl, yp, mt] = s;
      if (zl.phase === '2') seen.zl2 = true;
      if (seen.zl2 && zl.phase === '0') seen.zlBack = true;
      if (yp.state === 'rec') seen.rec = true;
      if (yp.cards > 1) seen.filed = true;
      if (mt.night) seen.night = true;
      if (mt.out > 0) seen.out = true;
      for (const x of s.filter((x) => !x.bounds)) {
        outOfBounds += 1;
        console.log(`     overflow in ${x.demo}: ${x.culprit}`);
      }
      if (name === 'desktop' && (t === 6 || t === 14 || t === 24)) await page.locator('#work').screenshot({ path: `scripts/demo-auto-${t}.png` });
      await wait(page, 500);
    }
    check(seen.zl2 && seen.zlBack, `${name}: ZettelLinker autoplay links then undoes (closed loop)`);
    check(seen.rec && seen.filed, `${name}: Yapper autoplay records and files a task`);
    check(seen.out && seen.night, `${name}: Mafia autoplay eliminates a seat and night falls`);
    check(outOfBounds === 0, `${name}: no demo left its box in 44 samples (${outOfBounds} violations)`);

    if (name === 'desktop') {
      const [zl, yp, mt] = [0, 1, 2].map((i) => page.locator('.demo').nth(i));

      // ZettelLinker: find → accept → text gains [[HNSW|…]] → undo
      await zl.hover();
      await wait(page, 300);
      if ((await zl.getAttribute('data-phase')) !== '0') await zl.locator('.demo-pill').first().click();
      await zl.locator('.zl-find').click();
      const z1 = await zl.getAttribute('data-phase');
      await wait(page, 700);
      await zl.locator('.zl-cand.is-top').click();
      await wait(page, 700);
      const bracket = await zl.locator('.zl-br').first().evaluate((n) => n.getBoundingClientRect().width);
      const linksVal = await zl.locator('.zl-links > span').nth(2).evaluate((n) => getComputedStyle(n).opacity);
      await zl.screenshot({ path: 'scripts/demo-zl-linked.png' });
      await zl.locator('.zl-find').click();
      await wait(page, 600);
      const z3 = await zl.getAttribute('data-phase');
      const bracketAfter = await zl.locator('.zl-br').first().evaluate((n) => n.getBoundingClientRect().width);
      check(z1 === '1' && bracket > 20 && linksVal === '1' && z3 === '0' && bracketAfter < 1, `ZettelLinker: note text shows [[HNSW|…]] (${Math.round(bracket)}px), links: 1, undo restores (${Math.round(bracketAfter)}px)`);

      // Yapper: record → stop → card (title ≠ meta) → record again
      await yp.hover();
      await wait(page, 2200);
      if ((await yp.getAttribute('data-state')) === 'rec') await yp.locator('.yp-rec-btn').click(), await wait(page, 2200);
      const before = await yp.locator('.yp-card').count();
      await yp.locator('.yp-rec-btn').click();
      const r1 = await yp.getAttribute('data-state');
      await wait(page, 900);
      await yp.locator('.yp-rec-btn').click();
      const r2 = await yp.getAttribute('data-state');
      await wait(page, 1900);
      const r3 = await yp.getAttribute('data-state');
      const first = await yp.locator('.yp-card').first().evaluate((c) => ({ title: c.querySelector('.yp-title > span').textContent, meta: c.querySelector('small').textContent }));
      const dup = first.meta.toLowerCase().includes(first.title.toLowerCase());
      await yp.screenshot({ path: 'scripts/demo-yp-filed.png' });
      await yp.locator('.yp-rec-btn').click();
      const r4 = await yp.getAttribute('data-state');
      const after = await yp.locator('.yp-card:not(.is-leaving)').count();
      check(
        r1 === 'rec' && r2 === 'proc' && r3 === 'idle' && r4 === 'rec' && !dup && after >= Math.min(before + 1, 3),
        `Yapper: rec→proc→idle→rec again; card "${first.title}" / "${first.meta}" (no duplicate text)`,
      );

      // Mafia: play by hand until a side wins, then deal a new game from the result card.
      await mt.hover();
      await wait(page, 2500);
      if (await mt.evaluate((d) => d.classList.contains('is-over'))) {
        await mt.locator('.mt-deal').click();
        await wait(page, 900);
      }
      const log = [];
      let sawNom = false;
      let sawNight = false;
      let sawDay2 = false;
      for (let turn = 0; turn < 40 && !(await mt.evaluate((d) => d.classList.contains('is-over'))); turn++) {
        const label = await mt.locator('.mt-phase').textContent();
        if (label.includes('Night')) sawNight = true;
        if (label.includes('Day 2')) sawDay2 = true;
        const mainOn = await mt.locator('.mt-main').isEnabled();
        if (mainOn) {
          log.push(await mt.locator('.mt-main').textContent());
          await mt.locator('.mt-main').click();
          await wait(page, 1900);
        } else if ((await mt.locator('.mt-seat.is-pick').count()) > 0) {
          const pick = mt.locator('.mt-seat.is-pick').last();
          await pick.click();
          if (label.includes('Day')) sawNom = sawNom || (await pick.evaluate((n) => n.classList.contains('is-nom')));
          if (label.includes('Night')) await mt.screenshot({ path: 'scripts/demo-mt-night.png' });
          await wait(page, label.includes('Night') ? 1500 : 300);
        } else {
          await wait(page, 400);
        }
      }
      await wait(page, 2200);
      const title = await mt.locator('.mt-end-title').textContent();
      const eloText = `+${await mt.locator('.mt-elo').evaluate((n) => getComputedStyle(n).getPropertyValue('--elo').trim())} Elo`;
      const cardVisible = await mt.locator('.mt-end').evaluate((n) => getComputedStyle(n).visibility === 'visible' && getComputedStyle(n).opacity === '1');
      const noArrow = (await mt.locator('.mt-reload').count()) === 0;
      await mt.screenshot({ path: 'scripts/demo-mt-over.png' });
      await mt.locator('.mt-deal').click();
      await wait(page, 900);
      const reset =
        (await mt.locator('.mt-seat.is-out').count()) === 0 &&
        (await mt.locator('.mt-phase').textContent()).includes('Day 1') &&
        !(await mt.evaluate((d) => d.classList.contains('is-over'))) &&
        (await mt.locator('.mt-town').textContent()) === '7' &&
        (await mt.locator('.mt-maf').textContent()) === '3';
      check(sawNom && sawNight && sawDay2, `Mafia: nominations by day, kills at night, reached Day 2 (${log.join(' → ')})`);
      check(cardVisible && /Town wins|Mafia wins/.test(title) && /^\+(12|31) Elo$/.test(eloText) && noArrow, `Mafia: result card "${title}" ${eloText}, no corner arrow`);
      check(reset, 'Mafia: "Deal new roles" starts a fresh Day 1 with Town 7 · Mafia 3');

      // Project pages carry no screenshots any more.
      for (const id of ['Projects%2FZettelLinker', 'Projects%2FYapper', 'Projects%2FMafia%20Tracker', 'Projects%2FSatFreedom']) {
        await page.goto(`http://localhost:4174/#/note/${id}`, { waitUntil: 'domcontentloaded' });
        await wait(page, 400);
        const imgs = await page.locator('.note img').count();
        check(imgs === 0, `${decodeURIComponent(id)} page has no screenshots (${imgs} img)`);
      }
    }
    await page.close();
  }
  await browser.close();
} finally {
  vite.kill();
}
process.exit(failed ? 1 : 0);
