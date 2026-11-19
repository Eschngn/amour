import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * 小程序空间编辑工作台的页面级测试。
 *
 * 用最小运行时桩加载真实页面定义，覆盖：
 * - app.json / PAGE_ACCESS 双向注册；
 * - 无空间时守卫拦截；
 * - 等待绑定创建者进入、栏目权限过滤与 tab 回退；
 * - 首页读取 /space/home/query、保存 /space/home/save 的契约；
 * - 审核中的保存提示不会被误报成已公开；
 * - 图片选择后走 /space/media/upload，表单只保存服务器 URL；
 * - 业务冲突错误会刷新空间状态。
 */

const storage = new Map()
const requests = []
const handlers = new Map()
const navigations = []
const toasts = []
const modalResults = []
let pageOptions = null
let uploadCount = 0

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
    requests.push({ method: options.method || 'GET', path, data: options.data })
    const handler = handlers.get(path)
    if (!handler) {
      options.success({ statusCode: 200, data: { success: true, data: null } })
      return
    }
    handler(options)
  },
  uploadFile(options) {
    uploadCount += 1
    options.success({
      statusCode: 200,
      data: JSON.stringify({ success: true, data: { url: 'https://cdn.example.com/uploaded.png' } }),
    })
  },
  chooseMedia(options) {
    options.success({ tempFiles: [{ tempFilePath: 'wxfile://tmp/photo.jpg' }] })
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
  navigateBack(options) {
    navigations.push({ type: 'navigateBack', url: 'back' })
    if (options && options.fail) options.fail({})
  },
  showToast(options) {
    toasts.push(options && options.title)
  },
  showModal(options) {
    const result = modalResults.shift()
    if (typeof options.success === 'function') {
      queueMicrotask(() => options.success(result || { confirm: true }))
    }
  },
}

let currentPages = [{ route: 'pages/space-studio/index', options: {} }]
globalThis.getCurrentPages = () => currentPages
globalThis.getApp = () => ({ globalData: {} })
globalThis.Page = (options) => {
  pageOptions = options
}

const sessionState = await import('../miniprogram/utils/session-state.js')
const { SESSION_STATUS } = await import('../miniprogram/utils/session-constants.js')
await import('../miniprogram/pages/space-studio/index.js')

function ok(data) {
  return { statusCode: 200, data: { success: true, data } }
}

function fail(code, message) {
  return { statusCode: 200, data: { success: false, errorCode: code, message } }
}

const WAITING_SPACE = {
  spaceId: 101,
  status: 0,
  spaceName: '我们的故事',
  memberCount: 1,
  currentUserRole: 1,
  creator: true,
  canInvite: true,
}

const NORMAL_SPACE = {
  spaceId: 202,
  status: 1,
  spaceName: '两个人的空间',
  memberCount: 2,
  currentUserRole: 1,
  creator: true,
}

const HOME_DATA = {
  spaceName: '我们的故事',
  description: '只属于两个人',
  loveStartTime: '2024-05-20 19:30:47',
  boyName: '橙子',
  boyNameSource: 'config',
  girlName: 'SHE',
  girlNameSource: 'default',
  boyAvatar: '',
  boyAvatarSource: 'placeholder',
  girlAvatar: '',
  girlAvatarSource: 'placeholder',
  heroPhoto1: '',
  heroPhoto2: '',
  canEdit: true,
}

/** 准备已登录会话：permissions 会写入本地存储，供 hasFrontendQueryPermission 使用。 */
function prepareSession(space, permissions = []) {
  storage.clear()
  storage.set('amour_token', 'token-a')
  storage.set('amour_permissions', permissions)
  handlers.set('/user/profile', options => options.success(ok({
    username: 'u',
    displayName: '测试用户',
    avatar: '',
    passwordSet: false,
    permissions,
  })))
  handlers.set('/space/status', options => options.success(ok(space)))
}

