#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

globalThis.window = globalThis;
globalThis.document = {
  readyState: 'loading',
  addEventListener() {},
  querySelectorAll() {
    return [];
  },
};

for (const file of [
  '../assets/recipe-metric-normalize.js',
  '../assets/riviera-canonical-ingredient.js',
  '../assets/planner-scale.js',
  '../assets/package-prep-sheet.js',
]) {
  require(file);
}

const builtins = JSON.parse(fs.readFileSync(new URL('../riviera_data/builtins.json', import.meta.url), 'utf8'));
const packages = JSON.parse(
  fs.readFileSync(new URL('../riviera_data/function_packages.json', import.meta.url), 'utf8')
);
const recipesById = new Map(builtins.filter((recipe) => recipe && recipe.id).map((recipe) => [recipe.id, recipe]));
const planner = globalThis.KuschiPackagePrepSheet;
const canonical = globalThis.KuschiRivieraCanonical;

function buildWorstCasePayload(pkg, section) {
  const courses = [];
  const recipeIds = [];
  for (const course of section.courses || []) {
    const items = [];
    for (const item of course.items || []) {
      const recipe = recipesById.get(item.recipeId);
      if (!recipe) continue;
      items.push({
        name: item.name,
        recipeId: recipe.id,
        tags: item.tags || [],
        recipe,
      });
      if (!recipeIds.includes(recipe.id)) recipeIds.push(recipe.id);
    }
    if (items.length) {
      courses.push({
        course: course.course,
        selection: course.selection || { mode: 'optional' },
        items,
      });
    }
  }
  return {
    eventId: pkg.id,
    eventLabel: pkg.label,
    eventIcon: pkg.icon,
    sectionId: section.id,
    sectionLabel: section.label,
    style: section.style || '',
    price: section.price || '',
    pax: 100,
    eventDate: '',
    courses,
    recipeIds,
  };
}

function flattenMerged(merged) {
  return Object.values(merged || {}).flat();
}

const failures = [];
for (const pkg of packages.packages || []) {
  for (const section of pkg.sections || []) {
    const payload = buildWorstCasePayload(pkg, section);
    if (!payload.courses.length) continue;

    const cleaned = planner.uniqueRecipePayloadForLists(payload);
    const cleanedIds = cleaned.courses.flatMap((course) => course.items.map((item) => item.recipeId));
    const duplicateRecipeIds = [...cleanedIds.reduce((map, id) => map.set(id, (map.get(id) || 0) + 1), new Map())]
      .filter(([, count]) => count > 1)
      .map(([id, count]) => `${id} x${count}`);
    if (duplicateRecipeIds.length) {
      failures.push(`${pkg.id}/${section.id}: duplicate recipes after payload dedupe: ${duplicateRecipeIds.join(', ')}`);
    }

    const rows = flattenMerged(planner.mergeIngredients(payload));
    const itemCounts = rows.reduce((map, row) => {
      const key = canonical.canonicalOrderMergeKey(row.item);
      return map.set(key, (map.get(key) || 0) + 1);
    }, new Map());
    const duplicateItems = [...itemCounts]
      .filter(([, count]) => count > 1)
      .map(([item, count]) => `${item} x${count}`);
    if (duplicateItems.length) {
      failures.push(`${pkg.id}/${section.id}: duplicate shopping rows: ${duplicateItems.slice(0, 12).join(', ')}`);
    }

    if (pkg.id === 'weddings' && section.id === 'portofino') {
      const manifest = planner.buildManifest(payload);
      const seafoodMentions = (manifest.match(/3-Tier Seafood Fountain/g) || []).length;
      if (seafoodMentions !== 3) {
        failures.push(`weddings/portofino: menu choices were collapsed (${seafoodMentions}/3 seafood choices visible)`);
      }
      const arborio = rows.find((row) => canonical.canonicalOrderMergeKey(row.item) === 'arborio rice');
      if (!arborio || /^—(?:\s|$)/.test(String(arborio.qty || ''))) {
        failures.push('weddings/portofino: Arborio Rice did not keep its merged quantity display');
      }
    }
  }
}

if (failures.length) {
  console.error(`FAIL  planner duplicate guard found ${failures.length} issue(s)`);
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log('PASS  planner duplicate guard: generated package lists have one row per recipe and ingredient');
