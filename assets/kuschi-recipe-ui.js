/**
 * Shared HTML escaping and Aroma modal wiring for index, kitchen-book, riviera.
 * Depends on assets/aroma-hints.js when using aroma helpers (load aroma-hints first).
 */
(function (w) {
  'use strict';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  w.KuschiRecipeUi = {
    esc: esc,
    /**
     * @param {{ idSuffix?: string, openByDefault?: boolean }} [opts]
     */
    aromaSeasoningSectionHtml: function (opts) {
      if (!w.KuschiAromaHints) return '';
      var o = opts || {};
      return w.KuschiAromaHints.seasoningSectionHtml(null, {
        idSuffix: o.idSuffix != null ? o.idSuffix : 'Ui',
        openByDefault: !!o.openByDefault,
      });
    },
    hydrateModalAroma: function (modalEl, recipe) {
      if (w.KuschiAromaHints) w.KuschiAromaHints.hydrateModal(modalEl, recipe);
    },
    /**
     * Defer aroma matching until the browser is idle so the user can scroll, close,
     * and use inputs immediately after the modal paints. Falls back to setTimeout(0).
     * @param {() => boolean} [isStillOpen] Return false if user closed modal or switched recipe.
     */
    scheduleHydrateModalAroma: function (modalEl, recipe, isStillOpen) {
      if (!modalEl || !recipe) return;
      var go = function () {
        if (!modalEl.isConnected || !w.KuschiAromaHints) return;
        if (typeof isStillOpen === 'function' && !isStillOpen()) return;
        w.KuschiAromaHints.hydrateModal(modalEl, recipe);
      };
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(go, { timeout: 500 });
      } else {
        w.setTimeout(go, 0);
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