function createPage() {
  if (!pageOptions) throw new Error('页面未注册')
  const instance = Object.create(null)
  Object.keys(pageOptions).forEach((key) => {
    if (key === 'data') return
    if (typeof pageOptions[key] === 'function') instance[key] = pageOptions[key]
  })
  instance.data = JSON.parse(JSON.stringify(pageOptions.data || {}))
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
  instance.destroy = () => {
    if (typeof instance.onUnload === 'function') instance.onUnload()
  }
  return instance
}

async function settle() {
  for (let i = 0; i < 12; i += 1) await new Promise(resolve => setTimeout(resolve, 0))
}

test.beforeEach(async () => {
  storage.clear()
  requests.length = 0
  handlers.clear()
  navigations.length = 0
  toasts.length = 0
  modalResults.length = 0
  uploadCount = 0
  sessionState.resetForTests()
  currentPages = [{ route: 'pages/space-studio/index', options: {} }]
})

test('新页面已注册，访问级别为 SPACE（双向一致）', async () => {
  const appJson = JSON.parse(readFileSync('miniprogram/app.json', 'utf8'))
  const { PAGE_ACCESS_BY_ROUTE } = await import('../miniprogram/utils/session-rules.js')
  const { PAGE_ACCESS } = await import('../miniprogram/utils/session-constants.js')
  assert.ok(appJson.pages.includes('pages/space-studio/index'))
  assert.equal(PAGE_ACCESS_BY_ROUTE['pages/space-studio/index'], PAGE_ACCESS.SPACE)
  Object.keys(PAGE_ACCESS_BY_ROUTE).forEach((route) => {
    assert.ok(appJson.pages.includes(route), `${route} 未在 app.json 注册`)
  })
})

test('无空间进入工作台：守卫 reLaunch 到「我的」并提示创建 / 绑定', async () => {
  prepareSession(null)
  const page = createPage()
  page.onLoad({})
  await settle()
  try {
    assert.equal(page.pageReady, undefined, '守卫不通过时不能标记 ready')
    const last = navigations[navigations.length - 1]
    assert.equal(last.type, 'reLaunch')
    assert.match(last.url, /pages\/profile\/profile/)
    assert.match(last.url, /guide=space/)
    assert.equal(requests.some(item => item.path.startsWith('/space/home/query')), false)
  } finally {
    page.destroy()
  }
})

test('等待绑定创建者进入：可编辑、栏目按权限过滤、tab 越权回退首页', async () => {
  prepareSession(WAITING_SPACE, ['frontend:story:query'])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))
  handlers.set('/space/review/status', options => options.success(ok({ pending: false })))
  handlers.set('/story/manage/chapters', options => options.success(ok([])))
  handlers.set('/story/manage/nodes', options => options.success(ok([])))

  const page = createPage()
  page.onLoad({ tab: 'photo' })
  await settle()
  try {
    assert.equal(page.data.pageReady, true)
    assert.equal(page.data.canEditContent, true)
    assert.equal(page.data.canPublish, false, '等待绑定不能公开内容')
    assert.deepEqual(page.data.tabs.map(tab => tab.key), ['home', 'story'])
    assert.equal(page.data.activeTab, 'home', '无权限的 tab 必须回退到首页')
    assert.equal(page.data.homeForm.spaceName, '我们的故事')
    assert.equal(page.data.homeForm.boyName, '橙子')
    assert.match(page.data.homeForm.loveDate, /^2024-05-20$/)
    assert.equal(page.data.homeLoaded, true)
    assert.ok(requests.some(item => item.path === '/space/home/query'))
    assert.ok(requests.some(item => item.path === '/space/review/status' && item.method === 'GET'))
  } finally {
    page.destroy()
  }
})

