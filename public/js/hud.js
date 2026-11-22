// On-screen race display: countdown, live standings, progress strip,
// event feed and the winner card. Plain DOM, no 3D.

import { ITEM_INFO, statusIcon } from './game.js';

const $ = (id) => document.getElementById(id);

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
export const who = (racer) => `<b>${escapeHtml(racer.name)}</b>`;
/** Feed lines for a ring-out, in the thrower's style. */
const THROW_TEXT = {
  overhead: (h, v) => `${who(h)} (Bhima) lifted ${who(v)} overhead and tossed them out`,
  bruiser: (h, v) => `${who(h)} (Kichaka) muscled ${who(v)} over the top rope`,
  patient: (h, v) => `${who(h)} (Karna) turned ${who(v)}'s charge into a throw over the ropes`,
  composed: (h, v) => `${who(h)} (Shikhandi) caught ${who(v)} off balance and over the ropes`,
  illusion: (h, v) => `${who(h)} (Ghatotkacha) feinted with an illusion, then threw ${who(v)} out`,
  crowd: (h, v) => `${who(h)} (Dushasana) crowded ${who(v)} into the ropes and over`,
  rebound: (h, v) => `${who(h)} (Satyaki) came off the ropes and took ${who(v)} over the top`,
};

/**
 * The feed line for a ring-out event (wrestle.js `out`). It describes the move that was actually shown
 * (`e.move`): Satyaki only "came off the ropes" when the rope rebound played (#106).
 */
export function throwText(e) {
  const style = e.thrower.kind.style;
  if (style === 'rebound' && e.move !== 'rebound') return `${who(e.thrower)} (Satyaki) drove ${who(e.victim)} back over the top rope`;
  return THROW_TEXT[style]?.(e.thrower, e.victim) ?? `${who(e.thrower)} (${e.thrower.kind.label}) threw ${who(e.victim)} over the top rope`;
}


/**
 * Where a callout goes so all of it is on screen, none of it covers the wrestling roster or the toolbar,
 * and, wherever possible, none of it covers the landings it announces (#107). `blocks` are the controls
 * to keep clear (the roster with its count, the Mute and Quit buttons; only those shown) and `scene` the
 * thrown wrestlers' bodies on screen, all as screen rectangles; `callout` is the callout where it sits by
 * default, `view` the viewport size, and `measure(maxWidth, scale)` the callout's size when wrapped to
 * `maxWidth` with its font scaled by `scale`. Returns null to leave it where it is; otherwise its centre
 * `x`, top `y`, `maxWidth` and font `scale`. It goes in the room beside, below or above the controls and
 * bodies, weighing up a large font, a place high on the screen (over the crowd, not the ring) and a short
 * banner (two long names in a few wide lines, not broken up down a strip); smaller if that keeps the
 * landings in view, and over a landing only if there's no other way.
 */
