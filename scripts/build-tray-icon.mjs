/**
 * Generates from src/assets/icon.svg:
 * - resources/tray-icon.png (32x32) for tray and window icon
 * - resources/icon.ico for the application (exe) icon
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const resourcesDir = join(root, 'resources')
const svgPath = join(root, 'src', 'assets', 'icon.svg')

mkdirSync(resourcesDir, { recursive: true })
const svg = readFileSync(svgPath)

await sharp(svg)
  .resize(32, 32)
  .png()
  .toFile(join(resourcesDir, 'tray-icon.png'))
console.log('Generated resources/tray-icon.png')

const icon256Path = join(resourcesDir, 'icon-256.png')
await sharp(svg).resize(256, 256).png().toFile(icon256Path)
const icoBuffer = await pngToIco(icon256Path)
writeFileSync(join(resourcesDir, 'icon.ico'), icoBuffer)
const { unlinkSync } = await import('node:fs')
unlinkSync(icon256Path)
console.log('Generated resources/icon.ico')
