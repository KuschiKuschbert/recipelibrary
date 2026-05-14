/**
 * Merge Riviera ingredient rows that share the same canonical name and mergeable qty (g/ml/pc).
 * Used by scripts/normalize_merge_riviera_builtins.mjs and optional tooling.
 */
(function (g) {
  function pickDisplayItem(rows) {
    var best = '';
    for (var i = 0; i < rows.length; i++) {
      var it = String(rows[i].item || '').trim();
      if (it.length > best.length) best = it;
    }
    return best || (rows[0] && rows[0].item) || '';
  }

  function mergePrepStrings(preps) {
    var seen = {};
    var out = [];
    for (var i = 0; i < preps.length; i++) {
      var p = String(preps[i] || '').trim();
      if (!p || seen[p]) continue;
      seen[p] = true;
      out.push(p);
    }
    return out.length ? out.join('; ') : undefined;
  }

  /**
   * @param {Array<{qty?:string,item?:string,prep?:string}>} ingredients
   * @returns {{ ingredients: Array, oldToNewIndex: Object<number|string, number>, stats: { groupsMerged: number, rowsRemoved: number } }}
   */
  function mergeRivieraIngredients(ingredients) {
    var C = g.KuschiRivieraCanonical;
    var M = g.KuschiRecipeMetric;
    if (!C || typeof C.canonicalOrderMergeKey !== 'function') {
      throw new Error('KuschiRivieraCanonical required for mergeRivieraIngredients');
    }
    if (!M || typeof M.normalizeRivieraIngredients !== 'function') {
      throw new Error('KuschiRecipeMetric required for mergeRivieraIngredients');
    }

    var norm = M.normalizeRivieraIngredients(ingredients || []);
    var entries = [];
    for (var i = 0; i < norm.length; i++) {
      entries.push({ row: norm[i], oldIndex: i });
    }

    var groupMap = new Map();
    for (var j = 0; j < entries.length; j++) {
      var e = entries[j];
      var item = String(e.row.item || '').trim();
      var canon = C.canonicalOrderMergeKey(item);
      var base = M.rivieraQtyToMergeBase(e.row.qty);
      var gkey = base ? canon + '\0' + base.kind : canon + '\0__single__\0' + e.oldIndex;
      if (!groupMap.has(gkey)) {
        groupMap.set(gkey, { firstIndex: e.oldIndex, members: [] });
      }
      var grp = groupMap.get(gkey);
      if (e.oldIndex < grp.firstIndex) grp.firstIndex = e.oldIndex;
      grp.members.push(e);
    }

    var groups = Array.from(groupMap.entries());
    groups.sort(function (a, b) {
      return a[1].firstIndex - b[1].firstIndex;
    });

    var out = [];
    var oldToNew = Object.create(null);
    var groupsMerged = 0;
    var rowsRemoved = 0;

    function emitSeparateRows(members) {
      for (var x = 0; x < members.length; x++) {
        var ni = out.length;
        oldToNew[members[x].oldIndex] = ni;
        out.push(members[x].row);
      }
    }

    for (var gi = 0; gi < groups.length; gi++) {
      var members = groups[gi][1].members.slice();
      members.sort(function (a, b) {
        return a.oldIndex - b.oldIndex;
      });

      if (members.length === 1) {
        oldToNew[members[0].oldIndex] = out.length;
        out.push(members[0].row);
        continue;
      }

      var rows = members.map(function (m) {
        return m.row;
      });
      var bases = [];
      var allParsed = true;
      for (var k = 0; k < members.length; k++) {
        var b = M.rivieraQtyToMergeBase(members[k].row.qty);
        bases.push(b);
        if (!b) allParsed = false;
      }

      if (!allParsed) {
        emitSeparateRows(members);
        continue;
      }

      var kind = bases[0].kind;
      var kindMismatch = false;
      var sum = 0;
      for (var n = 0; n < bases.length; n++) {
        if (bases[n].kind !== kind) {
          kindMismatch = true;
          break;
        }
        sum += bases[n].n;
      }

      if (kindMismatch) {
        emitSeparateRows(members);
        continue;
      }

      var displayItem = pickDisplayItem(rows);
      var preps = rows.map(function (r) {
        return r.prep;
      });
      var prepOut = mergePrepStrings(preps);
      var qtyOut = M.rivieraMergeBaseToQtyString(kind, sum, displayItem);
      var merged = { qty: qtyOut, item: displayItem };
      if (prepOut) merged.prep = prepOut;

      groupsMerged++;
      rowsRemoved += members.length - 1;
      var newIdx = out.length;
      for (var oi = 0; oi < members.length; oi++) {
        oldToNew[members[oi].oldIndex] = newIdx;
      }
      out.push(merged);
    }

    return {
      ingredients: out,
      oldToNewIndex: oldToNew,
      stats: { groupsMerged: groupsMerged, rowsRemoved: rowsRemoved },
    };
  }

  /**
   * @returns {{ recipe: object, oldToNewIndex: Object<number|string, number>, changed: boolean }}
   */
  function mergeRivieraRecipeIngredients(recipe) {
    if (!recipe || typeof recipe !== 'object') {
      return { recipe: recipe, oldToNewIndex: {}, changed: false };
    }
    var before = recipe.ingredients || [];
    var res = mergeRivieraIngredients(before);
    var changed = JSON.stringify(before) !== JSON.stringify(res.ingredients);
    var copy = Object.assign({}, recipe);
    copy.ingredients = res.ingredients;
    return {
      recipe: copy,
      oldToNewIndex: res.oldToNewIndex,
      changed: changed,
      stats: res.stats,
    };
  }

  g.KuschiRivieraIngredientMerge = {
    mergeRivieraIngredients: mergeRivieraIngredients,
    mergeRivieraRecipeIngredients: mergeRivieraRecipeIngredients,
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
