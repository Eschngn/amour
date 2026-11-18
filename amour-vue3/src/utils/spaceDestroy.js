/**
 * 情侣空间「销毁并清空」的文案与交互约定。
 *
 * 这里只做纯函数拼接，便于在 node:test 中验证：
 * - 确认弹窗必须明确告知「双方都不可见」「用户侧不能自行恢复」「只有管理员可协助恢复」；
 * - 二次确认需要输入固定文案，降低误触风险；
 * - 服务端拒绝（例如另一半已加入）时必须给出可理解的提示，不能静默失败。
 */

/** 销毁确认弹窗需要用户逐字输入的文案。 */
export const DESTROY_CONFIRM_KEYWORD = '销毁'

/** 后端业务错误码（与 ResponseCodeEnum 保持一致）。 */
export const DESTROY_ERROR_CODE = Object.freeze({
  NOT_CREATOR: '20093',
  PARTNER_JOINED: '20094',
  STATUS_NOT_ALLOWED: '20095',
  DESTROYED: '20096',
  NOT_MEMBER: '20034',
  MEMBERSHIP_CONFLICT: '20089',
})

function spaceLabel(space = {}) {
  const name = String(space.spaceName || '').trim()
  if (name) return name
  const code = String(space.spaceCode || '').trim()
  if (code) return code
  return space.spaceId ? `ID ${space.spaceId}` : '该情侣空间'
}

/**
 * 销毁确认弹窗正文。
 *
 * 必须逐条说明后果，避免用户误以为是「退出登录」或「暂时隐藏」。
 *
 * @param {{ spaceName?: string, spaceCode?: string, spaceId?: number }} space SpaceStatusVO
 * @returns {string}
 */
export function buildDestroyPromptMessage(space = {}) {
  return [
    `确定销毁并清空“${spaceLabel(space)}”吗？`,
    '销毁后：',
    '· 空间及其全部内容（故事、照片、纪念日、留言）将对你和另一半都不可见；',
    '· 你和其他普通用户都无法自行恢复，也不能再用这个空间；',
    '· 系统会保留完整留档，只有平台管理员可以协助恢复；',
    '· 如果另一半已经加入，系统会拒绝销毁。',
    '这是不可逆的用户侧操作，请谨慎确认。',
  ].join('\n')
}

/**
 * 销毁二次确认的输入校验：必须逐字输入 {@link DESTROY_CONFIRM_KEYWORD}。
 *
 * @param {string} value 用户输入
 * @returns {true|string} 通过返回 true，否则返回错误提示
 */
export function validateDestroyConfirmInput(value) {
  const text = String(value || '').trim()
  if (!text) return `请输入“${DESTROY_CONFIRM_KEYWORD}”以确认`
  if (text !== DESTROY_CONFIRM_KEYWORD) return `请准确输入“${DESTROY_CONFIRM_KEYWORD}”以确认`
  return true
}

/**
 * 读取后端业务错误码；兼容业务失败响应体与 Axios 异常两种来源。
 */
export function readDestroyErrorCode(responseBody, error) {
  const fromBody = responseBody && typeof responseBody === 'object' ? responseBody.errorCode : ''
  if (fromBody != null && String(fromBody) !== '') return String(fromBody)
  const fromError = error?.response?.data?.errorCode
  if (fromError != null && String(fromError) !== '') return String(fromError)
  return ''
}

/**
 * 销毁失败提示。
 *
 * 服务端返回的 message 已经是面向用户的中文说明，优先使用；网络异常才回退到默认文案。
 *
 * @param {object|null} responseBody 业务失败响应体
 * @param {object|null} [error] Axios 异常
 * @param {string} [fallback]
 * @returns {string}
 */
export function buildDestroyErrorMessage(responseBody, error, fallback = '销毁失败，请稍后重试') {
  const code = readDestroyErrorCode(responseBody, error)
  if (code === DESTROY_ERROR_CODE.PARTNER_JOINED) {
    return '另一半已经加入这个情侣空间，无法销毁。任何一方都可以发起解绑申请。'
  }
  if (code === DESTROY_ERROR_CODE.NOT_CREATOR) {
    return '只有空间创建者才能销毁情侣空间。'
  }
  if (code === DESTROY_ERROR_CODE.STATUS_NOT_ALLOWED) {
    return '当前空间状态不允许销毁，请刷新空间状态后再试。'
  }
  if (code === DESTROY_ERROR_CODE.DESTROYED) {
    return '这个情侣空间已被销毁，只有平台管理员可以协助恢复。'
  }
  const message = responseBody?.message || error?.response?.data?.message
  if (typeof message === 'string' && message.trim()) return message.trim()
  return fallback
}

/**
 * 服务端是否以「状态已过期」为由拒绝销毁。
 *
 * 这类结果必须触发强制刷新，让页面与服务器保持一致；不能只依赖入口隐藏。
 */
export function isDestroyStateConflict(responseBody, error) {
  const code = readDestroyErrorCode(responseBody, error)
  return code === DESTROY_ERROR_CODE.PARTNER_JOINED
    || code === DESTROY_ERROR_CODE.STATUS_NOT_ALLOWED
    || code === DESTROY_ERROR_CODE.NOT_CREATOR
}

/**
 * 销毁成功后需要清理的本地缓存键前缀。
 *
 * 当前 Web 端不持久化空间对象，只有「解绑提醒已读」这类本地偏好；
 * 销毁后这些偏好都失效，必须一起清理，避免下个空间沿用到旧状态。
 */
export const DESTROY_LOCAL_STORAGE_KEYS = Object.freeze([
  'amour_space_unbind_prompt_dismissed',
])

/**
 * 清理与情侣空间相关的本地缓存。
 *
 * 只删除已知的空间偏好键，不调用 localStorage.clear()，避免误删登录态等其它数据。
 *
 * @param {Storage|null} [storage] 默认使用 window.localStorage
 * @returns {string[]} 实际删除的键
 */
export function clearSpaceLocalCache(storage) {
  const target = storage || (typeof window !== 'undefined' ? window.localStorage : null)
  if (!target) return []
  const removed = []
  for (const key of DESTROY_LOCAL_STORAGE_KEYS) {
    try {
      if (target.getItem(key) !== null) {
        target.removeItem(key)
        removed.push(key)
      }
    } catch {
      // 存储不可用时静默忽略：本地缓存清理失败不应阻断销毁后的跳转。
    }
  }
  return removed
}
