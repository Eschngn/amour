/**
 * 空间审核状态卡的展示文案。
 *
 * 只读取服务端返回的审核状态，不在前端重新推断 pending / approved，
 * 避免用户端与管理台对同一份数据给出不同结论。
 */

/** 最近一次提交因内容恢复为公开版本而结束，没有当前审核项。 */
export function isRestoredReviewStatus(status) {
  return status?.restoredToPublished === true
}

/** 状态卡右上角徽标：待审核数量 / 恢复提示 / 最近处理状态。 */
export function resolveReviewBadgeText(status) {
  if (!status) return ''
  if (status.pending) return `${Number(status.pendingItemCount) || 0} 项待审核`
  if (isRestoredReviewStatus(status)) return '无待审核项'
  return status.lastReviewStatusText || ''
}

/** 状态卡标题，与徽标和正文保持同一语义。 */
export function resolveReviewCardTitle(status) {
  if (!status) return '公开审核'
  if (status.pending) return '已提交审核'
  if (isRestoredReviewStatus(status)) return '已恢复公开版本'
  if (status.unpublished) return '已下架'
  if (status.lastReviewStatus === 'REJECTED') return '审核未通过'
  if (status.lastReviewStatus === 'PARTIALLY_APPROVED') return '部分通过'
  if (status.visibility === 1) return '已公开'
  return '尚未公开'
}

/** 审核状态文字：恢复场景不展示「已撤回」。 */
export function resolveReviewStateText(status) {
  if (!status) return '暂无审核记录'
  if (status.pending) return '待审核'
  if (isRestoredReviewStatus(status)) return '已恢复为当前公开版本'
  return status.lastReviewStatusText || '暂无审核记录'
}
