/**
 * 登录页。
 *
 * 只负责一件事：引导用户完成微信登录，然后按情侣空间状态决定去向：
 * - 登录成功且已有情侣空间 → 回到来源页（或情侣空间首页）；
 * - 登录成功但没有情侣空间 → 回「我的」，展示创建 / 绑定引导；
 * - 登录失败 → 留在本页，展示错误与重试。
 *
 * 所有状态判断都来自 utils/session-state，不在页面里重复实现。
 * 该页面是公开页面（未登录可达），因此不参与情侣空间权限拦截。
 */
const {
  ensureSessionReady,
  getSnapshot,
  loginSession,
  refreshSession,
} = require('../../utils/session-state')
const { SESSION_STATUS, PROFILE_ROUTE, SPACE_HOME_ROUTE, PLAZA_ROUTE } = require('../../utils/session-constants')
const { normalizeRoute } = require('../../utils/session-rules')

const MAX_REDIRECT_LENGTH = 256

/** 读取 redirect 参数：只接受站内绝对路径，避免被外部参数带飞。 */
function readRedirect(query) {
  const raw = query && typeof query.redirect === 'string' ? query.redirect : ''
  if (!raw) return ''
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch (error) {
    decoded = raw
  }
  decoded = decoded.trim()
  if (decoded.length > MAX_REDIRECT_LENGTH) return ''
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return ''
  // 登录页自身与后台入口不允许作为回跳目标。
  if (/^\/(pages\/login\/login|admin)/.test(decoded)) return ''
  return decoded
}

/** 登录成功后的落点：优先回到来源页，其次按是否有情侣空间决定。 */
function resolveDestination(snapshot, redirect) {
  if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE) {
    return redirect || SPACE_HOME_ROUTE
  }
  return redirect || PROFILE_ROUTE
}

Page({
  data: {
    loading: true,
    authenticating: false,
    errorMessage: '',
    /** 未登录时展示微信登录按钮；已登录则自动跳转 */
    canLogin: true,
    redirect: '',
  },

  onLoad(query) {
    this.pageDisposed = false
    const redirect = readRedirect(query)
    this.setData({ redirect })
    this.restore()
  },

  onUnload() {
    this.pageDisposed = true
  },

  /** 恢复已有登录态：已登录直接跳走，未登录展示登录入口。 */
  async restore() {
    this.setData({ loading: true, errorMessage: '' })
    try {
      const snapshot = await ensureSessionReady()
      if (this.pageDisposed) return
      this.applySnapshot(snapshot)
      if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
        || snapshot.status === SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE) {
        this.leave(resolveDestination(snapshot, this.data.redirect))
        return
      }
      this.setData({ loading: false, canLogin: true })
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        loading: false,
        canLogin: true,
        errorMessage: getErrorMessage(error, '登录状态确认失败，请重试'),
      })
    }
  },

  applySnapshot(snapshot) {
    if (!snapshot) return
    if (snapshot.status === SESSION_STATUS.UNAUTHENTICATED) {
      this.setData({ errorMessage: snapshot.authError || '' })
    }
  },

  /** 用户点击登录：强制走一次微信登录，随后刷新情侣空间状态。 */
  async onLogin() {
    if (this.data.authenticating) return
    this.setData({ authenticating: true, errorMessage: '' })
    try {
      const snapshot = await loginSession()
      if (this.pageDisposed) return
      if (snapshot.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
        || snapshot.status === SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE) {
        wx.showToast({ title: '登录成功', icon: 'success', duration: 1200 })
        this.leave(resolveDestination(snapshot, this.data.redirect))
        return
      }
      if (snapshot.status === SESSION_STATUS.ERROR) {
        this.setData({
          authenticating: false,
          errorMessage: snapshot.authError || snapshot.spaceError || '登录状态确认失败，请重试',
        })
        return
      }
      this.setData({
        authenticating: false,
        errorMessage: snapshot.authError || '登录没有完成，请重试',
      })
    } catch (error) {
      if (this.pageDisposed) return
      this.setData({
        authenticating: false,
        errorMessage: getErrorMessage(error, '登录失败，请稍后重试'),
      })
    }
  },

  /** 重试：已登录时重新确认空间状态，未登录时重新尝试登录。 */
  async onRetry() {
    const snapshot = getSnapshot()
    if (snapshot.status === SESSION_STATUS.UNAUTHENTICATED) {
      this.onLogin()
      return
    }
    this.setData({ authenticating: true, errorMessage: '' })
    const next = await refreshSession({ force: true, reason: 'login-page:retry' }).catch(() => getSnapshot())
    if (this.pageDisposed) return
    if (next.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
      || next.status === SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE) {
      this.leave(resolveDestination(next, this.data.redirect))
      return
    }
    this.setData({
      authenticating: false,
      errorMessage: next.authError || '登录状态仍未确认，请稍后再试',
    })
  },

  /** 放弃登录：回到公开的恋爱广场，不保留受限页面。 */
  onSkip() {
    this.leave(PLAZA_ROUTE)
  },

  leave(url) {
    const target = normalizeRoute(url) ? url : PLAZA_ROUTE
    wx.reLaunch({
      url: target,
      fail: () => wx.reLaunch({ url: PLAZA_ROUTE }),
    })
  },
})

function getErrorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.trim()) return error.message.trim()
  return fallback
}
