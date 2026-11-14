import api from '@/axios'

/**
 * 当前情侣空间的公开审核状态。
 *
 * 目标空间由后端根据登录用户的有效成员关系推导，前端不传 spaceId。
 */
export function fetchSpaceReviewStatus() {
  return api.get('/space/review/status')
}

/**
 * 被驳回或部分通过后，基于当前工作数据重新发起完整公开审核。
 * 后端会复用当前空间数据，不会重复创建相同审核项。
 */
export function resubmitSpaceReview() {
  return api.post('/space/review/resubmit')
}
