<template>
  <div class="auth-section">
    <h2>Accounts</h2>
    <p v-if="authError" class="error">{{ authError }}</p>
    <template v-if="profiles.length > 0">
      <div
        v-for="p in profiles"
        :key="p.email"
        class="account-row"
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
        <span class="account-email">{{ p.email }}</span>
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
}

const profiles = ref<Profile[]>([])
const loading = ref(false)
const authError = ref('')
const avatarFailed = ref(new Set<string>())

function onAvatarError(email: string) {
  avatarFailed.value = new Set([...avatarFailed.value, email])
}

function loadProfiles() {
  if (window.electronAPI?.authGetCurrentProfiles) {
    window.electronAPI.authGetCurrentProfiles().then((list) => {
      profiles.value = list
    })
  }
}

onMounted(() => {
  if (window.electronAPI?.onAuthCurrentProfiles) {
    window.electronAPI.onAuthCurrentProfiles((list: Profile[]) => {
      profiles.value = list
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
.account-email {
  font-size: 0.9rem;
  color: #e0e0e0;
  word-break: break-all;
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
}
.btn.primary {
  background: #4285f4;
  color: #fff;
  border-color: #4285f4;
}
.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
