import { createHash } from 'node:crypto'
import { safeStorage, shell } from 'electron'
import { createServer } from 'node:http'
import { getSettings } from './settingsStore'
import Store from 'electron-store'

const REDIRECT_PATH = '/oauth2callback'
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export interface StoredAccount {
  email: string
  picture?: string
  refreshToken: string
  accessToken?: string
  expiry?: number
}

interface TokenStore {
  accounts?: StoredAccount[]
  google_refresh_token?: string
  google_access_token?: string
  google_token_expiry?: number
  current_account_email?: string
  current_account_picture?: string
}

const tokenStore = new Store<TokenStore>({ name: 'auth-tokens' })

function decryptRefreshToken(encrypted: string): string | null {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buf = Buffer.from(encrypted, 'hex')
      return safeStorage.decryptString(buf)
    }
    return Buffer.from(encrypted, 'base64').toString('utf8')
  } catch {
    return null
  }
}

function encryptOrEncode(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('hex')
  }
  return Buffer.from(value, 'utf8').toString('base64')
}

function getAccountsRaw(): StoredAccount[] {
  const raw = tokenStore.get('accounts')
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (a): a is StoredAccount =>
      a != null && typeof a === 'object' && typeof (a as StoredAccount).email === 'string' && typeof (a as StoredAccount).refreshToken === 'string'
  )
}

function migrateLegacyToAccounts(): void {
  const legacyRefresh = tokenStore.get('google_refresh_token')
  if (typeof legacyRefresh !== 'string' || !legacyRefresh) return
  const decrypted = decryptRefreshToken(legacyRefresh)
  if (!decrypted) return
  const email = tokenStore.get('current_account_email')
  const picture = tokenStore.get('current_account_picture')
  const accessToken = tokenStore.get('google_access_token')
  const expiry = tokenStore.get('google_token_expiry')
  const accounts: StoredAccount[] = [
    {
      email: typeof email === 'string' && email ? email : 'unknown',
      picture: typeof picture === 'string' ? picture : undefined,
      refreshToken: legacyRefresh,
      accessToken: typeof accessToken === 'string' ? accessToken : undefined,
      expiry: typeof expiry === 'number' ? expiry : undefined,
    },
  ]
  tokenStore.set('accounts', accounts)
  tokenStore.delete('google_refresh_token')
  tokenStore.delete('google_access_token')
  tokenStore.delete('google_token_expiry')
  tokenStore.delete('current_account_email')
  tokenStore.delete('current_account_picture')
}

function ensureAccountsMigrated(): StoredAccount[] {
  let accounts = getAccountsRaw()
  if (accounts.length === 0) {
    migrateLegacyToAccounts()
    accounts = getAccountsRaw()
  }
  return accounts
}

export function getStoredRefreshToken(): string | null {
  const accounts = ensureAccountsMigrated()
  const first = accounts[0]
  if (!first) return null
  return decryptRefreshToken(first.refreshToken)
}

export function setStoredTokens(
  refreshToken: string,
  accessToken: string,
  expiryMs: number
): void {
  const accounts = ensureAccountsMigrated()
  if (accounts.length > 0) {
    accounts[0] = {
      ...accounts[0],
      refreshToken: encryptOrEncode(refreshToken),
      accessToken,
      expiry: expiryMs,
    }
    tokenStore.set('accounts', accounts)
  } else {
    tokenStore.set('accounts', [
      { email: 'unknown', refreshToken: encryptOrEncode(refreshToken), accessToken, expiry: expiryMs },
    ])
  }
}

export function getStoredAccessToken(): string | null {
  const accounts = ensureAccountsMigrated()
  const first = accounts[0]
  return first?.accessToken ?? null
}

export function getStoredTokenExpiry(): number | null {
  const accounts = ensureAccountsMigrated()
  const first = accounts[0]
  return first?.expiry ?? null
}

export function clearStoredTokens(): void {
  tokenStore.set('accounts', [])
  tokenStore.delete('google_refresh_token')
  tokenStore.delete('google_access_token')
  tokenStore.delete('google_token_expiry')
  tokenStore.delete('current_account_email')
  tokenStore.delete('current_account_picture')
}

export interface AccountWithToken {
  email: string
  picture: string | null
  accessToken: string
}

