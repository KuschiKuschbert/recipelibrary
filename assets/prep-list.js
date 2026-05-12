/**
 * Prep board: actor chips (Kuschi, Ash, custom teammates) + task list per Riviera or kitchen book.
 */
(function () {
  'use strict';

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

  function weightPriority(p) {
    if (p === 'high') return 0;
    if (p === 'low') return 2;
    return 1;
  }

  function sortTasksForDisplay(tasks, hideDone) {
    var list = (tasks || []).slice();
    if (hideDone) list = list.filter(function (x) {
      return !x.done;
    });
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

  function create(config) {
    var overlayId = config.overlayId;
    var bodyId = config.bodyId;
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

    function loadDoc() {
      if (!window.KuschiUserRecipes) return { selectedId: 'kuschi', employees: [], tasks: [], hideDone: false };
      if (bookId) return KuschiUserRecipes.loadBookPrepBoard(bookId);
      return KuschiUserRecipes.loadRivieraPrepBoard();
    }

    function saveDoc(doc) {
      if (!window.KuschiUserRecipes) return;
      if (bookId) KuschiUserRecipes.saveBookPrepBoard(bookId, doc);
      else KuschiUserRecipes.saveRivieraPrepBoard(doc);
    }

    function renderBody() {
      var doc = loadDoc();
      var body = document.getElementById(bodyId);
      if (!body) return;

      var selected = doc.selectedId || 'kuschi';
      var hideDone = !!doc.hideDone;
      var sorted = sortTasksForDisplay(doc.tasks, hideDone);

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

      var rows = sorted
        .map(function (t) {
          var tid = escAttr(t.id);
          var actors = allActors(doc);
          var assignOpts = actors
            .map(function (a) {
              var sel = t.assigneeId === a.id ? ' selected' : '';
              return '<option value="' + escAttr(a.id) + '"' + sel + '>' + esc(a.label) + '</option>';
            })
            .join('');
          var ph = t.priority || 'medium';
          var hSel = ph === 'high' ? ' selected' : '';
          var mSel = ph === 'medium' ? ' selected' : '';
          var lSel = ph === 'low' ? ' selected' : '';
          var doneCh = t.done ? ' checked' : '';
          var notesVal = t.notes != null ? escAttr(t.notes) : '';
          return (
            '<div class="prep-task-row" data-task-id="' +
            tid +
            '">' +
            '<label class="prep-task-done"><input type="checkbox" data-prep-act="toggle-done" data-task-id="' +
            tid +
            '"' +
            doneCh +
            ' /><span>Done</span></label>' +
            '<input type="text" class="prep-task-title" data-prep-act="task-title" data-task-id="' +
            tid +
            '" value="' +
            escAttr(t.title) +
            '" />' +
            '<select class="prep-task-assign" data-prep-act="task-assign" data-task-id="' +
            tid +
            '">' +
            assignOpts +
            '</select>' +
            '<select class="prep-task-priority" data-prep-act="task-priority" data-task-id="' +
            tid +
            '">' +
            '<option value="high"' +
            hSel +
            '>High</option>' +
            '<option value="medium"' +
            mSel +
            '>Medium</option>' +
            '<option value="low"' +
            lSel +
            '>Low</option>' +
            '</select>' +
            '<input type="text" class="prep-task-notes" data-prep-act="task-notes" data-task-id="' +
            tid +
            '" placeholder="Notes" value="' +
            notesVal +
            '" />' +
            '<button type="button" class="btn-secondary prep-task-del" data-prep-act="del-task" data-task-id="' +
            tid +
            '">Remove</button>' +
            '</div>'
          );
        })
        .join('');

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
        '<label class="prep-hide-done"><input type="checkbox" data-prep-act="toggle-hide-done"' +
        (hideDone ? ' checked' : '') +
        ' /> Hide completed</label>' +
        '<div class="prep-task-list">' +
        (rows || '<p class="prep-empty">No tasks yet. Add one below.</p>') +
        '</div>';

      var assigneeFormEl = formIds.assignee ? document.getElementById(formIds.assignee) : null;
      fillAssigneeSelect(assigneeFormEl, loadDoc());
    }

    function onOverlayClick(e) {
      var btn = e.target.closest('[data-prep-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-prep-act');
      var doc = loadDoc();

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

      if (act === 'del-task') {
        var tid2 = btn.getAttribute('data-task-id');
        doc.tasks = (doc.tasks || []).filter(function (x) {
          return x && x.id !== tid2;
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
      if (act !== 'task-assign' && act !== 'task-priority') return;
      var tid = el.getAttribute('data-task-id');
      if (!tid) return;
      var doc = loadDoc();
      var t = (doc.tasks || []).find(function (x) {
        return x && x.id === tid;
      });
      if (!t) return;
      if (act === 'task-assign') t.assigneeId = el.value;
      if (act === 'task-priority') t.priority = el.value;
      saveDoc(doc);
    }

    function onOverlayBlur(e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      var act = el.getAttribute('data-prep-act');
      if (act !== 'task-title' && act !== 'task-notes') return;
      var tid = el.getAttribute('data-task-id');
      if (!tid) return;
      var doc = loadDoc();
      var t = (doc.tasks || []).find(function (x) {
        return x && x.id === tid;
      });
      if (!t) return;
      if (act === 'task-title') {
        var nt = String(el.value || '').trim();
        if (!nt) {
          alert('Task title cannot be empty.');
          renderBody();
          return;
        }
        t.title = nt.slice(0, 500);
      }
      if (act === 'task-notes') {
        var n = String(el.value || '').trim();
        if (n) t.notes = n.slice(0, 500);
        else delete t.notes;
      }
      saveDoc(doc);
    }

    function bindOverlay() {
      var overlay = document.getElementById(overlayId);
      if (!overlay || overlay._kuschiPrepListBound) return;
      overlay._kuschiPrepListBound = true;
      overlay.addEventListener('click', onOverlayClick);
      overlay.addEventListener('change', onOverlayChange);
      overlay.addEventListener('blur', onOverlayBlur, true);
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
      var el = document.getElementById(overlayId);
      if (el) el.classList.remove('open');
      if (shouldReleaseBodyScroll()) document.body.style.overflow = '';
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
      saveDoc(doc);
      if (titleEl) titleEl.value = '';
      if (notesEl) notesEl.value = '';
      renderBody();
    }

    function copyJson() {
      var jsonStr;
      if (bookId) jsonStr = KuschiUserRecipes.exportBookPrepBoardJson(bookId);
      else jsonStr = KuschiUserRecipes.exportRivieraPrepBoardJson();
      navigator.clipboard.writeText(jsonStr).then(function () {
        alert('Prep board JSON copied.');
      });
    }

    function importJsonFile() {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            if (bookId) KuschiUserRecipes.importBookPrepBoardJson(bookId, String(reader.result || ''));
            else KuschiUserRecipes.importRivieraPrepBoardJson(String(reader.result || ''));
            renderBody();
            alert('Prep board imported.');
          } catch (err) {
            alert((err && err.message) || 'Import failed.');
          }
        };
        reader.readAsText(f);
      };
      inp.click();
    }

    bindOverlay();

    return {
      open: open,
      close: close,
      refresh: renderBody,
      submitAdd: submitAdd,
      copyJson: copyJson,
      importJsonFile: importJsonFile,
      getSelectedActorId: function () {
        return loadDoc().selectedId || 'kuschi';
      },
    };
  }

  window.KuschiPrepList = {
    create: create,
  };
})();
