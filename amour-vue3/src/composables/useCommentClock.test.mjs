import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCommentClock } from './useCommentClock.js'
import { formatCommentTime } from '../utils/commentTime.js'

/**
 * 运行：npm test
 * 验证共享时钟的刷新、隐藏暂停、引用计数与定时器清理。
 * 开始计时后统一用 try/finally 释放，断言失败也不会留下后台定时器。
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHANGHAI = 'Asia/Shanghai'

function delay(ms) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, ms))
}

test('共享时钟刷新 now 并驱动相对时间文本更新', async () => {
  const createdAt = new Date('2026-11-15T12:00:00+08:00')
  let fakeNow = createdAt.getTime()
  const clock = createCommentClock({
    interval: 15,
    now: () => fakeNow,
    documentRef: null,
  })

  assert.equal(clock.isRunning(), false)
  const stop = clock.start()
  try {
    assert.equal(clock.isRunning(), true)
    assert.equal(
      formatCommentTime(createdAt, { now: clock.now.value, timeZone: SHANGHAI }),
      '刚刚',
    )

    fakeNow += 60_000
    await delay(50)
    assert.equal(
      formatCommentTime(createdAt, { now: clock.now.value, timeZone: SHANGHAI }),
      '1分钟前',
    )
  } finally {
    stop()
  }
})

test('多个消费者共享一个定时器，最后一个卸载时才清理', async () => {
  let fakeNow = 0
  const clock = createCommentClock({
    interval: 15,
    now: () => fakeNow,
    documentRef: null,
  })

  const stopFirst = clock.start()
  const stopSecond = clock.start()
  try {
    assert.equal(clock.isRunning(), true)

    stopFirst()
    assert.equal(clock.isRunning(), true)

    stopSecond()
    assert.equal(clock.isRunning(), false)
    const stoppedAt = clock.now.value
    fakeNow += 60_000
    await delay(40)
    assert.equal(clock.now.value, stoppedAt)
  } finally {
    stopFirst()
    stopSecond()
  }
})

test('页面隐藏时暂停计时，恢复可见后立即同步', () => {
  let fakeNow = 1_000
  const listeners = new Map()
  const fakeDocument = {
    hidden: false,
    addEventListener(type, handler) {
      listeners.set(type, handler)
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) listeners.delete(type)
    },
  }
  const clock = createCommentClock({
    interval: 15,
    now: () => fakeNow,
    documentRef: fakeDocument,
  })

  const stop = clock.start()
  try {
    assert.equal(clock.isRunning(), true)

    fakeDocument.hidden = true
    listeners.get('visibilitychange')()
    assert.equal(clock.isRunning(), false)

    fakeNow = 61_000
    fakeDocument.hidden = false
    listeners.get('visibilitychange')()
    assert.equal(clock.isRunning(), true)
    assert.equal(clock.now.value, 61_000)
  } finally {
    stop()
  }
  assert.equal(listeners.size, 0)
})

test('页面在卸载阶段注销共享时钟，避免定时器泄漏', () => {
  const source = readFileSync(resolve(ROOT, 'composables/useCommentClock.js'), 'utf8')
  assert.match(source, /onMounted\(clock\.start\)/)
  assert.match(source, /onBeforeUnmount\(clock\.stop\)/)
  assert.match(source, /clearIntervalFn\?\.\(timer\)/)
  assert.match(source, /removeEventListener\?\.\('visibilitychange'/)
})
