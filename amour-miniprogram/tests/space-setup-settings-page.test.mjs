import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * 情侣空间页「设置模式」（?mode=settings）页面级行为测试。
 *
 * 用最小的小程序运行时桩（wx / Page）加载真实页面定义，覆盖本次新增能力：
 * 1. 设置模式 + 已有空间且等待另一半（status=0）→ 停留本页，不 reLaunch 到首页，
 *    展示邀请管理与销毁入口；
 * 2. 设置模式 + 已有空间且另一半已加入（status=1, memberCount=2）→ 仍停留本页，
 *    canDestroyNow=false 且 destroyBlockReason 含「另一半已加入」；
 * 3. 设置模式 onShow（再次 applySnapshot）后仍不跳走；
 * 4. 设置模式 + 已登录无空间 → 展示创建 / 绑定引导，不自动跳走；
 * 5. 设置模式 + ERROR 快照 → 展示 pageError 与重试入口；
 * 6. 设置模式 + 未登录 → 有可理解的提示（且不因设置模式自行跳首页）；
 * 7. 非设置模式回归：创建成功等待绑定 → 停留并生成邀请；
 *    绑定成功 status=1 → 仍然 reLaunch 到 /pages/index/index；
 * 8. 销毁请求携带 spaceId，且 20103 会触发状态重新同步；
 * 9. 返回兜底：页面栈为空时导航栏返回会 reLaunch 到「我的」。
 */

const spaceSetupJs = readFileSync(
  new URL('../miniprogram/pages/space-setup/index.js', import.meta.url),
  'utf8',
)
const spaceSetupWxml = readFileSync(
  new URL('../miniprogram/pages/space-setup/index.wxml', import.meta.url),
  'utf8',
)

const storage = new Map()
const requests = []
const handlers = new Map()
const toasts = []
const navigations = []
let pageOptions = null
let currentPages = [{ route: 'pages/space-setup/index', options: {} }]

/** 把完整请求地址归一化为接口路径（去掉域名与 /api 前缀）。 */
function normalizePath(url) {
  return String(url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '')
}

/**
 * 二次确认弹窗队列：每次 wx.showModal 调用按顺序消费一个结果。
 *
 * - 'cancel'：用户点取消（confirm=false）；
 * - { confirm: true, content }：确认并带回输入内容（第二步逐字输入）。
 * 队列为空时默认『取消』，避免测试意外触发真实销毁请求。
 */
const modalResults = []
let modalCalls = []

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
    showModal(options) {
      modalCalls.push(options)
      const result = modalResults.shift()
      const outcome = result === undefined ? { confirm: false, cancel: true } : result
      const callback = options && typeof options.success === 'function' ? options.success : null
      // 真实 wx.showModal 是异步回调：必须异步触发，否则「确认框打开期间再次点击」
      // 这种真实时序在测试里无法复现（同步回调会让整条确认链在同一次调用内走完）。
      if (callback) {
        queueMicrotask(() => callback(outcome))
      }
    },
    reLaunch(options) {
      navigations.push({ type: 'reLaunch', url: options && options.url })
    },
    navigateTo(options) {
      navigations.push({ type: 'navigateTo', url: options && options.url })
    },
    redirectTo(options) {
      navigations.push({ type: 'redirectTo', url: options && options.url })
    },
    navigateBack(options) {
      navigations.push({ type: 'navigateBack', url: 'back' })
      if (currentPages.length <= 1 && options && options.fail) options.fail({ errMsg: 'navigateBack:fail' })
    },
    setClipboardData(options) {
      if (options && options.success) options.success({})
    },
  }
}

installWx()

globalThis.getApp = () => ({ globalData: {} })
globalThis.getCurrentPages = () => currentPages
globalThis.Page = (options) => {
  pageOptions = options
}

const sessionState = await import('../miniprogram/utils/session-state.js')
const { SESSION_STATUS, SPACE_STATUS } = await import('../miniprogram/utils/session-constants.js')
await import('../miniprogram/pages/space-setup/index.js')

function ok(data) {
  return { statusCode: 200, data: { success: true, data } }
}

