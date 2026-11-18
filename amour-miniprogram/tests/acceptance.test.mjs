import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 端到端验收测试：按需求「九、验收标准」逐条验证。
 *
 * 这里把全局状态源 + 访问控制 + Tab 规则串起来跑，模拟真实用户路径：
 * 冷启动 → 登录 → 创建 / 绑定 → 退出等完整链路。
 */

const storage = new Map()
const navigations = []
const handlers = new Map()
const requests = []

function normalizePath(url) {
  return String(url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '')
}

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key),
  request(options) {
    const path = normalizePath(options.url)
    requests.push(path)
    const handler = handlers.get(path)
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
    navigations.push(options && options.url)
  },
  navigateTo(options) {
    navigations.push(options && options.url)
  },
  showToast() {},
  setClipboardData() {},
}

globalThis.getCurrentPages = () => [{ route: 'pages/plaza/index', options: {} }]

const auth = await import('../miniprogram/utils/auth.js')
const sessionState = await import('../miniprogram/utils/session-state.js')
const accessControl = await import('../miniprogram/utils/access-control.js')
const { SESSION_STATUS, TAB_ID } = await import('../miniprogram/utils/session-constants.js')
const { resolveVisibleTabIds, resolvePageAccess, canAccessPage, PAGE_ACCESS } =
  await import('../miniprogram/utils/session-rules.js')

function ok(data) {
  return { statusCode: 200, data: { success: true, data } }
}

const tabCount = status => resolveVisibleTabIds(status).length

/** 只能看到「恋爱广场」和「我的」。 */
function assertTwoTabs(status, message) {
  const visible = resolveVisibleTabIds(status)
  assert.equal(visible.length, 2, message)
  assert.deepEqual(visible, [TAB_ID.PLAZA, TAB_ID.PROFILE], message)
}

/** 完整 Tab。 */
function assertFullTabs(status, message) {
  const visible = resolveVisibleTabIds(status)
  assert.deepEqual(
    visible,
    ['plaza', 'story', 'photo', 'home', 'message', 'profile'],
    message,
  )
}

test.beforeEach(() => {
  storage.clear()
  navigations.length = 0
  requests.length = 0
  handlers.clear()
  sessionState.resetForTests()
})

// ============================ 验收 1-3 ============================

test('验收 1：未登录用户只能看到「恋爱广场」和「我的」', async () => {
  handlers.set('/login/wechat', options => options.success({
    statusCode: 500,
    data: { success: false, message: '登录不可用' },
  }))
  const snapshot = await sessionState.ensureSessionReady()

  assert.equal(snapshot.status, SESSION_STATUS.UNAUTHENTICATED)
  assertTwoTabs(snapshot.status, '未登录只能看到两个 Tab')
})

test('验收 2：首次登录但没有情侣空间只能看到两个 Tab', async () => {
  handlers.set('/login/wechat', options => options.success(ok({
    token: 'token-new', username: 'wx_u', displayName: '新用户', avatar: '',
    passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok(null)))

  const session = await auth.ensureWechatLogin({ force: true })
  const snapshot = await sessionState.notifyLoginSuccess(session)

  assert.equal(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assertTwoTabs(snapshot.status, '首次登录无空间只能看到两个 Tab')
})

test('验收 3：已登录但未创建 / 未绑定 / 未加入空间只能看到两个 Tab', async () => {
  storage.set('amour_token', 'token-old')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  // 后端 getCurrentSpace 未加入空间时返回 data=null。
  handlers.set('/space/status', options => options.success(ok(null)))

  const snapshot = await sessionState.ensureSessionReady()
  assert.equal(snapshot.status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assertTwoTabs(snapshot.status, '无空间只能看到两个 Tab')
})

// ============================ 验收 5-6 ============================

test('验收 5：创建情侣空间成功后无需重启即可恢复完整 Tab', async () => {
  storage.set('amour_token', 'token-old')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok(null)))
  await sessionState.ensureSessionReady()
  assertTwoTabs(sessionState.getSnapshot().status, '创建前只有两个 Tab')

  // 用户创建成功，后端 /space/create 返回 SpaceStatusVO（等待绑定）。
  handlers.set('/space/create', options => options.success(ok({
    spaceId: 101, spaceName: '我们的故事', status: 0, memberCount: 1, currentUserRole: 1,
  })))
  handlers.set('/space/status', options => options.success(ok({
    spaceId: 101, spaceName: '我们的故事', status: 0, memberCount: 1, currentUserRole: 1,
  })))

  const { createCoupleSpace } = await import('../miniprogram/utils/space-api.js')
  await createCoupleSpace({ spaceName: '我们的故事' })
  await sessionState.refreshAfterSpaceChange('acceptance:created')

  assertFullTabs(sessionState.getSnapshot().status, '创建成功后恢复完整 Tab')
})

test('验收 6：绑定 / 加入情侣空间成功后无需重启即可恢复完整 Tab', async () => {
  storage.set('amour_token', 'token-old')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok(null)))
  await sessionState.ensureSessionReady()
  assertTwoTabs(sessionState.getSnapshot().status, '绑定前只有两个 Tab')

  handlers.set('/space/invitation/accept', options => options.success(ok({
    spaceId: 202, spaceName: '两个人的空间', status: 1, memberCount: 2, currentUserRole: 2,
  })))
  handlers.set('/space/status', options => options.success(ok({
    spaceId: 202, spaceName: '两个人的空间', status: 1, memberCount: 2, currentUserRole: 2,
  })))

  const { acceptInvitation } = await import('../miniprogram/utils/space-api.js')
  await acceptInvitation({ token: 'invite-token' })
  await sessionState.refreshAfterSpaceChange('acceptance:bound')

  assertFullTabs(sessionState.getSnapshot().status, '绑定成功后恢复完整 Tab')
})

