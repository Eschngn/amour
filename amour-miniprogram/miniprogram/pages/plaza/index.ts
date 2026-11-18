import { fetchPlazaSpaces, PLAZA_PAGE_SIZE } from '../../api/plaza'
import { adaptSpaceCards } from '../../utils/plaza-adapter'
import { PlazaPager } from '../../utils/plaza-pager'
import type { PlazaListState } from '../../utils/plaza-pager'
import type { SpaceCardView } from '../../types/plaza'
import { withPageViewTracking } from '../../utils/page-view-lifecycle'

/**
 * 恋爱广场列表页。
 *
 * 结构：
 * - 页面只负责布局、生命周期与交互协调；
 * - 接口调用在 api/plaza，结构转换在 utils/plaza-adapter，
 *   分页 / 竞态 / 去重状态机在 utils/plaza-pager（纯逻辑，有单测覆盖）；
 * - 组件只通过 properties 收数据、通过事件回传 spaceId，页面校验后再导航。
 *
 * 公开接口匿名可访问，进入列表不触发微信登录；登录只在真正需要身份的操作里发生。
 */

interface PlazaPageData {
  cards: SpaceCardView[]
  status: 'idle' | 'loading' | 'error' | 'ready'
  total: number
  hasMore: boolean
  showEnd: boolean
  loadingMore: boolean
  loadMoreError: string
  loadError: string
  refreshing: boolean
  refresherTriggered: boolean
  skeletonItems: number[]
}

interface PlazaMethods {
  setupPager(): void
  applyState(state: PlazaListState): void
  loadFirstPage(): Promise<void>
  onRefresh(): Promise<void>
  onRetryFirst(): Promise<void>
  onRetryEmpty(): void
  onLoadMore(): Promise<void>
  onScrollToLower(): void
  onOpenSpace(event: WechatMiniprogram.CustomEvent): void
  openSpaceDetail(spaceId: string): void
}

interface PlazaCustom {
  pager?: PlazaPager
  unsubscribe?: (() => void) | null
  disposed?: boolean
}

const SKELETON_ITEMS = [1, 2, 3, 4]
/** 安全空格标识：只允许后端下发的正整数，避免拼接出异常路由。 */
const SPACE_ID_PATTERN = /^\d{1,18}$/

Page<PlazaPageData, PlazaCustom & PlazaMethods>(withPageViewTracking<PlazaPageData, PlazaCustom & PlazaMethods>({
  data: {
    cards: [],
    status: 'loading',
    total: 0,
    hasMore: false,
    showEnd: false,
    loadingMore: false,
    loadMoreError: '',
    loadError: '',
    refreshing: false,
    refresherTriggered: false,
    skeletonItems: SKELETON_ITEMS,
  },

  onLoad() {
    this.disposed = false
    this.setupPager()
    this.loadFirstPage()
  },

  onUnload() {
    this.disposed = true
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    if (this.pager) {
      this.pager.dispose()
      this.pager = undefined
    }
  },

  onShow() {
    // 从详情返回时保留列表、分页与滚动位置：这里不做任何重新加载。
    // 只有页面首次进入（onLoad 已处理）或用户主动下拉刷新才会请求。
  },

  onPullDownRefresh() {
    // 页面使用 scroll-view refresher，原生下拉未开启；保留空实现避免误触发。
    wx.stopPullDownRefresh()
  },

  /**
   * 创建分页状态机：网络请求与适配逻辑在这里注入，页面只订阅渲染状态。
   */
  setupPager() {
    const pager = new PlazaPager(
      query => fetchPlazaSpaces({ current: query.current, size: query.size }),
      records => adaptSpaceCards(records),
      { pageSize: PLAZA_PAGE_SIZE },
    )
    this.pager = pager
    this.unsubscribe = pager.subscribe(state => this.applyState(state))
  },

  applyState(state: PlazaListState) {
    if (this.disposed) return
    this.setData({
      cards: state.items,
      status: state.status,
      total: state.total,
      hasMore: state.hasMore,
      // 只有列表非空且确实没有下一页时才展示“已到底”，空列表交给空状态。
      showEnd: state.status === 'ready' && state.items.length > 0 && !state.hasMore,
      loadingMore: state.loadingMore,
      loadMoreError: state.loadMoreError,
      loadError: state.loadError,
      refreshing: Boolean(state.refreshing),
      // 下拉动画只跟随用户手势触发的刷新，空态里的“刷新看看”不显示下拉 spinner。
      refresherTriggered: this.data.refresherTriggered && Boolean(state.refreshing),
    })
  },

  async loadFirstPage() {
    if (!this.pager) return
    await this.pager.load()
  },

  async onRefresh() {
    if (!this.pager) return
    // 用户下拉时立刻锁住 refresher 动画，所有结束路径都会关闭，避免卡住。
    this.setData({ refresherTriggered: true })
    try {
      await this.pager.refresh()
    } finally {
      if (!this.disposed) this.setData({ refresherTriggered: false, refreshing: false })
    }
  },

  async onRetryFirst() {
    if (!this.pager) return
    await this.pager.load()
  },

  /** 空列表的“刷新看看”：走刷新路径，但不展示下拉动画。 */
  async onRetryEmpty() {
    if (!this.pager) return
    await this.pager.refresh()
  },

  async onLoadMore() {
    if (!this.pager) return
    await this.pager.loadMore()
  },

  onScrollToLower() {
    // Pager 内部对并发 / 未到底 / 刷新中做了拦截，这里不用重复判断。
    this.onLoadMore()
  },

  onOpenSpace(event: WechatMiniprogram.CustomEvent) {
    const detail = event && event.detail ? event.detail : {}
    const spaceId = String(detail.spaceId || '').trim()
    this.openSpaceDetail(spaceId)
  },

  /** 导航前再次校验标识：只把公开空间标识带进详情页，不携带任何私密数据。 */
  openSpaceDetail(spaceId: string) {
    if (!SPACE_ID_PATTERN.test(spaceId)) {
      wx.showToast({ title: '空间信息不完整，请稍后重试', icon: 'none' })
      return
    }
    const url = `/pages/plaza-detail/index?spaceId=${encodeURIComponent(spaceId)}`
    wx.navigateTo({
      url,
      fail: () => {
        wx.showToast({ title: '暂时无法打开这个空间', icon: 'none' })
      },
    })
  },
}, 'pages/plaza/index'))