export function calloutPlacement(blocks, callout, view, measure, { scene = [], gap = 10 } = {}) {
  const near = (r, b) => !(r.right + gap <= b.left || r.left >= b.right + gap || r.bottom + gap <= b.top || r.top >= b.bottom + gap);
  const onScreen = callout.left >= 0 && callout.top >= 0 && callout.right <= view.width && callout.bottom <= view.height;
  if (onScreen && ![...blocks, ...scene].some((b) => near(callout, b))) return null;
  const screen = { left: gap, right: view.width - gap, top: gap, bottom: view.height - gap };
  const middle = (callout.top + callout.bottom) / 2;
  const sizes = new Map();
  const sized = (maxWidth, scale) => {
    const key = `${maxWidth}:${scale}`;
    if (!sizes.has(key)) sizes.set(key, measure(maxWidth, scale));
    return sizes.get(key);
  };
  const fit = (a, scale, force = false) => {
    const maxWidth = Math.floor(a.right - a.left);
    if (maxWidth < 40 || a.bottom - a.top < 20) return null;
    const size = sized(maxWidth, scale);
    if (!force && (size.width > maxWidth + 0.5 || size.height > a.bottom - a.top + 0.5)) return null;
    const y = Math.max(a.top, Math.min(middle - size.height / 2, a.bottom - size.height));
    return { x: (a.left + a.right) / 2, y, maxWidth, scale, bottom: y + size.height };
  };
  // The room beside, below and above each thing to keep clear, and the whole screen; each then trimmed
  // clear of all of them, cutting each away from whichever side leaves the most room.
  const room = (a) => Math.max(0, a.right - a.left) * Math.max(0, a.bottom - a.top);
  const areas = (keep) => [
    ...keep.flatMap((b) => [
      { ...screen, left: b.right + gap }, { ...screen, right: b.left - gap },
      { ...screen, top: b.bottom + gap }, { ...screen, bottom: b.top - gap },
    ]),
    screen,
  ].map((area) => {
    const a = { ...area };
    for (const b of keep) {
      if (b.right + gap <= a.left || b.left >= a.right + gap || b.bottom + gap <= a.top || b.top >= a.bottom + gap) continue;
      const cuts = [
        { ...a, top: Math.max(a.top, b.bottom + gap) }, { ...a, bottom: Math.min(a.bottom, b.top - gap) },
        { ...a, left: Math.max(a.left, b.right + gap) }, { ...a, right: Math.min(a.right, b.left - gap) },
      ];
      Object.assign(a, cuts.reduce((x, y) => (room(y) > room(x) ? y : x)));
    }
    return a;
  });
  const scales = [];
  for (let scale = 1; scale >= 0.4 - 1e-9; scale *= 0.85) scales.push(scale);
  // Larger is better; so is higher up the screen and a shorter banner (fewer, wider lines).
  const score = (p) => p.scale - 0.5 * (p.y / view.height) - 0.6 * ((p.bottom - p.y) / view.height);
  const best = (keep, smallest) => {
    // Each area at the largest size that fits in it; then the best of those (the first, if level).
    const fits = areas(keep).map((a) => scales.filter((s) => s >= smallest - 1e-9).reduce((found, s) => found ?? fit(a, s), null)).filter(Boolean);
    return fits.reduce((top, p) => (top === null || score(p) > score(top) + 1e-6 ? p : top), null);
  };
  // Clear of the landings, down to 60% size; failing that, clear of the controls alone, down to 40%;
  // failing even that (a very long message), the roomiest place, at 40%.
  const found = (scene.length && best([...blocks, ...scene], 0.6)) || best(blocks, 0.4)
    || fit(areas(blocks).reduce((a, b) => (room(b) > room(a) ? b : a)), 0.4, true) || fit(screen, 0.4, true);
  const { bottom, ...place } = found;
  return place;
}
const OUT_MERGE_MS = 1300; // ring-outs landing this close together share one callout
/** "Roscoe is out!", "Roscoe and Ada are out!", "Roscoe, Ada and Lin are out!". */
export const outText = (names) => (names.length === 1
  ? `${names[0]} is out!`
  : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are out!`);
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
  sslExpired: (r) => `${who(r)} hit SSL Expired — your connection is not private`,
  urlBarricade: (r) => `${who(r)} hit DO NOT MODIFY URLS and dropped into the error pit`,
  columnTable: (r, by, e) => `${who(r)} clipped the 800-Column Table 📊${e?.lost ? ` and lost their ${escapeHtml(ITEM_INFO[e.lost]?.label ?? 'item')}` : ''}`,
  notClear: (r, by) => `${who(by)} told ${who(r)} “You Are Not Being Clear” 🌫️ — “It's your fault.”`,
  bigTable: (r, by) => `${who(by)} threw a 200GB Table 📊 and flattened ${who(r)} — “You're wasting disk space.”`,
};

const STATUS_TEXT = {
  audit: (r, by) => `${who(by)} opened an Eight-Minute Audit 📋 on ${who(r)} — “Access limited pending audit.”`,
  roulette: (r, by) => `${who(by)} spun Production Roulette 🎰 on ${who(r)} — “Oops. That was pr0dI.”`,
  theater: (r, by, mph) => `Security Theater 🎭: ${who(by)} locked ${who(r)} to ${mph} mph — “Vahi says you're going too fast.”`,
};

