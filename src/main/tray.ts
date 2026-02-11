import { app, Menu, Tray, nativeImage } from 'electron'
import { join } from 'node:path'
import {
  createSettingsWindow,
  createWidgetWindow,
  getWidgetWindow,
} from './windowManager'
import type { CalendarService } from './calendarService'

let tray: Tray | null = null

function getTrayIconPath(): string {
  const isDev = !app.isPackaged && process.env.ELECTRON_RENDERER_URL != null
  const base = isDev ? join(process.cwd(), 'resources') : process.resourcesPath
  return join(base, 'tray-icon.png')
}

export function createTray(calendarService: CalendarService | null): void {
  const iconPath = getTrayIconPath()
  const icon = nativeImage.createFromPath(iconPath)
  const image = icon.isEmpty() ? nativeImage.createEmpty() : icon
  tray = new Tray(image.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open settings',
      click: () => {
        createSettingsWindow()
      },
    },
    {
      label: 'Reload calendar data',
      click: () => {
        calendarService?.refresh()
      },
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
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip('Google Calendar Widget')
  tray.setContextMenu(contextMenu)

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
