import { post } from '../../utils/request'

const DEFAULT_LOVE_START = '2024-05-20 18:30:00'

const HOME_CONFIG_ITEMS = [
  { configKey: 'boy_name', field: 'boyName' },
  { configKey: 'girl_name', field: 'girlName' },
  { configKey: 'love_start_time', field: 'loveStartTime' },
  { configKey: 'boy_avatar', field: 'boyAvatar' },
  { configKey: 'girl_avatar', field: 'girlAvatar' },
  { configKey: 'home.hero_photo_1', field: 'heroPhotoOne' },
  { configKey: 'home.hero_photo_2', field: 'heroPhotoTwo' },
]

// 管理控制台可选配置的全站默认图；未配置时首页展示首字母 / “尚未上传照片”占位。
const DEFAULT_IMAGE_KEYS = {
  boyAvatar: 'frontend.default_couple_avatar_boy',
  girlAvatar: 'frontend.default_couple_avatar_girl',
  heroPhotoOne: 'frontend.default_couple_hero_photo_1',
  heroPhotoTwo: 'frontend.default_couple_hero_photo_2',
}

interface MilestoneStory {
  id: number
  title: string
  summary: string
  happenedTime: string
  coverImage: string
}

function parseLoveStart(value: string) {
  const timestamp = new Date(value.trim().replace(/-/g, '/').replace('T', ' ')).getTime()
  if (Number.isFinite(timestamp)) return timestamp
  return new Date(DEFAULT_LOVE_START.replace(/-/g, '/')).getTime()
}

/** 头像占位文字：优先昵称首字母，没有昵称时使用 HE / SHE。 */
function initialOf(name: string, fallback: string) {
  const text = String(name || '').trim()
  if (!text) return fallback
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length >= 2 && /^[a-z]/i.test(words[0])) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return text.slice(0, /^[a-z]/i.test(text) ? 2 : 1).toUpperCase()
}

function formatLoveStartDate(value: string) {
  const date = new Date(parseLoveStart(value))
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year} · ${month} · ${day}`
}

let timeTicker: number | undefined

Component({
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
    loveStartTime: DEFAULT_LOVE_START,
    loveStartDate: '2024 · 05 · 20',
    togetherDays: 0,
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
      const app = getApp<IAppOption>()
      if (app.globalData.authReady) await app.globalData.authReady.catch(() => undefined)
      this.updateTime()
      timeTicker = setInterval(() => this.updateTime(), 1000)
      this.setData({
        showStory: this.hasQueryPermission('story'),
        showPhoto: this.hasQueryPermission('photo'),
        showMessage: this.hasQueryPermission('message'),
      }, () => this.loadHomeData())
    },
    detached() {
      if (timeTicker) {
        clearInterval(timeTicker)
        timeTicker = undefined
      }
    },
  },

  methods: {
    hasQueryPermission(module: string) {
      const auth = getApp<IAppOption>().globalData.auth
      return !auth || !auth.token || (auth.permissions || []).includes(`frontend:${module}:query`)
    },

    updateTime() {
      const start = parseLoveStart(this.data.loveStartTime)
      const elapsed = Math.max(0, Date.now() - start)
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
      await Promise.all([this.loadHomeConfig(), this.loadMilestones()])
    },

    async loadHomeConfig() {
      const updates: WechatMiniprogram.IAnyObject = {}
      await Promise.all(HOME_CONFIG_ITEMS.map(async ({ configKey, field }) => {
        try {
          const value = await post<string>('/site-config/query', { configKey })
          if (typeof value === 'string' && value.trim()) updates[field] = value.trim()
        } catch (error) {
          console.warn(`首页配置 ${configKey} 读取失败，已使用默认值`, error)
        }
      }))

      await this.loadDefaultImages(updates)
      const loveStartTime = typeof updates.loveStartTime === 'string'
        ? updates.loveStartTime
        : this.data.loveStartTime
      updates.loveStartDate = formatLoveStartDate(loveStartTime)
      updates.boyInitial = initialOf(
        typeof updates.boyName === 'string' ? updates.boyName : this.data.boyName,
        'HE',
      )
      updates.girlInitial = initialOf(
        typeof updates.girlName === 'string' ? updates.girlName : this.data.girlName,
        'SHE',
      )
      this.setData(updates, () => this.updateTime())
    },

    /** 一次批量读取全站默认图片，只填补当前仍为空的字段，避免覆盖已有配置。 */
    async loadDefaultImages(updates: WechatMiniprogram.IAnyObject) {
      try {
        const defaults = await post<Record<string, string>>('/site-config/query-batch', {
          configKeys: Object.values(DEFAULT_IMAGE_KEYS),
        })
        if (!defaults || typeof defaults !== 'object') return
        Object.keys(DEFAULT_IMAGE_KEYS).forEach((field) => {
          if (updates[field]) return
          const value = defaults[DEFAULT_IMAGE_KEYS[field as keyof typeof DEFAULT_IMAGE_KEYS]]
          if (typeof value === 'string' && value.trim()) updates[field] = value.trim()
        })
      } catch (error) {
        console.warn('全站默认图片读取失败，使用占位样式', error)
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
      wx.navigateTo({ url: '../story/story' })
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
      wx.navigateTo({ url: routes[section] })
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
})
