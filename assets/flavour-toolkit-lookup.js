/**
 * Shared id normalisation for Flavour Knowledge toolkit hints (modal + matrix).
 * Load before aroma-hints.js, pairing-atlas.js, flavor-explorer.js (optional).
 */
(function (global) {
  'use strict';

  function flavourHintLookupKey(id) {
    return String(id || '')
      .replace(/-/g, '_')
      .replace(/_+/g, '_')
      .trim();
  }

  /**
   * @param {Record<string, object>|null|undefined} map
   * @param {string} id - unified or aroma kebab id
   * @returns {object|null}
   */
  function lookupHint(map, id) {
    if (!map || id == null || id === '') return null;
    var k = flavourHintLookupKey(id);
    if (map[k]) return map[k];
    if (map[id]) return map[id];
    var kebab = String(id).replace(/_/g, '-');
    if (map[kebab]) return map[kebab];
    return null;
  }

  global.KuschiFlavourToolkitLookup = {
    flavourHintLookupKey: flavourHintLookupKey,
    lookupHint: lookupHint,
  };
})(typeof window !== 'undefined' ? window : this);
