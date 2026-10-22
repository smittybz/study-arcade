/* Sudoku: fill the grid so each row, column and box has 1 to 9. */
Arcade.register({
  id: 'sudoku',
  name: 'Sudoku',
  kind: 'classic',
  lowerIsBetter: true,
  fmt: UI.fmtTime,
  blurb: 'Fill every row, column and box with the numbers 1 to 9.',
  controls: 'Click a square, then a number (or type 1–9) · Backspace erases · Arrow keys move',

  thumb(g, W, H, C, rr) {
    const s = 19, n = 9, x0 = (W - n * s) / 2, y0 = (H - n * s) / 2;
    g.fillStyle = '#FFFFFF';
    g.fillRect(x0, y0, n * s, n * s);
    const nums = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif';
    for (let i = 0; i < 81; i++) {
      const ch = nums[i];
      if (ch === '.') continue;
      g.fillStyle = '#1A2030';
      g.fillText(ch, x0 + (i % 9) * s + s / 2, y0 + Math.floor(i / 9) * s + s / 2 + 1);
    }
    g.fillStyle = '#C3D5EF';
    g.fillRect(x0 + 4 * s, y0 + 4 * s, s, s);
    for (let i = 0; i <= n; i++) {
      g.fillStyle = i % 3 === 0 ? '#1A2030' : '#B9C2D3';
      const t = i % 3 === 0 ? 2 : 1;
      g.fillRect(x0 + i * s - t / 2, y0, t, n * s);
      g.fillRect(x0, y0 + i * s - t / 2, n * s, t);
    }
  },

  mount(stage, api) {
    const { h, shuffle } = UI;
    const LEVELS = { easy: { holes: 38, label: 'Easy' }, medium: { holes: 47, label: 'Medium' }, hard: { holes: 53, label: 'Hard' } };
    let level = LEVELS[Store.pref('sudoku.level')] ? Store.pref('sudoku.level') : 'easy';
    api.setVariant(level);

    // --- puzzle generation ---
    const rowOf = (i) => Math.floor(i / 9), colOf = (i) => i % 9;
    const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
    const PEERS = Array.from({ length: 81 }, (_, i) => {
      const s = new Set();
      for (let j = 0; j < 81; j++) if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) s.add(j);
      return [...s];
    });
    const ok = (g, i, v) => PEERS[i].every((j) => g[j] !== v);
    function fill(g) {
      const i = g.indexOf(0);
      if (i < 0) return true;
      for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        if (ok(g, i, v)) { g[i] = v; if (fill(g)) return true; g[i] = 0; }
      }
      return false;
    }
    function count(g, limit) {
      // count solutions, stopping at `limit`; picks the square with fewest options first
      let best = -1, opts = null;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const o = [];
        for (let v = 1; v <= 9; v++) if (ok(g, i, v)) o.push(v);
        if (!o.length) return 0;
        if (!opts || o.length < opts.length) { best = i; opts = o; if (o.length === 1) break; }
      }
      if (best < 0) return 1;
      let n = 0;
      for (const v of opts) {
        g[best] = v;
        n += count(g, limit - n);
        g[best] = 0;
        if (n >= limit) break;
      }
      return n;
    }
    const solution = Array(81).fill(0);
    fill(solution);
    const puzzle = solution.slice();
    let removed = 0;
    for (const i of shuffle([...Array(81).keys()])) {
      if (removed >= LEVELS[level].holes) break;
      const keep = puzzle[i];
      puzzle[i] = 0;
      if (count(puzzle.slice(), 2) !== 1) puzzle[i] = keep;
      else removed++;
    }

    // --- board ---
    const given = puzzle.map(Boolean);
    const vals = puzzle.slice();
    let sel = given.indexOf(false), mistakes = 0, done = false, t0 = performance.now();

    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' });
    for (const [k, v] of Object.entries(LEVELS)) {
      const b = h('button', { type: 'button', 'aria-pressed': String(k === level) }, v.label);
      b.addEventListener('click', () => { if (k !== level) { Store.pref('sudoku.level', k); api.restart(); } });
      seg.append(b);
    }
    const grid = h('div', { class: 'sudoku', role: 'grid', 'aria-label': 'Sudoku grid' });
    const cells = vals.map((v, i) => {
      const el = h('button', { type: 'button', class: 'sd' + (given[i] ? ' given' : ''), 'data-r': rowOf(i), 'data-c': colOf(i) }, v || '');
      el.addEventListener('click', () => select(i));
      grid.append(el);
      return el;
    });
    const pad = h('div', { class: 'sd-pad' });
    for (let n = 1; n <= 9; n++) {
      const b = h('button', { type: 'button', class: 'btn' }, String(n));
      b.addEventListener('click', () => put(n));
      pad.append(b);
    }
    const erase = h('button', { type: 'button', class: 'btn ghost' }, 'Erase');
    erase.addEventListener('click', () => put(0));
    pad.append(erase);
    stage.append(h('div', { class: 'gbar' }, seg), grid, pad);

    api.stat('Time', '0.0s');
    api.stat('Mistakes', 0);
    const timer = api.interval(() => api.stat('Time', UI.fmtTime((performance.now() - t0) / 1000)), 250);

    function paint() {
      const sv = vals[sel];
      cells.forEach((el, i) => {
        el.textContent = vals[i] || '';
        el.classList.toggle('sel', i === sel);
        el.classList.toggle('peer', sel >= 0 && i !== sel && PEERS[sel].includes(i));
        el.classList.toggle('same', !!sv && vals[i] === sv && i !== sel);
        el.classList.toggle('bad', !given[i] && !!vals[i] && vals[i] !== solution[i]);
      });
    }
    function select(i) { if (done) return; sel = i; paint(); }
    function put(n) {
      if (done || sel < 0 || given[sel]) return;
      if (n && n !== solution[sel] && vals[sel] !== n) { mistakes++; api.stat('Mistakes', mistakes); }
      vals[sel] = n;
      paint();
      if (vals.every((v, i) => v === solution[i])) win();
    }
    function win() {
      done = true;
      api.clearInterval(timer);
      const time = Math.round(((performance.now() - t0) / 1000) * 10) / 10;
      api.stat('Time', UI.fmtTime(time));
      const best = api.submit(time);
      api.overlay({
        title: best ? 'New best time' : 'Solved',
        text: LEVELS[level].label + ' puzzle in ' + UI.fmtTime(time) + (mistakes ? ' with ' + mistakes + (mistakes === 1 ? ' mistake.' : ' mistakes.') : ' with no mistakes.'),
        actions: [{ label: 'New puzzle', primary: true, fn: api.restart }],
      });
    }

    api.key((e) => {
      if (done) return false;
      const n = Number(e.key);
      if (n >= 1 && n <= 9) { put(n); return true; }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { put(0); return true; }
      const mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (mv) {
        let next = sel + mv;
        if (mv === -1 && colOf(sel) === 0) next = sel + 8;
        if (mv === 1 && colOf(sel) === 8) next = sel - 8;
        if (next >= 0 && next < 81) select(next);
        return true;
      }
      return false;
    });
    paint();
  },
});
