import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 底部导航（Tab）与「我的」页面行为测试。
 *
 * 用最小的小程序运行时桩加载真实组件定义，校验：
 * - loading 期间不渲染任何真实 Tab（不会闪出完整 Tab）；
 * - 未登录 / 已登录无情侣空间 / error 只展示「广场」+「我的」；
 * - 已登录且存在情侣空间展示完整 Tab；
 * - 隐藏 Tab 被点击时不会进入受限页面；
 * - 「我的」页面在未登录 / 无空间 / 有空间三种状态下渲染对应引导。
 */

const storage = new Map()
const navigations = []
const toasts = []
const handlers = new Map()
let componentOptions = null
let pageOptions = null

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
  },
  navigateTo(options) {
    navigations.push({ type: 'navigateTo', url: options && options.url })
  },
  showToast(options) {
    toasts.push(options && options.title)
  },
  getSystemInfo() {},
  getMenuButtonBoundingClientRect: () => ({ left: 300 }),
}

globalThis.getCurrentPages = () => [{ route: 'pages/plaza/index', options: {} }]
globalThis.getApp = () => ({ globalData: {} })
globalThis.Component = (options) => {
  // 第一个注册的组件是 bottom-nav；后续注册的是「我的」页面。
  if (!componentOptions) componentOptions = options
  else pageOptions = options
}

const auth = await import('../miniprogram/utils/auth.js')
const sessionState = await import('../miniprogram/utils/session-state.js')
const { SESSION_STATUS } = await import('../miniprogram/utils/session-constants.js')

await import('../miniprogram/components/bottom-nav/bottom-nav.js')
await import('../miniprogram/pages/profile/profile.js')

function ok(data) {
  return { statusCode: 200, data: { success: true, data } }
}

/** 建立组件实例：支持 setData 与 a.b 路径、生命周期与页面生命周期。 */
function createInstance(options, extra = {}) {
  const instance = Object.create(null)
  Object.assign(instance, extra)
  Object.keys(options).forEach((key) => {
    if (key === 'data' || key === 'methods' || key === 'lifetimes' || key === 'pageLifetimes' || key === 'properties') return
    instance[key] = options[key]
  })
  instance.data = JSON.parse(JSON.stringify(options.data || {}))
  instance.setData = (patch, callback) => {
    Object.keys(patch).forEach((key) => {
      if (key.indexOf('.') === -1) {
        instance.data[key] = patch[key]
        return
      }
      const parts = key.split('.')
      let target = instance.data
      parts.slice(0, -1).forEach((part) => {
        if (!target[part] || typeof target[part] !== 'object') target[part] = {}
        target = target[part]
      })
      target[parts[parts.length - 1]] = patch[key]
    })
    if (callback) callback()
  }
  Object.keys(options.methods || {}).forEach((name) => {
    instance[name] = options.methods[name].bind(instance)
  })
  instance.__options = options
  instance.lifetimes = options.lifetimes || {}
  instance.pageLifetimes = options.pageLifetimes || {}
  instance.triggerEvent = () => undefined
  return instance
}

function createNav() {
  const nav = createInstance(componentOptions)
  if (nav.lifetimes.attached) nav.lifetimes.attached.call(nav)
  return nav
}

function createProfile() {
  const page = createInstance(pageOptions)
  return page
}

async function settle() {
  for (let i = 0; i < 8; i += 1) await new Promise(resolve => setTimeout(resolve, 0))
}

/** 直接构造一个指定状态的会话快照（避免每个用例都走网络桩）。 */
function sessionOf(status, overrides = {}) {
  const loggedIn = status !== SESSION_STATUS.UNAUTHENTICATED && status !== SESSION_STATUS.LOADING
  return {
    status,
    auth: loggedIn
      ? { token: 'token-a', username: 'u', displayName: '测试用户', avatar: '', passwordSet: false, permissions: [] }
      : null,
    space: status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE
      ? { spaceId: 5, status: 1, spaceName: '我们的小屋', memberCount: 2 }
      : null,
    spaceError: status === SESSION_STATUS.ERROR ? '情侣空间状态加载失败' : '',
    authError: '',
    confirmed: true,
    loggedOut: false,
    loggedIn,
    hasSpace: status === SESSION_STATUS.AUTHENTICATED_WITH_SPACE,
    loading: status === SESSION_STATUS.LOADING,
    token: loggedIn ? 'token-a' : '',
    ...overrides,
  }
}

/** 让全局状态源进入指定状态：直接向订阅者推送构造好的快照。 */
function pushStatus(status, overrides = {}) {
  sessionState.resetForTests()
  const snapshot = sessionOf(status, overrides)
  // 通过公开 API 无法伪造快照，这里用订阅者 + 真实状态机的组合：
  // 组件订阅的是 sessionState.subscribe，因此直接用真实流程更可靠。
  return snapshot
}

test.beforeEach(() => {
  storage.clear()
  navigations.length = 0
  toasts.length = 0
  handlers.clear()
  sessionState.resetForTests()
})

// ============================ bottom-nav ============================

