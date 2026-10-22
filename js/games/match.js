/* Match Up: every term and definition is face up. Pair them against the clock. */
Arcade.register({
  id: 'match',
  name: 'Match Up',
  kind: 'study',
  lowerIsBetter: true,
  fmt: UI.fmtTime,
  blurb: 'Pair each term with its definition as fast as you can.',
  controls: 'Click a term, then its definition. A wrong pair adds 1 second to your time.',

  thumb(g, W, H, C, rr) {
    const cols = 4, rows = 2, pad = 18, gap = 12;
    const cw = (W - pad * 2 - gap * (cols - 1)) / cols, ch = (H - pad * 2 - gap * (rows - 1)) / rows;
    const tint = [null, C.blue, null, null, null, null, C.blue, null];
    for (let i = 0; i < cols * rows; i++) {
      const x = pad + (i % cols) * (cw + gap), y = pad + Math.floor(i / cols) * (ch + gap);
      if (i === 2 || i === 5) continue; // a matched pair has already vanished
      g.fillStyle = tint[i] ? '#E3E9FF' : '#FFFFFF';
      rr(g, x, y, cw, ch, 8); g.fill();
      if (tint[i]) { g.strokeStyle = tint[i]; g.lineWidth = 3; g.stroke(); }
      g.fillStyle = '#9AA6C4';
      g.fillRect(x + 12, y + ch / 2 - 8, cw - 24, 5);
      g.fillRect(x + 12, y + ch / 2 + 4, (cw - 24) * 0.6, 5);
    }
  },

  mount(stage, api) {
    const { h, shuffle, fmtTime } = UI;
    const pairs = shuffle(api.deck).slice(0, 6);
    const tiles = shuffle(pairs.flatMap((c) => [{ c, side: 'term', text: c.term }, { c, side: 'def', text: c.def }]));
    const grid = h('div', { class: 'match-grid' });
    let sel = null, left = pairs.length, penalty = 0, t0 = 0, running = false, timer = null;

    const now = () => (performance.now() - t0) / 1000 + penalty;
    api.stat('Time', '0.0s');
    api.stat('Pairs left', left);

    for (const t of tiles) {
      t.el = h('button', { class: 'match-tile ' + t.side, type: 'button' }, t.text);
      t.el.addEventListener('click', () => pick(t));
      grid.append(t.el);
    }
    stage.append(grid);

    function isPair(a, b) {
      const term = a.side === 'term' ? a : b;
      const def = a.side === 'term' ? b : a;
      return term.c === def.c || term.c.def.trim().toLowerCase() === def.text.trim().toLowerCase();
    }

    function pick(t) {
      if (!running || t.done) return;
      if (!sel) { sel = t; t.el.classList.add('sel'); return; }
      if (sel === t) { t.el.classList.remove('sel'); sel = null; return; }
      if (sel.side === t.side) { sel.el.classList.remove('sel'); sel = t; t.el.classList.add('sel'); return; }
      const a = sel, b = t;
      sel = null;
      if (isPair(a, b)) {
        for (const x of [a, b]) { x.done = true; x.el.classList.remove('sel'); x.el.classList.add('done'); x.el.disabled = true; }
        left--;
        api.stat('Pairs left', left);
        if (!left) finish();
      } else {
        penalty += 1;
        for (const x of [a, b]) { x.el.classList.remove('sel', 'wrong'); void x.el.offsetWidth; x.el.classList.add('wrong'); }
        api.timeout(() => { a.el.classList.remove('wrong'); b.el.classList.remove('wrong'); }, 420);
      }
    }

    function begin() {
      api.hideOverlay();
      running = true;
      t0 = performance.now();
      timer = api.interval(() => api.stat('Time', fmtTime(now())), 100);
    }

    function finish() {
      running = false;
      api.clearInterval(timer);
      const time = Math.round(now() * 10) / 10;
      api.stat('Time', fmtTime(time));
      const best = api.submit(time);
      api.overlay({
        title: best ? 'New best time' : 'All matched',
        text: fmtTime(time) + ' for ' + pairs.length + ' pairs' + (penalty ? ', including ' + penalty + 's of penalties.' : ', no mistakes.'),
        actions: [
          { label: 'Play again', primary: true, fn: api.restart },
          { label: 'Change deck', fn: api.backToSetup },
        ],
      });
    }

    api.overlay({
      title: 'Match Up',
      text: pairs.length + ' pairs from “' + api.deckName + '”.',
      sub: 'The clock starts when you press Start.',
      actions: [{ label: 'Start', primary: true, fn: begin }],
    });
  },
});
