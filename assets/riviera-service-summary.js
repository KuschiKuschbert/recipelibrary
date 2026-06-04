/**
 * Riviera source-aligned service summary overlay.
 * Keeps batch recipe yield visible while making the live service count clear.
 */
(function () {
  const VARIANT_URLS = [
    'riviera_data/service_variants.json',
    'riviera_data/service_variants_canapes.json',
    'riviera_data/service_variants_corporate.json',
    'riviera_data/service_variants_mains_sides.json',
    'riviera_data/service_variant_source_overrides.json',
  ];
  const ALIASES_URL = 'riviera_data/canonical_recipe_aliases.json';
  const SERVICE_KEYS = [
    'platter',
    'corporate_boxed',
    'buffet',
    'cocktail',
    'tapas',
    'plated_main',
    'plated_entree',
    'dessert_platter',
    'dessert_buffet',
    'plated_dessert',
    'roving_dessert',
    'kids',
    'dietary_single',
  ];

  let variantsPromise = null;
  let aliasesPromise = null;
  let activeRecipeId = null;

  function siteBaseUrl() {
    const loc = window.location || { origin: '', pathname: '' };
    const path = loc.pathname || '';
    if (/\.html?$/i.test(path)) {
      const dir = path.slice(0, path.lastIndexOf('/'));
      return dir ? loc.origin + dir : loc.origin;
    }
    const stripped = path.replace(/\/$/, '') || '';
    return stripped ? loc.origin + stripped : loc.origin;
  }

  function fetchJson(path) {
    return fetch(siteBaseUrl() + '/' + path.replace(/^\/+/, ''), { cache: 'no-store' }).then((res) => {
      if (!res.ok) throw new Error('Could not load ' + path + ' (' + res.status + ')');
      return res.json();
    });
  }

  function deepMergeOverride(existing, incoming) {
    Object.keys(incoming).forEach((key) => {
      const value = incoming[key];
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

  function mergePayloads(payloads) {
    const merged = { service_variants: {} };
    payloads.forEach((payload) => {
      if (!payload || typeof payload !== 'object') return;
      const overrideExisting = payload.merge_strategy === 'override_existing_fields';
      const serviceVariants = payload.service_variants || {};
      Object.keys(serviceVariants).forEach((recipeId) => {
        const incoming = serviceVariants[recipeId];
        if (!incoming || typeof incoming !== 'object') return;
        if (!merged.service_variants[recipeId]) {
          merged.service_variants[recipeId] = incoming;
          return;
        }
        const existing = merged.service_variants[recipeId];
        if (overrideExisting) {
          deepMergeOverride(existing, incoming);
          return;
        }
        Object.keys(incoming).forEach((key) => {
          if (!existing[key]) existing[key] = incoming[key];
        });
      });
    });
    return merged;
  }

  function loadVariants() {
    if (!variantsPromise) {
      variantsPromise = Promise.all(
        VARIANT_URLS.map((path) =>
          fetchJson(path).catch((err) => {
            console.warn('[Riviera service summary]', err);
            return { service_variants: {} };
          })
        )
      ).then(mergePayloads);
    }
    return variantsPromise;
  }

  function loadAliases() {
    if (!aliasesPromise) {
      aliasesPromise = fetchJson(ALIASES_URL).catch(() => ({ recipe_id_redirects: {} }));
    }
    return aliasesPromise;
  }

  function resolveRecipeId(recipeId, aliases) {
    return (aliases && aliases.recipe_id_redirects && aliases.recipe_id_redirects[recipeId]) || recipeId;
  }

  function sourceAlignedRecord(group) {
    if (!group || typeof group !== 'object') return null;
    for (const key of SERVICE_KEYS) {
      const record = group[key];
      if (record && typeof record === 'object' && record.source_note) return { key, record };
    }
    return null;
  }

  function firstNumber(value) {
    const num = parseFloat(String(value == null ? '' : value).match(/[\d.]+/) || '');
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  function serviceCount(record) {
    return (
      firstNumber(record.kitchen_production_count) ||
      firstNumber(record.total_pieces) ||
      firstNumber(record.brochure_count)
    );
  }

  function applySummary(recipeId, variants, aliases) {
    if (activeRecipeId !== recipeId) return;
    const modal = document.getElementById('modal');
    const typeEl = modal && modal.querySelector('.modal-type');
    if (!modal || !typeEl || typeEl.dataset.rivieraSourceSummary === '1') return;

    const canonicalId = resolveRecipeId(recipeId, aliases);
    const group = variants && variants.service_variants && variants.service_variants[canonicalId];
    const source = sourceAlignedRecord(group);
    if (!source) return;

    const record = source.record;
    const count = serviceCount(record);
    const originalText = typeEl.textContent || '';
    const parts = originalText.split('·').map((s) => s.trim()).filter(Boolean);
    const recipeType = parts[0] || 'Recipe';
    const batchYieldMatch = originalText.match(/Yield:\s*(.+)$/i);
    const batchYield = batchYieldMatch ? batchYieldMatch[1].trim() : '';

    const summaryParts = [recipeType];
    if (count) summaryParts.push('Service: ' + count + ' pieces');
    if (record.brochure_range_min != null && record.brochure_range_max != null) {
      summaryParts.push('Brochure: ' + record.brochure_range_min + '-' + record.brochure_range_max);
    } else if (record.brochure_count != null) {
      summaryParts.push('Brochure: ' + record.brochure_count);
    }
    if (batchYield) summaryParts.push('Batch yield: ' + batchYield);

    typeEl.textContent = summaryParts.join(' · ');
    typeEl.dataset.rivieraSourceSummary = '1';

    if (count) {
      const scaleWrap = modal.querySelector('.modal-scale');
      const label = scaleWrap && scaleWrap.querySelector('label');
      const input = document.getElementById('scaleInput');
      if (label) label.textContent = 'Scale to pieces:';
      if (input && input.dataset.rivieraSourceAligned !== '1') {
        input.value = String(count);
        input.dataset.rivieraSourceAligned = '1';
        if (typeof window.rescale === 'function') window.rescale(String(count));
      }
    }
  }

  function scheduleApply(recipeId) {
    Promise.all([loadVariants(), loadAliases()]).then(([variants, aliases]) => {
      [60, 160, 420, 900].forEach((delay) => {
        setTimeout(() => applySummary(recipeId, variants, aliases), delay);
      });
    });
  }

  function patchOpenRecipe() {
    if (typeof window.openRecipe !== 'function' || window.openRecipe.__rivieraServiceSummaryPatched) return;
    const original = window.openRecipe;
    window.openRecipe = function patchedOpenRecipe(id) {
      activeRecipeId = id;
      const result = original.apply(this, arguments);
      scheduleApply(id);
      return result;
    };
    window.openRecipe.__rivieraServiceSummaryPatched = true;
  }

  function boot() {
    loadVariants();
    loadAliases();
    patchOpenRecipe();
    setTimeout(patchOpenRecipe, 500);
    setTimeout(patchOpenRecipe, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
