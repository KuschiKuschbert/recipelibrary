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
  };
})(typeof window !== 'undefined' ? window : globalThis);