test('首页保存：提交完整基础信息与白名单 configs，审核中提示不会说成已公开', async () => {
  prepareSession(WAITING_SPACE, [])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))
  handlers.set('/space/review/status', options => options.success(ok({ pending: true })))
  let saveBody = null
  handlers.set('/space/home/save', (options) => {
    saveBody = options.data
    options.success(ok({
      ...HOME_DATA,
      spaceName: options.data.spaceName,
      description: options.data.description,
      loveStartTime: options.data.loveStartTime,
      reviewPending: true,
      reviewMessage: '修改已保存，等待审核',
    }))
  })

  const page = createPage()
  page.onLoad({})
  await settle()
  try {
    page.setData({
      homeForm: {
        ...page.data.homeForm,
        spaceName: '新名字',
        description: '新简介',
        loveDate: '2024-05-21',
        loveTime: '20:00',
      },
    })
    await page.onSaveHome()
    await settle()

    assert.ok(saveBody, '必须调用 /space/home/save')
    assert.equal(saveBody.spaceName, '新名字')
    assert.equal(saveBody.description, '新简介')
    assert.equal(saveBody.loveStartTime, '2024-05-21 20:00:00')
    assert.deepEqual(Object.keys(saveBody.configs).sort(), [
      'boy_avatar',
      'boy_name',
      'girl_avatar',
      'girl_name',
      'home.hero_photo_1',
      'home.hero_photo_2',
    ])
    assert.equal(page.data.homeSaving, false)
    assert.equal(page.data.feedback.kind, 'stale')
    assert.match(page.data.feedback.message, /审核/)
    assert.doesNotMatch(page.data.feedback.message, /已公开$/)
    assert.equal(page.data.draftDirty, false)
  } finally {
    page.destroy()
  }
})

test('图片选择后先上传，表单只写入服务器返回的 URL', async () => {
  prepareSession(WAITING_SPACE, [])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))
  handlers.set('/space/review/status', options => options.success(ok({ pending: false })))

  const page = createPage()
  page.onLoad({})
  await settle()
  try {
    page.onChooseImage({
      currentTarget: {
        dataset: { form: 'homeForm', field: 'heroPhoto1', uploading: 'homeUploadingField' },
      },
    })
    await settle()

    assert.equal(uploadCount, 1, '必须通过 /space/media/upload 上传')
    assert.equal(page.data.homeForm.heroPhoto1, 'https://cdn.example.com/uploaded.png')
    assert.notEqual(page.data.homeForm.heroPhoto1, 'wxfile://tmp/photo.jpg', '不能把临时路径当成已保存 URL')
    assert.equal(page.data.homeUploadingField, false)
    assert.equal(page.data.draftDirty, true)
  } finally {
    page.destroy()
  }
})

test('图片上传期间不重复上传，也不允许保存旧地址', async () => {
  prepareSession(WAITING_SPACE, [])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))
  handlers.set('/space/review/status', options => options.success(ok({ pending: false })))

  const page = createPage()
  page.onLoad({})
  await settle()
  try {
    page.setData({ homeUploadingField: 'heroPhoto1' })
    requests.length = 0
    uploadCount = 0

    page.onChooseImage({
      currentTarget: {
        dataset: { form: 'homeForm', field: 'heroPhoto1', uploading: 'homeUploadingField' },
      },
    })
    assert.equal(uploadCount, 0, '同一字段上传中不能重复触发上传')

    await page.onSaveHome()
    assert.equal(
      requests.some(item => item.path === '/space/home/save'),
      false,
      '上传中禁止保存，避免提交旧图片地址',
    )
    assert.match(page.data.homeError, /正在上传/)
  } finally {
    page.destroy()
  }
})

