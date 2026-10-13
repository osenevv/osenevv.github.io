import './demos.css';

const GLIDE = 800;

interface Ctx {
  el: HTMLElement;
  stage: HTMLElement;
  reduce: boolean;
  caption(text: string): void;
  /** Timer for the demo's own transitions; keeps running while autoplay is paused. */
  after(ms: number, fn: () => void): void;
}

interface Step {
  target: HTMLElement;
  wait: number;
}

/** `next()` names the element the ghost cursor should click; autoplay drives the same buttons a visitor would. */
interface Controller {
  next(): Step | null;
}

interface Demo {
  label: string;
  file: string;
  bar: string;
  stage: string;
  mount(ctx: Ctx): Controller;
}

const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const $$ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];
const restart = (node: HTMLElement, cls: string) => {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
};

/* ---------- ZettelLinker: Scan → pick match → Link → Undo ---------- */

const ZL_SCORES: Record<string, number> = { HNSW: 92, Embeddings: 79, 'Vector Search': 68 };
const ZL_SHORT: Record<string, string> = { HNSW: 'HNSW', Embeddings: 'Emb', 'Vector Search': 'VS' };

const zettelLinker: Demo = {
  label: 'ZettelLinker finds missing wikilinks with local embeddings.',
  file: 'Vector Search.md',
  bar: `<span class="zl-hud" aria-live="polite">phrase</span>`,
  stage: `<div class="zl">
    <div class="zl-arena">
      <button type="button" class="zl-chip">approx. search</button>
      <div class="zl-graph-wrap">
        <div class="zl-graph-stage">
          <svg class="zl-graph" viewBox="0 0 120 78" aria-hidden="true">
            <line class="zl-ge zl-ge-hnsw" x1="60" y1="58" x2="60" y2="16" />
            <line class="zl-ge zl-ge-emb" x1="60" y1="58" x2="22" y2="30" />
            <line class="zl-ge zl-ge-rag" x1="60" y1="58" x2="98" y2="30" />
            <circle class="zl-gn zl-gn-self" cx="60" cy="58" r="8" />
            <g class="zl-gn-pair" data-link="HNSW"><circle r="7" cx="60" cy="14" /><text x="60" y="5">HNSW</text></g>
            <g class="zl-gn-pair" data-link="Embeddings"><circle r="6.5" cx="20" cy="30" /><text x="20" y="21">Emb</text></g>
            <g class="zl-gn-pair" data-link="Vector Search"><circle r="6.5" cx="100" cy="30" /><text x="100" y="21">VS</text></g>
          </svg>
          <div class="zl-hits">
            <button type="button" class="zl-node" data-link="HNSW" style="--x:50%;--y:17.95%" aria-label="Pick HNSW"></button>
            <button type="button" class="zl-node" data-link="Embeddings" style="--x:16.67%;--y:38.46%" aria-label="Pick Embeddings"></button>
            <button type="button" class="zl-node" data-link="Vector Search" style="--x:83.33%;--y:38.46%" aria-label="Pick Vector Search"></button>
          </div>
          <p class="zl-callout" aria-hidden="true"></p>
          <span class="zl-ripple"></span>
          <span class="zl-burst"></span>
        </div>
      </div>
    </div>
    <div class="zl-dock">
      <div class="zl-orbs">
        <button type="button" class="zl-orb" data-link="HNSW" style="--s:92" aria-label="HNSW 92%"><b>92</b><span>HNSW</span></button>
        <button type="button" class="zl-orb" data-link="Embeddings" style="--s:79" aria-label="Embeddings 79%"><b>79</b><span>Emb</span></button>
        <button type="button" class="zl-orb" data-link="Vector Search" style="--s:68" aria-label="Vector Search 68%"><b>68</b><span>VS</span></button>
      </div>
      <button type="button" class="zl-main"><span>Scan</span><span>Link</span><span>Undo</span></button>
    </div>
  </div>`,
  mount(ctx) {
    const { el } = ctx;
    const main = $<HTMLButtonElement>(el, '.zl-main');
    const chip = $<HTMLButtonElement>(el, '.zl-chip');
    const hud = $(el, '.zl-hud');
    const callout = $(el, '.zl-callout');
    const orbs = $$<HTMLButtonElement>(el, '.zl-orb');
    const nodes = $$<HTMLButtonElement>(el, '.zl-node');
    let phase = 0; // 0 phrase · 1 match · 2 linked
    let pick = 'HNSW';
    let busy = false; // scanning animation

    const say = (html: string) => {
      callout.innerHTML = html;
      restart(callout, 'flash');
    };

    const setLabels = () => {
      $$(el, '.zl-gn-pair').forEach((g) => {
        const name = g.getAttribute('data-link') ?? '';
        const text = $(g, 'text');
        const short = ZL_SHORT[name] ?? name;
        text.textContent = phase === 2 && name === pick ? `[[${short}]]` : short;
      });
    };

    const sync = () => {
      el.dataset.phase = String(phase);
      el.dataset.link = phase >= 1 ? pick : '';
      const canPick = phase === 1 && !busy;
      orbs.forEach((o) => {
        const on = phase >= 1 && o.dataset.link === pick;
        o.classList.toggle('is-picked', on);
        o.classList.toggle('is-next', canPick && on);
        o.disabled = !canPick;
      });
      nodes.forEach((n) => {
        const on = phase >= 1 && n.dataset.link === pick;
        n.classList.toggle('is-picked', on);
        n.classList.toggle('is-next', canPick && on);
        n.disabled = !canPick;
      });
      if (phase === 0) {
        chip.innerHTML = '<span class="zl-lead">phrase:</span> approx. search';
        chip.classList.remove('is-linked');
      } else if (phase === 1) {
        chip.innerHTML = `<span class="zl-lead">match:</span> [[${pick}]]`;
        chip.classList.remove('is-linked');
      } else if (phase === 2) {
        chip.innerHTML = `<span class="zl-lead">linked:</span> [[${pick}|approx. search]]`;
        chip.classList.add('is-linked');
      }
      chip.classList.toggle('is-hot', phase === 1 && busy);
      chip.classList.toggle('is-next', phase === 0 && !busy);
      chip.disabled = phase !== 0;
      main.disabled = busy;
      main.classList.toggle('is-next', !busy && (phase === 0 || phase === 1 || phase === 2));
      setLabels();
    };

    const select = (name: string) => {
      if (phase !== 1 || busy) return;
      pick = name;
      say(`<b>${ZL_SCORES[name] ?? 92}%</b>`);
      ctx.caption(`Candidate: [[${name}]] (${ZL_SCORES[name] ?? 92}% match) — click Link`);
      const g = el.querySelector(`.zl-gn-pair[data-link="${name}"]`);
      const orb = el.querySelector(`.zl-orb[data-link="${name}"]`);
      if (g) restart(g as HTMLElement, 'zl-tap');
      if (orb) restart(orb as HTMLElement, 'zl-tap');
      sync();
    };

    const link = () => {
      if (phase !== 1 || busy) return;
      phase = 2;
      el.classList.remove('zl-rank', 'zl-hit');
      hud.textContent = 'linked';
      say('✓');
      restart(el, 'zl-linked');
      restart($(el, '.zl-burst'), 'go');
      sync();
      ctx.caption(`Wikilink [[${pick}|approx. search]] written to note · non-destructive`);
      ctx.after(600, () => {
        if (phase === 2) callout.classList.remove('flash');
      });
    };

    const scan = () => {
      if (busy || phase !== 0) return;
      busy = true;
      pick = 'HNSW';
      el.classList.remove('zl-linked', 'zl-hit');
      el.dataset.link = '';
      hud.textContent = 'scan';
      say('Scan');
      restart(el, 'zl-rank');
      chip.classList.add('is-hot');
      main.disabled = true;
      main.classList.remove('is-next');
      chip.disabled = true;
      chip.classList.remove('is-next');
      ctx.caption('Embedding phrase with MiniLM · searching local HNSW index…');
      ctx.after(380, () => {
        if (!busy || phase !== 0) return;
        say('···');
        hud.textContent = 'embed';
      });
      ctx.after(900, () => {
        if (!busy || phase !== 0) return;
        busy = false;
        phase = 1;
        el.classList.remove('zl-rank');
        hud.textContent = 'match';
        say('<b>92%</b>');
        restart(el, 'zl-hit');
        sync();
        ctx.caption(`Top match: [[${pick}]] (92% cosine similarity) — click Link`);
      });
    };

    const undo = () => {
      if (phase !== 2) return;
      busy = false;
      phase = 0;
      pick = 'HNSW';
      el.classList.remove('zl-rank', 'zl-hit', 'zl-linked');
      callout.textContent = '';
      callout.classList.remove('flash');
      hud.textContent = 'phrase';
      sync();
      ctx.caption('Link rolled back · non-destructive (click Scan to re-run)');
    };

    main.addEventListener('click', () => {
      if (busy) return;
      if (phase === 0) scan();
      else if (phase === 1) link();
      else undo();
    });
    chip.addEventListener('click', () => phase === 0 && !busy && scan());
    const bindPick = (btn: HTMLButtonElement) => {
      btn.addEventListener('pointerenter', () => {
        if (phase !== 1 || busy) return;
        pick = btn.dataset.link ?? pick;
        say(`<b>${ZL_SCORES[pick] ?? 92}%</b>`);
        ctx.caption(`Candidate: [[${pick}]] (${ZL_SCORES[pick] ?? 92}% match)`);
        sync();
      });
      btn.addEventListener('click', () => select(btn.dataset.link ?? 'HNSW'));
    };
    orbs.forEach(bindPick);
    nodes.forEach(bindPick);

    sync();
    ctx.caption("Unlinked phrase 'approx. search' in Vector Search.md — click Scan");

    return {
      next: () => {
        if (busy) return null;
        if (phase === 0) return { target: main, wait: 1000 };
        if (phase === 1) return { target: main, wait: 1400 };
        return { target: main, wait: 2200 };
      },
    };
  },
};

