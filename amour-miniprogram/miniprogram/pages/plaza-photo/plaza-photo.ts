import { fetchPlazaSpaceDetail } from '../../api/plaza'
import type { PlazaError } from '../../api/plaza'
import { adaptPhotoDetail, formatPhotoDateTime } from '../../utils/plaza-adapter'
import type { SpacePhotoView } from '../../types/plaza'
import { withPageViewTracking } from '../../utils/page-view-lifecycle'

/**
 * 恋爱广场 · 公开照片详情页。
 *
 * 设计要点：
 * - 复用已有公开接口 `POST /gallery/space/detail`：公开照片没有独立详情接口，
 *   但空间详情已经返回该空间全部公开照片（含标题、描述、拍摄时间与地点）；
 * - 路由参数只有 spaceId + photoId，进入后按 photoId 在公开照片列表中精确匹配，
 *   不依赖上一页传入的列表下标 / 事件通道 / 本地缓存，
 *   因此分享、深链、刷新、列表排序或分页变化都不会打开错误的照片；
 * - 不做私密内容兜底：照片不在公开列表内（已删除、未公开、属于其它空间）时
 *   直接展示“照片已不可见”，不回退到相册私有接口；
 * - 左右滑动在「该空间的公开照片」内切换，与相册详情的交互习惯一致。
 */

interface PhotoPageData {
  spaceId: string
  photoId: string
  loading: boolean
  photo: SpacePhotoView | null
  photos: SpacePhotoView[]
  index: number
  formattedDateTime: string
  error: string
  unavailable: boolean
}

interface PhotoMethods {
  loadPhoto(): Promise<void>
  applyPhoto(photos: SpacePhotoView[], index: number): void
  onPrimaryAction(): void
  backToSpace(): void
  onPreviewImage(): void
  onPhotoError(event: WechatMiniprogram.BaseEvent): void
  onNavBack(): void
  onTouchStart(event: WechatMiniprogram.TouchEvent): void
  onTouchEnd(event: WechatMiniprogram.TouchEvent): void
}

interface PhotoCustom {
  requestSeq?: number
  disposed?: boolean
  touchStartX?: number
  touchStartY?: number
  /** 本页所在的页面栈深度：用于区分“从公开空间进来”与“分享 / 扫码直达”。 */
  pageDepth?: number
}

const ID_PATTERN = /^\d{1,18}$/

