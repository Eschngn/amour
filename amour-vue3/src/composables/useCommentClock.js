import { onBeforeUnmount, onMounted, ref } from 'vue'
import { COMMENT_TIME_REFRESH_MS } from '../utils/commentTime.js'

/**
 * 留言时间共享时钟。
 *
 * 整个应用只创建一个 interval，所有留言卡片读取同一个 now。
 * 页面隐藏时暂停计时，重新可见时立即同步一次；
 * 组件卸载时按引用计数释放定时器与监听，避免定时器泄漏。
 */
export function createCommentClock({
  interval = COMMENT_TIME_REFRESH_MS,
  now = () => Date.now(),
  documentRef = typeof document === 'undefined' ? null : document,
  setIntervalFn = typeof setInterval === 'undefined' ? null : setInterval,
  clearIntervalFn = typeof clearInterval === 'undefined' ? null : clearInterval,
} = {}) {
  const current = ref(now())
  let timer = null
  let consumers = 0

  const isHidden = () => Boolean(documentRef?.hidden)

  function tick() {
    current.value = now()
  }

  function schedule() {
    if (timer !== null || !setIntervalFn || isHidden()) return
    timer = setIntervalFn(tick, interval)
  }

  function unschedule() {
    if (timer === null) return
    clearIntervalFn?.(timer)
    timer = null
  }

  function handleVisibilityChange() {
    if (isHidden()) {
      unschedule()
      return
    }
    tick()
    schedule()
  }

  function start() {
    consumers += 1
    if (consumers > 1) return stop
    tick()
    documentRef?.addEventListener?.('visibilitychange', handleVisibilityChange)
    schedule()
    return stop
  }

  function stop() {
    if (consumers === 0) return
    consumers -= 1
    if (consumers > 0) return
    unschedule()
    documentRef?.removeEventListener?.('visibilitychange', handleVisibilityChange)
  }

  return {
    now: current,
    start,
    stop,
    refresh: tick,
    isRunning: () => timer !== null,
  }
}

let sharedClock = null

export function getSharedCommentClock(options) {
  if (!sharedClock) sharedClock = createCommentClock(options)
  return sharedClock
}

/** 页面只读同一个 now，按统一节奏刷新相对时间文本。 */
export function useCommentClock(options) {
  const clock = getSharedCommentClock(options)
  onMounted(clock.start)
  onBeforeUnmount(clock.stop)
  return clock.now
}
