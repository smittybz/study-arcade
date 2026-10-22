/* Breakout, with a ruler for a paddle. */
Arcade.register({
  id: 'breakout',
  name: 'Breakout',
  kind: 'classic',
  blurb: 'Bounce the ball off your ruler and clear every brick.',
  controls: 'Move the mouse or drag to steer · ← → keys work too · Click or Space to launch',

  thumb(g, W, H, C, rr) {
    const cols = 8, rows = 4, pad = 16, gap = 5, bw = (W - pad * 2 - gap * (cols - 1)) / cols;
    const colors = [C.pink, C.orange, C.yellow, C.green];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if ((r === 3 && (c === 2 || c === 5)) || (r === 2 && c === 5)) continue;
      g.fillStyle = colors[r];
      rr(g, pad + c * (bw + gap), 20 + r * 18, bw, 12, 3); g.fill();
    }
    g.fillStyle = C.ink;
    g.beginPath(); g.arc(W / 2 + 30, 128, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.yellow;
    rr(g, W / 2 - 40, H - 26, 80, 10, 2); g.fill();
    g.fillStyle = '#0F1528';
    for (let i = 0; i <= 8; i++) g.fillRect(W / 2 - 38 + i * 9.5, H - 26, 1, i % 2 ? 3 : 5);
  },

  mount(stage, api) {
    const W = 480, H = 360;
    const { cv, g, toLocal } = api.canvas(W, H, { max: 720, label: 'Breakout' });
    stage.append(cv);
    const C = api.colors, rr = api.roundRect;
    const COLS = 10, ROWS = 6, BW = (W - 24 - (COLS - 1) * 4) / COLS, BH = 14, TOP = 44;
    const ROW_COLORS = [C.pink, C.orange, C.yellow, C.green, C.cyan, C.blue];
    const ROW_POINTS = [7, 6, 5, 4, 2, 1];

    const paddle = { x: W / 2, w: 78, h: 10, y: H - 26 };
    const ball = { x: W / 2, y: 0, vx: 0, vy: 0, r: 6, stuck: true };
    let bricks = [], score = 0, lives = 3, level = 1, speed = 270, over = false, aim = null;
    const held = new Set();

    function build() {
      bricks = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        bricks.push({ x: 12 + c * (BW + 4), y: TOP + r * (BH + 5), r, alive: true });
      }
    }
    build();
    api.stat('Score', 0);
    api.stat('Lives', lives);
    api.stat('Level', level);

    function launch() {
      if (over) return;
      if (api.overlayOpen) api.hideOverlay();
      if (!ball.stuck) return;
      ball.stuck = false;
      const ang = (Math.random() * 0.6 - 0.3);
      ball.vx = speed * Math.sin(ang);
      ball.vy = -speed * Math.cos(ang);
    }

    api.on(cv, 'pointermove', (e) => { aim = toLocal(e).x; });
    api.on(cv, 'pointerdown', (e) => { aim = toLocal(e).x; launch(); });
    api.key((e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd') { held.add(e.key); aim = null; return true; }
      if (e.key === ' ') { launch(); return true; }
      return false;
    });
    api.keyUp((e) => held.delete(e.key));

    function lifeLost() {
      lives--;
      api.stat('Lives', lives);
      if (lives <= 0) {
        over = true;
        const best = api.submit(score);
        api.overlay({
          title: 'Out of balls',
          text: score + ' points · reached level ' + level,
          sub: best && score > 0 ? 'That’s a new best.' : null,
          actions: [{ label: 'Play again', primary: true, fn: api.restart }],
        });
        return;
      }
      ball.stuck = true;
    }

    function hitBricks() {
      for (const b of bricks) {
        if (!b.alive) continue;
        const nx = Math.max(b.x, Math.min(ball.x, b.x + BW));
        const ny = Math.max(b.y, Math.min(ball.y, b.y + BH));
        const dx = ball.x - nx, dy = ball.y - ny;
        if (dx * dx + dy * dy > ball.r * ball.r) continue;
        b.alive = false;
        score += ROW_POINTS[b.r] * level;
        api.stat('Score', score);
        // bounce off whichever side the ball went in deeper
        const overlapX = Math.min(ball.x + ball.r - b.x, b.x + BW - (ball.x - ball.r));
        const overlapY = Math.min(ball.y + ball.r - b.y, b.y + BH - (ball.y - ball.r));
        if (overlapX < overlapY) ball.vx = -ball.vx; else ball.vy = -ball.vy;
        if (bricks.every((x) => !x.alive)) {
          level++;
          speed += 35;
          api.stat('Level', level);
          build();
          ball.stuck = true;
        }
        return;
      }
    }

    function update(dt) {
      if (aim != null) paddle.x += (aim - paddle.x) * Math.min(1, dt * 22);
      const dir = (held.has('ArrowRight') || held.has('d') ? 1 : 0) - (held.has('ArrowLeft') || held.has('a') ? 1 : 0);
      paddle.x += dir * 460 * dt;
      paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x));
      if (ball.stuck) { ball.x = paddle.x; ball.y = paddle.y - ball.r - 1; return; }

      const steps = Math.max(1, Math.ceil((speed * dt) / 4));
      for (let i = 0; i < steps; i++) {
        ball.x += (ball.vx * dt) / steps;
        ball.y += (ball.vy * dt) / steps;
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
        if (ball.vy > 0 && ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h &&
            ball.x >= paddle.x - paddle.w / 2 - ball.r && ball.x <= paddle.x + paddle.w / 2 + ball.r) {
          const rel = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.w / 2)));
          const ang = rel * (Math.PI / 3);
          ball.vx = speed * Math.sin(ang);
          ball.vy = -speed * Math.cos(ang);
          ball.y = paddle.y - ball.r;
        }
        if (ball.y > H + ball.r) { lifeLost(); return; }
        hitBricks();
        if (ball.stuck) return;
      }
    }

    function draw() {
      g.fillStyle = C.bg;
      g.fillRect(0, 0, W, H);
      for (const b of bricks) {
        if (!b.alive) continue;
        g.fillStyle = ROW_COLORS[b.r];
        rr(g, b.x, b.y, BW, BH, 3);
        g.fill();
      }
      // the ruler
      const px = paddle.x - paddle.w / 2;
      g.fillStyle = C.yellow;
      rr(g, px, paddle.y, paddle.w, paddle.h, 2);
      g.fill();
      g.fillStyle = '#0F1528';
      for (let i = 0; i <= 12; i++) g.fillRect(px + 3 + i * ((paddle.w - 6) / 12), paddle.y, 1, i % 4 === 0 ? 6 : 3);
      // ball
      g.fillStyle = C.ink;
      g.beginPath();
      g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      g.fill();
      if (ball.stuck && !over && !api.overlayOpen) {
        g.fillStyle = C.dim;
        g.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillText('Click or press Space to launch', W / 2, H / 2 + 40);
      }
    }

    api.loop((dt) => {
      if (!over && !api.overlayOpen) update(dt);
      draw();
    });

    api.overlay({
      title: 'Breakout',
      text: 'Higher rows are worth more. Each level gets faster.',
      actions: [{ label: 'Start', primary: true, fn: () => api.hideOverlay() }],
    });
  },
});
