import { noteHref } from './markdown';
import type { Chunk, VectorIndex } from './search';
import type { Note, Vault } from './vault';

const SAMPLE = `We're hiring an AI Engineer to build retrieval and agent features.
- Design and ship RAG pipelines over internal documents
- Experience with embeddings and vector databases (pgvector, Qdrant, FAISS)
- Build evaluation harnesses to measure LLM quality and catch regressions
- Implement tool-calling agents that automate multi-step workflows
- Strong Python; comfortable with SQL and search
- Care about privacy and on-device processing
- Communicate clearly with non-technical stakeholders
What we offer: competitive salary, stock options, 25 days of holiday`;

const EMAIL = 'osenevvova@gmail.com';
const CALENDLY_URL = 'https://calendly.com/osenevvova/30min';

const NOT_A_REQUIREMENT =
  /\b(we offer|what we offer|what you'll get|benefits?|perks?|why join|our mission|who we are|about our company|about the company|company overview|life at |equal opportunity|diversity and inclusion|nabízíme|benefity|o nás|o společnosti|co u nás nabízíme|proč u nás|stravenky|multisport|dovolená|příspěvek na|competitive salary|salary range|gross salary|compensation package|equity|stock options?|bonus scheme|holiday allowance|vacation days|pto|paid time off|health insurance|life insurance|pension plan|parental leave|meal vouchers|wellness program|team-?building|company car|13th salary|cafeteria|we're hiring|we are hiring|join our team|join us|apply now|send your cv|uchazeči|životopis|přihlaste se)\b|:$/i;

/** Requirement-ish wording — if absent on a long line, likely company copy not a skill bullet. */
const REQ_SIGNAL =
  /\b(must|required|require|need to|should have|we (need|want|require)|looking for|you (will|can|should)|experience|years?|yrs?|degree|bachelor|master|phd|proficient|fluent|hands-on|ability to|knowledge of|skills? in|understanding of|familiarity with|znalost|zkušenost|minimálně|alespoň|požadujeme|očekáváme|výhodou|nice to have|plus if)\b/i;

