#!/usr/bin/env node
/**
 * Build slim JSON for recipe modals / aroma-hints.js only (not aroma.html / flavor.html).
 *
 * - aroma_data/ingredients_modal_core.json — fields used by buildSuggestions + heat timing
 * - combined_data/ingredients_unified_modal.json — id, name, slim flavor + optional cuisine_map
 *
 * Run after editing ingredients.json or ingredients_unified.json:
 *   node scripts/build_aroma_modal_data.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const ingPath = join(root, 'aroma_data', 'ingredients.json');
  const ing = JSON.parse(readFileSync(ingPath, 'utf8'));
  if (!Array.isArray(ing)) {
    throw new Error('ingredients.json must be a JSON array');
  }
  const modalCore = ing.map((r) => ({
    id: r.id,
    name: r.name,
    harmonizes_with: r.harmonizes_with,
    pairs_with_foods: r.pairs_with_foods,
    heat_behavior: r.heat_behavior,
    aroma_groups: r.aroma_groups,
  }));
  const corePath = join(root, 'aroma_data', 'ingredients_modal_core.json');
  writeFileSync(corePath, JSON.stringify(modalCore));
  console.log(
    'Wrote',
    corePath,
    `(${modalCore.length} rows, ${readFileSync(corePath).length} bytes)`
  );

  const uniPath = join(root, 'combined_data', 'ingredients_unified.json');
  const raw = JSON.parse(readFileSync(uniPath, 'utf8'));
  let ingredients;
  let kitchen_context = null;
  if (Array.isArray(raw)) {
    ingredients = raw;
  } else if (raw && typeof raw === 'object' && Array.isArray(raw.ingredients)) {
    ingredients = raw.ingredients;
    const kc = raw.kitchen_context;
    if (kc && kc.cuisine_map && typeof kc.cuisine_map === 'object') {
      kitchen_context = { cuisine_map: kc.cuisine_map };
    }
  } else {
    throw new Error('ingredients_unified.json: expected array or { ingredients }');
  }

  const slimIngredients = ingredients.map((r) => {
    const f = r.flavor && typeof r.flavor === 'object' ? r.flavor : {};
    return {
      id: r.id,
      name: r.name,
      flavor: {
        taste: f.taste,
        avoid: f.avoid,
        substitutes: f.substitutes,
      },
    };
  });

  const slimUnified = kitchen_context
    ? { ingredients: slimIngredients, kitchen_context }
    : { ingredients: slimIngredients };

  const outUni = join(root, 'combined_data', 'ingredients_unified_modal.json');
  writeFileSync(outUni, JSON.stringify(slimUnified));
  console.log(
    'Wrote',
    outUni,
    `(${slimIngredients.length} rows, ${readFileSync(outUni).length} bytes)`
  );
}

main();