function fail500() {
  return { statusCode: 500, data: { success: false, message: '服务异常' } }
}

/** 等待另一半加入的空间（status=0，创建者本人）。 */
const WAITING_SPACE = {
  spaceId: 101,
  status: SPACE_STATUS.WAITING,
  spaceName: '我们的故事',
  memberCount: 1,
  creator: true,
  canInvite: true,
}

/** 另一半已加入的正常空间（status=1，创建者本人）。 */
const NORMAL_SPACE = {
  spaceId: 202,
  status: SPACE_STATUS.NORMAL,
  spaceName: '两个人的空间',
  memberCount: 2,
  creator: true,
  canInvite: false,
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
  for (let index = 0; index < 10; index += 1) await flush()
}

/** 设置登录态桩：/user/profile + 指定的 /space/status 实现。 */
function stubSession(spaceStatusHandler) {
  storage.set('amour_token', 'token-a')
  handlers.set('/user/profile', (options) => options.success(ok({
    username: 'u', displayName: '测试用户', avatar: '', passwordSet: false, permissions: [],
  })))
  handlers.set('/space/status', spaceStatusHandler)
}

/** 把全局状态推进到「已登录 + 指定空间（null=无空间）」。 */
async function loginWithSpace(space) {
  stubSession(options => options.success(ok(space)))
  await sessionState.ensureSessionReady()
  return sessionState.getSnapshot()
}

/** 打开页面并等待首次状态确认完成。 */
async function openPage(query) {
  const page = createPage()
  page.onLoad(query || {})
  await flushAll()
  assert.equal(page.data.loading, false, '首次状态确认应当结束')
  return page
}

/** 页面是否曾经跳去过情侣空间首页。 */
const navigatedToSpaceHome = () => navigations.some(item => item.url === '/pages/index/index')

test.beforeEach(() => {
  storage.clear()
  requests.length = 0
  handlers.clear()
  toasts.length = 0
  navigations.length = 0
  modalResults.length = 0
  modalCalls = []
  currentPages = [{ route: 'pages/profile/profile', options: {} }, { route: 'pages/space-setup/index', options: {} }]
  sessionState.resetForTests()
  installWx()
})

// ============================ 设置模式：已有空间 ============================

test('设置模式 + 等待另一半（status=0）：停留本页，不跳首页，展示邀请与销毁入口', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/invitation/create', options => options.success(ok({ invitationId: 1, token: 'invite-token' })))

  const page = await openPage({ mode: 'settings' })

  assert.equal(page.data.isSettingsMode, true)
  assert.equal(page.data.viewMode, 'settings')
  assert.equal(page.data.settingsView, 'waiting')
  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.waiting, true)
  assert.equal(page.data.memberCount, 1)
  // 设置模式不得把用户踢回情侣空间首页。
  assert.equal(
    navigations.some(item => item.url === '/pages/index/index'),
    false,
    `设置模式不应跳转，实际跳转：${JSON.stringify(navigations)}`,
  )
  // 邀请管理可用，销毁入口可用。
  assert.equal(page.data.canManageInvitations, true)
  assert.equal(page.data.canInviteNow, true)
  assert.equal(page.data.showDestroyEntry, true)
  assert.equal(page.data.canDestroyNow, true)
  assert.equal(page.data.destroyBlockReason, '')
  // 标题区分「空间设置」。
  assert.equal(page.data.pageTitle, '空间设置')

  // 设置模式可以真正生成邀请。
  await page.generateInvitationLink()
  await flushAll()
  assert.ok(page.data.createdInvitationLink.indexOf('token=invite-token') !== -1, page.data.createdInvitationLink)
  assert.ok(requests.some(item => item.path === '/space/invitation/create'))
})

