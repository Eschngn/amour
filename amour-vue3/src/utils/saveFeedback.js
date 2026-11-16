/**
 * 空间内容保存反馈的分类工具。
 *
 * 编辑器的保存结果统一转换为页面级非模态提示，避免全局浮层遮挡栏目切换。
 */

/** 页面级反馈的自动隐藏时间：足够读完审核说明，又不会长期占用版面。 */
export const SAVE_FEEDBACK_DURATION_MS = 7000

export const SAVE_FEEDBACK_KIND = Object.freeze({
  SUCCESS: 'success',
  PENDING: 'pending',
  STALE: 'stale',
  REMOVED: 'removed',
  UNCHANGED: 'unchanged',
  RESTORED: 'restored',
})

/** 编辑内容与进入编辑前完全一致时的统一提示。 */
export const UNCHANGED_EDIT_MESSAGE = '当前编辑无改动，未提交审核'

/** 工作数据已恢复为当前公开版本、本次没有产生审核项时的统一提示。 */
export const RESTORED_TO_PUBLISHED_MESSAGE = '已恢复为当前公开版本，本次未产生新的审核项'

const FEEDBACK_TITLES = Object.freeze({
  [SAVE_FEEDBACK_KIND.SUCCESS]: '保存成功',
  [SAVE_FEEDBACK_KIND.PENDING]: '等待审核',
  [SAVE_FEEDBACK_KIND.STALE]: '广场仍展示旧版本',
  [SAVE_FEEDBACK_KIND.REMOVED]: '已取消公开',
  [SAVE_FEEDBACK_KIND.UNCHANGED]: '内容没有变化',
  [SAVE_FEEDBACK_KIND.RESTORED]: '已恢复公开版本',
})

/**
 * 把保存接口结果转换为页面反馈数据。
 *
 * 优先完整展示后端 reviewMessage；只有后端没有审核提示时才使用普通保存文案。
 * 「已恢复当前公开版本」优先于普通无变化，避免提示成一次新的审核提交。
 */
export function resolveSaveFeedback(data, fallbackMessage = '保存成功') {
  const restored = data?.restoredToPublished === true || data?.reviewRestored === true
  const reviewMessage = typeof data?.reviewMessage === 'string' ? data.reviewMessage.trim() : ''
  const message = reviewMessage
    || (restored ? RESTORED_TO_PUBLISHED_MESSAGE : String(fallbackMessage || '保存成功').trim())
  const reviewStatus = typeof data?.reviewStatus === 'string' ? data.reviewStatus : ''
  const published = typeof data?.published === 'boolean' ? data.published : null
  const changed = data?.changed !== false

  let kind = SAVE_FEEDBACK_KIND.SUCCESS
  if (restored) {
    kind = SAVE_FEEDBACK_KIND.RESTORED
  } else if (!changed) {
    kind = SAVE_FEEDBACK_KIND.UNCHANGED
  } else if (reviewStatus === 'UNPUBLISHED') {
    kind = SAVE_FEEDBACK_KIND.REMOVED
  } else if (reviewStatus === 'PENDING') {
    kind = published === true ? SAVE_FEEDBACK_KIND.STALE : SAVE_FEEDBACK_KIND.PENDING
  }

  return { message, kind, reviewStatus, published }
}

/** 反馈标题用于快速区分状态，正文保留后端返回的完整语义。 */
export function saveFeedbackTitle(kind) {
  return FEEDBACK_TITLES[kind] || FEEDBACK_TITLES[SAVE_FEEDBACK_KIND.SUCCESS]
}

/** 统一构造“编辑无改动”反馈，标题与颜色沿用 UNCHANGED 样式。 */
export function resolveUnchangedFeedback() {
  return resolveSaveFeedback({
    changed: false,
    reviewMessage: UNCHANGED_EDIT_MESSAGE,
  })
}
