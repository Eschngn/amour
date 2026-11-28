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
const modals = []
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
    // 模拟真实页面栈：只有栈底或调用失败时才走页面兜底。
    if ((!currentPages || currentPages.length <= 1) && options && options.fail) options.fail({})
  },
  showToast(options) {
    toasts.push(options && options.title)
  },
  showModal(options) {
    modals.push(options)
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
  modals.length = 0
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
  assert.ok(appJson.pages.includes('pages/space-content-editor/index'))
  assert.equal(PAGE_ACCESS_BY_ROUTE['pages/space-studio/index'], PAGE_ACCESS.SPACE)
  assert.equal(PAGE_ACCESS_BY_ROUTE['pages/space-content-editor/index'], PAGE_ACCESS.SPACE)
  Object.keys(PAGE_ACCESS_BY_ROUTE).forEach((route) => {
    assert.ok(appJson.pages.includes(route), `${route} 未在 app.json 注册`)
  })
})

test('内容列表移除内联编辑，整条记录支持长按排序与左滑删除', () => {
  const wxml = readFileSync('miniprogram/pages/space-studio/index.wxml', 'utf8')
  assert.doesNotMatch(wxml, /class="[^"]*inline-form/)
  assert.doesNotMatch(wxml, /\son(?:Edit|Move)[A-Za-z]*=/)
  assert.doesNotMatch(wxml, />\s*编辑\s*<\/button>/)
  assert.doesNotMatch(wxml, />\s*上移\s*<\/button>/)
  assert.doesNotMatch(wxml, />\s*下移\s*<\/button>/)
  assert.match(wxml, /catchtap="onOpenItem"/)
  assert.match(wxml, /catchtap="onDeleteItem"/)
  assert.doesNotMatch(wxml, /class="drag-handle"|onDragHandleTap|catchtouchstart="onDragStart"/)
  assert.doesNotMatch(wxml, /拖动右侧手柄/)
  assert.equal((wxml.match(/class="swipe-content/g) || []).length, 5)
  assert.equal((wxml.match(/bindlongpress="onRowLongPress"/g) || []).length, 5)
  assert.match(wxml, /长按整行拖动/)
  assert.match(wxml, />删除<\/button>/)
})

test('左滑删除操作区使用醒目的红底白字样式', () => {
  const less = readFileSync('miniprogram/pages/space-studio/index.less', 'utf8')
  assert.match(
    less,
    /\.swipe-delete\s*\{[\s\S]*?width: 176rpx !important;[\s\S]*?background: #ef4055;[\s\S]*?color: #ffffff;[\s\S]*?font-size: 32rpx;/,
  )
  assert.match(less, /\.swipe-row\.is-open \.swipe-content \{ transform: translateX\(-176rpx\); \}/)
  assert.doesNotMatch(less, /\.drag-handle/)
})

test('首页只选择恋爱开始日期，并移除模块清空与重置入口', () => {
  const wxml = readFileSync('miniprogram/pages/space-studio/index.wxml', 'utf8')
  assert.match(wxml, /恋爱开始日期/)
  assert.match(wxml, /<picker mode="date"[^>]*data-form="homeForm"[^>]*data-field="loveDate"/)
  assert.doesNotMatch(wxml, /发起人头像|另一半头像|data-field="boyAvatar"|data-field="girlAvatar"/)
  assert.doesNotMatch(wxml, /data-field="loveTime"/)
  assert.doesNotMatch(wxml, /onClearFormDateTime|onResetHome/)
  assert.doesNotMatch(wxml, />\s*重置\s*<\/button>/)
  assert.doesNotMatch(wxml, />\s*清空\s*<\/button>/)
})

test('故事、相册与纪念日的新建入口均跳转独立编辑页', () => {
  const page = createPage()
  page.setData({
    chapters: [{ id: 11 }],
    chapterFilterId: 11,
    photoCategories: [{ id: 22 }],
    photoFilterId: 22,
  })
  try {
    page.onNewChapter()
    page.onNewNode()
    page.onNewCategory()
    page.onNewPhoto()
    page.onNewAnniversary()
    assert.deepEqual(navigations.map(item => item.url), [
      '/pages/space-content-editor/index?kind=chapter',
      '/pages/space-content-editor/index?kind=story&chapterId=11',
      '/pages/space-content-editor/index?kind=category',
      '/pages/space-content-editor/index?kind=photo&categoryId=22',
      '/pages/space-content-editor/index?kind=anniversary',
    ])
  } finally {
    page.destroy()
  }
})

test('缺少章节或相册分类时阻止新建并给出提示', () => {
  const page = createPage()
  try {
    page.onNewNode()
    page.onNewPhoto()
    assert.equal(navigations.length, 0)
    assert.deepEqual(toasts, ['请先创建章节', '请先创建一个相册分类'])
  } finally {
    page.destroy()
  }
})

test('点击列表条目进入带 id 的独立编辑页', () => {
  const page = createPage()
  try {
    page.onOpenItem({
      currentTarget: { dataset: { kind: 'story', id: 42 } },
    })
    assert.equal(navigations.length, 1)
    assert.equal(navigations[0].url, '/pages/space-content-editor/index?kind=story&id=42')
  } finally {
    page.destroy()
  }
})

test('左滑条目后只展开当前条目，删除调用对应接口', async () => {
  prepareSession(NORMAL_SPACE, ['frontend:story:query'])
  handlers.set('/story/manage/chapter/delete', options => options.success(ok(true)))

  const page = createPage()
  page.loadStory = async () => {}
  try {
    page.onRowTouchStart({
      currentTarget: { dataset: { kind: 'chapter', id: 7 } },
      touches: [{ clientX: 320, clientY: 140 }],
    })
    page.onRowTouchMove({
      currentTarget: { dataset: { kind: 'chapter', id: 7 } },
      touches: [{ clientX: 250, clientY: 142 }],
    })
    page.onRowTouchEnd()
    assert.equal(page.data.swipeKey, 'chapter:7')

    await page.onDeleteItem({ currentTarget: { dataset: { kind: 'chapter', id: 7 } } })
    await settle()
    const request = requests.find(item => item.path === '/story/manage/chapter/delete')
    assert.ok(request, '必须调用章节删除接口')
    assert.deepEqual(request.data, { id: 7 })
    assert.equal(page.data.swipeKey, '')
    assert.equal(page.data.deleting, false)
  } finally {
    page.destroy()
  }
})

test('删除章节因非空失败时只在章节列表下方提示操作错误，不挂出重新加载', async () => {
  prepareSession(NORMAL_SPACE, ['frontend:story:query'])
  handlers.set('/story/manage/chapter/delete', options => options.success(fail('20068', '章节下仍有故事，无法删除')))

  const page = createPage()
  let reloads = 0
  page.loadStory = async () => { reloads += 1 }
  try {
    await page.onDeleteItem({ currentTarget: { dataset: { kind: 'chapter', id: 7 } } })
    await settle()
    assert.equal(page.data.storyError, '', '删除失败不能写入故事加载错误')
    assert.ok(page.data.actionError, '删除失败必须展示操作类错误')
    assert.equal(page.data.actionError.anchor, 'chapter')
    assert.match(page.data.actionError.message, /章节下仍有故事/)
    assert.equal(reloads, 0, '业务性删除失败不应触发重新加载')
    assert.equal(page.data.deleting, false)
  } finally {
    page.destroy()
  }
})

test('五个列表的操作类错误各自渲染在对应列表正下方', () => {
  const wxml = readFileSync('miniprogram/pages/space-studio/index.wxml', 'utf8')
  for (const anchor of ['chapter', 'story', 'category', 'photo', 'anniversary']) {
    assert.match(
      wxml,
      new RegExp(`actionError && actionError\\.anchor === '${anchor}'`),
      `缺少 ${anchor} 列表的操作错误展示`,
    )
  }
})

test('拖动排序后调用排序接口并保留新顺序', async () => {
  prepareSession(NORMAL_SPACE, ['frontend:story:query'])
  handlers.set('/story/manage/chapter/order', options => options.success(ok(true)))

  const page = createPage()
  let reloadCount = 0
  page.loadStory = async () => { reloadCount += 1 }
  page.setData({
    chapters: [{ id: 1, name: '第一章' }, { id: 2, name: '第二章' }],
  })
  try {
    page.onRowLongPress({
      currentTarget: { dataset: { kind: 'chapter', index: 0 } },
      touches: [{ clientY: 100 }],
    })
    assert.equal(page.data.dragging, true, '长按整条记录应进入拖动状态')
    page.onRowTouchMove({ touches: [{ clientY: 280 }] })
    assert.equal(page.data.dragItemId, 1)
    await page.onRowTouchEnd({ changedTouches: [{ clientY: 280 }] })
    await settle()

    const request = requests.find(item => item.path === '/story/manage/chapter/order')
    assert.ok(request, '必须调用章节排序接口')
    assert.deepEqual(request.data.items, [
      { id: 2, sortOrder: 10 },
      { id: 1, sortOrder: 20 },
    ])
    assert.deepEqual(page.data.chapters.map(item => item.id), [2, 1])
    assert.equal(reloadCount, 0, '排序成功后不能重新加载列表，否则会跳回页面顶部')
    assert.equal(page.data.dragging, false)
    assert.equal(page.data.dragItemId, 0)
  } finally {
    page.destroy()
  }
})

test('章节、故事、分类、照片和纪念日排序成功后都不重新加载列表', async () => {
  prepareSession(NORMAL_SPACE, ['frontend:story:query', 'frontend:photo:query', 'frontend:anniversary:query'])
  for (const path of [
    '/story/manage/chapter/order',
    '/story/manage/node/order',
    '/photo/manage/category/order',
    '/photo/manage/photo/order',
    '/anniversary/manage/order',
  ]) {
    handlers.set(path, options => options.success(ok(true)))
  }
  handlers.set('/photo/manage/photo/sort-list', options => options.success(ok([
    { id: 7 },
    { id: 8 },
  ])))

  const page = createPage()
  const reloads = { story: 0, photo: 0, anniversary: 0 }
  page.loadStory = async () => { reloads.story += 1 }
  page.loadPhoto = async () => { reloads.photo += 1 }
  page.loadPhotoPage = async () => { reloads.photo += 1 }
  page.loadAnniversary = async () => { reloads.anniversary += 1 }
  page.setData({ chapterFilterId: 11 })

  const snapshot = [{ id: 7 }, { id: 8 }]
  const nextList = [{ id: 8 }, { id: 7 }]
  try {
    await page.commitSort('chapter', snapshot, nextList)
    await page.commitSort('story', snapshot, nextList)
    await page.commitSort('category', snapshot, nextList)
    await page.commitSort('photo', snapshot, nextList)
    await page.commitSort('anniversary', snapshot, nextList)

    assert.deepEqual(reloads, { story: 0, photo: 0, anniversary: 0 })
    assert.equal(page.data.sortSaving, false)
  } finally {
    page.destroy()
  }
})

test('从独立编辑页返回后清理并刷新当前栏目', async () => {
  const page = createPage()
  const loaded = []
  let reviewLoads = 0
  page.pageReady = true
  page.editorOpen = true
  page.loadedTabs = { photo: true }
  page.loadTab = key => loaded.push(key)
  page.loadReview = async () => { reviewLoads += 1 }
  page.applySession = () => {}
  page.setData({ activeTab: 'photo' })
  try {
    await page.onShow()
    assert.equal(page.editorOpen, false)
    assert.equal(page.loadedTabs.photo, undefined)
    assert.deepEqual(loaded, ['photo'])
    assert.equal(reviewLoads, 1)
  } finally {
    page.destroy()
  }
})

test('从独立编辑页返回：静默刷新当前栏目，不写滚动位置、不清空列表', async () => {
  const page = createPage()
  const loaded = []
  page.pageReady = true
  page.applySession = () => {}
  page.loadReview = async () => {}
  page.setData({ activeTab: 'photo', photos: [{ id: 7, title: '旧照片' }] })
  page.loadedTabs = { photo: true }
  page.loadTab = (key, options) => {
    loaded.push({ key, options })
    return Promise.resolve()
  }
  const patches = []
  const originalSetData = page.setData
  page.setData = (patch, callback) => {
    patches.push(patch)
    return originalSetData(patch, callback)
  }
  try {
    page.openEditor('photo', { id: 9 })
    assert.equal(page.editorOpen, true)
    assert.ok(navigations.some(item => item.type === 'navigateTo' && item.url.includes('kind=photo')))

    await page.onShow()

    assert.deepEqual(loaded, [{ key: 'photo', options: { silent: true } }])
    assert.deepEqual(page.data.photos, [{ id: 7, title: '旧照片' }], '返回刷新不能先清空列表')
    assert.equal(
      patches.some(patch => Object.prototype.hasOwnProperty.call(patch, 'scrollTop')),
      false,
      '父页面返回过程中不能写入 scrollTop',
    )
    assert.equal(
      Object.prototype.hasOwnProperty.call(page.data, 'scrollTop'),
      false,
      '不再依赖 scroll-top 绑定恢复位置',
    )
    const wxml = readFileSync('miniprogram/pages/space-studio/index.wxml', 'utf8')
    assert.doesNotMatch(wxml, /scroll-top=/)
    assert.doesNotMatch(wxml, /onContentScroll/)
  } finally {
    page.destroy()
  }
})

test('相册 / 故事 / 纪念日静默刷新时保留已有列表，不切换加载骨架', async () => {
  prepareSession(NORMAL_SPACE, ['frontend:story:query', 'frontend:photo:query', 'frontend:anniversary:query'])
  let pendingChapters = null
  let pendingNodes = null
  let pendingPhotos = null
  let pendingAnniversaries = null
  handlers.set('/story/manage/chapters', (options) => { pendingChapters = options })
  handlers.set('/story/manage/nodes', (options) => { pendingNodes = options })
  handlers.set('/photo/manage/categories', options => options.success(ok([{ id: 22, categoryName: '旧分类' }])))
  handlers.set('/photo/manage/page', (options) => { pendingPhotos = options })
  handlers.set('/anniversary/manage/list', (options) => { pendingAnniversaries = options })

  const page = createPage()
  page.photoPageSeq = 0
  page.setData({
    storyLoading: false,
    chapters: [{ id: 11, name: '旧章节' }],
    nodes: [{ id: 1, chapterId: 11 }],
    visibleNodes: [{ id: 1, chapterId: 11 }],
    photoLoading: false,
    photos: [{ id: 7, title: '旧照片' }],
    anniversaryLoading: false,
    anniversaries: [{ id: 8, title: '旧纪念日' }],
  })
  try {
    const storyTask = page.loadStory({ silent: true })
    assert.equal(page.data.storyLoading, false, '故事刷新不能切回加载骨架')
    assert.deepEqual(page.data.chapters.map(item => item.id), [11])
    pendingChapters.success(ok([{ id: 12, name: '新章节' }]))
    pendingNodes.success(ok([{ id: 2, chapterId: 12 }]))
    await storyTask
    assert.deepEqual(page.data.chapters.map(item => item.id), [12])

    const photoTask = page.loadPhoto({ silent: true })
    await settle()
    assert.equal(page.data.photoLoading, false, '相册刷新不能切回加载骨架')
    assert.deepEqual(page.data.photos.map(item => item.id), [7])
    pendingPhotos.success(ok({ current: 1, size: 10, total: 1, records: [{ id: 9, title: '新照片' }] }))
    await photoTask
    assert.deepEqual(page.data.photos.map(item => item.id), [9])

    const anniversaryTask = page.loadAnniversary({ silent: true })
    assert.equal(page.data.anniversaryLoading, false, '纪念日刷新不能切回加载骨架')
    assert.deepEqual(page.data.anniversaries.map(item => item.id), [8])
    pendingAnniversaries.success(ok([{ id: 10, title: '新纪念日' }]))
    await anniversaryTask
    assert.deepEqual(page.data.anniversaries.map(item => item.id), [10])
  } finally {
    page.destroy()
  }
})

test('静默刷新失败时保留已有列表，不清空内容也不切换错误态', async () => {
  prepareSession(NORMAL_SPACE, ['frontend:story:query', 'frontend:photo:query', 'frontend:anniversary:query'])
  handlers.set('/story/manage/chapters', options => options.success(fail('50000', '故事刷新失败')))
  handlers.set('/story/manage/nodes', options => options.success(fail('50000', '故事刷新失败')))
  handlers.set('/photo/manage/categories', options => options.success(fail('50000', '相册刷新失败')))
  handlers.set('/anniversary/manage/list', options => options.success(fail('50000', '纪念日刷新失败')))

  const page = createPage()
  page.photoPageSeq = 0
  page.setData({
    storyLoading: false,
    storyError: '',
    chapters: [{ id: 11, name: '旧章节' }],
    nodes: [{ id: 1, chapterId: 11 }],
    visibleNodes: [{ id: 1, chapterId: 11 }],
    photoLoading: false,
    photoError: '',
    photos: [{ id: 7, title: '旧照片' }],
    anniversaryLoading: false,
    anniversaryError: '',
    anniversaries: [{ id: 8, title: '旧纪念日' }],
  })
  try {
    await page.loadStory({ silent: true })
    await page.loadPhoto({ silent: true })
    await page.loadAnniversary({ silent: true })

    assert.deepEqual(page.data.chapters.map(item => item.id), [11])
    assert.deepEqual(page.data.nodes.map(item => item.id), [1])
    assert.deepEqual(page.data.photos.map(item => item.id), [7])
    assert.deepEqual(page.data.anniversaries.map(item => item.id), [8])
    assert.equal(page.data.storyError, '')
    assert.equal(page.data.photoError, '')
    assert.equal(page.data.anniversaryError, '')
    assert.equal(page.data.storyLoading, false)
    assert.equal(page.data.photoLoading, false)
    assert.equal(page.data.anniversaryLoading, false)
  } finally {
    page.destroy()
  }
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

  currentPages = [
    { route: 'pages/profile/profile', options: {} },
    { route: 'pages/space-studio/index', options: {} },
  ]
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
      },
    })
    await page.onSaveHome()
    await settle()

    assert.ok(saveBody, '必须调用 /space/home/save')
    assert.equal(saveBody.spaceName, '新名字')
    assert.equal(saveBody.description, '新简介')
    assert.equal(saveBody.loveStartTime, '2024-05-21 00:00:00')
    assert.deepEqual(Object.keys(saveBody.configs).sort(), [
      'boy_name',
      'girl_name',
      'home.hero_photo_1',
      'home.hero_photo_2',
    ])
    assert.equal(page.data.homeSaving, false)
    assert.equal(page.data.feedback, null, '成功提示不应占用页面顶部提示条')
    assert.equal(modals.length, 0, '首页保存成功不应弹窗阻塞返回')
    assert.deepEqual(toasts, ['已提交审核'], '审核中的首页保存使用轻提示')
    assert.equal(navigations[navigations.length - 1].type, 'navigateBack', '保存成功后自动返回上一页')
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
  currentPages = [
    { route: 'pages/profile/profile', options: {} },
    { route: 'pages/space-studio/index', options: {} },
  ]

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
    assert.equal(modals[modals.length - 1].confirmText, '放弃返回')
    assert.ok(modals[modals.length - 1].confirmText.length <= 4, '确认按钮文案不能超过微信限制')

    modalResults.push({ confirm: true })
    page.onNavBack()
    await settle()
    assert.equal(navigations.length, 1, '确认后只应执行一次返回')
    assert.equal(navigations[0].type, 'navigateBack')
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

test('空间编辑留言保留用户头像，回复渲染头像且不展示 canDelete 说明', async () => {
  prepareSession(NORMAL_SPACE, ['frontend:message:query'])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))
  handlers.set('/space/review/status', options => options.success(ok({ pending: false })))
  handlers.set('/message/page?current=1&size=8', options => options.success(ok({
    current: 1,
    size: 8,
    total: 1,
    records: [{
      messageId: '31',
      content: '今天也很想你',
      userName: '测试用户',
      userAvatar: 'https://cdn.example.com/user.png',
      canDelete: true,
      createTime: '2026-11-21 10:00:00',
      replies: [{
        replyId: '41',
        content: '我也是',
        fromUserName: '另一半',
        fromUserAvatar: 'https://cdn.example.com/partner.png',
        toUserName: '测试用户',
        canDelete: false,
        createTime: '2026-11-21 10:05:00',
      }],
    }],
  })))

  const page = createPage()
  page.onLoad({ tab: 'message' })
  await settle()
  try {
    assert.equal(page.data.messages[0].userAvatar, 'https://cdn.example.com/user.png')
    assert.equal(page.data.messages[0].replies[0].fromUserAvatar, 'https://cdn.example.com/partner.png')

    const wxml = readFileSync('miniprogram/pages/space-studio/index.wxml', 'utf8')
    const less = readFileSync('miniprogram/pages/space-studio/index.less', 'utf8')
    assert.match(wxml, /wx:if="\{\{item\.userAvatar\}\}"/)
    assert.match(wxml, /wx:if="\{\{reply\.fromUserAvatar\}\}"/)
    assert.match(wxml, /class="reply-avatar"/)
    assert.doesNotMatch(wxml, /canDelete 决定|服务端返回的 canDelete/)
    assert.match(less, /\.text-button\s*\{[\s\S]*?width:\s*auto !important;/)
    assert.match(less, /\.text-button\s*\{[\s\S]*?min-width:\s*0 !important;/)
    assert.match(less, /\.message-head\s*\{[\s\S]*?align-items:\s*flex-start;/)
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
