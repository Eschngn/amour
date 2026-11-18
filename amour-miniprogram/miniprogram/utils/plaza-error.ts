/**
 * 恋爱广场错误映射（纯函数，无 wx 依赖）。
 *
 * 目标是把请求层 / 业务层的失败统一成页面可直接展示的结构，并明确区分：
 * - 网络失败、超时：可重试，不是登录失效；
 * - 空间已不公开 / 不存在：不可重试，详情页展示“已下架”；
 * - 其它业务错误：保留后端文案，可重试；
 * - 401 / 403：可能是登录态问题，但不等于空间下架，也不由广场主动跳登录。
 */

export interface PlazaError extends Error {
  /** 后端业务错误码，例如 20046；网络错误为空字符串 */
  errorCode: string
  /** HTTP 状态码；网络失败为 0 */
  statusCode: number
  /** 是否属于可以重试的错误 */
  retryable: boolean
  /** 空间已不公开 / 不存在 */
  unavailable: boolean
  /** 仅开发版展示的排查信息（实际尝试过的接口地址等） */
  detail?: string
}

/** 请求层可提供的最小错误信息。 */
export interface PlazaErrorInput {
  message?: string
  statusCode?: number
  errorCode?: string
  /** 连接失败时实际尝试过的接口地址 */
  attempts?: string[]
}

const NETWORK_MESSAGE = '网络连接不太稳定，请稍后重试'
const TIMEOUT_MESSAGE = '这次加载等得有点久，请稍后重试'

/**
 * 不可重试的不可见错误码：
 * - 空间级：不存在 / 未公开 / 冻结 / 归档 / 不可访问 / 已解绑；
 * - 内容级：公开故事不存在（含已删除、已改为私密、已下架，后端统一返回 20003）。
 * 重试这些错误没有意义，页面直接展示“已不可见 + 返回入口”。
 */
export const UNAVAILABLE_CODES = ['20032', '20046', '20047', '20048', '20049', '20058', '20003']

export function createPlazaError(message: string, options: {
  statusCode?: number
  errorCode?: string
  retryable?: boolean
  unavailable?: boolean
} = {}): PlazaError {
  const error = new Error(message) as PlazaError
  error.name = 'PlazaError'
  error.statusCode = options.statusCode || 0
  error.errorCode = options.errorCode || ''
  error.retryable = options.retryable !== false
  error.unavailable = Boolean(options.unavailable)
  return error
}

export function isPlazaError(error: unknown): error is PlazaError {
  return Boolean(error) && (error as Error).name === 'PlazaError'
}

/** 把任意请求失败转换成广场错误；fallback 为页面级兜底文案。 */
export function toPlazaError(input: unknown, fallback: string): PlazaError {
  if (isPlazaError(input)) return input

  const source = (input && typeof input === 'object' ? input : {}) as PlazaErrorInput
  const statusCode = Number(source.statusCode) || 0
  const errorCode = String(source.errorCode || '')
  const rawMessage = typeof source.message === 'string' ? source.message.trim() : ''
  const unavailable = UNAVAILABLE_CODES.indexOf(errorCode) !== -1
  const timeout = /timeout|超时/i.test(rawMessage)

  let message = rawMessage
  if (timeout) message = TIMEOUT_MESSAGE
  else if (statusCode === 0) message = NETWORK_MESSAGE
  else if (!rawMessage || /^请求失败/.test(rawMessage)) message = fallback
  else if (statusCode >= 500) message = fallback

  const error = createPlazaError(message, {
    statusCode,
    errorCode,
    // 明确的不可见空间重试没有意义；401/403 交给上层判断，不在这里当成空间下架。
    retryable: !unavailable,
    unavailable,
  })
  // 连不上后端、且目标里包含本机 / 局域网地址时，把尝试过的地址带上。
  // 正式环境只有一个公网域名，不会命中这个分支，避免把内部信息暴露给用户。
  if (statusCode === 0) {
    const localAttempts = (Array.isArray(source.attempts) ? source.attempts : []).filter(isLocalAddress)
    if (localAttempts.length) error.detail = `已尝试：${localAttempts.join('、')}`
  }
  return error
}

/** 判断是否为本地 / 内网地址：只有开发联调才会用到。 */
export function isLocalAddress(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const text = value.trim().toLowerCase()
  if (!text) return false
  return /^(https?:\/\/)?(localhost|127\.|\[::1\]|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(text)
}
