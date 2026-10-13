import { noteHref } from './markdown';
import type { VectorIndex } from './search';
import type { Note, Vault } from './vault';

export const EMAIL = 'osenevvova@gmail.com';
export const CV_URL = '/Vladimir_Osenev_CV.pdf';
export const CALENDLY_URL = 'https://calendly.com/osenevvova/30min';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const prop = (n: Note, k: string) => {
  const v = n.props[k];
  return Array.isArray(v) ? v.join(', ') : v ?? '';
};
const byOrder = (a: Note, b: Note) => Number(prop(a, 'order') || 99) - Number(prop(b, 'order') || 99);

export const flowHtml = (n: Note) => {
  const steps = prop(n, 'flow')
    .split(/[>→]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return steps.length ? `<ol class="flow" aria-label="How it works">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : '';
};

export const proofHtml = (n: Note) => {
  const items = prop(n, 'proof').split('·').map((s) => s.trim()).filter(Boolean);
  return items.length ? `<p class="proof">${items.map(esc).join('<span aria-hidden="true"> · </span>')}</p>` : '';
};

export const repoLink = (n: Note) =>
  n.props.repo ? `<a class="btn btn-sm" href="https://${esc(prop(n, 'repo'))}" target="_blank" rel="noopener">Code on GitHub ↗</a>` : '';

export const useCaseHtml = (n: Note) =>
  n.props.usecase
    ? `<dl class="usecase">
        <div><dt>Who it’s for</dt><dd>${esc(prop(n, 'usecase'))}</dd></div>
        ${n.props.atwork ? `<div><dt>Where it helps a team</dt><dd>${esc(prop(n, 'atwork'))}</dd></div>` : ''}
      </dl>`
    : '';

const proofBrief = (n: Note) => {
  const items = prop(n, 'proof').split('·').map((s) => s.trim()).filter(Boolean);
  return items.length ? esc(items.slice(0, 2).join(' · ')) : '';
};

export async function renderLanding(
  root: HTMLElement,
  vault: Vault,
  index: VectorIndex,
  mountGraph: (el: HTMLElement, o?: { hint?: string }) => void | Promise<void>,
) {
  const { demoHtml, mountDemos } = await import('./demos');
  const projects = vault.notes.filter((n) => n.props.type === 'project').sort(byOrder);
  const isFeatured = (p: Note) => String(p.props.featured) === 'true';
  const featured = projects.filter(isFeatured);
  const others = projects.filter((p) => !isFeatured(p));
  const jobs = vault.notes.filter((n) => n.props.type === 'experience' || n.props.type === 'education').sort(byOrder);

  root.innerHTML = `
  <div class="landing">
    <section class="hero" id="top">
      <div class="hero-text">
        <div class="hero-profile-row">
          <div class="hero-avatar-wrap">
            <img class="hero-avatar" src="/vladimir-avatar.webp" alt="Vladimir Osenev" width="84" height="84" fetchpriority="high" decoding="async" />
            <span class="hero-avatar-status" title="Open to work"></span>
          </div>
          <div class="hero-profile-meta">
            <p class="availability"><span class="live-dot"></span>Open to work · Prague or remote</p>
          </div>
        </div>
        <h1 class="hero-title">Hi, I’m Vladimir.</h1>
        <p class="hero-sub">I’m an AI engineer. I build tools that make notes and documents <strong>searchable by meaning</strong>, and I test AI so its <strong>answers can be trusted</strong>. Most of what I make starts as a problem in my own work.</p>
        <div class="hero-cta">
          <a class="btn btn-primary btn-lg" href="${CALENDLY_URL}" target="_blank" rel="noopener">Schedule a call with me</a>
          <button class="btn btn-lg" data-copy="${EMAIL}">Copy my email</button>
          <a class="btn btn-lg" href="${CV_URL}" download>Download CV</a>
          <a class="btn-link" href="https://github.com/osenevv" target="_blank" rel="noopener">GitHub ↗</a>
          <a class="btn-link" href="https://linkedin.com/in/vosenev" target="_blank" rel="noopener">LinkedIn ↗</a>
        </div>
      </div>
      <figure class="hero-graph">
        <div class="hero-graph-stage"></div>
      </figure>
    </section>

    <section class="about">
      <p>I’ve been programming for over seven years. At Outlier.AI I worked on post-training alignment for frontier coding and reasoning models — auditing multi-step chains of thought and authoring the production-grade Python code the models were trained to learn from. Now at Hegelmann Group I built an AI agent workflow that collects leads and prepares prospect lists — work that used to be done by hand.</p>
      <p>Outside work I keep everything in an Obsidian notes vault, and most of my projects grew out of it — this website included. I speak Russian, English and Czech.</p>
    </section>

    <section class="section" id="work">
      <div class="section-head">
        <h2>Things I’ve built</h2>
        <p class="section-hint">Flagship systems first — click through for architecture, benchmarks, and trade-offs.</p>
      </div>
      <div class="project-list">
        ${featured
          .map((p) => {
            const proof = proofBrief(p);
            const demo = demoHtml(p.id);
            return `<article class="project-row${demo ? ' has-demo' : ''}">
              <a class="project-row-main" href="${noteHref(p.id)}">
                <div class="project-row-head">
                  <span class="project-row-kind">${esc(prop(p, 'kind'))}</span>
                  ${proof ? `<span class="project-row-proof">${proof}</span>` : ''}
                </div>
                <span class="project-row-name">${esc(p.name)}</span>
                <span class="project-row-summary">${esc(prop(p, 'summary'))}</span>
              </a>
              ${demo}
            </article>`;
          })
          .join('')}
      </div>
      ${
        others.length
          ? `<h3 class="also-title">Smaller things</h3>
      <ul class="other-projects">
        ${others
          .map(
            (p) => `<li><a href="${noteHref(p.id)}"><span class="op-name">${esc(p.name)}</span><span class="op-summary">${esc(prop(p, 'summary'))}</span></a></li>`,
          )
          .join('')}
      </ul>`
          : ''
      }
    </section>

    <section class="section" id="experience">
      <div class="section-head"><h2>Experience & education</h2></div>
      <ol class="timeline">
        ${jobs
          .map(
            (r) => `<li>
              <div class="tl-when">${esc(prop(r, 'period'))}</div>
              <div class="tl-what">
                <h3><a href="${noteHref(r.id)}">${esc(r.name)}</a> <span class="tl-role">${esc(prop(r, 'role'))}</span></h3>
                <p>${esc(prop(r, 'summary'))}</p>
              </div>
            </li>`,
          )
          .join('')}
      </ol>
    </section>

    <section class="section fit-section" id="fit">
      <div class="section-head">
        <h2>Do I fit your role?</h2>
        <p class="section-hint">Paste a job post — the whole page is fine. Each requirement is checked against my projects and experience, and every match links to the note that proves it. Anything I haven’t done yet is marked honestly, not stretched.</p>
      </div>
      <div class="embed-jd" data-embed="landing"></div>
    </section>

    <footer class="contact" id="contact">
      <h2>Say hi</h2>
      <p>Book a 30-minute call or email me — I reply within a day.</p>
      <div class="contact-links">
        <a class="btn btn-primary btn-lg" href="${CALENDLY_URL}" target="_blank" rel="noopener">Schedule a call with me</a>
        <button class="btn btn-lg" data-copy="${EMAIL}">${EMAIL}</button>
        <a class="btn btn-lg" href="${CV_URL}" download>Download CV</a>
      </div>
      <div class="contact-links contact-small">
        <a class="btn-link" href="https://linkedin.com/in/vosenev" target="_blank" rel="noopener">LinkedIn ↗</a>
        <a class="btn-link" href="https://github.com/osenevv" target="_blank" rel="noopener">GitHub ↗</a>
        <a class="btn-link" href="${noteHref('Writing/How this vault works')}">How this site works</a>
      </div>
    </footer>
  </div>`;

  const heroStage = root.querySelector<HTMLElement>('.hero-graph-stage');
  if (heroStage) {
    requestAnimationFrame(() => {
      void mountGraph(heroStage, {
        hint: 'My notes as an interactive knowledge graph. <strong>Click any dot</strong> to open that page.',
      });
    });
  }

  requestAnimationFrame(() => mountDemos(root));

  const jdEl = root.querySelector<HTMLElement>('[data-embed="landing"]');
  if (jdEl) {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            io.disconnect();
            import('./jd').then(({ mountJdMatcher }) => mountJdMatcher(jdEl, vault, index));
          }
        },
        { rootMargin: '300px' },
      );
      io.observe(jdEl);
    } else {
      import('./jd').then(({ mountJdMatcher }) => mountJdMatcher(jdEl, vault, index));
    }
  }
}
