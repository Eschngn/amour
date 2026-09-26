const {
  ensureWechatLogin,
  getStoredAuth,
  updateStoredProfile,
} = require('../../utils/auth')
const { encryptPassword } = require('../../utils/login-crypto')
const { post } = require('../../utils/request')

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

if (false) Component({
  data: {
    loggedIn: false,
    authenticating: false,
    loggingOut: false,
    loginError: '',
    displayName: '恋语间 用户',
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
      this.authenticate(false, true)
    },
  },

  methods: {
    openProfileEditor() {
      if (this.data.authenticating || this.data.loggingOut) return
      if (!this.data.loggedIn || this.data.loginError) {
        wx.showToast({ title: '请先完成微信登录', icon: 'none' })
        this.authenticate(true)
        return
      }
      wx.navigateTo({ url: '../profile-edit/profile-edit' })
    },

    loadStoredProfile() {
      const auth = getStoredAuth()
      const loggedIn = Boolean(auth.token)
      const displayName = auth.displayName || '恋语间 用户'
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

    async authenticate(force, forceValidation = false) {
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
        const authPromise = ensureWechatLogin({
          force: Boolean(force),
          forceValidation: Boolean(forceValidation),
        })
        const app = getApp()
        if (app && app.globalData) app.globalData.authReady = authPromise
        const auth = await authPromise
        const displayName = auth.displayName || '恋语间 用户'
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
        displayName: '恋语间 用户',
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

Component({
  data: {
    loggedIn: false,
    authenticating: false,
    loginError: '',
    username: '',
    displayName: '恋语间 用户',
    avatar: '',
    avatarError: false,
    initial: 'A',
    passwordSet: false,
    passwordModalOpen: false,
    passwordSheetClosing: false,
    passwordSheetOffset: 0,
    passwordSheetTransition: '',
    passwordSaving: false,
    passwordForm: { current: '', next: '', confirm: '' },
  },

  lifetimes: {
    attached() {
      this.applyAuth(getStoredAuth())
    },
  },

  pageLifetimes: {
    show() {
      this.applyAuth(getStoredAuth())
      this.authenticate(false, true)
    },
  },

  methods: {
    applyAuth(auth = {}) {
      const displayName = auth.displayName || '恋语间 用户'
      this.setData({
        loggedIn: Boolean(auth.token),
        username: auth.username || '',
        displayName,
        avatar: auth.avatar || '',
        avatarError: false,
        initial: getInitial(displayName),
        passwordSet: Boolean(auth.passwordSet),
      })
    },

    async authenticate(force, forceValidation = false) {
      if (this.data.authenticating) return
      this.setData({ authenticating: true, loginError: '' })
      try {
        const authPromise = ensureWechatLogin({ force: Boolean(force), forceValidation: Boolean(forceValidation) })
        const app = getApp()
        if (app && app.globalData) app.globalData.authReady = authPromise
        const auth = await authPromise
        this.applyAuth(auth)
        this.setData({ authenticating: false, loginError: '' })
        if (app && app.globalData) app.globalData.auth = auth
      } catch (error) {
        this.applyAuth(getStoredAuth())
        this.setData({ authenticating: false, loginError: getErrorMessage(error) })
      }
    },

    retryLogin() {
      this.authenticate(true)
    },

    openProfileEditor() {
      if (this.data.authenticating) return
      if (!this.data.loggedIn) {
        this.authenticate(true)
        return
      }
      wx.navigateTo({ url: '../profile-edit/profile-edit' })
    },

    onAvatarError() {
      if (this.data.avatar && !this.data.avatarError) this.setData({ avatarError: true })
    },

    openPasswordModal() {
      if (this.data.authenticating || !this.data.loggedIn) return
      if (this.passwordSheetCloseTimer) {
        clearTimeout(this.passwordSheetCloseTimer)
        this.passwordSheetCloseTimer = null
      }
      this.setData({
        passwordModalOpen: true,
        passwordSheetOffset: 0,
        passwordSheetTransition: '',
        passwordForm: { current: '', next: '', confirm: '' },
      })
    },

    closePasswordModal() {
      if (this.data.passwordSaving || this.data.passwordSheetClosing) return
      this.setData({
        passwordSheetClosing: true,
        passwordSheetOffset: 1000,
        passwordSheetTransition: 'transform 220ms ease-in',
      })
      this.passwordSheetCloseTimer = setTimeout(() => {
        this.passwordSheetCloseTimer = null
        this.setData({
          passwordModalOpen: false,
          passwordSheetClosing: false,
          passwordSheetOffset: 0,
          passwordSheetTransition: '',
          passwordForm: { current: '', next: '', confirm: '' },
        })
      }, 230)
    },

    stopPropagation() {},

    onSheetTouchStart(event) {
      if (this.data.passwordSaving || this.data.passwordSheetClosing) return
      const touch = event && event.touches && event.touches[0]
      if (!touch) return
      this.passwordSheetTouchStartY = touch.clientY
      this.setData({ passwordSheetTransition: '' })
    },

    onSheetTouchMove(event) {
      if (this.data.passwordSaving || this.data.passwordSheetClosing || this.passwordSheetTouchStartY === undefined) return
      const touch = event && event.touches && event.touches[0]
      if (!touch) return
      const offset = Math.max(0, Math.min(1000, touch.clientY - this.passwordSheetTouchStartY))
      this.setData({ passwordSheetOffset: offset })
    },

    onSheetTouchEnd() {
      if (this.data.passwordSaving || this.data.passwordSheetClosing) return
      const startY = this.passwordSheetTouchStartY
      this.passwordSheetTouchStartY = undefined
      if (startY === undefined) return
      if (this.data.passwordSheetOffset >= 120) {
        this.closePasswordModal()
        return
      }
      this.setData({
        passwordSheetOffset: 0,
        passwordSheetTransition: 'transform 180ms ease-out',
      })
    },

    onPasswordInput(event) {
      const field = event && event.currentTarget && event.currentTarget.dataset
        ? event.currentTarget.dataset.field
        : ''
      if (field) this.setData({ [`passwordForm.${field}`]: event.detail.value || '' })
    },

    async onPasswordSubmit() {
      if (this.data.passwordSaving) return
      const current = String(this.data.passwordForm.current || '')
      const next = String(this.data.passwordForm.next || '')
      const confirm = String(this.data.passwordForm.confirm || '')
      if (this.data.passwordSet && !current) return wx.showToast({ title: '请输入当前密码', icon: 'none' })
      if (next.length < 6 || next.length > 64) return wx.showToast({ title: '新密码需为 6-64 个字符', icon: 'none' })
      if (next !== confirm) return wx.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
      if (this.data.passwordSet && current === next) return wx.showToast({ title: '新密码不能与当前密码相同', icon: 'none' })

      this.setData({ passwordSaving: true })
      const wasPasswordSet = this.data.passwordSet
      try {
        const tasks = [encryptPassword(next)]
        if (wasPasswordSet) tasks.push(encryptPassword(current))
        const encrypted = await Promise.all(tasks)
        const payload = {
          newChallengeId: encrypted[0].challengeId,
          encryptedNewPassword: encrypted[0].encryptedPassword,
        }
        if (encrypted[1]) {
          payload.currentChallengeId = encrypted[1].challengeId
          payload.encryptedCurrentPassword = encrypted[1].encryptedPassword
        }
        await post('/user/password/change', payload)
        updateStoredProfile({ passwordSet: true })
        this.setData({ passwordSet: true, passwordModalOpen: false, passwordForm: { current: '', next: '', confirm: '' } })
        wx.showToast({ title: wasPasswordSet ? '密码已更新' : '密码已设置', icon: 'success' })
        await this.authenticate(true)
      } catch (error) {
        wx.showToast({ title: getErrorMessage(error), icon: 'none' })
      } finally {
        this.setData({ passwordSaving: false })
      }
    },
  },
})
