<template>
  <div class="calendar-grid">
    <div class="calendar-grid-headers">
      <div class="headers-spacer" />
      <div
        v-for="day in visibleDays"
        :key="day.key"
        class="day-header-cell"
        :class="{ 'day-header-cell--today': isDayToday(day.key) }"
        :style="{ color }"
      >
        <span class="day-header-label">{{ day.label }}</span>
        <span class="day-header-num">{{ day.date.getDate() }}</span>
      </div>
    </div>
    <AllDayRow
      :visible-days="visibleDays"
      :events="allDayEventsInWeek"
      :color="color"
      :mute-calendar-colors="muteCalendarColors"
      :new-event-ids="newEventIds"
      @select-event="$emit('select-event', $event)"
      @clear-new-event="(id: string) => $emit('clear-new-event', id)"
    />
    <div class="calendar-grid-opacity" :style="gridOpacityStyle">
      <TimeColumn
        :color="color"
        :padding-top-rem="0"
        :start-hour="timeStartHour"
        :end-hour="timeEndHour"
      />
      <DayColumn
        v-for="day in visibleDays"
        :key="day.key"
        :day="day"
        :show-header="false"
        :events="timedEventsForDay(day.key)"
        :color="color"
        :mute-calendar-colors="muteCalendarColors"
        :current-time-line-color="currentTimeLineColor"
        :time-start-hour="timeStartHour"
        :time-end-hour="timeEndHour"
        :new-event-ids="newEventIds"
        @select-event="$emit('select-event', $event)"
        @clear-new-event="$emit('clear-new-event', $event)"
      />
    </div>
    <EventOverlay
      v-if="selectedEvent"
      :event="selectedEvent"
      :color="resolveEventColor(selectedEvent.calendarColor ?? color)"
      @close="$emit('close-overlay')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TimeColumn from './TimeColumn.vue'
import DayColumn from './DayColumn.vue'
import EventOverlay from './EventOverlay.vue'
import type { CalendarEvent } from '../../../shared/types'
import { getWeekDays, isAllDayEvent } from '../../../utils/time'
import { muteCalendarColor } from '../../../utils/color'
import AllDayRow from './AllDayRow.vue'

const props = defineProps<{
  events: CalendarEvent[]
  settings: Record<string, unknown>
  selectedEvent: CalendarEvent | null
  newEventIds?: Set<string>
}>()

defineEmits<{
  'select-event': [event: CalendarEvent]
  'close-overlay': []
  'clear-new-event': [eventId: string]
}>()

const showWeekends = computed(() => Boolean(props.settings?.showWeekends))
const color = computed(() => (props.settings?.uiColor as string) ?? '#e0e0e0')
const muteCalendarColors = computed(() => Boolean(props.settings?.muteCalendarColors))
const currentTimeLineColor = computed(() => (props.settings?.currentTimeLineColor as string) ?? '#fa8a52')

function resolveEventColor(hex: string | undefined): string {
  if (!hex) return color.value
  return muteCalendarColors.value ? muteCalendarColor(hex) : hex
}
const timeStartHour = computed(() => {
  const v = Number(props.settings?.widgetTimeStartHour)
  return Number.isFinite(v) ? Math.max(0, Math.min(23, v)) : 7
})
const timeEndHour = computed(() => {
  const v = Number(props.settings?.widgetTimeEndHour)
  return Number.isFinite(v) ? Math.max(1, Math.min(24, v)) : 20
})

const visibleDays = computed(() => {
  const days = getWeekDays(new Date())
  return showWeekends.value ? days : days.slice(0, 5)
})

const opacity = computed(() => {
  const v = Number(props.settings?.opacity)
  return Number.isFinite(v) ? v / 100 : 0.9
})
const gridOpacityStyle = computed(() => ({ opacity: opacity.value }))

/** Timed events only (all-day are shown in AllDayRow) */
function timedEventsForDay(dayKey: string): CalendarEvent[] {
  return props.events.filter((e) => {
    if (isAllDayEvent(e.start)) return false
    const start = e.start?.dateTime ?? e.start?.date
    if (!start) return false
    const d = new Date(start)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}` === dayKey
  })
}

/** All-day events that span at least one day in the visible week (start.date + end.date) */
const allDayEventsInWeek = computed(() => {
  return props.events.filter((e) => {
    const startDate = e.start?.date
    const endDate = e.end?.date
    if (!startDate || !endDate) return false
    if (e.start?.dateTime) return false
    const visibleKeys = visibleDays.value.map((d) => d.key)
    for (const key of visibleKeys) {
      if (key >= startDate && key < endDate) return true
    }
    return false
  })
})

function isDayToday(dayKey: string): boolean {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}` === dayKey
}
</script>

<style module>
.calendarGrid {
  display: flex;
  flex: 1;
  min-height: 0;
}
</style>

<style scoped>
.calendar-grid {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  position: relative;
}
.calendar-grid-headers {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  min-height: 2.25rem;
}
.headers-spacer {
  width: 3rem;
  flex-shrink: 0;
}
.day-header-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  text-align: center;
}
.day-header-label {
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
}
.day-header-num {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
}
.day-header-cell--today .day-header-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  box-sizing: border-box;
}
.calendar-grid-opacity {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
}
</style>
