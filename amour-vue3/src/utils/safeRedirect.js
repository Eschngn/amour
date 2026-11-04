/**
 * 登录回跳地址的安全校验。
 *
 * 只允许站内绝对路径，拒绝协议相对地址（`//evil.com`）、反斜杠变体、
 * 后台入口与登录页自身，避免开放重定向。
 */

export const DEFAULT_REDIRECT = '/'

/** 允许回跳但需要拒绝的前缀：后台入口与登录页（避免循环）。 */
const BLOCKED_PREFIXES = ['/admin', '/login']

/**
 * 校验并返回安全的站内跳转地址。
 *
 * @param {unknown} raw 未校验的 redirect 参数
 * @param {string} [fallback] 校验失败时的兜底地址
 * @returns {string} 安全的站内路径，可能包含查询串
 */
export function resolveSafeRedirect(raw, fallback = DEFAULT_REDIRECT) {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  // `//host` 是协议相对地址，浏览器会把它当成外站。
  if (value.startsWith('//')) return fallback
  // 反斜杠会被部分浏览器归一化成 `/`，形成 `/\evil.com` 这种绕过。
  if (value.includes('\\')) return fallback
  // 控制字符与空白可能被代理或浏览器重新解释。
  if (/[\u0000-\u001F\u007F\s]/.test(value)) return fallback

  // 解码后再检查一次，防止 %2F%2F 之类的编码绕过。
  let decoded
  try {
    decoded = decodeURIComponent(value)
  } catch {
    // 非法百分号编码：无法判断真实指向，直接拒绝。
    return fallback
  }
  if (decoded.startsWith('//') || decoded.includes('\\')) return fallback
  if (isBlockedPath(decoded)) return fallback

  return value
}

function isBlockedPath(path) {
  return BLOCKED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`),
  )
}
