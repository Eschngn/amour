/**
 * 情侣空间状态相关的纯函数。
 *
 * 单独放在这里是为了让 viewMode、认证错误判断等规则可以脱离 Vue 运行时做单元测试。
 * 页面和 composable 应复用这里的规则，避免各页面自行判断 status。
 */

export const SPACE_STATUS = Object.freeze({
  WAITING: 0,
  NORMAL: 1,
  FROZEN: 2,
  ARCHIVED: 3,
  DELETING: 4,
  DELETED: 5,
})

export const SPACE_VIEW_MODE = Object.freeze({
  PLAZA: 'plaza',
  PRIVATE: 'private',
  UNAVAILABLE: 'unavailable',
})

export const SPACE_VISIBILITY = Object.freeze({
  PRIVATE: 0,
  PUBLIC: 1,
})

/** 解绑申请中的角色标识，供预期模式推导与测试复用。 */
export const UNBIND_ACTOR = Object.freeze({
  REQUESTER: 'requester',
  PARTNER: 'partner',
})

/** 解绑申请状态：与后端 UnbindStatusVO.status 保持一致。 */
export const UNBIND_REQUEST_STATUS = Object.freeze({
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  CANCELLED: 3,
})

/** 空间生命周期动作标识，供动作结果预期与提示复用。 */
export const SPACE_LIFECYCLE_ACTION = Object.freeze({
  PUBLISH: 'publish',
  HIDE: 'hide',
  ARCHIVE: 'archive',
  UNBIND_REQUEST: 'unbind-request',
  UNBIND_CANCEL: 'unbind-cancel',
  UNBIND_REJECT: 'unbind-reject',
  UNBIND_CONFIRM: 'unbind-confirm',
  LEAVE: 'leave',
  FREEZE: 'freeze',
  RESTORE: 'restore',
})

/**
 * 是否拿到了一个真实的空间记录。
 * status=0/2/3 也属于“有空间”，但只有 status=1 才算可用。
 */
export function hasSpaceIdentity(spaceStatus) {
  return Boolean(spaceStatus && spaceStatus.spaceId != null && spaceStatus.spaceId !== '')
}

/** 已完成解绑（status=5）的历史空间不能再当作可用空间。 */
export function isUnboundSpace(spaceStatus) {
  return Boolean(spaceStatus) && Number(spaceStatus.status) === SPACE_STATUS.DELETED
}

/**
 * 只有存在 spaceId 且 status=1 时才认为空间可以正常使用。
 *
 * 后端明确返回 memberCount=0 或 currentUserRole 不是 1/2 时同样不可用，
 * 避免残留或脏数据把「没有有效成员」的空间误判成 private。
 */
export function isReadySpace(spaceStatus) {
  if (!hasSpaceIdentity(spaceStatus)) return false
  if (Number(spaceStatus.status) !== SPACE_STATUS.NORMAL) return false
  if (spaceStatus.memberCount != null && Number(spaceStatus.memberCount) <= 0) return false
  if (spaceStatus.currentUserRole != null) {
    const role = Number(spaceStatus.currentUserRole)
    if (role !== 1 && role !== 2) return false
  }
  return true
}

/**
 * 统一推导页面展示模式：
 * - plaza：未登录，或登录后没有空间记录。
 * - private：已绑定且空间正常。
 * - unavailable：有空间记录，但处于等待绑定、冻结、归档或异常状态。
 *
 * 等待绑定（status=0）归入 unavailable，页面仍可读取 spaceStatus.status 显示等待提示。
 */
export function deriveSpaceViewMode(loggedIn, spaceStatus) {
  if (!loggedIn || !hasSpaceIdentity(spaceStatus)) {
    return SPACE_VIEW_MODE.PLAZA
  }
  return isReadySpace(spaceStatus)
    ? SPACE_VIEW_MODE.PRIVATE
    : SPACE_VIEW_MODE.UNAVAILABLE
}

/**
 * 空间当前是否真的“暂时不可用”，用于决定是否展示不可用提示。
 *
 * 只有拿到空间记录、且状态明确落在“不可用”语义里才返回 true：
 * - status=0/2/3（等待绑定、冻结、归档）属于可展示状态提示的不可用；
 * - status=1（已绑定正常）一定可用，任何提示都不该出现；
 * - 未知/缺失 status 归为不可用，但仍由调用方按“无法确认”文案处理。
 *
 * 该函数存在的意义是防止“已绑定正常空间”掉进各页面的状态兜底分支。
 */
