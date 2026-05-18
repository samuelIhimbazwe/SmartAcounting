import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const sourceSvg = resolve(projectRoot, 'public/favicon.svg')
const outputDir = resolve(projectRoot, 'public/icons')

mkdirSync(outputDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 512]

for (const size of sizes) {
  const outPath = resolve(outputDir, `icon-${size}x${size}.png`)
  await sharp(sourceSvg, { density: 384 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 15, g: 23, b: 42, alpha: 1 },
    })
    .png()
    .toFile(outPath)
  console.log(`generated ${size}x${size} -> ${outPath}`)
}

console.log('All PWA icons generated.')
