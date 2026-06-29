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
  var ZONE_ORDER = ['freezer', 'coldroom', 'drystore', 'other'];
  var ZONE_LABELS = { freezer: 'Freezer', coldroom: 'Cold room', drystore: 'Dry store', other: 'Other' };
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
  var _includeRecipesInPrint = false;
  var _timelineChecked = {};
  var TIMELINE_CHECK_KEY = 'kuschi_planner_timeline_v1::';

  function timelineRowId(row) {
    return row.phase + '::' + String(row.text || '').slice(0, 80).replace(/\s+/g, ' ');
  }

  function loadTimelineChecks(planId) {
    if (!planId) {
      _timelineChecked = {};
      return;
    }
    try {
      var raw = localStorage.getItem(TIMELINE_CHECK_KEY + planId);
      _timelineChecked = raw ? JSON.parse(raw) : {};
      if (!_timelineChecked || typeof _timelineChecked !== 'object') _timelineChecked = {};
    } catch (_) {
      _timelineChecked = {};
    }
  }

  function saveTimelineChecks(planId) {
    if (!planId) return;
    try {
      localStorage.setItem(TIMELINE_CHECK_KEY + planId, JSON.stringify(_timelineChecked));
    } catch (_) {
      /* quota */
    }
  }

  function toggleTimelineRow(rowId) {
    if (_timelineChecked[rowId]) delete _timelineChecked[rowId];
    else _timelineChecked[rowId] = true;
    if (_payload && _payload.planId) saveTimelineChecks(_payload.planId);
    if (_built) {
      _built.timelineText = buildTimelineText(_built.timeline);
      _built.fullText = buildFullDocument(_payload, _built.timeline, _built.merged);
    }
    renderTabContent();
  }

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
    if (window.KuschiPlannerScale && typeof window.KuschiPlannerScale.loadServiceData === 'function') {
      return window.KuschiPlannerScale.loadServiceData().then(function (d) {
        _variants = d.variants;
        _aliases = d.aliases;
        return d;
      });
    }
    if (!_dataPromise) {
      _dataPromise = Promise.resolve({ variants: {}, aliases: { recipe_id_redirects: {} } });
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
    var S = window.KuschiPlannerScale;
    if (S) return S.parseYieldNum(y);
    var m = String(y || '').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 1;
  }

  function scaleQtyStr(qtyStr, factor) {
    var S = window.KuschiPlannerScale;
    if (S) return S.scaleQtyStr(qtyStr, factor);
    return qtyStr || '';
  }

  function serviceKeyFromStyle(style) {
    var s = String(style || '').trim().toLowerCase();
    return STYLE_TO_SERVICE[s] || 'buffet';
  }

  function scaleFactorForRecipe(recipe, pax, style, variants, aliases) {
    var S = window.KuschiPlannerScale;
    if (S) return S.scaleFactorForRecipe(recipe, pax, style, variants || _variants, aliases || _aliases);
    return pax / parseYieldNum(recipe && recipe.yield);
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

  function classifyPhase(recipe, stepText, isService, stepIndex) {
    if (!isService && recipe && recipe.prepPhases && recipe.prepPhases[stepIndex]) {
      var sp = String(recipe.prepPhases[stepIndex]);
      if (sp === 'day_before' || sp === 'morning_of' || sp === 'service') return sp;
    }
    if (recipe && recipe.prepPhase && !isService) {
      var pp = String(recipe.prepPhase);
      if (pp === 'day_before' || pp === 'morning_of' || pp === 'service') return pp;
    }
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
          var phase = classifyPhase(recipe, step, false, si);
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
      var row = {
        phase: r.phase,
        recipeId: r.recipeId,
        dishName: r.dishNames.join(', '),
        text: r.text,
        hint: r.hint,
      };
      row.rowId = timelineRowId(row);
      rows.push(row);
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
    if (payload.eventDate) lines.push(formatEventDate(payload.eventDate));
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

  function formatEventDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso + 'T12:00:00');
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) {
      return iso;
    }
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
        parts.push(timelineCheckMark(r.rowId) + ' ' + r.dishName + ' — ' + r.text + ' (' + r.hint + ')');
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

  function timelineCheckMark(rowId) {
    return _timelineChecked[rowId] ? '[x]' : '[ ]';
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
        parts.push(timelineCheckMark(r.rowId) + ' ' + r.dishName + ' — ' + r.text + ' (' + r.hint + ')');
      });
      parts.push('');
    });
    return parts.join('\n').trim();
  }

  function recipeMetricItems(courseName, recipe, factor) {
    var methodCount = (recipe.method_steps || []).length;
    var serviceCount = (recipe.service || []).length;
    var yieldLabel = String(recipe.yield || 'Batch').split(/\s+[—-]\s+/)[0].trim();
    if (yieldLabel.length > 42) yieldLabel = yieldLabel.slice(0, 39) + '...';
    var items = [{ label: 'Course', value: courseName || 'Recipe' }];
    if (recipe.type) items.push({ label: 'Type', value: recipe.type });
    items.push({ label: 'Yield', value: yieldLabel || 'Batch' });
    items.push({ label: 'Scale', value: '×' + factor.toFixed(2) });
    items.push({ label: 'Ings', value: String((recipe.ingredients || []).length) });
    items.push({ label: 'Prep', value: String(methodCount) });
    items.push({ label: 'Service', value: String(serviceCount) });
    return items;
  }

  function renderMetricChips(items, blockClass) {
    return (
      '<div class="' +
      blockClass +
      '__metrics">' +
      items
        .map(function (item) {
          return (
            '<span class="' +
            blockClass +
            '__metric"><span class="' +
            blockClass +
            '__metric-label">' +
            esc(item.label) +
            '</span><strong>' +
            esc(item.value) +
            '</strong></span>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderScreenSectionLabel(label, count) {
    return (
      '<p class="planner-recipe__section-label">' +
      esc(label) +
      (count != null ? ' <span>' + esc(count) + '</span>' : '') +
      '</p>'
    );
  }

  function renderPrintSectionTitle(label, count) {
    return (
      '<p class="planner-print-recipe__section-title">' +
      esc(label) +
      (count != null ? ' <span>' + esc(count) + '</span>' : '') +
      '</p>'
    );
  }

  function renderShoppingStats(stats, blockClass) {
    return (
      '<div class="' +
      blockClass +
      '__stats">' +
      stats
        .map(function (stat) {
          return (
            '<span class="' +
            blockClass +
            '__stat"><span class="' +
            blockClass +
            '__stat-label">' +
            esc(stat.label) +
            '</span><strong>' +
            esc(stat.count) +
            '</strong></span>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function buildRecipesPrintHtml() {
    if (!_payload) return '';
    var html = '<h2>Recipes</h2>';
    (_payload.courses || []).forEach(function (course) {
      (course.items || []).forEach(function (item) {
        var recipe = item.recipe;
        if (!recipe) return;
        var factor = scaleFactorForRecipe(recipe, _payload.pax, _payload.style);
        var ingredients = scaledIngredients(recipe, factor);
        var method = recipe.method_steps || [];
        var service = recipe.service || [];
        html += '<div class="planner-print-recipe">';
        html += '<h3>' + esc(item.name) + '</h3>';
        html += renderMetricChips(recipeMetricItems(course.course, recipe, factor), 'planner-print-recipe');
        html += renderPrintSectionTitle('Ingredients', ingredients.length);
        html += '<ul class="planner-print-recipe__ingredients">';
        ingredients.forEach(function (ing) {
          html += '<li>' + esc((ing.qty || '·') + ' · ' + ing.item + (ing.prep ? ' — ' + ing.prep : '')) + '</li>';
        });
        html += '</ul>';
        if (method.length) {
          html += renderPrintSectionTitle('Method', method.length);
          html += '<ol class="planner-print-recipe__method">';
          method.forEach(function (s) {
            html += '<li>' + esc(s) + '</li>';
          });
          html += '</ol>';
        }
        if (service.length) {
          html += renderPrintSectionTitle('Service', service.length);
          html += '<ol class="planner-print-recipe__service">';
          service.forEach(function (s) {
            html += '<li>' + esc(s) + '</li>';
          });
          html += '</ol>';
        }
        if (recipe.note) {
          html += '<p class="planner-print-recipe__note">' + esc(recipe.note) + '</p>';
        }
        html += '</div>';
      });
    });
    return html;
  }

  function copyText(text, toastMsg) {
    var done = function () {
      showCopyToast(toastMsg || 'Copied to clipboard');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text);
        done();
      });
    } else {
      fallbackCopy(text);
      done();
    }
  }

  function showCopyToast(msg) {
    var t = document.getElementById('plannerCopyToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('planner-copy-toast--show');
    setTimeout(function () {
      t.classList.remove('planner-copy-toast--show');
    }, 2200);
  }

  function populatePrintRoot() {
    var root = document.getElementById('plannerPrintRoot');
    if (!root || !_built || !_payload) return;
    var shoppingStats = shoppingZoneStats(_built.merged);
    var html = '<div class="planner-print-doc">';
    html += '<h1>' + esc(_payload.eventLabel + ' · ' + _payload.sectionLabel + ' · ' + _payload.pax + ' covers') + '</h1>';
    if (_payload.eventDate) {
      html += '<p class="planner-print-doc__date">' + esc(formatEventDate(_payload.eventDate)) + '</p>';
    }
    html +=
      '<div class="planner-print-doc__meta">' +
      '<span><strong>' +
      esc(countPayloadRecipes(_payload)) +
      '</strong> dishes</span><span><strong>' +
      esc((_built.timeline || []).length) +
      '</strong> prep tasks</span><span><strong>' +
      esc(countShoppingLines(_built.merged)) +
      '</strong> shopping lines</span></div>';
    html += '<h2>Menu</h2><pre>' + esc(_built.manifest) + '</pre>';
    html += '<h2>Prep timeline</h2><pre>' + esc(_built.timelineText) + '</pre>';
    html += '<h2>Shopping</h2>';
    html += renderShoppingStats(shoppingStats, 'planner-print-shopping');
    ZONE_ORDER.forEach(function (z) {
      var rows = _built.merged[z] || [];
      if (!rows.length) return;
      html += '<h3>' + esc(ZONE_LABELS[z]) + ' <span>' + rows.length + '</span></h3><ul class="planner-print-shopping__list">';
      rows.forEach(function (row) {
        html += '<li><strong>' + esc(row.qty) + '</strong><span>' + esc(row.item) + '</span></li>';
      });
      html += '</ul>';
    });
    if (_includeRecipesInPrint) html += buildRecipesPrintHtml();
    html += '</div>';
    root.innerHTML = html;
  }

  function planIdFromPayload(payload) {
    if (!payload) return '';
    return [payload.eventId, payload.sectionId, payload.pax, (payload.recipeIds || []).join(',')]
      .join('::')
      .slice(0, 120);
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

  function countPayloadRecipes(payload) {
    if (!payload) return 0;
    if (payload.recipeIds && payload.recipeIds.length) return payload.recipeIds.length;
    return (payload.courses || []).reduce(function (sum, course) {
      return sum + ((course.items || []).length || 0);
    }, 0);
  }

  function countShoppingLines(merged) {
    var total = 0;
    ZONE_ORDER.forEach(function (zone) {
      total += ((merged && merged[zone]) || []).length;
    });
    return total;
  }

  function shoppingZoneStats(merged) {
    return ZONE_ORDER.map(function (zone) {
      return {
        zone: zone,
        label: ZONE_LABELS[zone],
        count: ((merged && merged[zone]) || []).length,
      };
    }).filter(function (item) {
      return item.count > 0;
    });
  }

  function activeTabLabel(tab) {
    return {
      menu: 'Menu',
      timeline: 'Timeline',
      shopping: 'Shopping',
      recipes: 'Recipes',
    }[tab] || 'Timeline';
  }

  function summaryChip(label, value, mod) {
    return (
      '<span class="planner-list__summary-chip' +
      (mod ? ' planner-list__summary-chip--' + mod : '') +
      '"><span class="planner-list__summary-kicker">' +
      esc(label) +
      '</span><strong>' +
      esc(value) +
      '</strong></span>'
    );
  }

  function renderSummary() {
    var summary = document.getElementById('plannerListSummary');
    if (!summary) return;
    if (!_payload || !_built) {
      summary.hidden = true;
      summary.innerHTML = '';
      return;
    }
    var courseCount = (_payload.courses || []).filter(function (course) {
      return (course.items || []).length;
    }).length;
    var recipeCount = countPayloadRecipes(_payload);
    var timelineTotal = (_built.timeline || []).length;
    var timelineDone = 0;
    (_built.timeline || []).forEach(function (row) {
      if (_timelineChecked[row.rowId]) timelineDone += 1;
    });
    var shoppingLines = countShoppingLines(_built.merged);
    var chips = [summaryChip('View', activeTabLabel(_activeTab), 'focus')];
    if (_payload.eventDate) chips.push(summaryChip('Date', formatEventDate(_payload.eventDate), ''));
    chips.push(summaryChip('Covers', String(_payload.pax || 0), ''));
    chips.push(summaryChip('Menu', recipeCount + ' dishes / ' + courseCount + ' courses', ''));
    chips.push(summaryChip('Prep', timelineDone + '/' + timelineTotal + ' done', ''));
    chips.push(summaryChip('Shop', shoppingLines + ' lines', ''));
    summary.innerHTML = chips.join('');
    summary.hidden = false;
  }

  function renderTabContent() {
    var body = document.getElementById('plannerListBody');
    if (!body || !_built) return;
    renderSummary();
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
          var checked = !!_timelineChecked[r.rowId];
          html +=
            '<li class="planner-timeline__row' +
            (checked ? ' planner-timeline__row--done' : '') +
            '"><button type="button" class="planner-timeline__check-btn" data-row-id="' +
            esc(r.rowId) +
            '" aria-pressed="' +
            (checked ? 'true' : 'false') +
            '" aria-label="' +
            (checked ? 'Mark incomplete' : 'Mark complete') +
            '">' +
            (checked ? '☑' : '☐') +
            '</button><span class="planner-timeline__main"><span class="planner-timeline__top"><strong class="planner-timeline__dish">' +
            esc(r.dishName) +
            '</strong><span class="planner-timeline__phase-chip">' +
            esc(PHASE_LABELS[r.phase] || 'Prep') +
            '</span></span><span class="planner-timeline__task">' +
            esc(r.text) +
            '</span><span class="planner-timeline__meta">' +
            esc(r.hint) +
            '</span></span></li>';
        });
        html += '</ul>';
      });
      html += '</div>';
    } else if (_activeTab === 'shopping') {
      var zoneStats = shoppingZoneStats(_built.merged);
      html = '<div class="planner-shopping">';
      html += renderShoppingStats(zoneStats, 'planner-shopping');
      ZONE_ORDER.forEach(function (z) {
        var rows = _built.merged[z] || [];
        if (!rows.length) return;
        html +=
          '<section class="planner-shopping__zone-block"><h3 class="planner-shopping__zone">' +
          esc(ZONE_LABELS[z]) +
          '<span>' +
          rows.length +
          '</span></h3><ul class="planner-shopping__list">';
        rows.forEach(function (row) {
          html +=
            '<li class="planner-shopping__row"><span class="planner-shopping__qty">' +
            esc(row.qty) +
            '</span><span class="planner-shopping__item">' +
            esc(row.item) +
            '</span></li>';
        });
        html += '</ul></section>';
      });
      var X = window.KuschiPlannerExtras;
      if (X && _built && _built.merged) {
        var est = X.estimateShoppingCost(_built.merged);
        if (est.covered > 0) {
          html +=
            '<div class="planner-shopping__cost">Est. food cost (partial): <strong>' +
            esc(X.formatAud(est.total)) +
            '</strong> · ' +
            est.covered +
            '/' +
            est.lines +
            ' lines priced</div>';
        }
      }
      html += '</div>';
    } else if (_activeTab === 'recipes') {
      html = '<div class="planner-recipes">';
      (_payload.courses || []).forEach(function (course) {
        (course.items || []).forEach(function (item) {
          var recipe = item.recipe;
          if (!recipe) return;
          var factor = scaleFactorForRecipe(recipe, _payload.pax, _payload.style);
          var ingredients = scaledIngredients(recipe, factor);
          var method = recipe.method_steps || [];
          var service = recipe.service || [];
          html += '<details class="planner-recipe" data-recipe-id="' + esc(recipe.id) + '" open>';
          html +=
            '<summary class="planner-recipe__head"><span class="planner-recipe__head-title">' +
            esc(item.name) +
            '</span><span class="planner-recipe__head-count">' +
            esc(method.length + ' prep · ' + service.length + ' service') +
            '</span></summary>';
          html += renderMetricChips(recipeMetricItems(course.course, recipe, factor), 'planner-recipe');
          html += renderScreenSectionLabel('Ingredients', ingredients.length);
          html += '<div class="planner-recipe__ings">';
          ingredients.forEach(function (ing) {
            html +=
              '<div class="planner-recipe__ing"><span class="planner-recipe__qty">' +
              esc(ing.qty || '·') +
              '</span><span class="planner-recipe__ing-main">' +
              esc(ing.item) +
              (ing.prep ? ' <em>' + esc(ing.prep) + '</em>' : '') +
              '</span></div>';
          });
          html += '</div>';
          if (method.length) {
            html += renderScreenSectionLabel('Method', method.length);
            html += '<ol class="planner-recipe__method">';
            method.forEach(function (s) {
              html += '<li>' + esc(s) + '</li>';
            });
            html += '</ol>';
          }
          if (service.length) {
            html += renderScreenSectionLabel('Service', service.length);
            html += '<ol class="planner-recipe__service">';
            service.forEach(function (s) {
              html += '<li>' + esc(s) + '</li>';
            });
            html += '</ol>';
          }
          if (recipe.note) {
            html += renderScreenSectionLabel('Note', null);
            html += '<p class="planner-recipe__note">' + esc(recipe.note) + '</p>';
          }
          html += '</details>';
        });
      });
      html += '</div>';
    }

    body.innerHTML = html;

    if (_activeTab === 'timeline') {
      body.querySelectorAll('.planner-timeline__check-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          toggleTimelineRow(btn.getAttribute('data-row-id') || '');
        });
      });
    }

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
    _payload.planId = planIdFromPayload(payload);
    loadTimelineChecks(_payload.planId);
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
    populatePrintRoot();

    var title = document.getElementById('plannerListTitle');
    if (title) {
      var titleText = payload.eventLabel + ' · ' + payload.sectionLabel + ' · ' + payload.pax + ' covers';
      if (payload.eventDate) titleText += ' · ' + formatEventDate(payload.eventDate);
      title.textContent = titleText;
    }

    var overlay = document.getElementById('plannerListOverlay');
    if (overlay) {
      overlay.classList.add('open');
      document.body.classList.add('planner-list-open');
    }
    setTab('timeline');
  }

  function open(payload) {
    var finish = function () {
      var extras = window.KuschiPlannerExtras;
      var loadExtras =
        extras && typeof extras.loadPlannerExtrasData === 'function'
          ? extras.loadPlannerExtrasData()
          : Promise.resolve();
      loadExtras
        .then(function () {
          buildFromPayload(payload);
        })
        .catch(function () {
          buildFromPayload(payload);
        });
    };
    loadPlannerData()
      .then(finish)
      .catch(finish);
  }

  function close() {
    var overlay = document.getElementById('plannerListOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.classList.remove('planner-list-open');
  }

  function openOrderListSubset() {
    if (!_payload || !_payload.recipeIds || !_payload.recipeIds.length) return;
    var ids = _payload.recipeIds;
    function run(scaleMap) {
      var ctx = {
        fromPlanner: true,
        label: _payload.eventLabel + ' · ' + _payload.sectionLabel,
        pax: _payload.pax,
        recipeCount: ids.length,
        shoppingLineCount: _built && _built.merged ? countShoppingLines(_built.merged) : null,
        scaleMap: scaleMap || {},
      };
      var ol = window.rivieraOrderList;
      if (!ol && window.ensureRivieraOrderList) ol = window.ensureRivieraOrderList();
      if (!ol || typeof ol.setRecipeIdFilter !== 'function') return;
      if (window.KuschiOverlayStack) window.KuschiOverlayStack.push(['plannerListOverlay']);
      ol.setPlannerContext(ctx);
      ol.setRecipeIdFilter(ids);
      ol.open({ fromPlanner: true });
    }
    var scalePromise = Promise.resolve({});
    var S = window.KuschiPlannerScale;
    if (S && typeof S.loadServiceData === 'function' && typeof S.buildScaleMapFromPayload === 'function') {
      scalePromise = S.loadServiceData().then(function () {
        return S.buildScaleMapFromPayload(_payload);
      });
    }
    var loadFn = window.loadRivieraOrderListScript;
    var orderPromise = typeof loadFn === 'function' ? loadFn() : Promise.resolve();
    Promise.all([scalePromise, orderPromise])
      .then(function (pair) {
        run(pair[0]);
      })
      .catch(function () {
        run({});
      });
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
    var prep = window.rivieraPrepList;
    if (!prep || typeof prep.importTasks !== 'function') {
      alert('Prep board not ready — refresh and try again.');
      return;
    }
    var existing = typeof prep.getTaskCount === 'function' ? prep.getTaskCount() : 0;
    var mode = 'append';
    if (existing > 0) {
      mode = confirm(
        'Replace all ' +
          existing +
          ' prep tasks with this planner timeline?\n\nOK = Replace\nCancel = Append ' +
          tasks.length +
          ' tasks'
      )
        ? 'replace'
        : 'append';
    }
    prep.importTasks(tasks, { mode: mode, planId: _payload && _payload.planId });
    if (window.KuschiOverlayStack) window.KuschiOverlayStack.push(['plannerListOverlay']);
    prep.open({ fromPlanner: true });
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
        if (_built) copyText(_built.fullText, 'Full planner list copied');
      });
    }
    var copyTimeline = document.getElementById('plannerCopyTimeline');
    if (copyTimeline) {
      copyTimeline.addEventListener('click', function () {
        if (_built) copyText(_built.timelineText, 'Timeline copied');
      });
    }
    var printBtn = document.getElementById('plannerPrint');
    if (printBtn) {
      printBtn.addEventListener('click', function () {
        populatePrintRoot();
        window.print();
      });
    }
    var downloadHtml = document.getElementById('plannerDownloadHtml');
    if (downloadHtml) {
      downloadHtml.addEventListener('click', function () {
        populatePrintRoot();
        var root = document.getElementById('plannerPrintRoot');
        var X = window.KuschiPlannerExtras;
        if (!root || !X || !_payload) return;
        var title = _payload.eventLabel + ' · ' + _payload.sectionLabel + ' · ' + _payload.pax + ' covers';
        X.downloadPlannerHtml(title, root.innerHTML);
      });
    }
    var exportBundle = document.getElementById('plannerExportBundle');
    if (exportBundle) {
      exportBundle.addEventListener('click', function () {
        var X = window.KuschiPlannerExtras;
        var P = window.KuschiPackagePlanner;
        if (!X || !P || typeof P.getState !== 'function') return;
        X.downloadJson(
          'kuschi-planner-bundle.json',
          X.exportPlanBundle(P.getState(), { planId: _payload && _payload.planId })
        );
      });
    }
    var printRecipes = document.getElementById('plannerPrintIncludeRecipes');
    if (printRecipes) {
      printRecipes.addEventListener('change', function () {
        _includeRecipesInPrint = !!printRecipes.checked;
        populatePrintRoot();
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
