import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 全局会话状态机测试（utils/session-state）。
 *
 * 用最小的小程序运行时桩加载真实模块，校验需求中的关键流程：
 * - 应用启动：恢复凭证 → 校验登录 → 查询 /space/status，状态确认前保持 loading；
 * - 登录成功但接口返回无情侣空间 → 仍只展示两个 Tab；
 * - 已登录且存在情侣空间 → 完整 Tab；
 * - 创建 / 绑定成功后强制刷新并恢复完整 Tab；
 * - 退出登录立即回到两个 Tab，并清理缓存；
 * - 401 / 20002 → 回到未登录；
 * - 空间接口失败 → error 安全降级，可重试；
 * - 旧请求晚于新请求返回时不会覆盖新状态。
 */

const storage = new Map()
const requests = []
/** 每个接口的响应实现：path -> (options, index) => void */
const handlers = new Map()
let requestIndex = 0

/** 把完整请求地址归一化为接口路径（去掉域名与 /api 前缀）。 */
function normalizePath(url) {
  const withoutOrigin = String(url || '').replace(/^https?:\/\/[^/]+/, '')
  return withoutOrigin.replace(/^\/api/, '')
}

function installWx() {
  globalThis.wx = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
    getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: key => storage.delete(key),
    request(options) {
      const path = normalizePath(options.url)
      requests.push({ path, data: options.data })
      requestIndex += 1
      const handler = handlers.get(path)
      if (!handler) {
        // 未注册的请求：默认成功返回空数据，避免测试挂起。
        options.success({ statusCode: 200, data: { success: true, data: null } })
        return
      }
      handler(options, requestIndex)
    },
    login(options) {
      // 固定返回登录凭证，配合 /login/wechat 的桩响应。
      if (options && options.success) options.success({ code: 'mock-wechat-code' })
    },
    showToast() {},
    reLaunch() {},
  }
}

installWx()

const auth = await import('../miniprogram/utils/auth.js')
const sessionState = await import('../miniprogram/utils/session-state.js')
const { SESSION_STATUS } = await import('../miniprogram/utils/session-constants.js')
const { resolveVisibleTabIds } = await import('../miniprogram/utils/session-rules.js')

const TOKEN_KEY = 'amour_token'
const LOGGED_OUT_KEY = 'amour_logged_out'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const flushAll = async () => {
  for (let i = 0; i < 6; i += 1) await flush()
}

function ok(data) {
  return { statusCode: 200, data: { success: true, data } }
}

function fail401() {
  return { statusCode: 401, data: { success: false, errorCode: '20002', message: '无访问权限，请先登录！' } }
}

function fail500() {
  return { statusCode: 500, data: { success: false, message: '服务异常' } }
}

/** 注册接口响应。 */
function route(path, handler) {
  handlers.set(path, handler)
}

/** 常用组合：微信登录成功 + 空间状态。 */
function setupLogin({ space = null, spaceFailure = null } = {}) {
  route('/login/wechat', options => options.success(ok({
    token: 'token-new',
    username: 'wx_user',
    displayName: '测试用户',
    avatar: '',
    passwordSet: false,
    permissions: ['frontend:story:query'],
  })))
  route('/user/profile', options => options.success(ok({
    username: 'wx_user',
    displayName: '测试用户',
    avatar: '',
    passwordSet: false,
    permissions: ['frontend:story:query'],
  })))
  route('/space/status', (options) => {
    if (spaceFailure) {
      spaceFailure(options)
      return
    }
    options.success(ok(space))
  })
}

test.beforeEach(() => {
  storage.clear()
  requests.length = 0
  handlers.clear()
  requestIndex = 0
  sessionState.resetForTests()
  installWx()
})

// ============================ 启动恢复 ============================

