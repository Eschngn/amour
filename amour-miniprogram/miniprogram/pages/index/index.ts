import { post } from '../../utils/request'

const DEFAULT_LOVE_START = '2024-05-20 18:30:00'
const DEFAULT_AVATAR = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
const OSS_BASE = 'https://chengliuxiang.oss-cn-hangzhou.aliyuncs.com/amour'
const DEFAULT_HERO_PHOTO_ONE = `${OSS_BASE}/example-photo1.png`
const DEFAULT_HERO_PHOTO_TWO = `${OSS_BASE}/example-photo2.png`

const HOME_CONFIG_ITEMS = [
  { configKey: 'boy_name', field: 'boyName' },
  { configKey: 'girl_name', field: 'girlName' },
  { configKey: 'love_start_time', field: 'loveStartTime' },
  { configKey: 'boy_avatar', field: 'boyAvatar' },
  { configKey: 'girl_avatar', field: 'girlAvatar' },
  { configKey: 'home.hero_photo_1', field: 'heroPhotoOne' },
  { configKey: 'home.hero_photo_2', field: 'heroPhotoTwo' },
]

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
    heroPhotoOne: DEFAULT_HERO_PHOTO_ONE,
    heroPhotoTwo: DEFAULT_HERO_PHOTO_TWO,
    boyAvatar: DEFAULT_AVATAR,
    girlAvatar: DEFAULT_AVATAR,
    loveStartTime: DEFAULT_LOVE_START,
    loveStartDate: '2024 · 05 · 20',
    togetherDays: 0,
    storyStat: '等待新的章节',
    elapsedUnits: [
      { label: '天', value: '000' },
      { label: '小时', value: '00' },
      { label: '分钟', value: '00' },
      { label: '秒', value: '00' },
    ],
  },

  lifetimes: {
    attached() {
      this.updateTime()
      timeTicker = setInterval(() => this.updateTime(), 1000)
      this.loadHomeData()
    },
    detached() {
      if (timeTicker) {
        clearInterval(timeTicker)
        timeTicker = undefined
      }
    },
  },

  methods: {
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

      const loveStartTime = typeof updates.loveStartTime === 'string'
        ? updates.loveStartTime
        : this.data.loveStartTime
      updates.loveStartDate = formatLoveStartDate(loveStartTime)
      this.setData(updates, () => this.updateTime())
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

    openStory() {
      wx.navigateTo({ url: '../story/story' })
    },

    openSection(event: WechatMiniprogram.BaseEvent) {
      const section = event.currentTarget.dataset.section
      const routes: Record<string, string> = {
        story: '../story/story',
        photo: '../photo/photo',
        message: '../message/message',
      }
      const url = routes[section]
      if (url) wx.navigateTo({ url })
    },

    onPhotoError(event: WechatMiniprogram.BaseEvent) {
      const source = event.currentTarget.dataset.source
      if (source === 'secondary') {
        this.setData({
          heroPhotoTwo: this.data.heroPhotoTwo === DEFAULT_HERO_PHOTO_TWO ? '' : DEFAULT_HERO_PHOTO_TWO,
        })
        return
      }
      this.setData({
        heroPhotoOne: this.data.heroPhotoOne === DEFAULT_HERO_PHOTO_ONE ? '' : DEFAULT_HERO_PHOTO_ONE,
      })
    },
  },
})
