/**
 * Planner extras — export/import, HTML download, pairing hints, cost estimates.
 */
(function () {
  'use strict';

  var _pairingHints = null;
  var _unitCosts = null;
  var _dataPromise = null;

  function siteBaseUrl() {
    var loc = window.location || { origin: '', pathname: '' };
    var path = loc.pathname || '';
    if (/\.html?$/i.test(path)) {
      var dir = path.slice(0, path.lastIndexOf('/'));
      return dir ? loc.origin + dir : loc.origin;
    }
    var stripped = path.replace(/\/$/, '') || '';
    return stripped ? loc.origin + stripped : loc.origin;
  }

  function fetchJson(path) {
    return fetch(siteBaseUrl() + '/' + path.replace(/^\/+/, ''), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('Could not load ' + path);
      return res.json();
    });
  }

  function loadPlannerExtrasData() {
    if (!_dataPromise) {
      _dataPromise = Promise.all([
        fetchJson('riviera_data/planner_pairing_hints.json').catch(function () {
          return { hints: {} };
        }),
        fetchJson('riviera_data/planner_unit_costs.json').catch(function () {
          return { items: {} };
        }),
      ]).then(function (pair) {
        _pairingHints = pair[0].hints || {};
        _unitCosts = pair[1].items || {};
        return { hints: _pairingHints, costs: _unitCosts };
      });
    }
    return _dataPromise;
  }

  function hintsForRecipe(recipeId) {
    if (!recipeId || !_pairingHints) return [];
    var h = _pairingHints[recipeId];
    return Array.isArray(h) ? h : [];
  }

  function renderHintChips(recipeId) {
    var hints = hintsForRecipe(recipeId);
    if (!hints.length) return '';
    return (
      '<div class="fn-dish-chip__hints">' +
      hints
        .slice(0, 4)
        .map(function (x) {
          return '<span class="fn-dish-chip__hint">' + String(x).replace(/</g, '&lt;') + '</span>';
        })
        .join('') +
      '</div>'
    );
  }

  function exportPlanBundle(state, extras) {
    extras = extras || {};
    var timeline = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('kuschi_planner_timeline_v1::') === 0) {
          timeline[k] = localStorage.getItem(k);
        }
      }
    } catch (_) {
      /* ignore */
    }
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      state: state,
      timeline: timeline,
      planId: extras.planId || null,
    };
  }

  function downloadJson(filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importPlanBundle(bundle, handlers) {
    handlers = handlers || {};
    if (!bundle || bundle.version !== 1 || !bundle.state) {
      throw new Error('Invalid planner bundle');
    }
    if (handlers.applyState) handlers.applyState(bundle.state);
    if (bundle.timeline) {
      Object.keys(bundle.timeline).forEach(function (k) {
        try {
          localStorage.setItem(k, bundle.timeline[k]);
        } catch (_) {
          /* quota */
        }
      });
    }
  }

  function downloadPlannerHtml(title, innerHtml) {
    var doc =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
      String(title).replace(/</g, '&lt;') +
      '</title>' +
      '<style>body{font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;padding:24px;color:#111}' +
      'h1{font-size:18px}h2{font-size:14px;margin-top:20px;text-transform:uppercase}' +
      'pre{white-space:pre-wrap}ul{padding-left:18px}@media print{body{padding:0}}</style></head><body>' +
      innerHtml +
      '</body></html>';
    var blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (title || 'planner').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function canonicalCostKey(itemName) {
    var C = window.KuschiRivieraCanonical;
    if (C && typeof C.canonicalOrderMergeKey === 'function') {
      return C.canonicalOrderMergeKey(itemName);
    }
    return String(itemName || '').toLowerCase().trim();
  }

  function parseQtyNumber(qtyStr) {
    var m = String(qtyStr || '').match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : null;
  }

  function estimateLineCost(qtyStr, itemName) {
    if (!_unitCosts) return null;
    var key = canonicalCostKey(itemName);
    var row = _unitCosts[key];
    if (!row || row.cost_per_unit == null) return null;
    var n = parseQtyNumber(qtyStr);
    if (n == null) return null;
    return n * row.cost_per_unit;
  }

  function estimateShoppingCost(merged) {
    if (!_unitCosts || !merged) return { total: 0, lines: 0, covered: 0 };
    var total = 0;
    var lines = 0;
    var covered = 0;
    ['freezer', 'coldroom', 'drystore', 'other'].forEach(function (z) {
      (merged[z] || []).forEach(function (row) {
        lines++;
        var c = estimateLineCost(row.qty, row.item);
        if (c != null) {
          covered++;
          total += c;
        }
      });
    });
    return { total: total, lines: lines, covered: covered };
  }

  function formatAud(n) {
    if (n == null || isNaN(n)) return '—';
    return '$' + n.toFixed(2);
  }

  window.KuschiPlannerExtras = {
    loadPlannerExtrasData: loadPlannerExtrasData,
    hintsForRecipe: hintsForRecipe,
    renderHintChips: renderHintChips,
    exportPlanBundle: exportPlanBundle,
    downloadJson: downloadJson,
    importPlanBundle: importPlanBundle,
    downloadPlannerHtml: downloadPlannerHtml,
    estimateShoppingCost: estimateShoppingCost,
    formatAud: formatAud,
  };
})();
