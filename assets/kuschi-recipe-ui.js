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

  function copyText(text) {
    var value = String(text == null ? '' : text);
    function fallbackCopy() {
      return new Promise(function (resolve, reject) {
        var doc = w.document;
        if (!doc || !doc.body || !doc.execCommand) {
          reject(new Error('Clipboard unavailable'));
          return;
        }
        var active = doc.activeElement;
        var ta = doc.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        ta.style.opacity = '0';
        doc.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
          if (doc.execCommand('copy')) {
            resolve();
          } else {
            reject(new Error('Copy command failed'));
          }
        } catch (err) {
          reject(err);
        } finally {
          doc.body.removeChild(ta);
          if (active && active.focus) active.focus();
        }
      });
    }

    if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
      return w.navigator.clipboard.writeText(value).catch(fallbackCopy);
    }
    return fallbackCopy();
  }

  var searchClearSync = Object.create(null);

  function bindSearchClear(opts) {
    opts = opts || {};
    var inputId = opts.inputId || 'search';
    var buttonId = opts.buttonId || 'searchClear';
    var input = w.document && w.document.getElementById(inputId);
    var button = w.document && w.document.getElementById(buttonId);
    if (!input || !button) return;

    function sync() {
      button.hidden = !input.value;
    }

    searchClearSync[inputId] = sync;
    input.addEventListener('input', sync);
    button.addEventListener('click', function () {
      if (!input.value) return;
      input.value = '';
      sync();
      input.focus();
      if (typeof opts.onClear === 'function') opts.onClear();
    });
    sync();
  }

  function syncSearchClear(inputId) {
    var sync = searchClearSync[inputId || 'search'];
    if (sync) sync();
  }

  w.KuschiRecipeUi = {
    esc: esc,
    copyText: copyText,
    bindSearchClear: bindSearchClear,
    syncSearchClear: syncSearchClear,
    /**
     * @param {{ idSuffix?: string, openByDefault?: boolean, modalInline?: boolean }} [opts]
     */
    aromaSeasoningSectionHtml: function (opts) {
      if (!w.KuschiAromaHints) return '';
      var o = opts || {};
      return w.KuschiAromaHints.seasoningSectionHtml(null, {
        idSuffix: o.idSuffix != null ? o.idSuffix : 'Ui',
        openByDefault: !!o.openByDefault,
        modalInline: !!o.modalInline,
      });
    },
    hydrateModalAroma: function (modalEl, recipe) {
      if (w.KuschiAromaHints) w.KuschiAromaHints.hydrateModal(modalEl, recipe);
    },
    /**
     * Run after the next paint (macrotask + rAF). Avoids requestIdleCallback with a long
     * timeout — under load, idle could defer hydration ~2.5s and feel like a frozen modal.
     * @param {() => boolean} [isStillOpen] Return false if user closed modal or switched recipe.
     */
    scheduleHydrateModalAroma: function (modalEl, recipe, isStillOpen) {
      if (!modalEl || !recipe) return;
      var go = function () {
        if (!modalEl.isConnected || !w.KuschiAromaHints) return;
        if (typeof isStillOpen === 'function' && !isStillOpen()) return;
        w.KuschiAromaHints.hydrateModal(modalEl, recipe);
      };
      w.setTimeout(function () {
        if (typeof w.requestAnimationFrame === 'function') {
          w.requestAnimationFrame(go);
        } else {
          w.setTimeout(go, 0);
        }
      }, 0);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
