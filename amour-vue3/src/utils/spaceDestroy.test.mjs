import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SPACE_LIFECYCLE_ACTION,
  SPACE_STATUS,
  SPACE_VIEW_MODE,
  canDestroySpace,
  canShowDestroySection,
  destroyBlockReason,
  deriveExpectedViewModeAfterLifecycleAction,
  deriveSpaceViewMode,
  hasActiveSpaceMembership,
  isDestroyedSpace,
  isDestroyRejectedByServer,
  readSpaceErrorCode,
} from './spaceState.js'
import {
  AUTH_LOCAL_STORAGE_KEYS,
  DESTROY_CONFIRM_KEYWORD,
  DESTROY_ERROR_CODE,
  DESTROY_LOCAL_STORAGE_KEYS,
  DESTROY_REFRESH_FAILED_MESSAGE,
  DESTROY_SETTLE_RESULT,
  DESTROY_SPACE_STILL_PRESENT_MESSAGE,
  buildDestroyErrorMessage,
  buildDestroyPromptMessage,
  clearSpaceLocalCache,
  isDestroyStateConflict,
  readDestroyErrorCode,
  resolveDestroySettleResult,
  validateDestroyConfirmInput,
} from './spaceDestroy.js'
import { createSpaceRequestGate } from './spaceRequestGate.js'

/**
 * 运行：npm test（或 node --test src/utils/spaceDestroy.test.mjs）
 *
 * 覆盖「创建者销毁并清空空间」的纯规则与交互约定：
 * - 只有创建者 + 另一半未加入才展示且允许销毁；
 * - 另一半已加入 / 非创建者 / 状态不允许时服务端拒绝并且前端给出可理解提示；
 * - 二次确认必须输入固定文案；
 * - 销毁成功后页面模式必须来自刷新后的服务器状态，不能本地伪造；
 * - 本地缓存只清理空间相关键，不清空登录态。
 */

function space(overrides = {}) {
  return {
    spaceId: 3001,
    status: SPACE_STATUS.WAITING,
    visibility: 0,
    memberCount: 1,
    currentUserRole: 1,
    creator: true,
    ...overrides,
  }
}

// ============================== 入口展示 ==============================

test('只有创建者且另一半未加入时才展示销毁入口', () => {
  assert.equal(canShowDestroySection(space()), true)
  // 另一半已加入：不展示（服务端同样拒绝）。
  assert.equal(canShowDestroySection(space({ memberCount: 2 })), false)
  // 非创建者：不展示。
  assert.equal(canShowDestroySection(space({ creator: false })), false)
  // 没有空间 / 不是有效成员 / 已销毁：不展示。
  assert.equal(canShowDestroySection(null), false)
  assert.equal(canShowDestroySection({}), false)
  assert.equal(canShowDestroySection(space({ currentUserRole: null })), false)
  assert.equal(canShowDestroySection(space({ status: SPACE_STATUS.DESTROYED })), false)
})

test('只有创建者 + 单人 + 可销毁状态才允许发起销毁', () => {
  assert.equal(canDestroySpace(space()), true)
  assert.equal(canDestroySpace(space({ memberCount: 2 })), false)
  assert.equal(canDestroySpace(space({ creator: false })), false)
  assert.equal(canDestroySpace(space({ status: SPACE_STATUS.FROZEN })), false)
  assert.equal(canDestroySpace(space({ status: SPACE_STATUS.ARCHIVED })), false)
  assert.equal(canDestroySpace(space({ status: SPACE_STATUS.DELETED })), false)
  assert.equal(canDestroySpace(space({ status: SPACE_STATUS.DESTROYED })), false)
  assert.equal(canDestroySpace(space({ unbindPending: true })), false)
  assert.equal(canDestroySpace(null), false)
})

test('销毁阻止原因覆盖全部拒绝场景', () => {
  assert.equal(destroyBlockReason(space()), '')
  assert.match(destroyBlockReason(space({ memberCount: 2 })), /另一半已加入/)
  assert.match(destroyBlockReason(space({ creator: false })), /创建者/)
  assert.match(destroyBlockReason(space({ status: SPACE_STATUS.FROZEN })), /冻结或归档/)
  assert.match(destroyBlockReason(space({ status: SPACE_STATUS.DESTROYED })), /已销毁/)
  assert.match(destroyBlockReason(space({ unbindPending: true })), /解绑申请/)
  assert.match(destroyBlockReason(null), /还没有/)
})

