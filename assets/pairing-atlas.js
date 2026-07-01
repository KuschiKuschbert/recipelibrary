/**
 * Aroma matrix — G1–G8, enrichment from unified index + pairing matrix + food pairings.
 */
(function () {
  'use strict';

  var ING = 'aroma_data/ingredients.json';
  var META = 'aroma_data/aroma_matrix_meta.json';
  var UNIFIED = 'combined_data/ingredients_unified.json';
  var PAIRING_MATRIX = 'aroma_data/pairing_matrix.json';
  var FOOD_PAIRINGS = 'aroma_data/food_pairings.json';
  var FLAVOUR_HINTS = 'flavour_data/flavour_hints_by_id.json';

  var state = {
    meta: {},
    ingredients: [],
    byId: {},
    unifiedById: null,
    flavourHints: null,
    kitchenContext: null,
    pairingMatrix: null,
    foodPairings: null,
    enriched: false,
    currentMode: 'priority',
    foodSpiceMode: 'priority',
    layer: 'aroma',
    openDrawerSpiceId: null,
    openDrawerFoodId: null,
    decisionSpiceId: null,
    decisionFoodId: null,
  };
  var foodMatrixPainted = false;
  var foodMatrixObserver = null;

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function ingredientQueryCandidates(query) {
    var flow = window.KuschiIngredientFlow;
    if (flow && typeof flow.queryCandidates === 'function') return flow.queryCandidates(query);
    var q = norm(query);
    return q ? [q] : [];
  }

  function isLikelyInstruction(s) {
    var text = String(s || '').trim();
    return /^(tips?:|add |toast |use |with lighter|bloom |cook |grind |crush )/i.test(text);
  }

  function cleanPairingName(s) {
    return String(s || '')
      .replace(/^tips?:\s*/i, '')
      .trim();
  }

  function buildIngredientById(ingredients) {
    var m = Object.create(null);
    for (var i = 0; i < ingredients.length; i++) {
      var ing = ingredients[i];
      if (ing && ing.id) m[ing.id] = ing;
    }
    return m;
  }

  function harmonyPartnerCount(id) {
    if (!state.pairingMatrix || !state.pairingMatrix[id]) return null;
    var arr = state.pairingMatrix[id];
    return Array.isArray(arr) ? arr.length : 0;
  }

  function sourceBadges(unifiedRow) {
    var a = 'A';
    var f = unifiedRow && unifiedRow.flavor ? 'F' : '·';
    var t = unifiedRow && unifiedRow.thesaurus ? 'T' : '·';
    return (
      '<span class="pa-src pa-src-on" title="Aroma Bible">' +
      a +
      '</span><span class="' +
      (f === 'F' ? 'pa-src pa-src-on' : 'pa-src') +
      '" title="Flavor Bible">' +
      f +
      '</span><span class="' +
      (t === 'T' ? 'pa-src pa-src-on' : 'pa-src') +
      '" title="Flavor Thesaurus">' +
      t +
      '</span>'
    );
  }

  function displayNameForIngredient(ing) {
    if (!ing) return '';
    var displayNames = state.meta.display_names && typeof state.meta.display_names === 'object' ? state.meta.display_names : {};
    return displayNames[ing.id] || ing.name || ing.id || '';
  }

  function matchRowsByCandidate(rows, q, nameForRow) {
    if (!q || q.length < 2) return null;
    var prefix = null;
    var contains = null;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row) continue;
      var idn = norm(row.id || '');
      var nn = norm(nameForRow(row));
      if (idn === q || nn === q) return { item: row, strength: 3 };
      if (!prefix && (idn.indexOf(q) === 0 || nn.indexOf(q) === 0)) {
        prefix = { item: row, strength: 2 };
      }
      if (!contains && q.length >= 3 && (idn.indexOf(q) >= 0 || nn.indexOf(q) >= 0)) {
        contains = { item: row, strength: 1 };
      }
    }
    return prefix || contains;
  }

  function matchIngredientCandidate(q) {
    return matchRowsByCandidate(state.ingredients || [], q, displayNameForIngredient);
  }

  function matchFoodCandidate(q) {
    return matchRowsByCandidate(state.foodPairings || [], q, function (food) {
      return food.name || food.id || '';
    });
  }

  function findDecisionTarget(query) {
    var candidates = ingredientQueryCandidates(query);
    if (!candidates.length) return null;
    for (var ci = 0; ci < candidates.length; ci++) {
      var q = candidates[ci];
      var spiceMatch = matchIngredientCandidate(q);
      var foodMatch = matchFoodCandidate(q);
      if (spiceMatch && foodMatch) {
        return foodMatch.strength > spiceMatch.strength
          ? { kind: 'food', item: foodMatch.item }
          : { kind: 'spice', item: spiceMatch.item };
      }
      if (spiceMatch) return { kind: 'spice', item: spiceMatch.item };
      if (foodMatch) return { kind: 'food', item: foodMatch.item };
    }
    return null;
  }

  function defaultDecisionIngredient() {
    if (state.decisionSpiceId && state.byId[state.decisionSpiceId]) return state.byId[state.decisionSpiceId];
    if (state.byId.basil) return state.byId.basil;
    var order = state.meta.priority_row_ids || [];
    for (var i = 0; i < order.length; i++) {
      if (state.byId[order[i]]) return state.byId[order[i]];
    }
    return state.ingredients && state.ingredients.length ? state.ingredients[0] : null;
  }

  function uniqueNames(items, limit) {
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var text = '';
      var id = '';
      if (typeof item === 'string') {
        text = item;
      } else if (item) {
        text = item.name || item.label || item.id || '';
        id = item.id || '';
      }
      text = String(text || '').trim();
      if (!text) continue;
      var k = norm(text);
      if (!k || seen[k]) continue;
      seen[k] = true;
      out.push({ id: id, name: text });
      if (limit && out.length >= limit) break;
    }
    return out;
  }

  function uniqueText(items, limit) {
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < (items || []).length; i++) {
      var text = cleanPairingName(items[i]);
      if (!text) continue;
      var k = norm(text);
      if (!k || seen[k]) continue;
      seen[k] = true;
      out.push(text);
      if (limit && out.length >= limit) break;
    }
    return out;
  }

  function matrixPartnerNames(ing, limit) {
    if (!state.pairingMatrix || !ing || !ing.id) return [];
    var ids = state.pairingMatrix[ing.id] || [];
    var items = [];
    for (var i = 0; i < ids.length; i++) {
      var pid = ids[i];
      var p = state.byId[pid];
      items.push({ id: pid, name: p ? displayNameForIngredient(p) : String(pid).replace(/-/g, ' ') });
    }
    return uniqueNames(items, limit);
  }

  function aromaHarmonyNames(ing, limit) {
    var u = state.unifiedById ? state.unifiedById[ing.id] : null;
    var ar = u && u.aroma ? u.aroma : ing;
    var hw = (ar && ar.harmonizes_with) || ing.harmonizes_with || [];
    var primary = uniqueNames(hw, limit);
    if (primary.length >= limit) return primary;
    return primary.concat(
      matrixPartnerNames(ing, limit * 2).filter(function (item) {
        for (var i = 0; i < primary.length; i++) {
          if (norm(primary[i].name) === norm(item.name)) return false;
        }
        return true;
      }).slice(0, limit - primary.length)
    );
  }

  function foodMatchesForSpice(spiceId, limit) {
    if (!state.foodPairings || !spiceId) return [];
    var out = [];
    for (var i = 0; i < state.foodPairings.length; i++) {
      var food = state.foodPairings[i];
      var seas = food && food.seasonings ? food.seasonings : [];
      for (var j = 0; j < seas.length; j++) {
        if (seas[j] && seas[j].id === spiceId) {
          out.push({ id: food.id || '', name: food.name || food.id || '' });
          break;
        }
      }
      if (limit && out.length >= limit) break;
    }
    return uniqueNames(out, limit);
  }

  function orderedFoodSeasonings(food) {
    var seas = (food && food.seasonings) || [];
    var priority = state.meta.priority_row_ids || [];
    var rankById = Object.create(null);
    for (var i = 0; i < priority.length; i++) rankById[priority[i]] = i;
    return seas
      .map(function (s, idx) {
        var id = s && s.id ? s.id : '';
        return {
          id: id,
          name: (s && (s.name || s.id)) || '',
          _idx: idx,
          _rank: rankById[id] != null ? rankById[id] : 999 + idx,
        };
      })
      .filter(function (item) {
        return !!item.name;
      })
      .sort(function (a, b) {
        if (a._rank !== b._rank) return a._rank - b._rank;
        return a._idx - b._idx;
      });
  }

  function foodSeasoningItems(food, limit, skipItems) {
    var skip = Object.create(null);
    for (var si = 0; si < (skipItems || []).length; si++) {
      skip[norm(skipItems[si].name || skipItems[si].id || '')] = true;
    }
    var seen = Object.create(null);
    var out = [];
    var items = orderedFoodSeasonings(food);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var k = norm(item.name);
      if (!k || seen[k] || skip[k]) continue;
      seen[k] = true;
      out.push({ id: item.id, name: item.name });
      if (limit && out.length >= limit) break;
    }
    return out;
  }

  function flavorPairingNames(ing, limit) {
    var u = state.unifiedById ? state.unifiedById[ing.id] : null;
    var fl = u && u.flavor ? u.flavor : null;
    var pairObj = fl && fl.pairings ? fl.pairings : {};
    var tiers = ['holy_grail', 'very_highly_recommended', 'highly_recommended', 'recommended'];
    var items = [];
    for (var i = 0; i < tiers.length; i++) {
      var arr = pairObj[tiers[i]];
      if (arr && arr.length) {
        for (var j = 0; j < arr.length; j++) {
          if (!isLikelyInstruction(arr[j])) items.push(arr[j]);
        }
      }
      if (limit && items.length >= limit * 2) break;
    }
    return uniqueNames(items, limit);
  }

  function flavorUseTips(ing, limit) {
    var u = state.unifiedById ? state.unifiedById[ing.id] : null;
    var fl = u && u.flavor ? u.flavor : null;
    var pairObj = fl && fl.pairings ? fl.pairings : {};
    var tips = [];
    Object.keys(pairObj).forEach(function (tier) {
      var arr = pairObj[tier] || [];
      for (var i = 0; i < arr.length; i++) {
        if (isLikelyInstruction(arr[i])) tips.push(arr[i]);
      }
    });
    if (fl && fl.function) tips.push('Function: ' + fl.function);
    if (fl && fl.flavor_notes) tips.push(fl.flavor_notes);
    return uniqueText(tips, limit);
  }

  function flavorAvoidNames(ing, limit) {
    var u = state.unifiedById ? state.unifiedById[ing.id] : null;
    var fl = u && u.flavor ? u.flavor : null;
    return uniqueNames((fl && fl.avoid) || [], limit);
  }

  function aromaGroupText(ing) {
    var labels = state.meta.group_labels || [];
    var groups = (ing && ing.aroma_groups) || [];
    if (!groups.length) return 'No aroma group';
    return groups
      .map(function (g) {
        return 'G' + g + (labels[g - 1] ? ' ' + labels[g - 1] : '');
      })
      .join(', ');
  }

  function drawerPillHtml(text, label, raw) {
    if (!text) return '';
    return window.KuschiIngredientFlow.pill(text, { className: 'pa-drawer-pill', label: label, raw: raw });
  }

  function drawerMetaHtml(ing, unifiedRow) {
    var fl = unifiedRow && unifiedRow.flavor ? unifiedRow.flavor : null;
    var th = unifiedRow && unifiedRow.thesaurus ? unifiedRow.thesaurus : null;
    var parts = [];
    parts.push(drawerPillHtml(aromaGroupText(ing)));
    var partnerCount = harmonyPartnerCount(ing.id);
    if (partnerCount != null) parts.push(drawerPillHtml(partnerCount + ' harmony links'));
    if (th && (th.family || th.family_slug)) parts.push(drawerPillHtml('Family: ' + String(th.family || th.family_slug)));
    if (fl && fl.weight) parts.push(drawerPillHtml('Weight: ' + String(fl.weight)));
    if (fl && fl.volume) parts.push(drawerPillHtml('Volume: ' + String(fl.volume)));
    if (fl && Array.isArray(fl.taste) && fl.taste.length) parts.push(drawerPillHtml('Taste: ' + fl.taste.join(', ')));
    if (unifiedRow) parts.push(drawerPillHtml(sourceBadges(unifiedRow), 'Source coverage', true));
    return parts.length ? '<div class="pa-drawer-meta">' + parts.join('') + '</div>' : '';
  }

  function answerChipText(item) {
    return item && item.name ? item.name : String(item || '');
  }

  function answerChipHref(item, options) {
    var text = answerChipText(item);
    var id = item && item.id ? item.id : '';
    var href = options && options.href;
    if (!href && id && options && options.kind === 'spice') href = 'aroma.html?spice=' + encodeURIComponent(id);
    if (!href && id && options && options.kind === 'food') href = 'pairing-atlas.html?ingredient=' + encodeURIComponent(text);
    if (!href && options && options.kind === 'flavor') href = 'flavor.html?q=' + encodeURIComponent(text);
    return href;
  }

  function chipListHtml(items, options) {
    options = options || {};
    return window.KuschiIngredientFlow.chips(items, {
      empty: options.empty || 'No direct match in this extract yet.',
      emptyClassName: 'pa-answer__empty',
      className: 'pa-answer__chips',
      chipClassName: 'pa-answer__chip',
      textForItem: answerChipText,
      hrefForItem: function (item) {
        return answerChipHref(item, options);
      },
      attrsForItem: options.attrsForItem || null,
    });
  }

  function drawerChipListHtml(items, options) {
    options = options || {};
    return window.KuschiIngredientFlow.chips(items, {
      empty: options.empty || 'No direct row in this extract yet.',
      emptyClassName: 'pa-answer__empty',
      className: 'pa-chips',
      chipClassName: 'pa-chip' + (options.chipClassName ? ' ' + options.chipClassName : ''),
      textForItem: options.textForItem || answerChipText,
      hrefForItem: options.hrefForItem || function (item) {
        return answerChipHref(item, options);
      },
      attrsForItem: options.attrsForItem || null,
    });
  }

  function seasoningDrillAttrs(item) {
    var id = item && item.id ? item.id : '';
    return id ? { 'data-pa-seasoning-id': id, 'data-pa-spice-drill-id': id } : null;
  }

  function spiceDrillAttrs(item) {
    var id = item && item.id ? item.id : '';
    return id ? { 'data-pa-spice-drill-id': id } : null;
  }

  function foodDrillAttrs(item) {
    var id = item && item.id ? item.id : '';
    return id ? { 'data-pa-food-drill-id': id } : null;
  }

  function drawerSummaryText(items, limit) {
    return window.KuschiIngredientFlow.summaryText(items, {
      limit: limit,
      textForItem: answerChipText,
    });
  }

  function drawerSourceMapCard(label, value, emptyText) {
    return (
      '<article class="pa-source-map-card">' +
        '<span class="pa-source-map-label">' + esc(label) + '</span>' +
        '<strong class="pa-source-map-value">' + esc(value || emptyText || 'No source row yet') + '</strong>' +
      '</article>'
    );
  }

  function spiceDrawerSourceMapHtml(ing, u) {
    var groups = aromaGroupText(ing);
    var harmony = drawerSummaryText(aromaHarmonyNames(ing, 3), 3);
    var partnerCount = harmonyPartnerCount(ing.id);
    var flavorPairs = drawerSummaryText(flavorPairingNames(ing, 3), 3);
    var th = u && u.thesaurus ? u.thesaurus : null;
    var tk = atlasLookupToolkitHint(ing.id);
    var context = [];
    if (th && (th.family || th.family_slug)) context.push('Thesaurus: ' + String(th.family || th.family_slug));
    if (tk && tk.primary_family) context.push('Toolkit: ' + String(tk.primary_family).replace(/_/g, ' '));
    if (!context.length && u) context.push('Coverage: Aroma' + (u.flavor ? ', Flavor' : '') + (u.thesaurus ? ', Thesaurus' : ''));
    var harmonyText = partnerCount != null ? partnerCount + ' links' + (harmony ? ' · ' + harmony : '') : harmony;
    return (
      '<section class="pa-source-map" data-pa-source-map aria-label="Source map">' +
        '<div class="pa-source-map-grid">' +
          drawerSourceMapCard('Aroma groups', groups, 'No aroma group tag') +
          drawerSourceMapCard('Harmony network', harmonyText, 'No harmony links yet') +
          drawerSourceMapCard('Flavor row', flavorPairs, state.enriched ? 'No Flavor Bible row yet' : 'Flavor rows loading') +
          drawerSourceMapCard('Library context', context.join(' · '), 'No extra context row yet') +
        '</div>' +
      '</section>'
    );
  }

  function drawerDecisionSummaryHtml(harmony, flavorPairs, foods, avoid, useTips) {
    var pairText = drawerSummaryText(harmony.length ? harmony : flavorPairs, 3);
    var useText = drawerSummaryText(useTips, 1);
    var flow = window.KuschiIngredientFlow;
    return (
      '<div class="pa-drawer-decision-summary" data-pa-drawer-decision-summary>' +
      flow.priority(
        [
          { label: 'Pair first', value: pairText, empty: 'No direct pairing yet', className: 'pa-drawer-priority-card--pair' },
          { label: 'Use now', value: useText, empty: 'No technique note yet', className: 'pa-drawer-priority-card--use' },
        ],
        { className: 'pa-drawer-priority', attrs: { 'data-pa-drawer-priority': true } }
      ) +
      '</div>'
    );
  }

  function decisionAnswerHtml(ing) {
    if (!ing) {
      return '<p class="pa-answer__empty ingredient-flow-empty">Type a spice, herb, food, or dish name to get a quick pairing answer.</p>';
    }
    var name = displayNameForIngredient(ing);
    var u = state.unifiedById ? state.unifiedById[ing.id] : null;
    var harmony = aromaHarmonyNames(ing, 8);
    var flavorPairs = flavorPairingNames(ing, 8);
    var foods = foodMatchesForSpice(ing.id, 8);
    var avoid = flavorAvoidNames(ing, 8);
    var useTips = flavorUseTips(ing, 4);
    var partnerCount = harmonyPartnerCount(ing.id);
    var source = sourceBadges(u);
    var enrichedNote = state.enriched
      ? 'Built from Aroma, Flavor, Thesaurus, and food-pairing extracts.'
      : 'Aroma data is ready; richer Flavor and food-pairing data is still loading.';
    var flow = window.KuschiIngredientFlow;

    return (
      '<div class="pa-answer ingredient-flow" data-decision-spice-id="' + esc(ing.id) + '">' +
        flow.head({
          title: name,
          className: 'pa-answer__top',
          titleClassName: 'pa-answer__name',
          metaHtml: flow.meta(
            [
              { text: aromaGroupText(ing), className: 'pa-answer__pill' },
              { text: partnerCount != null ? partnerCount + ' harmony links' : 'Harmony loading', className: 'pa-answer__pill' },
              { html: source, raw: true, label: 'Source coverage', className: 'pa-answer__pill' },
            ],
            { className: 'pa-answer__meta' }
          ),
          actionsHtml: flow.actions(
            [
              { text: 'Show row', className: 'pa-answer__action', attrs: { 'data-pa-decision-action': 'matrix' } },
              { text: 'Aroma', href: 'aroma.html?spice=' + encodeURIComponent(ing.id), className: 'pa-answer__action' },
              { text: 'Flavor', href: 'flavor.html?q=' + encodeURIComponent(name), className: 'pa-answer__action' },
            ],
            { className: 'pa-answer__actions' }
          ),
        }) +
        flow.priority(
          [
            { label: 'Pair first', value: drawerSummaryText(harmony.length ? harmony : flavorPairs, 3), empty: 'No direct pairing yet' },
            { label: 'Use now', value: drawerSummaryText(useTips, 1), empty: 'No technique note yet' },
          ],
          { className: 'pa-answer__priority', attrs: { 'data-pa-answer-priority': true } }
        ) +
        flow.grid(
          [
            flow.section('Best fast matches', chipListHtml(harmony, { kind: 'spice', empty: 'No spice harmony links in the Aroma extract.', attrsForItem: spiceDrillAttrs }), {
              className: 'pa-answer__section',
            }),
            flow.section('Flavor Bible adds', chipListHtml(flavorPairs, { kind: 'flavor', empty: state.enriched ? 'No Flavor Bible pairings for this ingredient id.' : 'Loading Flavor Bible rows...' }), { className: 'pa-answer__section' }),
            flow.section('Foods that use it', chipListHtml(foods, { kind: 'food', empty: state.enriched ? 'No food-pairing rows list this spice yet.' : 'Loading food rows...', attrsForItem: foodDrillAttrs }), {
              className: 'pa-answer__section',
            }),
            flow.section('Avoid or check', chipListHtml(avoid, { kind: 'flavor', empty: state.enriched ? 'No avoid notes in the unified extract.' : 'Loading avoid notes...' }), { className: 'pa-answer__section' }),
          ],
          { className: 'pa-answer__grid' }
        ) +
        flow.note(enrichedNote, { className: 'pa-answer__note' }) +
      '</div>'
    );
  }

  function foodDecisionAnswerHtml(food) {
    var name = food && (food.name || food.id) ? food.name || food.id : '';
    var seasonings = foodSeasoningItems(food, 8);
    var more = foodSeasoningItems(food, 8, seasonings);
    var total = ((food && food.seasonings) || []).length;
    var sourceNote = total
      ? 'Food-pairing row from the Aroma extract: ' + total + ' listed seasonings.'
      : 'Food-pairing row from the Aroma extract.';
    var flow = window.KuschiIngredientFlow;

    return (
      '<div class="pa-answer ingredient-flow" data-decision-food-id="' + esc(food.id || '') + '">' +
        flow.head({
          title: name,
          className: 'pa-answer__top',
          titleClassName: 'pa-answer__name',
          metaHtml: flow.meta(
            [
              { text: 'Food pairing row', className: 'pa-answer__pill' },
              { text: total + ' seasonings', className: 'pa-answer__pill' },
            ],
            { className: 'pa-answer__meta' }
          ),
          actionsHtml: flow.actions(
            [
              { text: 'Open row', className: 'pa-answer__action', attrs: { 'data-pa-decision-action': 'food' } },
              { text: 'Aroma', href: 'aroma.html?food=' + encodeURIComponent(food.id || ''), className: 'pa-answer__action' },
              { text: 'Flavor', href: 'flavor.html?q=' + encodeURIComponent(name), className: 'pa-answer__action' },
            ],
            { className: 'pa-answer__actions' }
          ),
        }) +
        flow.priority(
          [
            { label: 'Season first', value: drawerSummaryText(seasonings, 4), empty: 'No listed seasonings yet' },
            { label: 'Next check', value: drawerSummaryText(more, 3), empty: 'Open the full food row' },
          ],
          { className: 'pa-answer__priority', attrs: { 'data-pa-answer-priority': true } }
        ) +
        flow.grid(
          [
            flow.section('Seasonings', chipListHtml(seasonings, { kind: 'spice', empty: 'No listed seasonings for this food row.', attrsForItem: seasoningDrillAttrs }), {
              className: 'pa-answer__section',
            }),
            flow.section('More options', chipListHtml(more, { kind: 'spice', empty: 'No extra seasonings beyond the first picks.', attrsForItem: seasoningDrillAttrs }), {
              className: 'pa-answer__section',
            }),
          ],
          { className: 'pa-answer__grid' }
        ) +
        flow.note(sourceNote, { className: 'pa-answer__note' }) +
      '</div>'
    );
  }

  function updateDecisionPanel(query, options) {
    var body = document.getElementById('paDecisionBody');
    if (!body) return;
    var search = document.getElementById('paDecisionSearch');
    var target = query ? findDecisionTarget(query) : null;
    var ing = target && target.kind === 'spice' ? target.item : null;
    var food = target && target.kind === 'food' ? target.item : null;
    if (!target && options && options.selectDefault) {
      ing = defaultDecisionIngredient();
      target = ing ? { kind: 'spice', item: ing } : null;
      if (ing && search && !search.value) search.value = displayNameForIngredient(ing);
    }
    if (!target && query && !state.enriched) {
      body.innerHTML =
        '<p class="pa-answer__empty ingredient-flow-empty">Checking the food-pairing rows for <strong>' +
        esc(query) +
        '</strong>…</p>';
      state.decisionSpiceId = null;
      state.decisionFoodId = null;
      return;
    }
    if (!target && query) {
      body.innerHTML =
        '<p class="pa-answer__empty ingredient-flow-empty">No spice, herb, food, or dish row matched <strong>' +
        esc(query) +
        '</strong>. Try basil, cumin, roasted lamb, chicken, potatoes, or cheese.</p>';
      state.decisionSpiceId = null;
      state.decisionFoodId = null;
      return;
    }
    if (!target) {
      body.innerHTML = decisionAnswerHtml(null);
      state.decisionSpiceId = null;
      state.decisionFoodId = null;
      return;
    }
    if (food) {
      clearOpenSpiceSelection();
      state.decisionSpiceId = null;
      state.decisionFoodId = food.id || null;
      body.innerHTML = foodDecisionAnswerHtml(food);
      return;
    }
    state.decisionSpiceId = ing.id;
    state.decisionFoodId = null;
    body.innerHTML = decisionAnswerHtml(ing);
  }

  function revealDecisionInMatrix(spiceHost, search, modePri, modeAll) {
    if (!state.decisionSpiceId || !state.byId[state.decisionSpiceId]) return;
    var ing = state.byId[state.decisionSpiceId];
    var order = state.meta.priority_row_ids || [];
    var inPriority = order.indexOf(ing.id) >= 0;
    if (!inPriority) {
      state.currentMode = 'all';
      if (modeAll) modeAll.setAttribute('aria-pressed', 'true');
      if (modePri) modePri.setAttribute('aria-pressed', 'false');
    }
    state.openDrawerSpiceId = ing.id;
    paintSpiceMatrix(spiceHost);
    if (search) {
      search.value = displayNameForIngredient(ing);
      applySpiceFilter(search.value);
    }
    updateStatus(document.getElementById('paStatus'));
    var row = null;
    var rows = spiceHost.querySelectorAll('tr.pa-data-row');
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute('data-spice-id') === ing.id) {
        row = rows[i];
        break;
      }
    }
    if (row && typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }

  function drillIntoSeasoning(spiceId, spiceHost, search, modePri, modeAll, decisionSearch) {
    var ing = spiceId && state.byId ? state.byId[spiceId] : null;
    if (!ing) return false;
    var name = displayNameForIngredient(ing);
    state.decisionFoodId = null;
    state.decisionSpiceId = ing.id;
    if (decisionSearch) decisionSearch.value = name;
    updateDecisionPanel(name, { selectDefault: false });
    revealDecisionInMatrix(spiceHost, search, modePri, modeAll);
    return true;
  }

  function findFoodPairingById(foodId) {
    if (!foodId || !state.foodPairings) return null;
    for (var i = 0; i < state.foodPairings.length; i++) {
      if (state.foodPairings[i] && state.foodPairings[i].id === foodId) return state.foodPairings[i];
    }
    return null;
  }

  function drillIntoFood(foodId, foodHost, foodSearch, decisionSearch) {
    var food = findFoodPairingById(foodId);
    if (!food) return false;
    var name = food.name || food.id || '';
    var body = document.getElementById('paDecisionBody');
    clearOpenSpiceSelection();
    state.decisionSpiceId = null;
    state.decisionFoodId = food.id || null;
    if (decisionSearch) decisionSearch.value = name;
    if (body) body.innerHTML = foodDecisionAnswerHtml(food);
    revealDecisionInFoodMatrix(foodHost, foodSearch);
    return true;
  }

  function handleAtlasDrill(e, spiceHost, search, modePri, modeAll, decisionSearch, foodHost, foodSearch) {
    var spice = e.target.closest('[data-pa-spice-drill-id], [data-pa-seasoning-id]');
    if (spice) {
      var spiceId = spice.getAttribute('data-pa-spice-drill-id') || spice.getAttribute('data-pa-seasoning-id');
      if (drillIntoSeasoning(spiceId, spiceHost, search, modePri, modeAll, decisionSearch)) {
        e.preventDefault();
        return true;
      }
    }
    var food = e.target.closest('[data-pa-food-drill-id]');
    if (food && drillIntoFood(food.getAttribute('data-pa-food-drill-id'), foodHost, foodSearch, decisionSearch)) {
      e.preventDefault();
      return true;
    }
    return false;
  }

  function revealDecisionInFoodMatrix(foodHost, foodSearch) {
    if (!state.decisionFoodId || !foodHost || !state.enriched) return;
    clearOpenSpiceSelection();
    var foods = getFoodsSorted();
    var food = null;
    for (var i = 0; i < foods.length; i++) {
      if (foods[i].id === state.decisionFoodId) {
        food = foods[i];
        break;
      }
    }
    if (!food) return;
    state.openDrawerFoodId = food.id;
    paintFoodMatrixNow(foodHost);
    if (foodSearch) {
      foodSearch.value = food.name || food.id || '';
      applyFoodFilter(foodSearch.value);
    }
    var row = findFoodDataRow(foodHost, food.id);
    if (row && typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }

  function countPartnersInGroup(partnerIds, g) {
    if (!partnerIds || !state.byId) return 0;
    var n = 0;
    for (var i = 0; i < partnerIds.length; i++) {
      var pid = partnerIds[i];
      var p = state.byId[pid];
      if (!p) continue;
      var gr = p.aroma_groups || [];
      for (var j = 0; j < gr.length; j++) {
        if (gr[j] === g) {
          n++;
          break;
        }
      }
    }
    return n;
  }

  function heatmapMaxForRows(rows) {
    var maxByCol = [0, 0, 0, 0, 0, 0, 0, 0];
    for (var r = 0; r < rows.length; r++) {
      var id = rows[r].id;
      var partners = state.pairingMatrix && state.pairingMatrix[id] ? state.pairingMatrix[id] : [];
      for (var c = 1; c <= 8; c++) {
        var cnt = countPartnersInGroup(partners, c);
        if (cnt > maxByCol[c - 1]) maxByCol[c - 1] = cnt;
      }
    }
    return maxByCol;
  }

  function heatmapCellStyle(count, colMax) {
    if (!colMax || count <= 0) return '';
    var t = Math.min(1, count / colMax);
    var alpha = 0.08 + t * 0.55;
    return ' style="background: rgba(201, 169, 110, ' + alpha.toFixed(3) + ')"';
  }

  function buildSpiceTableBody(meta, rows, labels) {
    var enriched = state.enriched;
    var layer = state.layer;
    var displayNames = meta.display_names && typeof meta.display_names === 'object' ? meta.display_names : {};
    var maxByCol =
      layer === 'harmony' && state.pairingMatrix ? heatmapMaxForRows(rows) : null;

    var headExtra = '';
    if (enriched) {
      headExtra =
        '<th scope="col" class="pa-mx-ind pa-mx-harm" title="Total count of other spices listed as harmonizing with this one in aroma_data/pairing_matrix.json (spice–spice links, not food pairings).">' +
        '<span class="pa-th-main">Harmony</span>' +
        '<span class="pa-th-sub"># partners</span></th>' +
        '<th scope="col" class="pa-mx-ind pa-mx-src-h" title="Which other book extracts include this ingredient: A = Aroma ingredients list; F = Flavor Bible row in ingredients_unified.json; T = Flavor Thesaurus wheel. Dim letter = no row in that source.">' +
        '<span class="pa-th-main">Books</span>' +
        '<span class="pa-th-sub">A·F·T</span></th>';
    }

    var thead =
      '<thead><tr><th scope="col" class="pa-mx-spice" title="Ingredient name. Link opens the full Aroma Bible page for this spice. Tap the row (outside the link) to open the cross-book detail drawer." aria-label="Spice or herb (first column)">' +
      '<span class="pa-mx-g-main">Spice</span><span class="pa-mx-g-sub">or herb</span></th>' +
      labels
        .slice(0, 8)
        .map(function (lab, idx) {
          var g = idx + 1;
          var title =
            layer === 'harmony'
              ? 'Aroma group ' +
                g +
                ' (' +
                esc(lab) +
                '): in heatmap mode, this cell is how many of this spice’s harmony partners are tagged with this aroma group (see pairing_matrix + ingredients aroma_groups).'
              : 'Aroma group ' + g + ' — ' + esc(lab) + '. In aroma mode, ● means this spice is assigned to this group in the extract; · means not.';
          var aria = 'Group ' + g + ', ' + esc(lab);
          if (layer === 'harmony') {
            aria += ' — harmony partner count in this group';
          }
          return (
            '<th scope="col" class="pa-mx-g pa-mx-g' +
            g +
            '" title="' +
            title +
            '" aria-label="' +
            aria +
            '"><span class="pa-mx-g-main">G' +
            g +
            '</span><span class="pa-mx-g-sub">' +
            esc(lab) +
            '</span></th>'
          );
        })
        .join('') +
      headExtra +
      '</tr></thead>';

    var body = '';
    for (var ri = 0; ri < rows.length; ri++) {
      var ing = rows[ri];
      var groups = ing.aroma_groups || [];
      var gset = Object.create(null);
      for (var gi = 0; gi < groups.length; gi++) gset[groups[gi]] = true;

      var label = displayNames[ing.id] || ing.name || ing.id;
      var unifiedRow = state.unifiedById ? state.unifiedById[ing.id] : null;

      var cells = '';
      var partners = state.pairingMatrix && state.pairingMatrix[ing.id] ? state.pairingMatrix[ing.id] : [];

      for (var c = 1; c <= 8; c++) {
        var lab = labels[c - 1] || 'G' + c;
        if (layer === 'harmony' && enriched && state.pairingMatrix) {
          var cnt = countPartnersInGroup(partners, c);
          var colMax = maxByCol ? maxByCol[c - 1] : 0;
          var st = heatmapCellStyle(cnt, colMax);
          cells +=
            '<td class="pa-mx-cell pa-mx-g' +
            c +
            ' pa-mx-hm"' +
            st +
            ' aria-label="' +
            esc(label + ': ' + lab + ' — ' + cnt + ' harmony partners in this group') +
            '"><span class="pa-mx-hm-num">' +
            (cnt > 0 ? String(cnt) : '·') +
            '</span></td>';
        } else {
          var on = !!gset[c];
          cells +=
            '<td class="pa-mx-cell pa-mx-g' +
            c +
            (on ? ' pa-mx-on' : ' pa-mx-off') +
            '" aria-label="' +
            esc(label + ': ' + lab + (on ? ' — tagged in this aroma group' : ' — not tagged in this aroma group')) +
            '">' +
            (on ? '<span class="pa-mx-mark pa-mx-l" aria-hidden="true">●</span>' : '<span class="pa-mx-mark pa-mx-n" aria-hidden="true">·</span>') +
            '</td>';
        }
      }

      var indCells = '';
      if (enriched) {
        var hc = harmonyPartnerCount(ing.id);
        indCells +=
          '<td class="pa-mx-ind pa-mx-harm-val" title="Number of other spices this one harmonizes with (aroma_data/pairing_matrix.json).">' +
          (hc != null ? String(hc) : '—') +
          '</td>';
        indCells += '<td class="pa-mx-ind pa-mx-src-cell">' + sourceBadges(unifiedRow) + '</td>';
      }

      var rowClass = state.openDrawerSpiceId === ing.id ? ' pa-row-open' : '';
      body +=
        '<tr class="pa-data-row' +
        rowClass +
        '" data-spice-id="' +
        esc(ing.id) +
        '" tabindex="0" role="button" aria-expanded="' +
        (state.openDrawerSpiceId === ing.id ? 'true' : 'false') +
        '" aria-label="Details for ' +
        esc(label) +
        '">' +
        '<th scope="row" class="pa-mx-spice"><a href="aroma.html?spice=' +
        encodeURIComponent(ing.id) +
        '" class="pa-mx-link">' +
        esc(label) +
        '</a></th>' +
        cells +
        indCells +
        '</tr>';
    }

    return '<table class="pa-matrix" id="paSpiceMatrix">' + thead + '<tbody id="paSpiceTbody">' + body + '</tbody></table>';
  }

  function kitchenContextSnippetHtml() {
    var kc = state.kitchenContext;
    if (!kc) return '';
    var chunks = [];
    var sf = kc.sfah && kc.sfah.four_elements;
    if (sf && typeof sf === 'object') {
      var keys = Object.keys(sf);
      if (keys.length) {
        chunks.push('<p class="pa-small"><strong>SFAH (four elements)</strong> — ');
        chunks.push(
          keys
            .map(function (k) {
              return '<em>' + esc(k) + '</em>: ' + esc(String(sf[k]));
            })
            .join(' · ')
        );
        chunks.push('</p>');
      }
    }
    var sc = kc.science;
    if (sc) {
      var lines = [];
      if (Array.isArray(sc.temperatures)) lines.push(sc.temperatures.length + ' reference temperatures');
      if (Array.isArray(sc.tastant_indices)) lines.push(sc.tastant_indices.length + ' tastant index rows');
      if (Array.isArray(sc.storage_timelines)) lines.push(sc.storage_timelines.length + ' storage timeline rows');
      if (lines.length) {
        chunks.push('<p class="pa-small"><strong>Science of Cooking extract</strong> — ' + lines.join('; ') + '</p>');
      }
    }
    var supDials = kc.supplementary && kc.supplementary.seven_dials && kc.supplementary.seven_dials.dials;
    if (supDials && typeof supDials === 'object') {
      var dkeys = Object.keys(supDials);
      if (dkeys.length) {
        chunks.push('<p class="pa-small"><strong>Art of Flavor — seven dials</strong> — ');
        chunks.push(
          dkeys
            .map(function (dk) {
              return '<em>' + esc(dk) + '</em>';
            })
            .join(', ')
        );
        chunks.push('</p>');
      }
    }
    var fm = kc.supplementary && kc.supplementary.fermentation_matrix;
    if (fm && fm.categories && fm.categories.length) {
      chunks.push(
        '<p class="pa-small"><strong>Fermentation extract</strong> — categories: ' +
          esc(fm.categories.join(', ')) +
          '</p>'
      );
    }
    if (kc.cuisine_map && typeof kc.cuisine_map === 'object') {
      var ccount = Object.keys(kc.cuisine_map).length;
      if (ccount) {
        chunks.push(
          '<p class="pa-small"><strong>SFAH cuisine profiles</strong> — ' + ccount + ' regions in bundle (fat / acid / salt / heat).</p>'
        );
      }
    }
    if (!chunks.length) return '';
    return (
      '<section class="pa-sec"><h4>Bundled library context</h4>' +
      chunks.join('') +
      '<p class="pa-small pa-muted">Included in <code>combined_data/ingredients_unified.json</code> (schema v2).</p></section>'
    );
  }

  function atlasLookupToolkitHint(ingId) {
    var m = state.flavourHints;
    if (!m || !ingId) return null;
    var L = typeof window !== 'undefined' ? window.KuschiFlavourToolkitLookup : null;
    if (L && typeof L.lookupHint === 'function') return L.lookupHint(m, ingId);
    var k = String(ingId || '')
      .replace(/-/g, '_')
      .replace(/_+/g, '_');
    return m[k] || m[ingId] || null;
  }

  function spiceDrawerToolkitSection(ing) {
    var h = atlasLookupToolkitHint(ing.id);
    if (!h) return '';
    var bits = [];
    if (h.primary_family) {
      bits.push(
        '<p class="pa-small">Primary family: <strong>' +
          esc(String(h.primary_family).replace(/_/g, ' ')) +
          '</strong></p>'
      );
    }
    if (h.harmony && h.harmony.length) {
      bits.push(
        drawerChipListHtml(h.harmony.slice(0, 8), {
          textForItem: function (x) {
            return String(x);
          },
        })
      );
    }
    if (h.contrast && h.contrast.length) {
      bits.push(
        drawerChipListHtml(h.contrast.slice(0, 8), {
          chipClassName: 'pa-chip-contrast',
          textForItem: function (x) {
            return String(x);
          },
        })
      );
    }
    if (h.spice_harmony_partners && h.spice_harmony_partners.length) {
      bits.push(
        '<p class="pa-small pa-muted">Spice harmony</p>' +
          drawerChipListHtml(h.spice_harmony_partners.slice(0, 8), {
            textForItem: function (x) {
              return String(x);
            },
          })
      );
    }
    if (!bits.length) return '';
    return '<section class="pa-sec"><h4>Toolkit matrix</h4>' + bits.join('') + '</section>';
  }

  function spiceDrawerQuickAnswerSection(ing) {
    var harmony = aromaHarmonyNames(ing, 6);
    var flavorPairs = flavorPairingNames(ing, 6);
    var foods = foodMatchesForSpice(ing.id, 6);
    var avoid = flavorAvoidNames(ing, 6);
    var useTips = flavorUseTips(ing, 5);
    var pairItems = harmony.length ? harmony : flavorPairs;
    var name = displayNameForIngredient(ing) || ing.name || ing.id;
    var note = state.enriched
      ? 'Fastest kitchen answer from Aroma harmony, Flavor Bible rows, and food-pairing data.'
      : 'Aroma data is ready; richer Flavor and food rows are still loading.';
    var flow = window.KuschiIngredientFlow;
    return (
      '<section class="pa-drawer-profile ingredient-flow-profile" data-pa-drawer-profile aria-label="Kitchen profile for ' +
      esc(name) +
      '">' +
        flow.profileHead('Kitchen profile', note, { className: 'pa-drawer-profile-head' }) +
        drawerDecisionSummaryHtml(harmony, flavorPairs, foods, avoid, useTips) +
        flow.profileGrid(
          [
            flow.panel(
              'Best with',
              drawerChipListHtml(pairItems, { kind: 'spice', empty: 'No direct pairings yet.', attrsForItem: spiceDrillAttrs }),
              { className: 'pa-drawer-profile-panel' }
            ),
            flow.panel(
              'Use on',
              drawerChipListHtml(foods, { kind: 'food', empty: state.enriched ? 'No food rows list this spice yet.' : 'Food rows loading...', attrsForItem: foodDrillAttrs }),
              { className: 'pa-drawer-profile-panel' }
            ),
            flow.panel(
              'Technique',
              flow.useList(useTips, { limit: 2, empty: 'No technique note yet.' }),
              { className: 'pa-drawer-profile-panel' }
            ),
            flow.panel(
              'Check',
              drawerChipListHtml(avoid, { kind: 'flavor', empty: 'No avoid notes found.' }),
              { className: 'pa-drawer-profile-panel' }
            ),
          ],
          { className: 'pa-drawer-profile-grid' }
        ) +
      '</section>'
    );
  }

  function spiceDrawerSourceSections(ing, u, ar, labels) {
    var sourceParts = [];
    var ag = (ar && ar.aroma_groups) || ing.aroma_groups || [];
    if (ag.length) {
      var gtxt = ag
        .map(function (g) {
          return 'G' + g + ' — ' + (labels[g - 1] || '');
        })
        .join('; ');
      sourceParts.push('<section class="pa-sec"><h4>Aroma groups</h4><p>' + esc(gtxt) + '</p></section>');
    }

    var hw = (ar && ar.harmonizes_with) || ing.harmonizes_with || [];
    if (hw.length) {
      sourceParts.push(
        '<section class="pa-sec"><h4>Harmonizes with</h4>' +
          drawerChipListHtml(hw, {
            textForItem: function (h) {
              return h && (h.name || h.id) ? h.name || h.id : String(h || '');
            },
            hrefForItem: function (h) {
              return h && h.id ? 'aroma.html?spice=' + encodeURIComponent(h.id) : '';
            },
            attrsForItem: function (h) {
              return h && h.id ? { 'data-pa-spice-drill-id': h.id } : null;
            },
          }) +
        '</section>'
      );
    }

    var pfoods = (ar && ar.pairs_with_foods) || ing.pairs_with_foods || [];
    if (pfoods.length) {
      sourceParts.push(
        '<section class="pa-sec"><h4>Pairs with foods (Aroma)</h4><p>' +
          esc(pfoods.join(', ')) +
          '</p></section>'
      );
    }

    var hb = (ar && ar.heat_behavior) || ing.heat_behavior;
    if (hb && typeof hb === 'object') {
      var hbLines = [];
      if (hb.a) hbLines.push(String(hb.a));
      if (hb.b) hbLines.push(String(hb.b));
      if (hbLines.length) {
        sourceParts.push('<section class="pa-sec"><h4>Heat behavior</h4><p>' + esc(hbLines.join(' · ')) + '</p></section>');
      }
    }

    var blends = (ar && ar.spice_blends) || ing.spice_blends;
    if (blends && blends.length) {
      sourceParts.push('<section class="pa-sec"><h4>Spice blends</h4><p>' + esc(blends.join(', ')) + '</p></section>');
    }

    var cuisines = (ar && ar.cuisines) || ing.cuisines;
    if (cuisines && cuisines.length) {
      sourceParts.push('<section class="pa-sec"><h4>Cuisines (Aroma)</h4><p>' + esc(cuisines.join(', ')) + '</p></section>');
    }

    if (u && u.thesaurus) {
      var fam = u.thesaurus.family || u.thesaurus.family_slug;
      if (fam) {
        sourceParts.push(
          '<section class="pa-sec"><h4>Flavor Thesaurus</h4><p>Family: <strong>' + esc(String(fam)) + '</strong></p></section>'
        );
      }
    }

    if (u && u.flavor) {
      var fl = u.flavor;
      var pairObj = fl.pairings || {};
      var tiers = ['holy_grail', 'very_highly_recommended', 'highly_recommended', 'recommended'];
      var tierLabels = {
        holy_grail: 'Holy grail',
        very_highly_recommended: 'Very highly recommended',
        highly_recommended: 'Highly recommended',
        recommended: 'Recommended',
      };
      var hasPair = false;
      for (var ti = 0; ti < tiers.length; ti++) {
        var key = tiers[ti];
        var arr = pairObj[key];
        if (arr && arr.length) {
          hasPair = true;
          var sample = arr.slice(0, 24).map(function (x) {
            return esc(String(x));
          });
          var more = arr.length > 24 ? ' … +' + (arr.length - 24) + ' more' : '';
          sourceParts.push(
            '<section class="pa-sec"><h4>Flavor Bible — ' +
              esc(tierLabels[key] || key) +
              '</h4><p class="pa-small">' +
              sample.join(', ') +
              more +
              '</p></section>'
          );
        }
      }
      var aff = fl.affinities;
      if (aff && aff.length) {
        var affShow = aff.slice(0, 12).map(function (combo) {
          if (Array.isArray(combo)) return esc(combo.join(' + '));
          return esc(String(combo));
        });
        var affMore = aff.length > 12 ? ' … +' + (aff.length - 12) + ' combos' : '';
        sourceParts.push(
          '<section class="pa-sec"><h4>Flavor Bible — affinities</h4><p class="pa-small">' +
            affShow.join(' · ') +
            affMore +
            '</p></section>'
        );
      }
      var avoid = fl.avoid;
      if (avoid && avoid.length) {
        sourceParts.push(
          '<section class="pa-sec"><h4>Flavor Bible — avoid</h4><p class="pa-small">' +
            esc(avoid.join(', ')) +
            '</p></section>'
        );
      }
      if (!hasPair && (!aff || !aff.length) && (!avoid || !avoid.length)) {
        sourceParts.push(
          '<section class="pa-sec"><p class="pa-muted">No Flavor Bible pairings for this id in the unified index.</p></section>'
        );
      }
    } else if (state.enriched) {
      sourceParts.push(
        '<section class="pa-sec"><p class="pa-muted">Not in Flavor Bible extract (unified).</p></section>'
      );
    }

    var kcSnip = kitchenContextSnippetHtml();
    if (kcSnip) sourceParts.push(kcSnip);

    var tkSec = spiceDrawerToolkitSection(ing);
    if (tkSec) sourceParts.push(tkSec);

    return sourceParts;
  }

  function spiceDrawerHtml(ing, options) {
    var sourceOnly = !!(options && options.sourceOnly);
    var u = state.unifiedById ? state.unifiedById[ing.id] : null;
    var ar = u && u.aroma ? u.aroma : ing;
    var labels = state.meta.group_labels || [];
    while (labels.length < 8) labels.push('G' + (labels.length + 1));
    var name = displayNameForIngredient(ing) || ing.name || ing.id;

    var parts = [];
    var sourceParts = spiceDrawerSourceSections(ing, u, ar, labels);
    parts.push('<div class="pa-drawer-head">');
    parts.push('<div class="pa-drawer-title-wrap">');
    if (sourceOnly) {
      parts.push('<p class="pa-drawer-kicker">Source detail</p>');
      parts.push('<h3 class="pa-drawer-title">' + esc(name) + '</h3>');
      parts.push(drawerMetaHtml(ing, u));
      parts.push(
        '<p class="pa-drawer-source-intro pa-muted">Deeper reference rows from Aroma, Flavor, Thesaurus, toolkit, and kitchen-context extracts.</p>'
      );
    } else {
      parts.push('<p class="pa-drawer-kicker">Ingredient profile</p>');
      parts.push('<h3 class="pa-drawer-title">' + esc(name) + '</h3>');
      parts.push(drawerMetaHtml(ing, u));
      parts.push(
        window.KuschiIngredientFlow.actions(
          [
            { text: 'Aroma', href: 'aroma.html?spice=' + encodeURIComponent(ing.id), className: 'pa-drawer-action' },
            { text: 'Flavor', href: 'flavor.html?q=' + encodeURIComponent(name), className: 'pa-drawer-action' },
            { text: 'Toolkit', href: 'flavor.html?toolkit=1', className: 'pa-drawer-action' },
          ],
          { className: 'pa-drawer-actions' }
        )
      );
    }
    parts.push('</div>');
    parts.push(
      '<button type="button" class="pa-drawer-close" aria-label="Close details">×</button>'
    );
    parts.push('</div><div class="pa-drawer-body">');

    if (!sourceOnly) {
      parts.push(spiceDrawerQuickAnswerSection(ing));
    } else {
      parts.push(spiceDrawerSourceMapHtml(ing, u));
    }

    if (sourceParts.length) {
      if (sourceOnly) {
        parts.push(
          '<section class="pa-drawer-source-details pa-drawer-source-details--open" data-pa-source-detail>' +
            '<div class="pa-drawer-source-body">' +
              sourceParts.join('') +
            '</div>' +
          '</section>'
        );
      } else {
        parts.push(
          '<details class="pa-drawer-source-details">' +
            '<summary>Source detail</summary>' +
            '<div class="pa-drawer-source-body">' +
              sourceParts.join('') +
            '</div>' +
          '</details>'
        );
      }
    }

    if (!sourceOnly) {
      parts.push(
        window.KuschiIngredientFlow.actions(
          [
            { text: 'Full Aroma profile', href: 'aroma.html?spice=' + encodeURIComponent(ing.id), className: 'pa-drawer-foot-action' },
            { text: 'Flavor explorer', href: 'flavor.html?q=' + encodeURIComponent(name), className: 'pa-drawer-foot-action' },
            { text: 'Flavor toolkit', href: 'flavor.html?toolkit=1', className: 'pa-drawer-foot-action' },
          ],
          { className: 'pa-drawer-foot' }
        )
      );
    }
    parts.push('</div>');
    return parts.join('');
  }

  function selectedSpiceProfileHtml() {
    if (!state.openDrawerSpiceId) return '';
    var ing = state.byId[state.openDrawerSpiceId];
    if (!ing) return '';
    var name = displayNameForIngredient(ing) || ing.name || ing.id;
    return (
      '<section class="pa-selected-profile" data-pa-selected-profile data-selected-spice-id="' +
      esc(ing.id) +
      '" aria-label="Selected ingredient profile: ' +
      esc(name) +
      '">' +
        '<div class="pa-drawer-card pa-drawer-card--selected">' +
          spiceDrawerHtml(ing) +
        '</div>' +
      '</section>'
    );
  }

  function removeSelectedSpiceProfile(host) {
    if (!host) return;
    var prev = host.querySelector('[data-pa-selected-profile]');
    if (prev) prev.remove();
  }

  function clearOpenSpiceSelection() {
    if (!state.openDrawerSpiceId) return;
    state.openDrawerSpiceId = null;
    var host = document.getElementById('paMatrixHost');
    if (!host) return;
    paintSpiceMatrix(host);
    var search = document.getElementById('paMatrixSearch');
    if (search && search.value) applySpiceFilter(search.value);
  }

  function removeSpiceDrawer(host) {
    if (!host) return;
    var prev = host.querySelector('tr.pa-drawer-row[data-drawer-for]');
    if (prev) prev.remove();
  }

  function insertSpiceDrawerAfter(row, ing, spiceHost) {
    removeSpiceDrawer(spiceHost);
    var tr = document.createElement('tr');
    tr.className = 'pa-drawer-row';
    tr.setAttribute('data-drawer-for', ing.id);
    var colspan = 1 + 8 + (state.enriched ? 2 : 0);
    var td = document.createElement('td');
    td.colSpan = colspan;
    td.className = 'pa-drawer-td';
    td.innerHTML = '<div class="pa-drawer-card pa-drawer-card--source">' + spiceDrawerHtml(ing, { sourceOnly: true }) + '</div>';
    tr.appendChild(td);
    row.parentNode.insertBefore(tr, row.nextSibling);
  }

  function buildFoodTable(meta, foods, spiceCols) {
    var displayNames = meta.display_names && typeof meta.display_names === 'object' ? meta.display_names : {};
    var thead =
      '<thead><tr><th scope="col" class="pa-fx-food" title="Food or dish from the Aroma food-pairing extract">' +
      '<span class="pa-th-main">Food</span>' +
      '<span class="pa-th-sub">extract rows</span></th>' +
      spiceCols
        .map(function (sid) {
          var ing = state.byId[sid];
          var lab = displayNames[sid] || (ing && ing.name) || sid;
          var short =
            lab.length > 11 ? lab.slice(0, 9).replace(/\s+$/, '') + '…' : lab;
          return (
            '<th scope="col" class="pa-fx-spice" title="' +
            esc(lab) +
            '" aria-label="' +
            esc(lab) +
            ' — spice or herb column; dot if listed for food">' +
            '<span class="pa-fx-spice-main">' +
            esc(short) +
            '</span>' +
            (short !== lab ? '<span class="pa-fx-spice-sub">' + esc(lab) + '</span>' : '') +
            '</th>'
          );
        })
        .join('') +
      '</tr></thead>';

    var body = '';
    for (var fi = 0; fi < foods.length; fi++) {
      var food = foods[fi];
      var sidSet = Object.create(null);
      var seas = food.seasonings || [];
      for (var si = 0; si < seas.length; si++) {
        if (seas[si].id) sidSet[seas[si].id] = true;
      }

      var foodRowClass = state.openDrawerFoodId === food.id ? ' pa-row-open' : '';
      body +=
        '<tr class="pa-fx-data' +
        foodRowClass +
        '" data-food-id="' +
        esc(food.id) +
        '" tabindex="0" role="button" aria-expanded="' +
        (state.openDrawerFoodId === food.id ? 'true' : 'false') +
        '" aria-label="Details for ' +
        esc(food.name || food.id) +
        '">' +
        '<th scope="row" class="pa-fx-food">' +
        esc(food.name || food.id) +
        '</th>';

      for (var ci = 0; ci < spiceCols.length; ci++) {
        var spid = spiceCols[ci];
        var on = !!sidSet[spid];
        var spLab = displayNames[spid] || (state.byId[spid] && state.byId[spid].name) || spid;
        body +=
          '<td class="pa-fx-cell' +
          (on ? ' pa-fx-on' : '') +
          '" aria-label="' +
          esc((food.name || food.id) + ' — ' + spLab + ' — ' + (on ? 'seasoning listed' : 'not listed')) +
          '">' +
          (on ? '<span class="pa-mx-l" aria-hidden="true">●</span>' : '<span class="pa-mx-n" aria-hidden="true">·</span>') +
          '</td>';
      }
      body += '</tr>';
    }

    return '<table class="pa-matrix pa-food-matrix" id="paFoodMatrix">' + thead + '<tbody>' + body + '</tbody></table>';
  }

  function foodDrawerHtml(food) {
    var seas = food.seasonings || [];
    var names = drawerChipListHtml(seas, {
      textForItem: function (s) {
        return s && (s.name || s.id) ? s.name || s.id : String(s || '');
      },
      hrefForItem: function (s) {
        return s && s.id ? 'aroma.html?spice=' + encodeURIComponent(s.id) : '';
      },
      attrsForItem: seasoningDrillAttrs,
    });
    return (
      '<div class="pa-drawer-head">' +
      '<h3 class="pa-drawer-title">' +
      esc(food.name || food.id) +
      '</h3>' +
      '<button type="button" class="pa-drawer-close" aria-label="Close details">×</button>' +
      '</div><div class="pa-drawer-body">' +
      '<section class="pa-sec"><h4>Seasonings (' +
      seas.length +
      ')</h4>' +
      names +
      '</section></div>'
    );
  }

  function removeFoodDrawer(host) {
    if (!host) return;
    var prev = host.querySelector('tr.pa-drawer-row[data-food-drawer]');
    if (prev) prev.remove();
  }

  function insertFoodDrawerAfter(row, food, spiceColCount, foodHost) {
    removeFoodDrawer(foodHost);
    var tr = document.createElement('tr');
    tr.className = 'pa-drawer-row';
    tr.setAttribute('data-food-drawer', food.id);
    var td = document.createElement('td');
    td.colSpan = 1 + (spiceColCount != null ? spiceColCount : getSpiceColumnIds().length);
    td.className = 'pa-drawer-td';
    td.innerHTML = '<div class="pa-drawer-card">' + foodDrawerHtml(food) + '</div>';
    tr.appendChild(td);
    row.parentNode.insertBefore(tr, row.nextSibling);
  }

  function getSpiceColumnIds() {
    if (state.foodSpiceMode === 'priority') {
      var order = state.meta.priority_row_ids || [];
      var out = [];
      for (var i = 0; i < order.length; i++) {
        if (state.byId[order[i]]) out.push(order[i]);
      }
      return out;
    }
    return state.ingredients
      .slice()
      .sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      })
      .map(function (x) {
        return x.id;
      });
  }

  function paintSpiceMatrix(host) {
    var meta = state.meta;
    var labels = meta.group_labels || [];
    while (labels.length < 8) labels.push('G' + (labels.length + 1));

    var rows = [];
    if (state.currentMode === 'priority') {
      var order = meta.priority_row_ids || [];
      for (var o = 0; o < order.length; o++) {
        var id = order[o];
        if (state.byId[id]) rows.push(state.byId[id]);
      }
    } else {
      rows = state.ingredients.slice().sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      });
    }

    host.innerHTML = selectedSpiceProfileHtml() + buildSpiceTableBody(meta, rows, labels);
    if (state.openDrawerSpiceId) {
      var ingOpen = state.byId[state.openDrawerSpiceId];
      if (ingOpen) {
        var rowsEl = host.querySelectorAll('tr.pa-data-row');
        for (var ri = 0; ri < rowsEl.length; ri++) {
          if (rowsEl[ri].getAttribute('data-spice-id') === state.openDrawerSpiceId) {
            insertSpiceDrawerAfter(rowsEl[ri], ingOpen, host);
            break;
          }
        }
      }
    }
  }

  function onSpiceMatrixClick(e, spiceHost, search, modePri, modeAll, decisionSearch, foodHost, foodSearch) {
    var selectedClose = e.target.closest('[data-pa-selected-profile] .pa-drawer-close');
    if (selectedClose) {
      e.preventDefault();
      clearOpenSpiceSelection();
      return;
    }
    if (handleAtlasDrill(e, spiceHost, search, modePri, modeAll, decisionSearch, foodHost, foodSearch)) return;
    if (!e.target.closest('#paSpiceMatrix')) return;
    if (e.target.closest('a')) return;
    var closeBtn = e.target.closest('.pa-drawer-close');
    if (closeBtn) {
      e.preventDefault();
      state.openDrawerSpiceId = null;
      paintSpiceMatrix(spiceHost);
      return;
    }
    var tr = e.target.closest('tr.pa-data-row');
    if (!tr) return;
    var id = tr.getAttribute('data-spice-id');
    if (!id) return;
    var ing = state.byId[id];
    if (!ing) return;
    if (state.openDrawerSpiceId === id) {
      state.openDrawerSpiceId = null;
    } else {
      state.openDrawerSpiceId = id;
    }
    paintSpiceMatrix(spiceHost);
  }

  function onSpiceMatrixKeydown(e, spiceHost) {
    if (!e.target.closest('#paSpiceMatrix')) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var tr = e.target.closest('tr.pa-data-row');
    if (!tr || e.target.closest('a')) return;
    e.preventDefault();
    var id = tr.getAttribute('data-spice-id');
    if (!id) return;
    var ing = state.byId[id];
    if (!ing) return;
    if (state.openDrawerSpiceId === id) {
      state.openDrawerSpiceId = null;
    } else {
      state.openDrawerSpiceId = id;
    }
    paintSpiceMatrix(spiceHost);
  }

  function paintFoodMatrix(host) {
    if (!host) return;
    if (!state.foodPairings || !state.enriched) {
      foodMatrixPainted = false;
      host.removeAttribute('aria-busy');
      host.innerHTML =
        '<p class="pa-food-placeholder">Food × spice matrix appears when cross-book data finishes loading.</p>';
      return;
    }
    var foods = state.foodPairings.slice().sort(function (a, b) {
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });
    var spiceCols = getSpiceColumnIds();
    host.innerHTML = buildFoodTable(state.meta, foods, spiceCols);
    host.removeAttribute('aria-busy');
    foodMatrixPainted = true;
    if (state.openDrawerFoodId) {
      var fOpen = null;
      for (var fi = 0; fi < foods.length; fi++) {
        if (foods[fi].id === state.openDrawerFoodId) {
          fOpen = foods[fi];
          break;
        }
      }
      if (fOpen) {
        var fr = findFoodDataRow(host, state.openDrawerFoodId);
        if (fr) insertFoodDrawerAfter(fr, fOpen, spiceCols.length, host);
      }
    }
  }

  function findFoodDataRow(host, id) {
    var rowsEl = host.querySelectorAll('tr.pa-fx-data');
    for (var ri = 0; ri < rowsEl.length; ri++) {
      if (rowsEl[ri].getAttribute('data-food-id') === id) return rowsEl[ri];
    }
    return null;
  }

  function onFoodMatrixClick(e, foodHost, foods, spiceHost, search, modePri, modeAll, decisionSearch, foodSearch) {
    if (handleAtlasDrill(e, spiceHost, search, modePri, modeAll, decisionSearch, foodHost, foodSearch)) return;
    if (!e.target.closest('#paFoodMatrix')) return;
    if (e.target.closest('a')) return;
    var closeBtn = e.target.closest('.pa-drawer-close');
    if (closeBtn) {
      e.preventDefault();
      state.openDrawerFoodId = null;
      paintFoodMatrix(foodHost);
      return;
    }
    var tr = e.target.closest('tr.pa-fx-data');
    if (!tr) return;
    var id = tr.getAttribute('data-food-id');
    var food = null;
    for (var i = 0; i < foods.length; i++) {
      if (foods[i].id === id) {
        food = foods[i];
        break;
      }
    }
    if (!food) return;
    if (state.openDrawerFoodId === id) {
      state.openDrawerFoodId = null;
    } else {
      state.openDrawerFoodId = id;
    }
    paintFoodMatrix(foodHost);
  }

  function onFoodMatrixKeydown(e, foodHost, foods) {
    if (!e.target.closest('#paFoodMatrix')) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var tr = e.target.closest('tr.pa-fx-data');
    if (!tr) return;
    e.preventDefault();
    var id = tr.getAttribute('data-food-id');
    var food = null;
    for (var i = 0; i < foods.length; i++) {
      if (foods[i].id === id) {
        food = foods[i];
        break;
      }
    }
    if (!food) return;
    if (state.openDrawerFoodId === id) {
      state.openDrawerFoodId = null;
    } else {
      state.openDrawerFoodId = id;
    }
    paintFoodMatrix(foodHost);
  }

  function applySpiceFilter(query) {
    var q = norm(query);
    var tr = document.querySelectorAll('#paSpiceTbody tr.pa-data-row');
    for (var i = 0; i < tr.length; i++) {
      var row = tr[i];
      var id = row.getAttribute('data-spice-id') || '';
      var th = row.querySelector('th');
      var text = norm(th ? th.textContent : '');
      var hide = q && text.indexOf(q) < 0 && id.indexOf(q) < 0;
      row.hidden = hide;
      if (hide && state.openDrawerSpiceId === id) {
        state.openDrawerSpiceId = null;
        var mh = document.getElementById('paMatrixHost');
        removeSpiceDrawer(mh);
        removeSelectedSpiceProfile(mh);
      }
    }
  }

  function applyFoodFilter(query) {
    var q = norm(query);
    var tr = document.querySelectorAll('.pa-food-matrix tbody tr.pa-fx-data');
    for (var i = 0; i < tr.length; i++) {
      var row = tr[i];
      var id = row.getAttribute('data-food-id') || '';
      var th = row.querySelector('th');
      var text = norm(th ? th.textContent : '');
      var hide = q && text.indexOf(q) < 0 && id.indexOf(q) < 0;
      row.hidden = hide;
      if (hide && state.openDrawerFoodId === id) {
        state.openDrawerFoodId = null;
        removeFoodDrawer(document.getElementById('paFoodMatrixHost'));
      }
    }
  }

  function makeSearchScheduler(run, label) {
    var statusEl = document.getElementById('paSearchStatus');
    if (window.KuschiRecipeUi && typeof window.KuschiRecipeUi.createFilterScheduler === 'function') {
      var scheduler = window.KuschiRecipeUi.createFilterScheduler({
        run: function () {
          run();
          scheduler.setPending(false);
        },
        lowMemoryDelay: 220,
        defaultDelay: 150,
        pendingText: label || 'Filtering...',
        onPending: function (ctx) {
          if (statusEl) {
            statusEl.classList.toggle('is-searching', ctx.pending);
            statusEl.textContent = ctx.pending ? ctx.text : '';
          }
          return false;
        },
      });
      return function (opts) {
        scheduler.schedule(opts);
      };
    }
    var timer = null;
    return function (opts) {
      clearTimeout(timer);
      if (opts && opts.immediate) {
        run();
        return;
      }
      if (statusEl) {
        statusEl.classList.add('is-searching');
        statusEl.textContent = label || 'Filtering...';
      }
      timer = setTimeout(function () {
        run();
        if (statusEl) {
          statusEl.classList.remove('is-searching');
          statusEl.textContent = '';
        }
      }, 150);
    };
  }

  function getFoodsSorted() {
    if (!state.foodPairings) return [];
    return state.foodPairings.slice().sort(function (a, b) {
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });
  }

  function updateStatus(el) {
    if (!el) return;
    var n =
      state.currentMode === 'priority'
        ? (state.meta.priority_row_ids || []).filter(function (id) {
            return state.byId[id];
          }).length
        : state.ingredients.length;
    var base =
      (state.currentMode === 'priority' ? 'Priority sheet: ' : 'All indexed: ') +
      n +
      ' spices';
    if (state.layer === 'harmony') {
      base +=
        ' · Heatmap: each cell = how many harmony partners fall in that aroma column (numbers; not the same as ●/· in aroma mode)';
    } else {
      base += ' · Aroma mode: ● = spice tagged in that G column; · = not tagged there';
    }
    if (state.enriched) {
      base +=
        ' · Harmony column = total spice–spice partners · Books = whether Aroma / Flavor unified / Thesaurus has this id';
    } else {
      base += ' · Loading unified index + pairing + food data for Harmony, Books, food grid…';
    }
    el.textContent = base;
  }

  function compactTabletProfile() {
    var root = document.documentElement;
    var tabletViewport =
      window.matchMedia &&
      window.matchMedia('(min-width: 721px) and (max-width: 900px) and (orientation: portrait)').matches;
    return !!(
      tabletViewport ||
      (root &&
        root.classList &&
        (root.classList.contains('lenovo-tab-one-profile') || root.classList.contains('low-memory-device')))
    );
  }

  function collapseTabletGuides() {
    if (!compactTabletProfile()) return;
    ['paSpiceLegend', 'paFoodLegend'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.tagName && el.tagName.toLowerCase() === 'details') el.removeAttribute('open');
    });
  }

  function cancelFoodMatrixObserver() {
    if (foodMatrixObserver && typeof foodMatrixObserver.disconnect === 'function') {
      foodMatrixObserver.disconnect();
    }
    foodMatrixObserver = null;
  }

  function paintFoodMatrixNow(host) {
    cancelFoodMatrixObserver();
    paintFoodMatrix(host);
  }

  function scheduleFoodMatrixPaint(host, options) {
    if (!host) return;
    if (options && options.stale) foodMatrixPainted = false;
    if (!state.enriched) {
      paintFoodMatrix(host);
      return;
    }
    if ((options && options.force) || !compactTabletProfile()) {
      paintFoodMatrixNow(host);
      return;
    }
    if (foodMatrixPainted && host.querySelector('#paFoodMatrix')) return;

    foodMatrixPainted = false;
    host.setAttribute('aria-busy', 'true');
    host.innerHTML = '<p class="pa-food-placeholder">Preparing food × spice matrix…</p>';

    function run() {
      if (!state.enriched || foodMatrixPainted) return;
      paintFoodMatrixNow(host);
    }

    cancelFoodMatrixObserver();
    if (typeof window.IntersectionObserver === 'function') {
      foodMatrixObserver = new window.IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              run();
              break;
            }
          }
        },
        { root: null, rootMargin: '120px 0px', threshold: 0 }
      );
      foodMatrixObserver.observe(host);
      return;
    }
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 2200 });
    } else {
      setTimeout(run, 900);
    }
  }

  function loadEnrichment(statusEl, spiceHost, foodHost, onDone) {
    Promise.all([
      fetch(UNIFIED).then(function (r) {
        return r.ok ? r.json() : [];
      }),
      fetch(PAIRING_MATRIX).then(function (r) {
        return r.ok ? r.json() : {};
      }),
      fetch(FOOD_PAIRINGS).then(function (r) {
        return r.ok ? r.json() : [];
      }),
      fetch(FLAVOUR_HINTS).then(function (r) {
        return r.ok ? r.json() : {};
      }).catch(function () {
        return {};
      }),
    ])
      .then(function (quad) {
        var rawU = quad[0];
        var unified;
        var kctx = null;
        if (Array.isArray(rawU)) {
          unified = rawU;
        } else if (rawU && typeof rawU === 'object' && Array.isArray(rawU.ingredients)) {
          unified = rawU.ingredients;
          kctx = rawU.kitchen_context && typeof rawU.kitchen_context === 'object' ? rawU.kitchen_context : null;
        } else {
          unified = [];
        }
        var pm = quad[1] && typeof quad[1] === 'object' ? quad[1] : {};
        var fp = Array.isArray(quad[2]) ? quad[2] : [];
        var fh = quad[3] && typeof quad[3] === 'object' && !Array.isArray(quad[3]) ? quad[3] : null;

        var ub = Object.create(null);
        for (var i = 0; i < unified.length; i++) {
          var row = unified[i];
          if (row && row.id) ub[row.id] = row;
        }
        state.unifiedById = ub;
        state.kitchenContext = kctx;
        state.pairingMatrix = pm;
        state.foodPairings = fp;
        state.flavourHints = fh;
        state.enriched = true;

        var lh = document.getElementById('paLayerHarmony');
        if (lh) {
          lh.disabled = false;
          lh.removeAttribute('aria-disabled');
        }

        paintSpiceMatrix(spiceHost);
        scheduleFoodMatrixPaint(foodHost);
        updateStatus(statusEl);
        var s = document.getElementById('paEnrichStatus');
        if (s) s.textContent = '';
        if (onDone) onDone();
      })
      .catch(function () {
        var s = document.getElementById('paEnrichStatus');
        if (s) s.textContent = 'Could not load unified / pairing data; matrix shows aroma groups only.';
        var fh = document.getElementById('paFoodMatrixHost');
        if (fh) {
          fh.innerHTML =
            '<p class="pa-food-placeholder">Food matrix needs enrichment data; reload or check network.</p>';
        }
        if (onDone) onDone();
      });
  }

  function init() {
    collapseTabletGuides();
    var spiceHost = document.getElementById('paMatrixHost');
    var foodHost = document.getElementById('paFoodMatrixHost');
    var status = document.getElementById('paStatus');
    var modePri = document.getElementById('paModePriority');
    var modeAll = document.getElementById('paModeAll');
    var search = document.getElementById('paMatrixSearch');
    var layerAroma = document.getElementById('paLayerAroma');
    var layerHarmony = document.getElementById('paLayerHarmony');
    var foodPri = document.getElementById('paFoodModePriority');
    var foodAll = document.getElementById('paFoodModeAll');
    var foodSearch = document.getElementById('paFoodSearch');
    var decisionSearch = document.getElementById('paDecisionSearch');
    var decisionForm = document.getElementById('paDecisionForm');
    var decisionBody = document.getElementById('paDecisionBody');
    var decisionTimer = null;
    var scheduleSpiceFilter = makeSearchScheduler(function () {
      if (search) applySpiceFilter(search.value);
    }, 'Filtering spices...');
    var scheduleFoodFilter = makeSearchScheduler(function () {
      if (foodSearch) applyFoodFilter(foodSearch.value);
    }, 'Filtering foods...');

    if (!spiceHost) return;

    Promise.all([
      fetch(ING).then(function (r) {
        return r.ok ? r.json() : [];
      }),
      fetch(META).then(function (r) {
        return r.ok ? r.json() : {};
      }),
    ])
      .then(function (pair) {
        state.ingredients = Array.isArray(pair[0]) ? pair[0] : [];
        state.meta = pair[1] && typeof pair[1] === 'object' ? pair[1] : {};
        state.byId = buildIngredientById(state.ingredients);
        if (decisionSearch) {
          var params = new URLSearchParams(window.location.search || '');
          var direct = params.get('spice') || params.get('ingredient') || params.get('q');
          if (direct && !decisionSearch.value) decisionSearch.value = direct;
        }

        function paintAll() {
          state.openDrawerSpiceId = null;
          state.openDrawerFoodId = null;
          removeSpiceDrawer(spiceHost);
          removeFoodDrawer(foodHost);
          paintSpiceMatrix(spiceHost);
          scheduleFoodMatrixPaint(foodHost, { stale: true });
          if (search && search.value) applySpiceFilter(search.value);
          if (foodSearch && foodSearch.value) applyFoodFilter(foodSearch.value);
          updateStatus(status);
          updateDecisionPanel(decisionSearch ? decisionSearch.value : '', { selectDefault: true });
        }

        paintAll();

        if (layerHarmony) {
          layerHarmony.disabled = true;
          layerHarmony.setAttribute('aria-disabled', 'true');
        }

        spiceHost.addEventListener('click', function (e) {
          onSpiceMatrixClick(e, spiceHost, search, modePri, modeAll, decisionSearch, foodHost, foodSearch);
        });
        spiceHost.addEventListener('keydown', function (e) {
          onSpiceMatrixKeydown(e, spiceHost);
        });
        if (foodHost) {
          foodHost.addEventListener('click', function (e) {
            onFoodMatrixClick(e, foodHost, getFoodsSorted(), spiceHost, search, modePri, modeAll, decisionSearch, foodSearch);
          });
          foodHost.addEventListener('keydown', function (e) {
            onFoodMatrixKeydown(e, foodHost, getFoodsSorted());
          });
        }

        if (modePri) {
          modePri.addEventListener('click', function () {
            state.currentMode = 'priority';
            modePri.setAttribute('aria-pressed', 'true');
            if (modeAll) modeAll.setAttribute('aria-pressed', 'false');
            paintAll();
          });
        }
        if (modeAll) {
          modeAll.addEventListener('click', function () {
            state.currentMode = 'all';
            modeAll.setAttribute('aria-pressed', 'true');
            if (modePri) modePri.setAttribute('aria-pressed', 'false');
            paintAll();
          });
        }

        if (layerAroma) {
          layerAroma.addEventListener('click', function () {
            state.layer = 'aroma';
            layerAroma.setAttribute('aria-pressed', 'true');
            if (layerHarmony) layerHarmony.setAttribute('aria-pressed', 'false');
            state.openDrawerSpiceId = null;
            paintSpiceMatrix(spiceHost);
            if (search && search.value) applySpiceFilter(search.value);
            updateStatus(status);
          });
        }
        if (layerHarmony) {
          layerHarmony.addEventListener('click', function () {
            if (!state.enriched || layerHarmony.disabled) return;
            state.layer = 'harmony';
            layerHarmony.setAttribute('aria-pressed', 'true');
            if (layerAroma) layerAroma.setAttribute('aria-pressed', 'false');
            state.openDrawerSpiceId = null;
            paintSpiceMatrix(spiceHost);
            if (search && search.value) applySpiceFilter(search.value);
            updateStatus(status);
          });
        }

        if (foodPri) {
          foodPri.addEventListener('click', function () {
            state.foodSpiceMode = 'priority';
            foodPri.setAttribute('aria-pressed', 'true');
            if (foodAll) foodAll.setAttribute('aria-pressed', 'false');
            state.openDrawerFoodId = null;
            if (state.enriched) scheduleFoodMatrixPaint(foodHost, { force: true });
            if (foodSearch && foodSearch.value) applyFoodFilter(foodSearch.value);
          });
        }
        if (foodAll) {
          foodAll.addEventListener('click', function () {
            state.foodSpiceMode = 'all';
            foodAll.setAttribute('aria-pressed', 'true');
            if (foodPri) foodPri.setAttribute('aria-pressed', 'false');
            state.openDrawerFoodId = null;
            if (state.enriched) scheduleFoodMatrixPaint(foodHost, { force: true });
            if (foodSearch && foodSearch.value) applyFoodFilter(foodSearch.value);
          });
        }

        if (search) {
          search.addEventListener('input', function () {
            scheduleSpiceFilter();
          });
        }
        if (foodSearch) {
          foodSearch.addEventListener('input', function () {
            if (state.enriched && !foodMatrixPainted) scheduleFoodMatrixPaint(foodHost, { force: true });
            scheduleFoodFilter();
          });
        }
        if (decisionForm) {
          decisionForm.addEventListener('submit', function (e) {
            e.preventDefault();
            updateDecisionPanel(decisionSearch ? decisionSearch.value : '', { selectDefault: true });
          });
        }
        if (decisionSearch) {
          decisionSearch.addEventListener('input', function () {
            clearTimeout(decisionTimer);
            decisionTimer = setTimeout(function () {
              updateDecisionPanel(decisionSearch.value, { selectDefault: false });
            }, 120);
          });
          if (window.KuschiIngredientFlow && typeof window.KuschiIngredientFlow.wirePresetButtons === 'function') {
            window.KuschiIngredientFlow.wirePresetButtons(document.querySelector('.pa-decision'), {
              input: decisionSearch,
              onSelect: function () {
                clearTimeout(decisionTimer);
                updateDecisionPanel(decisionSearch.value, { selectDefault: true });
              },
            });
          }
        }
        if (decisionBody) {
          decisionBody.addEventListener('click', function (e) {
            if (handleAtlasDrill(e, spiceHost, search, modePri, modeAll, decisionSearch, foodHost, foodSearch)) return;
            var action = e.target.closest('[data-pa-decision-action]');
            if (!action) return;
            if (action.getAttribute('data-pa-decision-action') === 'matrix') {
              e.preventDefault();
              revealDecisionInMatrix(spiceHost, search, modePri, modeAll);
            } else if (action.getAttribute('data-pa-decision-action') === 'food') {
              e.preventDefault();
              revealDecisionInFoodMatrix(foodHost, foodSearch);
            }
          });
        }

        loadEnrichment(status, spiceHost, foodHost, function () {
          updateDecisionPanel(decisionSearch ? decisionSearch.value : '', { selectDefault: true });
          if (layerHarmony && state.layer === 'harmony') {
            paintSpiceMatrix(spiceHost);
            if (search && search.value) applySpiceFilter(search.value);
          }
        });
      })
      .catch(function () {
        spiceHost.innerHTML = '<p class="pa-error">Could not load aroma matrix data.</p>';
        if (status) status.textContent = '';
      });
  }

  function scheduleInit() {
    var urgent =
      (window.location.search && window.location.search.length > 1) ||
      (window.location.hash && window.location.hash.length > 1);
    function run() {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
      else init();
    }
    if (urgent) {
      run();
      return;
    }
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 2600 });
    } else {
      setTimeout(run, 80);
    }
  }
  scheduleInit();
})();
