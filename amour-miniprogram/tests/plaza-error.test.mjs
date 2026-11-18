import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPlazaError,
  toPlazaError,
  isPlazaError,
} from '../miniprogram/utils/plaza-error.ts'

/**
 * 广场错误映射测试。
 *
 * 重点：
 * - 网络失败 / 超时不会被误判成登录失效或空间下架；
 * - 空间级不可见错误码标记 unavailable 且不重试；
 * - 401 / 403 不等于空间下架；
 * - 已有 PlazaError 原样返回，不会被二次包装。
 */

test('网络失败使用友好文案并可重试', () => {
  const error = toPlazaError({ message: 'request:fail', statusCode: 0 }, '兜底文案')
  assert.equal(error.name, 'PlazaError')
  assert.equal(error.message, '网络连接不太稳定，请稍后重试')
  assert.equal(error.retryable, true)
  assert.equal(error.unavailable, false)
  assert.equal(error.errorCode, '')
})

test('超时使用单独文案', () => {
  const error = toPlazaError({ message: 'request:fail timeout', statusCode: 0 }, '兜底文案')
  assert.match(error.message, /等得有点久|稍后重试/)
  assert.equal(error.retryable, true)
})

test('空间未公开错误码标记不可用且不再重试', () => {
  // 20003 是公开故事详情返回的“故事不存在 / 已删除 / 已改为私密”，
  // 与空间级不可见一样，重试没有意义。
  ['20032', '20046', '20047', '20048', '20049', '20058', '20003'].forEach((code) => {
    const error = toPlazaError({ message: '该情侣空间未公开', statusCode: 200, errorCode: code }, '兜底')
    assert.equal(error.errorCode, code)
    assert.equal(error.unavailable, true)
    assert.equal(error.retryable, false)
    assert.equal(error.message, '该情侣空间未公开')
  })
})

test('401 / 403 保留后端文案，但不算空间下架', () => {
  const unauthorized = toPlazaError({
    message: '无访问权限，请先登录！',
    statusCode: 401,
    errorCode: '20002',
  }, '兜底')
  assert.equal(unauthorized.unavailable, false)
  assert.equal(unauthorized.statusCode, 401)
  assert.equal(unauthorized.message, '无访问权限，请先登录！')

  const forbidden = toPlazaError({ message: '无权限执行此操作', statusCode: 403, errorCode: '20031' }, '兜底')
  assert.equal(forbidden.unavailable, false)
  assert.equal(forbidden.message, '无权限执行此操作')
})

test('5xx 与空文案回退到页面级兜底', () => {
  assert.equal(toPlazaError({ statusCode: 500, message: '' }, '恋爱广场加载失败了').message, '恋爱广场加载失败了')
  assert.equal(toPlazaError({ statusCode: 502, message: '请求失败（502）' }, '兜底').message, '兜底')
  assert.equal(
    toPlazaError({ statusCode: 200, errorCode: '10001', message: '参数错误' }, '兜底').message,
    '参数错误',
  )
})

test('已经是 PlazaError 时直接返回，避免重复包装', () => {
  const original = createPlazaError('空间编号无效', { retryable: false, unavailable: true })
  assert.equal(isPlazaError(original), true)
  assert.equal(toPlazaError(original, '兜底'), original)
})

test('createPlazaError 默认值明确', () => {
  const error = createPlazaError('x')
  assert.equal(error.retryable, true)
  assert.equal(error.unavailable, false)
  assert.equal(error.statusCode, 0)
  assert.equal(error.errorCode, '')
  assert.equal(isPlazaError(new Error('普通错误')), false)
  assert.equal(isPlazaError(null), false)
})
