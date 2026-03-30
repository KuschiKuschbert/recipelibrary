/**
 * Deterministic imperial → metric normalization for recipe ingredients (browser).
 * US customary cup = 236.5882365 ml (not US legal 240 ml — documented for reproducibility).
 * Volume → mass only for **solids** when density is known. **Liquids** stay in ml/L
 * (even if density exists). Quantities are chef-rounded (sensible g/ml/L/kg steps).
 */
(function (global) {
  /** US liquid cup in ml */
  var ML_PER_US_CUP = 236.5882365;
  var ML_PER_TSP = 4.92892159375;
  var ML_PER_TBSP = ML_PER_TSP * 3;
  var ML_PER_FLOZ = 29.5735295625;
  var ML_PER_US_PINT = 473.176473;
  var ML_PER_US_QUART = 946.352946;
  var ML_PER_US_GALLON = 3785.411784;
  var G_PER_LB = 453.59237;
  var G_PER_OZ_WEIGHT = 28.349523125;

  var UNICODE_FRAC = {
    '½': 0.5,
    '¼': 0.25,
    '¾': 0.75,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
  };

  /** Ingredient substring (lowercase) → g/ml. Longer / more specific keys should be listed first where order matters for iteration — we pick best substring match. */
  var DENSITY_BY_INGREDIENT = [
    ['all-purpose flour', 0.53],
    ['plain flour', 0.53],
    ['bread flour', 0.53],
    ['cake flour', 0.42],
    ['whole wheat flour', 0.5],
    ['flour', 0.53],
    ['granulated sugar', 0.85],
    ['caster sugar', 0.8],
    ['castor sugar', 0.8],
    ['icing sugar', 0.5],
    ['powdered sugar', 0.5],
    ['confectioners sugar', 0.5],
    ['brown sugar', 0.83],
    ['sugar', 0.85],
    ['cocoa powder', 0.35],
    ['cocoa', 0.35],
    ['cornstarch', 0.52],
    ['corn starch', 0.52],
    ['rice', 0.85],
    ['rolled oats', 0.38],
    ['oats', 0.38],
    ['breadcrumbs', 0.45],
    ['almond meal', 0.43],
    ['ground almond', 0.43],
    ['honey', 1.42],
    ['maple syrup', 1.37],
    ['golden syrup', 1.37],
    ['corn syrup', 1.37],
    ['molasses', 1.45],
    ['mayonnaise', 0.91],
    ['sour cream', 1.0],
    ['yoghurt', 1.03],
    ['yogurt', 1.03],
    ['cream cheese', 0.98],
    ['milk', 1.03],
    ['buttermilk', 1.03],
    ['heavy cream', 0.99],
    ['whipping cream', 0.99],
    ['coconut milk', 1.0],
    ['stock', 1.0],
    ['broth', 1.0],
    ['water', 1.0],
    ['oil', 0.92],
    ['olive oil', 0.92],
    ['vegetable oil', 0.92],
    ['coconut oil', 0.92],
    ['sesame oil', 0.92],
    ['butter', 0.911],
    ['shortening', 0.91],
    ['peanut butter', 0.95],
    ['tahini', 0.53],
    ['mustard', 1.05],
    ['ketchup', 1.04],
    ['tomato paste', 1.07],
    ['vinegar', 1.01],
    ['wine', 0.99],
    ['beer', 1.01],
  ];

  function normItem(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function densityForItem(item) {
    var n = normItem(item);
    if (!n) return null;
    for (var i = 0; i < DENSITY_BY_INGREDIENT.length; i++) {
      var key = DENSITY_BY_INGREDIENT[i][0];
      if (n.indexOf(key) >= 0) return DENSITY_BY_INGREDIENT[i][1];
    }
    return null;
  }

  /** Treat as solid even if name contains a liquid-looking substring */
  var SOLID_OVERRIDES = [
    'cream cheese',
    'mascarpone',
    'ricotta',
    'peanut butter',
    'almond butter',
    'nut butter',
    'cocoa butter',
    'coconut butter',
    'butter',
    'shortening',
    'lard',
    'tahini',
    'dry mustard',
    'mustard powder',
    'mustard seed',
    'powdered milk',
    'milk powder',
    'chocolate chip',
    'chocolate bar',
    'cream of tartar',
    'ice cream',
  ];

  /** Substring match (longer phrases first) → pourable / cup-measured as liquid */
  var LIQUID_SUBSTRINGS = [
    'coconut milk',
    'coconut cream',
    'evaporated milk',
    'condensed milk',
    'sweetened condensed',
    'heavy cream',
    'whipping cream',
    'double cream',
    'single cream',
    'sour cream',
    'crème fraîche',
    'creme fraiche',
    'half and half',
    'half-and-half',
    'buttermilk',
    'chicken stock',
    'beef stock',
    'vegetable stock',
    'fish stock',
    'chicken broth',
    'beef broth',
    'vegetable broth',
    'mushroom stock',
    'dashi',
    'olive oil',
    'vegetable oil',
    'coconut oil',
    'sesame oil',
    'sunflower oil',
    'canola oil',
    'grapeseed oil',
    'peanut oil',
    'cooking oil',
    'truffle oil',
    'chili oil',
    'chilli oil',
    'soy sauce',
    'fish sauce',
    'worcestershire',
    'hot sauce',
    'vanilla extract',
    'almond extract',
    'maple syrup',
    'golden syrup',
    'corn syrup',
    'agave',
    'rice wine',
    'mirin',
    'lemon juice',
    'lime juice',
    'orange juice',
    'tomato juice',
    'apple juice',
    'pineapple juice',
    'cranberry juice',
    'pomegranate juice',
    'passion fruit juice',
    'ginger juice',
    'rose water',
    'orange blossom water',
    'simple syrup',
    'grenadine',
    'triple sec',
    'cointreau',
    'grand marnier',
    'liqueur',
    'vermouth',
    'sherry',
    'port wine',
    'red wine',
    'white wine',
    'cooking wine',
    'marsala',
    'madeira',
    'brandy',
    'rum',
    'whiskey',
    'whisky',
    'vodka',
    'gin',
    'tequila',
    'coconut water',
    'sparkling water',
    'soda water',
    'club soda',
    'tonic water',
    'cola',
    'stout',
    'lager',
    'cider',
    'beer',
    'ale',
    'porter',
    'vinegar',
    'balsamic',
    'malt vinegar',
    'rice vinegar',
    'wine vinegar',
    'apple cider vinegar',
    'mayonnaise',
    'aioli',
    'ketchup',
    'dijon mustard',
    'wholegrain mustard',
    'mustard',
    'bbq sauce',
    'barbecue sauce',
    'hoisin',
    'oyster sauce',
    'teriyaki',
    'molasses',
    'honey',
    'yoghurt',
    'yogurt',
    'kefir',
    'milk',
    'stock',
    'broth',
    'water',
    'juice',
    'wine',
    'oil',
    'syrup',
  ];

  function isLiquidItem(item) {
    var n = normItem(item);
    if (!n) return false;
    var j;
    for (j = 0; j < SOLID_OVERRIDES.length; j++) {
      if (n.indexOf(SOLID_OVERRIDES[j]) >= 0) return false;
    }
    for (j = 0; j < LIQUID_SUBSTRINGS.length; j++) {
      if (n.indexOf(LIQUID_SUBSTRINGS[j]) >= 0) return true;
    }
    return false;
  }

  function replaceUnicodeFractions(s) {
    var out = String(s);
    for (var k in UNICODE_FRAC) {
      if (Object.prototype.hasOwnProperty.call(UNICODE_FRAC, k)) {
        out = out.split(k).join(' ' + UNICODE_FRAC[k] + ' ');
      }
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  /**
   * Parse leading numeric value from start of string; supports 1 1/2, 3/4, decimals.
   * @returns {{ value: number|null, rest: string }}
   */
  function parseLeadingNumber(str) {
    var s = replaceUnicodeFractions(String(str || '').trim());
    if (!s) return { value: null, rest: '' };

    var reMixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*(.*)$/;
    var m = s.match(reMixed);
    if (m) {
      var whole = parseInt(m[1], 10);
      var num = parseInt(m[2], 10);
      var den = parseInt(m[3], 10);
      if (den) return { value: whole + num / den, rest: (m[4] || '').trim() };
    }

    var reFrac = /^(\d+)\s*\/\s*(\d+)\s*(.*)$/;
    m = s.match(reFrac);
    if (m) {
      var n = parseInt(m[1], 10);
      var d = parseInt(m[2], 10);
      if (d) return { value: n / d, rest: (m[3] || '').trim() };
    }

    var reDec = /^([\d.]+)\s*(.*)$/;
    m = s.match(reDec);
    if (m && m[1] !== '') {
      var v = parseFloat(m[1]);
      if (!isNaN(v)) return { value: v, rest: (m[2] || '').trim() };
    }

    return { value: null, rest: s };
  }

  var UNIT_SPECS = [
    { re: /^(fluid\s+ounces?|fl\.?\s*oz)\b/i, mlPer: ML_PER_FLOZ },
    { re: /^(tablespoons?|tbsp\.?|tbs\.?)\b/i, mlPer: ML_PER_TBSP },
    { re: /^(teaspoons?|tsp\.?)\b/i, mlPer: ML_PER_TSP },
    { re: /^(cups?)\b/i, mlPer: ML_PER_US_CUP },
    { re: /^(pints?|pt\.?)\b/i, mlPer: ML_PER_US_PINT },
    { re: /^(quarts?|qt\.?)\b/i, mlPer: ML_PER_US_QUART },
    { re: /^(gallons?|gal\.?)\b/i, mlPer: ML_PER_US_GALLON },
    { re: /^(pounds?|lbs?\.?)\b/i, gPer: G_PER_LB },
    { re: /^(ounces?|oz\.?)\b/i, gPer: G_PER_OZ_WEIGHT },
  ];

  /** @returns {{ factorToG: number, factorToMl: number }|null} */
  function metricUnitFactors(rest) {
    var s = String(rest || '').trim();
    var m = s.match(/^(g|kg|mg)\b/i);
    if (m) {
      var u = m[1].toLowerCase();
      if (u === 'kg') return { factorToG: 1000, factorToMl: 0 };
      if (u === 'mg') return { factorToG: 0.001, factorToMl: 0 };
      return { factorToG: 1, factorToMl: 0 };
    }
    m = s.match(/^(ml|mL)\b/i);
    if (m) return { factorToG: 0, factorToMl: 1 };
    m = s.match(/^(l|L)\b/i);
    if (m) return { factorToG: 0, factorToMl: 1000 };
    m = s.match(/^(grams?|kilograms?)\b/i);
    if (m) {
      if (/^kilograms?/i.test(m[0])) return { factorToG: 1000, factorToMl: 0 };
      return { factorToG: 1, factorToMl: 0 };
    }
    m = s.match(/^(milliliters?|millilitres?)\b/i);
    if (m) return { factorToG: 0, factorToMl: 1 };
    m = s.match(/^(liters?|litres?)\b/i);
    if (m) return { factorToG: 0, factorToMl: 1000 };
    return null;
  }

  var SPICE_HINT = /salt|pepper|spice|ground\s|powder|cinnamon|nutmeg|cloves?|cardamom|paprika|cumin|coriander|turmeric|ginger\s|za'?atar|garam\s+masala|chili\s+powder|chilli\s+powder|oregano|thyme|basil|rosemary|dried\s+herb|yeast|baking\s+powder|baking\s+soda|bicarb/i;

  function isSpiceyItem(item) {
    return SPICE_HINT.test(normItem(item));
  }

  /** Trim trailing zeros; avoid float noise in display */
  function qtyString(n) {
    if (!isFinite(n) || n < 0) return '0';
    var r = Math.round(n * 1000) / 1000;
    var s = r.toFixed(3);
    return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  /**
   * Kitchen-friendly gram rounding: coarser as amounts grow; finer for small spices.
   */
  function chefRoundMassG(g, item) {
    if (!(g > 0) || !isFinite(g)) return 0;
    var spice = isSpiceyItem(item);
    if (g < 3) {
      if (spice) return Math.round(g * 4) / 4;
      return Math.round(g * 2) / 2;
    }
    if (g < 30) {
      if (spice) return Math.round(g * 2) / 2;
      return Math.round(g);
    }
    if (g < 200) return Math.round(g / 5) * 5;
    if (g < 1000) return Math.round(g / 10) * 10;
    return g;
  }

  /**
   * Snap ml to steps that match how cooks measure (5 ml ≈ 1 tsp, 15 ml ≈ 1 tbsp).
   */
  function chefRoundVolumeMl(ml, item) {
    if (!(ml > 0) || !isFinite(ml)) return 0;
    var spice = isSpiceyItem(item);
    if (ml < 20) {
      var step = spice ? 2.5 : 5;
      return Math.round(ml / step) * step;
    }
    if (ml < 250) return Math.round(ml / 5) * 5;
    if (ml < 1000) return Math.round(ml / 10) * 10;
    return ml;
  }

  /** kg display: quarters when small, halves, then coarser */
  function chefRoundKg(kg) {
    if (!(kg > 0) || !isFinite(kg)) return 0;
    if (kg < 1.5) return Math.round(kg * 4) / 4;
    if (kg < 5) return Math.round(kg * 2) / 2;
    if (kg < 25) return Math.round(kg * 2) / 2;
    return Math.round(kg);
  }

  /** Litres: quarter-litre steps when practical */
  function chefRoundLiters(L) {
    if (!(L > 0) || !isFinite(L)) return 0;
    if (L < 3) return Math.round(L * 4) / 4;
    if (L < 15) return Math.round(L * 2) / 2;
    return Math.round(L * 10) / 10;
  }

  function formatQtyMassG(g, item) {
    var itemRef = item != null ? item : '';
    if (g >= 1000) {
      var kg = chefRoundKg(g / 1000);
      return { qty: qtyString(kg), unit: 'kg' };
    }
    var rg = chefRoundMassG(g, itemRef);
    return { qty: qtyString(rg), unit: 'g' };
  }

  function formatQtyVolumeMl(ml, item) {
    var itemRef = item != null ? item : '';
    if (ml >= 1000) {
      var L = chefRoundLiters(ml / 1000);
      return { qty: qtyString(L), unit: 'L' };
    }
    var rm = chefRoundVolumeMl(ml, itemRef);
    return { qty: qtyString(rm), unit: 'ml' };
  }

  /**
   * @param {string} amountStr - e.g. "1 cup", "2 tbsp"
   * @param {string} item - ingredient name for density
   * @returns {{ qty: string, unit: string }|null} null = no conversion
   */
  function convertAmountPhrase(amountStr, item) {
    var pn = parseLeadingNumber(amountStr);
    if (pn.value == null) return null;
    var rest = pn.rest.trim();
    if (!rest) return null;

    var mf = metricUnitFactors(rest);
    if (mf) {
      var numM = pn.value;
      if (mf.factorToG) return formatQtyMassG(numM * mf.factorToG, item);
      if (mf.factorToMl) return formatQtyVolumeMl(numM * mf.factorToMl, item);
    }

    for (var i = 0; i < UNIT_SPECS.length; i++) {
      var spec = UNIT_SPECS[i];
      var um = rest.match(spec.re);
      if (!um) continue;
      var n = pn.value;
      if (spec.gPer != null) {
        return formatQtyMassG(n * spec.gPer, item);
      }
      var ml = n * spec.mlPer;
      var rho = densityForItem(item);
      if (rho != null && rho > 0 && !isLiquidItem(item)) {
        return formatQtyMassG(ml * rho, item);
      }
      return formatQtyVolumeMl(ml, item);
    }

    return null;
  }

  function kitchenRowToPhrase(qty, unit) {
    var q = qty != null ? String(qty).trim() : '';
    var u = unit != null ? String(unit).trim() : '';
    if (!q && !u) return '';
    if (!q) return u;
    if (!u) return q;
    return q + ' ' + u;
  }

  /**
   * @returns {{ qty: string|null, unit: string|null }}
   */
  function normalizeKitchenQtyUnit(qty, unit, item) {
    var phrase = kitchenRowToPhrase(qty, unit);
    if (!phrase) return { qty: qty != null ? String(qty).trim() || null : null, unit: unit != null ? String(unit).trim() || null : null };
    var c = convertAmountPhrase(phrase, item);
    if (!c) {
      return {
        qty: qty != null ? String(qty).trim() || null : null,
        unit: unit != null ? String(unit).trim() || null : null,
      };
    }
    return { qty: c.qty, unit: c.unit };
  }

  /** Single Riviera qty field → one metric string */
  function normalizeRivieraQtyString(qtyStr, item) {
    var s = String(qtyStr || '').trim();
    if (!s) return s;
    var c = convertAmountPhrase(s, item);
    if (!c) return s;
    return c.qty + ' ' + c.unit;
  }

  function normalizeKitchenIngredients(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(function (ing) {
      if (!ing || typeof ing !== 'object') return ing;
      var item = ing.item != null ? String(ing.item).trim() : '';
      var nu = normalizeKitchenQtyUnit(ing.qty, ing.unit, item);
      var out = {
        qty: nu.qty,
        unit: nu.unit,
        item: item,
        prep: ing.prep != null ? String(ing.prep).trim() || null : null,
      };
      return out;
    });
  }

  function normalizeRivieraIngredients(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(function (ing) {
      if (!ing || typeof ing !== 'object') return ing;
      var item = ing.item != null ? String(ing.item).trim() : '';
      var qIn = ing.qty != null ? String(ing.qty).trim() : '';
      var uIn = ing.unit != null ? String(ing.unit).trim() : '';
      var combined = uIn ? (qIn ? qIn + ' ' + uIn : uIn) : qIn;
      var qOut = normalizeRivieraQtyString(combined, item);
      var o = { qty: qOut, item: item || ing.item };
      if (ing.prep != null && String(ing.prep).trim()) o.prep = String(ing.prep).trim();
      return o;
    });
  }

  function normalizeGeminiKitchen(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    var out = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && k !== 'ingredients') out[k] = obj[k];
    }
    out.ingredients = normalizeKitchenIngredients(obj.ingredients || []);
    return out;
  }

  function normalizeGeminiRiviera(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    var out = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && k !== 'ingredients') out[k] = obj[k];
    }
    out.ingredients = normalizeRivieraIngredients(obj.ingredients || []);
    return out;
  }

  global.KuschiRecipeMetric = {
    ML_PER_US_CUP: ML_PER_US_CUP,
    normalizeKitchenIngredients: normalizeKitchenIngredients,
    normalizeRivieraIngredients: normalizeRivieraIngredients,
    normalizeGeminiKitchen: normalizeGeminiKitchen,
    normalizeGeminiRiviera: normalizeGeminiRiviera,
    /** Exposed for tests / debugging */
    convertAmountPhrase: convertAmountPhrase,
    kitchenRowToPhrase: kitchenRowToPhrase,
    chefRoundMassG: chefRoundMassG,
    chefRoundVolumeMl: chefRoundVolumeMl,
  };
})(typeof window !== 'undefined' ? window : this);
