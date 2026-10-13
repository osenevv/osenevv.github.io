/**
 * Print how individual requirement lines are classified.
 * Run: [JD_INDEX=semantic] npx vite-node scripts/debug-sample-jd.mts ["requirement" ...]
 */
import { analyzeJobDescription } from '../src/jd.ts';
import { loadVault } from '../src/vault.ts';
import { makeIndex } from './jd-index.mts';

const SAMPLE = `We're hiring an AI Engineer to build retrieval and agent features.
- Design and ship RAG pipelines over internal documents
- Experience with embeddings and vector databases (pgvector, Qdrant, FAISS)
- Build evaluation harnesses to measure LLM quality and catch regressions
- Implement tool-calling agents that automate multi-step workflows
- Strong Python; comfortable with SQL and search
- Care about privacy and on-device processing
- Communicate clearly with non-technical stakeholders`;

const vault = loadVault();
const index = await makeIndex(vault);
const args = process.argv.slice(2);
const text = args.length ? args.map((a) => `- ${a}`).join('\n') : SAMPLE;
const { rows, verdict } = await analyzeJobDescription(text, vault, index);
console.log(`${verdict.label} · index=${index.status.kind}`);
for (const r of rows) console.log(r.level.padEnd(12), '|', r.req.slice(0, 70).padEnd(70), '|', r.note?.name ?? '-', r.heading ? `§${r.heading}` : '');
