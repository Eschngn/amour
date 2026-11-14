import api from '@/axios'

/**
 * 后台空间公开审核 API。
 *
 * 权限与管理端登录态统一由 @/axios 的 Authorization 头处理，
 * 这里不额外保存 token，也不吞掉后端错误。
 */

export function fetchAdminSpaceReviewPage(payload) {
  return api.post('/admin/space-review/list', payload)
}

export function fetchAdminSpaceReviewDetail(submissionId) {
  return api.post('/admin/space-review/detail', { submissionId: Number(submissionId) })
}

export function approveAdminSpaceReview(submissionId, reason = '') {
  return api.post('/admin/space-review/approve', {
    submissionId: Number(submissionId),
    reason: String(reason || '').trim(),
  })
}

/**
 * 驳回审核。
 *
 * 不传 item 时驳回整个待审核提交（旧行为）；传入 { itemType, itemId }
 * 时只驳回该待审核项，用于“驳回此项公开申请”，不会触发下架接口。
 */
export function rejectAdminSpaceReview(submissionId, reason, item = null) {
  const payload = {
    submissionId: Number(submissionId),
    reason: String(reason || '').trim(),
  }
  if (item?.itemType && item?.itemId != null) {
    payload.itemType = String(item.itemType)
    payload.itemId = Number(item.itemId)
  }
  return api.post('/admin/space-review/reject', payload)
}

/**
 * 通过单个审核项：只发布该项快照，不影响同一提交中的其他项。
 */
export function approveAdminSpaceReviewItem(submissionId, item, reason = '') {
  return api.post('/admin/space-review/item/approve', {
    submissionId: Number(submissionId),
    itemType: String(item?.itemType || ''),
    itemId: Number(item?.itemId),
    reason: String(reason || '').trim(),
  })
}

/**
 * 驳回单个审核项：不修改已经发布的旧版本，原因必填。
 */
export function rejectAdminSpaceReviewItem(submissionId, item, reason) {
  return api.post('/admin/space-review/item/reject', {
    submissionId: Number(submissionId),
    itemType: String(item?.itemType || ''),
    itemId: Number(item?.itemId),
    reason: String(reason || '').trim(),
  })
}

/**
 * 下架公开内容（contentType/contentId）或暂停整个空间公开（两者留空）。
 */
export function unpublishAdminSpaceContent({ spaceId, contentType = '', contentId = null, reason }) {
  return api.post('/admin/space-review/unpublish', {
    spaceId: Number(spaceId),
    contentType,
    contentId: contentId == null ? null : Number(contentId),
    reason: String(reason || '').trim(),
  })
}
