/**
 * 后台原因输入弹窗的统一约束。
 *
 * 前端限制与后端 AdminSpaceReview / AdminContentGovernance 的 500 字上限保持一致；
 * 样式 class 由 admin.css 的 .admin-message-box / .admin-modal-overlay 承载。
 */
export const ADMIN_REASON_MAX_LENGTH = 500

export const ADMIN_MODAL_OVERLAY_CLASS = 'admin-modal-overlay'

export const ADMIN_DANGER_CONFIRM_BUTTON_CLASS = 'admin-message-box__confirm--danger'

export function validateAdminReason(value) {
  const reason = String(value || '').trim()
  if (!reason) return '请填写操作原因'
  if (reason.length > ADMIN_REASON_MAX_LENGTH) {
    return `操作原因不能超过 ${ADMIN_REASON_MAX_LENGTH} 字`
  }
  return true
}
