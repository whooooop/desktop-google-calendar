import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (partial: Record<string, unknown>) =>
    ipcRenderer.invoke('set-settings', partial),
  getWidgetBounds: () => ipcRenderer.invoke('get-widget-bounds'),
  requestCalendarEvents: () => ipcRenderer.invoke('request-calendar-events'),
  onCalendarEvents: (cb: (events: unknown[]) => void) => {
    ipcRenderer.on('calendar:events', (_e, events) => cb(events))
  },
  onNewEventNotification: (cb: (eventIds: string[]) => void) => {
    ipcRenderer.on('calendar:new-event-notification', (_e, eventIds: string[]) => cb(eventIds ?? []))
  },
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  onSettingsUpdated: (cb: (settings: Record<string, unknown>) => void) => {
    ipcRenderer.on('settings-updated', (_e, settings: Record<string, unknown>) => cb(settings))
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
})