test('启动：无本地凭证时回到未登录，且不请求 /space/status', async () => {
  // 未登录且用户没有主动退出：项目原有行为是静默走一次微信登录；
  // 这里让微信登录失败，模拟“拿不到会话”的冷启动，最终应判定为未登录。
  route('/login/wechat', options => options.success({
    statusCode: 500,
    data: { success: false, message: '登录服务不可用' },
  }))
  const snapshot = await sessionState.ensureSessionReady()

  assert.equal(snapshot.status, SESSION_STATUS.UNAUTHENTICATED)
  assert.deepEqual(resolveVisibleTabIds(snapshot.status), ['plaza', 'profile'])
  // 未登录不应发起空间查询。
  assert.equal(requests.filter(item => item.path === '/space/status').length, 0)
})

test('启动：已有凭证且接口返回 data=null → 已登录但没有情侣空间', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ space: null })
  const snapshot = await sessionState.ensureSessionReady()

  assert.equal(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assert.deepEqual(resolveVisibleTabIds(snapshot.status), ['plaza', 'profile'])
  assert.equal(snapshot.hasSpace, false)
  assert.equal(requests.filter(item => item.path === '/space/status').length, 1)
})

test('启动：已有凭证且接口返回空间 → 完整 Tab', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ space: { spaceId: 7, status: 1, spaceName: '我们的小屋', memberCount: 2 } })
  const snapshot = await sessionState.ensureSessionReady()

  assert.equal(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)
  assert.deepEqual(
    resolveVisibleTabIds(snapshot.status),
    ['plaza', 'story', 'photo', 'home', 'message', 'profile'],
  )
  assert.equal(snapshot.hasSpace, true)
})

test('启动期间状态保持 loading，不会提前给出完整 Tab', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  let releaseSpace = null
  setupLogin({ space: null })
  route('/space/status', (options) => {
    releaseSpace = () => options.success(ok({ spaceId: 9, status: 1 }))
  })

  const ready = sessionState.ensureSessionReady()
  await flushAll()

  // 状态确认前：loading，可见 Tab 只有两个。
  const pending = sessionState.getSnapshot()
  assert.equal(pending.status, SESSION_STATUS.LOADING)
  assert.deepEqual(resolveVisibleTabIds(pending.status), ['plaza', 'profile'])

  releaseSpace()
  await ready
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)
})

test('订阅者会立即收到当前状态，并在状态变化时再次通知', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ space: null })
  const seen = []
  const unsubscribe = sessionState.subscribe(snapshot => seen.push(snapshot.status))

  // 订阅时立即回调一次（loading）。
  assert.deepEqual(seen, [SESSION_STATUS.LOADING])

  await sessionState.ensureSessionReady()
  assert.equal(seen[seen.length - 1], SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)

  unsubscribe()
  const count = seen.length
  await sessionState.handleAuthCleared('test')
  assert.equal(seen.length, count, '退订后不应再收到通知')
})

// ============================ 登录成功但无空间 ============================

test('登录成功但接口返回无情侣空间：仍只展示两个 Tab，并记录未退出', async () => {
  setupLogin({ space: null })
  const session = await auth.ensureWechatLogin({ force: true })
  const snapshot = await sessionState.notifyLoginSuccess(session)

  assert.equal(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assert.deepEqual(resolveVisibleTabIds(snapshot.status), ['plaza', 'profile'])
  assert.equal(storage.get(LOGGED_OUT_KEY) === true, false)
})

test('登录成功且已有情侣空间：恢复完整 Tab', async () => {
  setupLogin({ space: { spaceId: 3, status: 1 } })
  const session = await auth.ensureWechatLogin({ force: true })
  const snapshot = await sessionState.notifyLoginSuccess(session)

  assert.equal(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)
  assert.deepEqual(
    resolveVisibleTabIds(snapshot.status),
    ['plaza', 'story', 'photo', 'home', 'message', 'profile'],
  )
})

// ============================ 创建 / 绑定后恢复完整 Tab ============================

test('创建情侣空间成功后强制刷新并恢复完整 Tab', async () => {
  setupLogin({ space: null })
  const session = await auth.ensureWechatLogin({ force: true })
  await sessionState.notifyLoginSuccess(session)
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)

  // 创建成功后后端状态变为“等待绑定”（status=0），仍算拥有空间。
  let spaceCalls = 0
  route('/space/status', (options) => {
    spaceCalls += 1
    options.success(ok({ spaceId: 21, status: 0, spaceName: '我们的故事', memberCount: 1 }))
  })

  await sessionState.refreshAfterSpaceChange('test:created')
  const snapshot = sessionState.getSnapshot()
  assert.equal(spaceCalls, 1)
  assert.equal(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)
  assert.ok(resolveVisibleTabIds(snapshot.status).indexOf('home') !== -1)
})

