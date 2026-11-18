import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 访问控制（路由守卫）测试。
 *
 * 覆盖需求中的路由权限要求：
 * - 未登录访问受限页 → 跳「我的」并提示登录；
 * - 已登录但没有情侣空间 → 跳「我的」并提示创建 / 绑定；
 * - 有情侣空间 → 放行；
 * - loading 期间不跳转、也不放行（避免启动瞬间误踢）；
 * - 所有跳转使用 reLaunch，确保受限页面不留在页面栈；
 * - 通过分享 / 深链进入受限页同样被拦截。
 */

const storage = new Map()
const navigations = []
const toasts = []
let currentPages = [{ route: 'pages/plaza/index' }]
const handlers = new Map()

function normalizePath(url) {
  return String(url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '')
}

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key),
  request(options) {
    const handler = handlers.get(normalizePath(options.url))
    if (!handler) {
      options.success({ statusCode: 200, data: { success: true, data: null } })
      return
    }
    handler(options)
  },
  login(options) {
    if (options && options.success) options.success({ code: 'mock-code' })
  },
  reLaunch(options) {
    navigations.push({ type: 'reLaunch', url: options && options.url })
    if (options && options.success) options.success({})
  },
  navigateTo(options) {
    navigations.push({ type: 'navigateTo', url: options && options.url })
    if (options && options.success) options.success({})
  },
  redirectTo(options) {
    navigations.push({ type: 'redirectTo', url: options && options.url })
    if (options && options.success) options.success({})
  },
  switchTab(options) {
    navigations.push({ type: 'switchTab', url: options && options.url })
  },
  showToast(options) {
    toasts.push(options && options.title)
  },
}

globalThis.getCurrentPages = () => currentPages

const auth = await import('../miniprogram/utils/auth.js')
const sessionState = await import('../miniprogram/utils/session-state.js')
const accessControl = await import('../miniprogram/utils/access-control.js')
const { SESSION_STATUS } = await import('../miniprogram/utils/session-constants.js')

const flushAll = async () => {
  for (let i = 0; i < 6; i += 1) await new Promise(resolve => setTimeout(resolve, 0))
}

function ok(data) {
  return { statusCode: 200, data: { success: true, data } }
}

/** 把全局状态置为未登录。 */
function setUnauthenticated() {
  storage.clear()
  sessionState.resetForTests()
  sessionState.handleAuthCleared('test')
}

/** 把全局状态置为“已登录且存在情侣空间”。 */
async function setWithSpace() {
  storage.clear()
  storage.set('amour_token', 'token-a')
  sessionState.resetForTests()
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok({ spaceId: 6, status: 1 })))
  await sessionState.ensureSessionReady()
}

/** 把全局状态置为“已登录但没有情侣空间”。 */
async function setWithoutSpace() {
  storage.clear()
  storage.set('amour_token', 'token-a')
  sessionState.resetForTests()
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok(null)))
  await sessionState.ensureSessionReady()
}

test.beforeEach(() => {
  storage.clear()
  navigations.length = 0
  toasts.length = 0
  handlers.clear()
  currentPages = [{ route: 'pages/index/index' }]
})

// ============================ 未登录 ============================

test('未登录访问情侣空间页面：reLaunch 到「我的」并提示登录', async () => {
  setUnauthenticated()
  const allowed = await accessControl.guardPageReady('pages/index/index')

  assert.equal(allowed, false)
  const last = navigations[navigations.length - 1]
  assert.equal(last.type, 'reLaunch', '必须用 reLaunch 清空页面栈')
  assert.ok(last.url.indexOf('/pages/profile/profile') === 0)
  assert.ok(last.url.indexOf('guide=login') !== -1)
})

test('未登录访问故事页：同样被拦截（分享 / 深链入口受控）', async () => {
  setUnauthenticated()
  const allowed = await accessControl.guardPageReady('pages/story/story')
  assert.equal(allowed, false)
  assert.ok(navigations[navigations.length - 1].url.indexOf('/pages/profile/profile') === 0)
})

test('未登录访问相册详情 / 留言：全部被拦截', async () => {
  setUnauthenticated()
  for (const route of [
    'pages/photo/photo',
    'pages/photo-detail/photo-detail',
    'pages/message/message',
    'pages/story-detail/story-detail',
  ]) {
    navigations.length = 0
    const allowed = await accessControl.guardPageReady(route)
    assert.equal(allowed, false, route)
    assert.ok(
      navigations[navigations.length - 1].url.indexOf('/pages/profile/profile') === 0,
      route,
    )
  }
})

