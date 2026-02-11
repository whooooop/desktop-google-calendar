import { getSettings } from './settingsStore'
import { getValidAccessTokens } from './auth'
import { getWeekStartISO, getWeekEndISO } from '../utils/time'

export interface CalendarEvent {
  id: string
  calendarId: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  htmlLink?: string
  colorId?: string
  status?: string
  calendarColor?: string
  myResponseStatus?: string
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>
  hangoutLink?: string
}

export interface CalendarListEntry {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
}

let refreshTimer: ReturnType<typeof setInterval> | null = null

export type CalendarService = {
  refresh: () => Promise<{ success: boolean; error?: string }>
  startScheduler: () => void
  stopScheduler: () => void
}

interface GoogleEventItem {
  id?: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  htmlLink?: string
  colorId?: string
  status?: string
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>
  hangoutLink?: string
  recurringEventId?: string
}

interface GoogleCalendarListEntry {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
}

function mapEvent(
  item: GoogleEventItem,
  calendarId: string,
  calendarColor?: string,
  calendarSummary?: string,
  currentUserEmail?: string | null
): CalendarEvent {
  const attendees = item.attendees?.map((a) => ({
    email: a.email ?? '',
    displayName: a.displayName,
    responseStatus: a.responseStatus,
  }))
  const myResponseStatus =
    currentUserEmail && attendees
      ? attendees.find((a) => a.email.toLowerCase() === currentUserEmail.toLowerCase())
          ?.responseStatus
      : undefined
  return {
    id: item.id ?? '',
    calendarId,
    calendarSummary,
    summary: item.summary ?? '',
    description: item.description,
    start: item.start ?? {},
    end: item.end ?? {},
    htmlLink: item.htmlLink,
    colorId: item.colorId,
    status: item.status,
    calendarColor,
    myResponseStatus,
    attendees,
    hangoutLink: item.hangoutLink,
  }
}

function eventSignature(e: CalendarEvent): string {
  const start = e.start?.date ?? e.start?.dateTime ?? ''
  const end = e.end?.date ?? e.end?.dateTime ?? ''
  return `${e.id}|${e.summary}|${start}|${end}|${e.status ?? ''}`
}

