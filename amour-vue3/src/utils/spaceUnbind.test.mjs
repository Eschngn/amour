import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SPACE_LIFECYCLE_ACTION,
  SPACE_STATUS,
  SPACE_VIEW_MODE,
  UNBIND_ACTOR,
  UNBIND_REQUEST_STATUS,
  canCancelUnbind,
  canConfirmUnbind,
  canRejectUnbind,
  canRequestUnbind,
  deriveExpectedViewModeAfterUnbind,
  deriveSpaceViewMode,
  hasActiveSpaceMembership,
  hasPendingUnbind,
  isReadySpace,
  isUnbindPendingForPartner,
  isUnbindRejectedForMe,
  isUnbindRequestConflict,
  isUnbindRequester,
} from './spaceState.js'
import { createSpaceRequestGate } from './spaceRequestGate.js'
import { buildUnbindPromptKey } from './spaceUnbindPrompt.js'

/**
 * 运行：npm run test:space-state
 *
 * 覆盖双向解绑的纯规则与强制刷新语义：
 * - 无空间不能申请解绑；
 * - 申请、取消、拒绝不改变双方有效成员关系；
 * - 发起人只能取消，另一方才能同意/拒绝；
 * - status=5 已完成解绑后不能再继续任何解绑动作；
 * - force refresh 丢弃写操作之前的旧请求；
 * - 页面最终模式必须来自刷新后的服务器状态，而不是本地伪造。
 */

function space(overrides = {}) {
  return {
    spaceId: 2001,
    status: SPACE_STATUS.NORMAL,
    visibility: 0,
    memberCount: 2,
    currentUserRole: 1,
    ...overrides,
  }
}

/** 发起人视角：申请由我发起，双方仍是有效成员。 */
function requesterSpace(overrides = {}) {
  return space({
    currentUserRole: 1,
    unbindPending: true,
    unbindRequestedByMe: true,
    unbindCanCancel: true,
    unbindCanConfirm: false,
    unbindRequester: { amourId: 'LY100001', displayName: '菠萝吹雪', avatar: '' },
    unbindRequestedAt: '2026-11-07 10:00:00',
    ...overrides,
  })
}

/** 另一方视角：此时只能同意或拒绝，不能取消。 */
function partnerSpace(overrides = {}) {
  return space({
    currentUserRole: 2,
    unbindPending: true,
    unbindRequestedByMe: false,
    unbindCanCancel: false,
    unbindCanConfirm: true,
    unbindRequester: { amourId: 'LY100002', displayName: '梨花诗', avatar: '' },
    unbindRequestedAt: '2026-11-07 10:00:00',
    ...overrides,
  })
}

// ============================== 无空间 / 无效成员 ==============================

test('没有空间记录、不是有效成员或另一半还没加入时不能申请解绑', () => {
  assert.equal(canRequestUnbind(null), false)
  assert.equal(canRequestUnbind({}), false)
  assert.equal(canRequestUnbind(space({ currentUserRole: null })), false)
  assert.equal(canRequestUnbind(space({ memberCount: 0 })), false)
  assert.equal(canRequestUnbind(space({ memberCount: 1 })), false)
  assert.equal(hasPendingUnbind(null), false)
  assert.equal(isUnbindRequester(null), false)
})

// ============================== 单方申请后的成员关系 ==============================

test('单方申请后双方仍然是有效成员，空间仍是正常空间', () => {
  const requester = requesterSpace()
  const partner = partnerSpace()

  assert.equal(hasActiveSpaceMembership(requester), true)
  assert.equal(hasActiveSpaceMembership(partner), true)
  // 申请阶段不改变成员关系，页面仍是原空间。
  assert.equal(deriveSpaceViewMode(true, requester), SPACE_VIEW_MODE.PRIVATE)
  assert.equal(deriveSpaceViewMode(true, partner), SPACE_VIEW_MODE.PRIVATE)
  assert.equal(
    deriveExpectedViewModeAfterUnbind(SPACE_LIFECYCLE_ACTION.UNBIND_REQUEST, UNBIND_ACTOR.REQUESTER),
    SPACE_VIEW_MODE.PRIVATE,
  )
})

// ============================== 发起人只能取消 ==============================

test('发起人可以取消，但不能同意或拒绝自己的申请', () => {
  const requester = requesterSpace()

  assert.equal(hasPendingUnbind(requester), true)
  assert.equal(isUnbindRequester(requester), true)
  assert.equal(canCancelUnbind(requester), true)
  assert.equal(canConfirmUnbind(requester), false)
  assert.equal(canRejectUnbind(requester), false)
})

