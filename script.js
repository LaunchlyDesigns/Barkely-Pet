/* ============================================================
   BARKLEY PET — MAIN SCRIPT (script.js)
   Handles: navbar, mobile menu, scroll animations, hero
   ============================================================ */

// ── Wait for the DOM to fully load before running scripts ──
document.addEventListener('DOMContentLoaded', () => {

  initNavbar();
  initMobileMenu();
  initScrollAnimations();
  initHeroBg();
  markActiveLink();

});

/* ============================================================
   1. STICKY NAVBAR
   Adds the .scrolled class when user scrolls past 80px
   CSS then styles it with dark background + shadow
   ============================================================ */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* ============================================================
   2. MOBILE HAMBURGER MENU
   Toggles the full-screen mobile nav on small screens
   ============================================================ */
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const mobileNav  = document.querySelector('.mobile-nav');
  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
    // Prevent body scrolling when menu is open
    document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
  });

  // Close menu when any link inside it is clicked
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ============================================================
   3. SCROLL ANIMATIONS
   Uses IntersectionObserver to add .visible class when
   elements with [data-animate] enter the viewport.
   CSS transitions handle the actual animation.
   ============================================================ */
function initScrollAnimations() {
  // Select all elements that should animate on scroll
  const targets = document.querySelectorAll('[data-animate]');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Stop observing once animation has played
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,   // Trigger when 12% of element is visible
    rootMargin: '0px 0px -40px 0px'  // Slightly before bottom of viewport
  });

  targets.forEach(el => observer.observe(el));
}

/* ============================================================
   4. HERO BACKGROUND REVEAL
   Adds .loaded class to trigger the slow Ken Burns zoom-out
   ============================================================ */
function initHeroBg() {
  const heroBg = document.querySelector('.hero__bg');
  if (!heroBg) return;

  // Trigger animation after a brief delay
  setTimeout(() => heroBg.classList.add('loaded'), 100);
}

/* ============================================================
   5. MARK ACTIVE NAV LINK
   Compares current page URL to nav links and highlights
   the matching one with the .active class
   ============================================================ */
function markActiveLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.navbar__links a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* ============================================================
   6. SMOOTH SCROLL FOR ANCHOR LINKS
   Allows in-page anchor links like <a href="#packages">
   to scroll smoothly to the target element
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});