export function isUnavailableSpace(spaceStatus) {
  if (!hasSpaceIdentity(spaceStatus)) return false
  const status = Number(spaceStatus.status)
  if (status === SPACE_STATUS.NORMAL) return false
  return true
}

/**
 * 只有明确的登录态失效才算 auth error。
 * 网络断开、超时、5xx 不能清空登录态或空间状态，避免把暂时断网误判为退出登录。
 */
export function isSpaceAuthError(error) {
  const status = error?.response?.status
  const errorCode = error?.response?.data?.errorCode
  return status === 401 || String(errorCode ?? '') === '20002'
}

/** 从 Axios 异常中提取可展示的信息，优先使用后端 message。 */
export function readSpaceErrorMessage(error, fallback = '情侣空间状态加载失败') {
  const message = error?.response?.data?.message
  if (typeof message === 'string' && message.trim()) return message.trim()
  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim()
  return fallback
}

/**
 * 空间当前的有效成员数。后端 SpaceStatusVO 的 memberCount 只统计有效成员。
 */
export function activeSpaceMemberCount(spaceStatus) {
  const count = Number(spaceStatus?.memberCount)
  return Number.isFinite(count) && count > 0 ? count : 0
}

/**
 * 当前登录用户是否是该空间的有效成员。
 * 后端只在 SpaceStatusVO.members 中返回有效成员，currentUserRole 因此代表有效成员身份。
 */
export function hasActiveSpaceMembership(spaceStatus) {
  if (!hasSpaceIdentity(spaceStatus)) return false
  // 已完成解绑的空间即使历史上残留成员关系，也不再具备任何新操作资格。
  if (isUnboundSpace(spaceStatus)) return false
  const role = Number(spaceStatus.currentUserRole)
  return (role === 1 || role === 2) && activeSpaceMemberCount(spaceStatus) > 0
}

/**
 * 是否具备公开资格：仅 status=1（正常）且有两名有效成员。
 * 与后端 POST /space/visibility 的准入条件保持一致。
 */
export function canPublishSpace(spaceStatus) {
  return hasSpaceIdentity(spaceStatus)
    && Number(spaceStatus.status) === SPACE_STATUS.NORMAL
    && activeSpaceMemberCount(spaceStatus) === 2
}

/**
 * 空间是否整体公开到恋爱广场。
 *
 * 只看空间级 visibility，与故事/照片/纪念日等内容的 visibility 无关；
 * 冻结、归档时后端会强制 visibility=0，因此这里也会得到 false。
 */
export function isSpacePublic(spaceStatus) {
  return Boolean(spaceStatus) && Number(spaceStatus.visibility) === SPACE_VISIBILITY.PUBLIC
}

/**
 * 返回不能公开的原因；可以公开时返回空字符串。
 * 页面直接展示该文案，避免各页面自行拼装状态判断。
 */
export function visibilityBlockReason(spaceStatus) {
  if (!hasSpaceIdentity(spaceStatus)) return '还没有可以设置的情侣空间'
  const status = Number(spaceStatus.status)
  if (status === SPACE_STATUS.FROZEN) return '空间已冻结，恢复后才能重新公开'
  if (status === SPACE_STATUS.ARCHIVED) return '空间已归档，恢复后才能重新公开'
  if (status === SPACE_STATUS.WAITING) return '空间还在等待另一半加入，完成两人绑定后才能公开'
  if (status === SPACE_STATUS.NORMAL) {
    return activeSpaceMemberCount(spaceStatus) === 2
      ? ''
      : '情侣空间尚未完成两人绑定，不能公开'
  }
  return '当前空间状态不允许公开'
}

/** 是否存在待处理的解绑申请（只依赖 SpaceStatusVO.unbindPending）。 */
export function hasPendingUnbind(spaceStatus) {
  return Boolean(spaceStatus) && spaceStatus.unbindPending === true
}

/** 当前用户是否是该待处理解绑申请的发起人。 */
export function isUnbindRequester(spaceStatus) {
  return hasPendingUnbind(spaceStatus) && spaceStatus.unbindRequestedByMe === true
}

/**
 * 最近一次解绑申请是否已被对方拒绝，且由当前用户发起。
 *
 * 只在「当前空间允许重新发起申请」时成立：页面据此展示“已被拒绝，可重新申请”，
 * 不把取消（自己撤销）、同意（空间已解绑）或冻结/归档等不可申请状态误判为被拒绝。
 */
export function isUnbindRejectedForMe(spaceStatus) {
  if (!canRequestUnbind(spaceStatus)) return false
  return Number(spaceStatus.unbindLastStatus) === UNBIND_REQUEST_STATUS.REJECTED
    && spaceStatus.unbindLastRequestedByMe === true
}

