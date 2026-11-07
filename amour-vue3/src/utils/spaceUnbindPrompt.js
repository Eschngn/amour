/**
 * 「另一半发起解绑申请」提醒弹窗的“以后不再提示”偏好。
 *
 * 只保存当前这一条解绑申请的哈希标识，不保存任何服务器内部 ID：
 * - 新的解绑申请会得到不同的标识，因此仍会再次提示；
 * - 旧申请被取消、拒绝或确认后，旧标识自然失效，不影响下一条申请；
 * - localStorage 不可用时静默降级为每次进入都提示。
 */

const STORAGE_KEY = 'amour_space_unbind_prompt_dismissed'

/** FNV-1a：仅用于生成稳定的本地去重标识，不做安全用途。 */
function hashPromptValue(value) {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

/**
 * 生成当前解绑申请的去重标识。
 *
 * 优先使用服务端返回的 unbindRequestId；旧服务端没有该字段时，
 * 退化为「申请时间 + 发起人恋语 ID」，两者都是页面可见的公开信息。
 *
 * @param {object|null} spaceStatus SpaceStatusVO
 * @returns {string} 空字符串表示当前没有可用于去重的申请
 */
export function buildUnbindPromptKey(spaceStatus) {
  if (!spaceStatus || typeof spaceStatus !== 'object') return ''
  const spaceId = spaceStatus.spaceId
  if (spaceId == null || spaceId === '') return ''

  if (spaceStatus.unbindRequestId != null && spaceStatus.unbindRequestId !== '') {
    return hashPromptValue(`space:${spaceId}:request:${spaceStatus.unbindRequestId}`)
  }

  const requestedAt = String(spaceStatus.unbindRequestedAt || '')
  if (!requestedAt) return ''
  const requesterAmourId = String(spaceStatus.unbindRequester?.amourId || '')
  return hashPromptValue(`space:${spaceId}:time:${requestedAt}:requester:${requesterAmourId}`)
}

function getStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/** 当前这条解绑申请是否已被用户选择“以后不再提示”。 */
export function isUnbindPromptDismissed(spaceStatus) {
  const key = buildUnbindPromptKey(spaceStatus)
  if (!key) return false
  const storage = getStorage()
  if (!storage) return false
  try {
    return storage.getItem(STORAGE_KEY) === key
  } catch {
    return false
  }
}

/** 记住当前解绑申请不再弹窗提示；返回是否写入成功。 */
export function dismissUnbindPrompt(spaceStatus) {
  const key = buildUnbindPromptKey(spaceStatus)
  if (!key) return false
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, key)
    return true
  } catch {
    return false
  }
}