test('销毁纯函数不会修改传入的服务器空间对象', () => {
  const serverSpace = space()
  const snapshot = JSON.stringify(serverSpace)
  canShowDestroySection(serverSpace)
  canDestroySpace(serverSpace)
  destroyBlockReason(serverSpace)
  deriveSpaceViewMode(true, serverSpace)
  assert.equal(JSON.stringify(serverSpace), snapshot)
})

// ============================== 状态推导 ==============================

test('status=6 已销毁不是可用空间，也不会被推导成 private', () => {
  const destroyed = space({ status: SPACE_STATUS.DESTROYED, memberCount: 0, currentUserRole: null })
  assert.equal(isDestroyedSpace(destroyed), true)
  assert.equal(isDestroyedSpace(space()), false)
  assert.equal(hasActiveSpaceMembership(destroyed), false)
  assert.equal(deriveSpaceViewMode(true, destroyed), SPACE_VIEW_MODE.UNAVAILABLE)
})

test('销毁成功后预期回到恋爱广场，真实模式仍以刷新结果为准', () => {
  assert.equal(
    deriveExpectedViewModeAfterLifecycleAction(SPACE_LIFECYCLE_ACTION.DESTROY),
    SPACE_VIEW_MODE.PLAZA,
  )
  // 服务器刷新后返回 data=null 才是广场。
  assert.equal(deriveSpaceViewMode(true, null), SPACE_VIEW_MODE.PLAZA)
  // 若服务器仍返回空间，页面不能被“预期值”强行改成广场。
  assert.equal(deriveSpaceViewMode(true, space()), SPACE_VIEW_MODE.UNAVAILABLE)
})

test('force refresh 丢弃销毁请求之前的旧响应', () => {
  const gate = createSpaceRequestGate()
  let serverState = space()
  const staleRequest = gate.begin()

  gate.invalidate()
  const freshRequest = gate.begin()

  // 旧响应晚到：必须被丢弃，不能把空间写回页面。
  if (gate.isCurrent(staleRequest)) serverState = space()
  assert.equal(serverState.spaceId, 3001)

  // 新响应生效：销毁后服务器返回 data=null。
  if (gate.isCurrent(freshRequest)) serverState = null
  assert.equal(serverState, null)
  assert.equal(deriveSpaceViewMode(true, serverState), SPACE_VIEW_MODE.PLAZA)
})

// ============================== 二次确认 ==============================

test('销毁确认文案必须说明双方不可见、用户侧不可恢复、仅管理员可恢复', () => {
  const message = buildDestroyPromptMessage(space({ spaceName: '我们的故事' }))
  assert.match(message, /我们的故事/)
  assert.match(message, /另一半都不可见/)
  assert.match(message, /无法自行恢复/)
  assert.match(message, /平台管理员可以协助恢复/)
  assert.match(message, /另一半已经加入/)
  // 没有名称时回退到 spaceCode / ID，不出现 undefined。
  assert.doesNotMatch(buildDestroyPromptMessage({ spaceId: 9 }), /undefined/)
  assert.match(buildDestroyPromptMessage({ spaceId: 9 }), /ID 9/)
})

test('二次确认必须逐字输入固定文案', () => {
  assert.equal(DESTROY_CONFIRM_KEYWORD, '销毁')
  assert.equal(validateDestroyConfirmInput(DESTROY_CONFIRM_KEYWORD), true)
  assert.equal(validateDestroyConfirmInput(`  ${DESTROY_CONFIRM_KEYWORD}  `), true)
  assert.match(validateDestroyConfirmInput(''), /请输入/)
  assert.equal(validateDestroyConfirmInput('销毁 '), true)
  assert.match(validateDestroyConfirmInput('确定'), /准确输入/)
  assert.match(validateDestroyConfirmInput('delete'), /准确输入/)
})

// ============================== 服务端拒绝处理 ==============================

test('另一半已加入等拒绝必须给出可理解提示并触发状态刷新', () => {
  const partnerJoined = { success: false, errorCode: '20094', message: '另一半已加入情侣空间，不能再销毁' }
  const notCreator = { success: false, errorCode: '20093' }
  const statusNotAllowed = { success: false, errorCode: '20095' }
  const destroyed = { success: false, errorCode: '20096' }

  assert.match(buildDestroyErrorMessage(partnerJoined), /另一半已经加入/)
  assert.match(buildDestroyErrorMessage(notCreator), /创建者/)
  assert.match(buildDestroyErrorMessage(statusNotAllowed), /状态不允许/)
  assert.match(buildDestroyErrorMessage(destroyed), /已被销毁/)

  // 状态类拒绝必须刷新；「已销毁」不需要额外刷新但仍然按提示处理。
  assert.equal(isDestroyRejectedByServer(partnerJoined), true)
  assert.equal(isDestroyRejectedByServer(notCreator), true)
  assert.equal(isDestroyRejectedByServer(statusNotAllowed), true)
  assert.equal(isDestroyRejectedByServer(destroyed), false)
  assert.equal(isDestroyRejectedByServer({ success: false, errorCode: '20034' }), false)

  assert.equal(isDestroyStateConflict(partnerJoined), true)
  assert.equal(isDestroyStateConflict(destroyed), false)
  assert.equal(isDestroyStateConflict(null), false)
})

