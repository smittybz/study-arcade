/* Four in a Row: drop discs, connect four. Play the computer or a friend. */
Arcade.register({
  id: 'four',
  name: 'Four in a Row',
  kind: 'classic',
  blurb: 'Drop your discs and line up four before the computer does.',
  controls: 'Click a column, or press 1–7, to drop a disc',
  fmt: (s) => s + (s === 1 ? ' win' : ' wins'),

  thumb(g, W, H, C, rr) {
    const cols = 7, rows = 6, s = 26, bw = cols * s, bh = rows * s, x0 = (W - bw) / 2, y0 = (H - bh) / 2 + 6;
    g.fillStyle = C.blue;
    rr(g, x0 - 8, y0 - 8, bw + 16, bh + 16, 10); g.fill();
    const disc = { '5,1': 'p', '5,2': 'y', '5,3': 'p', '4,2': 'p', '5,4': 'y', '4,3': 'y', '3,3': 'p', '4,4': 'p', '5,5': 'y', '3,4': 'y', '2,4': 'p' };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const d = disc[r + ',' + c];
      g.fillStyle = d === 'p' ? C.pink : d === 'y' ? C.yellow : C.bg;
      g.beginPath(); g.arc(x0 + c * s + s / 2, y0 + r * s + s / 2, s / 2 - 3, 0, Math.PI * 2); g.fill();
    }
  },

  mount(stage, api) {
    const { h } = UI;
    const COLS = 7, ROWS = 6;
    let mode = Store.pref('four.mode') || 'cpu';
    api.setVariant(mode);
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); // 1 = you (pink), 2 = computer or player 2 (yellow)
    let turn = 1, over = false, busy = false;
    let streak = Number(Store.pref('four.streak') || 0);

    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Opponent' });
    [['cpu', 'Vs computer'], ['two', 'Two players']].forEach(([v, label]) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(v === mode) }, label);
      b.addEventListener('click', () => { if (v !== mode) { Store.pref('four.mode', v); api.restart(); } });
      seg.append(b);
    });
    const status = h('p', { class: 'four-status', role: 'status' });
    const grid = h('div', { class: 'four', role: 'grid', 'aria-label': 'Four in a Row board' });
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      cells.push([]);
      for (let c = 0; c < COLS; c++) {
        const el = h('button', { type: 'button', class: 'four-cell', 'aria-label': 'Column ' + (c + 1) }, h('span'));
        el.addEventListener('click', () => human(c));
        el.addEventListener('mouseenter', () => hover(c));
        cells[r].push(el);
        grid.append(el);
      }
    }
    grid.addEventListener('mouseleave', () => hover(-1));
    stage.append(h('div', { class: 'gbar' }, seg), status, grid);

    const names = mode === 'cpu' ? { 1: 'You', 2: 'Computer' } : { 1: 'Pink', 2: 'Yellow' };
    if (mode === 'cpu') api.stat('Streak', streak);

    function say() {
      if (over) return;
      status.textContent = mode === 'cpu' ? (turn === 1 ? 'Your turn' : 'Computer is thinking…') : names[turn] + '’s turn';
      status.dataset.p = turn;
    }
    say();

    function hover(c) {
      for (let col = 0; col < COLS; col++) cells.forEach((row) => row[col].classList.toggle('aim', col === c && !over && !busy && (mode === 'two' || turn === 1)));
    }

    const dropRow = (b, c) => { for (let r = ROWS - 1; r >= 0; r--) if (!b[r][c]) return r; return -1; };

    function lineAt(b, r, c) {
      const p = b[r][c];
      if (!p) return null;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const line = [[r, c]];
        for (const s of [1, -1]) {
          let rr = r + dr * s, cc = c + dc * s;
          while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr][cc] === p) { line.push([rr, cc]); rr += dr * s; cc += dc * s; }
        }
        if (line.length >= 4) return line;
      }
      return null;
    }

    function paint(r, c) {
      const el = cells[r][c];
      el.dataset.p = board[r][c];
      el.classList.remove('drop');
      void el.offsetWidth;
      el.classList.add('drop');
      el.style.setProperty('--fall', (r + 1));
    }

    function play(c) {
      const r = dropRow(board, c);
      if (r < 0) return false;
      board[r][c] = turn;
      paint(r, c);
      const line = lineAt(board, r, c);
      if (line) { finish(turn, line); return true; }
      if (board[0].every(Boolean)) { finish(0); return true; }
      turn = turn === 1 ? 2 : 1;
      say();
      return true;
    }

    function human(c) {
      if (over || busy) return;
      if (mode === 'cpu' && turn !== 1) return;
      if (!play(c)) return;
      hover(-1);
      if (!over && mode === 'cpu') {
        busy = true;
        api.timeout(() => { play(bestMove()); busy = false; }, 380);
      }
    }

    // Computer: look a few moves ahead (minimax with alpha-beta), prefer the middle.
    function score(b) {
      let s = 0;
      const center = 3;
      for (let r = 0; r < ROWS; r++) { if (b[r][center] === 2) s += 3; else if (b[r][center] === 1) s -= 3; }
      const windowScore = (cellsW) => {
        const a = cellsW.filter((v) => v === 2).length, p = cellsW.filter((v) => v === 1).length, e = 4 - a - p;
        if (a && p) return 0;
        if (a === 3 && e === 1) return 5;
        if (a === 2 && e === 2) return 2;
        if (p === 3 && e === 1) return -6;
        if (p === 2 && e === 2) return -2;
        return 0;
      };
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (c + 3 < COLS) s += windowScore([b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]]);
        if (r + 3 < ROWS) s += windowScore([b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]]);
        if (r + 3 < ROWS && c + 3 < COLS) s += windowScore([b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]]);
        if (r + 3 < ROWS && c - 3 >= 0) s += windowScore([b[r][c], b[r + 1][c - 1], b[r + 2][c - 2], b[r + 3][c - 3]]);
      }
      return s;
    }
    const ORDER = [3, 2, 4, 1, 5, 0, 6];
    function minimax(b, depth, alpha, beta, me) {
      const moves = ORDER.filter((c) => !b[0][c]);
      if (!moves.length || depth === 0) return [score(b), -1];
      let bestCol = moves[0];
      let best = me ? -Infinity : Infinity;
      for (const c of moves) {
        const r = dropRow(b, c);
        b[r][c] = me ? 2 : 1;
        let val;
        if (lineAt(b, r, c)) val = me ? 100000 + depth : -100000 - depth;
        else val = minimax(b, depth - 1, alpha, beta, !me)[0];
        b[r][c] = 0;
        if (me ? val > best : val < best) { best = val; bestCol = c; }
        if (me) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
        if (alpha >= beta) break;
      }
      return [best, bestCol];
    }
    function bestMove() { return minimax(board.map((r) => r.slice()), 5, -Infinity, Infinity, true)[1]; }

    function finish(winner, line) {
      over = true;
      hover(-1);
      if (line) line.forEach(([r, c]) => cells[r][c].classList.add('win'));
      let title, text;
      if (!winner) { title = 'Draw'; text = 'The board is full.'; }
      else if (mode === 'cpu') {
        if (winner === 1) { streak++; title = 'You win'; text = 'Win streak: ' + streak; api.submit(streak); }
        else { streak = 0; title = 'Computer wins'; text = 'It got four in a row. Try again?'; }
        Store.pref('four.streak', streak);
        api.stat('Streak', streak);
      } else { title = names[winner] + ' wins'; text = 'Four in a row.'; }
      status.textContent = title;
      api.timeout(() => api.overlay({ title, text, actions: [{ label: 'Play again', primary: true, fn: api.restart }] }), 900);
    }

    api.key((e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 7) { human(n - 1); return true; }
      return false;
    });
  },
});
