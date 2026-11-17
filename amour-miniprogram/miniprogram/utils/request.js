// 微信小程序 envVersion：develop 开发版，trial 体验版，release 正式版。
// 接口地址与超时策略集中在 utils/api-config.js，本文件只负责发请求。
const {
  API_BASE_URL_STORAGE_KEY,
  PROD_API_BASE_URL,
  resolveBaseUrlCandidates,
  resolveRequestTimeout,
} = require('./api-config')

function getWechatEnvVersion() {
  try {
    const accountInfo = wx.getAccountInfoSync()
    const envVersion = accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion
    if (envVersion === 'develop' || envVersion === 'trial' || envVersion === 'release') return envVersion
  } catch (error) {
    // 兼容旧版本基础库或非微信运行环境，回退到正式环境。
  }
  return 'release'
}

/** 开发版读取本地缓存的地址覆盖（设置后需要重新进入页面）。 */
function readBaseUrlOverride(envVersion) {
  if (envVersion !== 'develop') return ''
  try {
    const stored = wx.getStorageSync(API_BASE_URL_STORAGE_KEY)
    return typeof stored === 'string' ? stored : ''
  } catch (error) {
    return ''
  }
}

/** 本次请求可用的接口地址列表；第一个是首选地址。 */
function getApiBaseUrlCandidates() {
  const envVersion = getWechatEnvVersion()
  return resolveBaseUrlCandidates({
    envVersion,
    override: readBaseUrlOverride(envVersion),
  })
}

function getApiBaseUrl() {
  return getApiBaseUrlCandidates()[0] || PROD_API_BASE_URL
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

function parseResponseBody(data) {
  if (typeof data !== 'string') return data
  try {
    return JSON.parse(data)
  } catch (error) {
    return null
  }
}

function buildAuthHeader() {
  const header = {}
  const token = wx.getStorageSync('amour_token')
  if (typeof token === 'string' && token.trim()) {
    const normalizedToken = token.trim()
    header.Authorization = /^bearer\s+/i.test(normalizedToken)
      ? normalizedToken
      : `Bearer ${normalizedToken}`
  }
  return header
}

/** 连接层面的失败（没拿到 HTTP 响应），值得换下一个候选地址重试。 */
function isRetryableTransportError(error) {
  const message = (error && (error.errMsg || error.message)) || ''
  // 4xx/5xx 已经拿到响应，不换地址；只有网络层失败才切换。
  return /request:fail|timeout|ERR_|网络/i.test(message)
}

/** 把 wx.request 的 fail 统一成 Error，附带目标地址方便排查。 */
function createTransportError(error, baseUrl) {
  const errMsg = (error && error.errMsg) || '网络请求失败'
  const wrapped = new Error(errMsg)
  wrapped.name = 'NetworkError'
  wrapped.baseUrl = baseUrl
  wrapped.isNetworkError = true
  return wrapped
}

/**
 * 依次尝试候选地址：
 * - 拿到 HTTP 响应（无论 2xx 还是 4xx/5xx）就停止切换，交给业务处理；
 * - 只有连接层失败才切下一个；
 * - 全部失败时抛最后一个错误，并附带实际尝试过的地址。
 */
function requestWithFallback(options) {
  const candidates = options.candidates
  const timeout = options.timeout
  const attempts = []

  return new Promise((resolve, reject) => {
    const tryAt = (index) => {
      if (index >= candidates.length) {
        const last = attempts[attempts.length - 1]
        const error = last ? last.error : new Error('没有可用的接口地址')
        error.attempts = attempts.map(item => item.baseUrl)
        reject(error)
        return
      }
      const baseUrl = candidates[index]
      wx.request({
        url: `${baseUrl}${options.path}`,
        method: options.method,
        data: options.data,
        timeout,
        header: options.header,
        success(response) {
          resolve({ response, baseUrl })
        },
        fail(error) {
          attempts.push({ baseUrl, error: createTransportError(error, baseUrl) })
          if (isRetryableTransportError(error) && index + 1 < candidates.length) {
            tryAt(index + 1)
            return
          }
          const transportError = attempts[attempts.length - 1].error
          transportError.attempts = attempts.map(item => item.baseUrl)
          reject(transportError)
        },
      })
    }
    tryAt(0)
  })
}

function handleResponse(response, baseUrl) {
  const body = response.data
  if (response.statusCode >= 200 && response.statusCode < 300 && body && body.success) {
    return body.data
  }
  const errorCode = body && body.errorCode
  if (response.statusCode === 401 || errorCode === '20002') clearStoredAuth()
  const error = new ApiError(
    (body && body.message) || `请求失败（${response.statusCode}）`,
    response.statusCode,
    errorCode,
  )
  error.baseUrl = baseUrl
  throw error
}

function post(path, data = {}) {
  const header = Object.assign({ 'content-type': 'application/json' }, buildAuthHeader())
  const envVersion = getWechatEnvVersion()
  return requestWithFallback({
    candidates: getApiBaseUrlCandidates(),
    path,
    method: 'POST',
    data,
    header,
    timeout: resolveRequestTimeout(envVersion),
  }).then(result => handleResponse(result.response, result.baseUrl))
}

function uploadFile(path, filePath, name = 'file') {
  // uploadFile 不支持自动切换候选地址（文件流不便重放），固定用首选地址。
  const header = buildAuthHeader()
  const baseUrl = getApiBaseUrl()
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${baseUrl}${path}`,
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
        reject(createTransportError({ errMsg: error && error.errMsg ? error.errMsg : '头像上传失败' }, baseUrl))
      },
    })
  })
}

module.exports = {
  ApiError,
  getApiBaseUrl,
  getApiBaseUrlCandidates,
  post,
  uploadFile,
}
