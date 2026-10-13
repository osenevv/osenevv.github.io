import './style.css';
import type { GraphHandle, GraphOptions } from './graph';
import { icon } from './icons';
import { searchShortcutAria, searchShortcutLabel } from './keys';
import { CV_URL, EMAIL, flowHtml, proofHtml, renderLanding, repoLink, useCaseHtml } from './landing';
import { createRenderer, noteHref } from './markdown';
import { VectorIndex } from './search';
import { loadVault, type Note } from './vault';

const vault = loadVault();
const render = createRenderer(vault);
const index = new VectorIndex(vault);

const FOLDER_ORDER = ['About', 'Projects', 'Experience', 'Concepts', 'Writing', 'Tools'];
const FOLDER_LABELS: Record<string, string> = { About: 'About me', Concepts: 'Skills & concepts', Writing: 'Articles', Tools: 'Tools' };
const HIDDEN_PROPS = new Set(['summary', 'order', 'type', 'kind', 'flow', 'featured', 'proof', 'tradeoff', 'image', 'repo', 'usecase', 'atwork']);
const PROP_LABELS: Record<string, string> = { repo: 'code', stack: 'built with', period: 'when' };

type Route = { kind: 'landing' } | { kind: 'graph' } | { kind: 'note'; note: Note };

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

