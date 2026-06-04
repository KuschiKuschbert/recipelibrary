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
  const VARIANTS_URL = 'riviera_data/service_variants.json';
  const ALIASES_URL = 'riviera_data/canonical_recipe_aliases.json';
  let variantsPayload = null;
  let aliasesPayload = null;
  let variantPromise = null;
  let aliasPromise = null;

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

  function loadVariants() {
    if (variantsPayload) return Promise.resolve(variantsPayload);
    if (!variantPromise) {
      variantPromise = fetchJson(VARIANTS_URL)
        .then((data) => {
          variantsPayload = data || {};
          return variantsPayload;
        })
        .catch((err) => {
          console.warn('[Riviera service variants]', err);
          variantsPayload = { service_variants: {} };
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
          aliasesPayload = { canonical_recipes: {}, alias_to_canonical: {} };
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

  function variantLine(v) {
    if (!v || typeof v !== 'object') return '';
    const bits = [];
    if (v.portion) bits.push(v.portion);
    if (v.piece_weight_g_pre_crumb) bits.push(v.piece_weight_g_pre_crumb + 'g pre-crumb');
    if (v.potato_g != null || v.chorizo_g != null) {
      const p = v.potato_g != null ? v.potato_g + 'g potato' : '';
      const c = v.chorizo_g != null ? v.chorizo_g + 'g chorizo' : '';
      bits.push([p, c].filter(Boolean).join(' + '));
    }
    if (v.total_g != null) bits.push(v.total_g + 'g total');
    if (v.total_g_finished_serve != null) bits.push(v.total_g_finished_serve + 'g finished serve');
    if (v.recommendation) bits.push(v.recommendation);
    if (v.note) bits.push(v.note);
    return bits.filter(Boolean).join(' · ');
  }

  function serviceVariantHtml(recipeId, variants) {
    const v = variants && variants.service_variants && variants.service_variants[recipeId];
    if (!v) return '';
    const rows = [];
    Object.keys(v).forEach((key) => {
      if (key === 'recipe_id' || key === 'canonical_name' || key === 'aliases' || key === 'recipe_id_candidates') return;
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
    return `
      <div class="modal-section">Service Sizes</div>
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
    const entries = Object.keys(canonical).map((k) => canonical[k]);
    const match = entries.find((x) => x && x.canonical_id === recipeId);
    if (!match) return '';
    const aliasText = Array.isArray(match.aliases) ? match.aliases.join(' · ') : '';
    const notes = Array.isArray(match.notes) ? match.notes.join(' ') : '';
    return `
      <div class="modal-section">Canonical Recipe</div>
      <div class="modal-note" style="margin-bottom:14px">
        <strong>${esc(match.canonical_name || 'Canonical recipe')}</strong><br>
        ${esc(match.service_rule || '')}<br>
        ${aliasText ? '<span style="color:var(--text3)">Aliases: ' + esc(aliasText) + '</span><br>' : ''}
        ${notes ? '<span style="color:var(--text3)">' + esc(notes) + '</span>' : ''}
      </div>`;
  }

  function injectForCurrentRecipe() {
    const heavy = document.getElementById('rivieraModalHeavy');
    if (!heavy || document.getElementById('rivieraServiceVariantsBlock')) return;
    const recipe = window.currentRecipe || null;
    if (!recipe || !recipe.id) return;
    Promise.all([loadVariants(), loadAliases()]).then(([variants, aliases]) => {
      const stillHeavy = document.getElementById('rivieraModalHeavy');
      if (!stillHeavy || document.getElementById('rivieraServiceVariantsBlock')) return;
      const r = window.currentRecipe || recipe;
      if (!r || r.id !== recipe.id) return;
      const html = serviceVariantHtml(r.id, variants) + canonicalAliasHtml(r.id, aliases);
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

  function patchOpenRecipe() {
    if (typeof window.openRecipe !== 'function' || window.openRecipe.__rivieraServiceVariantsPatched) return;
    const original = window.openRecipe;
    window.openRecipe = function patchedOpenRecipe(id) {
      const result = original.apply(this, arguments);
      setTimeout(injectForCurrentRecipe, 80);
      setTimeout(injectForCurrentRecipe, 350);
      setTimeout(injectForCurrentRecipe, 900);
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
