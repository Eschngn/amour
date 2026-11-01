import api from '@/axios'

/**
 * 查询当前登录用户的情侣空间状态。
 *
 * 对应后端 POST /space/status：
 * - data=null：已登录，但尚未创建或绑定情侣空间。
 * - data.spaceId 存在：用户已加入空间；status=1 才代表空间正常可用。
 *
 * 该接口需要登录，调用前必须确认 frontendLoggedIn 为 true。
 */
export function fetchSpaceStatus() {
  return api.post('/space/status')
}

/** 创建情侣空间。成功后仍应重新调用 fetchSpaceStatus 获取真实上下文。 */
export function createCoupleSpace(payload) {
  return api.post('/space/create', payload)
}

/** 预览邀请令牌，对应后端 InvitationPreviewVO。 */
export function previewSpaceInvitation(token) {
  return api.post('/space/invitation/preview', { token })
}

/** 查看当前登录用户收到的待接受邀请。 */
export function fetchReceivedSpaceInvitations() {
  return api.post('/space/invitation/received')
}

/** 接受邀请：可传 { token } 或 { invitationId }。 */
export function acceptSpaceInvitation(payload) {
  return api.post('/space/invitation/accept', payload)
}
