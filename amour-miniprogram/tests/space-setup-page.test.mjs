import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 情侣空间创建 / 绑定页面级行为测试。
 *
 * 用最小的小程序运行时桩（wx / Page）加载真实页面定义，覆盖本次修复的核心场景：
 * 1. 创建成功且 /space/status 同步成功 → 提示创建成功、hasSpace 为真；
 * 2. 创建成功但 /space/status 失败（500 / 网络错误）→ 不误报“创建失败”、
 *    不回退成“未创建”，展示独立同步错误并提供重试恢复；
 * 3. 创建接口业务失败 → createError 展示后端 message，hasSpace 保持 false；
 * 4. 连续 / 并发触发创建只发出一次 /space/create 请求；
 * 5. 创建成功但 body.data 为空对象时仍不误报创建失败，以刷新结果为准；
 * 6. 绑定接口成功但同步失败时不再误报“绑定结果暂未同步”；
 * 7. 页面卸载后不再 setData。
 */

const storage = new Map()
const requests = []
/** 每个接口的响应实现：path -> (options) => void */
const handlers = new Map()
const toasts = []
const navigations = []
let pageOptions = null

/** 把完整请求地址归一化为接口路径（去掉域名与 /api 前缀）。 */
function normalizePath(url) {
  return String(url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '')
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
      const handler = handlers.get(path)
      if (!handler) {
        // 未注册的请求：默认成功返回空数据，避免测试挂起。
        options.success({ statusCode: 200, data: { success: true, data: null } })
        return
      }
      handler(options)
    },
    login(options) {
      if (options && options.success) options.success({ code: 'mock-wechat-code' })
    },
    showToast(options) {
      toasts.push(options && options.title)
    },
    reLaunch(options) {
      navigations.push(options && options.url)
    },
    navigateTo(options) {
      navigations.push(options && options.url)
    },
    setClipboardData(options) {
      if (options && options.success) options.success({})
    },
  }
}

installWx()

globalThis.getApp = () => ({ globalData: {} })
globalThis.getCurrentPages = () => [{ route: 'pages/space-setup/index', options: {} }]
globalThis.Page = (options) => {
  pageOptions = options
}

const sessionState = await import('../miniprogram/utils/session-state.js')
const { SESSION_STATUS } = await import('../miniprogram/utils/session-constants.js')
await import('../miniprogram/pages/space-setup/index.js')

function ok(data) {
  return { statusCode: 200, data: { success: true, data } }
}

function fail500() {
  return { statusCode: 500, data: { success: false, message: '服务异常' } }
}

const WAITING_SPACE = {
  spaceId: 101,
  status: 0,
  spaceName: '我们的故事',
  memberCount: 1,
  currentUserRole: 1,
}

const NORMAL_SPACE = {
  spaceId: 202,
  status: 1,
  spaceName: '两个人的空间',
  memberCount: 2,
  currentUserRole: 1,
}

