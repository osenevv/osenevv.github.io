import { analyzeJobDescription } from '../src/jd.ts';
import { loadVault } from '../src/vault.ts';
import { makeIndex } from './jd-index.mts';

const JOBS: { id: string; title: string; text: string }[] = [
  {
    id: '1',
    title: 'AI Engineer/ka, Air Bank',
    text: `AI Engineer, Air Bank
Hands-on experience building solutions on top of LLMs. The ad says using AI tools isn't enough.
You can design prompts, evaluate the outputs and keep improving them.
You can set up an AI evaluation using metrics, test sets or automated checks.
Hands-on RAG experience: document handling, chunking, embeddings and retrieval.
You can build a quick proof of concept and judge whether a use case is technically feasible.
Basic Python for automation, plus experience with LLM APIs or evaluation tools.
You can turn a business brief into a technical solution and explain what it can and can't do.
Excellent Czech and a secondary-school leaving exam (maturita).`,
  },
  {
    id: '2',
    title: 'AI Platform Engineer, UNIQA (Prague, Brno or Bratislava)',
    text: `AI Platform Engineer, UNIQA
Cloud and serverless development in Azure.
Building GenAI apps with LLMs, RAG and tool calling.
Python and TypeScript.
Designing agent workflows and their orchestration.
API design and integrating with other systems.
GitHub Enterprise and CI/CD.
Software engineering principles, testing and observability.
IAM, authorization, secret management and cloud security.
Designing and evaluating the quality of LLM apps, plus prompt engineering.
Analytical thinking, and communication across IT and business.
English at B2.`,
  },
  {
    id: '3',
    title: 'AI/ML Python developer, full remote, BARTON Consulting',
    text: `AI/ML Python developer, BARTON Consulting, full remote
University degree in a technical, mathematical or economics field.
At least 2 years in data science or AI/ML engineering. Data engineering experience is welcome.
Very good SQL and Python, with 2+ years of putting agentic or LLM apps into production.
Machine learning, the Claude Code or Claude Agent SDK, and tool calling and MCP integration patterns.
English good enough for an international team, plus basic Czech.
Nice to have: AWS, Snowflake, PostgreSQL, Airflow and NoSQL.
The duties include coordinating a small team. You can work fully remote from anywhere in Czechia, but not from abroad.`,
  },
  {
    id: '4',
    title: 'Software Developer for LLM Pretraining Data Compliance (OpenEuroLLM), ÚFAL MFF UK',
    text: `Software Developer for LLM Pretraining Data Compliance, OpenEuroLLM, ÚFAL MFF UK
At least 3 to 5 years of NLP using machine learning and neural networks.
Enough technical fluency to understand how LLMs are developed and to work with project partners.
Excellent written and spoken English.
A plus: experience on EU or other publicly funded research projects.
A plus: experience developing AI models.
Experienced NLP/AI researcher who will lead a small team finding personal data in training sets.`,
  },
  {
    id: '5',
    title: 'AI Adoption Specialist, TV Nova',
    text: `AI Adoption Specialist, TV Nova
At least 2 years in AI adoption, data science, process automation or rolling out digital tools.
You know what AI can and can't do, and how to use it safely.
Modern AI tools (ChatGPT, Copilot, Gemini, Perplexity, Claude), including building your own assistants and agents.
Basic technical knowledge: data, APIs, simple automations and integrations.
You can spot AI risks such as personal data, bias and hallucinations.
Strong communication, cross-team work, independence, and English.
Nice to have: KNIME, Tableau, Power BI or Python.
Bachelor's degree.`,
  },
  {
    id: '6',
    title: 'Data Engineer, Python and Java, Seznam.cz',
    text: `Data Engineer, Python and Java, Seznam.cz
Advanced data processing and building pipelines: transforming, cleaning, joining, aggregating and filtering data.
At least 2 years of programming.
Python, Scala or Java.
Advanced Linux.
Ideally: Kubernetes, Hadoop, Kafka and Spark.
Interest in open source and willingness to work with the latest AI models.
No degree required.`,
  },
  {
    id: '7',
    title: 'Junior IT & AI Specialist, WOOD & Company',
    text: `Junior IT & AI Specialist, WOOD & Company, graduates welcome
Interest in IT and AI, and basic Windows and Microsoft 365.
Basic understanding of networks and IT environments.
Solving problems on your own, learning fast and talking with users.
Czech or Slovak, plus English.
Nice to have: Active Directory or Entra ID, PowerShell, Power Automate, Copilot, ChatGPT or basic scripting.
Bachelor's degree. Most of the job is helpdesk work, and the AI side is Copilot and ChatGPT support, simple assistants and Power Automate.`,
  },
  {
    id: '8',
    title: 'Analytik pro AI a automatizaci, ČSOB Pojišťovna',
    text: `Analytik pro AI a automatizaci, ČSOB Pojišťovna, Pardubice or Prague Radlice
Experience analysing and rolling out AI solutions, for example as a business analyst. You can design a use case and judge its value.
You can turn business needs into clear briefs and good documentation.
You can lead discussions, present your conclusions and connect teams.
Independent, and you plan your own work.
Keen on AI and generative AI. The ad says you don't have to be an expert.
English at B1 or better.
A plus: insurance or finance knowledge, and experience with process analysis or automation.`,
  },
];

const vault = loadVault();
const index = await makeIndex(vault);

const embed = index.status.kind === 'semantic' ? 'semantic' : index.status.kind;

for (const job of JOBS) {
  const { rows, verdict, matched, reqs } = await analyzeJobDescription(job.text, vault, index);
  const s = rows.filter((r) => r.level === 'strong').length;
  const r = rows.filter((r) => r.level === 'related').length;
  const g = rows.filter((r) => r.level === 'growth').length;
  const o = rows.filter((r) => r.level === 'out_of_scope').length;
  console.log('\n' + '='.repeat(72));
  console.log(`${job.id}. ${job.title}`);
  console.log(`${verdict.label} · ${matched}/${reqs.length} matched · strong ${s} · related ${r} · growth ${g} · out ${o} · index=${embed}`);
  for (const level of ['strong', 'related', 'growth', 'out_of_scope'] as const) {
    const group = rows.filter((x) => x.level === level);
    if (!group.length) continue;
    const label =
      level === 'strong' ? 'DIRECT MATCH' : level === 'related' ? 'RELATED' : level === 'growth' ? 'FAST RAMP' : 'OUT OF SCOPE';
    console.log(`  [${label}]`);
    for (const row of group) {
      const note = row.note?.name ?? '—';
      console.log(`    · ${row.req} → ${note}`);
    }
  }
}
