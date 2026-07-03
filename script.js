/* ============================================
   Dark Mode Toggle
   ============================================ */
(function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Set initial theme
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();

/* ============================================
   Sticky Nav — Active Link, Sliding Indicator & Scroll Shadow
   ============================================ */
(function initNav() {
  const nav = document.querySelector('.nav');
  const navInner = document.querySelector('.nav-inner');
  const sections = document.querySelectorAll('.section');
  const navLinks = document.querySelectorAll('.nav-link');
  const indicator = document.querySelector('.nav-indicator');
  let navTop = 0;

  function updateNavTop() {
    if (nav) navTop = nav.offsetTop;
  }

  function updateNav() {
    // Add shadow when nav is sticky
    if (nav) {
      nav.classList.toggle('nav-scrolled', window.scrollY > navTop);
    }

    // Determine active section
    let currentId = '';
    const scrollPos = window.scrollY + 140;

    sections.forEach((section) => {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      if (scrollPos >= top && scrollPos < bottom) {
        currentId = section.getAttribute('id');
      }
    });

    // Fallback: if no section is active and we're past the second-to-last,
    // activate the last section (contact)
    if (!currentId && sections.length > 1) {
      const secondLast = sections[sections.length - 2];
      const last = sections[sections.length - 1];
      if (window.scrollY + 140 >= secondLast.offsetTop + secondLast.offsetHeight) {
        currentId = last.getAttribute('id');
      }
    }

    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
    });

    // Move the sliding indicator relative to nav-inner
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink && indicator && navInner) {
      const innerRect = navInner.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      indicator.style.transform = `translateX(${linkRect.left - innerRect.left}px)`;
      indicator.style.width = `${linkRect.width}px`;
    }
  }

  // Throttled scroll handler
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateNav();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Run on load and resize
  window.addEventListener('load', () => {
    updateNavTop();
    updateNav();
  });
  window.addEventListener('resize', updateNavTop);
  setTimeout(() => {
    updateNavTop();
    updateNav();
  }, 100);
})();

/* ============================================
   Scroll-Triggered Fade-In Animations
   ============================================ */
(function initScrollReveal() {
  const fadeElements = document.querySelectorAll('.fade-in');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    fadeElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback: show everything immediately
    fadeElements.forEach((el) => el.classList.add('visible'));
  }
})();