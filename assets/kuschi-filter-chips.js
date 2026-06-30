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
  var _activeSelectId = '';
  var _activeLabel = '';
  var _sheetLocked = false;

  var _CHECK_ICON = '<svg class="filter-sheet__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

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
        '<div class="filter-sheet__search-wrap" id="filterSheetSearchWrap" hidden>' +
          '<input class="filter-sheet__search" id="filterSheetSearch" type="search" autocomplete="off" spellcheck="false" aria-label="Search filter options">' +
        '</div>' +
        '<div class="nav-sheet__books filter-sheet__list" id="filterSheetList" role="listbox"></div>' +
      '</div>' +
    '</div>';
    document.body.appendChild(div.firstChild);
    var search = document.getElementById('filterSheetSearch');
    if (search) search.addEventListener('input', _renderFilterOptions);
  }

  function _normalizeSearch(s) {
    return String(s || '').trim().toLowerCase();
  }

  function _lockSheetScroll() {
    if (_sheetLocked) return;
    if (window.KuschiRecipeUi && KuschiRecipeUi.lockPageScroll) {
      KuschiRecipeUi.lockPageScroll();
    } else {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
    _sheetLocked = true;
  }

  function _unlockSheetScroll() {
    if (!_sheetLocked) return;
    if (window.KuschiRecipeUi && KuschiRecipeUi.unlockPageScroll) {
      KuschiRecipeUi.unlockPageScroll();
    } else {
      var anyOpen = document.querySelector('.modal-overlay.open, .nav-sheet:not([hidden])');
      if (!anyOpen) {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
    }
    _sheetLocked = false;
  }

  function _optionLabel(opt, index) {
    var text = String(opt && opt.textContent ? opt.textContent : '');
    if (index === 0 && opt && !opt.value) return 'All ' + _activeLabel.toLowerCase();
    return text;
  }

  function _renderFilterOptions() {
    var sel = document.getElementById(_activeSelectId);
    var listEl = document.getElementById('filterSheetList');
    var search = document.getElementById('filterSheetSearch');
    if (!sel || !listEl) return;

    var query = _normalizeSearch(search && search.value);
    var frag = document.createDocumentFragment();
    var matches = 0;
    for (var i = 0; i < sel.options.length; i++) {
      var opt = sel.options[i];
      var label = _optionLabel(opt, i);
      if (query && i !== 0 && _normalizeSearch(label + ' ' + opt.value).indexOf(query) === -1) {
        continue;
      }

      var active = opt.value === sel.value;
      var btn = document.createElement('button');
      btn.className = 'filter-sheet__option' + (active ? ' filter-sheet__option--active' : '');
      btn.type = 'button';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.setAttribute('aria-label', active ? label + ', selected' : label);
      btn.appendChild(document.createTextNode(label));
      var check = document.createElement('span');
      check.className = 'filter-sheet__check';
      check.innerHTML = _CHECK_ICON;
      btn.appendChild(check);
      btn.addEventListener('click', (function (value) {
        return function () { setFilterValue(_activeSelectId, value); };
      })(opt.value));
      frag.appendChild(btn);
      matches++;
    }

    listEl.innerHTML = '';
    if (matches) {
      listEl.appendChild(frag);
    } else {
      var empty = document.createElement('div');
      empty.className = 'filter-sheet__empty';
      empty.textContent = 'No matching options';
      listEl.appendChild(empty);
    }
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
        chip.innerHTML =
          '<span class="filter-chip__label">' + _esc(def.label) + '</span>' +
          '<span class="filter-chip__value">' + _esc(val) + '</span>' +
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

    _activeSelectId = selectId;
    _activeLabel = label || 'filter';

    var titleEl = document.getElementById('filterSheetTitle');
    var listEl  = document.getElementById('filterSheetList');
    var searchWrap = document.getElementById('filterSheetSearchWrap');
    var search = document.getElementById('filterSheetSearch');
    if (titleEl) titleEl.textContent = label;
    if (listEl) listEl.setAttribute('aria-label', String(label || 'Filter') + ' options');
    if (searchWrap) searchWrap.hidden = sel.options.length < 9;
    if (search) {
      search.value = '';
      search.placeholder = 'Search ' + String(label || 'options').toLowerCase();
    }
    if (listEl) _renderFilterOptions();

    var sheet = document.getElementById('filterSheet');
    if (sheet) {
      var wasHidden = sheet.hidden;
      if (wasHidden) _lockSheetScroll();
      sheet.removeAttribute('hidden');
      window.requestAnimationFrame(function () {
        var active = listEl && listEl.querySelector('.filter-sheet__option--active');
        if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
      });
    }
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
    var wasOpen = sheet && !sheet.hidden;
    if (sheet) sheet.setAttribute('hidden', '');
    if (wasOpen) _unlockSheetScroll();
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
