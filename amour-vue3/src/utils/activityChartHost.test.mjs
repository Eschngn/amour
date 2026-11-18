import test from 'node:test'
import assert from 'node:assert/strict'
import { createActivityChartHost } from './activityChartHost.js'

/**
 * 运行：npm test（含 test:admin-activity）
 *
 * 图表实例生命周期（组件里最容易出内存泄漏的部分）：
 * - 不重复初始化；
 * - 容器宽度为 0 时不初始化；
 * - 空数据销毁实例，不残留上一次区间的柱体；
 * - 尺寸变化触发 resize（帧内节流）；
 * - destroy 释放实例、观察器与 window 监听，且幂等。
 */

function createFakeChart() {
  const calls = { setOption: [], resize: 0, dispose: 0 }
  const chart = {
    calls,
    setOption(option, notMerge) {
      calls.setOption.push({ option, notMerge })
    },
    resize() {
      calls.resize += 1
    },
    dispose() {
      calls.dispose += 1
    },
  }
  return chart
}

function createHarness(overrides = {}) {
  const charts = []
  const observers = []
  const listeners = new Map()
  let frames = []
  const host = createActivityChartHost({
    createChart: () => {
      const chart = createFakeChart()
      charts.push(chart)
      return chart
    },
    createResizeObserver: (callback) => {
      const observer = {
        callback,
        observed: [],
        disconnected: 0,
        observe(element) {
          observer.observed.push(element)
        },
        disconnect() {
          observer.disconnected += 1
        },
      }
      observers.push(observer)
      return observer
    },
    window: {
      addEventListener(type, handler) {
        listeners.set(type, handler)
      },
      removeEventListener(type) {
        listeners.delete(type)
      },
    },
    requestFrame: (callback) => {
      frames.push(callback)
      return frames.length
    },
    cancelFrame: (id) => {
      frames[id - 1] = null
    },
    ...overrides,
  })
  return {
    host,
    charts,
    observers,
    listeners,
    /** 执行并清空所有待执行的帧回调。 */
    flushFrames() {
      const pending = frames.filter(Boolean)
      frames = []
      pending.forEach(callback => callback())
      return pending.length
    },
    pendingFrames: () => frames.filter(Boolean).length,
  }
}

const OPTION = { series: [{ type: 'bar', data: [1, 2] }] }

test('容器宽度为 0 时不初始化图表', () => {
  const harness = createHarness()
  const element = { clientWidth: 0 }
  harness.host.attach(element)
  assert.equal(harness.host.getChart(), null)
  assert.equal(harness.charts.length, 0)

  // 容器变宽后重试即可初始化。
  element.clientWidth = 600
  harness.host.attach(element)
  assert.equal(harness.charts.length, 1)
})

test('重复 attach / update 不会创建第二个图表实例', () => {
  const harness = createHarness()
  const element = { clientWidth: 640 }
  harness.host.attach(element)
  harness.host.attach(element)
  harness.host.update(OPTION)
  harness.host.update(OPTION)

  assert.equal(harness.charts.length, 1)
  assert.equal(harness.host.getChart(), harness.charts[0])
  assert.equal(harness.charts[0].calls.setOption.length, 2)
  assert.deepEqual(harness.charts[0].calls.setOption[0], { option: OPTION, notMerge: true })
})

test('update(null) 销毁实例，避免空数据残留上一次区间柱体', () => {
  const harness = createHarness()
  harness.host.attach({ clientWidth: 640 })
  harness.host.update(OPTION)
  const chart = harness.charts[0]
  assert.equal(chart.calls.dispose, 0)

  harness.host.update(null)
  assert.equal(chart.calls.dispose, 1)
  assert.equal(harness.host.getChart(), null)

  // 再次 update 创建新实例，而不是复用已销毁的旧实例。
  harness.host.update(OPTION)
  assert.equal(harness.charts.length, 2)
  assert.notEqual(harness.charts[1], chart)
})

test('容器尺寸变化触发 resize，且同一帧内只执行一次', () => {
  const harness = createHarness()
  harness.host.attach({ clientWidth: 640 })
  harness.host.update(OPTION)
  const chart = harness.charts[0]

  harness.host.resize()
  harness.host.resize()
  harness.host.resize()
  assert.equal(harness.pendingFrames(), 1, '连续 resize 只调度一帧')
  assert.equal(chart.calls.resize, 0, '帧回调执行前不 resize')

  harness.flushFrames()
  assert.equal(chart.calls.resize, 1)
})

test('ResizeObserver 回调会触发 resize', () => {
  const harness = createHarness()
  harness.host.attach({ clientWidth: 800 })
  harness.host.update(OPTION)
  const observer = harness.observers[0]

  assert.equal(harness.observers.length, 1)
  assert.deepEqual(observer.observed, [harness.host.getElement()])

  observer.callback()
  harness.flushFrames()
  assert.equal(harness.charts[0].calls.resize, 1)
})

test('没有 ResizeObserver 时回退到 window resize 监听，并在 destroy 时移除', () => {
  const harness = createHarness({ createResizeObserver: () => null })
  harness.host.attach({ clientWidth: 800 })
  harness.host.update(OPTION)

  assert.equal(harness.host.hasWindowListener(), true)
  assert.equal(harness.listeners.has('resize'), true)

  harness.listeners.get('resize')()
  harness.flushFrames()
  assert.equal(harness.charts[0].calls.resize, 1)

  harness.host.destroy()
  assert.equal(harness.host.hasWindowListener(), false)
  assert.equal(harness.listeners.has('resize'), false)
})

