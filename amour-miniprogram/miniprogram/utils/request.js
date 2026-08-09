const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8080'

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
        reject(new Error((body && body.message) || `请求失败（${response.statusCode}）`))
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络请求失败'))
      },
    })
  })
}

module.exports = { post }
