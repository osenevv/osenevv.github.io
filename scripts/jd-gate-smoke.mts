import { isBareJobUrl, isEngineeringRequirement, normalizeJobPaste, parseJobRequirements } from '../src/jd.ts';

const engineeringCases: [string, boolean, boolean][] = [
  ['singing and breakdancing', false, false],
  ['Coordinate corporate payroll in SAP', false, false],
  ['5+ years of experience in pastry baking', false, false],
  ['Senior real estate agent with proven track record', false, false],
  ['Bachelor degree in Nursing or Kinesiology', false, false],
  ['Real estate residential property leasing agent', false, false],
  ['Blood sample testing in a medical laboratory', false, false],
  ['Managing kitchen scale and food inventory', false, false],
  ['Deep knowledge of LangChain and Pinecone', true, false],
  ['5+ years of experience with LLMs', true, false],
  ['Build RAG pipelines and vector search in Python', true, false],
  ["Master's degree and 5 years experience", true, true],
];

let failed = false;
for (const [req, want, jobTech] of engineeringCases) {
  const got = isEngineeringRequirement(req, jobTech);
  const ok = got === want;
  console.log(`${ok ? 'OK' : 'FAIL'}: ${JSON.stringify(req)} (jobTech=${jobTech}) → ${got} (want ${want})`);
  if (!ok) failed = true;
}

