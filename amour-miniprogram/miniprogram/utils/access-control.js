/**
 * 页面访问控制（路由守卫）。
 *
 * 隐藏 Tab 只能解决“看不见入口”，不能阻止深链、分享、扫码、通知、
 * 页面历史栈恢复等入口。这里把所有入口收敛到同一套检查：
 *
 * 1. `guardPage(status)`：页面 onLoad / attached / onShow 调用，返回是否放行；
 *    不放行时用 reLaunch 重建页面栈，避免用户从返回键回到受限页面。
 * 2. `createPageGuard(options)`：给 `Page()` / `Component()` 页面包一层守卫，
 *    业务页面只声明自己的访问级别，不再各写一份 if / else。
 * 3. `navigateWithGuard(...)` / `switchTabWithGuard(...)`：统一导航入口，
 *    跳转前先查权限，受限时给出创建 / 绑定提示并落到「我的」。
 * 4. `redirectToGuidedProfile()`：受限页的统一落点（带 guide 参数，我的页面据此提示）。
 *
 * 设计约定：
 * - 状态来自 utils/session-state（唯一状态源），本文件不重复请求接口；
 * - loading 状态下不放行受限页面，也不做跳转（等状态确认后由订阅回调再判断），
 *   避免启动瞬间把用户误踢回首页；
 * - 所有跳转都使用 reLaunch，确保受限页面不留在页面栈里。
 */
const {
  SESSION_STATUS,
  PAGE_ACCESS,
  PROFILE_ROUTE,
  PLAZA_ROUTE,
  LOGIN_ROUTE,
  SPACE_SETUP_ROUTE,
  SPACE_REQUIRED_TOAST,
  SESSION_LOG_PREFIX,
} = require('./session-constants')
const {
  resolvePageAccess,
  canAccessPage,
  resolveAccessRedirect,
  normalizeRoute,
} = require('./session-rules')

/** 从当前页面栈顶取路由（不含 query）。 */
function resolveCurrentRoute() {
  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const current = pages && pages.length ? pages[pages.length - 1] : null
    return current && typeof current.route === 'string' ? current.route : ''
  } catch (error) {
    return ''
  }
}

/** 统一跳转：reLaunch 清空页面栈，杜绝返回键回到受限页面。 */
function relaunch(url) {
  try {
    wx.reLaunch({
      url,
      fail() {
        // reLaunch 失败（极端情况）时退化为 switchTab 兜底，仍不保留受限页面。
        wx.switchTab({ url: PLAZA_ROUTE, fail: () => undefined })
      },
    })
  } catch (error) {
    console.warn(`${SESSION_LOG_PREFIX} 跳转失败`, error)
  }
}

/** 轻提示：用现有 toast 机制，不新增弹窗组件。 */
function toast(title) {
  if (!title) return
  try {
    wx.showToast({ title, icon: 'none', duration: 1800 })
  } catch (error) {
    // 提示失败不影响跳转。
  }
}

/**
 * 受限页面拦截：跳转到「我的」并带上引导参数。
 *
 * @param {string} status 当前会话状态
 * @param {{ silent?: boolean }} [options] silent=true 时不弹 toast（首屏自动拦截）
 */
function redirectToGuidedProfile(status, options) {
  const redirect = resolveAccessRedirect(status)
  if (!(options && options.silent)) toast(redirect.notice)
  relaunch(redirect.url)
  return redirect
}

/** 受限页面跳登录页（保留 redirect 参数，登录成功后由调用方决定回到哪里）。 */
function redirectToLogin(redirectPath) {
  const target = normalizeRoute(redirectPath)
  const query = target ? `?redirect=${encodeURIComponent(`/${target}`)}` : ''
  relaunch(`${LOGIN_ROUTE}${query}`)
}

/**
 * 页面访问检查。
 *
 * @param {string} [route] 页面路由；缺省时取当前页面栈顶
 * @param {{ silent?: boolean }} [options]
 * @returns {boolean} 是否放行
 */
function guardPage(route, options) {
  const target = normalizeRoute(route) || resolveCurrentRoute()
  if (!target) return true
  const access = resolvePageAccess(target)
  if (access === PAGE_ACCESS.PUBLIC) return true

  const session = require('./session-state')
  const snapshot = session.getSnapshot()

  // 状态未确认：先不放行也不跳转，由 ensureSessionReady() 完成后重新判断。
  if (snapshot.status === SESSION_STATUS.LOADING) return false

  if (canAccessPage(access, snapshot.status)) return true

  if (access === PAGE_ACCESS.AUTH && snapshot.status === SESSION_STATUS.UNAUTHENTICATED) {
    redirectToLogin(target)
    return false
  }
  redirectToGuidedProfile(snapshot.status, options)
  return false
}

/**
 * 等待状态确认后再做一次页面检查（页面 onLoad 的首选入口）。
 *
 * @param {string} [route]
 * @param {{ silent?: boolean }} [options]
 * @returns {Promise<boolean>}
 */
