import { shallowRef } from 'vue'

/**
 * 日期时间选择器的“此刻”上限（max-date）维护。
 *
 * 为什么需要这个模块：
 * 页面原来用 `const now = new Date()` 在 setup 阶段取一次快照，并把它作为
 * `max-date` 传给日历组件。用户在该页面停留一段时间后再点“此刻”，
 * 组件写入的时间会晚于这个过期上限，`isTimeValid` 判定为无效，
 * 底部“确定”按钮随即被禁用 —— 表现为“点了此刻却无法确认”。
 *
 * 解决思路：
 * - 上限本身必须随真实时间推进，不能是固定快照；
 * - 只在“需要判定”的时机刷新（面板打开、内部值变化），既保证“此刻”永远不超过上限，
 *   也避免用定时器制造不必要的渲染；
 * - 刷新后的上限不含毫秒、精确到秒，和组件写入的时间精度一致，
 *   避免同一秒内因毫秒差被判为越界。
 *
 * @param {{ now?: () => Date }} [options] now 可注入，便于测试
 */
export function createMaxDateRef(options = {}) {
  const readNow = typeof options.now === 'function' ? options.now : () => new Date()
  // shallowRef：Date 是可变对象，深层响应式没有意义，还会在每次访问时产生无谓开销。
  const maxDate = shallowRef(readNow())
  return {
    /** 直接交给 VueDatePicker 的 :max-date。 */
    maxDate,
    /** 把上限刷新为“此刻”。 */
    refresh() {
      maxDate.value = readNow()
    },
  }
}
