/**
 * Full Planner List — menu manifest, prep timeline, merged ingredients, per-dish detail.
 */
(function () {
  'use strict';

  var PHASE_ORDER = ['day_before', 'morning_of', 'service'];
  var PHASE_LABELS = {
    day_before: 'Day before',
    morning_of: 'Morning of',
    service: 'Service',
  };
  var PHASE_PRIORITY = { day_before: 'low', morning_of: 'medium', service: 'high' };
  var STYLE_TO_SERVICE = {
    cocktail: 'cocktail',
    buffet: 'buffet',
    plated: 'plated_main',
    'plated main': 'plated_main',
    'plated entree': 'plated_entree',
    tapas: 'tapas',
    corporate: 'corporate_boxed',
  };

  var _payload = null;
  var _activeTab = 'timeline';
  var _built = null;
  var _variants = null;
  var _aliases = null;
  var _scrollToRecipeId = null;
  var _dataPromise = null;

  var VARIANT_URLS = [
    'riviera_data/service_variants.json',
    'riviera_data/service_variants_canapes.json',
    'riviera_data/service_variants_corporate.json',
    'riviera_data/service_variants_mains_sides.json',
    'riviera_data/service_variant_source_overrides.json',
  ];

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

  function deepMergeOverride(existing, incoming) {
    Object.keys(incoming).forEach(function (key) {
      var value = incoming[key];
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        existing[key] &&
        typeof existing[key] === 'object' &&
        !Array.isArray(existing[key])
      ) {
        deepMergeOverride(existing[key], value);
      } else {
        existing[key] = value;
      }
    });
  }

  function mergeVariantPayloads(payloads) {
    var merged = { service_variants: {} };
    payloads.forEach(function (payload) {
      if (!payload || typeof payload !== 'object') return;
      var overrideExisting = payload.merge_strategy === 'override_existing_fields';
      var serviceVariants = payload.service_variants || {};
      Object.keys(serviceVariants).forEach(function (recipeId) {
        var incoming = serviceVariants[recipeId];
        if (!incoming || typeof incoming !== 'object') return;
        if (!merged.service_variants[recipeId]) {
          merged.service_variants[recipeId] = incoming;
          return;
        }
        var existing = merged.service_variants[recipeId];
        if (overrideExisting) {
          deepMergeOverride(existing, incoming);
          return;
        }
        Object.keys(incoming).forEach(function (key) {
          if (!existing[key]) existing[key] = incoming[key];
        });
      });
    });
    return merged;
  }

  function loadPlannerData() {
    if (!_dataPromise) {
      _dataPromise = Promise.all([
        Promise.all(
          VARIANT_URLS.map(function (path) {
            return fetchJson(path).catch(function () {
              return { service_variants: {} };
            });
          })
        ).then(mergeVariantPayloads),
        fetchJson('riviera_data/canonical_recipe_aliases.json').catch(function () {
          return { recipe_id_redirects: {} };
        }),
      ]).then(function (pair) {
        _variants = pair[0];
        _aliases = pair[1];
        return { variants: _variants, aliases: _aliases };
      });
    }
    return _dataPromise;
  }

  function resolveRecipeId(recipeId, aliases) {
    var redirects = aliases && aliases.recipe_id_redirects;
    return (redirects && redirects[recipeId]) || recipeId;
  }

  function firstNum(v) {
    var m = String(v == null ? '' : v).match(/[\d.]+/);
    return m ? parseFloat(m[0]) : null;
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseYieldNum(y) {
    var m = String(y || '').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 1;
  }

  function scaleQtyStr(qtyStr, factor) {
    if (!qtyStr || factor === 1) return qtyStr || '';
    var fracMap = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667 };
    var str = String(qtyStr).trim();
    Object.keys(fracMap).forEach(function (sym) {
      str = str.split(sym).join(String(fracMap[sym]));
    });
    var m = str.match(/^([\d.]+)(.*)/);
    if (!m) return qtyStr;
    var num = parseFloat(m[1]);
    var rest = m[2];
    var scaled = num * factor;
    var display = scaled % 1 === 0 ? String(scaled) : parseFloat(scaled.toFixed(2)).toString();
    return display + rest;
  }

  function serviceKeyFromStyle(style) {
    var s = String(style || '').trim().toLowerCase();
    return STYLE_TO_SERVICE[s] || 'buffet';
  }

  function scaleFactorForRecipe(recipe, pax, style, variants, aliases) {
    variants = variants || _variants;
    aliases = aliases || _aliases;
    var canonicalId = resolveRecipeId(recipe.id, aliases);
    var svcKey = serviceKeyFromStyle(style);
    var group = variants && variants.service_variants && variants.service_variants[canonicalId];
    if (group) {
      var rec = group[svcKey];
      if (rec && rec.status !== 'not_recommended') {
        var buffer = firstNum(rec.production_buffer_multiplier) || 1;
        var ppg = firstNum(rec.production_pieces_per_guest) || firstNum(rec.pieces_per_guest);
        var basePieces =
          firstNum(group.base_prep && group.base_prep.base_yield_pieces) || parseYieldNum(recipe.yield);
        if (ppg && basePieces && pax) {
          return (pax * ppg * buffer) / basePieces;
        }
      }
    }
    var base = parseYieldNum(recipe.yield);
    if (!base || base <= 0) base = 1;
    return pax / base;
  }

  function scaledIngredients(recipe, factor) {
    return (recipe.ingredients || []).map(function (i) {
      return {
        qty: scaleQtyStr(i.qty, factor),
        item: i.item,
        prep: i.prep,
        zone: i.zone,
      };
    });
  }

  function classifyPhase(recipe, stepText, isService) {
    var text = String(stepText || '').toLowerCase();
    var type = String(recipe.type || '').toLowerCase();
    if (isService) return 'service';
    if (
      /overnight|refrigerat|marinat|day before|24 hour|defrost|freeze|batch ahead|make ahead|prepare in advance/.test(
        text
      )
    ) {
      return 'day_before';
    }
    if (/component|sauce|base|stock|bakery|dough|pastry|prep only|vacuum|seal only/.test(type + ' ' + text)) {
      return 'day_before';
    }
    if (recipe.elements && recipe.elements.length && /make|prep|batch|mix|blend/.test(text)) {
      return 'day_before';
    }
    if (/roast|bake|fry|grill|char|oven|morning|hold|reheat|crumb|portion/.test(text)) {
      return 'morning_of';
    }
    if (/service|plate|garnish|pass|hold temp|to order|serve|emulsion separate/.test(text)) {
      return 'service';
    }
    return 'morning_of';
  }

  function buildPrepTimeline(payload) {
    var rows = [];
    var seen = {};
    (payload.courses || []).forEach(function (course) {
      (course.items || []).forEach(function (item) {
        var recipe = item.recipe;
        if (!recipe) return;
        var factor = scaleFactorForRecipe(recipe, payload.pax, payload.style);
        var yieldHint = recipe.yield ? ' · ' + recipe.yield : '';
        var paxHint = payload.pax + ' covers';

        (recipe.method_steps || []).forEach(function (step, si) {
          var phase = classifyPhase(recipe, step, false);
          var norm = String(step).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
          var key = phase + '\0' + norm;
          if (seen[key]) {
            if (seen[key].dishNames.indexOf(item.name) < 0) seen[key].dishNames.push(item.name);
            return;
          }
          seen[key] = {
            phase: phase,
            recipeId: recipe.id,
            dishNames: [item.name],
            text: step,
            hint: paxHint + yieldHint + (factor !== 1 ? ' · ×' + factor.toFixed(2) : ''),
          };
        });

        (recipe.service || []).forEach(function (step, si) {
          var norm = String(step).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
          var key = 'service\0' + norm;
          if (seen[key]) {
            if (seen[key].dishNames.indexOf(item.name) < 0) seen[key].dishNames.push(item.name);
            return;
          }
          seen[key] = {
            phase: 'service',
            recipeId: recipe.id,
            dishNames: [item.name],
            text: step,
            hint: paxHint,
          };
        });

        if (!(recipe.method_steps && recipe.method_steps.length) && !(recipe.service && recipe.service.length)) {
          var fallbackKey = 'morning\0' + recipe.id;
          if (!seen[fallbackKey]) {
            seen[fallbackKey] = {
              phase: 'morning_of',
              recipeId: recipe.id,
              dishNames: [item.name],
              text: 'Prep and hold per recipe card',
              hint: paxHint + yieldHint,
            };
          }
        }
      });
    });

    Object.keys(seen).forEach(function (k) {
      var r = seen[k];
      rows.push({
        phase: r.phase,
        recipeId: r.recipeId,
        dishName: r.dishNames.join(', '),
        text: r.text,
        hint: r.hint,
      });
    });

    var phaseRank = { day_before: 0, morning_of: 1, service: 2 };
    rows.sort(function (a, b) {
      var pr = phaseRank[a.phase] - phaseRank[b.phase];
      if (pr !== 0) return pr;
      return a.dishName.localeCompare(b.dishName, undefined, { sensitivity: 'base' });
    });
    return rows;
  }

  function buildManifest(payload) {
    var lines = [];
    lines.push(
      payload.eventIcon +
        ' ' +
        payload.eventLabel +
        ' · ' +
        payload.sectionLabel +
        ' · ' +
        payload.pax +
        ' covers'
    );
    if (payload.style) lines.push(payload.style + (payload.price ? ' · ' + payload.price : ''));
    lines.push('');

    (payload.courses || []).forEach(function (course) {
      var sel = course.selection || {};
      var header = course.course;
      if (sel.mode === 'pick' && sel.min != null && sel.max != null && sel.min === sel.max) {
        header += ' (' + course.items.length + ' of ' + sel.min + ')';
      } else if (sel.mode === 'all') {
        header += ' (all included)';
      }
      lines.push(header);
      (course.items || []).forEach(function (item) {
        var tags = (item.tags || []).length ? ' [' + item.tags.join(', ') + ']' : '';
        lines.push('  ✓ ' + item.name + tags);
      });
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  function mergeIngredients(payload) {
    var C = window.KuschiRivieraCanonical;
    var M = window.KuschiRecipeMetric;
    var Kr = window.KuschiUserRecipes;
    var byZone = { freezer: [], coldroom: [], drystore: [], other: [] };
    var map = new Map();

    (payload.courses || []).forEach(function (course) {
      (course.items || []).forEach(function (item) {
        var recipe = item.recipe;
        if (!recipe) return;
        var factor = scaleFactorForRecipe(recipe, payload.pax, payload.style);
        (recipe.ingredients || []).forEach(function (ing) {
          if (!ing || !ing.item) return;
          var canon = C && C.canonicalOrderMergeKey ? C.canonicalOrderMergeKey(ing.item) : ing.item.toLowerCase();
          var scaledQty = scaleQtyStr(ing.qty, factor);
          var mergeBase =
            M && typeof M.rivieraQtyToMergeBase === 'function' ? M.rivieraQtyToMergeBase(scaledQty) : null;
          var gkey = mergeBase ? canon + '\0' + mergeBase.kind : canon + '\0' + scaledQty;
          var zone = 'other';
          if (Kr && typeof Kr.resolveDefaultZone === 'function') {
            zone = Kr.resolveDefaultZone(ing.item);
          } else if (ing.zone) {
            zone = ing.zone;
          }
          if (!map.has(gkey)) {
            map.set(gkey, {
              item: ing.item,
              zone: zone,
              prep: ing.prep ? [ing.prep] : [],
              mergeBase: mergeBase ? { kind: mergeBase.kind, n: mergeBase.n } : null,
              qtyParts: mergeBase ? [] : scaledQty ? [scaledQty] : [],
            });
          } else {
            var ex = map.get(gkey);
            if (mergeBase && ex.mergeBase && ex.mergeBase.kind === mergeBase.kind) {
              ex.mergeBase.n += mergeBase.n;
            } else if (scaledQty) {
              ex.qtyParts.push(scaledQty);
            }
            if (ing.prep && ex.prep.indexOf(ing.prep) < 0) ex.prep.push(ing.prep);
            if (String(ing.item).length > String(ex.item).length) ex.item = ing.item;
          }
        });
      });
    });

    map.forEach(function (entry) {
      var z = ['freezer', 'coldroom', 'drystore', 'other'].indexOf(entry.zone) >= 0 ? entry.zone : 'other';
      var qtyDisplay = '—';
      if (entry.mergeBase && M && typeof M.rivieraMergeBaseToQtyString === 'function') {
        qtyDisplay = M.rivieraMergeBaseToQtyString(entry.mergeBase) || '—';
      } else if (entry.qtyParts.length) {
        qtyDisplay = entry.qtyParts.join(' + ');
      }
      var prep = entry.prep.length ? ' — ' + entry.prep.join('; ') : '';
      byZone[z].push({ item: entry.item, qty: qtyDisplay + prep });
    });

    Object.keys(byZone).forEach(function (z) {
      byZone[z].sort(function (a, b) {
        return a.item.localeCompare(b.item, undefined, { sensitivity: 'base' });
      });
    });
    return byZone;
  }

  function buildFullDocument(payload, timeline, merged) {
    var parts = [];
    parts.push('=== MENU MANIFEST ===\n');
    parts.push(buildManifest(payload));
    parts.push('\n\n=== PREP TIMELINE ===\n');
    PHASE_ORDER.forEach(function (phase) {
      var phaseRows = timeline.filter(function (r) {
        return r.phase === phase;
      });
      if (!phaseRows.length) return;
      parts.push(PHASE_LABELS[phase]);
      phaseRows.forEach(function (r) {
        parts.push('[ ] ' + r.dishName + ' — ' + r.text + ' (' + r.hint + ')');
      });
      parts.push('');
    });
    parts.push('\n=== SHOPPING / PREP LIST ===\n');
    var zoneLabels = { freezer: 'Freezer', coldroom: 'Cold room', drystore: 'Dry store', other: 'Other' };
    ['freezer', 'coldroom', 'drystore', 'other'].forEach(function (z) {
      if (!merged[z] || !merged[z].length) return;
      parts.push(zoneLabels[z]);
      merged[z].forEach(function (row) {
        parts.push('  ' + row.qty + ' · ' + row.item);
      });
      parts.push('');
    });
    return parts.join('\n').trim();
  }

  function buildTimelineText(timeline) {
    var parts = [];
    PHASE_ORDER.forEach(function (phase) {
      var phaseRows = timeline.filter(function (r) {
        return r.phase === phase;
      });
      if (!phaseRows.length) return;
      parts.push(PHASE_LABELS[phase]);
      phaseRows.forEach(function (r) {
        parts.push('[ ] ' + r.dishName + ' — ' + r.text + ' (' + r.hint + ')');
      });
      parts.push('');
    });
    return parts.join('\n').trim();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (_) {
      /* ignore */
    }
    document.body.removeChild(ta);
  }

  function renderTabContent() {
    var body = document.getElementById('plannerListBody');
    if (!body || !_built) return;
    var html = '';

    if (_activeTab === 'menu') {
      html = '<div class="planner-manifest">';
      (_payload.courses || []).forEach(function (course) {
        var sel = course.selection || {};
        var header = course.course;
        if (sel.mode === 'pick' && sel.min != null && sel.max != null && sel.min === sel.max) {
          header += ' (' + course.items.length + ' of ' + sel.min + ')';
        } else if (sel.mode === 'all') {
          header += ' (all included)';
        }
        html += '<h3 class="planner-manifest__course">' + esc(header) + '</h3><ul class="planner-manifest__list">';
        (course.items || []).forEach(function (item) {
          var tags = (item.tags || []).length ? ' <span class="planner-manifest__tags">[' + esc(item.tags.join(', ')) + ']</span>' : '';
          html +=
            '<li><button type="button" class="planner-manifest__item" data-recipe-id="' +
            esc(item.recipeId || '') +
            '">✓ ' +
            esc(item.name) +
            tags +
            '</button></li>';
        });
        html += '</ul>';
      });
      html += '</div>';
    } else if (_activeTab === 'timeline') {
      html = '<div class="planner-timeline">';
      PHASE_ORDER.forEach(function (phase) {
        var rows = _built.timeline.filter(function (r) {
          return r.phase === phase;
        });
        if (!rows.length) return;
        html += '<h3 class="planner-timeline__phase">' + esc(PHASE_LABELS[phase]) + '</h3><ul class="planner-timeline__list">';
        rows.forEach(function (r) {
          html +=
            '<li class="planner-timeline__row"><span class="planner-timeline__check">☐</span> ' +
            '<strong>' +
            esc(r.dishName) +
            '</strong> — ' +
            esc(r.text) +
            '<span class="planner-timeline__hint">' +
            esc(r.hint) +
            '</span></li>';
        });
        html += '</ul>';
      });
      html += '</div>';
    } else if (_activeTab === 'shopping') {
      var zoneLabels = { freezer: 'Freezer', coldroom: 'Cold room', drystore: 'Dry store', other: 'Other' };
      html = '<div class="planner-shopping">';
      ['freezer', 'coldroom', 'drystore', 'other'].forEach(function (z) {
        var rows = _built.merged[z] || [];
        if (!rows.length) return;
        html += '<h3 class="planner-shopping__zone">' + esc(zoneLabels[z]) + '</h3><ul>';
        rows.forEach(function (row) {
          html += '<li><span class="planner-shopping__qty">' + esc(row.qty) + '</span> ' + esc(row.item) + '</li>';
        });
        html += '</ul>';
      });
      html += '</div>';
    } else if (_activeTab === 'recipes') {
      html = '<div class="planner-recipes">';
      (_payload.courses || []).forEach(function (course) {
        (course.items || []).forEach(function (item) {
          var recipe = item.recipe;
          if (!recipe) return;
          var factor = scaleFactorForRecipe(recipe, _payload.pax, _payload.style);
          html += '<details class="planner-recipe" data-recipe-id="' + esc(recipe.id) + '" open>';
          html += '<summary class="planner-recipe__head">' + esc(item.name) + '</summary>';
          html += '<p class="planner-recipe__meta">' + esc(recipe.type || '') + ' · Yield: ' + esc(recipe.yield || '') + ' · ×' + factor.toFixed(2) + '</p>';
          html += '<div class="planner-recipe__ings">';
          scaledIngredients(recipe, factor).forEach(function (ing) {
            html +=
              '<div class="planner-recipe__ing"><span class="planner-recipe__qty">' +
              esc(ing.qty || '·') +
              '</span> ' +
              esc(ing.item) +
              (ing.prep ? ' <em>— ' + esc(ing.prep) + '</em>' : '') +
              '</div>';
          });
          html += '</div>';
          if (recipe.method_steps && recipe.method_steps.length) {
            html += '<ol class="planner-recipe__method">';
            recipe.method_steps.forEach(function (s) {
              html += '<li>' + esc(s) + '</li>';
            });
            html += '</ol>';
          }
          if (recipe.service && recipe.service.length) {
            html += '<p class="planner-recipe__service-label">Service</p><ol class="planner-recipe__service">';
            recipe.service.forEach(function (s) {
              html += '<li>' + esc(s) + '</li>';
            });
            html += '</ol>';
          }
          if (recipe.note) {
            html += '<p class="planner-recipe__note">' + esc(recipe.note) + '</p>';
          }
          html += '</details>';
        });
      });
      html += '</div>';
    }

    body.innerHTML = html;

    if (_activeTab === 'menu') {
      body.querySelectorAll('.planner-manifest__item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          _scrollToRecipeId = btn.getAttribute('data-recipe-id') || null;
          setTab('recipes');
        });
      });
    }

    if (_activeTab === 'recipes' && _scrollToRecipeId) {
      var target = body.querySelector('.planner-recipe[data-recipe-id="' + _scrollToRecipeId + '"]');
      if (target) {
        target.open = true;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      _scrollToRecipeId = null;
    }
  }

  function setTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.planner-list-tab').forEach(function (btn) {
      btn.classList.toggle('planner-list-tab--active', btn.getAttribute('data-tab') === tab);
    });
    renderTabContent();
  }

  function buildFromPayload(payload) {
    _payload = payload;
    _activeTab = 'timeline';
    var timeline = buildPrepTimeline(payload);
    var merged = mergeIngredients(payload);
    var manifest = buildManifest(payload);
    _built = {
      timeline: timeline,
      merged: merged,
      manifest: manifest,
      fullText: buildFullDocument(payload, timeline, merged),
      timelineText: buildTimelineText(timeline),
    };

    var title = document.getElementById('plannerListTitle');
    if (title) {
      title.textContent =
        payload.eventLabel + ' · ' + payload.sectionLabel + ' · ' + payload.pax + ' covers';
    }

    var overlay = document.getElementById('plannerListOverlay');
    if (overlay) {
      overlay.classList.add('open');
      document.body.classList.add('planner-list-open');
    }
    setTab('timeline');
  }

  function open(payload) {
    loadPlannerData()
      .then(function () {
        buildFromPayload(payload);
      })
      .catch(function () {
        buildFromPayload(payload);
      });
  }

  function close() {
    var overlay = document.getElementById('plannerListOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.classList.remove('planner-list-open');
  }

  function openOrderListSubset() {
    if (!_payload || !_payload.recipeIds || !_payload.recipeIds.length) return;
    var ids = _payload.recipeIds;
    function run() {
      if (window.KuschiOrderList && typeof window.KuschiOrderList.create === 'function') {
        var ol = window.rivieraOrderList;
        if (!ol && typeof ensureRivieraOrderList === 'function') {
          ol = ensureRivieraOrderList();
        }
        if (ol && typeof ol.setRecipeIdFilter === 'function') {
          ol.setRecipeIdFilter(ids);
          ol.open();
        }
      }
    }
    if (typeof loadRivieraOrderListScript === 'function') {
      loadRivieraOrderListScript().then(run).catch(run);
    } else {
      run();
    }
  }

  function importPrepBoard() {
    if (!_built || !_built.timeline.length) return;
    var tasks = _built.timeline.map(function (r) {
      return {
        title: PHASE_LABELS[r.phase] + ' · ' + r.dishName + ' — ' + r.text.slice(0, 120),
        notes: r.hint,
        priority: PHASE_PRIORITY[r.phase] || 'medium',
      };
    });
    if (window.rivieraPrepList && typeof window.rivieraPrepList.importTasks === 'function') {
      window.rivieraPrepList.importTasks(tasks);
      if (typeof openPrepModal === 'function') openPrepModal();
      return;
    }
    alert('Prep board not ready — refresh and try again.');
  }

  function bindControls() {
    var closeBtn = document.getElementById('plannerListClose');
    if (closeBtn) closeBtn.addEventListener('click', close);
    var overlay = document.getElementById('plannerListOverlay');
    if (overlay) {
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay) close();
      });
    }
    document.querySelectorAll('.planner-list-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setTab(btn.getAttribute('data-tab'));
      });
    });
    var copyAll = document.getElementById('plannerCopyAll');
    if (copyAll) {
      copyAll.addEventListener('click', function () {
        if (_built) copyText(_built.fullText);
      });
    }
    var copyTimeline = document.getElementById('plannerCopyTimeline');
    if (copyTimeline) {
      copyTimeline.addEventListener('click', function () {
        if (_built) copyText(_built.timelineText);
      });
    }
    var printBtn = document.getElementById('plannerPrint');
    if (printBtn) {
      printBtn.addEventListener('click', function () {
        window.print();
      });
    }
    var orderBtn = document.getElementById('plannerOrderList');
    if (orderBtn) orderBtn.addEventListener('click', openOrderListSubset);
    var prepBtn = document.getElementById('plannerPrepBoard');
    if (prepBtn) prepBtn.addEventListener('click', importPrepBoard);
  }

  function init() {
    bindControls();
  }

  window.KuschiPackagePrepSheet = {
    init: init,
    open: open,
    close: close,
    buildPrepTimeline: buildPrepTimeline,
    buildManifest: buildManifest,
    mergeIngredients: mergeIngredients,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
