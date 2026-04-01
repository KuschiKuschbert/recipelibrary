/**
 * Stocktake checklist modal (Riviera + kitchen books). Uses order list merge via orderList.buildOrderLinesFlat().
 * Optional config.builtinCatalog: built-in snapshot rows (Riviera) with zone/category and default qty/brand/UOM.
 */
(function () {
  'use strict';

  var ZONE_ORDER = ['freezer', 'coldroom', 'drystore', 'other'];

  /** Sub-category order within each zone (matches generate_riviera_stocktake_data.py). */
  var BUILTIN_CATEGORY_ORDER = {
    freezer: [
      'Pastry, bread, desserts',
      'Prepared/freezer portions',
      'Frozen savouries / convenience',
      'Frozen seafood and meats',
      'Frozen bread / gluten-free bakery',
    ],
    coldroom: [
      'Dairy, cheese, deli',
      'Fruit, veg, herbs',
      'Dips, sauces, condiments, oils',
    ],
    drystore: [
      'Pantry, dry goods, rice, pasta, flour',
      'Spices, powders (volume estimates)',
      'Other spices / packets / pantry',
      'Crackers and snacks',
      'Chocolate / sweets',
    ],
  };

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

  function zoneLabels() {
    return (window.KuschiOrderList && window.KuschiOrderList.ZONE_LABELS) || {
      freezer: 'Freezer',
      coldroom: 'Cold room',
      drystore: 'Dry store',
      other: 'Other',
    };
  }

  function rowIdRecipe(item, Kr) {
    return 'recipe:' + Kr.canonicalOrderMergeKey(item);
  }

  function rowIdExtra(extraId) {
    return 'extra:' + String(extraId || '');
  }

  function rowIdStx(stxId) {
    return 'stx:' + String(stxId || '');
  }

  function rowIdBuiltin(catalogId) {
    return 'builtin:' + String(catalogId || '');
  }

  function lineStateFromDoc(doc, rowId, defaultUom) {
    var lines = doc.lines || {};
    var st = lines[rowId];
    var defU = String(defaultUom || '').trim();
    if (!st || typeof st !== 'object') {
      return { qty: '', brand: '', uom: defU, uomLocked: false, brandLocked: false };
    }
    return {
      qty: st.qty != null ? String(st.qty) : '',
      brand: st.brand != null ? String(st.brand) : '',
      uom: st.uom != null && String(st.uom).trim() !== '' ? String(st.uom) : defU,
      uomLocked: !!st.uomLocked,
      brandLocked: !!st.brandLocked,
    };
  }

  function builtinLineState(doc, item) {
    var rowId = rowIdBuiltin(item.id);
    var lines = doc.lines || {};
    var st = lines[rowId];
    var defU = String(item.defaultUom || '').trim();
    var defQ = String(item.defaultQty != null ? item.defaultQty : '').trim();
    var defB = String(item.brand || '').trim();
    if (!st || typeof st !== 'object') {
      return {
        qty: defQ,
        brand: defB,
        uom: defU,
        uomLocked: defU !== '',
        brandLocked: defB !== '',
      };
    }
    return {
      qty: st.qty != null ? String(st.qty) : defQ,
      brand: st.brand != null ? String(st.brand) : defB,
      uom: st.uom != null && String(st.uom).trim() !== '' ? String(st.uom) : defU,
      uomLocked: !!st.uomLocked,
      brandLocked: !!st.brandLocked,
    };
  }

  function stxExtraState(ex) {
    if (!ex || typeof ex !== 'object') {
      return { qty: '', brand: '', uom: '', uomLocked: false, brandLocked: false };
    }
    return {
      qty: ex.qty != null ? String(ex.qty) : '',
      brand: ex.brand != null ? String(ex.brand) : '',
      uom: ex.uom != null ? String(ex.uom) : '',
      uomLocked: !!ex.uomLocked,
      brandLocked: !!ex.brandLocked,
    };
  }

  function collectRecipeMergeKeys(flat, k) {
    var set = {};
    (flat || []).forEach(function (line) {
      if (line && line.kind === 'recipe' && line.item) {
        set[k.canonicalOrderMergeKey(line.item)] = true;
      }
    });
    return set;
  }

  function builtinsForZone(zone, catalog, recipeKeys, k) {
    var order = BUILTIN_CATEGORY_ORDER[zone] || [];
    var catMap = {};
    order.forEach(function (c) {
      catMap[c] = [];
    });
    (catalog || []).forEach(function (item) {
      if (!item || item.zone !== zone) return;
      var mk = k.canonicalOrderMergeKey(item.name);
      if (recipeKeys[mk]) return;
      var cat = item.category || 'Other';
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(item);
    });
    var out = [];
    order.forEach(function (c) {
      if (catMap[c] && catMap[c].length) {
        out.push({ category: c, items: catMap[c] });
      }
    });
    Object.keys(catMap).forEach(function (c) {
      if (order.indexOf(c) >= 0) return;
      if (catMap[c].length) {
        out.push({ category: c, items: catMap[c] });
      }
    });
    return out;
  }

  function zoneHasBuiltinRows(zone, catalog, recipeKeys, k) {
    return builtinsForZone(zone, catalog, recipeKeys, k).length > 0;
  }

  function buildExportDocWithBuiltins(doc, catalog, orderList, k) {
    var flat = orderList.buildOrderLinesFlat() || [];
    var recipeKeys = collectRecipeMergeKeys(flat, k);
    var lines = Object.assign({}, doc.lines || {});
    (catalog || []).forEach(function (item) {
      if (!item) return;
      if (recipeKeys[k.canonicalOrderMergeKey(item.name)]) return;
      var rid = rowIdBuiltin(item.id);
      var st = builtinLineState(doc, item);
      lines[rid] = {
        qty: st.qty,
        brand: st.brand,
        uom: st.uom,
        uomLocked: st.uomLocked,
        brandLocked: st.brandLocked,
        catalogName: item.name,
        catalogCategory: item.category,
        catalogZone: item.zone,
      };
    });
    return { lines: lines, extras: doc.extras || [] };
  }

  function qtyBrandUomCells(rowId, state) {
    var brandRo = !!state.brandLocked && String(state.brand || '').trim() !== '';
    var uomRo = !!state.uomLocked;
    var brandTitle = brandRo ? 'Double-click to edit brand' : '';
    var uomTitle = uomRo ? 'Double-click to edit UOM' : '';

    var uomInput =
      '<input type="text" class="stkt-field stkt-uom' +
      (uomRo ? ' stkt-field--locked' : '') +
      '" data-row-id="' +
      escAttr(rowId) +
      '" value="' +
      escAttr(state.uom) +
      '" placeholder="UOM"' +
      (uomRo ? ' readonly' : '') +
      (uomTitle ? ' title="' + escAttr(uomTitle) + '"' : '') +
      ' />';
    return (
      '<input type="text" class="stkt-field stkt-qty" data-row-id="' +
      escAttr(rowId) +
      '" value="' +
      escAttr(state.qty) +
      '" placeholder="Qty on hand" />' +
      '<input type="text" class="stkt-field stkt-brand' +
      (brandRo ? ' stkt-field--locked' : '') +
      '" data-row-id="' +
      escAttr(rowId) +
      '" value="' +
      escAttr(state.brand) +
      '" placeholder="Brand"' +
      (brandRo ? ' readonly' : '') +
      (brandTitle ? ' title="' + escAttr(brandTitle) + '"' : '') +
      ' />' +
      '<div class="stkt-uom-cell">' +
      uomInput +
      '</div>'
    );
  }

  /**
   * @param {object} config
   * @param {string} config.overlayId
   * @param {string} config.bodyId
   * @param {{name:string,zone:string,qty:string,brand:string,uom:string}} config.formIds
   * @param {object} config.orderList - KuschiOrderList instance with buildOrderLinesFlat
   * @param {() => object[]} config.getOrderExtras
   * @param {object} config.storage - load, patchRow, addExtra, removeExtra, clearQuantities, exportJson
   * @param {() => boolean} [config.shouldReleaseBodyScroll]
   * @param {object[]} [config.builtinCatalog] - optional { id, name, zone, category, brand, defaultQty, defaultUom }
   */
  function create(config) {
    var overlayId = config.overlayId;
    var bodyId = config.bodyId;
    var formIds = config.formIds || {};
    var orderList = config.orderList;
    var getOrderExtras = config.getOrderExtras || function () {
      return [];
    };
    var storage = config.storage;
    var shouldReleaseBodyScroll = config.shouldReleaseBodyScroll || function () {
      return true;
    };
    var builtinCatalog = config.builtinCatalog || [];

    function Kr() {
      return window.KuschiUserRecipes;
    }

    function renderBody() {
      var body = document.getElementById(bodyId);
      if (!body || !orderList || !Kr()) return;

      var k = Kr();
      var ZL = zoneLabels();
      var doc = storage.load();
      var flat = orderList.buildOrderLinesFlat() || [];
      var recipeKeys = collectRecipeMergeKeys(flat, k);
      var extrasById = {};
      getOrderExtras().forEach(function (ex) {
        if (ex && ex.id) extrasById[ex.id] = ex;
      });

      var byZone = { freezer: [], coldroom: [], drystore: [], other: [] };
      flat.forEach(function (line) {
        var z = ZONE_ORDER.indexOf(line.zone) >= 0 ? line.zone : 'other';
        byZone[z].push(line);
      });
      ZONE_ORDER.forEach(function (z) {
        byZone[z].sort(function (a, b) {
          return (a.item || '').localeCompare(b.item || '', undefined, { sensitivity: 'base' });
        });
      });

      var stxByZone = { freezer: [], coldroom: [], drystore: [], other: [] };
      (doc.extras || []).forEach(function (ex) {
        if (!ex || !ex.id) return;
        var z = ZONE_ORDER.indexOf(ex.zone) >= 0 ? ex.zone : 'other';
        stxByZone[z].push(ex);
      });
      ZONE_ORDER.forEach(function (z) {
        stxByZone[z].sort(function (a, b) {
          return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });
      });

      var html = '';
      ZONE_ORDER.forEach(function (z) {
        var rows = byZone[z];
        var stxRows = stxByZone[z];
        var builtinGroups = builtinsForZone(z, builtinCatalog, recipeKeys, k);
        if (!rows.length && !stxRows.length && !builtinGroups.length) return;
        html += '<div class="order-zone-block stkt-zone-block">';
        html += '<div class="order-zone-head">' + esc(ZL[z]) + '</div>';

        rows.forEach(function (line) {
          var defaultUom = line.orderUnit != null ? String(line.orderUnit) : '';
          if (line.kind === 'recipe') {
            var rid = rowIdRecipe(line.item, k);
            var st = lineStateFromDoc(doc, rid, defaultUom);
            var extraIds = line.extraIds || [];
            html += '<div class="stkt-line-block">';
            html +=
              '<div class="stkt-line-row" data-kind="recipe">' +
              '<div class="stkt-line-name">' +
              esc(line.item) +
              '</div>' +
              '<div class="stkt-zone-label">' +
              esc(ZL[z]) +
              '</div>' +
              qtyBrandUomCells(rid, st) +
              '<span class="stkt-row-spacer"></span>' +
              '</div>';
            extraIds.forEach(function (xid) {
              var ex = extrasById[xid];
              if (!ex) return;
              var eid = rowIdExtra(xid);
              var exDefUom = defaultUom;
              var stEx = lineStateFromDoc(doc, eid, exDefUom);
              html +=
                '<div class="stkt-line-row stkt-line-sub" data-kind="extra">' +
                '<span class="order-sub-merged" aria-hidden="true">↳</span>' +
                '<div class="stkt-line-name">' +
                esc(ex.name) +
                '</div>' +
                '<div class="stkt-zone-label">' +
                esc(ZL[z]) +
                '</div>' +
                qtyBrandUomCells(eid, stEx) +
                '<span class="stkt-row-spacer"></span>' +
                '</div>';
            });
            html += '</div>';
          } else {
            var eid2 = rowIdExtra(line.extraId);
            var st2 = lineStateFromDoc(doc, eid2, line.orderUnit != null ? String(line.orderUnit) : '');
            html +=
              '<div class="stkt-line-row" data-kind="extra">' +
              '<div class="stkt-line-name">' +
              esc(line.item) +
              '</div>' +
              '<div class="stkt-zone-label">' +
              esc(ZL[z]) +
              '</div>' +
              qtyBrandUomCells(eid2, st2) +
              '<span class="stkt-row-spacer"></span>' +
              '</div>';
          }
        });

        stxRows.forEach(function (ex) {
          var sid = rowIdStx(ex.id);
          var stS = stxExtraState(ex);
          html +=
            '<div class="stkt-line-row stkt-line-row--stx" data-kind="stx">' +
            '<div class="stkt-line-name">' +
            esc(ex.name) +
            ' <span class="stkt-badge">stocktake</span></div>' +
            '<div class="stkt-zone-label">' +
            esc(ZL[z]) +
            '</div>' +
            qtyBrandUomCells(sid, stS) +
            '<button type="button" class="btn-secondary stkt-remove-stx" data-stx-id="' +
            escAttr(ex.id) +
            '">✕</button>' +
            '</div>';
        });

        builtinGroups.forEach(function (grp) {
          html += '<div class="stkt-category-head">' + esc(grp.category) + '</div>';
          grp.items.forEach(function (item) {
            var bid = rowIdBuiltin(item.id);
            var stB = builtinLineState(doc, item);
            html +=
              '<div class="stkt-line-row stkt-line-row--builtin" data-kind="builtin">' +
              '<div class="stkt-line-name">' +
              esc(item.name) +
              ' <span class="stkt-badge stkt-badge--catalog">catalog</span></div>' +
              '<div class="stkt-zone-label">' +
              esc(ZL[z]) +
              '</div>' +
              qtyBrandUomCells(bid, stB) +
              '<span class="stkt-row-spacer"></span>' +
              '</div>';
          });
        });

        html += '</div>';
      });

      if (!html) {
        html =
          '<p style="font-size:14px;color:var(--text3)">No ingredients yet. Add recipes to this book or use Add line below.</p>';
      }
      body.innerHTML = html;

      function patchFromInput(el, field) {
        var rowId = el.getAttribute('data-row-id');
        if (!rowId) return;
        var patch = {};
        patch[field] = el.value;
        storage.patchRow(rowId, patch);
      }

      body.querySelectorAll('.stkt-qty').forEach(function (el) {
        el.addEventListener('change', function () {
          patchFromInput(el, 'qty');
        });
      });
      body.querySelectorAll('.stkt-brand').forEach(function (el) {
        el.addEventListener('change', function () {
          if (el.readOnly) return;
          var rowId = el.getAttribute('data-row-id');
          if (!rowId) return;
          var patch = { brand: el.value };
          if (!String(el.value || '').trim()) patch.brandLocked = false;
          storage.patchRow(rowId, patch);
        });
        el.addEventListener('blur', function () {
          if (el.readOnly) return;
          var rowId = el.getAttribute('data-row-id');
          if (!rowId) return;
          var v = String(el.value || '').trim();
          if (v) storage.patchRow(rowId, { brand: el.value, brandLocked: true });
          else storage.patchRow(rowId, { brand: '', brandLocked: false });
        });
        el.addEventListener('dblclick', function () {
          if (!el.readOnly) return;
          var rowId = el.getAttribute('data-row-id');
          if (!rowId) return;
          storage.patchRow(rowId, { brandLocked: false });
          renderBody();
        });
      });
      body.querySelectorAll('.stkt-uom').forEach(function (el) {
        el.addEventListener('change', function () {
          if (el.readOnly) return;
          var rowId = el.getAttribute('data-row-id');
          if (!rowId) return;
          var patch = { uom: el.value };
          if (!String(el.value || '').trim()) patch.uomLocked = false;
          storage.patchRow(rowId, patch);
        });
        el.addEventListener('blur', function () {
          if (el.readOnly) return;
          var rowId = el.getAttribute('data-row-id');
          if (!rowId) return;
          var v = String(el.value || '').trim();
          storage.patchRow(rowId, { uom: el.value, uomLocked: v !== '' });
        });
        el.addEventListener('dblclick', function () {
          if (!el.readOnly) return;
          var rowId = el.getAttribute('data-row-id');
          if (!rowId) return;
          storage.patchRow(rowId, { uomLocked: false });
          renderBody();
        });
      });
      body.querySelectorAll('.stkt-remove-stx').forEach(function (btn) {
        btn.addEventListener('click', function () {
          storage.removeExtra(btn.getAttribute('data-stx-id'));
          renderBody();
        });
      });
    }

    function open() {
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
      var nameEl = document.getElementById(formIds.name);
      var zoneEl = document.getElementById(formIds.zone);
      var qtyEl = document.getElementById(formIds.qty);
      var brandEl = document.getElementById(formIds.brand);
      var uomEl = document.getElementById(formIds.uom);
      if (!nameEl || !zoneEl) return;
      var name = nameEl.value.trim();
      if (!name) {
        alert('Enter a name');
        return;
      }
      var zone = zoneEl.value;
      var qty = qtyEl ? qtyEl.value.trim() : '';
      var brand = brandEl ? brandEl.value.trim() : '';
      var uom = uomEl ? uomEl.value.trim() : '';
      storage.addExtra(name, zone, qty, brand, uom);
      nameEl.value = '';
      if (qtyEl) qtyEl.value = '';
      if (brandEl) brandEl.value = '';
      if (uomEl) uomEl.value = '';
      renderBody();
    }

    function clearCounted() {
      var msg =
        builtinCatalog && builtinCatalog.length
          ? 'Clear all counted quantities and brands for recipe/order lines (UOM locks stay)? Built-in catalog rows reset to snapshot defaults.'
          : 'Clear all counted quantities and brands? UOM locks stay as they are.';
      if (!confirm(msg)) return;
      storage.clearQuantities();
      renderBody();
    }

    function copyText() {
      var k = Kr();
      if (!k) return;
      var doc = storage.load();
      var flat = orderList.buildOrderLinesFlat() || [];
      var recipeKeys = collectRecipeMergeKeys(flat, k);
      var ZL = zoneLabels();
      var extrasById = {};
      getOrderExtras().forEach(function (ex) {
        if (ex && ex.id) extrasById[ex.id] = ex;
      });
      var lines = [];
      flat.forEach(function (line) {
        var z = ZONE_ORDER.indexOf(line.zone) >= 0 ? line.zone : 'other';
        var zu = ZL[z] || z;
        if (line.kind === 'recipe') {
          var rid = rowIdRecipe(line.item, k);
          var st = lineStateFromDoc(doc, rid, line.orderUnit != null ? String(line.orderUnit) : '');
          lines.push({ zone: zu, name: line.item, st: st });
          (line.extraIds || []).forEach(function (xid) {
            var ex = extrasById[xid];
            if (!ex) return;
            var eid = rowIdExtra(xid);
            var stEx = lineStateFromDoc(doc, eid, line.orderUnit != null ? String(line.orderUnit) : '');
            lines.push({ zone: zu, name: '↳ ' + ex.name, st: stEx });
          });
        } else {
          var eid2 = rowIdExtra(line.extraId);
          var st2 = lineStateFromDoc(
            doc,
            eid2,
            line.orderUnit != null ? String(line.orderUnit) : ''
          );
          lines.push({ zone: zu, name: line.item, st: st2 });
        }
      });
      (doc.extras || []).forEach(function (ex) {
        if (!ex) return;
        var z = ZONE_ORDER.indexOf(ex.zone) >= 0 ? ex.zone : 'other';
        lines.push({ zone: ZL[z] || z, name: ex.name + ' (stocktake)', st: stxExtraState(ex) });
      });

      if (builtinCatalog && builtinCatalog.length) {
        ZONE_ORDER.forEach(function (zid) {
          var zu = ZL[zid] || zid;
          var groups = builtinsForZone(zid, builtinCatalog, recipeKeys, k);
          groups.forEach(function (grp) {
            lines.push({ zone: zu, isCategory: true, title: grp.category });
            grp.items.forEach(function (item) {
              lines.push({
                zone: zu,
                name: item.name,
                st: builtinLineState(doc, item),
              });
            });
          });
        });
      }

      var byZ = {};
      lines.forEach(function (L) {
        if (!byZ[L.zone]) byZ[L.zone] = [];
        byZ[L.zone].push(L);
      });
      var text = '';
      ZONE_ORDER.forEach(function (zid) {
        var label = ZL[zid];
        var arr = byZ[label];
        if (!arr || !arr.length) return;
        text += label.toUpperCase() + '\n';
        arr.forEach(function (L) {
          if (L.isCategory) {
            text += '  [' + L.title + ']\n';
            return;
          }
          var p = L.st;
          var u = p.uom ? ' ' + p.uom : '';
          var b = p.brand ? ' · ' + p.brand : '';
          text += '- ' + L.name + ': ' + (p.qty || '—') + u + b + '\n';
        });
        text += '\n';
      });
      var out = text.trim() || '(empty)';
      navigator.clipboard.writeText(out).then(function () {
        alert('Stocktake copied');
      });
    }

    function copyJson() {
      var k = Kr();
      var jsonStr;
      if (builtinCatalog && builtinCatalog.length && k && orderList) {
        var doc = storage.load();
        jsonStr = JSON.stringify(buildExportDocWithBuiltins(doc, builtinCatalog, orderList, k), null, 2);
      } else {
        jsonStr = storage.exportJson();
      }
      navigator.clipboard.writeText(jsonStr).then(function () {
        alert('Stocktake JSON copied');
      });
    }

    return {
      open: open,
      close: close,
      refresh: renderBody,
      submitAdd: submitAdd,
      clearCounted: clearCounted,
      copyText: copyText,
      copyJson: copyJson,
    };
  }

  window.KuschiStocktakeList = {
    create: create,
    ZONE_ORDER: ZONE_ORDER,
  };
})();
