export type Props = Record<string, string | string[]>;

export interface Note {
  id: string;
  name: string;
  title: string;
  folder: string;
  props: Props;
  tags: string[];
  body: string;
  links: string[];
}

export interface Vault {
  notes: Note[];
  byId: Map<string, Note>;
  backlinks: Map<string, string[]>;
  resolve(target: string): Note | undefined;
}

const files = import.meta.glob('./vault/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

function parseFrontmatter(raw: string): { props: Props; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { props: {}, body: raw };
  const props: Props = {};
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

export function loadVault(): Vault {
  const notes: Note[] = Object.entries(files).map(([path, raw]) => {
    const id = path.replace(/^\.\/vault\//, '').replace(/\.md$/, '');
    const name = id.split('/').pop()!;
    const folder = id.includes('/') ? id.slice(0, id.lastIndexOf('/')) : '';
    const { props, body } = parseFrontmatter(raw);
    const h1 = body.match(/^#\s+(.+)$/m);
    const tags = Array.isArray(props.tags) ? props.tags : props.tags ? [props.tags] : [];
    delete props.tags;
    return { id, name, folder, props, tags, body, title: h1 ? h1[1] : name, links: [] };
  });

  const byName = new Map(notes.map((n) => [n.name.toLowerCase(), n]));
  const byId = new Map(notes.map((n) => [n.id, n]));
  const resolve = (target: string) =>
    byId.get(target) ?? byName.get(target.trim().toLowerCase().split('/').pop()!);

  const backlinks = new Map<string, string[]>(notes.map((n) => [n.id, []]));
  for (const note of notes) {
    const targets = new Set<string>();
    for (const m of stripCode(note.body).matchAll(WIKILINK)) {
      const t = resolve(m[1]);
      if (t && t.id !== note.id) targets.add(t.id);
    }
    note.links = [...targets];
    for (const t of targets) backlinks.get(t)!.push(note.id);
  }

  return { notes, byId, backlinks, resolve };
}
