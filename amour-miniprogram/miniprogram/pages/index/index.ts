import { post } from '../../utils/request'
import { querySpaceHome } from '../../utils/space-content-api'
import { buildHomeView } from '../../utils/space-home-view'
import { withComponentPageViewTracking } from '../../utils/page-view-lifecycle'
import { guardPageReady, navigateWithGuard } from '../../utils/access-control'
import { hasFrontendQueryPermission } from '../../utils/auth'

interface MilestoneStory {
  id: number
  title: string
  summary: string
  happenedTime: string
  coverImage: string
}

function parseLoveStart(value: string) {
  const text = String(value || '').trim()
  if (!text) return 0
  const timestamp = new Date(text.replace(/-/g, '/').replace('T', ' ')).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

let timeTicker: number | undefined

/**
 * 页面实例卸载标记。
 *
 * 守卫是异步的：状态确认期间用户可能已经离开页面，此时不能再 setData / 加载数据。
 * 小程序组件类型没有为自定义实例字段提供声明，这里用一组小工具集中处理。
 */
const detachedInstances = new WeakSet<object>()

function markDetached(instance: object): void {
  detachedInstances.add(instance)
}

function isDetached(instance: object): boolean {
  return detachedInstances.has(instance)
}

Component(withComponentPageViewTracking({
  data: {
    boyName: 'HE',
    girlName: 'SHE',
    // 空字符串表示没有真实图片，由 WXML 展示占位，不再使用示例头像 / 示例照片。
    heroPhotoOne: '',
    heroPhotoTwo: '',
    boyAvatar: '',
    girlAvatar: '',
    boyInitial: 'HE',
    girlInitial: 'SHE',
    loveStartTime: '',
    loveStartDate: '',
    togetherDays: 0,
    /** 页面守卫检查中 / 不通过时展示占位，避免受限内容闪现 */
    pageBlocked: true,
    /** 是否已经完成过一次首页数据加载（用于 pageLifetimes.show 刷新） */
    homeLoadedOnce: false,
    storyStat: '等待新的章节',
    showStory: false,
    showPhoto: false,
    showMessage: false,
    elapsedUnits: [
      { label: '天', value: '000' },
      { label: '小时', value: '00' },
      { label: '分钟', value: '00' },
      { label: '秒', value: '00' },
    ],
  },

  lifetimes: {
    async attached() {
      // 情侣空间首页属于「必须存在情侣空间」的页面：
      // 未登录 / 无情侣空间 / 状态异常时由统一守卫跳回「我的」并展示引导，
      // 不能只依赖底部 Tab 隐藏，深链、分享与历史栈恢复都要被拦截。
      const allowed = await guardPageReady('pages/index/index')
      if (isDetached(this)) return
      if (!allowed) {
        this.setData({ pageBlocked: true })
        return
      }
      this.setData({ pageBlocked: false })
      this.updateTime()
      timeTicker = setInterval(() => this.updateTime(), 1000)
      this.setData({
        showStory: this.hasQueryPermission('story'),
        showPhoto: this.hasQueryPermission('photo'),
        showMessage: this.hasQueryPermission('message'),
      }, () => this.loadHomeData())
    },
    detached() {
      markDetached(this)
      if (timeTicker) {
        clearInterval(timeTicker)
        timeTicker = undefined
      }
    },
  },

  pageLifetimes: {
    show() {
      // 从空间编辑页保存后返回：重新读取 /space/home/query，确保看到最新内容。
      if (this.data.homeLoadedOnce && !this.data.pageBlocked) this.loadHomeData()
    },
  },

  methods: {
    hasQueryPermission(module: string) {
      return hasFrontendQueryPermission(module)
    },

    updateTime() {
      const start = parseLoveStart(this.data.loveStartTime)
      const elapsed = start ? Math.max(0, Date.now() - start) : 0
      const days = Math.floor(elapsed / 86400000)
      const hours = Math.floor((elapsed % 86400000) / 3600000)
      const minutes = Math.floor((elapsed % 3600000) / 60000)
      const seconds = Math.floor((elapsed % 60000) / 1000)
      const pad = (value: number, length = 2) => String(value).padStart(length, '0')
      this.setData({
        togetherDays: days,
        elapsedUnits: [
          { label: '天', value: String(days) },
          { label: '小时', value: pad(hours) },
          { label: '分钟', value: pad(minutes) },
          { label: '秒', value: pad(seconds) },
        ],
      })
    },

    async loadHomeData() {
      await Promise.all([this.loadSpaceHome(), this.loadMilestones()])
      if (isDetached(this)) return
      this.setData({ homeLoadedOnce: true })
    },

    /**
     * 读取当前情侣空间首页。
     *
     * 数据唯一来源是 POST /space/home/query：
     * - 空间名 / 简介 / 恋爱开始时间来自 couple_space；
     * - 双方展示名、头像与主视觉照片由后端按来源解析（空间配置 / 成员资料 / 平台默认）；
     * - 不再读取 /site-config/query 并用平台默认值覆盖用户空间数据。
     */
    async loadSpaceHome() {
      try {
        const home = await querySpaceHome()
        if (isDetached(this)) return
        const view = buildHomeView(home)
        this.setData(view, () => this.updateTime())
      } catch (error) {
        console.warn('空间首页读取失败，已使用占位展示', error)
      }
    },

    async loadMilestones() {
      try {
        const milestones = await post<MilestoneStory[]>('/story/milestones')
        if (Array.isArray(milestones)) {
          this.setData({
            storyStat: milestones.length ? `已收藏 ${milestones.length} 个瞬间` : '等待新的章节',
          })
        }
      } catch (error) {
        console.warn('故事里程碑读取失败，已使用默认值', error)
      }
    },

    showPermissionDenied(module: string) {
      const labels: Record<string, string> = {
        story: '故事',
        photo: '相册',
        message: '留言',
      }
      wx.showToast({
        title: `暂无${labels[module] || '该模块'}查询权限`,
        icon: 'none',
        duration: 1800,
      })
    },

    openStory() {
      if (!this.hasQueryPermission('story')) {
        this.showPermissionDenied('story')
        return
      }
      navigateWithGuard('../story/story')
    },

    openSection(event: WechatMiniprogram.BaseEvent) {
      const section = String(event.currentTarget.dataset.section || '')
      const routes: Record<string, string> = {
        story: '../story/story',
        photo: '../photo/photo',
        message: '../message/message',
      }
      if (!routes[section]) return
      if (!this.hasQueryPermission(section)) {
        this.showPermissionDenied(section)
        return
      }
      navigateWithGuard(routes[section])
    },

    onPhotoError(event: WechatMiniprogram.BaseEvent) {
      const source = event.currentTarget.dataset.source
      // 图片加载失败直接回到占位样式，不再切换到示例照片。
      if (source === 'secondary') {
        this.setData({ heroPhotoTwo: '' })
        return
      }
      this.setData({ heroPhotoOne: '' })
    },

    onAvatarError(event: WechatMiniprogram.BaseEvent) {
      const source = event.currentTarget.dataset.source
      if (source === 'boy') {
        this.setData({ boyAvatar: '' })
        return
      }
      if (source === 'girl') {
        this.setData({ girlAvatar: '' })
      }
    },
  },
}, 'pages/index/index'))
