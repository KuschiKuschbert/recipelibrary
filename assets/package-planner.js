/**
 * Function Package Planner — full-screen overlay, course selection, pax, generate prep sheet.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'kuschi_package_plan_v2';
  var STORAGE_KEY_V1 = 'kuschi_package_plan_v1';
  var _cfg = null;
  var _pkgData = null;
  var _state = { eventId: null, sectionId: null, pax: 100, eventDate: '', selections: {} };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    return esc(s).replace(/'/g, '&#39;');
  }

  function courseKey(eventId, sectionId, courseIdx) {
    return eventId + '::' + sectionId + '::' + courseIdx;
  }

  function itemKey(eventId, sectionId, courseIdx, itemIdx) {
    return courseKey(eventId, sectionId, courseIdx) + '::' + itemIdx;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) raw = localStorage.getItem(STORAGE_KEY_V1);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          _state = {
            eventId: parsed.eventId || null,
            sectionId: parsed.sectionId || null,
            pax: parsed.pax > 0 ? parsed.pax : 100,
            eventDate: parsed.eventDate != null ? String(parsed.eventDate) : '',
            selections: parsed.selections && typeof parsed.selections === 'object' ? parsed.selections : {},
          };
        }
      }
    } catch (_) {
      /* keep defaults */
    }
  }

  function encodeSelParam() {
    return Object.keys(_state.selections)
      .filter(function (k) {
        return _state.selections[k];
      })
      .join(',');
  }

  function applySelParam(sel) {
    if (!sel) return;
    _state.selections = {};
    sel.split(',').forEach(function (k) {
      k = k.trim();
      if (k) _state.selections[k] = true;
    });
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (_) {
      /* quota */
    }
  }

  function useCompactPlannerCopy() {
    return document.documentElement.classList.contains('lenovo-tab-one-profile');
  }

  function syncUrl(opts) {
    if (!_cfg || typeof _cfg.syncUrl !== 'function') return;
    opts = opts || {};
    _cfg.syncUrl(function (p) {
      if (_state.eventId) p.set('pkg', _state.eventId);
      else p.delete('pkg');
      if (_state.sectionId) p.set('section', _state.sectionId);
      else p.delete('section');
      if (_state.pax > 0) p.set('pax', String(_state.pax));
      else p.delete('pax');
      if (_state.eventDate) p.set('eventDate', _state.eventDate);
      else p.delete('eventDate');
      var sel = encodeSelParam();
      if (sel) p.set('sel', sel);
      else p.delete('sel');
      p.set('planner', '1');
      if (opts.open) p.set('open', opts.open);
      else if (opts.clearOpen) p.delete('open');
    }, opts.push ? 'push' : 'replace');
  }

  function loadPackages(cb) {
    if (_pkgData) {
      cb(_pkgData);
      return;
    }
    var base = _cfg && _cfg.siteBaseUrl ? _cfg.siteBaseUrl() : '';
    fetch(base + '/riviera_data/function_packages.json')
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        _pkgData = d;
        cb(d);
      })
      .catch(function () {
        var body = document.getElementById('fnPlannerBody');
        if (body) {
          body.innerHTML =
            '<p class="fn-planner__error">Could not load package data.</p>';
        }
      });
  }

  function findPkg(id) {
    if (!_pkgData) return null;
    return (_pkgData.packages || []).find(function (p) {
      return p.id === id;
    });
  }

  function findSection(pkg, secId) {
    if (!pkg) return null;
    return (pkg.sections || []).find(function (s) {
      return s.id === secId;
    });
  }

  function autoSelectDefaultCourses(sec) {
    if (!sec || !_state.eventId || !_state.sectionId) return;
    (sec.courses || []).forEach(function (course, ci) {
      var sel = course.selection || { mode: 'optional' };
      var selectableKeys = [];
      (course.items || []).forEach(function (_item, ii) {
        selectableKeys.push(itemKey(_state.eventId, _state.sectionId, ci, ii));
      });
      if (!selectableKeys.length) return;
      if (sel.mode === 'all') {
        selectableKeys.forEach(function (key) {
          _state.selections[key] = true;
        });
        return;
      }
      if (sel.mode !== 'pick') return;
      var min = sel.min != null ? sel.min : 1;
      var max = sel.max != null ? sel.max : null;
      var target = max != null ? Math.min(Math.max(min, 0), max) : Math.max(min, 0);
      if (!target) return;
      var selected = selectableKeys.filter(function (key) {
        return _state.selections[key];
      });
      if (max != null && selected.length > max) {
        selected.slice(max).forEach(function (key) {
          delete _state.selections[key];
        });
        selected = selected.slice(0, max);
      }
      selectableKeys.forEach(function (key) {
        if (selected.length >= target) return;
        if (!_state.selections[key]) {
          _state.selections[key] = true;
          selected.push(key);
        }
      });
    });
  }

  function countSelectedInCourse(sec, courseIdx) {
    var course = sec.courses[courseIdx];
    if (!course) return { count: 0, total: 0, linked: 0, selectedUnlinked: 0 };
    var count = 0;
    var linked = 0;
    var selectedUnlinked = 0;
    (course.items || []).forEach(function (item, ii) {
      var selected = !!_state.selections[itemKey(_state.eventId, _state.sectionId, courseIdx, ii)];
      if (item.recipeId) linked++;
      if (selected) {
        count++;
        if (!item.recipeId) selectedUnlinked++;
      }
    });
    return {
      count: count,
      total: (course.items || []).length,
      linked: linked,
      selectedUnlinked: selectedUnlinked,
    };
  }

  function courseValidation(sec, courseIdx) {
    var course = sec.courses[courseIdx];
    var sel = (course && course.selection) || { mode: 'optional', min: 0, max: null };
    var stats = countSelectedInCourse(sec, courseIdx);
    if (sel.mode === 'all') {
      return {
        valid: stats.count === stats.total,
        label: stats.count + ' of ' + stats.total + ' (all included)',
        min: stats.total,
        max: stats.total,
        count: stats.count,
      };
    }
    if (sel.mode === 'optional') {
      return {
        valid: true,
        label: stats.count + ' selected',
        min: 0,
        max: null,
        count: stats.count,
      };
    }
    var min = sel.min != null ? sel.min : 1;
    var max = sel.max != null ? sel.max : null;
    var valid = stats.count >= min && (max == null || stats.count <= max);
    var label =
      max != null && min === max
        ? stats.count + ' / ' + min + ' selected'
        : stats.count +
          ' selected' +
          (min ? ' (min ' + min + (max != null ? ', max ' + max : '') + ')' : '');
    return { valid: valid, label: label, min: min, max: max, count: stats.count };
  }

  function sectionValid(sec) {
    if (!sec) return false;
    for (var ci = 0; ci < (sec.courses || []).length; ci++) {
      if (!courseValidation(sec, ci).valid) return false;
    }
    return true;
  }

  function sectionStats(sec) {
    var out = {
      selected: 0,
      linked: 0,
      selectedUnlinked: 0,
      courses: 0,
      readyCourses: 0,
      needsCourses: 0,
    };
    if (!sec) return out;
    out.courses = (sec.courses || []).length;
    (sec.courses || []).forEach(function (course, ci) {
      var stats = countSelectedInCourse(sec, ci);
      var val = courseValidation(sec, ci);
      out.selected += stats.count;
      out.linked += stats.linked;
      out.selectedUnlinked += stats.selectedUnlinked;
      if (val.valid) out.readyCourses++;
      else out.needsCourses++;
    });
    return out;
  }

  function toggleItem(courseIdx, itemIdx) {
    var key = itemKey(_state.eventId, _state.sectionId, courseIdx, itemIdx);
    if (_state.selections[key]) delete _state.selections[key];
    else _state.selections[key] = true;
    saveState();
    syncUrl();
    renderBody();
  }

  function openRecipeFromItem(recipeId) {
    if (!recipeId || !_cfg || typeof _cfg.openRecipe !== 'function') return;
    var recipes = _cfg.getRecipes ? _cfg.getRecipes() || [] : [];
    if (!recipes.find(function (r) {
      return r.id === recipeId;
    })) {
      return;
    }
    syncUrl({ open: recipeId, push: true });
    _cfg.openRecipe(recipeId, { skipUrl: true });
  }

  function renderEventTabs() {
    var el = document.getElementById('fnPlannerEventTabs');
    if (!el || !_pkgData) return;
    el.innerHTML = _pkgData.packages
      .map(function (pkg) {
        var active = pkg.id === _state.eventId ? ' fn-planner-tab--active' : '';
        return (
          '<button type="button" class="fn-planner-tab' +
          active +
          '" data-pkg-id="' +
          escAttr(pkg.id) +
          '">' +
          '<span>' +
          esc(pkg.icon) +
          '</span> ' +
          esc(pkg.label) +
          '</button>'
        );
      })
      .join('');
    el.querySelectorAll('[data-pkg-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectEvent(btn.getAttribute('data-pkg-id'));
      });
    });
  }

  function renderSectionTabs(pkg) {
    var el = document.getElementById('fnPlannerSectionTabs');
    if (!el || !pkg) return;
    el.innerHTML = (pkg.sections || [])
      .map(function (sec) {
        var active = sec.id === _state.sectionId ? ' fn-planner-tab--active' : '';
        return (
          '<button type="button" class="fn-planner-tab fn-planner-tab--section' +
          active +
          '" data-sec-id="' +
          escAttr(sec.id) +
          '">' +
          esc(sec.label) +
          '</button>'
        );
      })
      .join('');
    el.querySelectorAll('[data-sec-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectSection(pkg.id, btn.getAttribute('data-sec-id'));
      });
    });
  }

  function selectEvent(id) {
    _state.eventId = id;
    _state.sectionId = null;
    var pkg = findPkg(id);
    if (!pkg || !pkg.sections || !pkg.sections.length) return;
    _state.sectionId = pkg.sections[0].id;
    autoSelectDefaultCourses(pkg.sections[0]);
    saveState();
    syncUrl({ clearOpen: true });
    renderEventTabs();
    renderSectionTabs(pkg);
    renderBody();
  }

  function selectSection(pkgId, secId) {
    _state.sectionId = secId;
    var pkg = findPkg(pkgId);
    var sec = findSection(pkg, secId);
    autoSelectDefaultCourses(sec);
    saveState();
    syncUrl({ clearOpen: true });
    renderSectionTabs(pkg);
    renderBody();
  }

  function renderBody() {
    var body = document.getElementById('fnPlannerBody');
    var genBtn = document.getElementById('fnPlannerGenerate');
    var paxInput = document.getElementById('fnPlannerPax');
    var dateInput = document.getElementById('fnPlannerEventDate');
    if (paxInput && document.activeElement !== paxInput) {
      paxInput.value = String(_state.pax || 100);
    }
    if (dateInput && document.activeElement !== dateInput) {
      dateInput.value = _state.eventDate || '';
    }
    if (!body) return;
    var pkg = findPkg(_state.eventId);
    var sec = findSection(pkg, _state.sectionId);
    if (!sec) {
      body.innerHTML = '<p class="fn-planner__hint">Select an event and package.</p>';
      if (genBtn) {
        genBtn.disabled = true;
        genBtn.textContent = 'Generate Full Planner List';
      }
      return;
    }

    var stats = sectionStats(sec);
    var ready = stats.needsCourses === 0;
    var readyText = ready
      ? stats.readyCourses + '/' + stats.courses + ' courses ready'
      : stats.needsCourses + ' course' + (stats.needsCourses !== 1 ? 's' : '') + ' need choices';
    var summaryStatusCls = ready
      ? ' fn-planner__summary-status--ready'
      : ' fn-planner__summary-status--needs';
    var html = '<div class="fn-planner__summary">';
    html += '<div class="fn-planner__summary-main">';
    html += '<span class="fn-planner__summary-eyebrow">Current package</span>';
    html += '<strong>' + esc(sec.label || 'Package') + '</strong>';
    html += '<span>' + esc([pkg && pkg.label, sec.style].filter(Boolean).join(' · ')) + '</span>';
    html += '</div>';
    html += '<div class="fn-planner__summary-chips">';
    html += '<span class="fn-planner__summary-chip"><strong>' + stats.selected + '</strong> selected</span>';
    html += '<span class="fn-planner__summary-chip">' + stats.linked + ' recipe-linked dishes</span>';
    if (stats.selectedUnlinked) {
      html +=
        '<span class="fn-planner__summary-status fn-planner__summary-status--needs"><strong>' +
        stats.selectedUnlinked +
        '</strong> selected · recipe confirmation needed</span>';
    }
    html += '<span class="fn-planner__summary-chip"><strong>' + esc(String(_state.pax || 100)) + '</strong> covers</span>';
    if (_state.eventDate) {
      html += '<span class="fn-planner__summary-chip">' + esc(_state.eventDate) + '</span>';
    }
    if (sec.price) {
      html += '<span class="fn-planner__summary-chip">' + esc(sec.price) + '</span>';
    }
    if (sec.salesStatus) {
      html += '<span class="fn-planner__summary-status fn-planner__summary-status--needs">' + esc(sec.salesStatus) + '</span>';
    }
    html += '<span class="fn-planner__summary-status' + summaryStatusCls + '">' + esc(readyText) + '</span>';
    html += '</div>';
    if (sec.desc) html += '<p class="fn-planner__desc">' + esc(sec.desc) + '</p>';
    var operationalLines =
      sec.operationalRules && Array.isArray(sec.operationalRules.displayLines)
        ? sec.operationalRules.displayLines
        : [];
    if (operationalLines.length) {
      html += '<details class="fn-planner__ops" open>';
      html += '<summary>Locked operational standard</summary><ul>';
      operationalLines.forEach(function (line) {
        html += '<li>' + esc(line) + '</li>';
      });
      html += '</ul></details>';
    }
    html += '</div>';

    (sec.courses || []).forEach(function (course, ci) {
      var val = courseValidation(sec, ci);
      var countCls = val.valid ? 'fn-selection-count--valid' : 'fn-selection-count--invalid';
      var courseCls = val.valid ? 'fn-course fn-course--valid' : 'fn-course fn-course--invalid';
      html += '<section class="' + courseCls + '">';
      html += '<div class="fn-course__head">';
      html += '<h3 class="fn-course__label">' + esc(course.course) + '</h3>';
      html += '<span class="fn-selection-count ' + countCls + '">' + esc(val.label) + '</span>';
      html += '</div>';
      html += '<div class="fn-dish-chips">';
      (course.items || []).forEach(function (item, ii) {
        var ikey = itemKey(_state.eventId, _state.sectionId, ci, ii);
        var selected = !!_state.selections[ikey];
        var hasRecipe = !!item.recipeId;
        var chipCls = 'fn-dish-chip';
        if (selected) chipCls += ' fn-dish-chip--selected';
        if (!hasRecipe) chipCls += ' fn-dish-chip--no-recipe';
        var tags = (item.tags || [])
          .map(function (t) {
            return '<span class="fn-dish-chip__tag">' + esc(t) + '</span>';
          })
          .join('');
        html +=
          '<div class="fn-dish-chip-wrap">' +
          '<button type="button" class="' +
          chipCls +
          '" data-ci="' +
          ci +
          '" data-ii="' +
          ii +
          '" data-has-recipe="' +
          (hasRecipe ? '1' : '0') +
          '"' +
          ' aria-pressed="' +
          (selected ? 'true' : 'false') +
          '">' +
          '<span class="fn-dish-chip__state" aria-hidden="true">' +
          (selected ? '✓' : '+') +
          '</span><span class="fn-dish-chip__content"><span class="fn-dish-chip__name">' +
          esc(item.name) +
          '</span>' +
          (tags ? '<span class="fn-dish-chip__tags">' + tags + '</span>' : '') +
          '</span>' +
          '</button>';
        if (hasRecipe) {
          html +=
            '<button type="button" class="fn-dish-chip__open" data-recipe-id="' +
            escAttr(item.recipeId) +
            '" title="Open recipe" aria-label="Open recipe: ' +
            escAttr(item.name) +
            '">▶</button>';
        } else {
          html += '<span class="fn-dish-chip__badge">Recipe confirmation</span>';
        }
        if (selected && hasRecipe && item.recipeId && window.KuschiPlannerExtras) {
          html += window.KuschiPlannerExtras.renderHintChips(item.recipeId);
        }
        html += '</div>';
      });
      html += '</div></section>';
    });

    body.innerHTML = html;

    body.querySelectorAll('.fn-dish-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleItem(parseInt(btn.getAttribute('data-ci'), 10), parseInt(btn.getAttribute('data-ii'), 10));
      });
    });
    body.querySelectorAll('.fn-dish-chip__open').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        openRecipeFromItem(btn.getAttribute('data-recipe-id'));
      });
    });

    if (genBtn) {
      var compactCopy = useCompactPlannerCopy();
      genBtn.disabled = !sectionValid(sec) || !(_state.pax > 0);
      genBtn.textContent = ready
        ? compactCopy
          ? 'Generate list (' + stats.selected + ')'
          : 'Generate Full Planner List (' + stats.selected + ' dishes)'
        : compactCopy
          ? 'Finish choices'
          : 'Complete Required Choices';
    }
  }

  function resolveRecipeId(recipeId, redirects) {
    return (redirects && redirects[recipeId]) || recipeId;
  }

  var _aliasRedirects = null;

  function loadAliasRedirects(cb) {
    if (_aliasRedirects) {
      cb(_aliasRedirects);
      return;
    }
    var base = _cfg && _cfg.siteBaseUrl ? _cfg.siteBaseUrl() : '';
    fetch(base + '/riviera_data/canonical_recipe_aliases.json')
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        _aliasRedirects = (d && d.recipe_id_redirects) || {};
        cb(_aliasRedirects);
      })
      .catch(function () {
        _aliasRedirects = {};
        cb(_aliasRedirects);
      });
  }

  function buildPlanPayloadWithRedirects(redirects) {
    var pkg = findPkg(_state.eventId);
    var sec = findSection(pkg, _state.sectionId);
    if (!pkg || !sec) return null;
    var recipes = _cfg.getRecipes ? _cfg.getRecipes() || [] : [];
    var recipeMap = {};
    recipes.forEach(function (r) {
      recipeMap[r.id] = r;
    });
    var coursesOut = [];
    var recipeIds = [];
    (sec.courses || []).forEach(function (course, ci) {
      var itemsOut = [];
      (course.items || []).forEach(function (item, ii) {
        var key = itemKey(_state.eventId, _state.sectionId, ci, ii);
        if (!_state.selections[key]) return;
        var resolvedId = item.recipeId ? resolveRecipeId(item.recipeId, redirects) : '';
        var recipe = item.recipeId ? recipeMap[resolvedId] || recipeMap[item.recipeId] || null : null;
        var useId = recipe ? recipe.id : '';
        var recipeLinkStatus =
          item.recipeLinkStatus ||
          (!recipe && item.recipeId ? 'RECIPE DATA UNAVAILABLE — NEEDS CONFIRMATION' : '');
        itemsOut.push({
          name: item.name,
          recipeId: useId,
          tags: item.tags || [],
          recipe: recipe,
          recipeLinkStatus: recipeLinkStatus,
          quantityPerGuest: item.quantityPerGuest != null ? Number(item.quantityPerGuest) : null,
          unit: item.unit || '',
          automaticEventBufferMultiplier:
            item.automaticEventBufferMultiplier != null
              ? Number(item.automaticEventBufferMultiplier)
              : null,
          serviceTargetQuantity:
            item.quantityPerGuest != null
              ? _state.pax *
                Number(item.quantityPerGuest) *
                (item.automaticEventBufferMultiplier != null
                  ? Number(item.automaticEventBufferMultiplier)
                  : 1)
              : null,
        });
        if (useId && recipeIds.indexOf(useId) < 0) recipeIds.push(useId);
      });
      if (itemsOut.length) {
        coursesOut.push({
          course: course.course,
          selection: course.selection || { mode: 'optional' },
          items: itemsOut,
          courseIdx: ci,
        });
      }
    });
    return {
      eventId: _state.eventId,
      eventLabel: pkg.label,
      eventIcon: pkg.icon,
      sectionId: _state.sectionId,
      sectionLabel: sec.label,
      style: sec.style || '',
      price: sec.price || '',
      salesStatus: sec.salesStatus || 'NEEDS CURRENT SALES CONFIRMATION',
      sourceStatus: sec.sourceStatus || '',
      pax: _state.pax,
      eventDate: _state.eventDate || '',
      courses: coursesOut,
      recipeIds: recipeIds,
    };
  }

  function buildPlanPayload() {
    return buildPlanPayloadWithRedirects(_aliasRedirects || {});
  }

  function generatePrepSheet() {
    if (!sectionValid(findSection(findPkg(_state.eventId), _state.sectionId))) return;
    loadAliasRedirects(function (redirects) {
      var payload = buildPlanPayloadWithRedirects(redirects);
      if (!payload) return;
      saveState();
      if (_cfg && typeof _cfg.onGenerate === 'function') {
        _cfg.onGenerate(payload);
      } else if (window.KuschiPackagePrepSheet && typeof window.KuschiPackagePrepSheet.open === 'function') {
        window.KuschiPackagePrepSheet.open(payload);
      }
    });
  }

  function openPlanner() {
    var overlay = document.getElementById('functionPlannerOverlay');
    var btn = document.getElementById('pkgsToggle');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.classList.add('fn-planner-open');
    if (btn) {
      btn.classList.add('pkgs-toggle--active');
      btn.setAttribute('aria-expanded', 'true');
    }
    loadPackages(function (data) {
      if (!_state.eventId && data.packages && data.packages.length) {
        _state.eventId = data.packages[0].id;
        _state.sectionId = data.packages[0].sections[0].id;
        saveState();
      }
      function finishOpen() {
        var pkg = findPkg(_state.eventId);
        var sec = findSection(pkg, _state.sectionId);
        autoSelectDefaultCourses(sec);
        saveState();
        renderEventTabs();
        if (pkg) renderSectionTabs(pkg);
        renderBody();
        syncUrl({ clearOpen: true });
      }
      if (window.KuschiPlannerExtras && typeof window.KuschiPlannerExtras.loadPlannerExtrasData === 'function') {
        window.KuschiPlannerExtras.loadPlannerExtrasData().then(finishOpen).catch(finishOpen);
      } else {
        finishOpen();
      }
    });
  }

  function closePlanner() {
    var overlay = document.getElementById('functionPlannerOverlay');
    var btn = document.getElementById('pkgsToggle');
    if (overlay) overlay.classList.remove('open');
    document.body.classList.remove('fn-planner-open');
    if (btn) {
      btn.classList.remove('pkgs-toggle--active');
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  function togglePlanner() {
    var overlay = document.getElementById('functionPlannerOverlay');
    if (!overlay) return;
    if (overlay.classList.contains('open')) closePlanner();
    else openPlanner();
  }

  function bindControls() {
    var closeBtn = document.getElementById('fnPlannerClose');
    if (closeBtn) closeBtn.addEventListener('click', closePlanner);
    var genBtn = document.getElementById('fnPlannerGenerate');
    if (genBtn) genBtn.addEventListener('click', generatePrepSheet);
    var paxInput = document.getElementById('fnPlannerPax');
    if (paxInput) {
      paxInput.addEventListener('input', function () {
        var n = parseFloat(paxInput.value);
        _state.pax = n > 0 ? n : 100;
        saveState();
        syncUrl();
        renderBody();
      });
    }
    var dateInput = document.getElementById('fnPlannerEventDate');
    if (dateInput) {
      dateInput.addEventListener('change', function () {
        _state.eventDate = dateInput.value || '';
        saveState();
        syncUrl();
      });
    }
    var overlay = document.getElementById('functionPlannerOverlay');
    if (overlay) {
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay) closePlanner();
      });
    }
    var exportBtn = document.getElementById('fnPlannerExport');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var X = window.KuschiPlannerExtras;
        if (!X) return;
        X.downloadJson('kuschi-planner-plan.json', X.exportPlanBundle(_state));
      });
    }
    var importBtn = document.getElementById('fnPlannerImport');
    var importFile = document.getElementById('fnPlannerImportFile');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', function () {
        importFile.click();
      });
      importFile.addEventListener('change', function () {
        var file = importFile.files && importFile.files[0];
        importFile.value = '';
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var bundle = JSON.parse(String(reader.result || ''));
            var X = window.KuschiPlannerExtras;
            if (!X) throw new Error('Planner extras not loaded');
            X.importPlanBundle(bundle, {
              applyState: function (st) {
                _state = Object.assign({}, _state, st);
                saveState();
                loadPackages(function () {
                  renderEventTabs();
                  var pkg = findPkg(_state.eventId);
                  if (pkg) renderSectionTabs(pkg);
                  renderBody();
                  syncUrl();
                });
              },
            });
          } catch (e) {
            alert('Could not import plan: ' + (e && e.message ? e.message : 'invalid file'));
          }
        };
        reader.readAsText(file);
      });
    }
  }

  function tryDeepLink() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (_) {
      return;
    }
    var pkgId = params.get('pkg');
    var secId = params.get('section');
    var pax = params.get('pax');
    var eventDate = params.get('eventDate');
    var sel = params.get('sel');
    var planner = params.get('planner');
    var recipeId = params.get('open');
    if (pax) {
      var pn = parseFloat(pax);
      if (pn > 0) _state.pax = pn;
    }
    if (eventDate) _state.eventDate = eventDate;
    if (sel) applySelParam(sel);
    if (pkgId) _state.eventId = pkgId;
    if (secId) _state.sectionId = secId;

    function openRecipeWhenReady() {
      if (!recipeId || !_cfg || typeof _cfg.openRecipe !== 'function') return;
      var recipes = _cfg.getRecipes ? _cfg.getRecipes() || [] : [];
      if (!recipes.find(function (r) {
        return r.id === recipeId;
      })) {
        return;
      }
      _cfg.openRecipe(recipeId, { skipUrl: true, replaceUrl: true });
    }

    if (pkgId || planner === '1') {
      loadPackages(function () {
        if (pkgId) {
          var pkg = findPkg(pkgId);
          if (pkg) {
            if (!secId && pkg.sections && pkg.sections[0]) {
              _state.sectionId = pkg.sections[0].id;
            }
            var sec = findSection(pkg, _state.sectionId);
            autoSelectDefaultCourses(sec);
          }
        }
        saveState();
        openPlanner();
        if (recipeId) openRecipeWhenReady();
      });
      return;
    }
    if (recipeId) openRecipeWhenReady();
  }

  function init(config) {
    _cfg = Object.assign({}, _cfg || {}, config || {});
    loadState();
  }

  function bootDeepLink() {
    tryDeepLink();
  }

  window.KuschiPackagePlanner = {
    init: init,
    open: openPlanner,
    close: closePlanner,
    toggle: togglePlanner,
    buildPlanPayload: buildPlanPayload,
    getState: function () {
      return Object.assign({}, _state);
    },
    getActivePayload: function () {
      return buildPlanPayload();
    },
    tryDeepLink: tryDeepLink,
    bootDeepLink: bootDeepLink,
  };
  window.togglePackageBrowser = togglePlanner;
  window.clearPackageSearch = function () {};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      bindControls();
    });
  } else {
    bindControls();
  }
})();
