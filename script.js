/* =========================================================
   @isHeSatoshi · v6 — script
   - page-load fade
   - scroll reveal (one-time)
   - live clock (subtle)
   ========================================================= */

(function () {
  'use strict';

  // 1. PAGE-LOAD FADE -----------------------------------------
  // Remove the is-loading class after fonts/styles settle so the
  // body fades in once. We also add is-loaded which the CSS uses
  // to trigger the one-time fade-and-rise entrance.
  function onReady() {
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-loaded');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // small delay so the first paint uses the loading class
    setTimeout(onReady, 60);
  } else {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
    window.addEventListener('load', onReady, { once: true });
  }

  // 2. SCROLL REVEAL (one-time fade-and-rise) ------------------
  // Elements default to visible. JS adds `.reveal` class on the
  // next frame to trigger the entrance animation. Above-fold
  // elements get the class immediately; below-fold elements get
  // it when they intersect the viewport. This way the page is
  // always rendered even if JS is slow or IO is unsupported.
  const allReveal = document.querySelectorAll('[data-reveal]');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    // skip the animation entirely
    allReveal.forEach((el) => { /* nothing — default visible */ });
  } else {
    // requestAnimationFrame ensures the page is painted once
    // before we hide and animate.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if ('IntersectionObserver' in window) {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('reveal');
                observer.unobserve(entry.target);
              }
            });
          }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.04 });

          allReveal.forEach((el) => {
            const rect = el.getBoundingClientRect();
            // If element is already in viewport, add .reveal immediately.
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              el.classList.add('reveal');
            } else {
              observer.observe(el);
            }
          });
        } else {
          // No IO support — show everything with the animation
          allReveal.forEach((el) => el.classList.add('reveal'));
        }
      });
    });
  }

  // 3. SMOOTH SCROLL for in-page anchors ----------------------
  // The CSS sets scroll-behavior: smooth, but we also catch
  // hash links to ensure the offset is good under the sticky nav.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const navH = 56; // approx sticky nav height
      const top = target.getBoundingClientRect().top + window.pageYOffset - navH;
      window.scrollTo({ top, behavior: 'smooth' });
      // update hash without scroll jump
      history.replaceState(null, '', id);
    });
  });

  // 4. LIVE CLOCK (optional, for the live pill) ---------------
  // Uncomment if you want a ticking timestamp in the status pill.
  // The pill in the HTML currently shows static numbers; this
  // adds an IST clock without altering the layout.
  /*
  const clockEl = document.getElementById('live-clock');
  if (clockEl) {
    const fmt = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const d = new Date();
      // IST is UTC+5:30
      const utc = d.getTime() + d.getTimezoneOffset() * 60000;
      const ist = new Date(utc + 5.5 * 3600000);
      clockEl.textContent = fmt(ist.getHours()) + ':' + fmt(ist.getMinutes()) + ':' + fmt(ist.getSeconds());
    };
    tick();
    setInterval(tick, 1000);
  }
  */

  // 5. THEME + HERO FILMS ---------------------------------------
  // The portrait square and the CV band each hold an SVG (poster + reduced-
  // motion fallback) with a looping film stacked exactly on top. A film is
  // revealed only once it can actually play, and removed entirely if it
  // fails, so the page never shows a dead box. The band has a light and a
  // dark cut, so flipping the theme swaps the source and restarts it.
  const root = document.documentElement;
  const themeBtn = document.querySelector('[data-theme-toggle]');
  const THEME_KEY = 'ishesatoshi-theme';
  const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');

  function currentTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* private mode */ }
    if (saved === 'ink' || saved === 'paper') return saved;
    return themeMedia.matches ? 'ink' : 'paper';
  }

  function armFilm(v) {
    const reveal = () => v.classList.add('is-ready');
    const fail = () => v.remove();
    if (v.readyState >= 3) { reveal(); return; }
    v.addEventListener('canplay', reveal, { once: true });
    v.addEventListener('error', fail, { once: true });
  }

  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'ink' ? '#131518' : '#F2EBDD');
    if (themeBtn) {
      themeBtn.textContent = mode === 'ink' ? 'PAPER' : 'INK';
      themeBtn.setAttribute('aria-pressed', mode === 'ink' ? 'true' : 'false');
      themeBtn.setAttribute('aria-label',
        mode === 'ink' ? 'Switch to the light theme' : 'Switch to the dark theme');
    }
    document.querySelectorAll('video[data-film]').forEach((v) => {
      const light = v.dataset.srcLight;
      const dark = v.dataset.srcDark;
      // a film with only a light cut keeps it in both themes
      const wantSrc = dark ? (mode === 'ink' ? dark : light) : light;
      const wantPoster = mode === 'ink' ? v.dataset.posterDark : v.dataset.posterLight;
      if (wantSrc && v.getAttribute('src') !== wantSrc) {
        v.setAttribute('src', wantSrc);
        if (wantPoster) v.setAttribute('poster', wantPoster);
        v.classList.remove('is-ready');
        v.load();
      }
      armFilm(v);
    });
  }

  applyTheme(currentTheme());

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'ink' ? 'paper' : 'ink';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
      applyTheme(next);
    });
  }

})();
