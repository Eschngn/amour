import { post } from '../../utils/request'
import { hasFrontendQueryPermission } from '../../utils/auth'
import { withComponentPageViewTracking } from '../../utils/page-view-lifecycle'
import { guardPageReady } from '../../utils/access-control'

const PAGE_SIZE = 6
let latestPhotoRequestId = 0
/** 记录哪些页面实例刚打开过照片详情：返回时只做一次静默刷新。 */
const returningFromDetail = new WeakSet<object>()

interface PhotoCategory {
  id: number
  categoryName: string
}

interface PhotoRecord {
  id: number
  title: string
  description: string
  categoryName: string
  url: string
  takenTime: string
  showTime?: boolean
  location: string
}

interface PhotoPageResult {
  current: number
  size: number
  total: number
  records: PhotoRecord[]
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

/** 仅日期模式隐藏时分秒；其余（含历史缺失字段）展示到秒。 */
function formatPhotoDate(value: string, showTime?: boolean) {
  if (!value) return '日期未记录'
  const date = value.slice(0, 10).replace(/-/g, '.')
  if (showTime === false) return date
  const clock = value.slice(11, 19)
  return clock ? `${date} ${clock}` : date
}

/** 统一的照片展示字段：number 使用整个列表中的真实序号，刷新后不会从 01 重新开始。 */
function decoratePhoto(item: PhotoRecord, index: number): WechatMiniprogram.IAnyObject {
  return {
    ...item,
    title: item.title || '未命名照片',
    description: item.description || '这一页还没有写下文字。',
    categoryName: item.categoryName || '共同回忆',
    date: formatPhotoDate(item.takenTime, item.showTime),
    location: item.location || '',
    number: String(index + 1).padStart(2, '0'),
  }
}

Component(withComponentPageViewTracking({
  data: {
    loading: true,
    loadingMore: false,
    loadError: '',
    loadMoreError: '',
    loadingItems: [1, 2, 3, 4],
    categories: [] as PhotoCategory[],
    activeCategory: 'all' as string | number,
    photos: [] as WechatMiniprogram.IAnyObject[],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasMore: false,
    pageSummary: '正在整理照片',
  },

  lifetimes: {
    async attached() {
      // 页面守卫：未登录 / 无情侣空间时跳回「我的」并展示创建 / 绑定提示。
      const allowed = await guardPageReady('pages/photo/photo')
      if (!allowed) return
      if (!hasFrontendQueryPermission('photo')) {
        wx.reLaunch({ url: '/pages/plaza/index' })
        return
      }
      this.initialize()
    },
  },

  pageLifetimes: {
    async show() {
      // 只有从照片详情返回时才刷新；静默更新已有列表，不重建滚动容器。
      if (!returningFromDetail.delete(this)) return
      await this.refreshLoadedPhotos()
    },
  },

  methods: {
    async initialize() {
      await Promise.all([this.loadCategories(), this.loadPhotos(1)])
    },

    async loadCategories() {
      try {
        const categories = await post<PhotoCategory[]>('/photo/categories')
        this.setData({
          categories: (categories || []).filter((item) => item.id && item.categoryName),
        })
      } catch (error) {
        console.warn('照片分类读取失败', error)
      }
    },

    async loadPhotos(page: number, append = false) {
      const requestId = ++latestPhotoRequestId
      this.setData(append
        ? { loadingMore: true, loadMoreError: '' }
        : {
          loading: true,
          loadingMore: false,
          loadError: '',
          loadMoreError: '',
          photos: [],
          currentPage: 1,
          totalPages: 1,
          total: 0,
          hasMore: false,
          pageSummary: '正在整理照片',
        })
      const payload: WechatMiniprogram.IAnyObject = { current: page, size: PAGE_SIZE }
      if (this.data.activeCategory !== 'all') payload.photoCategoryId = this.data.activeCategory
      try {
        const result = await post<PhotoPageResult>('/photo/page', payload)
        if (requestId !== latestPhotoRequestId) return
        const total = Number(result.total) || 0
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        const currentPage = Math.min(Math.max(1, Number(result.current) || page), totalPages)
        const newPhotos = (result.records || []).filter((item) => item.url).map((item, index) => (
          decoratePhoto(item, (currentPage - 1) * PAGE_SIZE + index)
        ))
        const photos = append ? [...this.data.photos, ...newPhotos] : newPhotos
        this.setData({
          photos,
          currentPage,
          totalPages,
          total,
          hasMore: currentPage < totalPages && newPhotos.length > 0,
          pageSummary: total ? `${photos.length} / ${total}` : '等待新的照片',
          loading: false,
          loadingMore: false,
          loadMoreError: '',
        })
      } catch (error) {
        if (requestId !== latestPhotoRequestId) return
        const errorMessage = getErrorMessage(error, '照片加载失败，请稍后重试')
        this.setData(append
          ? { loadingMore: false, loadMoreError: errorMessage }
          : { loading: false, loadError: errorMessage })
      }
    },

    selectCategory(event: WechatMiniprogram.BaseEvent) {
      const rawId = event.currentTarget.dataset.id
      const categoryId = rawId === 'all' ? 'all' : Number(rawId)
      if (categoryId === this.data.activeCategory) return
      latestPhotoRequestId += 1
      this.setData({ activeCategory: categoryId }, () => this.loadPhotos(1))
    },

    loadMore() {
      if (this.data.loading || this.data.loadingMore || !this.data.hasMore) return
      this.loadPhotos(this.data.currentPage + 1, true)
    },

    /**
     * 从照片详情返回时刷新已加载的所有分页。
     *
     * 只刷新第 1 页会把已经上滑加载出来的照片丢掉，导致无法回到原位置；
     * 这里按当前已加载页数并行请求，再按原顺序合并成同一份列表。
     */
    async refreshLoadedPhotos() {
      const targetPage = Math.max(1, Number(this.data.currentPage) || 1)
      if (!this.data.photos.length) {
        await this.loadPhotos(this.data.currentPage || 1)
        return
      }
      const requestId = ++latestPhotoRequestId
      const payloadBase: WechatMiniprogram.IAnyObject = { size: PAGE_SIZE }
      if (this.data.activeCategory !== 'all') payloadBase.photoCategoryId = this.data.activeCategory
      try {
        const pages = await Promise.all(
          Array.from({ length: targetPage }, (_, index) => post<PhotoPageResult>('/photo/page', {
            ...payloadBase,
            current: index + 1,
          })),
        )
        if (requestId !== latestPhotoRequestId) return
        const total = Number(pages[0] && pages[0].total) || 0
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        const currentPage = Math.min(targetPage, totalPages)
        const records = pages
          .slice(0, currentPage)
          .reduce((all: PhotoRecord[], page) => all.concat(page.records || []), [])
        const photos = records.filter((item) => item.url).map((item, index) => decoratePhoto(item, index))
        this.setData({
          photos,
          currentPage,
          totalPages,
          total,
          hasMore: currentPage < totalPages && photos.length > 0,
          pageSummary: total ? `${photos.length} / ${total}` : '等待新的照片',
        })
      } catch (error) {
        // 静默刷新失败时保留现有列表，不打断用户当前浏览位置。
        console.warn('照片列表刷新失败', error)
      }
    },

    openPhotoDetail(event: WechatMiniprogram.BaseEvent) {
      const index = Number(event.currentTarget.dataset.index)
      const photo = this.data.photos[index]
      if (!photo) return
      wx.setStorageSync('photoDetailCollection', this.data.photos)
      wx.navigateTo({
        url: `../photo-detail/photo-detail?id=${photo.id}`,
        success: (result) => {
          returningFromDetail.add(this)
          result.eventChannel.emit('photoData', { photos: this.data.photos, index })
        },
      })
    },

    retry() {
      this.loadPhotos(1)
    },

    retryLoadMore() {
      this.loadMore()
    },
  },
}, 'pages/photo/photo'))
