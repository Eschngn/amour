import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMaxDateRef } from './datePickerBounds.js'

/**
 * 运行：npm test（已加入 test:space-state 之外的默认测试清单）
 *
 * 覆盖 Web 端“恋爱开始时间”选择器点「此刻」无法确认的问题：
 * - 上限必须是可推进的“此刻”，不能是页面加载时的过期快照；
 * - 刷新后上限晚于/等于组件写入的“此刻”，确认按钮才会保持可用；
 * - 上限刷新只改变引用，不制造定时器，避免额外渲染开销；
 * - 页面确实把这个可刷新上限接给了 VueDatePicker，且保留“不能选未来”的校验。
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(ROOT, relativePath), 'utf8')

/** 固定的可推进时钟，避免真实时间让断言变得不稳定。 */
function createClock(initialIso) {
  let current = new Date(initialIso).getTime()
  return {
    now: () => new Date(current),
    advance(ms) {
      current += ms
      return new Date(current)
    },
  }
}

const MINUTE = 60 * 1000

test('上限是 Date 实例，可直接交给 VueDatePicker 的 max-date', () => {
  const clock = createClock('2026-11-18T21:30:00+08:00')
  const { maxDate } = createMaxDateRef({ now: clock.now })

  assert.ok(maxDate.value instanceof Date)
  assert.equal(maxDate.value.getTime(), new Date('2026-11-18T21:30:00+08:00').getTime())
})

test('停留一段时间后刷新，上限推进到最新“此刻”', () => {
  const clock = createClock('2026-11-18T21:30:00+08:00')
  const { maxDate, refresh } = createMaxDateRef({ now: clock.now })
  const loadedAt = maxDate.value.getTime()

  // 用户在这个页面停留了 25 分钟才点“此刻”。
  clock.advance(25 * MINUTE)
  refresh()

  assert.ok(maxDate.value.getTime() > loadedAt, '上限必须随真实时间推进')
  assert.equal(maxDate.value.getTime(), new Date('2026-11-18T21:55:00+08:00').getTime())
})

test('“此刻”写入的时间不会晚于刷新后的上限（确认按钮保持可用）', () => {
  const clock = createClock('2026-11-18T21:30:00+08:00')
  const { maxDate, refresh } = createMaxDateRef({ now: clock.now })

  // 过期快照：此时“此刻”比上限晚，组件会判定无效并禁用确定。
  clock.advance(40 * MINUTE)
  const pickerNow = clock.now()
  assert.ok(pickerNow.getTime() > maxDate.value.getTime(), '复现前提：旧上限已经过期')

  // 打开面板 / 取值变化时刷新上限，与组件内部刷新“此刻”的时机一致。
  refresh()
  const refreshedMax = maxDate.value
  const valueWrittenByNowButton = clock.now()
  assert.ok(
    valueWrittenByNowButton.getTime() <= refreshedMax.getTime(),
    '“此刻”不能晚于 max-date，否则确定为禁用态',
  )

  // 同一秒内的毫秒差也不能越界：刷新与写入都取同一个时钟。
  clock.advance(300)
  refresh()
  assert.ok(clock.now().getTime() <= maxDate.value.getTime())
})

test('刷新产生新的引用，Vue 才会重新校验上限', () => {
  const clock = createClock('2026-11-18T21:30:00+08:00')
  const { maxDate, refresh } = createMaxDateRef({ now: clock.now })
  const before = maxDate.value

  clock.advance(MINUTE)
  refresh()

  assert.notEqual(maxDate.value, before, '必须替换 Date 对象，复用可变对象不会触发响应式更新')
  assert.ok(maxDate.value.getTime() > before.getTime())
})

test('刷新不创建定时器，也不依赖真实时间流逝', () => {
  const clock = createClock('2026-11-18T21:30:00+08:00')
  const { refresh } = createMaxDateRef({ now: clock.now })
  const originalSetInterval = globalThis.setInterval
  const originalSetTimeout = globalThis.setTimeout
  let timerCalls = 0
  globalThis.setInterval = (...args) => {
    timerCalls += 1
    return originalSetInterval(...args)
  }
  globalThis.setTimeout = (...args) => {
    timerCalls += 1
    return originalSetTimeout(...args)
  }
  try {
    for (let index = 0; index < 10; index += 1) refresh()
  } finally {
    globalThis.setInterval = originalSetInterval
    globalThis.setTimeout = originalSetTimeout
  }
  assert.equal(timerCalls, 0, '刷新必须是同步纯操作，不能引入定时器')
})

test('创建页把可刷新上限接给日历，并保留“不能选未来”的校验', () => {
  const page = readSource('pages/frontend/SpaceSetupPage.vue')

  // 上限必须来自可刷新模块，不能是 setup 阶段的一次性快照。
  assert.match(page, /createMaxDateRef/)
  assert.doesNotMatch(page, /^\s*const now = new Date\(\)\s*$/m)
  assert.doesNotMatch(page, /:max-date="now"/)

  // 绑定与刷新时机：打开面板、组件内部取值变化（点“此刻”走这条）。
  assert.match(page, /:max-date="loveStartMaxDate"/)
  assert.match(page, /@open="refreshLoveStartMaxDate"/)
  assert.match(page, /@internal-model-change="refreshLoveStartMaxDate"/)

  // 校验不能被删掉：未来时间仍然不可选。
  assert.match(page, /const datePickerActionRow = \{[\s\S]*?showNow: true/)
  assert.match(page, /nowBtnLabel: '此刻'/)

  // 提交值仍按项目约定补秒，与选择器展示的精度一致。
  assert.match(page, /function toBackendDateTime\(value\)/)
  assert.match(page, /\$\{normalized\}:00/)
  assert.match(page, /loveStartTime: toBackendDateTime\(createForm\.loveStartTime\)/)
})
