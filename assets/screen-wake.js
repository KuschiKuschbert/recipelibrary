/**
 * Screen Wake Lock + Riviera service-size modal helpers.
 */
(function () {
  const SEL = '[data-kuschi-wake]';
  let sentinel = null;
  let desired = false;

  function supported() {
    return typeof navigator !== 'undefined' && navigator.wakeLock && typeof navigator.wakeLock.request === 'function';
  }
  function labelFor(el, on) {
    if (el.classList && el.classList.contains('modal-wake-pill')) return on ? 'On' : 'Stay awake';
    return on ? 'Screen on' : 'Keep screen on';
  }
  function sync() {
    const nodes = Array.from(document.querySelectorAll(SEL));
    if (!supported()) {
      nodes.forEach((el) => (el.hidden = true));
      return;
    }
    const on = Boolean(sentinel);
    nodes.forEach((el) => {
      el.hidden = false;
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
      const text = labelFor(el, on);
      const label = el.querySelector('[data-kuschi-wake-label]');
      if (label) label.textContent = text;
      else if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') el.textContent = text;
    });
  }
  async function release() {
    const s = sentinel;
    if (!s) return;
    try { await s.release(); } catch (_) {}
    if (sentinel === s) sentinel = null;
  }
  async function acquire() {
    if (!supported() || !desired || document.visibilityState !== 'visible' || sentinel) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
        sync();
        if (desired && document.visibilityState === 'visible') acquire().catch(() => { desired = false; sync(); });
      });
    } catch (_) { desired = false; }
    sync();
  }
  async function toggle() {
    if (!supported()) return;
    if (sentinel) { desired = false; await release(); }
    else { desired = true; await acquire(); }
    sync();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest(SEL);
    if (!t || t.hidden || t.disabled) return;
    e.preventDefault();
    toggle();
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && desired) acquire().catch(() => {}); });
  window.addEventListener('pageshow', () => { if (document.visibilityState === 'visible' && desired) acquire().catch(() => {}); });
  window.KuschiScreenWake = { sync, supported };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();
})();

