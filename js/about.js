/* About page: who made the site, and credits for every game. */
(function () {
  const { h } = UI;

  function about(main) {
    const lib = window.LIBRARY || { jam: [], ext: [] };
    const lite = !!window.STUDY_ARCADE_LITE;
    const builtins = Arcade.games.map((g) => g.name).join(', ');
    const ext = (href, text) => h('a', { href, target: '_blank', rel: 'noopener' }, text);

    main.append(h('section', { class: 'page about' },
      h('header', { class: 'about-head' },
        h('p', { class: 'eyebrow' }, 'About'),
        h('h1', null, 'Study Arcade'),
        h('p', { class: 'about-by' }, 'Made by ', h('strong', null, 'Smith Homes'), '.')),

      h('div', { class: 'wip-note' },
        h('span', { class: 'wip-badge' }, 'Work in progress'),
        h('p', null, 'This site is still being built. New games and features are on the way, and some things might change or break while I work on them.')),

      h('div', { class: 'about-grid' },
        h('div', { class: 'index-card about-card' },
          h('h2', null, 'Flashcards'),
          h('p', null, 'Make decks, flip through them, and quiz yourself. Your decks save in this browser, and you can back them up from the Flashcards page.')),
        h('div', { class: 'index-card about-card' },
          h('h2', null, 'Study games'),
          h('p', null, 'Match Up, Speed Round and Word Rain turn any deck into a game, so studying feels more like playing.')),
        h('div', { class: 'index-card about-card' },
          h('h2', null, 'Games'),
          h('p', null, lite ? 'A set of quick games for study breaks.' : 'Dozens of games for study breaks, from quick arcade games to longer adventures.'))),

      h('section', { class: 'section credits' },
        h('h2', null, 'Credits'),
        h('p', null, builtins + ' were made for Study Arcade.'),
        lite ? null : h('div', { class: 'credit-block' },
          h('h3', null, 'Games by the 100 Devs 1 Game community'),
          h('p', null, 'Used under the MIT License. Copyright © 2025 100 Devs - 1 Game. Each game folder includes its license. ', ext('https://github.com/100-Devs-1-Game/Our-Open-Source-Games', 'Their game list')),
          h('ul', { class: 'credit-list' }, lib.jam.filter((g) => !g.localOnly || ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname)).map((g) => h('li', null, ext('https://github.com/100-Devs-1-Game/' + g.repo, g.name))))),
        lite ? null : h('div', { class: 'credit-block' },
          h('h3', null, 'More game credits'),
          h('ul', { class: 'credit-list wide' }, lib.ext.map((g) => h('li', null, ext(g.src, g.name), ' by ' + g.by + ' · ' + g.license + ' license')))),
        lite || !(lib.web || []).length ? null : h('div', { class: 'credit-block' },
          h('h3', null, 'Embedded games'),
          h('p', null, 'These play from their publishers’ websites using the embed code those sites offer.'),
          h('ul', { class: 'credit-list wide' }, lib.web.map((g) => h('li', null, ext(g.page, g.name), ' by ' + g.by + ' · embedded from ' + g.via)))),
        h('p', { class: 'small' }, 'Fonts: Bungee, Atkinson Hyperlegible and Kalam from Google Fonts.'))));
  }

  window.About = { about };
})();
