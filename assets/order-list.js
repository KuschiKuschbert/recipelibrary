/**
 * Shared order list modal (Riviera + kitchen books). Host supplies getRecipes() and a storage adapter.
 */
(function () {
  'use strict';

  var ZONE_ORDER = ['freezer', 'coldroom', 'drystore', 'other'];
  var ZONE_LABELS = { freezer: 'Freezer', coldroom: 'Cold room', drystore: 'Dry store', other: 'Other' };
  var MERGED_LINE_KEYS_SEP = '|||';

  /**
   * Supplier-facing order unit from canonical merge key (kg / L / pc / piece / box).
   * Matches run on KuschiUserRecipes.canonicalOrderMergeKey(item) when available.
   */
  var SUPPLIER_UNIT_RULES = [
    { test: /\boyster\b/, unit: 'box' },
    { test: /\bcinnamon stick\b/, unit: 'pc' },
    { test: /\blamb cutlet\b/, unit: 'kg' },
    { test: /\b(mayonnaise|mayo|kewpie|aioli)\b/, unit: 'kg' },
    { test: /\bcucumber\b/, unit: 'piece' },
    { test: /\begg\b/, unit: 'pc' },
    { test: /\btomato\b/, unit: 'kg' },
    { test: /\b(rocket|arugula)\b/, unit: 'kg' },
    { test: /\b(flour|breadcrumb)\b/, unit: 'kg' },
    { test: /\bmint\b/, unit: 'kg' },
    { test: /\bhoney\b/, unit: 'kg' },
  ];

  var SUPPLIER_LIQUID_RE =
    /\b(water|stock|broth|oil|milk|cream|juice|wine|vinegar|sauce|liqueur|beer|spirit|rum|gin|vodka|brandy|whisky|whiskey|mirin|vermouth|bitters|passata|coulis|syrup|cola|cider|essence|extract|demi|glaze)\b/;

  function supplierOrderUnit(itemName, Kr) {
    var key = '';
    if (Kr && typeof Kr.canonicalOrderMergeKey === 'function') {
      key = Kr.canonicalOrderMergeKey(itemName);
    } else {
      key = String(itemName || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    }
    if (!key) return 'kg';
    for (var ri = 0; ri < SUPPLIER_UNIT_RULES.length; ri++) {
      if (SUPPLIER_UNIT_RULES[ri].test.test(key)) return SUPPLIER_UNIT_RULES[ri].unit;
    }
    if (SUPPLIER_LIQUID_RE.test(key)) return 'L';
    return 'kg';
  }

  function pickDisplayUnitForMerged(tally) {
    var filtered = (tally || [])
      .map(function (s) {
        return String(s || '').trim();
      })
      .filter(Boolean);
    if (!filtered.length) return '';
    var counts = {};
    filtered.forEach(function (u) {
      var k = u.toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    });
    var maxc = 0;
    Object.keys(counts).forEach(function (k) {
      if (counts[k] > maxc) maxc = counts[k];
    });
    var winners = Object.keys(counts).filter(function (k) {
      return counts[k] === maxc;
    });
    if (winners.length === 1) {
      var wk = winners[0];
      for (var fi = 0; fi < filtered.length; fi++) {
        if (filtered[fi].toLowerCase() === wk) return filtered[fi];
      }
    }
    var seen = {};
    var order = [];
    filtered.forEach(function (u) {
      var k = u.toLowerCase();
      if (!seen[k]) {
        seen[k] = true;
        order.push(u);
      }
    });
    order.sort(function (a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase(), undefined, { sensitivity: 'base' });
    });
    return order.join(' · ');
  }

  function qtyEndsWithUnit(q, u) {
    var ql = q.trim().toLowerCase();
    var ul = u.trim().toLowerCase();
    if (!ul) return true;
    if (ql === ul) return true;
    if (ql.length < ul.length) return false;
    if (ql.slice(ql.length - ul.length) !== ul) return false;
    if (ql.length === ul.length) return true;
    var c = ql.charAt(ql.length - ul.length - 1);
    return c === ' ' || c === '.' || c === ',';
  }

  function formatQtyForCopy(orderQty, orderUnit) {
    var q = String(orderQty || '').trim();
    if (!q) return '(set order qty)';
    var u = String(orderUnit || '').trim();
    if (!u) return q;
    if (u.indexOf('·') >= 0) {
      var full = u.toLowerCase().replace(/\s+/g, ' ');
      var ql = q.toLowerCase().replace(/\s+/g, ' ');
      if (ql.indexOf(full) >= 0) return q;
      return q + ' ' + u;
    }
    if (qtyEndsWithUnit(q, u)) return q;
    return q + ' ' + u;
  }

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

  function pickDisplayZoneForMerged(zoneTally) {
    if (!zoneTally || !zoneTally.length) return 'other';
    var counts = {};
    ZONE_ORDER.forEach(function (zz) {
      counts[zz] = 0;
    });
    zoneTally.forEach(function (z) {
      var zz = ZONE_ORDER.indexOf(z) >= 0 ? z : 'other';
      counts[zz]++;
    });
    var best = 'other';
    var bestc = -1;
    ZONE_ORDER.forEach(function (zz) {
      if (counts[zz] > bestc) {
        bestc = counts[zz];
        best = zz;
      }
    });
    return best;
  }

  function rebuildMergedOrderQtyDisplay(ex) {
    var parts = ex._qtyParts || [];
    var zones = {};
    parts.forEach(function (p) {
      zones[p.zone] = true;
    });
    var multi = Object.keys(zones).length > 1;
    var bits = [];
    var seen = {};
    parts.forEach(function (p) {
      if (!p.text) return;
      var k = p.zone + '\0' + p.text;
      if (seen[k]) return;
      seen[k] = true;
      bits.push(multi ? (ZONE_LABELS[p.zone] || p.zone) + ': ' + p.text : p.text);
    });
    ex.recipeQtyDisplay = bits.length ? bits.join(' · ') : '—';
  }

  function mergeOrderListRecipeLines(recipeLines, Kr) {
    if (!Kr || typeof Kr.canonicalOrderMergeKey !== 'function') return recipeLines;
    var map = new Map();
    for (var li = 0; li < recipeLines.length; li++) {
      var line = recipeLines[li];
      var gkey = Kr.canonicalOrderMergeKey(line.item);
      var z = ZONE_ORDER.indexOf(line.zone) >= 0 ? line.zone : 'other';
      var qtyText =
        line.recipeQtyDisplay && line.recipeQtyDisplay !== '—'
          ? String(line.recipeQtyDisplay).trim()
          : '';

      if (!map.has(gkey)) {
        var entry = {
          kind: line.kind,
          lineKey: line.lineKey,
          item: line.item,
          orderQty: String(line.orderQty || '').trim(),
          included: line.included,
          mergedLineKeys: [line.lineKey],
          extraIds: [],
          mergedZones: [z],
          _zoneTally: [z],
          _qtyParts: qtyText ? [{ zone: z, text: qtyText }] : [],
          _unitTally: line.recipeUnit ? [line.recipeUnit] : [],
        };
        rebuildMergedOrderQtyDisplay(entry);
        entry.zone = pickDisplayZoneForMerged(entry._zoneTally);
        map.set(gkey, entry);
      } else {
        var ex = map.get(gkey);
        ex.mergedLineKeys.push(line.lineKey);
        if (ex.mergedZones.indexOf(z) < 0) ex.mergedZones.push(z);
        ex._zoneTally.push(z);
        if (String(line.item || '').length > String(ex.item || '').length) ex.item = line.item;
        if (qtyText) {
          var dup = ex._qtyParts.some(function (p) {
            return p.zone === z && p.text === qtyText;
          });
          if (!dup) ex._qtyParts.push({ zone: z, text: qtyText });
        }
        rebuildMergedOrderQtyDisplay(ex);
        var a = String(ex.orderQty || '').trim();
        var b = String(line.orderQty || '').trim();
        if (a && b && a !== b) ex.orderQty = a + '; ' + b;
        else ex.orderQty = a || b;
        ex.included = ex.included && line.included;
        ex.zone = pickDisplayZoneForMerged(ex._zoneTally);
        if (line.recipeUnit) ex._unitTally.push(line.recipeUnit);
      }
    }
    var out = Array.from(map.values());
    out.forEach(function (ex) {
      ex.orderUnit = pickDisplayUnitForMerged(ex._unitTally);
      delete ex._zoneTally;
      delete ex._qtyParts;
      delete ex._unitTally;
    });
    return out;
  }

  function foldOrderExtrasIntoMergedRecipes(mergedRecipeLines, extras, Kr) {
    var rows = mergedRecipeLines.map(function (r) {
      return Object.assign({}, r, { extraIds: r.extraIds ? r.extraIds.slice() : [] });
    });
    var consumed = new Set();
    (extras || []).forEach(function (ex) {
      if (!ex || !ex.id) return;
      var canonEx = Kr.canonicalOrderMergeKey(ex.name);
      var z = Kr.ZONE_IDS.indexOf(ex.zone) >= 0 ? ex.zone : 'other';
      var hit = rows.find(function (row) {
        return (
          row.kind === 'recipe' &&
          Kr.canonicalOrderMergeKey(row.item) === canonEx &&
          row.mergedZones &&
          row.mergedZones.indexOf(z) >= 0
        );
      });
      if (!hit) return;
      hit.extraIds.push(ex.id);
      consumed.add(ex.id);
      var mq = String(ex.orderQty || '').trim();
      var manualBit = mq ? 'Manual: ' + mq : 'Manual line';
      var cur = hit.recipeQtyDisplay || '';
      if (cur && cur !== '—') {
        if (cur.indexOf(manualBit) < 0) hit.recipeQtyDisplay = cur + ' · ' + manualBit;
      } else {
        hit.recipeQtyDisplay = manualBit;
      }
    });
    var leftover = (extras || []).filter(function (ex) {
      return ex && ex.id && !consumed.has(ex.id);
    });
    return { rows: rows, leftoverExtras: leftover };
  }

  function zoneSelectHtml(selected, className, dataKind, mergedKeysAttr, extraId) {
    var attrs =
      'class="' + className + '" data-kind="' + dataKind + '"' +
      (dataKind === 'recipe'
        ? ' data-merged-keys="' + mergedKeysAttr + '"'
        : ' data-extra-id="' + escAttr(extraId) + '"');
    var h = '<select ' + attrs + '>';
    ZONE_ORDER.forEach(function (z) {
      h += '<option value="' + z + '"' + (z === selected ? ' selected' : '') + '>' + esc(ZONE_LABELS[z]) + '</option>';
    });
    h += '</select>';
    return h;
  }

  function zoneDisplayHtml(zone) {
    var z = ZONE_ORDER.indexOf(zone) >= 0 ? zone : 'other';
    return '<span class="ord-zone-display">' + esc(ZONE_LABELS[z]) + '</span>';
  }

  function orderQtyInputBlock(inputAttrs, value, orderUnit, wrapperExtraClass) {
    var u = String(orderUnit || '').trim();
    var suffix = u ? '<span class="ord-unit-suffix">' + esc(u) + '</span>' : '';
    var wclass = 'ord-qty-with-unit' + (wrapperExtraClass ? ' ' + wrapperExtraClass : '');
    return (
      '<div class="' +
      wclass +
      '">' +
      '<input type="text" ' +
      inputAttrs +
      ' value="' +
      escAttr(value) +
      '" placeholder="Order qty" />' +
      suffix +
      '</div>'
    );
  }

  function orderQtyWithUnitHtml(value, keysEsc, orderUnit) {
    return orderQtyInputBlock(
      'class="ord-order-qty" data-merged-keys="' + keysEsc + '"',
      value,
      orderUnit,
      ''
    );
  }

  /**
   * @param {object} config
   * @param {string} config.overlayId
   * @param {string} config.bodyId
   * @param {{name:string,zone:string,qty:string}} config.formIds - element ids for add form
   * @param {() => object[]} config.getRecipes
   * @param {object} config.storage - load/save overrides & extras, master, export
   * @param {() => boolean} [config.shouldReleaseBodyScroll]
   */
  function create(config) {
    var overlayId = config.overlayId;
    var bodyId = config.bodyId;
    var formIds = config.formIds || {};
    var getRecipes = config.getRecipes;
    var storage = config.storage;
    var shouldReleaseBodyScroll = config.shouldReleaseBodyScroll || function () {
      return true;
    };
    var editingZones = false;

    function Kr() {
      return window.KuschiUserRecipes;
    }

    function setRecipeOverridesBatch(lineKeys, patch) {
      var all = storage.loadOverrides();
      lineKeys.forEach(function (k) {
        if (!k) return;
        all[k] = Object.assign({}, all[k] || {}, patch);
      });
      storage.saveOverrides(all);
    }

    function normalizeIncludedOverrides() {
      var k = Kr();
      if (!k) return;
      var all = storage.loadOverrides();
      var changed = false;
      var recipes = getRecipes() || [];
      for (var ri = 0; ri < recipes.length; ri++) {
        var r = recipes[ri];
        var ings = r.ingredients || [];
        for (var idx = 0; idx < ings.length; idx++) {
          if (!ings[idx] || !ings[idx].item) continue;
          var lineKey = r.id + '::' + idx;
          var cur = all[lineKey] || {};
          if (cur.included === false) {
            all[lineKey] = Object.assign({}, cur, { included: true });
            changed = true;
          }
        }
      }
      if (changed) storage.saveOverrides(all);
    }

    function buildOrderLinesFlat() {
      var k = Kr();
      if (!k) return [];
      var overrides = storage.loadOverrides();
      var recipeOut = [];
      var recipes = getRecipes() || [];
      for (var ri = 0; ri < recipes.length; ri++) {
        var r = recipes[ri];
        var ings = r.ingredients || [];
        for (var idx = 0; idx < ings.length; idx++) {
          var i = ings[idx];
          if (!i || !i.item) continue;
          var lineKey = r.id + '::' + idx;
          var o = overrides[lineKey] || {};
          var recipeQty = i.qty != null && String(i.qty).trim() !== '' ? String(i.qty).trim() : '';
          var prep = i.prep ? ' — ' + i.prep : '';
          var recipeQtyDisplay = (recipeQty + prep) || '—';
          var defaultZone = storage.resolveDefaultZone(i.item);
          var zone = o.zone;
          if (!zone || k.ZONE_IDS.indexOf(zone) < 0) zone = defaultZone;
          var orderQty = o.orderQty != null ? String(o.orderQty) : '';
          var included = o.included !== false;
          var recipeUnit = supplierOrderUnit(i.item, k);
          recipeOut.push({
            kind: 'recipe',
            lineKey: lineKey,
            item: i.item,
            recipeQtyDisplay: recipeQtyDisplay,
            orderQty: String(orderQty),
            zone: zone,
            included: included,
            recipeUnit: recipeUnit,
          });
        }
      }
      var mergedRecipes = mergeOrderListRecipeLines(recipeOut, k);
      var fold = foldOrderExtrasIntoMergedRecipes(mergedRecipes, storage.loadExtras(), k);
      var out = fold.rows;
      fold.leftoverExtras.forEach(function (ex) {
        out.push({
          kind: 'extra',
          lineKey: 'extra::' + ex.id,
          extraId: ex.id,
          item: ex.name,
          recipeQtyDisplay: '—',
          orderQty: ex.orderQty || '',
          zone: k.ZONE_IDS.indexOf(ex.zone) >= 0 ? ex.zone : 'other',
          included: true,
          orderUnit: supplierOrderUnit(ex.name, k),
        });
      });
      return out;
    }

    function linesGroupedByZone(lines) {
      var by = { freezer: [], coldroom: [], drystore: [], other: [] };
      lines.forEach(function (line) {
        var z = ZONE_ORDER.indexOf(line.zone) >= 0 ? line.zone : 'other';
        by[z].push(line);
      });
      ZONE_ORDER.forEach(function (z) {
        by[z].sort(function (a, b) {
          return a.item.localeCompare(b.item, undefined, { sensitivity: 'base' });
        });
      });
      return by;
    }

    function recipeZoneControlHtml(line, keysEsc) {
      if (editingZones) {
        return zoneSelectHtml(line.zone, 'ord-zone', 'recipe', keysEsc, null);
      }
      return zoneDisplayHtml(line.zone);
    }

    function extraZoneControlHtml(line) {
      if (editingZones) {
        return zoneSelectHtml(line.zone, 'ord-zone-extra', 'extra', '', line.extraId);
      }
      return zoneDisplayHtml(line.zone);
    }

    function renderOrderListBody() {
      var body = document.getElementById(bodyId);
      if (!body || !Kr()) return;
      var k = Kr();
      var extrasById = {};
      storage.loadExtras().forEach(function (ex) {
        if (ex && ex.id) extrasById[ex.id] = ex;
      });
      var lines = buildOrderLinesFlat();
      var grouped = linesGroupedByZone(lines);
      var html = '';
      ZONE_ORDER.forEach(function (z) {
        var rows = grouped[z];
        if (!rows.length) return;
        html += '<div class="order-zone-block">';
        html += '<div class="order-zone-head">' + esc(ZONE_LABELS[z]) + '</div>';
        rows.forEach(function (line) {
          if (line.kind === 'recipe') {
            var keysEsc = (line.mergedLineKeys || [line.lineKey]).map(escAttr).join(MERGED_LINE_KEYS_SEP);
            var extraIds = line.extraIds || [];
            var foldedAttr =
              extraIds.length > 0
                ? ' data-folded-extras="' + extraIds.map(escAttr).join(MERGED_LINE_KEYS_SEP) + '"'
                : '';
            var ou = line.orderUnit != null ? line.orderUnit : '';
            html += '<div class="order-line-block"' + foldedAttr + '>';
            html +=
              '<div class="order-line-row" data-kind="recipe">' +
              '<div class="order-line-name">' +
              esc(line.item) +
              '</div>' +
              orderQtyWithUnitHtml(line.orderQty, keysEsc, ou) +
              recipeZoneControlHtml(line, keysEsc) +
              '<span class="ord-remove"></span>' +
              '</div>';
            extraIds.forEach(function (xid) {
              var ex = extrasById[xid];
              if (!ex) return;
              var exUnit = supplierOrderUnit(ex.name, k);
              html +=
                '<div class="order-line-sub">' +
                '<span class="order-sub-merged" aria-hidden="true">↳</span>' +
                '<div class="order-line-name order-sub-name">' +
                esc(ex.name) +
                '</div>' +
                orderQtyInputBlock(
                  'class="ord-extra-qty" data-extra-id="' + escAttr(xid) + '"',
                  ex.orderQty || '',
                  exUnit,
                  'ord-qty-with-unit--sub'
                ) +
                '<button type="button" class="btn-secondary ord-remove-extra" data-extra-id="' +
                escAttr(xid) +
                '">✕</button>' +
                '</div>';
            });
            html += '</div>';
          } else {
            var extraOu = line.orderUnit != null ? line.orderUnit : supplierOrderUnit(line.item, k);
            html +=
              '<div class="order-line-row" data-kind="extra">' +
              '<div class="order-line-name">' +
              esc(line.item) +
              '</div>' +
              orderQtyInputBlock(
                'class="ord-order-qty-extra" data-extra-id="' + escAttr(line.extraId) + '"',
                line.orderQty,
                extraOu,
                ''
              ) +
              extraZoneControlHtml(line) +
              '<button type="button" class="btn-secondary ord-remove" data-extra-id="' +
              escAttr(line.extraId) +
              '">✕</button>' +
              '</div>';
          }
        });
        html += '</div>';
      });
      if (!html) {
        html =
          '<p style="font-size:14px;color:var(--text3)">No lines yet. Add recipes or use Add ingredient below.</p>';
      }
      body.innerHTML = html;

      body.querySelectorAll('.ord-order-qty[data-merged-keys]').forEach(function (el) {
        el.addEventListener('change', function () {
          var keys = el.getAttribute('data-merged-keys').split(MERGED_LINE_KEYS_SEP);
          setRecipeOverridesBatch(keys, { orderQty: el.value });
        });
      });
      body.querySelectorAll('select.ord-zone[data-merged-keys]').forEach(function (el) {
        el.addEventListener('change', function () {
          var keys = el.getAttribute('data-merged-keys').split(MERGED_LINE_KEYS_SEP);
          setRecipeOverridesBatch(keys, { zone: el.value });
          var block = el.closest('.order-line-block');
          var folded = block && block.getAttribute('data-folded-extras');
          if (folded && k) {
            folded.split(MERGED_LINE_KEYS_SEP).forEach(function (xid) {
              if (xid) storage.updateOrderExtra(xid, { zone: el.value });
            });
          }
          renderOrderListBody();
        });
      });
      body.querySelectorAll('.ord-extra-qty').forEach(function (el) {
        el.addEventListener('change', function () {
          storage.updateOrderExtra(el.getAttribute('data-extra-id'), { orderQty: el.value });
        });
      });
      body.querySelectorAll('button.ord-remove-extra').forEach(function (el) {
        el.addEventListener('click', function () {
          storage.removeOrderExtra(el.getAttribute('data-extra-id'));
          renderOrderListBody();
        });
      });
      body.querySelectorAll('.ord-order-qty-extra').forEach(function (el) {
        el.addEventListener('change', function () {
          storage.updateOrderExtra(el.getAttribute('data-extra-id'), { orderQty: el.value });
        });
      });
      body.querySelectorAll('select.ord-zone-extra').forEach(function (el) {
        el.addEventListener('change', function () {
          storage.updateOrderExtra(el.getAttribute('data-extra-id'), { zone: el.value });
          renderOrderListBody();
        });
      });
      body.querySelectorAll('button.ord-remove[data-extra-id]').forEach(function (el) {
        el.addEventListener('click', function () {
          storage.removeOrderExtra(el.getAttribute('data-extra-id'));
          renderOrderListBody();
        });
      });
    }

    function open() {
      editingZones = false;
      normalizeIncludedOverrides();
      renderOrderListBody();
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

    function toggleEditingZones() {
      editingZones = !editingZones;
      renderOrderListBody();
      return editingZones;
    }

    function isEditingZones() {
      return editingZones;
    }

    function copyOrderListText() {
      var lines = buildOrderLinesFlat();
      var byZone = { freezer: [], coldroom: [], drystore: [], other: [] };
      lines.forEach(function (l) {
        var z = ZONE_ORDER.indexOf(l.zone) >= 0 ? l.zone : 'other';
        byZone[z].push(l);
      });
      var text = '';
      ZONE_ORDER.forEach(function (z) {
        var arr = byZone[z];
        if (!arr.length) return;
        arr.sort(function (a, b) {
          return a.item.localeCompare(b.item, undefined, { sensitivity: 'base' });
        });
        text += ZONE_LABELS[z].toUpperCase() + '\n';
        arr.forEach(function (l) {
          var u = l.orderUnit != null ? l.orderUnit : '';
          var q = formatQtyForCopy(l.orderQty, u);
          text += '- ' + l.item + ': ' + q + '\n';
        });
        text += '\n';
      });
      var out = text.trim() || '(nothing to copy — add recipes or lines)';
      navigator.clipboard.writeText(out).then(function () {
        alert('Order list copied');
      });
    }

    function copyOrderBundleJson() {
      if (!storage.exportBundle) return;
      navigator.clipboard.writeText(storage.exportBundle()).then(function () {
        alert('Order bundle JSON copied');
      });
    }

    function copyMasterIngredientsJson() {
      if (!storage.exportMaster) return;
      navigator.clipboard.writeText(storage.exportMaster()).then(function () {
        alert('Master ingredients JSON copied');
      });
    }

    function submitOrderListAdd() {
      var nameEl = document.getElementById(formIds.name);
      var zoneEl = document.getElementById(formIds.zone);
      var qtyEl = document.getElementById(formIds.qty);
      if (!nameEl || !zoneEl) return;
      var name = nameEl.value.trim();
      if (!name) {
        alert('Enter a name');
        return;
      }
      var zone = zoneEl.value;
      var qty = qtyEl ? qtyEl.value.trim() : '';
      storage.upsertMasterIngredient(name, zone);
      storage.addOrderExtra(name, zone, qty);
      nameEl.value = '';
      if (qtyEl) qtyEl.value = '';
      renderOrderListBody();
    }

    return {
      open: open,
      close: close,
      refresh: renderOrderListBody,
      copyOrderListText: copyOrderListText,
      copyOrderBundleJson: copyOrderBundleJson,
      copyMasterIngredientsJson: copyMasterIngredientsJson,
      submitOrderListAdd: submitOrderListAdd,
      buildOrderLinesFlat: buildOrderLinesFlat,
      toggleEditingZones: toggleEditingZones,
      isEditingZones: isEditingZones,
    };
  }

  window.KuschiOrderList = {
    create: create,
    ZONE_ORDER: ZONE_ORDER,
    ZONE_LABELS: ZONE_LABELS,
  };
})();
