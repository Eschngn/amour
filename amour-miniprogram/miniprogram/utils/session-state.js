/**
 * 全局登录态 / 情侣空间状态源（唯一状态来源）。
 *
 * 目标：整个小程序只维护一份状态，页面只订阅、不各自请求、不各自判断。
 *
 * 状态与流转：
 *   loading
 *     └─ 恢复本地凭证 → 校验登录 → 查询 /space/status
 *           ├─ 无登录态 / 微信登录失败且本地无凭证 → unauthenticated
 *           ├─ 有登录态 & 空间接口 data=null        → authenticated_without_space
 *           ├─ 有登录态 & 空间接口有 spaceId        → authenticated_with_space
 *           └─ 空间接口失败 / 登录态校验异常         → error（安全降级）
 *
 * 约束：
 * 1. 情侣空间状态只通过后端 POST /space/status 判断，不做任何本地猜测；
 * 2. 所有异步结果都带请求序号，过期响应不得覆盖新状态（防竞态）；
 * 3. 同一类查询默认复用 in-flight Promise，避免重复请求；
 * 4. 状态变化立即同步到订阅者（bottom-nav / 我的）与 app.globalData；
 * 5. 退出登录后记录“用户主动退出”，不再自动静默登录，直到用户显式点击登录；
 * 6. 登录 / 退出 / 创建 / 绑定这类写操作期间，屏蔽请求层 401 触发的状态收敛，
 *    由操作本身决定最终状态，避免中途闪回。
 */
const auth = require('./auth')
const { fetchSpaceStatus } = require('./space-api')
const {
  SESSION_STATUS,
  SESSION_LOG_PREFIX,
  SPACE_STATUS_ERROR_MESSAGE,
  LOGGED_OUT_KEY,
} = require('./session-constants')
const {
  deriveSessionStatus,
  deriveHasSpace,
  isLoggedInStatus,
} = require('./session-rules')

/** 当前状态快照。只允许通过本模块内部方法修改。 */
const state = {
  status: SESSION_STATUS.LOADING,
  auth: null,
  space: null,
  spaceError: '',
  authError: '',
  /** 是否已经完成过至少一次确认（用于区分“还没开始”与“确认过是无空间”）。 */
  confirmed: false,
  /** 用户主动退出登录标记：为 true 时不做静默微信登录。 */
  loggedOut: false,
}

/** 订阅者集合。 */
const listeners = new Set()

/** 请求序号：每次发起新的状态查询都会自增，旧响应据此丢弃。 */
let requestSequence = 0
/** 正在进行的启动 / 刷新 Promise。 */
let bootstrapPromise = null
/** 正在进行的空间状态查询。 */
let spaceInflight = null
/** 正在进行的写操作数量（登录 / 退出 / 创建 / 绑定）。>0 时屏蔽自动状态收敛。 */
let operationDepth = 0

function logSwitch(reason, nextStatus) {
  // 沿用项目现有的 console 记录方式，统一前缀便于排查状态切换。
  console.info(`${SESSION_LOG_PREFIX} ${reason} -> ${nextStatus}`)
}

function readLoggedOutFlag() {
  try {
    return wx.getStorageSync(LOGGED_OUT_KEY) === true
  } catch (error) {
    return false
  }
}

function writeLoggedOutFlag(value) {
  try {
    if (value) wx.setStorageSync(LOGGED_OUT_KEY, true)
    else wx.removeStorageSync(LOGGED_OUT_KEY)
  } catch (error) {
    // 缓存不可用时只影响“是否需要用户手动登录”，不影响状态正确性。
  }
}

/** 进入写操作区：期间请求层的登录态清理事件不直接改写全局状态。 */
function beginOperation() {
  operationDepth += 1
}

function endOperation() {
  operationDepth = Math.max(0, operationDepth - 1)
}

/** 对外快照：调用方拿到的是副本，避免外部直接改状态。 */
function getSnapshot() {
  return {
    status: state.status,
    auth: state.auth,
    space: state.space,
    spaceError: state.spaceError,
    authError: state.authError,
    confirmed: state.confirmed,
    loggedOut: state.loggedOut,
    loggedIn: isLoggedInStatus(state.status),
    hasSpace: state.status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE,
    loading: state.status === SESSION_STATUS.LOADING,
    token: state.auth && state.auth.token ? state.auth.token : '',
  }
}