test('20102 另一半曾加入过：给出准确提示并要求刷新状态', () => {
  const partnerHistory = {
    success: false,
    errorCode: DESTROY_ERROR_CODE.PARTNER_HISTORY,
    message: '另一半曾加入过该情侣空间，不能按「尚未加入」销毁',
  }
  assert.equal(DESTROY_ERROR_CODE.PARTNER_HISTORY, '20102')

  const message = buildDestroyErrorMessage(partnerHistory)
  assert.match(message, /另一半曾加入过该空间/)
  assert.match(message, /无法按「尚未加入」销毁/)
  assert.match(message, /联系管理员/)
  // 不能把历史成员冲突说成「另一半已经加入」（20094 的文案），否则用户会被引导去解绑。
  assert.doesNotMatch(message, /任何一方都可以发起解绑申请/)

  assert.equal(isDestroyStateConflict(partnerHistory), true)
  assert.equal(isDestroyRejectedByServer(partnerHistory), true)
  // 服务端既可能放在业务响应体，也可能放在 Axios 异常的 response.data 里。
  assert.equal(
    isDestroyStateConflict(null, { response: { data: { errorCode: '20102' } } }),
    true,
  )
})

test('20103 目标空间已变化：提示刷新后重试并强制刷新状态', () => {
  const targetChanged = {
    success: false,
    errorCode: DESTROY_ERROR_CODE.TARGET_CHANGED,
    message: '销毁目标已变化，请刷新空间状态后重试',
  }
  assert.equal(DESTROY_ERROR_CODE.TARGET_CHANGED, '20103')

  const message = buildDestroyErrorMessage(targetChanged)
  assert.match(message, /空间已变化/)
  assert.match(message, /刷新后重试/)
  // 不是「另一半已加入」，也不是「已销毁」，不能误导用户。
  assert.doesNotMatch(message, /另一半/)
  assert.doesNotMatch(message, /已被销毁/)

  assert.equal(isDestroyStateConflict(targetChanged), true)
  assert.equal(isDestroyRejectedByServer(targetChanged), true)
  assert.equal(
    isDestroyStateConflict(null, { response: { data: { errorCode: '20103' } } }),
    true,
  )
})

test('两个新错误码都优先使用前端文案，不会退化成后端裸 message', () => {
  // 没有 message 时也必须给出可理解中文，而不是 fallback 的「销毁失败」。
  for (const code of ['20102', '20103']) {
    const message = buildDestroyErrorMessage({ success: false, errorCode: code }, null, '销毁失败，请稍后重试')
    assert.doesNotMatch(message, /销毁失败/, code)
    assert.ok(message.length > 8, code)
  }
})

test('网络异常回退到默认文案，不把断网说成“另一半已加入”', () => {
  const networkError = { message: '', response: undefined }
  assert.match(buildDestroyErrorMessage(null, networkError, '销毁失败，请稍后重试'), /销毁失败/)
  assert.equal(readDestroyErrorCode(null, networkError), '')
  assert.equal(readDestroyErrorCode({ success: false, errorCode: '20094' }, null), '20094')
  assert.equal(readDestroyErrorCode(null, { response: { data: { errorCode: '20093' } } }), '20093')
})

test('spaceState 也能独立读取错误码（两端规则一致）', () => {
  assert.equal(readSpaceErrorCode({ errorCode: '20094' }, null), '20094')
  assert.equal(readSpaceErrorCode({}, { response: { data: { errorCode: '20095' } } }), '20095')
  assert.equal(readSpaceErrorCode(null, null), '')
})

// ============================== 销毁成功后的状态收敛 ==============================

