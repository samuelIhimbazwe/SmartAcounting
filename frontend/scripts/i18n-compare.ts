/**
 * Flatten i18n resources and compare EN / FR / RW key sets.
 * Invoked by scripts/i18n-drift-check.mjs via tsx.
 */
import { resources } from '../src/shared/i18n/resources.ts'

type StringTree = Record<string, string | StringTree>

function flatten(obj: StringTree, prefix = ''): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') {
      keys.push(...flatten(v as StringTree, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

const enKeys = new Set(flatten(resources.en.translation as StringTree))
const frKeys = new Set(flatten(resources.fr.translation as StringTree))
const rwKeys = new Set(flatten(resources.rw.translation as StringTree))

const missingInFr = [...enKeys].filter((k) => !frKeys.has(k)).sort()
const missingInEn = [...frKeys].filter((k) => !enKeys.has(k)).sort()
const missingInRw = [...enKeys].filter((k) => !rwKeys.has(k)).sort()
const extraInRw = [...rwKeys].filter((k) => !enKeys.has(k)).sort()

console.log('EN keys:', enKeys.size)
console.log('FR keys:', frKeys.size)
console.log('RW keys:', rwKeys.size)
console.log('Missing in FR:', missingInFr.length)
console.log('Missing in EN:', missingInEn.length)
console.log('Missing in RW:', missingInRw.length)
console.log('Extra in RW:', extraInRw.length)

let failed = false

if (missingInFr.length > 0) {
  failed = true
  console.error('\nKeys in EN but missing in FR:')
  missingInFr.slice(0, 50).forEach((k) => console.error('  -', k))
}
if (missingInEn.length > 0) {
  failed = true
  console.error('\nKeys in FR but missing in EN:')
  missingInEn.slice(0, 50).forEach((k) => console.error('  -', k))
}
if (missingInRw.length > 0) {
  failed = true
  console.error('\nKeys in EN but missing in RW:')
  missingInRw.slice(0, 50).forEach((k) => console.error('  -', k))
}
if (extraInRw.length > 0) {
  failed = true
  console.error('\nKeys in RW but missing in EN:')
  extraInRw.slice(0, 50).forEach((k) => console.error('  -', k))
}

if (failed) {
  process.exit(1)
}

console.log('i18n OK — EN, FR, and RW keys are in sync.')
