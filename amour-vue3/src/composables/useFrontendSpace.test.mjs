import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SPACE_STATUS,
  SPACE_VIEW_MODE,
  deriveSpaceViewMode,
  hasSpaceIdentity,
  isReadySpace,
  isSpaceAuthError,
  isUnavailableSpace,
  readSpaceErrorMessage,
} from '../utils/spaceState.js'

/**
 * 运行：npm run test:space-state
 *
 * 这些用例覆盖 useFrontendSpace 依赖的纯规则：
 * - viewMode 与 status=0/2/3 的保留；
 * - 只有 401/20002 才被视为登录态失效；
 * - 网络错误不会产生 auth 判定。
 *
 * composable 的请求生命周期分支已封装在 useFrontendSpace.js 中，
 * 后续接入 Vitest 时可 mock @/api/space 后直接测试 refreshSpaceStatus。
 */

const readySpace = {
  spaceId: 2001,
  status: SPACE_STATUS.NORMAL,
  spaceName: '测试空间',
}

test('未登录时即使存在旧空间状态，也归为 plaza', () => {
  assert.equal(deriveSpaceViewMode(false, readySpace), SPACE_VIEW_MODE.PLAZA)
})

test('登录但没有空间记录时为 plaza', () => {
  assert.equal(deriveSpaceViewMode(true, null), SPACE_VIEW_MODE.PLAZA)
  assert.equal(deriveSpaceViewMode(true, {}), SPACE_VIEW_MODE.PLAZA)
  assert.equal(deriveSpaceViewMode(true, { status: 1 }), SPACE_VIEW_MODE.PLAZA)
})

test('spaceId 存在且 status=1 时为 private', () => {
  assert.equal(hasSpaceIdentity(readySpace), true)
  assert.equal(isReadySpace(readySpace), true)
  assert.equal(deriveSpaceViewMode(true, readySpace), SPACE_VIEW_MODE.PRIVATE)
})

test('等待绑定、冻结、归档和异常状态保留为 unavailable', () => {
  for (const status of [
    SPACE_STATUS.WAITING,
    SPACE_STATUS.FROZEN,
    SPACE_STATUS.ARCHIVED,
    SPACE_STATUS.DELETING,
    SPACE_STATUS.DELETED,
  ]) {
    const space = { spaceId: 2001, status }
    assert.equal(hasSpaceIdentity(space), true)
    assert.equal(isReadySpace(space), false)
    assert.equal(deriveSpaceViewMode(true, space), SPACE_VIEW_MODE.UNAVAILABLE)
  }
})

test('字符串 status="1" 也按正常空间处理', () => {
  assert.equal(isReadySpace({ spaceId: 2001, status: '1' }), true)
})

test('绑定成功（status=1）的空间不算“暂时不可用”', () => {
  // 回归用例：恋爱广场曾把 status=1 掉进状态兜底分支，误显示 Your Space · Unavailable。
  assert.equal(isUnavailableSpace(readySpace), false)
  assert.equal(isUnavailableSpace({ spaceId: 2001, status: '1' }), false)
})

test('没有空间记录时不产生“暂时不可用”判定', () => {
  assert.equal(isUnavailableSpace(null), false)
  assert.equal(isUnavailableSpace({}), false)
  assert.equal(isUnavailableSpace({ status: 0 }), false)
})

test('等待绑定、冻结、归档、删除等状态都属于“暂时不可用”', () => {
  for (const status of [
    SPACE_STATUS.WAITING,
    SPACE_STATUS.FROZEN,
    SPACE_STATUS.ARCHIVED,
    SPACE_STATUS.DELETING,
    SPACE_STATUS.DELETED,
  ]) {
    assert.equal(isUnavailableSpace({ spaceId: 2001, status }), true)
  }
})

test('只有 401 或 20002 被视为登录态失效', () => {
  assert.equal(isSpaceAuthError({ response: { status: 401 } }), true)
  assert.equal(isSpaceAuthError({ response: { data: { errorCode: '20002' } } }), true)
  assert.equal(isSpaceAuthError({ response: { data: { errorCode: 20002 } } }), true)
  assert.equal(isSpaceAuthError({ response: { status: 500 } }), false)
  assert.equal(isSpaceAuthError({ message: 'Network Error' }), false)
  assert.equal(isSpaceAuthError(new Error('timeout of 15000ms exceeded')), false)
})

test('网络错误只读取错误信息，不产生 auth 判定', () => {
  const error = { message: 'Network Error', response: undefined }
  assert.equal(isSpaceAuthError(error), false)
  assert.equal(readSpaceErrorMessage(error, '兜底'), 'Network Error')
  assert.equal(
    readSpaceErrorMessage({ response: { data: { message: '服务暂时不可用' } } }, '兜底'),
    '服务暂时不可用',
  )
})
