<template>
  <div class="behavior-settings">
    <h2>Behavior</h2>
    <div class="setting">
      <label>
        <input type="checkbox" :checked="autoLaunch" @change="setAutoLaunch" />
        Launch at Windows startup
      </label>
    </div>
    <div class="setting">
      <label>
        <input type="checkbox" :checked="soundNotification" @change="setSoundNotification" />
        Sound notification for new events
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const autoLaunch = ref(false)
const soundNotification = ref(false)

onMounted(async () => {
  if (window.electronAPI?.getSettings) {
    const s = await window.electronAPI.getSettings()
    autoLaunch.value = Boolean(s.autoLaunch)
    soundNotification.value = Boolean(s.soundNotification)
  }
})

function setAutoLaunch(e: Event) {
  const v = (e.target as HTMLInputElement).checked
  autoLaunch.value = v
  window.electronAPI?.setSettings({ autoLaunch: v })
}
function setSoundNotification(e: Event) {
  const v = (e.target as HTMLInputElement).checked
  soundNotification.value = v
  window.electronAPI?.setSettings({ soundNotification: v })
}
</script>

<style scoped>
.behavior-settings h2 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: #fff;
}
.setting {
  margin-bottom: 0.75rem;
}
.setting label {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #e0e0e0;
}
</style>
