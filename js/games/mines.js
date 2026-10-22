/* Minesweeper */
Arcade.register({
  id: 'mines',
  name: 'Minesweeper',
  kind: 'classic',
  lowerIsBetter: true,
  fmt: UI.fmtTime,
  blurb: 'Use the numbers to work out where every mine is hiding.',
  controls: 'Click to dig · Right-click or long-press to flag · Click a number to clear around it',

  thumb(g, W, H, C, rr) {
    const s = 22, cols = 11, rows = 7, x0 = (W - cols * s) / 2, y0 = (H - rows * s) / 2;
    const open = new Set(['1,2', '2,2', '3,2', '1,3', '2,3', '3,3', '4,3', '2,4', '3,4', '4,4', '5,4', '3,5', '4,5', '5,5', '6,5', '6,4', '7,4', '7,3']);
    const nums = { '3,2': ['1', C.blue], '4,3': ['2', C.green], '5,4': ['1', C.blue], '7,3': ['3', C.pink], '6,5': ['1', C.blue], '1,2': ['1', C.blue] };
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '13px Bungee, Impact, sans-serif';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = x + ',' + y;
      g.fillStyle = open.has(k) ? C.panel : '#2A3560';
      rr(g, x0 + x * s + 1, y0 + y * s + 1, s - 2, s - 2, 3); g.fill();
      if (nums[k]) { g.fillStyle = nums[k][1]; g.fillText(nums[k][0], x0 + x * s + s / 2, y0 + y * s + s / 2 + 1); }
    }
    g.fillStyle = C.pink;
    const fx = x0 + 8 * s, fy = y0 + 2 * s;
    g.fillRect(fx + 8, fy + 5, 2, 12);
    g.beginPath(); g.moveTo(fx + 10, fy + 5); g.lineTo(fx + 17, fy + 8); g.lineTo(fx + 10, fy + 11); g.closePath(); g.fill();
  },

  mount(stage, api) {
    const { h } = UI;
    const LEVELS = { easy: { w: 9, h: 9, m: 10, label: 'Easy · 9×9' }, medium: { w: 16, h: 16, m: 40, label: 'Medium · 16×16' } };
    let level = Store.pref('mines.level') === 'medium' ? 'medium' : 'easy';
    api.setVariant(level);
    const L = LEVELS[level];
    const FLAG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5.5 2.5l7 3-7 3z" fill="currentColor"/></svg>';
    const MINE = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4.2" fill="currentColor"/><path d="M8 1.5v13M1.5 8h13M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

    // toolbar: level + flag mode for touch screens
    let flagMode = false;
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Board size' });
    for (const [k, v] of Object.entries(LEVELS)) {
      const b = h('button', { type: 'button', 'aria-pressed': String(k === level) }, v.label);
      b.addEventListener('click', () => { if (k !== level) { Store.pref('mines.level', k); api.restart(); } });
      seg.append(b);
    }
    const flagBtn = h('button', { class: 'toggle', type: 'button', 'aria-pressed': 'false' }, 'Flag mode');
    flagBtn.addEventListener('click', () => { flagMode = !flagMode; flagBtn.setAttribute('aria-pressed', String(flagMode)); });

    const board = h('div', { class: 'mines', style: { '--w': L.w }, role: 'grid', 'aria-label': 'Minefield' });
    stage.append(h('div', { class: 'gbar' }, seg, flagBtn), board);

    const cells = [];
    for (let i = 0; i < L.w * L.h; i++) {
      const el = h('button', { type: 'button', 'aria-label': 'Hidden' });
      cells.push({ i, x: i % L.w, y: Math.floor(i / L.w), mine: false, n: 0, open: false, flag: false, el });
      board.append(el);
    }

    let first = true, done = false, opened = 0, flags = 0, t0 = 0, timer = null;
    api.stat('Mines', L.m);
    api.stat('Time', '0.0s');

    const around = (c) => {
      const out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = c.x + dx, y = c.y + dy;
        if (x >= 0 && y >= 0 && x < L.w && y < L.h) out.push(cells[y * L.w + x]);
      }
      return out;
    };

    function plant(safe) {
      const banned = new Set([safe.i, ...around(safe).map((c) => c.i)]);
      const pool = cells.filter((c) => !banned.has(c.i));
      UI.shuffle(pool).slice(0, L.m).forEach((c) => { c.mine = true; });
      cells.forEach((c) => { c.n = around(c).filter((x) => x.mine).length; });
    }

    function paint(c) {
      const el = c.el;
      el.className = '';
      el.innerHTML = '';
      if (c.open) {
        el.classList.add('open');
        if (c.mine) { el.innerHTML = MINE; el.setAttribute('aria-label', 'Mine'); }
        else if (c.n) { el.textContent = c.n; el.classList.add('n' + c.n); el.setAttribute('aria-label', c.n + (c.n === 1 ? ' mine nearby' : ' mines nearby')); }
        else el.setAttribute('aria-label', 'Empty');
      } else if (c.flag) { el.innerHTML = FLAG; el.classList.add('n3'); el.setAttribute('aria-label', 'Flagged'); }
      else el.setAttribute('aria-label', 'Hidden');
    }

    function elapsed() { return (performance.now() - t0) / 1000; }

    function reveal(c) {
      if (done || c.open || c.flag) return;
      if (first) {
        first = false;
        plant(c);
        t0 = performance.now();
        timer = api.interval(() => api.stat('Time', UI.fmtTime(elapsed())), 100);
      }
      if (c.mine) return lose(c);
      const stack = [c];
      while (stack.length) {
        const cur = stack.pop();
        if (cur.open || cur.flag) continue;
        cur.open = true;
        opened++;
        paint(cur);
        if (cur.n === 0) around(cur).forEach((x) => { if (!x.open && !x.mine) stack.push(x); });
      }
      if (opened === L.w * L.h - L.m) win();
    }

    function chord(c) {
      if (!c.open || !c.n) return;
      const near = around(c);
      if (near.filter((x) => x.flag).length !== c.n) return;
      near.forEach((x) => { if (!x.flag && !x.open) reveal(x); });
    }

    function toggleFlag(c) {
      if (done || c.open) return;
      c.flag = !c.flag;
      flags += c.flag ? 1 : -1;
      api.stat('Mines', L.m - flags);
      paint(c);
    }

    function stop() { done = true; if (timer) api.clearInterval(timer); }

    function lose(hit) {
      stop();
      cells.forEach((c) => { if (c.mine && !c.flag) { c.open = true; paint(c); } });
      hit.el.classList.add('boom');
      api.timeout(() => api.overlay({
        title: 'Boom',
        text: 'You found a mine. ' + opened + ' safe squares cleared.',
        actions: [{ label: 'Try again', primary: true, fn: api.restart }],
      }), 600);
    }

    function win() {
      stop();
      const time = Math.round(elapsed() * 10) / 10;
      api.stat('Time', UI.fmtTime(time));
      cells.forEach((c) => { if (c.mine && !c.flag) { c.flag = true; paint(c); } });
      api.stat('Mines', 0);
      const best = api.submit(time);
      api.overlay({
        title: best ? 'New best time' : 'Cleared',
        text: 'Every mine found in ' + UI.fmtTime(time) + ' on ' + LEVELS[level].label + '.',
        actions: [{ label: 'Play again', primary: true, fn: api.restart }],
      });
    }

    // clicks, right-clicks and long presses
    let pressTimer = null, longPressed = false;
    cells.forEach((c) => {
      c.el.addEventListener('click', () => {
        if (longPressed) { longPressed = false; return; }
        if (flagMode && !c.open) toggleFlag(c);
        else if (c.open) chord(c);
        else reveal(c);
      });
      c.el.addEventListener('contextmenu', (e) => { e.preventDefault(); toggleFlag(c); });
      c.el.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        longPressed = false;
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => { longPressed = true; toggleFlag(c); if (navigator.vibrate) navigator.vibrate(15); }, 380);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => c.el.addEventListener(t, () => clearTimeout(pressTimer)));
    });

    return () => clearTimeout(pressTimer);
  },
});