test('设置模式提供内容编辑入口：等待绑定与已绑定都可进入空间编辑工作台', async () => {
  await loginWithSpace(WAITING_SPACE)
  const waitingPage = await openPage({ mode: 'settings' })
  navigations.length = 0
  waitingPage.onOpenStudio()
  const waitingNav = navigations[navigations.length - 1]
  assert.equal(waitingNav.type, 'navigateTo')
  assert.equal(waitingNav.url, '/pages/space-studio/index')

  await loginWithSpace(NORMAL_SPACE)
  const readyPage = await openPage({ mode: 'settings' })
  navigations.length = 0
  readyPage.onOpenStudio()
  const readyNav = navigations[navigations.length - 1]
  assert.equal(readyNav.type, 'navigateTo')
  assert.equal(readyNav.url, '/pages/space-studio/index')
})

test('设置模式 + 另一半已加入（status=1, memberCount=2）：停留本页，不能销毁且给出明确原因', async () => {
  await loginWithSpace(NORMAL_SPACE)

  const page = await openPage({ mode: 'settings' })

  assert.equal(page.data.isSettingsMode, true)
  assert.equal(page.data.settingsView, 'ready')
  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.waiting, false)
  assert.equal(page.data.memberCount, 2)
  assert.equal(navigatedToSpaceHome(), false, `设置模式不应跳转，实际跳转：${JSON.stringify(navigations)}`)
  // 不能销毁，且原因明确可读。
  assert.equal(page.data.canDestroyNow, false)
  assert.equal(page.data.showDestroyEntry, false)
  assert.match(page.data.destroyBlockReason, /另一半已加入/)
  // 不展示邀请生成入口（服务端也会拒绝）。
  assert.equal(page.data.canManageInvitations, false)
  assert.equal(page.data.canInviteNow, false)
})

test('设置页不展示冗余的「已就绪」状态文案', () => {
  assert.doesNotMatch(spaceSetupJs, /已就绪/)
  assert.doesNotMatch(spaceSetupWxml, /已就绪/)
})

test('设置模式 onShow 之后（再次 applySnapshot）仍然不跳走', async () => {
  await loginWithSpace(NORMAL_SPACE)
  const page = await openPage({ mode: 'settings' })
  assert.equal(navigatedToSpaceHome(), false)

  // 模拟从其它页面 / 后台回到本页：onShow 会重新 applySnapshot。
  page.onShow()
  await flushAll()
  // 再显式走一次非 silent 的 applySnapshot（旧实现正是在这里 reLaunch）。
  page.applySnapshot(sessionState.getSnapshot())
  await flushAll()

  assert.equal(navigatedToSpaceHome(), false, `onShow 后不应跳转，实际跳转：${JSON.stringify(navigations)}`)
  assert.equal(page.data.settingsView, 'ready')
})

test('设置模式 + 已登录但没有空间：展示创建 / 绑定引导，不自动跳走', async () => {
  await loginWithSpace(null)

  const page = await openPage({ mode: 'settings' })

  assert.equal(page.data.isSettingsMode, true)
  assert.equal(page.data.settingsView, 'empty')
  assert.equal(page.data.hasSpace, false)
  assert.equal(page.data.pageError, '')
  assert.equal(navigations.length, 0, `不应自动跳转，实际跳转：${JSON.stringify(navigations)}`)
  // 页面提供创建 / 绑定入口（走统一 access-control 入口）。
  assert.equal(typeof page.onCreateMode, 'function')
  assert.equal(typeof page.onBindMode, 'function')

  page.onCreateMode()
  const last = navigations[navigations.length - 1]
  assert.equal(last.type, 'navigateTo')
  assert.ok(last.url.indexOf('/pages/space-setup/index?action=create') === 0, last.url)
})

test('设置模式 + ERROR 快照：展示 pageError 与重试入口，不跳走', async () => {
  stubSession(options => options.success(fail500()))
  await sessionState.ensureSessionReady()
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.ERROR)

  const page = await openPage({ mode: 'settings' })

  assert.equal(page.data.isSettingsMode, true)
  assert.ok(page.data.pageError.length > 0, '应展示页面错误文案')
  assert.equal(page.data.settingsView, 'error')
  assert.equal(navigatedToSpaceHome(), false, `错误态不应跳转，实际跳转：${JSON.stringify(navigations)}`)
  assert.equal(typeof page.onRetryPage, 'function')

  // 重试：/space/status 恢复后进入等待绑定面板并停留在本页。
  handlers.set('/space/status', options => options.success(ok(WAITING_SPACE)))
  await page.onRetryPage()
  await flushAll()

  assert.equal(page.data.pageError, '')
  assert.equal(page.data.settingsView, 'waiting')
  assert.equal(navigatedToSpaceHome(), false)
})

