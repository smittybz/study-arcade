/* Snake */
Arcade.register({
  id: 'snake',
  name: 'Snake',
  kind: 'classic',
  blurb: 'Eat, grow longer, and don’t run into the walls or your own tail.',
  controls: 'Arrow keys or WASD to steer · P to pause · Swipe or use the buttons on touch screens',

  thumb(g, W, H, C, rr) {
    const s = 16;
    g.fillStyle = C.panel;
    for (let x = 0; x < W; x += s) for (let y = 0; y < H; y += s) if (((x + y) / s) % 2 === 0) g.fillRect(x, y, s, s);
    const body = [[4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [8, 5], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4]];
    body.forEach(([x, y], i) => { g.fillStyle = i === body.length - 1 ? C.yellow : C.green; rr(g, x * s + 1, y * s + 1, s - 2, s - 2, 4); g.fill(); });
    g.fillStyle = C.pink;
    g.beginPath(); g.arc(15 * s + s / 2, 4 * s + s / 2, s / 2 - 2, 0, Math.PI * 2); g.fill();
  },

  mount(stage, api) {
    const N = 20, S = 24, W = N * S;
    const { cv, g } = api.canvas(W, W, { max: 520, label: 'Snake board' });
    stage.append(cv);
    const C = api.colors, rr = api.roundRect;

    let snake = [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }];
    let dir = { x: 1, y: 0 };
    const queue = [];
    let food = null, score = 0, step = 0.14, acc = 0, running = false, paused = false, dead = false;

    function place() {
      do { food = { x: UI.rand(N), y: UI.rand(N) }; } while (snake.some((s) => s.x === food.x && s.y === food.y));
    }
    place();
    api.stat('Score', 0);

    function start() { if (running || dead) return; running = true; api.hideOverlay(); }

    function turn(x, y) {
      if (dead) return;
      if (!running) start();
      if (paused) return;
      const last = queue.length ? queue[queue.length - 1] : dir;
      if ((last.x === -x && last.y === -y) || (last.x === x && last.y === y)) return;
      if (queue.length < 3) queue.push({ x, y });
    }

    function togglePause() {
      if (!running || dead) return;
      paused = !paused;
      if (paused) api.overlay({ title: 'Paused', actions: [{ label: 'Resume', primary: true, fn: togglePause }] });
      else api.hideOverlay();
    }

    const keys = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
    };
    api.key((e) => {
      if (keys[e.key]) { turn(...keys[e.key]); return true; }
      if (e.key === 'p' || e.key === 'P' || (e.key === ' ' && running)) { togglePause(); return true; }
      return false;
    });
    const sw = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    api.swipe(cv, (d) => { if (sw[d]) turn(...sw[d]); });
    api.pad([
      { label: '←', aria: 'Left', fn: () => turn(-1, 0) },
      { label: '↑', aria: 'Up', fn: () => turn(0, -1) },
      { label: '↓', aria: 'Down', fn: () => turn(0, 1) },
      { label: '→', aria: 'Right', fn: () => turn(1, 0) },
    ]);

    function tick() {
      if (queue.length) dir = queue.shift();
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      const eating = head.x === food.x && head.y === food.y;
      const body = eating ? snake : snake.slice(0, -1);
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || body.some((s) => s.x === head.x && s.y === head.y)) return over();
      snake.unshift(head);
      if (eating) {
        score++;
        api.stat('Score', score);
        step = Math.max(0.065, step * 0.97);
        if (snake.length >= N * N) return over(true);
        place();
      } else snake.pop();
    }

    function over(won) {
      dead = true;
      const best = api.submit(score);
      api.overlay({
        title: won ? 'You filled the board' : 'Game over',
        text: 'You ate ' + score + (score === 1 ? ' apple.' : ' apples.'),
        sub: best && score > 0 ? 'That’s a new best.' : null,
        actions: [{ label: 'Play again', primary: true, fn: api.restart }],
      });
    }

    function draw() {
      g.fillStyle = C.bg;
      g.fillRect(0, 0, W, W);
      g.fillStyle = C.panel;
      for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2 === 0) g.fillRect(x * S, y * S, S, S);
      // apple
      g.fillStyle = C.pink;
      g.beginPath(); g.arc(food.x * S + S / 2, food.y * S + S / 2 + 1, S / 2 - 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.green;
      g.fillRect(food.x * S + S / 2 - 1, food.y * S + 2, 3, 5);
      // snake
      snake.forEach((s, i) => {
        g.fillStyle = i === 0 ? C.yellow : C.green;
        rr(g, s.x * S + 1.5, s.y * S + 1.5, S - 3, S - 3, i === 0 ? 7 : 5);
        g.fill();
      });
      const hd = snake[0];
      g.fillStyle = C.bg;
      const ex = dir.y !== 0 ? [-4, 4] : [dir.x * 4, dir.x * 4];
      const ey = dir.x !== 0 ? [-4, 4] : [dir.y * 4, dir.y * 4];
      for (let k = 0; k < 2; k++) { g.beginPath(); g.arc(hd.x * S + S / 2 + ex[k], hd.y * S + S / 2 + ey[k], 2.4, 0, Math.PI * 2); g.fill(); }
    }

    api.loop((dt) => {
      if (running && !paused && !dead) {
        acc += dt;
        while (acc >= step && !dead) { acc -= step; tick(); }
      }
      draw();
    });

    api.overlay({
      title: 'Snake',
      text: 'Press an arrow key or swipe to start.',
      actions: [{ label: 'Start', primary: true, fn: start }],
    });
  },
});
