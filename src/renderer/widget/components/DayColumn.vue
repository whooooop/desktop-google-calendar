<template>
  <div class="day-column">
    <div v-if="showHeader" class="day-header">
      <span class="day-label" :style="dayLabelStyle">{{ day.label }}</span>
      <span :class="['day-num', { 'day-num--today': isToday }]" :style="dayNumStyle">
        {{ dayNum }}
      </span>
    </div>
    <div class="day-slots" :style="{ minHeight: eventsLayerHeight }">
      <div
        v-for="hour in hourCount"
        :key="timeStartHour + hour - 1"
        class="slot"
        :style="{ borderColor: color }"
      />
      <div class="events-layer" :style="{ height: eventsLayerHeight }">
        <EventBlock
          v-for="ev in dayEvents"
          :key="ev.id"
          :event="ev"
          :color="color"
          :mute-calendar-colors="muteCalendarColors"
          :time-start-hour="timeStartHour"
          :time-end-hour="timeEndHour"
          :is-new="newEventIds?.has(ev.id)"
          @click="$emit('select-event', ev)"
          @clear-new-event="$emit('clear-new-event', ev.id)"
        />
        <!-- Current time line: only in this column (today) -->
        <div
          v-if="showCurrentTimeLine"
          class="current-time-line"
          :style="currentTimeLineStyle"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import EventBlock from './EventBlock.vue'
import type { CalendarEvent } from '../../../shared/types'
import type { WeekDay } from '../../../utils/time'

const props = withDefaults(
  defineProps<{
    day: WeekDay
    events: CalendarEvent[]
    color?: string
    muteCalendarColors?: boolean
    currentTimeLineColor?: string
    timeStartHour?: number
    timeEndHour?: number
    showHeader?: boolean
    newEventIds?: Set<string>
  }>(),
  { timeStartHour: 0, timeEndHour: 24, showHeader: true }
)

defineEmits<{
  'select-event': [event: CalendarEvent]
  'clear-new-event': [eventId: string]
}>()

const SLOT_HEIGHT_REM = 1.5

const color = computed(() => props.color ?? 'currentColor')
const timeStartHour = computed(() => {
  const v = props.timeStartHour ?? 0
  return Number.isFinite(v) ? Math.max(0, Math.min(23, v)) : 0
})
const timeEndHour = computed(() => {
  const v = props.timeEndHour ?? 24
  return Number.isFinite(v) ? Math.max(1, Math.min(24, v)) : 24
})
const hourCount = computed(() => Math.max(1, timeEndHour.value - timeStartHour.value))
const eventsLayerHeight = computed(() => `${hourCount.value * SLOT_HEIGHT_REM}rem`)
const dayEvents = computed(() => props.events)

const isToday = computed(() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}` === props.day.key
})

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 60_000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const currentTimeTopPercent = computed<number | null>(() => {
  if (!isToday.value) return null
  const n = now.value
  const startMin = timeStartHour.value * 60
  const endMin = timeEndHour.value * 60
  const rangeMin = endMin - startMin
  const currentMin = n.getHours() * 60 + n.getMinutes()
  if (currentMin < startMin || currentMin > endMin) return null
  return ((currentMin - startMin) / rangeMin) * 100
})

const showCurrentTimeLine = computed(() => isToday.value && currentTimeTopPercent.value !== null)

const currentTimeLineStyle = computed(() => {
  const p = currentTimeTopPercent.value
  const lineColor = props.currentTimeLineColor ?? '#fa8a52'
  return p !== null
    ? { top: `${p}%`, transform: 'translateY(-50%)', backgroundColor: lineColor, '--current-time-line-color': lineColor }
    : {}
})

const dayNum = computed(() => props.day.date.getDate())

const dayLabelStyle = computed(() => ({
  color: isToday.value ? color.value : color.value,
}))

const dayNumStyle = computed(() => {
  if (isToday.value) {
    return {
      color: color.value,
      borderColor: color.value,
      backgroundColor: 'transparent',
    }
  }
  return { color: color.value }
})
</script>

<style scoped>
.day-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.day-header {
  flex-shrink: 0;
  min-height: 2.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  text-align: center;
}
.day-label {
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
}
.day-num {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
}
.day-num--today {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  border: 1.5px solid;
  box-sizing: border-box;
}
.day-slots {
  flex: 1;
  position: relative;
}
.slot {
  height: 1.5rem;
  border-bottom: 1px solid;
  border-color: inherit;
  opacity: 0.3;
}
.events-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  pointer-events: none;
}
.events-layer > * {
  pointer-events: auto;
}
.current-time-line {
  position: absolute;
  left: -4px;
  right: 4px;
  width: calc(100% - 8px);
  height: 2px;
  background: var(--current-time-line-color, #fa8a52);
  pointer-events: none;
  z-index: 5;
  box-sizing: border-box;
}
.current-time-line::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0.8rem;
  height: 0.8rem;
  background: inherit;
  z-index: 2;
  border-radius: 50%;
}
</style>
