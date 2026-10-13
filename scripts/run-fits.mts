import { analyzeJobDescription } from '../src/jd.ts';
import { VectorIndex } from '../src/search.ts';
import { loadVault } from '../src/vault.ts';

const JOBS: { id: string; title: string; text: string }[] = [
  {
    id: '1',
    title: 'Synhawk — AI Model Red Teamer',
    text: `AI Model Red Teamer — break omnimodal models for deepfake voice-clone video-manipulation detection for telco and banking
- Stress-test models as raw models and inside shipped apps
- Trace whether each failure is the model preprocessing or the app
- Write clear replication reports and suggest fixes
- Dig into codecs encodings and configs
- Track weakness classes across releases
- Surface new use cases and data distributions where models fail
- Curious AI power-user who stress-tests models
- Basic ML and data-distribution intuition
- Some hands-on dev ML or data work
- Structured documentation and strong English
- Bonus adversarial mindset jailbreaks CTFs QA and audio video formats`,
  },
  {
    id: '2',
    title: 'localhost — Senior Generative AI Engineer',
    text: `Senior Generative AI Engineer
- Build and optimize LLM apps with prompting tool calls and structured output using LangChain and Pydantic
- Design advanced RAG chunking embeddings hybrid semantic search and vector databases
- Architect agentic systems with LangGraph and AutoGen
- Applied GenAI research and demo prototypes to stakeholders
- Expert Python for LLM and GenAI OpenAI LangChain LangGraph Langfuse
- Prompt engineering RAG and agent experience
- Vector databases and semantic search
- Traditional ML foundation and translate business needs into AI PoCs
- AWS cloud projects and English B2
- Master's degree and 5 years experience`,
  },
  {
    id: '3',
    title: 'Česká spořitelna — AI Architect / AI Engineer',
    text: `AI Architect AI Engineer for bank-wide AI platform
- Design bank-wide AI platform architecture and components
- Set AI standards and best practices
- Integrate AI into existing bank infrastructure
- Manage LLMs for internal and external use
- Coordinate tech across teams with product and dev on AI solution architecture
- Proven AI architecture and AI solution development
- Enterprise AI integration and LLM app design management
- Kubernetes Kafka networking and Git
- Azure Cloud and Azure AI
- Strong communication English B2-C1`,
  },
  {
    id: '4',
    title: 'Bloomreach — Senior AI/ML Engineer',
    text: `Senior AI ML Engineer for personalization Loomi
- Own ML features end-to-end APIs training inference pipelines high-perf serving monitoring L3 support
- Productionize models at terabyte multi-tenant scale
- Quality gates tests shadow deploys A/B drift alerts design docs runbooks
- 5+ years production Python services not scripts
- Real ML in production serve retrain monitor
- Scalable APIs and microservices
- GCP and Databricks AWS Azure transferable Git CI/CD
- Depth in Kubernetes IaC Spark distributed processing feature stores MLflow or evaluation experiment design
- Agentic coding tools daily`,
  },
  {
    id: '5',
    title: 'TV Nova — Senior Machine Learning Engineer',
    text: `Senior Machine Learning Engineer predictive intelligence for TV Oneplay
- Build train deploy ML pipelines churn LTV forecasting
- Design MLOps orchestration monitored scalable retrained models
- PoC to MVP to production APIs or DWH tables
- Design docs code review CI/CD AI-assisted coding
- Strong Python and PySpark traditional ML hands-on MLOps orchestration
- Databricks on Azure and or AWS Docker Kubernetes AKS
- Pragmatic fast MVP and solid engineering`,
  },
  {
    id: '6',
    title: 'Phrase — AI Researcher',
    text: `AI Researcher NLP machine translation research that ships
- Fine-tune LLMs for translation e.g. LoRA
- Build eval pipelines BLEU TER ChrF MQM COMET LLM-as-judge
- Build and evaluate agentic workflows multi-step reasoning tool use structured output
- Reproducible experiments partner with Product Engineering Solutions
- Benchmark frontier vs internal models data feedback loops quality systems
- Solid ML NLP LLM transformer hands-on MT eval IE generation search
- Agentic systems experiment and evaluation literacy
- Python Hugging Face PyTorch MSc or BSc strong portfolio
- Nice PhD localization MT W&B PydanticAI LangGraph publications OSS`,
  },
  {
    id: '7',
    title: 'Houseland — AI Engineer',
    text: `AI Engineer automation and AI for e-commerce furniture
- Build AI automation across CS marketing sales ops
- Integrate systems via API shop ERP logistics warehouse
- Own reliable data pipelines ship to production and maintain
- Own idea to production projects from CEO plus your proposals
- Strong Python practical LLM APIs OpenAI Anthropic for real tools not chat demos
- API integrations data SQL pipelines cleaning
- Map business processes to AI automation production mindset versioning errors monitoring autonomy
- Nice Make n8n e-commerce ERP RAG cloud deploy`,
  },
  {
    id: '8',
    title: 'CallMiner VOCALLS — Forward Deployed Engineer',
    text: `Forward Deployed Engineer conversational AI voice agents
- Take customer use case 0 to 1 into production not handoff prototype
- Own solution design build agent end-to-end custom integrations
- Integration surface systems of record channels telephony for voice
- Workflow tests iterate on real traffic KPIs resolution containment latency CSAT cost per contact
- Stay accountable past go-live feed reusable patterns to platform
- 2+ years shipping customer-facing software solutions FDE PS integration
- Conversation agent design or integration engineering production coding JS TS Python and or C# .NET
- SQL Linux Docker APIs auth webhooks queues failures concurrency
- Present defend designs to customer engineers and execs ambiguity eval loops travel
- English daily Czech strongly preferred nice voice agents CCaaS telephony SIP CRM ERP Azure AWS K8s GDPR ISO`,
  },
  {
    id: '9',
    title: 'ARTIN — Junior AI Engineer',
    text: `Junior AI Engineer design and implement AI solutions with LLMs CNNs ML for client projects
- Join small AI team explore propose approaches collaborate with AI spin-offs
- Prior AI projects commercial uni internships department projects OK
- Problem-solver explain tech simply creative over rigid instructions
- Czech or Slovak local clients and English
- AI-assisted engineering Python scikit LangChain PyTorch Docker K8s CI/CD Git
- Model APIs OpenAI Azure Anthropic cloud MLOps local LLMs AI ML concepts`,
  },
  {
    id: '10',
    title: 'Rossum Coupa — Senior AI Engineer',
    text: `Senior AI Engineer scalable cloud AI platform for sourcing procurement
- Build AI platform supplier selection bid comparison auctions autonomous bidding should-cost
- Turn research workloads retrieval game theory forecasting combinatorial optimization multimodal docs into production infra
- Improve data pipelines feature storage experiment tracking model lifecycle tooling benchmarks monitoring observability architecture docs
- 5+ years product ML-platform infra engineering ML solutions measurable impact strong Python
- Distributed systems microservices cloud-native SQL tuning schema ML tooling tracking registries pipelines CI/CD IaC observability English
- Nice train serve at scale ETL annotation workflows GPUs IDP DNNs Python RabbitMQ S3 Postgres Triton Kustomize Flux K8s AWS`,
  },
];

