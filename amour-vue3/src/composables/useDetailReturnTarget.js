import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  deriveChainedReturnTarget,
  deriveReturnTarget,
  readHistoryState,
} from '../utils/listViewState.js'

/**
 * 详情页的返回来源状态。
 *
 * 详情页需要知道“我是从哪个列表进来的”，才能在点击返回时：
 * 1. 优先用 router.go(-N) 真正回退到那条列表历史记录（保留其快照与滚动位置）；
 * 2. 直接打开、来源被替换或历史记录不足时，退回默认列表页。
 *
 * 目标来源有三处：
 * - 当前历史记录上的 `amourReturnTarget`（列表点击进入时写入）；
 * - vue-router 写在历史记录上的 back 字段（用户从列表地址栏进入等场景兜底）；
 * - 无来源 → fallbackPath。
 *
 * @param {{
 *   resolveReturn: (historyState: object|null, options: object) => { type: 'go', delta: number } | { type: 'push', path: string },
 *   isAllowedReturnPath: (path: string) => boolean,
 *   fallbackPath: string,
 * }} options
 */
export function useDetailReturnTarget({ resolveReturn, isAllowedReturnPath, fallbackPath }) {
  const route = useRoute()
  const router = useRouter()
  // history.state 在首帧就可读；用 ref 保存以便在同一路由内翻篇后重新推导。
  const historyState = ref(readHistoryState())

  function refresh() {
    historyState.value = readHistoryState()
  }

  onMounted(refresh)

  // 详情页之间翻篇（/story/1 -> /story/2）会复用组件实例，
  // 必须在导航后重新读取新历史记录的 state，否则返回目标会停留在上一篇。
  watch(
    () => route.fullPath,
    () => refresh(),
    { flush: 'post' },
  )

  /** 当前应采用的返回导航方式。 */
  const returnNavigation = computed(() => (
    typeof resolveReturn === 'function'
      ? resolveReturn(historyState.value, { fallbackPath })
      : { type: 'push', path: fallbackPath }
  ))

  /** 返回按钮的目标地址：需要 push 时用它渲染真实链接，go 时返回 null。 */
  const returnTo = computed(() => (
    returnNavigation.value?.type === 'push' ? returnNavigation.value.path : null
  ))

  const canGoBack = computed(() => returnNavigation.value?.type === 'go')

  /**
   * 执行返回。
   *
   * 优先 router.go(-N)：不新增历史记录，返回后仍能继续前进/后退；
   * 来源不可信时 router.push 默认列表，绝不会把用户留在空白页。
   */
  async function goBack() {
    const navigation = returnNavigation.value
    if (navigation?.type === 'go') {
      refresh()
      router.go(navigation.delta)
      return
    }
    await router.push(navigation?.path || fallbackPath)
  }

  /**
   * 当前详情页内继续翻篇时的返回目标（hop 递增）。
   *
   * 返回的是“目标”本身，调用方需再交给 withReturnState 包装成路由 state；
   * 不能直接返回 state 对象，否则会被 withReturnState 当成目标再包一层。
   */
  function buildChainedTarget() {
    return deriveChainedReturnTarget(historyState.value, { isAllowedReturnPath })
  }

  /** 当前是否持有可信来源（用于决定“返回”文案与行为）。 */
  const returnTarget = computed(() => deriveReturnTarget(historyState.value, isAllowedReturnPath))

  return {
    route,
    router,
    historyState,
    returnNavigation,
    returnTarget,
    returnTo,
    canGoBack,
    goBack,
    buildChainedTarget,
    refresh,
  }
}
