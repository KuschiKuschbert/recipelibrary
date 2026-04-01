/**
 * Aroma Bible data: recipe seasoning suggestions, modal hints, add-recipe panel.
 * Depends on aroma_data/ingredients_modal_core.json + food_pairings.json (static fetch).
 * Regenerate core from ingredients.json: node scripts/build_aroma_modal_data.mjs
 *
 * German (and other) strings in SEARCH_SYNONYMS / hint maps are for recall only —
 * they are not shown as primary UI labels; displayed names come from JSON `name`.
 */
(function (global) {
  /**
   * Run fn after the current task and at least one paint opportunity so taps/scroll/input
   * are not stuck behind ensureLoaded().then → buildSuggestions → innerHTML.
   */
  function deferAromaDomWork(fn) {
    function run() {
      try {
        fn();
      } catch (e) {
        if (typeof console !== 'undefined' && console.warn) console.warn('[aroma-hints]', e);
      }
    }
    if (ingredients && foodPairings) {
      global.setTimeout(run, 0);
      return;
    }
    global.setTimeout(function () {
      var sch = global.scheduler;
      if (sch && typeof sch.yield === 'function') {
        sch.yield().then(run).catch(run);
        return;
      }
      if (typeof global.requestAnimationFrame === 'function') {
        global.requestAnimationFrame(function () {
          global.requestAnimationFrame(run);
        });
        return;
      }
      global.setTimeout(run, 0);
    }, 0);
  }

  var ING_URL = 'aroma_data/ingredients_modal_core.json';
  var FOOD_URL = 'aroma_data/food_pairings.json';
  /** Slim ~120KB vs full unified ~1.9MB; modal “More flavour” only. */
  var UNIFIED_URL = 'combined_data/ingredients_unified_modal.json';
  var CUISINE_URL = 'sfah_data/cuisine_profiles.json';
  /** Fetch timeouts so slow networks never leave spinners stuck indefinitely */
  var FETCH_TIMEOUT_AROMA_MS = 15000;
  var FETCH_TIMEOUT_UNIFIED_MS = 20000;

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

  function fetchJsonWithTimeout(url, timeoutMs) {
    var ctrl = new AbortController();
    var tid = setTimeout(function () {
      ctrl.abort();
    }, timeoutMs);
    return fetch(url, { signal: ctrl.signal })
      .finally(function () {
        clearTimeout(tid);
      })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load ' + url);
        return r.json();
      });
  }

  /**
   * Fetch JSON but parse on a later macrotask so response handling does not block input/paint
   * in the same turn as the network completion microtask.
   */
  function fetchJsonTextParseDeferred(url, timeoutMs) {
    var ctrl = new AbortController();
    var tid = setTimeout(function () {
      ctrl.abort();
    }, timeoutMs);
    return fetch(url, { signal: ctrl.signal })
      .finally(function () {
        clearTimeout(tid);
      })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load ' + url);
        return r.text();
      })
      .then(function (text) {
        return new Promise(function (resolve, reject) {
          global.setTimeout(function () {
            try {
              resolve(JSON.parse(text));
            } catch (err) {
              reject(err);
            }
          }, 0);
        });
      });
  }

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

  function ensureUnifiedLoaded() {
    if (unifiedFlavors) return Promise.resolve({ unified: unifiedFlavors, cuisine: cuisineMap });
    if (unifiedPromise) return unifiedPromise;
    unifiedPromise = Promise.all([
      fetchJsonWithTimeout(UNIFIED_URL, FETCH_TIMEOUT_UNIFIED_MS),
      fetchJsonWithTimeout(CUISINE_URL, FETCH_TIMEOUT_UNIFIED_MS).catch(function () {
        return {};
      }),
    ])
      .then(function (pair) {
        var parsed = parseUnifiedPayload(pair[0]);
        unifiedFlavors = parsed.ingredients;
        if (parsed.kitchen_context && parsed.kitchen_context.cuisine_map && typeof parsed.kitchen_context.cuisine_map === 'object') {
          cuisineMap = parsed.kitchen_context.cuisine_map;
        } else {
          cuisineMap = pair[1] && typeof pair[1] === 'object' ? pair[1] : {};
        }
        unifiedByNormName = Object.create(null);
        for (var ui = 0; ui < unifiedFlavors.length; ui++) {
          var row = unifiedFlavors[ui];
          var unn = normKey(row.name || '');
          if (unn.length >= 2) unifiedByNormName[unn] = row;
        }
        return { unified: unifiedFlavors, cuisine: cuisineMap };
      })
      .catch(function (e) {
        unifiedPromise = null;
        throw e;
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
    if (recipe) {
      var ins = recipe.instructions;
      if (ins == null && Array.isArray(recipe.method_steps)) ins = recipe.method_steps;
      if (ins == null && Array.isArray(recipe.service)) ins = recipe.service;
      if (ins != null) instText = Array.isArray(ins) ? ins.join(' ') : String(ins);
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
      ? '<p class="kuschi-flavor-subs"><strong>Substitutes</strong>: ' +
        escHtml(subs.slice(0, 6).join(', ')) +
        '</p>'
      : '';

    return (
      '<div class="kuschi-flavor-extras">' +
      '<p class="kuschi-flavor-heading">Substitutes, tastes &amp; cuisine ideas</p>' +
      (tasteBadges ? '<div class="kuschi-taste-row">' + tasteBadges + '</div>' : '') +
      (clash.length
        ? '<div class="kuschi-flavor-clash"><strong>Watch out</strong>: ' +
          escHtml(clash.slice(0, 5).join(' · ')) +
          '</div>'
        : '') +
      subHtml +
      methodTip +
      (pivotOpts
        ? '<div class="kuschi-pivot"><label for="kuschiPivotSel">Cuisine pivot</label> ' +
          '<select id="kuschiPivotSel" class="kuschi-pivot-sel"><option value="">—</option>' +
          pivotOpts +
          '</select>' +
          '<div class="kuschi-pivot-out" id="kuschiPivotOut"></div></div>'
        : '') +
      '<p class="kuschi-flavor-more"><a href="flavor.html">Open Flavor explorer →</a></p>' +
      '</div>'
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
      var fats = Array.isArray(p.fats) ? p.fats.join(', ') : '';
      var acids = Array.isArray(p.acids) ? p.acids.join(', ') : '';
      var salt = Array.isArray(p.salt) ? p.salt.join(', ') : '';
      var lines = [];
      if (fats) lines.push('Fats: ' + fats);
      if (acids) lines.push('Acids: ' + acids);
      if (salt) lines.push('Salt: ' + salt);
      out.textContent = lines.join('\n');
    });
  }

  function wireLazyFlavorExtras(wrapEl, lines, recipe) {
    var det = wrapEl.querySelector('[data-kuschi-more-flavor]');
    if (!det) return;

    function attemptLoad() {
      var st = det.getAttribute('data-kuschi-flavor-state') || 'idle';
      if (st === 'loading' || st === 'done') return;
      det.setAttribute('data-kuschi-flavor-state', 'loading');
      var loadingP = document.createElement('p');
      loadingP.className = 'aroma-hint-loading kuschi-flavor-loading';
      loadingP.setAttribute('aria-live', 'polite');
      loadingP.textContent = 'Loading flavour book data…';
      det.appendChild(loadingP);
      ensureUnifiedLoaded()
        .then(function (data) {
          if (loadingP.parentNode) loadingP.parentNode.removeChild(loadingP);
          if (!data.unified || !data.unified.length) {
            det.setAttribute('data-kuschi-flavor-state', 'done');
            var empty = document.createElement('p');
            empty.className = 'aroma-hint-empty';
            empty.innerHTML = 'No flavour book data available. <a href="flavor.html">Open Flavor explorer</a>';
            det.appendChild(empty);
            return;
          }
          var html = buildFlavorExtrasHtml(recipe, lines, data.unified, data.cuisine);
          if (!html) {
            det.setAttribute('data-kuschi-flavor-state', 'done');
            var em = document.createElement('p');
            em.className = 'aroma-hint-empty';
            em.textContent = 'No extra matches for these ingredients in the book.';
            det.appendChild(em);
            return;
          }
          var div = document.createElement('div');
          div.innerHTML = html;
          while (div.firstChild) det.appendChild(div.firstChild);
          wirePivotSelect(det, data.cuisine);
          det.setAttribute('data-kuschi-flavor-state', 'done');
        })
        .catch(function () {
          if (loadingP.parentNode) loadingP.parentNode.removeChild(loadingP);
          det.setAttribute('data-kuschi-flavor-state', 'error');
          var errP = document.createElement('p');
          errP.className = 'aroma-hint-empty kuschi-flavor-load-err';
          errP.innerHTML =
            'Couldn’t load flavour data (timeout or network). <a href="flavor.html">Open Flavor explorer</a> · <button type="button" class="kuschi-flavor-retry">Try again</button>';
          det.appendChild(errP);
          var btn = errP.querySelector('.kuschi-flavor-retry');
          if (btn) {
            btn.addEventListener('click', function (e) {
              e.preventDefault();
              errP.remove();
              det.setAttribute('data-kuschi-flavor-state', 'idle');
              attemptLoad();
            });
          }
        });
    }

    det.addEventListener('toggle', function () {
      if (!det.open) return;
      var st = det.getAttribute('data-kuschi-flavor-state') || 'idle';
      if (st === 'done' || st === 'loading') return;
      if (st === 'error') {
        det.querySelectorAll('.kuschi-flavor-load-err').forEach(function (n) {
          n.remove();
        });
        det.setAttribute('data-kuschi-flavor-state', 'idle');
      }
      attemptLoad();
    });
  }

  function ensureLoaded() {
    if (ingredients && foodPairings) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = Promise.all([
      fetchJsonTextParseDeferred(ING_URL, FETCH_TIMEOUT_AROMA_MS),
      fetchJsonTextParseDeferred(FOOD_URL, FETCH_TIMEOUT_AROMA_MS),
    ])
      .then(function (pair) {
        ingredients = pair[0];
        foodPairings = pair[1];
        return new Promise(function (resolve, reject) {
          global.setTimeout(function () {
            try {
              byId = Object.create(null);
              for (var i = 0; i < ingredients.length; i++) {
                var ing = ingredients[i];
                if (ing && ing.id) byId[ing.id] = ing;
              }
              resolve();
            } catch (err) {
              reject(err);
            }
          }, 0);
        });
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
    var elms = recipe && recipe.elements;
    if (Array.isArray(elms)) {
      for (var ei = 0; ei < elms.length; ei++) {
        var ev = elms[ei];
        if (typeof ev === 'string' && ev.trim()) out.push({ item: ev.trim() });
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

  function accumulateSuggestionLine(L, lines, add, matchedSpiceIds, apparentSet) {
    var raw = lines[L].item;
    var lineKey = normKey(raw);
    var lineToks = tokens(raw);
    if (!lineKey) return;

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

  function finalizeSuggestionResult(lines, scores, matchedSpiceIds, apparentSet) {
    function add(id, delta) {
      if (!id || !byId[id]) return;
      scores[id] = (scores[id] || 0) + delta;
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
      var ob2 = byId[aid];
      if (ob2) apparentProfiles.push({ id: aid, name: ob2.name || aid });
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

  /** Hint lines processed per animation frame so the main thread can handle input between chunks. */
  var MODAL_HINT_LINES_PER_FRAME = 3;
  /** At or below this count, run matching in one task (avoids many rAF turns on typical recipes). */
  var MODAL_HINT_SYNC_LINE_THRESHOLD = 20;

  function scheduleAromaFillPaint(fn) {
    if (typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(fn);
    } else {
      global.setTimeout(fn, 0);
    }
  }

  /**
   * @param {Array<{item:string}>} lines
   * @param {function({ suggestions: Array, matchedSpiceIds: Array, apparentProfiles: Array })} done
   */
  function buildSuggestionsChunked(lines, done) {
    if (!ingredients || !foodPairings) {
      done({ suggestions: [], matchedSpiceIds: [], apparentProfiles: [] });
      return;
    }
    var n = lines.length;
    if (n <= MODAL_HINT_SYNC_LINE_THRESHOLD) {
      done(buildSuggestions(lines));
      return;
    }
    var scores = Object.create(null);
    var matchedSpiceIds = [];
    var apparentSet = Object.create(null);
    function add(id, delta) {
      if (!id || !byId[id]) return;
      scores[id] = (scores[id] || 0) + delta;
    }
    var L = 0;
    function step() {
      var end = Math.min(L + MODAL_HINT_LINES_PER_FRAME, n);
      for (; L < end; L++) {
        accumulateSuggestionLine(L, lines, add, matchedSpiceIds, apparentSet);
      }
      if (L < n) {
        if (typeof global.requestAnimationFrame === 'function') {
          global.requestAnimationFrame(step);
        } else {
          global.setTimeout(step, 0);
        }
      } else {
        done(finalizeSuggestionResult(lines, scores, matchedSpiceIds, apparentSet));
      }
    }
    step();
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
      accumulateSuggestionLine(L, lines, add, matchedSpiceIds, apparentSet);
    }
    return finalizeSuggestionResult(lines, scores, matchedSpiceIds, apparentSet);
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
    if (opts.modalPopover) {
      return (
        '<div class="aroma-hint-block aroma-hint-block--popover" id="' +
        wrapId +
        '" data-aroma-hint-wrap="1" data-aroma-hint-popover-mode="1">' +
        '<p class="aroma-hint-popover-row">' +
        '<button type="button" class="aroma-hint-popover-btn" data-aroma-hint-popover-trigger="1" aria-expanded="false" aria-haspopup="dialog">' +
        'More seasoning tips' +
        '</button>' +
        '<span class="aroma-hint-popover-hint"> — Aroma index suggestions</span>' +
        '</p>' +
        '<div class="aroma-hint-popover-panel" data-aroma-hint-popover-panel="1" hidden role="dialog" aria-label="Seasoning tips">' +
        '<div class="aroma-hint-popover-head">' +
        '<span>Seasoning tips</span>' +
        '<button type="button" class="aroma-hint-popover-close" data-aroma-hint-popover-close="1" aria-label="Close">×</button>' +
        '</div>' +
        '<div data-aroma-hint-body="1">' +
        '<p class="aroma-hint-empty aroma-hint-popover-placeholder">Tap the button above to load suggestions.</p>' +
        '</div></div></div>'
      );
    }
    var wantOpen = !!opts.openByDefault;
    var detailsOpenAttr = wantOpen ? ' open' : '';
    var summaryText = wantOpen
      ? 'Seasoning ideas <span class="aroma-hint-summary-status" aria-live="polite">Loading tips…</span>'
      : 'Seasoning ideas';
    var lazyAttr = wantOpen ? '' : ' data-aroma-hint-lazy="1"';
    var bodyWhenClosed =
      '<p class="aroma-hint-empty aroma-hint-lazy-intro">Open for seasoning ideas from the Aroma index.</p>';
    var bodyWhenOpen =
      '<div class="aroma-hint-body-loading">' +
      '<div class="loader aroma-hint-loader" aria-hidden="true"></div>' +
      '<span>Matching your ingredients to the Aroma index…</span>' +
      '</div>';
    var bodyInner = wantOpen ? bodyWhenOpen : bodyWhenClosed;
    return (
      '<div class="aroma-hint-block" id="' +
      wrapId +
      '" data-aroma-hint-wrap="1" data-aroma-details-open="' +
      (wantOpen ? '1' : '0') +
      '"' +
      lazyAttr +
      '>' +
      '<details class="aroma-hint-details"' +
      detailsOpenAttr +
      '>' +
      '<summary class="aroma-hint-summary">' +
      summaryText +
      '</summary>' +
      '<div data-aroma-hint-body="1">' +
      bodyInner +
      '</div></details></div>'
    );
  }

  function syncAromaDetailsOpen(wrapEl, detailsEl) {
    if (!detailsEl || !wrapEl) return;
    if (wrapEl.getAttribute('data-aroma-details-open') === '1') {
      detailsEl.setAttribute('open', '');
    } else {
      detailsEl.removeAttribute('open');
    }
  }

  function fillHintWrap(wrapEl, lines, recipe) {
    if (!wrapEl) return;
    var popoverMode = wrapEl.getAttribute('data-aroma-hint-popover-mode') === '1';
    var detailsEl = wrapEl.querySelector('.aroma-hint-details');
    var bodyEl = wrapEl.querySelector('[data-aroma-hint-body]');
    var summaryEl = detailsEl ? detailsEl.querySelector('.aroma-hint-summary') : null;

    function applyErrorBody(msgHtml) {
      if (summaryEl) summaryEl.textContent = 'Seasoning ideas';
      if (bodyEl) bodyEl.innerHTML = '<p class="aroma-hint-empty">' + msgHtml + '</p>';
      if (detailsEl) syncAromaDetailsOpen(wrapEl, detailsEl);
      if (popoverMode) {
        try {
          wrapEl.dispatchEvent(new CustomEvent('kuschi-aroma-popover-did-fill', { bubbles: false }));
        } catch (e) {}
      }
    }

    ensureLoaded()
      .then(function () {
        deferAromaDomWork(function () {
          if (!wrapEl.isConnected) return;
          buildSuggestionsChunked(lines, function (data) {
            if (!wrapEl.isConnected) return;
            var detailsEl2 = wrapEl.querySelector('.aroma-hint-details');
            var bodyEl2 = wrapEl.querySelector('[data-aroma-hint-body]');
            var summaryEl2 = detailsEl2 ? detailsEl2.querySelector('.aroma-hint-summary') : null;
            var pop = wrapEl.getAttribute('data-aroma-hint-popover-mode') === '1';
            var limit = compactTopN(wrapEl);
            var displayN = Math.min(limit, 6);
            var top = data.suggestions.slice(0, displayN);
            if (!bodyEl2 || (!pop && !detailsEl2)) {
              return;
            }
            scheduleAromaFillPaint(function () {
              if (!wrapEl.isConnected) return;
              detailsEl2 = wrapEl.querySelector('.aroma-hint-details');
              bodyEl2 = wrapEl.querySelector('[data-aroma-hint-body]');
              summaryEl2 = detailsEl2 ? detailsEl2.querySelector('.aroma-hint-summary') : null;
              pop = wrapEl.getAttribute('data-aroma-hint-popover-mode') === '1';
              if (!bodyEl2 || (!pop && !detailsEl2)) return;
              if (!top.length) {
                if (summaryEl2) summaryEl2.textContent = 'Seasoning ideas';
                bodyEl2.innerHTML =
                  '<p class="aroma-hint-empty">No matches in the Aroma Bible for these ingredients. Try <a href="aroma.html">Aroma lookup</a>.</p>';
                if (detailsEl2) syncAromaDetailsOpen(wrapEl, detailsEl2);
                if (pop) {
                  try {
                    wrapEl.dispatchEvent(new CustomEvent('kuschi-aroma-popover-did-fill', { bubbles: false }));
                  } catch (e) {}
                }
                return;
              }
              var chips = top
                .map(function (s) {
                  return (
                    '<a class="aroma-hint-chip" href="' +
                    aromaPageHrefForSpice(s.id) +
                    '">' +
                    escHtml(s.name) +
                    '</a>'
                  );
                })
                .join('');
              if (summaryEl2) summaryEl2.textContent = 'Seasoning ideas';
              bodyEl2.innerHTML =
                '<div class="aroma-hint-chips">' +
                chips +
                '</div>' +
                '<p class="aroma-hint-more"><a href="aroma.html">Open Aroma lookup →</a></p>' +
                '<details class="kuschi-more-flavor-details" data-kuschi-more-flavor="1" data-kuschi-flavor-state="idle">' +
                '<summary class="kuschi-more-flavor-summary">More flavour &amp; pairing notes</summary>' +
                '<p class="kuschi-flavor-lazy-intro">Substitutes, taste balance, and cuisine ideas from the flavour book. Opens on demand (~2&nbsp;MB the first time).</p>' +
                '</details>';
              wireLazyFlavorExtras(wrapEl, lines, recipe);
              if (detailsEl2) syncAromaDetailsOpen(wrapEl, detailsEl2);
              if (pop) {
                try {
                  wrapEl.dispatchEvent(new CustomEvent('kuschi-aroma-popover-did-fill', { bubbles: false }));
                } catch (e) {}
              }
            });
          });
        });
      })
      .catch(function () {
        if (!bodyEl) {
          wrapEl.innerHTML =
            '<details class="aroma-hint-details"><summary class="aroma-hint-summary">Seasoning ideas</summary>' +
            '<div data-aroma-hint-body="1"><p class="aroma-hint-empty">Couldn’t load aroma data (timeout or network). <a href="aroma.html">Aroma lookup</a></p></div></details>';
          return;
        }
        applyErrorBody(
          'Couldn’t load aroma data (timeout or network). <a href="aroma.html">Aroma lookup</a>'
        );
      });
  }

  function installAromaPopoverHandlers(wrap, lines, recipe) {
    var trigger = wrap.querySelector('[data-aroma-hint-popover-trigger]');
    var panel = wrap.querySelector('[data-aroma-hint-popover-panel]');
    var closeBtn = wrap.querySelector('[data-aroma-hint-popover-close]');
    if (!trigger || !panel) return;
    var filled = false;
    var modalScrollEl = null;

    function clearPanelPosition() {
      panel.style.position = '';
      panel.style.left = '';
      panel.style.top = '';
      panel.style.right = '';
      panel.style.bottom = '';
      panel.style.width = '';
      panel.style.maxHeight = '';
      panel.style.zIndex = '';
    }

    function syncPanelPosition() {
      if (panel.hidden) return;
      var r = trigger.getBoundingClientRect();
      var pad = 12;
      var vw = global.innerWidth;
      var vh = global.innerHeight;
      var w = Math.min(Math.max(220, r.width), vw - 2 * pad);
      var left = r.left + (r.width - w) / 2;
      if (left < pad) left = pad;
      if (left + w > vw - pad) left = vw - pad - w;
      var gap = 8;
      var topBelow = r.bottom + gap;
      var spaceBelow = vh - topBelow - pad;
      var maxH = Math.min(420, Math.max(140, spaceBelow));
      var top;
      if (spaceBelow >= 160 || r.bottom < vh * 0.45) {
        top = topBelow;
        panel.style.maxHeight = maxH + 'px';
      } else {
        maxH = Math.min(420, Math.max(140, r.top - pad - gap));
        top = Math.max(pad, r.top - gap - maxH);
        panel.style.maxHeight = maxH + 'px';
      }
      panel.style.position = 'fixed';
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      panel.style.width = w + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.zIndex = '10050';
    }

    function onResizeOrScroll() {
      syncPanelPosition();
    }

    function closePopover() {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onDocClick, true);
      global.removeEventListener('resize', onResizeOrScroll);
      if (modalScrollEl) {
        modalScrollEl.removeEventListener('scroll', onResizeOrScroll);
        modalScrollEl = null;
      }
      clearPanelPosition();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') closePopover();
    }

    function onDocClick(e) {
      if (!wrap.contains(e.target)) closePopover();
    }

    function openPopover() {
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('click', onDocClick, true);
      modalScrollEl = wrap.closest('.modal');
      global.addEventListener('resize', onResizeOrScroll);
      if (modalScrollEl) modalScrollEl.addEventListener('scroll', onResizeOrScroll, { passive: true });
      syncPanelPosition();
      global.requestAnimationFrame(syncPanelPosition);
      if (!filled) {
        filled = true;
        var bodyEl = wrap.querySelector('[data-aroma-hint-body]');
        if (bodyEl) {
          bodyEl.innerHTML =
            '<div class="aroma-hint-body-loading">' +
            '<div class="loader aroma-hint-loader" aria-hidden="true"></div>' +
            '<span>Matching your ingredients to the Aroma index…</span>' +
            '</div>';
        }
        fillHintWrap(wrap, lines, recipe);
      }
    }

    wrap.addEventListener('kuschi-aroma-popover-did-fill', syncPanelPosition);

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (panel.hidden) {
        openPopover();
      } else {
        closePopover();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closePopover();
      });
    }
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
   * Popover mode: load suggestions on first open of the tips panel.
   * When data-aroma-hint-lazy="1" and details starts closed, defer fillHintWrap until first open.
   */
  function hydrateModal(root, recipe) {
    if (!root || !recipe) return;
    var lines = recipeLinesForHints(recipe);
    var wrap = root.querySelector('[data-aroma-hint-wrap]');
    if (!wrap) return;
    if (wrap.getAttribute('data-aroma-hint-popover-mode') === '1') {
      installAromaPopoverHandlers(wrap, lines, recipe);
      return;
    }
    var details = wrap.querySelector('.aroma-hint-details');
    if (wrap.getAttribute('data-aroma-hint-lazy') === '1' && details && !details.open) {
      function onLazyToggle() {
        if (!details.open) return;
        details.removeEventListener('toggle', onLazyToggle);
        wrap.removeAttribute('data-aroma-hint-lazy');
        var bodyEl = wrap.querySelector('[data-aroma-hint-body]');
        if (bodyEl) {
          bodyEl.innerHTML =
            '<div class="aroma-hint-body-loading">' +
            '<div class="loader aroma-hint-loader" aria-hidden="true"></div>' +
            '<span>Matching your ingredients to the Aroma index…</span>' +
            '</div>';
        }
        fillHintWrap(wrap, lines, recipe);
      }
      details.addEventListener('toggle', onLazyToggle);
      return;
    }
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
        deferAromaDomWork(function () {
          if (!panelEl.isConnected) return;
          var inner2 = panelEl.querySelector('.aroma-add-panel-inner');
          if (!inner2) return;
          buildSuggestionsChunked(lines, function (data) {
            if (!panelEl.isConnected) return;
            var inner3 = panelEl.querySelector('.aroma-add-panel-inner');
            if (!inner3) return;
            var top = data.suggestions.slice(0, 10);
            if (!top.length) {
              inner3.innerHTML =
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
            inner3.innerHTML =
              '<details class="aroma-add-details">' +
              '<summary>Seasoning suggestions</summary>' +
              '<p class="aroma-hint-intro">Based on your ingredient list. Tap to add (pinch / to taste).</p>' +
              '<div class="aroma-suggest-btns">' +
              btns +
              '</div>' +
              '</details>';
            inner3.querySelectorAll('[data-aroma-add-id]').forEach(function (btn) {
              btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-aroma-add-id');
                var name = btn.getAttribute('data-aroma-add-name');
                if (onAdd) onAdd(id, name, btn);
              });
            });
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
      return new Promise(function (resolve) {
        buildSuggestionsChunked(lines, function (data) {
          resolve(Object.assign({ hintLines: lines }, data));
        });
      });
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

  /* Start aroma index fetches as soon as this script runs so the first recipe modal is less often blocked on network (~200KB). */
  ensureLoaded().catch(function () {});
})(typeof window !== 'undefined' ? window : this);
