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
   Nav strip — say that it scrolls

   The links overflow on a phone and the strip has always scrolled,
   but silently: the last one or two sit past the right edge with
   nothing to suggest they exist. These two classes drive a fade on
   the tail, and only when there is genuinely something hidden —
   which is why it is measured here rather than assumed from a
   breakpoint. Purely a hint; the strip scrolls either way.
   ============================================================ */
(function initNavHint() {
  var strip = document.querySelector('.nav-links');
  if (!strip) return;

  function sync() {
    var over = strip.scrollWidth - strip.clientWidth;
    strip.classList.toggle('can-scroll', over > 4);
    strip.classList.toggle('at-end', strip.scrollLeft >= over - 4);
  }

  strip.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  sync();
})();

/* ============================================================
   The quadrille — rule it on, line by line

   Builds a throwaway overlay of real rules over the page and
   scales each one out from its start, staggered per axis so the
   ruling spreads from the top-left. The CSS ruling underneath is
   held at opacity 0 until this finishes, then swapped in and the
   overlay dropped — the two are pixel-identical, so the handover
   is invisible.

   Speed is fixed and duration derived from length, so every rule
   travels at the same rate. Delay is capped: on a very long page
   the rules past the cap all start together, which nobody sees
   because they are thousands of pixels below the fold.
   ============================================================ */
