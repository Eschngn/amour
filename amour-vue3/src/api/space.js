import api from '@/axios'
import {
  buildCreateInvitationPayload,
  buildRevokeInvitationPayload,
  extractInvitationToken,
} from '@/utils/spaceInvitation'

/**
 * 情侣空间 API 封装。
 *
 * 约定：
 * - 统一复用 `@/axios` 实例，认证头、baseURL、401 处理都在拦截器里完成，
 *   这里不读取也不写入任何 token。
 * - 一律返回 AxiosResponse，调用层继续用 `data.success` / `data.data` / `data.message` 判断。
 * - 邀请明文令牌只作为参数/返回值透传，不落 localStorage、不打印到 console。
 */

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

/**
 * 创建情侣空间。
 *
 * 请求体：{ spaceName?: string, description?: string, loveStartTime?: string|null }
 * 响应 data 为 SpaceStatusVO；成功后仍应重新调用 fetchSpaceStatus 获取真实上下文。
 */
export function createCoupleSpace(payload) {
  return api.post('/space/create', payload)
}

/**
 * 创建空间邀请。
 *
 * 请求体：{ inviteeAmourId?: string }
 * - 传恋语 ID：创建指定账号的邀请，只有该账号能接受；
 * - 省略或空白：创建链接邀请，持有令牌的账号均可接受。
 *
 * 响应 data：{ invitationId, token, expiresAt, inviteeAmourId }
 * token 是明文邀请令牌，仅此一次返回；请立即用 buildInvitationLink 生成链接交给用户，
 * 不要缓存到 localStorage，也不要打印到 console。
 *
 * @param {{ inviteeAmourId?: string }|string} [payload] 请求体，或直接传恋语 ID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function createSpaceInvitation(payload = {}) {
  const inviteeAmourId =
    typeof payload === 'string' ? payload : payload?.inviteeAmourId
  return api.post('/space/invitation/create', buildCreateInvitationPayload(inviteeAmourId))
}

/**
 * 查询当前空间内待接受的邀请（仅空间有效成员可调用）。
 *
 * 请求体：无
 * 响应 data：InvitationVO[]，字段含 invitationId、spaceId、spaceCode、spaceName、
 * inviterAmourId、inviterName、inviteeAmourId、inviteeName、status、statusText、
 * expiresAt、acceptedAt、createTime。列表不会返回令牌。
 */
export function fetchSpaceInvitations() {
  return api.post('/space/invitation/list')
}

/**
 * 查看当前登录用户收到的待接受邀请。
 *
 * 请求体：无
 * 响应 data：InvitationVO[]，结构同 fetchSpaceInvitations。
 */
export function fetchReceivedSpaceInvitations() {
  return api.post('/space/invitation/received')
}

/**
 * 撤销空间内待接受的邀请（仅该空间有效成员可调用）。
 *
 * 请求体：{ invitationId: number }
 * 响应 data：null；已撤销、已接受或已过期时后端返回 20042。
 *
 * @param {number|string} invitationId 邀请 ID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function revokeSpaceInvitation(invitationId) {
  return api.post('/space/invitation/revoke', buildRevokeInvitationPayload(invitationId))
}

/**
 * 预览邀请令牌，对应后端 InvitationPreviewVO。
 *
 * 该接口允许未登录访问，因此页面展示邀请卡片时无需先登录。
 * 也接受完整邀请链接，内部会先解析出令牌。
 *
 * @param {string} token 明文邀请令牌或邀请链接
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function previewSpaceInvitation(token) {
  return api.post('/space/invitation/preview', { token: extractInvitationToken(token) })
}

/**
 * 接受邀请：可传 { token } 或 { invitationId }。
 *
 * - { token }：用于链接邀请，或扫描邀请链接后接受；
 * - { invitationId }：仅用于“我收到的邀请”列表中指定给自己的邀请，
 *   后端会拒绝用 invitationId 接受未指定账号的链接邀请。
 *
 * 响应 data 为 SpaceStatusVO；成功后仍建议重新拉取 fetchSpaceStatus。
 *
 * @param {{ token?: string, invitationId?: number|string }} payload
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function acceptSpaceInvitation(payload) {
  return api.post('/space/invitation/accept', payload)
}
