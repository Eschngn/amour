/**
 * 后台情侣空间人工恢复的文案与样式约定。
 *
 * 这里只做纯函数拼接，便于在 node:test 中验证：
 * - 弹窗必须携带后台专用 class，避免 scoped CSS 无法覆盖 append-to-body 的 MessageBox；
 * - 恢复前必须说明冲突空间的处理规则；
 * - 恢复成功后必须把被安全关闭的冲突空间告诉管理员。
 */

export const ADMIN_MESSAGE_BOX_CLASS = 'admin-message-box'

export const ADMIN_RESTORE_MESSAGE_BOX_CLASS = `${ADMIN_MESSAGE_BOX_CLASS} admin-space-restore-message-box`

function toCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

function spaceLabel(space = {}) {
  const name = String(space.spaceName || '').trim()
  if (name) return name
  const code = String(space.spaceCode || '').trim()
  if (code) return code
  return space.spaceId ? `ID ${space.spaceId}` : '该空间'
}

/**
 * 人工恢复确认弹窗正文。
 *
 * @param {{ spaceName?: string, spaceCode?: string, spaceId?: number,
 *           conflictSpaceCount?: number, autoClosableConflictSpaceCount?: number }} space
 * @returns {string}
 */
export function buildRestorePromptMessage(space = {}) {
  const lines = [
    `确定恢复“${spaceLabel(space)}”吗？`,
    '恢复后：',
    '· 空间回到正常且私密状态，由两名原成员共同使用，既有内容保留；',
    '· 空间不会自动重新公开到恋爱广场。',
  ]
  const autoCloseCount = toCount(space.autoClosableConflictSpaceCount)
  if (autoCloseCount > 0) {
    lines.push(`· 检测到 ${autoCloseCount} 个解绑后新建的未绑定空间，将一并安全关闭：成员退出、待处理邀请撤销，内容保留。`)
  } else {
    lines.push('· 若成员在解绑后创建了新的未绑定空间，该空间会被安全关闭（成员退出、邀请撤销，内容保留）。')
  }
  lines.push('· 若冲突空间已有其他有效成员，系统会拒绝恢复并提示先处理冲突。')
  lines.push('请填写恢复原因用于审计。')
  return lines.join('\n')
}

/**
 * 人工恢复成功提示。自动关闭了冲突空间时，必须把空间 ID 一并展示。
 *
 * @param {{ closedConflictSpaces?: Array<{ spaceId?: number, spaceName?: string }> } | null} payload
 * @returns {string}
 */
export function buildRestoreSuccessMessage(payload = null) {
  const closed = Array.isArray(payload?.closedConflictSpaces) ? payload.closedConflictSpaces : []
  if (!closed.length) {
    return '情侣空间已恢复为正常且私密状态'
  }
  const labels = closed
    .map(space => (space?.spaceId ? `ID ${space.spaceId}` : ''))
    .filter(Boolean)
    .join('、')
  const suffix = labels ? `（${labels}）` : ''
  return `情侣空间已恢复为正常且私密状态，并安全关闭 ${closed.length} 个冲突空间${suffix}`
}

/**
 * 把详情里的冲突空间区分为可自动关闭与需先处理两类，供 UI 展示。
 *
 * @param {Array<{ autoClosable?: boolean }>} conflictSpaces
 * @returns {{ autoClosable: Array, blocking: Array }}
 */
export function groupRestoreConflicts(conflictSpaces = []) {
  const list = Array.isArray(conflictSpaces) ? conflictSpaces : []
  return {
    autoClosable: list.filter(space => space?.autoClosable === true),
    blocking: list.filter(space => space?.autoClosable !== true),
  }
}

