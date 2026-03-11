<template>
  <div class="auth-section">
    <h2>Accounts</h2>
    <p v-if="authError" class="error">{{ authError }}</p>
    <template v-if="profiles.length > 0">
      <div
        v-for="p in profiles"
        :key="p.email"
        class="account-row"
        :class="{ 'needs-reauth': p.needsReauth }"
      >
        <img
          v-if="p.picture && !avatarFailed.has(p.email)"
          :src="p.picture"
          alt=""
          class="account-avatar"
          referrerpolicy="no-referrer"
          @error="onAvatarError(p.email)"
        />
        <span v-else class="account-avatar-placeholder" />
        <span class="account-info">
          <span class="account-email">{{ p.email }}</span>
          <span v-if="p.needsReauth" class="reauth-badge">⚠ Re-authorization required</span>
        </span>
        <button
          v-if="p.needsReauth"
          type="button"
          class="btn warning"
          :disabled="loading"
          @click="reauthorize(p.email)"
        >
          Re-authorize
        </button>
        <button type="button" class="btn" @click="signOut(p.email)">Log out</button>
      </div>
    </template>
    <div v-else class="account-row">
      <span class="account-email">Not signed in.</span>
    </div>
    <div class="auth-actions">
      <button type="button" class="btn primary" :disabled="loading" @click="signIn">
        {{ profiles.length > 0 ? (loading ? 'Opening browser…' : 'Login with another account') : (loading ? 'Opening browser…' : 'Sign in with Google') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Profile {
  email: string
  picture: string | null
  needsReauth: boolean
}

const profiles = ref<Profile[]>([])
const loading = ref(false)
const authError = ref('')
const avatarFailed = ref(new Set<string>())

function onAvatarError(email: string) {
  avatarFailed.value = new Set([...avatarFailed.value, email])
}

function loadProfiles() {
  if (window.electronAPI?.authGetProfilesWithStatus) {
    window.electronAPI.authGetProfilesWithStatus().then((list) => {
      profiles.value = list
    })
  } else if (window.electronAPI?.authGetCurrentProfiles) {
    window.electronAPI.authGetCurrentProfiles().then((list) => {
      profiles.value = list.map((p) => ({ ...p, needsReauth: false }))
    })
  }
}

onMounted(() => {
  if (window.electronAPI?.onAuthCurrentProfiles) {
    window.electronAPI.onAuthCurrentProfiles(() => {
      loadProfiles()
    })
  }
  loadProfiles()
})

async function signIn() {
  authError.value = ''
  if (!window.electronAPI?.authSignIn) return
  loading.value = true
  try {
    const result = await window.electronAPI.authSignIn()
    if (result.success) {
      loadProfiles()
      await window.electronAPI.calendarRefresh?.()
    } else {
      authError.value = result.error ?? 'Sign in failed'
    }
  } finally {
    loading.value = false
  }
}

async function reauthorize(email: string) {
  authError.value = ''
  if (!window.electronAPI?.authSignIn) return
  loading.value = true
  try {
    const result = await window.electronAPI.authSignIn()
    if (result.success) {
      loadProfiles()
      await window.electronAPI.calendarRefresh?.()
    } else {
      authError.value = result.error ?? `Re-authorization failed for ${email}`
    }
  } finally {
    loading.value = false
  }
}

async function signOut(email: string) {
  await window.electronAPI?.authSignOut?.(email)
  loadProfiles()
  authError.value = ''
}
</script>

<style scoped>
.auth-section h2 {
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  color: #fff;
}
.error {
  color: #f48771;
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
}
.account-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}
.account-row.needs-reauth {
  background: rgba(244, 135, 113, 0.08);
  border: 1px solid rgba(244, 135, 113, 0.3);
  border-radius: 6px;
  padding: 0.5rem;
}
.account-avatar,
.account-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}
.account-avatar-placeholder {
  background: #3a3a3a;
}
.account-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}
.account-email {
  font-size: 0.9rem;
  color: #e0e0e0;
  word-break: break-all;
}
.reauth-badge {
  font-size: 0.78rem;
  color: #f48771;
}
.auth-actions {
  margin-top: 0.25rem;
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #3a3a3a;
  background: #2d2d2d;
  color: #e0e0e0;
  font-size: 0.9rem;
  white-space: nowrap;
}
.btn.primary {
  background: #4285f4;
  color: #fff;
  border-color: #4285f4;
}
.btn.warning {
  background: #b85c00;
  color: #fff;
  border-color: #b85c00;
}
.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
