/**
 * 情侣空间接口层。
 *
 * 约定（与项目现有调用方式一致）：
 * - 复用 utils/request 的 post：token 注入、401 / 20002 清理登录态、候选地址与超时都在请求层完成，
 *   本文件不读取 token，也不重复实现错误处理；
 * - 只调用后端已存在的接口，不新增接口：
 *     POST /space/status                → SpaceStatusVO | null（未加入空间时 data=null）
 *     POST /space/create                { spaceName?, description?, loveStartTime? } → SpaceStatusVO
 *     POST /space/invitation/create     { inviteeAmourId? } → { invitationId, token, expiresAt, inviteeAmourId }
 *     POST /space/invitation/list       → InvitationVO[]（当前空间待接受邀请）
 *     POST /space/invitation/received   → InvitationVO[]（我收到的邀请）
 *     POST /space/invitation/preview    { token } → InvitationPreviewVO
 *     POST /space/invitation/accept     { token } | { invitationId } → SpaceStatusVO
 *     POST /space/destroy               → SpaceDestroyVO（创建者在另一半未加入时销毁并留档）
 * - 字段语义以 SpaceStatusVO / InvitationPreviewVO 为准，见下方类型定义与 .d.ts。
 */
const { post } = require('./request')

/** 后端分页 / 时间字段以字符串下发，这里只做展示前的宽松归一化。 */
function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 查询当前登录用户的情侣空间状态。
 *
 * @returns {Promise<object|null>} data=null 表示已登录但没有创建 / 绑定 / 加入任何空间
 */
function fetchSpaceStatus() {
  return post('/space/status').then((data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null
    return data
  })
}

/**
 * 创建情侣空间。
 *
 * 后端 CreateSpaceReqVO：spaceName ≤ 30 字、description ≤ 500 字、loveStartTime 可为空
 * （Jackson 按 yyyy-MM-dd HH:mm:ss 反序列化 LocalDateTime）。
 *
 * @param {{ spaceName?: string, description?: string, loveStartTime?: string|null }} payload
 */
function createCoupleSpace(payload) {
  const source = payload || {}
  const body = {
    spaceName: toTrimmedString(source.spaceName),
    description: toTrimmedString(source.description),
  }
  const loveStartTime = toTrimmedString(source.loveStartTime)
  if (loveStartTime) body.loveStartTime = loveStartTime
  return post('/space/create', body)
}

/** 创建链接邀请（不指定受邀账号时，任何持有令牌的账号都可接受）。 */
function createSpaceInvitation(inviteeAmourId) {
  const body = {}
  const normalized = toTrimmedString(inviteeAmourId)
  if (normalized) body.inviteeAmourId = normalized
  return post('/space/invitation/create', body)
}

/** 当前空间内待接受的邀请（仅空间有效成员可调用）。 */
function fetchSpaceInvitations() {
  return post('/space/invitation/list').then(data => (Array.isArray(data) ? data : []))
}

/** 当前登录用户收到的待接受邀请。 */
function fetchReceivedInvitations() {
  return post('/space/invitation/received').then(data => (Array.isArray(data) ? data : []))
}

/** 预览邀请令牌（该接口允许未登录访问）。 */
function previewInvitation(token) {
  return post('/space/invitation/preview', { token: toTrimmedString(token) })
}

/**
 * 接受邀请加入情侣空间。
 *
 * 两种入口二选一：token（链接 / 扫码邀请）或 invitationId（我收到的邀请列表）。
 */
function acceptInvitation(payload) {
  const source = payload || {}
  const body = {}
  const token = toTrimmedString(source.token)
  if (token) body.token = token
  if (source.invitationId !== undefined && source.invitationId !== null && source.invitationId !== '') {
    body.invitationId = source.invitationId
  }
  return post('/space/invitation/accept', body)
}

/**
 * 创建者在「另一半尚未加入」时销毁并清空情侣空间。
 *
 * 请求无参数：目标空间与操作者身份完全由服务端按登录态与数据库成员关系推导，
 * 客户端不能指定 spaceId / userId。
 *
 * 服务端行为：
 * - 只有创建者、且另一半尚未加入（有效成员恰好 1 人）、空间仍可销毁时才成功；
 * - 另一半已加入返回 20094，非创建者返回 20093，状态不允许返回 20095；
 * - 重复提交 / 网络重试按幂等处理：已销毁时返回同一份结果，destroyed=false；
 * - 销毁不是物理删除：服务端写入完整留档，空间对普通用户不可见、不可访问，
 *   只有平台管理员可以从留档恢复。
 *
 * 成功后必须强制刷新 /space/status（此时应返回 data=null），不能本地伪造 status=6。
 */
function destroyCoupleSpace() {
  return post('/space/destroy')
}

module.exports = {
  fetchSpaceStatus,
  createCoupleSpace,
  createSpaceInvitation,
  fetchSpaceInvitations,
  fetchReceivedInvitations,
  previewInvitation,
  acceptInvitation,
  destroyCoupleSpace,
}
