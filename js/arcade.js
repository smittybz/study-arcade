/* Arcade: game registry, the shared game shell, the games portal and game pages.

   A built-in game registers itself with:
     Arcade.register({
       id, name, kind: 'study' | 'classic', blurb, controls,
       lowerIsBetter?, fmt?(score), options?: [{ id, label, choices: [[value, label], ...] }],
       thumb(g, w, h, C, roundRect),   // draws the preview tile on a 2D canvas
       mount(stage, api)               // builds one run of the game inside `stage`
     })
   `api` cleans up every listener, timer and loop when the player leaves,
   and api.restart() mounts a fresh run.

   Games in js/library.js live in the games/ folder and play in an iframe. */
(function () {
  const { h, usable } = UI;
  const games = [];
  let C = null;

  // The lite build (the shared preview) only carries the built-in games.
  const LITE = !!window.STUDY_ARCADE_LITE;
  // Games marked localOnly are too big for the published site and only show when running on this computer.
  const LOCAL = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);

  const CATS = [
    { id: 'study', label: 'Study', color: 'var(--c-study)' },
    { id: 'action', label: 'Action', color: 'var(--c-action)' },
    { id: 'puzzle', label: 'Puzzle', color: 'var(--c-puzzle)' },
    { id: 'racing', label: 'Racing', color: 'var(--c-racing)' },
    { id: 'platformer', label: 'Platformer', color: 'var(--c-platformer)' },
    { id: 'strategy', label: 'Strategy', color: 'var(--c-strategy)' },
    { id: 'adventure', label: 'Adventure', color: 'var(--c-adventure)' },
  ];
  const BUILTIN_CAT = { match: 'study', speed: 'study', rain: 'study', snake: 'action', breakout: 'action', flap: 'action', '2048': 'puzzle', blocks: 'puzzle', mines: 'puzzle', sudoku: 'puzzle', four: 'strategy', tictactoe: 'strategy' };
  const catOf = (id) => CATS.find((c) => c.id === id) || CATS[1];

  function colors() {
    if (C) return C;
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    C = {
      bg: v('--scr-bg'), panel: v('--scr-panel'), grid: v('--scr-grid'), ink: v('--scr-ink'), dim: v('--scr-dim'),
      yellow: v('--scr-yellow'), green: v('--scr-green'), pink: v('--scr-pink'), blue: v('--scr-blue'),
      orange: v('--scr-orange'), violet: v('--scr-violet'), cyan: v('--scr-cyan'),
    };
    return C;
  }

  function roundRect(g, x, y, w, hh, r) {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, hh, r);
    else {
      g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r);
      g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
  }

  /* ---------- the catalog: every game the portal shows ---------- */
  let catalog = null;
  function allGames() {
    if (catalog) return catalog;
    const lib = window.LIBRARY || { jam: [], ext: [] };
    catalog = games.map((g) => ({
      id: g.id, name: g.name, cat: BUILTIN_CAT[g.id] || 'action', blurb: g.blurb, how: g.controls,
      type: 'builtin', href: '#play-' + g.id, game: g, decks: g.kind === 'study',
    }));
    if (!LITE) {
      // familiar games first, then the jam games
      for (const w of lib.web || []) {
        catalog.push({ ...w, type: 'web', href: '#game-' + w.id, img: 'img/web/' + w.id + '.jpg' });
      }
      for (const e of lib.ext) {
        catalog.push({ ...e, type: 'ext', href: '#game-' + e.id, img: 'img/ext/' + e.id + '.jpg', path: 'games/ext/' + e.id + '/' + e.file });
      }
      for (const j of lib.jam) {
        if (j.localOnly && !LOCAL) continue;
        catalog.push({
          ...j, type: 'jam', href: '#game-' + j.id, img: 'img/jam/' + j.id + '.png',
          path: 'games/jam/' + j.id + '/index.html', by: '100 Devs 1 Game', license: 'MIT',
          src: 'https://github.com/100-Devs-1-Game/' + j.repo, big: true,
        });
      }
    }
    return catalog;
  }

  function thumbCanvas(g, W = 320, H = 200) {
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.setAttribute('aria-hidden', 'true');
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = colors();
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    try { g.thumb(ctx, W, H, c, roundRect); } catch (e) { /* preview is decoration */ }
    return cv;
  }

  function preview(item) {
    if (item.type === 'builtin') return thumbCanvas(item.game);
    const img = h('img', { src: item.img, alt: '', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => { img.replaceWith(h('div', { class: 'thumb-fallback' }, item.name)); }, { once: true });
    return img;
  }

  function bestText(item) {
    if (item.type !== 'builtin' || item.decks) return null;
    const g = item.game;
    const b = Store.best(g.id + (g.id === 'mines' ? ':easy' : ''));
    return b == null ? null : 'Best ' + (g.fmt ? g.fmt(b) : b);
  }

  function tile(item) {
    const cat = catOf(item.cat);
    const best = bestText(item);
    return h('a', { class: 'gtile', href: item.href, style: { '--c': cat.color } },
      h('div', { class: 'gthumb' }, preview(item), h('span', { class: 'gplay', 'aria-hidden': 'true' }, 'Play')),
      h('div', { class: 'gname' }, item.name),
      h('div', { class: 'gmeta' },
        h('span', { class: 'dot', 'aria-hidden': 'true' }),
        item.decks ? 'Uses your decks' : cat.label,
        best ? h('span', { class: 'gbest' }, best) : null));
  }

  function grid(items) { return h('div', { class: 'game-grid' }, items.map(tile)); }

  /* ---------- one run of a built-in game ---------- */
  function session(game, els, setup) {
    const { stage, overlay, stats, pad } = els;
    const offs = [], loops = new Set(), ints = new Set(), touts = new Set();
    const statEls = new Map();
    let alive = true;
    let variant = setup.variant || null;
    const key = () => Store.scoreKey(game.id, variant);
    const fmt = game.fmt || ((s) => String(s));

    stage.replaceChildren();
    overlay.replaceChildren();
    overlay.hidden = true;
    pad.replaceChildren();
    pad.classList.remove('on');
    stats.replaceChildren();

    const bestEl = h('div', { class: 'stat best' }, h('small', null, 'Best'), h('b', null, '–'));
    function paintBest() { const b = Store.best(key()); bestEl.lastChild.textContent = b == null ? '–' : fmt(b); }

    const api = {
      colors: colors(),
      roundRect,
      deck: setup.cards || null,
      deckName: setup.deckName || '',
      opts: setup.opts || {},
      get alive() { return alive; },

      on(target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        offs.push(() => target.removeEventListener(type, fn, opts));
      },
      // fn(e) returns true when it used the key; the page then won't scroll
      key(fn) {
        api.on(window, 'keydown', (e) => {
          if (e.target.closest && e.target.closest('input, textarea, select')) return;
          if (fn(e)) e.preventDefault();
        });
      },
      keyUp(fn) { api.on(window, 'keyup', fn); },
      interval(fn, ms) { const id = setInterval(() => alive && fn(), ms); ints.add(id); return id; },
      clearInterval(id) { clearInterval(id); ints.delete(id); },
      timeout(fn, ms) { const id = setTimeout(() => { touts.delete(id); if (alive) fn(); }, ms); touts.add(id); return id; },
      clearTimeout(id) { clearTimeout(id); touts.delete(id); },
      loop(fn) {
        let last = performance.now(), raf, running = true;
        const step = (t) => {
          if (!running || !alive) return;
          const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
          last = t;
          fn(dt, t);
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        const ctl = { stop() { running = false; cancelAnimationFrame(raf); loops.delete(ctl); } };
        loops.add(ctl);
        return ctl;
      },

      // A crisp canvas with logical size w × h. toLocal(e) maps a pointer event into it.
      canvas(w, hgt, opt = {}) {
        const cv = document.createElement('canvas');
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(hgt * dpr);
        cv.className = 'game-canvas';
        cv.style.setProperty('--cw', (opt.max || w) + 'px');
        cv.style.aspectRatio = w + ' / ' + hgt;
        if (opt.label) cv.setAttribute('aria-label', opt.label);
        cv.setAttribute('role', 'img');
        const g = cv.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        return {
          cv, g, w, h: hgt,
          toLocal(e) {
            const r = cv.getBoundingClientRect();
            return { x: ((e.clientX - r.left) * w) / r.width, y: ((e.clientY - r.top) * hgt) / r.height };
          },
        };
      },

      stat(label, value) {
        let el = statEls.get(label);
        if (!el) {
          el = h('div', { class: 'stat' }, h('small', null, label), h('b'));
          statEls.set(label, el);
          stats.insertBefore(el, bestEl);
        }
        el.lastChild.textContent = value;
      },
      setVariant(v) { variant = v; paintBest(); },
      best() { return Store.best(key()); },
      // Saves the score if it beats the best one; returns true when it did.
      submit(score) { const better = Store.submit(key(), score, !!game.lowerIsBetter); paintBest(); return better; },
      fmt,

      overlay({ title, text, sub, body, actions = [] }) {
        const row = h('div', { class: 'btn-row' }, actions.map((a) => {
          const b = h('button', { class: 'btn' + (a.primary ? ' primary' : ''), type: 'button' }, a.label);
          b.addEventListener('click', a.fn);
          return b;
        }));
        overlay.replaceChildren(h('div', { class: 'overlay-card' },
          title ? h('h2', null, title) : null,
          text ? h('p', null, text) : null,
          body || null,
          sub ? h('p', { class: 'sub' }, sub) : null,
          actions.length ? row : null));
        overlay.hidden = false;
        const first = row.querySelector('.primary') || row.firstChild;
        if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
      },
      hideOverlay() { overlay.hidden = true; overlay.replaceChildren(); },
      get overlayOpen() { return !overlay.hidden; },

      // Touch buttons, shown only on touch screens. hold: repeats while pressed.
      pad(buttons) {
        pad.classList.add('on');
        for (const b of buttons) {
          const el = h('button', { type: 'button', 'aria-label': b.aria || b.label }, b.label);
          let rep, first;
          const stop = () => { clearTimeout(first); clearInterval(rep); };
          el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            b.fn();
            if (b.hold) { first = setTimeout(() => { rep = setInterval(b.fn, 70); }, 220); }
          });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => el.addEventListener(t, stop));
          offs.push(stop);
          pad.append(el);
        }
      },

      // Swipe gestures on an element: fn('left'|'right'|'up'|'down'|'tap')
      swipe(el, fn) {
        let sx = 0, sy = 0, active = false;
        api.on(el, 'pointerdown', (e) => { active = true; sx = e.clientX; sy = e.clientY; });
        api.on(el, 'pointerup', (e) => {
          if (!active) return;
          active = false;
          const dx = e.clientX - sx, dy = e.clientY - sy;
          const ax = Math.abs(dx), ay = Math.abs(dy);
          if (Math.max(ax, ay) < 22) return fn('tap', e);
          if (ax > ay) fn(dx > 0 ? 'right' : 'left', e);
          else fn(dy > 0 ? 'down' : 'up', e);
        });
        api.on(el, 'pointercancel', () => { active = false; });
      },

      restart() { setup.restart(); },
      backToSetup: setup.backToSetup || null,
    };

    stats.append(bestEl);
    paintBest();

    const cleanup = game.mount(stage, api);

    return function destroy() {
      alive = false;
      try { if (typeof cleanup === 'function') cleanup(); } catch (e) { /* ignore */ }
      offs.forEach((f) => f());
      loops.forEach((l) => l.stop());
      ints.forEach((id) => clearInterval(id));
      touts.forEach((id) => clearTimeout(id));
    };
  }

  function moreGames(item) {
    const same = allGames().filter((x) => x.id !== item.id && x.cat === item.cat);
    const others = UI.shuffle(allGames().filter((x) => x.id !== item.id && x.cat !== item.cat));
    const pick = same.concat(others).slice(0, 6);
    return h('section', { class: 'section more-games' },
      h('div', { class: 'section-head' }, h('h2', null, 'More games'), h('a', { class: 'see-all', href: '#games' }, 'See all games')),
      grid(pick));
  }

  function notFound(main) {
    main.append(h('section', { class: 'page' }, h('div', { class: 'empty panel' },
      h('p', null, 'That game isn’t here.'), h('a', { class: 'btn primary', href: '#games' }, 'See all games'))));
  }

  /* ---------- built-in game page ---------- */
  function play(main, id) {
    const game = games.find((g) => g.id === id);
    if (!game) return notFound(main);
    const item = allGames().find((x) => x.id === id);

    const stats = h('div', { class: 'stats' });
    const stage = h('div', { class: 'stage' });
    const overlay = h('div', { class: 'overlay', hidden: true });
    const pad = h('div', { class: 'touchpad' });
    const els = { stage, overlay, stats, pad };
    let destroy = null;

    main.append(h('section', { class: 'play' },
      h('div', { class: 'play-head' },
        h('a', { class: 'back', href: '#games' }, '← All games'),
        h('div', { class: 'play-title-row' }, h('h1', { class: 'play-title' }, game.name), stats)),
      h('div', { class: 'stage-wrap' }, stage, overlay),
      pad,
      h('p', { class: 'controls-hint' }, game.controls)),
      moreGames(item));

    let lastSetup = null;
    function run(setup) {
      if (destroy) destroy();
      lastSetup = setup;
      destroy = session(game, els, {
        ...setup,
        restart: () => run(lastSetup),
        backToSetup: game.kind === 'study' ? showSetup : null,
      });
    }

    function showSetup() {
      if (destroy) { destroy(); destroy = null; }
      stage.replaceChildren();
      overlay.hidden = true;
      pad.classList.remove('on');
      stats.replaceChildren();
      const decks = Store.decks.filter((d) => usable(d).length >= 4);
      if (!decks.length) {
        stage.append(h('div', { class: 'setup' },
          h('h2', null, 'Pick a deck first'),
          h('p', null, game.name + ' quizzes you on your own flashcards. Make a deck with at least 4 cards, then come back.'),
          h('a', { class: 'btn primary', href: '#decks' }, 'Go to my flashcards')));
        return;
      }
      const pre = Store.pref('arcadeDeck');
      const sel = h('select', { class: 'select', id: 'deck-pick' },
        decks.map((d) => h('option', { value: d.id }, (d.name || 'Untitled deck') + ' · ' + usable(d).length + ' cards')));
      if (decks.some((d) => d.id === pre)) sel.value = pre;

      const opts = {};
      const optEls = (game.options || []).map((o) => {
        opts[o.id] = Store.pref(game.id + '.' + o.id) || o.choices[0][0];
        const seg = h('div', { class: 'seg', role: 'group', 'aria-label': o.label });
        o.choices.forEach(([val, lab]) => {
          const b = h('button', { type: 'button', 'aria-pressed': String(opts[o.id] === val) }, lab);
          b.addEventListener('click', () => {
            opts[o.id] = val;
            [...seg.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          });
          seg.append(b);
        });
        return h('div', { class: 'field' }, h('label', null, o.label), seg);
      });

      const go = h('button', { class: 'btn primary', type: 'button' }, 'Start');
      go.addEventListener('click', () => {
        const d = Store.deck(sel.value);
        if (!d) return;
        Store.pref('arcadeDeck', d.id);
        for (const k of Object.keys(opts)) Store.pref(game.id + '.' + k, opts[k]);
        run({ cards: usable(d), deckName: d.name || 'Untitled deck', variant: d.id, opts: { ...opts } });
      });
      stage.append(h('div', { class: 'setup' },
        h('h2', null, game.name),
        h('p', null, game.blurb),
        h('div', { class: 'field' }, h('label', { for: 'deck-pick' }, 'Deck'), sel),
        optEls,
        go));
      requestAnimationFrame(() => go.focus({ preventScroll: true }));
    }

    if (game.kind === 'study') showSetup();
    else run({});

    return () => { if (destroy) destroy(); };
  }

  /* ---------- library game page (plays in an iframe) ---------- */
  function libraryGame(main, id) {
    const item = allGames().find((x) => x.id === id && x.type !== 'builtin');
    if (!item) return notFound(main);
    const cat = catOf(item.cat);

    // Fixed-size games (frame: [width, height]) are drawn at their real size and scaled to fit the screen.
    // Games that resize themselves fill a 16:9 screen.
    const native = item.frame || null;
    const aspect = native ? native[0] / native[1] : 16 / 9;
    const screen = h('div', { class: 'gp-screen' + (native ? ' fixed' : '') });
    const fsBtn = h('button', { class: 'btn sm', type: 'button', hidden: true }, 'Full screen');
    let frame = null;
    const isFull = () => document.fullscreenElement === screen || document.webkitFullscreenElement === screen;

    function layout() {
      if (!screen.isConnected) return;
      const full = isFull();
      const cap = parseFloat(getComputedStyle(screen).maxWidth) || 1000;
      const availW = full ? window.innerWidth : Math.min(screen.parentElement.clientWidth, cap);
      const availH = full ? window.innerHeight : Math.max(240, window.innerHeight - 200);
      let w = availW, hh = w / aspect;
      if (hh > availH) { hh = availH; w = hh * aspect; }
      w = Math.floor(w); hh = Math.floor(hh);
      screen.style.width = full ? '' : w + 'px';
      screen.style.height = full ? '' : hh + 'px';
      if (frame && native) {
        const k = w / native[0];
        const boxW = full ? window.innerWidth : w, boxH = full ? window.innerHeight : hh;
        Object.assign(frame.style, {
          width: native[0] + 'px',
          height: native[1] + 'px',
          transform: 'scale(' + k + ')',
          left: Math.round((boxW - native[0] * k) / 2) + 'px',
          top: Math.round((boxH - native[1] * k) / 2) + 'px',
        });
      }
    }
    window.addEventListener('resize', layout);
    document.addEventListener('fullscreenchange', layout);
    document.addEventListener('webkitfullscreenchange', layout);

    function load() {
      // Games that need cross-origin isolation can't run inside this page, so they open in the full window.
      if (item.threads) { location.assign(item.path); return; }
      frame = h('iframe', {
        src: item.url || item.path,
        title: item.name,
        allow: item.url ? 'autoplay; fullscreen; gamepad' : 'autoplay; fullscreen; gamepad; cross-origin-isolated',
        allowfullscreen: true,
        scrolling: item.url ? 'no' : null,
      });
      screen.replaceChildren(frame);
      screen.classList.add('live');
      layout();
      fsBtn.hidden = false;
      frame.addEventListener('load', () => { try { frame.contentWindow.focus(); } catch (e) { /* ignore */ } });
      frame.focus();
    }
    fsBtn.addEventListener('click', () => {
      const req = screen.requestFullscreen || screen.webkitRequestFullscreen;
      if (req) Promise.resolve(req.call(screen)).catch(() => {});
    });

    const playBtn = h('button', { class: 'big-play', type: 'button', 'aria-label': 'Play ' + item.name },
      h('span', { class: 'tri', 'aria-hidden': 'true' }), 'Play');
    playBtn.addEventListener('click', load);
    screen.append(
      h('img', { class: 'gp-poster', src: item.img, alt: '' }),
      h('div', { class: 'gp-shade' },
        playBtn,
        item.note ? h('p', { class: 'gp-note' }, item.note)
          : item.threads ? h('p', { class: 'gp-note' }, 'Opens in the full window. Use your browser’s Back button to come back.')
          : item.big ? h('p', { class: 'gp-note' }, 'Big game. It can take a few seconds to load.') : null));

    main.append(h('section', { class: 'play wide' },
      h('div', { class: 'play-head' },
        h('a', { class: 'back', href: '#games' }, '← All games'),
        h('div', { class: 'play-title-row' },
          h('div', { class: 'gp-title' },
            h('h1', { class: 'play-title' }, item.name),
            h('span', { class: 'cat-chip', style: { '--c': cat.color } }, cat.label)),
          fsBtn)),
      screen,
      h('div', { class: 'gp-info' },
        h('div', null, h('h2', null, 'About this game'), h('p', null, item.blurb)),
        h('div', null, h('h2', null, 'How to play'), h('p', null, item.how)),
        h('p', { class: 'gp-credit' }, 'Made by ' + item.by + (item.via ? ' · Embedded from ' + item.via : '') + ' · ', h('a', { href: '#about' }, 'Credits')))),
      moreGames(item));
    layout();

    return () => {
      window.removeEventListener('resize', layout);
      document.removeEventListener('fullscreenchange', layout);
      document.removeEventListener('webkitfullscreenchange', layout);
      if (frame) frame.src = 'about:blank';
    };
  }

  /* ---------- the games portal ---------- */
  function page(main) {
    const items = allGames();
    let cat = Store.pref('portalCat') || 'all';
    if (cat !== 'all' && !items.some((x) => x.cat === cat)) cat = 'all';
    let query = '';

    // a featured game that changes each day
    const featurable = items.filter((x) => x.type !== 'builtin' || !x.decks);
    const day = Math.floor(Date.now() / 86400000);
    const feat = featurable[day % featurable.length];
    const featCat = catOf(feat.cat);
    const hero = h('a', { class: 'feature', href: feat.href, style: { '--c': featCat.color } },
      h('div', { class: 'feature-thumb' }, feat.type === 'builtin' ? thumbCanvas(feat.game, 640, 400) : h('img', { src: feat.img, alt: '' })),
      h('div', { class: 'feature-body' },
        h('span', { class: 'eyebrow' }, 'Game of the day'),
        h('h2', null, feat.name),
        h('p', null, feat.blurb),
        h('span', { class: 'btn hi' }, 'Play now')));

    const search = h('input', { class: 'input search', id: 'game-search', type: 'search', placeholder: 'Search ' + items.length + ' games', 'aria-label': 'Search games', autocomplete: 'off' });
    const catbar = h('div', { class: 'catbar', role: 'group', 'aria-label': 'Categories' });
    const body = h('div', { class: 'portal-body' });

    const counts = {};
    items.forEach((x) => { counts[x.cat] = (counts[x.cat] || 0) + 1; });
    const pills = [{ id: 'all', label: 'All games', color: 'var(--ink)' }, ...CATS.filter((c) => counts[c.id])];
    const pillEls = {};
    for (const c of pills) {
      const b = h('button', { class: 'cat-pill', type: 'button', style: { '--c': c.color }, 'aria-pressed': String(c.id === cat) },
        c.label, h('span', { class: 'count' }, c.id === 'all' ? items.length : counts[c.id]));
      b.addEventListener('click', () => {
        cat = c.id;
        Store.pref('portalCat', cat);
        [...catbar.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        draw();
      });
      pillEls[c.id] = b;
      catbar.append(b);
    }

    function draw() {
      const q = query.trim().toLowerCase();
      if (q) {
        const found = items.filter((x) => (x.name + ' ' + x.blurb + ' ' + catOf(x.cat).label).toLowerCase().includes(q));
        body.replaceChildren(found.length
          ? h('section', { class: 'section' }, h('div', { class: 'section-head' }, h('h2', null, found.length + (found.length === 1 ? ' game' : ' games') + ' found')), grid(found))
          : h('div', { class: 'empty panel' }, h('p', null, 'No games match “' + query.trim() + '”. Try another word.')));
        return;
      }
      if (cat !== 'all') {
        const c = catOf(cat);
        body.replaceChildren(h('section', { class: 'section', style: { '--c': c.color } },
          h('div', { class: 'section-head' }, h('h2', { class: 'cat-title' }, c.label + ' games')),
          cat === 'study' ? h('p', { class: 'lede' }, 'Match Up, Speed Round and Word Rain quiz you on your own flashcards.') : null,
          grid(items.filter((x) => x.cat === cat))));
        return;
      }
      body.replaceChildren(...CATS.filter((c) => counts[c.id]).map((c) => {
        const list = items.filter((x) => x.cat === c.id);
        const more = h('button', { class: 'see-all', type: 'button' }, 'See all ' + list.length);
        more.addEventListener('click', () => { pillEls[c.id].click(); catbar.scrollIntoView({ block: 'start' }); });
        return h('section', { class: 'section', style: { '--c': c.color } },
          h('div', { class: 'section-head' }, h('h2', { class: 'cat-title' }, c.label + ' games'), list.length > 6 ? more : null),
          grid(list.slice(0, 12)));
      }));
    }
    search.addEventListener('input', () => { query = search.value; draw(); });

    main.append(h('section', { class: 'page portal' },
      hero,
      h('div', { class: 'portal-tools' }, catbar, search),
      body,
      h('a', { class: 'study-banner', href: '#decks' },
        h('div', null, h('h2', null, 'Make your own flashcards'), h('p', null, 'Type in a deck, study it, then play Match Up, Speed Round or Word Rain with it.')),
        h('span', { class: 'btn primary' }, 'Open flashcards'))));
    draw();
  }

  window.Arcade = { games, register(g) { games.push(g); }, page, play, libraryGame, colors, roundRect, allGames, catOf };
})();
