/**
 * 情侣空间状态相关的纯函数。
 *
 * 单独放在这里是为了让 viewMode、认证错误判断等规则可以脱离 Vue 运行时做单元测试。
 * 页面和 composable 应复用这里的规则，避免各页面自行判断 status。
 */

export const SPACE_STATUS = Object.freeze({
  WAITING: 0,
  NORMAL: 1,
  FROZEN: 2,
  ARCHIVED: 3,
  DELETING: 4,
  DELETED: 5,
})

export const SPACE_VIEW_MODE = Object.freeze({
  PLAZA: 'plaza',
  PRIVATE: 'private',
  UNAVAILABLE: 'unavailable',
})

/**
 * 是否拿到了一个真实的空间记录。
 * status=0/2/3 也属于“有空间”，但只有 status=1 才算可用。
 */
export function hasSpaceIdentity(spaceStatus) {
  return Boolean(spaceStatus && spaceStatus.spaceId != null && spaceStatus.spaceId !== '')
}

/** 只有存在 spaceId 且 status=1 时才认为空间可以正常使用。 */
export function isReadySpace(spaceStatus) {
  return hasSpaceIdentity(spaceStatus) && Number(spaceStatus.status) === SPACE_STATUS.NORMAL
}

/**
 * 统一推导页面展示模式：
 * - plaza：未登录，或登录后没有空间记录。
 * - private：已绑定且空间正常。
 * - unavailable：有空间记录，但处于等待绑定、冻结、归档或异常状态。
 *
 * 等待绑定（status=0）归入 unavailable，页面仍可读取 spaceStatus.status 显示等待提示。
 */
export function deriveSpaceViewMode(loggedIn, spaceStatus) {
  if (!loggedIn || !hasSpaceIdentity(spaceStatus)) {
    return SPACE_VIEW_MODE.PLAZA
  }
  return isReadySpace(spaceStatus)
    ? SPACE_VIEW_MODE.PRIVATE
    : SPACE_VIEW_MODE.UNAVAILABLE
}

/**
 * 只有明确的登录态失效才算 auth error。
 * 网络断开、超时、5xx 不能清空登录态或空间状态，避免把暂时断网误判为退出登录。
 */
export function isSpaceAuthError(error) {
  const status = error?.response?.status
  const errorCode = error?.response?.data?.errorCode
  return status === 401 || String(errorCode ?? '') === '20002'
}

/** 从 Axios 异常中提取可展示的信息，优先使用后端 message。 */
export function readSpaceErrorMessage(error, fallback = '情侣空间状态加载失败') {
  const message = error?.response?.data?.message
  if (typeof message === 'string' && message.trim()) return message.trim()
  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim()
  return fallback
}
