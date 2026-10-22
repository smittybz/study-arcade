/* Small DOM helpers shared by every view. */
(function () {
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') {
          for (const [p, val] of Object.entries(v)) {
            if (p.startsWith('--')) el.style.setProperty(p, val);
            else el.style[p] = val;
          }
        } else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'value') el.value = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  // Two-step delete: the first click arms the button, the second one acts.
  function armConfirm(btn, armedText, fn) {
    const original = btn.textContent;
    let armed = false, t;
    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        btn.textContent = armedText;
        btn.classList.add('armed');
        t = setTimeout(() => { armed = false; btn.textContent = original; btn.classList.remove('armed'); }, 3500);
      } else {
        clearTimeout(t);
        fn();
      }
    });
  }

  // Loose answer matching for typed answers: ignores case, accents, punctuation,
  // anything in (parentheses), and leading articles like "the" or "to".
  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  function answerSet(s) {
    const out = new Set();
    const add = (x) => {
      const n = norm(x);
      if (!n) return;
      out.add(n);
      out.add(n.replace(/^(to|the|a|an|el|la|los|las|le|les|un|une|der|die|das)\s+/, ''));
    };
    add(s);
    String(s).split(/\/|;|,\s|\sor\s/i).forEach(add);
    return out;
  }

  function fmtTime(sec) {
    if (sec < 60) return sec.toFixed(1) + 's';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function rand(n) { return Math.floor(Math.random() * n); }

  // Cards a game or quiz can use: both sides filled in.
  function usable(deck) {
    return deck ? deck.cards.filter((c) => c.term.trim() && c.def.trim()) : [];
  }

  async function copyText(text, fallbackEl) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      if (fallbackEl) { fallbackEl.hidden = false; fallbackEl.value = text; fallbackEl.focus(); fallbackEl.select(); }
      return false;
    }
  }

  window.UI = { h, shuffle, toast, armConfirm, norm, answerSet, fmtTime, rand, usable, copyText };
})();
