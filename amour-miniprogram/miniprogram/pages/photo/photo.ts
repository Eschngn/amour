import { post } from '../../utils/request'
import { hasFrontendQueryPermission } from '../../utils/auth'

const PAGE_SIZE = 6
let latestPhotoRequestId = 0

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

Component({
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
      const app = getApp<IAppOption>()
      if (app.globalData.authReady) await app.globalData.authReady.catch(() => undefined)
      if (!hasFrontendQueryPermission('photo')) {
        wx.reLaunch({ url: '/pages/index/index' })
        return
      }
      this.initialize()
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
        const newPhotos = (result.records || []).filter((item) => item.url).map((item, index) => ({
          ...item,
          title: item.title || '未命名照片',
          description: item.description || '这一页还没有写下文字。',
          categoryName: item.categoryName || '共同回忆',
          date: item.takenTime ? item.takenTime.slice(0, 10).replace(/-/g, '.') : '日期未记录',
          location: item.location || '',
          number: String((currentPage - 1) * PAGE_SIZE + index + 1).padStart(2, '0'),
        }))
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

    openPhotoDetail(event: WechatMiniprogram.BaseEvent) {
      const index = Number(event.currentTarget.dataset.index)
      const photo = this.data.photos[index]
      if (!photo) return
      wx.setStorageSync('photoDetailCollection', this.data.photos)
      wx.navigateTo({
        url: `../photo-detail/photo-detail?id=${photo.id}`,
        success: (result) => {
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
})
