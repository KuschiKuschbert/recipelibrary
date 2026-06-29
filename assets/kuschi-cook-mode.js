'use strict';
/**
 * kuschi-cook-mode.js
 * Full-screen Cook Mode overlay + step navigation + history-based routing.
 *
 * Cook Mode:
 *   Exposes global toggleCookMode() so inline onclick="toggleCookMode()" works.
 *   Adds .cook-mode to the active #modalOverlay, builds the prev/next step nav,
 *   auto-requests wake-lock via KuschiScreenWake (if loaded).
 *
 * Routing:
 *   Call KuschiCookMode.bindRouting(openFn, closeFn) once the page is ready.
 *   - openFn(id): page-specific function that opens a recipe modal (e.g. openRecipe)
 *   - closeFn():  page-specific function that closes the modal (e.g. closeModal)
 *   On open:  pushes/updates ?open=<id> in history.
 *   On close: pops only the ?open= param out of history.
 *   popstate: Android/desktop back button closes the modal instead of navigating away.
 *   On load:  if ?open=<id> is present, calls openFn after a short delay.
 */
(function () {

  var _overlayId = 'modalOverlay';
  var _modalId   = 'modal';

  // ── Cook Mode ─────────────────────────────────────────────────────────────
  function toggleCookMode() {
    var overlay = document.getElementById(_overlayId);
    var btn = document.getElementById('cookModeBtn');
    if (!overlay) return;

    var entering = !overlay.classList.contains('cook-mode');
    overlay.classList.toggle('cook-mode', entering);
    if (btn) btn.classList.toggle('cook-mode-btn--active', entering);

    if (entering) {
      if (window.KuschiScreenWake) {
        try { KuschiScreenWake.request(); } catch (_) {}
      }
      buildCookModeStepNav();
    }
  }

  function buildCookModeStepNav() {
    if (document.getElementById('cookStepNav')) return;

    var overlay = document.getElementById(_overlayId);
    if (!overlay) return;
    var steps = overlay.querySelectorAll('.modal-steps li, .modal-step');
    if (!steps.length) return;

    var currentStep = 0;
    var total = steps.length;
    var prevBtn = null;
    var nextBtn = null;

    function prefersInstantStepScroll() {
      var root = document.documentElement;
      if (root && root.classList.contains('low-memory-device')) return true;
      try {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      } catch (_) {
        return false;
      }
    }

    function goToStep(idx) {
      currentStep = Math.max(0, Math.min(total - 1, idx));
      steps.forEach(function (el, i) {
        el.classList.toggle('cook-step-active', i === currentStep);
        el.classList.toggle('cook-step-past', i < currentStep);
      });
      var counter = document.getElementById('cookStepCounter');
      if (counter) counter.textContent = (currentStep + 1) + ' / ' + total;
      if (prevBtn) {
        prevBtn.disabled = currentStep === 0;
        prevBtn.setAttribute('aria-disabled', currentStep === 0 ? 'true' : 'false');
      }
      if (nextBtn) {
        nextBtn.disabled = currentStep === total - 1;
        nextBtn.setAttribute('aria-disabled', currentStep === total - 1 ? 'true' : 'false');
      }
      steps[currentStep].scrollIntoView({
        behavior: prefersInstantStepScroll() ? 'auto' : 'smooth',
        block: 'center',
      });
    }

    var nav = document.createElement('div');
    nav.id = 'cookStepNav';
    nav.className = 'cook-step-nav';
    nav.innerHTML =
      '<button class="cook-step-prev" type="button" onclick="cookStepNav.prev()" aria-label="Previous step">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>' +
      '</button>' +
      '<span class="cook-step-counter" id="cookStepCounter">1 / ' + total + '</span>' +
      '<button class="cook-step-next" type="button" onclick="cookStepNav.next()" aria-label="Next step">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
      '</button>';

    var modal = document.getElementById(_modalId);
    if (modal) modal.appendChild(nav);
    prevBtn = nav.querySelector('.cook-step-prev');
    nextBtn = nav.querySelector('.cook-step-next');

    window.cookStepNav = {
      prev: function () { goToStep(currentStep - 1); },
      next: function () { goToStep(currentStep + 1); },
    };

    goToStep(0);
  }

  // Remove the step nav when the modal closes so it rebuilds fresh next open.
  function _cleanupCookMode() {
    var nav = document.getElementById('cookStepNav');
    if (nav) nav.remove();
    window.cookStepNav = null;
    var overlay = document.getElementById(_overlayId);
    if (overlay) overlay.classList.remove('cook-mode');
    var btn = document.getElementById('cookModeBtn');
    if (btn) btn.classList.remove('cook-mode-btn--active');
  }

  // ── Routing ───────────────────────────────────────────────────────────────
  var _openFn  = null;
  var _closeFn = null;

  function _pushOpen(id) {
    try {
      var p = new URLSearchParams(window.location.search);
      p.set('open', id);
      var qs = p.toString();
      var url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
      history.pushState({ kuschiOpen: id }, '', url);
    } catch (_) {}
  }

  function _popOpen() {
    try {
      var p = new URLSearchParams(window.location.search);
      if ((history.state && history.state.kuschiOpen) || p.has('open')) {
        p.delete('open');
        var qs = p.toString();
        var url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
        history.pushState({}, '', url);
      }
    } catch (_) {}
  }

  function _tryDeepLink() {
    try {
      var p = new URLSearchParams(window.location.search);
      var id = p.get('open');
      if (id && typeof _openFn === 'function') {
        setTimeout(function () { _openFn(id); }, 120);
      }
    } catch (_) {}
  }

  function bindRouting(openFn, closeFn) {
    _openFn  = openFn;
    _closeFn = closeFn;

    window.addEventListener('popstate', function (e) {
      // Back button: if a recipe is open, close it instead of navigating.
      var overlay = document.getElementById(_overlayId);
      if (overlay && overlay.classList.contains('open')) {
        if (typeof _closeFn === 'function') _closeFn();
      }
    });

    // Check deep-link param on first load.
    _tryDeepLink();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.toggleCookMode      = toggleCookMode;
  window.buildCookModeStepNav = buildCookModeStepNav;

  window.KuschiCookMode = {
    bindRouting:   bindRouting,
    pushOpen:      _pushOpen,
    popOpen:       _popOpen,
    cleanup:       _cleanupCookMode,
  };
})();
