<template>
  <div class="appearance-settings">
    <h2>Appearance</h2>
    <div class="setting">
      <label>
        <input type="checkbox" :checked="showWeekends" @change="setShowWeekends" />
        Show weekends
      </label>
    </div>
    <div class="setting">
      <label>
        <input type="checkbox" :checked="alwaysOnTop" @change="setAlwaysOnTop" />
        Always on top
      </label>
    </div>
    <div class="setting">
      <label>
        <input type="checkbox" :checked="muteCalendarColors" @change="setMuteCalendarColors" />
        Mute calendar colors
      </label>
      <p class="hint">Use softer, desaturated colors for events (all calendars).</p>
    </div>
    <div class="setting">
      <label>UI color (day labels, today circle)</label>
      <input type="color" :value="uiColor" @input="setUiColor" />
    </div>
    <div class="setting">
      <label>Current time line color</label>
      <input type="color" :value="currentTimeLineColor" @input="setCurrentTimeLineColor" />
    </div>
    <div class="setting">
      <label>Opacity: {{ opacity }}%</label>
      <input
        type="range"
        min="0"
        max="100"
        :value="opacity"
        @input="setOpacity"
      />
    </div>
    <div class="setting">
      <label>Widget time range (e.g. 7–20)</label>
      <div class="time-range">
        <input
          type="number"
          min="0"
          max="23"
          :value="widgetTimeStartHour"
          @input="setWidgetTimeStart"
        />
        <span>–</span>
        <input
          type="number"
          min="0"
          max="24"
          :value="widgetTimeEndHour"
          @input="setWidgetTimeEnd"
        />
        <span class="hint">hours (start – end)</span>
      </div>
    </div>
    <div class="setting">
      <label>Refresh interval (seconds)</label>
      <input
        type="number"
        min="30"
        max="600"
        :value="refreshIntervalSeconds"
        @input="setRefreshInterval"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const showWeekends = ref(false)
const uiColor = ref('#e0e0e0')
const opacity = ref(90)
const alwaysOnTop = ref(false)
const muteCalendarColors = ref(false)
const currentTimeLineColor = ref('#fa8a52')
const refreshIntervalSeconds = ref(60)
const widgetTimeStartHour = ref(7)
const widgetTimeEndHour = ref(20)

onMounted(async () => {
  if (window.electronAPI?.getSettings) {
    const s = await window.electronAPI.getSettings()
    showWeekends.value = Boolean(s.showWeekends)
    uiColor.value = (s.uiColor as string) ?? '#e0e0e0'
    opacity.value = Number(s.opacity) ?? 90
    alwaysOnTop.value = Boolean(s.alwaysOnTop)
    muteCalendarColors.value = Boolean(s.muteCalendarColors)
    currentTimeLineColor.value = (s.currentTimeLineColor as string) ?? '#fa8a52'
    refreshIntervalSeconds.value = Number(s.refreshIntervalSeconds) ?? 60
    widgetTimeStartHour.value = Number(s.widgetTimeStartHour) ?? 7
    widgetTimeEndHour.value = Number(s.widgetTimeEndHour) ?? 20
  }
})

function setShowWeekends(e: Event) {
  const v = (e.target as HTMLInputElement).checked
  showWeekends.value = v
  window.electronAPI?.setSettings({ showWeekends: v })
}
function setUiColor(e: Event) {
  const v = (e.target as HTMLInputElement).value
  uiColor.value = v
  window.electronAPI?.setSettings({ uiColor: v })
}
function setOpacity(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  opacity.value = v
  window.electronAPI?.setSettings({ opacity: v })
}
function setAlwaysOnTop(e: Event) {
  const v = (e.target as HTMLInputElement).checked
  alwaysOnTop.value = v
  window.electronAPI?.setSettings({ alwaysOnTop: v })
}
function setMuteCalendarColors(e: Event) {
  const v = (e.target as HTMLInputElement).checked
  muteCalendarColors.value = v
  window.electronAPI?.setSettings({ muteCalendarColors: v })
}
function setCurrentTimeLineColor(e: Event) {
  const v = (e.target as HTMLInputElement).value
  currentTimeLineColor.value = v
  window.electronAPI?.setSettings({ currentTimeLineColor: v })
}
function setRefreshInterval(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  refreshIntervalSeconds.value = v
  window.electronAPI?.setSettings({ refreshIntervalSeconds: v })
}
function setWidgetTimeStart(e: Event) {
  const v = Math.max(0, Math.min(23, Number((e.target as HTMLInputElement).value)))
  widgetTimeStartHour.value = v
  window.electronAPI?.setSettings({ widgetTimeStartHour: v })
}
function setWidgetTimeEnd(e: Event) {
  const v = Math.max(0, Math.min(24, Number((e.target as HTMLInputElement).value)))
  widgetTimeEndHour.value = v
  window.electronAPI?.setSettings({ widgetTimeEndHour: v })
}
</script>

<style scoped>
.appearance-settings h2 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: #fff;
}
.setting {
  margin-bottom: 0.75rem;
}
.setting label {
  display: block;
  margin-bottom: 0.25rem;
  color: #e0e0e0;
}
.setting input[type='color'] {
  width: 3rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid #3a3a3a;
  background: #2d2d2d;
}
.setting input[type='range'] {
  width: 100%;
}
.setting input[type='number'] {
  width: 4rem;
  padding: 0.25rem;
  background: #2d2d2d;
  border: 1px solid #3a3a3a;
  color: #e0e0e0;
  border-radius: 4px;
}
.time-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.setting .hint,
.time-range .hint {
  font-size: 0.85rem;
  color: #9e9e9e;
}
</style>
