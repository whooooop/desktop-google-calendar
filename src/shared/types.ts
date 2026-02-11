export interface CalendarEvent {
  id: string
  calendarId: string
  /** Display name of the calendar (e.g. from calendar list) */
  calendarSummary?: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  htmlLink?: string
  colorId?: string
  /** Google: confirmed | tentative | cancelled */
  status?: string
  /** Calendar backgroundColor for event block styling */
  calendarColor?: string
  /** Current user's response: accepted | tentative | needsAction | declined (from attendees[].responseStatus) */
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
