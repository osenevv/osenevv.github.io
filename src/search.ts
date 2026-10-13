import { WIKILINK, type Note, type Vault } from './vault';

export interface Chunk {
  noteId: string;
  heading: string;
  text: string;
}

export interface Hit {
  chunk: Chunk;
  score: number;
}

interface Embedder {
  label: string;
  /** Cosine scores below this are noise for this embedder. */
  threshold: number;
  embed(texts: string[]): Promise<Float32Array[]>;
}

export type IndexStatus =
  | { kind: 'lexical' }
  | { kind: 'loading'; progress: number }
  | { kind: 'semantic' }
  | { kind: 'fallback'; reason: string };

const MODEL = 'Xenova/all-MiniLM-L6-v2';
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.1';

const STOPWORDS = new Set(
  'a an and are as at be but by for from has have i if in into is it its of on or so that the their then this to was we what when where which with you your my me not no can do does how than too very just about also more most only own same should will'.split(' '),
);

const tokenize = (s: string) =>
  s.toLowerCase().match(/[a-z0-9][a-z0-9+.-]*[a-z0-9]|[a-z0-9]/g)?.filter((t) => !STOPWORDS.has(t)) ?? [];

function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(WIKILINK, (_, target: string, alias?: string) => alias ?? target)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?\[!\w+\]\s*/gm, '')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    // Keep collapsed <details> course tables searchable; drop only the tags.
    .replace(/<\/?(?:details|summary|table|thead|tbody|tr|th|td|br|p|div|span)[^>]*>/gi, ' ')
    .replace(/[*_`>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function chunkNote(note: Note): Chunk[] {
  const sections = note.body.replace(/^#\s+.+\n?/, '').split(/^##\s+/m);
  const chunks: Chunk[] = [];
  sections.forEach((section, i) => {
    const heading = i === 0 ? '' : section.split('\n')[0].trim();
    const content = plainText(i === 0 ? section : section.slice(section.indexOf('\n') + 1));
    if (content.length < 20) return;
    chunks.push({ noteId: note.id, heading, text: content });
  });
  const props = Object.entries(note.props)
    .filter(([k]) => k !== 'type')
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('. ');
  if (props) chunks.push({ noteId: note.id, heading: 'Properties', text: props });
  return chunks;
}

function normalize(v: Float32Array): Float32Array {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function tfidfEmbedder(corpus: string[]): Embedder {
  const df = new Map<string, number>();
  for (const doc of corpus) for (const t of new Set(tokenize(doc))) df.set(t, (df.get(t) ?? 0) + 1);
  const vocab = new Map([...df.keys()].map((t, i) => [t, i]));
  const idf = new Float32Array(vocab.size);
  for (const [t, i] of vocab) idf[i] = Math.log(1 + corpus.length / df.get(t)!);
  return {
    label: 'TF-IDF',
    threshold: 0.12,
    async embed(texts) {
      return texts.map((text) => {
        const v = new Float32Array(vocab.size);
        for (const t of tokenize(text)) {
          const i = vocab.get(t);
          if (i !== undefined) v[i] += idf[i];
        }
        return normalize(v);
      });
    },
  };
}

async function miniLmEmbedder(onProgress: (p: number) => void): Promise<Embedder> {
  const { pipeline } = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
  const files = new Map<string, number>();
  const extractor = await pipeline('feature-extraction', MODEL, {
    dtype: 'q8',
    progress_callback: (e: { status: string; file?: string; progress?: number }) => {
      if (e.status === 'progress' && e.file) {
        files.set(e.file, e.progress ?? 0);
        onProgress(Math.min(...files.values()));
      }
    },
  });
  return {
    label: 'MiniLM-L6 · 384d',
    threshold: 0.32,
    async embed(texts) {
      const out = await extractor(texts, { pooling: 'mean', normalize: true });
      return (out.tolist() as number[][]).map((row) => Float32Array.from(row));
    },
  };
}

export class VectorIndex {
  chunks: Chunk[];
  private vectors: Float32Array[] = [];
  private noteVectors = new Map<string, Float32Array>();
  private embedder!: Embedder;
  private listeners = new Set<(s: IndexStatus) => void>();
  status: IndexStatus = { kind: 'lexical' };

  constructor(private vault: Vault) {
    this.chunks = vault.notes.flatMap(chunkNote);
  }

  get label() {
    return this.embedder?.label ?? '';
  }
  get threshold() {
    return this.embedder?.threshold ?? 0.12;
  }

  onChange(fn: (s: IndexStatus) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private setStatus(s: IndexStatus) {
    this.status = s;
    this.listeners.forEach((fn) => fn(s));
  }

  private chunkInput(c: Chunk) {
    const note = this.vault.byId.get(c.noteId)!;
    return `${note.title}${c.heading ? ` — ${c.heading}` : ''}: ${c.text}`;
  }

  private async build(embedder: Embedder) {
    const inputs = this.chunks.map((c) => this.chunkInput(c));
    const vectors: Float32Array[] = [];
    for (let i = 0; i < inputs.length; i += 16) vectors.push(...(await embedder.embed(inputs.slice(i, i + 16))));
    const noteVectors = new Map<string, Float32Array>();
    this.chunks.forEach((c, i) => {
      const acc = noteVectors.get(c.noteId) ?? new Float32Array(vectors[i].length);
      for (let d = 0; d < acc.length; d++) acc[d] += vectors[i][d];
      noteVectors.set(c.noteId, acc);
    });
    noteVectors.forEach(normalize);
    this.embedder = embedder;
    this.vectors = vectors;
    this.noteVectors = noteVectors;
  }

  private upgradePromise: Promise<void> | null = null;
  private idleUpgradeScheduled = false;

  async init() {
    await this.build(tfidfEmbedder(this.chunks.map((c) => this.chunkInput(c))));
    this.setStatus({ kind: 'lexical' });
    this.scheduleIdleSemanticUpgrade();
  }

  /** TF-IDF is enough for first paint; load MiniLM on search intent or extended idle. */
  scheduleIdleSemanticUpgrade() {
    if (this.idleUpgradeScheduled || this.upgradePromise) return;
    this.idleUpgradeScheduled = true;
    const start = () => void this.ensureSemanticUpgrade();
    if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(start, { timeout: 30_000 });
    else setTimeout(start, 20_000);
  }

  ensureSemanticUpgrade() {
    if (this.status.kind === 'semantic' || this.status.kind === 'fallback') return;
    if (!this.upgradePromise) this.upgradePromise = this.runSemanticUpgrade();
    return this.upgradePromise;
  }

  private async runSemanticUpgrade() {
    try {
      this.setStatus({ kind: 'loading', progress: 0 });
      const embedder = await miniLmEmbedder((p) => this.setStatus({ kind: 'loading', progress: p }));
      await this.build(embedder);
      this.setStatus({ kind: 'semantic' });
    } catch (err) {
      console.warn('Semantic model unavailable, staying on TF-IDF', err);
      this.setStatus({ kind: 'fallback', reason: String(err) });
    }
  }

  async search(query: string, k = 8): Promise<Hit[]> {
    if (!query.trim() || !this.embedder) return [];
    const [q] = await this.embedder.embed([query]);
    return this.vectors
      .map((v, i) => ({ chunk: this.chunks[i], score: dot(q, v) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /** Nearest notes by mean chunk vector; `linked` marks pairs already connected by a wikilink. */
  related(noteId: string, k = 5): { id: string; score: number; linked: boolean }[] {
    const v = this.noteVectors.get(noteId);
    if (!v) return [];
    const note = this.vault.byId.get(noteId)!;
    const linked = new Set([...note.links, ...(this.vault.backlinks.get(noteId) ?? [])]);
    return [...this.noteVectors]
      .filter(([id]) => id !== noteId)
      .map(([id, w]) => ({ id, score: dot(v, w), linked: linked.has(id) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /** Unlinked note pairs whose vectors are close — the edges ZettelLinker would suggest. */
  suggestedLinks(perNote = 1): { source: string; target: string; score: number }[] {
    if (!this.embedder) return [];
    const isHub = (id: string) => this.vault.byId.get(id)!.tags.some((t) => t === 'index' || t === 'tool');
    const seen = new Set<string>();
    const out: { source: string; target: string; score: number }[] = [];
    for (const id of this.noteVectors.keys()) {
      if (isHub(id)) continue;
      for (const r of this.related(id, 8).filter((r) => !r.linked && !isHub(r.id)).slice(0, perNote)) {
        const key = [id, r.id].sort().join('|');
        if (seen.has(key) || r.score < this.threshold + 0.14) continue;
        seen.add(key);
        out.push({ source: id, target: r.id, score: r.score });
      }
    }
    return out;
  }
}
