/**
 * 前台登录态存储策略。
 *
 * 开发环境默认使用 sessionStorage：每个浏览器标签页拥有独立登录态，
 * 方便同一浏览器同时登录多个账号调试；生产构建默认沿用 localStorage，
 * 保持关闭标签页后仍可保持登录的既有行为。
 *
 * 可通过 VITE_FRONTEND_AUTH_STORAGE=session|local 显式覆盖。
 */

export const AUTH_STORAGE_MODE = Object.freeze({
  LOCAL: 'local',
  SESSION: 'session',
})

/**
 * @param {boolean} isDev 是否开发环境
 * @param {string} configured 显式配置值（VITE_FRONTEND_AUTH_STORAGE）
 */
export function resolveAuthStorageMode(isDev, configured) {
  const value = typeof configured === 'string' ? configured.trim().toLowerCase() : ''
  if (value === AUTH_STORAGE_MODE.SESSION) return AUTH_STORAGE_MODE.SESSION
  if (value === AUTH_STORAGE_MODE.LOCAL) return AUTH_STORAGE_MODE.LOCAL
  return isDev ? AUTH_STORAGE_MODE.SESSION : AUTH_STORAGE_MODE.LOCAL
}

/**
 * 按策略选择实际存储对象。
 * 标签页模式使用 sessionStorage，共享模式使用 localStorage。
 */
export function pickAuthStorage(mode, { local, session }) {
  return mode === AUTH_STORAGE_MODE.SESSION ? session : local
}
