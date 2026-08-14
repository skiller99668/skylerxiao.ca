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
