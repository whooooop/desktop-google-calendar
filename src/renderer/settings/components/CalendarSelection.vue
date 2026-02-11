<template>
  <div class="calendar-selection">
    <div class="calendar-selection-header">
      <h2>Calendars</h2>
      <button
        v-if="authenticated"
        type="button"
        class="btn-refresh"
        :disabled="refreshing"
        @click="refresh"
      >
        {{ refreshing ? 'Updating…' : 'Refresh' }}
      </button>
    </div>
    <p v-if="calendars.length === 0 && !refreshing" class="calendar-hint">
      <template v-if="!authenticated">Sign in first to load calendars.</template>
      <template v-else>No calendars loaded. Click Refresh to load.</template>
    </p>
    <p v-if="loadError" class="calendar-error">
      {{ loadError }}
      <button
        v-if="is403Error"
        type="button"
        class="btn-link"
        @click="openCalendarApiLibrary"
      >
        Open API Library
      </button>
    </p>
    <ul v-else class="calendar-list">
      <li v-for="cal in calendars" :key="cal.id" class="calendar-item">
        <label>
          <input
            type="checkbox"
            :checked="selectedIds.includes(cal.id)"
            @change="toggle(cal.id)"
          />
          <span class="calendar-color" :style="{ backgroundColor: calendarColor(cal) }" />
          {{ cal.summary }}
        </label>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { CalendarListEntry } from '../../../shared/types'

const calendars = ref<CalendarListEntry[]>([])
const selectedIds = ref<string[]>([])
const authenticated = ref(false)
const refreshing = ref(false)
const loadError = ref('')

onMounted(async () => {
  const api = window.electronAPI
  if (api?.authIsAuthenticated) {
    authenticated.value = await api.authIsAuthenticated()
  }
  if (api?.getSettings) {
    const s = await api.getSettings()
    selectedIds.value = (s.selectedCalendarIds as string[] | undefined) ?? []
  }
  if (api?.onCalendarList) {
    api.onCalendarList((c: unknown[]) => {
      calendars.value = c as CalendarListEntry[]
      refreshing.value = false
      loadError.value = ''
      if (calendars.value.length > 0) authenticated.value = true
    })
  }
  if (api?.calendarRefresh) {
    loadError.value = ''
    const result = await api.calendarRefresh()
    if (result && !result.success) {
      loadError.value = result.error ?? 'Failed to load calendars'
    }
  }
})

async function refresh() {
  if (!window.electronAPI?.calendarRefresh) return
  refreshing.value = true
  loadError.value = ''
  try {
    const result = await window.electronAPI.calendarRefresh()
    if (result && !result.success) {
      loadError.value = result.error ?? 'Failed to load calendars'
    }
  } finally {
    refreshing.value = false
  }
}

const GOOGLE_CALENDAR_API_LIBRARY_URL = 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com'

const DEFAULT_CALENDAR_COLORS = [
  '#7986cb', '#33b679', '#8e24aa', '#e67c73', '#f6bf26',
  '#f4511e', '#039be5', '#616161', '#3f51b5', '#0b8043',
]

function calendarColor(cal: CalendarListEntry): string {
  if (cal.backgroundColor) return cal.backgroundColor
  let h = 0
  for (let i = 0; i < cal.id.length; i++) h = (h << 5) - h + cal.id.charCodeAt(i) | 0
  return DEFAULT_CALENDAR_COLORS[Math.abs(h) % DEFAULT_CALENDAR_COLORS.length]
}

const is403Error = computed(() => (loadError.value || '').includes('403') || (loadError.value || '').includes('Access denied'))

function openCalendarApiLibrary() {
  window.electronAPI?.openExternalUrl?.(GOOGLE_CALENDAR_API_LIBRARY_URL)
}

function toggle(id: string) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
  const ids = Array.isArray(selectedIds.value) ? selectedIds.value.slice() : []
  window.electronAPI?.setSettings({ selectedCalendarIds: ids })
}
</script>

<style scoped>
.calendar-selection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.calendar-selection h2 {
  font-size: 1rem;
  margin: 0;
  color: #fff;
}
.btn-refresh {
  flex-shrink: 0;
  padding: 0.35rem 0.65rem;
  font-size: 0.85rem;
  border-radius: 4px;
  border: 1px solid #3a3a3a;
  background: #2d2d2d;
  color: #e0e0e0;
  cursor: pointer;
}
.btn-refresh:hover:not(:disabled) {
  background: #3a3a3a;
}
.btn-refresh:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.calendar-hint {
  color: #9e9e9e;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}
.calendar-error {
  color: #f48771;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}
.calendar-error .btn-link {
  margin-left: 0.5rem;
  padding: 0;
  border: none;
  background: none;
  color: #8ab4f8;
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
}
.calendar-error .btn-link:hover {
  color: #aecbfa;
}
.calendar-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.calendar-item {
  padding: 0.35rem 0;
}
.calendar-item label {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #e0e0e0;
}
.calendar-color {
  flex-shrink: 0;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