/** 创建一个最小页面实例：setData 支持简单键与 a.b 路径。 */
function createPage() {
  if (!pageOptions) throw new Error('页面未注册')
  const instance = Object.create(null)
  Object.keys(pageOptions).forEach((key) => {
    instance[key] = pageOptions[key]
  })
  instance.data = JSON.parse(JSON.stringify(pageOptions.data))
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
  return instance
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const flushAll = async () => {
  for (let index = 0; index < 8; index += 1) await flush()
}

const createRequests = () => requests.filter(item => item.path === '/space/create')
const statusRequests = () => requests.filter(item => item.path === '/space/status')

/** 把全局状态推进到“已登录但没有情侣空间”，页面守卫才会放行。 */
async function loginWithoutSpace() {
  storage.set('amour_token', 'token-a')
  handlers.set('/user/profile', (options) => options.success(ok({
    username: 'u', displayName: '测试用户', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', (options) => options.success(ok(null)))
  await sessionState.ensureSessionReady()
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE)
}

/** 打开创建 / 绑定页并等待首次状态确认完成。 */
async function openPage() {
  const page = createPage()
  page.onLoad({ action: 'create' })
  await flushAll()
  assert.equal(page.data.loading, false)
  return page
}

test.beforeEach(() => {
  storage.clear()
  requests.length = 0
  handlers.clear()
  toasts.length = 0
  navigations.length = 0
  sessionState.resetForTests()
  installWx()
})

// ============================ 创建 ============================

test('创建成功且状态同步成功：提示创建成功，hasSpace 为真，无创建失败文案', async () => {
  await loginWithoutSpace()
  handlers.set('/space/create', options => options.success(ok(WAITING_SPACE)))
  handlers.set('/space/status', options => options.success(ok(WAITING_SPACE)))
  handlers.set('/space/invitation/create', options => options.success(ok({ invitationId: 1, token: 'invite-token' })))

  const page = await openPage()
  assert.equal(page.data.hasSpace, false)
  page.onNameInput({ detail: { value: '我们的故事' } })
  await page.onCreate()
  await flushAll()

  assert.equal(createRequests().length, 1)
  assert.ok(
    toasts.some(title => String(title).indexOf('创建成功') !== -1),
    `应提示创建成功，实际 toast：${toasts.join(' / ')}`,
  )
  assert.equal(page.data.createError, '')
  assert.equal(page.data.syncError, '')
  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.waiting, true)
  assert.equal(page.data.creating, false)
})

test('创建成功但 /space/status 返回 500：不误报创建失败、不回退未创建、可重试恢复', async () => {
  await loginWithoutSpace()
  handlers.set('/space/create', options => options.success(ok(WAITING_SPACE)))
  handlers.set('/space/status', options => options.success(fail500()))
  handlers.set('/space/invitation/create', options => options.success(ok({ invitationId: 1, token: 'invite-token' })))

  const page = await openPage()
  page.onNameInput({ detail: { value: '我们的故事' } })
  await page.onCreate()
  await flushAll()

  // 创建接口明确成功：本页必须先进入“已创建”，且绝不展示创建失败。
  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.createError, '')
  assert.equal(page.data.loading, false)
  assert.equal(page.data.creating, false)
  // 独立的同步错误提示（与创建失败区分）。
  assert.ok(page.data.syncError.length > 0)
  assert.ok(page.data.syncErrorTitle.indexOf('已创建') !== -1, `同步错误标题：${page.data.syncErrorTitle}`)
  // 不应出现任何“失败”类 toast（同步失败不能升级成创建失败）。
  assert.equal(toasts.some(title => /失败/.test(String(title))), false)

  // 已创建成功后不允许重复提交：再点一次也不会发第二次 /space/create。
  await page.onCreate()
  await flushAll()
  assert.equal(createRequests().length, 1)

  // 重试同步：/space/status 恢复后同步错误清除、hasSpace 保持 true。
  handlers.set('/space/status', options => options.success(ok(WAITING_SPACE)))
  await page.onRetrySync()
  await flushAll()

  assert.equal(page.data.syncError, '')
  assert.equal(page.data.syncErrorTitle, '')
  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.waiting, true)
  assert.equal(page.data.createError, '')
  assert.ok(toasts.some(title => String(title).indexOf('状态已同步') !== -1))
})

test('创建成功但 /space/status 网络异常：同样保留已创建状态并可重试', async () => {
  await loginWithoutSpace()
  handlers.set('/space/create', options => options.success(ok(WAITING_SPACE)))
  handlers.set('/space/status', options => options.fail({ errMsg: 'request:fail timeout' }))
  handlers.set('/space/invitation/create', options => options.success(ok({ invitationId: 1, token: 'invite-token' })))

  const page = await openPage()
  page.onNameInput({ detail: { value: '我们的故事' } })
  await onCreateAndSettle(page)

  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.createError, '')
  assert.ok(page.data.syncError.length > 0)

  handlers.set('/space/status', options => options.success(ok(WAITING_SPACE)))
  await page.onRetrySync()
  await flushAll()

  assert.equal(page.data.syncError, '')
  assert.equal(page.data.hasSpace, true)
})

test('创建接口业务失败（20033）：展示后端 message，hasSpace 保持 false', async () => {
  await loginWithoutSpace()
  handlers.set('/space/create', options => options.success({
    statusCode: 200,
    data: { success: false, errorCode: '20033', message: '你已经加入了一个情侣空间' },
  }))

  const page = await openPage()
  page.onNameInput({ detail: { value: '我们的故事' } })
  await onCreateAndSettle(page)

  assert.equal(page.data.hasSpace, false)
  assert.equal(page.data.createError, '你已经加入了一个情侣空间')
  assert.equal(page.data.creating, false)
  assert.equal(page.data.syncError, '')
  assert.equal(createRequests().length, 1)
})

test('创建接口 HTTP 异常同样只展示创建错误，不进入“已创建”状态', async () => {
  await loginWithoutSpace()
  handlers.set('/space/create', options => options.success(fail500()))

  const page = await openPage()
  page.onNameInput({ detail: { value: '我们的故事' } })
  await onCreateAndSettle(page)

  assert.equal(page.data.hasSpace, false)
  assert.ok(page.data.createError.length > 0)
  assert.equal(page.data.creating, false)
})

