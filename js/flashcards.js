/* Flashcard views: deck list, deck editor, study (flip cards) and quiz. */
(function () {
  const { h, shuffle, toast, armConfirm, usable, copyText } = UI;

  const ICON_X = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function tabVar(d) { return 'var(--tab' + (d.tab || 1) + ')'; }
  function known(d) { return d.cards.filter((c) => c.k === 1).length; }

  function notFound(main) {
    main.append(h('section', { class: 'page' },
      h('div', { class: 'empty panel' },
        h('p', null, 'That deck isn’t here anymore.'),
        h('a', { class: 'btn primary', href: '#decks' }, 'See all decks'))));
  }

  /* ---------------- deck list ---------------- */
  function list(main) {
    const decks = Store.decks;
    const grid = h('div', { class: 'deck-grid' });

    for (const d of decks) {
      const n = usable(d).length;
      const k = known(d);
      const stack = d.cards.length >= 10 ? 'stack-2' : d.cards.length >= 4 ? 'stack-1' : '';
      grid.append(h('article', { class: 'deck index-card ' + stack, style: { '--tab': tabVar(d) } },
        h('div', { class: 'deck-tab' }, d.sample ? 'Sample' : n + (n === 1 ? ' card' : ' cards')),
        h('h2', { class: 'deck-name' }, d.name || 'Untitled deck'),
        h('p', { class: 'deck-meta' },
          h('span', null, n + (n === 1 ? ' card' : ' cards')),
          h('span', { 'aria-hidden': 'true' }, '·'),
          h('span', null, k + ' known')),
        h('div', { class: 'mastery', role: 'img', 'aria-label': k + ' of ' + n + ' known' },
          h('span', { style: { width: (n ? Math.round((k / n) * 100) : 0) + '%' } })),
        h('div', { class: 'deck-actions' },
          h('a', { class: 'btn primary', href: '#study-' + d.id, 'aria-disabled': n ? null : 'true' }, 'Study'),
          h('a', { class: 'btn', href: '#quiz-' + d.id, 'aria-disabled': n >= 4 ? null : 'true', title: n >= 4 ? null : 'Quizzes need 4 cards' }, 'Quiz'),
          h('a', { class: 'btn ghost', href: '#edit-' + d.id }, 'Edit'))));
    }

    const add = h('button', { class: 'new-deck', type: 'button' },
      h('span', { class: 'plus', 'aria-hidden': 'true' }, '+'),
      h('span', null, 'New deck'));
    add.addEventListener('click', () => { const d = Store.addDeck(''); location.hash = 'edit-' + d.id; });
    grid.append(add);

    // backup / restore
    const out = h('textarea', { class: 'textarea', id: 'backup-out', rows: '5', readonly: true, hidden: true, 'aria-label': 'Backup text' });
    const copyBtn = h('button', { class: 'btn', type: 'button' }, 'Copy backup');
    copyBtn.addEventListener('click', async () => {
      const ok = await copyText(Store.exportJSON(), out);
      toast(ok ? 'Backup copied. Paste it somewhere safe.' : 'Select the text below and copy it.');
    });
    const fileIn = h('input', { type: 'file', id: 'backup-file', accept: '.json,application/json,text/plain', class: 'input' });
    const pasteIn = h('textarea', { class: 'textarea', id: 'backup-in', rows: '4', placeholder: 'Paste a backup here' });
    const restoreBtn = h('button', { class: 'btn primary', type: 'button' }, 'Add decks from backup');
    const msg = h('p', { class: 'save-state', role: 'status' });
    fileIn.addEventListener('change', () => {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => { pasteIn.value = String(r.result || ''); };
      r.readAsText(f);
    });
    restoreBtn.addEventListener('click', () => {
      try {
        const n = Store.importJSON(pasteIn.value.trim(), 'merge');
        toast('Added ' + n + (n === 1 ? ' deck' : ' decks') + '.');
        Router.render();
      } catch (e) { msg.textContent = e.message; }
    });

    const backup = h('details', { class: 'panel' },
      h('summary', null, 'Back up or move your decks'),
      h('div', { class: 'panel-body' },
        h('p', null, 'Decks are saved in this browser only. Copy a backup to keep them safe or move them to another device, then paste it back here.'),
        h('div', { class: 'btn-row' }, copyBtn),
        out,
        h('div', { class: 'field' }, h('label', { for: 'backup-file' }, 'Open a backup file'), fileIn),
        h('div', { class: 'field' }, h('label', { for: 'backup-in' }, 'Or paste backup text'), pasteIn),
        h('div', { class: 'btn-row' }, restoreBtn),
        msg));

    const restore = h('button', { class: 'btn', type: 'button' }, 'Add sample decks');
    restore.addEventListener('click', () => { Store.restoreSamples(); Router.render(); });

    main.append(h('section', { class: 'page' },
      h('header', { class: 'page-head' },
        h('div', null,
          h('h1', null, 'Flashcards'),
          h('p', { class: 'lede' }, 'Flip through a deck, quiz yourself, then use the same deck in Match Up, Speed Round and Word Rain.')),
        h('a', { class: 'btn hi', href: '#games' }, 'Play games')),
      decks.length ? null : h('div', { class: 'empty panel' }, h('p', null, 'No decks yet. Make your first one, or bring back the samples.'), restore),
      grid,
      backup));
  }

  /* ---------------- editor ---------------- */
  function edit(main, id) {
    const d = Store.deck(id);
    if (!d) return notFound(main);

    const status = h('span', { class: 'save-state', role: 'status' }, 'Changes save automatically');
    let saveT;
    function saveSoon() {
      clearTimeout(saveT);
      status.textContent = 'Saving…';
      saveT = setTimeout(() => { Store.save(); status.textContent = 'Saved'; }, 300);
    }

    const name = h('input', { class: 'input deck-name-input', id: 'deck-name', value: d.name, placeholder: 'Deck name, like “Chapter 4 vocab”', maxlength: '120', autocomplete: 'off' });
    name.addEventListener('input', () => { d.name = name.value; saveSoon(); });

    const picker = h('fieldset', { class: 'tab-picker' }, h('legend', null, 'Tab color'));
    for (let i = 1; i <= Store.TABS; i++) {
      const input = h('input', { type: 'radio', name: 'tab', id: 'tab-' + i, value: String(i), 'aria-label': 'Color ' + i });
      if (d.tab === i) input.checked = true;
      input.addEventListener('change', () => { d.tab = i; saveSoon(); });
      picker.append(h('label', { for: 'tab-' + i }, input, h('span', { style: { '--tab': 'var(--tab' + i + ')' } })));
    }

    const rows = h('ol', { class: 'card-rows' });
    function renumber() { [...rows.children].forEach((li, i) => { li.querySelector('.num').textContent = i + 1; }); }
    function autoGrow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 240) + 'px'; }
    function row(c) {
      const term = h('textarea', { class: 'textarea term', id: 't-' + c.id, rows: '1', placeholder: 'Term', 'aria-label': 'Term' }, c.term);
      const def = h('textarea', { class: 'textarea def', id: 'd-' + c.id, rows: '1', placeholder: 'Definition', 'aria-label': 'Definition' }, c.def);
      term.addEventListener('input', () => { c.term = term.value; autoGrow(term); saveSoon(); });
      def.addEventListener('input', () => { c.def = def.value; autoGrow(def); saveSoon(); });
      // Tab out of the last definition adds a new card, like most flashcard editors.
      def.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey && li === rows.lastElementChild) { e.preventDefault(); addCard(true); }
      });
      const del = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Delete card', html: ICON_X });
      del.addEventListener('click', () => {
        d.cards = d.cards.filter((x) => x !== c);
        li.remove();
        renumber();
        saveSoon();
      });
      const li = h('li', { class: 'card-row' }, h('span', { class: 'num' }), term, def, del);
      requestAnimationFrame(() => { autoGrow(term); autoGrow(def); });
      return li;
    }
    d.cards.forEach((c) => rows.append(row(c)));
    renumber();

    function addCard(focus) {
      const c = Store.newCard('', '');
      d.cards.push(c);
      const li = row(c);
      rows.append(li);
      renumber();
      saveSoon();
      if (focus) li.querySelector('.term').focus();
    }
    const addBtn = h('button', { class: 'btn', type: 'button' }, '+ Add card');
    addBtn.addEventListener('click', () => addCard(true));

    // bulk add
    const bulk = h('textarea', { class: 'textarea', id: 'bulk-text', rows: '5', placeholder: 'hola - hello\ngracias - thank you\nperro: dog' });
    const bulkBtn = h('button', { class: 'btn primary', type: 'button' }, 'Add these cards');
    bulkBtn.addEventListener('click', () => {
      const lines = bulk.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let added = 0;
      for (const line of lines) {
        const m = line.match(/^(.+?)(?:\t| [-–—=] |\s*:\s+|\s*:\s*(?=\S))(.+)$/);
        if (!m) continue;
        const c = Store.newCard(m[1].trim(), m[2].trim());
        d.cards.push(c);
        rows.append(row(c));
        added++;
      }
      // drop blank starter rows once real cards exist
      if (added) {
        for (const c of d.cards.slice()) {
          if (!c.term.trim() && !c.def.trim() && d.cards.length > 1) {
            d.cards = d.cards.filter((x) => x !== c);
            const el = document.getElementById('t-' + c.id);
            if (el) el.closest('li').remove();
          }
        }
      }
      renumber();
      saveSoon();
      bulk.value = '';
      toast(added ? 'Added ' + added + (added === 1 ? ' card.' : ' cards.') : 'No cards found. Put a tab, “ - ” or “:” between each term and definition.');
    });

    const del = h('button', { class: 'btn danger', type: 'button' }, 'Delete deck');
    armConfirm(del, 'Click again to delete', () => {
      Store.removeDeck(d.id);
      toast('Deck deleted.');
      location.hash = 'decks';
    });

    main.append(h('section', { class: 'page' },
      h('a', { class: 'back', href: '#decks' }, '← All decks'),
      h('div', { class: 'editor-top' },
        h('div', { class: 'field' }, h('label', { for: 'deck-name' }, 'Deck name'), name),
        picker),
      rows,
      h('div', { class: 'btn-row' }, addBtn),
      h('details', { class: 'panel' },
        h('summary', null, 'Paste a list of cards'),
        h('div', { class: 'panel-body' },
          h('p', null, 'One card per line. Put a tab, a dash with spaces around it, or a colon between the term and the definition. Copying two columns from a spreadsheet works too.'),
          bulk,
          h('div', { class: 'btn-row' }, bulkBtn))),
      h('div', { class: 'editor-foot' },
        h('div', { class: 'btn-row' },
          h('a', { class: 'btn primary', href: '#study-' + d.id }, 'Study this deck'),
          status),
        del)));

    if (!d.name) name.focus();

    return () => {
      clearTimeout(saveT);
      // Leaving the editor: drop fully blank cards and name untitled decks.
      if (Store.deck(d.id)) {
        d.cards = d.cards.filter((c) => c.term.trim() || c.def.trim());
        if (!d.name.trim()) d.name = 'Untitled deck';
        d.sample = false;
        Store.save();
      }
    };
  }

  /* ---------------- study ---------------- */
  function study(main, id) {
    const d = Store.deck(id);
    if (!d) return notFound(main);
    const all = usable(d);
    if (!all.length) {
      main.append(h('section', { class: 'page study' },
        h('a', { class: 'back', href: '#decks' }, '← All decks'),
        h('div', { class: 'empty panel' },
          h('p', null, 'This deck has no finished cards yet. Each card needs a term and a definition.'),
          h('a', { class: 'btn primary', href: '#edit-' + d.id }, 'Add cards'))));
      return;
    }

    let shuffled = Store.pref('shuffle') !== false;
    let swap = !!Store.pref('swap');
    let queue, idx, results, flipped;

    const shuffleBtn = h('button', { class: 'toggle', type: 'button', 'aria-pressed': String(shuffled) }, 'Shuffle');
    const swapBtn = h('button', { class: 'toggle', type: 'button', 'aria-pressed': String(swap) }, 'Definition first');
    const track = h('div', { class: 'progress-track', 'aria-hidden': 'true' });
    const label = h('span', { class: 'progress-label' });

    const frontLabel = h('span', { class: 'face-label' });
    const backLabel = h('span', { class: 'face-label' });
    const frontText = h('div', { class: 'face-text' });
    const backText = h('div', { class: 'face-text' });
    const inner = h('div', { class: 'flip-inner' },
      h('div', { class: 'face front' }, frontLabel, frontText),
      h('div', { class: 'face back lined' }, backLabel, backText));
    const flip = h('div', { class: 'flip', tabindex: '0', role: 'button', 'aria-label': 'Flip card' }, inner);
    const hint = h('p', { class: 'hint' }, 'Click the card or press Space to flip. Press 1 or 2 to mark it.');
    const missBtn = h('button', { class: 'btn miss', type: 'button' }, 'Still learning ', h('kbd', null, '1'));
    const hitBtn = h('button', { class: 'btn hit', type: 'button' }, 'Got it ', h('kbd', null, '2'));
    const judge = h('div', { class: 'judge' }, missBtn, hitBtn);
    const undoBtn = h('button', { class: 'btn ghost sm', type: 'button' }, '← Previous card');
    const cardArea = h('div', { class: 'page', style: { gap: '14px' } }, flip, hint, judge, h('div', { class: 'btn-row', style: { justifyContent: 'center' } }, undoBtn));
    const summary = h('div', { class: 'summary index-card', hidden: true });

    function start(cards) {
      queue = shuffled ? shuffle(cards) : cards.slice();
      idx = 0;
      results = [];
      summary.hidden = true;
      cardArea.hidden = false;
      show(false);
    }

    function setText(el, text) {
      el.textContent = text;
      el.classList.toggle('long', text.length > 60);
    }

    function show(animate) {
      const c = queue[idx];
      // turn the card face-up without animating, so the next answer isn't revealed
      inner.style.transition = 'none';
      flipped = false;
      flip.classList.remove('flipped');
      void inner.offsetWidth;
      inner.style.transition = '';
      const [a, b] = swap ? [c.def, c.term] : [c.term, c.def];
      frontLabel.textContent = swap ? 'Definition' : 'Term';
      backLabel.textContent = swap ? 'Term' : 'Definition';
      setText(frontText, a);
      setText(backText, b);
      if (animate) { flip.classList.remove('deal'); void flip.offsetWidth; flip.classList.add('deal'); }
      label.textContent = 'Card ' + (idx + 1) + ' of ' + queue.length;
      track.replaceChildren(...queue.map((_, i) => h('span', { class: i < results.length ? (results[i] ? 'hit' : 'miss') : i === idx ? 'now' : '' })));
      undoBtn.disabled = idx === 0;
    }

    function doFlip() { flipped = !flipped; flip.classList.toggle('flipped', flipped); }

    function mark(gotIt) {
      if (cardArea.hidden) return;
      const c = queue[idx];
      c.k = gotIt ? 1 : 0;
      Store.save();
      results[idx] = gotIt;
      idx++;
      if (idx >= queue.length) finish();
      else show(true);
    }

    function undo() {
      if (idx === 0 || cardArea.hidden) return;
      idx--;
      results.length = idx;
      show(true);
    }

    function finish() {
      cardArea.hidden = true;
      const missed = queue.filter((_, i) => !results[i]);
      const got = queue.length - missed.length;
      label.textContent = 'Done';
      track.replaceChildren(...queue.map((_, i) => h('span', { class: results[i] ? 'hit' : 'miss' })));
      const again = h('button', { class: 'btn primary', type: 'button' }, 'Study the ' + missed.length + ' I missed');
      again.addEventListener('click', () => start(missed));
      const restart = h('button', { class: 'btn', type: 'button' }, 'Start over');
      restart.addEventListener('click', () => start(all));
      const toMatch = h('a', { class: 'btn hi', href: '#play-match' }, 'Play Match Up with this deck');
      toMatch.addEventListener('click', () => Store.pref('arcadeDeck', d.id));
      summary.replaceChildren(
        h('p', { class: 'eyebrow' }, 'Round complete'),
        h('p', { class: 'big-score' }, got, h('small', null, ' of ' + queue.length + ' known')),
        missed.length ? h('ul', { class: 'miss-list' }, missed.map((c) => h('li', null, h('b', null, c.term), h('span', null, c.def)))) : h('p', null, 'Every card, first try. Nice.'),
        h('div', { class: 'btn-row' },
          missed.length ? again : null,
          restart,
          all.length >= 4 ? h('a', { class: 'btn', href: '#quiz-' + d.id }, 'Take the quiz') : null,
          all.length >= 4 ? toMatch : null));
      summary.hidden = false;
    }

    flip.addEventListener('click', doFlip);
    missBtn.addEventListener('click', () => mark(false));
    hitBtn.addEventListener('click', () => mark(true));
    undoBtn.addEventListener('click', undo);
    shuffleBtn.addEventListener('click', () => {
      shuffled = !shuffled;
      Store.pref('shuffle', shuffled);
      shuffleBtn.setAttribute('aria-pressed', String(shuffled));
      start(all);
    });
    swapBtn.addEventListener('click', () => {
      swap = !swap;
      Store.pref('swap', swap);
      swapBtn.setAttribute('aria-pressed', String(swap));
      if (!cardArea.hidden) show(false);
    });

    function onKey(e) {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (e.target.closest('button, a') && e.target !== flip) return;
        e.preventDefault();
        if (!cardArea.hidden) doFlip();
      } else if (e.key === '1' || e.key === 'ArrowLeft') { e.preventDefault(); mark(false); }
      else if (e.key === '2' || e.key === 'ArrowRight') { e.preventDefault(); mark(true); }
      else if (e.key === 'Backspace') { e.preventDefault(); undo(); }
    }
    window.addEventListener('keydown', onKey);

    main.append(h('section', { class: 'page study' },
      h('div', { class: 'study-head' },
        h('a', { class: 'back', href: '#decks' }, '← All decks'),
        h('h1', null, d.name || 'Untitled deck'),
        h('div', { class: 'toolbar' }, shuffleBtn, swapBtn, h('a', { class: 'btn ghost sm', href: '#edit-' + d.id }, 'Edit cards'))),
      h('div', { class: 'progress' }, track, label),
      cardArea,
      summary));

    start(all);
    return () => window.removeEventListener('keydown', onKey);
  }

  /* ---------------- quiz ---------------- */
  function quiz(main, id) {
    const d = Store.deck(id);
    if (!d) return notFound(main);
    const all = usable(d);
    if (all.length < 4) {
      main.append(h('section', { class: 'page study' },
        h('a', { class: 'back', href: '#decks' }, '← All decks'),
        h('div', { class: 'empty panel' },
          h('p', null, 'A quiz needs at least 4 finished cards so there are 4 choices. This deck has ' + all.length + '.'),
          h('a', { class: 'btn primary', href: '#edit-' + d.id }, 'Add cards'))));
      return;
    }

    let swap = !!Store.pref('swap');
    let qs, qi, right, missed, answered;
    const ROUND = Math.min(10, all.length);

    const swapBtn = h('button', { class: 'toggle', type: 'button', 'aria-pressed': String(swap) }, 'Ask with definitions');
    const track = h('div', { class: 'progress-track', 'aria-hidden': 'true' });
    const label = h('span', { class: 'progress-label' });
    const qLabel = h('span', { class: 'face-label' });
    const qText = h('div', { class: 'face-text' });
    const qCard = h('div', { class: 'index-card quiz-q' }, qLabel, qText);
    const choices = h('div', { class: 'choices' });
    const verdict = h('p', { class: 'verdict', role: 'status' });
    const nextBtn = h('button', { class: 'btn primary', type: 'button', hidden: true }, 'Next ', h('kbd', null, 'Enter'));
    const body = h('div', { class: 'page', style: { gap: '14px' } }, qCard, choices, h('div', { class: 'quiz-foot' }, verdict, nextBtn));
    const summary = h('div', { class: 'summary index-card', hidden: true });
    const marks = [];

    function start() {
      qs = shuffle(all).slice(0, ROUND);
      qi = 0; right = 0; missed = []; marks.length = 0;
      summary.hidden = true;
      body.hidden = false;
      ask();
    }

    function ask() {
      answered = false;
      const c = qs[qi];
      const prompt = swap ? c.def : c.term;
      const answerOf = (x) => (swap ? x.term : x.def);
      qLabel.textContent = swap ? 'Which term matches?' : 'What does this mean?';
      qText.textContent = prompt;
      qText.classList.toggle('long', prompt.length > 60);
      const seen = new Set([answerOf(c).trim().toLowerCase()]);
      const wrong = [];
      for (const x of shuffle(all)) {
        const a = answerOf(x).trim().toLowerCase();
        if (!seen.has(a)) { seen.add(a); wrong.push(x); }
        if (wrong.length === 3) break;
      }
      const opts = shuffle([c, ...wrong]);
      choices.replaceChildren(...opts.map((x, i) => {
        const b = h('button', { class: 'choice', type: 'button' }, h('kbd', null, String(i + 1)), h('span', null, answerOf(x)));
        b.addEventListener('click', () => pick(b, x === c, opts.indexOf(c)));
        return b;
      }));
      verdict.textContent = '';
      verdict.className = 'verdict';
      nextBtn.hidden = true;
      label.textContent = 'Question ' + (qi + 1) + ' of ' + qs.length;
      track.replaceChildren(...qs.map((_, i) => h('span', { class: i < marks.length ? (marks[i] ? 'hit' : 'miss') : i === qi ? 'now' : '' })));
    }

    function pick(btn, ok, correctIndex) {
      if (answered) return;
      answered = true;
      const buttons = [...choices.children];
      buttons.forEach((b) => { b.disabled = true; });
      buttons[correctIndex].classList.add('right');
      const c = qs[qi];
      if (ok) { right++; verdict.textContent = 'Correct'; verdict.classList.add('good'); }
      else { btn.classList.add('wrong'); missed.push(c); verdict.textContent = 'Not quite. The answer is highlighted.'; verdict.classList.add('bad'); }
      c.k = ok ? 1 : 0;
      Store.save();
      marks.push(ok);
      nextBtn.hidden = false;
      nextBtn.firstChild.textContent = qi + 1 < qs.length ? 'Next ' : 'See results ';
      nextBtn.focus({ preventScroll: true });
    }

    function next() {
      if (!answered) return;
      qi++;
      if (qi < qs.length) ask();
      else finish();
    }

    function finish() {
      body.hidden = true;
      label.textContent = 'Done';
      track.replaceChildren(...marks.map((m) => h('span', { class: m ? 'hit' : 'miss' })));
      const pct = Math.round((right / qs.length) * 100);
      const retry = h('button', { class: 'btn primary', type: 'button' }, 'New quiz');
      retry.addEventListener('click', start);
      summary.replaceChildren(
        h('p', { class: 'eyebrow' }, 'Quiz complete'),
        h('p', { class: 'big-score' }, right, h('small', null, ' of ' + qs.length + ' right · ' + pct + '%')),
        missed.length ? h('div', { class: 'page', style: { gap: '8px' } }, h('p', { class: 'eyebrow' }, 'Review these'), h('ul', { class: 'miss-list' }, missed.map((c) => h('li', null, h('b', null, c.term), h('span', null, c.def))))) : h('p', null, 'A perfect score.'),
        h('div', { class: 'btn-row' }, retry, h('a', { class: 'btn', href: '#study-' + d.id }, 'Study the cards'), h('a', { class: 'btn ghost', href: '#decks' }, 'All decks')));
      summary.hidden = false;
    }

    nextBtn.addEventListener('click', next);
    swapBtn.addEventListener('click', () => {
      swap = !swap;
      Store.pref('swap', swap);
      swapBtn.setAttribute('aria-pressed', String(swap));
      start();
    });

    function onKey(e) {
      if (e.target.closest('input, textarea, select')) return;
      if (body.hidden) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && !answered) {
        const b = choices.children[n - 1];
        if (b) { e.preventDefault(); b.click(); }
      } else if (e.key === 'Enter' && answered) {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener('keydown', onKey);

    main.append(h('section', { class: 'page study' },
      h('div', { class: 'study-head' },
        h('a', { class: 'back', href: '#decks' }, '← All decks'),
        h('h1', null, (d.name || 'Untitled deck') + ' quiz'),
        h('div', { class: 'toolbar' }, swapBtn)),
      h('div', { class: 'progress' }, track, label),
      body,
      summary));

    start();
    return () => window.removeEventListener('keydown', onKey);
  }

  window.Flashcards = { list, edit, study, quiz };
})();
