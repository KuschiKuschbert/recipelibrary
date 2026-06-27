'use strict';
/**
 * kuschi-kitchen-mode.js
 * Persisted "Kitchen Mode" large-type toggle.
 *
 * Applies html.kitchen-mode from localStorage on every page load.
 * Auto-wires any element with [data-kitchen-mode-toggle] or id="kmToggleBtn".
 * Exposes window.KuschiKitchenMode + global toggleKitchenMode() so inline
 * onclick="toggleKitchenMode()" still works on every page without per-page JS.
 */
(function () {
  var LS_KEY = 'kuschiKitchenMode';

  function _isActive() {
    return document.documentElement.classList.contains('kitchen-mode');
  }

  function _syncButtons(active) {
    document.querySelectorAll('[data-kitchen-mode-toggle], #kmToggleBtn').forEach(function (btn) {
      btn.setAttribute('data-km-active', active ? 'true' : 'false');
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function _apply() {
    var on = false;
    try { on = localStorage.getItem(LS_KEY) === '1'; } catch (_) {}
    if (on) document.documentElement.classList.add('kitchen-mode');
    _syncButtons(on);
  }

  function toggle() {
    var active = document.documentElement.classList.toggle('kitchen-mode');
    _syncButtons(active);
    try { localStorage.setItem(LS_KEY, active ? '1' : '0'); } catch (_) {}
    return active;
  }

  // Run immediately — scripts at end of <body> have full DOM access.
  _apply();

  // Also re-sync after DOMContentLoaded (for pages that load the script in <head>).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _apply);
  }

  window.KuschiKitchenMode = { toggle: toggle, isActive: _isActive };

  // Global alias so inline onclick="toggleKitchenMode()" works with zero per-page JS.
  window.toggleKitchenMode = toggle;
})();
