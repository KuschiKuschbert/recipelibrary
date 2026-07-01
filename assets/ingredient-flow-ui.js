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
      /^(what|which)\s+(goes|pairs|works)\s+(with|well\s+with)\s+/,
      /^(goes|pairs|works)\s+(with|well\s+with)\s+/,
      /^(what|which)\s+can\s+i\s+(pair|use|cook)\s+(with\s+)?/,
      /^(pair|match|use|cook|season|flavour|flavor)\s+(this\s+with\s+|with\s+|for\s+)?/,
      /^(best|good|quick)\s+(pairings?|matches|flavours|flavors)\s+(for|with)\s+/,
      /^(pairings?|matches|flavours|flavors)\s+(for|with)\s+/,
      /^(what|which)\s+(spices?|herbs?|seasonings?|flavours|flavors)\s+(go|work|pair)\s+(with|for)\s+/,
      /^(what|which)\s+(spices?|herbs?|seasonings?|flavours|flavors)\s+(for|with)\s+/,
      /^(spices?|herbs?|seasonings?|flavours|flavors)\s+(for|with)\s+/,
      /\s+(pairings?|matches|ideas|please)$/,
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

  window.KuschiIngredientFlow = {
    esc: esc,
    normalizeQuery: normalizeQuery,
    queryCandidates: queryCandidates,
    attr: attr,
    attrs: attrs,
    empty: empty,
    chip: chip,
    chips: chips,
    useList: useList,
    pill: pill,
    meta: meta,
    action: action,
    actions: actions,
    head: head,
    section: section,
    grid: grid,
    note: note,
    panel: panel,
    profileHead: profileHead,
    profileGrid: profileGrid,
  };
})();
