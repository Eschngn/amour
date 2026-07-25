/** 登录成功后由后端返回的 token，仅存 sessionStorage（关闭标签页即失效） */
export const ADMIN_TOKEN_KEY = 'amour_admin_token'

/** 兼容旧版「假登录」标记，清除会话时一并删掉 */
const LEGACY_SESSION_KEY = 'amour_admin_ok'

export function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export function setAdminToken(token) {
  if (typeof token === 'string' && token.length > 0) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
  }
}

export function isAdminAuthenticated() {
  return getAdminToken().length > 0
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  sessionStorage.removeItem(LEGACY_SESSION_KEY)
}

/**
 * 登录成功后的安全跳转路径（防止 open redirect）
 */
export function sanitizeAdminRedirect(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    return '/admin/story'
  }
  if (!raw.startsWith('/admin')) {
    return '/admin/story'
  }
  if (raw === '/admin' || raw.startsWith('/admin/login')) {
    return '/admin/story'
  }
  return raw
}