/** Returns valid access tokens for all stored accounts. */
export async function getValidAccessTokens(): Promise<AccountWithToken[]> {
  const accounts = ensureAccountsMigrated()
  const { googleClientId, googleClientSecret } = getSettings()
  if (!googleClientId || !googleClientSecret) return []

  const result: AccountWithToken[] = []
  let changed = false

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i]
    const refreshToken = decryptRefreshToken(acc.refreshToken)
    if (!refreshToken) continue

    let accessToken = acc.accessToken
    const expiry = acc.expiry
    if (!accessToken || !expiry || Date.now() >= expiry - 60_000) {
      try {
        const body = new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        })
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
        const data = (await res.json()) as {
          access_token?: string
          expires_in?: number
          error?: string
        }
        if (data.error || !data.access_token) continue
        accessToken = data.access_token
        const expiryMs = Date.now() + (data.expires_in ?? 3600) * 1000
        accounts[i] = { ...acc, accessToken, expiry: expiryMs }
        changed = true
      } catch {
        continue
      }
    }
    if (accessToken) {
      result.push({
        email: acc.email,
        picture: acc.picture ?? null,
        accessToken,
      })
    }
  }

  if (changed) tokenStore.set('accounts', accounts)
  return result
}

/** Returns a single token for the first account (backward compatibility). */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getValidAccessTokens()
  return tokens.length > 0 ? tokens[0].accessToken : null
}

export function getCurrentUserStoredEmail(): string | null {
  const accounts = ensureAccountsMigrated()
  const first = accounts[0]
  return first?.email ?? null
}

export interface CurrentUserProfile {
  email: string
  picture: string | null
}

/** Returns all stored accounts (email + picture). No API fetch. */
export function getCurrentUserProfiles(): CurrentUserProfile[] {
  const accounts = ensureAccountsMigrated()
  return accounts.map((a) => ({
    email: a.email,
    picture: a.picture ?? null,
  }))
}

/** Single profile for backward compat (first account). */
export async function getCurrentUserProfileOrFetch(): Promise<CurrentUserProfile | null> {
  const profiles = getCurrentUserProfiles()
  return profiles.length > 0 ? profiles[0] : null
}

/** @deprecated Use getCurrentUserProfileOrFetch or getCurrentUserProfiles. */
export async function getCurrentUserStoredEmailOrFetch(): Promise<string | null> {
  const p = await getCurrentUserProfileOrFetch()
  return p?.email ?? null
}

export function isAuthenticated(): boolean {
  return ensureAccountsMigrated().length > 0
}

/** Fetches current user email from Google userinfo. */
export async function getCurrentUserEmail(accessToken: string): Promise<string | null> {
  const profile = await getCurrentUserProfile(accessToken)
  return profile.email
}

/** Fetches email and picture from Google userinfo. */
export async function getCurrentUserProfile(accessToken: string): Promise<{ email: string | null; picture: string | null }> {
  const endpoints = [
    'https://www.googleapis.com/oauth2/v2/userinfo',
    'https://openidconnect.googleapis.com/v1/userinfo',
  ]
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) continue
      const data = (await res.json()) as { email?: string; picture?: string }
      if (data.email) {
        return {
          email: data.email,
          picture: typeof data.picture === 'string' && data.picture.length > 0 ? data.picture : null,
        }
      }
    } catch {
      /* try next */
    }
  }
  return { email: null, picture: null }
}

async function getEmailFromPrimaryCalendar(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { items?: Array<{ id?: string; primary?: boolean }> }
    const items = data.items ?? []
    const primary = items.find((c) => c.primary)
    const primaryId = primary?.id
    if (primaryId && primaryId.includes('@')) return primaryId
    const firstEmailLike = items.find((c) => c.id?.includes('@'))
    if (firstEmailLike?.id) return firstEmailLike.id
    return null
  } catch {
    return null
  }
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export interface SignInResult {
  success: boolean
  error?: string
}

