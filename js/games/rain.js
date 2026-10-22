/* Word Rain: cards fall from the top. Type the matching answer before they land. */
Arcade.register({
  id: 'rain',
  name: 'Word Rain',
  kind: 'study',
  blurb: 'Cards fall from the top. Type each answer before it hits the line.',
  controls: 'Type an answer. It clears as soon as it matches; capitals and accents don’t matter. Three misses ends the round.',
  options: [
    { id: 'type', label: 'You type', choices: [['auto', 'The shorter side'], ['def', 'The definition'], ['term', 'The term']] },
  ],

  thumb(g, W, H, C, rr) {
    g.strokeStyle = C.grid;
    g.lineWidth = 1;
    for (let y = 30; y < H; y += 30) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); }
    [[30, 22, 90], [170, 64, 110], [70, 118, 80], [200, 150, 70]].forEach(([x, y, w], i) => {
      g.fillStyle = '#FFFFFF';
      rr(g, x, y, w, 28, 6); g.fill();
      if (i === 3) { g.strokeStyle = C.pink; g.lineWidth = 3; g.stroke(); }
      g.fillStyle = '#9AA6C4';
      g.fillRect(x + 10, y + 12, w - 20, 5);
    });
    g.fillStyle = C.pink;
    g.fillRect(0, H - 4, W, 4);
  },

  mount(stage, api) {
    const { h, shuffle, norm, answerSet } = UI;
    const mode = api.opts.type || 'auto';
    const box = h('div', { class: 'rain', 'aria-label': 'Falling cards' });
    const input = h('input', {
      class: 'input', id: 'rain-input', type: 'text', autocomplete: 'off', autocapitalize: 'off',
      autocorrect: 'off', spellcheck: 'false', placeholder: 'Type an answer…', 'aria-label': 'Your answer', enterkeyhint: 'done',
    });
    stage.append(box, h('div', { class: 'rain-input' }, input));

    const items = [];
    const missed = [];
    let bag = [], score = 0, lives = 3, hits = 0, spawnIn = 0.3, elapsed = 0, running = false;

    api.stat('Score', 0);
    api.stat('Lives', lives);

    function sides(c) {
      const typeDef = mode === 'def' || (mode === 'auto' && c.def.length <= c.term.length);
      return typeDef ? { show: c.term, ans: c.def } : { show: c.def, ans: c.term };
    }

    function nextCard() {
      for (let tries = 0; tries < 3; tries++) {
        if (!bag.length) bag = shuffle(api.deck);
        const c = bag.pop();
        if (!items.some((it) => it.c === c)) return c;
      }
      return null;
    }

    function spawn() {
      if (items.length >= 5) return;
      const c = nextCard();
      if (!c) return;
      const s = sides(c);
      const el = h('div', { class: 'drop' }, s.show);
      box.append(el);
      const W = box.clientWidth;
      const w = el.offsetWidth, ht = el.offsetHeight;
      const x = 8 + Math.random() * Math.max(0, W - w - 16);
      const it = { c, el, x, y: -ht, h: ht, show: s.show, ansText: s.ans, ans: answerSet(s.ans) };
      el.style.transform = 'translate(' + x + 'px,' + it.y + 'px)';
      items.push(it);
    }

    function remove(it) {
      const i = items.indexOf(it);
      if (i >= 0) items.splice(i, 1);
    }

    function splash(show, answer) {
      const el = h('div', { class: 'splash' }, show + ' → ', h('b', null, answer));
      box.append(el);
      api.timeout(() => el.remove(), 2200);
    }

    function miss(it) {
      remove(it);
      it.el.remove();
      lives--;
      if (!missed.includes(it.c)) missed.push(it.c);
      splash(it.show, it.ansText);
      api.stat('Lives', Math.max(0, lives));
      if (lives <= 0) end();
    }

    function pop(it, H) {
      remove(it);
      hits++;
      score += 10 + Math.max(0, Math.round(10 * (1 - it.y / H)));
      api.stat('Score', score);
      it.el.classList.add('hit');
      it.el.style.transform = 'translate(' + it.x + 'px,' + (it.y - 20) + 'px) scale(1.15)';
      api.timeout(() => it.el.remove(), 280);
    }

    api.on(input, 'input', () => {
      if (!running) return;
      const v = norm(input.value);
      if (!v) return;
      const hit = items.find((it) => it.ans.has(v));
      if (hit) { pop(hit, box.clientHeight); input.value = ''; }
    });
    api.on(input, 'keydown', (e) => {
      if (e.key !== 'Enter' || !running) return;
      e.preventDefault();
      if (input.value.trim()) {
        input.classList.remove('nope');
        void input.offsetWidth;
        input.classList.add('nope');
      }
    });

    api.loop((dt) => {
      if (!running) return;
      elapsed += dt;
      const H = box.clientHeight;
      const fallTime = Math.max(5.5, 13 - elapsed * 0.06);
      const every = Math.max(1.15, 2.9 - elapsed * 0.022);
      spawnIn -= dt;
      if (spawnIn <= 0) { spawn(); spawnIn = every; }
      const v = H / fallTime;
      for (const it of items.slice()) {
        it.y += v * dt;
        it.el.style.transform = 'translate(' + it.x + 'px,' + it.y + 'px)';
        it.el.classList.toggle('near', it.y + it.h > H * 0.72);
        if (it.y + it.h >= H) { miss(it); if (!running) return; }
      }
    });

    function begin() {
      api.hideOverlay();
      running = true;
      input.focus({ preventScroll: true });
    }

    function end() {
      running = false;
      input.disabled = true;
      input.blur();
      const best = api.submit(score);
      api.overlay({
        title: best ? 'New high score' : 'Round over',
        text: score + ' points · ' + hits + (hits === 1 ? ' answer' : ' answers'),
        body: missed.length ? h('ul', { class: 'miss-list' }, missed.map((c) => h('li', null, h('b', null, c.term), h('span', null, c.def)))) : null,
        sub: 'Cards that hit the line',
        actions: [
          { label: 'Play again', primary: true, fn: api.restart },
          { label: 'Change deck', fn: api.backToSetup },
        ],
      });
    }

    api.overlay({
      title: 'Word Rain',
      text: 'Cards from “' + api.deckName + '” will fall. Type each answer before it lands.',
      sub: 'Faster answers score more. Three misses and the round ends.',
      actions: [{ label: 'Start', primary: true, fn: begin }],
    });
  },
});
