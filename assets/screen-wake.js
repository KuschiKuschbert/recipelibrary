/**
 * Screen Wake Lock toggle for kitchen / recipe views (GitHub Pages, HTTPS).
 * Binds to elements with [data-kuschi-wake]; hides them when Wake Lock is unsupported.
 */
(function () {
  const SEL = '[data-kuschi-wake]';
  const LABEL_ON = 'Screen on';
  const LABEL_OFF = 'Keep screen on';
  const PILL_LABEL_ON = 'On';
  const PILL_LABEL_OFF = 'Stay awake';

  let sentinel = null;
  let desired = false;

  function supported() {
    return typeof navigator !== 'undefined' && navigator.wakeLock && typeof navigator.wakeLock.request === 'function';
  }

  function labelFor(el, on) {
    if (el.classList && el.classList.contains('modal-wake-pill')) {
      return on ? PILL_LABEL_ON : PILL_LABEL_OFF;
    }
    return on ? LABEL_ON : LABEL_OFF;
  }

  function sync() {
    const nodes = Array.from(document.querySelectorAll(SEL));
    if (!supported()) {
      nodes.forEach((el) => {
        el.hidden = true;
      });
      return;
    }
    const on = Boolean(sentinel);
    nodes.forEach((el) => {
      el.hidden = false;
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
      const text = labelFor(el, on);
      const labelEl = el.querySelector('[data-kuschi-wake-label]');
      if (labelEl) {
        labelEl.textContent = text;
      } else if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
        el.textContent = text;
      }
    });
  }

  async function release() {
    const s = sentinel;
    if (!s) return;
    try {
      await s.release();
    } catch (_) {
      /* ignore */
    }
    if (sentinel === s) sentinel = null;
  }

  async function acquire() {
    if (!supported() || !desired || document.visibilityState !== 'visible') return;
    if (sentinel) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
        sync();
        if (desired && document.visibilityState === 'visible') {
          acquire().catch(() => {
            desired = false;
            sync();
          });
        }
      });
    } catch (_) {
      desired = false;
    }
    sync();
  }

  async function toggle() {
    if (!supported()) return;
    if (sentinel) {
      desired = false;
      await release();
    } else {
      desired = true;
      await acquire();
    }
    sync();
  }

  function onVisibility() {
    if (document.visibilityState === 'visible' && desired) {
      acquire().catch(() => {});
    }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest(SEL);
    if (!t || t.hidden || t.disabled) return;
    e.preventDefault();
    toggle();
  });

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onVisibility);

  window.KuschiScreenWake = {
    sync,
    supported,
  };

  function boot() {
    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/**
 * Riviera service variants + canonical aliases.
 * Keeps serving sizes out of the base recipe and shows the separate service standard in the recipe modal.
 */
(function () {
  const VARIANT_URLS = [
    'riviera_data/service_variants.json',
    'riviera_data/service_variants_canapes.json',
    'riviera_data/service_variants_corporate.json',
    'riviera_data/service_variants_mains_sides.json',
  ];
  const ALIASES_URL = 'riviera_data/canonical_recipe_aliases.json';
  let variantsPayload = null;
  let aliasesPayload = null;
  let variantPromise = null;
  let aliasPromise = null;
  let activeRecipeId = null;

  const META_KEYS = new Set(['recipe_id', 'canonical_name', 'aliases', 'recipe_id_candidates', 'size_rule']);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  function mergeVariantPayloads(payloads) {
    const merged = { service_variants: {}, rules: {} };
    payloads.forEach((payload, index) => {
      if (!payload || typeof payload !== 'object') return;
      if (index === 0 && payload.rules && typeof payload.rules === 'object') {
        merged.rules = payload.rules;
      }
      const serviceVariants = payload.service_variants || {};
      Object.keys(serviceVariants).forEach((recipeId) => {
        const incoming = serviceVariants[recipeId];
        if (!incoming || typeof incoming !== 'object') return;
        if (!merged.service_variants[recipeId]) {
          merged.service_variants[recipeId] = incoming;
          return;
        }
        const existing = merged.service_variants[recipeId];
        Object.keys(incoming).forEach((key) => {
          if (existing[key] && JSON.stringify(existing[key]) !== JSON.stringify(incoming[key])) {
            console.warn('[Riviera service variants] duplicate/conflicting variant ignored:', recipeId + '.' + key);
            return;
          }
          existing[key] = incoming[key];
        });
      });
    });
    return merged;
  }

  function loadVariants() {
    if (variantsPayload) return Promise.resolve(variantsPayload);
    if (!variantPromise) {
      variantPromise = Promise.all(
        VARIANT_URLS.map((path) =>
          fetchJson(path).catch((err) => {
            console.warn('[Riviera service variants]', err);
            return { service_variants: {} };
          })
        )
      ).then((payloads) => {
        variantsPayload = mergeVariantPayloads(payloads);
        return variantsPayload;
      });
    }
    return variantPromise;
  }

  function loadAliases() {
    if (aliasesPayload) return Promise.resolve(aliasesPayload);
    if (!aliasPromise) {
      aliasPromise = fetchJson(ALIASES_URL)
        .then((data) => {
          aliasesPayload = data || {};
          return aliasesPayload;
        })
        .catch((err) => {
          console.warn('[Riviera canonical aliases]', err);
          aliasesPayload = { canonical_recipes: {}, alias_to_canonical: {}, recipe_id_redirects: {} };
          return aliasesPayload;
        });
    }
    return aliasPromise;
  }

  function prettyKey(k) {
    return String(k || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function normaliseScalar(key, value) {
    if (value == null || value === '' || value === false) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? prettyKey(key) : '';
    return String(value);
  }

  function variantLine(v) {
    if (!v || typeof v !== 'object') return '';
    const bits = [];
    const priority = [
      'portion',
      'piece_weight_g_pre_crumb',
      'piece_weight_g_raw',
      'production_buffer_multiplier',
      'production_piece_count_per_guest',
      'production_pieces_per_guest',
      'production_sliders_per_guest',
      'production_portions_per_guest',
      'production_finished_salad_g_per_guest',
      'production_finished_gratin_g_per_guest',
      'total_g_finished_serve',
      'sauce_ml_per_guest',
      'aioli_ml_per_guest',
      'premium_garnish_option',
      'standard_garnish',
      'service_rule',
      'hold',
      'recommendation',
      'reason',
      'note',
    ];
    const used = new Set();

    priority.forEach((key) => {
      if (!(key in v)) return;
      used.add(key);
      const value = v[key];
      if (key === 'piece_weight_g_pre_crumb') bits.push(value + 'g pre-crumb');
      else if (key === 'piece_weight_g_raw') bits.push(value + 'g raw');
      else if (key === 'production_buffer_multiplier') bits.push(value + 'x production buffer');
      else if (key === 'total_g_finished_serve') bits.push(value + 'g finished serve');
      else if (key === 'sauce_ml_per_guest') bits.push(value + 'ml sauce per guest');
      else if (key === 'aioli_ml_per_guest') bits.push(value + 'ml aioli per guest');
      else {
        const label = ['portion', 'recommendation', 'reason', 'note', 'hold'].includes(key) ? '' : prettyKey(key) + ': ';
        const text = normaliseScalar(key, value);
        if (text) bits.push(label + text);
      }
    });

    if (v.potato_g != null || v.chorizo_g != null) {
      const p = v.potato_g != null ? v.potato_g + 'g potato' : '';
      const c = v.chorizo_g != null ? v.chorizo_g + 'g chorizo' : '';
      bits.push([p, c].filter(Boolean).join(' + '));
    }
    if (v.total_g != null) bits.push(v.total_g + 'g total');

    Object.keys(v).forEach((key) => {
      if (used.has(key) || key === 'status' || key === 'piece_count' || key === 'piece_count_per_guest') return;
      if (/^(production_|microherbs_|lemons_|lemon_|chives_|parsley_|rocket_|feta_|pita_|caper_|beetroot_|olive_|bread_|manchego_|finished_|chicken_|beef_|lamb_|potato_|chorizo_|sauce_|aioli_|dressing_|garnish_|standard_|premium_)/.test(key)) return;
      const text = normaliseScalar(key, v[key]);
      if (text && bits.length < 8) bits.push(prettyKey(key) + ': ' + text);
    });

    return bits.filter(Boolean).join(' · ');
  }

  function resolveRecipeId(recipeId, aliases) {
    return (aliases && aliases.recipe_id_redirects && aliases.recipe_id_redirects[recipeId]) || recipeId;
  }

  function serviceVariantHtml(recipeId, variants, aliases) {
    const canonicalId = resolveRecipeId(recipeId, aliases);
    const v = variants && variants.service_variants && variants.service_variants[canonicalId];
    if (!v) return '';
    const rows = [];
    Object.keys(v).forEach((key) => {
      if (META_KEYS.has(key)) return;
      if (key === 'base_prep') {
        const line = variantLine(v[key]);
        if (line) rows.push(['Base Prep', line]);
        return;
      }
      const line = variantLine(v[key]);
      if (line) rows.push([prettyKey(key), line]);
    });
    if (!rows.length && v.size_rule) rows.push(['Size Rule', v.size_rule]);
    if (!rows.length) return '';
    const redirected = canonicalId !== recipeId ? `<div class="modal-note" style="margin-bottom:10px"><strong>Redirected to canonical recipe:</strong> ${esc(canonicalId)}</div>` : '';
    return `
      <div class="modal-section">Service Sizes</div>
      ${redirected}
      <div class="modal-ing riviera-service-variants" style="margin-bottom:14px">
        ${rows
          .map(
            (row) =>
              `<div class="ing-qty">${esc(row[0])}</div><div class="ing-item">${esc(row[1])}</div>`
          )
          .join('')}
      </div>`;
  }

  function canonicalAliasHtml(recipeId, aliases) {
    const canonical = aliases && aliases.canonical_recipes;
    if (!canonical) return '';
    const canonicalId = resolveRecipeId(recipeId, aliases);
    const entries = Object.keys(canonical).map((k) => canonical[k]);
    const match = entries.find((x) => x && (x.canonical_id === canonicalId || (Array.isArray(x.duplicate_recipe_ids) && x.duplicate_recipe_ids.indexOf(recipeId) >= 0)));
    if (!match) return '';
    const aliasText = Array.isArray(match.aliases) ? match.aliases.join(' · ') : '';
    const notes = Array.isArray(match.notes) ? match.notes.join(' ') : '';
    const duplicate = canonicalId !== recipeId || (Array.isArray(match.duplicate_recipe_ids) && match.duplicate_recipe_ids.indexOf(recipeId) >= 0);
    return `
      <div class="modal-section">Canonical Recipe</div>
      <div class="modal-note" style="margin-bottom:14px">
        <strong>${esc(match.canonical_name || 'Canonical recipe')}</strong>${duplicate ? ' <span style="color:var(--text3)">(canonical source)</span>' : ''}<br>
        ${esc(match.service_rule || '')}<br>
        ${duplicate && match.duplicate_rule ? '<span style="color:var(--text3)">' + esc(match.duplicate_rule) + '</span><br>' : ''}
        ${aliasText ? '<span style="color:var(--text3)">Aliases: ' + esc(aliasText) + '</span><br>' : ''}
        ${notes ? '<span style="color:var(--text3)">' + esc(notes) + '</span>' : ''}
      </div>`;
  }

  function injectForRecipeId(recipeId) {
    const heavy = document.getElementById('rivieraModalHeavy');
    if (!heavy || document.getElementById('rivieraServiceVariantsBlock')) return;
    if (!recipeId) return;
    Promise.all([loadVariants(), loadAliases()]).then(([variants, aliases]) => {
      const stillHeavy = document.getElementById('rivieraModalHeavy');
      if (!stillHeavy || document.getElementById('rivieraServiceVariantsBlock')) return;
      if (activeRecipeId !== recipeId) return;
      const html = serviceVariantHtml(recipeId, variants, aliases) + canonicalAliasHtml(recipeId, aliases);
      if (!html) return;
      const block = document.createElement('div');
      block.id = 'rivieraServiceVariantsBlock';
      block.innerHTML = html;
      const firstIngredients = stillHeavy.querySelector('.modal-section + .modal-ing');
      if (firstIngredients && firstIngredients.nextSibling) {
        firstIngredients.parentNode.insertBefore(block, firstIngredients.nextSibling);
      } else {
        stillHeavy.insertBefore(block, stillHeavy.firstChild);
      }
    });
  }

  function scheduleInject(recipeId) {
    setTimeout(() => injectForRecipeId(recipeId), 80);
    setTimeout(() => injectForRecipeId(recipeId), 350);
    setTimeout(() => injectForRecipeId(recipeId), 900);
  }

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
    loadVariants();
    loadAliases();
    patchOpenRecipe();
    setTimeout(patchOpenRecipe, 500);
    setTimeout(patchOpenRecipe, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
