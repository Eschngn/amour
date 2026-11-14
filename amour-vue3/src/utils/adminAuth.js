/** 登录成功后由后端返回的 token，仅存 sessionStorage（关闭标签页即失效） */
export const ADMIN_TOKEN_KEY = 'amour_admin_token'

/** 当前管理员权限键缓存；仅用于菜单/按钮显隐，不作为授权边界 */
const ADMIN_PERMISSIONS_KEY = 'amour_admin_permissions'
const ADMIN_PERMISSIONS_LOADED_KEY = 'amour_admin_permissions_loaded'

/** 兼容旧版「假登录」标记，清除会话时一并删掉 */
const LEGACY_SESSION_KEY = 'amour_admin_ok'

/**
 * 后台权限标识。必须与后端 AdminPermissionConstants 和初始化 SQL 保持一致。
 */
export const ADMIN_PERMISSIONS = Object.freeze({
  DASHBOARD_QUERY: 'admin:dashboard:query',
  SPACE_QUERY: 'admin:space:query',
  SPACE_RESTORE: 'admin:space:restore',
  SPACE_REVIEW_QUERY: 'admin:space-review:query',
  SPACE_REVIEW_PROCESS: 'admin:space-review:process',
  CONTENT_QUERY: 'admin:content:query',
  CONTENT_CROSS_SPACE: 'admin:content:cross-space',
  CONTENT_MODERATE: 'admin:content:moderate',
  CONTENT_DELETE: 'admin:content:delete',
  USER_QUERY: 'admin:user:query',
  USER_UPDATE: 'admin:user:update',
  USER_DISABLE: 'admin:user:disable',
  AUDIT_QUERY: 'admin:audit:query',
  DICT_QUERY: 'admin:dict:query',
  DICT_UPDATE: 'admin:dict:update',
  DICT_DELETE: 'admin:dict:delete',
})

export function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export function setAdminToken(token) {
  if (typeof token === 'string' && token.length > 0) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
  }
}

export function getAdminPermissions() {
  try {
    const value = JSON.parse(sessionStorage.getItem(ADMIN_PERMISSIONS_KEY) || '[]')
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function setAdminPermissions(permissions) {
  const value = Array.isArray(permissions) ? permissions.filter(item => typeof item === 'string') : []
  sessionStorage.setItem(ADMIN_PERMISSIONS_KEY, JSON.stringify(value))
  sessionStorage.setItem(ADMIN_PERMISSIONS_LOADED_KEY, '1')
}

export function hasAdminPermissionsLoaded() {
  return sessionStorage.getItem(ADMIN_PERMISSIONS_LOADED_KEY) === '1'
}

export function hasAdminPermission(permissionKey) {
  if (!permissionKey) return true
  return getAdminPermissions().includes(permissionKey)
}

export function hasAnyAdminPermission(permissionKeys) {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) return true
  const permissions = getAdminPermissions()
  return permissionKeys.some(key => permissions.includes(key))
}

export function isAdminAuthenticated() {
  return getAdminToken().length > 0
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_PERMISSIONS_KEY)
  sessionStorage.removeItem(ADMIN_PERMISSIONS_LOADED_KEY)
  sessionStorage.removeItem(LEGACY_SESSION_KEY)
}

/**
 * 登录成功后的安全跳转路径（防止 open redirect）。
 */
export function sanitizeAdminRedirect(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    return '/admin/dashboard'
  }
  if (!raw.startsWith('/admin')) {
    return '/admin/dashboard'
  }
  if (raw === '/admin' || raw.startsWith('/admin/login')) {
    return '/admin/dashboard'
  }
  return raw
}

/**
 * 按权限选择第一个可进入的后台入口，避免无权限管理员卡在空白页。
 */
export function resolveAdminEntryPath() {
  const candidates = [
    { path: '/admin/dashboard', permission: ADMIN_PERMISSIONS.DASHBOARD_QUERY },
    { path: '/admin/space', permission: ADMIN_PERMISSIONS.SPACE_QUERY },
    { path: '/admin/space-review', permission: ADMIN_PERMISSIONS.SPACE_REVIEW_QUERY },
    { path: '/admin/story', permission: ADMIN_PERMISSIONS.CONTENT_QUERY },
    { path: '/admin/user', permission: ADMIN_PERMISSIONS.USER_QUERY },
    { path: '/admin/audit', permission: ADMIN_PERMISSIONS.AUDIT_QUERY },
    { path: '/admin/dict', permission: ADMIN_PERMISSIONS.DICT_QUERY },
  ]
  const allowed = candidates.find(item => hasAdminPermission(item.permission))
  return allowed ? allowed.path : '/admin/login'
}