export function createCalendarService(
  onEvents: (events: CalendarEvent[]) => void,
  onCalendars: (calendars: CalendarListEntry[]) => void,
  onNewEventNotification?: (eventIds: string[]) => void
): CalendarService {
  let lastEventIds = new Set<string>()
  const lastEventSignatures = new Map<string, string>()
  let lastSuccessfulEvents: CalendarEvent[] = []

  function formatCalendarApiError(status: number, body?: { error?: { message?: string } }): string {
    if (status === 403) {
      return (
        'Access denied (403). Enable "Google Calendar API" in Google Cloud Console: ' +
        'APIs & Services → Library → search "Google Calendar API" → Enable. ' +
        (body?.error?.message ? `Details: ${body.error.message}` : '')
      )
    }
    if (status === 401) {
      return 'Not authorized. Sign out and sign in again.'
    }
    const detail = body?.error?.message ?? ''
    return detail ? `Calendar API error ${status}: ${detail}` : `Calendar API error: ${status}`
  }

  async function fetchCalendarList(accessToken: string, skipNotify?: boolean): Promise<CalendarListEntry[]> {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      let body: { error?: { message?: string } } | undefined
      try {
        body = (await res.json()) as { error?: { message?: string } }
      } catch {
        /* ignore */
      }
      throw new Error(formatCalendarApiError(res.status, body))
    }
    const data = (await res.json()) as { items?: GoogleCalendarListEntry[] }
    const items = data.items ?? []
    const list: CalendarListEntry[] = items.map((c) => ({
      id: c.id,
      summary: c.summary ?? c.id,
      primary: c.primary,
      backgroundColor: c.backgroundColor,
    }))
    if (!skipNotify) onCalendars(list)
    return list
  }

  async function fetchEventsForCalendar(
    accessToken: string,
    calendarId: string,
    timeMin: string,
    timeMax: string,
    calendarColor?: string,
    calendarSummary?: string,
    currentUserEmail?: string | null
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
    })
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      let body: { error?: { message?: string } } | undefined
      try {
        body = (await res.json()) as { error?: { message?: string } }
      } catch {
        /* ignore */
      }
      throw new Error(formatCalendarApiError(res.status, body))
    }
    const data = (await res.json()) as { items?: GoogleEventItem[] }
    const items = data.items ?? []
    return items
      .filter((e) => e.id)
      .map((e) => mapEvent(e, calendarId, calendarColor, calendarSummary, currentUserEmail))
  }

  async function refresh(): Promise<{ success: boolean; error?: string }> {
    const accountTokens = await getValidAccessTokens()
    if (accountTokens.length === 0) {
      onEvents(lastSuccessfulEvents)
      onCalendars([])
      return { success: false, error: 'Not authenticated. Sign in again.' }
    }

    try {
      const defaultColors = [
        '#7986cb', '#33b679', '#8e24aa', '#e67c73', '#f6bf26',
        '#f4511e', '#039be5', '#616161', '#3f51b5', '#0b8043',
      ]
      const calendarColor = (cal: { id: string; backgroundColor?: string } | undefined, id: string) => {
        if (cal?.backgroundColor) return cal.backgroundColor
        let h = 0
        for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i) | 0
        return defaultColors[Math.abs(h) % defaultColors.length]
      }

      const allCalendars: CalendarListEntry[] = []
      const calendarIdToEmail = new Map<string, string>()
      const emailToToken = new Map<string, string>()

      for (const { email, accessToken } of accountTokens) {
        emailToToken.set(email, accessToken)
        try {
          const list = await fetchCalendarList(accessToken, true)
          for (const cal of list) {
            allCalendars.push(cal)
            calendarIdToEmail.set(cal.id, email)
          }
        } catch {
          // Skip failed account
        }
      }
      onCalendars(allCalendars)

      const raw = getSettings().selectedCalendarIds
      const selectedIds = Array.isArray(raw) ? raw : []
      const idsToFetch =
        selectedIds.length > 0
          ? selectedIds.filter((id) => typeof id === 'string' && allCalendars.some((c) => c.id === id))
          : allCalendars.map((c) => c.id)

      const now = new Date()
      const timeMin = getWeekStartISO(now)
      const timeMax = getWeekEndISO(now)

      const allEvents: CalendarEvent[] = []
      for (const calendarId of idsToFetch) {
        const accountEmail = calendarIdToEmail.get(calendarId)
        const accessToken = accountEmail ? emailToToken.get(accountEmail) : null
        if (!accessToken) continue
        const cal = allCalendars.find((c) => c.id === calendarId)
        try {
          const events = await fetchEventsForCalendar(
            accessToken,
            calendarId,
            timeMin,
            timeMax,
            calendarColor(cal, calendarId),
            cal?.summary,
            accountEmail
          )
          allEvents.push(...events)
        } catch {
          // Skip failed calendar
        }
      }

      const notifiedIds: string[] = []
      if (onNewEventNotification && lastEventIds.size > 0) {
        for (const e of allEvents) {
          const isNew = !lastEventIds.has(e.id)
          const prevSig = lastEventSignatures.get(e.id)
          const isChanged = prevSig !== undefined && prevSig !== eventSignature(e)
          if (isNew || isChanged) notifiedIds.push(e.id)
        }
      }
      if (notifiedIds.length > 0) onNewEventNotification?.(notifiedIds)

      lastEventIds = new Set(allEvents.map((e) => e.id))
      lastEventSignatures.clear()
      for (const e of allEvents) lastEventSignatures.set(e.id, eventSignature(e))
      lastSuccessfulEvents = allEvents
      onEvents(allEvents)
      return { success: true }
    } catch (err) {
      onEvents(lastSuccessfulEvents)
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  }

  function startScheduler(): void {
    stopScheduler()
    const intervalMs = Math.max(30, getSettings().refreshIntervalSeconds) * 1000
    refreshTimer = setInterval(() => {
      refresh().catch(() => {})
    }, intervalMs)
  }

  function stopScheduler(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  return { refresh, startScheduler, stopScheduler }
}
