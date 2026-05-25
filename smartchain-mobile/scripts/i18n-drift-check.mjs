#!/usr/bin/env node
/**
 * Fail CI when FR/RW translation keys drift too far from EN.
 * Usage: node scripts/i18n-drift-check.mjs
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.join(__dirname, '..', 'src', 'i18n');

function flatten(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, key));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

const en = JSON.parse(fs.readFileSync(path.join(i18nDir, 'en.json'), 'utf8'));
const fr = JSON.parse(fs.readFileSync(path.join(i18nDir, 'fr.json'), 'utf8'));
const rw = JSON.parse(fs.readFileSync(path.join(i18nDir, 'rw.json'), 'utf8'));

const enKeys = new Set(flatten(en));
const frKeys = new Set(flatten(fr));
const rwKeys = new Set(flatten(rw));

const frMissing = [...enKeys].filter(k => !frKeys.has(k));
const rwMissing = [...enKeys].filter(k => !rwKeys.has(k));

console.log('EN keys:', enKeys.size);
console.log('FR missing:', frMissing.length, frMissing.slice(0, 20));
console.log('RW missing:', rwMissing.length, rwMissing.slice(0, 20));

const FR_MAX = 5;
const RW_MAX = 10;
if (frMissing.length > FR_MAX || rwMissing.length > RW_MAX) {
  console.error(
    `i18n drift too large (FR max ${FR_MAX}, RW max ${RW_MAX}). Add translations before merging.`,
  );
  process.exit(1);
}