// ============================ 验收 7 ============================

test('验收 7：退出登录后立即恢复为两个 Tab，且认证缓存被清理', async () => {
  storage.set('amour_token', 'token-old')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok({ spaceId: 1, status: 1 })))
  await sessionState.ensureSessionReady()
  assertFullTabs(sessionState.getSnapshot().status, '退出前是完整 Tab')

  const snapshot = await sessionState.logoutSession()

  assert.equal(snapshot.status, SESSION_STATUS.UNAUTHENTICATED)
  assertTwoTabs(snapshot.status, '退出后立即只有两个 Tab')
  assert.equal(auth.getStoredAuth().token, '')
  assert.equal(auth.getStoredAuth().permissions.length, 0)
})

// ============================ 验收 8 ============================

test('验收 8：token 失效后回到未登录状态，受限页面不可访问', async () => {
  storage.set('amour_token', 'token-old')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok({ spaceId: 1, status: 1 })))
  await sessionState.ensureSessionReady()

  // token 失效：业务接口 401。
  const { post } = await import('../miniprogram/utils/request.js')
  handlers.set('/photo/page', options => options.success({
    statusCode: 401,
    data: { success: false, errorCode: '20002', message: '无访问权限，请先登录！' },
  }))
  await assert.rejects(() => post('/photo/page'))

  const snapshot = sessionState.getSnapshot()
  assert.equal(snapshot.status, SESSION_STATUS.UNAUTHENTICATED)
  assert.equal(
    canAccessPage(resolvePageAccess('pages/photo/photo'), snapshot.status),
    false,
    'token 失效后受限页面不可访问',
  )
})

// ============================ 验收 9 ============================

test('验收 9：无情侣空间用户访问受限页面会被拦截', async () => {
  storage.set('amour_token', 'token-old')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok(null)))
  await sessionState.ensureSessionReady()

  for (const route of [
    'pages/index/index',
    'pages/story/story',
    'pages/photo/photo',
    'pages/message/message',
    'pages/story-detail/story-detail',
    'pages/photo-detail/photo-detail',
  ]) {
    navigations.length = 0
    const allowed = await accessControl.guardPageReady(route)
    assert.equal(allowed, false, route)
    assert.ok(navigations.length > 0, `${route} 应发生跳转`)
    assert.ok(
      navigations[navigations.length - 1].indexOf('/pages/profile/profile') === 0,
      `${route} 应跳到我的页面`,
    )
  }
})

// ============================ 验收 10 ============================

test('验收 10：情侣空间状态接口失败时不泄露受限 Tab，且可以重试', async () => {
  storage.set('amour_token', 'token-old')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success({
    statusCode: 503,
    data: { success: false, message: '服务暂时不可用' },
  }))

  await sessionState.ensureSessionReady()
  const failed = sessionState.getSnapshot()
  assert.equal(failed.status, SESSION_STATUS.ERROR)
  assertTwoTabs(failed.status, '接口失败时只有两个 Tab')
  assert.equal(
    canAccessPage(resolvePageAccess('pages/story/story'), failed.status),
    false,
    '接口失败时受限页面不可访问',
  )

  // 重试成功。
  handlers.set('/space/status', options => options.success(ok({ spaceId: 9, status: 1 })))
  await sessionState.refreshSession({ force: true, reason: 'acceptance:retry' })

  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.AUTHENTICATED_WITH_SPACE)
  assertFullTabs(sessionState.getSnapshot().status, '重试成功后恢复完整 Tab')
})

// ============================ 验收 11 ============================

