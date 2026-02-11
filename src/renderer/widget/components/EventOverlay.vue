<template>
  <Transition name="overlay">
    <div
      class="event-overlay"
      :style="{ color }"
      @click.self="$emit('close')"
    >
      <div class="overlay-content">
        <p v-if="eventTime" class="overlay-time-corner">{{ eventTime }}</p>
        <h2 class="overlay-title">{{ event.summary || 'No title' }}</h2>
        <p v-if="event.calendarSummary" class="overlay-calendar">{{ event.calendarSummary }}</p>
        <p v-if="event.description" class="overlay-description" v-html="event.description"></p>
        <div v-if="attendees.length" class="overlay-attendees">
          <strong>Attendees:</strong>
          <ul>
            <li v-for="a in attendees" :key="a.email">{{ a.displayName || a.email }}</li>
          </ul>
        </div>
        <div class="overlay-actions">
          <a
            v-if="event.htmlLink"
            href="#"
            class="btn btn-primary"
            @click.prevent="openInGoogleCalendar"
          >
            Open in Google Calendar
          </a>
          <a
            v-if="meetingLink"
            :href="meetingLink"
            target="_blank"
            rel="noopener"
            class="btn btn-primary"
          >
            Join meeting
          </a>
        </div>
        <button type="button" class="btn btn-close" @click="$emit('close')">Close</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarEvent } from '../../../shared/types'
import { formatTime, isAllDayEvent } from '../../../utils/time'

const props = defineProps<{
  event: CalendarEvent
  color?: string
}>()

defineEmits<{
  close: []
}>()

const color = computed(() => props.color ?? '#333')

const eventTime = computed(() => {
  const s = props.event.start
  const e = props.event.end
  if (isAllDayEvent(s)) return 'All day'
  const startStr = formatTime(s?.dateTime ?? s?.date ?? '')
  const endStr = formatTime(e?.dateTime ?? e?.date ?? '')
  return `${startStr} – ${endStr}`
})

const attendees = computed(() => props.event.attendees ?? [])

const meetingLink = computed(
  () => props.event.hangoutLink ?? (props.event.description?.match(/https?:\/\/[^\s]+/)?.[0] ?? null)
)

function openInGoogleCalendar(): void {
  const url = props.event.htmlLink
  if (url) window.electronAPI?.openExternalUrl?.(url)
}
</script>

<style scoped>
.event-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.overlay-content {
  position: relative;
  width: 100%;
  max-width: 50rem;
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(30, 30, 30, 0.95);
  padding: 1.25rem;
  border-radius: 8px;
  border: 1px solid currentColor;
}
.overlay-time-corner {
  position: absolute;
  top: 1.4rem;
  right: 1.3rem;
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1;
  opacity: 0.95;
  letter-spacing: 0.02em;
}
.overlay-title {
  font-size: 1.8rem;
  margin-bottom: 0.25rem;
  padding-right: 6rem;
  max-width: 80%;
}
.overlay-calendar {
  font-size: 0.9rem;
  opacity: 0.85;
  margin-bottom: 0.5rem;
}
.overlay-description {
  font-size: 0.85rem;
  white-space: pre-wrap;
  margin-bottom: 0.75rem;
}
.overlay-description :deep(a) {
  color: inherit;
}
.overlay-attendees {
  font-size: 0.85rem;
  margin-bottom: 1rem;
  max-height: 10rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #666 #2d2d2d;
}
.overlay-attendees ul {
  margin: 0.25rem 0 0 1rem;
  padding: 0;
}
.overlay-actions {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-size: 0.9rem;
  margin-right: 0.5rem;
}
.btn-primary {
  background: currentColor;
  color: #111;
}
.btn-close {
  margin-right: 0;
}
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
