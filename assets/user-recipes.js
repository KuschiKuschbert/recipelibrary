/**
 * Client-side user recipes for static GitHub Pages.
 * Kitchen (index): full detail shape + index row derivation.
 * Riviera: same shape as inline RECIPES objects.
 */
(function () {
  const STORAGE_KITCHEN = 'kuschi_user_recipes_kitchen_v1';
  const STORAGE_RIVIERA = 'kuschi_user_recipes_riviera_v1';

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return Array.isArray(v) ? v : fallback;
    } catch {
      return fallback;
    }
  }

  function slugId(name) {
    const base = String(name || 'recipe')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    return 'user-' + (base || 'recipe') + '-' + Date.now().toString(36);
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
    var rec = {
      id: payload.id || slugId(payload.name),
      name: String(payload.name || 'Untitled').trim(),
      yield: payload.yield || null,
      cuisine: payload.cuisine || null,
      category: payload.category || null,
      protein: payload.protein || [],
      tags: payload.tags || [],
      ingredients: payload.ingredients || [],
      instructions: payload.instructions || [],
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
    var rec = {
      id: payload.id || slugId(payload.name),
      name: String(payload.name || 'Untitled').trim(),
      subtitle: payload.subtitle || '',
      type: payload.type || 'Custom',
      course: payload.course || 'Other',
      protein: Array.isArray(payload.protein) ? payload.protein : [],
      diet: Array.isArray(payload.diet) ? payload.diet : [],
      method: payload.method || '',
      yield: payload.yield || '',
      label: payload.label || payload.name || 'Custom',
      elements: Array.isArray(payload.elements) ? payload.elements : [],
      ingredients: payload.ingredients || [],
      method_steps: Array.isArray(payload.method_steps) ? payload.method_steps : [],
      service: Array.isArray(payload.service) ? payload.service : [],
      note: payload.note || null,
    };
    list.push(rec);
    saveRiviera(list);
    return rec;
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
  };
})();
