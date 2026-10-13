/**
 * Regression checks for the 8 Czech job ads — blocks known false-positive citations.
 * Run: npx vite-node scripts/test-user-jobs-invariants.mts
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { analyzeJobDescription } from '../src/jd.ts';
import { loadVault } from '../src/vault.ts';
import { makeIndex } from './jd-index.mts';

const dir = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(dir, 'run-user-jobs-oct8.mts'), 'utf8');
const jobsBlock = raw.match(/const JOBS[^=]*= (\[[\s\S]*?\n\]);/)?.[1];
if (!jobsBlock) throw new Error('Could not parse JOBS');
const JOBS = new Function(`return ${jobsBlock}`)() as { id: string; title: string; text: string }[];

type Rule = { jobId: string; reqIncludes: string; banNotes?: string[]; preferNotes?: string[] };

const RULES: Rule[] = [
  { jobId: '1', reqIncludes: 'AI evaluation', banNotes: ['Mafia Tracker'] },
  { jobId: '1', reqIncludes: 'proof of concept', banNotes: ['Mafia Tracker'] },
  { jobId: '2', reqIncludes: 'IAM', banNotes: ['Mafia Tracker'] },
  { jobId: '2', reqIncludes: 'GitHub Enterprise', banNotes: ['Contact Manager'] },
  { jobId: '3', reqIncludes: 'University degree', preferNotes: ['Charles University'], banNotes: ['ProfiFP'] },
  { jobId: '3', reqIncludes: 'Airflow', banNotes: ['Mafia Tracker'] },
  { jobId: '3', reqIncludes: 'fully remote', preferNotes: ['Contact', 'Strengths'], banNotes: ['ZettelLinker'] },
  { jobId: '4', reqIncludes: '3 to 5 years of NLP', banNotes: ['ZettelLinker', 'Zettelkasten'] },
  { jobId: '4', reqIncludes: 'EU or other publicly funded', banNotes: ['Hegelmann Group', 'Yapper', 'Mafia Tracker'] },
  { jobId: '5', reqIncludes: 'Copilot', banNotes: ['Mafia Tracker'] },
  { jobId: '6', reqIncludes: 'Scala or Java', banNotes: ['ArnoldC Interpreter'] },
  { jobId: '2', reqIncludes: 'Python and TypeScript', banNotes: ['ZettelLinker'] },
  { jobId: '6', reqIncludes: 'data processing', banNotes: ['Outlier.AI'] },
  { jobId: '7', reqIncludes: 'Windows and Microsoft', banNotes: ['ZettelLinker', 'Mafia Tracker'] },
  { jobId: '7', reqIncludes: 'helpdesk', banNotes: ['Mafia Tracker'] },
  { jobId: '8', reqIncludes: 'design a use case', banNotes: ['Mafia Tracker'] },
];

const vault = loadVault();
const index = await makeIndex(vault);

let failed = 0;

for (const job of JOBS) {
  const { rows } = await analyzeJobDescription(job.text, vault, index);
  const rules = RULES.filter((r) => r.jobId === job.id);
  for (const rule of rules) {
    const row = rows.find((r) => r.req.toLowerCase().includes(rule.reqIncludes.toLowerCase()));
    if (!row) {
      console.log(`FAIL [${job.id}] missing req containing "${rule.reqIncludes}"`);
      failed++;
      continue;
    }
    const name = row.note?.name ?? '—';
    if (rule.banNotes?.includes(name)) {
      console.log(`FAIL [${job.id}] "${rule.reqIncludes}" cited banned ${name} (${row.level})`);
      failed++;
    } else if (rule.preferNotes?.length && row.level !== 'growth' && row.level !== 'out_of_scope' && !rule.preferNotes.includes(name)) {
      console.log(`FAIL [${job.id}] "${rule.reqIncludes}" expected one of ${rule.preferNotes.join('|')}, got ${name}`);
      failed++;
    } else {
      console.log(`OK   [${job.id}] "${rule.reqIncludes}" → ${name} (${row.level})`);
    }
  }
}

console.log(failed ? `\nFAILED ${failed}` : '\nALL USER-JOB INVARIANTS PASSED');
process.exit(failed ? 1 : 0);
