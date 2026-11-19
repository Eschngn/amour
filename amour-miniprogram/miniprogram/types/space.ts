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
  /** 0-等待绑定 1-正常 2-冻结 3-历史归档 4-删除等待期 5-已解绑 6-已销毁（仅管理员可见） */
  status?: number | string | null
  statusText?: string | null
  /** 0-私密 1-公开到恋爱广场 */
  visibility?: number | string | null
  loveStartTime?: string | null
  /** 首次公开时间：隐藏、恢复或再次公开都不会刷新 */
  publicAt?: string | null
  /** 当前是否具备公开资格：status=1 且有效成员数为 2 */
  canSetVisibility?: boolean | null
  archivedAt?: string | null
  /** 完成解绑（逻辑删除）时间 */
  deletedAt?: string | null
  createTime?: string | null
  memberLimit?: number | string | null
  memberCount?: number | string | null
  /** 1-发起人 2-另一半；未加入时为 null */
  currentUserRole?: number | string | null
  creator?: boolean | null
  canInvite?: boolean | null
  pendingInvitationCount?: number | string | null
  /** 冻结或归档后是否需要双方确认恢复 */
  restoreRequired?: boolean | null
  restoreConfirmedCount?: number | string | null
  restoreConfirmedByMe?: boolean | null
  /** 是否存在待处理的解绑申请 */
  unbindPending?: boolean | null
  /** 待处理解绑申请是否由当前用户发起 */
  unbindRequestedByMe?: boolean | null
  unbindCanConfirm?: boolean | null
  unbindCanCancel?: boolean | null
  unbindRequester?: SpaceUnbindRequester | null
  unbindRequestedAt?: string | null
  unbindRequestId?: number | string | null
  /** 最近一次已结束的解绑申请状态：1-已同意 2-已拒绝 3-已取消 */
  unbindLastStatus?: number | string | null
  unbindLastRequestedByMe?: boolean | null
  unbindLastResolvedAt?: string | null
  /**
   * 空间工作版本号。
   *
   * 空间基础信息 / 首页配置保存成功后递增；创建 / 绑定 / 编辑接口返回的
   * SpaceStatusVO 都会带上它，可用于识别「请求飞行期间空间已被改写」的过期状态。
   */
  revision?: number | string | null
  members?: SpaceMember[] | null
}

/** 解绑发起人的公开资料（SpaceUnbindRequesterVO）。 */
export interface SpaceUnbindRequester {
  amourId?: string | null
  displayName?: string | null
  avatar?: string | null
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

/**
 * 编辑空间基础信息请求体（UpdateSpaceReqVO）。
 *
 * 语义是「提交完整基础信息」而不是补丁，调用时三个字段都应显式提交：
 * - spaceName：trim 后字符串，空串也提交（后端落回默认名「我们的故事」）；
 * - description：trim 后字符串，空串提交用于清空；
 * - loveStartTime：`yyyy-MM-dd HH:mm:ss` 或 null（清空），不能是空字符串。
 */
export interface UpdateSpacePayload {
  spaceName?: string
  description?: string
  /** yyyy-MM-dd HH:mm:ss 或 null（清空）；不允许空字符串 */
  loveStartTime?: string | null
}

/** 编辑空间基础信息的返回：最新 SpaceStatusVO（含递增后的 revision）。 */
export type UpdateSpaceResult = CoupleSpace

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

/** 销毁空间结果（SpaceDestroyVO）。 */
export interface SpaceDestroyResult {
  spaceId?: number | string | null
  spaceCode?: string | null
  /** 销毁后状态：6-已销毁 */
  status?: number | string | null
  statusText?: string | null
  destroyedAt?: string | null
  /** 留档 ID，仅后台排障使用 */
  archiveId?: number | string | null
  /** 本次请求是否真正执行了销毁；重复提交的幂等响应为 false */
  destroyed?: boolean | null
}
