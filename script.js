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
    const reveal = () => {
      v.classList.add('is-ready');
      if (v.closest('[data-companion]')) {
        document.body.classList.add('has-film-ready');
      }
    };
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
      if (!dark && v.dataset.blobReady === '1') {
        armFilm(v);
        return;
      }
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

  // 6. SCROLL-REACTIVE PORTRAIT COMPANION -----------------------
  // On desktop (>= 1120px) with motion allowed, the portrait doodle
  // steps gently out of its blueprint frame into the empty left margin,
  // scrubs its 8s film along the page scroll arc (bust -> steps out ->
  // spark rises -> 5 neural nodes light up -> returns to bust), and
  // holds serene & still whenever the reader stops scrolling.
  const slotEl = document.querySelector('[data-portrait-slot]');
  const companionEl = document.querySelector('[data-companion]');
  const companionLabel = document.querySelector('[data-companion-label]');
  const railEl = document.querySelector('[data-margin-rail]');
  const progressBar = document.querySelector('[data-scroll-progress]');

  if (slotEl && companionEl) {
    const videoEl = companionEl.querySelector('video[data-film]');
    const chapters = Array.from(document.querySelectorAll('[data-chapter]'));
    const hoverTargets = Array.from(document.querySelectorAll('.work-item, .note-item'));
    const DESKTOP_MIN = 1120;

    let active = false;
    let slotDocX = 0;
    let slotDocY = 0;
    let marginX = 32;
    let curX = 0;
    let curY = 0;
    let curScale = 1;
    let curTilt = 0;
    let lastScrollY = window.scrollY || 0;
    let scrollVel = 0;
    let scrubTime = 0;
    let isScrubbing = false;
    let hoveredItem = null;
    let hoveredCompanion = false;
    let currentChapterText = '';
    let rafId = 0;

    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const smoothstep = (t) => t * t * (3 - 2 * t);

    function measureSlot() {
      const r = slotEl.getBoundingClientRect();
      slotDocX = r.left + (window.scrollX || 0);
      slotDocY = r.top + (window.scrollY || 0);
      // Sit in the quiet left margin clear of the 780px column
      marginX = Math.max(24, slotDocX - 146);
      if (railEl) {
        railEl.style.left = Math.round(marginX - 18) + 'px';
      }
    }

    function updateProgressOnly() {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const y = window.scrollY || 0;
      const p = clamp(y / maxScroll, 0, 1);
      root.style.setProperty('--scroll-p', p.toFixed(4));
      document.body.classList.toggle('is-scrolling-past-top', y > 24);
      return { y, p, maxScroll };
    }

    // Preload the 258 KB clip into an in-memory Blob URL so frame-accurate
    // scroll scrubbing works instantaneously everywhere (even on static dev
    // servers that do not support HTTP Range requests).
    let blobUrl = null;
    if (videoEl && videoEl.dataset.srcLight && window.fetch && window.URL && URL.createObjectURL) {
      fetch(videoEl.dataset.srcLight)
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (!blob) return;
          blobUrl = URL.createObjectURL(blob);
          const prevTime = videoEl.currentTime || 0;
          const wasPaused = videoEl.paused;
          videoEl.dataset.blobReady = '1';
          videoEl.setAttribute('src', blobUrl);
          videoEl.load();
          videoEl.addEventListener('loadedmetadata', () => {
            try { videoEl.currentTime = prevTime; } catch (e) {}
            if (!wasPaused && !isScrubbing) {
              videoEl.play().catch(() => {});
            }
            kickLoop();
          }, { once: true });
        })
        .catch(() => { /* keep direct src fallback */ });
    }

    function detectChapter(probeY) {
      if (hoveredItem) {
        return hoveredItem.getAttribute('data-chapter') || '';
      }
      const yProbe = typeof probeY === 'number' ? probeY : window.innerHeight * 0.38;
      let label = '';
      for (let i = 0; i < chapters.length; i++) {
        const rect = chapters[i].getBoundingClientRect();
        if (rect.top <= yProbe) {
          label = chapters[i].getAttribute('data-chapter') || label;
        }
      }
      return label;
    }

    function mapScrollToStory(p, duration) {
      // Map page scroll [0..1] onto the 8s film story so:
      // - Top hero -> calm bust (0.0s..1.2s)
      // - Early work -> little figure walks to cyan spark (1.2s..3.5s)
      // - Mid work -> spark lifts into head & 5 nodes ignite (3.5s..6.2s)
      // - Writing & Footer -> dissolves peacefully back to bust (6.2s..7.9s)
      const safeEnd = Math.max(0.1, duration - 0.08);
      return clamp(p * safeEnd, 0, safeEnd);
    }

    function syncActiveMode() {
      const shouldActivate = !prefersReduced && window.innerWidth >= DESKTOP_MIN;
      if (shouldActivate === active) {
        if (active) measureSlot();
        return;
      }
      active = shouldActivate;
      if (active) {
        document.body.classList.add('has-companion');
        measureSlot();
        const y = window.scrollY || 0;
        const flight = smoothstep(clamp((y - 12) / 210, 0, 1));
        const homeY = slotDocY - y;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const p = clamp(y / maxScroll, 0, 1);
        const railTop = 116;
        const railBot = Math.max(railTop + 60, Math.min(window.innerHeight - 160, window.innerHeight * 0.72));
        curX = lerp(slotDocX, marginX, flight);
        curY = lerp(homeY, lerp(railTop, railBot, p), flight);
        curScale = lerp(1, 0.92, flight);
        companionEl.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${curScale.toFixed(3)})`;
        kickLoop();
      } else {
        document.body.classList.remove('has-companion');
        slotEl.classList.remove('is-departed');
        companionEl.classList.remove('is-floating', 'is-curious');
        companionEl.style.transform = '';
        if (railEl) railEl.classList.remove('is-visible');
        if (videoEl && isScrubbing) {
          isScrubbing = false;
          videoEl.play().catch(() => {});
        }
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      }
    }

    function tick() {
      rafId = 0;
      if (!active) return;

      const { y, p } = updateProgressOnly();
      const dy = y - lastScrollY;
      lastScrollY = y;
      scrollVel = lerp(scrollVel, dy, 0.28);

      const flight = smoothstep(clamp((y - 12) / 210, 0, 1));
      const homeX = slotDocX;
      const homeY = slotDocY - y;

      const railTop = 116;
      const railBot = Math.max(railTop + 60, Math.min(window.innerHeight - 160, window.innerHeight * 0.72));
      let marginY = lerp(railTop, railBot, p);

      // Gentle magnetic pull toward hovered project row when floating in margin
      if (hoveredItem && flight > 0.65) {
        const hr = hoveredItem.getBoundingClientRect();
        const itemMid = clamp(hr.top + hr.height * 0.35 - 48, railTop - 10, window.innerHeight - 148);
        marginY = lerp(marginY, itemMid, 0.42);
      }

      // Gentle outward arc as it steps left out of its blueprint frame
      const arcX = -Math.sin(flight * Math.PI) * 14;
      const targetX = lerp(homeX, marginX, flight) + arcX;
      const targetY = lerp(homeY, marginY, flight);
      const targetScale = lerp(1, 0.92, flight);
      const targetTilt = flight > 0.15 ? clamp(scrollVel * 0.12, -3.5, 3.5) : 0;

      // Snap crisply when fully docked at top so there's zero drift on page load
      if (flight === 0 && Math.abs(curX - targetX) < 0.8 && Math.abs(curY - targetY) < 0.8) {
        curX = targetX;
        curY = targetY;
        curScale = targetScale;
        curTilt = 0;
      } else {
        curX = lerp(curX, targetX, 0.15);
        curY = lerp(curY, targetY, 0.13);
        curScale = lerp(curScale, targetScale, 0.15);
        curTilt = lerp(curTilt, targetTilt, 0.14);
      }

      companionEl.style.transform =
        `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${curScale.toFixed(3)}) rotate(${curTilt.toFixed(2)}deg)`;

      const departed = flight > 0.12;
      const floating = flight > 0.55;
      slotEl.classList.toggle('is-departed', departed);
      companionEl.classList.toggle('is-floating', floating);
      if (railEl) railEl.classList.toggle('is-visible', floating);

      // Update quiet marginalia label aligned with the companion's own vertical center
      if (companionLabel) {
        const nextLabel = hoveredCompanion && floating ? '↑ Back to top' : detectChapter(curY + 48);
        if (nextLabel !== currentChapterText) {
          currentChapterText = nextLabel;
          companionLabel.textContent = nextLabel;
        }
      }

      // Synchronize the 8-second film with scroll progress
      if (videoEl && videoEl.readyState >= 1 && isFinite(videoEl.duration) && videoEl.duration > 0) {
        if (y >= 24) {
          if (!isScrubbing) {
            isScrubbing = true;
            scrubTime = videoEl.currentTime || 0;
            videoEl.pause();
          }
          const targetT = mapScrollToStory(p, videoEl.duration);
          scrubTime = lerp(scrubTime, targetT, 0.16);
          if (!videoEl.seeking && Math.abs(videoEl.currentTime - scrubTime) > 0.032) {
            try { videoEl.currentTime = scrubTime; } catch (e) { /* ignore seek race */ }
          }
        } else if (isScrubbing && flight < 0.04) {
          isScrubbing = false;
          videoEl.play().catch(() => {});
        }
      }

      // Keep ticking only while motion or scrubbing is still settling; go completely idle when still!
      const posSettled =
        Math.abs(curX - targetX) < 0.25 &&
        Math.abs(curY - targetY) < 0.25 &&
        Math.abs(curTilt) < 0.05 &&
        Math.abs(scrollVel) < 0.08;
      const timeSettled =
        !isScrubbing ||
        !videoEl ||
        !isFinite(videoEl.duration) ||
        Math.abs(scrubTime - mapScrollToStory(p, videoEl.duration)) < 0.04;

      if (!posSettled || !timeSettled) {
        rafId = requestAnimationFrame(tick);
      } else {
        scrollVel = 0;
        curTilt = 0;
      }
    }

    function kickLoop() {
      updateProgressOnly();
      if (active && !rafId) {
        rafId = requestAnimationFrame(tick);
      }
    }

    // Hover resonance on project & writing rows
    hoverTargets.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        hoveredItem = el;
        companionEl.classList.add('is-curious');
        kickLoop();
      });
      el.addEventListener('mouseleave', () => {
        if (hoveredItem === el) hoveredItem = null;
        if (!hoveredItem) companionEl.classList.remove('is-curious');
        kickLoop();
      });
    });

    companionEl.addEventListener('mouseenter', () => {
      hoveredCompanion = true;
      kickLoop();
    });
    companionEl.addEventListener('mouseleave', () => {
      hoveredCompanion = false;
      kickLoop();
    });

    function onCompanionActivate() {
      companionEl.classList.add('is-pulsing');
      setTimeout(() => companionEl.classList.remove('is-pulsing'), 460);
      if ((window.scrollY || 0) > 40) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    companionEl.addEventListener('click', onCompanionActivate);
    companionEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onCompanionActivate();
      }
    });

    window.addEventListener('scroll', kickLoop, { passive: true });
    window.addEventListener('resize', () => {
      syncActiveMode();
      kickLoop();
    }, { passive: true });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (active) measureSlot();
        kickLoop();
      });
    }

    updateProgressOnly();
    syncActiveMode();
  } else if (progressBar) {
    window.addEventListener('scroll', () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const y = window.scrollY || 0;
      root.style.setProperty('--scroll-p', Math.min(1, Math.max(0, y / maxScroll)).toFixed(4));
      document.body.classList.toggle('is-scrolling-past-top', y > 24);
    }, { passive: true });
  }

})();
