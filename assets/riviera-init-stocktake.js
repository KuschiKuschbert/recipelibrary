/**
 * Deferred init for Riviera stocktake modal (after stocktake-list.js). Requires window.rivieraOrderList
 * and window.__RIVIERA_STOCKTAKE_CATALOG_URL set by riviera.html inline script.
 */
(function () {
  'use strict';
  var ol = typeof ensureRivieraOrderList === 'function'
    ? ensureRivieraOrderList()
    : window.rivieraOrderList;
  if (!window.KuschiStocktakeList || !ol) return;
  window.rivieraStocktakeList = window.KuschiStocktakeList.create({
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
  });
})();