const vault = loadVault();
const index = new VectorIndex(vault);
await index.init();
while (index.status.kind === 'loading') await new Promise((r) => setTimeout(r, 200));

const embed = index.status.kind === 'semantic' ? 'semantic' : index.status.kind;

for (const job of JOBS) {
  const { rows, verdict, matched, reqs } = await analyzeJobDescription(job.text, vault, index);
  const s = rows.filter((r) => r.level === 'strong').length;
  const r = rows.filter((r) => r.level === 'related').length;
  const g = rows.filter((r) => r.level === 'growth').length;
  console.log('\n' + '='.repeat(72));
  console.log(`${job.id}. ${job.title}`);
  console.log(`${verdict.label} · parsed ${reqs.length} reqs · strong ${s} · related ${r} · growth ${g} · matched ${matched}/${reqs.length} · index=${embed}`);
  for (const level of ['strong', 'related', 'growth'] as const) {
    const group = rows.filter((x) => x.level === level);
    if (!group.length) continue;
    const label = level === 'strong' ? 'DONE' : level === 'related' ? 'CLOSE' : 'GAP';
    console.log(`  [${label}]`);
    for (const row of group) {
      const note = row.note?.name ?? '—';
      console.log(`    · ${row.req.slice(0, 90)}${row.req.length > 90 ? '…' : ''} → ${note}`);
    }
  }
}