test('即使服务器字段异常，发起人也不能确认自己的申请', () => {
  const requester = requesterSpace({ unbindCanConfirm: true })
  assert.equal(canConfirmUnbind(requester), false)
  assert.equal(canRejectUnbind(requester), false)
})

// ============================== 另一方可以拒绝或确认 ==============================

test('另一方可以拒绝或同意，但不能取消', () => {
  const partner = partnerSpace()

  assert.equal(isUnbindRequester(partner), false)
  assert.equal(canCancelUnbind(partner), false)
  assert.equal(canRejectUnbind(partner), true)
  assert.equal(canConfirmUnbind(partner), true)
})

test('没有待处理申请时任何解绑处理按钮都不可用', () => {
  const normal = space()
  assert.equal(canCancelUnbind(normal), false)
  assert.equal(canRejectUnbind(normal), false)
  assert.equal(canConfirmUnbind(normal), false)
})

// ============================== 被拒绝 / 另一半待处理 ==============================

test('只有发起人本人会看到“已被拒绝，可重新申请”', () => {
  const rejectedByPartner = space({
    unbindLastStatus: UNBIND_REQUEST_STATUS.REJECTED,
    unbindLastRequestedByMe: true,
    unbindLastResolvedAt: '2026-11-07 11:00:00',
  })
  const rejectedOtherRequest = space({
    unbindLastStatus: UNBIND_REQUEST_STATUS.REJECTED,
    unbindLastRequestedByMe: false,
  })
  const cancelledByMe = space({
    unbindLastStatus: UNBIND_REQUEST_STATUS.CANCELLED,
    unbindLastRequestedByMe: true,
  })

  assert.equal(isUnbindRejectedForMe(rejectedByPartner), true)
  assert.equal(isUnbindRejectedForMe(rejectedOtherRequest), false)
  assert.equal(isUnbindRejectedForMe(cancelledByMe), false)
  // 新的申请已经 pending 时，不应同时展示上一次的拒绝结果。
  assert.equal(isUnbindRejectedForMe(requesterSpace({ unbindLastStatus: UNBIND_REQUEST_STATUS.REJECTED })), false)
  assert.equal(isUnbindRejectedForMe(space({ currentUserRole: null })), false)
  assert.equal(isUnbindRejectedForMe(null), false)
})

test('只有另一半发起且当前用户可处理时才需要弹窗提醒', () => {
  assert.equal(isUnbindPendingForPartner(partnerSpace()), true)
  assert.equal(isUnbindPendingForPartner(requesterSpace()), false)
  assert.equal(isUnbindPendingForPartner(space()), false)
  assert.equal(isUnbindPendingForPartner(null), false)
})

test('发起解绑时能识别对方已先提交的待处理申请', () => {
  // 新后端：另一方已发起时返回 20054，不能当作申请成功。
  assert.equal(isUnbindRequestConflict({ success: false, errorCode: '20054' }), true)
  assert.equal(isUnbindRequestConflict({ success: false, errorCode: '20055' }), false)
  // 旧后端兼容：幂等返回对方已有的申请。
  assert.equal(isUnbindRequestConflict({
    success: true,
    data: { pending: true, requestedByMe: false },
  }), true)
  // 本人重复提交仍按幂等成功处理，不触发冲突提示。
  assert.equal(isUnbindRequestConflict({
    success: true,
    data: { pending: true, requestedByMe: true },
  }), false)
  assert.equal(isUnbindRequestConflict({
    success: true,
    data: { pending: false, requestedByMe: false },
  }), false)
  assert.equal(isUnbindRequestConflict(null), false)
})

test('解绑提醒的去重标识按单条申请生成，且不保存内部 ID', () => {
  const first = partnerSpace({ unbindRequestId: 9001 })
  const sameRequest = partnerSpace({ unbindRequestId: 9001 })
  const nextRequest = partnerSpace({ unbindRequestId: 9002 })

  assert.notEqual(buildUnbindPromptKey(first), '')
  assert.equal(buildUnbindPromptKey(first), buildUnbindPromptKey(sameRequest))
  assert.notEqual(buildUnbindPromptKey(first), buildUnbindPromptKey(nextRequest))
  assert.equal(buildUnbindPromptKey(first).includes('9001'), false)

  // 旧服务端没有 requestId 时，用公开的申请时间与发起人恋语 ID 兜底。
  const fallback = partnerSpace({ unbindRequestId: null })
  const fallbackNext = partnerSpace({
    unbindRequestId: null,
    unbindRequestedAt: '2026-11-07 12:00:00',
  })
  assert.notEqual(buildUnbindPromptKey(fallback), '')
  assert.notEqual(buildUnbindPromptKey(fallback), buildUnbindPromptKey(fallbackNext))
})

