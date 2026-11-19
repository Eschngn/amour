import { post } from '../../utils/request'
import { querySpaceHome } from '../../utils/space-content-api'
import { buildHomeView } from '../../utils/space-home-view'
import { parseBackendDateTime } from '../../utils/space-edit'
import { withComponentPageViewTracking } from '../../utils/page-view-lifecycle'
import {
  guardPageReady,
  navigateWithGuard,
  openSpaceSetup,
  openSpaceStudio,
} from '../../utils/access-control'
import { hasFrontendQueryPermission } from '../../utils/auth'
import * as sessionState from '../../utils/session-state'
import type { SessionSnapshot } from '../../utils/session-state'
import { SESSION_STATUS } from '../../utils/session-constants'
import { isWaitingForPartner } from '../../utils/session-rules'

interface MilestoneStory {
  id: number
  title: string
  summary: string
  happenedTime: string
  coverImage: string
}

interface HomePhotoItem {
  key: string
  url: string
  failed: boolean
}

interface HomePageState {
  disposed: boolean
  mounted: boolean
  visible: boolean
  timer: number | undefined
  homeSeq: number
  milestoneSeq: number
  unsubscribe: (() => void) | undefined
  /** 当前展示的空间 ID：变化时丢弃旧空间在途响应并重新加载 */
  spaceId: number | string | null | undefined
}

const pageStates = new WeakMap<object, HomePageState>()

/** 页面实例私有状态：避免把定时器 / 请求序号写进 data 触发无意义渲染。 */
function stateOf(instance: object): HomePageState {
  let state = pageStates.get(instance)
  if (!state) {
    state = {
      disposed: false,
      mounted: false,
      visible: true,
      timer: undefined,
      homeSeq: 0,
      milestoneSeq: 0,
      unsubscribe: undefined,
      spaceId: undefined,
    }
    pageStates.set(instance, state)
  }
  return state
}

/** 沿用现有日期口径：按本地时区解析后端 yyyy-MM-dd HH:mm:ss。 */
function parseLoveStart(value: string): number {
  const fields = parseBackendDateTime(value)
  if (!fields) return 0
  return new Date(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second,
  ).getTime()
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return fallback
}

