const {
  ensureWechatLogin,
  getStoredAuth,
  updateStoredProfile,
} = require('../../utils/auth')
const { encryptPassword } = require('../../utils/login-crypto')
const { post } = require('../../utils/request')
const { withComponentPageViewTracking } = require('../../utils/page-view-lifecycle')
const sessionState = require('../../utils/session-state')
const {
  SESSION_STATUS,
  SPACE_REQUIRED_TOAST,
} = require('../../utils/session-constants')
const { isWaitingForPartner, deriveHasSpace } = require('../../utils/session-rules')
const { openSpaceSetup, openSpaceStudio } = require('../../utils/access-control')

function getInitial(value) {
  const normalized = String(value || '').trim()
  return normalized ? normalized.slice(0, 1).toUpperCase() : 'A'
}

function getErrorMessage(error) {
  return error instanceof Error && error.message
    ? error.message
    : '暂时无法连接登录服务'
}

/** 账号显示名：微信用户不为空的 username 之外统一展示「微信用户」。 */
function getAccountLabel(username) {
  const normalized = String(username || '').trim()
  return normalized && !normalized.startsWith('wx_') ? normalized : '微信用户'
}

/** 空间状态的展示文案（只在已登录但没有可用空间 / 状态异常时使用）。 */
function describeSpaceState(status, snapshot) {
  if (status === SESSION_STATUS.ERROR) {
    return {
      spaceStateTitle: '情侣空间状态暂时无法确认',
      spaceStateNote: snapshot.spaceError || snapshot.authError || '请检查网络后重试',
      spaceStateError: true,
    }
  }
  return {
    spaceStateTitle: '还没有情侣空间',
    spaceStateNote: '创建或绑定后，故事、相册、留言等功能会自动开启',
    spaceStateError: false,
  }
}

/** 空间信息摘要：已存在空间时用于展示名称与状态。 */
function describeSpace(space) {
  if (!deriveHasSpace(space)) return { spaceName: '', spaceSummary: '' }
  const name = String(space.spaceName || '').trim() || '我们的小空间'
  if (isWaitingForPartner(space)) {
    return { spaceName: name, spaceSummary: '等待另一半加入' }
  }
  const count = Number(space.memberCount)
  return {
    spaceName: name,
    spaceSummary: Number.isFinite(count) && count > 0 ? `${count} 位成员` : '空间已就绪',
  }
}

/** 空间状态自动刷新的最小间隔：避免页面反复 show 时重复请求。 */
const SPACE_REFRESH_INTERVAL_MS = 10000

