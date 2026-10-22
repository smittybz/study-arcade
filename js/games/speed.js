/* Speed Round: 60 seconds of multiple choice. Streaks raise your multiplier. */
Arcade.register({
  id: 'speed',
  name: 'Speed Round',
  kind: 'study',
  blurb: 'Sixty seconds of multiple choice. Three right in a row raises your multiplier.',
  controls: 'Click an answer or press 1 to 4. A wrong answer resets your streak and costs time.',
  options: [
    { id: 'prompt', label: 'Questions show', choices: [['term', 'Terms'], ['def', 'Definitions']] },
  ],

  thumb(g, W, H, C, rr) {
    g.fillStyle = C.panel;
    rr(g, 20, 18, W - 40, 8, 4); g.fill();
    g.fillStyle = C.yellow;
    rr(g, 20, 18, (W - 40) * 0.62, 8, 4); g.fill();
    g.fillStyle = '#FFFFFF';
    rr(g, 20, 40, W - 40, 54, 8); g.fill();
    g.fillStyle = '#9AA6C4';
    g.fillRect(W / 2 - 50, 62, 100, 8);
    const cw = (W - 50) / 2;
    [[0, 0, C.green], [1, 0, null], [0, 1, null], [1, 1, null]].forEach(([cx, cy, col]) => {
      const x = 20 + cx * (cw + 10), y = 106 + cy * 40;
      g.fillStyle = col || C.grid;
      rr(g, x, y, cw, 32, 6); g.fill();
    });
    g.fillStyle = C.yellow;
    g.font = '700 22px Bungee, Impact, sans-serif';
    g.textAlign = 'right';
    g.fillText('×3', W - 24, H - 12);
  },

  mount(stage, api) {
    const { h, shuffle, rand } = UI;
    const cards = api.deck;
    const swap = api.opts.prompt === 'def';
    const DURATION = 60;
    const ask = (c) => (swap ? c.def : c.term);
    const ans = (c) => (swap ? c.term : c.def);

    const bar = h('span');
    const qLabel = h('span', { class: 'face-label' }, swap ? 'Which term matches?' : 'What does this mean?');
    const qText = h('div', { class: 'face-text' });
    const choices = h('div', { class: 'choices' });
    stage.append(h('div', { class: 'speed' },
      h('div', { class: 'timebar' }, bar),
      h('div', { class: 'index-card quiz-q' }, qLabel, qText),
      choices));

    let score = 0, streak = 0, mult = 1, correct = 0, total = 0, running = false, locked = false, last = null, t0 = 0, current = null;
    const missed = [];

    function stats(timeLeft) {
      api.stat('Time', Math.ceil(timeLeft));
      api.stat('Score', score);
      api.stat('Streak', '×' + mult);
    }
    stats(DURATION);

    function next() {
      let c;
      do { c = cards[rand(cards.length)]; } while (cards.length > 1 && c === last);
      last = c;
      current = c;
      const prompt = ask(c);
      qText.textContent = prompt;
      qText.classList.toggle('long', prompt.length > 60);
      const seen = new Set([ans(c).trim().toLowerCase()]);
      const wrong = [];
      for (const x of shuffle(cards)) {
        const a = ans(x).trim().toLowerCase();
        if (!seen.has(a)) { seen.add(a); wrong.push(x); }
        if (wrong.length === 3) break;
      }
      const opts = shuffle([c, ...wrong]);
      const right = opts.indexOf(c);
      choices.replaceChildren(...opts.map((x, i) => {
        const b = h('button', { class: 'choice', type: 'button' }, h('kbd', null, String(i + 1)), h('span', null, ans(x)));
        b.addEventListener('click', () => answer(i, right));
        return b;
      }));
    }

    function answer(i, right) {
      if (!running || locked) return;
      locked = true;
      total++;
      const btns = [...choices.children];
      btns.forEach((b) => { b.disabled = true; });
      btns[right].classList.add('right');
      if (i === right) {
        correct++;
        streak++;
        mult = Math.min(4, 1 + Math.floor(streak / 3));
        score += 100 * mult;
        api.timeout(() => { locked = false; if (running) next(); }, 220);
      } else {
        btns[i].classList.add('wrong');
        streak = 0;
        mult = 1;
        if (!missed.includes(current)) missed.push(current);
        api.timeout(() => { locked = false; if (running) next(); }, 900);
      }
      api.stat('Score', score);
      api.stat('Streak', '×' + mult);
    }

    api.loop(() => {
      if (!running) return;
      const left = Math.max(0, DURATION - (performance.now() - t0) / 1000);
      bar.style.transform = 'scaleX(' + left / DURATION + ')';
      api.stat('Time', Math.ceil(left));
      if (left <= 0) end();
    });

    api.key((e) => {
      const n = Number(e.key);
      if (running && n >= 1 && n <= 4 && choices.children[n - 1]) { choices.children[n - 1].click(); return true; }
      return false;
    });

    function begin() {
      api.hideOverlay();
      running = true;
      t0 = performance.now();
      next();
    }

    function end() {
      running = false;
      [...choices.children].forEach((b) => { b.disabled = true; });
      const best = api.submit(score);
      api.overlay({
        title: best ? 'New high score' : 'Time',
        text: score + ' points · ' + correct + ' of ' + total + ' right',
        body: missed.length
          ? h('ul', { class: 'miss-list' }, missed.slice(0, 6).map((c) => h('li', null, h('b', null, c.term), h('span', null, c.def))))
          : null,
        sub: missed.length ? 'Cards to review' : (total ? 'No misses this round.' : null),
        actions: [
          { label: 'Play again', primary: true, fn: api.restart },
          { label: 'Change deck', fn: api.backToSetup },
        ],
      });
    }

    qText.textContent = 'Ready?';
    api.overlay({
      title: 'Speed Round',
      text: '60 seconds on “' + api.deckName + '”.',
      sub: 'Right answers are worth 100 points, times your streak multiplier (up to ×4).',
      actions: [{ label: 'Start', primary: true, fn: begin }],
    });
  },
});