/**
 * 把「HTTP 200 + success=false」的业务失败包装成带 response 语义的异常。
 *
 * 后端 BusinessException 统一以 HTTP 200 + `{ success: false, errorCode, message }` 返回，
 * 页面如果只 throw 一个普通 Error，就会丢掉 errorCode，导致「冲突 / 状态已变化」这类
 * 必须重新拉取详情与列表的失败分支被跳过，继续展示过期的恢复资格。
 * 统一包装后，业务失败与 Axios 异常走同一套 `e.response?.data?.errorCode` 刷新逻辑。
 *
 * @param {object|null} payload 业务失败响应体
 * @param {string} [fallback] 缺失 message 时的兜底文案
 * @returns {Error & { response: { data: object } }}
 */
export function createAdminRestoreFailureError(payload, fallback = '恢复失败，请稍后重试') {
  const message = typeof payload?.message === 'string' && payload.message.trim()
    ? payload.message.trim()
    : fallback
  const error = new Error(message)
  error.response = { data: payload && typeof payload === 'object' ? payload : {} }
  return error
}

/**
 * 从「销毁留档」恢复的确认弹窗正文。
 *
 * 与解绑恢复不同：销毁只发生在一人空间，恢复后回到「等待绑定」状态，
 * 由创建者重新走邀请 / 绑定流程；不会自动恢复为正常可用，也不会重新公开。
 *
 * @param {{ spaceName?: string, spaceCode?: string, spaceId?: number,
 *           archiveRound?: number, archiveStoryCount?: number, archivePhotoCount?: number,
 *           archiveMessageCount?: number, archiveAnniversaryCount?: number,
 *           destroyedAt?: string, creatorDisplayName?: string,
 *           conflictCount?: number }} archive
 * @returns {string}
 */
export function buildArchiveRestorePromptMessage(archive = {}) {
  const counts = [
    `故事 ${toCount(archive.archiveStoryCount)}`,
    `照片 ${toCount(archive.archivePhotoCount)}`,
    `留言 ${toCount(archive.archiveMessageCount)}`,
    `纪念日 ${toCount(archive.archiveAnniversaryCount)}`,
  ].join(' · ')
  const lines = [
    `确定从留档恢复“${spaceLabel(archive)}”吗？`,
    `销毁时间：${archive.destroyedAt || '-'}`,
    `创建者：${archive.creatorDisplayName || '-'}`,
    `留档内容：${counts}`,
    '恢复后：',
    '· 空间回到「等待绑定」状态并保持私密，由创建者重新邀请另一半完成绑定；',
    '· 故事、照片、纪念日、留言等内容按留档恢复，图片资源引用保持不变；',
    '· 不会自动重新公开到恋爱广场。',
  ]
  const conflictCount = toCount(archive.conflictCount)
  if (conflictCount > 0) {
    lines.push(`· 检测到 ${conflictCount} 项冲突，系统会拒绝恢复，请先处理冲突。`)
  }
  lines.push('请填写恢复原因用于审计。')
  return lines.join('\n')
}

/**
 * 从留档恢复成功的提示。
 *
 * @param {{ spaceName?: string, restoredMemberCount?: number, alreadyRestored?: boolean } | null} payload
 * @returns {string}
 */
export function buildArchiveRestoreSuccessMessage(payload = null) {
  if (payload?.alreadyRestored) {
    // 幂等重放：服务端不会再改写任何数据，也不能据此宣称空间当前状态。
    return '该留档此前已恢复，本次未重复写入；列表与详情已刷新为最新状态'
  }
  const label = spaceLabel(payload || {})
  const members = toCount(payload?.restoredMemberCount)
  const statusText = typeof payload?.statusText === 'string' && payload.statusText.trim()
    ? payload.statusText.trim()
    : '等待绑定'
  const suffix = members > 0 ? `，已恢复 ${members} 名成员` : ''
  const content = toCount(payload?.restoredContentCount)
  const contentSuffix = content > 0 ? `，补齐 ${content} 条内容` : ''
  return `“${label}”已从留档恢复为${statusText}状态${suffix}${contentSuffix}`
}