const SKIP_SECTION_HEADER =
  /^(#{1,3}\s*)?(what we offer|what you'll get|what you get|employee benefits?|our benefits?|perks?( and benefits)?|why join|why work (with|at)|about (us|the company|our company)|who we are|our mission|our values?|company (profile|overview)|life at |our culture|diversity|equal opportunity|recruitment process|hiring process|nabízíme|benefity|o nás|o společnosti|co (u nás )?nabízíme|proč (u nás|join)|plat a benefity|platové podmínky|mzda|odměna|compensation|salary|lokace|místo výkonu)\b/i;

const APPLY_SECTION_HEADER =
  /^(#{1,3}\s*)?(how to apply|apply (now|here|today)?|submit (your )?application|contact (us|hr)?|join (us|our team)|ucházení|jak se (přihlásit|ucházet)|přihláška|výběrové řízení)\s*:?\s*$/i;

/** Standalone section titles (not inline "Nice to have: AWS, …"). */
const MAIN_REQUIREMENT_SECTION_TITLE =
  /^(#{1,3}\s*)?(requirements?|qualifications?|what we (need|want|look for)|your (profile|skills|qualifications)|must have|required skills|key responsibilities|responsibilities|the role|about (the )?role|about the job|what you('ll| will) do|we are looking for|ideal candidate|candidate profile|předpoklady|požadavky|kvalifikace|náplň práce|pracovní náplň|co budete|co hledáme|hledáme|profil kandidáta|your tasks|you will|job description|o pozici|popis pozice)\s*:?\s*$/i;

const KEEP_SECTION_TITLE =
  /^(#{1,3}\s*)?(requirements?|qualifications?|what we (need|want|look for)|your (profile|skills|qualifications)|must have|required skills|key responsibilities|responsibilities|the role|about (the )?role|about the job|what you('ll| will) do|we are looking for|ideal candidate|candidate profile|předpoklady|požadavky|kvalifikace|náplň práce|pracovní náplň|co budete|co hledáme|hledáme|profil kandidáta|your tasks|you will|job description|o pozici|popis pozice|main duties|your responsibilities)\s*:?\s*$/i;

type SectionMode = 'body' | 'skip' | 'footer';

function sectionHeaderKind(line: string): 'skip' | 'keep' | 'apply' | 'none' {
  const t = line.trim();
  if (!t || t.length >= 140) return 'none';
  if (APPLY_SECTION_HEADER.test(t)) return 'apply';
  if (SKIP_SECTION_HEADER.test(t)) return 'skip';
  if (KEEP_SECTION_TITLE.test(t) || MAIN_REQUIREMENT_SECTION_TITLE.test(t)) return 'keep';
  if (/^nice to have\b/i.test(t.replace(/^#{1,3}\s*/, ''))) return 'keep';
  return 'none';
}

/** Normalize pasted HTML, bullets, and line endings from jobs boards. */
export function normalizeJobPaste(text: string): string {
  const expanded = text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(ul|ol|li|div|p|tr)>\s*/gi, '\n')
    .replace(/<p[^>]*>\s*/gi, '\n')
    .replace(/<li[^>]*>\s*/gi, '\n- ')
    .replace(/<[^>]+>/g, '')
    .replace(/[\u2022\u2023\u25E6\u25AA\u25CF\u2219\u00B7]\s*/g, '\n- ')
    .replace(/\n{3,}/g, '\n\n');

  return expanded
    .split('\n')
    .flatMap((line) => {
      const t = line.trim();
      const inline = t.match(
        /^(#{1,3}\s*)?(requirements?|qualifications?|požadavky|kvalifikace|key responsibilities|responsibilities|what we offer|benefits?|nabízíme|benefity)\s*:\s*(.+)$/i,
      );
      if (inline && inline[3].length > 12) {
        return [`${inline[1] ?? ''}${inline[2]}:`, inline[3]];
      }
      return [line];
    })
    .join('\n');
}

const WEB_END_SLICE =
  /^(podobné pozice|similar jobs|related jobs|další (inzeráty|nabídky|pozice|pracovní)|you may also like|recommended jobs|other openings|suggested jobs|jobs you might like|manage cookies|nastavení cookies|cookie (settings|preferences)|©|copyright|\(c\)|all rights reserved|sledujte nás|follow us)\b/i;

const WEB_START_SLICE =
  /^(popis pracovní pozice|popis pozice|job description|about (the )?job|náplň práce|pracovní náplň|požadavky|requirements|qualifications|kvalifikace|key responsibilities|what you('ll| will) do)\b/i;

const WEB_CHROME_SHORT =
  /^(jobs?\.cz|práce\.cz|profesia\.|startupjobs|linkedin|indeed|glassdoor|sign in|log in|register|přihlásit( se)?|registrace|odhlásit|můj účet|my account|hledat( práci)?|search( jobs)?|menu|domů|home|uložit( inzerát)?|save( job)?|sdílet|share|tisknout?|print|report( this job)?|easy apply|zpět|back to( search| results)?|zobrazit více|see more|show more|poslat emailem|email( this)? job|odpovědět( na inzerát)?|apply (with )?linkedin|přidat do oblíbených|add to favorites|sledovat( firmu)?|follow( company)?|navštívit web|visit website|zobrazit mapu|view map|inzerát č\.|job id|reference č\.|zveřejněno|posted|aktualizováno|updated)\s*$/i;

function isWebChromeLine(t: string): boolean {
  if (!t || t.length <= 2) return true;
  if (/^https?:\/\/\S+$/i.test(t) || /^www\.\S+$/i.test(t)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return true;
  if (/^\s*[\d,.]+\s*(Kč|CZK|EUR|USD|£)\s*(\/|\b)(month|měsíc|hour|hod)?/i.test(t) && t.length < 80 && !REQ_SIGNAL.test(t)) return true;
  if (
    t.length < 90 &&
    /(?:^|\s)(>|›|»)\s*[^.]{0,40}(?:\s*(>|›|»)\s*[^.]{0,40}){1,4}$/.test(t) &&
    !REQ_SIGNAL.test(t) &&
    !/\b(engineer|developer|analyst|python|llm)\b/i.test(t)
  )
    return true;
  if (t.length < 56 && WEB_CHROME_SHORT.test(t)) return true;
  if (
    /\b(cookie(s)?|souhlas se soubory|gdpr|privacy policy|terms (of|and) service|terms of use|ochrana osobních údajů|podmínky užívání|podmínky použití|používáme cookies)\b/i.test(t) &&
    t.length < 160 &&
    !REQ_SIGNAL.test(t)
  )
    return true;
  if (/^\s*(\+?\d[\d\s()-]{7,}\d)\s*$/.test(t)) return true;
  if (/^\s*[\d]{1,2}\.\s*[\d]{1,2}\.\s*[\d]{2,4}\s*$/.test(t)) return true;
  return false;
}

function looksLikeFullPagePaste(text: string): boolean {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 40 || text.length > 7000) return true;
  const chrome = lines.filter((l) => isWebChromeLine(l)).length;
  return chrome >= 6 || chrome / lines.length > 0.22;
}

/** Drop nav, footers, URLs, and similar-job blocks from a whole-page Ctrl+A paste. */
export function stripWebPageJunk(text: string): string {
  const lines = text.split('\n');
  const cleaned = lines.filter((line) => {
    const t = line.trim();
    if (!t) return true;
    return !isWebChromeLine(t);
  });

  if (!looksLikeFullPagePaste(text)) return cleaned.join('\n').replace(/\n{3,}/g, '\n\n');

  const rows = cleaned.map((raw) => ({ raw, t: raw.trim() }));
  let end = rows.length;
  for (let i = 0; i < rows.length; i++) {
    const t = rows[i].t;
    if (!t) continue;
    if (WEB_END_SLICE.test(t) || sectionHeaderKind(t) === 'apply') {
      end = i;
      break;
    }
  }

  let start = 0;
  for (let i = 0; i < end; i++) {
    const t = rows[i].t;
    if (!t) continue;
    if (MAIN_REQUIREMENT_SECTION_TITLE.test(t) || WEB_START_SLICE.test(t)) {
      start = Math.max(0, i - 3);
      break;
    }
  }

  if (start === 0) {
    for (let i = 0; i < Math.min(end, 100); i++) {
      const t = rows[i].t;
      if (!t) continue;
      const skillish = REQ_SIGNAL.test(t) || /\b(python|java|typescript|llm|rag|sql|docker|kubernetes|nlp|agent)\b/i.test(t);
      if (t.length >= 28 && skillish) {
        start = Math.max(0, i - 6);
        break;
      }
      if (/^[-*•]/.test(t) && skillish) {
        start = Math.max(0, i - 4);
        break;
      }
    }
  }

  return rows
    .slice(start, end)
    .map((r) => r.raw)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/** Drop marketing / benefits blocks and apply footers before line splitting. */
export function stripNonRequirementSections(text: string): string {
  const lines = text.split(/\n/);
  const out: string[] = [];
  let mode: SectionMode = 'body';

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (mode === 'body') out.push(line);
      continue;
    }
    const kind = sectionHeaderKind(t);
    if (kind === 'apply') {
      mode = 'footer';
      continue;
    }
    if (mode === 'footer') continue;

    if (kind === 'skip') {
      mode = 'skip';
      continue;
    }
    if (kind === 'keep') {
      mode = 'body';
      out.push(line);
      continue;
    }
    if (mode === 'skip') {
      if (/^nice to have\b/i.test(t.replace(/^#{1,3}\s*/, ''))) {
        mode = 'body';
        out.push(line);
      }
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

/** Drop title/company intro before an explicit requirements block (full job posts). */
function trimPreambleBeforeRequirements(text: string): string {
  const lines = text.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (MAIN_REQUIREMENT_SECTION_TITLE.test(t)) {
      return lines.slice(i + 1).join('\n');
    }
    if (/^[-*•]|\d+[.)]/.test(t) && REQ_SIGNAL.test(t)) {
      let start = i;
      while (start > 0) {
        const prev = lines[start - 1].trim();
        if (!prev) {
          start--;
          continue;
        }
        if (/^[-*•]|\d+[.)]/.test(prev)) start--;
        else break;
      }
      return lines.slice(start).join('\n');
    }
  }
  return text;
}

function isCompanyBlurb(l: string): boolean {
  if (REQ_SIGNAL.test(l)) return false;
  if (
    /\b(founded in|established in|is a leading|one of the leading|market leader|leading provider|leading (digital |czech )?|our mission|mission to|millions of (customers|users)|we are (a |an |one of the)|we're (a |an )|join our (team|company)|employees across|customers across|operates in|digital bank|společnost|patří mezi|založen[aá]|jsme (přední|jednička|největší)|přední (česká|banka|firma))\b/i.test(
      l,
    )
  )
    return true;
  if (l.length > 160 && !/\b(python|java|typescript|llm|rag|sql|docker|kubernetes|engineer|developer|analyst)\b/i.test(l)) return true;
  return false;
}

function isBenefitsLine(l: string): boolean {
  if (NOT_A_REQUIREMENT.test(l)) return true;
  if (/\b(\d+\s*(weeks?|days?))\s+(of\s+)?(vacation|holiday|leave|pto)\b/i.test(l)) return true;
  if (/\b(meal vouchers|multisport|flexible working hours|home office allowance|wellness|gym membership|pension contribution|life insurance|parental leave)\b/i.test(l) && !REQ_SIGNAL.test(l))
    return true;
  return false;
}

function isApplyOrProcessLine(l: string): boolean {
  return /\b(apply (now|via|here|on)|send (your )?(cv|resume)|submit your application|how to apply|jobs\.cz|kariera\.|přihlaste se|zašlete (nám )?životopis|výběrové řízení|closing date|application deadline|reference number|ref\.?\s*no)\b/i.test(
    l,
  );
}

/** Location / contract meta without skill content. */
function isMetaLine(l: string): boolean {
  if (REQ_SIGNAL.test(l)) return false;
  if (/\b(python|java|typescript|llm|rag|sql|docker|kubernetes|agent|embedding|nlp)\b/i.test(l)) return false;
  if (/^(location|workplace|place of work|work (location|mode)|employment type|job type|start date|typ úvazku|úvazek)\s*:/i.test(l)) return true;
  if (
    /^(hybrid|remote|on-?site|full-?time|part-?time)\s*[,.]?\s*(prague|brno|pardubice|česk|cz|czech)/i.test(l) &&
    l.length < 90
  )
    return true;
  return false;
}

const JOB_TITLE = /^(senior |junior |lead |staff |principal )?[\w\s/-]{0,40}(engineer|developer|scientist|manager|specialist|analyst|architect|intern)s?$/i;

const isJobTitle = (l: string) => {
  const words = l.split(/\s+/);
  return words.length <= 5 && words.every((w) => /^[A-Z&/(]/.test(w)) && JOB_TITLE.test(l);
};

function protectAbbreviations(text: string): string {
  return text
    .replace(/\be\.g\./gi, '⟦eg⟧')
    .replace(/\bi\.e\./gi, '⟦ie⟧')
    .replace(/\bvs\./gi, '⟦vs⟧')
    .replace(/\bU\.S\./gi, '⟦US⟧')
    .replace(/\b(\d+)\.(\d+)(?=\s|,|;|$)/g, '$1⟦v⟧$2');
}

function unprotectAbbreviations(line: string): string {
  return line
    .replace(/⟦eg⟧/g, 'e.g.')
    .replace(/⟦ie⟧/g, 'i.e.')
    .replace(/⟦vs⟧/g, 'vs.')
    .replace(/⟦US⟧/g, 'U.S.')
    .replace(/(\d+)⟦v⟧(\d+)/g, '$1.$2');
}

/** Split job text into requirement lines without breaking e.g., versions, or C#. */
export function parseJobRequirements(text: string): string[] {
  const protectedText = protectAbbreviations(
    trimPreambleBeforeRequirements(stripNonRequirementSections(stripWebPageJunk(normalizeJobPaste(text)))),
  );
  const seen = new Set<string>();
  const out: string[] = [];
  let first = true;
  for (const raw of protectedText.split(/\n|(?<=\.)\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/)) {
    const l = unprotectAbbreviations(raw.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim());
    const key = l.toLowerCase();
    if (!l) continue;
    const isFirst = first;
    first = false;
    if (isFirst && isPostingTitle(raw, l)) continue;
    if (l.length < 8 || seen.has(key)) continue;
    if (NOT_A_REQUIREMENT.test(l)) continue;
    if (isJobTitle(l) || isJobHeaderLine(l) || isNonRequirementLine(l)) continue;
    if (isCompanyBlurb(l) || isBenefitsLine(l) || isApplyOrProcessLine(l) || isMetaLine(l)) continue;
    seen.add(key);
    out.push(l);
    if (out.length >= 25) break;
  }
  return out;
}

const ROLE_WORD =
  /(?<!\p{L})(engineer|developer|specialist|analyst|analytik|scientist|architect|manager|intern|consultant|designer|researcher|vývojář|inženýr|specialista)(s|ka|ky|ce)?(?!\p{L})/iu;

/** First line of a paste that names the role and employer, not a requirement. */
function isPostingTitle(raw: string, l: string): boolean {
  return !/^\s*(?:[-*•]|\d+[.)])/.test(raw) && l.length < 140 && !l.endsWith('.') && ROLE_WORD.test(l) && !REQ_SIGNAL.test(l);
}

/** "AI Engineer, Air Bank" style header — not a skill requirement. */
function isJobHeaderLine(l: string): boolean {
  if (l.length > 100) return false;
  if (/\b(must|should|need|require|years?|experience|degree)\b/i.test(l)) return false;
  const head = l.split(',')[0]?.trim() ?? l;
  if (/^(python|java|scala|typescript|javascript|go|rust|c\+\+)\b/i.test(head)) return false;
  if (isJobTitle(head) || JOB_TITLE.test(head)) return true;
  const m = l.match(/,\s*([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\w\s&.''/-]{2,})$/);
  if (!m) return false;
  const tail = m[1].trim().toLowerCase();
  const techTails = /^(git|docker|go|rust|java|scala|python|langchain|typescript|javascript|kubernetes|aws|azure|copilot)$/;
  if (techTails.test(tail)) return false;
  if (l.split(',').length >= 3 && !/\b(inc|ltd|s\.r\.o|group|bank|nova|cz|consulting|university)\b/i.test(tail)) return false;
  return true;
}

function isNonRequirementLine(l: string): boolean {
  return /\b(graduates welcome|don't have to be an expert|you don't have to be an expert|no degree required)\b/i.test(l);
}

function requirements(text: string): string[] {
  return parseJobRequirements(text);
}

/** Named languages in a requirement — these must appear in evidence to count as grounded. */
const LANG_ALIASES: Record<string, string[]> = {
  'c++': ['c++', 'cpp', 'cplusplus'],
  c: [' c ', 'pure c', 'ansi c', 'clang'],
  'c#': ['c#', 'csharp', 'c sharp', '.net'],
  java: ['java'],
  javascript: ['javascript', 'js', 'node.js', 'nodejs', 'typescript'],
  typescript: ['typescript', 'ts'],
  python: ['python', 'pytorch'],
  haskell: ['haskell'],
  prolog: ['prolog'],
  rust: ['rust'],
  go: ['golang', ' go ', 'go,', 'go.'],
  golang: ['golang', ' go '],
  kotlin: ['kotlin'],
  scala: ['scala'],
  ruby: ['ruby'],
  php: ['php'],
  swift: ['swift'],
  sql: ['sql', 'sqlite', 'postgres', 'postgresql', 'mysql'],
};

function namedLanguages(req: string): string[] {
  const r = ` ${req.toLowerCase()} `;
  const found: string[] = [];
  // Czech inflections: "s Pythonem", "v Pythonu".
  if (/\bpython(em|u|a)\b/.test(r)) found.push('python');
  for (const lang of Object.keys(LANG_ALIASES)) {
    if (lang === 'c' || lang === 'go') continue;
    const escaped = lang.replace(/[+[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i').test(r)) found.push(lang);
  }
  // Case-sensitive: English "go" / "a c" are not languages; "ArnoldC" / "C1" are not C.
  if (/\bGo\b(?!\s+(to|for|beyond|above|live|through))/.test(req) && !found.includes('golang')) found.push('go');
  if (/(?:^|[^A-Za-z+#])C(?:\s|,|;|\/|&|\)|$)/.test(req) && !/\bc\+\+|\bc#|\bobjective-?c\b/i.test(req)) {
    found.push('c');
  }
  return found;
}

/** Drop negated skill phrases so "not C++" / "no YOLO" cannot falsely ground a note. */
function positiveEvidence(evidence: string): string {
  return evidence
    .replace(/\*\*jd matching scope:\*\*[^#\n]*/gi, ' ')
    .replace(/\*\*not evidence for\*\*[^.\n]*\./gi, ' ')
    .replace(
      /\b(?:not|no|never|without|isn't|is not|aren't|are not|≠|!=)\s+(?:a\s+|an\s+|the\s+)?(?:[\w.+#/-]+\s+){0,3}[\w.+#/-]+/gi,
      ' ',
    )
    .replace(/\b(?:unlike|except|excluding)\b[^.!?\n]*/gi, ' ');
}

function evidenceFrom(note: Note, chunk: { heading: string; text: string }): string {
  return positiveEvidence(`${note.name} ${chunk.heading} ${chunk.text}`);
}

function evidenceHasLanguage(evidence: string, lang: string): boolean {
  const text = positiveEvidence(evidence).toLowerCase();
  const aliases = LANG_ALIASES[lang] ?? [lang];
  return aliases.some((a) => {
    if (a.startsWith(' ') || a.endsWith(' ') || a.endsWith(',') || a.endsWith('.')) return text.includes(a.trim()) || text.includes(a);
    if (a.includes('+') || a.includes('#') || a.includes('.')) return text.includes(a);
    return new RegExp(`(?:^|[^a-z0-9_+#])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z0-9_+#]|$)`, 'i').test(text);
  });
}

/** Named models/tools that must appear literally (avoid Whisper/Yapper stealing YOLO/CLIP). */
const MODEL_ALIASES: Record<string, string[]> = {
  yolo: ['yolo', 'yolov'],
  clip: ['clip', 'openclip'],
  whisper: ['whisper'],
  svm: ['svm', 'support vector'],
};

function namedModels(req: string): string[] {
  const r = req.toLowerCase();
  return Object.keys(MODEL_ALIASES).filter((m) => new RegExp(`(?:^|[^a-z0-9])${m}(?:[^a-z0-9]|$)`, 'i').test(r));
}

function evidenceHasModel(evidence: string, model: string): boolean {
  const text = positiveEvidence(evidence).toLowerCase();
  return (MODEL_ALIASES[model] ?? [model]).some((a) => text.includes(a));
}

/** Job lines about diplomas, maturita, or university — not satisfied by generic "technical" in a job note. */
export function isEducationCredentialRequirement(req: string): boolean {
  return /\b(bachelor'?s?\s+degree|master'?s?\s+degree|university\s+degree|college\s+degree|academic\s+degree|tertiary\s+education|field\s+of\s+study|bsc|b\.s\.|msc|m\.s\.|mba|ph\.?d|doctorate|maturita|maturitn[ií]|secondary-school\s+leaving|high\s+school\s+diploma|university\s+education|degree\s+in\s+a\s+technical|technical,\s*mathematical|economics\s+field|no\s+degree\s+required)\b/i.test(
    req,
  );
}

function evidenceHasEducationCredential(evidence: string): boolean {
  const text = positiveEvidence(evidence).toLowerCase();
  return /\b(bachelor|bsc|b\.s\.|undergraduate|master|msc|m\.s\.|phd|ph\.d|doctorate|university\s+degree|university\s+education|charles\s+university|matfyz|mff\s+uk|faculty\s+of\s+mathematics|computer\s+science\s+degree|transcript|\bects\b|maturita|maturitn|středoškol|secondary-school\s+leaving|high\s+school\s+leaving|tertiary\s+education|bachelor'?s\s+examination)\b/i.test(
    text,
  );
}

const INFRA_TERMS = [
  'aws',
  'azure',
  'gcp',
  'snowflake',
  'airflow',
  'kubernetes',
  'kafka',
  'spark',
  'hadoop',
  'iam',
  'entra',
  'serverless',
  'nosql',
  'github enterprise',
] as const;

function namedInfraTerms(req: string): string[] {
  const r = req.toLowerCase();
  const found: string[] = [];
  for (const term of INFRA_TERMS) {
    if (term === 'entra') {
      if (/\b(entra|active directory)\b/.test(r)) found.push(term);
    } else if (new RegExp(`\\b${term}\\b`).test(r)) found.push(term);
  }
  if (/\bpostgres(ql)?\b/.test(r)) found.push('postgres');
  return found;
}

function evidenceHasInfraTerm(term: string, text: string): boolean {
  const t = text.toLowerCase();
  if (term === 'postgres') return /\bpostgres(ql)?\b/.test(t);
  if (term === 'entra') return /\b(entra|active directory)\b/.test(t);
  if (term === 'iam') return /\b(iam|identity and access|oauth|oidc|jwt|secrets?\s+management)\b/.test(t);
  if (term === 'github enterprise') return /\bgithub (actions|enterprise)\b/.test(t);
  return t.includes(term);
}

function isRetrievalRequirement(req: string): boolean {
  if (namedModels(req).length) return false;
  if (/\b(clip|openclip|yolo|video retrieval|text-to-image|known-item search|keyframes)\b/i.test(req)) return false;
  return /\b(rag\b|retrieval|embeddings?|vector (database|db|search)|semantic search|hnsw|pgvector|qdrant|faiss|weaviate|chroma|milvus|pinecone)\b/i.test(
    req,
  );
}

function evidenceHasRetrievalWork(evidence: string): boolean {
  const t = positiveEvidence(evidence).toLowerCase();
  if (
    /\b(rag\b|retrieval|embedding|vector search|semantic search|semantic similarity|hnsw|usearch|wikilink|sentence-transformer|cosine similarity|langgraph pipeline)\b/.test(
      t,
    )
  ) {
    return true;
  }
  return /\b(pipeline|pipelines)\b/.test(t) && /\b(embedding|semantic|langgraph|retrieval|vector|wikilink)\b/.test(t);
}

function isLlmQualityRequirement(req: string): boolean {
  return (
    /\bai evaluation\b/i.test(req) ||
    (/\b(eval|evaluation|quality|metric|test sets?|benchmark|regression)\b/i.test(req) &&
      /\b(llm|model|prompt|output|genai|generative ai)\b/i.test(req)) ||
    /\b(prompts?|llms?)\b.*\b(eval\w*|improv\w*)/i.test(req) ||
    /\bquality of llm\b/i.test(req)
  );
}

function evidenceHasLlmQuality(evidence: string): boolean {
  const t = positiveEvidence(evidence).toLowerCase();
  if (/\b(llm evaluation|rlhf|chain-of-thought|frontier model|post-training|alignment|prompt engineering|model quality|eval harness|generative ai|genai)\b/.test(t)) return true;
  return /\beval(uation)?\b/.test(t) && /\b(llm|model|prompt|alignment)\b/.test(t);
}

function isMicrosoftItRequirement(req: string): boolean {
  return /\b(windows|microsoft 365|m365|active directory|entra|powershell|power automate|helpdesk)\b/i.test(req);
}

function evidenceHasMicrosoftStack(evidence: string): boolean {
  const t = positiveEvidence(evidence).toLowerCase();
  if (/\b(microsoft 365|m365|active directory|entra|powershell|power automate|helpdesk|intune|copilot support)\b/.test(t)) return true;
  return /\bwindows\b/.test(t) && /\b(server|admin|support|desktop support|365|helpdesk)\b/.test(t);
}

function isRemoteWorkPolicyRequirement(req: string): boolean {
  return /\b(remote|fully remote|work from)\b/i.test(req) && /\b(czechia|czech republic|abroad|from abroad)\b/i.test(req);
}

function evidenceHasRemotePolicy(evidence: string): boolean {
  return /\b(remote|prague|czechia|czech republic|cet)\b/i.test(positiveEvidence(evidence).toLowerCase());
}

function isBusinessRolloutRequirement(req: string): boolean {
  return (
    /\b(business analyst|ai adoption|rolling out|roll out|helpdesk|use case).*\b(value|business|adoption|analyst)\b/i.test(req) ||
    /\b(analysing and rolling out ai|design a use case and judge)\b/i.test(req) ||
    /\b(copilot|chatgpt).*\b(support|helpdesk)\b/i.test(req)
  );
}

function evidenceHasBusinessRollout(evidence: string): boolean {
  const t = positiveEvidence(evidence).toLowerCase();
  return /\b(business|b2b|client|stakeholder|onboard|consult|analyst|adoption|financial services|sales|logistics)\b/.test(t);
}

function isNlpSeniorityRequirement(req: string): boolean {
  return (
    /\b(\d+\s*[-–]\s*\d+|at least \d+)\s*(years?|yrs?).*\bnlp\b/i.test(req) ||
    /\bnlp\b.*\b(researcher|neural networks|pretraining|training sets?)\b/i.test(req) ||
    /\bpretraining\b/i.test(req)
  );
}

function evidenceHasNlpDepth(evidence: string): boolean {
  const t = positiveEvidence(evidence).toLowerCase();
  return /\b(nlp|natural language|language technolog|neural network|transformer|pretraining|computer linguistics|openeurollm)\b/.test(t);
}

function isDataEngineeringRequirement(req: string): boolean {
  return /\bdata engineer\b/i.test(req) || /\b(data pipeline|etl|transforming,\s*cleaning,\s*joining)\b/i.test(req);
}

function isSpokenLanguageRequirement(req: string): boolean {
  return (
    /\benglish\b/i.test(req) ||
    /\b(czech|slovak|russian)\b/i.test(req) ||
    /\b(angli[cč]tin|[cč]e[sš]tin|sloven[sš]tin|ru[sš]tin)/i.test(req) ||
    /\b(b1|b2|c1)\b/i.test(req) ||
    /\bwritten and spoken\b/i.test(req)
  );
}

function evidenceHasSpokenLanguage(req: string, evidence: string): boolean {
  const t = positiveEvidence(evidence).toLowerCase();
  const r = req
    .toLowerCase()
    .replace(/angli[cč]tin\p{L}*/gu, 'english')
    .replace(/[cč]e[sš]tin\p{L}*/gu, 'czech')
    .replace(/sloven[sš]tin\p{L}*/gu, 'slovak')
    .replace(/ru[sš]tin\p{L}*/gu, 'russian');
  if (/\benglish\b/.test(r) && /\benglish\b/.test(t)) return true;
  if (/\bczech\b/.test(r) && /\bczech\b/.test(t)) return true;
  if (/\bslovak\b/.test(r) && /\bslovak\b/.test(t)) return true;
  if (/\brussian\b/.test(r) && /\brussian\b/.test(t)) return true;
  if (/\b(international|multilingual|languages)\b/.test(t) && (/\benglish\b/.test(r) || /\bczech\b/.test(r))) return true;
  return false;
}

function isEuResearchRequirement(req: string): boolean {
  return /\b(eu\b|publicly funded|horizon|research project)\b/i.test(req) && /\bresearch\b/i.test(req);
}

function evidenceHasEuResearch(evidence: string): boolean {
  return /\b(eu\b|horizon|publicly funded|research grant|academic research|university research)\b/i.test(positiveEvidence(evidence).toLowerCase());
}

function isShippedLlmProductionRequirement(req: string): boolean {
  return /\b(putting|ship|shipped|production)\b/i.test(req) && /\b(llm|agentic|genai)\b/i.test(req);
}

function evidenceHasShippedLlmProduction(evidence: string): boolean {
  const t = positiveEvidence(evidence).toLowerCase();
  return /\b(production|shipped|post-training|frontier model|lead collection|agent workflow|on-device|live platform)\b/.test(t) &&
    /\b(llm|agent|embedding|whisper|rag|genai)\b/.test(t);
}

const NOTE_IDS = {
  arnoldC: 'Projects/ArnoldC Interpreter',
  mafia: 'Projects/Mafia Tracker',
  zettelLinker: 'Projects/ZettelLinker',
  yapper: 'Projects/Yapper',
  satFreedom: 'Projects/SatFreedom',
  paw: 'Projects/Personal Agentic Wiki',
  zettelkasten: 'Concepts/Zettelkasten',
  contactManager: 'Projects/Contact Manager',
  strengths: 'About/Strengths',
  charles: 'Experience/Charles University',
  outlier: 'Experience/Outlier.AI',
  hegelmann: 'Experience/Hegelmann Group',
  profifp: 'Experience/ProfiFP',
  iot: 'Experience/IoT Hackathon',
  llmEval: 'Concepts/LLM Evaluation',
};

/** Block known false-positive pairings before we cite a note. */
function noteDisqualifiedForRequirement(req: string, note: Note, evidence: string): boolean {
  const id = note.id;

  if (isRetrievalRequirement(req) && !evidenceHasRetrievalWork(evidence)) return true;

  if (isLlmQualityRequirement(req) && !evidenceHasLlmQuality(evidence)) {
    if (id === NOTE_IDS.mafia || id === NOTE_IDS.zettelLinker) return true;
  }

  if (namedLanguages(req).includes('python') && id === NOTE_IDS.charles && /\b(coursework|ects|university coursework)\b/i.test(positiveEvidence(evidence))) {
    return true;
  }

  const infra = namedInfraTerms(req);
  if (infra.length) {
    const t = positiveEvidence(evidence).toLowerCase();
    const needsHeavy = infra.some((x) => ['aws', 'snowflake', 'airflow', 'kubernetes', 'kafka', 'spark', 'hadoop', 'azure', 'serverless'].includes(x));
    if (needsHeavy && id === NOTE_IDS.mafia) {
      const hasHeavy = infra.filter((x) => ['aws', 'snowflake', 'airflow', 'kubernetes', 'kafka', 'spark', 'hadoop', 'azure', 'serverless'].includes(x)).some((x) => evidenceHasInfraTerm(x, t));
      if (!hasHeavy) return true;
    }
    if (/\biam\b|secret management|cloud security/i.test(req) && !evidenceHasInfraTerm('iam', t) && id === NOTE_IDS.mafia) return true;
    if (/\bgithub enterprise\b/i.test(req) && !evidenceHasInfraTerm('github enterprise', t) && id === NOTE_IDS.contactManager) return true;
  }

  if (isMicrosoftItRequirement(req) && id === NOTE_IDS.zettelLinker) return true;
  if (isMicrosoftItRequirement(req) && !evidenceHasMicrosoftStack(evidence) && id === NOTE_IDS.mafia) return true;

  if (isRemoteWorkPolicyRequirement(req) && !evidenceHasRemotePolicy(evidence) && id === NOTE_IDS.zettelLinker) return true;

  if (isBusinessRolloutRequirement(req) && !evidenceHasBusinessRollout(evidence)) {
    if (id === NOTE_IDS.mafia) return true;
  }

  if (isNlpSeniorityRequirement(req) && !evidenceHasNlpDepth(evidence)) {
    if (id === NOTE_IDS.zettelLinker || id === NOTE_IDS.zettelkasten) return true;
  }

  if (isDataEngineeringRequirement(req)) {
    if (id === NOTE_IDS.arnoldC) return true;
    if (id === NOTE_IDS.outlier && !/\b(pipeline|etl|data engineer|spark|kafka)\b/i.test(positiveEvidence(evidence))) return true;
  }

  // ArnoldC is C#/.NET — never cite it for Java/Scala production bullets.
  if (/\b(java|scala)\b/i.test(req) && id === NOTE_IDS.arnoldC) return true;

  if (isSpokenLanguageRequirement(req) && !evidenceHasSpokenLanguage(req, evidence)) {
    if (id === NOTE_IDS.zettelkasten) return true;
  }

  if (isEuResearchRequirement(req) && !evidenceHasEuResearch(evidence) && (id === NOTE_IDS.hegelmann || id === NOTE_IDS.zettelLinker || id === NOTE_IDS.mafia || id === 'Projects/Yapper')) return true;

  if (isBusinessRolloutRequirement(req) && id === NOTE_IDS.profifp && /\b(analytik|insurance|pojišťovna|čsob)\b/i.test(req)) return false;

  if (/\bproof of concept\b|\bquick proof\b/i.test(req) && id === NOTE_IDS.mafia && !/\b(poc|proof of concept|feasibility)\b/i.test(positiveEvidence(evidence))) return true;

  if (isShippedLlmProductionRequirement(req) && !evidenceHasShippedLlmProduction(evidence) && id === NOTE_IDS.zettelLinker) return true;

  return false;
}

const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function queries(req: string): string[] {
  const parts = req.split(/,|;|\(|\)|\band\b|\bor\b|\//i).map((p) => p.trim()).filter((p) => p.length > 10);
  return [req, ...parts].slice(0, 5);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

type Level = 'strong' | 'related' | 'growth' | 'out_of_scope';
interface Row {
  req: string;
  level: Level;
  note?: Note;
  heading?: string;
  score: number;
}

const ORDER: Record<Level, number> = { strong: 0, related: 1, growth: 2, out_of_scope: 3 };

const TECH_CORE =
  /\b(code|coding|software|engineer|engineering|developer|development|programming|python|c#|\.net|java|javascript|typescript|c\+\+|haskell|ocaml|rust|go|golang|kotlin|scala|sql|sqlite|postgres|database|api|apis|rest|graphql|backend|frontend|full-stack|fullstack|web|app|desktop|linux|unix|bash|git|github|ci\/cd|docker|container|kubernetes|aws|cloud|gcp|azure|ai|llm|llms|rag|embedding|embeddings|vector|vectors|whisper|stt|speech|audio|nlp|machine learning|ml|deep learning|eval|evals|evaluation|prompt|prompting|gpt|claude|openai|anthropic|huggingface|langchain|llamaindex|langgraph|pydantic|data structures|algorithms|hnsw|websockets|webrtc|architecture|pytest|unit tests|integration tests|latency|performance|security|privacy|local-first|b2b|stakeholders|rlhf|transformers?|retrieval|semantic search|vector search|fine-tuning|inference|saas|microservices?|computer vision|vision|image|video|yolo|clip|object detection|keyframes?|multimodal|react|redux|next\.js|vue|angular|svelte|css|html|figma|node|express|spring|swift|ios|android|terraform|ansible|wcag|accessibility|server|components?|frameworks?|sdks?|devops|sre|observability|monitoring|powershell|scripting|active directory|entra( id)?|intune|power automate|windows|microsoft 365|m365)\b/i;

const TECH_AGENTS =
  /\b(agentic|ai agents?|llm agents?|software agents?|autonomous agents?|tool[- ]calling agents?|coding agents?|conversational agents?|voice agents?|multi-agent)\b/i;

const EXPERIENCE_OBJECTIONS =
  /\b(\d+\+?\s*(years?|yrs?)|experience|senior|lead|proven track record|tenure|bachelor|degree|master|phd)\b/i;

function hasTechAnchor(req: string): boolean {
  return TECH_CORE.test(req) || TECH_AGENTS.test(req);
}

/** Whole posting reads as a software/AI role (tenure-only bullets allowed in that context). */
export function isTechnicalJobPosting(text: string): boolean {
  return isAiJob(text) || hasTechAnchor(text);
}

/** True when a low-match line is still software/engineering (Fast Ramp) vs alien domain (Out of Scope). */
export function isEngineeringRequirement(req: string, jobIsTechnical = false): boolean {
  if (hasTechAnchor(req)) return true;
  if (jobIsTechnical && EXPERIENCE_OBJECTIONS.test(req)) return true;
  return false;
}

function isDisqualifierRequirement(req: string): boolean {
  const r = req.toLowerCase();
  if (/\b(not|no)\s+(less than|fewer than|more than)\b/.test(r)) return false;
  if (/\b(do not apply|don't apply|must not apply|not eligible|disqualified|will not be considered)\b/.test(r)) return true;
  if (/\bno remote\b/.test(r) && !/\b(remote|hybrid)\s+(ok|welcome|allowed|friendly)\b/.test(r)) return true;
  return false;
}

function isAiJob(text: string): boolean {
  return /\b(ai|llm|agent|agents|rag|embedding|embeddings|whisper|eval|evals|prompt|gpt|claude|vector|retrieval|nlp|ml)\b/i.test(text);
}

function salesCounterpoint(req: string): string {
  const r = req.toLowerCase();

  if (isEducationCredentialRequirement(req)) {
    return 'BSc Computer Science (AI) at Charles University / Matfyz (MFF UK), 2022–2026 — technical degree; completed coursework in AI, ML, systems, and programming languages. Czech maturita before university. See Charles University note for detail.';
  }

  if (PEOPLE_LEAD.test(req)) {
    return 'No formal team-lead title yet. I own projects end to end — scoping, architecture, delivery — and coordinate the work with business stakeholders.';
  }

  if (isEuResearchRequirement(req)) {
    return 'No grant-funded research projects yet. My research exposure is Matfyz coursework and evaluation work on frontier models at Outlier.AI.';
  }

  if (isMicrosoftItRequirement(req)) {
    return 'My daily stack is Python and macOS/Linux tooling. Windows and Microsoft 365 administration would be new ground, but scripting and supporting the tools people use is familiar work.';
  }

  if (/\b(\d+\+?\s*(years?|yrs?)|experience|senior|lead|proven track record|tenure)\b/i.test(r)) {
    return 'Applied LLM work is only a few years old. Recent shipping (embeddings, structured outputs, on-device Whisper, RLHF evals) matters more than years on pre-2022 stacks.';
  }

  if (/\b(langchain|llamaindex|haystack|autogen|crewai|semantic kernel|flowise|dspy)\b/i.test(r)) {
    return 'Frameworks change names every quarter; the work is retrieval, prompts, and schema-bound tool calls. I have LangGraph graphs and plain Python agent loops in production already.';
  }

  if (/\b(pinecone|qdrant|weaviate|chroma|pgvector|milvus|faiss)\b/i.test(r)) {
    return 'Managed vector DBs are mostly HNSW plus cosine similarity. I built an HNSW index with usearch in ZettelLinker; picking up Pinecone or pgvector is an API exercise.';
  }

  if (/\b(aws|gcp|azure|docker|kubernetes|terraform|ci\/cd|cloud)\b/i.test(r)) {
    return 'Docker, Linux, and CI are already in my projects (Mafia Tracker, Yapper). Cloud consoles sit on the same primitives.';
  }

  if (/\b(pytorch|tensorflow|scikit|pandas|spark|training|fine-tuning)\b/i.test(r)) {
    return 'Matfyz coursework in ML, linear algebra, and neural nets. My shipped work is inference and systems, not training from scratch.';
  }

  if (/\bc\+\+|cplusplus|\bcpp\b/i.test(r)) {
    return 'Matfyz C++ coursework and a finished C++20 Contact Manager class project (CMake, OOP, 140 tests). Day-job stack is Python and C#/.NET — I ramp on C++, I do not claim production C++ years.';
  }

  if (/\bhaskell\b|\bprolog\b/i.test(r)) {
    return 'Matfyz coursework covers Haskell and Prolog (functional and logic programming). That is coursework depth, not a production language I ship in.';
  }

  return 'Same shape as my day job in Python, C#/.NET, and SQLite. I ramp quickly.';
}

/** Direct Match only for jobs / featured shipped projects. Coursework & class projects cap at Related. */
function evidenceCeiling(note: Note | undefined): Level {
  if (!note) return 'growth';
  const t = String(note.props.type ?? '');
  if (t === 'experience') return note.tags.includes('hackathon') ? 'related' : 'strong';
  if (t === 'project' && String(note.props.featured) === 'true') return 'strong';
  if (t === 'project' || t === 'education' || t === 'about' || t === 'concept') return 'related';
  return 'related';
}

function clampLevel(level: Level, ceiling: Level): Level {
  // Lower ORDER = stronger. If level is stronger than allowed ceiling, demote.
  return ORDER[level] < ORDER[ceiling] ? ceiling : level;
}

/** Scored over every requirement, so ramp and out-of-scope lines pull the label down honestly. */
function verdict(rows: Row[]) {
  const s = rows.filter((r) => r.level === 'strong').length;
  const r = rows.filter((x) => x.level === 'related').length;
  const ratio = rows.length ? (s + 0.5 * r) / rows.length : 0;

  if (ratio >= 0.75) return { label: 'Perfect Match.', tone: 'strong' };
  if (ratio >= 0.55) return { label: 'Strong Match.', tone: 'strong' };
  if (ratio >= 0.35) return { label: 'High Architecture Overlap.', tone: 'good' };
  return { label: 'Different Technical Domain.', tone: 'promising' };
}

function headline(rows: Row[]) {
  const s = rows.filter((r) => r.level === 'strong').length;
  const r = rows.filter((x) => x.level === 'related').length;
  const out = rows.filter((x) => x.level === 'out_of_scope').length;
  const n = rows.length;

  let base = '';
  if (s === n) {
    base = `Directly covers all <strong>${n}</strong> requirements across my systems and documented experience.`;
  } else if (!r) {
    base = `Directly covers <strong>${s} of ${n}</strong> requirements across my systems and documented experience.`;
  } else if (!s) {
    base = `<strong>${r} of ${n}</strong> requirements line up with systems and background in my portfolio.`;
  } else {
    base = `Directly covers <strong>${s} of ${n}</strong> requirements, with <strong>${r}</strong> more in related areas.`;
  }

  if (out > 0) {
    base += ` <span class="out-note">(${out} ${out === 1 ? 'item is' : 'items are'} outside portfolio scope).</span>`;
  }
  return base;
}

const GROUPS: { level: Level; title: string }[] = [
  { level: 'strong', title: 'Direct Match' },
  { level: 'related', title: 'Related Experience' },
  { level: 'growth', title: 'Fast Ramp' },
  { level: 'out_of_scope', title: 'Out of Scope' },
];

const PEOPLE_LEAD =
  /\b(lead|leading|manage|managing|coordinat\w*|mentor\w*|supervis\w*)\b[^.]{0,30}\b(team|teams|people|engineers|developers|juniors)\b|\b(team lead|tech lead|people management|line management)\b/i;
const LEAD_EVIDENCE = /\b(led|managed|mentored|supervised)\b[^.]{0,30}\b(team|people|engineers|developers)\b|\bteam lead\b/i;
const YEARS_REQUIRED = /\b\d+\s*\+?\s*(?:(?:-|–|to)\s*\d+\s*)?(years?|yrs?)\b/i;

/** "Python and TypeScript" needs every language; "Python, Scala or Java" needs any one. */
function languageRequirementMode(req: string): 'and' | 'or' {
  const langs = namedLanguages(req);
  if (langs.length <= 1) return 'or';
  if (/\bor\b/i.test(req)) return 'or';
  if (/\band\b|&/i.test(req)) return 'and';
  // Comma lists without "and"/"or" (e.g. "Python, TypeScript, Go") → all expected.
  return 'and';
}

function evidenceCoversLanguages(req: string, ev: string): boolean {
  const langs = namedLanguages(req);
  if (!langs.length) return true;
  return languageRequirementMode(req) === 'and'
    ? langs.every((l) => evidenceHasLanguage(ev, l))
    : langs.some((l) => evidenceHasLanguage(ev, l));
}

/** Named skills that must literally appear in a cited note — no semantic near-misses. */
function meetsHardTerms(req: string, ev: string): boolean {
  const langs = namedLanguages(req);
  if (langs.length && !evidenceCoversLanguages(req, ev)) return false;
  const models = namedModels(req);
  if (models.length && !models.some((m) => evidenceHasModel(ev, m))) return false;
  if (/\bvideo\b/i.test(req) && !/\bvideo\b/i.test(ev)) return false;
  const infra = namedInfraTerms(req);
  if (infra.length && !infra.some((t) => evidenceHasInfraTerm(t, positiveEvidence(ev)))) return false;
  if (isMicrosoftItRequirement(req) && !evidenceHasMicrosoftStack(ev)) return false;
  if (isEuResearchRequirement(req) && !evidenceHasEuResearch(ev)) return false;
  if (PEOPLE_LEAD.test(req) && !LEAD_EVIDENCE.test(ev)) return false;
  if (isEducationCredentialRequirement(req) && !evidenceHasEducationCredential(ev)) return false;
  return true;
}

type Test = RegExp | ((a: string, b: string) => boolean);
const passes = (t: Test, a: string, b = '') => (typeof t === 'function' ? t(a, b) : t.test(a));

interface Route {
  /** Requirement shape this route answers. */
  when: Test;
  /** Canonical evidence notes, best first. */
  notes: string[];
  /** Phrase the cited chunk must contain, so a citation is always checkable. */
  proof: Test;
}

const N = NOTE_IDS;

/** Where each kind of requirement is proven in the vault. Order breaks ties between equally strong routes. */
const ROUTES: Route[] = [
  { when: isEducationCredentialRequirement, notes: [N.charles], proof: evidenceHasEducationCredential },
  { when: isSpokenLanguageRequirement, notes: [N.strengths, N.charles], proof: (ev, req) => evidenceHasSpokenLanguage(req, ev) },
  { when: /\b(remote|hybrid|on-?site|relocat\w*|prague|czechia|time ?zones?)\b/i, notes: [N.strengths], proof: /\b(remote|prague|cet)\b/i },
  { when: /\b(finance|financial|insurance|banking|fintech)\b/i, notes: [N.profifp], proof: /\bfinancial\b/i },

  { when: isRetrievalRequirement, notes: [N.zettelLinker, N.yapper, N.paw], proof: evidenceHasRetrievalWork },
  { when: isLlmQualityRequirement, notes: [N.outlier, N.yapper, N.llmEval], proof: evidenceHasLlmQuality },
  {
    when: /\b(evals?|evaluation|benchmarks?|red[- ]?team\w*|rlhf|alignment|failure[- ]modes?|quality gates?|model behaviou?r|auditing)\b/i,
    notes: [N.outlier],
    proof: /\b(rlhf|alignment|chain-of-thought|eval harnesses|red-teaming|stress-testing)\b/i,
  },
  {
    when: /\b(post-training|fine-?tun\w*|sft|how llms are (developed|built|trained)|developing ai models|model training)\b/i,
    notes: [N.outlier],
    proof: /\b(post-training|fine-tuned|sft|rlhf)\b/i,
  },
  {
    when: /\b(hallucinat\w*|bias|ai risks?|responsible ai|guardrails?|prompt injection|what ai can and can'?t do|(use|using) (it|ai) safely)\b/i,
    notes: [N.outlier, N.yapper],
    proof: /\b(hallucinat\w*|failure modes|red-teaming|prompt injection|reward hacking|made up)\b/i,
  },
  {
    when: /\b(personal data|pii|data protection|gdpr|sensitive data)\b/i,
    notes: [N.yapper, N.satFreedom],
    proof: /\b(phone numbers|stripped|stays on|raw audio|watch-only)\b/i,
  },
  {
    when: /\b(structured outputs?|json schemas?|function[- ]calling|pydantic)\b/i,
    notes: [N.yapper, N.outlier],
    proof: /\b(structured outputs?|structured llm|json schemas|function-calling)\b/i,
  },
  {
    when: /\b(speech|voice|whisper|audio|transcri\w*|stt|asr|spoken dialogue|dialogue|chatbots?|telegram)\b/i,
    notes: [N.yapper, N.charles],
    proof: /\b(whisper|speech|voice|audio|transcri\w*|dialogue)\b/i,
  },
  {
    when: /\b(computer vision|vision|images?|video|yolo|clip|openclip|object detection|keyframes?|ocr|multimodal)\b/i,
    notes: [N.charles],
    proof: /\b(vision|image|video|yolo|clip)\b/i,
  },
  {
    when: /\b(nlp|natural language|computational linguistics|machine translation|language technolog\w*|corpus|corpora)\b/i,
    notes: [N.charles],
    proof: /\b(nlp|natural language|linguistic\w*|language technolog\w*)\b/i,
  },
  {
    when: /\b(machine learning|ml|neural|deep learning|data science|pytorch|tensorflow|scikit\w*|classifiers?|statistics)\b/i,
    notes: [N.charles],
    proof: /\b(machine learning|neural|classifiers?|svm|probability)\b/i,
  },

  // Prefer a note that covers every required language when the bullet uses "and"/commas; OR-lists still match any.
  {
    when: (r) => namedLanguages(r).length > 0,
    notes: [N.zettelLinker, N.yapper, N.outlier, N.mafia, N.paw, N.satFreedom, N.contactManager, N.charles, N.arnoldC],
    proof: (ev, req) => evidenceCoversLanguages(req, ev),
  },

  { when: /\b(docker|containers?|ci\/cd|ci|github actions|devops|deployments?)\b/i, notes: [N.mafia, N.yapper, N.zettelLinker], proof: /\b(docker|ci|github actions)\b/i },
  { when: /\b(linux|unix|bash|shell|command[- ]line|cli)\b/i, notes: [N.charles, N.zettelLinker], proof: /\b(linux|unix|bash|shell|cli)\b/i },
  {
    when: /\b(tests?|testing|pytest|unit tests?|tdd|software engineering principles|code quality)\b/i,
    notes: [N.zettelLinker, N.yapper, N.satFreedom],
    proof: /\b(pytest|unit tests|test suite)\b/i,
  },
  { when: /\b(latency|performance|profiling|benchmark\w*|scalab\w*|low-latency)\b/i, notes: [N.zettelLinker], proof: /\b(ms median|latency|p95)\b/i },
  { when: /\b(websockets?|real-?time|django|asgi|backend|server-side|web (apps?|platforms?)|full-?stack)\b/i, notes: [N.mafia], proof: /\b(websocket\w*|django|real time)\b/i },
  { when: /\b(api design|rest(ful)?|http|api contracts?|microservices?)\b/i, notes: [N.mafia, N.outlier], proof: /\b(http|api contracts)\b/i },
  { when: /\b(crm|webhooks?|integrat\w*|apis?)\b/i, notes: [N.hegelmann, N.mafia, N.outlier], proof: /\b(crm|http|api contracts)\b/i },
  {
    when: /\b(privacy|on-?device|local-?first|offline|self-hosted)\b/i,
    notes: [N.yapper, N.zettelLinker, N.satFreedom],
    proof: /\b(on-device|stays on|no api keys|local-first|watch-only)\b/i,
  },
  { when: /\b(desktop|macos|native apps?|cross-platform|gui)\b/i, notes: [N.yapper, N.satFreedom, N.zettelLinker], proof: /\b(macos|desktop|avalonia|gui)\b/i },
  {
    when: /\b(data processing|data pipelines?|etl|data cleaning|cleaning|enrich\w*|scraping|web data|data collection|transforming|aggregat\w*)\b/i,
    notes: [N.hegelmann],
    proof: /\b(pipelines|enrich|unstructured web data)\b/i,
  },
  { when: /\b(full-?text|keyword search|bm25|fts\d?|search)\b/i, notes: [N.yapper, N.zettelLinker], proof: /\b(fts5|search)\b/i },
  { when: /\b(obsidian|markdown|knowledge (bases?|management|graphs?)|wiki|zettelkasten)\b/i, notes: [N.zettelLinker, N.paw], proof: /\b(obsidian|markdown|vault)\b/i },
  {
    when: /\b(algorithms?|data structures?|computer science|cs fundamentals|fundamentals|system design|complexity)\b/i,
    notes: [N.outlier, N.charles],
    proof: /\b(algorithms|data structures|system design)\b/i,
  },
  {
    when: /(?<!neural )\b(networks?|networking|it environments?|mqtt|iot|embedded|raspberry|hardware|sensors?)\b/i,
    notes: [N.iot, N.charles],
    proof: /\b(mqtt|networking|raspberry|sensors)\b/i,
  },

  {
    when: (r) =>
      /\b(business analy\w*|use cases?|business value|roi|business cases?|process analysis|requirements gathering)\b/i.test(r) &&
      !/\b(proof of concept|prototyp\w*|technically feasible)\b/i.test(r),
    notes: [N.profifp, N.hegelmann],
    proof: /\b(business analyst|use-case|roi|business cases?|needs analysis)\b/i,
  },
  {
    when: /\b(adoption|rolling out|roll out|rollout|digital tools|process automation)\b/i,
    notes: [N.hegelmann],
    proof: /\b(agentic workflows|automat\w*|agent pipelines)\b/i,
  },
  {
    when: /\b(business (brief|needs|requirements)|briefs?|stakeholders?|clients?|customers?|b2b|sales|cross-functional|it and business)\b/i,
    notes: [N.hegelmann, N.profifp, N.strengths],
    proof: /\b(stakeholders?|clients?|b2b|sales)\b/i,
  },
  {
    when: (r) =>
      /\b(communicat\w*|present\w*|explain\w*|non-technical|written communication|articulate|technical documentation|stakeholder)\b/i.test(r) &&
      !/\b(patient|nursing|clinical|care documentation)\b/i.test(r),
    notes: [N.profifp, N.strengths],
    proof: /\b(non-technical|presenting|communicat\w*|documentation|stakeholder)\b/i,
  },
  {
    when: /\b(independen\w*|own work|on (your|their) own|self-direct\w*|ownership|autonom\w*|self-starter|proactive)\b/i,
    notes: [N.strengths],
    proof: /\b(independent|self-directed|ownership)\b/i,
  },
  {
    when: /\b(learn\w* (fast|quickly)|fast learner|quick learner|curious|curiosity|problem[- ]solv\w*|solving problems|adaptab\w*)\b/i,
    notes: [N.strengths],
    proof: /\b(pick up|quickly)\b/i,
  },
  {
    when: /\b(proof of concept|prototyp\w*|poc|mvp|feasib\w*|hackathons?|end-to-end)\b/i,
    notes: [N.strengths, N.iot],
    proof: /\b(prototype|end-to-end|hackathon)\b/i,
  },
  {
    when: /\b(team ?work|cross-team|collaborat\w*|international teams?|team player|project partners)\b/i,
    notes: [N.strengths],
    proof: /\b(international|teams)\b/i,
  },
  { when: /\b(years? of programming|programming experience|coding experience)\b/i, notes: [N.strengths], proof: /\byears of programming\b/i },
  { when: /\b(open[- ]source|github)\b/i, notes: [N.zettelLinker, N.yapper, N.mafia], proof: /\bgithub\b/i },

  // Broad AI wording last, so a specific route (business analyst, RAG, Python…) wins ties.
  {
    when: /\b(ai|ml)\b[^.]{0,40}\bprojects?\b|\bprojects?\b[^.]{0,40}\b(ai|ml)\b/i,
    notes: [N.zettelLinker, N.yapper],
    proof: /\b(embeddings?|whisper|semantic)\b/i,
  },
  {
    when: /\b(agents?|agentic|tool[- ]?calling|orchestrat\w*|mcp|langgraph|langchain|multi-step|assistants?|automat\w*)\b/i,
    notes: [N.hegelmann, N.zettelLinker, N.paw, N.yapper],
    proof: /\b(agent\w*|langgraph|langchain|automat\w*)\b/i,
  },
  {
    when: /\b(llms?|genai|gen ai|generative ai|gpt\w*|openai|anthropic|claude|chatgpt|copilot|gemini|perplexity|prompts?|prompt engineering|foundation models?|frontier models?|ai models?|ai tools?)\b/i,
    notes: [N.hegelmann, N.yapper, N.outlier],
    proof: /\b(llm\w*|claude|cursor|openai|frontier)\b/i,
  },
  { when: /\b(ai|artificial intelligence)\b/i, notes: [N.outlier, N.hegelmann, N.yapper], proof: /\b(ai|llm\w*|frontier)\b/i },
];

/** Concrete tools named somewhere in the vault; a literal hit is checkable evidence even without a route. */
const TECH_VOCAB =
  /\b(redis|cmake|maven|pytest|hnsw|usearch|faiss|qdrant|pgvector|weaviate|pinecone|fts5|mqtt|esp32|esp8266|raspberry pi|avalonia|daphne|asgi|dataview|minilm|sentence-transformers|vite|esplora|github|git|obsidian|langchain|langgraph|whisper|openai|claude|cursor|telegram|django|websockets?|docker|postgresql|sqlite|markdown|elo|stl|oop)\b/gi;

interface Candidate {
  note: Note;
  chunk: Chunk;
  ev: string;
  score: number;
}

interface MatchContext {
  vault: Vault;
  index: VectorIndex;
  chunks: Chunk[];
  evidence: Map<Chunk, string>;
}

const isEvidenceNote = (n: Note) => n.props.type !== undefined && !['tool', 'writing'].includes(String(n.props.type));

function matchContext(vault: Vault, index: VectorIndex): MatchContext {
  const chunks = index.chunks.filter((c) => isEvidenceNote(vault.byId.get(c.noteId)!));
  const evidence = new Map(chunks.map((c) => [c, evidenceFrom(vault.byId.get(c.noteId)!, c)]));
  return { vault, index, chunks, evidence };
}

/** Best similarity of each chunk to the requirement or any of its clauses. */
async function scoreChunks(req: string, index: VectorIndex): Promise<Map<Chunk, number>> {
  const scores = new Map<Chunk, number>();
  const hits = await Promise.all(queries(req).map((q) => index.search(q, index.chunks.length)));
  for (const h of hits.flat()) scores.set(h.chunk, Math.max(scores.get(h.chunk) ?? -1, h.score));
  return scores;
}

function tierBoost(note: Note): number {
  const t = String(note.props.type ?? '');
  if (t === 'experience' || (t === 'project' && String(note.props.featured) === 'true')) return 0.1;
  if (t === 'about' || t === 'concept') return -0.08;
  return 0;
}

async function matchRequirement(req: string, ctx: MatchContext, jobIsTechnical: boolean): Promise<Row> {
  const unmatched = (): Row => ({
    req,
    level: PEOPLE_LEAD.test(req) || isEngineeringRequirement(req, jobIsTechnical) ? 'growth' : 'out_of_scope',
    score: 0,
  });
  if (isDisqualifierRequirement(req)) return { req, level: 'out_of_scope', score: 0 };

  const scores = await scoreChunks(req, ctx.index);
  const pool: Candidate[] = [];
  for (const chunk of ctx.chunks) {
    const note = ctx.vault.byId.get(chunk.noteId)!;
    const ev = ctx.evidence.get(chunk)!;
    if (!meetsHardTerms(req, ev) || noteDisqualifiedForRequirement(req, note, ev)) continue;
    pool.push({ note, chunk, ev, score: scores.get(chunk) ?? 0 });
  }

  let pick: { c: Candidate; level: Level } | undefined;
  for (const route of ROUTES) {
    if (!passes(route.when, req)) continue;
    for (const id of route.notes) {
      const c = pool
        .filter((x) => x.note.id === id && passes(route.proof, x.ev, req))
        .sort((a, b) => b.score - a.score)[0];
      if (!c) continue;
      const level = evidenceCeiling(c.note);
      if (!pick || ORDER[level] < ORDER[pick.level]) pick = { c, level };
      break;
    }
  }

  // Unrouted wording: cite only a note naming the same tool, and never as Direct Match.
  if (!pick) {
    const tools = [...new Set((req.match(TECH_VOCAB) ?? []).map((t) => t.toLowerCase()))];
    const scale = ctx.index.threshold / 0.32;
    const c = pool
      .filter((x) => tools.some((t) => new RegExp(`\\b${reEscape(t)}\\b`, 'i').test(x.ev)))
      .sort((a, b) => b.score + tierBoost(b.note) * scale - (a.score + tierBoost(a.note) * scale))[0];
    if (c) pick = { c, level: 'related' };
  }

  if (!pick) return unmatched();

  // Tenure and diplomas can't be proven by a project note alone; soft-skill overlap with a non-tech role is only Related.
  const capped =
    YEARS_REQUIRED.test(req) || isEducationCredentialRequirement(req) || (!jobIsTechnical && !isEngineeringRequirement(req));
  const level = capped ? clampLevel(pick.level, 'related') : pick.level;
  return { req, level, score: pick.c.score, note: pick.c.note, heading: pick.c.chunk.heading };
}

export async function analyzeJobDescription(text: string, vault: Vault, index: VectorIndex) {
  const reqs = requirements(text);
  if (!reqs.length) return { reqs: [], rows: [] as Row[], verdict: verdict([]), matched: 0 };

  const ctx = matchContext(vault, index);
  const jobIsTechnical = isTechnicalJobPosting(text);
  const rows = (await Promise.all(reqs.map((req) => matchRequirement(req, ctx, jobIsTechnical)))).sort(
    (a, b) => ORDER[a.level] - ORDER[b.level],
  );
  const matched = rows.filter((r) => r.level === 'strong' || r.level === 'related').length;
  return { reqs, rows, verdict: verdict(rows), matched };
}

function renderResults(rows: Row[], v: ReturnType<typeof verdict>, matched: number) {
  const mark = (l: Level) => (l === 'strong' ? '✓' : l === 'related' ? '✓' : l === 'growth' ? '⚡' : '✕');
  const evidence = (r: Row) => {
    if (!r.note || (r.level !== 'strong' && r.level !== 'related')) return '';
    const name = esc(r.note.name);
    const href = noteHref(r.note.id);
    const id = esc(r.note.id);
    return `<span class="jd-evidence-label">Source:</span> <a class="internal-link" href="${href}" data-note="${id}">${name}</a>`;
  };

  const mailBody = [
    'Hi Vladimir,',
    '',
    `I checked your portfolio against our requirements: ${v.label} (${matched} of ${rows.length} matched).`,
    '',
    ...rows.map((r) => `${mark(r.level)} ${r.req}${r.note && r.level !== 'growth' && r.level !== 'out_of_scope' ? ` (${r.note.name})` : ''}`),
  ].join('\n');

  return `
      <div class="fit-summary" data-tone="${v.tone}">
        <p class="fit-verdict">${v.label}</p>
        <p class="fit-headline">${headline(rows)}</p>
      </div>
      ${GROUPS.map((g) => {
        const group = rows.filter((r) => r.level === g.level);
        return group.length
          ? `<section class="jd-group" data-level="${g.level}">
              <h4>${g.title} <span>${group.length}</span></h4>
              <ul class="jd-list">${group
                .map((r) => {
                  if (r.level === 'strong' || r.level === 'related') {
                    return `<li class="jd-row">
                      <span class="jd-req">${esc(r.req)}</span>
                      <span class="jd-evidence">${evidence(r)}</span>
                    </li>`;
                  }
                  if (r.level === 'growth') {
                    return `<li class="jd-row jd-row-growth">
                      <div class="jd-growth-req"><span class="jd-req">${esc(r.req)}</span></div>
                      <div class="jd-counterpoint"><span class="badge-reframe">In practice</span> ${esc(salesCounterpoint(r.req))}</div>
                    </li>`;
                  }
                  return `<li class="jd-row jd-row-out">
                    <span class="jd-req">${esc(r.req)}</span>
                    <span class="jd-evidence out-scope-tag">Outside portfolio scope</span>
                  </li>`;
                })
                .join('')}</ul>
            </section>`
          : '';
      }).join('')}
      <div class="jd-followup">
        <a class="btn btn-primary btn-lg" href="${CALENDLY_URL}" target="_blank" rel="noopener">Schedule a call with me →</a>
        <a class="btn-link jd-email-report" href="mailto:${EMAIL}?subject=${encodeURIComponent('Interview with Vladimir Osenev')}&body=${encodeURIComponent(mailBody)}">Or email this fit report</a>
      </div>`;
}

export function mountJdMatcher(el: HTMLElement, vault: Vault, index: VectorIndex) {
  const id = `jd-input-${el.dataset.embed ?? 'x'}`;
  el.innerHTML = `
    <label class="visually-hidden" for="${id}">Job description</label>
    <textarea id="${id}" class="jd-input" rows="4" placeholder="" aria-label="Paste a job post"></textarea>
    <div class="jd-actions">
      <button class="btn btn-primary" data-action="match">Match</button>
      <button class="btn-link" data-action="sample">Sample</button>
    </div>
    <div class="jd-results" aria-live="polite"></div>`;
  const input = el.querySelector<HTMLTextAreaElement>('textarea')!;
  const results = el.querySelector<HTMLElement>('.jd-results')!;

  const run = async () => {
    const reqs = requirements(input.value);
    if (!reqs.length) {
      results.innerHTML = '<p class="jd-empty">Paste something first.</p>';
      return;
    }
    results.innerHTML = '<p class="jd-empty">Matching…</p>';
    const { rows, verdict: v, matched } = await analyzeJobDescription(input.value, vault, index);
    results.innerHTML = renderResults(rows, v, matched);
  };

  el.querySelector('[data-action="match"]')!.addEventListener('click', run);
  input.addEventListener('keydown', (e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && run());
  input.addEventListener('paste', () => setTimeout(run, 0));
  el.querySelector('[data-action="sample"]')!.addEventListener('click', () => {
    input.value = SAMPLE;
    run().then(() => {
      results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}
