import { ref } from 'vue'

const FRONTEND_TOKEN_KEY = 'amour_token'
const FRONTEND_USERNAME_KEY = 'amour_username'
const FRONTEND_DISPLAY_NAME_KEY = 'amour_display_name'
const FRONTEND_AVATAR_KEY = 'amour_avatar'
const FRONTEND_PERMISSIONS_KEY = 'amour_permissions'

function readToken() {
  return localStorage.getItem(FRONTEND_TOKEN_KEY) || ''
}

function readPermissions() {
  try {
    const value = JSON.parse(localStorage.getItem(FRONTEND_PERMISSIONS_KEY) || '[]')
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
  } catch {
    return []
  }
}

export const frontendPermissions = ref(readPermissions())

export function hasFrontendQueryPermission(module) {
  return !frontendLoggedIn.value || frontendPermissions.value.includes(`frontend:${module}:query`)
}

function readUsername() {
  return localStorage.getItem(FRONTEND_USERNAME_KEY) || ''
}

export const frontendUsername = ref(readUsername())
export const frontendDisplayName = ref(localStorage.getItem(FRONTEND_DISPLAY_NAME_KEY) || '')
export const frontendAvatar = ref(localStorage.getItem(FRONTEND_AVATAR_KEY) || '')
export const frontendLoggedIn = ref(!!readToken())

export function getFrontendToken() {
  return readToken()
}

export function setFrontendToken(token) {
  if (typeof token === 'string' && token.length > 0) {
    localStorage.setItem(FRONTEND_TOKEN_KEY, token)
    frontendLoggedIn.value = true
  }
}

export function setFrontendPermissions(permissions) {
  const value = Array.isArray(permissions) ? permissions.filter(item => typeof item === 'string') : []
  localStorage.setItem(FRONTEND_PERMISSIONS_KEY, JSON.stringify(value))
  frontendPermissions.value = value
}

export function getFrontendUsername() {
  return readUsername()
}

export function setFrontendUsername(username) {
  if (typeof username === 'string' && username.length > 0) {
    localStorage.setItem(FRONTEND_USERNAME_KEY, username)
    frontendUsername.value = username
  }
}

export function setFrontendProfile(profile = {}) {
  setFrontendUsername(profile.username)
  setFrontendPermissions(profile.permissions)
  const displayName = typeof profile.displayName === 'string' ? profile.displayName : ''
  localStorage.setItem(FRONTEND_DISPLAY_NAME_KEY, displayName)
  frontendDisplayName.value = displayName
  setFrontendAvatar(profile.avatar)
}

export function setFrontendAvatar(avatar) {
  const value = typeof avatar === 'string' ? avatar : ''
  localStorage.setItem(FRONTEND_AVATAR_KEY, value)
  frontendAvatar.value = value
}

export function isFrontendAuthenticated() {
  return getFrontendToken().length > 0
}

export function clearFrontendSession() {
  localStorage.removeItem(FRONTEND_TOKEN_KEY)
  localStorage.removeItem(FRONTEND_USERNAME_KEY)
  localStorage.removeItem(FRONTEND_DISPLAY_NAME_KEY)
  localStorage.removeItem(FRONTEND_AVATAR_KEY)
  localStorage.removeItem(FRONTEND_PERMISSIONS_KEY)
  frontendLoggedIn.value = false
  frontendPermissions.value = []
  frontendUsername.value = ''
  frontendDisplayName.value = ''
  frontendAvatar.value = ''
}

/* 跨窗口同步：当其他窗口修改 localStorage 时，同步响应式状态 */
window.addEventListener('storage', (e) => {
  if (e.key === FRONTEND_TOKEN_KEY) {
    frontendLoggedIn.value = !!e.newValue
  }
  if (e.key === FRONTEND_USERNAME_KEY) {
    frontendUsername.value = e.newValue || ''
  }
  if (e.key === FRONTEND_DISPLAY_NAME_KEY) {
    frontendDisplayName.value = e.newValue || ''
  }
  if (e.key === FRONTEND_AVATAR_KEY) {
    frontendAvatar.value = e.newValue || ''
  }
})
