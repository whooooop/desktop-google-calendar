/**
 * Returns start of week (Monday) for the given date in local timezone.
 */
export function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Returns end of week (Sunday 23:59:59.999) for the given date.
 */
export function getWeekEnd(d: Date): Date {
  const start = getWeekStart(d)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export interface WeekDay {
  key: string
  label: string
  date: Date
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Returns array of 7 week days (Mon–Sun) for the week containing the given date.
 * Each item has key (YYYY-MM-DD), label (short name), and date.
 */
export function getWeekDays(d: Date): WeekDay[] {
  const start = getWeekStart(d)
  const days: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    days.push({
      key: `${y}-${m}-${day}`,
      label: DAY_LABELS[i],
      date,
    })
  }
  return days
}

/**
 * Format time as HH:MM from date or dateTime string.
 */
export function formatTime(dateTimeOrDate: string): string {
  const d = new Date(dateTimeOrDate)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Returns minutes since midnight for the given date (local time).
 */
export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * Parse ISO date or dateTime string to Date.
 */
export function parseEventDate(start: { dateTime?: string; date?: string }): Date | null {
  const raw = start?.dateTime ?? start?.date
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Check if event is all-day (has date but no dateTime).
 */
export function isAllDayEvent(start: { dateTime?: string; date?: string }): boolean {
  return Boolean(start?.date && !start?.dateTime)
}

/**
 * Returns ISO 8601 string for the start of the week (for API timeMin).
 * Uses local timezone.
 */
export function getWeekStartISO(d: Date): string {
  const start = getWeekStart(d)
  return start.toISOString()
}

/**
 * Returns ISO 8601 string for the end of the week (for API timeMax).
 */
export function getWeekEndISO(d: Date): string {
  const end = getWeekEnd(d)
  return end.toISOString()
}
