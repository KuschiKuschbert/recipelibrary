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

  function findIngredientByQuery(query) {
    var q = norm(query);
    if (!q) return null;
    var rows = state.ingredients || [];
    var prefix = null;
    var contains = null;
    for (var i = 0; i < rows.length; i++) {
      var ing = rows[i];
      if (!ing) continue;
      var idn = norm(ing.id || '');
      var nn = norm(displayNameForIngredient(ing));
      if (idn === q || nn === q) return ing;
      if (!prefix && (idn.indexOf(q) === 0 || nn.indexOf(q) === 0)) prefix = ing;
      if (!contains && (idn.indexOf(q) >= 0 || nn.indexOf(q) >= 0)) contains = ing;
    }
    return prefix || contains;
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

  function drawerPillHtml(text, label) {
    if (!text) return '';
    return (
      '<span class="pa-drawer-pill ingredient-flow-pill"' +
      (label ? ' aria-label="' + esc(label) + '"' : '') +
      '>' +
      text +
      '</span>'
    );
  }

  function drawerMetaHtml(ing, unifiedRow) {
    var fl = unifiedRow && unifiedRow.flavor ? unifiedRow.flavor : null;
    var th = unifiedRow && unifiedRow.thesaurus ? unifiedRow.thesaurus : null;
    var parts = [];
    parts.push(drawerPillHtml(esc(aromaGroupText(ing))));
    var partnerCount = harmonyPartnerCount(ing.id);
    if (partnerCount != null) parts.push(drawerPillHtml(esc(partnerCount + ' harmony links')));
    if (th && (th.family || th.family_slug)) parts.push(drawerPillHtml('Family: ' + esc(String(th.family || th.family_slug))));
    if (fl && fl.weight) parts.push(drawerPillHtml('Weight: ' + esc(String(fl.weight))));
    if (fl && fl.volume) parts.push(drawerPillHtml('Volume: ' + esc(String(fl.volume))));
    if (fl && Array.isArray(fl.taste) && fl.taste.length) parts.push(drawerPillHtml('Taste: ' + esc(fl.taste.join(', '))));
    if (unifiedRow) parts.push(drawerPillHtml(sourceBadges(unifiedRow), 'Source coverage'));
    return parts.length ? '<div class="pa-drawer-meta">' + parts.join('') + '</div>' : '';
  }

  function answerChipHtml(item, options) {
    var text = item && item.name ? item.name : String(item || '');
    var id = item && item.id ? item.id : '';
    var href = options && options.href;
    if (!href && id && options && options.kind === 'spice') href = 'aroma.html?spice=' + encodeURIComponent(id);
    if (!href && options && options.kind === 'flavor') href = 'flavor.html?q=' + encodeURIComponent(text);
    if (href) return '<a class="pa-answer__chip ingredient-flow-chip" href="' + href + '">' + esc(text) + '</a>';
    return '<span class="pa-answer__chip ingredient-flow-chip">' + esc(text) + '</span>';
  }

  function chipListHtml(items, options) {
    if (!items || !items.length) return '<p class="pa-answer__empty ingredient-flow-empty">' + esc((options && options.empty) || 'No direct match in this extract yet.') + '</p>';
    return '<div class="pa-answer__chips ingredient-flow-chips">' + items.map(function (item) { return answerChipHtml(item, options); }).join('') + '</div>';
  }

  function useTipsListHtml(items, emptyText) {
    if (!items || !items.length) return '<p class="pa-answer__empty ingredient-flow-empty">' + esc(emptyText || 'No technique note in this extract yet.') + '</p>';
    return (
      '<ul class="pa-use-list ingredient-flow-use-list">' +
      items
        .map(function (item) {
          return '<li>' + esc(item) + '</li>';
        })
        .join('') +
      '</ul>'
    );
  }

  function decisionAnswerHtml(ing) {
    if (!ing) {
      return '<p class="pa-answer__empty ingredient-flow-empty">Type a spice or herb name to get a quick pairing answer.</p>';
    }
    var name = displayNameForIngredient(ing);
    var u = state.unifiedById ? state.unifiedById[ing.id] : null;
    var harmony = aromaHarmonyNames(ing, 8);
    var flavorPairs = flavorPairingNames(ing, 8);
    var foods = foodMatchesForSpice(ing.id, 8);
    var avoid = flavorAvoidNames(ing, 8);
    var partnerCount = harmonyPartnerCount(ing.id);
    var source = sourceBadges(u);
    var enrichedNote = state.enriched
      ? 'Built from Aroma, Flavor, Thesaurus, and food-pairing extracts.'
      : 'Aroma data is ready; richer Flavor and food-pairing data is still loading.';

    return (
      '<div class="pa-answer ingredient-flow" data-decision-spice-id="' + esc(ing.id) + '">' +
        '<div class="pa-answer__top ingredient-flow-head">' +
          '<div>' +
            '<h2 class="pa-answer__name ingredient-flow-title">' + esc(name) + '</h2>' +
            '<div class="pa-answer__meta ingredient-flow-meta">' +
              '<span class="pa-answer__pill ingredient-flow-pill">' + esc(aromaGroupText(ing)) + '</span>' +
              '<span class="pa-answer__pill ingredient-flow-pill">' + (partnerCount != null ? esc(partnerCount + ' harmony links') : 'Harmony loading') + '</span>' +
              '<span class="pa-answer__pill ingredient-flow-pill" aria-label="Source coverage">' + source + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="pa-answer__actions ingredient-flow-actions">' +
            '<button type="button" class="pa-answer__action ingredient-flow-action" data-pa-decision-action="matrix">Show row</button>' +
            '<a class="pa-answer__action ingredient-flow-action" href="aroma.html?spice=' + encodeURIComponent(ing.id) + '">Aroma</a>' +
            '<a class="pa-answer__action ingredient-flow-action" href="flavor.html?q=' + encodeURIComponent(name) + '">Flavor</a>' +
          '</div>' +
        '</div>' +
        '<div class="pa-answer__grid ingredient-flow-grid">' +
          '<section class="pa-answer__section ingredient-flow-section"><h3>Best fast matches</h3>' +
            chipListHtml(harmony, { kind: 'spice', empty: 'No spice harmony links in the Aroma extract.' }) +
          '</section>' +
          '<section class="pa-answer__section ingredient-flow-section"><h3>Flavor Bible adds</h3>' +
            chipListHtml(flavorPairs, { kind: 'flavor', empty: state.enriched ? 'No Flavor Bible pairings for this ingredient id.' : 'Loading Flavor Bible rows...' }) +
          '</section>' +
          '<section class="pa-answer__section ingredient-flow-section"><h3>Foods that use it</h3>' +
            chipListHtml(foods, { empty: state.enriched ? 'No food-pairing rows list this spice yet.' : 'Loading food rows...' }) +
          '</section>' +
          '<section class="pa-answer__section ingredient-flow-section"><h3>Avoid or check</h3>' +
            chipListHtml(avoid, { kind: 'flavor', empty: state.enriched ? 'No avoid notes in the unified extract.' : 'Loading avoid notes...' }) +
          '</section>' +
        '</div>' +
        '<p class="pa-answer__note ingredient-flow-note">' + esc(enrichedNote) + '</p>' +
      '</div>'
    );
  }

  function updateDecisionPanel(query, options) {
    var body = document.getElementById('paDecisionBody');
    if (!body) return;
    var search = document.getElementById('paDecisionSearch');
    var ing = query ? findIngredientByQuery(query) : null;
    if (!ing && options && options.selectDefault) {
      ing = defaultDecisionIngredient();
      if (ing && search && !search.value) search.value = displayNameForIngredient(ing);
    }
    if (!ing && query) {
      body.innerHTML =
        '<p class="pa-answer__empty ingredient-flow-empty">No spice row matched <strong>' +
        esc(query) +
        '</strong>. Try a spice or herb from the matrix, like basil, cumin, coriander, fennel, or pepper.</p>';
      state.decisionSpiceId = null;
      return;
    }
    if (!ing) {
      body.innerHTML = decisionAnswerHtml(null);
      state.decisionSpiceId = null;
      return;
    }
    state.decisionSpiceId = ing.id;
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
        '<p class="pa-chips">' +
          h.harmony
            .slice(0, 8)
            .map(function (x) {
              return '<span class="pa-chip">' + esc(String(x)) + '</span>';
            })
            .join(' ') +
          '</p>'
      );
    }
    if (h.contrast && h.contrast.length) {
      bits.push(
        '<p class="pa-chips">' +
          h.contrast
            .slice(0, 8)
            .map(function (x) {
              return '<span class="pa-chip pa-chip-contrast">' + esc(String(x)) + '</span>';
            })
            .join(' ') +
          '</p>'
      );
    }
    if (h.spice_harmony_partners && h.spice_harmony_partners.length) {
      bits.push(
        '<p class="pa-small pa-muted">Spice harmony</p><p class="pa-chips">' +
          h.spice_harmony_partners
            .slice(0, 8)
            .map(function (x) {
              return '<span class="pa-chip">' + esc(String(x)) + '</span>';
            })
            .join(' ') +
          '</p>'
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
    var name = displayNameForIngredient(ing) || ing.name || ing.id;
    var note = state.enriched
      ? 'Fastest kitchen answer from Aroma harmony, Flavor Bible rows, and food-pairing data.'
      : 'Aroma data is ready; richer Flavor and food rows are still loading.';
    return (
      '<section class="pa-drawer-profile ingredient-flow-profile" data-pa-drawer-profile aria-label="Kitchen profile for ' +
      esc(name) +
      '">' +
        '<div class="pa-drawer-profile-head ingredient-flow-profile-head">' +
          '<h4>Kitchen profile</h4>' +
          '<p>' + esc(note) + '</p>' +
        '</div>' +
        '<div class="pa-drawer-profile-grid ingredient-flow-profile-grid">' +
          '<div class="pa-drawer-panel ingredient-flow-panel"><h5>Pair now</h5>' +
            chipListHtml(harmony, { kind: 'spice', empty: 'No direct harmony links.' }) +
          '</div>' +
          '<div class="pa-drawer-panel ingredient-flow-panel"><h5>Flavor adds</h5>' +
            chipListHtml(flavorPairs, { kind: 'flavor', empty: state.enriched ? 'No Flavor Bible row.' : 'Loading...' }) +
          '</div>' +
          '<div class="pa-drawer-panel pa-drawer-panel--wide ingredient-flow-panel ingredient-flow-panel--wide"><h5>Use it</h5>' +
            useTipsListHtml(useTips, state.enriched ? 'No technique note in the unified extract.' : 'Loading technique notes...') +
          '</div>' +
          '<div class="pa-drawer-panel ingredient-flow-panel"><h5>Foods</h5>' +
            chipListHtml(foods, { empty: state.enriched ? 'No food rows yet.' : 'Loading...' }) +
          '</div>' +
          '<div class="pa-drawer-panel ingredient-flow-panel"><h5>Check / avoid</h5>' +
            chipListHtml(avoid, { kind: 'flavor', empty: state.enriched ? 'No avoid notes.' : 'Loading...' }) +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function spiceDrawerHtml(ing) {
    var u = state.unifiedById ? state.unifiedById[ing.id] : null;
    var ar = u && u.aroma ? u.aroma : ing;
    var labels = state.meta.group_labels || [];
    while (labels.length < 8) labels.push('G' + (labels.length + 1));
    var name = displayNameForIngredient(ing) || ing.name || ing.id;

    var parts = [];
    var sourceParts = [];
    parts.push('<div class="pa-drawer-head">');
    parts.push('<div class="pa-drawer-title-wrap">');
    parts.push('<p class="pa-drawer-kicker">Ingredient profile</p>');
    parts.push('<h3 class="pa-drawer-title">' + esc(name) + '</h3>');
    parts.push(drawerMetaHtml(ing, u));
    parts.push(
      '<div class="pa-drawer-actions ingredient-flow-actions">' +
        '<a class="pa-drawer-action ingredient-flow-action" href="aroma.html?spice=' +
        encodeURIComponent(ing.id) +
        '">Aroma</a>' +
        '<a class="pa-drawer-action ingredient-flow-action" href="flavor.html?q=' +
        encodeURIComponent(name) +
        '">Flavor</a>' +
        '<a class="pa-drawer-action ingredient-flow-action" href="flavor.html?toolkit=1">Toolkit</a>' +
      '</div>'
    );
    parts.push('</div>');
    parts.push(
      '<button type="button" class="pa-drawer-close" aria-label="Close details">×</button>'
    );
    parts.push('</div><div class="pa-drawer-body">');

    parts.push(spiceDrawerQuickAnswerSection(ing));

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
      var links = hw
        .map(function (h) {
          var hid = h.id || '';
          return (
            '<a href="aroma.html?spice=' +
            encodeURIComponent(hid) +
            '" class="pa-chip">' +
            esc(h.name || hid) +
            '</a>'
          );
        })
        .join(' ');
      sourceParts.push('<section class="pa-sec"><h4>Harmonizes with</h4><p class="pa-chips">' + links + '</p></section>');
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

    if (sourceParts.length) {
      parts.push(
        '<details class="pa-drawer-source-details">' +
          '<summary>Source detail</summary>' +
          '<div class="pa-drawer-source-body">' +
            sourceParts.join('') +
          '</div>' +
        '</details>'
      );
    }

    parts.push(
      '<p class="pa-drawer-foot"><a href="aroma.html?spice=' +
        encodeURIComponent(ing.id) +
        '">Open full Aroma profile →</a> · <a href="flavor.html?q=' +
        encodeURIComponent(name) +
        '">Flavor explorer →</a> · <a href="flavor.html?toolkit=1">Flavor toolkit →</a></p>'
    );
    parts.push('</div>');
    return parts.join('');
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
    td.innerHTML = '<div class="pa-drawer-card">' + spiceDrawerHtml(ing) + '</div>';
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
    var names = seas
      .map(function (s) {
        return (
          '<a href="aroma.html?spice=' +
          encodeURIComponent(s.id || '') +
          '" class="pa-chip">' +
          esc(s.name || s.id) +
          '</a>'
        );
      })
      .join(' ');
    return (
      '<div class="pa-drawer-head">' +
      '<h3 class="pa-drawer-title">' +
      esc(food.name || food.id) +
      '</h3>' +
      '<button type="button" class="pa-drawer-close" aria-label="Close details">×</button>' +
      '</div><div class="pa-drawer-body">' +
      '<section class="pa-sec"><h4>Seasonings (' +
      seas.length +
      ')</h4><p class="pa-chips">' +
      names +
      '</p></section></div>'
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

    host.innerHTML = buildSpiceTableBody(meta, rows, labels);
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

  function onSpiceMatrixClick(e, spiceHost) {
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

  function onFoodMatrixClick(e, foodHost, foods) {
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
          onSpiceMatrixClick(e, spiceHost);
        });
        spiceHost.addEventListener('keydown', function (e) {
          onSpiceMatrixKeydown(e, spiceHost);
        });
        if (foodHost) {
          foodHost.addEventListener('click', function (e) {
            onFoodMatrixClick(e, foodHost, getFoodsSorted());
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
        }
        if (decisionBody) {
          decisionBody.addEventListener('click', function (e) {
            var action = e.target.closest('[data-pa-decision-action]');
            if (!action) return;
            if (action.getAttribute('data-pa-decision-action') === 'matrix') {
              e.preventDefault();
              revealDecisionInMatrix(spiceHost, search, modePri, modeAll);
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