const PASS_TEXT = {
  renewedCert: (r) => `${who(r)}'s renewed certificate 🔐 sailed through SSL Expired`,
  returnUrl: (r) => `${who(r)} used ?returnUrl= ↩️ to pass DO NOT MODIFY URLS`,
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
  sslExpired: '🔓',
  urlBarricade: '🚧',
  columnTable: '📊',
  notClear: '🌫️',
  bigTable: '📊',
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
    // A resize (or a phone turning) re-fits the board and moves any callout on screen into the new space.
    window.addEventListener('resize', () => {
      this.layout();
      this.placeToggle();
      this.placeCallout();
    });
    // Quit appears (and its label changes) after the roster is set up: move its button out of the way then.
    const toolbar = $('toolbar');
    if (toolbar && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => {
        this.placeToggle();
        this.placeCallout();
      }).observe(toolbar);
    }
    // On narrow or short screens the wrestling roster folds into a count that opens it (#107).
    this.ringToggle = $('ring-toggle');
    this.ringToggle?.addEventListener('click', () => {
      const open = !this.root.classList.contains('roster-open');
      this.root.classList.toggle('roster-open', open);
      this.ringToggle.setAttribute('aria-expanded', String(open));
      this.placeCallout();
    });
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
      else if (statusIcon(r)) extra = statusIcon(r);
      else if (r.item) extra = ITEM_INFO[r.item].emoji;
      else if (r.shield > 0) extra = '🛡️';
      else if (r.returnUrl) extra = ITEM_INFO.returnUrl.emoji;
      else if (r.certT > 0) extra = ITEM_INFO.renewedCert.emoji;
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

  /** Sets up the display for a wrestling match: who is in the ring, as which character. */
  beginWrestle(lineup) {
    this.end();
    this.root.classList.add('wrestling');
    const roster = $('ring-roster');
    roster.replaceChildren();
    for (const entry of lineup) {
      const li = document.createElement('li');
      li.dataset.id = entry.id;
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = entry.color;
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = entry.name;
      const as = document.createElement('span');
      as.className = 'as';
      as.textContent = `as ${entry.kind.label}`;
      li.append(swatch, who, as);
      li.title = `${entry.name} wrestles as ${entry.kind.label}: ${entry.kind.blurb}`;
      roster.append(li);
    }
    this.root.classList.remove('roster-open');
    this.ringToggle?.setAttribute('aria-expanded', 'false');
    this.countInRing();
    this.root.hidden = false;
  }

  /** The folded roster's label: how many are still in the ring. */
  countInRing() {
    const rows = $('ring-roster').children;
    const out = [...rows].filter((li) => li.classList.contains('out')).length;
    if (this.ringToggle) this.ringToggle.textContent = `🤼 ${rows.length - out} of ${rows.length} in the ring`;
    this.placeToggle();
  }

  /**
   * On a phone too narrow for the folded roster's button beside Mute and Quit (320 px wide, say), moves
   * it, and the list it opens, below them (#107), through `--ring-top`.
   */
  placeToggle() {
    const toggle = this.ringToggle;
    if (!toggle) return;
    this.root.style.removeProperty('--ring-top');
    if (!toggle.offsetWidth) return;
    const r = toggle.getBoundingClientRect();
    const gap = 8;
    const under = [...document.querySelectorAll('#toolbar button')].filter((b) => b.offsetWidth > 0)
      .map((b) => b.getBoundingClientRect())
      .filter((b) => !(r.right + gap <= b.left || r.left >= b.right + gap || r.bottom <= b.top || r.top >= b.bottom));
    if (under.length) this.root.style.setProperty('--ring-top', `${Math.ceil(Math.max(...under.map((b) => b.bottom))) + gap}px`);
  }

  /**
   * Keeps a ring-out callout wholly on screen, off the roster and the toolbar, and off the landings it
   * announces (#107; `sceneBlocks()`, set by the match, says where those are): placed again whenever the
   * message, the screen size or the roster changes, or the camera brings a landing under it.
   */
  placeCallout() {
    const style = this.count.style;
    const vars = ['--callout-x', '--callout-y', '--callout-shift', '--callout-max', '--callout-scale'];
    for (const name of vars) style.removeProperty(name);
    if (!this.root.classList.contains('wrestling') || !this.count.classList.contains('callout')) return;
    const shown = (els) => els.filter((el) => el && el.offsetHeight > 0 && getComputedStyle(el).display !== 'none' && !el.closest('[hidden]'));
    // The roster with its count above it, as one block; and the Mute and Quit buttons.
    const rosterParts = shown([$('ring-roster'), this.ringToggle]).map((el) => el.getBoundingClientRect());
    const blocks = shown([...document.querySelectorAll('#toolbar button')]).map((el) => el.getBoundingClientRect());
    if (rosterParts.length) {
      blocks.push({
        left: Math.min(...rosterParts.map((r) => r.left)), top: Math.min(...rosterParts.map((r) => r.top)),
        right: Math.max(...rosterParts.map((r) => r.right)), bottom: Math.max(...rosterParts.map((r) => r.bottom)),
      });
    }
    const measure = (maxWidth, scale) => {
      style.setProperty('--callout-max', `${maxWidth}px`);
      style.setProperty('--callout-scale', String(scale));
      return { width: this.count.offsetWidth, height: this.count.offsetHeight };
    };
    const view = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
    const scene = this.landings(view, 1);
    const place = calloutPlacement(blocks, this.count.getBoundingClientRect(), view, measure, { scene });
    style.removeProperty('--callout-max');
    style.removeProperty('--callout-scale');
    if (!place) return;
    style.setProperty('--callout-x', `${place.x}px`);
    style.setProperty('--callout-y', `${place.y}px`);
    style.setProperty('--callout-shift', '0px');
    style.setProperty('--callout-max', `${place.maxWidth}px`);
    style.setProperty('--callout-scale', String(place.scale));
  }

  /** Crosses a wrestler off the list once they are thrown out. */
  wrestleOut(id) {
    $('ring-roster').querySelector(`li[data-id="${id}"]`)?.classList.add('out');
    this.countInRing();
    this.placeCallout(); // the folded count's label can change width
  }

  /** A short message across the middle of the screen, e.g. "Roscoe is out!". */
  callout(text, ms = 1600) {
    clearTimeout(this.countdownTimer);
    clearInterval(this.calloutWatch);
    this.count.textContent = text;
    this.count.className = '';
    void this.count.offsetWidth;
    this.count.className = 'callout';
    this.placeCallout();
    // The camera keeps moving while it's up: if a landing comes under it, move it again.
    if (this.sceneBlocks) this.calloutWatch = setInterval(() => this.recheckCallout(), 200);
    this.countdownTimer = setTimeout(() => {
      clearInterval(this.calloutWatch);
      this.count.textContent = '';
      this.count.className = '';
    }, ms);
  }

  /**
   * Where the landings a callout announces are on screen, each with room round it (`share` of the full
   * margin): the body slides, bounces and sits up, and the camera keeps moving.
   */
  landings(view, share) {
    const pad = share * (12 + 0.02 * Math.min(view.width, view.height));
    return (this.sceneBlocks?.(view.width, view.height) ?? []).map((r) => ({
      left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad,
    }));
  }

  /**
   * Moves the callout again if a landing it announces has come close to it, within half the room it
   * was given (but not otherwise: no jitter).
   */
  recheckCallout() {
    if (!this.count.classList.contains('callout')) return;
    const c = this.count.getBoundingClientRect();
    const view = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
    if (this.landings(view, 0.5).some((r) => !(c.right <= r.left || c.left >= r.right || c.bottom <= r.top || c.top >= r.bottom))) {
      this.placeCallout();
    }
  }

  /**
   * "Roscoe is out!". When two ring-outs land moments apart (#96), the second joins the first instead of
   * replacing it: "Roscoe and Ada are out!".
   */
  outCallout(name, now = performance.now()) {
    const recent = this.outNames && now - this.outAt < OUT_MERGE_MS;
    this.outNames = recent ? [...this.outNames, name] : [name];
    this.outAt = now;
    this.callout(outText(this.outNames), 1600 + (this.outNames.length - 1) * 500);
  }

  /** Adds a line to the event feed from outside the race (e.g. the wrestling match). */
  note(html, big = false) {
    this.line(html, big);
  }

  /** Turns a simulation event into a feed line (if it is worth mentioning). */
  event(e) {
    switch (e.type) {
      case 'hit':
        this.line(HIT_TEXT[e.cause]?.(e.racer, e.by, e));
        break;
      case 'zone':
        this.line(ZONE_TEXT[e.obstacle.type]?.(e.racer));
        break;
      case 'block':
        this.line(`${who(e.racer)}'s firewall 🛡️ blocked ${e.by ? `${who(e.by)}'s ${ITEM_INFO[e.cause]?.label ?? 'attack'}` : 'the hit'}`);
        break;
      case 'bulkLoad':
        this.line(`${who(e.racer)} set off BULK LOAD IN PROGRESS 📊 — the 800-Column Table is spreading across the track`);
        break;
      case 'truncate':
        // Highlighted, so the feed's flood control never drops the news that the track is open again.
        this.line('TRUNCATE TABLE ✂️ — the 800-Column Table is gone and the track is open again', true);
        break;
      case 'status':
        this.line(STATUS_TEXT[e.effect]?.(e.racer, e.by, e.mph));
        break;
      case 'pass':
        this.line(PASS_TEXT[e.item]?.(e.racer));
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
  showWinner(name, kind, time, delay = 1900, detail = '', { kicker = 'Leading the team meeting', onShown = null } = {}) {
    $('winner-name').textContent = name;
    document.querySelector('.results-kicker').textContent = kicker;
    $('winner-kind').textContent = kind ? `raced as ${kind.emoji} ${kind.label}${time ? ` · ${time.toFixed(1)}s elapsed` : ''}` : detail;
    $('podium').replaceChildren();
    clearTimeout(this.resultsTimer);
    this.resultsTimer = setTimeout(() => {
      this.results.hidden = false;
      this.root.classList.add('results-open');
      this.feed.replaceChildren();
      $('back').focus({ preventScroll: true });
      onShown?.();
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
    clearInterval(this.calloutWatch);
    this.sceneBlocks = null;
    clearTimeout(this.resultsTimer);
    this.root.hidden = true;
    this.root.classList.remove('results-open', 'wrestling', 'roster-open');
    $('ring-roster').replaceChildren();
    for (const id of ['plinko-ticker', 'freeze-banner', 'jenga-banner', 'cannon-banner', 'golf-banner', 'rto-banner', 'tumba-banner', 'karang-banner']) {
      const el = $(id);
      if (el) el.hidden = true;
    }
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
