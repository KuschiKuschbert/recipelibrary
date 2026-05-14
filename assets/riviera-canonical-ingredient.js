/**
 * Shared canonical ingredient keys for Riviera order list, master list, and SSOT merge.
 * Load before assets/user-recipes.js (and before any batch tooling that normalises builtins).
 */
(function (g) {
  /**
   * Regex → replacement (applied after basic normalization). Word-style aliases for order-list merge + master.
   */
  var INGREDIENT_CANON_ALIASES = [
    [/\bkewpie\s+mayonnaise\b/g, 'kewpie mayo'],
    [/\bdill\s+fresh\b/g, 'dill'],
    [/\bfresh\s+dill\b/g, 'dill'],
    [/\bflat\s+leaf\s+italian\s+parsley\b/gi, 'flat leaf parsley'],
    [/\bitalian\s+flat\s+leaf\s+parsley\b/gi, 'flat leaf parsley'],
    [/\bscallions?\b/g, 'spring onion'],
    [/\bgreen\s+onions?\b/g, 'spring onion'],
    [/\bspring\s+onions?\b/g, 'spring onion'],
    [/\bshallots?\b/g, 'eschalot'],
    [/\beshallots?\b/g, 'eschalot'],
    [/\bcilantro\b/g, 'coriander'],
    [/\bcoriander\s+leaves?\b/g, 'coriander'],
    [/\bground\s+beef\b/g, 'beef mince'],
    [/\bminced\s+beef\b/g, 'beef mince'],
    [/\bheavy\s+cream\b/g, 'thickened cream'],
    [/\bconfectioners\s+sugar\b/g, 'icing sugar'],
    [/\bpowdered\s+sugar\b/g, 'icing sugar'],
    [/\bkosher\s+salt\b/g, 'salt'],
    [/\bsea\s+salt\s+flakes?\b/g, 'salt flakes'],
    [/\bextra\s+virgin\s+olive\s+oil\b/g, 'olive oil'],
    [/\bevo?o\b/g, 'olive oil'],
    [/\bap\s+flour\b/g, 'plain flour'],
    [/\ball[\s-]?purpose\s+flour\b/g, 'plain flour'],
    [/\bmint\s*[—–-]\s*fresh\b/gi, 'mint'],
    [/\bfresh\s+mint\b/gi, 'mint'],
  ];

  var INGREDIENT_KEEP_TRAILING_S = new Set([
    'glass',
    'grass',
    'class',
    'brass',
    'pass',
    'cross',
    'loss',
    'boss',
    'chess',
    'dress',
    'press',
    'stress',
    'mess',
    'access',
    'success',
    'business',
    'illness',
    'happiness',
    'walrus',
    'virus',
    'campus',
    'status',
    'this',
    'us',
    'plus',
    'minus',
    'gas',
    'atlas',
  ]);

  function singularizeIngredientToken(w) {
    var x = String(w || '').trim();
    if (x.length < 3) return x;
    if (INGREDIENT_KEEP_TRAILING_S.has(x)) return x;
    if (x.length >= 5 && x.endsWith('ies')) return x.slice(0, -3) + 'y';
    if (x.length >= 6 && x.endsWith('oes')) return x.slice(0, -2);
    if (x.length >= 5 && x.endsWith('xes')) return x.slice(0, -2);
    if (x.length >= 8 && x.endsWith('ches')) return x.slice(0, -2);
    if (x.length >= 6 && x.endsWith('shes')) return x.slice(0, -2);
    if (x.length >= 4 && x.endsWith('s') && x.charAt(x.length - 2) !== 's') {
      if (x.endsWith('us') || x.endsWith('is') || x === 'this' || x === 'gas') return x;
      return x.slice(0, -1);
    }
    return x;
  }

  function applyIngredientAliases(t) {
    var s = t;
    for (var i = 0; i < INGREDIENT_CANON_ALIASES.length; i++) {
      s = s.replace(INGREDIENT_CANON_ALIASES[i][0], INGREDIENT_CANON_ALIASES[i][1]);
    }
    return s;
  }

  function singularizeIngredientPhrase(t) {
    return t
      .split(' ')
      .filter(Boolean)
      .map(singularizeIngredientToken)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Canonical key for order-list merging and master ingredient matching.
   * NFKC, & → and, dash/punct cleanup, curated aliases, conservative English plural collapse per token.
   */
  function canonicalOrderMergeKey(s) {
    var t = String(s || '').trim();
    try {
      if (t.normalize) t = t.normalize('NFKC');
    } catch (e) {
      /* ignore */
    }
    t = t.toLowerCase();
    t = t.replace(/&/g, ' and ');
    t = t.replace(/[—–\-−]/g, ' ');
    t = t.replace(/[^a-z0-9\s\u00C0-\u024F]/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    t = applyIngredientAliases(t);
    t = singularizeIngredientPhrase(t);
    return t;
  }

  g.KuschiRivieraCanonical = {
    INGREDIENT_CANON_ALIASES: INGREDIENT_CANON_ALIASES,
    canonicalOrderMergeKey: canonicalOrderMergeKey,
    applyIngredientAliases: applyIngredientAliases,
    singularizeIngredientPhrase: singularizeIngredientPhrase,
  };
})(
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
        ? global
        : this
);
