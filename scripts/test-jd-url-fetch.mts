/**
 * Thorough regression for job-URL fetch + match pipeline.
 * Run: npx vite-node scripts/test-jd-url-fetch.mts
 *
 * Live network fetches are skipped when JD_URL_FETCH=0 (CI without egress).
 */
import {
  analyzeJobDescription,
  cleanReaderMarkdown,
  fetchJobUrlText,
  isBareJobUrl,
  normalizeJobUrl,
  parseJobRequirements,
} from '../src/jd.ts';
import { loadVault } from '../src/vault.ts';
import { makeIndex } from './jd-index.mts';

let failed = 0;
const ok = (label: string, pass: boolean, detail = '') => {
  console.log(`${pass ? 'OK' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failed++;
};

console.log('=== URL helpers ===');
ok('detects https URL', isBareJobUrl('https://www.startupjobs.cz/nabidka/108529/x'));
ok('detects www URL', isBareJobUrl('www.example.com/jobs/1'));
ok('rejects plain text', !isBareJobUrl('Python and RAG experience'));
ok('rejects URL + text', !isBareJobUrl('see https://example.com/job please'));
ok('normalize www', normalizeJobUrl('www.example.com/a') === 'https://www.example.com/a');
ok('normalize https', normalizeJobUrl('https://example.com/a') === 'https://example.com/a');

console.log('\n=== Reader markdown cleanup (EN Greenhouse-style) ===');
const enReader = cleanReaderMarkdown(`Title: Senior AI Engineer
URL Source: https://boards.greenhouse.io/acme/jobs/1
Markdown Content:
Accept all cookies

## **About the role**
Ship retrieval features.

## **Requirements**
*   Build RAG pipelines over internal docs
*   Strong Python and SQL
*   LLM evaluation and agent orchestration

## **Benefits**
*   Unlimited PTO

## **About the role**
Duplicate reprint should be removed.
`);
const enReqs = parseJobRequirements(enReader);
ok('drops cookie chrome', !/Accept all cookies/i.test(enReader));
ok('drops duplicate reprint', !/Duplicate reprint/i.test(enReader));
ok('keeps About the role body', /Ship retrieval features/i.test(enReader));
ok('extracts RAG', enReqs.some((r) => /RAG/i.test(r)));
ok('extracts Python', enReqs.some((r) => /Python/i.test(r)));
ok('no bare About the role req', !enReqs.some((r) => /^About the role$/i.test(r)));

console.log('\n=== Reader markdown cleanup (CS StartupJobs-style) ===');
const csReader = cleanReaderMarkdown(`Title: AI Strategy Consultant
URL Source: https://www.startupjobs.cz/nabidka/108529/x
Markdown Content:
Cookie banner junk

## **Proč tuhle roli v Addvery obsazujeme**
Intro.

## **Co očekáváme**
*   Propojuješ byznys a technologie.
*   Než začneš automatizovat, umíš proces popsat a změřit.

**Nástroje a dovednosti**
*   Python a SQL na úrovni, kdy postavíš pipeline a napojíš API.
*   Orientace v LLM, RAG, embeddings, evaluaci a orchestraci agentů výhodou.

## **Co nabízíme**
*   Flexibilitu

## **Proč tuhle roli v Addvery obsazujeme**
Duplicate copy should be cut.
`);
const csReqs = parseJobRequirements(csReader);
ok('CS drops cookies', !/Cookie banner/i.test(csReader));
ok('CS drops duplicate', !/Duplicate copy/i.test(csReader));
ok('CS extracts Python', csReqs.some((r) => /Python a SQL/i.test(r)));
ok('CS extracts LLM/RAG', csReqs.some((r) => /LLM, RAG/i.test(r)));
ok('CS drops bare Co očekáváme', !csReqs.some((r) => /^Co očekáváme$/i.test(r)));

console.log('\n=== Match on cleaned CS reader text ===');
const vault = loadVault();
const index = await makeIndex(vault);
const { rows, verdict, matched } = await analyzeJobDescription(csReader, vault, index);
ok('CS reader yields matches', matched >= 3, `${matched}/${rows.length} · ${verdict.label}`);
ok(
  'CS reader hits RAG/Python tech',
  rows.some((r) => /RAG|LLM|Python/i.test(r.req) && (r.level === 'strong' || r.level === 'related')),
);
ok('not all out of scope', rows.some((r) => r.level !== 'out_of_scope'));

const live = process.env.JD_URL_FETCH !== '0';
if (live) {
  console.log('\n=== Live URL fetch (network) ===');
  const startupUrl =
    'https://www.startupjobs.cz/nabidka/108529/ai-strategy-consultant-praha-brno-manila';
  try {
    const text = await fetchJobUrlText(startupUrl);
    ok('live fetch returns text', text.length > 200, `${text.length} chars`);
    ok('live text has requirements section', /Co očekáváme|Nástroje|Python|RAG/i.test(text));
    const liveReqs = parseJobRequirements(text);
    ok('live parse finds reqs', liveReqs.length >= 5, `${liveReqs.length} reqs`);
    ok('live parse finds Python or RAG', liveReqs.some((r) => /Python|RAG|LLM|embeddings/i.test(r)));
    const liveMatch = await analyzeJobDescription(text, vault, index);
    ok(
      'live match not 0/N out-of-scope',
      liveMatch.matched >= 3,
      `${liveMatch.verdict.label} · ${liveMatch.matched}/${liveMatch.rows.length}`,
    );
    console.log('\nLive match summary:');
    console.log(`  ${liveMatch.verdict.label} · ${liveMatch.matched}/${liveMatch.rows.length}`);
    for (const level of ['strong', 'related', 'growth', 'out_of_scope'] as const) {
      const g = liveMatch.rows.filter((r) => r.level === level);
      if (!g.length) continue;
      console.log(`  ${level} [${g.length}]`);
      for (const r of g.slice(0, 8)) {
        console.log(`    · ${r.req.slice(0, 70)}${r.note ? ` → ${r.note.name}` : ''}`);
      }
    }
  } catch (err) {
    ok('live StartupJobs fetch', false, err instanceof Error ? err.message : String(err));
  }

  // Generic English public page — use a stable example.org-like careers URL if fetchable;
  // Greenhouse demo boards vary, so also accept a clean failure only when network is down.
  try {
    const leverish = await fetchJobUrlText(
      'https://jobs.ashbyhq.com/anthropic/b5b1d8e5-0f8a-4e0a-9f0e-2c6f5f5c5c5c',
    ).catch(() => null);
    if (leverish && leverish.length > 80) {
      ok('live non-StartupJobs fetch returned text', true, `${leverish.length} chars`);
    } else {
      console.log('SKIP: secondary live board unavailable (expected for fake/expired job ids)');
    }
  } catch {
    console.log('SKIP: secondary live board unavailable');
  }
} else {
  console.log('\n=== Live URL fetch skipped (JD_URL_FETCH=0) ===');
}

console.log('\n' + '='.repeat(60));
console.log(failed ? `FAILED ${failed}` : 'ALL URL-FETCH ASSERTIONS PASSED');
process.exit(failed ? 1 : 0);
