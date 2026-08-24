/* Disarm the reveal failsafe in index.html — this file loaded, so the
   scroll-triggered animations below will run. Must stay the first
   statement: if it never executes, the page falls back to showing
   everything, which is the safe direction but loses the animation. */
clearTimeout(window.revealFailsafe);

/* ============================================================
   Nav — active link tracking

   Both features below derive their targets from `.section`
   elements, so adding a section to index.html needs no change
   here beyond a matching nav link.
   ============================================================ */
(function initNav() {
  var sections = document.querySelectorAll('.section');
  var links = document.querySelectorAll('.nav-link');
  if (!sections.length || !links.length) return;

  var linkFor = {};
  links.forEach(function (link) {
    linkFor[link.getAttribute('href').slice(1)] = link;
  });

  function setActive(id) {
    links.forEach(function (link) {
      link.classList.toggle('active', link === linkFor[id]);
    });
  }

  if (!('IntersectionObserver' in window)) return;

  /* Track which sections are on screen and light up the topmost one.
     A Set keeps this correct when several are visible at once — the
     old approach read offsetTop for every section on every frame. */
  var onScreen = new Set();

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) onScreen.add(entry.target);
      else onScreen.delete(entry.target);
    });

    var topmost = null;
    onScreen.forEach(function (section) {
      if (!topmost || section.offsetTop < topmost.offsetTop) topmost = section;
    });
    if (topmost) setActive(topmost.id);
  }, {
    // Only count a section once it reaches the upper part of the viewport.
    rootMargin: '-74px 0px -55% 0px',
    threshold: 0
  });

  sections.forEach(function (section) { observer.observe(section); });

  // Clicking a nav link should light it immediately, ahead of the scroll.
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      setActive(link.getAttribute('href').slice(1));
    });
  });
})();

/* ============================================================
   Hover preview

   Any element with data-preview shows that image on hover,
   following the cursor — project rows, inline links, anything.
   Enhancement only: without it those elements behave normally.
   ============================================================ */
(function initPreview() {
  var rows = document.querySelectorAll('[data-preview]');
  if (!rows.length) return;

  // Touch and coarse pointers never hover, and reduced-motion users
  // shouldn't get something chasing the cursor.
  if (!window.matchMedia) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var img = document.createElement('img');
  img.className = 'project-preview';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  document.body.appendChild(img);

  var current = null;
  var frame = null;
  var pending = { x: 0, y: 0 };

  function place() {
    frame = null;
    var pad = 14;
    var w = img.offsetWidth || 268;
    var h = img.offsetHeight || 168;
    // Keep the card fully on screen, and to the cursor's right when it fits.
    var x = pending.x + w / 2 + 28;
    if (x + w / 2 > window.innerWidth - pad) x = pending.x - w / 2 - 28;
    var y = Math.min(
      Math.max(pending.y, h / 2 + pad),
      window.innerHeight - h / 2 - pad
    );
    img.style.setProperty('--x', (x - w / 2) + 'px');
    img.style.setProperty('--y', (y - h / 2) + 'px');
  }

  function onMove(e) {
    pending.x = e.clientX;
    pending.y = e.clientY;
    if (!frame) frame = window.requestAnimationFrame(place);
  }

  rows.forEach(function (row) {
    row.addEventListener('mouseenter', function (e) {
      var src = row.getAttribute('data-preview');
      if (!src) return;
      if (current !== src) {
        img.src = src;
        current = src;
      }
      pending.x = e.clientX;
      pending.y = e.clientY;
      place();
      img.classList.add('on');
    });

    row.addEventListener('mousemove', onMove, { passive: true });

    row.addEventListener('mouseleave', function () {
      img.classList.remove('on');
    });
  });

  // A missing or not-yet-added screenshot should show nothing, not a broken icon.
  img.addEventListener('error', function () { img.classList.remove('on'); });

  // Don't leave the card floating over the page while scrolling away.
  window.addEventListener('scroll', function () {
    if (img.classList.contains('on')) img.classList.remove('on');
  }, { passive: true });
})();

