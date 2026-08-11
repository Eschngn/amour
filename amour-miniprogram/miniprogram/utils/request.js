const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8080'

class ApiError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.errorCode = errorCode || ''
  }
}

function clearStoredAuth() {
  wx.removeStorageSync('amour_token')
  wx.removeStorageSync('amour_username')
  wx.removeStorageSync('amour_display_name')
  wx.removeStorageSync('amour_avatar')
}

function getApiBaseUrl() {
  const storedBaseUrl = wx.getStorageSync('apiBaseUrl')
  if (typeof storedBaseUrl === 'string' && storedBaseUrl.trim()) {
    return storedBaseUrl.trim().replace(/\/$/, '')
  }
  return DEFAULT_API_BASE_URL
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

module.exports = { ApiError, post }
