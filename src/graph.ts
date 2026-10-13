import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { Vault } from './vault';

interface GNode extends SimulationNodeDatum {
  id: string;
  label: string;
  folder: string;
  degree: number;
}

interface GLink extends SimulationLinkDatum<GNode> {
  suggested?: boolean;
}

export interface GraphOptions {
  ids?: string[];
  activeId?: string;
  compact?: boolean;
  /** Zoom on plain wheel; otherwise only ⌘/ctrl-wheel, so embedded graphs don't trap page scroll. */
  freeZoom?: boolean;
  onOpen(id: string): void;
}

export interface GraphHandle {
  setSuggested(links: { source: string; target: string }[]): void;
  destroy(): void;
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const FOLDER_VARS: Record<string, string> = {
  Projects: '--graph-projects',
  Concepts: '--graph-concepts',
  Experience: '--graph-experience',
};

export function createGraph(container: HTMLElement, vault: Vault, opts: GraphOptions): GraphHandle {
  container.replaceChildren();
  const canvas = document.createElement('canvas');
  canvas.className = 'graph-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Graph of notes and the links between them');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const include = new Set(opts.ids ?? vault.notes.map((n) => n.id));
  const nodes: GNode[] = vault.notes
    .filter((n) => include.has(n.id))
    .map((n) => ({
      id: n.id,
      label: n.name,
      folder: n.folder,
      degree: n.links.length + (vault.backlinks.get(n.id)?.length ?? 0),
    }));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const baseLinks: GLink[] = vault.notes
    .filter((n) => include.has(n.id))
    .flatMap((n) => n.links.filter((t) => include.has(t)).map((t) => ({ source: n.id, target: t })));
  let suggested: GLink[] = [];

  const neighbours = new Map<string, Set<string>>(nodes.map((n) => [n.id, new Set()]));
  for (const l of baseLinks) {
    neighbours.get(l.source as string)!.add(l.target as string);
    neighbours.get(l.target as string)!.add(l.source as string);
  }

  const radius = (n: GNode) => (opts.compact ? 3 : 3.5) + Math.sqrt(n.degree) * (opts.compact ? 1.2 : 1.9);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const linkDist = opts.compact ? 72 : 130;
  const charge = opts.compact ? -240 : -520;
  const collidePad = opts.compact ? 10 : 14;

  const sim = forceSimulation<GNode>(nodes)
    .force('link', forceLink<GNode, GLink>(baseLinks).id((d) => d.id).distance(linkDist).strength(0.35))
    .force('charge', forceManyBody().strength(charge))
    .force('center', forceCenter(0, 0))
    .force('x', forceX(0).strength(0.03))
    .force('y', forceY(0).strength(0.04))
    .force('collide', forceCollide<GNode>((d) => radius(d) + collidePad))
    .on('tick', draw);
  if (reduceMotion) {
    sim.stop();
    for (let i = 0; i < 400; i++) sim.tick();
  }

  let width = 0;
  let height = 0;
  let view = { x: 0, y: 0, k: 1 };
  let hover: GNode | null = null;
  let dragging: GNode | null = null;
  let panning: { x: number; y: number } | null = null;
  let moved = false;
  let userMoved = false;