test('绑定 / 加入情侣空间成功后强制刷新并恢复完整 Tab', async () => {
  setupLogin({ space: null })
  const session = await auth.ensureWechatLogin({ force: true })
  await sessionState.notifyLoginSuccess(session)

  route('/space/status', options => options.success(ok({
    spaceId: 33, status: 1, spaceName: '两个人的空间', memberCount: 2,
  })))
  await sessionState.refreshAfterSpaceChange('test:bound')

  const snapshot = sessionState.getSnapshot()
  assert.equal(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)
  assert.equal(snapshot.space.spaceId, 33)
})

// ============================ 退出登录 ============================

test('退出登录后立即恢复为两个 Tab，并清理空间缓存', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  storage.set('photoDetailCollection', [{ id: 1 }])
  setupLogin({ space: { spaceId: 5, status: 1 } })
  await sessionState.ensureSessionReady()
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)

  const snapshot = await sessionState.logoutSession()

  assert.equal(snapshot.status, SESSION_STATUS.UNAUTHENTICATED)
  assert.equal(snapshot.space, null)
  assert.deepEqual(resolveVisibleTabIds(snapshot.status), ['plaza', 'profile'])
  assert.equal(auth.getStoredAuth().token, '')
  assert.equal(storage.has('photoDetailCollection'), false)
  // 主动退出后不应再静默登录。
  assert.equal(storage.get(LOGGED_OUT_KEY), true)
})

test('主动退出后重新启动不会静默登录，直到用户显式登录', async () => {
  storage.set(TOKEN_KEY, '')
  storage.set(LOGGED_OUT_KEY, true)
  setupLogin({ space: null })

  const snapshot = await sessionState.ensureSessionReady()
  assert.equal(snapshot.status, SESSION_STATUS.UNAUTHENTICATED)
  assert.equal(requests.filter(item => item.path === '/login/wechat').length, 0)

  const loggedIn = await sessionState.loginSession()
  assert.equal(loggedIn.status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assert.equal(storage.get(LOGGED_OUT_KEY) === true, false)
})

// ============================ Token 失效 ============================

test('空间接口返回 401 时回到未登录状态', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ spaceFailure: options => options.success(fail401()) })
  // 空间接口 401 后，auth 会用微信登录重新换取会话；这里让重新登录也失败，
  // 模拟 token 彻底失效，最终必须收敛为未登录。
  route('/login/wechat', options => options.success({
    statusCode: 500,
    data: { success: false, message: '登录服务不可用' },
  }))
  await sessionState.ensureSessionReady()

  const snapshot = sessionState.getSnapshot()
  assert.notEqual(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)
  assert.ok(snapshot.space === null || snapshot.hasSpace === false)
  assert.deepEqual(resolveVisibleTabIds(snapshot.status), ['plaza', 'profile'])
})

test('业务接口 401 触发登录态清理时全局状态收敛为未登录', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ space: { spaceId: 5, status: 1 } })
  await sessionState.ensureSessionReady()
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)

  // 模拟任意业务请求返回 401：请求层调用 clearAuth → auth 通知 session-state。
  const { post } = await import('../miniprogram/utils/request.js')
  route('/story/overview', options => options.success(fail401()))
  await assert.rejects(() => post('/story/overview'))

  const snapshot = sessionState.getSnapshot()
  assert.equal(snapshot.status, SESSION_STATUS.UNAUTHENTICATED)
  assert.deepEqual(resolveVisibleTabIds(snapshot.status), ['plaza', 'profile'])
})

