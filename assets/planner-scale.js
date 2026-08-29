/**
 * Shared scaling for Function Package Planner → prep sheet + order list.
 */
(function () {
  'use strict';

  var STYLE_TO_SERVICE = {
    cocktail: 'cocktail',
    buffet: 'buffet',
    plated: 'plated_main',
    'plated main': 'plated_main',
    'plated entree': 'plated_entree',
    tapas: 'tapas',
    'sunday tapas': 'tapas',
    'afternoon tea': 'high_tea',
    'high tea': 'high_tea',
    'shared feast': 'feasting',
    'feasting / shared to table': 'feasting',
    corporate: 'corporate_boxed',
  };

  var VARIANT_URLS = [
    'riviera_data/service_variants.json',
    'riviera_data/service_variants_canapes.json',
    'riviera_data/service_variants_corporate.json',
    'riviera_data/service_variants_mains_sides.json',
    'riviera_data/service_variant_source_overrides.json',
  ];

  var _dataPromise = null;
  var _variants = null;
  var _aliases = null;

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

  function parseYieldNum(y) {
    var m = String(y || '').match(/\d[\d.]*/);
    if (!m) return 1;
    var n = parseFloat(m[0]);
    return !isNaN(n) && n > 0 ? n : 1;
  }

  function firstNum(v) {
    var m = String(v == null ? '' : v).match(/[\d.]+/);
    return m ? parseFloat(m[0]) : null;
  }

  function scaleQtyStr(qtyStr, factor) {
    if (factor == null) return 'NEEDS CONFIRMATION';
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

  function resolveRecipeId(recipeId, aliases) {
    var redirects = aliases && aliases.recipe_id_redirects;
    return (redirects && redirects[recipeId]) || recipeId;
  }

  function servicePiecesPerGuest(rec) {
    return (
      firstNum(rec.pieces_per_guest) ||
      firstNum(rec.piece_count) ||
      firstNum(rec.sliders_per_guest) ||
      firstNum(rec.prawns_per_guest) ||
      firstNum(rec.cutlets_per_guest) ||
      firstNum(rec.skewers_per_guest) ||
      firstNum(rec.madeleines_per_guest) ||
      firstNum(rec.portion_count_per_guest) ||
      firstNum(rec.serves_per_guest) ||
      firstNum(rec.cookies_per_guest) ||
      firstNum(rec.bowls_per_guest)
    );
  }

  function scaleFactorForRecipe(recipe, pax, style, variants, aliases) {
    if (!recipe) return 1;
    variants = variants || _variants;
    aliases = aliases || _aliases;
    var canonicalId = resolveRecipeId(recipe.id, aliases);
    var svcKey = serviceKeyFromStyle(style);
    var group = variants && variants.service_variants && variants.service_variants[canonicalId];
    if (group) {
      var rec = group[svcKey];
      if (rec && rec.status !== 'not_recommended') {
        var buffer = firstNum(rec.automatic_event_buffer_multiplier) || 1;
        var ppg = servicePiecesPerGuest(rec);
        var confirmedBasePieces = firstNum(group.base_prep && group.base_prep.base_yield_pieces);
        if (
          !confirmedBasePieces &&
          String(rec.ingredient_scaling_status || '').toUpperCase() === 'NEEDS CONFIRMATION'
        ) {
          return null;
        }
        var basePieces = confirmedBasePieces || parseYieldNum(recipe.yield);
        if (ppg && basePieces && pax) {
          return (pax * ppg * buffer) / basePieces;
        }
        if (basePieces && pax) {
          return (pax * buffer) / basePieces;
        }
      }
    }
    var base = parseYieldNum(recipe.yield);
    if (!base || base <= 0) base = 1;
    return pax / base;
  }

  function buildScaleMap(items, pax, style, variants, aliases) {
    var map = Object.create(null);
    (items || []).forEach(function (item) {
      var recipe = item && item.recipe;
      if (!recipe || !recipe.id) return;
      map[recipe.id] = scaleFactorForRecipe(recipe, pax, style, variants, aliases);
    });
    return map;
  }

  function loadServiceData() {
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

  function buildScaleMapFromPayload(payload) {
    var items = [];
    (payload.courses || []).forEach(function (course) {
      (course.items || []).forEach(function (item) {
        items.push(item);
      });
    });
    return buildScaleMap(items, payload.pax, payload.style, _variants, _aliases);
  }

  window.KuschiPlannerScale = {
    parseYieldNum: parseYieldNum,
    scaleQtyStr: scaleQtyStr,
    serviceKeyFromStyle: serviceKeyFromStyle,
    resolveRecipeId: resolveRecipeId,
    scaleFactorForRecipe: scaleFactorForRecipe,
    buildScaleMap: buildScaleMap,
    buildScaleMapFromPayload: buildScaleMapFromPayload,
    loadServiceData: loadServiceData,
  };
})();
