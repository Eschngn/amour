/**
 * 情侣空间相关数据结构，与后端 VO 对齐。
 *
 * 字段来源：
 * - SpaceStatusVO（POST /space/status、/space/create、/space/invitation/accept）
 * - InvitationVO（POST /space/invitation/list、/space/invitation/received）
 * - InvitationPreviewVO（POST /space/invitation/preview）
 *
 * 后端 LocalDateTime 统一按 `yyyy-MM-dd HH:mm:ss` 字符串下发（JacksonConfig）。
 */

/** 空间内成员（SpaceMemberVO，只含公开资料）。 */
export interface SpaceMember {
  /** 后端不保证下发内部 userId，前端一律不使用 */
  amourId?: string | null
  displayName?: string | null
  avatar?: string | null
  /** 1-空间发起人 2-另一半 */
  memberRole?: number | string | null
  status?: number | string | null
  joinedAt?: string | null
}

/** 情侣空间状态（SpaceStatusVO）。 */
export interface CoupleSpace {
  spaceId: number | string
  spaceCode?: string | null
  spaceName?: string | null
  description?: string | null
  coverImage?: string | null
  /** 0-等待绑定 1-正常 2-冻结 3-历史归档 4-删除等待期 5-已解绑 */
  status?: number | string | null
  statusText?: string | null
  /** 0-私密 1-公开到恋爱广场 */
  visibility?: number | string | null
  loveStartTime?: string | null
  createTime?: string | null
  memberLimit?: number | string | null
  memberCount?: number | string | null
  /** 1-发起人 2-另一半；未加入时为 null */
  currentUserRole?: number | string | null
  creator?: boolean | null
  canInvite?: boolean | null
  pendingInvitationCount?: number | string | null
  members?: SpaceMember[] | null
}

/** 空间邀请（InvitationVO）。 */
export interface SpaceInvitation {
  invitationId: number | string
  spaceId?: number | string | null
  spaceCode?: string | null
  spaceName?: string | null
  inviterAmourId?: string | null
  inviterName?: string | null
  inviteeAmourId?: string | null
  inviteeName?: string | null
  /** 明文邀请令牌，仅空间成员查看待发邀请时返回 */
  token?: string | null
  /** 0-待接受 1-已接受 2-已撤销 3-已过期 4-已拒绝 */
  status?: number | string | null
  statusText?: string | null
  expiresAt?: string | null
  acceptedAt?: string | null
  createTime?: string | null
}

/** 邀请预览（InvitationPreviewVO，可匿名调用）。 */
export interface InvitationPreview {
  invitationId?: number | string | null
  spaceId?: number | string | null
  spaceCode?: string | null
  spaceName?: string | null
  description?: string | null
  coverImage?: string | null
  inviterAmourId?: string | null
  inviterName?: string | null
  status?: number | string | null
  statusText?: string | null
  spaceStatus?: number | string | null
  memberCount?: number | string | null
  memberLimit?: number | string | null
  expiresAt?: string | null
  needLogin?: boolean | null
  inviteeRestricted?: boolean | null
  inviteeMatched?: boolean | null
  alreadyMember?: boolean | null
  inOtherSpace?: boolean | null
  joinable?: boolean | null
  message?: string | null
}

/** 创建空间请求体（CreateSpaceReqVO）。 */
export interface CreateSpacePayload {
  spaceName?: string
  description?: string
  /** yyyy-MM-dd HH:mm:ss */
  loveStartTime?: string | null
}

/** 创建邀请返回（CreateInvitationRspVO）。 */
export interface CreateInvitationResult {
  invitationId: number | string
  /** 明文令牌，仅此一次返回 */
  token: string
  expiresAt?: string | null
  inviteeAmourId?: string | null
}

/** 接受邀请请求体（AcceptInvitationReqVO）。 */
export interface AcceptInvitationPayload {
  token?: string
  invitationId?: number | string
}
