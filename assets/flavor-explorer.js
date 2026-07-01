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
  var AROMA_META = 'aroma_data/aroma_matrix_meta.json';
  var FOOD_PAIRINGS = 'aroma_data/food_pairings.json';

  var unified = null;
  var wheel = null;
  var pairings = null;
  var temps = null;
  var aromaMeta = null;
  var foodPairings = null;
  var byName = Object.create(null);
  var loadP = null;
  var flavourKb = null;
  var flavourKbP = null;
  var flavourIngredients = null;
  var flavourByCollapsedKey = null;
  var lastDetailId = null;
  var searchScheduler = null;
  var toolkitFilterScheduler = null;
  var loadStatusText = '';
  var lastAnswerId = null;

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function ingredientQueryCandidates(query) {
    var original = norm(query);
    if (!original) return [];
    var q = original;
    var variants = [];
    function addVariant(text) {
      text = String(text || '').trim();
      if (text && variants.indexOf(text) < 0) variants.push(text);
    }
    [
      /^(what|which)\s+(goes|pairs|works)\s+(with|well\s+with)\s+/,
      /^(goes|pairs|works)\s+(with|well\s+with)\s+/,
      /^(what|which)\s+can\s+i\s+(pair|use|cook)\s+(with\s+)?/,
      /^(pair|match|use|cook|season|flavour|flavor)\s+(this\s+with\s+|with\s+|for\s+)?/,
      /^(best|good|quick)\s+(pairings?|matches|flavours|flavors)\s+(for|with)\s+/,
      /^(pairings?|matches|flavours|flavors)\s+(for|with)\s+/,
      /^(what|which)\s+(spices?|herbs?|flavours|flavors)\s+(go|work|pair)\s+(with|for)\s+/,
      /\s+(pairings?|matches|ideas|please)$/,
    ].forEach(function (pattern) {
      q = q.replace(pattern, '').trim();
    });
    var words = q.split(' ');
    ['with', 'for', 'to'].forEach(function (marker) {
      var idx = words.indexOf(marker);
      if (idx >= 0 && idx < words.length - 1) {
        var head = words.slice(0, idx).join(' ').trim();
        addVariant(head);
        var tail = words.slice(idx + 1).join(' ').trim();
        addVariant(tail);
      }
    });
    addVariant(q);
    addVariant(original);
    return variants;
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
      fetch(AROMA_META)
        .then(function (r) {
          return r.ok ? r.json() : {};
        })
        .catch(function () {
          return {};
        }),
      fetch(FOOD_PAIRINGS)
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
        aromaMeta = arr[3] && typeof arr[3] === 'object' && !Array.isArray(arr[3]) ? arr[3] : {};
        foodPairings = Array.isArray(arr[4]) ? arr[4] : [];
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
    var candidates = ingredientQueryCandidates(query);
    if (!candidates.length || !unified) return [];
    for (var ci = 0; ci < candidates.length; ci++) {
      var q = candidates[ci];
      var out = [];
      for (var i = 0; i < unified.length; i++) {
        var u = unified[i];
        var n = norm(u.name || '');
        if (!n) continue;
        if (n === q || n.indexOf(q) >= 0 || q.indexOf(n) >= 0) out.push(u);
        if (out.length > 80) break;
      }
      if (out.length) return out.slice(0, 40);
    }
    return [];
  }

  function rowName(row) {
    return row && (row.name || row.id) ? row.name || row.id : '';
  }

  function matchRowsByCandidate(rows, q, nameForRow) {
    if (!q || q.length < 2) return null;
    var prefix = null;
    var contains = null;
    for (var i = 0; i < (rows || []).length; i++) {
      var row = rows[i];
      if (!row) continue;
      var idn = norm(row.id || '');
      var nn = norm(nameForRow(row));
      if (idn === q || nn === q) return { item: row, strength: 3 };
      if (!prefix && (idn.indexOf(q) === 0 || nn.indexOf(q) === 0)) {
        prefix = { item: row, strength: 2 };
      }
      if (!contains && q.length >= 3 && (idn.indexOf(q) >= 0 || nn.indexOf(q) >= 0 || q.indexOf(nn) >= 0)) {
        contains = { item: row, strength: 1 };
      }
    }
    return prefix || contains;
  }

  function bestMatchForQuery(rows, query, nameForRow) {
    var candidates = ingredientQueryCandidates(query);
    if (!candidates.length) return null;
    for (var ci = 0; ci < candidates.length; ci++) {
      var match = matchRowsByCandidate(rows, candidates[ci], nameForRow);
      if (match) return match;
    }
    return null;
  }

  function findFoodMatch(query) {
    return bestMatchForQuery(foodPairings || [], query, rowName);
  }

  function findFlavorRowMatch(query) {
    return bestMatchForQuery(unified || [], query, rowName);
  }

  function orderedFoodSeasonings(food) {
    var seas = (food && food.seasonings) || [];
    var priority = (aromaMeta && aromaMeta.priority_row_ids) || [];
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

  function titleish(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/\b([a-z])/g, function (m) {
        return m.toUpperCase();
      });
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

  function uniqueText(items, limit) {
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < (items || []).length; i++) {
      var raw = cleanPairingName(items[i]);
      if (!raw) continue;
      var key = norm(raw);
      if (!key || seen[key]) continue;
      seen[key] = true;
      out.push(raw);
      if (limit && out.length >= limit) break;
    }
    return out;
  }

  function bestFlavorPairings(f, limit) {
    var pairingsObj = f && f.pairings ? f.pairings : {};
    var tiers = ['holy_grail', 'very_highly_recommended', 'highly_recommended', 'recommended'];
    var items = [];
    for (var i = 0; i < tiers.length; i++) {
      var arr = pairingsObj[tiers[i]] || [];
      for (var j = 0; j < arr.length; j++) {
        if (!isLikelyInstruction(arr[j])) items.push(arr[j]);
      }
      if (limit && items.length >= limit * 2) break;
    }
    return uniqueText(items, limit);
  }

  function flavorUseTips(f, fk, limit) {
    var tips = [];
    var pairingsObj = f && f.pairings ? f.pairings : {};
    Object.keys(pairingsObj).forEach(function (tier) {
      var arr = pairingsObj[tier] || [];
      for (var i = 0; i < arr.length; i++) {
        if (isLikelyInstruction(arr[i])) tips.push(cleanPairingName(arr[i]));
      }
    });
    if (fk && Array.isArray(fk.tips)) {
      for (var ti = 0; ti < fk.tips.length; ti++) {
        if (isLikelyInstruction(fk.tips[ti])) tips.push(fk.tips[ti]);
      }
    }
    if (f && f.function) tips.push('Function: ' + f.function);
    if (f && f.flavor_notes) tips.push(f.flavor_notes);
    return uniqueText(tips, limit);
  }

  function affinityText(f, limit) {
    var aff = (f && f.affinities) || [];
    var out = [];
    for (var i = 0; i < aff.length; i++) {
      var combo = aff[i];
      if (Array.isArray(combo)) out.push(combo.join(' + '));
      else out.push(String(combo || ''));
    }
    return uniqueText(out, limit);
  }

  function aromaHarmonyText(u, limit) {
    var a = u && u.aroma;
    var hw = (a && a.harmonizes_with) || [];
    var out = [];
    for (var i = 0; i < hw.length; i++) {
      out.push(hw[i] && (hw[i].name || hw[i].id));
    }
    return uniqueText(out, limit);
  }

  function findBestRow(query) {
    var q = norm(query);
    if (!q) {
      return byName.cumin || (unified && unified[0]) || null;
    }
    var rows = findRows(query);
    if (!rows.length) return null;
    for (var i = 0; i < rows.length; i++) {
      var n = norm(rows[i].name || '');
      if (n === q || norm(rows[i].id || '') === q) return rows[i];
    }
    return rows[0];
  }

  function flavorAnswerChipText(item) {
    return item && item.name ? item.name : String(item || '');
  }

  function flavorAnswerChipHref(item, opts) {
    var text = flavorAnswerChipText(item);
    var id = item && item.id ? item.id : '';
    if (opts && opts.kind === 'spice' && id) return 'aroma.html?spice=' + encodeURIComponent(id);
    if (opts && opts.kind === 'flavor' && text) return 'flavor.html?q=' + encodeURIComponent(text);
    return '';
  }

  function flavorAnswerChipList(items, opts) {
    return global.KuschiIngredientFlow.chips(items, {
      avoid: opts && opts.avoid,
      empty: (opts && opts.empty) || 'No direct note in this extract yet.',
      emptyClassName: 'flavor-answer-empty',
      className: 'flavor-answer-chips',
      chipClassName: 'flavor-answer-chip' + (opts && opts.avoid ? ' flavor-answer-chip--avoid' : ''),
      textForItem: flavorAnswerChipText,
      hrefForItem: function (item) {
        return flavorAnswerChipHref(item, opts || {});
      },
    });
  }

  function flavorAnswerTipList(items, empty) {
    return global.KuschiIngredientFlow.useList(items, {
      empty: empty || 'No use notes yet.',
      emptyClassName: 'flavor-answer-empty',
      className: 'flavor-answer-tip-list',
      limit: 4,
    });
  }

  function renderFlavorAnswerForRow(u, fk, foodMatch) {
    var host = document.getElementById('flavorAnswer');
    if (!host) return;
    if (!u) {
      host.innerHTML = global.KuschiIngredientFlow.empty(
        'Search an ingredient to get a quick kitchen answer. Example: cumin, tomatoes, lamb, lemon.',
        'flavor-answer-empty'
      );
      lastAnswerId = null;
      return;
    }
    var f = u.flavor || {};
    var th = u.thesaurus;
    var best = bestFlavorPairings(f, 8);
    if (!best.length && fk && fk.pairings) {
      best = uniqueText(
        []
          .concat(fk.pairings.holy_grail || [])
          .concat(fk.pairings.highly_recommended || [])
          .concat(fk.pairings.recommended || []),
        8
      );
    }
    var avoids = uniqueText(f.avoid || (fk && fk.avoid) || [], 8);
    var useTips = flavorUseTips(f, fk, 4);
    var aroma = aromaHarmonyText(u, 8);
    if (!aroma.length && fk && fk.spice_harmony_partners) aroma = uniqueText(fk.spice_harmony_partners, 8);
    var aff = affinityText(f, 4);
    var food = foodMatch && foodMatch.item ? foodMatch.item : null;
    var foodSeasonings = food ? foodSeasoningItems(food, 8) : [];
    var meta = [];
    if (f.weight) meta.push('Weight: ' + f.weight);
    if (f.volume) meta.push('Volume: ' + f.volume);
    if (f.taste && f.taste.length) meta.push('Taste: ' + f.taste.join(', '));
    if (th && th.family) meta.push('Family: ' + th.family);
    if (fk && fk.primary_family) meta.push('Toolkit: ' + String(fk.primary_family).replace(/_/g, ' '));
    lastAnswerId = u.id;
    var flow = global.KuschiIngredientFlow;
    var actions = [
      {
        text: 'Full detail',
        className: 'flavor-answer-action',
        attrs: { 'data-flavor-answer-action': 'detail' },
      },
      {
        text: 'Matrix',
        href: 'pairing-atlas.html?ingredient=' + encodeURIComponent(u.name || u.id),
        className: 'flavor-answer-action',
      },
    ];
    if (u.aroma) {
      actions.push({
        text: 'Aroma',
        href: 'aroma.html?spice=' + encodeURIComponent(u.aroma.id || u.id),
        className: 'flavor-answer-action',
      });
    }
    host.innerHTML =
      flow.head({
        kicker: 'Flavor answer',
        title: titleish(u.name || u.id),
        className: 'flavor-answer-head',
        kickerClassName: 'flavor-answer-kicker',
        titleClassName: 'flavor-answer-title',
        metaHtml: flow.meta(meta, {
          limit: 5,
          className: 'flavor-answer-meta',
          itemOptions: { className: 'flavor-answer-pill' },
        }),
        actionsHtml: flow.actions(actions, { className: 'flavor-answer-actions' }),
      }) +
      flow.grid(
        []
          .concat(
            foodSeasonings.length
              ? [
                  flow.section(
                    'Food seasoning row',
                    flavorAnswerChipList(foodSeasonings, { kind: 'spice', empty: 'No Aroma food seasonings for this match.' }),
                    { className: 'flavor-answer-section' }
                  ),
                ]
              : []
          )
          .concat([
            flow.section('Best pairings', flavorAnswerChipList(best, { empty: 'No Flavor Bible pairings for this row.' }), { className: 'flavor-answer-section' }),
            flow.section('Avoid or check', flavorAnswerChipList(avoids, { avoid: true, empty: 'No avoid notes in the unified extract.' }), { className: 'flavor-answer-section' }),
            flow.section('Use it like this', flavorAnswerTipList(useTips, 'No technique notes yet.'), { className: 'flavor-answer-section' }),
            flow.section('Aroma links', flavorAnswerChipList(aroma, { empty: 'No Aroma harmony row yet.' }), { className: 'flavor-answer-section' }),
          ]),
        { className: 'flavor-answer-grid' }
      ) +
      (aff.length
        ? flow.note('<strong>Affinity idea:</strong> ' + esc(aff[0]), { raw: true, className: 'flavor-answer-note' })
        : flow.note('Answer uses the unified Flavor, Aroma, Thesaurus, and toolkit extracts.', { className: 'flavor-answer-note' }));
  }

  function renderFlavorAnswerForFood(food, row) {
    var host = document.getElementById('flavorAnswer');
    if (!host || !food) return;
    var name = food.name || food.id || '';
    var seasonings = foodSeasoningItems(food, 8);
    var more = foodSeasoningItems(food, 8, seasonings);
    var total = ((food && food.seasonings) || []).length;
    var flow = global.KuschiIngredientFlow;
    lastAnswerId = row && row.id ? row.id : null;
    host.innerHTML =
      '<div class="flavor-answer-food ingredient-flow" data-decision-food-id="' +
      esc(food.id || '') +
      '">' +
      flow.head({
        kicker: 'Food answer',
        title: titleish(name),
        className: 'flavor-answer-head',
        kickerClassName: 'flavor-answer-kicker',
        titleClassName: 'flavor-answer-title',
        metaHtml: flow.meta(
          [
            { text: 'Aroma food row', className: 'flavor-answer-pill' },
            { text: total + ' seasonings', className: 'flavor-answer-pill' },
          ],
          { className: 'flavor-answer-meta' }
        ),
        actionsHtml: flow.actions(
          [
            {
              text: 'Matrix',
              href: 'pairing-atlas.html?ingredient=' + encodeURIComponent(name),
              className: 'flavor-answer-action',
            },
            {
              text: 'Aroma',
              href: 'aroma.html?food=' + encodeURIComponent(food.id || ''),
              className: 'flavor-answer-action',
            },
          ],
          { className: 'flavor-answer-actions' }
        ),
      }) +
      flow.grid(
        [
          flow.section('Seasonings', flavorAnswerChipList(seasonings, { kind: 'spice', empty: 'No listed seasonings for this food row.' }), {
            className: 'flavor-answer-section',
          }),
          flow.section('More options', flavorAnswerChipList(more, { kind: 'spice', empty: 'No extra seasonings beyond the first picks.' }), {
            className: 'flavor-answer-section',
          }),
        ],
        { className: 'flavor-answer-grid' }
      ) +
      flow.note('Food-pairing row from the Aroma extract. Use Matrix for the full row, or tap a seasoning for its Aroma profile.', {
        className: 'flavor-answer-note',
      }) +
      '</div>';
  }

  function updateFlavorAnswer(query, opts) {
    var host = document.getElementById('flavorAnswer');
    if (!host || !unified) return;
    var rowMatch = query ? findFlavorRowMatch(query) : null;
    var foodMatch = query ? findFoodMatch(query) : null;
    var row = rowMatch && rowMatch.item ? rowMatch.item : findBestRow(query);
    if (foodMatch && (!rowMatch || foodMatch.strength > rowMatch.strength)) {
      renderFlavorAnswerForFood(foodMatch.item, row);
      return;
    }
    if (!row && foodMatch) {
      renderFlavorAnswerForFood(foodMatch.item, null);
      return;
    }
    if (!row && query) {
      host.innerHTML =
        '<p class="flavor-answer-empty ingredient-flow-empty">No quick Flavor answer matched <strong>' +
        esc(query) +
        '</strong>. Try a broader ingredient, food, or dish name, or use Aroma for spice-led lookup.</p>';
      lastAnswerId = null;
      return;
    }
    if (!row && opts && opts.selectDefault) row = findBestRow('');
    renderFlavorAnswerForRow(row, lookupFlavourIngredient(row), foodMatch);
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
    toolkitFilterScheduler =
      global.KuschiRecipeUi && typeof global.KuschiRecipeUi.createFilterScheduler === 'function'
        ? global.KuschiRecipeUi.createFilterScheduler({
            run: function () {
              applyFilter();
              toolkitFilterScheduler.setPending(false);
            },
            lowMemoryDelay: 180,
            defaultDelay: 120,
            onPending: function () { return false; },
          })
        : null;
    inp.addEventListener('input', function () {
      if (toolkitFilterScheduler) {
        toolkitFilterScheduler.schedule();
      } else {
        clearTimeout(inp._tkFt);
        inp._tkFt = setTimeout(applyFilter, 120);
      }
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
    if (!norm(q.value)) {
      updateFlavorAnswer('', { selectDefault: true });
      var emptyList = document.getElementById('flavorResults');
      if (emptyList) {
        emptyList.innerHTML =
          '<div class="empty empty-search-state">' +
          '<div class="empty-kicker">Search</div>' +
          '<h2 class="empty-title">Ask an ingredient</h2>' +
          '<p class="empty-body">Type an ingredient above for results. The quick answer card shows a Cumin example until you search.</p>' +
          '</div>';
      }
      return;
    }
    var rows = findRows(q.value);
    var list = document.getElementById('flavorResults');
    if (!list) return;
    if (!rows.length) {
      updateFlavorAnswer(q.value, { selectDefault: false });
      list.innerHTML =
        '<div class="empty empty-search-state">' +
        '<div class="empty-kicker">No match</div>' +
        '<h2 class="empty-title">No ingredients found</h2>' +
        '<p class="empty-body">Try a broader name, or switch to Aroma for spice-led lookup.</p>' +
        '<div class="empty-actions"><a class="empty-action-btn" href="aroma.html">Open Aroma</a></div>' +
        '</div>';
      return;
    }
    updateFlavorAnswer(q.value, { selectDefault: false });
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
        if (u) renderFlavorAnswerForRow(u, lookupFlavourIngredient(u));
      });
    });
  }

  function setFlavorSearchPending(pending, text) {
    var el = document.getElementById('flavorLoadStatus');
    if (!el) return;
    el.classList.toggle('is-searching', !!pending);
    el.textContent = pending ? text : loadStatusText;
  }

  function scheduleFlavorSearch(opts) {
    if (searchScheduler) {
      searchScheduler.schedule(opts);
      return;
    }
    clearTimeout(scheduleFlavorSearch._timer);
    if (opts && opts.immediate) {
      runSearch();
      return;
    }
    scheduleFlavorSearch._timer = setTimeout(runSearch, 200);
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
    var urgent = !!(deepQ || openToolkit);
    function startLoad() {
      ensureLoaded()
        .then(function () {
          var el = document.getElementById('flavorLoadStatus');
          loadStatusText =
            unified.length +
            ' unified rows · Thesaurus ' +
            wheel.length +
            ' · Links ' +
            pairings.length +
            ' · Foods ' +
            foodPairings.length;
          if (el) el.textContent = loadStatusText;
          ensureFlavourKb().then(function (kb) {
            var st = document.getElementById('flavorLoadStatus');
            if (st && kb && kb.stats) {
              loadStatusText +=
                ' · Toolkit v' + (kb.stats.version || '1.1') + ' (' + (kb.stats.total_ingredients || '') + ' ingredients)';
              st.textContent = loadStatusText;
            }
            var inpAfterToolkit = document.getElementById('flavorSearch');
            updateFlavorAnswer(inpAfterToolkit ? inpAfterToolkit.value : deepQ, { selectDefault: true });
          });
          var inp = document.getElementById('flavorSearch');
          if (deepQ && inp) inp.value = deepQ;
          runSearch();
          if (deepQ) {
            var rows = findRows(deepQ);
            if (rows.length) renderDetail(rows[0]);
          }
          updateFlavorAnswer(deepQ, { selectDefault: true });
          if (openToolkit) {
            var tt = document.querySelector('[data-flavor-tab="toolkit"]');
            if (tt) tt.click();
          }
        })
        .catch(function () {
          var el = document.getElementById('flavorLoadStatus');
          if (el) el.textContent = 'Could not load combined_data (run scripts/run_all_extractions.sh).';
        });
    }
    if (!urgent) {
      var st0 = document.getElementById('flavorLoadStatus');
      if (st0) st0.textContent = 'Loading…';
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(startLoad, { timeout: 2200 });
      } else {
        setTimeout(startLoad, 60);
      }
    } else {
      startLoad();
    }
    initTabs();
    var inp = document.getElementById('flavorSearch');
    if (inp) {
      searchScheduler =
        global.KuschiRecipeUi && typeof global.KuschiRecipeUi.createFilterScheduler === 'function'
          ? global.KuschiRecipeUi.createFilterScheduler({
              run: function () {
                runSearch();
                searchScheduler.setPending(false);
              },
              lowMemoryDelay: 240,
              defaultDelay: 180,
              onPending: function (ctx) {
                setFlavorSearchPending(ctx.pending, ctx.text);
                return false;
              },
            })
          : null;
      inp.addEventListener('input', function () {
        scheduleFlavorSearch();
      });
    }
    var answer = document.getElementById('flavorAnswer');
    if (answer) {
      answer.addEventListener('click', function (e) {
        var action = e.target.closest('[data-flavor-answer-action]');
        if (!action) return;
        if (action.getAttribute('data-flavor-answer-action') === 'detail') {
          e.preventDefault();
          var row = null;
          for (var i = 0; i < (unified || []).length; i++) {
            if (unified[i].id === lastAnswerId) {
              row = unified[i];
              break;
            }
          }
          if (row) {
            renderDetail(row);
            var detail = document.getElementById('flavorDetail');
            if (detail && typeof detail.scrollIntoView === 'function') {
              detail.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
          }
        }
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
