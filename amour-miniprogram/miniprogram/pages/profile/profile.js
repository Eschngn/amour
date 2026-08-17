const {
  ensureWechatLogin,
  getStoredAuth,
  logoutWechat,
} = require('../../utils/auth')

function getInitial(value) {
  const normalized = String(value || '').trim()
  return normalized ? normalized.slice(0, 1).toUpperCase() : 'A'
}

function getErrorMessage(error) {
  return error instanceof Error && error.message
    ? error.message
    : '暂时无法连接登录服务'
}

function getAccountLabel(username) {
  const normalized = String(username || '').trim()
  return normalized && !normalized.startsWith('wx_') ? normalized : '微信用户'
}

Component({
  data: {
    loggedIn: false,
    authenticating: false,
    loggingOut: false,
    loginError: '',
    displayName: 'Amour 用户',
    accountLabel: '微信用户',
    avatar: '',
    avatarError: false,
    initial: 'A',
    authTitle: '尚未登录',
    authNote: '微信授权尚未完成',
    accountState: '尚未登录',
  },

  lifetimes: {
    attached() {
      this.loadStoredProfile()
      this.authenticate(false)
    },
  },

  pageLifetimes: {
    show() {
      this.loadStoredProfile()
    },
  },

  methods: {
    loadStoredProfile() {
      const auth = getStoredAuth()
      const loggedIn = Boolean(auth.token)
      const displayName = auth.displayName || 'Amour 用户'
      this.setData({
        loggedIn,
        displayName,
        accountLabel: getAccountLabel(auth.username),
        avatar: auth.avatar || '',
        avatarError: false,
        initial: getInitial(displayName),
        authTitle: loggedIn ? '微信登录已连接' : '尚未登录',
        authNote: loggedIn ? '登录状态有效' : '微信授权尚未完成',
        accountState: loggedIn ? '微信用户 · 已登录' : '尚未登录',
      })
    },

    async authenticate(force) {
      if (this.data.authenticating || this.data.loggingOut) return
      const hadToken = Boolean(getStoredAuth().token)
      this.setData({
        authenticating: true,
        loginError: '',
        authTitle: hadToken && !force ? '正在确认登录状态' : '正在连接微信',
        authNote: '请稍候',
        accountState: '登录处理中',
      })
      try {
        const authPromise = ensureWechatLogin({ force: Boolean(force) })
        const app = getApp()
        if (app && app.globalData) app.globalData.authReady = authPromise
        const auth = await authPromise
        const displayName = auth.displayName || 'Amour 用户'
        this.setData({
          loggedIn: true,
          authenticating: false,
          loginError: '',
          displayName,
          accountLabel: getAccountLabel(auth.username),
          avatar: auth.avatar || '',
          avatarError: false,
          initial: getInitial(displayName),
          authTitle: '微信登录已连接',
          authNote: '登录状态有效',
          accountState: '微信用户 · 已登录',
        })
        if (app && app.globalData) app.globalData.auth = auth
      } catch (error) {
        const storedAuth = getStoredAuth()
        const loggedIn = Boolean(storedAuth.token)
        this.setData({
          loggedIn,
          authenticating: false,
          loginError: getErrorMessage(error),
          authTitle: loggedIn ? '登录状态待确认' : '登录暂时不可用',
          authNote: loggedIn ? '请重新确认当前登录状态' : '请检查网络后重试',
          accountState: loggedIn ? '等待重新确认' : '尚未登录',
        })
      }
    },

    retryLogin() {
      this.authenticate(true)
    },

    onAvatarError() {
      if (this.data.avatar && !this.data.avatarError) {
        this.setData({ avatarError: true })
      }
    },

    handleAccountAction() {
      if (!this.data.loggedIn || this.data.loginError) this.authenticate(true)
    },

    requestLogout() {
      if (!this.data.loggedIn || this.data.loggingOut) return
      wx.showModal({
        title: '退出登录',
        content: '确定退出当前微信登录状态吗？',
        confirmText: '退出',
        confirmColor: '#b85060',
        success: result => {
          if (result.confirm) this.logout()
        },
      })
    },

    async logout() {
      this.setData({ loggingOut: true })
      try {
        await logoutWechat()
        wx.showToast({ title: '已退出登录', icon: 'success' })
      } catch (error) {
        wx.showToast({ title: '本地登录状态已清除', icon: 'none' })
      }
      const app = getApp()
      if (app && app.globalData) {
        app.globalData.auth = undefined
        app.globalData.authReady = undefined
      }
      this.setData({
        loggedIn: false,
        authenticating: false,
        loggingOut: false,
        loginError: '',
        displayName: 'Amour 用户',
        accountLabel: '微信用户',
        avatar: '',
        avatarError: false,
        initial: 'A',
        authTitle: '尚未登录',
        authNote: '微信授权尚未完成',
        accountState: '尚未登录',
      })
    },
  },
})
