import axios from 'axios'
import { clearAdminSession, getAdminToken } from '@/utils/adminAuth.js'
import { clearFrontendSession, getFrontendToken } from '@/utils/auth.js'

/**
 * 默认统一请求同源 /api：
 * - 开发环境由 Vite 代理到 http://localhost:8080（见 vite.config.js）
 * - 生产环境由 Nginx 代理到后端服务
 *
 * 如需直连其他后端，可通过 VITE_API_BASE_URL 覆盖；跨域时后端需开启 CORS。
 */
function resolveBaseURL() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '')
  }
  return '/api'
}

const instance = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function isAdminRequest(config) {
  const url = typeof config?.url === 'string' ? config.url : ''
  return /^\/?admin(?:\/|$)/.test(url)
}

instance.interceptors.request.use((config) => {
  const token = isAdminRequest(config) ? getAdminToken() : getFrontendToken()
  if (token) {
    const t = token.trim()
    config.headers.Authorization = /^bearer\s+/i.test(t) ? t : `Bearer ${t}`
  }
  return config
})

function handleExpiredSession(config) {
  const adminRequest = isAdminRequest(config)
  if (adminRequest) {
    clearAdminSession()
  } else {
    clearFrontendSession()
  }
  if (typeof window !== 'undefined') {
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    )
    const loginPath = adminRequest ? '/admin/login' : '/login'
    const currentPath = window.location.pathname
    if (currentPath !== loginPath) {
      window.location.assign(`${loginPath}?expired=1&redirect=${next}`)
    }
  }
}

function isExpiredResponse(response) {
  return response?.status === 401 || response?.data?.errorCode === '20002'
}

instance.interceptors.response.use(
  (response) => {
    if (isExpiredResponse(response) && response.config?.headers?.Authorization) {
      handleExpiredSession(response.config)
    }
    return response
  },
  (error) => {
    if (isExpiredResponse(error.response) && error.config?.headers?.Authorization) {
      handleExpiredSession(error.config)
    }
    return Promise.reject(error)
  },
)

export default instance
