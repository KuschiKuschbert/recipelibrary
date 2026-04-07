/**
 * Aroma matrix — G1–G8, enrichment from unified index + pairing matrix + food pairings.
 */
(function () {
  'use strict';

  var ING = 'aroma_data/ingredients.json';
  var META = 'aroma_data/aroma_matrix_meta.json';
  var UNIFIED = 'combined_data/ingredients_unified.json';
  var PAIRING_MATRIX = 'aroma_data/pairing_matrix.json';
  var FOOD_PAIRINGS = 'aroma_data/food_pairings.json';
  var FLAVOUR_HINTS = 'flavour_data/flavour_hints_by_id.json';

  var state = {
    meta: {},
    ingredients: [],
    byId: {},
    unifiedById: null,
    flavourHints: null,
    kitchenContext: null,
    pairingMatrix: null,
    foodPairings: null,
    enriched: false,
    currentMode: 'priority',
    foodSpiceMode: 'priority',
    layer: 'aroma',
    openDrawerSpiceId: null,
    openDrawerFoodId: null,
  };

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

  function buildIngredientById(ingredients) {
    var m = Object.create(null);
    for (var i = 0; i < ingredients.length; i++) {
      var ing = ingredients[i];
      if (ing && ing.id) m[ing.id] = ing;
    }
    return m;
  }

  function harmonyPartnerCount(id) {
    if (!state.pairingMatrix || !state.pairingMatrix[id]) return null;
    var arr = state.pairingMatrix[id];
    return Array.isArray(arr) ? arr.length : 0;
  }

  function sourceBadges(unifiedRow) {
    var a = 'A';
    var f = unifiedRow && unifiedRow.flavor ? 'F' : '·';
    var t = unifiedRow && unifiedRow.thesaurus ? 'T' : '·';
    return (
      '<span class="pa-src pa-src-on" title="Aroma Bible">' +
      a +
      '</span><span class="' +
      (f === 'F' ? 'pa-src pa-src-on' : 'pa-src') +
      '" title="Flavor Bible">' +
      f +
      '</span><span class="' +
      (t === 'T' ? 'pa-src pa-src-on' : 'pa-src') +
      '" title="Flavor Thesaurus">' +
      t +
      '</span>'
    );
  }

  function countPartnersInGroup(partnerIds, g) {
    if (!partnerIds || !state.byId) return 0;
    var n = 0;
    for (var i = 0; i < partnerIds.length; i++) {
      var pid = partnerIds[i];
      var p = state.byId[pid];
      if (!p) continue;
      var gr = p.aroma_groups || [];
      for (var j = 0; j < gr.length; j++) {
        if (gr[j] === g) {
          n++;
          break;
        }
      }
    }
    return n;
  }

  function heatmapMaxForRows(rows) {
    var maxByCol = [0, 0, 0, 0, 0, 0, 0, 0];
    for (var r = 0; r < rows.length; r++) {
      var id = rows[r].id;
      var partners = state.pairingMatrix && state.pairingMatrix[id] ? state.pairingMatrix[id] : [];
      for (var c = 1; c <= 8; c++) {
        var cnt = countPartnersInGroup(partners, c);
        if (cnt > maxByCol[c - 1]) maxByCol[c - 1] = cnt;
      }
    }
    return maxByCol;
  }

  function heatmapCellStyle(count, colMax) {
    if (!colMax || count <= 0) return '';
    var t = Math.min(1, count / colMax);
    var alpha = 0.08 + t * 0.55;
    return ' style="background: rgba(201, 169, 110, ' + alpha.toFixed(3) + ')"';
  }

  function buildSpiceTableBody(meta, rows, labels) {
    var enriched = state.enriched;
    var layer = state.layer;
    var displayNames = meta.display_names && typeof meta.display_names === 'object' ? meta.display_names : {};
    var maxByCol =
      layer === 'harmony' && state.pairingMatrix ? heatmapMaxForRows(rows) : null;

    var headExtra = '';
    if (enriched) {
      headExtra =
        '<th scope="col" class="pa-mx-ind pa-mx-harm" title="Total count of other spices listed as harmonizing with this one in aroma_data/pairing_matrix.json (spice–spice links, not food pairings).">' +
        '<span class="pa-th-main">Harmony</span>' +
        '<span class="pa-th-sub"># partners</span></th>' +
        '<th scope="col" class="pa-mx-ind pa-mx-src-h" title="Which other book extracts include this ingredient: A = Aroma ingredients list; F = Flavor Bible row in ingredients_unified.json; T = Flavor Thesaurus wheel. Dim letter = no row in that source.">' +
        '<span class="pa-th-main">Books</span>' +
        '<span class="pa-th-sub">A·F·T</span></th>';
    }

    var thead =
      '<thead><tr><th scope="col" class="pa-mx-spice" title="Ingredient name. Link opens the full Aroma Bible page for this spice. Tap the row (outside the link) to open the cross-book detail drawer." aria-label="Spice or herb (first column)">' +
      '<span class="pa-mx-g-main">Spice</span><span class="pa-mx-g-sub">or herb</span></th>' +
      labels
        .slice(0, 8)
        .map(function (lab, idx) {
          var g = idx + 1;
          var title =
            layer === 'harmony'
              ? 'Aroma group ' +
                g +
                ' (' +
                esc(lab) +
                '): in heatmap mode, this cell is how many of this spice’s harmony partners are tagged with this aroma group (see pairing_matrix + ingredients aroma_groups).'
              : 'Aroma group ' + g + ' — ' + esc(lab) + '. In aroma mode, ● means this spice is assigned to this group in the extract; · means not.';
          var aria = 'Group ' + g + ', ' + esc(lab);
          if (layer === 'harmony') {
            aria += ' — harmony partner count in this group';
          }
          return (
            '<th scope="col" class="pa-mx-g pa-mx-g' +
            g +
            '" title="' +
            title +
            '" aria-label="' +
            aria +
            '"><span class="pa-mx-g-main">G' +
            g +
            '</span><span class="pa-mx-g-sub">' +
            esc(lab) +
            '</span></th>'
          );
        })
        .join('') +
      headExtra +
      '</tr></thead>';

    var body = '';
    for (var ri = 0; ri < rows.length; ri++) {
      var ing = rows[ri];
      var groups = ing.aroma_groups || [];
      var gset = Object.create(null);
      for (var gi = 0; gi < groups.length; gi++) gset[groups[gi]] = true;

      var label = displayNames[ing.id] || ing.name || ing.id;
      var unifiedRow = state.unifiedById ? state.unifiedById[ing.id] : null;

      var cells = '';
      var partners = state.pairingMatrix && state.pairingMatrix[ing.id] ? state.pairingMatrix[ing.id] : [];

      for (var c = 1; c <= 8; c++) {
        var lab = labels[c - 1] || 'G' + c;
        if (layer === 'harmony' && enriched && state.pairingMatrix) {
          var cnt = countPartnersInGroup(partners, c);
          var colMax = maxByCol ? maxByCol[c - 1] : 0;
          var st = heatmapCellStyle(cnt, colMax);
          cells +=
            '<td class="pa-mx-cell pa-mx-g' +
            c +
            ' pa-mx-hm"' +
            st +
            ' aria-label="' +
            esc(label + ': ' + lab + ' — ' + cnt + ' harmony partners in this group') +
            '"><span class="pa-mx-hm-num">' +
            (cnt > 0 ? String(cnt) : '·') +
            '</span></td>';
        } else {
          var on = !!gset[c];
          cells +=
            '<td class="pa-mx-cell pa-mx-g' +
            c +
            (on ? ' pa-mx-on' : ' pa-mx-off') +
            '" aria-label="' +
            esc(label + ': ' + lab + (on ? ' — tagged in this aroma group' : ' — not tagged in this aroma group')) +
            '">' +
            (on ? '<span class="pa-mx-mark pa-mx-l" aria-hidden="true">●</span>' : '<span class="pa-mx-mark pa-mx-n" aria-hidden="true">·</span>') +
            '</td>';
        }
      }

      var indCells = '';
      if (enriched) {
        var hc = harmonyPartnerCount(ing.id);
        indCells +=
          '<td class="pa-mx-ind pa-mx-harm-val" title="Number of other spices this one harmonizes with (aroma_data/pairing_matrix.json).">' +
          (hc != null ? String(hc) : '—') +
          '</td>';
        indCells += '<td class="pa-mx-ind pa-mx-src-cell">' + sourceBadges(unifiedRow) + '</td>';
      }

      var rowClass = state.openDrawerSpiceId === ing.id ? ' pa-row-open' : '';
      body +=
        '<tr class="pa-data-row' +
        rowClass +
        '" data-spice-id="' +
        esc(ing.id) +
        '" tabindex="0" role="button" aria-expanded="' +
        (state.openDrawerSpiceId === ing.id ? 'true' : 'false') +
        '" aria-label="Details for ' +
        esc(label) +
        '">' +
        '<th scope="row" class="pa-mx-spice"><a href="aroma.html?spice=' +
        encodeURIComponent(ing.id) +
        '" class="pa-mx-link">' +
        esc(label) +
        '</a></th>' +
        cells +
        indCells +
        '</tr>';
    }

    return '<table class="pa-matrix" id="paSpiceMatrix">' + thead + '<tbody id="paSpiceTbody">' + body + '</tbody></table>';
  }

  function kitchenContextSnippetHtml() {
    var kc = state.kitchenContext;
    if (!kc) return '';
    var chunks = [];
    var sf = kc.sfah && kc.sfah.four_elements;
    if (sf && typeof sf === 'object') {
      var keys = Object.keys(sf);
      if (keys.length) {
        chunks.push('<p class="pa-small"><strong>SFAH (four elements)</strong> — ');
        chunks.push(
          keys
            .map(function (k) {
              return '<em>' + esc(k) + '</em>: ' + esc(String(sf[k]));
            })
            .join(' · ')
        );
        chunks.push('</p>');
      }
    }
    var sc = kc.science;
    if (sc) {
      var lines = [];
      if (Array.isArray(sc.temperatures)) lines.push(sc.temperatures.length + ' reference temperatures');
      if (Array.isArray(sc.tastant_indices)) lines.push(sc.tastant_indices.length + ' tastant index rows');
      if (Array.isArray(sc.storage_timelines)) lines.push(sc.storage_timelines.length + ' storage timeline rows');
      if (lines.length) {
        chunks.push('<p class="pa-small"><strong>Science of Cooking extract</strong> — ' + lines.join('; ') + '</p>');
      }
    }
    var supDials = kc.supplementary && kc.supplementary.seven_dials && kc.supplementary.seven_dials.dials;
    if (supDials && typeof supDials === 'object') {
      var dkeys = Object.keys(supDials);
      if (dkeys.length) {
        chunks.push('<p class="pa-small"><strong>Art of Flavor — seven dials</strong> — ');
        chunks.push(
          dkeys
            .map(function (dk) {
              return '<em>' + esc(dk) + '</em>';
            })
            .join(', ')
        );
        chunks.push('</p>');
      }
    }
    var fm = kc.supplementary && kc.supplementary.fermentation_matrix;
    if (fm && fm.categories && fm.categories.length) {
      chunks.push(
        '<p class="pa-small"><strong>Fermentation extract</strong> — categories: ' +
          esc(fm.categories.join(', ')) +
          '</p>'
      );
    }
    if (kc.cuisine_map && typeof kc.cuisine_map === 'object') {
      var ccount = Object.keys(kc.cuisine_map).length;
      if (ccount) {
        chunks.push(
          '<p class="pa-small"><strong>SFAH cuisine profiles</strong> — ' + ccount + ' regions in bundle (fat / acid / salt / heat).</p>'
        );
      }
    }
    if (!chunks.length) return '';
    return (
      '<section class="pa-sec"><h4>Bundled library context</h4>' +
      chunks.join('') +
      '<p class="pa-small pa-muted">Included in <code>combined_data/ingredients_unified.json</code> (schema v2).</p></section>'
    );
  }

  function atlasLookupToolkitHint(ingId) {
    var m = state.flavourHints;
    if (!m || !ingId) return null;
    var L = typeof window !== 'undefined' ? window.KuschiFlavourToolkitLookup : null;
    if (L && typeof L.lookupHint === 'function') return L.lookupHint(m, ingId);
    var k = String(ingId || '')
      .replace(/-/g, '_')
      .replace(/_+/g, '_');
    return m[k] || m[ingId] || null;
  }

  function spiceDrawerToolkitSection(ing) {
    var h = atlasLookupToolkitHint(ing.id);
    if (!h) return '';
    var bits = [];
    if (h.primary_family) {
      bits.push(
        '<p class="pa-small">Primary family: <strong>' +
          esc(String(h.primary_family).replace(/_/g, ' ')) +
          '</strong></p>'
      );
    }
    if (h.harmony && h.harmony.length) {
      bits.push(
        '<p class="pa-chips">' +
          h.harmony
            .slice(0, 8)
            .map(function (x) {
              return '<span class="pa-chip">' + esc(String(x)) + '</span>';
            })
            .join(' ') +
          '</p>'
      );
    }
    if (h.contrast && h.contrast.length) {
      bits.push(
        '<p class="pa-chips">' +
          h.contrast
            .slice(0, 8)
            .map(function (x) {
              return '<span class="pa-chip pa-chip-contrast">' + esc(String(x)) + '</span>';
            })
            .join(' ') +
          '</p>'
      );
    }
    if (h.spice_harmony_partners && h.spice_harmony_partners.length) {
      bits.push(
        '<p class="pa-small pa-muted">Spice harmony</p><p class="pa-chips">' +
          h.spice_harmony_partners
            .slice(0, 8)
            .map(function (x) {
              return '<span class="pa-chip">' + esc(String(x)) + '</span>';
            })
            .join(' ') +
          '</p>'
      );
    }
    if (!bits.length) return '';
    return '<section class="pa-sec"><h4>Toolkit matrix</h4>' + bits.join('') + '</section>';
  }

  function spiceDrawerHtml(ing) {
    var u = state.unifiedById ? state.unifiedById[ing.id] : null;
    var ar = u && u.aroma ? u.aroma : ing;
    var labels = state.meta.group_labels || [];
    while (labels.length < 8) labels.push('G' + (labels.length + 1));

    var parts = [];
    parts.push('<div class="pa-drawer-head">');
    parts.push('<h3 class="pa-drawer-title">' + esc(ing.name || ing.id) + '</h3>');
    parts.push(
      '<button type="button" class="pa-drawer-close" aria-label="Close details">×</button>'
    );
    parts.push('</div><div class="pa-drawer-body">');

    var ag = (ar && ar.aroma_groups) || ing.aroma_groups || [];
    if (ag.length) {
      var gtxt = ag
        .map(function (g) {
          return 'G' + g + ' — ' + (labels[g - 1] || '');
        })
        .join('; ');
      parts.push('<section class="pa-sec"><h4>Aroma groups</h4><p>' + esc(gtxt) + '</p></section>');
    }

    var hw = (ar && ar.harmonizes_with) || ing.harmonizes_with || [];
    if (hw.length) {
      var links = hw
        .map(function (h) {
          var hid = h.id || '';
          return (
            '<a href="aroma.html?spice=' +
            encodeURIComponent(hid) +
            '" class="pa-chip">' +
            esc(h.name || hid) +
            '</a>'
          );
        })
        .join(' ');
      parts.push('<section class="pa-sec"><h4>Harmonizes with</h4><p class="pa-chips">' + links + '</p></section>');
    }

    var pfoods = (ar && ar.pairs_with_foods) || ing.pairs_with_foods || [];
    if (pfoods.length) {
      parts.push(
        '<section class="pa-sec"><h4>Pairs with foods (Aroma)</h4><p>' +
          esc(pfoods.join(', ')) +
          '</p></section>'
      );
    }

    var hb = (ar && ar.heat_behavior) || ing.heat_behavior;
    if (hb && typeof hb === 'object') {
      var hbLines = [];
      if (hb.a) hbLines.push(String(hb.a));
      if (hb.b) hbLines.push(String(hb.b));
      if (hbLines.length) {
        parts.push('<section class="pa-sec"><h4>Heat behavior</h4><p>' + esc(hbLines.join(' · ')) + '</p></section>');
      }
    }

    var blends = (ar && ar.spice_blends) || ing.spice_blends;
    if (blends && blends.length) {
      parts.push('<section class="pa-sec"><h4>Spice blends</h4><p>' + esc(blends.join(', ')) + '</p></section>');
    }

    var cuisines = (ar && ar.cuisines) || ing.cuisines;
    if (cuisines && cuisines.length) {
      parts.push('<section class="pa-sec"><h4>Cuisines (Aroma)</h4><p>' + esc(cuisines.join(', ')) + '</p></section>');
    }

    if (u && u.thesaurus) {
      var fam = u.thesaurus.family || u.thesaurus.family_slug;
      if (fam) {
        parts.push(
          '<section class="pa-sec"><h4>Flavor Thesaurus</h4><p>Family: <strong>' + esc(String(fam)) + '</strong></p></section>'
        );
      }
    }

    if (u && u.flavor) {
      var fl = u.flavor;
      var pairObj = fl.pairings || {};
      var tiers = ['holy_grail', 'very_highly_recommended', 'highly_recommended', 'recommended'];
      var tierLabels = {
        holy_grail: 'Holy grail',
        very_highly_recommended: 'Very highly recommended',
        highly_recommended: 'Highly recommended',
        recommended: 'Recommended',
      };
      var hasPair = false;
      for (var ti = 0; ti < tiers.length; ti++) {
        var key = tiers[ti];
        var arr = pairObj[key];
        if (arr && arr.length) {
          hasPair = true;
          var sample = arr.slice(0, 24).map(function (x) {
            return esc(String(x));
          });
          var more = arr.length > 24 ? ' … +' + (arr.length - 24) + ' more' : '';
          parts.push(
            '<section class="pa-sec"><h4>Flavor Bible — ' +
              esc(tierLabels[key] || key) +
              '</h4><p class="pa-small">' +
              sample.join(', ') +
              more +
              '</p></section>'
          );
        }
      }
      var aff = fl.affinities;
      if (aff && aff.length) {
        var affShow = aff.slice(0, 12).map(function (combo) {
          if (Array.isArray(combo)) return esc(combo.join(' + '));
          return esc(String(combo));
        });
        var affMore = aff.length > 12 ? ' … +' + (aff.length - 12) + ' combos' : '';
        parts.push(
          '<section class="pa-sec"><h4>Flavor Bible — affinities</h4><p class="pa-small">' +
            affShow.join(' · ') +
            affMore +
            '</p></section>'
        );
      }
      var avoid = fl.avoid;
      if (avoid && avoid.length) {
        parts.push(
          '<section class="pa-sec"><h4>Flavor Bible — avoid</h4><p class="pa-small">' +
            esc(avoid.join(', ')) +
            '</p></section>'
        );
      }
      if (!hasPair && !aff && !avoid) {
        parts.push(
          '<section class="pa-sec"><p class="pa-muted">No Flavor Bible pairings for this id in the unified index.</p></section>'
        );
      }
    } else if (state.enriched) {
      parts.push(
        '<section class="pa-sec"><p class="pa-muted">Not in Flavor Bible extract (unified).</p></section>'
      );
    }

    var kcSnip = kitchenContextSnippetHtml();
    if (kcSnip) parts.push(kcSnip);

    var tkSec = spiceDrawerToolkitSection(ing);
    if (tkSec) parts.push(tkSec);

    parts.push(
      '<p class="pa-drawer-foot"><a href="aroma.html?spice=' +
        encodeURIComponent(ing.id) +
        '">Open full Aroma profile →</a> · <a href="flavor.html?q=' +
        encodeURIComponent(ing.name || ing.id) +
        '">Flavor explorer →</a> · <a href="flavor.html?toolkit=1">Flavor toolkit →</a></p>'
    );
    parts.push('</div>');
    return parts.join('');
  }

  function removeSpiceDrawer(host) {
    if (!host) return;
    var prev = host.querySelector('tr.pa-drawer-row[data-drawer-for]');
    if (prev) prev.remove();
  }

  function insertSpiceDrawerAfter(row, ing, spiceHost) {
    removeSpiceDrawer(spiceHost);
    var tr = document.createElement('tr');
    tr.className = 'pa-drawer-row';
    tr.setAttribute('data-drawer-for', ing.id);
    var colspan = 1 + 8 + (state.enriched ? 2 : 0);
    var td = document.createElement('td');
    td.colSpan = colspan;
    td.className = 'pa-drawer-td';
    td.innerHTML = '<div class="pa-drawer-card">' + spiceDrawerHtml(ing) + '</div>';
    tr.appendChild(td);
    row.parentNode.insertBefore(tr, row.nextSibling);
  }

  function buildFoodTable(meta, foods, spiceCols) {
    var displayNames = meta.display_names && typeof meta.display_names === 'object' ? meta.display_names : {};
    var thead =
      '<thead><tr><th scope="col" class="pa-fx-food" title="Food or dish from the Aroma food-pairing extract">' +
      '<span class="pa-th-main">Food</span>' +
      '<span class="pa-th-sub">extract rows</span></th>' +
      spiceCols
        .map(function (sid) {
          var ing = state.byId[sid];
          var lab = displayNames[sid] || (ing && ing.name) || sid;
          var short =
            lab.length > 11 ? lab.slice(0, 9).replace(/\s+$/, '') + '…' : lab;
          return (
            '<th scope="col" class="pa-fx-spice" title="' +
            esc(lab) +
            '" aria-label="' +
            esc(lab) +
            ' — spice or herb column; dot if listed for food">' +
            '<span class="pa-fx-spice-main">' +
            esc(short) +
            '</span>' +
            (short !== lab ? '<span class="pa-fx-spice-sub">' + esc(lab) + '</span>' : '') +
            '</th>'
          );
        })
        .join('') +
      '</tr></thead>';

    var body = '';
    for (var fi = 0; fi < foods.length; fi++) {
      var food = foods[fi];
      var sidSet = Object.create(null);
      var seas = food.seasonings || [];
      for (var si = 0; si < seas.length; si++) {
        if (seas[si].id) sidSet[seas[si].id] = true;
      }

      var foodRowClass = state.openDrawerFoodId === food.id ? ' pa-row-open' : '';
      body +=
        '<tr class="pa-fx-data' +
        foodRowClass +
        '" data-food-id="' +
        esc(food.id) +
        '" tabindex="0" role="button" aria-expanded="' +
        (state.openDrawerFoodId === food.id ? 'true' : 'false') +
        '" aria-label="Details for ' +
        esc(food.name || food.id) +
        '">' +
        '<th scope="row" class="pa-fx-food">' +
        esc(food.name || food.id) +
        '</th>';

      for (var ci = 0; ci < spiceCols.length; ci++) {
        var spid = spiceCols[ci];
        var on = !!sidSet[spid];
        var spLab = displayNames[spid] || (state.byId[spid] && state.byId[spid].name) || spid;
        body +=
          '<td class="pa-fx-cell' +
          (on ? ' pa-fx-on' : '') +
          '" aria-label="' +
          esc((food.name || food.id) + ' — ' + spLab + ' — ' + (on ? 'seasoning listed' : 'not listed')) +
          '">' +
          (on ? '<span class="pa-mx-l" aria-hidden="true">●</span>' : '<span class="pa-mx-n" aria-hidden="true">·</span>') +
          '</td>';
      }
      body += '</tr>';
    }

    return '<table class="pa-matrix pa-food-matrix" id="paFoodMatrix">' + thead + '<tbody>' + body + '</tbody></table>';
  }

  function foodDrawerHtml(food) {
    var seas = food.seasonings || [];
    var names = seas
      .map(function (s) {
        return (
          '<a href="aroma.html?spice=' +
          encodeURIComponent(s.id || '') +
          '" class="pa-chip">' +
          esc(s.name || s.id) +
          '</a>'
        );
      })
      .join(' ');
    return (
      '<div class="pa-drawer-head">' +
      '<h3 class="pa-drawer-title">' +
      esc(food.name || food.id) +
      '</h3>' +
      '<button type="button" class="pa-drawer-close" aria-label="Close details">×</button>' +
      '</div><div class="pa-drawer-body">' +
      '<section class="pa-sec"><h4>Seasonings (' +
      seas.length +
      ')</h4><p class="pa-chips">' +
      names +
      '</p></section></div>'
    );
  }

  function removeFoodDrawer(host) {
    if (!host) return;
    var prev = host.querySelector('tr.pa-drawer-row[data-food-drawer]');
    if (prev) prev.remove();
  }

  function insertFoodDrawerAfter(row, food, spiceColCount, foodHost) {
    removeFoodDrawer(foodHost);
    var tr = document.createElement('tr');
    tr.className = 'pa-drawer-row';
    tr.setAttribute('data-food-drawer', food.id);
    var td = document.createElement('td');
    td.colSpan = 1 + (spiceColCount != null ? spiceColCount : getSpiceColumnIds().length);
    td.className = 'pa-drawer-td';
    td.innerHTML = '<div class="pa-drawer-card">' + foodDrawerHtml(food) + '</div>';
    tr.appendChild(td);
    row.parentNode.insertBefore(tr, row.nextSibling);
  }

  function getSpiceColumnIds() {
    if (state.foodSpiceMode === 'priority') {
      var order = state.meta.priority_row_ids || [];
      var out = [];
      for (var i = 0; i < order.length; i++) {
        if (state.byId[order[i]]) out.push(order[i]);
      }
      return out;
    }
    return state.ingredients
      .slice()
      .sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      })
      .map(function (x) {
        return x.id;
      });
  }

  function paintSpiceMatrix(host) {
    var meta = state.meta;
    var labels = meta.group_labels || [];
    while (labels.length < 8) labels.push('G' + (labels.length + 1));

    var rows = [];
    if (state.currentMode === 'priority') {
      var order = meta.priority_row_ids || [];
      for (var o = 0; o < order.length; o++) {
        var id = order[o];
        if (state.byId[id]) rows.push(state.byId[id]);
      }
    } else {
      rows = state.ingredients.slice().sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      });
    }

    host.innerHTML = buildSpiceTableBody(meta, rows, labels);
    if (state.openDrawerSpiceId) {
      var ingOpen = state.byId[state.openDrawerSpiceId];
      if (ingOpen) {
        var rowsEl = host.querySelectorAll('tr.pa-data-row');
        for (var ri = 0; ri < rowsEl.length; ri++) {
          if (rowsEl[ri].getAttribute('data-spice-id') === state.openDrawerSpiceId) {
            insertSpiceDrawerAfter(rowsEl[ri], ingOpen, host);
            break;
          }
        }
      }
    }
  }

  function onSpiceMatrixClick(e, spiceHost) {
    if (!e.target.closest('#paSpiceMatrix')) return;
    if (e.target.closest('a')) return;
    var closeBtn = e.target.closest('.pa-drawer-close');
    if (closeBtn) {
      e.preventDefault();
      state.openDrawerSpiceId = null;
      paintSpiceMatrix(spiceHost);
      return;
    }
    var tr = e.target.closest('tr.pa-data-row');
    if (!tr) return;
    var id = tr.getAttribute('data-spice-id');
    if (!id) return;
    var ing = state.byId[id];
    if (!ing) return;
    if (state.openDrawerSpiceId === id) {
      state.openDrawerSpiceId = null;
    } else {
      state.openDrawerSpiceId = id;
    }
    paintSpiceMatrix(spiceHost);
  }

  function onSpiceMatrixKeydown(e, spiceHost) {
    if (!e.target.closest('#paSpiceMatrix')) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var tr = e.target.closest('tr.pa-data-row');
    if (!tr || e.target.closest('a')) return;
    e.preventDefault();
    var id = tr.getAttribute('data-spice-id');
    if (!id) return;
    var ing = state.byId[id];
    if (!ing) return;
    if (state.openDrawerSpiceId === id) {
      state.openDrawerSpiceId = null;
    } else {
      state.openDrawerSpiceId = id;
    }
    paintSpiceMatrix(spiceHost);
  }

  function paintFoodMatrix(host) {
    if (!host) return;
    if (!state.foodPairings || !state.enriched) {
      host.innerHTML =
        '<p class="pa-food-placeholder">Food × spice matrix appears when cross-book data finishes loading.</p>';
      return;
    }
    var foods = state.foodPairings.slice().sort(function (a, b) {
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });
    var spiceCols = getSpiceColumnIds();
    host.innerHTML = buildFoodTable(state.meta, foods, spiceCols);
    if (state.openDrawerFoodId) {
      var fOpen = null;
      for (var fi = 0; fi < foods.length; fi++) {
        if (foods[fi].id === state.openDrawerFoodId) {
          fOpen = foods[fi];
          break;
        }
      }
      if (fOpen) {
        var fr = findFoodDataRow(host, state.openDrawerFoodId);
        if (fr) insertFoodDrawerAfter(fr, fOpen, spiceCols.length, host);
      }
    }
  }

  function findFoodDataRow(host, id) {
    var rowsEl = host.querySelectorAll('tr.pa-fx-data');
    for (var ri = 0; ri < rowsEl.length; ri++) {
      if (rowsEl[ri].getAttribute('data-food-id') === id) return rowsEl[ri];
    }
    return null;
  }

  function onFoodMatrixClick(e, foodHost, foods) {
    if (!e.target.closest('#paFoodMatrix')) return;
    if (e.target.closest('a')) return;
    var closeBtn = e.target.closest('.pa-drawer-close');
    if (closeBtn) {
      e.preventDefault();
      state.openDrawerFoodId = null;
      paintFoodMatrix(foodHost);
      return;
    }
    var tr = e.target.closest('tr.pa-fx-data');
    if (!tr) return;
    var id = tr.getAttribute('data-food-id');
    var food = null;
    for (var i = 0; i < foods.length; i++) {
      if (foods[i].id === id) {
        food = foods[i];
        break;
      }
    }
    if (!food) return;
    if (state.openDrawerFoodId === id) {
      state.openDrawerFoodId = null;
    } else {
      state.openDrawerFoodId = id;
    }
    paintFoodMatrix(foodHost);
  }

  function onFoodMatrixKeydown(e, foodHost, foods) {
    if (!e.target.closest('#paFoodMatrix')) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var tr = e.target.closest('tr.pa-fx-data');
    if (!tr) return;
    e.preventDefault();
    var id = tr.getAttribute('data-food-id');
    var food = null;
    for (var i = 0; i < foods.length; i++) {
      if (foods[i].id === id) {
        food = foods[i];
        break;
      }
    }
    if (!food) return;
    if (state.openDrawerFoodId === id) {
      state.openDrawerFoodId = null;
    } else {
      state.openDrawerFoodId = id;
    }
    paintFoodMatrix(foodHost);
  }

  function applySpiceFilter(query) {
    var q = norm(query);
    var tr = document.querySelectorAll('#paSpiceTbody tr.pa-data-row');
    for (var i = 0; i < tr.length; i++) {
      var row = tr[i];
      var id = row.getAttribute('data-spice-id') || '';
      var th = row.querySelector('th');
      var text = norm(th ? th.textContent : '');
      var hide = q && text.indexOf(q) < 0 && id.indexOf(q) < 0;
      row.hidden = hide;
      if (hide && state.openDrawerSpiceId === id) {
        state.openDrawerSpiceId = null;
        var mh = document.getElementById('paMatrixHost');
        removeSpiceDrawer(mh);
      }
    }
  }

  function applyFoodFilter(query) {
    var q = norm(query);
    var tr = document.querySelectorAll('.pa-food-matrix tbody tr.pa-fx-data');
    for (var i = 0; i < tr.length; i++) {
      var row = tr[i];
      var id = row.getAttribute('data-food-id') || '';
      var th = row.querySelector('th');
      var text = norm(th ? th.textContent : '');
      var hide = q && text.indexOf(q) < 0 && id.indexOf(q) < 0;
      row.hidden = hide;
      if (hide && state.openDrawerFoodId === id) {
        state.openDrawerFoodId = null;
        removeFoodDrawer(document.getElementById('paFoodMatrixHost'));
      }
    }
  }

  function getFoodsSorted() {
    if (!state.foodPairings) return [];
    return state.foodPairings.slice().sort(function (a, b) {
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });
  }

  function updateStatus(el) {
    if (!el) return;
    var n =
      state.currentMode === 'priority'
        ? (state.meta.priority_row_ids || []).filter(function (id) {
            return state.byId[id];
          }).length
        : state.ingredients.length;
    var base =
      (state.currentMode === 'priority' ? 'Priority sheet: ' : 'All indexed: ') +
      n +
      ' spices';
    if (state.layer === 'harmony') {
      base +=
        ' · Heatmap: each cell = how many harmony partners fall in that aroma column (numbers; not the same as ●/· in aroma mode)';
    } else {
      base += ' · Aroma mode: ● = spice tagged in that G column; · = not tagged there';
    }
    if (state.enriched) {
      base +=
        ' · Harmony column = total spice–spice partners · Books = whether Aroma / Flavor unified / Thesaurus has this id';
    } else {
      base += ' · Loading unified index + pairing + food data for Harmony, Books, food grid…';
    }
    el.textContent = base;
  }

  function loadEnrichment(statusEl, spiceHost, foodHost, onDone) {
    Promise.all([
      fetch(UNIFIED).then(function (r) {
        return r.ok ? r.json() : [];
      }),
      fetch(PAIRING_MATRIX).then(function (r) {
        return r.ok ? r.json() : {};
      }),
      fetch(FOOD_PAIRINGS).then(function (r) {
        return r.ok ? r.json() : [];
      }),
      fetch(FLAVOUR_HINTS).then(function (r) {
        return r.ok ? r.json() : {};
      }).catch(function () {
        return {};
      }),
    ])
      .then(function (quad) {
        var rawU = quad[0];
        var unified;
        var kctx = null;
        if (Array.isArray(rawU)) {
          unified = rawU;
        } else if (rawU && typeof rawU === 'object' && Array.isArray(rawU.ingredients)) {
          unified = rawU.ingredients;
          kctx = rawU.kitchen_context && typeof rawU.kitchen_context === 'object' ? rawU.kitchen_context : null;
        } else {
          unified = [];
        }
        var pm = quad[1] && typeof quad[1] === 'object' ? quad[1] : {};
        var fp = Array.isArray(quad[2]) ? quad[2] : [];
        var fh = quad[3] && typeof quad[3] === 'object' && !Array.isArray(quad[3]) ? quad[3] : null;

        var ub = Object.create(null);
        for (var i = 0; i < unified.length; i++) {
          var row = unified[i];
          if (row && row.id) ub[row.id] = row;
        }
        state.unifiedById = ub;
        state.kitchenContext = kctx;
        state.pairingMatrix = pm;
        state.foodPairings = fp;
        state.flavourHints = fh;
        state.enriched = true;

        var lh = document.getElementById('paLayerHarmony');
        if (lh) {
          lh.disabled = false;
          lh.removeAttribute('aria-disabled');
        }

        paintSpiceMatrix(spiceHost);
        paintFoodMatrix(foodHost);
        updateStatus(statusEl);
        var s = document.getElementById('paEnrichStatus');
        if (s) s.textContent = '';
        if (onDone) onDone();
      })
      .catch(function () {
        var s = document.getElementById('paEnrichStatus');
        if (s) s.textContent = 'Could not load unified / pairing data; matrix shows aroma groups only.';
        var fh = document.getElementById('paFoodMatrixHost');
        if (fh) {
          fh.innerHTML =
            '<p class="pa-food-placeholder">Food matrix needs enrichment data; reload or check network.</p>';
        }
        if (onDone) onDone();
      });
  }

  function init() {
    var spiceHost = document.getElementById('paMatrixHost');
    var foodHost = document.getElementById('paFoodMatrixHost');
    var status = document.getElementById('paStatus');
    var modePri = document.getElementById('paModePriority');
    var modeAll = document.getElementById('paModeAll');
    var search = document.getElementById('paMatrixSearch');
    var layerAroma = document.getElementById('paLayerAroma');
    var layerHarmony = document.getElementById('paLayerHarmony');
    var foodPri = document.getElementById('paFoodModePriority');
    var foodAll = document.getElementById('paFoodModeAll');
    var foodSearch = document.getElementById('paFoodSearch');

    if (!spiceHost) return;

    Promise.all([
      fetch(ING).then(function (r) {
        return r.ok ? r.json() : [];
      }),
      fetch(META).then(function (r) {
        return r.ok ? r.json() : {};
      }),
    ])
      .then(function (pair) {
        state.ingredients = Array.isArray(pair[0]) ? pair[0] : [];
        state.meta = pair[1] && typeof pair[1] === 'object' ? pair[1] : {};
        state.byId = buildIngredientById(state.ingredients);

        function paintAll() {
          state.openDrawerSpiceId = null;
          state.openDrawerFoodId = null;
          removeSpiceDrawer(spiceHost);
          removeFoodDrawer(foodHost);
          paintSpiceMatrix(spiceHost);
          paintFoodMatrix(foodHost);
          if (search && search.value) applySpiceFilter(search.value);
          if (foodSearch && foodSearch.value) applyFoodFilter(foodSearch.value);
          updateStatus(status);
        }

        paintAll();

        if (layerHarmony) {
          layerHarmony.disabled = true;
          layerHarmony.setAttribute('aria-disabled', 'true');
        }

        spiceHost.addEventListener('click', function (e) {
          onSpiceMatrixClick(e, spiceHost);
        });
        spiceHost.addEventListener('keydown', function (e) {
          onSpiceMatrixKeydown(e, spiceHost);
        });
        if (foodHost) {
          foodHost.addEventListener('click', function (e) {
            onFoodMatrixClick(e, foodHost, getFoodsSorted());
          });
          foodHost.addEventListener('keydown', function (e) {
            onFoodMatrixKeydown(e, foodHost, getFoodsSorted());
          });
        }

        if (modePri) {
          modePri.addEventListener('click', function () {
            state.currentMode = 'priority';
            modePri.setAttribute('aria-pressed', 'true');
            if (modeAll) modeAll.setAttribute('aria-pressed', 'false');
            paintAll();
          });
        }
        if (modeAll) {
          modeAll.addEventListener('click', function () {
            state.currentMode = 'all';
            modeAll.setAttribute('aria-pressed', 'true');
            if (modePri) modePri.setAttribute('aria-pressed', 'false');
            paintAll();
          });
        }

        if (layerAroma) {
          layerAroma.addEventListener('click', function () {
            state.layer = 'aroma';
            layerAroma.setAttribute('aria-pressed', 'true');
            if (layerHarmony) layerHarmony.setAttribute('aria-pressed', 'false');
            state.openDrawerSpiceId = null;
            paintSpiceMatrix(spiceHost);
            if (search && search.value) applySpiceFilter(search.value);
            updateStatus(status);
          });
        }
        if (layerHarmony) {
          layerHarmony.addEventListener('click', function () {
            if (!state.enriched || layerHarmony.disabled) return;
            state.layer = 'harmony';
            layerHarmony.setAttribute('aria-pressed', 'true');
            if (layerAroma) layerAroma.setAttribute('aria-pressed', 'false');
            state.openDrawerSpiceId = null;
            paintSpiceMatrix(spiceHost);
            if (search && search.value) applySpiceFilter(search.value);
            updateStatus(status);
          });
        }

        if (foodPri) {
          foodPri.addEventListener('click', function () {
            state.foodSpiceMode = 'priority';
            foodPri.setAttribute('aria-pressed', 'true');
            if (foodAll) foodAll.setAttribute('aria-pressed', 'false');
            state.openDrawerFoodId = null;
            if (state.enriched) paintFoodMatrix(foodHost);
            if (foodSearch && foodSearch.value) applyFoodFilter(foodSearch.value);
          });
        }
        if (foodAll) {
          foodAll.addEventListener('click', function () {
            state.foodSpiceMode = 'all';
            foodAll.setAttribute('aria-pressed', 'true');
            if (foodPri) foodPri.setAttribute('aria-pressed', 'false');
            state.openDrawerFoodId = null;
            if (state.enriched) paintFoodMatrix(foodHost);
            if (foodSearch && foodSearch.value) applyFoodFilter(foodSearch.value);
          });
        }

        if (search) {
          search.addEventListener('input', function () {
            applySpiceFilter(search.value);
          });
        }
        if (foodSearch) {
          foodSearch.addEventListener('input', function () {
            applyFoodFilter(foodSearch.value);
          });
        }

        loadEnrichment(status, spiceHost, foodHost, function () {
          if (layerHarmony && state.layer === 'harmony') {
            paintSpiceMatrix(spiceHost);
            if (search && search.value) applySpiceFilter(search.value);
          }
        });
      })
      .catch(function () {
        spiceHost.innerHTML = '<p class="pa-error">Could not load aroma matrix data.</p>';
        if (status) status.textContent = '';
      });
  }

  function scheduleInit() {
    var urgent =
      (window.location.search && window.location.search.length > 1) ||
      (window.location.hash && window.location.hash.length > 1);
    function run() {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
      else init();
    }
    if (urgent) {
      run();
      return;
    }
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 2600 });
    } else {
      setTimeout(run, 80);
    }
  }
  scheduleInit();
})();
