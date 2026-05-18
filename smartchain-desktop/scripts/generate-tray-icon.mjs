/**
 * Generates the desktop app's tray + dock icons from the frontend's favicon.
 *
 * Run once after `npm install` and committed icons are stale:
 *   node scripts/generate-tray-icon.mjs
 */

import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const sourceSvg = resolve(projectRoot, '..', 'frontend', 'public', 'favicon.svg')
const outputDir = resolve(projectRoot, 'assets')

mkdirSync(outputDir, { recursive: true })

const targets = [
  { name: 'tray-icon.png', size: 32 },
  { name: 'icon.png', size: 512 },
]

for (const { name, size } of targets) {
  const outPath = resolve(outputDir, name)
  await sharp(sourceSvg, { density: 384 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 15, g: 23, b: 42, alpha: 1 },
    })
    .png()
    .toFile(outPath)
  // eslint-disable-next-line no-console
  console.log(`generated ${name} (${size}x${size}) -> ${outPath}`)
}
