/**
 * 情侣空间邀请相关的纯函数。
 *
 * 这里不引入 Vue、Axios 或任何浏览器全局对象，方便用 `node --test` 直接覆盖。
 * 页面与 API 层共用同一份规则，避免“页面能解析、接口不能”的不一致。
 */

/** 邀请链接默认落到空间设置页，页面从 ?token= 读取令牌。 */
export const INVITATION_PATH = '/space/setup'

/** 与后端 CreateInvitationReqVO 的 @Size(max = 20) 保持一致。 */
export const INVITEE_AMOUR_ID_MAX_LENGTH = 20

/**
 * 把用户粘贴的内容解析成邀请令牌。
 *
 * 支持：
 * - 完整链接，令牌在 ?token= 上；
 * - 完整链接，令牌在 /invitation/<token> 或 /space/invitation/<token> 路径上；
 * - 只有查询串的片段，如 "?token=abc"；
 * - 纯令牌。
 *
 * @param {unknown} value 用户输入
 * @returns {string} 解析出的令牌，无法解析时返回空字符串
 */
export function extractInvitationToken(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''

  try {
    const url = new URL(text)
    const fromQuery = url.searchParams.get('token')
    if (fromQuery && fromQuery.trim()) return fromQuery.trim()
    return fromInvitationPath(url.pathname) || text
  } catch {
    // 不是完整 URL（例如只有 "?token=abc" 或相对路径），退化为正则提取。
    const fromQuery = text.match(/[?&]token=([^&#\s]+)/)
    if (fromQuery?.[1]) return safeDecode(fromQuery[1])
    return text
  }
}

function fromInvitationPath(pathname) {
  const match = String(pathname || '').match(/\/invitation\/([^/]+)\/?$/)
  return match?.[1] ? safeDecode(match[1]) : ''
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value).trim()
  } catch {
    // 非法百分号编码时保留原值，交给后端判定“邀请不存在”。
    return String(value).trim()
  }
}

/**
 * 由明文令牌构造可分享的邀请链接。
 *
 * 明文令牌只在创建邀请时返回一次，链接应交给用户复制，不要写入 localStorage。
 *
 * @param {unknown} token 明文邀请令牌
 * @param {{ origin?: string, path?: string }} [options]
 * @returns {string} 邀请链接；令牌为空时返回空字符串
 */
export function buildInvitationLink(token, options = {}) {
  const text = typeof token === 'string' ? token.trim() : ''
  if (!text) return ''

  const origin = String(options.origin ?? '').replace(/\/+$/, '')
  const path = normalizePath(options.path)

  return `${origin}${path}?token=${encodeURIComponent(text)}`
}

function normalizePath(path) {
  const text = typeof path === 'string' && path.trim() ? path.trim() : INVITATION_PATH
  const withSlash = text.startsWith('/') ? text : `/${text}`
  return withSlash.replace(/\/+$/, '')
}

/**
 * 规整指定受邀账号的恋语 ID：去空格，空白视为“未指定”。
 *
 * @param {unknown} value 用户输入的恋语 ID
 * @returns {string} 规整后的 ID，可能为空字符串
 */
export function normalizeInviteeAmourId(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 构造创建邀请的请求体。
 *
 * 后端约定：inviteeAmourId 为空表示创建“持有链接即可接受”的链接邀请。
 * 因此空白值必须省略字段，而不是传空串或 null。
 *
 * @param {unknown} inviteeAmourId 目标账号的恋语 ID
 * @returns {{ inviteeAmourId?: string }} 请求体
 */
export function buildCreateInvitationPayload(inviteeAmourId) {
  const normalized = normalizeInviteeAmourId(inviteeAmourId)
  return normalized ? { inviteeAmourId: normalized } : {}
}

/**
 * 构造撤销邀请的请求体，并做最基本的正整数校验。
 *
 * @param {unknown} invitationId 邀请 ID
 * @returns {{ invitationId: number }}
 * @throws {TypeError} 邀请 ID 不是正整数时抛出，避免发出必然失败的请求
 */
export function buildRevokeInvitationPayload(invitationId) {
  const id = Number(invitationId)
  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError('邀请 ID 必须是正整数')
  }
  return { invitationId: id }
}

/**
 * 校验选填的受邀恋语 ID。
 *
 * 空值合法（表示创建链接邀请），非空时不能超过后端的 20 字符上限。
 * 返回值直接用于表单错误提示，空字符串表示校验通过。
 *
 * @param {unknown} value 用户输入的恋语 ID
 * @returns {string} 错误信息，通过校验时为空字符串
 */
export function validateInviteeAmourId(value) {
  const normalized = normalizeInviteeAmourId(value)
  if (!normalized) return ''
  if (normalized.length > INVITEE_AMOUR_ID_MAX_LENGTH) {
    return `恋语 ID 不能超过 ${INVITEE_AMOUR_ID_MAX_LENGTH} 个字符`
  }
  return ''
}

/**
 * 邀请是否仍可撤销：只有“待接受”且未过期的邀请才允许撤销。
 *
 * 后端状态：0-待接受 1-已接受 2-已撤销 3-已过期 4-已拒绝。
 * 列表接口不会返回令牌，因此界面上只能操作状态与有效期，不能复原可复制的 token。
 *
 * @param {{ status?: number|string, expiresAt?: string }} invitation
 * @param {number} [now] 当前时间戳，便于测试注入
 * @returns {boolean}
 */
export function isInvitationRevocable(invitation, now = Date.now()) {
  if (!invitation || Number(invitation.status) !== 0) return false
  const expiresAt = parseInvitationTime(invitation.expiresAt)
  if (expiresAt == null) return true
  return expiresAt > now
}

/**
 * 解析后端 `yyyy-MM-dd HH:mm:ss` 时间串，无法解析时返回 null。
 * 不使用 Date 解析字符串，避免 Safari 对非 ISO 格式的兼容问题。
 */
export function parseInvitationTime(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime()
  }
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return null
  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  )
  if (!match) return null
  const [, year, month, day, hour = '0', minute = '0', second = '0'] = match
  const timestamp = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

