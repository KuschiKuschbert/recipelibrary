/**
 * Stocktake checklist modal (Riviera + kitchen books). Uses order list merge via orderList.buildOrderLinesFlat().
 * Optional config.builtinCatalog: static built-in snapshot rows (kitchen books / tests).
 * Optional config.builtinCatalogUrl: fetch JSON array on first open (Riviera); same-origin URL.
 */
(function () {
  'use strict';

  var ZONE_ORDER = ['freezer', 'coldroom', 'drystore', 'other'];

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

  /** Built-in catalog items for one zone, deduped vs recipe merge keys, sorted A–Z by name. */
  function builtinsFlatForZone(zone, catalog, recipeKeys, k) {
    var list = [];
    (catalog || []).forEach(function (item) {
      if (!item || item.zone !== zone) return;
      var mk = k.canonicalOrderMergeKey(item.name);
      if (recipeKeys[mk]) return;
      list.push(item);
    });
    list.sort(function (a, b) {
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });
    return list;
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
    var out = { lines: lines, extras: doc.extras || [] };
    if (doc.lastCountSnapshot && typeof doc.lastCountSnapshot === 'object') {
      out.lastCountSnapshot = doc.lastCountSnapshot;
    }
    return out;
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
   * @param {function(string):{ok:boolean,message?:string}} [config.storage.importFromJsonText] - optional replace-from-JSON (e.g. cross-device)
   * @param {() => boolean} [config.shouldReleaseBodyScroll]
   * @param {object[]} [config.builtinCatalog] - optional { id, name, zone, category, brand, defaultQty, defaultUom }
   * @param {string} [config.builtinCatalogUrl] - optional same-origin URL to JSON array (lazy on first open)
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
    var staticBuiltinCatalog =
      Array.isArray(config.builtinCatalog) && config.builtinCatalog.length > 0 ? config.builtinCatalog : null;
    var builtinCatalogUrl = String(config.builtinCatalogUrl || '').trim();
    var lazyCatalogNotLoaded = {};
    var lazyBuiltinCatalog = lazyCatalogNotLoaded;
    var lazyBuiltinLoading = null;

    function getBuiltinCatalogArray() {
      if (staticBuiltinCatalog) return staticBuiltinCatalog;
      if (lazyBuiltinCatalog !== lazyCatalogNotLoaded) return lazyBuiltinCatalog;
      return [];
    }

    function loadLazyBuiltinCatalog() {
      if (!builtinCatalogUrl) return Promise.resolve();
      if (lazyBuiltinCatalog !== lazyCatalogNotLoaded) return Promise.resolve();
      if (lazyBuiltinLoading) return lazyBuiltinLoading;
      lazyBuiltinLoading = fetch(builtinCatalogUrl, { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('Stocktake catalog HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          lazyBuiltinCatalog = Array.isArray(data) ? data : [];
          lazyBuiltinLoading = null;
        })
        .catch(function (e) {
          lazyBuiltinLoading = null;
          throw e;
        });
      return lazyBuiltinLoading;
    }

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
        var builtinFlat = builtinsFlatForZone(z, getBuiltinCatalogArray(), recipeKeys, k);
        if (!rows.length && !stxRows.length && !builtinFlat.length) return;
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

        builtinFlat.forEach(function (item) {
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
      var needsFetch =
        builtinCatalogUrl && !staticBuiltinCatalog && lazyBuiltinCatalog === lazyCatalogNotLoaded;
      if (needsFetch) {
        var bodyPre = document.getElementById(bodyId);
        if (bodyPre) {
          bodyPre.innerHTML =
            '<p style="font-size:14px;color:var(--text3)">Loading catalog…</p>';
        }
        var elPre = document.getElementById(overlayId);
        if (elPre) {
          elPre.classList.add('open');
          document.body.style.overflow = 'hidden';
        }
        loadLazyBuiltinCatalog()
          .then(function () {
            renderBody();
          })
          .catch(function () {
            if (bodyPre) {
              bodyPre.innerHTML =
                '<p style="font-size:14px;color:#e8a0a0">Could not load stocktake catalog. Check your connection and try again.</p>';
            }
          });
        return;
      }
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
      var cat = getBuiltinCatalogArray();
      var msg =
        cat && cat.length
          ? 'Clear all counted quantities and brands for recipe/order lines (UOM locks stay)? Built-in catalog rows reset to snapshot defaults.'
          : 'Clear all counted quantities and brands? UOM locks stay as they are.';
      if (!confirm(msg)) return;
      storage.clearQuantities();
      renderBody();
    }

    function collectFlatStocktakeRows(doc) {
      var k = Kr();
      if (!k || !orderList) return [];
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
          lines.push({ zone: zu, name: line.item, rowId: rid, st: st });
          (line.extraIds || []).forEach(function (xid) {
            var ex = extrasById[xid];
            if (!ex) return;
            var eid = rowIdExtra(xid);
            var stEx = lineStateFromDoc(doc, eid, line.orderUnit != null ? String(line.orderUnit) : '');
            lines.push({ zone: zu, name: '↳ ' + ex.name, rowId: eid, st: stEx });
          });
        } else {
          var eid2 = rowIdExtra(line.extraId);
          var st2 = lineStateFromDoc(
            doc,
            eid2,
            line.orderUnit != null ? String(line.orderUnit) : ''
          );
          lines.push({ zone: zu, name: line.item, rowId: eid2, st: st2 });
        }
      });
      (doc.extras || []).forEach(function (ex) {
        if (!ex) return;
        var z = ZONE_ORDER.indexOf(ex.zone) >= 0 ? ex.zone : 'other';
        lines.push({
          zone: ZL[z] || z,
          name: ex.name + ' (stocktake)',
          rowId: rowIdStx(ex.id),
          st: stxExtraState(ex),
        });
      });

      var catCopy = getBuiltinCatalogArray();
      if (catCopy && catCopy.length) {
        ZONE_ORDER.forEach(function (zid) {
          var zu = ZL[zid] || zid;
          builtinsFlatForZone(zid, catCopy, recipeKeys, k).forEach(function (item) {
            var bid = rowIdBuiltin(item.id);
            lines.push({
              zone: zu,
              name: item.name,
              rowId: bid,
              st: builtinLineState(doc, item),
            });
          });
        });
      }
      return lines;
    }

    function lastStocktakeCell(rowId, snapshot, currentSt) {
      function pack(q, b) {
        var tq = String(q != null ? q : '').trim();
        var tb = String(b != null ? b : '').trim();
        if (!tq && !tb) return '—';
        if (tb) return esc(tq + ' · ' + tb);
        return esc(tq);
      }
      if (!snapshot || typeof snapshot !== 'object') {
        return pack(currentSt.qty, currentSt.brand);
      }
      var q = '';
      var b = '';
      var found = false;
      if (snapshot.lines && Object.prototype.hasOwnProperty.call(snapshot.lines, rowId)) {
        found = true;
        var L = snapshot.lines[rowId];
        q = L && L.qty != null ? String(L.qty) : '';
        b = L && L.brand != null ? String(L.brand) : '';
      } else if (rowId.indexOf('stx:') === 0 && snapshot.extrasById) {
        var eid = rowId.slice(4);
        if (Object.prototype.hasOwnProperty.call(snapshot.extrasById, eid)) {
          found = true;
          var ex = snapshot.extrasById[eid];
          q = ex && ex.qty != null ? String(ex.qty) : '';
          b = ex && ex.brand != null ? String(ex.brand) : '';
        }
      }
      if (!found) return '—';
      return pack(q, b);
    }

    function copyText() {
      var k = Kr();
      if (!k) return;
      var doc = storage.load();
      var lines = collectFlatStocktakeRows(doc);
      var byZ = {};
      lines.forEach(function (L) {
        if (!byZ[L.zone]) byZ[L.zone] = [];
        byZ[L.zone].push(L);
      });
      var ZL = zoneLabels();
      var text = '';
      ZONE_ORDER.forEach(function (zid) {
        var label = ZL[zid];
        var arr = byZ[label];
        if (!arr || !arr.length) return;
        text += label.toUpperCase() + '\n';
        arr.forEach(function (L) {
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

    function printSheet() {
      var k = Kr();
      if (!k || !orderList) return;
      var doc = storage.load();
      var snap = doc.lastCountSnapshot;
      var lines = collectFlatStocktakeRows(doc);
      if (!lines.length) {
        alert('Nothing to print yet.');
        return;
      }
      var byZ = {};
      lines.forEach(function (L) {
        if (!byZ[L.zone]) byZ[L.zone] = [];
        byZ[L.zone].push(L);
      });
      var ZL = zoneLabels();
      var subtitle = '';
      if (!snap || typeof snap !== 'object') {
        subtitle =
          '<p class="stkt-print-note">Reference: counts currently in app (no snapshot from a previous clear yet).</p>';
      }
      var rowsHtml = '';
      ZONE_ORDER.forEach(function (zid) {
        var label = ZL[zid];
        var arr = byZ[label];
        if (!arr || !arr.length) return;
        rowsHtml +=
          '<tr class="stkt-print-zone"><td colspan="6">' + esc(label.toUpperCase()) + '</td></tr>';
        arr.forEach(function (L) {
          var st = L.st;
          var uomRaw = String(st.uom || '').trim();
          var brandRaw = String(st.brand || '').trim();
          var uom = uomRaw ? esc(uomRaw) : '—';
          var brand = brandRaw ? esc(brandRaw) : '—';
          var last = lastStocktakeCell(L.rowId, snap, st);
          rowsHtml +=
            '<tr>' +
            '<td class="stkt-print-z">' +
            esc(L.zone) +
            '</td>' +
            '<td class="stkt-print-name">' +
            esc(L.name) +
            '</td>' +
            '<td class="stkt-print-uom">' +
            uom +
            '</td>' +
            '<td class="stkt-print-brand">' +
            brand +
            '</td>' +
            '<td class="stkt-print-last">' +
            last +
            '</td>' +
            '<td class="stkt-print-write"></td>' +
            '</tr>';
        });
      });
      if (!rowsHtml.trim()) {
        alert('Nothing to print yet.');
        return;
      }
      var html =
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Stocktake checklist</title>' +
        '<style>' +
        '*{box-sizing:border-box}' +
        'body{font:13px/1.35 system-ui,Segoe UI,sans-serif;margin:12mm;color:#111}' +
        'h1{font-size:1.15rem;margin:0 0 8px}' +
        '.stkt-print-note{font-size:11px;color:#444;margin:0 0 12px}' +
        'table{width:100%;border-collapse:collapse;table-layout:fixed}' +
        'th,td{border:1px solid #333;padding:6px 8px;vertical-align:top}' +
        'th{background:#eee;font-weight:600;text-align:left}' +
        'tr.stkt-print-zone td{font-weight:700;background:#f3f3f3;border-color:#333}' +
        '.stkt-print-z{width:12%}' +
        '.stkt-print-name{width:26%}' +
        '.stkt-print-uom{width:10%}' +
        '.stkt-print-brand{width:18%}' +
        '.stkt-print-last{width:18%}' +
        '.stkt-print-write{min-height:1.6em;background:#fafafa}' +
        '@page{margin:12mm}' +
        '@media print{body{margin:0}.stkt-print-write{min-height:24px}}' +
        '</style></head><body>' +
        '<h1>Stocktake checklist</h1>' +
        subtitle +
        '<table><thead><tr>' +
        '<th scope="col">Zone</th>' +
        '<th scope="col">Item</th>' +
        '<th scope="col">UOM</th>' +
        '<th scope="col">Brand</th>' +
        '<th scope="col">Last stocktake</th>' +
        '<th scope="col">This week</th>' +
        '</tr></thead><tbody>' +
        rowsHtml +
        '</tbody></table>' +
        '</body></html>';
      var w = window.open('', '_blank');
      if (!w) {
        alert('Pop-up blocked — allow pop-ups to print.');
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }

    function importJsonFile() {
      if (!storage || typeof storage.importFromJsonText !== 'function') {
        alert('Import is not available.');
        return;
      }
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var res = storage.importFromJsonText(String(reader.result || ''));
          if (res && res.ok) {
            renderBody();
            alert('Stocktake imported.');
          } else if (res && res.message === 'Cancelled.') {
            return;
          } else {
            alert((res && res.message) || 'Import failed.');
          }
        };
        reader.readAsText(f);
      };
      inp.click();
    }

    function copyJson() {
      var k = Kr();
      var jsonStr;
      var catJ = getBuiltinCatalogArray();
      if (catJ && catJ.length && k && orderList) {
        var doc = storage.load();
        jsonStr = JSON.stringify(buildExportDocWithBuiltins(doc, catJ, orderList, k), null, 2);
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
      printSheet: printSheet,
      importJsonFile: importJsonFile,
    };
  }

  window.KuschiStocktakeList = {
    create: create,
    ZONE_ORDER: ZONE_ORDER,
  };
})();
