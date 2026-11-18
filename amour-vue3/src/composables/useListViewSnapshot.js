import { onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import {
  buildListViewSnapshot,
  isRestorableListViewPath,
  readListViewSnapshot,
  readWindowScrollTop,
  writeListViewSnapshot,
} from '../utils/listViewState.js'

/** 滚动时写快照的最小间隔，避免每一帧都 replaceState。 */
export const LIST_SNAPSHOT_THROTTLE_MS = 250

/**
 * 列表页浏览快照：滚动/切换时自动保存，返回或刷新时读取。
 *
 * 设计要点：
 * - 快照挂在“这一条历史记录”上，`/story` 与 `/plaza` 各自独立，
 *   从其它入口新开的列表记录没有快照，不会误用上一次的浏览位置；
 * - 组件 setup 期间就能同步读到快照（popstate 时 history.state 已就绪），
 *   因此首屏请求可以直接按快照里的章节/分页拉取，不需要先渲染默认状态再跳转；
 * - 离开路由、刷新/关闭页面（pagehide + beforeunload）都会保存一次；
 * - 滚动与章节/分页变化时节流自动保存，保证“刷新后仍在原位置”，
 *   而不是只能等到离开页面才写入。
 *
 * @param {{
 *   route: import('vue-router').RouteLocationNormalizedLoaded,
 *   collect: () => object,
 *   windowRef?: Window|null,
 *   throttleMs?: number,
 * }} options
 */
export function useListViewSnapshot({ route, collect, windowRef, throttleMs } = {}) {
  const restoreTarget = route?.fullPath || ''
  const win = windowRef === undefined
    ? (typeof window === 'undefined' ? null : window)
    : windowRef
  const throttle = Number.isFinite(throttleMs) && throttleMs >= 0
    ? throttleMs
    : LIST_SNAPSHOT_THROTTLE_MS

  // 只在列表页读取快照；详情页不应把列表快照当成自己的初始状态。
  const initialSnapshot = isRestorableListViewPath(restoreTarget)
    ? readListViewSnapshot(win?.history, restoreTarget)
    : null
  const snapshot = ref(initialSnapshot)
  const savedSnapshot = ref(initialSnapshot)
  let disposed = false
  let timer = null
  let lastSavedAt = 0

  function buildSnapshot() {
    if (disposed || !route || !isRestorableListViewPath(route.fullPath)) return null
    let data = {}
    try {
      const collected = typeof collect === 'function' ? collect() : null
      if (collected && typeof collected === 'object' && !Array.isArray(collected)) {
        data = collected
      }
    } catch {
      // 采集失败不阻断导航，保留空数据即可。
    }
    return buildListViewSnapshot(route.fullPath, {
      scrollY: readWindowScrollTop(win),
      data,
    })
  }

  /**
   * 当前 history.state 是否仍属于本页面。
   *
   * 浏览器回退（popstate）时，history.state 已经切换成“要返回的那条记录”，
   * 此时若照常 replaceState 会把本页快照写到目标记录上，覆盖对方的浏览状态
   * （表现为返回列表后分页/滚动全部丢失）。因此只在当前记录仍属于自己时写入。
   */
  function ownsCurrentHistoryEntry() {
    const state = win?.history?.state
    if (!state || typeof state.current !== 'string') return true
    return state.current === route?.fullPath
  }

  /** 立即保存一次当前列表状态；返回是否成功写入。 */
  function saveSnapshot() {
    if (!ownsCurrentHistoryEntry()) return false
    const built = buildSnapshot()
    if (!built) return false
    const written = writeListViewSnapshot(win?.history, built)
    if (written) {
      savedSnapshot.value = built
      lastSavedAt = Date.now()
    }
    return written
  }

  /** 节流保存：距上次写入不足间隔时合并到一次尾调用。 */
  function scheduleSave() {
    if (disposed) return
    const elapsed = Date.now() - lastSavedAt
    if (elapsed >= throttle) {
      if (timer !== null) {
        win?.clearTimeout?.(timer)
        timer = null
      }
      saveSnapshot()
      return
    }
    if (timer !== null) return
    timer = win?.setTimeout?.(() => {
      timer = null
      saveSnapshot()
    }, throttle - elapsed) ?? null
  }

  /** 取走快照并标记已消费，避免同一次进入重复恢复。 */
  function consumeSnapshot() {
    const current = snapshot.value
    snapshot.value = null
    return current
  }

  function clearTimer() {
    if (timer === null) return
    win?.clearTimeout?.(timer)
    timer = null
  }

  function handlePageHide() {
    clearTimer()
    saveSnapshot()
  }

  onBeforeRouteLeave(() => {
    clearTimer()
    saveSnapshot()
  })

  onMounted(() => {
    if (!win) return
    win.addEventListener('scroll', scheduleSave, { passive: true })
    win.addEventListener('pagehide', handlePageHide)
    // beforeunload 覆盖部分浏览器只触发它的刷新场景（pagehide 可能晚于状态读取）。
    win.addEventListener('beforeunload', handlePageHide)
  })

  onBeforeUnmount(() => {
    disposed = true
    clearTimer()
    if (!win) return
    win.removeEventListener('scroll', scheduleSave)
    win.removeEventListener('pagehide', handlePageHide)
    win.removeEventListener('beforeunload', handlePageHide)
  })

  return {
    /** setup 期间读到的快照（可能为 null）。 */
    snapshot,
    /** 最近一次成功写入的快照。 */
    savedSnapshot,
    saveSnapshot,
    scheduleSave,
    consumeSnapshot,
  }
}