test('设置模式 + 未登录：给出可理解的提示，且不因设置模式自动跳首页', async () => {
  sessionState.resetForTests()
  sessionState.handleAuthCleared('test')
  assert.equal(sessionState.getSnapshot().status, SESSION_STATUS.UNAUTHENTICATED)

  const page = await openPage({ mode: 'settings' })

  // 守卫会把用户送去登录页（既有行为）。
  const loginNav = navigations.find(item => String(item.url).indexOf('/pages/login/login') !== -1)
  assert.ok(loginNav, `未登录应跳登录页，实际跳转：${JSON.stringify(navigations)}`)
  assert.equal(navigatedToSpaceHome(), false)
  // 页面自身也有可理解的兜底提示（不是空白）。
  assert.equal(page.data.pageTitle, '空间设置')
  assert.ok(page.data.heroTitle.length > 0)
})

// ============================ 非设置模式回归 ============================

test('回归：非设置模式创建成功且等待绑定 → 停留本页并生成邀请', async () => {
  await loginWithSpace(null)
  handlers.set('/space/create', options => options.success(ok(WAITING_SPACE)))
  handlers.set('/space/status', options => options.success(ok(WAITING_SPACE)))
  handlers.set('/space/invitation/create', options => options.success(ok({ invitationId: 1, token: 'invite-token' })))

  const page = await openPage({ action: 'create' })
  assert.equal(page.data.isSettingsMode, false)
  assert.equal(page.data.viewMode, 'create')
  page.onNameInput({ detail: { value: '我们的故事' } })
  await page.onCreate()
  await flushAll()

  assert.equal(page.data.hasSpace, true)
  assert.equal(page.data.waiting, true)
  assert.equal(navigatedToSpaceHome(), false, '等待绑定时应留在本页展示邀请')
  assert.ok(page.data.createdInvitationLink.indexOf('invite-token') !== -1, page.data.createdInvitationLink)
})

test('回归：非设置模式绑定成功且 status=1 → 仍然 reLaunch 到情侣空间首页', async () => {
  await loginWithSpace(null)
  handlers.set('/space/invitation/accept', options => options.success(ok(NORMAL_SPACE)))
  handlers.set('/space/status', options => options.success(ok(NORMAL_SPACE)))

  const page = await openPage({ action: 'bind' })
  assert.equal(page.data.isSettingsMode, false)
  page.onInvitationInput({ detail: { value: 'invite-token' } })
  await page.onAcceptByToken()
  await flushAll()

  assert.ok(navigatedToSpaceHome(), `非设置模式绑定成功应跳首页，实际跳转：${JSON.stringify(navigations)}`)
})

test('回归：非设置模式已有空间时仍会 reLaunch 到情侣空间首页（旧行为不变）', async () => {
  await loginWithSpace(NORMAL_SPACE)
  const page = await openPage({})
  assert.equal(page.data.isSettingsMode, false)
  assert.ok(navigatedToSpaceHome(), `实际跳转：${JSON.stringify(navigations)}`)
})

// ============================ 销毁契约 ============================

test('销毁请求携带当前空间的 spaceId，成功后仍然 reLaunch 到恋爱广场', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/destroy', options => options.success(ok({ spaceId: 101, status: 6, destroyed: true })))
  handlers.set('/space/status', options => options.success(ok(null)))

  const page = await openPage({ mode: 'settings' })
  await page.destroySpace()
  await flushAll()

  const destroyRequests = requests.filter(item => item.path === '/space/destroy')
  assert.equal(destroyRequests.length, 1)
  assert.equal(destroyRequests[0].data.spaceId, WAITING_SPACE.spaceId)
  const last = navigations[navigations.length - 1]
  assert.equal(last.type, 'reLaunch')
  assert.ok(String(last.url).indexOf('/pages/plaza/index') !== -1, last.url)
})

