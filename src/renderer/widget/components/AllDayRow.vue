<template>
  <div class="all-day-row" :style="allDayRowMinHeight ? { minHeight: allDayRowMinHeight } : undefined">
    <div class="all-day-spacer" />
    <div class="all-day-cells">
      <div
        v-for="day in visibleDays"
        :key="day.key"
        class="all-day-cell"
      />
      <div class="all-day-bars">
        <button
          v-for="bar in eventBars"
          :key="bar.event.id"
          type="button"
          class="all-day-bar"
          :class="{ 'all-day-bar--new': newEventIds?.has(bar.event.id) }"
          :style="bar.style"
          @click="$emit('select-event', bar.event)"
          @mouseenter="$emit('clear-new-event', bar.event.id)"
        >
          <span class="all-day-bar-title">{{ bar.event.summary || 'No title' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarEvent } from '../../../shared/types'
import type { WeekDay } from '../../../utils/time'
import { getContrastTextColor, muteCalendarColor } from '../../../utils/color'

const props = defineProps<{
  visibleDays: WeekDay[]
  events: CalendarEvent[]
  color?: string
  muteCalendarColors?: boolean
  newEventIds?: Set<string>
}>()

defineEmits<{
  'select-event': [event: CalendarEvent]
  'clear-new-event': [eventId: string]
}>()

function isEventConfirmed(event: CalendarEvent): boolean {
  if (event.status !== 'confirmed') return false
  const my = event.myResponseStatus
  if (my === undefined || my === '') return true
  return my === 'accepted'
}

/** Next calendar day in YYYY-MM-DD (for "extends past" check). */
function nextDayKey(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

const LINE_HEIGHT_REM = 1.35
const LINE_GAP_REM = 0.25

const eventBars = computed(() => {
  const days = props.visibleDays
  const n = days.length
  if (n === 0) return []
  let rowIndex = 0
  return props.events
    .map((event) => {
      const startDate = event.start?.date ?? ''
      const endDate = event.end?.date ?? ''
      if (!startDate || !endDate) return null
      let startIdx = -1
      let endIdx = -1
      for (let i = 0; i < n; i++) {
        const key = days[i].key
        if (key >= startDate && key < endDate) {
          if (startIdx === -1) startIdx = i
          endIdx = i
        }
      }
      if (startIdx === -1 || endIdx === -1) return null
      const firstDayKey = days[0].key
      const lastDayKey = days[n - 1].key
      const extendsLeft = startDate < firstDayKey
      const extendsRight = endDate > nextDayKey(lastDayKey)

      const left = (startIdx / n) * 100
      const width = ((endIdx - startIdx + 1) / n) * 100
      let eventColor = event.calendarColor ?? props.color ?? '#333'
      if (props.muteCalendarColors) eventColor = muteCalendarColor(eventColor)
      const isConfirmed = isEventConfirmed(event)
      const fill = isConfirmed ? eventColor : 'transparent'
      const textColor = isConfirmed ? getContrastTextColor(eventColor) : eventColor
      const row = rowIndex++
      const topRem = row * (LINE_HEIGHT_REM + LINE_GAP_REM)

      let clipPath: string | undefined
      if (extendsLeft && extendsRight) {
        clipPath =
          'polygon(8px 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0 50%)'
      } else if (extendsLeft) {
        clipPath = 'polygon(8px 0, 100% 0, 100% 100%, 8px 100%, 0 50%)'
      } else if (extendsRight) {
        clipPath = 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)'
      }

      const style: Record<string, string> = {
        left: `${left}%`,
        width: `${width}%`,
        top: `${topRem}rem`,
        height: `${LINE_HEIGHT_REM}rem`,
        backgroundColor: fill,
        color: textColor,
        border: `2px solid ${eventColor}`,
      }
      if (clipPath) style.clipPath = clipPath

      return {
        event,
        style,
      }
    })
    .filter((b): b is NonNullable<typeof b> => b != null)
})

const allDayRowMinHeight = computed(() => {
  const count = eventBars.value.length
  if (count === 0) return undefined
  const totalRem = count * (LINE_HEIGHT_REM + LINE_GAP_REM) + LINE_GAP_REM
  return `${totalRem}rem`
})
</script>

<style scoped>
.all-day-row {
  flex-shrink: 0;
  display: flex;
  min-height: 1.75rem;
  align-items: stretch;
}
.all-day-spacer {
  width: 3rem;
  flex-shrink: 0;
}
.all-day-cells {
  flex: 1;
  display: flex;
  min-width: 0;
  position: relative;
}
.all-day-cell {
  flex: 1;
  min-width: 0;
}
.all-day-bars {
  inset: 0;
  pointer-events: none;
}
.all-day-bars > * {
  pointer-events: auto;
}
.all-day-bar {
  position: absolute;
  margin: 0 1px;
  padding: 0 0.35rem;
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 500;
  font-family: inherit;
  display: flex;
  align-items: center;
  overflow: hidden;
  box-sizing: border-box;
}
.all-day-bar-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
}
.all-day-bar--new {
  overflow: visible;
}
.all-day-bar--new::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 7px;
  background: conic-gradient(
    from var(--rainbow-angle),
    #ff3366,
    #ff9933,
    #ffdd00,
    #99ff33,
    #33ff99,
    #3399ff,
    #9933ff,
    #ff3366
  );
  filter: blur(6px);
  opacity: 0.75;
  animation: event-block-rainbow 3s linear infinite;
  z-index: -1;
  pointer-events: none;
}
.all-day-bar--new::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 14px;
  background: conic-gradient(
    from var(--rainbow-angle),
    #ff3366,
    #ff9933,
    #ffdd00,
    #99ff33,
    #33ff99,
    #3399ff,
    #9933ff,
    #ff3366
  );
  filter: blur(5px);
  opacity: 0.35;
  animation: event-block-rainbow 3s linear infinite reverse;
  z-index: -2;
  pointer-events: none;
}
@property --rainbow-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
@keyframes all-day-bar-rainbow {
  to {
    --rainbow-angle: 360deg;
  }
}
</style>
