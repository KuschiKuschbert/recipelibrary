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

  var toastTimer = null;

  function toast(message, opts) {
    var doc = w.document;
    if (!doc || !doc.body) return;
    var options = opts || {};
    var el = doc.getElementById('kuschiToast');
    if (!el) {
      el = doc.createElement('div');
      el.id = 'kuschiToast';
      el.className = 'kuschi-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      doc.body.appendChild(el);
    }
    el.textContent = String(message || '');
    el.classList.toggle('kuschi-toast--error', options.kind === 'error');
    el.classList.add('kuschi-toast--show');
    w.clearTimeout(toastTimer);
    toastTimer = w.setTimeout(function () {
      el.classList.remove('kuschi-toast--show');
    }, options.duration || (options.kind === 'error' ? 2600 : 1800));
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

  function createFilterScheduler(opts) {
    opts = opts || {};
    var run = typeof opts.run === 'function' ? opts.run : function () {};
    var doc = w.document;
    var lowMemory =
      doc && doc.documentElement && doc.documentElement.classList.contains('low-memory-device');
    var delay =
      opts.delay != null
        ? opts.delay
        : lowMemory
          ? (opts.lowMemoryDelay != null ? opts.lowMemoryDelay : 220)
          : (opts.defaultDelay != null ? opts.defaultDelay : 150);
    var timer = null;
    var frame = null;
    var pendingText = opts.pendingText == null ? 'Searching...' : String(opts.pendingText);
    var barId = opts.resultsBarId || 'resultsBar';
    var metaId = opts.resultsMetaId || 'resultsMeta';

    function clear() {
      if (timer) {
        w.clearTimeout(timer);
        timer = null;
      }
      if (frame) {
        if (typeof w.cancelAnimationFrame === 'function') {
          w.cancelAnimationFrame(frame);
        } else {
          w.clearTimeout(frame);
        }
        frame = null;
      }
    }

    function setPending(pending) {
      var bar = doc && doc.getElementById(barId);
      var meta = doc && doc.getElementById(metaId);
      if (typeof opts.onPending === 'function') {
        var handled = opts.onPending({
          pending: !!pending,
          text: pendingText,
          bar: bar,
          meta: meta,
        });
        if (handled === false) return;
      }
      if (!bar || !meta) return;
      bar.classList.toggle('is-searching', !!pending);
      if (pending) {
        var shouldShow =
          typeof opts.shouldShowPending === 'function'
            ? opts.shouldShowPending({ bar: bar, meta: meta })
            : true;
        if (shouldShow) meta.textContent = pendingText;
      } else if (opts.clearPendingText !== false) {
        meta.textContent = '';
      }
    }

    function schedule(scheduleOpts) {
      var options = scheduleOpts || {};
      clear();
      if (options.immediate) {
        setPending(false);
        run();
        return;
      }
      setPending(true);
      timer = w.setTimeout(function () {
        timer = null;
        var go = function () {
          frame = null;
          run();
        };
        if (typeof w.requestAnimationFrame === 'function') {
          frame = w.requestAnimationFrame(go);
        } else {
          frame = w.setTimeout(go, 0);
        }
      }, options.delay == null ? delay : options.delay);
    }

    return {
      clear: clear,
      schedule: schedule,
      setPending: setPending,
    };
  }

  w.KuschiRecipeUi = {
    esc: esc,
    copyText: copyText,
    toast: toast,
    bindSearchClear: bindSearchClear,
    createFilterScheduler: createFilterScheduler,
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
