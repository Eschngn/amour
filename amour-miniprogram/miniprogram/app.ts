import { AuthSession, ensureWechatLogin } from './utils/auth'

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
})
