'use strict';
/**
 * kuschi-filter-chips.js
 * Config-driven filter chip bar + shared bottom-sheet picker.
 *
 * Usage:
 *   KuschiFilterChips.init(configs, onChange)
 *
 *   configs: Array<{ chipId, selectId, label }>
 *     chipId   — id of the visible <button class="filter-chip">
 *     selectId — id of the hidden <select class="filter-pill--hidden">
 *     label    — display name shown on the chip and sheet title
 *
 *   onChange: function called after any filter value changes (e.g. applyFilters).
 *
 * The module injects a shared #filterSheet into <body> if absent.
 * Exposes global functions (openFilterSheet, setFilterValue, clearFilterChip,
 * closeFilterSheet, updateFilterChips) so inline onclick="..." still works
 * without per-page JS.
 */
(function () {

  var _configs = [];
  var _onChange = null;

  var _CHECK_ICON = '<svg class="filter-sheet__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  var _EMPTY_CHECK = '<svg class="filter-sheet__check" viewBox="0 0 24 24"></svg>';

  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Sheet injection ───────────────────────────────────────────────────────
  function _injectSheet() {
    if (document.getElementById('filterSheet')) return;
    var div = document.createElement('div');
    div.innerHTML = '<div class="nav-sheet" id="filterSheet" hidden role="dialog" aria-modal="true">' +
      '<div class="nav-sheet__backdrop" onclick="closeFilterSheet()"></div>' +
      '<div class="nav-sheet__panel filter-sheet__panel">' +
        '<div class="nav-sheet__header">' +
          '<span class="nav-sheet__title" id="filterSheetTitle">Filter</span>' +
          '<button class="nav-sheet__close" type="button" onclick="closeFilterSheet()">&#x2715;</button>' +
        '</div>' +
        '<div class="nav-sheet__books filter-sheet__list" id="filterSheetList"></div>' +
      '</div>' +
    '</div>';
    document.body.appendChild(div.firstChild);
  }

  // ── Chip sync ─────────────────────────────────────────────────────────────
  function updateFilterChips() {
    _configs.forEach(function (def) {
      var chip = document.getElementById(def.chipId);
      var sel  = document.getElementById(def.selectId);
      if (!chip || !sel) return;
      var val = sel.value;
      if (val) {
        chip.classList.add('filter-chip--active');
        chip.innerHTML = _esc(val) +
          '<span class="filter-chip__x" role="button" aria-label="Clear ' + _esc(def.label) + ' filter"' +
          ' onclick="event.stopPropagation();clearFilterChip(\'' + _esc(def.selectId) + '\')">&#x00D7;</span>';
      } else {
        chip.classList.remove('filter-chip--active');
        chip.textContent = def.label;
      }
    });
  }

  // ── Sheet open ────────────────────────────────────────────────────────────
  function openFilterSheet(label, selectId) {
    var sel = document.getElementById(selectId);
    if (!sel) return;

    var html = '';
    for (var i = 0; i < sel.options.length; i++) {
      var opt = sel.options[i];
      var active = opt.value === sel.value;
      var cls = 'filter-sheet__option' + (active ? ' filter-sheet__option--active' : '');
      // Encode selectId and value safely for the onclick attribute
      var safeSelectId = _esc(selectId);
      var safeValue = _esc(opt.value).replace(/'/g, '&#39;');
      html += '<button class="' + cls + '" type="button"' +
        ' onclick="setFilterValue(\'' + safeSelectId + '\',\'' + safeValue + '\')">' +
        _esc(opt.textContent) + (active ? _CHECK_ICON : _EMPTY_CHECK) +
        '</button>';
    }

    var titleEl = document.getElementById('filterSheetTitle');
    var listEl  = document.getElementById('filterSheetList');
    if (titleEl) titleEl.textContent = label;
    if (listEl)  listEl.innerHTML = html;

    var sheet = document.getElementById('filterSheet');
    if (sheet) { sheet.removeAttribute('hidden'); document.body.style.overflow = 'hidden'; }
  }

  // ── Value set ─────────────────────────────────────────────────────────────
  function setFilterValue(selectId, value) {
    var sel = document.getElementById(selectId);
    if (sel) {
      sel.value = value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closeFilterSheet();
  }

  function clearFilterChip(selectId) {
    setFilterValue(selectId, '');
  }

  // ── Sheet close ───────────────────────────────────────────────────────────
  function closeFilterSheet() {
    var sheet = document.getElementById('filterSheet');
    if (sheet) sheet.setAttribute('hidden', '');
    var anyOpen = document.querySelector('.modal-overlay.open, .nav-sheet:not([hidden])');
    if (!anyOpen) document.body.style.overflow = '';
  }

  // ── Escape key ────────────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var sheet = document.getElementById('filterSheet');
    if (sheet && !sheet.hidden) { closeFilterSheet(); }
  });

  // ── Public init ───────────────────────────────────────────────────────────
  function init(configs, onChange) {
    _configs = configs || [];
    _onChange = onChange || null;

    // Inject the sheet DOM if not already in the page.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _injectSheet);
    } else {
      _injectSheet();
    }
  }

  // Expose globals so inline onclick="..." works with zero per-page JS.
  window.openFilterSheet   = openFilterSheet;
  window.setFilterValue    = setFilterValue;
  window.clearFilterChip   = clearFilterChip;
  window.closeFilterSheet  = closeFilterSheet;
  window.updateFilterChips = updateFilterChips;

  window.KuschiFilterChips = { init: init, update: updateFilterChips };
})();