  const fit = () => {
    if (userMoved || !width || !nodes.length) return;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const n of nodes) {
      x0 = Math.min(x0, n.x!);
      y0 = Math.min(y0, n.y!);
      x1 = Math.max(x1, n.x!);
      y1 = Math.max(y1, n.y!);
    }
    const pad = opts.compact ? 44 : 84;
    const k = Math.min((width - pad) / Math.max(x1 - x0, 1), (height - pad) / Math.max(y1 - y0, 1), opts.compact ? 1.25 : 1.45);
    view = { x: (-(x0 + x1) / 2) * k, y: (-(y0 + y1) / 2) * k, k };
  };

  const resize = () => {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const toWorld = (cx: number, cy: number) => ({
    x: (cx - width / 2 - view.x) / view.k,
    y: (cy - height / 2 - view.y) / view.k,
  });

  const pick = (e: PointerEvent | MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    const p = toWorld(e.clientX - r.left, e.clientY - r.top);
    let best: GNode | null = null;
    let bestD = Infinity;
    for (const n of nodes) {
      const d = Math.hypot((n.x ?? 0) - p.x, (n.y ?? 0) - p.y);
      if (d < radius(n) + 6 / view.k && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return { node: best, p };
  };

  let alive = true;

  function draw() {
    if (!alive || !width) return;
    fit();
    const colors = {
      line: css('--graph-line'),
      lineActive: css('--interactive-accent'),
      suggested: css('--graph-suggested'),
      node: css('--graph-node'),
      text: css('--text-muted'),
      textActive: css('--text-normal'),
      active: css('--interactive-accent'),
    };
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2 + view.x, height / 2 + view.y);
    ctx.scale(view.k, view.k);

    const focus = hover ?? (opts.activeId ? nodeById.get(opts.activeId) ?? null : null);
    const near = focus ? neighbours.get(focus.id)! : null;
    const dim = (id: string) => hover !== null && id !== hover.id && !near!.has(id);

    ctx.lineWidth = 1 / view.k;
    for (const l of baseLinks) {
      const s = l.source as GNode;
      const t = l.target as GNode;
      const lit = focus && (s.id === focus.id || t.id === focus.id);
      ctx.globalAlpha = hover && !lit ? 0.15 : 1;
      ctx.strokeStyle = lit ? colors.lineActive : colors.line;
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.stroke();
    }

    ctx.setLineDash([4 / view.k, 4 / view.k]);
    ctx.strokeStyle = colors.suggested;
    ctx.lineWidth = 1.2 / view.k;
    for (const l of suggested) {
      const s = nodeById.get(l.source as string);
      const t = nodeById.get(l.target as string);
      if (!s || !t) continue;
      ctx.globalAlpha = hover && s.id !== hover.id && t.id !== hover.id ? 0.15 : 0.9;
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const n of nodes) {
      ctx.globalAlpha = dim(n.id) ? 0.2 : 1;
      const isFocus = focus?.id === n.id;
      ctx.fillStyle = isFocus ? colors.active : FOLDER_VARS[n.folder] ? css(FOLDER_VARS[n.folder]) : colors.node;
      ctx.beginPath();
      ctx.arc(n.x!, n.y!, radius(n), 0, Math.PI * 2);
      ctx.fill();
    }

    const showAll = view.k > (opts.compact ? 1.3 : 1.15);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `${12 / Math.max(view.k, 0.8)}px Inter, system-ui, sans-serif`;
    const labelFocus = opts.compact ? hover : focus;
    const labelNear = labelFocus ? neighbours.get(labelFocus.id)! : null;
    for (const n of nodes) {
      const isNear = n.id === opts.activeId || (labelFocus && (n.id === labelFocus.id || labelNear!.has(n.id)));
      if (!showAll && !isNear && n.degree < (opts.compact ? 99 : 5)) continue;
      ctx.globalAlpha = dim(n.id) ? 0.15 : isNear || !hover ? 1 : 0.5;
      ctx.fillStyle = isNear ? colors.textActive : colors.text;
      ctx.fillText(n.label, n.x!, n.y! + radius(n) + 6);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    moved = false;
    const { node } = pick(e);
    if (node) {
      dragging = node;
      node.fx = node.x;
      node.fy = node.y;
      sim.alphaTarget(0.25).restart();
    } else {
      userMoved = true;
      panning = { x: e.clientX - view.x, y: e.clientY - view.y };
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      moved = true;
      const { p } = pick(e);
      dragging.fx = p.x;
      dragging.fy = p.y;
    } else if (panning) {
      moved = true;
      view.x = e.clientX - panning.x;
      view.y = e.clientY - panning.y;
      draw();
    } else {
      const { node } = pick(e);
      if (node !== hover) {
        hover = node;
        canvas.style.cursor = node ? 'pointer' : 'grab';
        draw();
      }
    }
  });
  const release = () => {
    if (dragging) {
      if (!moved) opts.onOpen(dragging.id);
      dragging.fx = null;
      dragging.fy = null;
      sim.alphaTarget(0);
    }
    dragging = null;
    panning = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointerleave', () => {
    hover = null;
    draw();
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!opts.freeZoom && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      userMoved = true;
      const r = canvas.getBoundingClientRect();
      const cx = e.clientX - r.left - width / 2;
      const cy = e.clientY - r.top - height / 2;
      const k = Math.min(4, Math.max(0.3, view.k * Math.exp(-e.deltaY * 0.0015)));
      view = { x: cx - ((cx - view.x) * k) / view.k, y: cy - ((cy - view.y) * k) / view.k, k };
      draw();
    },
    { passive: false },
  );

  return {
    setSuggested(links) {
      suggested = links.filter((l) => include.has(l.source) && include.has(l.target));
      draw();
    },
    destroy() {
      alive = false;
      sim.stop();
      sim.on('tick', null);
      ro.disconnect();
      canvas.remove();
      container.replaceChildren();
    },
  };
}
