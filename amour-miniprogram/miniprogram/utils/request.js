// 微信小程序 envVersion：develop 开发版，trial 体验版，release 正式版。
// trial/release 使用已配置 HTTPS 和小程序 request 合法域名的服务地址。
const API_BASE_URLS = {
  develop: 'http://192.168.7.8:8080',
  trial: 'https://www.chengliuxiang.top/api',
  release: 'https://www.chengliuxiang.top/api',
}

function getWechatEnvVersion() {
  try {
    const accountInfo = wx.getAccountInfoSync()
    const envVersion = accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion
    if (envVersion && API_BASE_URLS[envVersion]) return envVersion
  } catch (error) {
    // 兼容旧版本基础库或非微信运行环境，回退到正式环境。
  }
  return 'release'
}

function getDefaultApiBaseUrl() {
  return API_BASE_URLS[getWechatEnvVersion()]
}

class ApiError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.errorCode = errorCode || ''
  }
}

function clearStoredAuth() {
  // 认证模块负责同时清理 token、用户资料和校验缓存。
  // 使用延迟 require 避免 request.js 与 auth.js 初始化时互相依赖。
  const auth = require('./auth')
  if (auth && typeof auth.clearAuth === 'function') {
    auth.clearAuth()
    return
  }
  wx.removeStorageSync('amour_token')
  wx.removeStorageSync('amour_username')
  wx.removeStorageSync('amour_display_name')
  wx.removeStorageSync('amour_avatar')
  wx.removeStorageSync('amour_password_set')
}

function getApiBaseUrl() {
  const envVersion = getWechatEnvVersion()
  // 仅开发版允许通过缓存临时切换到本机或局域网服务，避免污染体验版/正式版。
  if (envVersion === 'develop') {
    const storedBaseUrl = wx.getStorageSync('apiBaseUrl')
    if (typeof storedBaseUrl === 'string' && storedBaseUrl.trim()) {
      return storedBaseUrl.trim().replace(/\/$/, '')
    }
  }
  return API_BASE_URLS[envVersion]
}

function parseResponseBody(data) {
  if (typeof data !== 'string') return data
  try {
    return JSON.parse(data)
  } catch (error) {
    return null
  }
}

function post(path, data = {}) {
  return new Promise((resolve, reject) => {
    const header = { 'content-type': 'application/json' }
    const token = wx.getStorageSync('amour_token')
    if (typeof token === 'string' && token.trim()) {
      const normalizedToken = token.trim()
      header.Authorization = /^bearer\s+/i.test(normalizedToken)
        ? normalizedToken
        : `Bearer ${normalizedToken}`
    }
    wx.request({
      url: `${getApiBaseUrl()}${path}`,
      method: 'POST',
      data,
      timeout: 10000,
      header,
      success(response) {
        const body = response.data
        if (response.statusCode >= 200 && response.statusCode < 300 && body && body.success) {
          resolve(body.data)
          return
        }
        const errorCode = body && body.errorCode
        if (response.statusCode === 401 || errorCode === '20002') clearStoredAuth()
        reject(new ApiError(
          (body && body.message) || `请求失败（${response.statusCode}）`,
          response.statusCode,
          errorCode,
        ))
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络请求失败'))
      },
    })
  })
}

function uploadFile(path, filePath, name = 'file') {
  return new Promise((resolve, reject) => {
    const header = {}
    const token = wx.getStorageSync('amour_token')
    if (typeof token === 'string' && token.trim()) {
      const normalizedToken = token.trim()
      header.Authorization = /^bearer\s+/i.test(normalizedToken)
        ? normalizedToken
        : `Bearer ${normalizedToken}`
    }
    wx.uploadFile({
      url: `${getApiBaseUrl()}${path}`,
      filePath,
      name,
      header,
      success(response) {
        const body = parseResponseBody(response.data)
        if (response.statusCode >= 200 && response.statusCode < 300 && body && body.success) {
          resolve(body.data)
          return
        }
        const errorCode = body && body.errorCode
        if (response.statusCode === 401 || errorCode === '20002') clearStoredAuth()
        reject(new ApiError(
          (body && body.message) || `请求失败（${response.statusCode}）`,
          response.statusCode,
          errorCode,
        ))
      },
      fail(error) {
        reject(new Error(error.errMsg || '头像上传失败'))
      },
    })
  })
}

module.exports = { ApiError, post, uploadFile }
