import Store from 'electron-store'

export interface AppSettings {
  showWeekends?: boolean
  uiColor?: string
  opacity?: number
  alwaysOnTop?: boolean
  muteCalendarColors?: boolean
  currentTimeLineColor?: string
  refreshIntervalSeconds?: number
  widgetTimeStartHour?: number
  widgetTimeEndHour?: number
  autoLaunch?: boolean
  soundNotification?: boolean
  selectedCalendarIds?: string[]
  googleClientId?: string
  googleClientSecret?: string
}

export interface WidgetBounds {
  x: number
  y: number
  width: number
  height: number
}

const defaults: AppSettings = {
  showWeekends: false,
  uiColor: '#e0e0e0',
  opacity: 90,
  alwaysOnTop: false,
  muteCalendarColors: false,
  currentTimeLineColor: '#fa8a52',
  refreshIntervalSeconds: 60,
  widgetTimeStartHour: 7,
  widgetTimeEndHour: 20,
  autoLaunch: false,
  soundNotification: false,
  selectedCalendarIds: [],
}

const defaultBounds: WidgetBounds = {
  x: 100,
  y: 100,
  width: 400,
  height: 500,
}

const settingsStore = new Store<AppSettings>({ defaults })
const boundsStore = new Store<WidgetBounds>({
  name: 'widget-bounds',
  defaults: defaultBounds,
})

export function getSettings(): AppSettings {
  return { ...defaults, ...settingsStore.store } as AppSettings
}

export function setSettings(partial: Partial<AppSettings>): void {
  const toSet: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(partial)) {
    if (value !== undefined) toSet[key] = value
  }
  if (Object.keys(toSet).length > 0) settingsStore.set(toSet)
}

export function getWidgetBounds(): WidgetBounds {
  return { ...defaultBounds, ...boundsStore.store } as WidgetBounds
}

export function setWidgetBounds(partial: Partial<WidgetBounds>): void {
  const toSet: Partial<WidgetBounds> = {}
  if (typeof partial.x === 'number') toSet.x = partial.x
  if (typeof partial.y === 'number') toSet.y = partial.y
  if (typeof partial.width === 'number') toSet.width = partial.width
  if (typeof partial.height === 'number') toSet.height = partial.height
  if (Object.keys(toSet).length > 0) boundsStore.set(toSet as Record<string, unknown>)
}