test('验收 11：刷新 / 重新进入 / 页面栈恢复时不会出现错误 Tab', async () => {
  // 重新进入小程序 = 模块状态重置后重新 ensureSessionReady。
  storage.set('amour_token', 'token-old')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  let release = null
  handlers.set('/space/status', (options) => {
    release = () => options.success(ok(null))
  })

  sessionState.resetForTests()
  const ready = sessionState.ensureSessionReady()
  await new Promise(resolve => setTimeout(resolve, 0))

  // 状态确认完成之前：loading，且只有两个 Tab（不可能短暂出现完整 Tab）。
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.LOADING)
  assertTwoTabs(sessionState.getSnapshot().status, '确认前只有两个 Tab')

  release()
  await ready
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
  assertTwoTabs(sessionState.getSnapshot().status, '确认后仍只有两个 Tab')
})

// ============================ 验收 12 ============================

test('验收 12：未登录 / 无空间用户通过分享链接进入受限页会被拦截', async () => {
  // 模拟分享进入：页面 onCreate 即为受限页，但全局状态是未登录。
  storage.clear()
  sessionState.resetForTests()
  sessionState.handleAuthCleared('acceptance:share')

  globalThis.getCurrentPages = () => [{ route: 'pages/story/story', options: { id: '9', from: 'share' } }]
  navigations.length = 0

  const allowed = await accessControl.guardPageReady('pages/story/story')
  assert.equal(allowed, false)
  const target = navigations[navigations.length - 1]
  assert.ok(target.indexOf('/pages/profile/profile') === 0, `实际跳转：${target}`)
  assert.ok(target.indexOf('guide=login') !== -1)

  // 已登录但无空间的分享进入。
  storage.set('amour_token', 'token-old')
  sessionState.resetForTests()
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', options => options.success(ok(null)))
  await sessionState.ensureSessionReady()

  navigations.length = 0
  const allowed2 = await accessControl.guardPageReady('pages/story/story')
  assert.equal(allowed2, false)
  const target2 = navigations[navigations.length - 1]
  assert.ok(target2.indexOf('/pages/profile/profile') === 0)
  assert.ok(target2.indexOf('guide=space') !== -1)
})

// ============================ 验收 13 ============================

test('验收 13：已有情侣空间的老用户功能不受影响（完整 Tab + 全部页面放行）', async () => {
  storage.set('amour_token', 'token-old')
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u', displayName: 'd', avatar: '', passwordSet: false,
    permissions: ['frontend:story:query', 'frontend:photo:query', 'frontend:message:query'],
  })))
  handlers.set('/space/status', options => options.success(ok({
    spaceId: 1, status: 1, spaceName: '我们的空间', memberCount: 2,
  })))

  const snapshot = await sessionState.ensureSessionReady()
  assertFullTabs(snapshot.status, '老用户保留完整 Tab')

  for (const route of [
    'pages/index/index',
    'pages/story/story',
    'pages/photo/photo',
    'pages/message/message',
  ]) {
    navigations.length = 0
    const allowed = await accessControl.guardPageReady(route)
    assert.equal(allowed, true, route)
    assert.equal(navigations.length, 0, `${route} 不应跳转`)
  }
})

test('验收 14：状态来源唯一——Tab 只由 session-state 状态推导', () => {
  // 同一状态在任何时刻都得到相同的 Tab 集合，避免页面之间不一致。
  const statuses = [
    SESSION_STATUS.LOADING,
    SESSION_STATUS.UNAUTHENTICATED,
    SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE,
    SESSION_STATUS.ERROR,
  ]
  statuses.forEach((status) => {
    assert.equal(tabCount(status), 2, status)
    assert.equal(tabCount(status), tabCount(status))
  })
  assert.equal(tabCount(SESSION_STATUS.AUTHENTICATED_WITH_SPACE), 6)
})

test('验收 15：创建空间过程中的 $PAGE_ACCESS 表覆盖 app.json 全部页面', async () => {
  const { readFileSync } = await import('node:fs')
  const appJson = JSON.parse(readFileSync('miniprogram/app.json', 'utf8'))
  const { PAGE_ACCESS_BY_ROUTE } = await import('../miniprogram/utils/session-rules.js')

  appJson.pages.forEach((page) => {
    assert.ok(
      Object.prototype.hasOwnProperty.call(PAGE_ACCESS_BY_ROUTE, page),
      `页面 ${page} 未在访问级别表中声明`,
    )
  })
  // 反向：表里不应有未注册的页面（避免拼写错误导致守卫失效）。
  Object.keys(PAGE_ACCESS_BY_ROUTE).forEach((route) => {
    assert.ok(appJson.pages.indexOf(route) !== -1, `访问级别表里的 ${route} 未在 app.json 注册`)
  })
})
