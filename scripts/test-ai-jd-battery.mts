/**
 * Battery of AI-developer job posts — verifies C++/coursework never ranks as Direct Match,
 * and that real production skills still surface.
 *
 * Run: npx vite-node scripts/test-ai-jd-battery.mts
 */
import { analyzeJobDescription, isEducationCredentialRequirement } from '../src/jd.ts';
import { loadVault } from '../src/vault.ts';
import { makeIndex } from './jd-index.mts';

type Expect = {
  /** Requirement substring → allowed levels (and optional banned note names). */
  reqIncludes: string;
  allow: Array<'strong' | 'related' | 'growth' | 'out_of_scope'>;
  banNotes?: string[];
  requireNotes?: string[];
};

type Job = {
  id: string;
  title: string;
  text: string;
  expects: Expect[];
  /** Allowed verdict labels for the whole posting. */
  verdicts?: string[];
  /** Substrings that must not be parsed as requirements. */
  notParsed?: string[];
};

const JOBS: Job[] = [
  {
    id: 'sample',
    title: 'Bundled sample (Sample button)',
    text: `We're hiring an AI Engineer to build retrieval and agent features.
- Design and ship RAG pipelines over internal documents
- Experience with embeddings and vector databases (pgvector, Qdrant, FAISS)
- Build evaluation harnesses to measure LLM quality and catch regressions
- Implement tool-calling agents that automate multi-step workflows
- Strong Python; comfortable with SQL and search
- Care about privacy and on-device processing
- Communicate clearly with non-technical stakeholders
What we offer: competitive salary, stock options, 25 days of holiday`,
    verdicts: ['Perfect Match.'],
    notParsed: ['salary', 'hiring'],
    expects: [
      { reqIncludes: 'RAG pipelines', allow: ['strong'], requireNotes: ['ZettelLinker'] },
      { reqIncludes: 'vector databases', allow: ['strong'], requireNotes: ['ZettelLinker'] },
      { reqIncludes: 'evaluation harnesses', allow: ['strong'], requireNotes: ['Outlier.AI'] },
      { reqIncludes: 'tool-calling agents', allow: ['strong'], requireNotes: ['Hegelmann Group'] },
      { reqIncludes: 'Strong Python', allow: ['strong'] },
      { reqIncludes: 'privacy', allow: ['strong'], requireNotes: ['Yapper'] },
      { reqIncludes: 'non-technical stakeholders', allow: ['strong', 'related'] },
    ],
  },
  {
    id: 'full-linkedin-paste',
    title: 'Whole-page paste with company blurb, benefits and apply footer',
    text: `Senior AI Engineer
Acme Analytics · Prague (Hybrid)
About us
Acme is a leading provider of analytics for millions of customers across Europe.
Requirements:
- 3+ years building production LLM applications in Python
- Experience with RAG, embeddings and vector search
- You can evaluate model outputs and set up regression tests for prompts
- Docker and CI/CD
- Fluent English
What we offer
- 25 days of vacation
- Meal vouchers and Multisport card
- Stock options
How to apply
Send your CV to jobs@acme.example`,
    verdicts: ['Perfect Match.', 'Strong Match.'],
    notParsed: ['vacation', 'Meal vouchers', 'Stock options', 'leading provider', 'Send your CV', 'Acme Analytics'],
    expects: [
      { reqIncludes: 'production LLM', allow: ['related'] },
      { reqIncludes: 'RAG', allow: ['strong'], requireNotes: ['ZettelLinker'] },
      { reqIncludes: 'evaluate model outputs', allow: ['strong'], requireNotes: ['Outlier.AI'] },
      { reqIncludes: 'Docker', allow: ['strong'], requireNotes: ['Mafia Tracker'] },
      { reqIncludes: 'Fluent English', allow: ['related'], requireNotes: ['Strengths'] },
    ],
  },
  {
    id: 'helpdesk',
    title: 'IT helpdesk — must not read as a fit',
    text: `IT Support Specialist
- Basic Windows and Microsoft 365 administration
- Helpdesk tickets and onboarding new laptops
- Active Directory, PowerShell, Intune
- Coordinate a small team of support technicians
- Czech and English`,
    verdicts: ['Different Technical Domain.'],
    expects: [
      { reqIncludes: 'Windows', allow: ['growth', 'out_of_scope'] },
      { reqIncludes: 'Active Directory', allow: ['growth', 'out_of_scope'] },
      { reqIncludes: 'Coordinate a small team', allow: ['growth'] },
      { reqIncludes: 'Czech and English', allow: ['related'], requireNotes: ['Strengths'] },
    ],
  },
  {
    id: 'frontend-react',
    title: 'Frontend React — mostly ramp',
    text: `Frontend Engineer
- 4+ years with React and Redux
- Strong CSS, Figma handoff and design systems
- Next.js server components
- Accessibility (WCAG 2.1)`,
    verdicts: ['Different Technical Domain.', 'High Architecture Overlap.'],
    expects: [
      { reqIncludes: 'React', allow: ['growth', 'related'] },
      { reqIncludes: 'Next.js', allow: ['growth', 'related'] },
    ],
  },
  {
    id: 'nurse',
    title: 'Non-tech role — nothing cited',
    text: `Registered Nurse
- Valid nursing license
- Experience in intensive care units
- Night shifts and weekend rota
- Patient care documentation`,
    verdicts: ['Different Technical Domain.'],
    expects: [
      { reqIncludes: 'nursing license', allow: ['out_of_scope', 'growth'] },
      { reqIncludes: 'intensive care', allow: ['out_of_scope', 'growth'] },
    ],
  },
  {
    id: 'czech-ad',
    title: 'Czech-language AI ad',
    text: `AI vývojář
Požadujeme:
- Zkušenost s Pythonem a LLM
- Znalost RAG a vektorových databází
- Komunikativní znalost angličtiny
Nabízíme:
- 5 týdnů dovolené
- Stravenky`,
    notParsed: ['dovolené', 'Stravenky', 'AI vývojář'],
    expects: [
      { reqIncludes: 'Pythonem', allow: ['strong'] },
      { reqIncludes: 'RAG', allow: ['strong'], requireNotes: ['ZettelLinker'] },
      { reqIncludes: 'angličtiny', allow: ['related'], requireNotes: ['Strengths'] },
    ],
  },
  {
    id: 'routing-edge-cases',
    title: 'Lines that used to cite the wrong note',
    text: `AI Engineer
- You can design prompts, evaluate the outputs and keep improving them.
- Experience analysing and rolling out AI solutions, for example as a business analyst.
- GitHub Enterprise and CI/CD.
- The duties include coordinating a small team.
- Interest in IT and AI, and basic Windows and Microsoft 365.
- Experience with neural networks and computer vision
- Python and TypeScript.`,
    expects: [
      { reqIncludes: 'design prompts', allow: ['strong'], requireNotes: ['Outlier.AI'] },
      { reqIncludes: 'business analyst', allow: ['strong'], requireNotes: ['ProfiFP'] },
      { reqIncludes: 'GitHub Enterprise', allow: ['related', 'growth'], banNotes: ['Mafia Tracker', 'Contact Manager'] },
      { reqIncludes: 'coordinating a small team', allow: ['growth'] },
      { reqIncludes: 'Windows', allow: ['growth', 'out_of_scope'] },
      { reqIncludes: 'computer vision', allow: ['related'], requireNotes: ['Charles University'], banNotes: ['Yapper'] },
      {
        reqIncludes: 'TypeScript',
        allow: ['growth'],
        banNotes: ['ZettelLinker', 'Personal Agentic Wiki'],
      },
    ],
  },
  {
    id: 'title-line',
    title: 'Posting title with employer is not a requirement',
    text: `Software Developer for LLM Pretraining Data Compliance, OpenEuroLLM, ÚFAL MFF UK
At least 3 to 5 years of NLP using machine learning and neural networks.
Excellent written and spoken English.`,
    notParsed: ['OpenEuroLLM'],
    expects: [
      { reqIncludes: 'NLP', allow: ['related'], requireNotes: ['Charles University'] },
      { reqIncludes: 'spoken English', allow: ['related'], requireNotes: ['Strengths'] },
    ],
  },
  {
    id: 'cpp-heavy',
    title: 'AI Platform Engineer — C++ inference runtime',
    text: `AI Platform Engineer
We're hiring an AI engineer to own our on-device inference runtime.
- Strong production C++ for low-latency model serving
- Experience with Python for training and eval glue
- Build RAG pipelines over internal documents
- Embeddings and vector search in production
- LLM evaluation harnesses and regression tests
- Comfortable with Linux, CMake, and performance profiling
What we offer: competitive salary, stock options`,
    expects: [
      { reqIncludes: 'C++', allow: ['related', 'growth'], banNotes: ['ArnoldC Interpreter'] },
      { reqIncludes: 'Python', allow: ['strong', 'related'] },
      { reqIncludes: 'RAG', allow: ['strong', 'related'] },
      { reqIncludes: 'vector search', allow: ['strong', 'related'] },
      { reqIncludes: 'evaluation', allow: ['strong', 'related'] },
    ],
  },
  {
    id: 'python-rag',
    title: 'Generative AI Engineer — RAG & agents',
    text: `Senior Generative AI Engineer
- Design and ship RAG pipelines with embeddings and hybrid search
- Build tool-calling agents with LangGraph or similar
- Strong Python; structured outputs and prompt engineering
- Vector databases (pgvector, Qdrant, FAISS)
- Evaluation harnesses for LLM quality
- 3+ years experience shipping AI features`,
    expects: [
      { reqIncludes: 'RAG', allow: ['strong', 'related'] },
      { reqIncludes: 'Python', allow: ['strong', 'related'] },
      { reqIncludes: 'LangGraph', allow: ['strong', 'related', 'growth'] },
      { reqIncludes: 'Evaluation', allow: ['strong', 'related'] },
      { reqIncludes: 'years experience', allow: ['growth', 'related', 'strong'] },
    ],
  },
  {
    id: 'eval-specialist',
    title: 'LLM Evaluation Engineer',
    text: `LLM Evaluation Engineer
- Design benchmarks and automated eval pipelines for frontier models
- Failure-mode analysis, prompt testing, quality gates in Python
- Experience with RLHF-style feedback or model behavior auditing
- Communicate findings to product and research
- Nice: RAG systems, agent tool-use evals`,
    expects: [
      { reqIncludes: 'eval', allow: ['strong', 'related'] },
      { reqIncludes: 'Python', allow: ['strong', 'related'] },
      { reqIncludes: 'Failure', allow: ['strong', 'related', 'growth'] },
    ],
  },
  {
    id: 'voice-agents',
    title: 'Voice / dialogue AI engineer',
    text: `Conversational AI Engineer — voice agents
- Build spoken dialogue systems and voice assistants
- Speech recognition, NLU, dialogue management
- Production Python services; optional on-device Whisper
- Integrate with CRM APIs and webhooks
- Experience with chatbots or agentic workflows`,
    expects: [
      { reqIncludes: 'dialogue', allow: ['strong', 'related', 'growth'] },
      { reqIncludes: 'Whisper', allow: ['strong', 'related', 'growth'] },
      { reqIncludes: 'Python', allow: ['strong', 'related'] },
      { reqIncludes: 'agentic', allow: ['strong', 'related', 'growth'] },
    ],
  },
  {
    id: 'haskell-plus-ai',
    title: 'AI Engineer — Haskell services (odd mix)',
    text: `AI Engineer
- Production Haskell microservices for scoring APIs
- Also build RAG over Markdown knowledge bases
- Python OK for prototypes
- Embeddings and semantic search
- Strong software engineering fundamentals`,
    expects: [
      { reqIncludes: 'Haskell', allow: ['related', 'growth'], banNotes: ['Toolbox', 'ArnoldC Interpreter'] },
      { reqIncludes: 'RAG', allow: ['strong', 'related'] },
      { reqIncludes: 'Embeddings', allow: ['strong', 'related'] },
    ],
  },
  {
    id: 'cpp-only-bullet',
    title: 'ML Engineer — C++ optional stack',
    text: `Machine Learning Engineer
- Ship ML features in Python
- Proficiency in C++ programming for performance-critical paths
- Experience with neural networks and computer vision
- SQL and data pipelines
- Docker and CI/CD`,
    expects: [
      { reqIncludes: 'C++', allow: ['related', 'growth'], banNotes: ['ArnoldC Interpreter'] },
      { reqIncludes: 'Python', allow: ['strong', 'related'] },
      { reqIncludes: 'computer vision', allow: ['strong', 'related', 'growth'] },
    ],
  },
  {
    id: 'csharp-desktop',
    title: 'AI + desktop engineer',
    text: `Software / AI Engineer
- C# and .NET desktop or local-first apps
- Integrate LLM APIs with structured outputs
- SQLite local storage and privacy-first design
- Python for eval scripts is a plus`,
    expects: [
      { reqIncludes: 'C#', allow: ['strong', 'related'], requireNotes: ['SatFreedom'] },
      { reqIncludes: 'SQLite', allow: ['strong', 'related', 'growth'] },
      { reqIncludes: 'structured', allow: ['strong', 'related', 'growth'] },
    ],
  },
  {
    id: 'junior-ai',
    title: 'Junior AI Engineer — generalist',
    text: `Junior AI Engineer
- Prior AI projects (uni or commercial OK)
- Python, LangChain, Docker, Git
- Model APIs OpenAI Anthropic
- Curious problem-solver
- Czech or English`,
    expects: [
      { reqIncludes: 'Python', allow: ['strong', 'related'] },
      { reqIncludes: 'LangChain', allow: ['strong', 'related', 'growth'] },
      { reqIncludes: 'AI projects', allow: ['strong', 'related', 'growth'] },
    ],
  },
  {
    id: 'video-clip-yolo',
    title: 'Multimodal / video search engineer',
    text: `Computer Vision / Video Search Engineer
- Experience with CLIP or OpenCLIP for text-to-image/video retrieval
- Object detection with YOLO on video frames
- Build interactive video retrieval / known-item search over keyframes
- Python for feature pipelines
- Nice: Whisper for audio tracks`,
    verdicts: ['Strong Match.', 'High Architecture Overlap.'],
    expects: [
      { reqIncludes: 'CLIP', allow: ['related'], requireNotes: ['Charles University'], banNotes: ['Yapper'] },
      { reqIncludes: 'YOLO', allow: ['related'], requireNotes: ['Charles University'], banNotes: ['Yapper'] },
      { reqIncludes: 'video retrieval', allow: ['related'], requireNotes: ['Charles University'], banNotes: ['Yapper'] },
      { reqIncludes: 'Whisper', allow: ['strong', 'related', 'growth'] },
    ],
  },
  {
    id: 'university-degree',
    title: 'AI/ML developer — degree line (BARTON-style)',
    text: `AI/ML Python developer
University degree in a technical, mathematical or economics field.
Very good SQL and Python, with 2+ years of putting agentic or LLM apps into production.
Bachelor's degree.`,
    expects: [
      {
        reqIncludes: 'University degree',
        allow: ['related'],
        requireNotes: ['Charles University'],
        banNotes: ['ProfiFP', 'Yapper'],
      },
      {
        reqIncludes: "Bachelor's degree",
        allow: ['related'],
        requireNotes: ['Charles University'],
        banNotes: ['ProfiFP', 'Yapper'],
      },
    ],
  },
];