// ============================ 接口失败与重试 ============================

test('情侣空间状态接口失败时安全降级为 error，不泄露受限 Tab', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ spaceFailure: options => options.success(fail500()) })
  await sessionState.ensureSessionReady()

  const snapshot = sessionState.getSnapshot()
  assert.equal(snapshot.status, SESSION_STATUS.ERROR)
  assert.ok(snapshot.spaceError.length > 0)
  assert.equal(snapshot.hasSpace, false)
  assert.deepEqual(resolveVisibleTabIds(snapshot.status), ['plaza', 'profile'])
})

test('error 状态可以重试恢复，重试成功后恢复完整 Tab', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ spaceFailure: options => options.success(fail500()) })
  await sessionState.ensureSessionReady()
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.ERROR)

  route('/space/status', options => options.success(ok({ spaceId: 8, status: 1 })))
  await sessionState.refreshSession({ force: true, reason: 'test:retry' })

  const snapshot = sessionState.getSnapshot()
  assert.equal(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)
})

test('网络层异常同样进入 error，而不是误判为“没有空间”', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ space: null })
  route('/space/status', options => options.fail({ errMsg: 'request:fail timeout' }))
  await sessionState.ensureSessionReady()

  const snapshot = sessionState.getSnapshot()
  assert.equal(snapshot.status, SESSION_STATUS.ERROR)
  assert.notEqual(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
})

// ============================ 竞态 ============================

test('旧请求晚于新请求返回时不会覆盖新状态', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ space: null })
  let releaseFirst = null
  let call = 0
  route('/space/status', (options) => {
    call += 1
    if (call === 1) {
      // 第一次请求挂起，稍后返回“有空间”。
      releaseFirst = () => options.success(ok({ spaceId: 1, status: 1 }))
      return
    }
    options.success(ok(null))
  })

  // 启动流程会发出第一次 /space/status（挂起）。
  const ready = sessionState.ensureSessionReady()
  await flushAll()

  // 第二次强制刷新先返回“没有空间”。
  await sessionState.refreshSpaceStatus({ force: true, reason: 'test:newer' })
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)

  // 旧请求此时才返回“有空间”，必须被丢弃。
  releaseFirst()
  await ready
  await flushAll()

  const snapshot = sessionState.getSnapshot()
  assert.equal(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assert.equal(snapshot.space, null)
})

test('并发刷新复用同一个在途请求，不重复发请求', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ space: { spaceId: 2, status: 1 } })
  await sessionState.ensureSessionReady()
  const before = requests.filter(item => item.path === '/space/status').length

  let release = null
  route('/space/status', (options) => {
    release = () => options.success(ok({ spaceId: 2, status: 1 }))
  })

  const first = sessionState.refreshSpaceStatus({ reason: 'test:a' })
  const second = sessionState.refreshSpaceStatus({ reason: 'test:b' })
  await flushAll()
  release()
  await Promise.all([first, second])

  const after = requests.filter(item => item.path === '/space/status').length
  assert.equal(after - before, 1)
})

// ============================ 退出后登录态联动 ============================

test('退出登录后再次查询空间不会带着旧凭证发请求', async () => {
  storage.set(TOKEN_KEY, 'token-old')
  setupLogin({ space: { spaceId: 5, status: 1 } })
  await sessionState.ensureSessionReady()
  await sessionState.logoutSession()

  const before = requests.filter(item => item.path === '/space/status').length
  await sessionState.refreshSpaceStatus({ force: true, reason: 'test:after-logout' })
  const after = requests.filter(item => item.path === '/space/status').length

  assert.equal(after, before, '未登录时不应请求 /space/status')
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.UNAUTHENTICATED)
})
