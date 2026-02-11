<template>
  <div
    class="event-block"
    :class="{ 'event-block--new': isNew }"
    :style="blockStyle"
    @click.stop="$emit('click')"
    @mouseenter="onMouseEnter"
  >
    <span class="event-title">{{ event.summary || 'No title' }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarEvent } from '../../../shared/types'
import { minutesSinceMidnight, parseEventDate, isAllDayEvent } from '../../../utils/time'
import { getContrastTextColor, muteCalendarColor } from '../../../utils/color'

const props = withDefaults(
  defineProps<{
    event: CalendarEvent
    color?: string
    muteCalendarColors?: boolean
    timeStartHour?: number
    timeEndHour?: number
    isNew?: boolean
  }>(),
  { timeStartHour: 0, timeEndHour: 24, isNew: false }
)

const emit = defineEmits<{
  click: []
  'clear-new-event': [eventId: string]
}>()

function onMouseEnter(): void {
  if (props.isNew) emit('clear-new-event', props.event.id)
}

const eventColor = computed(() => {
  const raw = props.event.calendarColor ?? props.color ?? '#333'
  return props.muteCalendarColors ? muteCalendarColor(raw) : raw
})
// Filled only when event is confirmed AND (no attendees / not invited, or user accepted)
const isConfirmed = computed(() => {
  if (props.event.status !== 'confirmed') return false
  const my = props.event.myResponseStatus
  if (my === undefined || my === '') return true
  return my === 'accepted'
})

const blockStyle = computed(() => {
  const startDate = parseEventDate(props.event.start)
  const endDate = parseEventDate(props.event.end)
  const color = eventColor.value
  if (!startDate || !endDate) return {}
  const isAllDay = isAllDayEvent(props.event.start)
  const startMin = (props.timeStartHour ?? 0) * 60
  const endMin = (props.timeEndHour ?? 24) * 60
  const rangeMin = endMin - startMin
  const dayStartMin = minutesSinceMidnight(startDate)
  const dayEndMin = minutesSinceMidnight(endDate)
  // Confirmed: filled with calendar color. Unconfirmed: transparent, border only.
  const backgroundColor = isConfirmed.value ? color : 'transparent'
  const borderStyle = `2px solid ${color}`
  const textColor = isConfirmed.value ? getContrastTextColor(color) : color
  if (isAllDay) {
    return {
      top: '0%',
      height: '10%',
      minHeight: '1.35rem',
      backgroundColor,
      color: textColor,
      border: borderStyle,
    }
  }
  const clipStart = Math.max(startMin, dayStartMin)
  const clipEnd = Math.min(endMin, dayEndMin)
  if (clipStart >= clipEnd) return {}
  const top = ((clipStart - startMin) / rangeMin) * 100
  const heightPct = Math.max(2, ((clipEnd - clipStart) / rangeMin) * 100)
  return {
    top: `${top}%`,
    height: `${heightPct}%`,
    minHeight: '1.35rem',
    backgroundColor,
    color: textColor,
    border: borderStyle,
  }
})
</script>

<style scoped>
.event-block {
  position: absolute;
  left: 0;
  right: 0;
  overflow: hidden;
  padding: 0.15rem 0.35rem;
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.7rem;
  min-height: 1.35rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: transparent;
  margin-right: 0.5rem;
}
.event-title {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  line-height: 1.2;
}
.event-block--new {
  overflow: visible;
}
.event-block--new .event-title {
  position: relative;
}
.event-block--new::before {
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
.event-block--new::after {
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
@keyframes event-block-rainbow {
  to {
    --rainbow-angle: 360deg;
  }
}
</style>