test('状态刷新不会把用户从当前栏目拉回 URL 初始栏目；确认放弃后首页草稿被还原', async () => {
  prepareSession(NORMAL_SPACE, [
    'frontend:story:query',
    'frontend:message:query',
  ])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))
  handlers.set('/space/review/status', options => options.success(ok({ pending: false })))
  handlers.set('/story/manage/chapters', options => options.success(ok([])))
  handlers.set('/story/manage/nodes', options => options.success(ok([])))
  handlers.set('/message/page?current=1&size=8', options => options.success(ok({
    current: 1, size: 8, total: 0, records: [],
  })))

  const page = createPage()
  page.onLoad({ tab: 'message' })
  await settle()
  try {
    assert.equal(page.data.activeTab, 'message')
    page.activateTab('home')
    await settle()
    assert.equal(page.data.activeTab, 'home')
    assert.equal(page.data.homeForm.spaceName, '我们的故事')

    // 状态刷新（例如保存后）不能把栏目改回 URL 初始的 message。
    page.applySession(sessionState.getSnapshot())
    assert.equal(page.data.activeTab, 'home')

    // 首页编辑后切走再切回：确认放弃的草稿必须恢复为服务端基线。
    page.setData({ 'homeForm.spaceName': '临时名字' })
    page.markDirty()
    page.activateTab('story')
    page.activateTab('home')
    assert.equal(page.data.homeForm.spaceName, '我们的故事')
    assert.equal(page.data.draftDirty, false)
  } finally {
    page.destroy()
  }
})

test('有未保存修改时返回需要确认：取消停留、确认后离开', async () => {
  prepareSession(NORMAL_SPACE, [])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))
  handlers.set('/space/review/status', options => options.success(ok({ pending: false })))

  const page = createPage()
  page.onLoad({})
  await settle()
  try {
    page.setData({ 'homeForm.spaceName': '临时名字' })
    page.markDirty()
    navigations.length = 0

    modalResults.push({ confirm: false })
    page.onNavBack()
    await settle()
    assert.equal(navigations.length, 0, '取消后应停留在编辑页')

    modalResults.push({ confirm: true })
    page.onNavBack()
    await settle()
    const last = navigations[navigations.length - 1]
    assert.ok(last, '确认后应离开')
    assert.match(last.url, /pages\/profile\/profile/)
  } finally {
    page.destroy()
  }
})

test('留言分页使用 /message/page 的 query 参数，不提交 body 分页', async () => {
  prepareSession(NORMAL_SPACE, ['frontend:message:query'])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))
  handlers.set('/space/review/status', options => options.success(ok({ pending: false })))
  handlers.set('/message/page?current=2&size=8', options => options.success(ok({
    current: 2,
    size: 8,
    total: 20,
    records: [],
  })))

  const page = createPage()
  page.onLoad({ tab: 'message' })
  await settle()
  try {
    await page.loadMessages(2)
    await settle()
    const pageRequests = requests.filter(item => item.path.indexOf('/message/page') === 0)
    const request = pageRequests[pageRequests.length - 1]
    assert.equal(request.path, '/message/page?current=2&size=8')
    assert.equal(page.data.messageCurrent, 2)
    assert.equal(page.data.messageTotalPages, 3)
  } finally {
    page.destroy()
  }
})

test('业务冲突错误：展示后端提示并刷新空间状态', async () => {
  prepareSession(NORMAL_SPACE, ['frontend:photo:query'])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))
  handlers.set('/space/review/status', options => options.success(ok({ pending: false })))
  handlers.set('/photo/manage/categories', options => options.success(ok([])))
  handlers.set('/photo/manage/page', options => options.success(fail('20065', '当前空间状态或成员身份不允许编辑内容')))
  let statusCalls = 0
  handlers.set('/space/status', (options) => {
    statusCalls += 1
    options.success(ok(NORMAL_SPACE))
  })

  const page = createPage()
  page.onLoad({ tab: 'photo' })
  await settle()
  const before = statusCalls
  try {
    await page.loadPhoto()
    await settle()

    assert.match(page.data.photoError, /不允许编辑内容/)
    assert.ok(statusCalls > before, '冲突错误必须强制刷新空间状态')
  } finally {
    page.destroy()
  }
})
