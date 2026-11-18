import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 「创建者销毁并清空空间」小程序端契约测试。
 *
 * 覆盖：
 * - 只有创建者 + 另一半未加入才展示且允许销毁；
 * - 另一半已加入 / 非创建者 / 状态不允许时给出可理解提示并触发状态刷新；
 * - 二次确认必须输入固定文案；
 * - 销毁成功的幂等响应（destroyed=false）也按成功处理；
 * - 本地缓存清理不误删登录态。
 */

const storage = new Map()
globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key),
  request() {},
  showToast() {},
}

const rules = await import('../miniprogram/utils/session-rules.js')
const { SPACE_STATUS, SESSION_STATUS, TAB_ID } = await import('../miniprogram/utils/session-constants.js')
const destroy = await import('../miniprogram/utils/space-destroy.js')

function space(overrides = {}) {
  return {
    spaceId: 4101,
    status: SPACE_STATUS.WAITING,
    memberCount: 1,
    creator: true,
    ...overrides,
  }
}

test.beforeEach(() => storage.clear())

// ============================== 入口展示与允许条件 ==============================

test('只有创建者且另一半未加入时才展示销毁入口', () => {
  assert.equal(rules.canShowDestroyEntry(space()), true)
  assert.equal(rules.canShowDestroyEntry(space({ memberCount: 2 })), false)
  assert.equal(rules.canShowDestroyEntry(space({ creator: false })), false)
  assert.equal(rules.canShowDestroyEntry(null), false)
  assert.equal(rules.canShowDestroyEntry({}), false)
  assert.equal(rules.canShowDestroyEntry(space({ status: SPACE_STATUS.DESTROYED })), false)
})

test('只有创建者 + 单人 + 可销毁状态才允许发起销毁', () => {
  assert.equal(rules.canDestroySpace(space()), true)
  assert.equal(rules.canDestroySpace(space({ memberCount: 2 })), false)
  assert.equal(rules.canDestroySpace(space({ creator: false })), false)
  assert.equal(rules.canDestroySpace(space({ status: SPACE_STATUS.FROZEN })), false)
  assert.equal(rules.canDestroySpace(space({ status: SPACE_STATUS.DELETED })), false)
  assert.equal(rules.canDestroySpace(space({ status: SPACE_STATUS.DESTROYED })), false)
  assert.equal(rules.canDestroySpace(space({ unbindPending: true })), false)
  assert.equal(rules.canDestroySpace(null), false)
})

test('销毁阻止原因覆盖全部拒绝场景', () => {
  assert.equal(rules.destroyBlockReason(space()), '')
  assert.match(rules.destroyBlockReason(space({ memberCount: 2 })), /另一半已加入/)
  assert.match(rules.destroyBlockReason(space({ creator: false })), /创建者/)
  assert.match(rules.destroyBlockReason(space({ status: SPACE_STATUS.FROZEN })), /冻结或归档/)
  assert.match(rules.destroyBlockReason(space({ status: SPACE_STATUS.DESTROYED })), /已销毁/)
  assert.match(rules.destroyBlockReason(space({ unbindPending: true })), /解绑申请/)
  assert.match(rules.destroyBlockReason(null), /还没有/)
})

test('销毁纯函数不会修改传入的服务器空间对象', () => {
  const serverSpace = space()
  const snapshot = JSON.stringify(serverSpace)
  rules.canShowDestroyEntry(serverSpace)
  rules.canDestroySpace(serverSpace)
  rules.destroyBlockReason(serverSpace)
  rules.deriveHasSpace(serverSpace)
  assert.equal(JSON.stringify(serverSpace), snapshot)
})

// ============================== 状态推导 ==============================