(function () {
  const VARIANT_URLS = [
    'riviera_data/service_variants.json',
    'riviera_data/service_variants_canapes.json',
    'riviera_data/service_variants_corporate.json',
    'riviera_data/service_variants_mains_sides.json',
    'riviera_data/service_variant_source_overrides.json',
  ];
  const ALIASES_URL = 'riviera_data/canonical_recipe_aliases.json';
  const META_KEYS = new Set(['recipe_id', 'canonical_name', 'aliases', 'recipe_id_candidates', 'size_rule']);
  const SERVICE_KEYS = ['platter', 'corporate_boxed', 'buffet', 'cocktail', 'tapas', 'plated_main', 'plated_entree', 'dessert_platter', 'dessert_buffet', 'plated_dessert', 'roving_dessert', 'kids', 'dietary_single'];
  let variantsPayload = null;
  let aliasesPayload = null;
  let variantPromise = null;
  let aliasPromise = null;
  let activeRecipeId = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
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
      if (value && typeof value === 'object' && !Array.isArray(value) && existing[key] && typeof existing[key] === 'object' && !Array.isArray(existing[key])) deepMergeOverride(existing[key], value);
      else existing[key] = value;
    });
  }
  function mergeVariantPayloads(payloads) {
    const merged = { service_variants: {}, rules: {} };
    payloads.forEach((payload, index) => {
      if (!payload || typeof payload !== 'object') return;
      if (index === 0 && payload.rules && typeof payload.rules === 'object') merged.rules = payload.rules;
      const overrideExisting = payload.merge_strategy === 'override_existing_fields';
      Object.keys(payload.service_variants || {}).forEach((recipeId) => {
        const incoming = payload.service_variants[recipeId];
        if (!incoming || typeof incoming !== 'object') return;
        if (!merged.service_variants[recipeId]) { merged.service_variants[recipeId] = incoming; return; }
        const existing = merged.service_variants[recipeId];
        if (overrideExisting) { deepMergeOverride(existing, incoming); return; }
        Object.keys(incoming).forEach((key) => { if (!existing[key]) existing[key] = incoming[key]; });
      });
    });
    return merged;
  }
  function loadVariants() {
    if (variantsPayload) return Promise.resolve(variantsPayload);
    if (!variantPromise) {
      variantPromise = Promise.all(VARIANT_URLS.map((path) => fetchJson(path).catch((err) => { console.warn('[Riviera service variants]', err); return { service_variants: {} }; }))).then((payloads) => {
        variantsPayload = mergeVariantPayloads(payloads);
        return variantsPayload;
      });
    }
    return variantPromise;
  }
  function loadAliases() {
    if (aliasesPayload) return Promise.resolve(aliasesPayload);
    if (!aliasPromise) {
      aliasPromise = fetchJson(ALIASES_URL).then((data) => (aliasesPayload = data || {})).catch((err) => {
        console.warn('[Riviera canonical aliases]', err);
        aliasesPayload = { canonical_recipes: {}, alias_to_canonical: {}, recipe_id_redirects: {} };
        return aliasesPayload;
      });
    }
    return aliasPromise;
  }
  function prettyKey(k) { return String(k || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()); }
  function normaliseScalar(key, value) {
    if (value == null || value === '' || value === false) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? prettyKey(key) : '';
    return String(value);
  }
  function variantLine(v) {
    if (!v || typeof v !== 'object') return '';
    const bits = [];
    const used = new Set();
    if (v.brochure_range_min != null && v.brochure_range_max != null) {
      bits.push('Brochure range: ' + v.brochure_range_min + '-' + v.brochure_range_max);
      used.add('brochure_range_min'); used.add('brochure_range_max');
    }
    ['portion','brochure_count','kitchen_production_count','total_pieces','whole_sandwiches','items_per_type','production_buffer_multiplier','sauce_ml_per_guest','aioli_ml_per_guest','premium_garnish_option','standard_garnish','service_rule','hold','recommendation','reason','note','source_note'].forEach((key) => {
      if (used.has(key) || !(key in v)) return;
      used.add(key);
      const value = v[key];
      if (key === 'brochure_count') bits.push('Brochure count: ' + value);
      else if (key === 'kitchen_production_count') bits.push('Kitchen production: ' + value);
      else if (key === 'total_pieces') bits.push('Total pieces: ' + value);
      else if (key === 'whole_sandwiches') bits.push('Whole sandwiches: ' + value);
      else if (key === 'items_per_type') bits.push('Items per type: ' + value);
      else if (key === 'production_buffer_multiplier') bits.push(value + 'x production buffer');
      else if (key === 'sauce_ml_per_guest') bits.push(value + 'ml sauce per guest');
      else if (key === 'aioli_ml_per_guest') bits.push(value + 'ml aioli per guest');
      else if (key === 'source_note') bits.push('Source note: ' + value);
      else {
        const label = ['portion', 'recommendation', 'reason', 'note', 'hold'].includes(key) ? '' : prettyKey(key) + ': ';
        const text = normaliseScalar(key, value);
        if (text) bits.push(label + text);
      }
    });
    Object.keys(v).forEach((key) => {
      if (used.has(key) || key === 'status' || /^(production_|microherbs_|lemons_|lemon_|chives_|parsley_|rocket_|feta_|pita_|caper_|beetroot_|olive_|bread_|manchego_|finished_|chicken_|beef_|lamb_|potato_|chorizo_|sauce_|aioli_|dressing_|garnish_|standard_|premium_|brochure_|kitchen_|source_)/.test(key)) return;
      const text = normaliseScalar(key, v[key]);
      if (text && bits.length < 10) bits.push(prettyKey(key) + ': ' + text);
    });
    return bits.filter(Boolean).join(' · ');
  }
  function resolveRecipeId(recipeId, aliases) { return (aliases && aliases.recipe_id_redirects && aliases.recipe_id_redirects[recipeId]) || recipeId; }
  function serviceVariantHtml(recipeId, variants, aliases) {
    const canonicalId = resolveRecipeId(recipeId, aliases);
    const v = variants && variants.service_variants && variants.service_variants[canonicalId];
    if (!v) return '';
    const rows = [];
    Object.keys(v).forEach((key) => {
      if (META_KEYS.has(key)) return;
      const line = variantLine(v[key]);
      if (line) rows.push([key === 'base_prep' ? 'Base Prep' : prettyKey(key), line]);
    });
    if (!rows.length && v.size_rule) rows.push(['Size Rule', v.size_rule]);
    if (!rows.length) return '';
    const redirected = canonicalId !== recipeId ? `<div class="modal-note" style="margin-bottom:10px"><strong>Redirected to canonical recipe:</strong> ${esc(canonicalId)}</div>` : '';
    return `<div class="modal-section">Service Sizes</div>${redirected}<div class="modal-ing riviera-service-variants" style="margin-bottom:14px">${rows.map((row) => `<div class="ing-qty">${esc(row[0])}</div><div class="ing-item">${esc(row[1])}</div>`).join('')}</div>`;
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
    const match = String(value == null ? '' : value).match(/[\d.]+/);
    const num = match ? parseFloat(match[0]) : null;
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  function serviceCount(record) { return firstNumber(record.kitchen_production_count) || firstNumber(record.total_pieces) || firstNumber(record.brochure_count); }
  function applyHeaderSummary(recipeId, variants, aliases) {
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
    const recipeType = (originalText.split('·')[0] || 'Recipe').trim();
    const batchYieldMatch = originalText.match(/Yield:\s*(.+)$/i);
    const batchYield = batchYieldMatch ? batchYieldMatch[1].trim() : '';
    const parts = [recipeType];
    if (count) parts.push('Service: ' + count + ' pieces');
    if (record.brochure_range_min != null && record.brochure_range_max != null) parts.push('Brochure: ' + record.brochure_range_min + '-' + record.brochure_range_max);
    else if (record.brochure_count != null) parts.push('Brochure: ' + record.brochure_count);
    if (batchYield) parts.push('Batch yield: ' + batchYield);
    typeEl.textContent = parts.join(' · ');
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
  function injectForRecipeId(recipeId) {
    Promise.all([loadVariants(), loadAliases()]).then(([variants, aliases]) => {
      applyHeaderSummary(recipeId, variants, aliases);
      const heavy = document.getElementById('rivieraModalHeavy');
      if (!heavy || document.getElementById('rivieraServiceVariantsBlock') || activeRecipeId !== recipeId) return;
      const html = serviceVariantHtml(recipeId, variants, aliases);
      if (!html) return;
      const block = document.createElement('div');
      block.id = 'rivieraServiceVariantsBlock';
      block.innerHTML = html;
      const firstIngredients = heavy.querySelector('.modal-section + .modal-ing');
      if (firstIngredients && firstIngredients.nextSibling) firstIngredients.parentNode.insertBefore(block, firstIngredients.nextSibling);
      else heavy.insertBefore(block, heavy.firstChild);
    });
  }
  function scheduleInject(recipeId) { [60, 160, 350, 900].forEach((delay) => setTimeout(() => injectForRecipeId(recipeId), delay)); }
  window.KuschiRivieraServiceVariants = {
    scheduleInject,
    loadAliases,
    loadVariants,
  };
  function patchOpenRecipe() {
    if (typeof window.openRecipe !== 'function' || window.openRecipe.__rivieraServiceVariantsPatched) return;
    const original = window.openRecipe;
    window.openRecipe = function patchedOpenRecipe(id) {
      activeRecipeId = id;
      const result = original.apply(this, arguments);
      scheduleInject(id);
      return result;
    };
    window.openRecipe.__rivieraServiceVariantsPatched = true;
  }
  function boot() {
    if (!document.body || !document.body.classList || !document.body.classList.contains('riviera-page')) return;
    patchOpenRecipe();
    setTimeout(patchOpenRecipe, 500);
    setTimeout(patchOpenRecipe, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