function guardPageReady(route, options) {
  const session = require('./session-state')
  return session.ensureSessionReady()
    .catch(() => undefined)
    .then(() => guardPage(route, options))
}

/**
 * 导航前权限检查（Tab 点击、页面跳转统一走这里）。
 *
 * @param {string} url 目标地址（可带 query）
 * @param {{ toastText?: string, silent?: boolean }} [options]
 * @returns {boolean} 是否可以导航
 */
function canNavigate(url, options) {
  const route = normalizeRoute(url)
  if (!route) return true
  const access = resolvePageAccess(route)
  if (access === PAGE_ACCESS.PUBLIC) return true

  const session = require('./session-state')
  const snapshot = session.getSnapshot()
  if (canAccessPage(access, snapshot.status)) return true

  // 只在可以提示时弹一次 toast：redirectToGuidedProfile 自身不再重复提示。
  const shouldToast = !(options && options.silent === true)
  if (shouldToast) {
    toast(options && options.toastText ? options.toastText : SPACE_REQUIRED_TOAST)
  }
  redirectToGuidedProfile(snapshot.status, { silent: true })
  return false
}

/** 带守卫的普通跳转：不可达时落到「我的」并展示引导。 */
function navigateWithGuard(url, options) {
  if (!canNavigate(url, options)) return false
  try {
    wx.navigateTo({
      url,
      fail() {
        toast('暂时无法打开这个页面')
      },
    })
  } catch (error) {
    console.warn(`${SESSION_LOG_PREFIX} 跳转失败`, error)
    return false
  }
  return true
}

/** 带守卫的重定向：用于替换当前页面（详情页 → 列表页等）。 */
function redirectWithGuard(url, options) {
  if (!canNavigate(url, options)) return false
  try {
    wx.redirectTo({
      url,
      fail() {
        relaunch(PLAZA_ROUTE)
      },
    })
  } catch (error) {
    console.warn(`${SESSION_LOG_PREFIX} 重定向失败`, error)
    return false
  }
  return true
}

/**
 * 打开情侣空间创建 / 绑定页。
 *
 * 入口统一走这里：先确认登录态，未登录先去登录，登录后回到本页继续创建 / 绑定。
 *
 * @param {'create'|'bind'|''} [action] 进入后默认展开的分区
 * @returns {boolean} 是否已发起跳转
 */
function openSpaceSetup(action) {
  const session = require('./session-state')
  const snapshot = session.getSnapshot()
  if (snapshot.status === SESSION_STATUS.LOADING) {
    toast('正在确认登录状态，请稍候')
    return false
  }
  if (snapshot.status === SESSION_STATUS.UNAUTHENTICATED) {
    redirectToLogin(SPACE_SETUP_ROUTE)
    return true
  }
  const suffix = action === 'create' || action === 'bind' ? `?action=${action}` : ''
  try {
    wx.navigateTo({
      url: `${SPACE_SETUP_ROUTE}${suffix}`,
      fail() {
        relaunch(`${SPACE_SETUP_ROUTE}${suffix}`)
      },
    })
  } catch (error) {
    console.warn(`${SESSION_LOG_PREFIX} 打开情侣空间设置失败`, error)
    return false
  }
  return true
}

/**
 * 全局导航守卫（应用启动时绑定一次）。
 *
 * 页面自身的 onLoad / attached 守卫覆盖了“进入页面”的路径；
 * 这里补上“停留期间状态变化”的路径：
 * - 用户在受限页面时 token 失效 / 被 401 清理；
 * - 用户在受限页面时退出登录；
 * - 从历史栈恢复到受限页面。
 *
 * 一旦全局状态不再允许当前页面，立即 reLaunch 到「我的」，不留残留页面。
 *
 * @returns {() => void} 取消订阅函数
 */
function bindSessionNavigationGuard() {
  const session = require('./session-state')
  if (typeof session.subscribe !== 'function') return () => undefined
  let redirecting = false
  return session.subscribe((snapshot) => {
    if (!snapshot || snapshot.status === SESSION_STATUS.LOADING) return
    if (redirecting) return
    const route = resolveCurrentRoute()
    if (!route) return
    const access = resolvePageAccess(route)
    if (access === PAGE_ACCESS.PUBLIC) return
    if (canAccessPage(access, snapshot.status)) return
    // 避免重入：跳转本身会切换页面栈，期间不再重复跳。
    redirecting = true
    redirectToGuidedProfile(snapshot.status, { silent: false })
    setTimeout(() => {
      redirecting = false
    }, 1000)
  })
}

module.exports = {
  bindSessionNavigationGuard,
  guardPage,
  guardPageReady,
  canNavigate,
  navigateWithGuard,
  redirectWithGuard,
  redirectToGuidedProfile,
  redirectToLogin,
  openSpaceSetup,
  resolveCurrentRoute,
}
