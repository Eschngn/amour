import { post } from '../../utils/request'
import { hasFrontendQueryPermission } from '../../utils/auth'
import { withComponentPageViewTracking } from '../../utils/page-view-lifecycle'
import { guardPageReady } from '../../utils/access-control'
import { formatStoryStartYear } from '../../utils/story-content'

/** 记录哪些页面实例刚打开过故事详情：返回时只做一次静默刷新。 */
const returningFromDetail = new WeakSet<object>()

interface StoryChapter {
  id: number
  name: string
  startDate: string
  endDate: string
  nodeCount: number
}

interface StoryOverview {
  totalNodes: number
  totalSeasons: number
  totalChapters: number
  startDate: string
  chapters: StoryChapter[]
}

interface StoryNode {
  id: number
  title: string
  summary: string
  happenedTime: string
  showTime?: boolean
  location: string
  coverImage: string
  tagLabel: string
}

function formatDate(value: string, showTime?: boolean) {
  if (!value) return '日期未记录'
  const date = value.slice(0, 10).replace(/-/g, '.')
  // 仅日期模式不展示时分秒；历史数据默认展示到秒。
  if (showTime === false) return date
  const clock = value.slice(11, 19)
  return clock ? `${date} ${clock}` : date
}

function formatPeriod(start: string, end: string) {
  const startText = formatDate(start)
  const endText = formatDate(end)
  return startText === endText ? startText : `${startText} - ${endText}`
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

Component(withComponentPageViewTracking({
  data: {
    loading: true,
    loadError: '',
    storiesLoading: false,
    storiesError: '',
    loadingItems: [1, 2, 3],
    activeChapter: 0,
    stats: { totalNodes: 0, totalSeasons: 0, startYear: '--' },
    chapters: [] as WechatMiniprogram.IAnyObject[],
    currentChapter: { title: '', period: '' },
    stories: [] as WechatMiniprogram.IAnyObject[],
  },

  lifetimes: {
    async attached() {
      // 页面守卫：未登录 / 无情侣空间时跳回「我的」并展示创建 / 绑定提示；
      // 模块查询权限沿用项目原有逻辑，缺失时回到公开的恋爱广场。
      const allowed = await guardPageReady('pages/story/story')
      if (!allowed) return
      if (!hasFrontendQueryPermission('story')) {
        wx.reLaunch({ url: '/pages/plaza/index' })
        return
      }
      this.loadOverview()
    },
  },

  pageLifetimes: {
    async show() {
      // 只有从故事详情返回时才刷新；静默更新当前章节，保留列表与滚动位置。
      if (!returningFromDetail.delete(this)) return
      await this.refreshVisibleChapter()
    },
  },

  methods: {
    async loadOverview() {
      this.setData({ loading: true, loadError: '' })
      try {
        const response = await post<StoryOverview | null>('/story/overview')
        // 没有章节时后端可能返回空数据，按“尚未开始记录故事”处理。
        const overview = response || ({} as Partial<StoryOverview>)
        const chapters = (overview.chapters || []).map((chapter, index) => ({
          id: chapter.id,
          title: chapter.name,
          period: formatPeriod(chapter.startDate, chapter.endDate),
          nodeCount: Number(chapter.nodeCount) || 0,
          number: String(index + 1).padStart(2, '0'),
        }))
        const startYear = formatStoryStartYear(overview.startDate)
        this.setData({
          chapters,
          stats: {
            totalNodes: Number(overview.totalNodes) || 0,
            totalSeasons: Number(overview.totalSeasons) || 0,
            startYear,
          },
          loading: false,
        })
        if (chapters.length) await this.loadChapter(0)
      } catch (error) {
        this.setData({ loading: false, loadError: getErrorMessage(error, '请稍后重试') })
      }
    },

    selectChapter(event: WechatMiniprogram.BaseEvent) {
      const index = Number(event.currentTarget.dataset.index)
      if (Number.isInteger(index) && index !== this.data.activeChapter) this.loadChapter(index)
    },

    async loadChapter(index: number, options?: { silent?: boolean }) {
      const chapter = this.data.chapters[index]
      if (!chapter) return
      const silent = Boolean(options && options.silent)
      const globalOffset = this.data.chapters
        .slice(0, index)
        .reduce((sum: number, item: WechatMiniprogram.IAnyObject) => sum + Number(item.nodeCount || 0), 0)
      this.setData({
        activeChapter: index,
        currentChapter: chapter as { title: string; period: string },
        storiesLoading: !silent,
        storiesError: '',
        ...(silent ? {} : { stories: [] }),
      })
      try {
        const nodes = await post<StoryNode[]>('/story/getStoryByChapterId', { chapterId: String(chapter.id) })
        const stories = (nodes || []).map((node, storyIndex) => ({
          id: node.id,
          title: node.title || '未命名故事',
          summary: node.summary || '这一段故事，等你慢慢打开。',
          date: formatDate(node.happenedTime, node.showTime),
          location: node.location || '',
          coverImage: node.coverImage || '',
          tag: node.tagLabel || '',
          storyNumber: `STORY #${String(globalOffset + storyIndex + 1).padStart(2, '0')}`,
        }))
        this.setData({ stories, storiesLoading: false })
      } catch (error) {
        const message = getErrorMessage(error, '本章故事暂时加载失败')
        if (silent && this.data.stories.length) {
          // 静默刷新失败：保留当前章节内容与滚动位置，不用错误态替换列表。
          console.warn('本章故事静默刷新失败', message)
          this.setData({ storiesLoading: false })
          return
        }
        this.setData({ storiesLoading: false, storiesError: message })
      }
    },

    retryChapter() {
      this.loadChapter(this.data.activeChapter)
    },

    /** 从故事详情返回：静默刷新当前章节，保留列表与滚动位置。 */
    async refreshVisibleChapter() {
      if (!this.data.chapters.length) {
        await this.loadOverview()
        return
      }
      await this.loadChapter(Number(this.data.activeChapter) || 0, { silent: true })
    },

    openStoryDetail(event: WechatMiniprogram.BaseEvent) {
      const id = Number(event.currentTarget.dataset.id)
      if (!Number.isFinite(id) || id <= 0) return
      wx.navigateTo({
        url: `../story-detail/story-detail?id=${id}`,
        success: () => returningFromDetail.add(this),
      })
    },
  },
}, 'pages/story/story'))
