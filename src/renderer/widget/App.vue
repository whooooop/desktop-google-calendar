<template>
  <div class="widget" :style="widgetStyle">
    <div class="widget-drag-region" title="Drag to move" />
    <div class="widget-content">
      <CalendarGrid
        :events="events"
        :settings="settings"
        :selected-event="selectedEvent"
        :new-event-ids="newEventIds"
        @select-event="onSelectEvent"
        @close-overlay="selectedEvent = null"
        @clear-new-event="clearNewEventId"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import CalendarGrid from './components/CalendarGrid.vue'
import type { CalendarEvent } from '../../shared/types'

const notificationSoundUrl = new URL('../../assets/notification.mp3', import.meta.url).href

const events = ref<CalendarEvent[]>([])
const settings = ref<Record<string, unknown>>({})
const selectedEvent = ref<CalendarEvent | null>(null)
const newEventIds = ref<Set<string>>(new Set())

function clearNewEventId(id: string): void {
  const next = new Set(newEventIds.value)
  next.delete(id)
  newEventIds.value = next
}

function onSelectEvent(event: CalendarEvent): void {
  selectedEvent.value = event
  clearNewEventId(event.id)
}

function playNotificationSound(): void {
  if (!settings.value?.soundNotification) return
  const audio = new Audio(notificationSoundUrl)
  audio.play().catch(() => {})
}

const widgetStyle = ref<Record<string, string>>({})

function applySettings(s: Record<string, unknown>) {
  settings.value = s
  const color = (s.uiColor as string) ?? '#e0e0e0'
  widgetStyle.value = { color }
}

function updateRemScale() {
  const w = window.innerWidth
  const h = window.innerHeight
  const base = 14
  const scale = Math.min(w / 800, h / 500, 1.5)
  const rem = Math.max(10, Math.min(base * scale, 24))
  document.documentElement.style.fontSize = `${rem}px`
}

onMounted(async () => {
  updateRemScale()
  window.addEventListener('resize', updateRemScale)
  const api = window.electronAPI
  if (api?.getSettings) {
    const s = await api.getSettings()
    applySettings(s)
  }
  if (api?.onSettingsUpdated) {
    api.onSettingsUpdated((s: Record<string, unknown>) => {
      applySettings(s)
      api.requestCalendarEvents?.()
    })
  }
  if (api?.onCalendarEvents) {
    api.onCalendarEvents((e: unknown[]) => {
      events.value = e as CalendarEvent[]
    })
  }
  if (api?.requestCalendarEvents) {
    api.requestCalendarEvents()
  }
  if (api?.onNewEventNotification) {
    api.onNewEventNotification((ids: string[]) => {
      if (Array.isArray(ids) && ids.length > 0) {
        const next = new Set(newEventIds.value)
        for (const id of ids) next.add(id)
        newEventIds.value = next
        playNotificationSound()
      }
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateRemScale)
  window.electronAPI?.removeAllListeners?.('calendar:events')
  window.electronAPI?.removeAllListeners?.('calendar:new-event-notification')
  window.electronAPI?.removeAllListeners?.('settings-updated')
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}
html {
  font-size: 14px;
}
#app,
.widget {
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: transparent;
  overflow: hidden;
  font-family: 'Roboto', system-ui, sans-serif;
  user-select: none;
}
.widget {
  display: flex;
  flex-direction: column;
}
.widget-drag-region {
  flex-shrink: 0;
  height: 1.25rem;
  -webkit-app-region: drag;
  background: transparent;
}
.widget-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  -webkit-app-region: no-drag;
}
</style>
