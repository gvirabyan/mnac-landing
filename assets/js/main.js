/* ============================================================
   MAIN — интерактив лендинга: навигация, анимации, счётчик, FAQ
   Без внешних зависимостей.
   ============================================================ */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. Индикатор прокрутки + «прилипающая» навигация
     --------------------------------------------------------- */
  function initScrollUI() {
    var bar = document.querySelector('.scroll-progress');
    var nav = document.querySelector('.nav');
    var ticking = false;

    function update() {
      var scrolled = window.scrollY;
      var height = document.documentElement.scrollHeight - window.innerHeight;

      if (bar) {
        bar.style.transform = 'scaleX(' + (height > 0 ? scrolled / height : 0) + ')';
      }
      if (nav) {
        nav.classList.toggle('is-stuck', scrolled > 20);
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });

    update();
  }

  /* ---------------------------------------------------------
     2. Мобильное меню
     --------------------------------------------------------- */
  function initNavToggle() {
    var nav = document.querySelector('.nav');
    var toggle = document.querySelector('.nav-toggle');
    if (!nav || !toggle) return;

    function close() {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.querySelectorAll('.nav-links a').forEach(function (link) {
      link.addEventListener('click', close);
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ---------------------------------------------------------
     3. Появление блоков при прокрутке (с каскадом)
     --------------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    items.forEach(function (el) {
      // Каскад внутри одной группы: data-stagger задаёт шаг в мс
      var group = el.parentElement;
      if (group && group.hasAttribute('data-stagger')) {
        var siblings = Array.prototype.filter.call(group.children, function (c) {
          return c.classList.contains('reveal');
        });
        var step = parseInt(group.getAttribute('data-stagger'), 10) || 90;
        el.style.setProperty('--reveal-delay', (siblings.indexOf(el) * step) + 'ms');
      }
      observer.observe(el);
    });
  }

  /* ---------------------------------------------------------
     4. Живой счётчик службы в hero
     --------------------------------------------------------- */
  function initCountdown() {
    var root = document.querySelector('[data-countdown]');
    if (!root) return;

    var start = new Date(root.getAttribute('data-start'));
    var end = new Date(root.getAttribute('data-end'));
    if (isNaN(start) || isNaN(end)) return;

    var fields = {
      days: root.querySelector('[data-unit="days"]'),
      hours: root.querySelector('[data-unit="hours"]'),
      minutes: root.querySelector('[data-unit="minutes"]'),
      seconds: root.querySelector('[data-unit="seconds"]')
    };
    var fill = root.querySelector('.fill');
    var percentOut = root.querySelector('[data-percent]');
    var previous = {};

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    function write(node, value, key) {
      if (!node || previous[key] === value) return;
      node.textContent = value;
      previous[key] = value;

      if (!reduceMotion) {
        node.classList.remove('is-ticking');
        // Перезапуск анимации: принудительный reflow
        void node.offsetWidth;
        node.classList.add('is-ticking');
      }
    }

    function tick() {
      var now = Date.now();
      var left = Math.max(0, end - now);

      var seconds = Math.floor(left / 1000);
      var days = Math.floor(seconds / 86400);
      var hours = Math.floor((seconds % 86400) / 3600);
      var minutes = Math.floor((seconds % 3600) / 60);

      write(fields.days, String(days), 'd');
      write(fields.hours, pad(hours), 'h');
      write(fields.minutes, pad(minutes), 'm');
      write(fields.seconds, pad(seconds % 60), 's');

      var total = end - start;
      var done = total > 0 ? Math.min(100, Math.max(0, ((now - start) / total) * 100)) : 0;

      if (fill) fill.style.width = done.toFixed(1) + '%';
      if (percentOut) percentOut.textContent = Math.round(done) + '%';
    }

    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------
     5. Счёт цифр в блоке статистики
     --------------------------------------------------------- */
  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';

      if (reduceMotion) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }

      var duration = 1700;
      var startedAt = null;

      function frame(now) {
        if (startedAt === null) startedAt = now;
        var p = Math.min(1, (now - startedAt) / duration);
        var eased = 1 - Math.pow(1 - p, 4); // ease-out quart
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (p < 1) window.requestAnimationFrame(frame);
      }

      window.requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) {
      counters.forEach(run);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------------------------------------------------
     6. Свет под курсором на карточках
     --------------------------------------------------------- */
  function initSpotlight() {
    if (reduceMotion || !window.matchMedia('(hover: hover)').matches) return;

    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
      });
    });
  }

  /* ---------------------------------------------------------
     7. FAQ-аккордеон
     --------------------------------------------------------- */
  function initFaq() {
    document.querySelectorAll('.faq-item').forEach(function (item) {
      var button = item.querySelector('.faq-q');
      if (!button) return;

      button.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');

        // Одновременно открыт только один вопрос
        document.querySelectorAll('.faq-item.is-open').forEach(function (other) {
          other.classList.remove('is-open');
          var b = other.querySelector('.faq-q');
          if (b) b.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
          item.classList.add('is-open');
          button.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* ---------------------------------------------------------
     8. Плавный параллакс телефона в hero
     --------------------------------------------------------- */
  function initParallax() {
    var stage = document.querySelector('.hero-stage');
    // Наклон живёт на обёртке: у самого .phone transform занят анимацией floaty
    var phone = document.querySelector('.phone-tilt');
    if (!stage || !phone || reduceMotion || !window.matchMedia('(hover: hover)').matches) return;

    stage.addEventListener('pointermove', function (e) {
      var rect = stage.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      phone.style.transform = 'perspective(1100px) rotateY(' + (x * 9) + 'deg) rotateX(' + (-y * 9) + 'deg)';
    });

    stage.addEventListener('pointerleave', function () {
      phone.style.transform = '';
    });
  }

  /* --------------------------------------------------------- */

  function init() {
    initScrollUI();
    initNavToggle();
    initReveal();
    initCountdown();
    initCounters();
    initSpotlight();
    initFaq();
    initParallax();

    document.documentElement.classList.add('js-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
