#!/usr/bin/env node
/**
 * Build slim flavour_hints_by_id.json for modals + pairing-atlas (no full ~1.6MB DB).
 * Keys: collapsed snake_case only (hyphens normalised). Client uses flavour-toolkit-lookup.js.
 *
 * Run from repo root: node scripts/build_flavour_hints_modal.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'flavour_data', 'flavour_knowledge_db_v1.1.json');
const out = path.join(root, 'flavour_data', 'flavour_hints_by_id.json');

const db = JSON.parse(fs.readFileSync(src, 'utf8'));
const ingredients = db.ingredients && typeof db.ingredients === 'object' ? db.ingredients : {};

function hasMatrixFields(ing) {
  if (!ing || typeof ing !== 'object') return false;
  if (ing.harmony && ing.harmony.length) return true;
  if (ing.contrast && ing.contrast.length) return true;
  if (ing.spice_harmony_partners && ing.spice_harmony_partners.length) return true;
  if (ing.primary_family) return true;
  if (ing.aroma_groups && typeof ing.aroma_groups === 'object') {
    return Object.keys(ing.aroma_groups).some(function (k) {
      return ing.aroma_groups[k];
    });
  }
  return false;
}

const hints = Object.create(null);

for (const key of Object.keys(ingredients)) {
  const ing = ingredients[key];
  if (!hasMatrixFields(ing)) continue;

  const slim = {};
  if (ing.harmony && ing.harmony.length) slim.harmony = ing.harmony;
  if (ing.contrast && ing.contrast.length) slim.contrast = ing.contrast;
  if (ing.spice_harmony_partners && ing.spice_harmony_partners.length) {
    slim.spice_harmony_partners = ing.spice_harmony_partners;
  }
  if (ing.primary_family) slim.primary_family = ing.primary_family;
  if (ing.aroma_groups && typeof ing.aroma_groups === 'object') {
    const ag = Object.create(null);
    for (const k of Object.keys(ing.aroma_groups)) {
      if (ing.aroma_groups[k]) ag[k] = true;
    }
    if (Object.keys(ag).length) slim.aroma_groups = ag;
  }

  const collapsed = key.replace(/_+/g, '_');
  hints[collapsed] = slim;
}

fs.writeFileSync(out, JSON.stringify(hints));
const bytes = fs.statSync(out).size;
console.log('Wrote', out, '(' + bytes + ' bytes,', Object.keys(hints).length, 'ingredients)');
