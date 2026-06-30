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
  var _cookNavRetryTimer = null;

  function clearCookNavRetry() {
    if (!_cookNavRetryTimer) return;
    clearTimeout(_cookNavRetryTimer);
    _cookNavRetryTimer = null;
  }

  function scheduleCookNavRetry(overlay) {
    if (!overlay || !overlay.classList.contains('cook-mode')) return;
    var retries = overlay._kuschiCookNavRetries || 0;
    if (retries >= 12) return;
    overlay._kuschiCookNavRetries = retries + 1;
    clearCookNavRetry();
    _cookNavRetryTimer = setTimeout(function () {
      _cookNavRetryTimer = null;
      buildCookModeStepNav();
    }, 140);
  }

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
    } else {
      _cleanupCookMode();
    }
  }

  function buildCookModeStepNav() {
    if (document.getElementById('cookStepNav')) return;

    var overlay = document.getElementById(_overlayId);
    if (!overlay) return;
    var steps = overlay.querySelectorAll('.modal-steps li, .modal-step');
    if (!steps.length) {
      scheduleCookNavRetry(overlay);
      return;
    }
    overlay._kuschiCookNavRetries = 0;
    clearCookNavRetry();

    var currentStep = 0;
    var total = steps.length;
    var prevBtn = null;
    var nextBtn = null;
    var phaseEl = null;
    var previewEl = null;
    var stepMeta = Array.prototype.map.call(steps, function (el, i) {
      return {
        phase: el.getAttribute('data-cook-phase') || '',
        label: el.getAttribute('data-cook-step-label') || String(i + 1),
        phaseIndex: el.getAttribute('data-cook-phase-index') || '',
        phaseTotal: el.getAttribute('data-cook-phase-total') || '',
      };
    });

    function phaseLabel(meta) {
      if (!meta || !meta.phase) return '';
      if (meta.phaseIndex && meta.phaseTotal) {
        return meta.phase + ' ' + meta.label + ' of ' + meta.phaseTotal;
      }
      return meta.phase + ' ' + meta.label;
    }

    function navLabel(idx) {
      var meta = stepMeta[idx];
      var label = phaseLabel(meta);
      return label || ('Step ' + (idx + 1));
    }

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
        if (i === currentStep) el.setAttribute('aria-current', 'step');
        else el.removeAttribute('aria-current');
      });
      var meta = stepMeta[currentStep] || {};
      if (nav) {
        nav.setAttribute('data-cook-phase', (meta.phase || 'method').toLowerCase());
      }
      if (phaseEl) {
        var label = phaseLabel(meta);
        phaseEl.textContent = label;
        phaseEl.hidden = !label;
      }
      var counter = document.getElementById('cookStepCounter');
      if (counter) counter.textContent = 'Step ' + (currentStep + 1) + ' / ' + total;
      if (previewEl) {
        previewEl.textContent = (steps[currentStep].textContent || '').trim().replace(/\s+/g, ' ');
      }
      if (prevBtn) {
        prevBtn.disabled = currentStep === 0;
        prevBtn.setAttribute('aria-disabled', currentStep === 0 ? 'true' : 'false');
        prevBtn.setAttribute('aria-label', currentStep === 0 ? 'Previous step' : 'Previous step: ' + navLabel(currentStep - 1));
      }
      if (nextBtn) {
        nextBtn.disabled = currentStep === total - 1;
        nextBtn.setAttribute('aria-disabled', currentStep === total - 1 ? 'true' : 'false');
        nextBtn.setAttribute('aria-label', currentStep === total - 1 ? 'Next step' : 'Next step: ' + navLabel(currentStep + 1));
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
      '<span class="cook-step-meter" aria-live="polite">' +
        '<span class="cook-step-phase" id="cookStepPhase" hidden></span>' +
        '<span class="cook-step-counter" id="cookStepCounter">Step 1 / ' + total + '</span>' +
        '<span class="cook-step-preview" id="cookStepPreview"></span>' +
      '</span>' +
      '<button class="cook-step-next" type="button" onclick="cookStepNav.next()" aria-label="Next step">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
      '</button>';

    var modal = document.getElementById(_modalId);
    if (modal) modal.appendChild(nav);
    prevBtn = nav.querySelector('.cook-step-prev');
    nextBtn = nav.querySelector('.cook-step-next');
    phaseEl = nav.querySelector('#cookStepPhase');
    previewEl = nav.querySelector('#cookStepPreview');

    function handleStepClick(e) {
      if (!overlay.classList.contains('cook-mode')) return;
      var stepEl = e.target.closest('.modal-steps li, .modal-step');
      if (!stepEl || !overlay.contains(stepEl)) return;
      var idx = Array.prototype.indexOf.call(steps, stepEl);
      if (idx >= 0) goToStep(idx);
    }
    overlay.addEventListener('click', handleStepClick);
    nav._kuschiCookCleanup = function () {
      overlay.removeEventListener('click', handleStepClick);
    };

    window.cookStepNav = {
      prev: function () { goToStep(currentStep - 1); },
      next: function () { goToStep(currentStep + 1); },
    };

    goToStep(0);
  }

  // Remove the step nav when the modal closes so it rebuilds fresh next open.
  function _cleanupCookMode() {
    clearCookNavRetry();
    var nav = document.getElementById('cookStepNav');
    if (nav) {
      if (typeof nav._kuschiCookCleanup === 'function') nav._kuschiCookCleanup();
      nav.remove();
    }
    window.cookStepNav = null;
    var overlay = document.getElementById(_overlayId);
    if (overlay) {
      overlay.classList.remove('cook-mode');
      overlay.querySelectorAll('.cook-step-active, .cook-step-past').forEach(function (el) {
        el.classList.remove('cook-step-active', 'cook-step-past');
      });
      overlay.querySelectorAll('[aria-current="step"]').forEach(function (el) {
        el.removeAttribute('aria-current');
      });
    }
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
