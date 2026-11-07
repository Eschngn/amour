/** 登录成功后由后端返回的 token，仅存 sessionStorage（关闭标签页即失效） */
export const ADMIN_TOKEN_KEY = 'amour_admin_token'

/** 兼容旧版「假登录」标记，清除会话时一并删掉 */
const LEGACY_SESSION_KEY = 'amour_admin_ok'

/**
 * 后台权限标识。
 *
 * 后台登录态仍沿用现有 AdminTokenFilter（平台管理员）校验；
 * 这些标识与权限初始化 SQL、路由 meta 保持一致，供权限树与后续细粒度校验复用。
 */
export const ADMIN_PERMISSIONS = Object.freeze({
  SPACE_QUERY: 'admin:space:query',
  SPACE_RESTORE: 'admin:space:restore',
})

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
