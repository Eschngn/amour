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
