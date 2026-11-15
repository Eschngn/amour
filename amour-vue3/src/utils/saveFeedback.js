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
})

const FEEDBACK_TITLES = Object.freeze({
  [SAVE_FEEDBACK_KIND.SUCCESS]: '保存成功',
  [SAVE_FEEDBACK_KIND.PENDING]: '等待审核',
  [SAVE_FEEDBACK_KIND.STALE]: '广场仍展示旧版本',
  [SAVE_FEEDBACK_KIND.REMOVED]: '已取消公开',
  [SAVE_FEEDBACK_KIND.UNCHANGED]: '内容没有变化',
})

/**
 * 把保存接口结果转换为页面反馈数据。
 *
 * 优先完整展示后端 reviewMessage；只有后端没有审核提示时才使用普通保存文案。
 */
export function resolveSaveFeedback(data, fallbackMessage = '保存成功') {
  const reviewMessage = typeof data?.reviewMessage === 'string' ? data.reviewMessage.trim() : ''
  const message = reviewMessage || String(fallbackMessage || '保存成功').trim()
  const reviewStatus = typeof data?.reviewStatus === 'string' ? data.reviewStatus : ''
  const published = typeof data?.published === 'boolean' ? data.published : null
  const changed = data?.changed !== false

  let kind = SAVE_FEEDBACK_KIND.SUCCESS
  if (!changed) {
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
