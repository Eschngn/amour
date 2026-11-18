/**
 * 滚动位置恢复。
 *
 * 列表页返回时内容往往要等接口返回、骨架屏替换后才具备足够高度，
 * 立刻 scrollTo 会因为页面还没有对应高度而停在错误位置。
 * 这里用 requestAnimationFrame 逐帧重试：一旦文档高度足够且位置接近目标就停止，
 * 达到帧数上限也会停止，避免无限循环。
 */

/** 默认最多重试的动画帧数（约 1 秒）。 */
export const SCROLL_RESTORE_MAX_FRAMES = 90
/** 认为“已到位”的像素误差。 */
export const SCROLL_RESTORE_TOLERANCE = 2

function defaultWindow() {
  return typeof window === 'undefined' ? null : window
}

function defaultRaf(callback) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback)
  }
  return setTimeout(() => callback(Date.now()), 16)
}

function defaultCancelRaf(handle) {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(handle)
    return
  }
  clearTimeout(handle)
}

function readDocMaxScroll(win) {
  const doc = win?.document
  const root = doc?.documentElement
  if (!root) return 0
  const viewport = Number(win.innerHeight) || 0
  return Math.max(0, (Number(root.scrollHeight) || 0) - viewport)
}

function readScrollTop(win) {
  const top = win?.scrollY ?? win?.pageYOffset
  const value = Number(top)
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * 把窗口滚动到目标位置，并在内容高度尚未就绪时自动重试。
 *
 * @param {number} targetTop 目标滚动位置（px）
 * @param {{
 *   windowRef?: Window|null,
 *   maxFrames?: number,
 *   tolerance?: number,
 *   raf?: (cb: (time: number) => void) => unknown,
 *   cancelRaf?: (handle: unknown) => void,
 * }} [options]
 * @returns {() => void} 取消函数；重复调用安全
 */
export function restoreScrollPosition(targetTop, options = {}) {
  const win = options.windowRef === undefined ? defaultWindow() : options.windowRef
  const target = Number(targetTop)
  if (!win || !Number.isFinite(target) || target <= 0) {
    if (win && typeof win.scrollTo === 'function') {
      try {
        win.scrollTo({ top: 0, behavior: 'auto' })
      } catch {
        // 老浏览器不支持对象参数时忽略，保持当前位置即可。
      }
    }
    return () => {}
  }

  const maxFrames = Number.isInteger(options.maxFrames) && options.maxFrames > 0
    ? options.maxFrames
    : SCROLL_RESTORE_MAX_FRAMES
  const tolerance = Number.isFinite(options.tolerance) && options.tolerance >= 0
    ? options.tolerance
    : SCROLL_RESTORE_TOLERANCE
  const raf = typeof options.raf === 'function' ? options.raf : defaultRaf
  const cancelRaf = typeof options.cancelRaf === 'function' ? options.cancelRaf : defaultCancelRaf

  let frames = 0
  let handle = null
  let cancelled = false

  const finish = () => {
    cancelled = true
    if (handle !== null) cancelRaf(handle)
    handle = null
  }

  const step = () => {
    if (cancelled) return
    frames += 1
    const maxScroll = readDocMaxScroll(win)
    const current = readScrollTop(win)

    // 文档已经能滚到目标位置：直接设置并结束。
    if (maxScroll >= target) {
      try {
        win.scrollTo({ top: target, behavior: 'auto' })
      } catch {
        win.scrollTo(0, target)
      }
      finish()
      return
    }

    // 文档高度还不够（内容仍在加载）：先滚到底部，下一帧继续尝试。
    if (!(Math.abs(current - target) <= tolerance) && maxScroll > 0) {
      try {
        win.scrollTo({ top: maxScroll, behavior: 'auto' })
      } catch {
        win.scrollTo(0, maxScroll)
      }
    }

    if (frames >= maxFrames) {
      finish()
      return
    }
    handle = raf(step)
  }

  handle = raf(step)
  return finish
}
