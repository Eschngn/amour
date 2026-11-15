import { ref } from 'vue'
import {
  AUTH_STORAGE_MODE,
  pickAuthStorage,
  resolveAuthStorageMode,
} from './authStorage.js'

/**
 * 前台登录态。
 *
 * 开发环境默认按标签页隔离（sessionStorage）：同一浏览器打开多个标签页，
 * 可以分别登录不同账号，登录态、权限与展示资料互不影响。
 * 生产构建默认沿用 localStorage 的跨标签页共享登录；如需强制切换存储方式，
 * 设置 VITE_FRONTEND_AUTH_STORAGE=session 或 local。
 */

const FRONTEND_TOKEN_KEY = 'amour_token'
const FRONTEND_USERNAME_KEY = 'amour_username'
const FRONTEND_DISPLAY_NAME_KEY = 'amour_display_name'
const FRONTEND_AVATAR_KEY = 'amour_avatar'
const FRONTEND_PERMISSIONS_KEY = 'amour_permissions'

const isDev = Boolean(import.meta.env && import.meta.env.DEV)
const configuredStorage = import.meta.env && import.meta.env.VITE_FRONTEND_AUTH_STORAGE
const authStorageMode = resolveAuthStorageMode(isDev, configuredStorage)

/** 当前是否按标签页隔离登录态。跨窗口同步只应在共享模式下启用。 */
export const isFrontendAuthTabScoped = authStorageMode === AUTH_STORAGE_MODE.SESSION

function getAuthStorage() {
  if (typeof window === 'undefined') return null
  try {
    return pickAuthStorage(authStorageMode, {
      local: window.localStorage,
      session: window.sessionStorage,
    })
  } catch {
    // 浏览器禁用存储时返回 null，由调用方按未登录处理。
    return null
  }
}

function readValue(key) {
  try {
    return getAuthStorage()?.getItem(key) || ''
  } catch {
    return ''
  }
}

function writeValue(key, value) {
  try {
    const storage = getAuthStorage()
    if (!storage) return false
    storage.setItem(key, value)
    return true
  } catch {
    // 存储不可用时静默忽略，避免阻断登录请求本身。
    return false
  }
}

function removeValue(key) {
  try {
    getAuthStorage()?.removeItem(key)
  } catch {
    // 忽略存储异常。
  }
}

function readToken() {
  return readValue(FRONTEND_TOKEN_KEY)
}

function readPermissions() {
  try {
    const value = JSON.parse(readValue(FRONTEND_PERMISSIONS_KEY) || '[]')
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
  return readValue(FRONTEND_USERNAME_KEY)
}

export const frontendUsername = ref(readUsername())
export const frontendDisplayName = ref(readValue(FRONTEND_DISPLAY_NAME_KEY))
export const frontendAvatar = ref(readValue(FRONTEND_AVATAR_KEY))
export const frontendLoggedIn = ref(!!readToken())

export function getFrontendToken() {
  return readToken()
}

export function setFrontendToken(token) {
  if (typeof token === 'string' && token.length > 0) {
    writeValue(FRONTEND_TOKEN_KEY, token)
    // 以实际可读取到的 token 为准，避免存储失败时误显示为已登录。
    frontendLoggedIn.value = readToken().length > 0
  }
}

export function setFrontendPermissions(permissions) {
  const value = Array.isArray(permissions) ? permissions.filter(item => typeof item === 'string') : []
  writeValue(FRONTEND_PERMISSIONS_KEY, JSON.stringify(value))
  frontendPermissions.value = value
}

export function getFrontendUsername() {
  return readUsername()
}

export function setFrontendUsername(username) {
  if (typeof username === 'string' && username.length > 0) {
    writeValue(FRONTEND_USERNAME_KEY, username)
    frontendUsername.value = username
  }
}

export function setFrontendProfile(profile = {}) {
  setFrontendUsername(profile.username)
  setFrontendPermissions(profile.permissions)
  const displayName = typeof profile.displayName === 'string' ? profile.displayName : ''
  writeValue(FRONTEND_DISPLAY_NAME_KEY, displayName)
  frontendDisplayName.value = displayName
  setFrontendAvatar(profile.avatar)
}

export function setFrontendAvatar(avatar) {
  const value = typeof avatar === 'string' ? avatar : ''
  writeValue(FRONTEND_AVATAR_KEY, value)
  frontendAvatar.value = value
}

export function isFrontendAuthenticated() {
  return getFrontendToken().length > 0
}

export function clearFrontendSession() {
  removeValue(FRONTEND_TOKEN_KEY)
  removeValue(FRONTEND_USERNAME_KEY)
  removeValue(FRONTEND_DISPLAY_NAME_KEY)
  removeValue(FRONTEND_AVATAR_KEY)
  removeValue(FRONTEND_PERMISSIONS_KEY)
  frontendLoggedIn.value = false
  frontendPermissions.value = []
  frontendUsername.value = ''
  frontendDisplayName.value = ''
  frontendAvatar.value = ''
}

/* 共享存储模式下才需要跨窗口同步；按标签页隔离时各窗口互不影响。 */
if (typeof window !== 'undefined' && !isFrontendAuthTabScoped) {
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
}
