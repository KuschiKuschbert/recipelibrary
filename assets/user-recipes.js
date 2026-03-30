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

  const ZONE_IDS = ['freezer', 'coldroom', 'drystore', 'other'];

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

  function normalizeIngName(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
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

  function loadOrderOverrides() {
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

  function addKitchenRecipe(payload) {
    var list = loadKitchen();
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
    var rec = {
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
    list.push(rec);
    saveKitchen(list);
    return rec;
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
    toIndexRow: toIndexRow,
    kitchenToDetail: kitchenToDetail,
    addKitchenRecipe: addKitchenRecipe,
    getKitchenById: getKitchenById,
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
  };
})();