/**
 * 发起解绑申请后，响应是否表示「已有他人发起的待处理申请」。
 *
 * 双方几乎同时申请时，后提交的一方不能当成申请成功：
 * - 新后端直接返回 20054（已有待处理的解绑申请）；
 * - 兼容旧后端幂等返回对方已有申请的响应（pending=true 且 requestedByMe=false）。
 *
 * 页面据此提示“对方已发起解绑申请”并强制刷新状态。
 */
export function isUnbindRequestConflict(responseBody) {
  if (!responseBody || typeof responseBody !== 'object') return false
  if (responseBody.success === false) {
    return String(responseBody.errorCode ?? '') === '20054'
  }
  const result = responseBody.data
  return result?.pending === true && result?.requestedByMe !== true
}

/**
 * 是否存在「另一半发起、当前用户尚未处理」的解绑申请。
 * 用于进入情侣空间时的首次提醒；发起人自己不会看到该提醒。
 */
export function isUnbindPendingForPartner(spaceStatus) {
  return hasPendingUnbind(spaceStatus)
    && spaceStatus.unbindRequestedByMe !== true
    && hasActiveSpaceMembership(spaceStatus)
}

/**
 * 是否允许发起解绑申请：有空间身份、当前用户是有效成员、空间未冻结/归档，
 * 且当前没有待处理的解绑申请。
 *
 * 新契约下不存在「单方立即退出」：页面只能发起申请，必须由另一半确认才会真正解绑。
 */
export function canRequestUnbind(spaceStatus) {
  if (!hasActiveSpaceMembership(spaceStatus)) return false
  if (hasPendingUnbind(spaceStatus)) return false
  const status = Number(spaceStatus.status)
  return status === SPACE_STATUS.WAITING || status === SPACE_STATUS.NORMAL
}

/**
 * 是否允许取消解绑申请：只有发起人本人且申请仍待处理。
 * 优先采信服务端返回的 unbindCanCancel；字段缺失时再按发起人身份兜底。
 */
export function canCancelUnbind(spaceStatus) {
  if (!hasPendingUnbind(spaceStatus) || !hasActiveSpaceMembership(spaceStatus)) return false
  if (spaceStatus.unbindCanCancel === false) return false
  if (spaceStatus.unbindCanCancel === true) return true
  return isUnbindRequester(spaceStatus)
}

/**
 * 另一方能否处理（拒绝/同意）解绑申请。
 *
 * 只依赖公开字段：必须有 pending、当前用户是有效成员、不是发起人、
 * 空间仍处于可解绑状态，并且存在另一名有效成员。
 */
function canRespondToUnbind(spaceStatus) {
  if (!hasPendingUnbind(spaceStatus) || !hasActiveSpaceMembership(spaceStatus)) return false
  if (isUnbindRequester(spaceStatus)) return false
  const status = Number(spaceStatus.status)
  if (status !== SPACE_STATUS.WAITING && status !== SPACE_STATUS.NORMAL) return false
  if (spaceStatus.unbindCanConfirm === false) return false
  if (spaceStatus.unbindCanConfirm === true) return true
  return activeSpaceMemberCount(spaceStatus) >= 2
}

/** 是否允许拒绝解绑申请：只有另一名有效成员且申请仍待处理。 */
export function canRejectUnbind(spaceStatus) {
  return canRespondToUnbind(spaceStatus)
}

/**
 * 是否允许确认解绑：只有另一名有效成员且申请仍待处理。
 * 发起人本人一定为 false（后端同样返回 20056）。
 */
export function canConfirmUnbind(spaceStatus) {
  return canRespondToUnbind(spaceStatus)
}

/** 兼容旧命名：等价于 canConfirmUnbind()。 */
export function canHandleUnbindAsPartner(spaceStatus) {
  return canConfirmUnbind(spaceStatus)
}

/** 发起解绑被阻止的可展示原因；可以发起时返回空字符串。 */
export function unbindRequestBlockReason(spaceStatus) {
  if (!hasSpaceIdentity(spaceStatus)) return '还没有可以解绑的情侣空间'
  if (!hasActiveSpaceMembership(spaceStatus)) return '你不是该情侣空间的有效成员'
  if (hasPendingUnbind(spaceStatus)) {
    return spaceStatus?.unbindRequestedByMe
      ? '解绑申请已提交，等待另一半确认'
      : '另一半已发起解绑申请，请确认或拒绝'
  }
  const status = Number(spaceStatus.status)
  if (status === SPACE_STATUS.FROZEN || status === SPACE_STATUS.ARCHIVED) {
    return '冻结或归档的空间需先恢复才能解绑'
  }
  if (status !== SPACE_STATUS.WAITING && status !== SPACE_STATUS.NORMAL) {
    return '当前空间状态不允许解绑'
  }
  return ''
}

