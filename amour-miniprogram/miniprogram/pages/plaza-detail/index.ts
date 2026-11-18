import { fetchPlazaSpaceDetail } from '../../api/plaza'
import type { PlazaError } from '../../api/plaza'
import { adaptSpaceDetail } from '../../utils/plaza-adapter'
import type { SpaceDetailView } from '../../types/plaza'
import { withPageViewTracking } from '../../utils/page-view-lifecycle'

/**
 * 公开空间详情承接页。
 *
 * 职责：
 * - 接收公开空间标识，调用公开详情接口，展示基础公开信息与故事 / 照片 / 纪念日列表；
 * - 故事列表项跳「公开故事详情」、照片列表项跳「公开照片详情」，
 *   两个详情页都只接收 spaceId + 内容 ID，不传列表下标，详情页自行按 ID 拉取；
 * - 保留既有加载 / 失败 / 空数据 / 返回入口。
 *
 * 列表项整块是点击区域（不是只有标题或图片可点），并且点击时用内容 ID 导航，
 * 列表排序、分页或缓存变化都不会导致打开错误内容。
 */

interface DetailPageData {
  spaceId: string
  loading: boolean
  space: SpaceDetailView | null
  loadError: string
  unavailable: boolean
  coverFailed: boolean
}

interface DetailMethods {
  loadDetail(): Promise<void>
  onPrimaryAction(): void
  goBackToPlaza(): void
  onCoverError(): void
  onPhotoError(event: WechatMiniprogram.BaseEvent): void
  onOpenStory(event: WechatMiniprogram.BaseEvent): void
  onOpenPhoto(event: WechatMiniprogram.BaseEvent): void
  openDetailPage(url: string): void
}

interface DetailCustom {
  requestSeq?: number
  disposed?: boolean
  /** 导航锁：避免快速连续点击重复 push 详情页 */
  navigating?: boolean
}

const SPACE_ID_PATTERN = /^\d{1,18}$/
const CONTENT_ID_PATTERN = /^\d{1,18}$/

/** 从 dataset 里读出合法的内容 ID；非法值返回空字符串，不发起导航。 */
function readContentId(dataset: WechatMiniprogram.IAnyObject | undefined, key: string): string {
  const source = dataset || {}
  const raw = String(source[key] === undefined || source[key] === null ? '' : source[key]).trim()
  return CONTENT_ID_PATTERN.test(raw) ? raw : ''
}

Page<DetailPageData, DetailCustom & DetailMethods>(withPageViewTracking<DetailPageData, DetailCustom & DetailMethods>({
  data: {
    spaceId: '',
    loading: true,
    space: null,
    loadError: '',
    unavailable: false,
    coverFailed: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.disposed = false
    this.requestSeq = 0
    const rawId = typeof query.spaceId === 'string' ? query.spaceId.trim() : ''
    const spaceId = SPACE_ID_PATTERN.test(rawId) ? rawId : ''
    this.setData({ spaceId })
    if (!spaceId) {
      this.setData({
        loading: false,
        loadError: '空间编号无效，请从恋爱广场重新进入',
        unavailable: true,
      })
      return
    }
    this.loadDetail()
  },

  onUnload() {
    this.disposed = true
    // 让在途响应失效，避免卸载后 setData。
    this.requestSeq = (this.requestSeq || 0) + 1
  },

  async loadDetail() {
    const spaceId = this.data.spaceId
    if (!spaceId) return
    const seq = (this.requestSeq || 0) + 1
    this.requestSeq = seq

    this.setData({ loading: true, loadError: '', unavailable: false, coverFailed: false })
    try {
      const detail = await fetchPlazaSpaceDetail(spaceId)
      if (this.disposed || seq !== this.requestSeq) return
      const view = adaptSpaceDetail(detail)
      if (!view) {
        this.setData({
          loading: false,
          space: null,
          loadError: '这个空间暂时没有可展示的公开内容',
        })
        return
      }
      this.setData({ loading: false, space: view })
    } catch (error) {
      if (this.disposed || seq !== this.requestSeq) return
      const plazaError = error as PlazaError
      this.setData({
        loading: false,
        space: null,
        loadError: plazaError && plazaError.message ? plazaError.message : '公开空间加载失败了，请稍后重试',
        unavailable: Boolean(plazaError && plazaError.unavailable),
      })
    }
  },

  onPrimaryAction() {
    if (this.data.unavailable) {
      this.goBackToPlaza()
      return
    }
    this.loadDetail()
  },

  /** 用 navigateBack 返回，保留广场页的列表、分页与滚动位置。 */
  goBackToPlaza() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
      return
    }
    wx.reLaunch({ url: '/pages/plaza/index' })
  },

  onCoverError() {
    if (this.data.coverFailed) return
    this.setData({ coverFailed: true })
  },

  /** 单张公开照片失败只回退这一张，不影响其它照片。 */
  onPhotoError(event: WechatMiniprogram.BaseEvent) {
    const photos = this.data.space ? this.data.space.photos : []
    const index = Number(event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.index
      : -1)
    if (!Number.isInteger(index) || index < 0 || index >= photos.length) return
    if (photos[index].failed) return
    this.setData({ [`space.photos[${index}].failed`]: true })
  },

  /**
   * 打开公开故事详情。
   *
   * 只把 spaceId + storyId 带进详情页，不带列表下标：
   * 详情页会按 ID 重新请求 `/gallery/space/story/detail`，
   * 因此即使列表排序、分页或缓存发生变化，打开的也是用户点的那一篇。
   */
  onOpenStory(event: WechatMiniprogram.BaseEvent) {
    const dataset = event && event.currentTarget ? event.currentTarget.dataset : undefined
    const storyId = readContentId(dataset, 'storyId')
    const spaceId = this.data.spaceId
    if (!storyId || !SPACE_ID_PATTERN.test(spaceId)) {
      wx.showToast({ title: '故事信息不完整，请稍后重试', icon: 'none' })
      return
    }
    this.openDetailPage(
      `/pages/plaza-story/plaza-story?spaceId=${encodeURIComponent(spaceId)}&storyId=${encodeURIComponent(storyId)}`,
    )
  },

  /**
   * 打开公开照片详情。
   *
   * 与故事一致：只传 spaceId + photoId，详情页在公开空间详情里按 photoId 精确匹配，
   * 不依赖照片在列表中的位置。
   */
  onOpenPhoto(event: WechatMiniprogram.BaseEvent) {
    const dataset = event && event.currentTarget ? event.currentTarget.dataset : undefined
    const photoId = readContentId(dataset, 'photoId')
    const spaceId = this.data.spaceId
    if (!photoId || !SPACE_ID_PATTERN.test(spaceId)) {
      wx.showToast({ title: '照片信息不完整，请稍后重试', icon: 'none' })
      return
    }
    this.openDetailPage(
      `/pages/plaza-photo/plaza-photo?spaceId=${encodeURIComponent(spaceId)}&photoId=${encodeURIComponent(photoId)}`,
    )
  },

  /**
   * 统一的公开详情页导航。
   *
   * - 用实例标记做短时导航锁，快速连续点击不会重复打开多个详情页；
   * - 失败时提示并解锁，用户仍可再次点击。
   */
  openDetailPage(url: string) {
    if (this.navigating) return
    this.navigating = true
    wx.navigateTo({
      url,
      complete: () => {
        this.navigating = false
      },
      fail: () => {
        wx.showToast({ title: '暂时无法打开详情，请稍后重试', icon: 'none' })
      },
    })
  },
}, 'pages/plaza-detail/index'))
