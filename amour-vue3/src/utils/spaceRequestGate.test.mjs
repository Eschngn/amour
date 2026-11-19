import test from 'node:test'
import assert from 'node:assert/strict'
import { createSpaceRequestGate } from '../utils/spaceRequestGate.js'

/**
 * 运行：npm run test:space-settings
 *
 * 覆盖生命周期动作后强制刷新的竞态规则：
 * - force 刷新必须让写操作之前发出的旧请求失效；
 * - 旧响应不能覆盖写操作之后的新状态；
 * - 无参数刷新仍然复用同一个 in-flight Promise（兼容现有行为）。
 */

test('按顺序发起的请求只有最新一次仍然有效', () => {
  const gate = createSpaceRequestGate()
  const first = gate.begin()
  const second = gate.begin()
  assert.equal(gate.isCurrent(first), false)
  assert.equal(gate.isCurrent(second), true)
})

test('invalidate 让所有在途请求失效并允许重新发起', () => {
  const gate = createSpaceRequestGate()
  const first = gate.begin()
  assert.equal(gate.isCurrent(first), true)

  gate.invalidate()
  assert.equal(gate.isCurrent(first), false, '写操作之前的旧请求必须失效')

  const forced = gate.begin()
  assert.equal(gate.isCurrent(forced), true)
})

test('旧请求即使最后返回也不能覆盖新状态', () => {
  const gate = createSpaceRequestGate()
  // 模拟页面初始化时发出的旧请求
  const stale = gate.begin()
  // 生命周期写操作成功后强制刷新
  gate.invalidate()
  const fresh = gate.begin()

  let spaceStatus = null
  // 旧响应晚到：按闸门判断应被丢弃
  if (gate.isCurrent(stale)) spaceStatus = { status: 1, visibility: 1 }
  assert.equal(spaceStatus, null, '旧响应不得写入新状态')

  // 新响应正常生效
  if (gate.isCurrent(fresh)) spaceStatus = { status: 1, visibility: 0 }
  assert.deepEqual(spaceStatus, { status: 1, visibility: 0 })
})

test('无参数刷新复用同一个 in-flight Promise', () => {
  const gate = createSpaceRequestGate()
  const promise = Promise.resolve('first')
  gate.track(promise)
  assert.equal(gate.currentInflight(), promise, '默认刷新应复用 in-flight 请求')
  assert.equal(gate.currentInflight(), gate.currentInflight())
})

test('force 刷新丢弃旧的 in-flight Promise 并重新请求', () => {
  const gate = createSpaceRequestGate()
  gate.track(Promise.resolve('stale'))
  assert.notEqual(gate.currentInflight(), null)

  gate.invalidate()
  assert.equal(gate.currentInflight(), null, 'force 刷新不能复用写操作之前的请求')

  const fresh = gate.begin()
  const nextPromise = Promise.resolve('fresh')
  gate.track(nextPromise)
  assert.equal(gate.currentInflight(), nextPromise)
  assert.equal(gate.isCurrent(fresh), true)
})

test('只有最新请求结束时才清理 in-flight 引用', () => {
  const gate = createSpaceRequestGate()
  const stale = gate.begin()
  gate.track(Promise.resolve('stale'))

  const fresh = gate.begin()
  const freshPromise = Promise.resolve('fresh')
  gate.track(freshPromise)

  // 旧请求结束：不能清掉新请求的引用
  gate.release(stale)
  assert.equal(gate.currentInflight(), freshPromise)

  // 最新请求结束：正常清理
  gate.release(fresh)
  assert.equal(gate.currentInflight(), null)
})

test('clear 语义（invalidate）不会伪造空间状态对象', () => {
  const gate = createSpaceRequestGate()
  gate.begin()
  gate.invalidate()
  // 闸门只处理请求有效性，不持有任何空间字段
  assert.deepEqual(Object.keys(gate).sort(), ['begin', 'currentInflight', 'invalidate', 'isCurrent', 'release', 'sequence', 'track'])
})

test('销毁后的强制刷新让销毁前发出的 /space/status 响应失效（不把已销毁空间写回）', () => {
  const gate = createSpaceRequestGate()

  // 页面初始化 / 手动刷新在销毁之前发出，服务端此时还有空间。
  const staleStatus = gate.begin()
  gate.track(Promise.resolve('stale-status'))

  // 用户点销毁 -> 服务端成功 -> 强制刷新（force: true）先 invalidate 再 begin。
  gate.invalidate()
  assert.equal(gate.isCurrent(staleStatus), false, '销毁前的旧状态响应必须失效')
  assert.equal(gate.currentInflight(), null, 'force 刷新不能复用销毁前的 in-flight Promise')
  const freshStatus = gate.begin()

  let spaceStatus = { spaceId: 3001, status: 0 }
  // 旧响应晚到：闸门判定失效，不能把空间写回页面。
  if (gate.isCurrent(staleStatus)) spaceStatus = { spaceId: 3001, status: 0 }
  // 新响应：销毁成功后的 data=null。
  if (gate.isCurrent(freshStatus)) spaceStatus = null

  assert.equal(spaceStatus, null, '销毁后页面必须保持无空间状态')
  gate.release(staleStatus)
  assert.equal(gate.sequence, freshStatus, '旧请求结束不能改变当前序号')
})

test('销毁请求失败后刷新保留最新序号，晚到的旧响应仍被丢弃', () => {
  const gate = createSpaceRequestGate()
  // 销毁前的自动刷新。
  const beforeDestroy = gate.begin()
  // 销毁被服务端拒绝（20094/20103）后按 isDestroyStateConflict 强制刷新。
  gate.invalidate()
  const afterReject = gate.begin()

  let latest = null
  if (gate.isCurrent(beforeDestroy)) latest = { spaceId: 3001, status: 0, memberCount: 1 }
  assert.equal(latest, null, '拒绝后的刷新之前，旧响应不得生效')

  if (gate.isCurrent(afterReject)) latest = { spaceId: 3001, status: 1, memberCount: 2 }
  assert.deepEqual(latest, { spaceId: 3001, status: 1, memberCount: 2 }, '展示服务端真实状态')
})
