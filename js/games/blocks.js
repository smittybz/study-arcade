/* Blocks: a falling-block line clearer. */
Arcade.register({
  id: 'blocks',
  name: 'Blocks',
  kind: 'classic',
  blurb: 'Rotate falling pieces and fill whole rows to clear them.',
  controls: '← → move · ↑ or X rotate · ↓ soft drop · Space hard drop · P pause',

  thumb(g, W, H, C, rr) {
    const s = 18, cols = 10, x0 = (W - cols * s) / 2;
    const rows = ['..........', '..........', '....TTT...', '.....T....', '..........', '..........', 'J.......OO', 'JJJ.SS..OO', 'LIIIISSZZL', 'LLZZIIIIZL'];
    const col = { I: C.cyan, O: C.yellow, T: C.violet, S: C.green, Z: C.pink, J: C.blue, L: C.orange };
    g.fillStyle = C.panel;
    g.fillRect(x0, 10, cols * s, rows.length * s);
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      g.fillStyle = col[ch];
      rr(g, x0 + c * s + 1, 10 + r * s + 1, s - 2, s - 2, 3); g.fill();
    }));
  },

  mount(stage, api) {
    const { h } = UI;
    const COLS = 10, ROWS = 20, S = 30;
    const C = api.colors, rr = api.roundRect;
    const board = api.canvas(COLS * S, ROWS * S, { label: 'Blocks board' });
    const nextCv = api.canvas(4 * 21, 4 * 21);
    const wrap = h('div', { class: 'blocks' }, board.cv, h('div', { class: 'blocks-side' }, h('span', { class: 'eyebrow' }, 'Next'), nextCv.cv));
    stage.append(wrap);

    const SHAPES = {
      I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      O: [[1, 1], [1, 1]],
      T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
      Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
      J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
      L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    };
    const COLOR = { I: C.cyan, O: C.yellow, T: C.violet, S: C.green, Z: C.pink, J: C.blue, L: C.orange };

    const field = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let bag = [], piece = null, next = null;
    let score = 0, lines = 0, level = 1, fall = 0, running = false, paused = false, dead = false;

    function fromBag() {
      if (!bag.length) bag = UI.shuffle(Object.keys(SHAPES));
      return bag.pop();
    }
    function make(type) {
      const m = SHAPES[type].map((r) => r.slice());
      return { type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 };
    }
    function fits(m, x, y) {
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const fx = x + c, fy = y + r;
        if (fx < 0 || fx >= COLS || fy >= ROWS) return false;
        if (fy >= 0 && field[fy][fx]) return false;
      }
      return true;
    }
    function rotate(m, dir) {
      const n = m.length;
      const out = Array.from({ length: n }, () => Array(n).fill(0));
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (dir > 0) out[c][n - 1 - r] = m[r][c];
        else out[n - 1 - c][r] = m[r][c];
      }
      return out;
    }

    function spawn() {
      piece = make(next || fromBag());
      next = fromBag();
      drawNext();
      if (!fits(piece.m, piece.x, piece.y)) over();
    }

    function speed() { return Math.max(0.06, 0.8 - (level - 1) * 0.07); }

    function lock() {
      const { m, x, y, type } = piece;
      let above = false;
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        if (y + r < 0) { above = true; continue; }
        field[y + r][x + c] = type;
      }
      if (above) return over();
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (field[r].every(Boolean)) {
          field.splice(r, 1);
          field.unshift(Array(COLS).fill(null));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        score += [0, 100, 300, 500, 800][cleared] * level;
        lines += cleared;
        level = 1 + Math.floor(lines / 10);
        api.stat('Lines', lines);
        api.stat('Level', level);
      }
      api.stat('Score', score);
      spawn();
    }

    function tryMove(dx, dy) {
      if (!piece || dead || paused || !running) return false;
      if (fits(piece.m, piece.x + dx, piece.y + dy)) { piece.x += dx; piece.y += dy; return true; }
      return false;
    }
    function turn(dir) {
      if (!piece || dead || paused || !running) return;
      const m = rotate(piece.m, dir);
      for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]) {
        if (fits(m, piece.x + kx, piece.y + ky)) { piece.m = m; piece.x += kx; piece.y += ky; return; }
      }
    }
    function soft() { if (tryMove(0, 1)) { score += 1; api.stat('Score', score); fall = 0; } else if (running && !paused && !dead) lock(); }
    function hard() {
      if (!piece || dead || paused || !running) return;
      let n = 0;
      while (fits(piece.m, piece.x, piece.y + 1)) { piece.y++; n++; }
      score += n * 2;
      lock();
    }

    function start() { if (running || dead) return; running = true; api.hideOverlay(); }
    function togglePause() {
      if (!running || dead) return;
      paused = !paused;
      if (paused) api.overlay({ title: 'Paused', actions: [{ label: 'Resume', primary: true, fn: togglePause }] });
      else api.hideOverlay();
    }

    function over() {
      dead = true;
      piece = null;
      const best = api.submit(score);
      api.overlay({
        title: 'Stacked out',
        text: score + ' points · ' + lines + (lines === 1 ? ' line' : ' lines') + ' · level ' + level,
        sub: best && score > 0 ? 'That’s a new best.' : null,
        actions: [{ label: 'Play again', primary: true, fn: api.restart }],
      });
    }

    api.key((e) => {
      const k = e.key;
      if (!running && !dead && ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(k)) { start(); return true; }
      if (k === 'ArrowLeft') { tryMove(-1, 0); return true; }
      if (k === 'ArrowRight') { tryMove(1, 0); return true; }
      if (k === 'ArrowDown') { soft(); return true; }
      if (k === 'ArrowUp' || k === 'x' || k === 'X') { turn(1); return true; }
      if (k === 'z' || k === 'Z') { turn(-1); return true; }
      if (k === ' ') { hard(); return true; }
      if (k === 'p' || k === 'P') { togglePause(); return true; }
      return false;
    });
    api.swipe(board.cv, (d) => {
      if (!running) return start();
      if (d === 'tap') turn(1);
      else if (d === 'left') tryMove(-1, 0);
      else if (d === 'right') tryMove(1, 0);
      else if (d === 'down') hard();
    });
    const go = (fn) => () => { if (!running) start(); fn(); };
    api.pad([
      { label: '◀', aria: 'Move left', hold: true, fn: go(() => tryMove(-1, 0)) },
      { label: '⟳', aria: 'Rotate', fn: go(() => turn(1)) },
      { label: '▶', aria: 'Move right', hold: true, fn: go(() => tryMove(1, 0)) },
      { label: '▼', aria: 'Soft drop', hold: true, fn: go(soft) },
      { label: '⤓', aria: 'Hard drop', fn: go(hard) },
    ]);

    function cell(g, x, y, s, color, ghost) {
      if (ghost) {
        g.strokeStyle = color;
        g.globalAlpha = 0.45;
        g.lineWidth = 2;
        rr(g, x + 2, y + 2, s - 4, s - 4, 4);
        g.stroke();
        g.globalAlpha = 1;
        return;
      }
      g.fillStyle = color;
      rr(g, x + 1, y + 1, s - 2, s - 2, 4);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.fillRect(x + 4, y + 4, s - 8, 3);
    }

    function drawNext() {
      const g = nextCv.g, s = 21;
      g.fillStyle = C.bg;
      g.fillRect(0, 0, 84, 84);
      if (!next) return;
      const m = SHAPES[next];
      const rows = m.filter((r) => r.some(Boolean));
      const w = m[0].length * s, hgt = rows.length * s;
      const ox = (84 - w) / 2, oy = (84 - hgt) / 2;
      rows.forEach((r, ri) => r.forEach((v, ci) => { if (v) cell(g, ox + ci * s, oy + ri * s, s, COLOR[next]); }));
    }

    function draw() {
      const g = board.g;
      g.fillStyle = C.bg;
      g.fillRect(0, 0, COLS * S, ROWS * S);
      g.strokeStyle = C.panel;
      g.lineWidth = 1;
      for (let c = 1; c < COLS; c++) { g.beginPath(); g.moveTo(c * S + .5, 0); g.lineTo(c * S + .5, ROWS * S); g.stroke(); }
      for (let r = 1; r < ROWS; r++) { g.beginPath(); g.moveTo(0, r * S + .5); g.lineTo(COLS * S, r * S + .5); g.stroke(); }
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (field[r][c]) cell(g, c * S, r * S, S, COLOR[field[r][c]]);
      if (piece) {
        let gy = piece.y;
        while (fits(piece.m, piece.x, gy + 1)) gy++;
        const { m, x, y, type } = piece;
        for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
          if (!m[r][c]) continue;
          if (gy + r >= 0 && gy !== y) cell(g, (x + c) * S, (gy + r) * S, S, COLOR[type], true);
          if (y + r >= 0) cell(g, (x + c) * S, (y + r) * S, S, COLOR[type]);
        }
      }
    }

    api.loop((dt) => {
      if (running && !paused && !dead && piece) {
        fall += dt;
        if (fall >= speed()) {
          fall = 0;
          if (!tryMove(0, 1)) lock();
        }
      }
      draw();
    });

    api.stat('Score', 0);
    api.stat('Lines', 0);
    api.stat('Level', 1);
    spawn();
    api.overlay({
      title: 'Blocks',
      text: 'Fill a whole row to clear it. Clearing four at once scores the most.',
      actions: [{ label: 'Start', primary: true, fn: start }],
    });
  },
});