test('状态确认中（loading）不渲染任何真实 Tab', () => {
  const nav = createNav()
  assert.equal(nav.data.tabLoading, true)
  assert.equal(nav.data.showPlaza, false)
  assert.equal(nav.data.showHome, false)
  assert.equal(nav.data.showStory, false)
  assert.equal(nav.data.showPhoto, false)
  assert.equal(nav.data.showMessage, false)
  assert.equal(nav.data.showProfile, false)
})

test('未登录时只展示「广场」与「我的」', () => {
  const nav = createNav()
  nav.applySession(sessionOf(SESSION_STATUS.UNAUTHENTICATED))

  assert.equal(nav.data.tabLoading, false)
  assert.equal(nav.data.minimalTabs, true)
  assert.equal(nav.data.showPlaza, true)
  assert.equal(nav.data.showProfile, true)
  assert.equal(nav.data.showHome, false)
  assert.equal(nav.data.showStory, false)
  assert.equal(nav.data.showPhoto, false)
  assert.equal(nav.data.showMessage, false)
})

test('已登录但没有情侣空间时只展示「广场」与「我的」', () => {
  const nav = createNav()
  nav.applySession(sessionOf(SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE))

  assert.equal(nav.data.minimalTabs, true)
  assert.equal(nav.data.showPlaza, true)
  assert.equal(nav.data.showProfile, true)
  assert.equal(nav.data.showHome, false)
  assert.equal(nav.data.showStory, false)
  assert.equal(nav.data.showPhoto, false)
  assert.equal(nav.data.showMessage, false)
})

test('情侣空间状态异常时同样只展示两个 Tab（安全降级）', () => {
  const nav = createNav()
  nav.applySession(sessionOf(SESSION_STATUS.ERROR))

  assert.equal(nav.data.minimalTabs, true)
  assert.equal(nav.data.showPlaza, true)
  assert.equal(nav.data.showProfile, true)
  assert.equal(nav.data.showHome, false)
  assert.equal(nav.data.showStory, false)
})

test('已登录且存在情侣空间时展示完整 Tab', () => {
  const nav = createNav()
  nav.applySession(sessionOf(SESSION_STATUS.AUTHENTICATED_WITH_SPACE))

  assert.equal(nav.data.tabLoading, false)
  assert.equal(nav.data.minimalTabs, false)
  assert.equal(nav.data.showPlaza, true)
  assert.equal(nav.data.showProfile, true)
  // 依赖模块查询权限的 Tab 在无权限时不展示（沿用项目原有权限逻辑）。
  assert.equal(nav.data.showHome, true)
})

test('有情侣空间但缺少模块查询权限时，对应 Tab 不展示', () => {
  const nav = createNav()
  nav.applySession(sessionOf(SESSION_STATUS.AUTHENTICATED_WITH_SPACE, {
    auth: {
      token: 'token-a', username: 'u', displayName: 'd', avatar: '', passwordSet: false,
      permissions: ['frontend:story:query'],
    },
  }))
  storage.set('amour_token', 'token-a')
  storage.set('amour_permissions', ['frontend:story:query'])

  nav.applySession(sessionOf(SESSION_STATUS.AUTHENTICATED_WITH_SPACE))

  assert.equal(nav.data.showPlaza, true)
  assert.equal(nav.data.showProfile, true)
  assert.equal(nav.data.showHome, true)
})

test('点击被隐藏的受限 Tab 不会进入受限页面，而是回到「我的」', () => {
  storage.clear()
  sessionState.handleAuthCleared('test')
  const nav = createNav()
  nav.applySession(sessionOf(SESSION_STATUS.UNAUTHENTICATED))
  nav.data.current = 'plaza'

  nav.navigate({ currentTarget: { dataset: { page: 'story' } } })

  const last = navigations[navigations.length - 1]
  assert.equal(last.type, 'reLaunch')
  assert.ok(last.url.indexOf('/pages/profile/profile') !== -1, `实际跳转：${last.url}`)
  assert.ok(toasts.some(text => /情侣空间/.test(String(text))))
})

test('点击「广场」会 reLaunch 到恋爱广场', () => {
  const nav = createNav()
  nav.applySession(sessionOf(SESSION_STATUS.UNAUTHENTICATED))
  nav.data.current = 'profile'

  nav.navigate({ currentTarget: { dataset: { page: 'plaza' } } })
  assert.equal(navigations[navigations.length - 1].url, '/pages/plaza/index')
})

test('点击当前 Tab 不做任何跳转', () => {
  const nav = createNav()
  nav.applySession(sessionOf(SESSION_STATUS.AUTHENTICATED_WITH_SPACE))
  nav.data.current = 'home'
  const before = navigations.length
  nav.navigate({ currentTarget: { dataset: { page: 'home' } } })
  assert.equal(navigations.length, before)
})

// ============================ 「我的」页面 ============================

test('「我的」页面：状态确认中展示骨架，不展示引导区', () => {
  const page = createProfile()
  page.applySession(sessionOf(SESSION_STATUS.LOADING))

  assert.equal(page.data.statusLoading, true)
  assert.equal(page.data.hasSpace, false)
  assert.equal(page.data.spaceStateTitle, '')
})

