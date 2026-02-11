/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    electronAPI?: {
      getSettings: () => Promise<Record<string, unknown>>
      setSettings: (partial: Record<string, unknown>) => Promise<void>
      getWidgetBounds?: () => Promise<Record<string, number>>
      authIsAuthenticated?: () => Promise<boolean>
      authGetCurrentProfiles?: () => Promise<Array<{ email: string; picture: string | null }>>
      authSignIn?: () => Promise<{ success: boolean; error?: string }>
      authSignOut?: (email?: string) => Promise<void>
      openExternalUrl?: (url: string) => Promise<void>
      calendarRefresh?: () => Promise<{ success: boolean; error?: string }>
      requestCalendarEvents?: () => Promise<void>
      onCalendarList?: (cb: (calendars: unknown[]) => void) => void
      onAuthCurrentProfiles?: (cb: (profiles: Array<{ email: string; picture: string | null }>) => void) => void
      onCalendarEvents?: (cb: (events: unknown[]) => void) => void
      onNewEventNotification?: (cb: (eventIds: string[]) => void) => void
      openExternalUrl?: (url: string) => Promise<void>
      onSettingsUpdated?: (cb: (settings: Record<string, unknown>) => void) => void
      removeAllListeners?: (channel: string) => void
    }
  }
}