test('销毁成功后按刷新结果区分三种收敛路径，刷新失败不得报成销毁失败', () => {
  // 1. 刷新失败：保留旧状态、提示重新读取，不能清本地缓存也不能跳转。
  assert.equal(
    resolveDestroySettleResult({ space: null, spaceError: '网络错误' }),
    DESTROY_SETTLE_RESULT.REFRESH_FAILED,
  )
  assert.equal(
    resolveDestroySettleResult({ space: space(), spaceError: '网络错误' }),
    DESTROY_SETTLE_RESULT.REFRESH_FAILED,
  )
  assert.match(DESTROY_REFRESH_FAILED_MESSAGE, /销毁已提交/)
  assert.match(DESTROY_REFRESH_FAILED_MESSAGE, /状态刷新失败/)
  assert.doesNotMatch(DESTROY_REFRESH_FAILED_MESSAGE, /销毁失败/)
  // 不能自动重发 /space/destroy：提示语只引导重新读取状态。
  assert.doesNotMatch(DESTROY_REFRESH_FAILED_MESSAGE, /重试销毁|再次销毁/)

  // 2. 刷新成功但服务端仍返回空间：展示真实状态，不本地伪造已销毁。
  assert.equal(
    resolveDestroySettleResult({ space: space({ status: SPACE_STATUS.NORMAL }), spaceError: '' }),
    DESTROY_SETTLE_RESULT.SPACE_STILL_PRESENT,
  )
  assert.match(DESTROY_SPACE_STILL_PRESENT_MESSAGE, /服务端仍返回该空间/)

  // 3. 刷新成功且确实没有空间：这才允许清缓存、清共享状态并跳转。
  assert.equal(
    resolveDestroySettleResult({ space: null, spaceError: '' }),
    DESTROY_SETTLE_RESULT.NO_SPACE,
  )
  assert.equal(resolveDestroySettleResult({}), DESTROY_SETTLE_RESULT.NO_SPACE)
})

test('settle 判定不会修改传入状态，也不会把空白错误当成刷新失败', () => {
  const state = { space: null, spaceError: '   ' }
  const snapshot = JSON.stringify(state)
  assert.equal(resolveDestroySettleResult(state), DESTROY_SETTLE_RESULT.NO_SPACE)
  assert.equal(JSON.stringify(state), snapshot)
})

// ============================== 本地缓存清理 ==============================

test('销毁成功后只清理空间相关本地缓存，不清空其它数据', () => {
  const store = new Map([
    ['amour_token', 'token-1'],
    ['amour_username', 'u'],
    [DESTROY_LOCAL_STORAGE_KEYS[0], 'dismissed-hash'],
    ['amour_space_unrelated', 'keep-me'],
  ])
  const storage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    removeItem: key => store.delete(key),
  }

  const removed = clearSpaceLocalCache(storage)
  assert.deepEqual(removed, [...DESTROY_LOCAL_STORAGE_KEYS])
  assert.equal(store.has(DESTROY_LOCAL_STORAGE_KEYS[0]), false)
  // 登录态与无关数据必须保留。
  assert.equal(store.get('amour_token'), 'token-1')
  assert.equal(store.get('amour_username'), 'u')
  assert.equal(store.get('amour_space_unrelated'), 'keep-me')
})

test('销毁后的缓存清理不会触碰任何登录态键（不清除登录态）', () => {
  const store = new Map([
    ['amour_token', 'token-1'],
    ['amour_username', 'u'],
    ['amour_display_name', '恋人'],
    ['amour_avatar', 'https://cdn/avatar.png'],
    ['amour_permissions', '["story"]'],
    [DESTROY_LOCAL_STORAGE_KEYS[0], 'dismissed-hash'],
  ])
  const storage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    removeItem: key => store.delete(key),
    clear: () => { throw new Error('销毁绝不能调用 localStorage.clear()') },
  }

  clearSpaceLocalCache(storage)

  // AUTH_LOCAL_STORAGE_KEYS 与 auth.js 使用的键保持一致，销毁不得删除其中任何一个。
  for (const key of AUTH_LOCAL_STORAGE_KEYS) {
    assert.equal(store.has(key), true, `${key} 必须保留`)
    assert.equal(DESTROY_LOCAL_STORAGE_KEYS.includes(key), false, `${key} 不能被列为空间缓存`)
  }
  // 空间偏好必须被清掉，避免下个空间沿用旧状态。
  assert.equal(store.has(DESTROY_LOCAL_STORAGE_KEYS[0]), false)
})

test('存储不可用时缓存清理静默降级', () => {
  assert.deepEqual(clearSpaceLocalCache(null), [])
  const brokenStorage = {
    getItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') },
  }
  assert.deepEqual(clearSpaceLocalCache(brokenStorage), [])
})