test('连续 / 并发触发创建只发出一次 /space/create 请求', async () => {
  await loginWithoutSpace()
  handlers.set('/space/status', options => options.success(ok(WAITING_SPACE)))
  handlers.set('/space/invitation/create', options => options.success(ok({ invitationId: 1, token: 'invite-token' })))
  let releaseCreate = null
  handlers.set('/space/create', (options) => {
    releaseCreate = () => options.success(ok(WAITING_SPACE))
  })

  const page = await openPage()
  page.onNameInput({ detail: { value: '我们的故事' } })
  const first = page.onCreate()
  const second = page.onCreate()
  // 重复点击（创建请求仍在途）。
  const third = page.onCreate()
  await flushAll()

  assert.equal(createRequests().length, 1)
  assert.equal(page.data.creating, true)

  releaseCreate()
  await Promise.all([first, second, third])
  await flushAll()

  assert.equal(createRequests().length, 1)
  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.creating, false)
})

test('创建成功但 body.data 为空对象：不误报创建失败，以刷新结果为准', async () => {
  await loginWithoutSpace()
  handlers.set('/space/create', options => options.success(ok({})))
  handlers.set('/space/status', options => options.success(ok(NORMAL_SPACE)))

  const page = await openPage()
  page.onNameInput({ detail: { value: '我们的故事' } })
  await onCreateAndSettle(page)

  assert.equal(page.data.createError, '')
  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.space && page.data.space.spaceId, NORMAL_SPACE.spaceId)
  assert.ok(toasts.some(title => String(title).indexOf('创建成功') !== -1))
})

// ============================ 绑定 ============================

test('绑定接口成功但状态同步失败：不误报“绑定结果暂未同步”，重试后恢复', async () => {
  await loginWithoutSpace()
  handlers.set('/space/invitation/accept', options => options.success(ok(NORMAL_SPACE)))
  handlers.set('/space/status', options => options.success(fail500()))

  const page = await openPage()
  page.onInvitationInput({ detail: { value: 'invite-token' } })
  await page.onAcceptByToken()
  await flushAll()

  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.bindError, '')
  // 旧的误报文案不应再出现。
  assert.equal(String(page.data.pageError).indexOf('绑定结果暂未同步'), -1)
  assert.ok(page.data.syncErrorTitle.indexOf('已加入') !== -1, `同步错误标题：${page.data.syncErrorTitle}`)
  assert.equal(toasts.some(title => /绑定.*失败|失败$/.test(String(title))), false)

  handlers.set('/space/status', options => options.success(ok(NORMAL_SPACE)))
  await page.onRetrySync()
  await flushAll()

  assert.equal(page.data.syncError, '')
  assert.equal(page.data.hasSpace, true)
  assert.ok(navigations.indexOf('/pages/index/index') !== -1, `实际跳转：${navigations.join(' / ')}`)
})

test('同步时返回 401：按既有语义收敛为未登录，不吞掉真实错误也不残留已创建状态', async () => {
  await loginWithoutSpace()
  handlers.set('/space/create', options => options.success(ok(WAITING_SPACE)))
  handlers.set('/space/status', options => options.success({
    statusCode: 401,
    data: { success: false, errorCode: '20002', message: '无访问权限，请先登录！' },
  }))

  const page = await openPage()
  page.onNameInput({ detail: { value: '我们的故事' } })
  await onCreateAndSettle(page)

  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.UNAUTHENTICATED)
  // 登录态失效：本页不再保留“已创建”状态（由页面守卫 / 登录页接管）。
  assert.equal(page.data.hasSpace, false)
  assert.equal(page.data.createError, '')
})

// ============================ 生命周期 ============================

test('页面卸载后不再 setData', async () => {
  await loginWithoutSpace()
  let releaseCreate = null
  handlers.set('/space/create', (options) => {
    releaseCreate = () => options.success(ok(WAITING_SPACE))
  })

  const page = await openPage()
  page.onNameInput({ detail: { value: '我们的故事' } })
  const pending = page.onCreate()
  page.onUnload()
  const snapshot = JSON.parse(JSON.stringify(page.data))

  releaseCreate()
  await pending
  await flushAll()

  assert.deepEqual(page.data, snapshot)
})

/** 触发创建并等待同步流程结束。 */
async function onCreateAndSettle(page) {
  await page.onCreate()
  await flushAll()
}
