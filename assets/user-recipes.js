/**
 * Client-side user recipes for static GitHub Pages.
 * Kitchen (index): full detail shape + index row derivation.
 * Riviera: same shape as inline RECIPES objects.
 */
(function () {
  const STORAGE_KITCHEN = 'kuschi_user_recipes_kitchen_v1';
  const STORAGE_RIVIERA = 'kuschi_user_recipes_riviera_v1';
  const STORAGE_MASTER = 'kuschi_master_ingredients_v1';
  const STORAGE_ORDER_OVERRIDES = 'kuschi_riviera_order_overrides_v1';
  const STORAGE_ORDER_EXTRAS = 'kuschi_riviera_order_extras_v1';
  const STORAGE_RIVIERA_HIDDEN_BUILTINS = 'kuschi_riviera_hidden_builtin_ids_v1';
  /** Set to '1' after one-time ingredient qty metric normalisation (Riviera page). */
  const STORAGE_RIVIERA_METRIC_MIGRATED = 'kuschi_riviera_metric_normalized_v1';
  const STORAGE_CUSTOM_BOOKS = 'kuschi_custom_kitchen_books_v1';
  const STORAGE_RIVIERA_STOCKTAKE = 'kuschi_riviera_stocktake_v1';

  const ZONE_IDS = ['freezer', 'coldroom', 'drystore', 'other'];

  function bookRecipesStorageKey(bookId) {
    return 'kuschi_book_' + String(bookId || '').trim() + '_recipes_v1';
  }

  function bookOrderOverridesStorageKey(bookId) {
    return 'kuschi_book_' + String(bookId || '').trim() + '_order_overrides_v1';
  }

  function bookOrderExtrasStorageKey(bookId) {
    return 'kuschi_book_' + String(bookId || '').trim() + '_order_extras_v1';
  }

  function bookMasterStorageKey(bookId) {
    return 'kuschi_book_' + String(bookId || '').trim() + '_master_v1';
  }

  function bookStocktakeStorageKey(bookId) {
    return 'kuschi_book_' + String(bookId || '').trim() + '_stocktake_v1';
  }

  function slugifyBookId(name) {
    var s = String(name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return s || 'kitchen';
  }

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return Array.isArray(v) ? v : fallback;
    } catch {
      return fallback;
    }
  }

  function safeParseObject(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v && typeof v === 'object' && !Array.isArray(v) ? v : fallback;
    } catch {
      return fallback;
    }
  }

  function safeParseExtraList(json) {
    try {
      const v = JSON.parse(json);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  /**
   * Regex → replacement (applied after basic normalization). Word-style aliases for order-list merge + master.
   * Extend as you hit duplicates in prep (e.g. US vs UK names).
   */
  const INGREDIENT_CANON_ALIASES = [
    [/\bkewpie\s+mayonnaise\b/g, 'kewpie mayo'],
    [/\bdill\s+fresh\b/g, 'dill'],
    [/\bfresh\s+dill\b/g, 'dill'],
    [/\bscallions?\b/g, 'spring onion'],
    [/\bgreen\s+onions?\b/g, 'spring onion'],
    [/\bspring\s+onions?\b/g, 'spring onion'],
    [/\bshallots?\b/g, 'eschalot'],
    [/\beshallots?\b/g, 'eschalot'],
    [/\bcilantro\b/g, 'coriander'],
    [/\bcoriander\s+leaves?\b/g, 'coriander'],
    [/\bground\s+beef\b/g, 'beef mince'],
    [/\bminced\s+beef\b/g, 'beef mince'],
    [/\bheavy\s+cream\b/g, 'thickened cream'],
    [/\bconfectioners\s+sugar\b/g, 'icing sugar'],
    [/\bpowdered\s+sugar\b/g, 'icing sugar'],
    [/\bkosher\s+salt\b/g, 'salt'],
    [/\bsea\s+salt\s+flakes?\b/g, 'salt flakes'],
    [/\bextra\s+virgin\s+olive\s+oil\b/g, 'olive oil'],
    [/\bevo?o\b/g, 'olive oil'],
    [/\bap\s+flour\b/g, 'plain flour'],
    [/\ball[\s-]?purpose\s+flour\b/g, 'plain flour'],
    [/\bmint\s*[—–-]\s*fresh\b/gi, 'mint'],
    [/\bfresh\s+mint\b/gi, 'mint'],
  ];

  /** Do not strip trailing “s” for these whole-token matches (false plurals / mass nouns). */
  const INGREDIENT_KEEP_TRAILING_S = new Set([
    'glass',
    'grass',
    'class',
    'brass',
    'pass',
    'cross',
    'loss',
    'boss',
    'chess',
    'dress',
    'press',
    'stress',
    'mess',
    'access',
    'success',
    'business',
    'illness',
    'happiness',
    'walrus',
    'virus',
    'campus',
    'status',
    'this',
    'us',
    'plus',
    'minus',
    'gas',
    'atlas',
  ]);

  function singularizeIngredientToken(w) {
    var x = String(w || '').trim();
    if (x.length < 3) return x;
    if (INGREDIENT_KEEP_TRAILING_S.has(x)) return x;
    if (x.length >= 5 && x.endsWith('ies')) return x.slice(0, -3) + 'y';
    if (x.length >= 6 && x.endsWith('oes')) return x.slice(0, -2);
    if (x.length >= 5 && x.endsWith('xes')) return x.slice(0, -2);
    if (x.length >= 8 && x.endsWith('ches')) return x.slice(0, -2);
    if (x.length >= 6 && x.endsWith('shes')) return x.slice(0, -2);
    if (x.length >= 4 && x.endsWith('s') && x.charAt(x.length - 2) !== 's') {
      if (x.endsWith('us') || x.endsWith('is') || x === 'this' || x === 'gas') return x;
      return x.slice(0, -1);
    }
    return x;
  }

  function applyIngredientAliases(t) {
    var s = t;
    for (var i = 0; i < INGREDIENT_CANON_ALIASES.length; i++) {
      s = s.replace(INGREDIENT_CANON_ALIASES[i][0], INGREDIENT_CANON_ALIASES[i][1]);
    }
    return s;
  }

  function singularizeIngredientPhrase(t) {
    return t
      .split(' ')
      .filter(Boolean)
      .map(singularizeIngredientToken)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Canonical key for order-list merging and master ingredient matching.
   * NFKC, & → and, dash/punct cleanup, curated aliases, conservative English plural collapse per token.
   */
  function canonicalOrderMergeKey(s) {
    var t = String(s || '').trim();
    try {
      if (t.normalize) t = t.normalize('NFKC');
    } catch (e) {
      /* ignore */
    }
    t = t.toLowerCase();
    t = t.replace(/&/g, ' and ');
    t = t.replace(/[—–\-−]/g, ' ');
    t = t.replace(/[^a-z0-9\s\u00C0-\u024F]/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    t = applyIngredientAliases(t);
    t = singularizeIngredientPhrase(t);
    return t;
  }

  function normalizeIngName(s) {
    return canonicalOrderMergeKey(s);
  }

  function loadMaster() {
    return safeParse(localStorage.getItem(STORAGE_MASTER) || '[]', []);
  }

  function saveMaster(arr) {
    localStorage.setItem(STORAGE_MASTER, JSON.stringify(arr));
  }

  /** Add or update default storage zone for an ingredient (master list). */
  function upsertMasterIngredient(name, defaultZone) {
    const raw = String(name || '').trim();
    if (!raw) return null;
    const z = ZONE_IDS.indexOf(defaultZone) >= 0 ? defaultZone : 'other';
    const display = titleCaseWords(raw);
    const list = loadMaster();
    const key = normalizeIngName(raw);
    let idx = list.findIndex(function (x) {
      return normalizeIngName(x.name) === key;
    });
    if (idx >= 0) {
      list[idx].name = display;
      list[idx].defaultZone = z;
    } else {
      list.push({ id: 'ing-' + Date.now().toString(36), name: display, defaultZone: z });
      idx = list.length - 1;
    }
    saveMaster(list);
    return list[idx];
  }

  function resolveDefaultZone(itemName) {
    const key = normalizeIngName(itemName);
    const found = loadMaster().find(function (x) {
      return normalizeIngName(x.name) === key;
    });
    return found && found.defaultZone ? found.defaultZone : 'other';
  }

  const STORAGE_ORDER_ARANCINI_COATING_SPLIT = 'kuschi_order_arancini_coating_split_v1';

  /**
   * One-time: arancini coating was one row (index 14) + eggs (15); split to flour (14), breadcrumbs (15), eggs (16).
   */
  function migrateOrderOverridesAranciniCoatingSplitIfNeeded() {
    try {
      if (localStorage.getItem(STORAGE_ORDER_ARANCINI_COATING_SPLIT) === '1') return;
    } catch (e) {
      return;
    }
    var all = safeParseObject(localStorage.getItem(STORAGE_ORDER_OVERRIDES) || '{}', {});
    if (!all['arancini::14'] && !all['arancini::15']) {
      try {
        localStorage.setItem(STORAGE_ORDER_ARANCINI_COATING_SPLIT, '1');
      } catch (e2) {
        /* ignore */
      }
      return;
    }
    var next = Object.assign({}, all);
    var eggs = next['arancini::15'];
    var coat = next['arancini::14'];
    delete next['arancini::14'];
    delete next['arancini::15'];
    if (coat != null) {
      next['arancini::14'] = Object.assign({}, coat);
      next['arancini::15'] = Object.assign({}, coat);
    }
    if (eggs != null) {
      next['arancini::16'] = Object.assign({}, eggs);
    }
    saveOrderOverrides(next);
    try {
      localStorage.setItem(STORAGE_ORDER_ARANCINI_COATING_SPLIT, '1');
    } catch (e3) {
      /* ignore */
    }
  }

  function loadOrderOverrides() {
    migrateOrderOverridesAranciniCoatingSplitIfNeeded();
    return safeParseObject(localStorage.getItem(STORAGE_ORDER_OVERRIDES) || '{}', {});
  }

  function saveOrderOverrides(obj) {
    localStorage.setItem(STORAGE_ORDER_OVERRIDES, JSON.stringify(obj));
  }

  function loadOrderExtras() {
    return safeParseExtraList(localStorage.getItem(STORAGE_ORDER_EXTRAS) || '[]');
  }

  function saveOrderExtras(arr) {
    localStorage.setItem(STORAGE_ORDER_EXTRAS, JSON.stringify(arr));
  }

  function addOrderExtra(name, zone, orderQty) {
    const list = loadOrderExtras();
    const z = ZONE_IDS.indexOf(zone) >= 0 ? zone : 'other';
    const row = {
      id: 'extra-' + Date.now().toString(36),
      name: titleCaseWords(String(name).trim()),
      zone: z,
      orderQty: String(orderQty || '').trim(),
    };
    list.push(row);
    saveOrderExtras(list);
    return row;
  }

  function updateOrderExtra(id, patch) {
    const list = loadOrderExtras();
    const idx = list.findIndex(function (x) {
      return x.id === id;
    });
    if (idx < 0) return;
    Object.assign(list[idx], patch);
    saveOrderExtras(list);
  }

  function removeOrderExtra(id) {
    saveOrderExtras(
      loadOrderExtras().filter(function (x) {
        return x.id !== id;
      })
    );
  }

  function exportMaster() {
    return JSON.stringify(loadMaster(), null, 2);
  }

  function exportOrderBundle() {
    return JSON.stringify(
      {
        masterIngredients: loadMaster(),
        orderOverrides: loadOrderOverrides(),
        orderExtras: loadOrderExtras(),
      },
      null,
      2
    );
  }

  function slugId(name) {
    const base = String(name || 'recipe')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    return 'user-' + (base || 'recipe') + '-' + Date.now().toString(36);
  }

  /** Lower rest of word after first char (ASCII letters only per segment). */
  function capitalizeWord(word) {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  /** Title case for recipe names: small words stay lower mid-phrase; hyphenated words OK. */
  function titleCaseRecipeName(s) {
    if (!s || typeof s !== 'string') return s;
    const small = new Set([
      'a', 'an', 'the', 'and', 'or', 'nor', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'from', 'as', 'by', 'per', 'vs', 'via', 'et', 'aux', 'au', 'la', 'le', 'de', 'du', 'des',
    ]);
    const words = s.trim().split(/\s+/).filter(Boolean);
    return words
      .map(function (w, i) {
        if (w === '&') return '&';
        const lower = w.toLowerCase();
        if (i > 0 && i < words.length - 1 && small.has(lower)) return lower;
        if (lower.includes('-')) {
          return lower.split('-').map(function (p) { return capitalizeWord(p); }).join('-');
        }
        return capitalizeWord(w);
      })
      .join(' ');
  }

  /** Title case every word (ingredients, elements, dietary labels). */
  function titleCaseWords(s) {
    if (!s || typeof s !== 'string') return s;
    return s
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(function (w) {
        if (w === '&') return '&';
        if (w.toLowerCase().includes('-')) {
          return w
            .split('-')
            .map(function (p) { return capitalizeWord(p); })
            .join('-');
        }
        return capitalizeWord(w);
      })
      .join(' ');
  }

  /** First alphabetic character upper; rest unchanged (good for method lines). */
  function capitalizeFirstLetter(s) {
    if (!s || typeof s !== 'string') return s;
    const t = s.trim();
    if (!t) return t;
    const idx = t.search(/[a-zA-Z]/);
    if (idx === -1) return t;
    return t.slice(0, idx) + t.charAt(idx).toUpperCase() + t.slice(idx + 1);
  }

  function normStr(s) {
    if (s == null || s === '') return null;
    const t = String(s).trim();
    return t ? t : null;
  }

  function loadKitchen() {
    return safeParse(localStorage.getItem(STORAGE_KITCHEN) || '[]', []);
  }

  function saveKitchen(list) {
    localStorage.setItem(STORAGE_KITCHEN, JSON.stringify(list));
  }

  function loadRiviera() {
    return safeParse(localStorage.getItem(STORAGE_RIVIERA) || '[]', []);
  }

  function saveRiviera(list) {
    localStorage.setItem(STORAGE_RIVIERA, JSON.stringify(list));
  }

  /**
   * One-time: normalise saved Riviera recipe ingredient qty strings to metric + pc.
   * Safe to call repeatedly; no-ops after flag is set. Requires KuschiRecipeMetric (riviera.html order).
   */
  function migrateRivieraMetricIfNeeded() {
    if (typeof window === 'undefined' || !window.KuschiRecipeMetric) return;
    try {
      if (localStorage.getItem(STORAGE_RIVIERA_METRIC_MIGRATED) === '1') return;
    } catch (e) {
      return;
    }
    var list = safeParse(localStorage.getItem(STORAGE_RIVIERA) || '[]', []);
    if (!Array.isArray(list) || list.length === 0) {
      try {
        localStorage.setItem(STORAGE_RIVIERA_METRIC_MIGRATED, '1');
      } catch (e2) {
        /* ignore */
      }
      return;
    }
    var norm = window.KuschiRecipeMetric.normalizeRivieraIngredients;
    if (typeof norm !== 'function') return;
    var out = list.map(function (r) {
      if (!r || typeof r !== 'object') return r;
      var copy = Object.assign({}, r);
      copy.ingredients = norm(JSON.parse(JSON.stringify(r.ingredients || [])));
      return copy;
    });
    saveRiviera(out);
    try {
      localStorage.setItem(STORAGE_RIVIERA_METRIC_MIGRATED, '1');
    } catch (e3) {
      /* ignore */
    }
  }

  function loadRivieraHiddenBuiltinIds() {
    return safeParse(localStorage.getItem(STORAGE_RIVIERA_HIDDEN_BUILTINS) || '[]', []);
  }

  function saveRivieraHiddenBuiltinIds(ids) {
    var seen = {};
    var out = [];
    (ids || []).forEach(function (id) {
      var s = String(id || '').trim();
      if (!s || seen[s]) return;
      seen[s] = true;
      out.push(s);
    });
    localStorage.setItem(STORAGE_RIVIERA_HIDDEN_BUILTINS, JSON.stringify(out));
  }

  function hideRivieraBuiltin(id) {
    var s = String(id || '').trim();
    if (!s) return;
    var list = loadRivieraHiddenBuiltinIds();
    if (list.indexOf(s) < 0) list.push(s);
    saveRivieraHiddenBuiltinIds(list);
  }

  function restoreAllHiddenRivieraBuiltins() {
    saveRivieraHiddenBuiltinIds([]);
  }

  function removeRivieraRecipe(id) {
    var s = String(id || '').trim();
    if (!s) return false;
    var list = loadRiviera();
    var next = list.filter(function (r) {
      return r && r.id !== s;
    });
    if (next.length === list.length) return false;
    saveRiviera(next);
    return true;
  }

  function toIndexRow(full) {
    const ing = (full.ingredients || []).map(function (i) {
      if (!i || !i.item) return '';
      var q = [i.qty, i.unit].filter(Boolean).join(' ');
      return (q ? q + ' ' : '') + i.item;
    }).filter(Boolean);
    return {
      id: full.id,
      name: full.name,
      cat: full.category || '',
      cui: full.cuisine || '',
      protein: Array.isArray(full.protein) ? full.protein : [],
      tags: Array.isArray(full.tags) ? full.tags : [],
      ing: ing,
    };
  }

  function kitchenToDetail(full) {
    return {
      id: full.id,
      name: full.name,
      cuisine: full.cuisine || null,
      category: full.category || null,
      yield: full.yield || null,
      protein: full.protein || [],
      tags: full.tags || [],
      ingredients: full.ingredients || [],
      instructions: full.instructions || [],
      source: full.source || 'user',
    };
  }

  function kitchenRecordFromPayload(payload) {
    var rawName = String(payload.name || 'Untitled').trim();
    var ingredients = (payload.ingredients || []).map(function (i) {
      if (!i || !i.item) return i;
      return {
        qty: i.qty != null && i.qty !== '' ? String(i.qty).trim() : null,
        unit: i.unit != null && i.unit !== '' ? String(i.unit).trim() : null,
        item: titleCaseWords(String(i.item).trim()),
        prep: i.prep ? titleCaseWords(String(i.prep).trim()) : null,
      };
    });
    var instructions = (payload.instructions || []).map(function (line) {
      return capitalizeFirstLetter(String(line).trim());
    }).filter(Boolean);
    return {
      id: payload.id || slugId(rawName),
      name: titleCaseRecipeName(rawName) || 'Untitled',
      yield: normStr(payload.yield),
      cuisine: payload.cuisine ? titleCaseRecipeName(normStr(payload.cuisine)) : null,
      category: payload.category ? titleCaseRecipeName(normStr(payload.category)) : null,
      protein: payload.protein || [],
      tags: payload.tags || [],
      ingredients: ingredients,
      instructions: instructions,
      source: 'user',
    };
  }

  function addKitchenRecipe(payload) {
    var list = loadKitchen();
    var rec = kitchenRecordFromPayload(payload);
    list.push(rec);
    saveKitchen(list);
    return rec;
  }

  function listCustomBooks() {
    return safeParse(localStorage.getItem(STORAGE_CUSTOM_BOOKS) || '[]', []);
  }

  function saveCustomBooksRegistry(books) {
    localStorage.setItem(STORAGE_CUSTOM_BOOKS, JSON.stringify(books || []));
  }

  function getCustomBook(bookId) {
    var id = String(bookId || '').trim();
    var books = listCustomBooks();
    for (var i = 0; i < books.length; i++) {
      if (books[i] && books[i].id === id) return books[i];
    }
    return null;
  }

  function createCustomBook(name) {
    var displayName = titleCaseRecipeName(String(name || 'Untitled').trim()) || 'Untitled';
    var base = slugifyBookId(name);
    var books = listCustomBooks();
    var id = base;
    var n = 2;
    while (books.some(function (b) { return b && b.id === id; })) {
      id = base + '-' + n;
      n++;
    }
    var entry = { id: id, name: displayName, createdAt: new Date().toISOString() };
    books.push(entry);
    saveCustomBooksRegistry(books);
    localStorage.setItem(bookRecipesStorageKey(id), '[]');
    return entry;
  }

  function deleteCustomBook(bookId) {
    var id = String(bookId || '').trim();
    if (!id) return false;
    var books = listCustomBooks();
    var next = books.filter(function (b) { return b && b.id !== id; });
    if (next.length === books.length) return false;
    saveCustomBooksRegistry(next);
    localStorage.removeItem(bookRecipesStorageKey(id));
    localStorage.removeItem(bookOrderOverridesStorageKey(id));
    localStorage.removeItem(bookOrderExtrasStorageKey(id));
    localStorage.removeItem(bookMasterStorageKey(id));
    localStorage.removeItem(bookStocktakeStorageKey(id));
    return true;
  }

  function normalizeStocktakeDoc(raw) {
    var d = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    var lines = d.lines && typeof d.lines === 'object' && !Array.isArray(d.lines) ? d.lines : {};
    var extras = Array.isArray(d.extras) ? d.extras : [];
    return { lines: lines, extras: extras };
  }

  function loadRivieraStocktake() {
    return normalizeStocktakeDoc(safeParseObject(localStorage.getItem(STORAGE_RIVIERA_STOCKTAKE) || '{}', {}));
  }

  function saveRivieraStocktake(doc) {
    var n = normalizeStocktakeDoc(doc);
    localStorage.setItem(STORAGE_RIVIERA_STOCKTAKE, JSON.stringify(n));
  }

  function patchRivieraStocktakeLine(rowId, patch) {
    var d = loadRivieraStocktake();
    var id = String(rowId || '').trim();
    if (!id) return;
    var cur = d.lines[id] && typeof d.lines[id] === 'object' ? d.lines[id] : {};
    var next = Object.assign({}, cur);
    if (patch.qty !== undefined) next.qty = String(patch.qty);
    if (patch.brand !== undefined) next.brand = String(patch.brand);
    if (patch.uom !== undefined) next.uom = String(patch.uom);
    if (patch.uomLocked !== undefined) next.uomLocked = !!patch.uomLocked;
    if (patch.brandLocked !== undefined) next.brandLocked = !!patch.brandLocked;
    if (next.qty === undefined) next.qty = '';
    if (next.brand === undefined) next.brand = '';
    if (next.uom === undefined) next.uom = '';
    if (next.uomLocked === undefined) next.uomLocked = false;
    if (next.brandLocked === undefined) next.brandLocked = false;
    d.lines[id] = next;
    saveRivieraStocktake(d);
  }

  function addRivieraStocktakeExtra(name, zone, qty, brand, uom) {
    var d = loadRivieraStocktake();
    var z = ZONE_IDS.indexOf(zone) >= 0 ? zone : 'other';
    var b = String(brand || '').trim();
    var u = String(uom || '').trim();
    var row = {
      id: 'stx-' + Date.now().toString(36),
      name: titleCaseWords(String(name).trim()),
      zone: z,
      qty: String(qty || '').trim(),
      brand: b,
      uom: u,
      uomLocked: u !== '',
      brandLocked: b !== '',
    };
    d.extras.push(row);
    saveRivieraStocktake(d);
    return row;
  }

  function updateRivieraStocktakeExtra(extraId, patch) {
    var d = loadRivieraStocktake();
    var idx = d.extras.findIndex(function (x) {
      return x && x.id === extraId;
    });
    if (idx < 0) return;
    var ex = d.extras[idx];
    if (patch.qty !== undefined) ex.qty = String(patch.qty);
    if (patch.brand !== undefined) ex.brand = String(patch.brand);
    if (patch.uom !== undefined) ex.uom = String(patch.uom);
    if (patch.uomLocked !== undefined) ex.uomLocked = !!patch.uomLocked;
    if (patch.brandLocked !== undefined) ex.brandLocked = !!patch.brandLocked;
    if (patch.name !== undefined) ex.name = titleCaseWords(String(patch.name).trim());
    if (patch.zone !== undefined) ex.zone = ZONE_IDS.indexOf(patch.zone) >= 0 ? patch.zone : 'other';
    saveRivieraStocktake(d);
  }

  function removeRivieraStocktakeExtra(extraId) {
    var d = loadRivieraStocktake();
    d.extras = d.extras.filter(function (x) {
      return x && x.id !== extraId;
    });
    saveRivieraStocktake(d);
  }

  function patchRivieraStocktakeRow(rowId, patch) {
    var id = String(rowId || '').trim();
    if (!id) return;
    if (id.indexOf('stx:') === 0) {
      updateRivieraStocktakeExtra(id.slice(4), patch);
    } else {
      patchRivieraStocktakeLine(id, patch);
    }
  }

  function clearRivieraStocktakeQuantities() {
    var d = loadRivieraStocktake();
    Object.keys(d.lines).forEach(function (k) {
      var L = d.lines[k];
      if (L && typeof L === 'object') {
        L.qty = '';
        L.brand = '';
        L.brandLocked = false;
      }
    });
    d.extras.forEach(function (ex) {
      if (ex && typeof ex === 'object') {
        ex.qty = '';
        ex.brand = '';
        ex.brandLocked = false;
      }
    });
    saveRivieraStocktake(d);
  }

  function exportRivieraStocktakeJson() {
    return JSON.stringify(loadRivieraStocktake(), null, 2);
  }

  function loadBookStocktake(bookId) {
    var id = String(bookId || '').trim();
    if (!id) return normalizeStocktakeDoc({});
    return normalizeStocktakeDoc(safeParseObject(localStorage.getItem(bookStocktakeStorageKey(id)) || '{}', {}));
  }

  function saveBookStocktake(bookId, doc) {
    var id = String(bookId || '').trim();
    if (!id) return;
    var n = normalizeStocktakeDoc(doc);
    localStorage.setItem(bookStocktakeStorageKey(id), JSON.stringify(n));
  }

  function patchBookStocktakeLine(bookId, rowId, patch) {
    var d = loadBookStocktake(bookId);
    var rid = String(rowId || '').trim();
    if (!rid) return;
    var cur = d.lines[rid] && typeof d.lines[rid] === 'object' ? d.lines[rid] : {};
    var next = Object.assign({}, cur);
    if (patch.qty !== undefined) next.qty = String(patch.qty);
    if (patch.brand !== undefined) next.brand = String(patch.brand);
    if (patch.uom !== undefined) next.uom = String(patch.uom);
    if (patch.uomLocked !== undefined) next.uomLocked = !!patch.uomLocked;
    if (patch.brandLocked !== undefined) next.brandLocked = !!patch.brandLocked;
    if (next.qty === undefined) next.qty = '';
    if (next.brand === undefined) next.brand = '';
    if (next.uom === undefined) next.uom = '';
    if (next.uomLocked === undefined) next.uomLocked = false;
    if (next.brandLocked === undefined) next.brandLocked = false;
    d.lines[rid] = next;
    saveBookStocktake(bookId, d);
  }

  function addBookStocktakeExtra(bookId, name, zone, qty, brand, uom) {
    var d = loadBookStocktake(bookId);
    var z = ZONE_IDS.indexOf(zone) >= 0 ? zone : 'other';
    var b = String(brand || '').trim();
    var u = String(uom || '').trim();
    var row = {
      id: 'stx-' + Date.now().toString(36),
      name: titleCaseWords(String(name).trim()),
      zone: z,
      qty: String(qty || '').trim(),
      brand: b,
      uom: u,
      uomLocked: u !== '',
      brandLocked: b !== '',
    };
    d.extras.push(row);
    saveBookStocktake(bookId, d);
    return row;
  }

  function updateBookStocktakeExtra(bookId, extraId, patch) {
    var d = loadBookStocktake(bookId);
    var idx = d.extras.findIndex(function (x) {
      return x && x.id === extraId;
    });
    if (idx < 0) return;
    var ex = d.extras[idx];
    if (patch.qty !== undefined) ex.qty = String(patch.qty);
    if (patch.brand !== undefined) ex.brand = String(patch.brand);
    if (patch.uom !== undefined) ex.uom = String(patch.uom);
    if (patch.uomLocked !== undefined) ex.uomLocked = !!patch.uomLocked;
    if (patch.brandLocked !== undefined) ex.brandLocked = !!patch.brandLocked;
    if (patch.name !== undefined) ex.name = titleCaseWords(String(patch.name).trim());
    if (patch.zone !== undefined) ex.zone = ZONE_IDS.indexOf(patch.zone) >= 0 ? patch.zone : 'other';
    saveBookStocktake(bookId, d);
  }

  function removeBookStocktakeExtra(bookId, extraId) {
    var d = loadBookStocktake(bookId);
    d.extras = d.extras.filter(function (x) {
      return x && x.id !== extraId;
    });
    saveBookStocktake(bookId, d);
  }

  function patchBookStocktakeRow(bookId, rowId, patch) {
    var id = String(rowId || '').trim();
    if (!id) return;
    if (id.indexOf('stx:') === 0) {
      updateBookStocktakeExtra(bookId, id.slice(4), patch);
    } else {
      patchBookStocktakeLine(bookId, id, patch);
    }
  }

  function clearBookStocktakeQuantities(bookId) {
    var d = loadBookStocktake(bookId);
    Object.keys(d.lines).forEach(function (k) {
      var L = d.lines[k];
      if (L && typeof L === 'object') {
        L.qty = '';
        L.brand = '';
        L.brandLocked = false;
      }
    });
    d.extras.forEach(function (ex) {
      if (ex && typeof ex === 'object') {
        ex.qty = '';
        ex.brand = '';
        ex.brandLocked = false;
      }
    });
    saveBookStocktake(bookId, d);
  }

  function exportBookStocktakeJson(bookId) {
    return JSON.stringify(loadBookStocktake(bookId), null, 2);
  }

  function loadBookRecipes(bookId) {
    var id = String(bookId || '').trim();
    if (!id) return [];
    return safeParse(localStorage.getItem(bookRecipesStorageKey(id)) || '[]', []);
  }

  function saveBookRecipes(bookId, list) {
    var id = String(bookId || '').trim();
    if (!id) return;
    localStorage.setItem(bookRecipesStorageKey(id), JSON.stringify(list || []));
  }

  function addBookRecipe(bookId, payload) {
    var list = loadBookRecipes(bookId);
    var rec = kitchenRecordFromPayload(payload);
    list.push(rec);
    saveBookRecipes(bookId, list);
    return rec;
  }

  function getBookRecipeById(bookId, recipeId) {
    return loadBookRecipes(bookId).find(function (r) {
      return r && r.id === recipeId;
    });
  }

  function removeBookRecipe(bookId, recipeId) {
    var list = loadBookRecipes(bookId);
    var next = list.filter(function (r) { return r && r.id !== recipeId; });
    if (next.length === list.length) return false;
    saveBookRecipes(bookId, next);
    return true;
  }

  function exportBookRecipes(bookId) {
    return JSON.stringify(loadBookRecipes(bookId), null, 2);
  }

  function loadBookMaster(bookId) {
    var id = String(bookId || '').trim();
    if (!id) return [];
    return safeParse(localStorage.getItem(bookMasterStorageKey(id)) || '[]', []);
  }

  function saveBookMaster(bookId, arr) {
    var id = String(bookId || '').trim();
    if (!id) return;
    localStorage.setItem(bookMasterStorageKey(id), JSON.stringify(arr || []));
  }

  function upsertBookMasterIngredient(bookId, name, defaultZone) {
    var raw = String(name || '').trim();
    if (!raw) return null;
    var z = ZONE_IDS.indexOf(defaultZone) >= 0 ? defaultZone : 'other';
    var display = titleCaseWords(raw);
    var list = loadBookMaster(bookId);
    var key = normalizeIngName(raw);
    var idx = list.findIndex(function (x) {
      return normalizeIngName(x.name) === key;
    });
    if (idx >= 0) {
      list[idx].name = display;
      list[idx].defaultZone = z;
    } else {
      list.push({ id: 'ing-' + Date.now().toString(36), name: display, defaultZone: z });
      idx = list.length - 1;
    }
    saveBookMaster(bookId, list);
    return list[idx];
  }

  function resolveBookDefaultZone(bookId, itemName) {
    var key = normalizeIngName(itemName);
    var found = loadBookMaster(bookId).find(function (x) {
      return normalizeIngName(x.name) === key;
    });
    return found && found.defaultZone ? found.defaultZone : 'other';
  }

  function loadBookOrderOverrides(bookId) {
    var id = String(bookId || '').trim();
    if (!id) return {};
    return safeParseObject(localStorage.getItem(bookOrderOverridesStorageKey(id)) || '{}', {});
  }

  function saveBookOrderOverrides(bookId, obj) {
    var id = String(bookId || '').trim();
    if (!id) return;
    localStorage.setItem(bookOrderOverridesStorageKey(id), JSON.stringify(obj && typeof obj === 'object' ? obj : {}));
  }

  function loadBookOrderExtras(bookId) {
    var id = String(bookId || '').trim();
    if (!id) return [];
    return safeParseExtraList(localStorage.getItem(bookOrderExtrasStorageKey(id)) || '[]');
  }

  function saveBookOrderExtras(bookId, arr) {
    var id = String(bookId || '').trim();
    if (!id) return;
    localStorage.setItem(bookOrderExtrasStorageKey(id), JSON.stringify(Array.isArray(arr) ? arr : []));
  }

  function addBookOrderExtra(bookId, name, zone, orderQty) {
    var list = loadBookOrderExtras(bookId);
    var z = ZONE_IDS.indexOf(zone) >= 0 ? zone : 'other';
    var row = {
      id: 'extra-' + Date.now().toString(36),
      name: titleCaseWords(String(name).trim()),
      zone: z,
      orderQty: String(orderQty || '').trim(),
    };
    list.push(row);
    saveBookOrderExtras(bookId, list);
    return row;
  }

  function updateBookOrderExtra(bookId, id, patch) {
    var list = loadBookOrderExtras(bookId);
    var idx = list.findIndex(function (x) {
      return x.id === id;
    });
    if (idx < 0) return;
    Object.assign(list[idx], patch);
    saveBookOrderExtras(bookId, list);
  }

  function removeBookOrderExtra(bookId, extraId) {
    saveBookOrderExtras(
      bookId,
      loadBookOrderExtras(bookId).filter(function (x) {
        return x.id !== extraId;
      })
    );
  }

  function exportBookMaster(bookId) {
    return JSON.stringify(loadBookMaster(bookId), null, 2);
  }

  function exportBookOrderBundle(bookId) {
    return JSON.stringify(
      {
        masterIngredients: loadBookMaster(bookId),
        orderOverrides: loadBookOrderOverrides(bookId),
        orderExtras: loadBookOrderExtras(bookId),
      },
      null,
      2
    );
  }

  function getKitchenById(id) {
    return loadKitchen().find(function (r) {
      return r.id === id;
    });
  }

  function addRivieraRecipe(payload) {
    var list = loadRiviera();
    var rawName = String(payload.name || 'Untitled').trim();
    var displayName = titleCaseRecipeName(rawName) || 'Untitled';
    var ingredients = (payload.ingredients || []).map(function (i) {
      if (!i || !i.item) return i;
      var row = {
        qty: i.qty != null && i.qty !== '' ? String(i.qty).trim() : '',
        item: titleCaseWords(String(i.item).trim()),
      };
      if (i.prep) row.prep = titleCaseWords(String(i.prep).trim());
      return row;
    });
    var method_steps = (payload.method_steps || []).map(function (line) {
      return capitalizeFirstLetter(String(line).trim());
    }).filter(Boolean);
    var service = (payload.service || []).map(function (line) {
      return capitalizeFirstLetter(String(line).trim());
    }).filter(Boolean);
    var elements = (payload.elements || []).map(function (el) {
      return titleCaseWords(String(el).trim());
    }).filter(Boolean);
    var diet = (payload.diet || []).map(function (d) {
      return titleCaseWords(String(d).trim());
    }).filter(Boolean);
    var rawLabel = payload.label ? String(payload.label).trim() : '';
    var rec = {
      id: payload.id || slugId(rawName),
      name: displayName,
      subtitle: payload.subtitle ? titleCaseRecipeName(String(payload.subtitle).trim()) : '',
      type: payload.type ? titleCaseRecipeName(String(payload.type).trim()) : 'Custom',
      course: payload.course ? titleCaseRecipeName(String(payload.course).trim()) : 'Other',
      protein: Array.isArray(payload.protein) ? payload.protein : [],
      diet: diet,
      method: payload.method ? titleCaseRecipeName(String(payload.method).trim()) : '',
      yield: payload.yield != null ? String(payload.yield).trim() : '',
      label: rawLabel ? titleCaseRecipeName(rawLabel) : displayName,
      elements: elements,
      ingredients: ingredients,
      method_steps: method_steps,
      service: service,
      note: payload.note ? capitalizeFirstLetter(String(payload.note).trim()) : null,
    };
    list.push(rec);
    saveRiviera(list);
    return rec;
  }

  /**
   * Normalize a Riviera recipe title for dedupe matching (Prep Chef PDF vs built-ins).
   * Lowercase, & → and, commas/punctuation → spaces, collapse whitespace.
   */
  function normalizeRivieraNameForDedupe(s) {
    if (!s) return '';
    var t = String(s).trim().toLowerCase();
    t = t.replace(/&/g, ' and ');
    t = t.replace(/,/g, ' ');
    t = t.replace(/[—–\-]+/g, ' ');
    t = t.replace(/[^\w\s]/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }

  /** First segment before " with " for matching mains that have long PDF subtitles. */
  function coreRivieraNameForDedupe(s) {
    var n = normalizeRivieraNameForDedupe(s);
    var idx = n.indexOf(' with ');
    if (idx > 0) return n.slice(0, idx).trim();
    return n;
  }

  /**
   * Normalized titles from "Recipes for Prep Chef" PDF → built-in id.
   * Keeps re-adding the same dish under PDF wording from creating a user duplicate.
   */
  var RIVIERA_PREP_CHEF_ALIAS_TO_ID = {
    'chorizo and mozzarella arancini with lemon and thyme aioli': 'arancini',
    'chorizo and mozzarella arancini with lemon and thyme': 'arancini',
    'calamari fritti with riviera house aioli crispy capers': 'calamari',
    'kilpatrick oyster crispy speck lea and perrins worcestershire': 'oysters-kilpatrick',
    'kilpatrick oyster': 'oysters-kilpatrick',
    'slow cooked veal meatballs with romesco sugo and toasted focaccia': 'veal-meatballs',
    'lemon pepper chicken skewer with tzatziki and crumbled feta': 'chicken-skewer',
    'crispy fried chorizo potatoes with lemon thyme aioli': 'chorizo-potatoes',
    'chargrilled lamb cutlet with riviera house emulsion': 'lamb-cutlet',
    'crispy reef fish slider lemon caper aioli and roquette': 'fish-slider',
    'beef kofta spicy capsicum and pita': 'beef-kofta',
    'camembert pecan and cranberry cigars with thyme infused honey': 'camembert-cigars',
    'lemon and dill aioli': 'lemon-dill-aioli',
    'lemon dill aioli': 'lemon-dill-aioli',
    'lemon and thyme aioli': 'lemon-thyme-aioli',
    'lemon thyme aioli': 'lemon-thyme-aioli',
    'vodka sauce': 'vodka-sauce',
    'whipped butter': 'whipped-butter',
  };

  /**
   * @param {string} candidateName - raw name from add form
   * @param {Array<{id:string,name:string}>} builtinRecipes - e.g. BUILTIN_RECIPES from riviera.html
   * @param {Array<{id:string,name:string}>|null} userRecipes - defaults to loadRiviera()
   * @returns {{type:'builtin'|'user', id:string, name:string}|null}
   */
  function findRivieraDuplicate(candidateName, builtinRecipes, userRecipes) {
    var builtins = Array.isArray(builtinRecipes) ? builtinRecipes : [];
    var users = userRecipes == null ? loadRiviera() : userRecipes;
    if (!Array.isArray(users)) users = [];
    if (!candidateName || !String(candidateName).trim()) return null;
    var n = normalizeRivieraNameForDedupe(candidateName);
    var core = coreRivieraNameForDedupe(candidateName);
    if (!n) return null;

    function builtinHit(id, displayName) {
      return { type: 'builtin', id: id, name: displayName };
    }
    function userHit(rec) {
      return { type: 'user', id: rec.id, name: rec.name };
    }

    var aliasId = RIVIERA_PREP_CHEF_ALIAS_TO_ID[n];
    if (aliasId == null && core !== n) aliasId = RIVIERA_PREP_CHEF_ALIAS_TO_ID[core];
    if (aliasId != null) {
      var foundByAlias = builtins.find(function (r) {
        return r.id === aliasId;
      });
      if (foundByAlias) return builtinHit(foundByAlias.id, foundByAlias.name);
    }

    var i;
    for (i = 0; i < builtins.length; i++) {
      var b = builtins[i];
      if (!b || !b.name) continue;
      var bn = normalizeRivieraNameForDedupe(b.name);
      var bc = coreRivieraNameForDedupe(b.name);
      if (n === bn || n === bc || core === bn || core === bc) {
        return builtinHit(b.id, b.name);
      }
    }

    for (i = 0; i < users.length; i++) {
      var u = users[i];
      if (!u || !u.name) continue;
      var un = normalizeRivieraNameForDedupe(u.name);
      var uc = coreRivieraNameForDedupe(u.name);
      if (n === un || n === uc || core === un || core === uc) {
        return userHit(u);
      }
    }

    return null;
  }

  function exportKitchen() {
    return JSON.stringify(loadKitchen(), null, 2);
  }

  function exportRiviera() {
    return JSON.stringify(loadRiviera(), null, 2);
  }

  window.KuschiUserRecipes = {
    loadKitchen: loadKitchen,
    saveKitchen: saveKitchen,
    loadRiviera: loadRiviera,
    saveRiviera: saveRiviera,
    loadRivieraHiddenBuiltinIds: loadRivieraHiddenBuiltinIds,
    saveRivieraHiddenBuiltinIds: saveRivieraHiddenBuiltinIds,
    hideRivieraBuiltin: hideRivieraBuiltin,
    restoreAllHiddenRivieraBuiltins: restoreAllHiddenRivieraBuiltins,
    removeRivieraRecipe: removeRivieraRecipe,
    migrateRivieraMetricIfNeeded: migrateRivieraMetricIfNeeded,
    canonicalOrderMergeKey: canonicalOrderMergeKey,
    toIndexRow: toIndexRow,
    kitchenToDetail: kitchenToDetail,
    addKitchenRecipe: addKitchenRecipe,
    kitchenRecordFromPayload: kitchenRecordFromPayload,
    getKitchenById: getKitchenById,
    listCustomBooks: listCustomBooks,
    getCustomBook: getCustomBook,
    createCustomBook: createCustomBook,
    deleteCustomBook: deleteCustomBook,
    loadBookRecipes: loadBookRecipes,
    saveBookRecipes: saveBookRecipes,
    addBookRecipe: addBookRecipe,
    getBookRecipeById: getBookRecipeById,
    removeBookRecipe: removeBookRecipe,
    exportBookRecipes: exportBookRecipes,
    bookRecipesStorageKey: bookRecipesStorageKey,
    bookOrderOverridesStorageKey: bookOrderOverridesStorageKey,
    bookOrderExtrasStorageKey: bookOrderExtrasStorageKey,
    bookMasterStorageKey: bookMasterStorageKey,
    loadBookMaster: loadBookMaster,
    saveBookMaster: saveBookMaster,
    upsertBookMasterIngredient: upsertBookMasterIngredient,
    resolveBookDefaultZone: resolveBookDefaultZone,
    loadBookOrderOverrides: loadBookOrderOverrides,
    saveBookOrderOverrides: saveBookOrderOverrides,
    loadBookOrderExtras: loadBookOrderExtras,
    saveBookOrderExtras: saveBookOrderExtras,
    addBookOrderExtra: addBookOrderExtra,
    updateBookOrderExtra: updateBookOrderExtra,
    removeBookOrderExtra: removeBookOrderExtra,
    exportBookMaster: exportBookMaster,
    exportBookOrderBundle: exportBookOrderBundle,
    bookStocktakeStorageKey: bookStocktakeStorageKey,
    loadRivieraStocktake: loadRivieraStocktake,
    saveRivieraStocktake: saveRivieraStocktake,
    patchRivieraStocktakeRow: patchRivieraStocktakeRow,
    addRivieraStocktakeExtra: addRivieraStocktakeExtra,
    removeRivieraStocktakeExtra: removeRivieraStocktakeExtra,
    clearRivieraStocktakeQuantities: clearRivieraStocktakeQuantities,
    exportRivieraStocktakeJson: exportRivieraStocktakeJson,
    loadBookStocktake: loadBookStocktake,
    saveBookStocktake: saveBookStocktake,
    patchBookStocktakeRow: patchBookStocktakeRow,
    addBookStocktakeExtra: addBookStocktakeExtra,
    removeBookStocktakeExtra: removeBookStocktakeExtra,
    clearBookStocktakeQuantities: clearBookStocktakeQuantities,
    exportBookStocktakeJson: exportBookStocktakeJson,
    addRivieraRecipe: addRivieraRecipe,
    exportKitchen: exportKitchen,
    exportRiviera: exportRiviera,
    USER_LETTER: '_USER',
    ZONE_IDS: ZONE_IDS,
    loadMaster: loadMaster,
    upsertMasterIngredient: upsertMasterIngredient,
    resolveDefaultZone: resolveDefaultZone,
    loadOrderOverrides: loadOrderOverrides,
    saveOrderOverrides: saveOrderOverrides,
    loadOrderExtras: loadOrderExtras,
    addOrderExtra: addOrderExtra,
    updateOrderExtra: updateOrderExtra,
    removeOrderExtra: removeOrderExtra,
    exportMaster: exportMaster,
    exportOrderBundle: exportOrderBundle,
    normalizeRivieraNameForDedupe: normalizeRivieraNameForDedupe,
    coreRivieraNameForDedupe: coreRivieraNameForDedupe,
    findRivieraDuplicate: findRivieraDuplicate,
    RIVIERA_PREP_CHEF_ALIAS_TO_ID: RIVIERA_PREP_CHEF_ALIAS_TO_ID,
    STORAGE_RIVIERA_HIDDEN_BUILTINS: STORAGE_RIVIERA_HIDDEN_BUILTINS,
  };
})();