Component(withComponentPageViewTracking({
  data: {
    /* —— 会话状态（唯一来源：utils/session-state） —— */
    sessionStatus: SESSION_STATUS.LOADING,
    statusLoading: true,
    loggedIn: false,
    hasSpace: false,
    spaceName: '',
    spaceSummary: '',
    /** 登录 / 空间状态错误文案：为空表示没有错误 */
    sessionError: '',
    /** 引导区文案 */
    spaceStateTitle: '',
    spaceStateNote: '',
    spaceStateError: false,
    /** 从受限页面被拦截跳转过来时的提示 */
    guideNotice: '',

    /* —— 账号信息 —— */
    authenticating: false,
    loggingIn: false,
    loggingOut: false,
    loginError: '',
    username: '',
    displayName: '恋语间 用户',
    avatar: '',
    avatarError: false,
    initial: 'A',
    passwordSet: false,

    /* —— 密码面板 —— */
    passwordModalOpen: false,
    passwordSheetClosing: false,
    passwordSheetOffset: 0,
    passwordSheetTransition: '',
    passwordSaving: false,
    passwordForm: { current: '', next: '', confirm: '' },
  },

  lifetimes: {
    attached() {
      this.pageDisposed = false
      // 全局状态订阅：登录 / 退出 / 创建 / 绑定 / 401 都会立即反映到「我的」页面。
      this.unsubscribe = sessionState.subscribe(snapshot => this.applySession(snapshot))
      this.lastSpaceRefreshAt = 0
      this.consumeGuideFromOptions()
      sessionState.ensureSessionReady().catch(() => undefined)
    },

    detached() {
      this.pageDisposed = true
      if (typeof this.unsubscribe === 'function') this.unsubscribe()
      this.unsubscribe = undefined
      if (this.passwordSheetCloseTimer) {
        clearTimeout(this.passwordSheetCloseTimer)
        this.passwordSheetCloseTimer = null
      }
    },
  },

  pageLifetimes: {
    show() {
      this.consumeGuideFromOptions()
      this.applyAuth(getStoredAuth())
      const snapshot = sessionState.getSnapshot()
      this.applySession(snapshot)
      // 从后台 / 其它页面回来时轻量刷新一次空间状态：写操作（创建、绑定、解绑）后
      // 全局状态已强制刷新，这里只兜底外部变化，并按间隔去重避免重复请求。
      if (snapshot.status === SESSION_STATUS.LOADING) {
        sessionState.ensureSessionReady().catch(() => undefined)
        return
      }
      const now = Date.now()
      if (now - (this.lastSpaceRefreshAt || 0) < SPACE_REFRESH_INTERVAL_MS) return
      this.lastSpaceRefreshAt = now
      sessionState.refreshSpaceStatus({ reason: 'profile:show' }).catch(() => undefined)
    },
  },

  methods: {
    /* ===================== 状态应用 ===================== */

    /**
     * 把全局状态映射成页面数据。
     *
     * 这里是「我的」页面唯一的判断入口：Tab 之外的引导、登录入口、错误重试
     * 全部由 sessionStatus 推导，不再各写一份 loggedIn / hasSpace 判断。
     */
    applySession(snapshot) {
      if (!snapshot || this.pageDisposed) return
      const status = snapshot.status
      const loading = status === SESSION_STATUS.LOADING
      const auth = snapshot.auth || getStoredAuth()
      const displayName = (auth && auth.displayName) || '恋语间 用户'
      const loggedIn = Boolean(auth && auth.token)
      const spaceLabels = describeSpace(snapshot.space)
      const hasSpace = status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
      const showSpaceGuide = !loading && !hasSpace
      const stateCopy = showSpaceGuide ? describeSpaceState(status, snapshot) : null

      const patch = {
        sessionStatus: status,
        statusLoading: loading,
        loggedIn,
        hasSpace,
        spaceName: spaceLabels.spaceName,
        spaceSummary: spaceLabels.spaceSummary,
        sessionError: status === SESSION_STATUS.ERROR
          ? (snapshot.spaceError || snapshot.authError || '')
          : '',
        username: (auth && auth.username) || '',
        displayName,
        avatar: (auth && auth.avatar) || '',
        avatarError: false,
        initial: getInitial(displayName),
        passwordSet: Boolean(auth && auth.passwordSet),
      }
      if (!loggedIn) {
        // 掉线后关闭未完成的密码面板，避免重新登录时带着旧状态重新弹出。
        patch.passwordModalOpen = false
        patch.passwordSheetClosing = false
        patch.passwordSheetOffset = 0
        patch.passwordSheetTransition = ''
        patch.passwordForm = { current: '', next: '', confirm: '' }
      }
      if (showSpaceGuide) {
        patch.spaceStateTitle = stateCopy.spaceStateTitle
        patch.spaceStateNote = stateCopy.spaceStateNote
        patch.spaceStateError = stateCopy.spaceStateError
      }
      this.setData(patch)
    },

    /** 从页面 query 读取被拦截跳转的提示（guide=login / guide=space）。 */
    consumeGuideFromOptions() {
      let guide = ''
      try {
        const pages = getCurrentPages()
        const current = pages && pages.length ? pages[pages.length - 1] : null
        guide = current && current.options && typeof current.options.guide === 'string'
          ? current.options.guide
          : ''
      } catch (error) {
        guide = ''
      }
      if (!guide || guide === this.lastGuide) return
      this.lastGuide = guide
      const notice = guide === 'login'
        ? '登录后才能访问这个页面'
        : SPACE_REQUIRED_TOAST
      this.setData({ guideNotice: notice })
      wx.showToast({ title: notice, icon: 'none', duration: 1800 })
      // 提示只展示一次：清掉 query，避免返回时重复弹出。
      try {
        const pages = getCurrentPages()
        const current = pages && pages.length ? pages[pages.length - 1] : null
        if (current && current.options) current.options.guide = ''
      } catch (error) {
        // 清理失败不影响功能。
      }
    },

    /* ===================== 登录 ===================== */

    /** 微信登录入口：登录成功后自动查询情侣空间状态并更新 Tab。 */
    async onLogin() {
      if (this.data.loggingIn || this.data.authenticating) return
      this.setData({ loggingIn: true, authenticating: true, loginError: '' })
      try {
        const session = await ensureWechatLogin({ force: true })
        const snapshot = await sessionState.notifyLoginSuccess(session)
        if (this.pageDisposed) return
        this.setData({ loggingIn: false, authenticating: false })
        if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE) {
          wx.showToast({ title: '登录成功，已恢复完整功能', icon: 'success', duration: 1500 })
          return
        }
        if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE) {
          wx.showToast({ title: '登录成功，先创建情侣空间吧', icon: 'none', duration: 1800 })
          return
        }
        // 登录成功但状态确认失败：留在本页展示错误与重试，不假装成功。
        this.setData({ loginError: snapshot.authError || snapshot.spaceError || '登录状态确认失败' })
      } catch (error) {
        if (this.pageDisposed) return
        this.setData({
          loggingIn: false,
          authenticating: false,
          loginError: getErrorMessage(error),
        })
      }
    },

    /** 重试：未登录时重新登录，已登录时重新确认情侣空间状态。 */
    async onRetrySession() {
      if (this.data.authenticating) return
      const snapshot = sessionState.getSnapshot()
      if (snapshot.status === SESSION_STATUS.UNAUTHENTICATED) {
        this.onLogin()
        return
      }
      this.setData({ authenticating: true, loginError: '' })
      try {
        const next = await sessionState.refreshSession({ force: true, reason: 'profile:retry' })
        if (this.pageDisposed) return
        this.setData({ authenticating: false })
        if (next.status === SESSION_STATUS.ERROR) {
          this.setData({ loginError: next.spaceError || next.authError || '情侣空间状态仍未确认' })
        }
      } catch (error) {
        if (this.pageDisposed) return
        this.setData({ authenticating: false, loginError: getErrorMessage(error) })
      }
    },

    /* ===================== 情侣空间入口 ===================== */

    /** 创建情侣空间：统一走 access-control，先过登录态与页面权限检查。 */
    onCreateSpace() {
      if (this.data.authenticating) return
      openSpaceSetup('create')
    },

    /** 绑定 / 加入情侣空间。 */
    onBindSpace() {
      if (this.data.authenticating) return
      openSpaceSetup('bind')
    },

    /** 已有空间时进入情侣空间首页（会先确认当前状态）。 */
    onOpenSpace() {
      if (!this.data.hasSpace) return
      wx.reLaunch({
        url: '/pages/index/index',
        fail: () => wx.showToast({ title: '暂时无法打开情侣空间', icon: 'none' }),
      })
    },

    /**
     * 已有空间时进入「空间设置」。
     *
     * 统一走 access-control 的 openSpaceSetup('settings')：未登录时由它先重定向登录页，
     * 登录后回跳；导航与失败兜底也不在本页重复实现。
     */
    onOpenSpaceSettings() {
      if (this.data.authenticating) return
      openSpaceSetup('settings')
    },

    /** 已有空间时进入内容编辑工作台（首页 / 故事 / 留言 / 相册 / 纪念日）。 */
    onOpenSpaceStudio() {
      if (this.data.authenticating) return
      openSpaceStudio()
    },

    /* ===================== 账号资料 ===================== */

    applyAuth(auth = {}) {
      const displayName = auth.displayName || '恋语间 用户'
      this.setData({
        username: auth.username || '',
        displayName,
        avatar: auth.avatar || '',
        avatarError: false,
        initial: getInitial(displayName),
        passwordSet: Boolean(auth.passwordSet),
      })
    },

    /** 账号摘要点击：已登录进资料编辑，未登录直接发起登录。 */
    onAccountTap() {
      if (this.data.authenticating) return
      if (!this.data.loggedIn) {
        this.onLogin()
        return
      }
      this.openProfileEditor()
    },

    openProfileEditor() {
      if (this.data.authenticating) return
      if (!this.data.loggedIn) {
        this.onLogin()
        return
      }
      wx.navigateTo({ url: '../profile-edit/profile-edit' })
    },

    onAvatarError() {
      if (this.data.avatar && !this.data.avatarError) this.setData({ avatarError: true })
    },

    /* ===================== 退出登录 ===================== */

    requestLogout() {
      if (!this.data.loggedIn || this.data.loggingOut) return
      wx.showModal({
        title: '退出登录',
        content: '退出后将无法查看情侣空间内的内容，确定退出吗？',
        confirmText: '退出',
        confirmColor: '#b85060',
        success: (result) => {
          if (result.confirm) this.logout()
        },
      })
    },

    /**
     * 退出登录：先请求登出接口（失败也继续本地清理），
     * 再通过全局状态源清空登录态与情侣空间缓存，最后 reLaunch 重建页面栈。
     */
    async logout() {
      if (this.data.loggingOut) return
      this.setData({ loggingOut: true })
      try {
        await require('../../utils/auth').logoutWechat()
      } catch (error) {
        // 服务端登出失败不影响本地清理：本地凭证已在 logoutWechat 中清除。
      }
      await sessionState.logoutSession()
      if (this.pageDisposed) return
      this.setData({ loggingOut: false, passwordModalOpen: false })
      wx.showToast({ title: '已退出登录', icon: 'success', duration: 1200 })
      // 重建页面栈：退出后不能通过返回键回到情侣空间相关页面。
      wx.reLaunch({
        url: '/pages/profile/profile',
        fail: () => wx.reLaunch({ url: '/pages/plaza/index' }),
      })
    },

    /* ===================== 密码相关（保持原有行为） ===================== */

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
        await sessionState.refreshSession({ force: true, forceValidation: true, reason: 'profile:password-changed' })
      } catch (error) {
        wx.showToast({ title: getErrorMessage(error), icon: 'none' })
      } finally {
        this.setData({ passwordSaving: false })
      }
    },
  },
}, 'pages/profile/profile'))
