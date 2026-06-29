/**
 * Riviera recipe-first event context: highlights recipes from the active function plan
 * and routes contextual actions to existing planner/order/prep tools.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'kuschi_riviera_active_event_v1';
  var state = loadState();
  var recipeSetCacheKey = '';
  var recipeSetCache = null;

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizePayload(payload) {
    if (!payload || typeof payload !== 'object') return null;
    var recipeIds = Array.isArray(payload.recipeIds) ? payload.recipeIds.slice() : [];
    if (!recipeIds.length) {
      (payload.courses || []).forEach(function (course) {
        (course.items || []).forEach(function (item) {
          if (item && item.recipeId && recipeIds.indexOf(item.recipeId) < 0) recipeIds.push(item.recipeId);
        });
      });
    }
    if (!recipeIds.length) return null;
    return Object.assign({}, payload, { recipeIds: recipeIds });
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { payload: null, filterActive: false, savedAt: '' };
      var parsed = JSON.parse(raw);
      return {
        payload: normalizePayload(parsed.payload),
        filterActive: !!parsed.filterActive,
        savedAt: parsed.savedAt || '',
      };
    } catch (_) {
      return { payload: null, filterActive: false, savedAt: '' };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      /* local device storage may be full */
    }
  }

  function activePayload() {
    return normalizePayload(state.payload);
  }

  function recipeIdSet() {
    var payload = activePayload();
    var out = {};
    var ids = payload && payload.recipeIds ? payload.recipeIds : [];
    var key = ids.join('\u001f');
    if (recipeSetCache && recipeSetCacheKey === key) return recipeSetCache;
    ids.forEach(function (id) {
      out[id] = true;
    });
    recipeSetCacheKey = key;
    recipeSetCache = out;
    return out;
  }

  function hasRecipe(id) {
    return !!recipeIdSet()[id];
  }

  function eventLabel(payload) {
    if (!payload) return '';
    return [payload.eventLabel, payload.sectionLabel].filter(Boolean).join(' · ');
  }

  function eventMeta(payload) {
    if (!payload) return '';
    var bits = [];
    if (payload.pax) bits.push(payload.pax + ' covers');
    if (payload.eventDate) bits.push(payload.eventDate);
    if (payload.recipeIds && payload.recipeIds.length) bits.push(payload.recipeIds.length + ' dishes');
    return bits.join(' · ');
  }

  function render() {
    var host = document.getElementById('rivieraEventContext');
    if (!host) return;
    var payload = activePayload();
    if (!payload) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }

    var filterText = state.filterActive ? 'Showing event recipes' : 'Show event recipes';
    var filterClass = state.filterActive ? ' riv-event-strip__btn--active' : '';
    var filterPressed = state.filterActive ? 'true' : 'false';
    host.hidden = false;
    host.innerHTML =
      '<div class="riv-event-strip__main">' +
      '<span class="riv-event-strip__eyebrow">Active function</span>' +
      '<strong>' + esc(eventLabel(payload) || 'Function plan') + '</strong>' +
      '<span>' + esc(eventMeta(payload)) + '</span>' +
      '</div>' +
      '<div class="riv-event-strip__actions">' +
      '<button type="button" class="page-action-btn riv-event-strip__btn' + filterClass + '" aria-pressed="' + filterPressed + '" onclick="KuschiRivieraEventContext.toggleFilter()">' + esc(filterText) + '</button>' +
      '<button type="button" class="page-action-btn riv-event-strip__btn" onclick="KuschiRivieraEventContext.openPlannerList()">Planner list</button>' +
      '<button type="button" class="page-action-btn riv-event-strip__btn" onclick="KuschiRivieraEventContext.openOrderList()">Event order</button>' +
      '<button type="button" class="page-action-btn riv-event-strip__btn" onclick="KuschiRivieraEventContext.openPrepBoard()">Prep board</button>' +
      '<button type="button" class="page-action-btn riv-event-strip__btn riv-event-strip__btn--clear" onclick="KuschiRivieraEventContext.clear()">Clear</button>' +
      '</div>';
  }

  function requestRecipeRefresh() {
    if (typeof window.applyFilters === 'function') window.applyFilters();
    else render();
  }

  function setActivePayload(payload) {
    var n = normalizePayload(payload);
    if (!n) return false;
    state = { payload: n, filterActive: false, savedAt: new Date().toISOString() };
    saveState();
    render();
    return true;
  }

  function clear() {
    state = { payload: null, filterActive: false, savedAt: '' };
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    requestRecipeRefresh();
  }

  function toggleFilter() {
    if (!activePayload()) return;
    state.filterActive = !state.filterActive;
    saveState();
    render();
    requestRecipeRefresh();
  }

  function isFilterOn() {
    return !!(activePayload() && state.filterActive);
  }

  function cardBadge(recipeId) {
    if (!activePayload() || !hasRecipe(recipeId)) return '';
    return '<span class="badge badge-event">Function</span>';
  }

  function modalActions(recipeId) {
    var payload = activePayload();
    if (!payload || !hasRecipe(recipeId)) return '';
    return (
      '<div class="riv-event-modal-actions" aria-label="Active function actions">' +
      '<span class="riv-event-modal-actions__eyebrow">Active function</span>' +
      '<span class="riv-event-modal-actions__label">' + esc(eventLabel(payload) || 'Function plan') + '</span>' +
      '<div class="riv-event-modal-actions__buttons">' +
      '<button type="button" class="btn-secondary riv-event-modal-actions__btn" onclick="KuschiRivieraEventContext.openPlannerList()" aria-label="Open planner list">Planner</button>' +
      '<button type="button" class="btn-secondary riv-event-modal-actions__btn" onclick="KuschiRivieraEventContext.openOrderList()" aria-label="Open event order">Order</button>' +
      '<button type="button" class="btn-secondary riv-event-modal-actions__btn" onclick="KuschiRivieraEventContext.openPrepBoard()" aria-label="Open prep board">Prep</button>' +
      '</div>' +
      '</div>'
    );
  }

  function closeRecipeModalIfOpen() {
    var overlay = document.getElementById('modalOverlay');
    if (overlay && overlay.classList.contains('open') && typeof window.closeModal === 'function') {
      window.closeModal();
    }
  }

  function openPlannerList() {
    var payload = activePayload();
    if (!payload || !window.KuschiPackagePrepSheet || typeof window.KuschiPackagePrepSheet.open !== 'function') return;
    closeRecipeModalIfOpen();
    window.KuschiPackagePrepSheet.open(payload);
  }

  function openOrderList() {
    var payload = activePayload();
    if (!payload || !payload.recipeIds || !payload.recipeIds.length) return;
    closeRecipeModalIfOpen();
    var ids = payload.recipeIds.slice();

    function run(scaleMap) {
      var ol = window.rivieraOrderList;
      if (!ol && typeof window.ensureRivieraOrderList === 'function') ol = window.ensureRivieraOrderList();
      if (!ol || typeof ol.setRecipeIdFilter !== 'function') return;
      ol.setPlannerContext({
        fromPlanner: true,
        label: eventLabel(payload),
        pax: payload.pax,
        recipeCount: ids.length,
        scaleMap: scaleMap || {},
      });
      ol.setRecipeIdFilter(ids);
      ol.open({ fromPlanner: true });
    }

    var scalePromise = Promise.resolve({});
    var S = window.KuschiPlannerScale;
    if (S && typeof S.loadServiceData === 'function' && typeof S.buildScaleMapFromPayload === 'function') {
      scalePromise = S.loadServiceData().then(function () { return S.buildScaleMapFromPayload(payload); });
    }
    var orderPromise = typeof window.loadRivieraOrderListScript === 'function' ? window.loadRivieraOrderListScript() : Promise.resolve();
    Promise.all([scalePromise, orderPromise]).then(function (pair) {
      run(pair[0]);
    }).catch(function () {
      run({});
    });
  }

  function openPrepBoard() {
    closeRecipeModalIfOpen();
    if (typeof window.openPrepModal === 'function') window.openPrepModal();
  }

  window.KuschiRivieraEventContext = {
    render: render,
    setActivePayload: setActivePayload,
    clear: clear,
    toggleFilter: toggleFilter,
    isFilterOn: isFilterOn,
    hasRecipe: hasRecipe,
    cardBadge: cardBadge,
    modalActions: modalActions,
    openPlannerList: openPlannerList,
    openOrderList: openOrderList,
    openPrepBoard: openPrepBoard,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
