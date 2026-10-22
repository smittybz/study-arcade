/* Flap: fly between pencils. */
Arcade.register({
  id: 'flap',
  name: 'Flap',
  kind: 'classic',
  blurb: 'Tap to flap through the gaps between giant pencils.',
  controls: 'Space, ↑, click or tap to flap',

  thumb(g, W, H, C, rr) {
    const pencil = (x, gapTop, gapBot) => {
      g.fillStyle = C.yellow; g.fillRect(x, 0, 34, gapTop - 22);
      g.fillStyle = '#E8C9A0';
      g.beginPath(); g.moveTo(x, gapTop - 22); g.lineTo(x + 34, gapTop - 22); g.lineTo(x + 17, gapTop); g.closePath(); g.fill();
      g.fillStyle = C.yellow; g.fillRect(x, gapBot + 22, 34, H - gapBot);
      g.fillStyle = '#E8C9A0';
      g.beginPath(); g.moveTo(x, gapBot + 22); g.lineTo(x + 34, gapBot + 22); g.lineTo(x + 17, gapBot); g.closePath(); g.fill();
    };
    pencil(150, 70, 140);
    pencil(260, 40, 110);
    g.fillStyle = C.pink;
    g.beginPath(); g.arc(80, 100, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFFFFF';
    g.beginPath(); g.arc(85, 96, 4, 0, Math.PI * 2); g.fill();
  },

  mount(stage, api) {
    const W = 360, H = 540, GROUND = 40, PW = 56, TIP = 26, GAP = 156;
    const { cv, g } = api.canvas(W, H, { max: 420, label: 'Flap' });
    stage.append(cv);
    const C = api.colors, rr = api.roundRect;

    const bird = { x: 96, y: H / 2 - 40, vy: 0, r: 14 };
    let pipes = [], score = 0, state = 'ready', spawnIn = 0, t = 0, groundX = 0;
    api.stat('Score', 0);

    function flap() {
      if (state === 'dead') return;
      if (state === 'ready') { state = 'play'; api.hideOverlay(); spawnIn = 0.6; }
      bird.vy = -420;
    }
    api.key((e) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { if (!api.overlayOpen || state === 'ready') flap(); return true; }
      return false;
    });
    api.on(cv, 'pointerdown', (e) => { e.preventDefault(); flap(); });

    function spawn() {
      const min = 70, max = H - GROUND - GAP - 70;
      pipes.push({ x: W + 10, top: min + Math.random() * (max - min), passed: false });
    }

    function hitsRect(x, y, w, h) {
      const nx = Math.max(x, Math.min(bird.x, x + w));
      const ny = Math.max(y, Math.min(bird.y, y + h));
      const dx = bird.x - nx, dy = bird.y - ny;
      return dx * dx + dy * dy < (bird.r - 2) * (bird.r - 2);
    }
    // A pencil tip is a triangle; three stacked boxes are close enough.
    function hitsPencil(p) {
      const gapTop = p.top, gapBot = p.top + GAP;
      if (hitsRect(p.x, 0, PW, gapTop - TIP) || hitsRect(p.x, gapBot + TIP, PW, H)) return true;
      for (let i = 0; i < 3; i++) {
        const frac = (i + 1) / 3;
        const w = PW * (1 - frac + 1 / 6), off = (PW - w) / 2, hh = TIP / 3;
        if (hitsRect(p.x + off, gapTop - TIP + i * hh, w, hh)) return true;
        if (hitsRect(p.x + off, gapBot + TIP - (i + 1) * hh, w, hh)) return true;
      }
      return false;
    }

    function die() {
      if (state === 'dead') return;
      state = 'dead';
      const best = api.submit(score);
      api.timeout(() => api.overlay({
        title: 'Bonk',
        text: 'You got past ' + score + (score === 1 ? ' pencil.' : ' pencils.'),
        sub: best && score > 0 ? 'That’s a new best.' : null,
        actions: [{ label: 'Play again', primary: true, fn: api.restart }],
      }), 450);
    }

    function update(dt) {
      t += dt;
      if (state === 'ready') { bird.y = H / 2 - 40 + Math.sin(t * 3) * 8; return; }
      bird.vy += 1450 * dt;
      bird.y += bird.vy * dt;
      if (bird.y + bird.r >= H - GROUND) { bird.y = H - GROUND - bird.r; die(); }
      if (bird.y < bird.r) { bird.y = bird.r; bird.vy = 0; }
      if (state !== 'play') return;
      const speed = 150 + Math.min(70, score * 2);
      groundX = (groundX + speed * dt) % 24;
      spawnIn -= dt;
      if (spawnIn <= 0) { spawn(); spawnIn = 1.5; }
      for (const p of pipes) {
        p.x -= speed * dt;
        if (!p.passed && p.x + PW < bird.x - bird.r) { p.passed = true; score++; api.stat('Score', score); }
        if (hitsPencil(p)) die();
      }
      pipes = pipes.filter((p) => p.x > -PW - 10);
    }

    function drawPencil(x, tipY, up) {
      // up = the point faces up (bottom pencil)
      const body = up ? [tipY + TIP, H - GROUND - (tipY + TIP)] : [0, tipY - TIP];
      g.fillStyle = C.yellow;
      g.fillRect(x, body[0], PW, body[1]);
      g.fillStyle = 'rgba(15,21,40,.18)';
      g.fillRect(x + PW / 3, body[0], 2, body[1]);
      g.fillRect(x + (2 * PW) / 3, body[0], 2, body[1]);
      const baseY = up ? tipY + TIP : tipY - TIP;
      g.fillStyle = '#E8C9A0';
      g.beginPath(); g.moveTo(x, baseY); g.lineTo(x + PW, baseY); g.lineTo(x + PW / 2, tipY); g.closePath(); g.fill();
      g.fillStyle = '#2B2F3A';
      const lead = TIP / 3;
      g.beginPath();
      g.moveTo(x + PW / 2 - PW / 6, up ? tipY + lead : tipY - lead);
      g.lineTo(x + PW / 2 + PW / 6, up ? tipY + lead : tipY - lead);
      g.lineTo(x + PW / 2, tipY);
      g.closePath();
      g.fill();
      // eraser end on the top pencil
      if (!up && body[1] > 30) { g.fillStyle = C.pink; g.fillRect(x, 0, PW, 12); g.fillStyle = '#C9CED8'; g.fillRect(x, 12, PW, 6); }
    }

    function draw() {
      g.fillStyle = C.bg;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = C.grid;
      g.lineWidth = 1;
      for (let y = 36; y < H - GROUND; y += 36) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); }
      for (const p of pipes) { drawPencil(p.x, p.top, false); drawPencil(p.x, p.top + GAP, true); }
      // desk edge
      g.fillStyle = C.panel;
      g.fillRect(0, H - GROUND, W, GROUND);
      g.fillStyle = C.grid;
      for (let x = -groundX; x < W; x += 24) g.fillRect(x, H - GROUND, 12, 4);
      // bird
      g.save();
      g.translate(bird.x, bird.y);
      g.rotate(Math.max(-0.5, Math.min(1.2, bird.vy / 600)));
      g.fillStyle = C.pink;
      g.beginPath(); g.arc(0, 0, bird.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.arc(5, -4, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0F1528';
      g.beginPath(); g.arc(6.5, -4, 2.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.orange;
      g.beginPath(); g.moveTo(11, 1); g.lineTo(20, 4); g.lineTo(11, 7); g.closePath(); g.fill();
      g.fillStyle = '#E0557A';
      const flapY = Math.sin(t * 22) * 4;
      g.beginPath(); g.ellipse(-5, 3 + flapY, 7, 4, 0, 0, Math.PI * 2); g.fill();
      g.restore();
      // score
      if (state === 'play') {
        g.fillStyle = C.ink;
        g.font = '36px Bungee, Impact, sans-serif';
        g.textAlign = 'center';
        g.fillText(String(score), W / 2, 64);
      }
    }

    api.loop((dt) => { update(dt); draw(); });

    api.overlay({
      title: 'Flap',
      text: 'Press Space or tap to start.',
      actions: [{ label: 'Start', primary: true, fn: flap }],
    });
  },
});
