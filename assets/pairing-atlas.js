/**
 * Aroma matrix — priority spices × G1–G8 from aroma_data (reference-sheet style).
 */
(function () {
  'use strict';

  var ING = 'aroma_data/ingredients.json';
  var META = 'aroma_data/aroma_matrix_meta.json';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildTable(meta, ingredients, mode) {
    var labels = meta.group_labels || [];
    while (labels.length < 8) labels.push('G' + (labels.length + 1));

    var byId = Object.create(null);
    for (var i = 0; i < ingredients.length; i++) {
      var ing = ingredients[i];
      if (ing && ing.id) byId[ing.id] = ing;
    }

    var displayNames = meta.display_names && typeof meta.display_names === 'object' ? meta.display_names : {};

    var rows = [];
    if (mode === 'priority') {
      var order = meta.priority_row_ids || [];
      for (var o = 0; o < order.length; o++) {
        var id = order[o];
        if (byId[id]) rows.push(byId[id]);
      }
    } else {
      rows = ingredients.slice().sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      });
    }

    var thead =
      '<thead><tr><th scope="col" class="pa-mx-spice">Spice / herb</th>' +
      labels
        .slice(0, 8)
        .map(function (lab, idx) {
          var g = idx + 1;
          return (
            '<th scope="col" class="pa-mx-g pa-mx-g' +
            g +
            '" title="Group ' +
            g +
            ': ' +
            esc(lab) +
            '"><span class="pa-mx-gh-short">G' +
            g +
            '</span><span class="pa-mx-gh-long">' +
            esc(lab) +
            '</span></th>'
          );
        })
        .join('') +
      '</tr></thead>';

    var body = rows
      .map(function (ing) {
        var groups = ing.aroma_groups || [];
        var gset = Object.create(null);
        for (var gi = 0; gi < groups.length; gi++) gset[groups[gi]] = true;

        var label = displayNames[ing.id] || ing.name || ing.id;
        var cells = '';
        for (var c = 1; c <= 8; c++) {
          var on = !!gset[c];
          var lab = labels[c - 1] || 'G' + c;
          cells +=
            '<td class="pa-mx-cell pa-mx-g' +
            c +
            (on ? ' pa-mx-on' : ' pa-mx-off') +
            '" aria-label="' +
            esc(label + ': ' + lab + (on ? ' — active' : ' — not primary')) +
            '">' +
            (on ? '<span class="pa-mx-mark pa-mx-l" aria-hidden="true">●</span>' : '<span class="pa-mx-mark pa-mx-n" aria-hidden="true">·</span>') +
            '</td>';
        }

        return (
          '<tr data-spice-id="' +
          esc(ing.id) +
          '">' +
          '<th scope="row" class="pa-mx-spice"><a href="aroma.html?spice=' +
          encodeURIComponent(ing.id) +
          '" class="pa-mx-link">' +
          esc(label) +
          '</a></th>' +
          cells +
          '</tr>'
        );
      })
      .join('');

    return '<table class="pa-matrix">' + thead + '<tbody>' + body + '</tbody></table>';
  }

  function applyFilter(query) {
    var q = norm(query);
    var tr = document.querySelectorAll('.pa-matrix tbody tr');
    for (var i = 0; i < tr.length; i++) {
      var row = tr[i];
      var id = row.getAttribute('data-spice-id') || '';
      var th = row.querySelector('th');
      var text = norm(th ? th.textContent : '');
      row.hidden = q && text.indexOf(q) < 0 && id.indexOf(q) < 0;
    }
  }

  function init() {
    var host = document.getElementById('paMatrixHost');
    var status = document.getElementById('paStatus');
    var modePri = document.getElementById('paModePriority');
    var modeAll = document.getElementById('paModeAll');
    var search = document.getElementById('paMatrixSearch');

    if (!host) return;

    Promise.all([
      fetch(ING).then(function (r) {
        return r.ok ? r.json() : [];
      }),
      fetch(META).then(function (r) {
        return r.ok ? r.json() : {};
      }),
    ])
      .then(function (pair) {
        var ingredients = Array.isArray(pair[0]) ? pair[0] : [];
        var meta = pair[1] && typeof pair[1] === 'object' ? pair[1] : {};

        var currentMode = 'priority';

        function paint() {
          host.innerHTML = buildTable(meta, ingredients, currentMode);
          if (search && search.value) applyFilter(search.value);
          var n =
            currentMode === 'priority'
              ? (meta.priority_row_ids || []).filter(function (id) {
                  return ingredients.some(function (x) {
                    return x.id === id;
                  });
                }).length
              : ingredients.length;
          if (status) {
            status.textContent =
              (currentMode === 'priority' ? 'Priority sheet: ' : 'All indexed: ') +
              n +
              ' rows · G1–G8 from Aroma Bible extract · ● = active group · · = not';
          }
        }

        paint();

        if (modePri) {
          modePri.addEventListener('click', function () {
            currentMode = 'priority';
            modePri.setAttribute('aria-pressed', 'true');
            if (modeAll) modeAll.setAttribute('aria-pressed', 'false');
            paint();
          });
        }
        if (modeAll) {
          modeAll.addEventListener('click', function () {
            currentMode = 'all';
            modeAll.setAttribute('aria-pressed', 'true');
            if (modePri) modePri.setAttribute('aria-pressed', 'false');
            paint();
          });
        }

        if (search) {
          search.addEventListener('input', function () {
            applyFilter(search.value);
          });
        }
      })
      .catch(function () {
        host.innerHTML = '<p class="pa-error">Could not load aroma matrix data.</p>';
        if (status) status.textContent = '';
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
