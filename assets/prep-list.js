/**
 * Prep board: actor chips (Kuschi, Ash, custom teammates) + task list per Riviera or kitchen book.
 * Tasks are immutable after save; only Done may change. Assignee colours on task cards; optional detail sheet for long text.
 */
(function () {
  'use strict';

  var PREVIEW_TITLE_LEN = 68;
  var PREVIEW_NOTES_LEN = 40;

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function truncate(s, n) {
    var t = String(s || '');
    if (t.length <= n) return t;
    return t.slice(0, Math.max(0, n - 1)) + '…';
  }

  function weightPriority(p) {
    if (p === 'high') return 0;
    if (p === 'low') return 2;
    return 1;
  }

  function sortTasksForDisplay(tasks, hideDone) {
    var list = (tasks || []).slice();
    if (hideDone) {
      list = list.filter(function (x) {
        return !x.done;
      });
    }
    list.sort(function (a, b) {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      var pa = weightPriority(a.priority);
      var pb = weightPriority(b.priority);
      if (pa !== pb) return pa - pb;
      return (a.title || '').localeCompare(b.title || '');
    });
    return list;
  }

  function allActors(doc) {
    var out = [
      { id: 'kuschi', label: 'Kuschi', kind: 'kuschi' },
      { id: 'ash', label: 'Ash', kind: 'ash' },
    ];
    (doc.employees || []).forEach(function (e) {
      if (e && e.id && e.label) out.push({ id: e.id, label: e.label, kind: 'custom' });
    });
    return out;
  }

  function assigneeLabelForId(doc, id) {
    var actors = allActors(doc);
    for (var i = 0; i < actors.length; i++) {
      if (actors[i].id === id) return actors[i].label;
    }
    return id || '—';
  }

  function assigneeCardClass(assigneeId) {
    var id = String(assigneeId || 'kuschi');
    if (id === 'kuschi') return ' prep-task-card--by-kuschi';
    if (id === 'ash') return ' prep-task-card--by-ash';
    return ' prep-task-card--by-custom';
  }

  function priorityLabel(p) {
    if (p === 'high') return 'High';
    if (p === 'low') return 'Low';
    return 'Medium';
  }

  function fillAssigneeSelect(sel, doc) {
    if (!sel) return;
    var cur = sel.value;
    var actors = allActors(doc);
    sel.innerHTML = actors
      .map(function (a) {
        return '<option value="' + escAttr(a.id) + '">' + esc(a.label) + '</option>';
      })
      .join('');
    var ok = actors.some(function (a) {
      return a.id === cur;
    });
    sel.value = ok ? cur : doc.selectedId || 'kuschi';
  }

  function syncAddPanelVisibility(addPanelId, subTab) {
    if (!addPanelId) return;
    var p = document.getElementById(addPanelId);
    if (p) p.hidden = subTab !== 'add';
  }

  function create(config) {
    var overlayId = config.overlayId;
    var bodyId = config.bodyId;
    var addPanelId = config.addPanelId || '';
    var formIds = config.formIds || {};
    var bookId =
      config.bookId != null && String(config.bookId).trim() !== ''
        ? String(config.bookId).trim()
        : null;
    var shouldReleaseBodyScroll =
      typeof config.shouldReleaseBodyScroll === 'function'
        ? config.shouldReleaseBodyScroll
        : function () {
            return true;
          };

    var detailSheet = null;
    var detailKeydownBound = false;

    function loadDoc() {
      if (!window.KuschiUserRecipes) {
        return { selectedId: 'kuschi', employees: [], tasks: [], hideDone: false, prepSubTab: 'list' };
      }
      if (bookId) return KuschiUserRecipes.loadBookPrepBoard(bookId);
      return KuschiUserRecipes.loadRivieraPrepBoard();
    }

    function saveDoc(doc) {
      if (!window.KuschiUserRecipes) return;
      if (bookId) KuschiUserRecipes.saveBookPrepBoard(bookId, doc);
      else KuschiUserRecipes.saveRivieraPrepBoard(doc);
    }

    function ensureDetailSheet() {
      if (detailSheet) return detailSheet;
      var overlay = document.getElementById(overlayId);
      if (!overlay) return null;
      var modal = overlay.querySelector('.prep-board-modal') || overlay.querySelector('.modal');
      if (!modal) return null;
      var sheet = document.createElement('div');
      sheet.className = 'prep-task-detail-sheet';
      sheet.setAttribute('hidden', '');
      sheet.innerHTML =
        '<div class="prep-task-detail-sheet__backdrop" data-prep-act="close-detail"></div>' +
        '<div class="prep-task-detail-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="prep-task-detail-heading">' +
        '<button type="button" class="prep-task-detail-sheet__close" data-prep-act="close-detail">Close</button>' +
        '<h3 class="prep-task-detail-sheet__heading" id="prep-task-detail-heading"></h3>' +
        '<p class="prep-task-detail-sheet__meta"></p>' +
        '<p class="prep-task-detail-sheet__notes-label">Notes</p>' +
        '<p class="prep-task-detail-sheet__body"></p>' +
        '</div>';
      modal.appendChild(sheet);
      detailSheet = sheet;
      return sheet;
    }

    function closeTaskDetail() {
      if (!detailSheet) return;
      detailSheet.setAttribute('hidden', '');
      detailSheet.setAttribute('aria-hidden', 'true');
      if (detailKeydownBound) {
        var ov = document.getElementById(overlayId);
        if (ov) ov.removeEventListener('keydown', onOverlayKeydownCapture, true);
        detailKeydownBound = false;
      }
    }

    function onOverlayKeydownCapture(ev) {
      if (ev.key !== 'Escape') return;
      if (!detailSheet || detailSheet.hasAttribute('hidden')) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeTaskDetail();
    }

    function openTaskDetail(taskId) {
      var doc = loadDoc();
      var t = (doc.tasks || []).find(function (x) {
        return x && x.id === taskId;
      });
      if (!t) return;
      var sheet = ensureDetailSheet();
      if (!sheet) return;
      var h = sheet.querySelector('.prep-task-detail-sheet__heading');
      var meta = sheet.querySelector('.prep-task-detail-sheet__meta');
      var body = sheet.querySelector('.prep-task-detail-sheet__body');
      if (h) h.textContent = String(t.title || '').trim() || 'Task';
      if (meta) {
        meta.textContent =
          assigneeLabelForId(doc, t.assigneeId) +
          ' · ' +
          priorityLabel(t.priority || 'medium') +
          (t.done ? ' · Done' : '');
      }
      if (body) {
        var notes = t.notes != null ? String(t.notes).trim() : '';
        var nl = sheet.querySelector('.prep-task-detail-sheet__notes-label');
        if (notes) {
          body.textContent = notes;
          body.style.display = 'block';
          if (nl) nl.style.display = 'block';
        } else {
          body.textContent = '';
          body.style.display = 'none';
          if (nl) nl.style.display = 'none';
        }
      }
      sheet.removeAttribute('hidden');
      sheet.setAttribute('aria-hidden', 'false');
      if (!detailKeydownBound) {
        var ov = document.getElementById(overlayId);
        if (ov) {
          ov.addEventListener('keydown', onOverlayKeydownCapture, true);
          detailKeydownBound = true;
        }
      }
    }

    function renderBody() {
      var doc = loadDoc();
      var body = document.getElementById(bodyId);
      if (!body) return;

      closeTaskDetail();

      var selected = doc.selectedId || 'kuschi';
      var hideDone = !!doc.hideDone;
      var subTab = doc.prepSubTab === 'add' ? 'add' : 'list';
      var sorted = sortTasksForDisplay(doc.tasks, hideDone);

      syncAddPanelVisibility(addPanelId, subTab);

      var chipHtml = function (id, label, kind) {
        var pressed = selected === id ? 'true' : 'false';
        var mod = kind === 'kuschi' ? ' prep-actor-chip--kuschi' : kind === 'ash' ? ' prep-actor-chip--ash' : ' prep-actor-chip--custom';
        return (
          '<button type="button" class="prep-actor-chip' +
          mod +
          '" data-prep-act="select-actor" data-actor-id="' +
          escAttr(id) +
          '" aria-pressed="' +
          pressed +
          '">' +
          esc(label) +
          '</button>'
        );
      };

      var chips = chipHtml('kuschi', 'Kuschi', 'kuschi') + chipHtml('ash', 'Ash', 'ash');
      (doc.employees || []).forEach(function (e) {
        if (!e || !e.id) return;
        chips +=
          '<span class="prep-actor-chip-wrap">' +
          chipHtml(e.id, e.label, 'custom') +
          '<button type="button" class="prep-actor-remove" data-prep-act="remove-emp" data-emp-id="' +
          escAttr(e.id) +
          '" title="Remove teammate">×</button></span>';
      });

      var teammateInputId = formIds.teammate || '';
      var teammatePh = teammateInputId ? ' id="' + escAttr(teammateInputId) + '"' : '';

      var subListSel = subTab === 'list' ? 'true' : 'false';
      var subAddSel = subTab === 'add' ? 'true' : 'false';

      var listBlock = '';
      if (subTab === 'list') {
        var rows = sorted
          .map(function (t) {
            var tid = escAttr(t.id);
            var rawId = String(t.id || '');
            var ph = t.priority || 'medium';
            var doneCh = t.done ? ' checked' : '';
            var assignLabel = assigneeLabelForId(doc, t.assigneeId);
            var prLab = priorityLabel(ph);
            var titleFull = String(t.title || '').trim();
            var notesStr = t.notes != null ? String(t.notes).trim() : '';
            var titleLong = titleFull.length > PREVIEW_TITLE_LEN;
            var notesLong = notesStr.length > PREVIEW_NOTES_LEN;
            var openable = titleLong || notesLong;
            var titleShow = titleLong ? truncate(titleFull, PREVIEW_TITLE_LEN) : titleFull;
            var metaCore = assignLabel + ' · ' + prLab;
            var metaExtra = '';
            if (notesStr && !notesLong) {
              metaExtra = ' · ' + notesStr;
            } else if (notesStr && notesLong) {
              metaExtra = ' · ' + truncate(notesStr, PREVIEW_NOTES_LEN);
            }
            var prioMod =
              ph === 'high' ? ' prep-task-card--prio-high' : ph === 'low' ? ' prep-task-card--prio-low' : '';
            var cardMod =
              (t.done ? ' prep-task-card--done' : '') +
              prioMod +
              assigneeCardClass(t.assigneeId);
            var hint = openable
              ? '<span class="prep-task-card-hint">Tap for full text</span>'
              : '';

            var cardInner =
              '<span class="prep-task-card-title">' +
              esc(titleShow) +
              '</span>' +
              '<span class="prep-task-card-meta">' +
              esc(metaCore + metaExtra) +
              '</span>' +
              hint;

            var cardOpen;
            if (openable) {
              cardOpen =
                '<button type="button" class="prep-task-card' +
                cardMod +
                '" data-prep-act="open-task" data-task-id="' +
                tid +
                '">' +
                cardInner +
                '</button>';
            } else {
              cardOpen = '<div class="prep-task-card' + cardMod + '">' + cardInner + '</div>';
            }

            return (
              '<div class="prep-task-card-row">' +
              '<label class="prep-task-done prep-task-done--row">' +
              '<input type="checkbox" data-prep-act="toggle-done" data-task-id="' +
              tid +
              '"' +
              doneCh +
              ' />' +
              '<span>Done</span>' +
              '</label>' +
              cardOpen +
              '</div>'
            );
          })
          .join('');
        listBlock =
          '<label class="prep-hide-done"><input type="checkbox" data-prep-act="toggle-hide-done"' +
          (hideDone ? ' checked' : '') +
          ' /> Hide completed</label>' +
          '<div class="prep-task-list" role="list">' +
          (rows || '<p class="prep-empty">No tasks yet. Switch to <strong>Add task</strong> to create one.</p>') +
          '</div>';
      } else {
        listBlock =
          '<p class="prep-add-hint prep-add-hint--tab">Tasks are <strong>fixed</strong> after you save them — only <strong>Done</strong> can be changed on the All tasks tab.</p>';
      }

      body.innerHTML =
        '<div class="prep-actor-block">' +
        '<div class="prep-actor-label">Working as</div>' +
        '<div class="prep-actor-row">' +
        chips +
        '</div>' +
        '<div class="prep-add-teammate">' +
        '<input type="text"' +
        teammatePh +
        ' class="prep-teammate-input" placeholder="New teammate name" maxlength="80" autocomplete="off" />' +
        '<button type="button" class="btn-secondary" data-prep-act="add-teammate">Add teammate</button>' +
        '</div>' +
        '</div>' +
        '<div class="prep-subtabs" role="tablist" aria-label="Prep sections">' +
        '<button type="button" class="prep-subtab' +
        (subTab === 'list' ? ' prep-subtab--active' : '') +
        '" role="tab" aria-selected="' +
        subListSel +
        '" data-prep-act="subtab" data-subtab="list">All tasks</button>' +
        '<button type="button" class="prep-subtab' +
        (subTab === 'add' ? ' prep-subtab--active' : '') +
        '" role="tab" aria-selected="' +
        subAddSel +
        '" data-prep-act="subtab" data-subtab="add">Add task</button>' +
        '</div>' +
        listBlock;

      var assigneeFormEl = formIds.assignee ? document.getElementById(formIds.assignee) : null;
      fillAssigneeSelect(assigneeFormEl, loadDoc());
    }

    function onOverlayClick(e) {
      var btn = e.target.closest('[data-prep-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-prep-act');
      var doc = loadDoc();

      if (act === 'close-detail') {
        closeTaskDetail();
        return;
      }

      if (act === 'open-task') {
        var oid = btn.getAttribute('data-task-id');
        if (oid) openTaskDetail(oid);
        return;
      }

      if (act === 'subtab') {
        var st = btn.getAttribute('data-subtab');
        if (st !== 'list' && st !== 'add') return;
        doc.prepSubTab = st;
        saveDoc(doc);
        renderBody();
        return;
      }

      if (act === 'select-actor') {
        var aid = btn.getAttribute('data-actor-id');
        if (!aid) return;
        doc.selectedId = aid;
        saveDoc(doc);
        renderBody();
        return;
      }

      if (act === 'add-teammate') {
        var inpId = formIds.teammate;
        var inp = inpId ? document.getElementById(inpId) : null;
        var name = inp ? String(inp.value || '').trim() : '';
        if (!name) {
          alert('Enter a teammate name.');
          return;
        }
        var nid = 'emp-' + Date.now().toString(36);
        doc.employees = doc.employees || [];
        doc.employees.push({ id: nid, label: name });
        if (doc.employees.length > 32) doc.employees = doc.employees.slice(-32);
        if (inp) inp.value = '';
        saveDoc(doc);
        renderBody();
        return;
      }

      if (act === 'remove-emp') {
        var eid = btn.getAttribute('data-emp-id');
        if (!eid) return;
        doc.employees = (doc.employees || []).filter(function (x) {
          return x && x.id !== eid;
        });
        if (doc.selectedId === eid) doc.selectedId = 'kuschi';
        (doc.tasks || []).forEach(function (t) {
          if (t.assigneeId === eid) t.assigneeId = 'kuschi';
        });
        saveDoc(doc);
        renderBody();
        return;
      }
    }

    function onOverlayChange(e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      var act = el.getAttribute('data-prep-act');
      if (el.type === 'checkbox' && act === 'toggle-hide-done') {
        var doc0 = loadDoc();
        doc0.hideDone = el.checked;
        saveDoc(doc0);
        renderBody();
        return;
      }
      if (el.type === 'checkbox' && act === 'toggle-done') {
        var tid0 = el.getAttribute('data-task-id');
        var doc1 = loadDoc();
        var t0 = (doc1.tasks || []).find(function (x) {
          return x && x.id === tid0;
        });
        if (!t0) return;
        t0.done = el.checked;
        if (t0.done) {
          t0.completedAt = new Date().toISOString();
          t0.completedBy = doc1.selectedId || 'kuschi';
        } else {
          delete t0.completedAt;
          delete t0.completedBy;
        }
        saveDoc(doc1);
        renderBody();
        return;
      }
    }

    function bindOverlay() {
      var overlay = document.getElementById(overlayId);
      if (!overlay || overlay._kuschiPrepListBound) return;
      overlay._kuschiPrepListBound = true;
      overlay.addEventListener('click', onOverlayClick);
      overlay.addEventListener('change', onOverlayChange);
    }

    function open() {
      bindOverlay();
      renderBody();
      var el = document.getElementById(overlayId);
      if (el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    }

    function close() {
      closeTaskDetail();
      var el = document.getElementById(overlayId);
      if (el) el.classList.remove('open');
      if (shouldReleaseBodyScroll()) document.body.style.overflow = '';
    }

    function tryCloseTaskDetail() {
      if (!detailSheet || detailSheet.hasAttribute('hidden')) return false;
      closeTaskDetail();
      return true;
    }

    function submitAdd() {
      var titleEl = formIds.title ? document.getElementById(formIds.title) : null;
      var assignEl = formIds.assignee ? document.getElementById(formIds.assignee) : null;
      var priEl = formIds.priority ? document.getElementById(formIds.priority) : null;
      var notesEl = formIds.notes ? document.getElementById(formIds.notes) : null;
      var title = titleEl ? String(titleEl.value || '').trim() : '';
      if (!title) {
        alert('Enter a task title.');
        return;
      }
      var doc = loadDoc();
      var assignee = assignEl && assignEl.value ? assignEl.value : doc.selectedId || 'kuschi';
      var actors = allActors(doc);
      if (!actors.some(function (a) {
        return a.id === assignee;
      })) {
        assignee = 'kuschi';
      }
      var pr = priEl && priEl.value ? priEl.value : 'medium';
      if (pr !== 'high' && pr !== 'low') pr = 'medium';
      var notes = notesEl ? String(notesEl.value || '').trim() : '';
      var row = {
        id: 'task-' + Date.now().toString(36),
        title: title.slice(0, 500),
        assigneeId: assignee,
        priority: pr,
        done: false,
      };
      if (notes) row.notes = notes.slice(0, 500);
      doc.tasks = doc.tasks || [];
      doc.tasks.push(row);
      doc.prepSubTab = 'list';
      saveDoc(doc);
      if (titleEl) titleEl.value = '';
      if (notesEl) notesEl.value = '';
      renderBody();
    }

    bindOverlay();

    return {
      open: open,
      close: close,
      refresh: renderBody,
      submitAdd: submitAdd,
      tryCloseTaskDetail: tryCloseTaskDetail,
      getSelectedActorId: function () {
        return loadDoc().selectedId || 'kuschi';
      },
    };
  }

  window.KuschiPrepList = {
    create: create,
  };
})();
