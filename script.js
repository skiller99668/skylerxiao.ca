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
