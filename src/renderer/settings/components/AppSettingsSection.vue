<template>
  <div class="app-settings-section">
    <div class="section-header" @click="toggle">
      <h2>App settings</h2>
      <button type="button" class="toggle-btn" :aria-expanded="expanded">
        {{ expanded ? 'Hide' : 'Show' }} app settings
      </button>
    </div>
    <div v-show="expanded" class="section-body">
      <div class="instructions">
        <p>To get Client ID and Client Secret:</p>
        <ol>
          <li>Open <a href="#" class="external-link" @click.prevent="openConsole">Google Cloud Console – Credentials</a>.</li>
          <li>Select a project or create one (e.g. “Calendar Widget”).</li>
          <li>Click <strong>“+ Create Credentials”</strong> → <strong>“OAuth client ID”</strong>.</li>
          <li>If asked, configure the <strong>OAuth consent screen</strong>: choose “External”, fill app name, save.</li>
          <li>Under “Application type” choose <strong>“Desktop app”</strong>.</li>
          <li>Give it a name (e.g. “Calendar Widget”) and click <strong>“Create”</strong>.</li>
          <li>Copy <strong>Client ID</strong> and <strong>Client secret</strong> into the fields below.</li>
        </ol>
      </div>
      <div class="setting">
        <label>Client ID</label>
        <input v-model="clientId" type="text" placeholder="Google OAuth Client ID" @blur="saveCreds" />
      </div>
      <div class="setting">
        <label>Client Secret</label>
        <input v-model="clientSecret" type="password" placeholder="Client Secret" @blur="saveCreds" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const clientId = ref('')
const clientSecret = ref('')
const expanded = ref(false)

onMounted(async () => {
  if (window.electronAPI?.getSettings) {
    const s = await window.electronAPI.getSettings()
    clientId.value = (s.googleClientId as string) ?? ''
    clientSecret.value = (s.googleClientSecret as string) ?? ''
    updateExpanded()
  }
})

watch([clientId, clientSecret], updateExpanded)

function updateExpanded() {
  const hasBoth = (clientId.value?.trim() ?? '').length > 0 && (clientSecret.value?.trim() ?? '').length > 0
  expanded.value = !hasBoth
}

function toggle() {
  expanded.value = !expanded.value
}

function saveCreds() {
  window.electronAPI?.setSettings?.({
    googleClientId: clientId.value,
    googleClientSecret: clientSecret.value,
  })
}

const GOOGLE_CREDENTIALS_URL = 'https://console.cloud.google.com/apis/credentials'
function openConsole() {
  window.electronAPI?.openExternalUrl?.(GOOGLE_CREDENTIALS_URL)
}
</script>

<style scoped>
.app-settings-section h2 {
  font-size: 1rem;
  margin: 0;
  color: #fff;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}
.toggle-btn {
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
  border-radius: 4px;
  border: 1px solid #3a3a3a;
  background: #2d2d2d;
  color: #6ea8fe;
  cursor: pointer;
}
.toggle-btn:hover {
  background: #3a3a3a;
}
.section-body {
  margin-top: 0.75rem;
}
.instructions {
  font-size: 0.85rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #2d2d2d;
  border-radius: 6px;
  border: 1px solid #3a3a3a;
  color: #e0e0e0;
}
.instructions p {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #fff;
}
.instructions ol {
  margin: 0 0 0 1.25rem;
  padding: 0;
}
.instructions li {
  margin-bottom: 0.35rem;
}
.instructions a.external-link {
  color: #6ea8fe;
  cursor: pointer;
  text-decoration: none;
}
.instructions a.external-link:hover {
  text-decoration: underline;
}
.setting {
  margin-bottom: 0.5rem;
}
.setting label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #e0e0e0;
}
.setting input {
  width: 100%;
  padding: 0.35rem;
  font-size: 0.9rem;
  background: #2d2d2d;
  border: 1px solid #3a3a3a;
  color: #e0e0e0;
  border-radius: 4px;
}
</style>
