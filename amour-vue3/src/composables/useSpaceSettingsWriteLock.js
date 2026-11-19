import { ref } from 'vue'

/**
 * 空间设置页所有写操作共用的一把提交锁。
 *
 * 为什么需要它：
 * - 基础信息、公开开关、恢复、解绑、销毁都是同一空间上的写操作；
 * - 原来这些逻辑都在一个组件里，用一个 busyAction 就够；拆成多个组件后，
 *   如果各自维护一份 busy，就会出现「正在保存基础信息时又点了销毁」的交叉写；
 * - 模块级共享 ref 与 useFrontendSpace 同一套做法：整个前台只此一份，不缓存空间数据。
 *
 * 约定：
 * - 一次只允许一个动作在飞；`begin()` 返回 false 表示已有动作，调用方直接返回；
 * - `destroy` 流程需要从「打开确认框」一直占锁到请求结束，因此保留 `set()` 直接赋值，
 *   由 runDestroySpace 负责占锁 / 释放；
 * - 所有路径都必须在 finally 里 `end()`，不能把页面永久锁死。
 */
const busyAction = ref('')

export function useSpaceSettingsWriteLock() {
  /** 当前动作名（'' 表示空闲）。 */
  const isBusy = action => busyAction.value === action
  const isLocked = () => busyAction.value !== ''
  /** 尝试占锁；已被其它动作占用时返回 false。 */
  function begin(action) {
    if (busyAction.value !== '') return false
    busyAction.value = action
    return true
  }
  /** 释放锁（无论成功失败都由调用方在 finally 中调用）。 */
  function end() {
    busyAction.value = ''
  }
  /** 直接写入动作名：仅供销毁编排层注入使用。 */
  function set(action) {
    busyAction.value = action
  }
  return { busyAction, isBusy, isLocked, begin, end, set }
}