function notify() {
  const snapshot = getSnapshot()
  listeners.forEach((listener) => {
    try {
      listener(snapshot)
    } catch (error) {
      console.warn(`${SESSION_LOG_PREFIX} 订阅者回调异常`, error)
    }
  })
  syncAppGlobalData(snapshot)
}

/** 同步 app.globalData，保持旧页面（auth / authReady）的行为不变。 */
function syncAppGlobalData(snapshot) {
  const app = typeof getApp === 'function' ? getApp() : null
  if (!app || !app.globalData) return
  app.globalData.session = snapshot
  if (snapshot.token) app.globalData.auth = snapshot.auth || undefined
  else app.globalData.auth = undefined
}

/**
 * 更新状态：只有真正变化时才通知，避免订阅者重复渲染。
 *
 * @param {Partial<typeof state>} patch
 * @param {string} reason 状态切换原因（日志用）
 */
function applyState(patch, reason) {
  const nextStatus = patch.status === undefined ? state.status : patch.status
  const statusChanged = nextStatus !== state.status
  if (statusChanged) logSwitch(reason, nextStatus)
  state.status = nextStatus
  if (patch.auth !== undefined) state.auth = patch.auth
  if (patch.space !== undefined) state.space = patch.space
  if (patch.spaceError !== undefined) state.spaceError = patch.spaceError
  if (patch.authError !== undefined) state.authError = patch.authError
  if (patch.confirmed !== undefined) state.confirmed = patch.confirmed
  if (patch.loggedOut !== undefined) state.loggedOut = patch.loggedOut
  notify()
}

function subscribe(listener) {
  if (typeof listener !== 'function') return () => undefined
  listeners.add(listener)
  try {
    listener(getSnapshot())
  } catch (error) {
    console.warn(`${SESSION_LOG_PREFIX} 订阅者回调异常`, error)
  }
  return () => listeners.delete(listener)
}

function isUnauthorized(error) {
  return Boolean(error) && (error.statusCode === 401 || error.errorCode === '20002')
}

function readErrorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.trim()) return error.message.trim()
  return fallback
}