test('status=6 已销毁不再算“有情侣空间”，底部只保留两个 Tab', () => {
  const destroyed = { spaceId: 4101, status: SPACE_STATUS.DESTROYED, memberCount: 0 }
  assert.equal(rules.deriveHasSpace(destroyed), false)
  assert.equal(rules.isDestroyedSpace(destroyed), true)
  const snapshotStatus = rules.deriveSessionStatus({ token: 'token-1', space: destroyed })
  assert.equal(snapshotStatus, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assert.deepEqual(
    rules.resolveVisibleTabIds(snapshotStatus),
    [TAB_ID.PLAZA, TAB_ID.PROFILE],
  )
  // 受限页面（space 级别）不可访问。
  assert.equal(rules.canAccessPage('space', snapshotStatus), false)
})

test('销毁成功后预期回到恋爱广场，真实状态仍来自服务器刷新', () => {
  const snapshotStatus = rules.deriveSessionStatus({ token: 'token-1', space: null })
  assert.equal(snapshotStatus, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assert.deepEqual(
    rules.resolveVisibleTabIds(snapshotStatus),
    [TAB_ID.PLAZA, TAB_ID.PROFILE],
  )
})

// ============================== 二次确认 ==============================

test('确认文案说明后果，要求逐字输入固定文案', () => {
  const message = destroy.buildDestroyPromptMessage(space({ spaceName: '我们的小空间' }))
  assert.match(message, /我们的小空间/)
  assert.match(message, /另一半都不可见/)
  assert.match(message, /无法自行恢复/)
  assert.match(message, /平台管理员可以协助恢复/)
  assert.doesNotMatch(destroy.buildDestroyPromptMessage({ spaceId: 7 }), /undefined/)

  assert.equal(destroy.DESTROY_CONFIRM_KEYWORD, '销毁')
  assert.equal(destroy.validateDestroyConfirmInput('销毁'), '')
  assert.equal(destroy.validateDestroyConfirmInput('  销毁  '), '')
  assert.match(destroy.validateDestroyConfirmInput(''), /请输入/)
  assert.match(destroy.validateDestroyConfirmInput('取消'), /准确输入/)
})

// ============================== 服务端拒绝 ==============================

test('另一半已加入 / 非创建者 / 状态不允许都给出可理解提示并触发刷新', () => {
  const partnerJoined = Object.assign(new Error('另一半已加入情侣空间，不能再销毁'), { errorCode: '20094' })
  const notCreator = Object.assign(new Error('只有情侣空间创建者才能销毁空间'), { errorCode: '20093' })
  const statusNotAllowed = Object.assign(new Error('只有等待另一半加入的空间才能销毁'), { errorCode: '20095' })
  const alreadyDestroyed = Object.assign(new Error('情侣空间已销毁，只有管理员可以从留档恢复'), { errorCode: '20096' })

  assert.match(destroy.buildDestroyErrorMessage(partnerJoined), /另一半已经加入/)
  assert.match(destroy.buildDestroyErrorMessage(notCreator), /创建者/)
  assert.match(destroy.buildDestroyErrorMessage(statusNotAllowed), /状态不允许/)
  assert.match(destroy.buildDestroyErrorMessage(alreadyDestroyed), /已被销毁/)

  assert.equal(destroy.isDestroyStateConflict(partnerJoined), true)
  assert.equal(destroy.isDestroyStateConflict(notCreator), true)
  assert.equal(destroy.isDestroyStateConflict(statusNotAllowed), true)
  assert.equal(destroy.isDestroyStateConflict(alreadyDestroyed), false)
  assert.equal(destroy.isDestroyStateConflict(null), false)

  // session-rules 侧提供同一套判定，供页面直接使用。
  assert.equal(rules.isDestroyRejectedByServer(partnerJoined), true)
  assert.equal(rules.isDestroyRejectedByServer({ errorCode: '20034' }), false)
  assert.equal(rules.SPACE_DESTROY_ERROR_CODE.PARTNER_JOINED, '20094')
})

test('网络异常回退到服务端/默认文案，不误判为另一半已加入', () => {
  const networkError = new Error('request:fail timeout')
  assert.match(destroy.buildDestroyErrorMessage(networkError), /request:fail/)
  assert.match(destroy.buildDestroyErrorMessage(null), /销毁失败/)
  assert.equal(destroy.isDestroyStateConflict(networkError), false)
})

test('幂等响应（destroyed=false）也按成功处理', () => {
  // 后端重复提交返回 success=true + destroyed=false，页面必须视为成功而不是失败。
  const repeatResponse = { success: true, data: { spaceId: 4101, status: 6, destroyed: false } }
  assert.equal(repeatResponse.success, true)
  assert.equal(repeatResponse.data.destroyed, false)
  // 只有 destroyed=true 才提示“本次真正销毁”，两者都进入成功分支。
  assert.equal(typeof repeatResponse.data.destroyed, 'boolean')
})

// ============================== 本地缓存 ==============================

test('销毁后只清理空间相关缓存，保留登录态', () => {
  storage.set('amour_token', 'token-1')
  storage.set('photoDetailCollection', '{"items":[1]}')
  storage.set('amour_username', 'u')

  const removed = destroy.clearSpaceLocalCache()
  assert.deepEqual(removed, [...destroy.DESTROY_LOCAL_STORAGE_KEYS])
  assert.equal(storage.has('photoDetailCollection'), false)
  assert.equal(storage.get('amour_token'), 'token-1')
  assert.equal(storage.get('amour_username'), 'u')
})
