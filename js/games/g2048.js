/* 2048, remade from scratch after Gabriele Cirulli's open-source original (MIT). */
Arcade.register({
  id: '2048',
  name: '2048',
  kind: 'classic',
  blurb: 'Slide the tiles, merge matching numbers, and build a 2048 tile.',
  controls: 'Arrow keys or WASD to slide · Swipe on touch screens',

  thumb(g, W, H, C, rr) {
    const vals = [[2, 0, 4, 0], [0, 8, 16, 0], [4, 32, 64, 2], [128, 256, 512, 2048]];
    const col = { 0: C.panel, 2: '#2A3560', 4: '#36437A', 8: C.cyan, 16: C.blue, 32: C.violet, 64: C.pink, 128: C.orange, 256: '#FFC24C', 512: C.yellow, 2048: '#FFFFFF' };
    const size = 40, gap = 6, bw = 4 * size + 3 * gap, x0 = (W - bw) / 2, y0 = (H - bw) / 2;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    vals.forEach((row, r) => row.forEach((v, c) => {
      const x = x0 + c * (size + gap), y = y0 + r * (size + gap);
      g.fillStyle = col[v];
      rr(g, x, y, size, size, 6); g.fill();
      if (v) {
        g.fillStyle = v <= 4 ? C.ink : '#0F1528';
        g.font = (v >= 1000 ? 11 : v >= 100 ? 13 : 16) + 'px Bungee, Impact, sans-serif';
        g.fillText(String(v), x + size / 2, y + size / 2 + 1);
      }
    }));
  },

  mount(stage, api) {
    const { h } = UI;
    const N = 4;
    const board = h('div', { class: 'g2048', role: 'grid', 'aria-label': '2048 board' });
    for (let i = 0; i < N * N; i++) board.append(h('div', { class: 'cell' }));
    stage.append(board);

    let grid = Array.from({ length: N }, () => Array(N).fill(null));
    let score = 0, won = false, over = false, busy = false;
    api.stat('Score', 0);

    function place(t) { t.el.style.setProperty('--r', t.r); t.el.style.setProperty('--c', t.c); }
    function paint(t) {
      t.el.textContent = t.v;
      t.el.dataset.v = t.v;
      t.el.classList.toggle('small', t.v >= 128 && t.v < 1024);
      t.el.classList.toggle('tiny', t.v >= 1024);
      t.el.classList.toggle('huge', t.v > 2048);
    }

    function addRandom() {
      const empty = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) empty.push([r, c]);
      if (!empty.length) return;
      const [r, c] = empty[UI.rand(empty.length)];
      const t = { r, c, v: Math.random() < 0.9 ? 2 : 4, el: h('div', { class: 'tile2048 new' }) };
      paint(t);
      place(t);
      grid[r][c] = t;
      board.append(t.el);
    }

    function canMove() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const t = grid[r][c];
        if (!t) return true;
        if (c + 1 < N && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true;
        if (r + 1 < N && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true;
      }
      return false;
    }

    function move(d) {
      if (busy || over || api.overlayOpen) return;
      let moved = false, gained = 0;
      const merges = [];
      for (let i = 0; i < N; i++) {
        const cells = [];
        for (let j = 0; j < N; j++) {
          if (d === 'left') cells.push([i, j]);
          else if (d === 'right') cells.push([i, N - 1 - j]);
          else if (d === 'up') cells.push([j, i]);
          else cells.push([N - 1 - j, i]);
        }
        const line = cells.map(([r, c]) => grid[r][c]).filter(Boolean);
        const out = [];
        for (const t of line) {
          const prev = out[out.length - 1];
          if (prev && !prev.merged && prev.v === t.v) {
            prev.merged = true;
            t.into = prev;
            merges.push(t);
            gained += t.v * 2;
          } else out.push(t);
        }
        cells.forEach(([r, c]) => { grid[r][c] = null; });
        out.forEach((t, k) => {
          const [r, c] = cells[k];
          if (t.r !== r || t.c !== c) moved = true;
          t.r = r; t.c = c;
          grid[r][c] = t;
        });
      }
      if (!moved && !merges.length) return;

      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c]) { grid[r][c].el.classList.remove('new', 'merged'); place(grid[r][c]); }
      for (const t of merges) { t.el.classList.remove('new'); t.el.style.zIndex = '0'; t.r = t.into.r; t.c = t.into.c; place(t); }

      busy = true;
      api.timeout(() => {
        for (const t of merges) {
          t.el.remove();
          const target = t.into;
          target.v *= 2;
          paint(target);
          target.el.classList.remove('merged');
          void target.el.offsetWidth;
          target.el.classList.add('merged');
          if (target.v === 2048 && !won) { won = true; showWin(); }
        }
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c]) grid[r][c].merged = false;
        score += gained;
        api.stat('Score', score);
        addRandom();
        busy = false;
        if (!canMove()) lose();
      }, 105);
    }

    function showWin() {
      api.submit(score);
      api.overlay({
        title: 'You made 2048',
        text: 'Score so far: ' + score + '. Keep going for a bigger tile?',
        actions: [
          { label: 'Keep going', primary: true, fn: () => api.hideOverlay() },
          { label: 'New game', fn: api.restart },
        ],
      });
    }

    function lose() {
      over = true;
      const best = api.submit(score);
      let top = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c]) top = Math.max(top, grid[r][c].v);
      api.timeout(() => api.overlay({
        title: 'No moves left',
        text: score + ' points. Your biggest tile was ' + top + '.',
        sub: best && score > 0 ? 'That’s a new best.' : null,
        actions: [{ label: 'Play again', primary: true, fn: api.restart }],
      }), 350);
    }

    const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
    api.key((e) => { if (keys[e.key]) { move(keys[e.key]); return true; } return false; });
    api.swipe(board, (d) => { if (d !== 'tap') move(d); });

    addRandom();
    addRandom();
  },
});
