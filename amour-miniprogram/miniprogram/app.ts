import { AuthSession, ensureWechatLogin } from './utils/auth'
import { reportPageView } from './api/analytics'
import {
  configurePageViewReporting,
  notifyAppHide,
} from './utils/page-view-lifecycle'

/**
 * 页面浏览统计上报：静默失败，不阻塞页面、不打扰用户。
 * 渠道由采集器固定上报为 miniprogram（见 utils/page-view-tracker）。
 */
configurePageViewReporting((payload) => {
  reportPageView(payload).catch(() => undefined)
})

App<IAppOption>({
  globalData: {},

  onLaunch() {
    const authReady = ensureWechatLogin()
    this.globalData.authReady = authReady
    authReady.then((auth: AuthSession) => {
      this.globalData.auth = auth
    }).catch(error => {
      console.warn('微信登录初始化失败', error)
    })
  },

  onHide() {
    // 进入后台：从小程序切回前台后的 onShow 不算新的页面浏览。
    notifyAppHide()
  },
})
