import { reportPageView } from './api/analytics'
import {
  configurePageViewReporting,
  notifyAppHide,
} from './utils/page-view-lifecycle'
import {
  ensureSessionReady,
  getSnapshot,
  refreshSession,
  subscribe,
} from './utils/session-state'
import { bindSessionNavigationGuard } from './utils/access-control'
import type { SessionSnapshot } from './utils/session-state'

/**
 * 页面浏览统计上报：静默失败，不阻塞页面、不打扰用户。
 * 渠道由采集器固定上报为 miniprogram（见 utils/page-view-tracker）。
 */
configurePageViewReporting((payload) => {
  reportPageView(payload).catch(() => undefined)
})

/**
 * 应用启动流程（与 utils/session-state 配合）：
 * 1. 恢复本地登录凭证；
 * 2. 获取 / 校验当前用户信息；
 * 3. 查询情侣空间状态（POST /space/status）；
 * 4. 状态确认前全局状态保持 loading，页面按 loading 渲染骨架，
 *    不会出现「先展示完整 Tab 再收回」的闪烁。
 *
 * 这里只触发一次启动确认，不做页面跳转：入口页通过 ensureSessionReady() 等待结果，
 * 受限页面由 utils/access-control 的页面守卫统一处理。
 */
App<IAppOption>({
  globalData: {
    /** 启动期间的登录态确认 Promise（兼容旧页面读取 authReady 的写法）。 */
    authReady: undefined,
    auth: undefined,
    /** 当前会话状态快照，仅供调试与兜底读取；页面应订阅 session-state。 */
    session: undefined,
    /** 取消订阅句柄 */
    sessionUnsubscribe: undefined,
  },

  onLaunch() {
    // 全局导航守卫：状态在停留期间变为不可访问时（退出登录 / token 失效 / 历史栈恢复），
    // 立即把当前受限页面赶回「我的」，避免通过返回键继续浏览受限内容。
    bindSessionNavigationGuard()
    const ready = ensureSessionReady()
    this.globalData.authReady = ready.then(snapshot => snapshot.auth || undefined)
    this.globalData.sessionUnsubscribe = subscribe((snapshot: SessionSnapshot) => {
      this.globalData.session = snapshot
      this.globalData.auth = snapshot.auth || undefined
    })
    ready.catch((error) => {
      console.warn('登录态初始化失败', error)
    })
  },

  onShow() {
    // 从后台切回前台时不做隐式刷新：Tab 与页面权限由已有状态决定，
    // 需要更新的场景（创建 / 绑定成功、退出登录）都会显式调用 refreshSession / refreshAfterSpaceChange。
  },

  onHide() {
    // 进入后台：从小程序切回前台后的 onShow 不算新的页面浏览。
    notifyAppHide()
  },

  onError(error: string) {
    const snapshot = getSnapshot()
    // 沿用项目现有的 console 记录方式，附带当前会话状态便于排查。
    console.error('[session] 运行时错误', { status: snapshot.status, error })
  },

  /** 供页面显式触发一次带登录校验的刷新（例如从后台恢复后需要重新确认）。 */
  refreshSession(force?: boolean) {
    return refreshSession({ force: Boolean(force), reason: 'app:refresh' })
  },
})
