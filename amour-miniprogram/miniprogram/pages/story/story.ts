import { post } from '../../utils/request'

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
  location: string
  coverImage: string
  tagLabel: string
}

function formatDate(value: string) {
  return value ? value.slice(0, 10).replace(/-/g, '.') : '日期未记录'
}

function formatPeriod(start: string, end: string) {
  const startText = formatDate(start)
  const endText = formatDate(end)
  return startText === endText ? startText : `${startText} - ${endText}`
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

Component({
  data: {
    loading: true,
    loadError: '',
    storiesLoading: false,
    storiesError: '',
    loadingItems: [1, 2, 3],
    activeChapter: 0,
    stats: { totalNodes: 0, totalSeasons: 0, startYear: "'24" },
    chapters: [] as WechatMiniprogram.IAnyObject[],
    currentChapter: { title: '', period: '' },
    stories: [] as WechatMiniprogram.IAnyObject[],
  },

  lifetimes: {
    attached() {
      this.loadOverview()
    },
  },

  methods: {
    async loadOverview() {
      this.setData({ loading: true, loadError: '' })
      try {
        const overview = await post<StoryOverview>('/story/overview')
        const chapters = (overview.chapters || []).map((chapter, index) => ({
          id: chapter.id,
          title: chapter.name,
          period: formatPeriod(chapter.startDate, chapter.endDate),
          nodeCount: Number(chapter.nodeCount) || 0,
          number: String(index + 1).padStart(2, '0'),
        }))
        const startYear = overview.startDate ? `'${overview.startDate.slice(2, 4)}` : "'24"
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

    async loadChapter(index: number) {
      const chapter = this.data.chapters[index]
      if (!chapter) return
      const globalOffset = this.data.chapters
        .slice(0, index)
        .reduce((sum: number, item: WechatMiniprogram.IAnyObject) => sum + Number(item.nodeCount || 0), 0)
      this.setData({
        activeChapter: index,
        currentChapter: chapter,
        storiesLoading: true,
        storiesError: '',
        stories: [],
      })
      try {
        const nodes = await post<StoryNode[]>('/story/getStoryByChapterId', { chapterId: String(chapter.id) })
        const stories = (nodes || []).map((node, storyIndex) => ({
          id: node.id,
          title: node.title || '未命名故事',
          summary: node.summary || '这一段故事，等你慢慢打开。',
          date: formatDate(node.happenedTime),
          location: node.location || '',
          coverImage: node.coverImage || '',
          tag: node.tagLabel || '',
          storyNumber: `STORY #${String(globalOffset + storyIndex + 1).padStart(2, '0')}`,
        }))
        this.setData({ stories, storiesLoading: false })
      } catch (error) {
        this.setData({
          storiesLoading: false,
          storiesError: getErrorMessage(error, '本章故事暂时加载失败'),
        })
      }
    },

    retryChapter() {
      this.loadChapter(this.data.activeChapter)
    },

    openStoryDetail(event: WechatMiniprogram.BaseEvent) {
      const id = Number(event.currentTarget.dataset.id)
      if (Number.isFinite(id) && id > 0) {
        wx.navigateTo({ url: `../story-detail/story-detail?id=${id}` })
      }
    },
  },
})
