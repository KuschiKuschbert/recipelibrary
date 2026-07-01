'use strict';

(function () {
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function normalizeQuery(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function queryCandidates(query) {
    var original = normalizeQuery(query);
    if (!original) return [];
    var q = original;
    var variants = [];
    function addVariant(text) {
      text = String(text || '').trim();
      if (text && variants.indexOf(text) < 0) variants.push(text);
    }
    [
      /^(?:what|which)\s+(?:should|would|can)\s+i\s+(?:season|flavour|flavor|cook|use|add|put|pair)\s+(.+?)\s+(?:with|for|on|in|to)$/,
      /^(?:what|which)\s+(?:should|would|can)\s+i\s+(?:season|flavour|flavor|cook|use|add|put|pair)\s+(?:with|for|on|in|to)\s+(.+)$/,
      /^(?:how)\s+(?:should|would|can|do)\s+i\s+(?:season|flavour|flavor|cook|use|add|put|pair)\s+(.+)$/,
      /^(?:what|which)\s+(?:spices?|herbs?|seasonings?|flavours|flavors)\s+(?:should|would|can)\s+i\s+(?:use|add|put)\s+(.+?)\s+(?:with|for|on|in|to)$/,
      /^(?:what|which)\s+(?:spices?|herbs?|seasonings?|flavours|flavors)\s+(?:should|would|can)\s+i\s+(?:use|add|put)\s+(?:with|for|on|in|to)\s+(.+)$/,
      /^(?:what|which)\s+(?:can|should|would)\s+i\s+(?:use|add|put)\s+instead\s+of\s+(.+)$/,
      /^(?:what|which)\s+(?:can|should|would)\s+i\s+(?:substitute|swap|replace)\s+(?:for\s+)?(.+)$/,
      /^(?:substitute|swap|replace)\s+(?:for\s+)?(.+)$/,
      /^(?:instead\s+of|without)\s+(.+)$/,
    ].forEach(function (pattern) {
      var match = original.match(pattern);
      if (match && match[1]) addVariant(match[1]);
    });
    [
      /^(what|which)\s+(goes|pairs|works)\s+(with|well\s+with)\s+/,
      /^(goes|pairs|works)\s+(with|well\s+with)\s+/,
      /^(what|which)\s+(can|should|would)\s+i\s+(pair|use|cook|season|flavour|flavor|add|put)\s+(with\s+|for\s+|on\s+|in\s+|to\s+)?/,
      /^how\s+(do|should|can|would)\s+i\s+(season|flavour|flavor|cook|use|add|put|pair)\s+/,
      /^(pair|match|use|cook|season|flavour|flavor)\s+(this\s+with\s+|with\s+|for\s+)?/,
      /^(best|good|quick)\s+(pairings?|matches|flavours|flavors)\s+(for|with)\s+/,
      /^(pairings?|matches|flavours|flavors)\s+(for|with)\s+/,
      /^(what|which)\s+(spices?|herbs?|seasonings?|flavours|flavors)\s+(go|work|pair)\s+(with|for)\s+/,
      /^(what|which)\s+(spices?|herbs?|seasonings?|flavours|flavors)\s+(for|with)\s+/,
      /^(spices?|herbs?|seasonings?|flavours|flavors)\s+(for|with)\s+/,
      /\s+(pairings?|matches|ideas|please)$/,
      /\s+(with|for|on|in|to)$/,
    ].forEach(function (pattern) {
      q = q.replace(pattern, '').trim();
    });
    var words = q.split(' ');
    ['with', 'for', 'to'].forEach(function (marker) {
      var idx = words.indexOf(marker);
      if (idx >= 0 && idx < words.length - 1) {
        addVariant(words.slice(0, idx).join(' ').trim());
        addVariant(words.slice(idx + 1).join(' ').trim());
      }
    });
    addVariant(q);
    addVariant(original);
    return variants;
  }

  function createRowMatcher(rows, options) {
    options = options || {};
    rows = rows || [];
    var nameForRow =
      typeof options.nameForRow === 'function'
        ? options.nameForRow
        : function (row) {
            return row && (row.name || row.id) ? row.name || row.id : '';
          };
    var idForRow =
      typeof options.idForRow === 'function'
        ? options.idForRow
        : function (row) {
            return row && row.id ? row.id : '';
          };
    var entries = [];
    var exact = Object.create(null);
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row) continue;
      var idn = normalizeQuery(idForRow(row));
      var nn = normalizeQuery(nameForRow(row));
      if (!idn && !nn) continue;
      var entry = { row: row, idn: idn, nn: nn };
      entries.push(entry);
      if (idn && !exact[idn]) exact[idn] = entry;
      if (nn && !exact[nn]) exact[nn] = entry;
    }

    function matchCandidate(candidate, matchOptions) {
      var q = normalizeQuery(candidate);
      if (!q || q.length < 2) return null;
      if (exact[q]) return { item: exact[q].row, strength: 3 };
      matchOptions = matchOptions || {};
      var reverseContains = !!matchOptions.reverseContains;
      var prefix = null;
      var contains = null;
      for (var ei = 0; ei < entries.length; ei++) {
        var current = entries[ei];
        if (!prefix && ((current.idn && current.idn.indexOf(q) === 0) || (current.nn && current.nn.indexOf(q) === 0))) {
          prefix = { item: current.row, strength: 2 };
        }
        if (
          !contains &&
          q.length >= 3 &&
          ((current.idn && current.idn.indexOf(q) >= 0) ||
            (current.nn && current.nn.indexOf(q) >= 0) ||
            (reverseContains && current.nn && q.indexOf(current.nn) >= 0))
        ) {
          contains = { item: current.row, strength: 1 };
        }
        if (prefix && contains) break;
      }
      return prefix || contains;
    }

    function best(query, matchOptions) {
      var candidates = queryCandidates(query);
      for (var ci = 0; ci < candidates.length; ci++) {
        var match = matchCandidate(candidates[ci], matchOptions);
        if (match) return match;
      }
      return null;
    }

    function search(query, searchOptions) {
      searchOptions = searchOptions || {};
      var candidates = queryCandidates(query);
      var limit = searchOptions.limit || 40;
      var scanLimit = searchOptions.scanLimit || limit * 2;
      var reverseContains = searchOptions.reverseContains !== false;
      var includeId = !!searchOptions.includeId;
      for (var ci = 0; ci < candidates.length; ci++) {
        var q = normalizeQuery(candidates[ci]);
        if (!q) continue;
        var out = [];
        for (var ei = 0; ei < entries.length; ei++) {
          var current = entries[ei];
          var nameHit = current.nn && (current.nn === q || current.nn.indexOf(q) >= 0 || (reverseContains && q.indexOf(current.nn) >= 0));
          var idHit = includeId && current.idn && (current.idn === q || current.idn.indexOf(q) >= 0);
          if (nameHit || idHit) out.push(current.row);
          if (out.length > scanLimit) break;
        }
        if (out.length) return out.slice(0, limit);
      }
      return [];
    }

    return {
      entries: entries,
      matchCandidate: matchCandidate,
      best: best,
      search: search,
    };
  }

  function attr(value) {
    return esc(value).replace(/"/g, '&quot;');
  }

  function attrs(map) {
    if (!map) return '';
    return Object.keys(map)
      .filter(function (key) {
        return map[key] !== null && map[key] !== undefined && map[key] !== false;
      })
      .map(function (key) {
        if (map[key] === true) return ' ' + key;
        return ' ' + key + '="' + attr(map[key]) + '"';
      })
      .join('');
  }

  function empty(text, extraClass) {
    return '<p class="ingredient-flow-empty' + (extraClass ? ' ' + extraClass : '') + '">' + esc(text || 'No direct row in this extract yet.') + '</p>';
  }

  function chip(text, options) {
    var label = String(text == null ? '' : text).trim();
    if (!label) return '';
    options = options || {};
    var cls =
      'ingredient-flow-chip' +
      (options.avoid ? ' ingredient-flow-chip--avoid' : '') +
      (options.className ? ' ' + options.className : '');
    if (options.href) return '<a class="' + cls + '" href="' + attr(options.href) + '"' + attrs(options.attrs) + '>' + esc(label) + '</a>';
    return '<span class="' + cls + '"' + attrs(options.attrs) + '>' + esc(label) + '</span>';
  }

  function chips(items, options) {
    options = options || {};
    if (!items || !items.length) return empty(options.empty, options.emptyClassName);
    return (
      '<div class="ingredient-flow-chips' +
      (options.className ? ' ' + options.className : '') +
      '">' +
      items
        .slice(0, options.limit || items.length)
        .map(function (item) {
          var text = options.textForItem ? options.textForItem(item) : item && item.name ? item.name : item;
          var href = options.hrefForItem ? options.hrefForItem(item) : options.href;
          return chip(text, {
            href: href,
            avoid: options.avoid,
            className: options.chipClassName,
            attrs: options.attrsForItem ? options.attrsForItem(item) : null,
          });
        })
        .join('') +
      '</div>'
    );
  }

  function summaryText(items, options) {
    options = options || {};
    var out = [];
    for (var i = 0; i < (items || []).length; i++) {
      var item = items[i];
      var text = options.textForItem ? options.textForItem(item) : item && item.name ? item.name : String(item || '');
      text = String(text || '').trim();
      if (!text) continue;
      out.push(text);
      if (options.limit && out.length >= options.limit) break;
    }
    return out.join(options.separator || ', ');
  }

  function useList(items, options) {
    options = options || {};
    if (!items || !items.length) return empty(options.empty || 'No use note in this extract yet.', options.emptyClassName);
    return (
      '<ul class="ingredient-flow-use-list' +
      (options.className ? ' ' + options.className : '') +
      '">' +
      items
        .slice(0, options.limit || items.length)
        .map(function (item) {
          return '<li>' + esc(item) + '</li>';
        })
        .join('') +
      '</ul>'
    );
  }

  function pill(content, options) {
    options = options || {};
    var html = options.raw ? String(content || '') : esc(content || '');
    if (!html) return '';
    return (
      '<span class="ingredient-flow-pill' +
      (options.className ? ' ' + options.className : '') +
      '"' +
      (options.label ? ' aria-label="' + attr(options.label) + '"' : '') +
      '>' +
      html +
      '</span>'
    );
  }

  function meta(items, options) {
    options = options || {};
    var list = items || [];
    var pills = list
      .slice(0, options.limit || list.length)
      .map(function (item) {
        if (item && typeof item === 'object') return pill(item.html || item.text, item);
        return pill(item, options.itemOptions);
      })
      .join('');
    return '<div class="ingredient-flow-meta' + (options.className ? ' ' + options.className : '') + '">' + pills + '</div>';
  }

  function action(item) {
    item = item || {};
    var cls = 'ingredient-flow-action' + (item.className ? ' ' + item.className : '');
    if (item.href) return '<a class="' + cls + '" href="' + attr(item.href) + '"' + attrs(item.attrs) + '>' + esc(item.text || '') + '</a>';
    return '<button type="button" class="' + cls + '"' + attrs(item.attrs) + '>' + esc(item.text || '') + '</button>';
  }

  function actions(items, options) {
    options = options || {};
    return '<div class="ingredient-flow-actions' + (options.className ? ' ' + options.className : '') + '">' + (items || []).map(action).join('') + '</div>';
  }

  function head(options) {
    options = options || {};
    var titleTag = options.titleTag || 'h2';
    return (
      '<div class="ingredient-flow-head' +
      (options.className ? ' ' + options.className : '') +
      '">' +
      '<div>' +
      (options.kicker ? '<p class="ingredient-flow-kicker' + (options.kickerClassName ? ' ' + options.kickerClassName : '') + '">' + esc(options.kicker) + '</p>' : '') +
      '<' +
      titleTag +
      ' class="ingredient-flow-title' +
      (options.titleClassName ? ' ' + options.titleClassName : '') +
      '">' +
      esc(options.title || '') +
      '</' +
      titleTag +
      '>' +
      (options.metaHtml || '') +
      '</div>' +
      (options.actionsHtml || '') +
      '</div>'
    );
  }

  function section(title, bodyHtml, options) {
    options = options || {};
    var tag = options.headingTag || 'h3';
    return (
      '<section class="ingredient-flow-section' +
      (options.className ? ' ' + options.className : '') +
      '">' +
      '<' +
      tag +
      '>' +
      esc(title || '') +
      '</' +
      tag +
      '>' +
      (bodyHtml || '') +
      '</section>'
    );
  }

  function grid(sections, options) {
    options = options || {};
    return '<div class="ingredient-flow-grid' + (options.className ? ' ' + options.className : '') + '">' + (sections || []).join('') + '</div>';
  }

  function priorityItem(item) {
    item = item || {};
    var value = item.html || item.value || item.text || item.empty || 'No direct note yet';
    return (
      '<div class="ingredient-flow-priority-item' +
      (item.className ? ' ' + item.className : '') +
      '">' +
      '<span class="ingredient-flow-priority-label">' +
      esc(item.label || '') +
      '</span><strong class="ingredient-flow-priority-value">' +
      (item.raw ? String(value || '') : esc(value || '')) +
      '</strong></div>'
    );
  }

  function priority(items, options) {
    options = options || {};
    return (
      '<div class="ingredient-flow-priority' +
      (options.className ? ' ' + options.className : '') +
      '"' +
      attrs(options.attrs) +
      '>' +
      (items || []).map(priorityItem).join('') +
      '</div>'
    );
  }

  function note(html, options) {
    options = options || {};
    return '<p class="ingredient-flow-note' + (options.className ? ' ' + options.className : '') + '">' + (options.raw ? String(html || '') : esc(html || '')) + '</p>';
  }

  function panel(title, bodyHtml, options) {
    options = options || {};
    return (
      '<div class="ingredient-flow-panel' +
      (options.wide ? ' ingredient-flow-panel--wide' : '') +
      (options.className ? ' ' + options.className : '') +
      '">' +
      '<h5>' +
      esc(title || '') +
      '</h5>' +
      (bodyHtml || '') +
      '</div>'
    );
  }

  function profileHead(title, noteText, options) {
    options = options || {};
    return (
      '<div class="ingredient-flow-profile-head' +
      (options.className ? ' ' + options.className : '') +
      '"><h4>' +
      esc(title || '') +
      '</h4><p>' +
      esc(noteText || '') +
      '</p></div>'
    );
  }

  function profileGrid(panels, options) {
    options = options || {};
    return '<div class="ingredient-flow-profile-grid' + (options.className ? ' ' + options.className : '') + '">' + (panels || []).join('') + '</div>';
  }

  function wirePresetButtons(root, options) {
    options = options || {};
    root = root || document;
    root.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-ingredient-flow-preset]');
      if (!btn || (root !== document && !root.contains(btn))) return;
      var input = options.input;
      if (!input && options.inputSelector) input = document.querySelector(options.inputSelector);
      var value = btn.getAttribute('data-ingredient-flow-preset') || btn.textContent || '';
      value = String(value || '').trim();
      if (!input || !value) return;
      event.preventDefault();
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof options.onSelect === 'function') options.onSelect(value, btn);
      if (options.focus !== false && typeof input.focus === 'function') {
        try {
          input.focus({ preventScroll: true });
        } catch (err) {
          input.focus();
        }
      }
    });
  }

  window.KuschiIngredientFlow = {
    esc: esc,
    normalizeQuery: normalizeQuery,
    queryCandidates: queryCandidates,
    createRowMatcher: createRowMatcher,
    attr: attr,
    attrs: attrs,
    empty: empty,
    chip: chip,
    chips: chips,
    summaryText: summaryText,
    useList: useList,
    pill: pill,
    meta: meta,
    action: action,
    actions: actions,
    head: head,
    section: section,
    grid: grid,
    priority: priority,
    note: note,
    panel: panel,
    profileHead: profileHead,
    profileGrid: profileGrid,
    wirePresetButtons: wirePresetButtons,
  };
})();
