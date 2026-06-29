'use strict';
/**
 * kuschi-kitchen-mode.js
 * Persisted "Kitchen Mode" large-type toggle + small-tablet profile.
 *
 * Applies html.kitchen-mode from localStorage on every page load.
 * Auto-wires any element with [data-kitchen-mode-toggle] or id="kmToggleBtn".
 * Exposes window.KuschiKitchenMode + global toggleKitchenMode() so inline
 * onclick="toggleKitchenMode()" still works on every page without per-page JS.
 */
(function () {
  var LS_KEY = 'kuschiKitchenMode';
  var PROFILE_RESIZE_DELAY = 120;
  var profileTimer = null;

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

  function _viewport() {
    var root = document.documentElement;
    var w = Math.round(window.innerWidth || root.clientWidth || 0);
    var h = Math.round(window.innerHeight || root.clientHeight || 0);
    var sw = Math.round((window.screen && window.screen.width) || 0);
    var sh = Math.round((window.screen && window.screen.height) || 0);
    return {
      width: w,
      height: h,
      shortEdge: Math.min(w, h),
      longEdge: Math.max(w, h),
      screenShortEdge: sw && sh ? Math.min(sw, sh) : 0,
      screenLongEdge: sw && sh ? Math.max(sw, sh) : 0
    };
  }

  function _applyDeviceProfile() {
    var root = document.documentElement;
    var vp = _viewport();
    var coarsePointer = false;
    try { coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches; } catch (_) {}
    var viewportTablet = vp.shortEdge >= 640 && vp.shortEdge <= 930 && vp.longEdge >= 900 && vp.longEdge <= 1500;
    var screenTablet = vp.screenShortEdge >= 700 && vp.screenShortEdge <= 930 && vp.screenLongEdge >= 1000 && vp.screenLongEdge <= 1500;
    var tabletShape = viewportTablet || (screenTablet && (coarsePointer || vp.shortEdge >= 560));
    var memory = Number(navigator.deviceMemory || 0);
    var lowMemory = tabletShape || (memory > 0 && memory <= 4);

    root.classList.toggle('lenovo-tab-one-profile', tabletShape);
    root.classList.toggle('low-memory-device', lowMemory);
    root.dataset.kuschiViewport = vp.width + 'x' + vp.height;
    if (vp.screenShortEdge) root.dataset.kuschiScreen = vp.screenShortEdge + 'x' + vp.screenLongEdge;
    if (memory > 0) root.dataset.kuschiMemoryGb = String(memory);
  }

  function _scheduleDeviceProfile() {
    clearTimeout(profileTimer);
    profileTimer = setTimeout(_applyDeviceProfile, PROFILE_RESIZE_DELAY);
  }

  function toggle() {
    var active = document.documentElement.classList.toggle('kitchen-mode');
    _syncButtons(active);
    try { localStorage.setItem(LS_KEY, active ? '1' : '0'); } catch (_) {}
    return active;
  }

  // Run immediately — scripts at end of <body> have full DOM access.
  _apply();
  _applyDeviceProfile();

  // Also re-sync after DOMContentLoaded (for pages that load the script in <head>).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      _apply();
      _applyDeviceProfile();
    });
  }

  window.addEventListener('resize', _scheduleDeviceProfile, { passive: true });
  window.addEventListener('orientationchange', _scheduleDeviceProfile, { passive: true });

  window.KuschiKitchenMode = { toggle: toggle, isActive: _isActive, applyDeviceProfile: _applyDeviceProfile };

  // Global alias so inline onclick="toggleKitchenMode()" works with zero per-page JS.
  window.toggleKitchenMode = toggle;
})();