/* ---------- Yapper: record → stop → grounded task → record again ---------- */

const SNIPPETS = [
  { lead: 'okay so', task: 'need to profile the re-index latency before Friday', mid: '— anyway,', chat: "the weather's been wild lately…", title: 'Profile re-index', due: 'due Fri' },
  { lead: 'right,', task: 'remind me to email Lukas the benchmark numbers', mid: '— oh and', chat: 'that podcast was great', title: 'Email Lukas', due: 'today' },
  { lead: 'hmm,', task: 'I should write the HNSW docs section tomorrow', mid: '— but', chat: 'coffee first, honestly', title: 'Write HNSW docs', due: 'tmrw' },
];

const card = (title: string, meta: string) =>
  `<span class="yp-title"><button type="button" class="yp-check" aria-label="Mark done"></button><span>${title}</span></span><small>${meta}</small>`;

const yapper: Demo = {
  label: 'Yapper records a voice note, transcribes it on-device, keeps only tasks that quote you, and files them in an Obsidian Kanban.',
  file: 'voice-memo.m4a',
  bar: `<span class="yp-status"><i></i><span>Whisper · on-device</span></span>`,
  stage: `<div class="yp">
    <div class="yp-left">
      <div class="yp-mic">
        <button type="button" class="yp-rec-btn" aria-label="Record"><span class="yp-rec"></span></button>
        <span class="yp-bars">${Array.from({ length: 9 }, (_, b) => `<i style="--b:${b}"></i>`).join('')}</span>
        <span class="yp-timer">0:00</span>
      </div>
      <p class="yp-text"><span class="yp-placeholder">Press record and think out loud…</span></p>
    </div>
    <div class="yp-board">
      <span class="yp-col">To do <b class="yp-count">1</b></span>
      <div class="yp-list"><div class="yp-card">${card('Ship v1.2', 'due Mon')}</div></div>
    </div>
  </div>`,
  mount(ctx) {
    const { el, stage } = ctx;
    const btn = $<HTMLButtonElement>(el, '.yp-rec-btn');
    const text = $(el, '.yp-text');
    const list = $(el, '.yp-list');
    const count = $(el, '.yp-count');
    const timer = $(el, '.yp-timer');
    const status = $(el, '.yp-status > span');
    let state: 'idle' | 'rec' | 'proc' = 'idle';
    let index = 0;
    let secs = 0;
    let wordsMs = 0;
    let autoEnabled = false;

    const setState = (s: typeof state) => {
      state = s;
      el.dataset.state = s;
      btn.disabled = s === 'proc';
      btn.classList.toggle('is-next', s !== 'proc');
      btn.setAttribute('aria-label', s === 'rec' ? 'Stop recording' : 'Record');
      status.textContent = s === 'rec' ? 'REC' : s === 'proc' ? 'grounding…' : 'Whisper · on-device';
    };
    const tick = () => {
      if (state !== 'rec') return;
      timer.textContent = `0:0${Math.min(++secs, 9)}`;
      ctx.after(1000, tick);
    };

    const record = () => {
      const s = SNIPPETS[index % SNIPPETS.length];
      let w = 0;
      const words = (t: string) => t.split(' ').map((x) => `<span class="yp-w" style="--w:${w++}">${x}</span>`).join(' ');
      text.className = 'yp-text';
      text.innerHTML = `${words(s.lead)} <span class="yp-task">${words(s.task)}</span> ${words(s.mid)} <span class="yp-chat">${words(s.chat)}</span>`;
      wordsMs = w * 85 + 300;
      secs = 0;
      timer.textContent = '0:00';
      setState('rec');
      ctx.after(1000, tick);
      ctx.caption('Recording — Whisper transcribes on your Mac');
    };

    const stop = () => {
      text.classList.add('is-final', 'is-graded');
      setState('proc');
      ctx.caption('Only the sentence you can quote becomes a task');
      ctx.after(900, file);
    };

    const maxTodoCards = 2;

    const file = () => {
      const s = SNIPPETS[index++ % SNIPPETS.length];
      const from = $(text, '.yp-task').getClientRects()[0];
      const to = list.getBoundingClientRect();
      const base = stage.getBoundingClientRect();
      const land = () => {
        const node = document.createElement('div');
        node.className = 'yp-card is-new';
        node.innerHTML = card(s.title, `${s.due} · quoted ✓`);
        list.prepend(node);
        const cards = $$(list, '.yp-card:not(.is-leaving)');
        cards.slice(maxTodoCards).forEach((c) => {
          c.classList.add('is-leaving');
          ctx.after(260, () => c.remove());
        });
        count.textContent = String(Math.min(cards.length, maxTodoCards));
        restart(count, 'bump');
        setState('idle');
        ctx.caption(`Filed to Kanban · ${s.due} — record another`);
      };
      if (ctx.reduce || !from) return land();
      const ghost = document.createElement('span');
      ghost.className = 'yp-fly';
      ghost.textContent = s.title;
      ghost.style.left = `${from.left - base.left}px`;
      ghost.style.top = `${from.top - base.top}px`;
      stage.append(ghost);
      ghost.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(0.92)`, opacity: 0.3 },
        ],
        { duration: 480, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' },
      ).onfinish = () => {
        ghost.remove();
        land();
      };
    };

    btn.addEventListener('click', () => {
      autoEnabled = true;
      if (state === 'idle') record();
      else if (state === 'rec') stop();
    });
    list.addEventListener('click', (e) => {
      const check = (e.target as HTMLElement).closest('.yp-check');
      if (check) check.closest('.yp-card')!.classList.toggle('is-done');
    });
    setState('idle');
    ctx.caption('Hit record — audio never leaves your Mac');
    return {
      next: () => {
        if (!autoEnabled) return null;
        if (state === 'idle') return { target: btn, wait: 1700 };
        if (state === 'rec') return { target: btn, wait: wordsMs };
        return null;
      },
    };
  },
};

/* ---------- Mafia Tracker: day nominations, night kills, ratings, new game ---------- */

const mafia: Demo = {
  label: 'Mafia Tracker mini-game: nominate and vote by day, the mafia shoots at night, every screen updates live, and Elo moves when a side wins.',
  file: 'Game #128 · live',
  bar: `<span class="mt-phase">☀ Day 1</span>`,
  stage: `<div class="mt">
    <div class="mt-judge">
      <button type="button" class="mt-btn mt-main"></button>
      <p class="mt-note"></p>
      <span class="mt-score"><b class="mt-town">7</b><span aria-hidden="true">·</span><b class="mt-maf">3</b></span>
    </div>
    <span class="mt-packet" aria-hidden="true"></span>
    <div class="mt-room">
      <div class="mt-table">
        ${Array.from({ length: 10 }, (_, i) => `<button type="button" class="mt-seat" style="--i:${i}" aria-label="Seat ${i + 1}">${i + 1}</button>`).join('')}
        <span class="mt-center"></span>
      </div>
    </div>
    <div class="mt-end">
      <div class="mt-end-card">
        <b class="mt-end-title"></b>
        <span class="mt-elo">+</span>
        <button type="button" class="mt-deal">Again</button>
      </div>
    </div>
  </div>`,
  mount(ctx) {
    const { el } = ctx;
    const seatEls = $$<HTMLButtonElement>(el, '.mt-seat');
    const main = $<HTMLButtonElement>(el, '.mt-main');
    const note = $(el, '.mt-note');
    const judgeNotes = (t: string) => {
      note.textContent = t;
    };
    const center = $(el, '.mt-center');
    const table = $(el, '.mt-table');
    const packet = $(el, '.mt-packet');
    const phaseLabel = $(el, '.mt-phase');
    const town = $(el, '.mt-town');
    const maf = $(el, '.mt-maf');
    const deal = $<HTMLButtonElement>(el, '.mt-deal');
    const elo = $(el, '.mt-elo');

    let mafiaSeats = new Set<number>();
    let don = -1;
    let sheriff = -1;
    const roleOf = (i: number) => (i === don ? 'the Don' : mafiaSeats.has(i) ? 'mafia' : i === sheriff ? 'the Sheriff' : 'a citizen');
    let alive = new Set<number>();
    let phase: 'day' | 'night' | 'over' = 'day';
    let round = 1;
    let nominated: number | null = null;
    let busy = false;
    let autoKey = '';
    let autoPick = 0;
    let game = 0;
    /** Drops callbacks (timers, packet flights) that belong to a game the visitor already restarted. */
    const thisGame = (fn: () => void) => {
      const g = game;
      return () => g === game && fn();
    };

    const say = (html: string) => {
      center.innerHTML = html;
      restart(center, 'flash');
    };
    const ping = () => restart(table, 'is-ping');
    const townAlive = () => [...alive].filter((i) => !mafiaSeats.has(i));
    const mafiaAlive = () => [...alive].filter((i) => mafiaSeats.has(i));
    const pickable = (i: number) => !busy && alive.has(i) && (phase === 'day' || (phase === 'night' && !mafiaSeats.has(i)));

    const render = () => {
      el.classList.toggle('is-night', phase === 'night');
      phaseLabel.textContent = phase === 'night' ? `☾ Night ${round}` : phase === 'over' ? '■ Game over' : `☀ Day ${round}`;
      town.textContent = String(townAlive().length);
      maf.textContent = String(mafiaAlive().length);
      seatEls.forEach((s, i) => {
        const mafiaAlly = phase === 'night' && alive.has(i) && mafiaSeats.has(i);
        s.classList.toggle('is-pick', pickable(i));
        s.classList.toggle('is-nom', nominated === i);
        s.classList.toggle('is-mafia-night', mafiaAlly);
        s.disabled = !pickable(i);
        if (mafiaAlly) s.setAttribute('aria-label', `Seat ${i + 1} — mafia (teammate)`);
        else s.setAttribute('aria-label', `Seat ${i + 1}`);
      });
      el.classList.toggle('is-over', phase === 'over');
      deal.classList.toggle('is-next', phase === 'over');
      deal.tabIndex = phase === 'over' ? 0 : -1;
      if (phase === 'over') {
        main.textContent = '—';
        main.disabled = true;
        judgeNotes('');
      } else if (busy) {
        main.disabled = true;
        judgeNotes('…');
      } else if (phase === 'night') {
        main.textContent = '☾';
        main.disabled = true;
        judgeNotes('red = mafia');
      } else if (nominated !== null) {
        main.textContent = `→ ${nominated + 1}`;
        main.disabled = false;
        judgeNotes('vote');
      } else {
        main.textContent = '→';
        main.disabled = true;
        judgeNotes('tap seat');
      }
      main.classList.toggle('is-next', !main.disabled);
    };
    const checkWin = () => {
      const m = mafiaAlive().length;
      const t = townAlive().length;
      if (m && m < t) return false;
      const townWins = m === 0;
      phase = 'over';
      seatEls.forEach((s, i) => alive.has(i) && s.classList.add('is-win'));
      say(townWins ? 'Town<br />wins' : 'Mafia<br />wins');
      $(el, '.mt-end-title').textContent = townWins ? 'Town' : 'Mafia';
      el.classList.toggle('mafia-won', !townWins);
      restart(el, 'mt-flash-end');
      elo.style.transition = 'none';
      elo.style.setProperty('--elo', '0');
      void elo.offsetWidth;
      elo.style.transition = '';
      requestAnimationFrame(() => requestAnimationFrame(() => elo.style.setProperty('--elo', townWins ? '12' : '31')));
      ctx.caption('');
      judgeNotes(townWins ? `+${12} Elo` : `+${31} Elo`);
      return true;
    };

    const newGame = () => {
      game += 1;
      autoKey = '';
      const order = seatEls.map((_, i) => i).sort(() => Math.random() - 0.5);
      mafiaSeats = new Set(order.slice(0, 3));
      [don, sheriff] = [order[0], order[3]];
      alive = new Set(seatEls.map((_, i) => i));
      phase = 'day';
      round = 1;
      nominated = null;
      busy = false;
      seatEls.forEach((s) => s.classList.remove('is-out', 'is-mafia', 'is-mafia-night', 'is-sheriff', 'is-win', 'is-shot'));
      restart(table, 'is-dealing');
      say('Day<br />1');
      ctx.caption('');
      render();
    };

    const flyTo = (seat: number, done: () => void) => {
      if (ctx.reduce) return done();
      const box = $(el, '.mt').getBoundingClientRect();
      const a = main.getBoundingClientRect();
      const b = seatEls[seat].getBoundingClientRect();
      const x0 = a.right - box.left - 6;
      const y0 = a.top + a.height / 2 - box.top - 4;
      const x1 = b.left + b.width / 2 - box.left - 4;
      const y1 = b.top + b.height / 2 - box.top - 4;
      packet.animate(
        [
          { transform: `translate(${x0}px, ${y0}px)`, opacity: 1 },
          { transform: `translate(${x1}px, ${y1}px)`, opacity: 1, offset: 0.9 },
          { transform: `translate(${x1}px, ${y1}px)`, opacity: 0 },
        ],
        { duration: 520, easing: 'ease-in' },
      ).onfinish = done;
    };

    const eliminate = (seat: number) => {
      alive.delete(seat);
      seatEls[seat].classList.add('is-out');
      if (mafiaSeats.has(seat)) seatEls[seat].classList.add('is-mafia');
      if (seat === sheriff) seatEls[seat].classList.add('is-sheriff');
    };

    const onSeat = (i: number) => {
      if (!pickable(i)) return;
      if (phase === 'day') {
        nominated = i;
        say(`#${i + 1}`);
        judgeNotes('vote');
        restart(seatEls[i], 'mt-pulse');
        ctx.caption('');
        ping();
        render();
        return;
      }
      busy = true;
      judgeNotes('bang');
      render();
      restart(seatEls[i], 'is-shot');
      eliminate(i);
      say(`#${i + 1}<br /><b>☠</b>`);
      restart(table, 'mt-flash-night');
      ctx.caption('');
      ping();
      render();
      ctx.after(
        1100,
        thisGame(() => {
          busy = false;
          if (checkWin()) return render();
          phase = 'day';
          round += 1;
          say(`Day<br />${round}`);
          ctx.caption('');
          render();
        }),
      );
    };

    const onMain = () => {
      if (phase !== 'day' || nominated === null || busy) return;
      const seat = nominated;
      busy = true;
      judgeNotes('…');
      render();
      flyTo(
        seat,
        thisGame(() => {
          nominated = null;
          eliminate(seat);
          const wasMafia = mafiaSeats.has(seat);
          const roleShort = roleOf(seat).replace(/^(the|a) /, '');
          say(`#${seat + 1}<br /><b class="${wasMafia ? 'mt-red' : ''}">${wasMafia ? 'mafia' : roleShort === 'Sheriff' ? '★' : 'out'}</b>`);
          restart(seatEls[seat], wasMafia ? 'mt-flash-maf' : 'mt-flash-out');
          judgeNotes(wasMafia ? 'got one' : 'wrong');
          ctx.caption('');
          ping();
          render();
          ctx.after(
            1100,
            thisGame(() => {
              busy = false;
              if (checkWin()) return render();
              phase = 'night';
              say(`Night<br />${round}`);
              restart(el, 'mt-flash-night');
              judgeNotes('shoot');
              ctx.caption('');
              render();
            }),
          );
        }),
      );
    };

    seatEls.forEach((s, i) => s.addEventListener('click', () => onSeat(i)));
    main.addEventListener('click', onMain);
    deal.addEventListener('click', () => phase === 'over' && newGame());
    newGame();

    return {
      next() {
        if (busy) return null;
        if (phase === 'over') return { target: deal, wait: 3000 };
        if (phase === 'day' && nominated !== null) return { target: main, wait: 1100 };
        const key = `${phase}-${round}`;
        if (key !== autoKey) {
          autoKey = key;
          const mafiaLeft = mafiaAlive();
          const townLeft = townAlive();
          const pool =
            phase === 'night'
              ? townLeft
              : Math.random() < 0.65
                ? mafiaLeft
                : townLeft;
          autoPick = pool[Math.floor(Math.random() * pool.length)] ?? townLeft[0] ?? 0;
        }
        return { target: seatEls[autoPick], wait: phase === 'day' ? 1300 : 1200 };
      },
    };
  },
};

