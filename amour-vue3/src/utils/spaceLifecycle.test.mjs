import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SPACE_LIFECYCLE_ACTION,
  SPACE_STATUS,
  SPACE_VIEW_MODE,
  canArchiveSpace,
  canCancelUnbind,
  canHandleUnbindAsPartner,
  canPublishSpace,
  canRequestUnbind,
  deriveExpectedViewModeAfterLifecycleAction,
  hasActiveSpaceMembership,
  isRestorableSpace,
  isSpacePublic,
  unbindRequestBlockReason,
  visibilityBlockReason,
} from '../utils/spaceState.js'

/**
 * 运行：npm run test:space-settings
 *
 * 覆盖空间设置页依赖的生命周期纯规则：
 * - 公开资格只看 status=1 且 memberCount=2；
 * - 公开状态只看空间级 visibility；
 * - 用户端已不再提供归档入口（canArchiveSpace 恒为 false）；
 * - 解绑改为双向申请：发起只看空间状态，取消/确认只看服务端返回的 unbindCanCancel / unbindCanConfirm；
 * - 生命周期动作的“预期模式”只用于提示，不覆盖服务器结果。
 *
 * 这些函数不访问网络、不读写 localStorage，也不持久化任何空间字段。
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

// ============================== canPublishSpace ==============================

test('只有 status=1 且有两名有效成员时可以公开', () => {
  assert.equal(canPublishSpace(space()), true)
  assert.equal(canPublishSpace(space({ visibility: 1 })), true)
})

test('等待绑定、冻结、归档都不能公开', () => {
  for (const status of [SPACE_STATUS.WAITING, SPACE_STATUS.FROZEN, SPACE_STATUS.ARCHIVED]) {
    assert.equal(canPublishSpace(space({ status })), false, `status=${status} 不应可公开`)
  }
})

test('单人空间即使 status=1 也不能公开', () => {
  assert.equal(canPublishSpace(space({ memberCount: 1 })), false)
  assert.equal(canPublishSpace(space({ memberCount: 0 })), false)
  assert.equal(canPublishSpace(space({ memberCount: undefined })), false)
})

test('没有空间身份时不能公开', () => {
  assert.equal(canPublishSpace(null), false)
  assert.equal(canPublishSpace({}), false)
  assert.equal(canPublishSpace({ spaceId: 2001 }), false)
})

test('字符串 status/memberCount 与数字等价', () => {
  assert.equal(canPublishSpace(space({ status: '1', memberCount: '2' })), true)
})

// ============================== isSpacePublic ==============================

test('空间级 visibility=1 才算公开', () => {
  assert.equal(isSpacePublic(space({ visibility: 1 })), true)
  assert.equal(isSpacePublic(space({ visibility: 0 })), false)
  assert.equal(isSpacePublic(space({ visibility: '1' })), true)
})

test('没有空间或缺少 visibility 时按私密处理', () => {
  assert.equal(isSpacePublic(null), false)
  assert.equal(isSpacePublic({}), false)
  assert.equal(isSpacePublic({ spaceId: 2001 }), false)
})

test('公开状态与内容级 visibility 解耦', () => {
  // 空间私密 + 内容字段公开，整体仍然是私密。
  assert.equal(isSpacePublic(space({ visibility: 0, contentVisibility: 1 })), false)
  // 空间公开 + 内容字段私密，整体仍然是公开。
  assert.equal(isSpacePublic(space({ visibility: 1, contentVisibility: 0 })), true)
})

// ============================== visibilityBlockReason ==============================

test('可公开时没有阻止原因', () => {
  assert.equal(visibilityBlockReason(space()), '')
})

test('冻结、归档、等待绑定分别给出可展示的原因', () => {
  assert.match(visibilityBlockReason(space({ status: SPACE_STATUS.FROZEN })), /冻结/)
  assert.match(visibilityBlockReason(space({ status: SPACE_STATUS.ARCHIVED })), /归档/)
  assert.match(visibilityBlockReason(space({ status: SPACE_STATUS.WAITING })), /另一半/)
})

test('单人正常空间提示未完成两人绑定', () => {
  assert.match(visibilityBlockReason(space({ memberCount: 1 })), /两人绑定/)
})

test('没有空间时也有可展示的阻止原因', () => {
  assert.equal(typeof visibilityBlockReason(null), 'string')
  assert.ok(visibilityBlockReason(null).length > 0)
})

// ============================== canArchiveSpace（用户端已下线） ==============================

test('用户端不再提供任何归档入口', () => {
  for (const status of [SPACE_STATUS.WAITING, SPACE_STATUS.NORMAL, SPACE_STATUS.FROZEN, SPACE_STATUS.ARCHIVED]) {
    assert.equal(canArchiveSpace(space({ status })), false, `status=${status} 不应可归档`)
  }
  assert.equal(canArchiveSpace(space()), false)
  assert.equal(canArchiveSpace(null), false)
})

// ============================== 解绑申请 ==============================

test('有效成员可以对等待绑定或正常的空间发起解绑申请', () => {
  assert.equal(canRequestUnbind(space({ status: SPACE_STATUS.WAITING, memberCount: 1 })), true)
  assert.equal(canRequestUnbind(space({ status: SPACE_STATUS.NORMAL })), true)
})

test('冻结、归档空间必须先恢复才能发起解绑', () => {
  for (const status of [SPACE_STATUS.FROZEN, SPACE_STATUS.ARCHIVED]) {
    assert.equal(canRequestUnbind(space({ status })), false)
    assert.match(unbindRequestBlockReason(space({ status })), /恢复/)
  }
})

test('已有待处理申请时不能重复发起', () => {
  assert.equal(canRequestUnbind(space({ unbindPending: true })), false)
  assert.match(
    unbindRequestBlockReason(space({ unbindPending: true, unbindRequestedByMe: true })),
    /等待另一半确认/,
  )
  assert.match(
    unbindRequestBlockReason(space({ unbindPending: true, unbindRequestedByMe: false })),
    /另一半已发起/,
  )
})

test('非成员、已解绑或没有空间身份不能发起解绑', () => {
  assert.equal(canRequestUnbind(space({ currentUserRole: null })), false)
  assert.equal(canRequestUnbind(space({ memberCount: 0 })), false)
  assert.equal(canRequestUnbind(space({ status: SPACE_STATUS.DELETED })), false)
  assert.equal(canRequestUnbind(null), false)
  assert.equal(typeof unbindRequestBlockReason(null), 'string')
})

test('可以发起解绑时没有阻止原因', () => {
  assert.equal(unbindRequestBlockReason(space()), '')
})

test('取消解绑只认服务端返回的 unbindCanCancel', () => {
  assert.equal(canCancelUnbind(space({ unbindPending: true, unbindCanCancel: true })), true)
  assert.equal(canCancelUnbind(space({ unbindPending: true, unbindCanCancel: false })), false)
  assert.equal(canCancelUnbind(space()), false)
  assert.equal(canCancelUnbind(null), false)
})

test('确认/拒绝解绑只认服务端返回的 unbindCanConfirm', () => {
  assert.equal(canHandleUnbindAsPartner(space({ unbindPending: true, unbindCanConfirm: true })), true)
  // 发起人本人：服务端会返回 unbindCanConfirm=false。
  assert.equal(canHandleUnbindAsPartner(space({
    unbindPending: true,
    unbindRequestedByMe: true,
    unbindCanConfirm: false,
  })), false)
  assert.equal(canHandleUnbindAsPartner(space()), false)
  assert.equal(canHandleUnbindAsPartner(null), false)
})

// ============================== hasActiveSpaceMembership ==============================

test('只有带有效成员身份的空间才算有效成员', () => {
  assert.equal(hasActiveSpaceMembership(space()), true)
  assert.equal(hasActiveSpaceMembership(space({ currentUserRole: 2 })), true)
  assert.equal(hasActiveSpaceMembership(space({ currentUserRole: null })), false)
  assert.equal(hasActiveSpaceMembership({ spaceId: 2001 }), false)
  assert.equal(hasActiveSpaceMembership(null), false)
})

// ============================== isRestorableSpace ==============================

test('只有冻结或归档空间需要恢复流程', () => {
  assert.equal(isRestorableSpace(space({ status: SPACE_STATUS.FROZEN })), true)
  assert.equal(isRestorableSpace(space({ status: SPACE_STATUS.ARCHIVED })), true)
  assert.equal(isRestorableSpace(space({ status: SPACE_STATUS.NORMAL })), false)
  assert.equal(isRestorableSpace(space({ status: SPACE_STATUS.WAITING })), false)
  assert.equal(isRestorableSpace(null), false)
})

// ============================== deriveExpectedViewModeAfterLifecycleAction ==============================

test('公开、隐藏、恢复后预期回到正常空间模式', () => {
  for (const action of [SPACE_LIFECYCLE_ACTION.PUBLISH, SPACE_LIFECYCLE_ACTION.HIDE, SPACE_LIFECYCLE_ACTION.RESTORE]) {
    assert.equal(deriveExpectedViewModeAfterLifecycleAction(action), SPACE_VIEW_MODE.PRIVATE)
  }
})

test('冻结与历史归档后预期不可用', () => {
  assert.equal(deriveExpectedViewModeAfterLifecycleAction(SPACE_LIFECYCLE_ACTION.FREEZE), SPACE_VIEW_MODE.UNAVAILABLE)
  assert.equal(deriveExpectedViewModeAfterLifecycleAction(SPACE_LIFECYCLE_ACTION.ARCHIVE), SPACE_VIEW_MODE.UNAVAILABLE)
})

test('发起、取消、拒绝解绑后仍停留在原空间', () => {
  for (const action of [
    SPACE_LIFECYCLE_ACTION.UNBIND_REQUEST,
    SPACE_LIFECYCLE_ACTION.UNBIND_CANCEL,
    SPACE_LIFECYCLE_ACTION.UNBIND_REJECT,
  ]) {
    assert.equal(deriveExpectedViewModeAfterLifecycleAction(action), SPACE_VIEW_MODE.PRIVATE)
  }
})

test('确认解绑后预期回到广场，旧 leave 兼容入口仍停在原空间', () => {
  assert.equal(
    deriveExpectedViewModeAfterLifecycleAction(SPACE_LIFECYCLE_ACTION.UNBIND_CONFIRM),
    SPACE_VIEW_MODE.PLAZA,
  )
  // /space/leave 已改为发起申请，不允许单方立即退出。
  assert.equal(deriveExpectedViewModeAfterLifecycleAction(SPACE_LIFECYCLE_ACTION.LEAVE), SPACE_VIEW_MODE.PRIVATE)
})

test('未知动作没有预期模式', () => {
  assert.equal(deriveExpectedViewModeAfterLifecycleAction('unknown'), null)
  assert.equal(deriveExpectedViewModeAfterLifecycleAction(undefined), null)
})

test('预期模式不读取本地空间对象，只是动作结果的提示值', () => {
  // 函数签名只接受 action 与 actor，不会返回服务器状态本身。
  const expected = deriveExpectedViewModeAfterLifecycleAction(SPACE_LIFECYCLE_ACTION.PUBLISH)
  assert.equal(expected, 'private')
  assert.notEqual(expected, SPACE_VIEW_MODE.PLAZA)
})

// ============================== 删除等待期 / 已删除 / 未知状态 ==============================

test('删除等待期与已删除状态不能公开、归档或发起解绑', () => {
  for (const status of [SPACE_STATUS.DELETING, SPACE_STATUS.DELETED]) {
    const space = { spaceId: 2001, status, memberCount: 2, currentUserRole: 1, visibility: 0 }
    assert.equal(canPublishSpace(space), false, `status=${status} 不应可公开`)
    assert.equal(canArchiveSpace(space), false, `status=${status} 不应可归档`)
    assert.equal(canRequestUnbind(space), false, `status=${status} 不应可解绑`)
    assert.ok(visibilityBlockReason(space).length > 0)
    assert.ok(unbindRequestBlockReason(space).length > 0)
  }
})

test('未知状态既不能公开也不能解绑，且给出可展示原因', () => {
  const space = { spaceId: 2001, status: 9, memberCount: 2, currentUserRole: 1, visibility: 0 }
  assert.equal(canPublishSpace(space), false)
  assert.equal(canRequestUnbind(space), false)
  assert.match(visibilityBlockReason(space), /不允许公开/)
  assert.match(unbindRequestBlockReason(space), /不允许解绑/)
})
