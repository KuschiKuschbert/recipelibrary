/**
 * Aroma Bible data: recipe seasoning suggestions, modal hints, add-recipe panel.
 * Depends on aroma_data/ingredients.json + food_pairings.json (static fetch).
 *
 * German (and other) strings in SEARCH_SYNONYMS / hint maps are for recall only —
 * they are not shown as primary UI labels; displayed names come from JSON `name`.
 */
(function (global) {
  var ING_URL = 'aroma_data/ingredients.json';
  var FOOD_URL = 'aroma_data/food_pairings.json';
  var UNIFIED_URL = 'combined_data/ingredients_unified.json';
  var CUISINE_URL = 'sfah_data/cuisine_profiles.json';

  var ingredients = null;
  var foodPairings = null;
  var byId = Object.create(null);
  var loadPromise = null;
  var unifiedFlavors = null;
  var cuisineMap = null;
  var unifiedPromise = null;
  /** normKey(unified.name) -> row for O(1) exact match before linear scan */
  var unifiedByNormName = Object.create(null);

  function normKey(s) {
    if (window.KuschiUserRecipes && typeof KuschiUserRecipes.canonicalOrderMergeKey === 'function') {
      return KuschiUserRecipes.canonicalOrderMergeKey(s);
    }
    var t = String(s || '')
      .toLowerCase()
      .replace(/[—–\-−]/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return t;
  }

  function tokens(s) {
    return normKey(s)
      .split(' ')
      .filter(function (w) {
        return w.length > 1;
      });
  }

  function ensureUnifiedLoaded() {
    if (unifiedFlavors) return Promise.resolve({ unified: unifiedFlavors, cuisine: cuisineMap });
    if (unifiedPromise) return unifiedPromise;
    unifiedPromise = Promise.all([
      fetch(UNIFIED_URL)
        .then(function (r) {
          return r.ok ? r.json() : [];
        })
        .catch(function () {
          return [];
        }),
      fetch(CUISINE_URL)
        .then(function (r) {
          return r.ok ? r.json() : {};
        })
        .catch(function () {
          return {};
        }),
    ]).then(function (pair) {
      unifiedFlavors = Array.isArray(pair[0]) ? pair[0] : [];
      cuisineMap = pair[1] && typeof pair[1] === 'object' ? pair[1] : {};
      unifiedByNormName = Object.create(null);
      for (var ui = 0; ui < unifiedFlavors.length; ui++) {
        var row = unifiedFlavors[ui];
        var unn = normKey(row.name || '');
        if (unn.length >= 2) unifiedByNormName[unn] = row;
      }
      return { unified: unifiedFlavors, cuisine: cuisineMap };
    });
    return unifiedPromise;
  }

  function matchUnifiedRows(lineKey, lineToks, unified) {
    if (!unified || !unified.length) return null;
    var direct = unifiedByNormName[lineKey];
    if (direct) {
      var sc0 = matchAromaIngredient(lineKey, lineToks, { id: direct.id, name: direct.name });
      if (sc0 >= 2) return direct;
    }
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < unified.length; i++) {
      var u = unified[i];
      if (direct === u) continue;
      var n = normKey(u.name || '');
      if (!n || n.length < 3) continue;
      var sc = matchAromaIngredient(lineKey, lineToks, { id: u.id, name: u.name });
      if (sc > bestScore) {
        bestScore = sc;
        best = u;
      }
    }
    return bestScore >= 2 ? best : null;
  }

  function collectUnifiedMatches(lines, unified) {
    var list = [];
    var seen = Object.create(null);
    for (var L = 0; L < lines.length; L++) {
      var raw = lines[L].item;
      var lineKey = normKey(raw);
      var lineToks = tokens(raw);
      if (!lineKey) continue;
      var u = matchUnifiedRows(lineKey, lineToks, unified);
      if (u && !seen[u.id]) {
        seen[u.id] = true;
        list.push(u);
      }
    }
    return list;
  }

  function buildFlavorExtrasHtml(recipe, lines, unified, cuisines) {
    var matched = collectUnifiedMatches(lines, unified);
    if (!matched.length) return '';

    var tastes = Object.create(null);
    var avoids = [];
    var subs = [];
    for (var i = 0; i < matched.length; i++) {
      var f = matched[i].flavor;
      if (!f) continue;
      var ta = f.taste;
      if (Array.isArray(ta)) {
        for (var t = 0; t < ta.length; t++) tastes[normKey(ta[t])] = ta[t];
      }
      var av = f.avoid;
      if (Array.isArray(av)) {
        for (var a = 0; a < av.length; a++) avoids.push(String(av[a]));
      }
      var su = f.substitutes;
      if (Array.isArray(su)) {
        for (var s = 0; s < su.length; s++) subs.push(String(su[s]));
      }
    }

    var clash = [];
    var hayLines = lines
      .map(function (l) {
        return normKey(l.item);
      })
      .join(' ');
    for (var i2 = 0; i2 < matched.length; i2++) {
      var f2 = matched[i2].flavor;
      if (!f2 || !f2.avoid) continue;
      for (var j = 0; j < f2.avoid.length; j++) {
        var term = normKey(f2.avoid[j]);
        if (term.length > 2 && hayLines.indexOf(term) >= 0) clash.push(matched[i2].name + ' ↔ ' + f2.avoid[j]);
      }
    }

    var tasteBadges = Object.keys(tastes)
      .map(function (k) {
        return '<span class="kuschi-taste-badge">' + escHtml(tastes[k]) + '</span>';
      })
      .join('');

    var instText = '';
    if (recipe && recipe.instructions) {
      var ins = recipe.instructions;
      instText = Array.isArray(ins) ? ins.join(' ') : String(ins);
    }
    instText = normKey(instText);
    var methodTip = '';
    if (/roast|bake|oven/.test(instText) && ingredients) {
      methodTip =
        '<p class="kuschi-flavor-method"><strong>Method</strong>: Long dry heat — add delicate herbs late; toast spices early for depth.</p>';
    } else if (/grill|char|bbq/.test(instText)) {
      methodTip =
        '<p class="kuschi-flavor-method"><strong>Method</strong>: High heat / smoke — bold spices and acids balance char.</p>';
    } else if (/simmer|brais|stew|slow/.test(instText)) {
      methodTip =
        '<p class="kuschi-flavor-method"><strong>Method</strong>: Long wet heat — whole spices in early; fresh herbs at finish.</p>';
    }

    var pivotOpts = Object.keys(cuisines || {})
      .sort()
      .map(function (r) {
        return '<option value="' + escHtml(r) + '">' + escHtml(r) + '</option>';
      })
      .join('');

    var subHtml = subs.length
      ? '<p class="kuschi-flavor-subs"><strong>Substitutes (Veg Bible)</strong>: ' +
        escHtml(subs.slice(0, 6).join(', ')) +
        '</p>'
      : '';

    return (
      '<details class="kuschi-flavor-extras">' +
      '<summary class="kuschi-flavor-summary">Flavor balance &amp; book data</summary>' +
      (tasteBadges ? '<div class="kuschi-taste-row">' + tasteBadges + '</div>' : '') +
      (clash.length
        ? '<div class="kuschi-flavor-clash"><strong>Possible clashes</strong> (AVOID lists): ' +
          escHtml(clash.slice(0, 5).join(' · ')) +
          '</div>'
        : '') +
      subHtml +
      methodTip +
      (pivotOpts
        ? '<div class="kuschi-pivot"><label for="kuschiPivotSel">Cuisine pivot (SFAH seed)</label> ' +
          '<select id="kuschiPivotSel" class="kuschi-pivot-sel"><option value="">—</option>' +
          pivotOpts +
          '</select>' +
          '<pre class="kuschi-pivot-out" id="kuschiPivotOut"></pre></div>'
        : '') +
      '<p class="kuschi-flavor-more"><a href="flavor.html">Open Flavor explorer →</a></p>' +
      '</details>'
    );
  }

  function wirePivotSelect(root, cuisines) {
    var sel = root.querySelector('#kuschiPivotSel');
    var out = root.querySelector('#kuschiPivotOut');
    if (!sel || !out || !cuisines) return;
    sel.addEventListener('change', function () {
      var r = sel.value;
      if (!r) {
        out.textContent = '';
        return;
      }
      var p = cuisines[r];
      if (!p) {
        out.textContent = '';
        return;
      }
      out.textContent =
        JSON.stringify(
          { fats: p.fats || [], acids: p.acids || [], salt: p.salt || [] },
          null,
          2
        );
    });
  }

  function appendFlavorExtras(wrapEl, lines, recipe) {
    if (!wrapEl) return;
    var pending = document.createElement('p');
    pending.className = 'aroma-hint-loading kuschi-flavor-loading';
    pending.setAttribute('aria-live', 'polite');
    pending.textContent = 'Loading flavour data…';
    wrapEl.appendChild(pending);
    ensureUnifiedLoaded()
      .then(function (data) {
        if (pending.parentNode) pending.parentNode.removeChild(pending);
        if (!data.unified || !data.unified.length) return;
        var html = buildFlavorExtrasHtml(recipe, lines, data.unified, data.cuisine);
        if (!html) return;
        var div = document.createElement('div');
        div.innerHTML = html;
        wrapEl.appendChild(div.firstElementChild);
        wirePivotSelect(wrapEl, data.cuisine);
      })
      .catch(function () {
        if (pending.parentNode) pending.parentNode.removeChild(pending);
      });
  }

  function ensureLoaded() {
    if (ingredients && foodPairings) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = Promise.all([
      fetch(ING_URL).then(function (r) {
        if (!r.ok) throw new Error('Failed to load ' + ING_URL);
        return r.json();
      }),
      fetch(FOOD_URL).then(function (r) {
        if (!r.ok) throw new Error('Failed to load ' + FOOD_URL);
        return r.json();
      }),
    ])
      .then(function (pair) {
        ingredients = pair[0];
        foodPairings = pair[1];
        byId = Object.create(null);
        for (var i = 0; i < ingredients.length; i++) {
          var ing = ingredients[i];
          if (ing && ing.id) byId[ing.id] = ing;
        }
      })
      .catch(function (e) {
        loadPromise = null;
        throw e;
      });
    return loadPromise;
  }

  function harmonyRefs(ing) {
    var h = ing && ing.harmonizes_with;
    if (!Array.isArray(h)) return [];
    return h;
  }

  function seasonId(ref) {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    return ref.id || '';
  }

  function seasonName(ref) {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    return ref.name || ref.id || '';
  }

  function pushMetaItem(out, s) {
    s = String(s || '').trim();
    if (s.length > 120) s = s.slice(0, 117) + '…';
    if (s) out.push({ item: s });
  }

  /**
   * Title, cuisine, category — improves matching when e.g. "lamb" is only in the recipe name.
   */
  function recipeMetaLines(recipe) {
    var meta = [];
    if (!recipe) return meta;
    pushMetaItem(meta, recipe.name);
    pushMetaItem(meta, recipe.cuisine);
    pushMetaItem(meta, recipe.cui);
    pushMetaItem(meta, recipe.category);
    pushMetaItem(meta, recipe.cat);
    return meta;
  }

  /** Collect { item } rows from kitchen/detail recipe + optional protein strings for food lookup. */
  function recipeLinesForHints(recipe, extraItems) {
    var out = recipeMetaLines(recipe);
    var ings = recipe && recipe.ingredients;
    if (Array.isArray(ings)) {
      for (var i = 0; i < ings.length; i++) {
        var it = ings[i];
        if (it && it.item) out.push({ item: String(it.item) });
      }
    }
    var extras = extraItems || recipe.protein || recipe.tags;
    if (Array.isArray(extras)) {
      for (var j = 0; j < extras.length; j++) {
        var x = extras[j];
        if (typeof x === 'string' && x.trim()) out.push({ item: x.trim() });
      }
    }
    return out;
  }

  function recipeAlreadyHasSpice(recipeLines, spiceId) {
    var sid = normKey(spiceId.replace(/-/g, ' '));
    for (var i = 0; i < recipeLines.length; i++) {
      var k = normKey(recipeLines[i].item);
      if (k === sid || k.indexOf(sid) >= 0 || sid.indexOf(k) >= 0) return true;
      var ing = byId[spiceId];
      if (ing && ing.name) {
        var nk = normKey(ing.name);
        if (k === nk || k.indexOf(nk) >= 0) return true;
      }
    }
    return false;
  }

  function matchAromaIngredient(lineKey, lineToks, ing) {
    var nk = normKey(ing.name);
    var idk = normKey(String(ing.id || '').replace(/-/g, ' '));
    if (!nk && !idk) return 0;
    if (lineKey === nk || lineKey === idk) return 3;
    if (nk && (lineKey.indexOf(nk) >= 0 || nk.indexOf(lineKey) >= 0)) return 2;
    var nameToks = tokens(ing.name);
    var hit = 0;
    for (var a = 0; a < nameToks.length; a++) {
      for (var b = 0; b < lineToks.length; b++) {
        if (nameToks[a] === lineToks[b]) hit++;
        else if (nameToks[a].length > 3 && lineToks[b].indexOf(nameToks[a]) >= 0) hit++;
        else if (lineToks[b].length > 3 && nameToks[a].indexOf(lineToks[b]) >= 0) hit++;
      }
    }
    return hit >= 2 ? 2 : hit === 1 ? 1 : 0;
  }

  /** English ↔ German (and common variants) so e.g. recipe "lamb" matches index row "Lamm, Gebraten". */
  var FOOD_TOKEN_ALIASES = {
    lamb: ['lamm', 'hammel', 'mutton', 'sheep'],
    lamm: ['lamb', 'mutton', 'hammel'],
    beef: ['rind', 'ox', 'veal', 'kalb', 'steer', 'cow'],
    rind: ['beef', 'ox', 'cattle'],
    veal: ['kalb', 'beef'],
    kalb: ['veal'],
    pork: ['schwein', 'swine', 'ham', 'bacon', 'speck'],
    schwein: ['pork', 'swine'],
    chicken: ['huhn', 'poultry', 'poulet', 'hen'],
    huhn: ['chicken', 'poultry'],
    turkey: ['pute', 'truthahn'],
    fish: ['fisch', 'seafood'],
    fisch: ['fish', 'seafood'],
    duck: ['ente', 'canard'],
    ente: ['duck'],
    rice: ['reis'],
    reis: ['rice'],
    lentils: ['linsen'],
    linsen: ['lentils'],
    beans: ['bohnen'],
    bohnen: ['beans'],
    potato: ['kartoffel', 'potatoes'],
    kartoffel: ['potato', 'potatoes'],
    egg: ['ei', 'eggs'],
    ei: ['egg', 'eggs'],
    cheese: ['kase', 'kaese', 'fromage'],
    mushroom: ['champignon', 'pilz', 'mushrooms'],
    shrimp: ['garnele', 'prawn', 'prawns'],
    citrus: ['zitrone', 'orange', 'lime', 'lemon'],
  };

  function aliasExpandedKeys(tok) {
    var t = normKey(tok);
    if (!t) return [t];
    var out = {};
    out[t] = true;
    var al = FOOD_TOKEN_ALIASES[t];
    if (al) {
      for (var i = 0; i < al.length; i++) {
        var k = normKey(al[i]);
        if (k) out[k] = true;
      }
    }
    for (var en in FOOD_TOKEN_ALIASES) {
      if (!Object.prototype.hasOwnProperty.call(FOOD_TOKEN_ALIASES, en)) continue;
      var arr = FOOD_TOKEN_ALIASES[en];
      for (var j = 0; j < arr.length; j++) {
        if (normKey(arr[j]) === t || en === t) {
          out[normKey(en)] = true;
          for (var k2 = 0; k2 < arr.length; k2++) out[normKey(arr[k2])] = true;
        }
      }
    }
    return Object.keys(out);
  }

  function anyAliasInString(keys, haystackNorm) {
    for (var i = 0; i < keys.length; i++) {
      if (!keys[i]) continue;
      if (haystackNorm.indexOf(keys[i]) >= 0) return true;
    }
    return false;
  }

  function matchFoodPairing(lineKey, lineToks, fp) {
    var rawName = typeof fp === 'string' ? fp : fp.name || '';
    var fk = normKey(rawName);
    if (!fk) return false;
    if (lineKey === fk || lineKey.indexOf(fk) >= 0 || fk.indexOf(lineKey) >= 0) return true;
    var ft = tokens(rawName);
    for (var i = 0; i < ft.length; i++) {
      for (var j = 0; j < lineToks.length; j++) {
        if (ft[i] === lineToks[j]) return true;
        var expL = aliasExpandedKeys(lineToks[j]);
        var expF = aliasExpandedKeys(ft[i]);
        for (var a = 0; a < expL.length; a++) {
          for (var b = 0; b < expF.length; b++) {
            if (expL[a] && expL[a] === expF[b]) return true;
          }
        }
      }
    }
    for (var j2 = 0; j2 < lineToks.length; j2++) {
      if (anyAliasInString(aliasExpandedKeys(lineToks[j2]), fk)) return true;
    }
    for (var i2 = 0; i2 < ft.length; i2++) {
      if (anyAliasInString(aliasExpandedKeys(ft[i2]), lineKey)) return true;
    }
    return false;
  }

  function foodPairingMatchesQuery(queryStr, fp) {
    var q = String(queryStr || '').trim();
    if (!q) return false;
    return matchFoodPairing(normKey(q), tokens(q), fp);
  }

  function ingredientFoodPhraseMatchesQuery(queryStr, phrase) {
    var q = String(queryStr || '').trim();
    if (!q || !phrase) return false;
    return matchFoodPairing(normKey(q), tokens(q), { name: phrase });
  }

  /**
   * @param {Array<{item:string}>} lines
   * @returns {{ suggestions: Array<{id:string,name:string,score:number,groups:number[]}>, matchedSpiceIds: string[], apparentProfiles: Array<{id:string,name:string}> }}
   */
  function buildSuggestions(lines) {
    if (!ingredients || !foodPairings) {
      return { suggestions: [], matchedSpiceIds: [], apparentProfiles: [] };
    }
    var scores = Object.create(null);
    var matchedSpiceIds = [];
    var apparentSet = Object.create(null);

    function add(id, delta) {
      if (!id || !byId[id]) return;
      scores[id] = (scores[id] || 0) + delta;
    }

    for (var L = 0; L < lines.length; L++) {
      var raw = lines[L].item;
      var lineKey = normKey(raw);
      var lineToks = tokens(raw);
      if (!lineKey) continue;

      for (var i = 0; i < ingredients.length; i++) {
        var ing = ingredients[i];
        var m = matchAromaIngredient(lineKey, lineToks, ing);
        if (m > 0) {
          matchedSpiceIds.push(ing.id);
          var w = m >= 3 ? 4 : m >= 2 ? 3 : 2;
          var refs = harmonyRefs(ing);
          for (var h = 0; h < refs.length; h++) {
            var hid = seasonId(refs[h]);
            add(hid, w);
          }
          if (m >= 2) {
            apparentSet[ing.id] = true;
          }
        }
      }

      for (var f = 0; f < foodPairings.length; f++) {
        var fp = foodPairings[f];
        if (matchFoodPairing(lineKey, lineToks, fp)) {
          var seas = fp.seasonings || [];
          for (var s = 0; s < seas.length; s++) {
            add(seasonId(seas[s]), 2.5);
          }
        }
      }

      for (var ii = 0; ii < ingredients.length; ii++) {
        var ingP = ingredients[ii];
        var pfs = ingP && ingP.pairs_with_foods;
        if (!Array.isArray(pfs)) continue;
        for (var pi = 0; pi < pfs.length; pi++) {
          if (matchFoodPairing(lineKey, lineToks, { name: pfs[pi] })) {
            add(ingP.id, 2);
            matchedSpiceIds.push(ingP.id);
            break;
          }
        }
      }
    }

    for (var ap in apparentSet) {
      if (!Object.prototype.hasOwnProperty.call(apparentSet, ap)) continue;
      var apIng = byId[ap];
      if (!apIng) continue;
      var apRefs = harmonyRefs(apIng);
      for (var ah = 0; ah < apRefs.length; ah++) {
        var brid = seasonId(apRefs[ah]);
        add(brid, 1.45);
      }
    }

    var recipeLines = lines;
    var list = [];
    for (var id in scores) {
      if (!Object.prototype.hasOwnProperty.call(scores, id)) continue;
      if (recipeAlreadyHasSpice(recipeLines, id)) continue;
      var ob = byId[id];
      if (!ob) continue;
      list.push({
        id: id,
        name: ob.name || id,
        score: scores[id],
        groups: Array.isArray(ob.aroma_groups) ? ob.aroma_groups.slice() : [],
      });
    }
    list.sort(function (a, b) {
      return b.score - a.score || a.name.localeCompare(b.name);
    });

    var apparentProfiles = [];
    for (var aid in apparentSet) {
      if (!Object.prototype.hasOwnProperty.call(apparentSet, aid)) continue;
      var ob = byId[aid];
      if (ob) apparentProfiles.push({ id: aid, name: ob.name || aid });
    }
    apparentProfiles.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    return {
      suggestions: list.slice(0, 24),
      matchedSpiceIds: matchedSpiceIds.filter(function (v, idx, a) {
        return a.indexOf(v) === idx;
      }),
      apparentProfiles: apparentProfiles,
    };
  }

  function heatTimingLineForSpice(id) {
    var ing = byId[id];
    if (!ing || !ing.heat_behavior) return '';
    var a = ing.heat_behavior.a;
    if (!a || typeof a !== 'string') return '';
    a = a.replace(/\s+/g, ' ').trim();
    if (a.length > 140) a = a.slice(0, 137) + '…';
    return a;
  }

  function enhancementBlockHtml(data) {
    var parts = [];
    var apps = data.apparentProfiles || [];
    if (apps.length) {
      var names = apps
        .slice(0, 5)
        .map(function (p) {
          return (
            '<a class="aroma-hint-inline-spice" href="' +
            aromaPageHrefForSpice(p.id) +
            '">' +
            escHtml(p.name) +
            '</a>'
          );
        })
        .join(', ');
      parts.push(
        '<p class="aroma-hint-profiles"><strong>Indexed as spices/herbs:</strong> ' +
          names +
          (apps.length > 5 ? ' …' : '') +
          '. <span class="aroma-hint-profiles-sub">Partners below include harmony picks that go with these.</span></p>'
      );
    }
    var top = data.suggestions && data.suggestions[0];
    if (top) {
      var heat = heatTimingLineForSpice(top.id);
      if (heat) {
        parts.push(
          '<p class="aroma-hint-timing"><strong>Heat note</strong> (' +
            escHtml(top.name) +
            '): <span>' +
            escHtml(heat) +
            '</span> — <a href="' +
            aromaPageHrefForSpice(top.id) +
            '">full profile</a></p>'
        );
      }
    }
    return parts.length ? '<div class="aroma-hint-enhance">' + parts.join('') + '</div>' : '';
  }

  function groupBadgesHtml(groups) {
    if (!groups || !groups.length) return '';
    var parts = [];
    for (var g = 0; g < Math.min(groups.length, 3); g++) {
      var n = groups[g];
      parts.push('<span class="aroma-group-badge aroma-g' + String(n) + '">G' + String(n) + '</span>');
    }
    return parts.join('');
  }

  function aromaPageHrefForSpice(id) {
    return 'aroma.html?spice=' + encodeURIComponent(id);
  }

  function seasoningSectionHtml(lines, opts) {
    opts = opts || {};
    var idSuffix = opts.idSuffix || '';
    var wrapId = 'aromaHintsWrap' + idSuffix;
    var openAttr = opts.openByDefault ? ' data-aroma-details-open="1"' : '';
    return (
      '<div class="aroma-hint-block" id="' +
      wrapId +
      '" data-aroma-hint-wrap="1"' +
      openAttr +
      '>' +
      '<div class="aroma-hint-loading">Loading seasoning ideas…</div>' +
      '</div>'
    );
  }

  function fillHintWrap(wrapEl, lines, recipe) {
    if (!wrapEl) return;
    ensureLoaded()
      .then(function () {
        var data = buildSuggestions(lines);
        var limit = compactTopN(wrapEl);
        var top = data.suggestions.slice(0, limit);
        var openTag = wrapEl.getAttribute('data-aroma-details-open') === '1' ? ' open' : '';
        if (!top.length) {
          wrapEl.innerHTML =
            '<details class="aroma-hint-details"' +
            openTag +
            '>' +
            '<summary class="aroma-hint-summary">Seasoning &amp; aroma enhancement</summary>' +
            '<p class="aroma-hint-empty">No matches in the Aroma Bible index for these ingredients. Try <a href="aroma.html">Aroma lookup</a>.</p>' +
            '</details>';
          return;
        }
        var names = top
          .slice(0, 8)
          .map(function (s) {
            return s.name;
          })
          .join(', ');
        var chips = top
          .slice(0, 12)
          .map(function (s) {
            return (
              '<a class="aroma-hint-chip" href="' +
              aromaPageHrefForSpice(s.id) +
              '">' +
              escHtml(s.name) +
              groupBadgesHtml(s.groups) +
              '</a>'
            );
          })
          .join('');
        var enhance = enhancementBlockHtml(data);
        wrapEl.innerHTML =
          '<details class="aroma-hint-details"' +
          openTag +
          '>' +
          '<summary class="aroma-hint-summary">Seasoning &amp; aroma enhancement <span class="aroma-hint-teaser">— ' +
          escHtml(names) +
          '</span></summary>' +
          enhance +
          '<p class="aroma-hint-intro">Suggestions combine food appendix rows, ingredient↔spice matches, and harmony partners of spices already in your list. Tap a spice for heat behavior and pairings.</p>' +
          '<div class="aroma-hint-chips">' +
          chips +
          '</div>' +
          '<p class="aroma-hint-more"><a href="aroma.html">Open Aroma lookup →</a></p>' +
          '</details>';
        appendFlavorExtras(wrapEl, lines, recipe);
      })
      .catch(function () {
        wrapEl.innerHTML =
          '<details class="aroma-hint-details"><summary class="aroma-hint-summary">Seasoning ideas</summary>' +
          '<p class="aroma-hint-empty">Could not load aroma data.</p></details>';
      });
  }

  function compactTopN(el) {
    var c = el && el.getAttribute('data-aroma-compact');
    return c === '1' ? 6 : 12;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * After injecting HTML that includes [data-aroma-hint-wrap], call with modal root and recipe.
   */
  function hydrateModal(root, recipe) {
    if (!root || !recipe) return;
    var lines = recipeLinesForHints(recipe);
    var wrap = root.querySelector('[data-aroma-hint-wrap]');
    if (!wrap) return;
    fillHintWrap(wrap, lines, recipe);
  }

  function addRecipePanelHtml() {
    return (
      '<div class="aroma-add-panel" data-aroma-add-panel="1">' +
      '<div class="aroma-add-panel-inner"><span class="aroma-hint-loading">Seasoning suggestions…</span></div>' +
      '</div>'
    );
  }

  function fillAddRecipePanel(panelEl, getLines, onAdd) {
    if (!panelEl) return;
    var inner = panelEl.querySelector('.aroma-add-panel-inner');
    if (!inner) return;
    var lines = typeof getLines === 'function' ? getLines() : getLines || [];
    ensureLoaded()
      .then(function () {
        var data = buildSuggestions(lines);
        var top = data.suggestions.slice(0, 10);
        if (!top.length) {
          inner.innerHTML =
            '<details class="aroma-add-details"><summary>Seasoning suggestions</summary>' +
            '<p class="aroma-hint-empty">No suggestions yet — add a few ingredients.</p></details>';
          return;
        }
        var btns = top
          .map(function (s) {
            return (
              '<button type="button" class="aroma-suggest-btn" data-aroma-add-id="' +
              escHtml(s.id) +
              '" data-aroma-add-name="' +
              escHtml(s.name) +
              '">' +
              '<span class="aroma-suggest-name">' +
              escHtml(s.name) +
              '</span>' +
              groupBadgesHtml(s.groups) +
              '</button>'
            );
          })
          .join('');
        inner.innerHTML =
          '<details class="aroma-add-details">' +
          '<summary>Seasoning suggestions</summary>' +
          '<p class="aroma-hint-intro">Based on your ingredient list. Tap to add (pinch / to taste).</p>' +
          '<div class="aroma-suggest-btns">' +
          btns +
          '</div>' +
          '</details>';
        inner.querySelectorAll('[data-aroma-add-id]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-aroma-add-id');
            var name = btn.getAttribute('data-aroma-add-name');
            if (onAdd) onAdd(id, name, btn);
          });
        });
      })
      .catch(function () {
        inner.innerHTML = '';
      });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments;
      var th = this;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(th, a);
      }, ms);
    };
  }

  function getRecipeEnhancement(recipe) {
    return ensureLoaded().then(function () {
      var lines = recipeLinesForHints(recipe);
      return Object.assign({ hintLines: lines }, buildSuggestions(lines));
    });
  }

  global.KuschiAromaHints = {
    ING_URL: ING_URL,
    FOOD_URL: FOOD_URL,
    ensureLoaded: ensureLoaded,
    normKey: normKey,
    recipeMetaLines: recipeMetaLines,
    recipeLinesForHints: recipeLinesForHints,
    buildSuggestions: buildSuggestions,
    getRecipeEnhancement: getRecipeEnhancement,
    foodPairingMatchesQuery: foodPairingMatchesQuery,
    ingredientFoodPhraseMatchesQuery: ingredientFoodPhraseMatchesQuery,
    seasoningSectionHtml: seasoningSectionHtml,
    hydrateModal: hydrateModal,
    addRecipePanelHtml: addRecipePanelHtml,
    fillAddRecipePanel: fillAddRecipePanel,
    debounce: debounce,
    aromaPageHrefForSpice: aromaPageHrefForSpice,
    escHtml: escHtml,
  };
})(typeof window !== 'undefined' ? window : this);