/* ============================================================
   Margin doodles — scroll-driven spin

   Publishes scroll position as one custom property, plus a class
   for "the page is moving right now", and lets CSS decide what
   each doodle does with them. Adding or retuning a doodle is a
   stylesheet change and never a change here.

   The class is what keeps the doodles still at rest: they boil
   only while they spin, so nothing twitches in the corner of the
   eye while someone is reading.

   One property write per frame for the whole set, on a rAF-gated
   passive listener: nothing here reads layout, so it can't force
   a synchronous reflow while scrolling.
   ============================================================ */
(function initDoodleSpin() {
  // Every container, not just the first: the margin set and the hero set are
  // separate elements, and each needs its own --scroll and spinning class.
  var groups = document.querySelectorAll('.doodles');
  if (!groups.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var frame = null;
  var settle = null;

  function update() {
    frame = null;
    var y = String(window.scrollY || window.pageYOffset || 0);
    groups.forEach(function (g) { g.style.setProperty('--scroll', y); });
  }

  window.addEventListener('scroll', function () {
    if (!frame) frame = window.requestAnimationFrame(update);

    // Held open by every scroll event and only closes once they stop, so a
    // continuous scroll never flickers the class off between two frames.
    groups.forEach(function (g) { g.classList.add('spinning'); });
    window.clearTimeout(settle);
    settle = window.setTimeout(function () {
      groups.forEach(function (g) { g.classList.remove('spinning'); });
    }, 180);
  }, { passive: true });

  update();   // reloading part-way down the page should not unwind them
})();

/* ============================================================
   The quadrille — rule it on

   Grows the mask on body::before from the top-left corner out.
   Two frames of delay so the browser has the 0% start value
   committed before the end value lands, or there is nothing to
   transition from and the ruling just appears.

   The mask is dropped when the run is over: it only reaches
   260vmax, and a page taller than that would keep a strip of
   its bottom unruled forever.
   ============================================================ */
(function initGridDraw() {
  var root = document.documentElement;
  var DUR = 2800;

  function finish() { root.classList.add('grid-done'); }

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return finish();
  }

  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      root.classList.add('grid-in');
      window.setTimeout(finish, DUR + 400);
    });
  });
})();

/* ============================================================
   Highlighter — draw the swipes on

   Every brush swipe (text highlights and the few doodles that
   carry one) starts clipped to nothing; adding .drawn wipes it
   open. Done here rather than with a CSS animation so a swipe
   is drawn when it is actually looked at, and so a screenful
   arrives in sequence rather than all at once.

   Enhancement only: the CSS leaves swipes fully painted unless
   .js is set, so a failure here costs highlights, never text.
   ============================================================ */
(function initDrawIn() {
  /* .doodle--lit, not the .hl inside it. Clipping an SVG element to zero
     width collapses its client rect to zero area, and a zero-area target
     never satisfies a threshold — observing the swipe itself deadlocks and
     the colour never appears at all. The wrapper has a real box. */
  var swipes = document.querySelectorAll('.mark, .brush-mark, .doodle--lit');
  if (!swipes.length) return;

  function draw(el) {
    el.classList.add('drawn');
  }
  function drawAll() {
    swipes.forEach(draw);
  }

  if (!('IntersectionObserver' in window)) return drawAll();
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return drawAll();
  }

  // Staggered per batch, so what lands together draws in sequence. The
  // counter resets once a screenful has been handed out, or a swipe far
  // down the page would inherit a delay measured in whole seconds.
  var step = 0, reset = null;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.style.setProperty('--draw-delay', (step * 0.11).toFixed(2) + 's');
      draw(entry.target);
      observer.unobserve(entry.target);
      step++;
    });
    window.clearTimeout(reset);
    reset = window.setTimeout(function () { step = 0; }, 300);
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

  swipes.forEach(function (el) { observer.observe(el); });

  /* Safety net. The failure this guards against is not cosmetic: an
     undrawn swipe is an invisible one, so anything already on screen that
     the observer has not reported by now gets drawn regardless. Below-fold
     swipes are left alone so they still arrive as you reach them. */
  window.setTimeout(function () {
    swipes.forEach(function (el) {
      if (el.classList.contains('drawn')) return;
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        draw(el);
        observer.unobserve(el);
      }
    });
  }, 1500);
})();

/* ============================================================
   Scroll-triggered reveal
   ============================================================ */
(function initReveal() {
  var items = document.querySelectorAll('.fade-in');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  items.forEach(function (el) { observer.observe(el); });
})();
