import { Marked, type TokenizerAndRendererExtension } from 'marked';
import type { Vault } from './vault';

export const noteHref = (id: string) => `#/note/${encodeURIComponent(id)}`;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function createRenderer(vault: Vault) {
  const wikilink: TokenizerAndRendererExtension = {
    name: 'wikilink',
    level: 'inline',
    start: (src) => src.indexOf('[['),
    tokenizer(src) {
      const m = src.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/);
      if (m) return { type: 'wikilink', raw: m[0], target: m[1], alias: m[2] };
    },
    renderer(token) {
      const note = vault.resolve(token.target);
      const label = escapeHtml(token.alias ?? token.target);
      return note
        ? `<a class="internal-link" href="${noteHref(note.id)}" data-note="${escapeHtml(note.id)}">${label}</a>`
        : `<span class="internal-link is-unresolved">${label}</span>`;
    },
  };

  const marked = new Marked({ gfm: true });
  marked.use({
    extensions: [wikilink],
    renderer: {
      code({ lang }) {
        if (lang === 'graph') return '<div class="embed embed-graph" data-embed="graph"></div>';
        if (lang === 'jd-match') return '<div class="embed embed-jd" data-embed="jd-match"></div>';
        return false;
      },
      link({ href, text }) {
        const external = /^https?:/.test(href);
        return `<a class="${external ? 'external-link' : ''}" href="${href}"${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
      },
      image({ href, title, text }) {
        return `<img src="${href}" alt="${escapeHtml(text || '')}"${title ? ` title="${escapeHtml(title)}"` : ''} loading="lazy" decoding="async" />`;
      },
    },
  });

  return (markdown: string): string => {
    const body = markdown.replace(/^#\s+.+\n?/, '');
    const html = marked.parse(body, { async: false }) as string;
    return transformCallouts(html);
  };
}

const CALLOUT_ICONS: Record<string, string> = {
  note: '✎',
  info: 'i',
  tip: '✦',
  quote: '❝',
  warning: '!',
};

function transformCallouts(html: string): string {
  return html.replace(
    /<blockquote>\s*<p>\[!(\w+)\]\s*([^\n<]*)\n?([\s\S]*?)<\/blockquote>/g,
    (_, type: string, title: string, rest: string) => {
      const t = type.toLowerCase();
      const heading = title.trim() || t[0].toUpperCase() + t.slice(1);
      return `<div class="callout" data-callout="${t}"><div class="callout-title"><span class="callout-icon">${CALLOUT_ICONS[t] ?? '•'}</span>${heading}</div><div class="callout-content"><p>${rest}</div></div>`;
    },
  );
}
