// Mobile menu toggle
document.getElementById('menuToggle').addEventListener('click', function () {
  document.getElementById('navLinks').classList.toggle('open');
});

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var answer = this.nextElementSibling;
    var isOpen = answer.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-answer').forEach(function (a) {
      a.classList.remove('open');
    });
    document.querySelectorAll('.faq-question').forEach(function (q) {
      q.classList.remove('active');
    });

    // Toggle current
    if (!isOpen) {
      answer.classList.add('open');
      this.classList.add('active');
    }
  });
});

// Scroll animation
var observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(function (el) {
  observer.observe(el);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener('click', function (e) {
    var target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Close mobile menu
      document.getElementById('navLinks').classList.remove('open');
    }
  });
});