Component(withComponentPageViewTracking({
  data: {
    boyName: 'HE',
    girlName: 'SHE',
    // 空字符串表示没有真实图片，由 WXML 展示占位，不再使用示例头像 / 示例照片。
    boyAvatar: '',
    girlAvatar: '',
    boyInitial: 'HE',
    girlInitial: 'SHE',
    /** 后端返回的真实空间名称与简介；简介为空时由 WXML 展示简短占位 */
    spaceName: '',
    description: '',
    /** 服务端判断当前用户是否可以编辑空间首页 */
    canEdit: false,
    /** 只包含真实存在的照片（0～2 张），加载失败项保留占位但不进入预览列表 */
    homePhotos: [] as HomePhotoItem[],
    loveStartTime: '',
    loveStartDate: '',
    hasLoveStart: false,
    togetherDays: 0,
    elapsedUnits: [
      { label: '小时', value: '00' },
      { label: '分钟', value: '00' },
      { label: '秒', value: '00' },
    ],

    /** 页面守卫检查中 / 不通过时展示占位，避免受限内容闪现 */
    pageBlocked: true,
    /** 首次加载中；加载成功但数据为空时也展示正常结构 */
    homeLoading: true,
    /** 是否已有可展示的首页内容（用于区分首次失败与刷新失败） */
    homeLoaded: false,
    /** 首次加载失败：整页可见说明 + 重试 */
    homeError: '',
    /** 已有内容后的刷新失败：保留内容，只展示轻量提示 */
    refreshError: '',
    refreshing: false,
    /** 是否已经完成过一次首页数据加载（用于 pageLifetimes.show 刷新） */
    homeLoadedOnce: false,

    /** 等待另一半加入：展示简洁状态并引导到邀请管理 */
    waitingForPartner: false,
    memberCount: 0,

    storyStat: '正在读取里程碑…',
    showStory: false,
    showPhoto: false,
    showMessage: false,
    showAnniversary: false,
  },

  lifetimes: {
    async attached() {
      const state = stateOf(this)
      state.mounted = true
      state.visible = true
      // 情侣空间首页属于「必须存在情侣空间」的页面：
      // 未登录 / 无情侣空间 / 状态异常时由统一守卫跳回「我的」并展示引导，
      // 不能只依赖底部 Tab 隐藏，深链、分享与历史栈恢复都要被拦截。
      const allowed = await guardPageReady('pages/index/index')
      if (state.disposed) return
      if (!allowed) {
        this.setData({ pageBlocked: true, homeLoading: false })
        return
      }
      this.setData({
        pageBlocked: false,
        showStory: this.hasQueryPermission('story'),
        showPhoto: this.hasQueryPermission('photo'),
        showMessage: this.hasQueryPermission('message'),
        showAnniversary: this.hasQueryPermission('anniversary'),
      }, () => {
        this.bindSession()
        this.applySession(sessionState.getSnapshot())
        this.loadHomeData()
      })
    },
    detached() {
      const state = stateOf(this)
      state.disposed = true
      state.mounted = false
      if (state.timer) {
        clearInterval(state.timer)
        state.timer = undefined
      }
      if (typeof state.unsubscribe === 'function') {
        state.unsubscribe()
        state.unsubscribe = undefined
      }
    },
  },

  pageLifetimes: {
    show() {
      const state = stateOf(this)
      state.visible = true
      if (state.disposed || this.data.pageBlocked) return
      // 从空间编辑页保存后返回：重新读取 /space/home/query，确保看到最新内容。
      this.syncTicker()
      if (this.data.homeLoadedOnce) this.loadHomeData({ refresh: true })
    },
    hide() {
      const state = stateOf(this)
      state.visible = false
      if (state.timer) {
        clearInterval(state.timer)
        state.timer = undefined
      }
    },
  },

  methods: {
    hasQueryPermission(module: string) {
      return hasFrontendQueryPermission(module)
    },

    /** 订阅唯一状态源，仅用于等待绑定 / 成员数这类展示信息，不缓存空间状态。 */
    bindSession() {
      const state = stateOf(this)
      if (typeof state.unsubscribe === 'function') state.unsubscribe()
      state.unsubscribe = sessionState.subscribe(snapshot => this.applySession(snapshot))
    },

    applySession(snapshot: SessionSnapshot) {
      const state = stateOf(this)
      if (state.disposed || !snapshot) return
      if (snapshot.status !== SESSION_STATUS.AUTHENTICATED_WITH_SPACE) {
        // 会话失效 / 空间不可用时先让在途响应过期，避免旧数据写回页面。
        state.homeSeq += 1
        state.milestoneSeq += 1
        return
      }
      const space = snapshot.space
      const waiting = isWaitingForPartner(space)
      const count = Number(space && space.memberCount)
      const spaceId = space && space.spaceId
      // 空间切换：丢弃旧空间在途响应，再按新空间重新读取。
      const changed = state.spaceId !== undefined && String(state.spaceId) !== String(spaceId)
      state.spaceId = spaceId
      this.setData({
        waitingForPartner: waiting,
        memberCount: Number.isFinite(count) && count > 0 ? count : 0,
      })
      if (changed && state.mounted) this.loadHomeData()
    },

    /** 页面隐藏 / 未设置开始时间时不启动计时器；恢复时按最新数据重启。 */
    syncTicker() {
      const state = stateOf(this)
      if (state.timer) {
        clearInterval(state.timer)
        state.timer = undefined
      }
      if (state.disposed || !state.visible || !this.data.hasLoveStart) return
      state.timer = setInterval(() => this.updateTime(), 1000)
    },

    updateTime() {
      const start = parseLoveStart(this.data.loveStartTime)
      const elapsed = start ? Math.max(0, Date.now() - start) : 0
      const days = Math.floor(elapsed / 86400000)
      const hours = Math.floor((elapsed % 86400000) / 3600000)
      const minutes = Math.floor((elapsed % 3600000) / 60000)
      const seconds = Math.floor((elapsed % 60000) / 1000)
      const pad = (value: number) => String(value).padStart(2, '0')
      // 每秒只更新天数与三个补充单位，避免整个页面对象重新渲染。
      this.setData({
        togetherDays: days,
        elapsedUnits: [
          { label: '小时', value: pad(hours) },
          { label: '分钟', value: pad(minutes) },
          { label: '秒', value: pad(seconds) },
        ],
      })
    },

    /**
     * 读取首页数据。
     *
     * refresh=true 时保留已有内容：刷新失败只展示轻量提示，不清空整页。
     */
    async loadHomeData(options?: { refresh?: boolean }) {
      const state = stateOf(this)
      if (state.disposed || !state.mounted) return
      const requestId = ++state.homeSeq
      const refresh = Boolean(options && options.refresh) && this.data.homeLoaded
      if (refresh) {
        this.setData({ refreshing: true, refreshError: '' })
      } else {
        this.setData({ homeLoading: true, homeError: '', refreshError: '' })
      }
      const tasks: Array<Promise<void>> = [this.loadSpaceHome(requestId)]
      // 无故事查询权限时不请求里程碑，避免无权限调用。
      if (this.data.showStory) tasks.push(this.loadMilestones())
      await Promise.all(tasks)
      if (state.disposed || requestId !== state.homeSeq) return
      this.setData({ homeLoading: false, refreshing: false, homeLoadedOnce: true })
    },

    /**
     * 读取当前情侣空间首页。
     *
     * 数据唯一来源是 POST /space/home/query：
     * - 空间名 / 简介 / 恋爱开始时间来自 couple_space；
     * - 双方展示名、头像与主视觉照片由后端按来源解析（空间配置 / 成员资料 / 平台默认）；
     * - 不再读取 /site-config/query 并用平台默认值覆盖用户空间数据。
     */
    async loadSpaceHome(requestId: number) {
      const state = stateOf(this)
      try {
        const home = await querySpaceHome()
        if (state.disposed || requestId !== state.homeSeq) return
        const view = buildHomeView(home)
        const photos: HomePhotoItem[] = view.heroPhotos.map(item => ({
          key: item.key,
          url: item.url,
          failed: false,
        }))
        this.setData({
          spaceName: view.spaceName,
          description: view.description,
          canEdit: view.canEdit,
          boyName: view.boyName,
          girlName: view.girlName,
          boyAvatar: view.boyAvatar,
          girlAvatar: view.girlAvatar,
          homePhotos: photos,
          loveStartTime: view.loveStartTime,
          loveStartDate: view.loveStartDate,
          hasLoveStart: view.hasLoveStart,
          boyInitial: view.boyInitial,
          girlInitial: view.girlInitial,
          homeError: '',
          refreshError: '',
          homeLoaded: true,
        })
        this.updateTime()
        this.syncTicker()
      } catch (error) {
        if (state.disposed || requestId !== state.homeSeq) return
        const message = getErrorMessage(error, '空间信息加载失败，请稍后重试')
        // 已有内容时保留可用数据，避免一次刷新失败清空整页。
        if (this.data.homeLoaded) {
          this.setData({ refreshError: message })
        } else {
          this.setData({ homeError: message })
        }
      }
    },

    async loadMilestones() {
      const state = stateOf(this)
      const requestId = ++state.milestoneSeq
      try {
        const milestones = await post<MilestoneStory[]>('/story/milestones')
        if (state.disposed || requestId !== state.milestoneSeq) return
        if (!Array.isArray(milestones)) return
        this.setData({
          storyStat: milestones.length
            ? `已收藏 ${milestones.length} 个瞬间`
            : '还没有里程碑',
        })
      } catch (error) {
        if (state.disposed || requestId !== state.milestoneSeq) return
        // 里程碑只是首页的辅助信息，失败不影响首页主体，也不阻断其它入口。
        this.setData({ storyStat: '里程碑暂时无法读取' })
      }
    },

    onRetryHome() {
      this.loadHomeData({ refresh: this.data.homeLoaded })
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

    /** 编辑空间内容（首页 / 故事 / 相册 / 纪念日等），由统一守卫校验空间访问级别。 */
    onEditSpace() {
      if (!this.data.canEdit) {
        wx.showToast({ title: '当前空间状态暂不支持编辑', icon: 'none' })
        return
      }
      openSpaceStudio()
    },

    /** 空间设置：复用现有页面与参数，不新增路由。 */
    onOpenSettings() {
      openSpaceSetup('settings')
    },

    /** 等待另一半加入时的邀请管理入口：不在这里复制整套邀请逻辑。 */
    onOpenInvite() {
      openSpaceSetup('settings')
    },

    /** 纪念日没有独立浏览页，已有权限时进入编辑页对应栏目。 */
    onOpenAnniversary() {
      if (!this.data.canEdit) {
        wx.showToast({ title: '当前空间状态暂不支持编辑', icon: 'none' })
        return
      }
      navigateWithGuard('/pages/space-studio/index?tab=anniversary')
    },

    /** 预览首页照片：失败项不加入预览列表。 */
    onPreviewPhoto(event: WechatMiniprogram.BaseEvent) {
      const index = Number(event.currentTarget.dataset.index)
      const photos = this.data.homePhotos || []
      const current = photos[index]
      if (!current || !current.url || current.failed) {
        wx.showToast({ title: '这张照片暂时无法预览', icon: 'none' })
        return
      }
      const urls = photos
        .filter(item => Boolean(item.url) && !item.failed)
        .map(item => item.url)
      if (!urls.length) return
      wx.previewImage({ current: current.url, urls })
    },

    onPhotoError(event: WechatMiniprogram.BaseEvent) {
      const index = Number(event.currentTarget.dataset.index)
      const photos = (this.data.homePhotos || []).map((item, current) => (
        current === index ? { ...item, failed: true } : item
      ))
      // 图片加载失败直接回到占位样式，不再切换到示例照片。
      this.setData({ homePhotos: photos })
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