test('未登录访问公开页面（广场 / 我的）直接放行', async () => {
  setUnauthenticated()
  for (const route of ['pages/plaza/index', 'pages/plaza-detail/index', 'pages/profile/profile']) {
    navigations.length = 0
    const allowed = await accessControl.guardPageReady(route)
    assert.equal(allowed, true, route)
    assert.equal(navigations.length, 0, route)
  }
})

// ============================ 已登录但无情侣空间 ============================

test('已登录但无情侣空间访问受限页：跳「我的」并提示创建 / 绑定', async () => {
  await setWithoutSpace()
  const allowed = await accessControl.guardPageReady('pages/index/index')

  assert.equal(allowed, false)
  const last = navigations[navigations.length - 1]
  assert.equal(last.type, 'reLaunch')
  assert.ok(last.url.indexOf('/pages/profile/profile') === 0)
  assert.ok(last.url.indexOf('guide=space') !== -1)
  assert.ok(toasts.some(text => /情侣空间/.test(String(text))))
})

test('已登录但无情侣空间可以进入创建 / 绑定页（AUTH 级别）', async () => {
  await setWithoutSpace()
  const allowed = await accessControl.guardPageReady('pages/space-setup/index')
  assert.equal(allowed, true)
})

test('已登录但无情侣空间访问资料编辑页放行', async () => {
  await setWithoutSpace()
  const allowed = await accessControl.guardPageReady('pages/profile-edit/profile-edit')
  assert.equal(allowed, true)
})

// ============================ 已登录且有情侣空间 ============================

test('已有情侣空间时受限页面全部放行', async () => {
  await setWithSpace()
  for (const route of [
    'pages/index/index',
    'pages/story/story',
    'pages/story-detail/story-detail',
    'pages/photo/photo',
    'pages/photo-detail/photo-detail',
    'pages/message/message',
  ]) {
    navigations.length = 0
    const allowed = await accessControl.guardPageReady(route)
    assert.equal(allowed, true, route)
    assert.equal(navigations.length, 0, route)
  }
})

// ============================ 状态异常 / loading ============================

test('情侣空间状态接口失败时，受限页面仍被拦截（安全降级）', async () => {
  storage.clear()
  storage.set('amour_token', 'token-a')
  sessionState.resetForTests()
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success({
    statusCode: 500,
    data: { success: false, message: '服务异常' },
  }))
  await sessionState.ensureSessionReady()

  const allowed = await accessControl.guardPageReady('pages/story/story')
  assert.equal(allowed, false)
  assert.ok(navigations[navigations.length - 1].url.indexOf('guide=space') !== -1)
})

test('loading 状态下不跳转也不放行（等确认后再判断）', async () => {
  storage.clear()
  sessionState.resetForTests()
  // 尚未开始确认：状态为 loading。
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.LOADING)

  const allowed = accessControl.guardPage('pages/story/story')
  assert.equal(allowed, false)
  assert.equal(navigations.length, 0, 'loading 期间不能把用户踢走')
})

// ============================ 导航入口 ============================

test('canNavigate 在无空间时拦截受限 URL 并给出提示', async () => {
  await setWithoutSpace()
  const allowed = accessControl.canNavigate('/pages/story/story')
  assert.equal(allowed, false)
  assert.ok(toasts.some(text => /情侣空间/.test(String(text))))
  assert.ok(navigations[navigations.length - 1].url.indexOf('/pages/profile/profile') === 0)
})

test('canNavigate 对公开 URL 放行且不跳转', async () => {
  await setWithoutSpace()
  navigations.length = 0
  const allowed = accessControl.canNavigate('/pages/plaza/index')
  assert.equal(allowed, true)
  assert.equal(navigations.length, 0)
})

test('guardPage 缺省使用当前页面栈顶路由', async () => {
  await setWithoutSpace()
  currentPages = [{ route: 'pages/message/message' }]
  const allowed = accessControl.guardPage()
  assert.equal(allowed, false)
  assert.ok(navigations[navigations.length - 1].url.indexOf('guide=space') !== -1)
})

// ============================ 情侣空间创建入口 ============================

