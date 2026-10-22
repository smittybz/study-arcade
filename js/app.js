/* Hash router. Views get the <main> element and may return a cleanup function. */
(function () {
  const routes = [
    [/^(games|arcade)$/, Arcade.page, 'games'],
    [/^play-([\w-]+)$/, Arcade.play, 'games'],
    [/^game-([\w-]+)$/, Arcade.libraryGame, 'games'],
    [/^decks$/, Flashcards.list, 'flashcards'],
    [/^edit-([\w-]+)$/, Flashcards.edit, 'flashcards'],
    [/^study-([\w-]+)$/, Flashcards.study, 'flashcards'],
    [/^quiz-([\w-]+)$/, Flashcards.quiz, 'flashcards'],
    [/^about$/, About.about, 'about'],
  ];
  let cleanup = null;
  let lastHash = null;

  function render() {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const hash = decodeURIComponent(location.hash.slice(1)) || 'games';
    const main = document.getElementById('main');
    main.replaceChildren();
    let section = 'games';
    let matched = false;
    for (const [re, view, sec] of routes) {
      const m = hash.match(re);
      if (!m) continue;
      matched = true;
      section = sec;
      try { cleanup = view(main, m[1]) || null; } catch (e) { console.error(e); }
      break;
    }
    if (!matched) cleanup = Arcade.page(main) || null;
    document.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.dataset.nav === section) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (hash !== lastHash) window.scrollTo(0, 0);
    lastHash = hash;
  }

  window.Router = { render };
  window.addEventListener('hashchange', render);
  render();
})();
