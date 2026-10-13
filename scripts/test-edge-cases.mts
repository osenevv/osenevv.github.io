import { isEngineeringRequirement } from '../src/jd.ts';
import { loadVault } from '../src/vault.ts';
import { chunkNote } from '../src/search.ts';

console.log('=== RUNNING EDGE CASE BATTERY ===\n');

// 1. Non-tech with experience keywords
const experienceAlienCases = [
  '5+ years of clinical veterinary medicine',
  'Senior French pastry chef with proven track record',
  'Lead kindergarten teacher with 7 years experience',
  'Bachelor degree in Nursing or Kinesiology',
  'Master degree in Classical 18th Century Literature',
  'Doctorate in Dental Surgery',
  'Coordinate corporate legal compliance in healthcare',
];

console.log('1. ALIEN REQUIREMENTS WITH EXPERIENCE KEYWORDS:');
for (const req of experienceAlienCases) {
  const isEng = isEngineeringRequirement(req, false);
  console.log(`[${isEng ? 'LEAK/FAIL' : 'PASS'}] "${req}" → isEngineering: ${isEng}`);
}

// 2. VAULT AUDIT: Broken links, missing files, link reciprocity
console.log('\n2. VAULT NOTE CONTENT & LINK AUDIT:');
const vault = loadVault();
console.log(`Loaded ${vault.notes.length} notes across the vault.`);

const allIds = new Set(vault.notes.map(n => n.id));
const allNames = new Set(vault.notes.map(n => n.name));

const brokenLinks: { source: string; target: string }[] = [];
for (const note of vault.notes) {
  for (const link of note.links) {
    if (!allIds.has(link) && !allNames.has(link)) {
      brokenLinks.push({ source: note.name, target: link });
    }
  }
}

if (brokenLinks.length === 0) {
  console.log('✓ All wikilinks resolve successfully. Zero broken links.');
} else {
  console.log(`Found ${brokenLinks.length} broken links:`);
  for (const b of brokenLinks) {
    console.log(`  - In "${b.source}": [[${b.target}]]`);
  }
}

// 3. NOTE CONTENT SIZING & QUALITY
console.log('\n3. NOTE CONTENT DENSITY:');
for (const note of vault.notes) {
  const chunks = chunkNote(note);
  const words = note.body.split(/\s+/).filter(Boolean).length;
  console.log(`- [${note.props.type ?? 'note'}] ${note.name}: ${words} words, ${chunks.length} chunks, ${note.links.length} outgoing links`);
  if (words < 50) {
    console.log(`  ⚠ WARNING: Note "${note.name}" is dangerously short (${words} words).`);
  }
}
