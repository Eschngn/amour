const { post } = require('./request')

const TOKEN_KEY = 'amour_token'
const USERNAME_KEY = 'amour_username'
const DISPLAY_NAME_KEY = 'amour_display_name'
const AVATAR_KEY = 'amour_avatar'
const PASSWORD_SET_KEY = 'amour_password_set'
const PERMISSIONS_KEY = 'amour_permissions'
const VALIDATION_CACHE_MS = 30000

let loginPromise = null
let lastValidatedAt = 0

function readString(key) {
  const value = wx.getStorageSync(key)
  return typeof value === 'string' ? value.trim() : ''
}

function getStoredAuth() {
  const permissions = wx.getStorageSync(PERMISSIONS_KEY)
  return {
    token: readString(TOKEN_KEY),
    username: readString(USERNAME_KEY),
    displayName: readString(DISPLAY_NAME_KEY),
    avatar: readString(AVATAR_KEY),
    passwordSet: wx.getStorageSync(PASSWORD_SET_KEY) === true,
    permissions: Array.isArray(permissions) ? permissions.filter(item => typeof item === 'string') : [],
  }
}

function saveAuth(auth) {
  wx.setStorageSync(TOKEN_KEY, auth.token || '')
  wx.setStorageSync(USERNAME_KEY, auth.username || '')
  wx.setStorageSync(DISPLAY_NAME_KEY, auth.displayName || '')
  wx.setStorageSync(AVATAR_KEY, auth.avatar || '')
  wx.setStorageSync(PASSWORD_SET_KEY, Boolean(auth.passwordSet))
  wx.setStorageSync(PERMISSIONS_KEY, Array.isArray(auth.permissions) ? auth.permissions : [])
  return getStoredAuth()
}

function updateStoredProfile(profile = {}) {
  const current = getStoredAuth()
  return saveAuth({
    token: current.token,
    username: typeof profile.username === 'string' ? profile.username : current.username,
    displayName: typeof profile.displayName === 'string' ? profile.displayName : current.displayName,
    avatar: typeof profile.avatar === 'string' ? profile.avatar : current.avatar,
    passwordSet: typeof profile.passwordSet === 'boolean' ? profile.passwordSet : current.passwordSet,
    permissions: Array.isArray(profile.permissions) ? profile.permissions : current.permissions,
  })
}

function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(USERNAME_KEY)
  wx.removeStorageSync(DISPLAY_NAME_KEY)
  wx.removeStorageSync(AVATAR_KEY)
  wx.removeStorageSync(PASSWORD_SET_KEY)
  wx.removeStorageSync(PERMISSIONS_KEY)
  lastValidatedAt = 0
  const app = typeof getApp === 'function' ? getApp() : null
  if (app && app.globalData) {
    app.globalData.auth = undefined
    app.globalData.authReady = undefined
  }
}

function getWechatCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(result) {
        if (result.code) {
          resolve(result.code)
          return
        }
        reject(new Error('未获取到微信登录凭证'))
      },
      fail(error) {
        reject(new Error(error.errMsg || '微信登录调用失败'))
      },
    })
  })
}

function isUnauthorized(error) {
  return error && (error.statusCode === 401 || error.errorCode === '20002')
}

async function exchangeWechatCode() {
  clearAuth()
  const code = await getWechatCode()
  const result = await post('/login/wechat', { code })
  if (!result || typeof result.token !== 'string' || !result.token.trim()) {
    throw new Error('服务端未返回登录凭证')
  }
  const auth = saveAuth({
    token: result.token.trim(),
    username: typeof result.username === 'string' ? result.username.trim() : '',
    displayName: typeof result.displayName === 'string' ? result.displayName.trim() : '',
    avatar: typeof result.avatar === 'string' ? result.avatar.trim() : '',
    passwordSet: result.passwordSet === true,
    permissions: Array.isArray(result.permissions) ? result.permissions : [],
  })
  lastValidatedAt = Date.now()
  return auth
}

async function validateStoredAuth(storedAuth) {
  try {
    const profile = await post('/user/profile')
    const auth = saveAuth({
      token: storedAuth.token,
      username: profile && typeof profile.username === 'string' ? profile.username.trim() : '',
      displayName: profile && typeof profile.displayName === 'string' ? profile.displayName.trim() : '',
      avatar: profile && typeof profile.avatar === 'string' ? profile.avatar.trim() : '',
      passwordSet: Boolean(profile && profile.passwordSet),
      permissions: Array.isArray(profile && profile.permissions) ? profile.permissions : storedAuth.permissions,
    })
    lastValidatedAt = Date.now()
    return auth
  } catch (error) {
    if (isUnauthorized(error)) {
      clearAuth()
      return exchangeWechatCode()
    }
    throw error
  }
}

function ensureWechatLogin(options = {}) {
  if (loginPromise) return loginPromise

  const force = Boolean(options.force)
  const forceValidation = Boolean(options.forceValidation)
  const storedAuth = getStoredAuth()
  if (!force && !forceValidation && storedAuth.token && Date.now() - lastValidatedAt < VALIDATION_CACHE_MS) {
    return Promise.resolve(storedAuth)
  }
  loginPromise = force || !storedAuth.token
    ? exchangeWechatCode()
    : validateStoredAuth(storedAuth)

  loginPromise = loginPromise.then(
    result => {
      loginPromise = null
      return result
    },
    error => {
      loginPromise = null
      throw error
    },
  )
  return loginPromise
}

function hasFrontendQueryPermission(module) {
  const auth = getStoredAuth()
  return !auth.token || auth.permissions.includes(`frontend:${module}:query`)
}

async function logoutWechat() {
  let logoutError = null
  try {
    if (getStoredAuth().token) await post('/login/logout')
  } catch (error) {
    logoutError = error
  } finally {
    clearAuth()
  }
  if (logoutError) throw logoutError
}

module.exports = {
  clearAuth,
  ensureWechatLogin,
  getStoredAuth,
  logoutWechat,
  updateStoredProfile,
  hasFrontendQueryPermission,
}