test('销毁被 20103（目标空间已变化）拒绝：提示后强制重新同步状态', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/destroy', options => options.success({
    statusCode: 200,
    data: { success: false, errorCode: '20103', message: '目标空间已变化' },
  }))
  // 重新同步时服务端告知真正的当前空间是另一个。
  handlers.set('/space/status', options => options.success(ok(NORMAL_SPACE)))

  const page = await openPage({ mode: 'settings' })
  const statusRequestsBefore = requests.filter(item => item.path === '/space/status').length
  await page.destroySpace()
  await flushAll()

  assert.ok(page.data.destroyError.length > 0, '应展示销毁失败提示')
  assert.match(page.data.destroyError, /已经发生变化|刷新/)
  const statusRequestsAfter = requests.filter(item => item.path === '/space/status').length
  assert.ok(statusRequestsAfter > statusRequestsBefore, '20103 必须触发一次状态重新同步')
  // 刷新后按真实状态展示（另一半已加入），仍然停留在设置页。
  assert.equal(page.data.settingsView, 'ready')
  assert.equal(navigatedToSpaceHome(), false)
})

// ============================ 二次确认 / 重复提交 ============================

test('第一步确认点取消：不发销毁请求、不改状态、不跳转', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/destroy', options => options.success(ok({ spaceId: 101, status: 6, destroyed: true })))

  const page = await openPage({ mode: 'settings' })
  navigations.length = 0
  requests.length = 0
  modalResults.push({ confirm: false, cancel: true })

  page.onDestroySpace()
  await flushAll()

  assert.equal(requests.filter(item => item.path === '/space/destroy').length, 0,
    '取消确认后绝不能发出销毁请求')
  assert.equal(page.data.destroying, false, '取消后不应进入提交中状态')
  assert.equal(page.data.hasSpace, true, '取消后本地空间状态必须保持不变')
  assert.equal(page.data.destroyError, '', '取消不是失败，不应出现错误文案')
  assert.equal(navigations.length, 0, '取消后不得跳转')
  // 也不应弹出「已销毁」之类的成功提示。
  assert.equal(toasts.some(title => String(title).indexOf('已销毁') !== -1), false)
})

test('第二步输入错误确认文案：不发请求并提示，页面保持可重试', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/destroy', options => options.success(ok({ spaceId: 101, status: 6, destroyed: true })))

  const page = await openPage({ mode: 'settings' })
  requests.length = 0
  // 第一步确认，第二步输入错误内容。
  modalResults.push({ confirm: true })
  modalResults.push({ confirm: true, content: '取消' })

  page.onDestroySpace()
  await flushAll()

  assert.equal(requests.filter(item => item.path === '/space/destroy').length, 0,
    '确认文案不匹配时绝不能发请求')
  assert.equal(toasts.some(title => /准确输入/.test(String(title))), true, '应提示需准确输入')
  assert.equal(page.data.destroying, false)
  assert.equal(page.data.hasSpace, true)
})

test('完整确认（第一步确认 + 第二步输入“销毁”）才会真正发出请求', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/destroy', options => options.success(ok({ spaceId: 101, status: 6, destroyed: true })))
  handlers.set('/space/status', options => options.success(ok(null)))

  const page = await openPage({ mode: 'settings' })
  requests.length = 0
  modalResults.push({ confirm: true })
  modalResults.push({ confirm: true, content: '销毁' })

  page.onDestroySpace()
  await flushAll()

  const destroyRequests = requests.filter(item => item.path === '/space/destroy')
  assert.equal(destroyRequests.length, 1, '两步确认完成后应恰好发一次请求')
  assert.equal(destroyRequests[0].data.spaceId, WAITING_SPACE.spaceId)
  const last = navigations[navigations.length - 1]
  assert.equal(last.type, 'reLaunch')
  assert.ok(String(last.url).indexOf('/pages/plaza/index') !== -1, last.url)
})