test('destroy 释放实例与观察器，且可以重复调用', () => {
  const harness = createHarness()
  harness.host.attach({ clientWidth: 640 })
  harness.host.update(OPTION)
  harness.host.resize()

  harness.host.destroy()
  assert.equal(harness.charts[0].calls.dispose, 1, '卸载必须销毁 ECharts 实例')
  assert.equal(harness.observers[0].disconnected, 1, '卸载必须断开 ResizeObserver')
  assert.equal(harness.host.getChart(), null)
  assert.equal(harness.host.isAttached(), false)
  assert.equal(harness.pendingFrames(), 0, '卸载后不应残留待执行帧')

  assert.doesNotThrow(() => harness.host.destroy())
  assert.equal(harness.charts[0].calls.dispose, 1, '重复 destroy 不应二次 dispose')
})

test('切换容器时释放旧观察器，避免监听泄漏', () => {
  const harness = createHarness()
  const first = { clientWidth: 640 }
  const second = { clientWidth: 480 }
  harness.host.attach(first)
  harness.host.attach(second)

  assert.equal(harness.observers.length, 2)
  assert.equal(harness.observers[0].disconnected, 1)
  assert.equal(harness.host.getElement(), second)
})

test('ECharts 初始化抛错时回调 onError 且不缓存坏实例', () => {
  const errors = []
  let attempts = 0
  const harness = createHarness({
    createChart: () => {
      attempts += 1
      if (attempts === 1) throw new Error('canvas 不可用')
      return createFakeChart()
    },
    onError: error => errors.push(error.message),
  })

  const element = { clientWidth: 640 }
  harness.host.attach(element)
  assert.equal(errors.length, 1)
  assert.equal(errors[0], 'canvas 不可用')
  assert.equal(harness.host.getChart(), null)

  // 重试可以成功。
  harness.host.attach(element)
  assert.ok(harness.host.getChart())
})

test('setOption 抛错时回调 onError 但不丢弃实例', () => {
  const errors = []
  const chart = createFakeChart()
  chart.setOption = () => {
    throw new Error('option 非法')
  }
  const harness = createHarness({
    createChart: () => chart,
    onError: error => errors.push(error.message),
  })

  harness.host.attach({ clientWidth: 640 })
  harness.host.update(OPTION)
  assert.equal(errors.length, 1)
  assert.equal(errors[0], 'option 非法')
  assert.ok(harness.host.getChart(), '渲染异常不应丢弃实例，下次 update 仍可重试')
})

test('空状态 → 有数据时，resize 会补做初始化', () => {
  const harness = createHarness()
  // 组件先处于空状态（图表被销毁），随后变成可见。
  harness.host.attach({ clientWidth: 0 })
  assert.equal(harness.charts.length, 0)

  const element = harness.host.getElement()
  element.clientWidth = 720
  harness.host.update(OPTION)
  assert.equal(harness.charts.length, 1)
})

test('ECharts 懒加载（异步）期间重复 update 只初始化一次，并在就绪后应用最新 option', async () => {
  const charts = []
  let resolveInit
  const initPromise = new Promise((resolve) => { resolveInit = resolve })
  const host = createActivityChartHost({
    createChart: () => initPromise.then(() => {
      const chart = createFakeChart()
      charts.push(chart)
      return chart
    }),
    createResizeObserver: () => null,
    window: null,
  })

  host.attach({ clientWidth: 640 })
  host.update({ series: [{ data: [1] }] })
  host.update({ series: [{ data: [2] }] })
  assert.equal(charts.length, 0, '懒加载完成前没有实例')

  resolveInit()
  await initPromise
  await Promise.resolve()
  await Promise.resolve()

  assert.equal(charts.length, 1, '并发 update 只应初始化一次')
  assert.ok(host.getChart(), '加载完成后实例应就绪')
  const applied = charts[0].calls.setOption.at(-1)
  assert.deepEqual(applied.option, { series: [{ data: [2] }] }, '应应用最新的 option')
})

test('懒加载失败时回调 onError，且不缓存失败状态', async () => {
  const errors = []
  let attempt = 0
  const host = createActivityChartHost({
    createChart: () => {
      attempt += 1
      if (attempt === 1) return Promise.reject(new Error('chunk 加载失败'))
      return createFakeChart()
    },
    createResizeObserver: () => null,
    window: null,
    onError: error => errors.push(error.message),
  })

  host.attach({ clientWidth: 640 })
  host.update(OPTION)
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.deepEqual(errors, ['chunk 加载失败'])
  assert.equal(host.getChart(), null)

  // 重试应当再次尝试加载并成功。
  host.update(OPTION)
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.ok(host.getChart(), '重试后应成功初始化')
  assert.equal(errors.length, 1)
})

test('懒加载尚未完成就卸载时，实例就绪后立即销毁，避免泄漏', async () => {
  const charts = []
  let resolveInit
  const initPromise = new Promise((resolve) => { resolveInit = resolve })
  const host = createActivityChartHost({
    createChart: () => initPromise.then(() => {
      const chart = createFakeChart()
      charts.push(chart)
      return chart
    }),
    createResizeObserver: () => null,
    window: null,
  })

  host.attach({ clientWidth: 640 })
  host.update(OPTION)
  host.destroy()
  resolveInit()
  await initPromise
  await Promise.resolve()
  await Promise.resolve()

  assert.equal(host.getChart(), null, '卸载后不应挂上迟到的实例')
  assert.equal(charts.length, 1, '迟到的实例确实被创建了')
  assert.equal(charts[0].calls.dispose, 1, '卸载后到达的实例必须立即销毁，避免内存泄漏')
})
