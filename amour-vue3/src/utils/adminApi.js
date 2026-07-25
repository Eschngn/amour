import api from '@/axios'
import { setAdminToken } from '@/utils/adminAuth.js'
import { createEncryptedLoginPayload } from '@/utils/loginCrypto.js'

/**
 * 接口根地址。默认使用同源 /api，由开发环境的 Vite 或生产环境的 Nginx 代理。
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw !== 'string' || !raw.trim()) {
    return '/api'
  }
  return raw.trim().replace(/\/$/, '')
}

/** 默认已配置同源 /api 代理。 */
export function isApiReachableConfigured() {
  return getApiBaseUrl().length > 0
}

/**
 * 解析登录成功后的 token。
 * 后端格式：{ success: true, data: "uuid-string", message, errorCode }
 * 同时兼容：token / accessToken / data.token 等旧字段。
 */
function extractToken(payload) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }
  if (payload.success === true) {
    const d = payload.data
    if (typeof d === 'string' && d.trim()) {
      return d.trim()
    }
    if (d && typeof d === 'object') {
      const nested =
        d.token ?? d.accessToken ?? d.access_token
      if (typeof nested === 'string' && nested.trim()) {
        return nested.trim()
      }
    }
  }
  const flat =
    payload.token ??
    payload.accessToken ??
    payload.access_token
  if (typeof flat === 'string' && flat.trim()) {
    return flat.trim()
  }
  const fromDataObj =
    payload.data?.token ?? payload.data?.accessToken
  if (typeof fromDataObj === 'string' && fromDataObj.trim()) {
    return fromDataObj.trim()
  }
  return ''
}

function extractErrorMessage(err) {
  const d = err.response?.data
  if (d && typeof d === 'object') {
    const msg =
      d.message ??
      d.msg ??
      d.error ??
      (typeof d.errorCode === 'string' && d.errorCode ? `错误码：${d.errorCode}` : null)
    if (typeof msg === 'string' && msg.length) {
      return msg
    }
    if (d.success === false && typeof d.data === 'string' && d.data) {
      return d.data
    }
  }
  if (err.response?.status) {
    return `请求失败（HTTP ${err.response.status}）`
  }
  if (err.code === 'ECONNABORTED') {
    return '请求超时，请检查后端是否在运行（localhost:8080）'
  }
  if (err.message === 'Network Error') {
    return '网络错误：请确认后端已启动，且开发环境已配置 Vite 代理 /api → localhost:8080'
  }
  if (err instanceof Error && typeof err.message === 'string' && err.message.length) {
    return err.message
  }
  return '请求失败'
}

/**
 * 先获取一次性挑战，再 POST /admin/login；请求体中不包含明文密码。
 */
export async function adminLogin(username, password) {
  try {
    const payload = await createEncryptedLoginPayload(
      '/admin/login/challenge',
      username,
      password,
    )
    const { data } = await api.post('/admin/login', payload)
    if (data && data.success === false) {
      throw new Error(
        typeof data.message === 'string' && data.message
          ? data.message
          : '登录失败',
      )
    }
    const token = extractToken(data)
    if (!token) {
      throw new Error(
        '响应中未找到 token（期望 success 为 true 且 data 为 token 字符串）',
      )
    }
    setAdminToken(token)
    return data
  } catch (e) {
    throw new Error(extractErrorMessage(e))
  }
}

/**
 * 后台管理接口，自动带 Authorization（见 axios 拦截器）
 */
export function adminRequest(config) {
  return api.request(config)
}

/**
 * 近似 fetch API，便于后续迁移；返回 axios 响应对象
 */
export function adminFetch(path, options = {}) {
  const method = String(options.method || 'GET').toLowerCase()
  const config = {
    url: path,
    method,
  }
  if (options.headers) {
    config.headers = options.headers
  }
  if (options.body != null && options.body !== '') {
    if (typeof options.body === 'string') {
      try {
        config.data = JSON.parse(options.body)
      } catch {
        config.data = options.body
      }
    } else {
      config.data = options.body
    }
  }
  return api.request(config)
}