test('连续点击销毁（确认为取消）：只打开一组确认框，不会堆积多次提交', async () => {
  await loginWithSpace(WAITING_SPACE)

  const page = await openPage({ mode: 'settings' })
  requests.length = 0
  modalCalls = []
  // 三次点击都按取消处理：若实现正确，第二次起会被 destroying 或前置判断挡住。
  modalResults.push({ confirm: false, cancel: true })
  modalResults.push({ confirm: false, cancel: true })
  modalResults.push({ confirm: false, cancel: true })

  page.onDestroySpace()
  page.onDestroySpace()
  page.onDestroySpace()
  await flushAll()

  assert.equal(requests.filter(item => item.path === '/space/destroy').length, 0,
    '全部取消时不得发请求')
  assert.ok(modalCalls.length <= 1, `连续点击不应触发多次确认框，实际：${modalCalls.length}`)
})

test('提交中再次点击销毁：不会发出第二次请求', async () => {
  await loginWithSpace(WAITING_SPACE)
  let releaseDestroy = null
  handlers.set('/space/destroy', (options) => {
    releaseDestroy = () => options.success(ok({ spaceId: 101, status: 6, destroyed: true }))
  })
  handlers.set('/space/status', options => options.success(ok(null)))

  const page = await openPage({ mode: 'settings' })
  requests.length = 0
  modalCalls = []
  modalResults.push({ confirm: true })
  modalResults.push({ confirm: true, content: '销毁' })
  modalResults.push({ confirm: true })
  modalResults.push({ confirm: true, content: '销毁' })

  page.onDestroySpace()
  await flushAll()
  assert.equal(page.data.destroying, true, '请求在途时应处于提交中状态')

  // 提交期间再次点击：必须被 destroying 挡住，不打开新的确认框。
  page.onDestroySpace()
  await flushAll()
  assert.equal(modalCalls.length, 2, `提交期间不应再打开确认框，实际：${modalCalls.length}`)

  releaseDestroy()
  await flushAll()

  assert.equal(requests.filter(item => item.path === '/space/destroy').length, 1,
    '连续提交只能发出一次销毁请求')
  assert.equal(page.data.destroying, false)
})

test('销毁请求网络失败：展示可理解提示，释放提交状态，允许重试', async () => {
  await loginWithSpace(WAITING_SPACE)
  handlers.set('/space/destroy', options => options.fail({ errMsg: 'request:fail timeout' }))

  const page = await openPage({ mode: 'settings' })
  requests.length = 0
  navigations.length = 0
  modalResults.push({ confirm: true })
  modalResults.push({ confirm: true, content: '销毁' })

  page.onDestroySpace()
  await flushAll()

  assert.equal(page.data.destroying, false, '失败后必须释放提交状态')
  assert.ok(page.data.destroyError.length > 0, '应展示失败原因')
  assert.equal(page.data.hasSpace, true, '失败时不得本地伪造已销毁')
  assert.equal(navigations.length, 0, '失败时不得跳转')
})

// ============================ 返回兜底 ============================

test('页面栈为空（分享 / 扫码直达）时，导航栏返回兜底 reLaunch 到「我的」', async () => {
  await loginWithSpace(NORMAL_SPACE)
  currentPages = [{ route: 'pages/space-setup/index', options: {} }]

  const page = await openPage({ mode: 'settings' })
  navigations.length = 0

  page.onNavBack()
  await flushAll()

  const last = navigations[navigations.length - 1]
  assert.ok(last, '栈底返回应给出兜底跳转')
  assert.equal(last.type, 'reLaunch')
  assert.ok(String(last.url).indexOf('/pages/profile/profile') !== -1, last.url)
})

test('页面栈不为空时导航栏返回交给组件自身的 navigateBack（页面不额外跳转）', async () => {
  await loginWithSpace(NORMAL_SPACE)
  currentPages = [{ route: 'pages/profile/profile', options: {} }, { route: 'pages/space-setup/index', options: {} }]

  const page = await openPage({ mode: 'settings' })
  navigations.length = 0

  page.onNavBack()
  await flushAll()

  assert.equal(navigations.length, 0, `栈内返回不应额外跳转，实际：${JSON.stringify(navigations)}`)
})