Page<PhotoPageData, PhotoCustom & PhotoMethods>(withPageViewTracking<PhotoPageData, PhotoCustom & PhotoMethods>({
  data: {
    spaceId: '',
    photoId: '',
    loading: true,
    photo: null,
    photos: [],
    index: 0,
    formattedDateTime: '',
    error: '',
    unavailable: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.disposed = false
    this.requestSeq = 0
    // 进入时先记录一次深度，避免 onShow 之前的返回兜底判断拿到 undefined。
    this.pageDepth = getCurrentPages().length
    const source = query || {}
    const rawSpaceId = typeof source.spaceId === 'string' ? source.spaceId.trim() : ''
    const rawPhotoId = typeof source.photoId === 'string' ? source.photoId.trim() : ''
    const spaceId = ID_PATTERN.test(rawSpaceId) ? rawSpaceId : ''
    const photoId = ID_PATTERN.test(rawPhotoId) ? rawPhotoId : ''
    this.setData({ spaceId, photoId })

    if (!spaceId || !photoId) {
      this.setData({
        loading: false,
        error: '照片编号无效，请从公开空间重新打开',
        unavailable: true,
      })
      return
    }
    this.loadPhoto()
  },

  onShow() {
    // 记录真实页面栈深度：导航栏返回按钮由组件直接调用 wx.navigateBack，
    // 栈底（分享 / 扫码直达）时会失败，这里用进入时的深度判断后给兜底跳转。
    this.pageDepth = getCurrentPages().length
  },

  onUnload() {
    this.disposed = true
    this.requestSeq = (this.requestSeq || 0) + 1
  },

  /**
   * 通过公开空间详情定位照片。
   *
   * 只信 photoId：即使照片在列表中的位置变化，匹配结果也不会串到别的照片。
   */
  async loadPhoto() {
    const { spaceId, photoId } = this.data
    if (!spaceId || !photoId) return
    const seq = (this.requestSeq || 0) + 1
    this.requestSeq = seq
    this.setData({ loading: true, error: '', unavailable: false })

    try {
      const detail = await fetchPlazaSpaceDetail(spaceId)
      if (this.disposed || seq !== this.requestSeq) return
      const view = adaptPhotoDetail(detail, spaceId, photoId)
      if (!view) {
        // 照片已删除 / 改为私密 / 不属于该公开空间：内容级不可见，重试没有意义。
        this.setData({
          loading: false,
          photo: null,
          photos: [],
          error: '这张照片暂时无法查看，可能已被删除或不再公开',
          unavailable: true,
        })
        return
      }
      this.applyPhoto(view.photos, view.index)
    } catch (error) {
      if (this.disposed || seq !== this.requestSeq) return
      const plazaError = error as PlazaError
      this.setData({
        loading: false,
        photo: null,
        photos: [],
        error: plazaError && plazaError.message
          ? plazaError.message
          : '这张公开照片加载失败了，请稍后重试',
        unavailable: Boolean(plazaError && plazaError.unavailable),
      })
    }
  },

  /** 应用当前照片：同步更新照片 ID，保证后续重试 / 返回都指向同一张。 */
  applyPhoto(photos: SpacePhotoView[], index: number) {
    const list = Array.isArray(photos) ? photos : []
    if (!list.length) return
    const safeIndex = Math.min(Math.max(0, Number(index) || 0), list.length - 1)
    const photo = list[safeIndex]
    if (!photo) return
    this.setData({
      loading: false,
      photo,
      photos: list,
      index: safeIndex,
      photoId: photo.photoId,
      formattedDateTime: formatPhotoDateTime(photo.takenTime),
      error: '',
      unavailable: false,
    })
  },

  onPrimaryAction() {
    if (this.data.unavailable) {
      this.backToSpace()
      return
    }
    this.loadPhoto()
  },

  /** 预览原图：地址列表来自公开照片，不含任何私有相册数据。 */
  onPreviewImage() {
    const photo = this.data.photo
    if (!photo || !photo.url) return
    const urls = (this.data.photos || []).map(item => item.url).filter(Boolean)
    wx.previewImage({ current: photo.url, urls: urls.length ? urls : [photo.url] })
  },

  /** 单张照片加载失败只标记当前照片，不阻塞文字信息。 */
  onPhotoError(event: WechatMiniprogram.BaseEvent) {
    const dataset = event && event.currentTarget ? event.currentTarget.dataset : undefined
    const index = Number(dataset && dataset.index !== undefined ? dataset.index : -1)
    if (!Number.isInteger(index) || index < 0 || index >= this.data.photos.length) {
      if (this.data.photo && !this.data.photo.failed) this.setData({ 'photo.failed': true })
      return
    }
    if (this.data.photos[index].failed) return
    this.setData({ [`photos[${index}].failed`]: true, 'photo.failed': true })
  },

  /**
   * 导航栏返回按钮的兜底：栈底时按 spaceId 重建公开空间页。
   */
  onNavBack() {
    if ((this.pageDepth || 1) > 1) return
    this.backToSpace()
  },

  onTouchStart(event: WechatMiniprogram.TouchEvent) {
    const touch = event.touches && event.touches[0]
    if (!touch) return
    this.touchStartX = touch.clientX
    this.touchStartY = touch.clientY
  },

  /** 左右轻扫切换上一张 / 下一张（仅在本空间公开照片内循环判断）。 */
  onTouchEnd(event: WechatMiniprogram.TouchEvent) {
    const startX = this.touchStartX
    const startY = this.touchStartY
    this.touchStartX = undefined
    this.touchStartY = undefined
    const touch = event.changedTouches && event.changedTouches[0]
    if (typeof startX !== 'number' || typeof startY !== 'number' || !touch) return

    const offsetX = touch.clientX - startX
    const offsetY = touch.clientY - startY
    if (Math.abs(offsetX) < 48 || Math.abs(offsetX) <= Math.abs(offsetY)) return

    const total = this.data.photos.length
    if (total <= 1) return
    const nextIndex = this.data.index + (offsetX < 0 ? 1 : -1)
    if (nextIndex < 0 || nextIndex >= total) return
    this.applyPhoto(this.data.photos, nextIndex)
  },

  /**
   * 返回公开空间。
   *
   * 优先 navigateBack（保留空间页的列表与滚动位置）；
   * 栈底（分享 / 扫码直达）时按 spaceId 重建公开空间页。
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
}, 'pages/plaza-photo/plaza-photo'))