const vault = loadVault();
const index = await makeIndex(vault);

let failed = 0;

for (const job of JOBS) {
  const { rows, verdict, matched, reqs } = await analyzeJobDescription(job.text, vault, index);
  console.log('\n' + '='.repeat(72));
  console.log(`${job.id} · ${job.title}`);
  console.log(`${verdict.label} · ${matched}/${reqs.length} matched · index=${index.status.kind}`);
  for (const level of ['strong', 'related', 'growth', 'out_of_scope'] as const) {
    const group = rows.filter((r) => r.level === level);
    if (!group.length) continue;
    console.log(`  [${level}]`);
    for (const row of group) {
      console.log(`    · ${row.req.slice(0, 88)}${row.req.length > 88 ? '…' : ''} → ${row.note?.name ?? '—'}`);
    }
  }

  for (const exp of job.expects) {
    const row = rows.find((r) => r.req.toLowerCase().includes(exp.reqIncludes.toLowerCase()));
    if (!row) {
      console.log(`  FAIL expect: no req containing "${exp.reqIncludes}"`);
      failed++;
      continue;
    }
    if (!exp.allow.includes(row.level)) {
      console.log(`  FAIL "${exp.reqIncludes}": level=${row.level} (allow ${exp.allow.join('|')}) note=${row.note?.name ?? '—'}`);
      failed++;
    } else {
      console.log(`  OK   "${exp.reqIncludes}": ${row.level} → ${row.note?.name ?? '—'}`);
    }
    for (const ban of exp.banNotes ?? []) {
      if (row.note?.name === ban) {
        console.log(`  FAIL "${exp.reqIncludes}" cited banned note ${ban}`);
        failed++;
      }
    }
    if (exp.requireNotes && row.level !== 'growth' && row.level !== 'out_of_scope' && !exp.requireNotes.includes(row.note?.name ?? '')) {
      console.log(`  FAIL "${exp.reqIncludes}" expected note ${exp.requireNotes.join('|')}, got ${row.note?.name}`);
      failed++;
    }
  }

  if (job.verdicts && !job.verdicts.includes(verdict.label)) {
    console.log(`  FAIL verdict "${verdict.label}" (allow ${job.verdicts.join(' | ')})`);
    failed++;
  }
  for (const bad of job.notParsed ?? []) {
    const leaked = reqs.find((r) => r.toLowerCase().includes(bad.toLowerCase()));
    if (leaked) {
      console.log(`  FAIL parsed non-requirement "${leaked}"`);
      failed++;
    }
  }
  for (const row of rows) {
    if ((row.level === 'growth' || row.level === 'out_of_scope') && row.note) {
      console.log(`  FAIL invariant: ${row.level} row still cites ${row.note.name}`);
      failed++;
    }
    if (row.note && !['strong', 'related'].includes(row.level)) continue;
    if (row.level === 'strong' && row.note && ['about', 'concept', 'education'].includes(String(row.note.props.type))) {
      console.log(`  FAIL invariant: Direct Match from ${row.note.props.type} note ${row.note.name}`);
      failed++;
    }
  }

  // Global invariants
  for (const row of rows) {
    if (row.level === 'strong') {
      const langs = row.req.toLowerCase().match(/c\+\+|haskell|prolog/g) ?? [];
      if (langs.length) {
        console.log(`  FAIL invariant: Direct Match on language req "${row.req.slice(0, 60)}" → ${row.note?.name}`);
        failed++;
      }
      if (row.note && ['Contact Manager', 'Charles University', 'ArnoldC Interpreter'].includes(row.note.name)) {
        // Coursework / class projects must never be Direct Match (education note may cite degree as Related only)
        if (row.note.name !== 'Charles University' || !/\b(degree|bachelor|university|maturita)\b/i.test(row.req)) {
          console.log(`  FAIL invariant: Direct Match citing coursework note ${row.note.name} for "${row.req.slice(0, 50)}"`);
          failed++;
        }
      }
      if (isEducationCredentialRequirement(row.req) && row.note?.name === 'ProfiFP') {
        console.log(`  FAIL invariant: degree req cited ProfiFP for "${row.req.slice(0, 50)}"`);
        failed++;
      }
    }
  }
}

console.log('\n' + '='.repeat(72));
console.log(failed ? `FAILED ${failed} assertion(s)` : 'ALL ASSERTIONS PASSED');
process.exit(failed ? 1 : 0);
