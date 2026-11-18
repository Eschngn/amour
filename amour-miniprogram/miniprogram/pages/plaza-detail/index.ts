import { fetchPlazaSpaceDetail } from '../../api/plaza'
import type { PlazaError } from '../../api/plaza'
import { adaptSpaceDetail } from '../../utils/plaza-adapter'
import type { SpaceDetailView } from '../../types/plaza'
import { withPageViewTracking } from '../../utils/page-view-lifecycle'

/**
 * 公开空间详情承接页。
 *
 * 本阶段只做最小可运行版本：接收公开空间标识、调用已有公开详情接口、
 * 展示真实的基础公开信息与加载 / 失败 / 空数据 / 返回入口。
 * 不展开完整故事正文、相册大图与互动能力。
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
}

interface DetailCustom {
  requestSeq?: number
  disposed?: boolean
}

const SPACE_ID_PATTERN = /^\d{1,18}$/

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
}, 'pages/plaza-detail/index'))
