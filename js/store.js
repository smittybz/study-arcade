/* Decks, scores and preferences, saved in this browser's localStorage.
   If storage is blocked (private window, embedded preview) everything still
   works for the visit; it just isn't remembered. */
(function () {
  const KEY = 'studyarcade.v1';
  const TABS = 6;

  function uid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }
  function card(term, def) { return { id: uid('c'), term, def, k: null }; }
  function deck(name, tab, pairs, sample) {
    return { id: uid('d'), name, tab, sample: !!sample, created: Date.now(), cards: pairs.map(([t, d]) => card(t, d)) };
  }

  function samples() {
    return [
      deck('World Capitals', 4, [
        ['France', 'Paris'], ['Japan', 'Tokyo'], ['Brazil', 'Brasília'], ['Canada', 'Ottawa'],
        ['Australia', 'Canberra'], ['Egypt', 'Cairo'], ['Kenya', 'Nairobi'], ['Peru', 'Lima'],
        ['Norway', 'Oslo'], ['Thailand', 'Bangkok'], ['Argentina', 'Buenos Aires'], ['Turkey', 'Ankara'],
      ], true),
      deck('Spanish Basics', 1, [
        ['hola', 'hello'], ['gracias', 'thank you'], ['por favor', 'please'], ['perro', 'dog'],
        ['gato', 'cat'], ['casa', 'house'], ['agua', 'water'], ['libro', 'book'],
        ['rojo', 'red'], ['amigo', 'friend'], ['escuela', 'school'], ['comer', 'to eat'],
      ], true),
      deck('Parts of a Cell', 2, [
        ['Nucleus', 'Holds the cell’s DNA and controls its activity'],
        ['Mitochondria', 'Turns food into usable energy (ATP)'],
        ['Ribosome', 'Builds proteins'],
        ['Cell membrane', 'Controls what enters and leaves the cell'],
        ['Chloroplast', 'Captures sunlight for photosynthesis in plant cells'],
        ['Cell wall', 'Stiff outer layer that supports plant cells'],
        ['Vacuole', 'Stores water, food and waste'],
        ['Cytoplasm', 'Jelly-like fluid that fills the cell'],
        ['Golgi apparatus', 'Packages proteins and ships them out'],
        ['Lysosome', 'Breaks down waste and worn-out parts'],
      ], true),
      deck('Times Tables 6–12', 3, [
        ['6 × 7', '42'], ['7 × 8', '56'], ['8 × 9', '72'], ['6 × 9', '54'],
        ['7 × 7', '49'], ['8 × 8', '64'], ['6 × 8', '48'], ['9 × 9', '81'],
        ['7 × 9', '63'], ['11 × 12', '132'], ['12 × 12', '144'], ['9 × 11', '99'],
      ], true),
    ];
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked; keep going */ }
  }

  let state = read();
  if (!state || !Array.isArray(state.decks)) state = { decks: samples(), scores: {}, prefs: {} };
  state.scores = state.scores || {};
  state.prefs = state.prefs || {};

  function cleanDeck(d, i) {
    if (!d || !Array.isArray(d.cards)) return null;
    const cards = d.cards
      .map((c) => card(String(c.term ?? c.front ?? '').slice(0, 500), String(c.def ?? c.back ?? c.definition ?? '').slice(0, 1000)))
      .filter((c) => c.term.trim() || c.def.trim());
    return {
      id: uid('d'),
      name: String(d.name || 'Imported deck').slice(0, 120),
      tab: Number(d.tab) >= 1 && Number(d.tab) <= TABS ? Number(d.tab) : (i % TABS) + 1,
      created: Date.now(),
      cards,
    };
  }

  window.Store = {
    TABS,
    get decks() { return state.decks; },
    deck(id) { return state.decks.find((d) => d.id === id) || null; },
    addDeck(name) {
      const d = { id: uid('d'), name: name || '', tab: (state.decks.length % TABS) + 1, created: Date.now(), cards: [card('', ''), card('', '')] };
      state.decks.unshift(d);
      write();
      return d;
    },
    removeDeck(id) { state.decks = state.decks.filter((d) => d.id !== id); write(); },
    newCard: card,
    save: write,
    restoreSamples() { state.decks = state.decks.concat(samples()); write(); },

    scoreKey(game, variant) { return variant ? game + ':' + variant : game; },
    best(key) { const v = state.scores[key]; return typeof v === 'number' ? v : null; },
    submit(key, score, lowerIsBetter) {
      const cur = this.best(key);
      const better = cur == null || (lowerIsBetter ? score < cur : score > cur);
      if (better) { state.scores[key] = score; write(); }
      return better;
    },

    pref(k, v) {
      if (v === undefined) return state.prefs[k];
      state.prefs[k] = v;
      write();
      return v;
    },

    exportJSON() {
      return JSON.stringify({
        app: 'study-arcade',
        version: 1,
        decks: state.decks.map((d) => ({ name: d.name, tab: d.tab, cards: d.cards.map((c) => ({ term: c.term, def: c.def })) })),
      }, null, 2);
    },
    importJSON(text, mode) {
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error('That text isn’t a backup. Paste everything you copied with “Copy backup”.'); }
      const list = Array.isArray(data) ? data : data && data.decks;
      if (!Array.isArray(list)) throw new Error('No decks found in that backup.');
      const clean = list.map(cleanDeck).filter(Boolean);
      if (!clean.length) throw new Error('No decks found in that backup.');
      state.decks = mode === 'replace' ? clean : clean.concat(state.decks);
      write();
      return clean.length;
    },
  };
})();
