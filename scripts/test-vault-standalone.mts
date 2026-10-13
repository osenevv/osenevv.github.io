import fs from 'fs';
import path from 'path';
import { isEngineeringRequirement } from '../src/jd.ts';

const VAULT_DIR = path.resolve('src/vault');

// Helper to walk vault
function getMdFiles(dir: string): string[] {
  let files: string[] = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(getMdFiles(full));
    } else if (item.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

const mdPaths = getMdFiles(VAULT_DIR);

interface NoteData {
  id: string;
  name: string;
  relPath: string;
  props: Record<string, any>;
  body: string;
  links: string[];
}

function parseFrontmatter(raw: string): { props: Record<string, any>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { props: {}, body: raw };
  const props: Record<string, any> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const value = kv[2].trim();
    props[kv[1]] = value.startsWith('[')
      ? value.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
      : value;
  }
  return { props, body: raw.slice(m[0].length) };
}

function stripCode(md: string): string {
  return md.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

const notes: NoteData[] = mdPaths.map((p) => {
  const rel = path.relative(VAULT_DIR, p);
  const id = rel.replace(/\.md$/, '');
  const name = path.basename(p, '.md');
  const raw = fs.readFileSync(p, 'utf-8');
  const { props, body } = parseFrontmatter(raw);
  const links: string[] = [];
  let match;
  const stripped = stripCode(body);
  while ((match = WIKILINK.exec(stripped)) !== null) {
    links.push(match[1]);
  }
  return { id, name, relPath: rel, props, body, links };
});

console.log('====================================================');
console.log(`VAULT AUDIT REPORT (${notes.length} total notes)`);
console.log('====================================================\n');

// 1. Broken wikilinks audit
const noteIds = new Set(notes.map((n) => n.id));
const noteNames = new Set(notes.map((n) => n.name));

const broken: { source: string; target: string }[] = [];
for (const n of notes) {
  for (const target of n.links) {
    if (!noteIds.has(target) && !noteNames.has(target)) {
      broken.push({ source: n.name, target });
    }
  }
}

console.log(`[BROKEN LINKS CHECK]: ${broken.length} broken links found.`);
for (const b of broken) {
  console.log(`  ❌ ${b.source} → [[${b.target}]]`);
}

// 2. Note length, density & formatting
console.log('\n[NOTE CONTENT & DENSITY AUDIT]:');
const shortNotes: NoteData[] = [];
const missingSummaries: NoteData[] = [];
for (const n of notes) {
  const words = n.body.split(/\s+/).filter(Boolean).length;
  if (words < 50) shortNotes.push(n);
  if (['project', 'experience'].includes(n.props.type) && !n.props.summary) {
    missingSummaries.push(n);
  }
}
console.log(`Short notes (< 50 words): ${shortNotes.length}`);
for (const sn of shortNotes) {
  console.log(`  ⚠ ${sn.name} (${sn.relPath}): ${sn.body.split(/\s+/).filter(Boolean).length} words`);
}
console.log(`Projects/Experience missing summary: ${missingSummaries.length}`);
for (const ms of missingSummaries) {
  console.log(`  ⚠ ${ms.name} missing summary prop`);
}

// 3. Testing edge cases of Job Description Filter
console.log('\n====================================================');
console.log('TESTING JOB DESCRIPTION DOMAIN GATING EDGE CASES');
console.log('====================================================\n');

const testCases = [
  // Obvious non-engineering
  { req: 'Singing and breakdancing', expectEng: false },
  { req: 'Pastry chef specializing in sourdough and croissant lamination', expectEng: false },
  { req: 'Veterinary small animal dental surgery', expectEng: false },
  { req: 'Real estate residential property leasing agent', expectEng: false },
  { req: 'Kindergarten early childhood Montessori education', expectEng: false },
  { req: 'High school head football coach', expectEng: false },
  { req: 'Oil rig commercial saturation diver', expectEng: false },

  // Non-engineering but TRICKY (contains "experience", "senior", "team", "bachelor")
  { req: '5+ years of experience in pastry baking', expectEng: false, note: 'Tricky: has "5+ years of experience"' },
  { req: 'Senior real estate agent with proven track record', expectEng: false, note: 'Tricky: has "Senior" and "proven track record"' },
  { req: 'Bachelor degree in Nursing or Kinesiology', expectEng: false, note: 'Tricky: has "Bachelor degree"' },
  { req: 'Lead flight attendant with 7 years tenure', expectEng: false, note: 'Tricky: has "Lead" and "years tenure"' },
  { req: 'PhD in 18th Century French Poetry', expectEng: false, note: 'Tricky: has "PhD"' },

  // Legit engineering requirements
  { req: '5+ years of experience with Python and distributed systems', expectEng: true },
  { req: 'Deep understanding of HNSW vector index mathematics', expectEng: true },
  { req: 'Experience with Kubernetes, Docker, and CI/CD', expectEng: true },
  { req: 'On-device Whisper audio transcription and latency optimization', expectEng: true },
  { req: 'LangGraph stateful agent orchestrations', expectEng: true },
  { req: 'Experience with C# and .NET desktop clients', expectEng: true },
];

let leakCount = 0;
for (const tc of testCases) {
  const got = isEngineeringRequirement(tc.req);
  const pass = got === tc.expectEng;
  if (!pass) leakCount++;
  console.log(`${pass ? '✓ PASS' : '❌ FAIL'}: "${tc.req}" → isEng: ${got} (expected ${tc.expectEng})${tc.note ? ` [${tc.note}]` : ''}`);
}

console.log(`\nDomain Gating Leaks: ${leakCount} / ${testCases.length}`);
