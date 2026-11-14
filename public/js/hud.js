// On-screen race display: countdown, live standings, progress strip,
// event feed and the winner card. Plain DOM, no 3D.

import { ITEM_INFO } from './game.js';

const $ = (id) => document.getElementById(id);

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const who = (racer) => `<b>${escapeHtml(racer.name)}</b>`;
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4]}`;

const HIT_TEXT = {
  pit404: (r) => `${who(r)} fell into a 404 pit — Not Found`,
  brokenLink: (r) => `${who(r)} tripped over a broken link`,
  mergeConflict: (r) => `${who(r)} hit a merge conflict… resolving`,
  redirectLoop: (r) => `${who(r)} is stuck in a redirect loop`,
  nullPointer: (r) => `${who(r)} is null — cannot read properties of null`,
  exception: (r) => `Unhandled exception threw ${who(r)}`,
  bug: (r, by) => `${who(by)} threw a bug 🐛 at ${who(r)}`,
  forcePush: (r, by) => `${who(by)} force-pushed 💥 over ${who(r)}`,
};

const ZONE_TEXT = {
  infiniteScroll: (r) => `${who(r)} is doom-scrolling the infinite scroll`,
  slowLoad: (r) => `${who(r)} is buffering in a slow load zone… 99%`,
};

const STUN_ICON = {
  pit404: '🕳️',
  brokenLink: '🔗',
  mergeConflict: '⚔️',
  redirectLoop: '🔁',
  nullPointer: '❓',
  exception: '💥',
  bug: '🐛',
  forcePush: '💥',
};

export class Hud {
  constructor() {
    this.root = $('hud');
    this.board = $('leaderboard');
    this.dots = $('progress-dots');
    this.feed = $('feed');
    this.count = $('countdown');
    this.results = $('results');
    this.rows = new Map();
    this.lastBoard = 0;
    this.lastOrder = 0;
    this.lastLine = 0;
    this.resultsTimer = null;
    window.addEventListener('resize', () => this.layout());
  }

  /** Sets up the display for a new race. `lineup` is [{ id, name, color, kind }]. */
  begin(lineup) {
    this.end();
    this.lineup = lineup;
    for (const entry of lineup) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="pos"></span><span class="swatch"></span><span class="kind"></span><span class="name"></span><span class="extra"></span>`;
      li.querySelector('.swatch').style.background = entry.color;
      li.querySelector('.kind').textContent = entry.kind.emoji;
      li.querySelector('.name').textContent = entry.name;
      li.title = `${entry.name} — ${entry.kind.label}`;
      this.board.append(li);

      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = entry.color;
      this.dots.append(dot);

      this.rows.set(entry.id, { li, dot, pos: li.querySelector('.pos'), extra: li.querySelector('.extra'), rank: -1, text: '', cls: '' });
    }
    this.layout();
    this.root.hidden = false;
  }

  layout() {
    if (!this.lineup) return;
    const n = this.lineup.length;
    this.rowHeight = Math.max(15, Math.min(26, Math.floor((window.innerHeight - 40) / n)));
    this.board.style.setProperty('--row', `${this.rowHeight}px`);
    this.board.style.height = `${n * this.rowHeight}px`;
    for (const row of this.rows.values()) row.rank = -1;
  }

  countdown(text) {
    clearTimeout(this.countdownTimer);
    this.count.textContent = text;
    this.count.className = '';
    void this.count.offsetWidth; // restart the CSS animation
    this.count.className = text === 'GO' ? 'pop go' : 'pop';
    // Remove expired text instead of leaving transparent text over the track.
    this.countdownTimer = setTimeout(() => {
      this.count.textContent = '';
      this.count.className = '';
    }, 900);
  }

  /** Called every frame with the simulation; updates standings and progress. */
  frame(sim) {
    const now = performance.now();
    if (now - this.lastBoard < 100) return;
    this.lastBoard = now;
    // Re-sort the board a few times a second; any faster and a big field is unreadable.
    const reorder = now - this.lastOrder > 600 || sim.done;
    if (reorder) this.lastOrder = now;
    const order = sim.standings();
    for (let i = 0; i < order.length; i++) {
      const r = order[i];
      const row = this.rows.get(r.id);
      if (row.rank !== i && (reorder || row.rank === -1)) {
        row.rank = i;
        row.li.style.transform = `translateY(${i * this.rowHeight}px)`;
        row.pos.textContent = i + 1;
      }
      let extra = '';
      if (r.finished) extra = r.dnf ? '' : '🏁';
      else if (r.stun) extra = STUN_ICON[r.stun.cause] || '💫';
      else if (r.item) extra = ITEM_INFO[r.item].emoji;
      else if (r.shield > 0) extra = '🛡️';
      else if (r.boostT > 0) extra = '🔥';
      if (extra !== row.text) {
        row.text = extra;
        row.extra.textContent = extra;
      }
      const cls = `${row.rank === 0 ? 'first ' : ''}${r.stun ? 'stunned ' : ''}${r.finished ? 'done' : ''}`;
      if (cls !== row.cls) {
        row.cls = cls;
        row.li.className = cls;
      }
      const pct = Math.max(0, Math.min(1, r.s / sim.length)) * 100;
      row.dot.style.left = `${pct}%`;
      row.dot.classList.toggle('lead', i === 0);
    }
  }

  /** Turns a simulation event into a feed line (if it is worth mentioning). */
  event(e) {
    switch (e.type) {
      case 'hit':
        this.line(HIT_TEXT[e.cause]?.(e.racer, e.by));
        break;
      case 'zone':
        this.line(ZONE_TEXT[e.obstacle.type]?.(e.racer));
        break;
      case 'block':
        this.line(`${who(e.racer)}'s firewall 🛡️ blocked ${e.cause === 'bug' || e.cause === 'forcePush' ? `${who(e.by)}'s attack` : 'the hit'}`);
        break;
      case 'lead':
        this.line(`${who(e.racer)} takes the lead!`, true);
        break;
      case 'finish':
        if (e.place === 1) this.line(`🏁 ${who(e.racer)} wins!`, true);
        else if (e.place <= 3) this.podium(e.place, e.racer.name);
        break;
    }
  }

  line(html, big = false) {
    if (!html) return;
    const now = performance.now();
    // With a big field, don't let routine mishaps flood the feed.
    if (!big && now - this.lastLine < 350) return;
    if (!big) this.lastLine = now;
    const el = document.createElement('div');
    el.className = big ? 'line big' : 'line';
    el.innerHTML = html;
    this.feed.append(el);
    while (this.feed.children.length > 5) this.feed.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 3600);
    setTimeout(() => el.remove(), 4200);
  }

  /** Shows the winner card (after a short pause so the finish can be seen). */
  showWinner(name, kind, time, delay = 1900, detail = '') {
    $('winner-name').textContent = name;
    $('winner-kind').textContent = kind ? `raced as ${kind.emoji} ${kind.label}${time ? ` · ${time.toFixed(1)}s elapsed` : ''}` : detail;
    $('podium').replaceChildren();
    clearTimeout(this.resultsTimer);
    this.resultsTimer = setTimeout(() => {
      this.results.hidden = false;
      this.root.classList.add('results-open');
      this.feed.replaceChildren();
      $('back').focus({ preventScroll: true });
    }, delay);
  }

  podium(place, name) {
    const li = document.createElement('li');
    li.innerHTML = `${place === 2 ? '🥈' : '🥉'} ${ordinal(place)}: <b>${escapeHtml(name)}</b>`;
    $('podium').append(li);
  }

  saveStatus(text, state = '') {
    const el = $('save-status');
    el.textContent = text;
    el.className = `save-status ${state}`;
    $('retry-save').hidden = state !== 'error';
  }

  /** Hides and resets everything. */
  end() {
    clearTimeout(this.countdownTimer);
    clearTimeout(this.resultsTimer);
    this.root.hidden = true;
    this.root.classList.remove('results-open');
    this.results.hidden = true;
    this.board.replaceChildren();
    this.dots.replaceChildren();
    this.feed.replaceChildren();
    this.count.textContent = '';
    this.count.className = '';
    this.saveStatus('');
    $('winner-name').textContent = 'Race results';
    this.rows.clear();
    this.lineup = null;
  }
}
