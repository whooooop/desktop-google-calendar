/**
 * Ensures electron-builder's winCodeSign cache is populated from the GitHub ZIP
 * so the Windows build does not fail on "Cannot create symbolic link" when
 * extracting the 7z (which contains Darwin symlinks). Run only on Windows.
 */
import { mkdirSync, cpSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWriteStream } from 'node:fs'
import { get as httpsGet } from 'node:https'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const CACHE_DIR = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign', 'winCodeSign-2.6.0')
  : null
const ZIP_URL = 'https://github.com/electron-userland/electron-builder-binaries/archive/refs/tags/winCodeSign-2.6.0.zip'

async function hasCacheContent() {
  if (!CACHE_DIR || !existsSync(CACHE_DIR)) return false
  try {
    const { readdirSync } = await import('node:fs')
    const entries = readdirSync(CACHE_DIR, { withFileTypes: true })
    return entries.length > 0 && entries.some((e) => e.isDirectory() || (e.isFile() && (e.name.endsWith('.exe') || e.name.endsWith('.dll'))))
  } catch {
    return false
  }
}

function download(url) {
  return new Promise((resolve, reject) => {
    const workDir = join(tmpdir(), 'electron-builder-winCodeSign-' + Date.now())
    mkdirSync(workDir, { recursive: true })
    const zipPath = join(workDir, 'winCodeSign-2.6.0.zip')
    const file = createWriteStream(zipPath)
    const cleanup = () => {
      try { file.destroy(); rmSync(workDir, { recursive: true, force: true }) } catch {}
    }
    file.on('error', (err) => { cleanup(); reject(err) })
    file.on('finish', () => { file.close(() => resolve({ zipPath, workDir })) })
    httpsGet(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.destroy()
        rmSync(zipPath, { force: true })
        return download(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.destroy()
        cleanup()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      res.pipe(file)
    }).on('error', (err) => { cleanup(); reject(err) })
  })
}

async function main() {
  if (process.platform !== 'win32') return
  if (!CACHE_DIR) {
    console.warn('ensure-winCodeSign-cache: LOCALAPPDATA not set, skipping')
    return
  }
  if (await hasCacheContent()) {
    return
  }
  console.log('Preparing winCodeSign cache (ZIP) to avoid 7z symlink errors...')
  const { zipPath, workDir } = await download(ZIP_URL)
  const extractDir = join(workDir, 'extract')
  mkdirSync(extractDir, { recursive: true })
  const zipArg = zipPath.replace(/'/g, "''")
  const destArg = extractDir.replace(/'/g, "''")
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zipArg}' -DestinationPath '${destArg}' -Force"`,
    { stdio: 'inherit', shell: true }
  )
  const srcDir = join(extractDir, 'electron-builder-binaries-winCodeSign-2.6.0', 'winCodeSign')
  if (!existsSync(srcDir)) {
    console.error('ensure-winCodeSign-cache: expected path not found after extract:', srcDir)
    rmSync(workDir, { recursive: true, force: true })
    process.exit(1)
  }
  mkdirSync(CACHE_DIR, { recursive: true })
  cpSync(srcDir, CACHE_DIR, { recursive: true })
  rmSync(workDir, { recursive: true, force: true })
  console.log('winCodeSign cache ready at', CACHE_DIR)
}

main().catch((err) => {
  console.error('ensure-winCodeSign-cache:', err.message)
  process.exit(1)
})
