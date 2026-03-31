/**
 * NotebookLM infographic gallery — driven by notebooklm/manifest.json
 */
(function () {
  'use strict';

  var MANIFEST = 'notebooklm/manifest.json';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Only allow static assets under notebooklm/ (no .. or schemes). */
  function safeSrc(src) {
    if (!src || typeof src !== 'string') return null;
    var t = src.trim();
    if (t.indexOf('notebooklm/') !== 0) return null;
    if (/\.\.\/|\\\.\./.test(t)) return null;
    if (/^[a-z]+:/i.test(t)) return null;
    return t;
  }

  function siteBase() {
    var p = window.location.pathname || '';
    if (/\.html?$/i.test(p)) {
      var dir = p.slice(0, p.lastIndexOf('/'));
      return dir ? window.location.origin + dir : window.location.origin;
    }
    var stripped = p.replace(/\/$/, '') || '';
    return stripped ? window.location.origin + stripped : window.location.origin;
  }

  function parseQuery() {
    var q = {};
    if (typeof URLSearchParams === 'undefined') return q;
    var sp = new URLSearchParams(window.location.search);
    var tag = sp.get('tag');
    var id = sp.get('id');
    if (tag) q.tag = tag.trim().toLowerCase();
    if (id) q.id = id.trim().toLowerCase();
    return q;
  }

  function openModal(item) {
    var overlay = document.getElementById('nbModal');
    var img = document.getElementById('nbModalImg');
    var cap = document.getElementById('nbModalCap');
    if (!overlay || !img) return;
    var src = safeSrc(item.src);
    if (!src) return;
    img.src = siteBase() + '/' + src;
    img.alt = item.alt || item.title || '';
    if (cap) {
      cap.innerHTML =
        '<strong>' +
        esc(item.title) +
        '</strong>' +
        (item.blurb ? '<br><span class="nb-modal-blurb">' + esc(item.blurb) + '</span>' : '');
    }
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    var overlay = document.getElementById('nbModal');
    var img = document.getElementById('nbModalImg');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    if (img) img.removeAttribute('src');
    document.body.style.overflow = '';
  }

  function render(items, query) {
    var grid = document.getElementById('nbGrid');
    var empty = document.getElementById('nbEmpty');
    var chips = document.getElementById('nbFilterChips');
    if (!grid) return;

    var list = items.filter(function (it) {
      if (!it || !it.id || !it.title) return false;
      if (!safeSrc(it.src)) return false;
      if (query.id && String(it.id).toLowerCase() !== query.id) return false;
      if (query.tag) {
        var tags = Array.isArray(it.tags) ? it.tags : [];
        var hit = tags.some(function (t) {
          return String(t).toLowerCase() === query.tag;
        });
        if (!hit) return false;
      }
      return true;
    });

    if (!list.length) {
      grid.innerHTML = '';
      if (items.length === 0) {
        if (empty) empty.hidden = false;
      } else {
        if (empty) empty.hidden = true;
        grid.innerHTML =
          '<p class="nb-status" style="grid-column:1/-1;margin:0">' +
          'No match — <a href="notebooklm-gallery.html" style="color:var(--gold)">show all</a>.</p>';
      }
      if (chips) {
        chips.innerHTML = '';
        chips.hidden = true;
      }
      return;
    }
    if (empty) empty.hidden = true;

    var tagSet = Object.create(null);
    for (var i = 0; i < items.length; i++) {
      var tg = items[i].tags;
      if (!Array.isArray(tg)) continue;
      for (var j = 0; j < tg.length; j++) tagSet[String(tg[j]).toLowerCase()] = tg[j];
    }
    var tagKeys = Object.keys(tagSet).sort();
    if (chips) {
      chips.hidden = tagKeys.length === 0;
      if (tagKeys.length) {
        chips.innerHTML =
          '<span class="nb-chip-label">Filter:</span> ' +
          '<a href="notebooklm-gallery.html" class="nb-chip' +
          (!query.tag ? ' nb-chip--on' : '') +
          '">All</a> ' +
          tagKeys
            .map(function (k) {
              var on = query.tag === k ? ' nb-chip--on' : '';
              return (
                '<a href="notebooklm-gallery.html?tag=' +
                encodeURIComponent(k) +
                '" class="nb-chip' +
                on +
                '">' +
                esc(tagSet[k]) +
                '</a>'
              );
            })
            .join(' ');
      } else chips.innerHTML = '';
    }

    grid.innerHTML = list
      .map(function (it) {
        var src = safeSrc(it.src);
        var url = siteBase() + '/' + src;
        return (
          '<article class="nb-card" data-nb-id="' +
          esc(it.id) +
          '">' +
          '<button type="button" class="nb-card-hit" aria-label="Open full size: ' +
          esc(it.title) +
          '">' +
          '<img class="nb-thumb" src="' +
          esc(url) +
          '" alt="' +
          esc(it.alt || it.title) +
          '" loading="lazy" decoding="async" width="640" height="360" />' +
          '</button>' +
          '<div class="nb-card-body">' +
          '<h2 class="nb-card-title">' +
          esc(it.title) +
          '</h2>' +
          (it.blurb ? '<p class="nb-card-blurb">' + esc(it.blurb) + '</p>' : '') +
          (it.source_notebook
            ? '<p class="nb-card-src">' + esc(it.source_notebook) + '</p>'
            : '') +
          '</div></article>'
        );
      })
      .join('');

    grid.querySelectorAll('.nb-card-hit').forEach(function (btn, idx) {
      btn.addEventListener('click', function () {
        openModal(list[idx]);
      });
    });

    if (query.id && list.length === 1) {
      openModal(list[0]);
    }
  }

  function boot() {
    var status = document.getElementById('nbStatus');
    fetch(MANIFEST)
      .then(function (r) {
        if (!r.ok) throw new Error('manifest');
        return r.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) data = [];
        if (status) {
          status.textContent =
            data.length === 0
              ? 'No infographics in the manifest yet — see notebooklm/README.md.'
              : data.length + ' visual' + (data.length === 1 ? '' : 's') + ' in gallery.';
        }
        render(data, parseQuery());
      })
      .catch(function () {
        if (status) status.textContent = 'Could not load notebooklm/manifest.json.';
      });

    document.getElementById('nbModalClose').addEventListener('click', closeModal);
    document.getElementById('nbModal').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