const split = parseJobRequirements(
  'Deep knowledge of tools, e.g. LangChain and LlamaIndex.\nU.S. citizenship required.\nProficiency in C#. Must deploy to AWS.',
);
const splitOk =
  split.some((l) => /LangChain and LlamaIndex/i.test(l)) &&
  !split.some((l) => /^e\.g\.$/i.test(l.trim())) &&
  split.some((l) => /Proficiency in C#/i.test(l));
console.log(`${splitOk ? 'OK' : 'FAIL'}: requirement splitter preserves e.g. and C#`);
if (!splitOk) {
  console.log('  got:', split);
  failed = true;
}

const fullAd = parseJobRequirements(`
AI Engineer, Air Bank
Air Bank is one of the leading digital banks in the Czech Republic with millions of customers and a mission to make banking simple.
Founded in 2012, we are a market leader in mobile banking and continue to grow our technology teams in Prague.

Requirements:
- Hands-on experience building solutions on top of LLMs
- Strong Python and experience with RAG pipelines
- You can design prompts and evaluate model outputs

What we offer:
- Competitive salary and annual bonus
- 5 weeks of vacation and flexible working hours
- Meal vouchers, Multisport card, and pension contribution
- Hybrid office in Prague

Apply via jobs.cz with your CV by Friday.
`);

const adOk =
  fullAd.some((l) => /LLMs/i.test(l)) &&
  fullAd.some((l) => /RAG/i.test(l)) &&
  !fullAd.some((l) => /\b(vacation|meal vouchers|Multisport|Competitive salary|Apply via|market leader|Founded in)\b/i.test(l)) &&
  !fullAd.some((l) => /\bmillions of customers\b/i.test(l));
console.log(`${adOk ? 'OK' : 'FAIL'}: full job ad keeps requirements, drops company/benefits/apply`);
if (!adOk) {
  console.log('  got:', fullAd);
  failed = true;
}

const czechAd = parseJobRequirements(`
AI/ML Python developer, BARTON Consulting
Jsme přední česká poradenská společnost s tisíci klientů.

Požadavky:
• Vysokoškolské vzdělání technického směru
• Velmi dobrá znalost SQL a Pythonu, 2+ roky LLM v produkci
• Angličtina pro mezinárodní tým

Nabízíme:
• Stravenky, Multisport, 5 týdnů dovolené
• Plně home office

Jak se ucházet: zašlete životopis na jobs.cz
`);

const czechOk =
  czechAd.some((l) => /SQL and Python|SQL a Pythonu/i.test(l)) &&
  !czechAd.some((l) => /\b(stravenky|multisport|dovolen|přední česká|zašlete životopis|Jak se ucházet)\b/i.test(l));
console.log(`${czechOk ? 'OK' : 'FAIL'}: Czech full ad (požadavky / nabízíme / apply)`);
if (!czechOk) {
  console.log('  got:', czechAd);
  failed = true;
}

const htmlPaste = parseJobRequirements(
  normalizeJobPaste(`<p>Senior AI Engineer</p><p>We are hiring.</p><ul><li>Build RAG pipelines in Python</li><li>Experience with LLM evals</li></ul><p>What we offer: stock options and unlimited PTO</p>`),
);
const htmlOk =
  htmlPaste.some((l) => /RAG pipelines/i.test(l)) &&
  htmlPaste.some((l) => /LLM evals/i.test(l)) &&
  !htmlPaste.some((l) => /\b(stock options|unlimited PTO)\b/i.test(l));
console.log(`${htmlOk ? 'OK' : 'FAIL'}: HTML list paste drops benefits`);
if (!htmlOk) {
  console.log('  got:', htmlPaste);
  failed = true;
}

const linkedIn = parseJobRequirements(`
Senior ML Engineer — Acme Corp
About the company
Acme was founded in 1999 and operates in 40 countries.

About the job
You will design production ML systems and ship RAG features.
Python and SQL are required; Terraform is a plus.

How to apply
Send your resume to careers@acme.com
`);

const liOk =
  linkedIn.some((l) => /RAG features/i.test(l)) &&
  linkedIn.some((l) => /Python and SQL/i.test(l)) &&
  !linkedIn.some((l) => /\b(founded in 1999|40 countries|Send your resume|careers@)\b/i.test(l));
console.log(`${liOk ? 'OK' : 'FAIL'}: LinkedIn-style sections (about job vs company / apply)`);
if (!liOk) {
  console.log('  got:', linkedIn);
  failed = true;
}

const fullPage = parseJobRequirements(`
Jobs.cz
Hledat práci
Přihlásit
Registrace
Práce > IT > Praha > AI
Uložit inzerát
Sdílet
Tisknout

AI Engineer
Air Bank a.s.
Praha · HPP · hybrid
Zveřejněno 12. 3. 2025
Inzerát č. 12345678

Popis pracovní pozice
Air Bank is a leading digital bank in the Czech Republic.

Požadavky
Hands-on experience building solutions on top of LLMs
Strong Python and experience with RAG pipelines
You can design prompts and evaluate model outputs

Nabízíme
Stravenky, Multisport, 5 týdnů dovolené
Competitive salary

Odpovědět na inzerát
https://www.jobs.cz/prace/123456/
Poslat emailem

Podobné pozice
Junior Java Developer — Some Corp
Data Analyst — Other Corp
© Jobs.cz 2025
Manage cookies
Privacy policy
`);

const pageOk =
  fullPage.some((l) => /LLMs/i.test(l)) &&
  fullPage.some((l) => /RAG/i.test(l)) &&
  !fullPage.some((l) =>
    /\b(jobs\.cz|Podobné pozice|Junior Java|Manage cookies|Privacy policy|Přihlásit|Uložit inzerát|Stravenky|leading digital bank)\b/i.test(
      l,
    ),
  );
console.log(`${pageOk ? 'OK' : 'FAIL'}: whole-page Ctrl+A paste (jobs.cz junk)`);
if (!pageOk) {
  console.log('  got:', fullPage);
  failed = true;
}

const urlOnly = isBareJobUrl('https://www.startupjobs.cz/nabidka/108529/ai-strategy-consultant-praha-brno-manila');
const urlReqs = parseJobRequirements('https://www.startupjobs.cz/nabidka/108529/ai-strategy-consultant-praha-brno-manila');
const urlOk = urlOnly && urlReqs.length === 0 && !isBareJobUrl('Python and RAG experience');
console.log(`${urlOk ? 'OK' : 'FAIL'}: bare job URL is detected and yields no requirements`);
if (!urlOk) {
  console.log('  urlOnly:', urlOnly, 'reqs:', urlReqs);
  failed = true;
}

const startupJobs = parseJobRequirements(`
AI Strategy Consultant (Praha, Brno, Manila)
Addvery

Proč tuhle roli v Addvery obsazujeme
Klienti nás žádají o AI doporučení. Zakládáme samostatnou roli.

Co tě čeká
- Hledání příležitostí: Zmapovat proces klienta.

Co očekáváme
- Propojuješ byznys a technologie.
- Silný hands-on přístup. Postavíš prototyp, otestuješ varianty a posuneš to dál.

Co už máš za sebou
- 2 a více let praxe, která kombinuje byznys a technické doručení.

Nástroje a dovednosti
- Python a SQL na úrovni, kdy postavíš pipeline a napojíš API.
- Orientace v LLM, RAG, embeddings, evaluaci a orchestraci agentů výhodou.

Jazyky a pobyt
- Čeština nebo slovenština na úrovni rodilého mluvčího, angličtina na pracovní úrovni.

Výhodou
- Poradenské zázemí, včetně technologického poradenství v Big 4.

Co nabízíme
- Samostatnou roli, kterou u nás zakládáš.
- Flexibilitu a férový přístup.

Bude tě to bavit když
- AI tě zajímá věcně

Jsme Addvery, tým konzultantů.
Chceš vědět víc nebo rovnou poslat CV?
`);

const sjOk =
  startupJobs.some((l) => /Python a SQL/i.test(l)) &&
  startupJobs.some((l) => /LLM, RAG, embeddings/i.test(l)) &&
  !startupJobs.some((l) => /^(Co očekáváme|Nástroje a dovednosti|Jazyky a pobyt|Výhodou)$/i.test(l)) &&
  !startupJobs.some((l) => /\b(Samostatnou roli|Flexibilitu a férový|Bude tě to bavit|Jsme Addvery|Chceš vědět víc)\b/i.test(l));
console.log(`${sjOk ? 'OK' : 'FAIL'}: StartupJobs.cz Czech section headers`);
if (!sjOk) {
  console.log('  got:', startupJobs);
  failed = true;
}

const softCzech = parseJobRequirements(`Co očekáváme
Propojuješ byznys a technologie. Rozumíš potřebě klienta a umíš z ní udělat návrh funkčního řešení.
Než začneš automatizovat, umíš proces popsat a změřit.
Postavíš prototyp, otestuješ varianty a posuneš to dál.`);
const softOk =
  softCzech.some((l) => /byznys a technologie/i.test(l)) &&
  softCzech.some((l) => /automatizovat/i.test(l)) &&
  !softCzech.some((l) => /^Co očekáváme$/i.test(l));
console.log(`${softOk ? 'OK' : 'FAIL'}: Czech soft-skill paste keeps client/automation lines`);
if (!softOk) {
  console.log('  got:', softCzech);
  failed = true;
}

process.exit(failed ? 1 : 0);