export async function signIn(): Promise<SignInResult> {
  const { googleClientId, googleClientSecret } = getSettings()
  if (!googleClientId?.trim() || !googleClientSecret?.trim()) {
    return { success: false, error: 'Client ID and Client Secret are required in settings.' }
  }

  const state = randomString(32)
  const codeVerifier = randomString(64)
  const hash = createHash('sha256').update(codeVerifier, 'utf8').digest()
  const codeChallenge = hash.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const SIGNIN_TIMEOUT_MS = 5 * 60 * 1000

  return new Promise((resolve) => {
    let callbackPort = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let resolved = false
    const doResolve = (result: SignInResult) => {
      if (resolved) return
      resolved = true
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      server.close()
      resolve(result)
    }

    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost`)
      if (url.pathname !== REDIRECT_PATH) {
        res.writeHead(404).end()
        return
      }
      const code = url.searchParams.get('code')
      const stateReturned = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      const headers: Record<string, string> = { 'Content-Type': 'text/html; charset=utf-8' }
      if (error) {
        res.writeHead(200, headers)
        res.end(
          `<script>window.close()</script><p>Sign in failed: ${error}. You can close this tab.</p>`
        )
        doResolve({ success: false, error: error ?? 'Unknown error' })
        return
      }
      if (!code || stateReturned !== state) {
        res.writeHead(200, headers)
        res.end(
          '<script>window.close()</script><p>Invalid response. You can close this tab.</p>'
        )
        doResolve({ success: false, error: 'Invalid state or missing code' })
        return
      }

      try {
        const body = new URLSearchParams({
          code,
          code_verifier: codeVerifier,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: `http://127.0.0.1:${callbackPort}${REDIRECT_PATH}`,
          grant_type: 'authorization_code',
        })
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
        const data = (await tokenRes.json()) as {
          access_token?: string
          refresh_token?: string
          expires_in?: number
          error?: string
        }
        if (data.error || !data.access_token) {
          res.writeHead(200, headers)
          res.end(
            `<script>window.close()</script><p>Token error: ${data.error ?? 'no access_token'}. You can close this tab.</p>`
          )
          doResolve({ success: false, error: data.error ?? 'Token exchange failed' })
          return
        }
        const expiryMs = Date.now() + (data.expires_in ?? 3600) * 1000
        const refresh = data.refresh_token ?? ''
        const profile = await getCurrentUserProfile(data.access_token)
        let email: string = profile.email ?? ''
        if (!email) email = (await getEmailFromPrimaryCalendar(data.access_token)) ?? ''
        if (!email) email = 'unknown'

        const accounts = ensureAccountsMigrated()
        const existingIdx = accounts.findIndex((a) => a.email === email)
        const storedRefresh =
          refresh ||
          (existingIdx >= 0 ? decryptRefreshToken(accounts[existingIdx].refreshToken) ?? '' : '')
        if (!storedRefresh) {
          res.writeHead(200, headers)
          res.end(
            '<script>window.close()</script><p>No refresh token. Sign out that account in the app and sign in again with "consent" to get a refresh token.</p>'
          )
          doResolve({ success: false, error: 'No refresh token received' })
          return
        }
        const newAccount: StoredAccount = {
          email,
          picture: profile.picture ?? undefined,
          refreshToken: encryptOrEncode(storedRefresh),
          accessToken: data.access_token,
          expiry: expiryMs,
        }
        if (existingIdx >= 0) {
          accounts[existingIdx] = newAccount
        } else {
          accounts.push(newAccount)
        }
        tokenStore.set('accounts', accounts)

        res.writeHead(200, headers)
        res.end(
          '<script>window.close()</script><p>Signed in successfully. You can close this tab.</p>'
        )
        doResolve({ success: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        res.writeHead(200, headers)
        res.end(
          `<script>window.close()</script><p>Error: ${message}. You can close this tab.</p>`
        )
        doResolve({ success: false, error: message })
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = addr && typeof addr === 'object' && addr.port ? addr.port : 0
      callbackPort = port
      if (port === 0) {
        doResolve({ success: false, error: 'Could not bind callback port' })
        return
      }
      timeoutId = setTimeout(() => {
        doResolve({ success: false, error: 'Sign in cancelled or timed out' })
      }, SIGNIN_TIMEOUT_MS)
      const redirectUri = `http://127.0.0.1:${port}${REDIRECT_PATH}`
      const authUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({
          client_id: googleClientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: SCOPES,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          access_type: 'offline',
          prompt: 'consent',
        }).toString()
      shell.openExternal(authUrl)
    })
  })
}

/** Remove one account by email, or all if email not provided. */
export function signOut(email?: string): void {
  const accounts = ensureAccountsMigrated()
  if (email) {
    const next = accounts.filter((a) => a.email !== email)
    tokenStore.set('accounts', next)
  } else {
    tokenStore.set('accounts', [])
  }
}