/**
 * 把邀请列表整理成界面可直接渲染的形状。
 *
 * 列表接口不返回明文令牌，所以 `canCopy` 恒为 false —— 提示调用方不要伪造可复制的链接，
 * 只展示状态、创建时间与有效期，并允许撤销仍可撤销的邀请。
 *
 * @param {Array} invitations 后端 InvitationVO[]
 * @param {number} [now] 当前时间戳，便于测试注入
 * @returns {Array<object>}
 */
export function normalizeInvitationList(invitations, now = Date.now()) {
  if (!Array.isArray(invitations)) return []
  return invitations.map((invitation) => {
    const revocable = isInvitationRevocable(invitation, now)
    return {
      ...invitation,
      revocable,
      canCopy: false,
      isTargeted: invitation?.inviteeAmourId != null && invitation.inviteeAmourId !== '',
    }
  })
}

/**
 * 邀请状态文案与不可加入原因。
 *
 * 后端 InvitationPreviewVO 已经给出 statusText 与 message，前端不重复造文案；
 * 这里只负责把“能否接受”收敛成一个布尔值，避免模板里散落多重判断。
 */

/**
 * 是否允许展示“接受邀请并加入”按钮。
 *
 * 必须同时满足：已登录 + 后端判定 joinable=true。
 * 未登录时 joinable 可能为 true（链接本身有效），但那只是提示“登录后可接受”，
 * 不能据此渲染接受按钮。
 *
 * @param {{ joinable?: boolean, needLogin?: boolean }} preview
 * @param {boolean} loggedIn
 * @returns {boolean}
 */
export function canAcceptInvitation(preview, loggedIn) {
  if (!loggedIn) return false
  if (!preview || preview.joinable !== true) return false
  return preview.needLogin !== true
}

/**
 * 预览结果的引导动作：
 * - login：未登录，去登录并带回 token；
 * - accept：可直接接受；
 * - space：已有空间 / 已是成员 / 已加入其他空间，提供回空间入口；
 * - plaza：其余不可加入的情况，提供回恋爱广场入口。
 *
 * @param {object|null} preview
 * @param {boolean} loggedIn
 * @returns {'login'|'accept'|'space'|'plaza'}
 */
export function resolveInvitationAction(preview, loggedIn) {
  if (!loggedIn || preview?.needLogin === true) return 'login'
  if (canAcceptInvitation(preview, loggedIn)) return 'accept'
  if (preview?.alreadyMember || preview?.inOtherSpace) return 'space'
  return 'plaza'
}

/**
 * 邀请不可接受时给用户的补充提示。
 *
 * 优先使用后端 message；后端没有给时按字段兜底，
 * 网络错误不会走到这里（调用层会单独展示错误）。
 *
 * @param {object|null} preview
 * @returns {string}
 */
export function describeInvitationBlock(preview) {
  if (!preview) return ''
  const message = typeof preview.message === 'string' ? preview.message.trim() : ''
  if (message) return message
  if (preview.alreadyMember) return '你已经是该情侣空间的成员'
  if (preview.inOtherSpace) return '你已加入其他情侣空间，无法重复加入'
  if (Number(preview.memberCount) >= Number(preview.memberLimit || 2)) {
    return '情侣空间成员人数已达上限'
  }
  if (Number(preview.status) === 1) return '邀请已被接受'
  if (Number(preview.status) === 2) return '邀请已被撤销'
  if (Number(preview.status) === 3) return '邀请已过期'
  if (Number(preview.status) === 4) return '邀请已被拒绝'
  return ''
}