const DEMOS: Record<string, Demo> = {
  'Projects/ZettelLinker': zettelLinker,
  'Projects/Yapper': yapper,
  'Projects/Mafia Tracker': mafia,
};

const CURSOR = `<span class="demo-cursor" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M2.5 1.5v11.8l3.2-3 2.2 4.9 2.1-.9-2.2-4.8h4.4z" /></svg></span>`;

export function demoHtml(noteId: string): string {
  const d = DEMOS[noteId];
  if (!d) return '';
  return `<figure class="demo" data-demo="${noteId}" aria-label="${d.label}">
    <div class="demo-bar">
      <span class="demo-file">${d.file}</span>
      <span class="demo-bar-right">${d.bar}</span>
    </div>
    <div class="demo-stage">${d.stage}${CURSOR}</div>
    <figcaption class="demo-caption"><i class="demo-progress"></i><span></span><span></span></figcaption>
  </figure>`;
}

/**
 * Autoplays each demo while it is on screen by walking a ghost cursor to `next()` and clicking it.
 * A real mouse or keyboard focus inside the demo pauses autoplay so the visitor can play.
 */
export function mountDemos(root: ParentNode) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll<HTMLElement>('.demo').forEach((el) => {
    const demo = DEMOS[el.dataset.demo!];
    const stage = $(el, '.demo-stage');
    const cursor = $(el, '.demo-cursor');
    const progress = $(el, '.demo-progress');
    const captions = $$(el, '.demo-caption > span');
    const autoTimers = new Set<number>();
    const ownTimers = new Set<number>();
    let visible = false;
    let hovered = false;
    let interacted = false;
    let caption = '';
    let shown = 0;

    const teardown = () => {
      [...autoTimers, ...ownTimers].forEach(clearTimeout);
      io.disconnect();
    };
    const timer = (set: Set<number>, ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        set.delete(id);
        if (el.isConnected) fn();
        else teardown();
      }, ms);
      set.add(id);
    };
    const clearAuto = () => {
      autoTimers.forEach(clearTimeout);
      autoTimers.clear();
      progress.classList.remove('run');
    };

    const renderCaption = () => {
      const turn = hovered && !interacted;
      const text = turn ? 'Your turn — try it yourself' : caption;
      el.classList.toggle('is-turn', turn);
      if (captions[shown].textContent === text) return;
      shown ^= 1;
      captions[shown].textContent = text;
      captions.forEach((c, i) => c.classList.toggle('is-on', i === shown));
    };

    const ctx: Ctx = {
      el,
      stage,
      reduce,
      caption(text) {
        caption = text;
        renderCaption();
      },
      after: (ms, fn) => timer(ownTimers, ms, fn),
    };
    const controller = demo.mount(ctx);

    const running = () => !reduce && visible && !hovered;
    const aimAt = (target: HTMLElement) => {
      const s = stage.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      cursor.style.transform = `translate(${r.left - s.left + r.width * 0.55}px, ${r.top - s.top + r.height * 0.6}px)`;
      cursor.classList.add('on');
    };
    const loop = () => {
      clearAuto();
      if (!running()) return;
      const step = controller.next();
      if (!step) return timer(autoTimers, 300, loop);
      progress.style.setProperty('--phase-ms', `${step.wait + GLIDE}ms`);
      restart(progress, 'run');
      timer(autoTimers, step.wait, () => aimAt(step.target));
      timer(autoTimers, step.wait + GLIDE, () => {
        if (controller.next()?.target !== step.target) return loop();
        const pressed = step.target;
        restart(cursor, 'click');
        restart(pressed, 'is-pressed');
        timer(ownTimers, 240, () => pressed.classList.remove('is-pressed'));
        pressed.click();
        timer(autoTimers, 350, loop);
      });
    };

    const setHover = (on: boolean) => {
      if (hovered === on) return;
      hovered = on;
      interacted = false;
      el.classList.toggle('is-live', on);
      if (on) {
        clearAuto();
        cursor.classList.remove('on');
      }
      renderCaption();
      loop();
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) loop();
      else clearAuto();
    });
    io.observe(el);

    el.addEventListener('click', (e) => {
      if (!e.isTrusted) return;
      interacted = true;
      renderCaption();
      loop();
    });
    el.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && setHover(true));
    el.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && setHover(false));
    el.addEventListener('focusin', (e) => (e.target as HTMLElement).matches(':focus-visible') && setHover(true));
    el.addEventListener('focusout', (e) => !el.contains(e.relatedTarget as Node) && !el.matches(':hover') && setHover(false));
  });
}
