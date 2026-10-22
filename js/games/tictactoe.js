/* Tic-Tac-Toe against the computer or a friend. */
Arcade.register({
  id: 'tictactoe',
  name: 'Tic-Tac-Toe',
  kind: 'classic',
  blurb: 'Get three in a row. The computer on Hard never loses.',
  controls: 'Click a square, or press 1–9 (laid out like a phone keypad)',
  fmt: (s) => s + (s === 1 ? ' win' : ' wins'),

  thumb(g, W, H, C) {
    const s = 46, x0 = (W - 3 * s) / 2, y0 = (H - 3 * s) / 2;
    g.strokeStyle = C.dim;
    g.lineWidth = 4;
    g.lineCap = 'round';
    for (let i = 1; i < 3; i++) {
      g.beginPath(); g.moveTo(x0 + i * s, y0 + 4); g.lineTo(x0 + i * s, y0 + 3 * s - 4); g.stroke();
      g.beginPath(); g.moveTo(x0 + 4, y0 + i * s); g.lineTo(x0 + 3 * s - 4, y0 + i * s); g.stroke();
    }
    const X = (c, r) => { g.strokeStyle = C.pink; g.lineWidth = 6; const x = x0 + c * s + 12, y = y0 + r * s + 12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s - 24, y + s - 24); g.moveTo(x + s - 24, y); g.lineTo(x, y + s - 24); g.stroke(); };
    const O = (c, r) => { g.strokeStyle = C.cyan; g.lineWidth = 6; g.beginPath(); g.arc(x0 + c * s + s / 2, y0 + r * s + s / 2, s / 2 - 11, 0, Math.PI * 2); g.stroke(); };
    X(0, 0); O(1, 1); X(2, 0); O(1, 0); X(1, 2);
  },

  mount(stage, api) {
    const { h } = UI;
    let mode = Store.pref('ttt.mode') || 'hard';
    if (!['easy', 'hard', 'two'].includes(mode)) mode = 'hard';
    api.setVariant(mode === 'two' ? null : mode);
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const b = Array(9).fill('');
    let turn = 'X', over = false, busy = false;
    let streak = Number(Store.pref('ttt.streak.' + mode) || 0);

    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Opponent' });
    [['easy', 'Easy computer'], ['hard', 'Hard computer'], ['two', 'Two players']].forEach(([v, label]) => {
      const btn = h('button', { type: 'button', 'aria-pressed': String(v === mode) }, label);
      btn.addEventListener('click', () => { if (v !== mode) { Store.pref('ttt.mode', v); api.restart(); } });
      seg.append(btn);
    });
    const status = h('p', { class: 'four-status', role: 'status' });
    const grid = h('div', { class: 'ttt', role: 'grid', 'aria-label': 'Tic-Tac-Toe board' });
    const cells = b.map((_, i) => {
      const el = h('button', { type: 'button', class: 'ttt-cell', 'aria-label': 'Square ' + (i + 1) });
      el.addEventListener('click', () => human(i));
      grid.append(el);
      return el;
    });
    stage.append(h('div', { class: 'gbar' }, seg), status, grid);
    if (mode !== 'two') api.stat('Streak', streak);

    const winner = (s) => {
      for (const l of LINES) if (s[l[0]] && s[l[0]] === s[l[1]] && s[l[1]] === s[l[2]]) return l;
      return null;
    };
    function say() { status.textContent = over ? status.textContent : mode === 'two' ? turn + '’s turn' : turn === 'X' ? 'Your turn (X)' : 'Computer is thinking…'; }
    say();

    function place(i) {
      b[i] = turn;
      cells[i].textContent = turn;
      cells[i].dataset.p = turn;
      cells[i].disabled = true;
      const line = winner(b);
      if (line) return finish(turn, line);
      if (b.every(Boolean)) return finish(null);
      turn = turn === 'X' ? 'O' : 'X';
      say();
    }

    function minimax(s, player) {
      const line = winner(s);
      if (line) return { score: s[line[0]] === 'O' ? 10 : -10 };
      if (s.every(Boolean)) return { score: 0 };
      let best = { score: player === 'O' ? -Infinity : Infinity, i: -1 };
      for (let i = 0; i < 9; i++) {
        if (s[i]) continue;
        s[i] = player;
        const r = minimax(s, player === 'O' ? 'X' : 'O');
        s[i] = '';
        const sc = r.score - Math.sign(r.score); // prefer faster wins
        if (player === 'O' ? sc > best.score : sc < best.score) best = { score: sc, i };
      }
      return best;
    }

    function computer() {
      const free = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      let i;
      if (mode === 'easy' && Math.random() < 0.6) i = free[UI.rand(free.length)];
      else i = minimax(b.slice(), 'O').i;
      place(i);
    }

    function human(i) {
      if (over || busy || b[i]) return;
      if (mode !== 'two' && turn !== 'X') return;
      place(i);
      if (!over && mode !== 'two') {
        busy = true;
        api.timeout(() => { computer(); busy = false; }, 350);
      }
    }

    function finish(w, line) {
      over = true;
      if (line) line.forEach((k) => cells[k].classList.add('win'));
      cells.forEach((c) => { c.disabled = true; });
      let title;
      if (!w) title = 'Draw';
      else if (mode === 'two') title = w + ' wins';
      else title = w === 'X' ? 'You win' : 'Computer wins';
      if (mode !== 'two') {
        if (w === 'X') { streak++; api.submit(streak); }
        else if (w === 'O') streak = 0;
        Store.pref('ttt.streak.' + mode, streak);
        api.stat('Streak', streak);
      }
      status.textContent = title;
      api.timeout(() => api.overlay({
        title,
        text: mode === 'hard' && !w ? 'Nobody beats Hard mode. A draw is a good result.' : null,
        actions: [{ label: 'Play again', primary: true, fn: api.restart }],
      }), 700);
    }

    // number keys follow a phone keypad: 1 2 3 on top
    api.key((e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 9) { human(n - 1); return true; }
      return false;
    });
  },
});
