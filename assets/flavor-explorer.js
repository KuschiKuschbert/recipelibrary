/**
 * Flavor explorer: combined_data/ingredients_unified.json + thesaurus wheel.
 * Used by flavor.html (and optional embeds).
 */
(function (global) {
  var UNIFIED = 'combined_data/ingredients_unified.json';
  var WHEEL = 'thesaurus_data/wheel.json';
  var PAIRINGS = 'thesaurus_data/pairings.json';
  var SCIENCE_TEMPS = 'science_data/temperatures.json';

  var unified = null;
  var wheel = null;
  var pairings = null;
  var temps = null;
  var byName = Object.create(null);
  var loadP = null;

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ensureLoaded() {
    if (unified) return Promise.resolve();
    if (loadP) return loadP;
    loadP = Promise.all([
      fetch(UNIFIED).then(function (r) {
        if (!r.ok) throw new Error(UNIFIED);
        return r.json();
      }),
      fetch(WHEEL)
        .then(function (r) {
          return r.ok ? r.json() : [];
        })
        .catch(function () {
          return [];
        }),
      fetch(PAIRINGS)
        .then(function (r) {
          return r.ok ? r.json() : [];
        })
        .catch(function () {
          return [];
        }),
      fetch(SCIENCE_TEMPS)
        .then(function (r) {
          return r.ok ? r.json() : [];
        })
        .catch(function () {
          return [];
        }),
    ]).then(function (arr) {
      unified = arr[0];
      wheel = arr[1];
      pairings = arr[2];
      temps = arr[3];
      byName = Object.create(null);
      for (var i = 0; i < unified.length; i++) {
        var u = unified[i];
        if (u && u.name) byName[norm(u.name)] = u;
      }
    });
    return loadP;
  }

  function findRows(query) {
    var q = norm(query);
    if (!q || !unified) return [];
    var out = [];
    for (var i = 0; i < unified.length; i++) {
      var u = unified[i];
      var n = norm(u.name || '');
      if (!n) continue;
      if (n === q || n.indexOf(q) >= 0 || q.indexOf(n) >= 0) out.push(u);
      if (out.length > 80) break;
    }
    return out.slice(0, 40);
  }

  function tierListHtml(pairingsObj) {
    if (!pairingsObj) return '';
    var tiers = [
      ['holy_grail', 'Holy grail', 'flavor-tier-hg'],
      ['very_highly_recommended', 'Very highly recommended', 'flavor-tier-vh'],
      ['highly_recommended', 'Highly recommended', 'flavor-tier-hi'],
      ['recommended', 'Also works', 'flavor-tier-rec'],
    ];
    var parts = [];
    for (var t = 0; t < tiers.length; t++) {
      var key = tiers[t][0];
      var arr = pairingsObj[key];
      if (!arr || !arr.length) continue;
      var chips = arr
        .slice(0, 24)
        .map(function (x) {
          return '<span class="flavor-pair-chip ' + tiers[t][2] + '">' + esc(x) + '</span>';
        })
        .join('');
      parts.push(
        '<div class="flavor-tier-block"><h4>' +
          esc(tiers[t][1]) +
          '</h4><div class="flavor-pair-chips">' +
          chips +
          (arr.length > 24 ? ' <span class="flavor-more">+' + (arr.length - 24) + ' more</span>' : '') +
          '</div></div>'
      );
    }
    return parts.join('');
  }

  function renderDetail(u) {
    var el = document.getElementById('flavorDetail');
    if (!el) return;
    var f = u.flavor || {};
    var a = u.aroma;
    var th = u.thesaurus;
    var aff = (f.affinities || []).slice(0, 8);
    var av = f.avoid || [];

    var meta = [];
    if (f.season) meta.push('<span class="flavor-badge">Season: ' + esc(f.season) + '</span>');
    if (f.weight) meta.push('<span class="flavor-badge">Weight: ' + esc(f.weight) + '</span>');
    if (f.volume) meta.push('<span class="flavor-badge">Volume: ' + esc(f.volume) + '</span>');
    if (Array.isArray(f.taste))
      meta.push(
        '<span class="flavor-badge">Taste: ' +
          f.taste.map(function (x) {
            return esc(x);
          }).join(', ') +
          '</span>'
      );

    var aromaBlock = '';
    if (a && a.harmonizes_with && a.harmonizes_with.length) {
      var h = a.harmonizes_with
        .slice(0, 12)
        .map(function (r) {
          return '<a class="flavor-link" href="aroma.html?spice=' + esc(encodeURIComponent(r.id || '')) + '">' + esc(r.name || r.id) + '</a>';
        })
        .join(', ');
      aromaBlock =
        '<div class="flavor-section"><h3>Aroma Bible harmony</h3><p>' + h + '</p></div>';
    }

    var thes = '';
    if (th && th.family) {
      thes =
        '<div class="flavor-section"><h3>Flavor Thesaurus family</h3><p>' +
        esc(th.family) +
        '</p></div>';
    }

    el.innerHTML =
      '<h2 class="flavor-detail-title">' +
      esc(u.name) +
      '</h2>' +
      '<div class="flavor-meta-row">' +
      meta.join('') +
      '</div>' +
      (av.length
        ? '<div class="flavor-avoid"><strong>Avoid with this ingredient:</strong> ' +
          av
            .slice(0, 20)
            .map(function (x) {
              return esc(x);
            })
            .join(', ') +
          '</div>'
        : '') +
      (f.substitutes && f.substitutes.length
        ? '<div class="flavor-subst"><strong>Substitutes:</strong> ' +
          f.substitutes
            .map(function (x) {
              return esc(x);
            })
            .join(', ') +
          '</div>'
        : '') +
      thes +
      aromaBlock +
      '<div class="flavor-section"><h3>Pairings (Flavor Bible tiers)</h3>' +
      tierListHtml(f.pairings) +
      '</div>' +
      (aff.length
        ? '<div class="flavor-section"><h3>Flavor affinities</h3><ul class="flavor-aff-list">' +
          aff
            .map(function (combo) {
              return '<li>' + combo.map(esc).join(' + ') + '</li>';
            })
            .join('') +
          '</ul></div>'
        : '');
  }

  function renderWheel() {
    var host = document.getElementById('flavorWheelHost');
    if (!host || !wheel || !wheel.length) {
      if (host) host.innerHTML = '<p class="flavor-empty">Wheel data not loaded.</p>';
      return;
    }
    var fams = Object.create(null);
    for (var i = 0; i < wheel.length; i++) {
      var w = wheel[i];
      var f = w.family || w.family_slug || 'Other';
      if (!fams[f]) fams[f] = [];
      fams[f].push(w);
    }
    var keys = Object.keys(fams).sort();
    host.innerHTML = keys
      .map(function (k) {
        var items = fams[k]
          .map(function (it) {
            return (
              '<button type="button" class="flavor-wheel-item" data-name="' +
              esc(it.name) +
              '">' +
              esc(it.name) +
              '</button>'
            );
          })
          .join('');
        return (
          '<div class="flavor-wheel-family"><h4>' +
          esc(k) +
          '</h4><div class="flavor-wheel-items">' +
          items +
          '</div></div>'
        );
      })
      .join('');

    host.querySelectorAll('.flavor-wheel-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.getElementById('flavorSearch').value = btn.getAttribute('data-name') || '';
        document.querySelector('[data-flavor-tab="explore"]').click();
        runSearch();
      });
    });
  }

  function renderScience() {
    var el = document.getElementById('flavorScienceHost');
    if (!el) return;
    if (!temps || !temps.length) {
      el.innerHTML =
        '<p class="flavor-empty">Temperature index not available (Farrimond PDF may be scan-only). Provost extract: sample thresholds below if present.</p>';
      return;
    }
    el.innerHTML =
      '<p class="flavor-science-lead">Heuristic °C/°F mentions from Science of Cooking PDF text (verify in book).</p><ul class="flavor-temp-list">' +
      temps
        .slice(0, 80)
        .map(function (r) {
          return '<li>' + esc(String(r.value)) + '°' + esc(r.unit) + '</li>';
        })
        .join('') +
      '</ul>';
  }

  function runSearch() {
    var q = document.getElementById('flavorSearch');
    if (!q) return;
    var rows = findRows(q.value);
    var list = document.getElementById('flavorResults');
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = '<p class="flavor-empty">No matches. Try another name.</p>';
      return;
    }
    list.innerHTML = rows
      .map(function (u) {
        return (
          '<button type="button" class="flavor-result-row" data-id="' +
          esc(u.id) +
          '"><span class="flavor-result-name">' +
          esc(u.name) +
          '</span><span class="flavor-result-hint">' +
          (u.thesaurus && u.thesaurus.family ? esc(u.thesaurus.family) : u.aroma ? 'Aroma' : '') +
          '</span></button>'
        );
      })
      .join('');

    list.querySelectorAll('.flavor-result-row').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var u = unified.filter(function (x) {
          return x.id === id;
        })[0];
        if (u) renderDetail(u);
      });
    });
  }

  function initTabs() {
    document.querySelectorAll('[data-flavor-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var mode = tab.getAttribute('data-flavor-tab');
        document.querySelectorAll('[data-flavor-tab]').forEach(function (t) {
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });
        document.querySelectorAll('.flavor-tab-panel').forEach(function (p) {
          p.hidden = p.getAttribute('data-panel') !== mode;
        });
        if (mode === 'wheel') renderWheel();
        if (mode === 'science') renderScience();
      });
    });
  }

  function boot() {
    ensureLoaded()
      .then(function () {
        var el = document.getElementById('flavorLoadStatus');
        if (el) el.textContent = unified.length + ' unified rows · Thesaurus ' + wheel.length + ' · Links ' + pairings.length;
        runSearch();
      })
      .catch(function () {
        var el = document.getElementById('flavorLoadStatus');
        if (el) el.textContent = 'Could not load combined_data (run scripts/run_all_extractions.sh).';
      });
    initTabs();
    var inp = document.getElementById('flavorSearch');
    if (inp) {
      inp.addEventListener('input', function () {
        clearTimeout(inp._ft);
        inp._ft = setTimeout(runSearch, 200);
      });
    }
  }

  global.KuschiFlavorExplorer = {
    ensureLoaded: ensureLoaded,
    findRows: function (q) {
      return ensureLoaded().then(function () {
        return findRows(q);
      });
    },
    norm: norm,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : this);