document.querySelector('#app')!.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">[[</span>Vladimir Osenev<span class="brand-mark" aria-hidden="true">]]</span></a>
    <nav class="topnav" aria-label="Main">
      <a href="#/" data-scroll="work">Projects</a>
      <a href="#/" data-scroll="experience">Experience</a>
      <a href="#/" data-scroll="fit">Do I fit?</a>
      <a href="${noteHref('Home')}" data-nav="vault">My notes</a>
    </nav>
    <div class="topbar-actions">
      <button class="search-trigger" data-action="palette" aria-label="Search the site" aria-keyshortcuts="${searchShortcutAria()}">${icon('search', 15)}<span>Search</span><kbd class="search-kbd" data-shortcut="search">${searchShortcutLabel()}</kbd></button>
      <a class="btn btn-sm topbar-cv" href="${CV_URL}" download>CV</a>
      <a class="btn btn-primary btn-sm" href="#/" data-scroll="contact">Contact</a>
    </div>
  </header>
  <div class="toast" role="status" aria-live="polite" hidden></div>
  <main class="page" tabindex="-1"></main>
  <div class="palette" hidden>
    <div class="palette-scrim" data-action="close-palette"></div>
    <div class="palette-box" role="dialog" aria-label="Search the site">
      <input class="palette-input" type="search" placeholder="Search projects, skills, or ask a question..." aria-label="Search query" autocomplete="off" />
      <div class="palette-results" role="listbox"></div>
      <div class="palette-footer"><span>↑↓ to move · Enter to open · Esc to close · <kbd data-shortcut="search">${searchShortcutLabel()}</kbd></span></div>
    </div>
  </div>
  <div class="hover-popover" hidden></div>`;

const page = $('.page');
let mounted: GraphHandle[] = [];
let showSuggested = true;
let navGen = 0;

function applySearchShortcutLabels() {
  const label = searchShortcutLabel();
  document.querySelectorAll<HTMLElement>('[data-shortcut="search"]').forEach((el) => {
    el.textContent = label;
  });
  $('.search-trigger').setAttribute('aria-keyshortcuts', searchShortcutAria());
}
applySearchShortcutLabels();

function route(): Route {
  const h = location.hash;
  if (h.startsWith('#/graph')) return { kind: 'graph' };
  if (h.startsWith('#/note/')) {
    const note = vault.byId.get(decodeURIComponent(h.slice(7)));
    if (note) return { kind: 'note', note };
  }
  return { kind: 'landing' };
}

function destroyGraphs() {
  mounted.forEach((g) => g.destroy());
  mounted = [];
  document.querySelectorAll('.graph-canvas').forEach((el) => el.remove());
}

function navigate() {
  const gen = ++navGen;
  void navigateAsync(gen);
}

async function navigateAsync(gen: number) {
  const r = route();
  destroyGraphs();
  popover.hidden = true;
  document.body.dataset.view = r.kind;
  document.querySelectorAll('[data-nav="vault"]').forEach((a) => a.classList.toggle('is-active', r.kind !== 'landing'));

  if (r.kind === 'landing') {
    await renderLanding(page, vault, index, (el, o) => mountGraph(el, { controls: false, ...o }));
    if (gen !== navGen) return;
    document.title = 'Vladimir Osenev — AI engineer';
    if (pendingScroll) {
      document.getElementById(pendingScroll)?.scrollIntoView();
      pendingScroll = '';
    } else window.scrollTo(0, 0);
    return;
  }
  if (r.kind === 'graph') {
    page.innerHTML = `<div class="reader reader-graph">
      <div class="graph-page">
        <a class="back-link" href="#/">← Back to overview</a>
        <h1 class="graph-title">Map of everything</h1>
        <p class="graph-intro">Every page on this site and how they connect. Purple dots are projects, orange are jobs, green are skills. Dashed lines are connections my AI model suggests that I haven’t written yet.</p>
        <div class="graph-full"></div>
      </div>
    </div>`;
    await mountGraph($('.graph-full'), { controls: true, freeZoom: true });
    if (gen !== navGen) return;
    document.title = 'Map · Vladimir Osenev';
    window.scrollTo(0, 0);
    return;
  }
  await renderReader(r.note);
  if (gen !== navGen) return;
  document.title = `${r.note.title} · Vladimir Osenev`;
  window.scrollTo(0, 0);
}

// ---------- Graph ----------
type MountGraphOpts = Pick<GraphOptions, 'ids' | 'activeId' | 'compact' | 'freeZoom'> & {
  controls: boolean;
  hint?: string;
};

async function mountGraph(el: HTMLElement, o: MountGraphOpts) {
  const { createGraph } = await import('./graph');
  const hint = o.hint ? `<p class="graph-stage-hint">${o.hint}</p>` : '';
  el.innerHTML = `<div class="graph-stage">${hint}</div>${
    o.controls
      ? `<div class="graph-controls">
          <label class="toggle"><input type="checkbox" ${showSuggested ? 'checked' : ''} /> <span>Show AI-suggested connections</span></label>
          <div class="legend">
            <span><i style="background:var(--graph-projects)"></i>Projects</span>
            <span><i style="background:var(--graph-experience)"></i>Jobs &amp; education</span>
            <span><i style="background:var(--graph-concepts)"></i>Skills</span>
            <span><i class="dash"></i>Suggested by AI</span>
          </div>
        </div>`
      : ''
  }`;
  const g = createGraph($('.graph-stage', el), vault, {
    ids: o.ids,
    activeId: o.activeId,
    compact: o.compact,
    freeZoom: o.freeZoom,
    onOpen: (id) => (location.hash = noteHref(id)),
  });
  const sync = () => g.setSuggested(showSuggested ? index.suggestedLinks() : []);
  sync();
  const off = index.onChange((s) => s.kind !== 'loading' && sync());
  el.querySelector<HTMLInputElement>('input')?.addEventListener('change', (e) => {
    showSuggested = (e.target as HTMLInputElement).checked;
    sync();
  });
  mounted.push({ ...g, destroy: () => (off(), g.destroy()) });
}

// ---------- Note reader ----------
function propValue(key: string, v: string | string[]) {
  const val = Array.isArray(v) ? v.join(', ') : v;
  if (key === 'email') return `<a href="mailto:${esc(val)}">${esc(val)}</a>`;
  if (/^(github|linkedin)\.com/.test(val)) return `<a class="external-link" href="https://${esc(val)}" target="_blank" rel="noopener">${esc(val)}</a>`;
  if (key === 'status') return `<span class="pill-status">${esc(val)}</span>`;
  return esc(val);
}

function renderTree(activeId: string) {
  const folders = new Map<string, Note[]>();
  const root: Note[] = [];
  for (const n of vault.notes) (n.folder ? folders.get(n.folder) ?? folders.set(n.folder, []).get(n.folder)! : root).push(n);
  const file = (n: Note) =>
    `<a class="tree-file ${n.id === activeId ? 'is-active' : ''}" href="${noteHref(n.id)}">${esc(n.name === 'Home' ? 'About me' : n.name)}</a>`;
  return (
    root.sort((a, b) => (a.name === 'Home' ? -1 : b.name === 'Home' ? 1 : 0)).map(file).join('') +
    [...folders.keys()]
      .sort((a, b) => FOLDER_ORDER.indexOf(a) - FOLDER_ORDER.indexOf(b))
      .map(
        (f) => `<details class="tree-folder" ${folders.get(f)!.some((n) => n.id === activeId) || f === 'Projects' ? 'open' : ''}>
          <summary>${icon('chevron', 14)}<span>${FOLDER_LABELS[f] ?? f}</span><span class="tree-count">${folders.get(f)!.length}</span></summary>
          <div class="tree-children">${folders.get(f)!.sort((a, b) => a.name.localeCompare(b.name)).map(file).join('')}</div>
        </details>`,
      )
      .join('')
  );
}

function noteLink(id: string, extra = '') {
  const n = vault.byId.get(id)!;
  return `<a class="pane-link" href="${noteHref(id)}"><span>${esc(n.name === 'Home' ? 'About me' : n.name)}</span>${extra}</a>`;
}

async function renderReader(note: Note) {
  const props = Object.entries(note.props).filter(([k]) => !HIDDEN_PROPS.has(k));
  const back = vault.backlinks.get(note.id) ?? [];
  const summary = note.props.summary as string | undefined;
  const folderLabel = note.folder ? FOLDER_LABELS[note.folder] ?? note.folder : 'Notes';

  page.innerHTML = `
    <div class="reader">
      <aside class="pages" aria-label="All pages">
        <button class="pages-toggle" data-action="toggle-pages" aria-expanded="false">${icon('list', 15)} All pages</button>
        <nav class="tree">${renderTree(note.id)}</nav>
      </aside>
      <article class="note">
        <a class="back-link" href="#/">← Back to overview</a>
        <div class="breadcrumb">${esc(folderLabel)}</div>
        <h1 class="inline-title">${esc(note.title)}</h1>
        ${summary ? `<p class="note-summary">${esc(summary)}</p>` : ''}
        ${
          note.props.type === 'project'
            ? `<div class="project-head">
                ${
                  note.props.image
                    ? `<div class="project-hero-frame"><img class="case-shot project-hero-shot" src="${esc(note.props.image as string)}" alt="${esc(note.name)} screenshot" loading="lazy" decoding="async" /></div>`
                    : ''
                }
                ${useCaseHtml(note)}
                ${note.props.tradeoff ? `<p class="case-decision"><span>Why I built it this way</span>${esc(note.props.tradeoff as string)}</p>` : ''}
                ${flowHtml(note)}
                ${proofHtml(note)}
                ${note.props.repo ? `<div class="case-links">${repoLink(note)}</div>` : ''}
              </div>`
            : ''
        }
        ${
          props.length
            ? `<dl class="properties">${props.map(([k, v]) => `<div class="prop"><dt>${esc(PROP_LABELS[k] ?? k)}</dt><dd>${propValue(k, v)}</dd></div>`).join('')}</dl>`
            : ''
        }
        <div class="markdown">${render(note.body)}</div>
        <div class="note-cta">
          <p>Interested in this kind of work?</p>
          <button class="btn btn-primary" data-copy="${EMAIL}">Copy my email</button>
          <a class="btn" href="${CV_URL}" download>Download CV</a>
          <a class="btn" href="#/" data-scroll="fit">See how I fit your role</a>
        </div>
      </article>
      <aside class="context" aria-label="Related pages">
        <section class="pane-section">
          <h3 class="pane-title">Similar topics</h3>
          <div class="related"></div>
          <p class="pane-hint">Found by an AI model comparing the meaning of every page.</p>
        </section>
        <section class="pane-section">
          <h3 class="pane-title">Mentioned in <span class="count">${back.length}</span></h3>
          ${back.length ? back.map((id) => noteLink(id)).join('') : '<p class="pane-empty">No other page links here yet.</p>'}
        </section>
        <section class="pane-section">
          <h3 class="pane-title">Connections</h3>
          <div class="local-graph"></div>
        </section>
      </aside>
    </div>`;

  const graphEmbed = page.querySelector<HTMLElement>('[data-embed="graph"]');
  const jd = page.querySelector<HTMLElement>('[data-embed="jd-match"]');
  const ids = [note.id, ...note.links, ...back];
  await Promise.all([
    graphEmbed ? mountGraph(graphEmbed, { controls: true }) : Promise.resolve(),
    jd ? import('./jd').then(({ mountJdMatcher }) => mountJdMatcher(jd, vault, index)) : Promise.resolve(),
    mountGraph($('.local-graph'), { ids, activeId: note.id, compact: true, controls: false }),
  ]);
  renderRelated(note.id);
}

function renderRelated(noteId: string) {
  const el = page.querySelector<HTMLElement>('.context .related');
  if (!el) return;
  el.innerHTML = index
    .related(noteId, 5)
    .map((r) => noteLink(r.id, r.linked ? '' : '<span class="badge" title="Similar in meaning, but not linked yet">new link</span>'))
    .join('');
}

index.onChange((s) => {
  const r = route();
  if (r.kind === 'note' && s.kind !== 'loading') renderRelated(r.note.id);
});

// ---------- Search palette ----------
const palette = $('.palette');
const pInput = $<HTMLInputElement>('.palette-input');
const pResults = $('.palette-results');
let selected = 0;
let searchSeq = 0;

function fuzzy(q: string, s: string) {
  q = q.toLowerCase();
  s = s.toLowerCase();
  if (s.includes(q)) return 2 + q.length / s.length;
  let i = 0;
  for (const c of s) if (c === q[i]) i++;
  return i === q.length ? 1 : 0;
}

async function updatePalette() {
  const q = pInput.value.trim();
  const seq = ++searchSeq;
  const titles = q
    ? vault.notes.map((n) => ({ n, s: Math.max(fuzzy(q, n.name), fuzzy(q, n.title)) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 4)
    : vault.notes.filter((n) => ['ZettelLinker', 'Yapper', 'Outlier.AI', 'Match a job description'].includes(n.name)).map((n) => ({ n, s: 1 }));
  if (q.length > 2) index.ensureSemanticUpgrade();
  const hits = q.length > 2 ? await index.search(q, 6) : [];
  if (seq !== searchSeq) return;
  const seen = new Set(titles.map((t) => t.n.id));
  const semantic = hits.filter((h) => h.score >= index.threshold * 0.8 && !seen.has(h.chunk.noteId) && seen.add(h.chunk.noteId));
  const item = (id: string, iconName: 'file' | 'sparkle', title: string, sub: string) =>
    `<a class="palette-item" role="option" href="${noteHref(id)}">${icon(iconName, 15)}<span class="pi-main"><span class="pi-title">${title}</span><span class="pi-sub">${sub}</span></span></a>`;
  const titleItems = titles.map(({ n }) => item(n.id, 'file', esc(n.name), esc((n.props.summary as string) ?? (n.folder ? FOLDER_LABELS[n.folder] ?? n.folder : 'Page'))));
  const semItems = semantic.map((h) => item(h.chunk.noteId, 'sparkle', esc(vault.byId.get(h.chunk.noteId)!.name), `${esc(h.chunk.text.slice(0, 110))}...`));
  const group = (label: string) => `<div class="palette-group">${label}</div>`;
  pResults.innerHTML =
    titleItems.length || semItems.length
      ? (titleItems.length ? group(q ? 'Pages' : 'Jump to') + titleItems.join('') : '') + (semItems.length ? group('Related by meaning') + semItems.join('') : '')
      : `<p class="palette-empty">Nothing close to “${esc(q)}”. Try a broader phrase, or <a href="mailto:osenevvova@gmail.com">ask me directly</a>.</p>`;
  selected = 0;
  highlight();
}

function highlight() {
  pResults.querySelectorAll('.palette-item').forEach((el, i) => {
    el.classList.toggle('is-selected', i === selected);
    if (i === selected) el.scrollIntoView({ block: 'nearest' });
  });
}

function openPalette() {
  index.ensureSemanticUpgrade();
  palette.hidden = false;
  pInput.value = '';
  updatePalette();
  pInput.focus();
}
const closePalette = () => (palette.hidden = true);

pInput.addEventListener('input', updatePalette);
pInput.addEventListener('keydown', (e) => {
  const items = pResults.querySelectorAll<HTMLAnchorElement>('.palette-item');
  if (e.key === 'ArrowDown') selected = Math.min(items.length - 1, selected + 1);
  else if (e.key === 'ArrowUp') selected = Math.max(0, selected - 1);
  else if (e.key === 'Enter' && items[selected]) {
    location.hash = items[selected].getAttribute('href')!;
    closePalette();
    return;
  } else return;
  e.preventDefault();
  highlight();
});
pResults.addEventListener('click', (e) => (e.target as HTMLElement).closest('.palette-item') && closePalette());

// ---------- Hover preview ----------
const popover = $('.hover-popover');
let hoverTimer = 0;
document.addEventListener('mouseover', (e) => {
  if (!matchMedia('(hover: hover)').matches) return;
  const a = (e.target as HTMLElement).closest<HTMLElement>('.markdown .internal-link[data-note]');
  clearTimeout(hoverTimer);
  if (!a) {
    if (!(e.target as HTMLElement).closest('.hover-popover')) popover.hidden = true;
    return;
  }
  hoverTimer = window.setTimeout(() => {
    const note = vault.byId.get(a.dataset.note!)!;
    const summary = note.props.summary ? `<p class="popover-summary">${esc(note.props.summary as string)}</p>` : '';
    popover.innerHTML = `<div class="popover-title">${esc(note.title)}</div>${summary}<div class="markdown">${render(note.body.replace(/```[\s\S]*?```/g, ''))}</div>`;
    const r = a.getBoundingClientRect();
    popover.hidden = false;
    const top = r.bottom + 8 + popover.offsetHeight > innerHeight ? r.top - popover.offsetHeight - 8 : r.bottom + 8;
    popover.style.top = `${Math.max(8, top)}px`;
    popover.style.left = `${Math.max(8, Math.min(r.left, innerWidth - popover.offsetWidth - 12))}px`;
  }, 400);
});

// ---------- Global events ----------
let pendingScroll = '';
const toast = $('.toast');
let toastTimer = 0;
function showToast(msg: string) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.hidden = true), 2600);
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const scrollLink = t.closest<HTMLElement>('[data-scroll]');
  if (scrollLink) {
    e.preventDefault();
    const id = scrollLink.dataset.scroll!;
    if (route().kind === 'landing') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    else {
      pendingScroll = id;
      location.hash = '#/';
    }
    return;
  }
  const copy = t.closest<HTMLElement>('[data-copy]');
  if (copy) {
    const text = copy.dataset.copy!;
    navigator.clipboard?.writeText(text).then(
      () => showToast(`Copied ${text} — paste it into your email app`),
      () => (location.href = `mailto:${text}`),
    ) ?? (location.href = `mailto:${text}`);
    return;
  }
  const action = t.closest<HTMLElement>('[data-action]');
  if (action?.dataset.action === 'palette') openPalette();
  if (action?.dataset.action === 'close-palette') closePalette();
  if (action?.dataset.action === 'toggle-pages') {
    const pages = action.closest('.pages')!;
    const open = pages.classList.toggle('is-open');
    action.setAttribute('aria-expanded', String(open));
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p')) {
    e.preventDefault();
    palette.hidden ? openPalette() : closePalette();
  } else if (e.key === 'Escape') {
    closePalette();
    popover.hidden = true;
  } else if (e.key === '/' && palette.hidden && !(e.target as HTMLElement).closest('input, textarea')) {
    e.preventDefault();
    openPalette();
  }
});

window.addEventListener('hashchange', navigate);
navigate();
index.init();