/**
 * 设置页的解绑入口是否可点击：没有 pending 申请时按 canRequestUnbind；
 * 有 pending 申请时由取消/确认/拒绝按钮接管。
 */
export function canLeaveSpace(spaceStatus) {
  return canRequestUnbind(spaceStatus)
}

/** 兼容旧命名的可展示原因。 */
export function leaveBlockReason(spaceStatus) {
  return unbindRequestBlockReason(spaceStatus)
}

/**
 * 用户端已不再提供归档入口：归档是历史管理动作，普通成员只能走双向解绑申请。
 * 保留该函数是为了让页面与测试可以显式断言「不可归档」。
 */
export function canArchiveSpace() {
  return false
}

/** 冻结或归档空间需要走双方确认恢复流程。 */
export function isRestorableSpace(spaceStatus) {
  const status = Number(spaceStatus?.status)
  return hasSpaceIdentity(spaceStatus)
    && (status === SPACE_STATUS.FROZEN || status === SPACE_STATUS.ARCHIVED)
}

/**
 * 生命周期动作成功后“预期”的页面模式。
 *
 * 只用于结果提示与跳转预期，真实页面模式仍由刷新后的服务器状态经 deriveSpaceViewMode 推导。
 * 解绑申请/取消/拒绝只产生申请记录，页面仍是原空间；只有确认解绑才回到恋爱广场。
 */
export function deriveExpectedViewModeAfterLifecycleAction(action) {
  switch (action) {
    case SPACE_LIFECYCLE_ACTION.PUBLISH:
    case SPACE_LIFECYCLE_ACTION.HIDE:
    case SPACE_LIFECYCLE_ACTION.RESTORE:
      return SPACE_VIEW_MODE.PRIVATE
    case SPACE_LIFECYCLE_ACTION.FREEZE:
    case SPACE_LIFECYCLE_ACTION.ARCHIVE:
      return SPACE_VIEW_MODE.UNAVAILABLE
    case SPACE_LIFECYCLE_ACTION.UNBIND_REQUEST:
    case SPACE_LIFECYCLE_ACTION.UNBIND_CANCEL:
    case SPACE_LIFECYCLE_ACTION.UNBIND_REJECT:
      // 申请、取消、拒绝都不改变成员关系与空间状态：页面仍是原来的空间。
      return SPACE_VIEW_MODE.PRIVATE
    case SPACE_LIFECYCLE_ACTION.UNBIND_CONFIRM:
      // 只有另一方确认后才真正完成解绑，双方都不再有情侣空间。
      return SPACE_VIEW_MODE.PLAZA
    case SPACE_LIFECYCLE_ACTION.LEAVE:
      // /space/leave 只是 /space/unbind/request 的兼容入口，不会单方退出。
      return SPACE_VIEW_MODE.PRIVATE
    default:
      return null
  }
}

/**
 * 解绑动作成功后的“预期”页面模式。
 *
 * 只用于提示与跳转预期，真实页面模式必须由刷新后的服务器状态经 deriveSpaceViewMode 推导。
 * - 申请 / 取消 / 拒绝：成员关系不变，页面仍在原空间；
 * - 同意解绑：双方退出，预期回到恋爱广场；
 * - 发起人不能确认自己的申请，因此返回 null 表示该动作无效。
 *
 * @param {string} action 解绑动作
 * @param {'requester'|'partner'|undefined} actor 当前操作者身份
 * @returns {string|null}
 */
export function deriveExpectedViewModeAfterUnbind(action, actor) {
  switch (action) {
    case SPACE_LIFECYCLE_ACTION.UNBIND_REQUEST:
    case SPACE_LIFECYCLE_ACTION.UNBIND_CANCEL:
    case SPACE_LIFECYCLE_ACTION.UNBIND_REJECT:
      return SPACE_VIEW_MODE.PRIVATE
    case SPACE_LIFECYCLE_ACTION.LEAVE:
      // 旧兼容入口只创建申请，不能单方完成解绑。
      return SPACE_VIEW_MODE.PRIVATE
    case SPACE_LIFECYCLE_ACTION.UNBIND_CONFIRM:
      return actor === UNBIND_ACTOR.REQUESTER ? null : SPACE_VIEW_MODE.PLAZA
    default:
      return null
  }
}