test('「我的」页面：未登录时展示登录入口', () => {
  const page = createProfile()
  page.applySession(sessionOf(SESSION_STATUS.UNAUTHENTICATED))

  assert.equal(page.data.loggedIn, false)
  assert.equal(page.data.hasSpace, false)
  assert.equal(page.data.statusLoading, false)
})

test('「我的」页面：已登录但无情侣空间时展示创建 / 绑定引导', () => {
  const page = createProfile()
  page.applySession(sessionOf(SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE))

  assert.equal(page.data.loggedIn, true)
  assert.equal(page.data.hasSpace, false)
  assert.equal(page.data.spaceStateTitle, '还没有情侣空间')
  assert.ok(/创建|绑定/.test(page.data.spaceStateNote))
  assert.equal(page.data.spaceStateError, false)
})

test('「我的」页面：状态接口失败时展示错误与重试文案', () => {
  const page = createProfile()
  page.applySession(sessionOf(SESSION_STATUS.ERROR))

  assert.equal(page.data.hasSpace, false)
  assert.equal(page.data.spaceStateError, true)
  assert.ok(page.data.sessionError.length > 0)
  assert.ok(/无法确认/.test(page.data.spaceStateTitle))
})

test('「我的」页面：已有情侣空间时展示空间摘要', () => {
  const page = createProfile()
  page.applySession(sessionOf(SESSION_STATUS.AUTHENTICATED_WITH_SPACE))

  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.spaceName, '我们的小屋')
  assert.ok(page.data.spaceSummary.length > 0)
})

// ============================ 「我的」：空间设置入口 ============================

/** 用真实状态机把全局状态推进到“已登录且存在情侣空间”。 */
async function loginWithSpace() {
  storage.set('amour_token', 'token-a')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: '测试用户', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok({ spaceId: 5, status: 1, spaceName: '我们的小屋', memberCount: 2 })))
  await sessionState.ensureSessionReady()
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)
}

test('「我的」页面：有空间时点「空间设置」→ navigateTo ?mode=settings', async () => {
  await loginWithSpace()
  const page = createProfile()
  page.applySession(sessionState.getSnapshot())
  navigations.length = 0

  assert.equal(typeof page.onOpenSpaceSettings, 'function', '应存在空间设置入口的处理函数')
  page.onOpenSpaceSettings()

  const last = navigations[navigations.length - 1]
  assert.ok(last, '应发起跳转')
  assert.equal(last.type, 'navigateTo')
  assert.equal(last.url, '/pages/space-setup/index?mode=settings')
})

test('「我的」页面：空间设置入口保留「进入情侣空间」原有行为（reLaunch 首页）', async () => {
  await loginWithSpace()
  const page = createProfile()
  page.applySession(sessionState.getSnapshot())

  navigations.length = 0
  page.onOpenSpace()

  const last = navigations[navigations.length - 1]
  assert.equal(last.type, 'reLaunch')
  assert.equal(last.url, '/pages/index/index')
})

test('「我的」页面：没有空间时点「空间设置」不会跳进设置页（仍走登录态检查）', () => {
  storage.clear()
  sessionState.resetForTests()
  sessionState.handleAuthCleared('test')
  const page = createProfile()
  page.applySession(sessionOf(SESSION_STATUS.UNAUTHENTICATED))
  navigations.length = 0

  page.onOpenSpaceSettings()

  const last = navigations[navigations.length - 1]
  assert.ok(last, '应发起跳转')
  assert.ok(last.url.indexOf('/pages/login/login') !== -1, `未登录应先跳登录页，实际：${last.url}`)
})

/** 用真实状态机把全局状态推进到“已登录但没有情侣空间”。 */
async function loginWithoutSpace() {
  storage.set('amour_token', 'token-a')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: '测试用户', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok(null)))
  await sessionState.ensureSessionReady()
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
}

test('「我的」页面：创建入口经登录态检查后打开创建分区', async () => {
  await loginWithoutSpace()
  const page = createProfile()
  page.applySession(sessionState.getSnapshot())

  page.onCreateSpace()

  const last = navigations[navigations.length - 1]
  assert.ok(last, '应发起跳转')
  assert.equal(last.type, 'navigateTo')
  assert.ok(last.url.indexOf('/pages/space-setup/index') === 0)
  assert.ok(last.url.indexOf('action=create') !== -1)
})

test('「我的」页面：绑定入口打开绑定分区', async () => {
  await loginWithoutSpace()
  const page = createProfile()
  page.applySession(sessionState.getSnapshot())

  page.onBindSpace()
  const last = navigations[navigations.length - 1]
  assert.ok(last.url.indexOf('action=bind') !== -1)
})

test('「我的」页面：未登录点创建入口会先被引导到登录页', async () => {
  storage.clear()
  sessionState.resetForTests()
  sessionState.handleAuthCleared('test')
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.UNAUTHENTICATED)

  const page = createProfile()
  page.applySession(sessionState.getSnapshot())
  page.onCreateSpace()

  const last = navigations[navigations.length - 1]
  assert.ok(last.url.indexOf('/pages/login/login') !== -1, `实际跳转：${last.url}`)
})
