import { app, BrowserWindow, screen, nativeImage } from 'electron'
import { join } from 'node:path'
import { getSettings, getWidgetBounds, setWidgetBounds } from './settingsStore'
import { getCurrentUserProfiles } from './auth'

const isDev = !app.isPackaged && process.env.ELECTRON_RENDERER_URL != null

function getAppIconPath(): string {
  const base = isDev ? join(process.cwd(), 'resources') : process.resourcesPath
  return join(base, 'tray-icon.png')
}

let widgetWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

function getPreloadPath(name: 'widget' | 'settings'): string {
  if (isDev) {
    return join(__dirname, '../preload', `${name}.js`)
  }
  return join(__dirname, `../preload/${name}.js`)
}

function getRendererUrl(name: 'widget' | 'settings'): string {
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    const base = process.env.ELECTRON_RENDERER_URL.replace(/\/$/, '')
    return `${base}/${name}/${name}.html`
  }
  return `file://${join(__dirname, '../renderer', name, `${name}.html`)}`
}

export function getWidgetWindow(): BrowserWindow | null {
  return widgetWindow
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}

export function createWidgetWindow(): BrowserWindow {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.focus()
    return widgetWindow
  }

  const bounds = getWidgetBounds()
  const settings = getSettings()

  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 400,
    minHeight: 300,
    maxWidth: screen.getPrimaryDisplay().bounds.width,
    maxHeight: screen.getPrimaryDisplay().bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: settings.alwaysOnTop,
    show: false,
    webPreferences: {
      preload: getPreloadPath('widget'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  win.setMenuBarVisibility(false)

  win.on('closed', () => {
    widgetWindow = null
  })

  win.on('resize', () => {
    const b = win.getBounds()
    setWidgetBounds({ x: b.x, y: b.y, width: b.width, height: b.height })
  })

  win.on('move', () => {
    const b = win.getBounds()
    setWidgetBounds({ x: b.x, y: b.y })
  })

  const widgetUrl = getRendererUrl('widget')
  win.loadURL(widgetUrl).catch((err) => {
    console.error('[widget] loadURL failed:', widgetUrl, err)
  })
  widgetWindow = win

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    if (code !== -3) console.error('[widget] did-fail-load:', code, desc, url)
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  return win
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }

  const iconPath = getAppIconPath()
  const icon = nativeImage.createFromPath(iconPath)
  const win = new BrowserWindow({
    width: 520,
    height: 640,
    minWidth: 400,
    minHeight: 500,
    show: false,
    icon: icon.isEmpty() ? undefined : iconPath,
    webPreferences: {
      preload: getPreloadPath('settings'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  win.on('closed', () => {
    settingsWindow = null
  })

  const settingsUrl = getRendererUrl('settings')
  win.loadURL(settingsUrl).catch((err) => {
    console.error('[settings] loadURL failed:', settingsUrl, err)
  })
  settingsWindow = win

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    if (code !== -3) console.error('[settings] did-fail-load:', code, desc, url)
  })

  win.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      const profiles = getCurrentUserProfiles()
      if (profiles.length > 0 && win && !win.isDestroyed()) {
        win.webContents.send('auth:current-profiles', profiles)
      }
    }, 400)
  })

  win.once('ready-to-show', () => {
    win.show()
    // if (isDev) win.webContents.openDevTools({ mode: 'detach' })
  })

  return win
}

export function closeWidgetWindow(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.close()
    widgetWindow = null
  }
}

export function closeSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close()
    settingsWindow = null
  }
}

export function applyWidgetAlwaysOnTop(alwaysOnTop: boolean): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.setAlwaysOnTop(alwaysOnTop)
  }
}
