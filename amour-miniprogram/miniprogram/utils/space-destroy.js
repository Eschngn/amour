/**
 * 情侣空间「销毁并清空」的小程序端文案与纯逻辑。
 *
 * 与 Web 端保持同一套交互约定：
 * - 确认前必须说明「双方都不可见」「用户侧不能自行恢复」「只有管理员可协助恢复」；
 * - 二次确认要求逐字输入固定文案，降低误触；
 * - 服务端拒绝（例如另一半已加入）必须给出可理解提示，并强制刷新本地状态。
 *
 * 这里只做纯函数，便于在 node:test 中直接验证，不依赖 wx 运行时。
 */

/** 二次确认需要用户逐字输入的文案。 */
const DESTROY_CONFIRM_KEYWORD = '销毁'

/** 后端销毁相关业务错误码（与 ResponseCodeEnum 一致）。 */
const DESTROY_ERROR_CODE = {
  NOT_CREATOR: '20093',
  PARTNER_JOINED: '20094',
  STATUS_NOT_ALLOWED: '20095',
  DESTROYED: '20096',
  NOT_MEMBER: '20034',
  MEMBERSHIP_CONFLICT: '20089',
  /** 另一半曾加入过该空间（后又退出）：不能按「尚未加入」销毁。 */
  PARTNER_HISTORY: '20102',
  /** 请求携带的目标空间与服务端推导出的空间不一致：必须先刷新状态，不能继续销毁。 */
  TARGET_CHANGED: '20103',
}

function spaceLabel(space) {
  const source = space && typeof space === 'object' ? space : {}
  const name = String(source.spaceName || '').trim()
  if (name) return name
  const code = String(source.spaceCode || '').trim()
  if (code) return code
  return source.spaceId ? `ID ${source.spaceId}` : '该情侣空间'
}

/**
 * 销毁确认弹窗正文。
 *
 * @param {{ spaceName?: string, spaceCode?: string, spaceId?: number|string }|null} space
 * @returns {string}
 */
function buildDestroyPromptMessage(space) {
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
 * 二次确认输入校验：必须逐字输入「销毁」。
 *
 * @param {string} value
 * @returns {string} 空字符串表示通过，否则为可展示的错误提示
 */
function validateDestroyConfirmInput(value) {
  const text = String(value || '').trim()
  if (!text) return `请输入“${DESTROY_CONFIRM_KEYWORD}”以确认`
  if (text !== DESTROY_CONFIRM_KEYWORD) return `请准确输入“${DESTROY_CONFIRM_KEYWORD}”以确认`
  return ''
}

/**
 * 销毁失败提示。
 *
 * 服务端 message 已经是面向用户的中文说明，优先使用；网络异常才回退默认文案。
 *
 * @param {object|null} error 请求层错误（ApiError 含 errorCode / message）
 * @param {string} [fallback]
 * @returns {string}
 */
function buildDestroyErrorMessage(error, fallback) {
  const defaultMessage = fallback || '销毁失败，请稍后重试'
  if (!error || typeof error !== 'object') return defaultMessage
  const code = String(error.errorCode || '')
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
  if (code === DESTROY_ERROR_CODE.PARTNER_HISTORY) {
    return '另一半曾经加入过这个情侣空间，不能按「对方尚未加入」的方式销毁；如确需解除关系，请使用解绑申请。'
  }
  if (code === DESTROY_ERROR_CODE.TARGET_CHANGED) {
    return '要销毁的情侣空间已经发生变化，请刷新空间状态后再确认。'
  }
  const message = typeof error.message === 'string' ? error.message.trim() : ''
  return message || defaultMessage
}

/**
 * 服务端是否以「状态已过期」为由拒绝销毁。这类结果必须强制刷新本地状态，
 * 不能只依赖入口隐藏来保证安全。
 *
 * 20102（另一半曾加入）、20103（目标空间已变化）同样说明本地空间状态已经过期：
 * 尤其是 20103，说明用户看到的空间已经不是服务端当前的当前空间，必须立即刷新。
 *
 * @param {object|null} error
 * @returns {boolean}
 */
function isDestroyStateConflict(error) {
  if (!error || typeof error !== 'object') return false
  const code = String(error.errorCode || '')
  return code === DESTROY_ERROR_CODE.PARTNER_JOINED
    || code === DESTROY_ERROR_CODE.STATUS_NOT_ALLOWED
    || code === DESTROY_ERROR_CODE.NOT_CREATOR
    || code === DESTROY_ERROR_CODE.PARTNER_HISTORY
    || code === DESTROY_ERROR_CODE.TARGET_CHANGED
}

/**
 * 销毁成功后需要清理的本地缓存键。
 *
 * 空间对象本身只存在内存（session-state），但相册详情等页面缓存会残留旧空间数据，
 * 必须一起清掉，避免重建页面时读到已销毁空间的内容。
 */
const DESTROY_LOCAL_STORAGE_KEYS = ['photoDetailCollection']

/**
 * 清理与情侣空间相关的本地缓存。
 *
 * 只删除已知键，不调用 wx.clearStorageSync()，避免误删登录态等其它数据。
 *
 * @returns {string[]} 实际尝试删除的键
 */
function clearSpaceLocalCache() {
  const removed = []
  DESTROY_LOCAL_STORAGE_KEYS.forEach((key) => {
    try {
      wx.removeStorageSync(key)
      removed.push(key)
    } catch (error) {
      // 缓存清理失败不影响销毁后的状态收敛与跳转。
    }
  })
  return removed
}

module.exports = {
  DESTROY_CONFIRM_KEYWORD,
  DESTROY_ERROR_CODE,
  DESTROY_LOCAL_STORAGE_KEYS,
  buildDestroyPromptMessage,
  validateDestroyConfirmInput,
  buildDestroyErrorMessage,
  isDestroyStateConflict,
  clearSpaceLocalCache,
}
