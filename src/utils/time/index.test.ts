import { describe, it, expect } from 'vitest'
import {
  getWeekStart,
  getWeekEnd,
  getWeekDays,
  getWeekStartISO,
  getWeekEndISO,
  formatTime,
  minutesSinceMidnight,
  parseEventDate,
  isAllDayEvent,
} from './index'

describe('getWeekStart', () => {
  it('returns Monday 00:00 for a date in the week', () => {
    const d = new Date(2025, 1, 12) // Wed Feb 12, 2025
    const start = getWeekStart(d)
    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(10)
    expect(start.getMonth()).toBe(1)
    expect(start.getFullYear()).toBe(2025)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
  })
  it('returns same day for Monday', () => {
    const d = new Date(2025, 1, 10)
    const start = getWeekStart(d)
    expect(start.getDate()).toBe(10)
  })
})

describe('getWeekEnd', () => {
  it('returns Sunday 23:59:59.999', () => {
    const d = new Date(2025, 1, 12)
    const end = getWeekEnd(d)
    expect(end.getDay()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
  })
})

describe('getWeekDays', () => {
  it('returns 7 days with correct keys', () => {
    const d = new Date(2025, 1, 12)
    const days = getWeekDays(d)
    expect(days).toHaveLength(7)
    expect(days[0].label).toBe('Mon')
    expect(days[0].key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getWeekStartISO / getWeekEndISO', () => {
  it('return valid ISO strings', () => {
    const d = new Date(2025, 1, 12)
    expect(getWeekStartISO(d)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(getWeekEndISO(d)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('formatTime', () => {
  it('formats ISO dateTime', () => {
    const s = '2025-02-12T14:30:00.000Z'
    expect(formatTime(s)).toBeTruthy()
    expect(formatTime(s).length).toBeGreaterThan(0)
  })
  it('returns empty for invalid', () => {
    expect(formatTime('invalid')).toBe('')
  })
})

describe('minutesSinceMidnight', () => {
  it('returns 0 for midnight', () => {
    const d = new Date(2025, 0, 1, 0, 0, 0)
    expect(minutesSinceMidnight(d)).toBe(0)
  })
  it('returns 90 for 01:30', () => {
    const d = new Date(2025, 0, 1, 1, 30, 0)
    expect(minutesSinceMidnight(d)).toBe(90)
  })
})

describe('parseEventDate', () => {
  it('parses dateTime', () => {
    const d = parseEventDate({ dateTime: '2025-02-12T10:00:00Z' })
    expect(d).toBeInstanceOf(Date)
    expect(d?.getFullYear()).toBe(2025)
  })
  it('parses date', () => {
    const d = parseEventDate({ date: '2025-02-12' })
    expect(d).toBeInstanceOf(Date)
  })
  it('returns null for empty', () => {
    expect(parseEventDate({})).toBeNull()
  })
})

describe('isAllDayEvent', () => {
  it('returns true for date-only start', () => {
    expect(isAllDayEvent({ date: '2025-02-12' })).toBe(true)
  })
  it('returns false for dateTime', () => {
    expect(isAllDayEvent({ dateTime: '2025-02-12T10:00:00Z' })).toBe(false)
  })
})
