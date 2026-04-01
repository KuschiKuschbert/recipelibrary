/**
 * Flavor explorer: combined_data/ingredients_unified.json + thesaurus wheel +
 * optional flavour_data/flavour_knowledge_db_v1.1.json (toolkit + matrix hints).
 */
(function (global) {
  var UNIFIED = 'combined_data/ingredients_unified.json';
  var WHEEL = 'thesaurus_data/wheel.json';
  var PAIRINGS = 'thesaurus_data/pairings.json';
  var SCIENCE_TEMPS = 'science_data/temperatures.json';
  var FLAVOUR_KB = 'flavour_data/flavour_knowledge_db_v1.1.json';

  var unified = null;
  var wheel = null;
  var pairings = null;
  var temps = null;
  var byName = Object.create(null);
  var loadP = null;
  var flavourKb = null;
  var flavourKbP = null;
  var flavourIngredients = null;
  var flavourByCollapsedKey = null;
  var lastDetailId = null;

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

  /** schema v2 object { ingredients, kitchen_context } or legacy flat array */
  function parseUnifiedPayload(raw) {
    if (Array.isArray(raw)) {
      return { ingredients: raw, kitchen_context: null };
    }
    if (raw && typeof raw === 'object' && Array.isArray(raw.ingredients)) {
      return {
        ingredients: raw.ingredients,
        kitchen_context: raw.kitchen_context && typeof raw.kitchen_context === 'object' ? raw.kitchen_context : null,
      };
    }
    return { ingredients: [], kitchen_context: null };
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
    ])
      .then(function (arr) {
        var parsed = parseUnifiedPayload(arr[0]);
        unified = parsed.ingredients;
        wheel = arr[1];
        pairings = arr[2];
        var emb =
          parsed.kitchen_context &&
          parsed.kitchen_context.science &&
          parsed.kitchen_context.science.temperatures;
        if (Array.isArray(emb) && emb.length) {
          temps = emb;
          return;
        }
        return fetch(SCIENCE_TEMPS)
          .then(function (r) {
            return r.ok ? r.json() : [];
          })
          .catch(function () {
            return [];
          })
          .then(function (t) {
            temps = t;
          });
      })
      .then(function () {
        if (!temps) temps = [];
        byName = Object.create(null);
        for (var i = 0; i < unified.length; i++) {
          var u = unified[i];
          if (u && u.name) byName[norm(u.name)] = u;
        }
      });
    return loadP;
  }

  function ensureFlavourKb() {
    if (flavourKb) return Promise.resolve(flavourKb);
    if (flavourKbP) return flavourKbP;
    flavourKbP = fetch(FLAVOUR_KB)
      .then(function (r) {
        if (!r.ok) throw new Error(FLAVOUR_KB);
        return r.json();
      })
      .then(function (data) {
        flavourKb = data;
        flavourIngredients = data && data.ingredients && typeof data.ingredients === 'object' ? data.ingredients : null;
        flavourByCollapsedKey = Object.create(null);
        if (flavourIngredients) {
          Object.keys(flavourIngredients).forEach(function (k) {
            var collapsed =
              global.KuschiFlavourToolkitLookup &&
              typeof global.KuschiFlavourToolkitLookup.flavourHintLookupKey === 'function'
                ? global.KuschiFlavourToolkitLookup.flavourHintLookupKey(k)
                : k.replace(/_+/g, '_');
            if (!flavourByCollapsedKey[collapsed]) flavourByCollapsedKey[collapsed] = flavourIngredients[k];
          });
        }
        return data;
      })
      .catch(function () {
        flavourKb = null;
        flavourIngredients = null;
        flavourByCollapsedKey = null;
        return null;
      });
    return flavourKbP;
  }

  function unifiedIdToFlavourKey(uid) {
    return String(uid || '')
      .replace(/-/g, '_')
      .trim();
  }

  function lookupFlavourIngredient(u) {
    if (!flavourIngredients || !u) return null;
    var key = unifiedIdToFlavourKey(u.id);
    if (flavourIngredients[key]) return flavourIngredients[key];
    if (u.id && flavourIngredients[u.id]) return flavourIngredients[u.id];
    var collapsed = key.replace(/_+/g, '_');
    if (flavourByCollapsedKey && flavourByCollapsedKey[collapsed]) return flavourByCollapsedKey[collapsed];
    return null;
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

  function chipListHtml(className, items, max) {
    max = max == null ? 24 : max;
    if (!items || !items.length) return '';
    return items
      .slice(0, max)
      .map(function (x) {
        return '<span class="' + className + '">' + esc(String(x)) + '</span>';
      })
      .join('');
  }

  function fkToolkitSectionsHtml(fk) {
    if (!fk) return '';
    var parts = [];
    if (fk.harmony && fk.harmony.length) {
      parts.push(
        '<div class="flavor-section flavor-fk-matrix"><h3>Harmony seasonings</h3><p class="flavor-fk-note">Calm companions — same aroma family (Kuschi matrix)</p><div class="flavor-pair-chips">' +
          chipListHtml('flavor-pair-chip flavor-fk-harmony', fk.harmony) +
          '</div></div>'
      );
    }
    if (fk.contrast && fk.contrast.length) {
      parts.push(
        '<div class="flavor-section flavor-fk-matrix"><h3>Contrast seasonings</h3><p class="flavor-fk-note">Lift from a different aroma family</p><div class="flavor-pair-chips">' +
          chipListHtml('flavor-pair-chip flavor-fk-contrast', fk.contrast) +
          '</div></div>'
      );
    }
    if (fk.spice_harmony_partners && fk.spice_harmony_partners.length) {
      parts.push(
        '<div class="flavor-section"><h3>Spice harmony partners</h3><div class="flavor-pair-chips">' +
          chipListHtml('flavor-pair-chip', fk.spice_harmony_partners, 16) +
          '</div></div>'
      );
    }
    if (fk.primary_family || (fk.aroma_groups && typeof fk.aroma_groups === 'object')) {
      var af = fk.aroma_groups;
      var active = [];
      if (af)
        Object.keys(af).forEach(function (k) {
          if (af[k]) active.push(k.replace(/_/g, ' '));
        });
      var bits = [];
      if (fk.primary_family)
        bits.push('Primary: <strong>' + esc(String(fk.primary_family).replace(/_/g, ' ')) + '</strong>');
      if (active.length) bits.push('Families: ' + esc(active.join(', ')));
      parts.push(
        '<div class="flavor-section"><h3>Aroma map (toolkit)</h3><p class="flavor-fk-aroma-line">' +
          bits.join(' · ') +
          ' · <a class="flavor-link" href="pairing-atlas.html">Pairing matrix →</a></p></div>'
      );
    }
    var tips = fk.tips;
    if (Array.isArray(tips) && tips.length) {
      var useful = tips.filter(function (t) {
        return String(t).trim().length > 2;
      });
      if (useful.length) {
        parts.push(
          '<div class="flavor-section"><h3>Tips (toolkit)</h3><ul class="flavor-aff-list">' +
            useful
              .slice(0, 8)
              .map(function (t) {
                return '<li>' + esc(t) + '</li>';
              })
              .join('') +
            '</ul></div>'
        );
      }
    }
    var tech = fk.techniques;
    if (Array.isArray(tech) && tech.length) {
      parts.push(
        '<div class="flavor-section"><h3>Techniques (toolkit)</h3><div class="flavor-pair-chips">' +
          chipListHtml('flavor-pair-chip', tech, 12) +
          '</div></div>'
      );
    }
    return parts.join('');
  }

  function renderDetailCore(u, fk) {
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
    if (fk && fk.category)
      meta.push(
        '<span class="flavor-badge flavor-badge-toolkit">Toolkit: ' +
          esc(fk.category) +
          (fk.sub_category ? ' · ' + esc(fk.sub_category) : '') +
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
        : '') +
      fkToolkitSectionsHtml(fk);
  }

  function renderDetail(u) {
    lastDetailId = u && u.id;
    renderDetailCore(u, lookupFlavourIngredient(u));
    ensureFlavourKb().then(function () {
      if (lastDetailId !== (u && u.id)) return;
      renderDetailCore(u, lookupFlavourIngredient(u));
    });
  }

  function toolkitFilterNorm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wireToolkitFilter(host) {
    var inp = host.querySelector('#flavorToolkitFilter');
    if (!inp || inp._flavorTkWired) return;
    inp._flavorTkWired = true;
    function applyFilter() {
      var q = toolkitFilterNorm(inp.value);
      ['.flavor-toolkit-card', '.flavor-toolkit-cuisine', '.flavor-toolkit-blend'].forEach(function (sel) {
        host.querySelectorAll(sel).forEach(function (el) {
          var t = toolkitFilterNorm(el.textContent || '');
          el.style.display = !q || t.indexOf(q) >= 0 ? '' : 'none';
        });
      });
    }
    inp.addEventListener('input', function () {
      clearTimeout(inp._tkFt);
      inp._tkFt = setTimeout(applyFilter, 120);
    });
  }

  function renderToolkit() {
    var host = document.getElementById('flavorToolkitHost');
    if (!host) return;

    function fmtList(label, arr) {
      if (!Array.isArray(arr) || !arr.length) return '';
      return '<p><strong>' + esc(label) + ':</strong> ' + arr.map(esc).join(', ') + '</p>';
    }

    if (!flavourKb) {
      host.innerHTML = '<p class="flavor-empty">Loading toolkit…</p>';
      ensureFlavourKb().then(function (kb) {
        if (!kb) {
          host.innerHTML =
            '<p class="flavor-empty">Could not load flavour toolkit JSON. Add flavour_data/flavour_knowledge_db_v1.1.json to the site root.</p>';
          return;
        }
        renderToolkit();
      });
      return;
    }

    var fix = flavourKb.fix_the_dish || [];
    var fixHtml = fix
      .map(function (card) {
        var fixes = (card.fixes || [])
          .map(function (fx) {
            var opts = (fx.options || []).map(esc).join(', ');
            return (
              '<div class="flavor-toolkit-fix"><strong>' +
              esc(fx.action || '') +
              '</strong> <span class="flavor-toolkit-priority">(' +
              esc(fx.priority || '') +
              ')</span><div class="flavor-toolkit-options">' +
              opts +
              '</div></div>'
            );
          })
          .join('');
        return (
          '<details class="flavor-toolkit-card"><summary class="flavor-toolkit-summary">' +
          esc(card.problem || '') +
          '</summary><p class="flavor-toolkit-dx"><em>' +
          esc(card.diagnosis || '') +
          '</em></p>' +
          fixes +
          '<p class="flavor-toolkit-rule">' +
          esc(card.rule || '') +
          '</p></details>'
        );
      })
      .join('');

    var br = flavourKb.balance_rules || {};
    var brHtml = Object.keys(br)
      .sort()
      .map(function (k) {
        return '<span class="flavor-toolkit-badge">' + esc(k) + ': ' + esc(br[k]) + '</span>';
      })
      .join('');

    var cuisines = flavourKb.cuisines || {};
    var cKeys = Object.keys(cuisines).sort(function (a, b) {
      return String(cuisines[a].name || a).localeCompare(String(cuisines[b].name || b));
    });
    var cHtml = cKeys
      .map(function (ck) {
        var c = cuisines[ck];
        var trios = '';
        if (Array.isArray(c.classic_trios) && c.classic_trios.length) {
          trios =
            '<p><strong>Classic trios:</strong></p><ul class="flavor-toolkit-trios">' +
            c.classic_trios
              .map(function (trio) {
                return '<li>' + (Array.isArray(trio) ? trio.map(esc).join(' + ') : esc(trio)) + '</li>';
              })
              .join('') +
            '</ul>';
        }
        return (
          '<details class="flavor-toolkit-cuisine"><summary class="flavor-toolkit-csummary">' +
          esc(c.name || ck) +
          '</summary><div class="flavor-toolkit-cbody">' +
          fmtList('Base aromatics', c.base_aromatics) +
          fmtList('Signature spices', c.signature_spices) +
          fmtList('Acid', c.acid) +
          fmtList('Fat', c.fat) +
          fmtList('Heat', c.heat) +
          fmtList('Umami', c.umami) +
          fmtList('Sweet', c.sweet) +
          trios +
          fmtList('Key techniques', c.key_techniques) +
          '</div></details>'
        );
      })
      .join('');

    var blends = flavourKb.spice_blends || [];
    var blendHtml = blends
      .map(function (b) {
        var comp = b.components || {};
        var keys = Object.keys(comp);
        var max = 0;
        for (var i = 0; i < keys.length; i++) {
          if (comp[keys[i]] > max) max = comp[keys[i]];
        }
        var bars = keys
          .map(function (k) {
            var v = comp[k];
            var pct = max ? Math.round((v / max) * 100) : 0;
            return (
              '<div class="flavor-blend-row"><span class="flavor-blend-label">' +
              esc(k) +
              '</span><div class="flavor-blend-track"><span class="flavor-blend-fill" style="width:' +
              pct +
              '%"></span></div><span class="flavor-blend-val">' +
              esc(String(v)) +
              '</span></div>'
            );
          })
          .join('');
        return (
          '<details class="flavor-toolkit-blend"><summary class="flavor-toolkit-bsummary"><strong>' +
          esc(b.name || b.id) +
          '</strong> <span class="flavor-toolkit-bcuisine">' +
          esc(b.cuisine || '') +
          '</span></summary><div class="flavor-toolkit-bbody">' +
          bars +
          '<p class="flavor-toolkit-blogic">' +
          esc(b.logic || '') +
          '</p>' +
          fmtList('Use with', b.use_with) +
          '<p><strong>When to add:</strong> ' +
          esc(b.when_to_add || '—') +
          ' · <strong>Bloom in fat:</strong> ' +
          esc(b.bloom ? 'Yes' : 'No') +
          '</p></div></details>'
        );
      })
      .join('');

    var af = flavourKb.aroma_families || {};
    var afKeys = Object.keys(af).sort(function (a, b) {
      return String(af[a].name || a).localeCompare(String(af[b].name || b));
    });
    var afHtml = afKeys
      .map(function (ak) {
        var fam = af[ak];
        var col = fam.colour || '#888';
        return (
          '<div class="flavor-af-row"><span class="flavor-af-swatch" style="background:' +
          esc(col) +
          '"></span><div class="flavor-af-text"><span class="flavor-af-name">' +
          esc(fam.name || ak) +
          '</span><span class="flavor-af-desc">' +
          esc(fam.description || '') +
          '</span></div></div>'
        );
      })
      .join('');

    host.innerHTML =
      '<div class="flavor-toolkit-intro"><p>Flavour Knowledge toolkit (v1.1): pass fixes, cuisine DNA, classic blends, balance rules, and aroma family legend. In <strong>Explore</strong>, matching ingredients also show harmony / contrast and spice notes from the same database.</p></div>' +
      '<div class="flavor-toolkit-filter-wrap">' +
      '<input type="search" id="flavorToolkitFilter" class="flavor-toolkit-filter" placeholder="Filter fixes, cuisines, blends…" autocomplete="off" aria-label="Filter toolkit content" />' +
      '</div>' +
      '<div class="flavor-toolkit-grid">' +
      '<section class="flavor-toolkit-col"><h2 class="flavor-toolkit-h2">Fix the dish</h2>' +
      fixHtml +
      '</section>' +
      '<section class="flavor-toolkit-col"><h2 class="flavor-toolkit-h2">Balance rules</h2><div class="flavor-toolkit-badges">' +
      brHtml +
      '</div>' +
      '<h2 class="flavor-toolkit-h2 flavor-toolkit-h2-sp">Aroma families</h2>' +
      '<div class="flavor-af-list">' +
      afHtml +
      '</div></section></div>' +
      '<section class="flavor-toolkit-wide"><h2 class="flavor-toolkit-h2">Cuisine DNA</h2><div class="flavor-toolkit-cuisines">' +
      cHtml +
      '</div></section>' +
      '<section class="flavor-toolkit-wide"><h2 class="flavor-toolkit-h2">Spice blends</h2><div class="flavor-toolkit-blends">' +
      blendHtml +
      '</div></section>';
    wireToolkitFilter(host);
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
        if (mode === 'toolkit') renderToolkit();
      });
    });
  }

  function boot() {
    var params = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    var deepQ = params && params.get('q') ? String(params.get('q')).trim() : '';
    var openToolkit = params && params.get('toolkit') === '1';
    ensureLoaded()
      .then(function () {
        var el = document.getElementById('flavorLoadStatus');
        if (el) el.textContent = unified.length + ' unified rows · Thesaurus ' + wheel.length + ' · Links ' + pairings.length;
        ensureFlavourKb().then(function (kb) {
          var st = document.getElementById('flavorLoadStatus');
          if (st && kb && kb.stats) {
            st.textContent +=
              ' · Toolkit v' + (kb.stats.version || '1.1') + ' (' + (kb.stats.total_ingredients || '') + ' ingredients)';
          }
        });
        var inp = document.getElementById('flavorSearch');
        if (deepQ && inp) inp.value = deepQ;
        runSearch();
        if (deepQ) {
          var rows = findRows(deepQ);
          if (rows.length) renderDetail(rows[0]);
        }
        if (openToolkit) {
          var tt = document.querySelector('[data-flavor-tab="toolkit"]');
          if (tt) tt.click();
        }
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
    ensureFlavourKb: ensureFlavourKb,
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
