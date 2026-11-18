import { fetchPlazaStoryDetail } from '../../api/plaza'
import type { PlazaError } from '../../api/plaza'
import { adaptStoryDetail } from '../../utils/plaza-adapter'
import type { SpaceStoryView, StoryContentBlock } from '../../types/plaza'
import { withPageViewTracking } from '../../utils/page-view-lifecycle'

/**
 * 恋爱广场 · 公开故事详情页。
 *
 * 设计要点（与私有故事详情 pages/story-detail 的区别）：
 * - 只读取公开接口 `POST /gallery/space/story/detail`，不调用 `/story/detail`；
 * - 不要求登录态、不要求情侣空间、不校验 private 模块权限：
 *   公开内容按后端公开规则对所有访客可见，隐私拦截由后端快照查询完成；
 * - 路由参数只有 spaceId + storyId，不依赖列表下标 / 事件通道 / 本地缓存，
 *   分享、深链、刷新、返回后重新进入都能按 ID 恢复正确内容；
 * - 正文 Markdown 解析复用 utils/story-content，排版与私有故事详情一致。
 */

interface StoryPageData {
  spaceId: string
  storyId: string
  loading: boolean
  story: SpaceStoryView | null
  blocks: StoryContentBlock[]
  contentImages: string[]
  totalWords: number
  readTime: string
  formattedDate: string
  error: string
  unavailable: boolean
  coverFailed: boolean
  loadingItems: number[]
}

interface StoryMethods {
  loadStory(): Promise<void>
  onPrimaryAction(): void
  onPreviewImage(event: WechatMiniprogram.BaseEvent): void
  onCoverError(): void
  backToSpace(): void
  onNavBack(): void
}

interface StoryCustom {
  requestSeq?: number
  disposed?: boolean
  /** 本页所在的页面栈深度：用于区分“从公开空间进来”与“分享 / 扫码直达”。 */
  pageDepth?: number
}

const ID_PATTERN = /^\d{1,18}$/

/** 图片预览：只接受 http(s) 绝对地址，与适配层口径保持一致。 */
function isPreviewableUrl(value: unknown): boolean {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

Page<StoryPageData, StoryCustom & StoryMethods>(withPageViewTracking<StoryPageData, StoryCustom & StoryMethods>({
  data: {
    spaceId: '',
    storyId: '',
    loading: true,
    story: null,
    blocks: [],
    contentImages: [],
    totalWords: 0,
    readTime: '',
    formattedDate: '',
    error: '',
    unavailable: false,
    coverFailed: false,
    loadingItems: [1, 2, 3, 4, 5],
  },

  onLoad(query: Record<string, string | undefined>) {
    this.disposed = false
    this.requestSeq = 0
    // 进入时先记录一次深度，避免 onShow 之前的返回兜底判断拿到 undefined。
    this.pageDepth = getCurrentPages().length
    const source = query || {}
    const rawSpaceId = typeof source.spaceId === 'string' ? source.spaceId.trim() : ''
    const rawStoryId = typeof source.storyId === 'string' ? source.storyId.trim() : ''
    const spaceId = ID_PATTERN.test(rawSpaceId) ? rawSpaceId : ''
    const storyId = ID_PATTERN.test(rawStoryId) ? rawStoryId : ''
    this.setData({ spaceId, storyId })

    if (!spaceId || !storyId) {
      this.setData({
        loading: false,
        error: '故事编号无效，请从公开空间重新打开',
        unavailable: true,
      })
      return
    }
    this.loadStory()
  },

  onShow() {
    // 记录真实页面栈深度：导航栏返回按钮由组件直接调用 wx.navigateBack，
    // 栈底（分享 / 扫码直达）时会失败，这里用进入时的深度判断后给兜底跳转。
    this.pageDepth = getCurrentPages().length
  },

  onUnload() {
    this.disposed = true
    // 让在途响应失效，避免卸载后 setData。
    this.requestSeq = (this.requestSeq || 0) + 1
  },

  /** 按 spaceId + storyId 重新拉取详情；失败不依赖任何列表缓存。 */
  async loadStory() {
    const { spaceId, storyId } = this.data
    if (!spaceId || !storyId) return
    const seq = (this.requestSeq || 0) + 1
    this.requestSeq = seq
    this.setData({ loading: true, error: '', unavailable: false, coverFailed: false })

    try {
      const detail = await fetchPlazaStoryDetail(spaceId, storyId)
      if (this.disposed || seq !== this.requestSeq) return
      const view = adaptStoryDetail(detail, spaceId)
      if (!view) {
        // 故事被撤回 / 改为私密：内容级不可见，重试没有意义。
        this.setData({
          loading: false,
          story: null,
          error: '这篇故事暂时无法阅读，可能已经被撤回或改为私密',
          unavailable: true,
        })
        return
      }
      this.setData({
        loading: false,
        story: view.story,
        blocks: view.blocks,
        contentImages: view.contentImages,
        totalWords: view.totalWords,
        readTime: view.readTime,
        formattedDate: view.formattedDate,
      })
    } catch (error) {
      if (this.disposed || seq !== this.requestSeq) return
      const plazaError = error as PlazaError
      this.setData({
        loading: false,
        story: null,
        error: plazaError && plazaError.message
          ? plazaError.message
          : '这篇公开故事加载失败了，请稍后重试',
        unavailable: Boolean(plazaError && plazaError.unavailable),
      })
    }
  },

  /** 不可见时主按钮直接返回；网络类失败可重试。 */
  onPrimaryAction() {
    if (this.data.unavailable) {
      this.backToSpace()
      return
    }
    this.loadStory()
  },

  /** 预览正文内的图片；图片列表来自本次详情响应，不会被列表数据污染。 */
  onPreviewImage(event: WechatMiniprogram.BaseEvent) {
    const current = String(event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.url || ''
      : '').trim()
    if (!isPreviewableUrl(current)) return
    const images = (this.data.contentImages || []).filter(isPreviewableUrl)
    const urls = images.indexOf(current) === -1 ? [current].concat(images) : images
    wx.previewImage({ current, urls })
  },

  onCoverError() {
    if (this.data.coverFailed) return
    this.setData({ coverFailed: true })
  },

  /**
   * 导航栏返回按钮的兜底。
   *
   * navigation-bar 组件内部会先调用 wx.navigateBack；栈底（分享 / 扫码直达）时
   * 该调用不会生效，这里再按 spaceId 重建公开空间页，避免用户卡在详情页。
   */
  onNavBack() {
    if ((this.pageDepth || 1) > 1) return
    this.backToSpace()
  },

  /**
   * 返回公开空间。
   *
   * 优先 navigateBack（保留空间页的列表与滚动位置）；
   * 栈底（分享 / 扫码直达）时重建公开空间页，空间标识来自路由参数，始终可用。
   */
  backToSpace() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
      return
    }
    const spaceId = this.data.spaceId
    const url = ID_PATTERN.test(spaceId)
      ? `/pages/plaza-detail/index?spaceId=${encodeURIComponent(spaceId)}`
      : '/pages/plaza/index'
    wx.reLaunch({ url })
  },
}, 'pages/plaza-story/plaza-story'))