function textOrDefault(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

/** 当前是否存在有效 token（直接读缓存，避免依赖内存状态时序）。 */
function readStoredToken() {
  try {
    const stored = auth.getStoredAuth()
    return stored && typeof stored.token === 'string' ? stored.token.trim() : ''
  } catch (error) {
    return ''
  }
}

/** 状态收敛为未登录（不涉及写操作副作用）。 */
function applyUnauthenticated(reason, authError) {
  applyState({
    status: SESSION_STATUS.UNAUTHENTICATED,
    auth: null,
    space: null,
    spaceError: '',
    authError: authError || '',
    confirmed: true,
  }, reason)
}

/**
 * 查询情侣空间状态并据此更新全局状态。
 *
 * @param {{ force?: boolean, reason?: string }} [options]
 *        force=true 时丢弃在途请求并强制发新请求（创建 / 绑定 / 退出后必须使用）
 * @returns {Promise<object|null>} 最新空间数据（null 表示没有空间）
 */
function refreshSpaceStatus(options) {
  const source = options || {}
  const force = source.force === true
  const reason = textOrDefault(source.reason, 'refreshSpaceStatus')

  const token = state.auth && state.auth.token ? state.auth.token : readStoredToken()
  if (!token) {
    // 未登录不请求空间接口，直接回到未登录状态。
    applyUnauthenticated(`${reason}:no-token`)
    return Promise.resolve(null)
  }

  if (spaceInflight && !force) return spaceInflight
  if (force) requestSequence += 1

  const requestId = ++requestSequence
  spaceInflight = fetchSpaceStatus()
    .then((space) => {
      // 过期响应：状态可能已经被后续操作改写，绝不能覆盖。
      if (requestId !== requestSequence) return state.space
      const nextSpace = deriveHasSpace(space) ? space : null
      applyState({
        status: deriveSessionStatus({ token, space: nextSpace }),
        space: nextSpace,
        spaceError: '',
        authError: '',
        confirmed: true,
      }, `${reason}:ok`)
      return nextSpace
    })
    .catch((error) => {
      if (requestId !== requestSequence) return state.space
      if (isUnauthorized(error)) {
        // 登录态失效：清理并回到未登录。
        handleAuthCleared(`${reason}:unauthorized`)
        return null
      }
      // 网络 / 服务异常：安全降级为 error，不展示依赖情侣空间的 Tab。
      applyState({
        status: SESSION_STATUS.ERROR,
        // 保留上次确认过的空间数据仅用于展示，鉴权仍按 error 状态处理。
        spaceError: readErrorMessage(error, SPACE_STATUS_ERROR_MESSAGE),
        confirmed: true,
      }, `${reason}:error`)
      return state.space
    })
    .then((space) => {
      if (requestId === requestSequence) spaceInflight = null
      return space
    }, (error) => {
      spaceInflight = null
      throw error
    })

  return spaceInflight || Promise.resolve(state.space)
}

/**
 * 恢复登录态并确认情侣空间状态（应用启动、登录成功后调用）。
 *
 * @param {{ force?: boolean, forceValidation?: boolean, reason?: string }} [options]
 * @returns {Promise<ReturnType<typeof getSnapshot>>}
 */
function refreshSession(options) {
  const source = options || {}
  const force = source.force === true
  const forceValidation = source.forceValidation === true
  const reason = textOrDefault(source.reason, 'refreshSession')

  if (bootstrapPromise && !force) return bootstrapPromise

  const token = readStoredToken()
  const loggedOut = state.loggedOut || readLoggedOutFlag()

  // 用户主动退出后不静默登录：只有显式登录入口才会清除该标记。
  if (!token && loggedOut) {
    applyUnauthenticated(`${reason}:logged-out`)
    return Promise.resolve(getSnapshot())
  }

  if (!force) {
    applyState({ status: SESSION_STATUS.LOADING, spaceError: '', authError: '' }, `${reason}:start`)
  }

  beginOperation()
  bootstrapPromise = auth.ensureWechatLogin({
    force: force && !token,
    forceValidation,
  })
    .then((session) => {
      const nextAuth = session && typeof session === 'object' ? session : null
      if (!nextAuth || !nextAuth.token) {
        applyUnauthenticated(`${reason}:no-session`)
        return getSnapshot()
      }
      writeLoggedOutFlag(false)
      applyState({
        auth: nextAuth,
        authError: '',
        loggedOut: false,
      }, `${reason}:auth-ok`)
      // 登录确认后必须重新查询空间状态（force：之前的在途请求结果已过期）。
      return refreshSpaceStatus({ force: true, reason: `${reason}:space` })
        .catch(() => state.space)
        .then(() => getSnapshot())
    })
    .catch((error) => {
      const hasStoredToken = Boolean(readStoredToken())
      if (hasStoredToken) {
        // 有本地凭证但暂时无法确认（网络 / 服务异常）：安全降级为 error，提供重试。
        const message = readErrorMessage(error, '登录状态确认失败，请稍后重试')
        applyState({
          status: SESSION_STATUS.ERROR,
          authError: message,
          spaceError: message,
          confirmed: true,
        }, `${reason}:auth-error`)
      } else {
        // 没有凭证且登录失败：按未登录处理（仍可浏览恋爱广场）。
        applyUnauthenticated(
          `${reason}:login-failed`,
          readErrorMessage(error, '登录暂时不可用，请稍后重试'),
        )
      }
      return getSnapshot()
    })
    .then((snapshot) => {
      endOperation()
      bootstrapPromise = null
      return snapshot
    })

  return bootstrapPromise
}

/** 等待状态确认（供页面在 onLoad / attached 中 await）。 */
function ensureSessionReady() {
  if (state.confirmed && state.status !== SESSION_STATUS.LOADING) return Promise.resolve(getSnapshot())
  if (bootstrapPromise) return bootstrapPromise
  return refreshSession({ reason: 'ensureSessionReady' })
}

/**
 * 显式登录（我的页面点击登录时调用）。
 *
 * 与 refreshSession 的区别：强制重新走一次微信登录，登录成功后立即查询空间状态。
 *
 * @returns {Promise<ReturnType<typeof getSnapshot>>}
 */
function loginSession() {
  if (bootstrapPromise) return bootstrapPromise
  // 显式登录必须先解除“用户主动退出”标记，否则 refreshSession 会直接判定未登录。
  writeLoggedOutFlag(false)
  applyState({
    status: SESSION_STATUS.LOADING,
    spaceError: '',
    authError: '',
    confirmed: false,
    loggedOut: false,
  }, 'login:start')
  return refreshSession({ force: true, reason: 'login' })
}

/**
 * 登录成功后的统一入口：写入会话并重新确认情侣空间状态。
 *
 * @param {object} session auth.ensureWechatLogin 的返回值
 * @returns {Promise<ReturnType<typeof getSnapshot>>}
 */
function notifyLoginSuccess(session) {
  const nextAuth = session && typeof session === 'object' ? session : null
  if (!nextAuth || !nextAuth.token) {
    applyUnauthenticated('login-success:no-token')
    return Promise.resolve(getSnapshot())
  }
  beginOperation()
  writeLoggedOutFlag(false)
  applyState({
    auth: nextAuth,
    authError: '',
    spaceError: '',
    loggedOut: false,
    confirmed: false,
  }, 'login-success')
  return refreshSpaceStatus({ force: true, reason: 'login-success' })
    .catch(() => state.space)
    .then(() => {
      endOperation()
      return getSnapshot()
    })
}

/**
 * 退出登录：清理登录态、情侣空间缓存与全局状态，并立即切换为最小 Tab。
 *
 * 页面栈由调用方（我的页面）通过 reLaunch 重建，避免返回键回到受限页面。
 */
function logoutSession() {
  beginOperation()
  // 先清本地凭证（含 permissions / 用户资料），再收敛全局状态，
  // 保证退出后任何页面都读不到旧 token。
  try {
    auth.clearAuth()
  } catch (error) {
    console.warn(`${SESSION_LOG_PREFIX} 清理登录缓存失败`, error)
  }
  applyUnauthenticated('logout')
  writeLoggedOutFlag(true)
  state.loggedOut = true
  requestSequence += 1
  spaceInflight = null
  bootstrapPromise = null
  clearSessionCache()
  endOperation()
  return Promise.resolve(getSnapshot())
}

/** 清理与情侣空间相关的本地缓存与页面数据。 */
function clearSessionCache() {
  try {
    // 相册详情依赖的缓存数据在退出后不应继续可读。
    wx.removeStorageSync('photoDetailCollection')
  } catch (error) {
    // 缓存清理失败不影响状态切换。
  }
}

/**
 * 创建 / 绑定成功后刷新状态（必须 force：写操作之前发出的旧请求结果无效）。
 *
 * 注意返回类型：refreshSpaceStatus 返回的是空间对象（SpaceStatusVO 或 null），
 * 本函数统一收敛为「会话快照」，调用方可以直接用 SESSION_STATUS 判断，
 * 不会再出现“把空间对象当会话快照、status 数字与字符串永远不相等”的问题。
 *
 * 与 refreshSpaceStatus 一致：网络 / 服务异常不会 reject，而是把全局状态
 * 安全降级为 error，调用方需要自行判断快照状态并给出重试入口。
 *
 * @param {string} [reason] 状态切换原因（日志用）
 * @returns {Promise<ReturnType<typeof getSnapshot>>} 刷新后的会话快照
 */
function refreshAfterSpaceChange(reason) {
  const label = textOrDefault(reason, 'space-changed')
  return refreshSpaceStatus({ force: true, reason: label }).then(() => getSnapshot())
}

/**
 * 登录态被请求层清理（401 / 20002）时由 auth 模块回调。
 *
 * 只做状态收敛，不重复发请求、不打印敏感信息。
 */
function handleAuthCleared(reason) {
  // 登录 / 刷新 / 退出进行中：由操作本身决定最终状态，避免中途闪回「未登录」。
  if (operationDepth > 0) return
  if (!state.auth && state.status === SESSION_STATUS.UNAUTHENTICATED) return
  requestSequence += 1
  spaceInflight = null
  bootstrapPromise = null
  applyUnauthenticated(textOrDefault(reason, 'auth-cleared'))
}

/** 绑定 auth 模块的清理事件：token 失效时全局状态立即收敛为未登录。 */
function bindAuthListener() {
  if (typeof auth.onAuthCleared !== 'function') return
  auth.onAuthCleared(() => handleAuthCleared('request:unauthorized'))
}

/** 仅供测试：重置模块内部状态。 */
function resetForTests() {
  state.status = SESSION_STATUS.LOADING
  state.auth = null
  state.space = null
  state.spaceError = ''
  state.authError = ''
  state.confirmed = false
  state.loggedOut = false
  requestSequence = 0
  bootstrapPromise = null
  spaceInflight = null
  operationDepth = 0
  listeners.clear()
}

bindAuthListener()

module.exports = {
  SESSION_STATUS,
  getSnapshot,
  subscribe,
  ensureSessionReady,
  refreshSession,
  loginSession,
  refreshSpaceStatus,
  refreshAfterSpaceChange,
  notifyLoginSuccess,
  logoutSession,
  handleAuthCleared,
  clearSessionCache,
  resetForTests,
}
