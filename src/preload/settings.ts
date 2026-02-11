import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (partial: Record<string, unknown>) =>
    ipcRenderer.invoke('set-settings', partial),
  calendarRefresh: () =>
    ipcRenderer.invoke('calendar:refresh') as Promise<{ success: boolean; error?: string }>,
  authIsAuthenticated: () => ipcRenderer.invoke('auth:is-authenticated'),
  authGetCurrentProfiles: () =>
    ipcRenderer.invoke('auth:get-current-profiles') as Promise<Array<{ email: string; picture: string | null }>>,
  authSignIn: () => ipcRenderer.invoke('auth:sign-in'),
  authSignOut: (email?: string) => ipcRenderer.invoke('auth:sign-out', email),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  onCalendarList: (cb: (calendars: unknown[]) => void) => {
    ipcRenderer.on('calendar:list', (_e, calendars) => cb(calendars))
  },
  onAuthCurrentProfiles: (cb: (profiles: Array<{ email: string; picture: string | null }>) => void) => {
    ipcRenderer.on('auth:current-profiles', (_e, profiles: Array<{ email: string; picture: string | null }>) => cb(profiles))
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
})
