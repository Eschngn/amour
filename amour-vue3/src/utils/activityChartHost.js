/**
 * 看板图表的实例生命周期管理（与 Vue 解耦，便于在 Node 里做单元测试）。
 *
 * 职责：
 * - 懒初始化：只有容器存在、有宽度且确实有可绘制数据时才创建 ECharts 实例；
 * - 不重复初始化：重复 update 不会创建第二个实例；
 * - 容器尺寸变化自动 resize（ResizeObserver 优先，window resize 兜底），
 *   后台侧栏收起 / 展开导致布局变化时同样会触发；
 * - 隐藏容器或宽度为 0 时延迟初始化；
 * - 数据变化后整体替换 option（notMerge），正确移除旧系列；
 * - 卸载时释放实例、观察器与事件监听，避免内存泄漏。
 *
 * ECharts 通过动态 import 懒加载（见 activityChartEcharts.js），
 * 因此这里的初始化是异步的；测试可注入 createChart 替身完全绕过真实 ECharts。
 */
import { loadActivityEcharts } from './activityChartEcharts.js'

function noop() {}

function defaultCreateResizeObserver(callback) {
  if (typeof ResizeObserver === 'function') {
    return new ResizeObserver(callback)
  }
  return null
}

/**
 * @param {object} [options]
 * @param {Function} [options.createChart] (element, opts) => chart 实例，测试注入替身
 * @param {Function} [options.createResizeObserver] (callback) => observer | null
 * @param {Function} [options.onError] 初始化/渲染异常回调（组件据此降级为文字数据）
 * @param {object|null} [options.window] 默认真实 window
 * @param {Function} [options.requestFrame] 帧调度替身（默认 requestAnimationFrame）
 * @param {Function} [options.cancelFrame] 帧取消替身
 */
export function createActivityChartHost(options = {}) {
  const createChart = typeof options.createChart === 'function'
    ? options.createChart
    : (element, opts) => loadActivityEcharts().then(echarts => echarts.init(element, null, opts))
  const createResizeObserver = typeof options.createResizeObserver === 'function'
    ? options.createResizeObserver
    : defaultCreateResizeObserver
  const onError = typeof options.onError === 'function' ? options.onError : noop
  const win = options.window !== undefined
    ? options.window
    : (typeof window !== 'undefined' ? window : null)
  const requestFrame = typeof options.requestFrame === 'function'
    ? options.requestFrame
    : (win && typeof win.requestAnimationFrame === 'function'
      ? win.requestAnimationFrame.bind(win)
      : callback => setTimeout(callback, 0))
  const cancelFrame = typeof options.cancelFrame === 'function'
    ? options.cancelFrame
    : (win && typeof win.cancelAnimationFrame === 'function'
      ? win.cancelAnimationFrame.bind(win)
      : id => clearTimeout(id))

  let element = null
  let chart = null
  let observer = null
  let windowBound = false
  let pendingFrame = null
  let lastOption = null
  // 懒加载期间可能被多次调用 ensureChart，这里复用同一个初始化过程。
  let pendingInit = null
  let destroyed = false

  function getChart() {
    return chart
  }

  function applyOption(instance, option) {
    if (!instance || !option) return
    try {
      // notMerge = true：数据 / 指标 / 图表形式切换时整体替换，旧系列不会残留。
      instance.setOption(option, true)
    } catch (error) {
      onError(error)
    }
  }

  /**
   * 懒初始化。真实 ECharts 通过动态 import 加载，因此返回值可能是
   * Promise；注入同步 createChart 的测试路径直接返回实例。
   */
  function ensureChart() {
    if (chart) return chart
    if (destroyed) return null
    if (!element) return null
    // 容器不可见（宽度为 0）时不要初始化，否则 ECharts 会把 0 尺寸固化下来，
    // 之后即使容器变宽也需要额外 resize 才能正确显示。
    const width = typeof element.clientWidth === 'number' ? element.clientWidth : 0
    if (width <= 0) return null
    if (pendingInit) return pendingInit

    try {
      const created = createChart(element, {})
      if (created && typeof created.then === 'function') {
        pendingInit = created.then((instance) => {
          pendingInit = null
          if (destroyed || !instance) {
            // 组件在懒加载期间已卸载：立即销毁迟到的实例，避免泄漏。
            if (instance && typeof instance.dispose === 'function') {
              try {
                instance.dispose()
              } catch {
                // 释放失败不影响后续流程。
              }
            }
            return null
          }
          chart = instance
          applyOption(chart, lastOption)
          return chart
        }).catch((error) => {
          pendingInit = null
          onError(error)
          return null
        })
        return pendingInit
      }
      chart = created
      applyOption(chart, lastOption)
      return chart
    } catch (error) {
      pendingInit = null
      chart = null
      onError(error)
      return null
    }
  }

  function handleWindowResize() {
    resize()
  }

  /** 绑定容器并开始观察尺寸；重复绑定同一容器不会重复创建实例。 */
  function attach(target) {
    if (!target) return null
    if (target === element) return ensureChart()
    detachElement()
    element = target
    const created = createResizeObserver(() => resize())
    if (created) {
      try {
        created.observe(target)
        observer = created
      } catch (error) {
        observer = null
        onError(error)
      }
    }
    if (!observer && win && typeof win.addEventListener === 'function') {
      win.addEventListener('resize', handleWindowResize)
      windowBound = true
    }
    return ensureChart()
  }

  function detachElement() {
    if (observer) {
      try {
        observer.disconnect()
      } catch {
        // 释放失败不应阻断组件卸载。
      }
      observer = null
    }
    if (windowBound && win && typeof win.removeEventListener === 'function') {
      win.removeEventListener('resize', handleWindowResize)
      windowBound = false
    }
  }

  /** 容器尺寸变化时调用；按帧节流，避免连续布局变化触发大量重排。 */
  function resize() {
    // 容器从隐藏变为可见（空状态 → 有数据）时，延迟到这里才第一次初始化，
    // 否则 ECharts 会把 0 尺寸固化下来。
    if (!chart) {
      ensureChart()
      return
    }
    if (pendingFrame !== null) return
    pendingFrame = requestFrame(() => {
      pendingFrame = null
      if (!chart) return
      try {
        chart.resize()
      } catch (error) {
        onError(error)
      }
    })
  }

  function disposeChart() {
    if (!chart) return
    try {
      chart.dispose()
    } catch {
      // 实例已损坏时依然要把引用置空，避免后续复用坏实例。
    }
    chart = null
  }

  /**
   * 更新图表。option 为 null 表示当前不可绘制（空数据 / 老接口），
   * 直接销毁实例，避免图表残留上一次区间的柱体。
   */
  function update(option) {
    if (!option) {
      lastOption = null
      disposeChart()
      return
    }
    lastOption = option
    const instance = ensureChart()
    if (!instance) return
    // 懒加载仍在进行：ensureChart 返回 Promise，实例就绪后会自动应用 lastOption。
    if (typeof instance.then === 'function') return
    applyOption(instance, option)
  }

  /** 完整销毁：释放实例、观察器、window 监听与待执行帧。 */
  function destroy() {
    destroyed = true
    pendingInit = null
    if (pendingFrame !== null) {
      cancelFrame(pendingFrame)
      pendingFrame = null
    }
    disposeChart()
    detachElement()
    element = null
    lastOption = null
  }

  return {
    attach,
    update,
    resize,
    destroy,
    getChart,
    getElement: () => element,
    getLastOption: () => lastOption,
    isAttached: () => Boolean(element),
    hasObserver: () => Boolean(observer),
    hasWindowListener: () => windowBound,
  }
}