// ============================== status=5 已解除绑定 ==============================

test('status=5 不能继续申请、取消、拒绝或确认解绑', () => {
  const deleted = space({
    status: SPACE_STATUS.DELETED,
    unbindPending: true,
    unbindRequestedByMe: true,
    unbindCanCancel: true,
    unbindCanConfirm: true,
  })

  assert.equal(canRequestUnbind(deleted), false)
  assert.equal(canCancelUnbind(deleted), false)
  assert.equal(canRejectUnbind(deleted), false)
  assert.equal(canConfirmUnbind(deleted), false)
  assert.equal(hasActiveSpaceMembership(deleted), false)
})

test('status=5 与无有效成员的空间都不会被推导成 private', () => {
  const deleted = { spaceId: 2001, status: SPACE_STATUS.DELETED, memberCount: 0, currentUserRole: null }
  const emptyNormal = { spaceId: 2001, status: SPACE_STATUS.NORMAL, memberCount: 0, currentUserRole: null }

  assert.equal(isReadySpace(deleted), false)
  assert.equal(isReadySpace(emptyNormal), false)
  assert.equal(deriveSpaceViewMode(true, deleted), SPACE_VIEW_MODE.UNAVAILABLE)
  assert.equal(deriveSpaceViewMode(true, emptyNormal), SPACE_VIEW_MODE.UNAVAILABLE)
})

// ============================== force refresh 竞态 ==============================

test('force refresh 失效旧请求，旧响应不能覆盖新状态', () => {
  const gate = createSpaceRequestGate()
  let serverState = space({ status: SPACE_STATUS.NORMAL })
  const staleRequest = gate.begin()

  // 写操作成功后的强制刷新：旧请求全部失效，并丢弃旧 in-flight。
  gate.invalidate()
  assert.equal(gate.currentInflight(), null)
  const freshRequest = gate.begin()

  // 旧响应晚到：按闸门判断必须丢弃，不能把旧空间写回页面。
  if (gate.isCurrent(staleRequest)) serverState = space({ status: SPACE_STATUS.NORMAL, unbindPending: true })
  assert.equal(hasPendingUnbind(serverState), false)

  // 新响应生效：确认解绑后服务器返回 data=null，页面状态只能跟随服务器。
  if (gate.isCurrent(freshRequest)) serverState = null
  assert.equal(serverState, null)
  assert.equal(deriveSpaceViewMode(true, serverState), SPACE_VIEW_MODE.PLAZA)
})

// ============================== 确认解绑后的服务器状态 ==============================

test('确认解绑后页面模式来自刷新结果，而不是本地伪造', () => {
  // 预期值只用于提示：另一方确认解绑后预期回到广场。
  assert.equal(
    deriveExpectedViewModeAfterUnbind(SPACE_LIFECYCLE_ACTION.UNBIND_CONFIRM, UNBIND_ACTOR.PARTNER),
    SPACE_VIEW_MODE.PLAZA,
  )
  // 发起人不能确认，因此没有有效的预期模式。
  assert.equal(
    deriveExpectedViewModeAfterUnbind(SPACE_LIFECYCLE_ACTION.UNBIND_CONFIRM, UNBIND_ACTOR.REQUESTER),
    null,
  )
  // 旧 /space/leave 只创建申请，不能按「双方已解绑」跳转广场。
  assert.equal(
    deriveExpectedViewModeAfterUnbind(SPACE_LIFECYCLE_ACTION.LEAVE, UNBIND_ACTOR.REQUESTER),
    SPACE_VIEW_MODE.PRIVATE,
  )

  // 真实模式必须由服务器刷新结果推导：data=null 才是广场。
  assert.equal(deriveSpaceViewMode(true, null), SPACE_VIEW_MODE.PLAZA)
  // 若服务器仍返回正常空间，页面不能被“预期值”强行改成广场。
  assert.equal(deriveSpaceViewMode(true, space()), SPACE_VIEW_MODE.PRIVATE)
})

test('解绑纯函数不会修改传入的服务器空间对象', () => {
  const serverSpace = partnerSpace()
  const snapshot = JSON.stringify(serverSpace)

  canRequestUnbind(serverSpace)
  canCancelUnbind(serverSpace)
  canConfirmUnbind(serverSpace)
  canRejectUnbind(serverSpace)
  deriveSpaceViewMode(true, serverSpace)
  deriveExpectedViewModeAfterUnbind(SPACE_LIFECYCLE_ACTION.UNBIND_CONFIRM, UNBIND_ACTOR.PARTNER)

  assert.equal(JSON.stringify(serverSpace), snapshot)
})
