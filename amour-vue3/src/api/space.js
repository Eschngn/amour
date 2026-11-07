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

/**
 * 发起情侣空间解绑申请。
 *
 * 对应后端 POST /space/unbind/request：无请求体，目标空间由服务端根据当前登录用户的有效成员关系推导，
 * 客户端不能指定 spaceId / userId。
 *
 * 新语义下不存在「单方立即解绑」：
 * - 申请阶段成员关系、空间 status 与 visibility 全部不变；
 * - 同一发起人重复提交时后端幂等返回同一条申请；
 * - 另一方已先发起时返回 20054（已有待处理的解绑申请），前端应提示并刷新状态；
 * - 冻结/历史归档空间必须先恢复才能发起（20051）；空间已完成解绑返回 20058。
 *
 * 响应 data 为 UnbindStatusVO：{ requestId, spaceId, status, statusText, pending,
 * requestedByMe, canConfirm, canCancel, requester, requestedAt, resolvedAt }。
 * requester 只含公开资料 amourId / displayName / avatar，不含内部 userId。
 *
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function requestCoupleSpaceUnbind() {
  return api.post('/space/unbind/request')
}

/**
 * 取消自己发起的解绑申请（仅发起人、仅 pending）。
 *
 * 对应后端 POST /space/unbind/cancel，无请求体；非发起人返回 20059，
 * 申请已处理返回 20055。取消后成员关系与空间状态不变。
 *
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function cancelCoupleSpaceUnbind() {
  return api.post('/space/unbind/cancel')
}

/**
 * 拒绝另一方发起的解绑申请（仅另一名有效成员、仅 pending）。
 *
 * 对应后端 POST /space/unbind/reject，无请求体；发起人自己拒绝返回 20056，
 * 申请已处理返回 20055。拒绝后成员关系与空间状态不变。
 *
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function rejectCoupleSpaceUnbind() {
  return api.post('/space/unbind/reject')
}

/**
 * 确认解绑（仅申请对应空间的另一名有效成员、仅 pending）。
 *
 * 对应后端 POST /space/unbind/confirm，无请求体；发起人不能确认自己的申请（20056）。
 * 成功后双方成员关系退出、空间 status=5、visibility=0、写入 deletedAt，
 * 待处理邀请被撤销、恢复确认被清理，情侣内容全部保留。
 *
 * 成功后必须先强制刷新 /space/status，确认刷新成功后才清理共享空间状态。
 * 不能把网络失败误判为已解绑，也不能本地伪造 status=5（此时双方都返回 data=null）。
 *
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function confirmCoupleSpaceUnbind() {
  return api.post('/space/unbind/confirm')
}

/**
 * 兼容旧调用方的别名：等价于 requestCoupleSpaceUnbind()。
 *
 * 后端 /space/leave 已不再单方立即退出，只会创建解绑申请；调用后双方仍是有效成员，
 * 必须由另一方 confirm 才会真正解绑。
 *
 * @deprecated 请改用 requestCoupleSpaceUnbind()
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function leaveCoupleSpace() {
  return requestCoupleSpaceUnbind()
}

/**
 * 设置空间整体是否公开到恋爱广场。
 *
 * 请求体只有 { visibility }，目标空间同样由后端按当前登录用户推导：
 * - 1：仅 status=1 且已有两名有效成员时允许（20052/20053）；
 * - 0：任意有效成员均可，幂等，冻结/归档也保持原状态。
 *
 * 只影响空间级 visibility，不改写故事/照片/纪念日等内容级可见性。
 * publicAt 只在首次公开时写入，响应 data 为 SpaceVisibilityVO。
 *
 * @param {0|1} visibility
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function updateCoupleSpaceVisibility(visibility) {
  return api.post('/space/visibility', { visibility: Number(visibility) })
}

/**
 * 冻结当前情侣空间。
 *
 * 对应后端 POST /space/freeze：无请求体，仅有效成员可调用。
 * 冻结后状态变为 2，强制私密、撤销待处理邀请、清空恢复确认；
 * 广场列表与详情立即不可见。恢复沿用现有双方确认流程，且恢复后仍保持私密。
 *
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function freezeCoupleSpace() {
  return api.post('/space/freeze')
}

/**
 * 确认恢复冻结/归档的情侣空间。
 *
 * 对应后端 POST /space/restore/confirm：无请求体。
 * 有几名有效成员就要求几人确认；全部确认后 status=1、清空归档时间，
 * 但 visibility 保持 0（不会自动重新公开）。响应 data 为 RestoreConfirmVO：
 * { restored, status, statusText, confirmedCount, requiredCount }。
 *
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function confirmSpaceRestore() {
  return api.post('/space/restore/confirm')
}
