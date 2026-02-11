<template>
  <div class="settings-app">
    <section>
      <AppSettingsSection />
    </section>
    <section>
      <AuthSection />
    </section>
    <section>
      <CalendarSelection />
    </section>
    <section>
      <AppearanceSettings />
    </section>
    <section>
      <BehaviorSettings />
    </section>
  </div>
</template>

<script setup lang="ts">
import AppSettingsSection from './components/AppSettingsSection.vue'
import AuthSection from './components/AuthSection.vue'
import CalendarSelection from './components/CalendarSelection.vue'
import AppearanceSettings from './components/AppearanceSettings.vue'
import BehaviorSettings from './components/BehaviorSettings.vue'
</script>

<style>
html,
body {
  background: #1e1e1e;
  color: #e0e0e0;
}
</style>
<style scoped>
.settings-app {
  padding: 1.5rem;
  font-family: system-ui, sans-serif;
  max-width: 480px;
  margin: 0 auto;
  background: #1e1e1e;
  color: #e0e0e0;
  min-height: 100%;
}
.settings-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #3a3a3a;
}
.settings-icon {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
}
.settings-title {
  font-size: 1.25rem;
  margin: 0;
  color: #fff;
}
h1 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #fff;
}
section {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #3a3a3a;
}
section:last-child {
  border-bottom: none;
}
</style>
