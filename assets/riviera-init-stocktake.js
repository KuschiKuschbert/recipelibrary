/**
 * Riviera stocktake modal (after stocktake-list.js). Order list is lazy-loaded on
 * riviera.html — init after loadRivieraOrderListScript() via ensureRivieraStocktakeListReady().
 */
(function () {
  'use strict';

  function ensureOl() {
    return typeof window.ensureRivieraOrderList === 'function'
      ? window.ensureRivieraOrderList()
      : window.rivieraOrderList || null;
  }

  function createConfig(ol) {
    return {
      overlayId: 'stocktakeOverlay',
      bodyId: 'stocktakeBody',
      formIds: {
        name: 'stNewName',
        zone: 'stNewZone',
        qty: 'stNewQty',
        brand: 'stNewBrand',
        uom: 'stNewUom',
      },
      orderList: ol,
      getOrderExtras: function () {
        return window.KuschiUserRecipes.loadOrderExtras();
      },
      storage: {
        load: function () {
          return window.KuschiUserRecipes.loadRivieraStocktake();
        },
        patchRow: function (rowId, patch) {
          window.KuschiUserRecipes.patchRivieraStocktakeRow(rowId, patch);
        },
        addExtra: function (n, z, q, b, u) {
          window.KuschiUserRecipes.addRivieraStocktakeExtra(n, z, q, b, u);
        },
        removeExtra: function (id) {
          window.KuschiUserRecipes.removeRivieraStocktakeExtra(id);
        },
        clearQuantities: function () {
          window.KuschiUserRecipes.clearRivieraStocktakeQuantities();
        },
        exportJson: function () {
          return window.KuschiUserRecipes.exportRivieraStocktakeJson();
        },
        importFromJsonText: function (text) {
          return window.KuschiUserRecipes.importRivieraStocktakeJson(text);
        },
      },
      shouldReleaseBodyScroll: function () {
        return (
          !document.getElementById('modalOverlay').classList.contains('open') &&
          !document.getElementById('addRivieraOverlay').classList.contains('open') &&
          !document.getElementById('rivieraAdminOverlay').classList.contains('open') &&
          !document.getElementById('pageQrOverlay').classList.contains('open') &&
          !document.getElementById('orderListOverlay').classList.contains('open')
        );
      },
      builtinCatalogUrl: window.__RIVIERA_STOCKTAKE_CATALOG_URL || '',
    };
  }

  function initRivieraStocktakeList() {
    if (window.rivieraStocktakeList) return window.rivieraStocktakeList;
    if (!window.KuschiStocktakeList || !window.KuschiUserRecipes) return null;
    var ol = ensureOl();
    if (!ol) return null;
    window.rivieraStocktakeList = window.KuschiStocktakeList.create(createConfig(ol));
    return window.rivieraStocktakeList;
  }

  window.ensureRivieraStocktakeListReady = function () {
    if (window.rivieraStocktakeList) return Promise.resolve(window.rivieraStocktakeList);
    var load =
      typeof window.loadRivieraOrderListScript === 'function'
        ? window.loadRivieraOrderListScript
        : null;
    var p = load ? load() : Promise.resolve();
    return p.then(function () {
      var ol = ensureOl();
      if (!ol || !window.KuschiStocktakeList || !window.KuschiUserRecipes) {
        return Promise.reject(
          new Error('Stocktake dependencies missing (order list or stocktake module).')
        );
      }
      initRivieraStocktakeList();
      if (!window.rivieraStocktakeList) {
        return Promise.reject(new Error('Stocktake init failed.'));
      }
      return window.rivieraStocktakeList;
    });
  };

  initRivieraStocktakeList();
})();