test('openSpaceSetup：未登录时先去登录页', () => {
  setUnauthenticated()
  const started = accessControl.openSpaceSetup('create')
  assert.equal(started, true)
  const last = navigations[navigations.length - 1]
  assert.ok(last.url.indexOf('/pages/login/login') !== -1)
  assert.equal(last.type, 'reLaunch')
})

test('openSpaceSetup：已登录时进入创建 / 绑定页并带上分区参数', async () => {
  await setWithoutSpace()
  navigations.length = 0
  const started = accessControl.openSpaceSetup('bind')
  assert.equal(started, true)
  const last = navigations[navigations.length - 1]
  assert.equal(last.type, 'navigateTo')
  assert.ok(last.url.indexOf('/pages/space-setup/index') === 0)
  assert.ok(last.url.indexOf('action=bind') !== -1)
})

test('redirectToLogin 保留 redirect 参数供登录后回跳', () => {
  navigations.length = 0
  accessControl.redirectToLogin('pages/story/story')
  const last = navigations[navigations.length - 1]
  assert.ok(last.url.indexOf('/pages/login/login') === 0)
  assert.ok(last.url.indexOf(encodeURIComponent('/pages/story/story')) !== -1)
})

// ============================ 退出登录后 ============================

test('退出登录后立即访问受限页会被拦截', async () => {
  await setWithSpace()
  await sessionState.logoutSession()

  navigations.length = 0
  const allowed = await accessControl.guardPageReady('pages/index/index')
  assert.equal(allowed, false)
  assert.ok(navigations[navigations.length - 1].url.indexOf('/pages/profile/profile') === 0)
})

test('退出登录会清空本地 token（页面读不到旧凭证）', async () => {
  await setWithSpace()
  assert.equal(auth.getStoredAuth().token, 'token-a')
  await sessionState.logoutSession()
  assert.equal(auth.getStoredAuth().token, '')
})

// ============================ 全局导航守卫 ============================

test('全局守卫：受限页面停留期间 token 失效会立即跳回「我的」', async () => {
  await setWithSpace()
  currentPages = [{ route: 'pages/story/story' }]
  navigations.length = 0

  const unsubscribe = accessControl.bindSessionNavigationGuard()
  try {
    // 模拟业务请求 401：请求层清空登录态并通知全局状态收敛。
    const { post } = await import('../miniprogram/utils/request.js')
    handlers.set('/story/overview', options => options.success({
      statusCode: 401,
      data: { success: false, errorCode: '20002', message: '无访问权限，请先登录！' },
    }))
    await assert.rejects(() => post('/story/overview'))
  } finally {
    unsubscribe()
  }

  const last = navigations[navigations.length - 1]
  assert.ok(last, '应发起跳转')
  assert.equal(last.type, 'reLaunch')
  assert.ok(last.url.indexOf('/pages/profile/profile') === 0)
})

test('全局守卫：公开页面停留时状态变化不跳转', async () => {
  await setWithSpace()
  currentPages = [{ route: 'pages/plaza/index' }]
  navigations.length = 0

  const unsubscribe = accessControl.bindSessionNavigationGuard()
  try {
    await sessionState.logoutSession()
  } finally {
    unsubscribe()
  }
  assert.equal(navigations.length, 0)
})

test('全局守卫：有情侣空间时受限页面保持不动', async () => {
  await setWithSpace()
  currentPages = [{ route: 'pages/photo/photo' }]
  navigations.length = 0

  const unsubscribe = accessControl.bindSessionNavigationGuard()
  try {
    await sessionState.refreshSpaceStatus({ force: true, reason: 'test:guard' })
  } finally {
    unsubscribe()
  }
  assert.equal(navigations.length, 0)
})

test('全局守卫：loading 状态不触发跳转', async () => {
  sessionState.resetForTests()
  currentPages = [{ route: 'pages/index/index' }]
  navigations.length = 0

  const unsubscribe = accessControl.bindSessionNavigationGuard()
  try {
    // 状态仍为 loading；触发一次无凭证的空间刷新也应保持不跳转。
    await sessionState.refreshSpaceStatus({ reason: 'test:loading' })
  } finally {
    unsubscribe()
  }
  // 该调用会因无 token 直接收敛为未登录，此时受限页面应被拦截（而非停留在 loading 不处理）。
  const last = navigations[navigations.length - 1]
  assert.ok(last && last.url.indexOf('/pages/profile/profile') === 0)
})