(function initGridDraw() {
  var root = document.documentElement;
  function finish() { root.classList.add('grid-done'); }

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return finish();
  }

  var body = document.body;
  var pw = body.scrollWidth;
  var ph = body.scrollHeight;
  var vw = root.clientWidth || pw;
  var vh = window.innerHeight || 800;

  var CELL = 24;
  var SPEED = 2400;      // px per second, the pen's pace
  var SPREAD = 2200;     // ms across one screen of stagger
  var CAP = 3000;        // ms, furthest a rule may be delayed

  // A page long enough to need thousands of rules is not worth animating.
  if (!pw || !ph || (pw / CELL) * (ph / CELL) > 4e6) return finish();

  var wrap = document.createElement('div');
  wrap.className = 'grid-draw';
  wrap.setAttribute('aria-hidden', 'true');
  var frag = document.createDocumentFragment();
  var last = 0;

  function rule(cls, css, progress, len) {
    var at = Math.min(progress * SPREAD, CAP);
    var dur = Math.max(200, (len / SPEED) * 1000);
    var el = document.createElement('b');
    el.className = cls;
    el.style.cssText = css + ';--at:' + Math.round(at) + 'ms;--len:' + Math.round(dur) + 'ms';
    if (at + dur > last) last = at + dur;
    frag.appendChild(el);
  }

  for (var x = 0; x <= pw; x += CELL) {
    rule('v', 'left:' + x + 'px;top:0;height:' + ph + 'px', x / vw, ph);
  }
  for (var y = 0; y <= ph; y += CELL) {
    rule('h', 'top:' + y + 'px;left:0;width:' + pw + 'px', y / vh, pw);
  }

  wrap.appendChild(frag);
  body.appendChild(wrap);

  // Two frames: the zero-scale start has to be committed before the end
  // value lands, or there is nothing to transition from.
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      wrap.classList.add('on');
      window.setTimeout(function () {
        // Both in the same tick, deliberately. Handing the swap to a rAF
        // leaves the overlay in the document if that frame never comes, and
        // the two layers are pixel-identical anyway, so there is nothing to
        // stage — they land together and the handover is invisible.
        finish();
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }, last + 150);
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
  // Project titles are excluded: their highlighter is driven by which
  // project is open (see the projects block above), and two owners of the
  // same clip-path would fight over it.
  var swipes = [].slice.call(
    document.querySelectorAll('.mark, .brush-mark, .doodle--lit')
  ).filter(function (el) { return !el.closest('.project'); });
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
   Projects — scroll drives which one is open

   The tabs hang off the section trace and one panel is open at a
   time. Scrolling through the section moves the focus down them;
   clicking a tab jumps the page to that project's slot, so the
   scroll position and the open panel can never disagree.

   Enhancement only, and it opts *in*. Until .is-live is set the
   CSS leaves every panel open, so no-JS, a short window, reduced
   motion and phones all get the whole section as plain content.
   Nothing here is required to read a project.
   ============================================================ */
(function initProjects() {
  var scroll = document.querySelector('.projects-scroll');
  if (!scroll) return;

  var stage = scroll.querySelector('.projects-stage');
  var items = [].slice.call(scroll.querySelectorAll('.project'));
  if (items.length < 2) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STICK = 88;        // stage offset below the sticky nav
  var SLOT = 0.62;       // screens of scroll per project
  var ROOM = 48;         // breathing space below the stage before it is cramped
  var live = false;
  var index = -1;
  var frame = null;

  /* Only fits() needs a size, and the panel's inner block reports its natural
     height whatever the outer grid track is doing — so nothing has to be
     unclamped, measured and put back. */
  function tallestPanel() {
    return items.reduce(function (max, item) {
      var inner = item.querySelector('.project-panel-in');
      return Math.max(max, inner ? inner.scrollHeight : 0);
    }, 0);
  }

  /* Live mode needs the stage to fit the window with the tallest panel open.
     On a short window it would be cropped, so the section stays a plain list
     instead — better to show everything than to hide it behind a viewport
     that cannot display it. */
  function fits() {
    if (reduce) return false;
    if (window.innerWidth < 901) return false;
    var tabs = items.reduce(function (sum, item) {
      return sum + item.querySelector('.project-tab').offsetHeight;
    }, 0);
    return window.innerHeight > STICK + tabs + tallestPanel() + ROOM;
  }

  // Every panel open, nothing selected. Called whenever live mode is off, not
  // only when it switches off — the markup ships with the first project open
  // so the section still reads correctly without JS, and that has to be
  // cleared here or the first tab keeps its selected styling over a list
  // where everything is already expanded.
  function relax() {
    index = -1;
    items.forEach(function (item) {
      item.classList.remove('is-open');
      item.querySelector('.project-tab').setAttribute('aria-expanded', 'true');
    });
    scroll.style.removeProperty('--scroll-room');
  }

  /* Distance from the top of the document to the scroll block.

     Deliberately not offsetTop: that is measured against the nearest
     positioned ancestor, and .section > .wrap is position:relative, so
     offsetTop returns a few hundred pixels inside the wrap rather than the
     page offset — which aimed the whole mapping at the wrong part of the
     document. A rect read is also self-correcting when anything above
     changes height. */
  function blockTop() {
    return scroll.getBoundingClientRect().top + window.scrollY;
  }

  function slotTop(i) {
    return blockTop() + i * window.innerHeight * SLOT;
  }

  function open(next, viaClick) {
    next = Math.max(0, Math.min(items.length - 1, next));
    if (next === index) return;
    index = next;
    items.forEach(function (item, i) {
      var on = i === index;
      item.classList.toggle('is-open', on);
      item.querySelector('.project-tab').setAttribute('aria-expanded', String(on));
    });
    if (viaClick) {
      window.scrollTo({ top: slotTop(index), behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  function onScroll() {
    frame = null;
    if (!live) return;
    // -rect.top is how far the block's top has passed above the viewport top.
    var into = -scroll.getBoundingClientRect().top;
    open(Math.round(into / (window.innerHeight * SLOT)));
  }

  function sync() {
    live = fits();
    scroll.classList.toggle('is-live', live);

    if (!live) return relax();

    scroll.style.setProperty('--stage-top', STICK + 'px');
    /* items.length slots, not items.length - 1. The stage unsticks once the
       block's bottom reaches it, at (room - stageHeight) of scrolling. With
       one slot per gap that lands exactly where the last project opens, so it
       appeared and was immediately scrolled away — measured at 13% of its
       range still stuck, against 100% for the ones before it. The extra slot
       is the last project's turn to be looked at. */
    scroll.style.setProperty('--scroll-room', Math.round(
      stage.offsetHeight + items.length * window.innerHeight * SLOT) + 'px');
    index = -1;                       // force open() to apply, not early-return
    onScroll();
  }

  items.forEach(function (item, i) {
    item.querySelector('.project-tab').addEventListener('click', function () {
      if (!live) return;              // plain list: the panel is already open
      open(i, true);
    });
  });

  window.addEventListener('scroll', function () {
    if (!frame) frame = window.requestAnimationFrame(onScroll);
  }, { passive: true });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(sync, 160);
  }, { passive: true });

  // Images change the panel heights as they land, so measure again after.
  window.addEventListener('load', sync);
  sync();
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

  /* Landing on a fragment — a shared #contact link, or a reload after
     clicking one — puts the page mid-document before the observer has
     evaluated anything, and loading index.html#contact renders a blank
     page: every section sits at opacity 0 with nothing to bring it back.
     The failsafe in <head> cannot help, because script.js has by then
     already cleared it.

     So sweep whatever is on screen and reveal it directly, rather than
     trusting the observer to have caught it. Cheap, idempotent, and it
     turns the worst case from "the page is empty" into "one section
     appeared without its animation". */
  function sweep() {
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    items.forEach(function (el) {
      if (el.classList.contains('visible')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        el.classList.add('visible');
        observer.unobserve(el);
      }
    });
  }

  window.addEventListener('load', sweep);
  window.setTimeout(sweep, 1200);
  sweep();
})();
