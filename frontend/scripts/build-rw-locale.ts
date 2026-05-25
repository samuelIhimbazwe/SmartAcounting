/**
 * Generate frontend/src/shared/i18n/locales/rw.json from web EN keys + mobile RW translations.
 * Run: npx tsx scripts/build-rw-locale.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resources } from '../src/shared/i18n/resources.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mobileRwPath = path.join(__dirname, '..', '..', 'smartchain-mobile', 'src', 'i18n', 'rw.json')
const mobileEnPath = path.join(__dirname, '..', '..', 'smartchain-mobile', 'src', 'i18n', 'en.json')
const outPath = path.join(__dirname, '..', 'src', 'shared', 'i18n', 'locales', 'rw.json')

/** Explicit web → mobile key aliases when paths differ but semantics match. */
const WEB_TO_MOBILE: Record<string, string> = {
  'auth.usernameLabel': 'auth.username',
  'auth.passwordLabel': 'auth.password',
  'auth.tenantLabel': 'auth.tenantId',
  'auth.signIn': 'auth.signIn',
  'nav.pos': 'pos.checkoutTitle',
  'nav.posHistory': 'pos.saleHistory',
  'nav.returns': 'pos.processReturn',
  'pos.emptyCart': 'pos.cartEmpty',
  'pos.pay': 'pos.completeSale',
  'pos.scanPlaceholder': 'pos.scanBarcode',
  'pos.scanWithCamera': 'pos.openScanner',
  'pos.tenderTotal': 'pos.tenderTotal',
  'pos.cash': 'pos.tenderCash',
  'pos.momo': 'pos.tenderMomo',
  'pos.airtel': 'pos.tenderAirtel',
  'pos.card': 'pos.tenderCard',
  'pos.onAccount': 'pos.tenderOnAccount',
  'userMenu.language': 'settings.language',
  'userMenu.settings': 'settings.title',
  'intl.localeLabel': 'settings.language',
}

type StringTree = Record<string, string | StringTree>

function flattenStrings(obj: StringTree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) {
      continue
    }
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') {
      Object.assign(out, flattenStrings(v as StringTree, key))
    } else if (typeof v === 'string') {
      out[key] = v
    }
  }
  return out
}

function pathMatchScore(webPath: string, mobilePath: string): number {
  const webParts = webPath.split('.')
  const mobileParts = mobilePath.split('.')
  let score = 0
  if (webParts[0] === mobileParts[0]) {
    score += 10
  }
  if (webParts.at(-1) === mobileParts.at(-1)) {
    score += 5
  }
  return score
}

function buildValueIndex(flat: Record<string, string>): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const [key, value] of Object.entries(flat)) {
    const list = index.get(value) ?? []
    list.push(key)
    index.set(value, list)
  }
  return index
}

function resolveMobilePath(
  webPath: string,
  enValue: string,
  mobileEnFlat: Record<string, string>,
  mobileEnByValue: Map<string, string[]>,
): string | undefined {
  const alias = WEB_TO_MOBILE[webPath]
  if (alias) {
    return alias
  }
  if (mobileEnFlat[webPath] === enValue) {
    return webPath
  }
  const candidates = mobileEnByValue.get(enValue) ?? []
  if (candidates.length === 0) {
    return undefined
  }
  return candidates
    .slice()
    .sort((a, b) => pathMatchScore(webPath, b) - pathMatchScore(webPath, a))[0]
}

function resolveRwValue(
  webPath: string,
  enValue: string,
  mobileRwFlat: Record<string, string>,
  mobileEnFlat: Record<string, string>,
  mobileEnByValue: Map<string, string[]>,
): string {
  const alias = WEB_TO_MOBILE[webPath] ?? webPath
  if (mobileRwFlat[alias] !== undefined) {
    return mobileRwFlat[alias]
  }
  if (mobileRwFlat[webPath] !== undefined) {
    return mobileRwFlat[webPath]
  }
  const mobilePath = resolveMobilePath(webPath, enValue, mobileEnFlat, mobileEnByValue)
  if (mobilePath && mobileRwFlat[mobilePath] !== undefined) {
    return mobileRwFlat[mobilePath]
  }
  return enValue
}

function deepMapRw(
  node: StringTree,
  prefix: string,
  mobileRwFlat: Record<string, string>,
  mobileEnFlat: Record<string, string>,
  mobileEnByValue: Map<string, string[]>,
): StringTree {
  const out: StringTree = {}
  for (const [k, v] of Object.entries(node)) {
    const webPath = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') {
      out[k] = deepMapRw(v as StringTree, webPath, mobileRwFlat, mobileEnFlat, mobileEnByValue)
    } else if (typeof v === 'string') {
      out[k] = resolveRwValue(webPath, v, mobileRwFlat, mobileEnFlat, mobileEnByValue)
    }
  }
  return out
}

const mobileRw = JSON.parse(fs.readFileSync(mobileRwPath, 'utf8')) as StringTree
const mobileEn = JSON.parse(fs.readFileSync(mobileEnPath, 'utf8')) as StringTree
const mobileRwFlat = flattenStrings(mobileRw)
const mobileEnFlat = flattenStrings(mobileEn)
const mobileEnByValue = buildValueIndex(mobileEnFlat)

const rwTranslation = deepMapRw(
  resources.en.translation as StringTree,
  '',
  mobileRwFlat,
  mobileEnFlat,
  mobileEnByValue,
)

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(rwTranslation, null, 2)}\n`, 'utf8')

const webEnFlat = flattenStrings(resources.en.translation as StringTree)
const rwFlat = flattenStrings(rwTranslation)
const missing = Object.keys(webEnFlat).filter((k) => !(k in rwFlat))
const fromMobile = Object.keys(webEnFlat).filter((k) => rwFlat[k] !== webEnFlat[k])

console.log('Wrote', outPath)
console.log('Web EN keys:', Object.keys(webEnFlat).length)
console.log('RW keys:', Object.keys(rwFlat).length)
console.log('Missing keys:', missing.length)
console.log('Translated (differs from EN):', fromMobile.length)

if (missing.length > 0) {
  console.error('Missing keys:', missing.slice(0, 20))
  process.exit(1)
}
