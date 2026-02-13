import { app as electronApp, ipcMain, shell } from 'electron'
import { createTray } from './tray'
import {
  createWidgetWindow,
  createSettingsWindow,
  getWidgetWindow,
  getSettingsWindow,
  applyWidgetAlwaysOnTop,
} from './windowManager'
import { getSettings, setSettings, getWidgetBounds } from './settingsStore'
import type { AppSettings, WidgetBounds } from './settingsStore'
import { createCalendarService } from './calendarService'
import type { CalendarService, CalendarEvent } from './calendarService'
import { isAuthenticated, signIn as authSignIn, signOut as authSignOut, getCurrentUserProfiles } from './auth'

let calendarService: CalendarService | null = null
let lastCalendarEvents: CalendarEvent[] = []

function sendEventsToWidget(events: CalendarEvent[]): void {
  lastCalendarEvents = events
  const win = getWidgetWindow()
  if (win && !win.isDestroyed() && win.webContents) {
    win.webContents.send('calendar:events', events)
  }
}

function initCalendarService(): void {
  calendarService = createCalendarService(
    (events) => sendEventsToWidget(events),
    (calendars) => {
      const win = getSettingsWindow()
      if (win && !win.isDestroyed() && win.webContents) {
        win.webContents.send('calendar:list', calendars)
      }
    },
    (eventIds: string[]) => {
      const win = getWidgetWindow()
      if (win && !win.isDestroyed() && win.webContents) {
        win.webContents.send('calendar:new-event-notification', eventIds)
      }
    }
  )
  calendarService.refresh()
  calendarService.startScheduler()
}

const app = electronApp

app.whenReady().then(() => {
  const { autoLaunch } = getSettings()
  app.setLoginItemSettings({ openAtLogin: autoLaunch })
  createWidgetWindow()
  initCalendarService()
  createTray(calendarService)
})

app.on('window-all-closed', () => {
  calendarService?.stopScheduler()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  calendarService?.stopScheduler()
})

// IPC handlers
ipcMain.handle('get-settings', (): AppSettings => getSettings())
ipcMain.handle('set-settings', async (_e, partial: Partial<AppSettings>) => {
  setSettings(partial)
  const full = getSettings()
  applyWidgetAlwaysOnTop(full.alwaysOnTop ?? false)
  if (typeof partial.autoLaunch === 'boolean') {
    app.setLoginItemSettings({ openAtLogin: partial.autoLaunch })
  }
  if (partial.selectedCalendarIds !== undefined && calendarService) {
    await calendarService.refresh()
  }
  if (partial.refreshIntervalSeconds !== undefined && calendarService) {
    calendarService.startScheduler()
  }
  const widgetWin = getWidgetWindow()
  if (widgetWin && !widgetWin.isDestroyed() && widgetWin.webContents) {
    widgetWin.webContents.send('settings-updated', full)
  }
})
ipcMain.handle('get-widget-bounds', (): WidgetBounds => getWidgetBounds())
ipcMain.handle('request-calendar-events', () => {
  sendEventsToWidget(lastCalendarEvents)
})
ipcMain.handle('open-settings', () => {
  createSettingsWindow()
})
ipcMain.handle('calendar:refresh', async () => {
  const result = await calendarService?.refresh()
  return result ?? { success: false, error: 'Calendar service not ready' }
})
ipcMain.handle('auth:is-authenticated', (): boolean => isAuthenticated())
ipcMain.handle('auth:get-current-profiles', () => getCurrentUserProfiles())
ipcMain.handle('auth:sign-in', async () => authSignIn())
ipcMain.handle('auth:sign-out', (_e, email?: string) => {
  authSignOut(email)
})
ipcMain.handle('open-external-url', (_e, url: string) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url)
  }
})
