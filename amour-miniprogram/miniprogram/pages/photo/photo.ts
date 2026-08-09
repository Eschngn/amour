import { post } from '../../utils/request'

const PAGE_SIZE = 6

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
    loadError: '',
    loadingItems: [1, 2, 3, 4],
    categories: [] as PhotoCategory[],
    activeCategory: 'all' as string | number,
    photos: [] as WechatMiniprogram.IAnyObject[],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    pageSummary: '正在整理照片',
  },

  lifetimes: {
    attached() {
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

    async loadPhotos(page: number) {
      this.setData({ loading: true, loadError: '' })
      const payload: WechatMiniprogram.IAnyObject = { current: page, size: PAGE_SIZE }
      if (this.data.activeCategory !== 'all') payload.photoCategoryId = this.data.activeCategory
      try {
        const result = await post<PhotoPageResult>('/photo/page', payload)
        const total = Number(result.total) || 0
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        const currentPage = Math.min(Math.max(1, Number(result.current) || page), totalPages)
        const photos = (result.records || []).filter((item) => item.url).map((item, index) => ({
          ...item,
          title: item.title || '未命名照片',
          description: item.description || '这一页还没有写下文字。',
          categoryName: item.categoryName || '共同回忆',
          date: item.takenTime ? item.takenTime.slice(0, 10).replace(/-/g, '.') : '日期未记录',
          location: item.location || '',
          number: String((currentPage - 1) * PAGE_SIZE + index + 1).padStart(2, '0'),
        }))
        const start = total ? (currentPage - 1) * PAGE_SIZE + 1 : 0
        const end = Math.min(currentPage * PAGE_SIZE, total)
        this.setData({
          photos,
          currentPage,
          totalPages,
          total,
          pageSummary: total ? `${start}-${end} / ${total}` : '等待新的照片',
          loading: false,
        })
      } catch (error) {
        this.setData({
          loading: false,
          loadError: getErrorMessage(error, '照片加载失败，请稍后重试'),
        })
      }
    },

    selectCategory(event: WechatMiniprogram.BaseEvent) {
      const rawId = event.currentTarget.dataset.id
      const categoryId = rawId === 'all' ? 'all' : Number(rawId)
      if (categoryId === this.data.activeCategory) return
      this.setData({ activeCategory: categoryId }, () => this.loadPhotos(1))
    },

    turnPage(event: WechatMiniprogram.BaseEvent) {
      const direction = event.currentTarget.dataset.direction
      const nextPage = direction === 'prev' ? this.data.currentPage - 1 : this.data.currentPage + 1
      if (nextPage >= 1 && nextPage <= this.data.totalPages) this.loadPhotos(nextPage)
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
      this.loadPhotos(this.data.currentPage)
    },
  },
})
