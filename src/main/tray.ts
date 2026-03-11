import { app, Menu, Tray, nativeImage } from 'electron'
import { join } from 'node:path'
import {
  createSettingsWindow,
  createWidgetWindow,
  getWidgetWindow,
} from './windowManager'
import type { CalendarService } from './calendarService'

let tray: Tray | null = null
let _calendarService: CalendarService | null = null
let _reauthEmails: string[] = []

function getTrayIconPaths(): { ico: string; png: string } {
  const isDev = !app.isPackaged && process.env.ELECTRON_RENDERER_URL != null
  if (isDev) {
    const base = join(app.getAppPath(), 'resources')
    return { ico: join(base, 'icon.ico'), png: join(base, 'tray-icon.png') }
  }
  // Packaged: extraResources are copied into process.resourcesPath (no 'resources' subdir)
  const base = process.resourcesPath
  return { ico: join(base, 'icon.ico'), png: join(base, 'tray-icon.png') }
}

function loadTrayImage(): Electron.NativeImage {
  const paths = getTrayIconPaths()
  // Windows tray often works better with ICO; PNG can disappear on some themes/DPI
  const ico = nativeImage.createFromPath(paths.ico)
  const png = nativeImage.createFromPath(paths.png)
  const image = !ico.isEmpty() ? ico : png.isEmpty() ? nativeImage.createEmpty() : png
  return image.resize({ width: 16, height: 16 })
}

function buildContextMenu(): Electron.Menu {
  const reauthItems: Electron.MenuItemConstructorOptions[] = _reauthEmails.map((email) => ({
    label: `⚠ Re-authorize: ${email}`,
    click: () => createSettingsWindow(),
  }))

  return Menu.buildFromTemplate([
    ...reauthItems,
    ...(reauthItems.length > 0 ? [{ type: 'separator' as const }] : []),
    {
      label: 'Open settings',
      click: () => createSettingsWindow(),
    },
    {
      label: 'Reload calendar data',
      click: () => _calendarService?.refresh(),
    },
    {
      label: 'Restart widget',
      click: () => {
        const win = getWidgetWindow()
        if (win && !win.isDestroyed()) {
          win.reload()
        } else {
          createWidgetWindow()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ])
}

export function updateTrayReauthStatus(reauthEmails: string[]): void {
  _reauthEmails = reauthEmails
  if (tray && !tray.isDestroyed()) {
    tray.setContextMenu(buildContextMenu())
    tray.setToolTip(
      reauthEmails.length > 0
        ? `Google Calendar Widget — ${reauthEmails.length} account(s) need re-authorization`
        : 'Google Calendar Widget'
    )
  }
}

export function createTray(calendarService: CalendarService | null): void {
  _calendarService = calendarService
  const image = loadTrayImage()
  tray = new Tray(image)

  tray.setToolTip('Google Calendar Widget')
  tray.setContextMenu(buildContextMenu())

  tray.on('click', () => {
    createSettingsWindow()
  })
}

export function destroyTray(): void {
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
    tray = null
  }
}
