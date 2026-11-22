import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 空间首页页面级测试。
 *
 * 用最小运行时桩加载真实组件定义，覆盖：
 * - /space/home/query 的名称、简介、canEdit、照片与权限映射；
 * - 首次加载失败的重试入口；
 * - 已有内容后的刷新失败保留内容；
 * - 卸载后忽略过期响应；
 * - 无故事权限时不请求里程碑；
 * - 图片加载失败项不进入预览列表。
 */

const storage = new Map()
const requests = []
const handlers = new Map()
const navigations = []
const toasts = []
const previews = []
let componentOptions = null

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
  previewImage(options) {
    previews.push(options)
  },
  getSystemInfo() {},
  getMenuButtonBoundingClientRect: () => ({ left: 300 }),
}

globalThis.getCurrentPages = () => [{ route: 'pages/index/index', options: {} }]
globalThis.getApp = () => ({ globalData: {} })
globalThis.Component = (options) => {
  componentOptions = options
}

const sessionState = await import('../miniprogram/utils/session-state.js')
await import('../miniprogram/pages/index/index.ts')

function ok(data) {
  return { statusCode: 200, data: { success: true, data } }
}

function fail(code, message) {
  return { statusCode: 200, data: { success: false, errorCode: code, message } }
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
  spaceName: '橙子与子怡的四季',
  description: '记录认真生活的每一天',
  loveStartTime: '2024-05-20 19:30:47',
  status: 1,
  boyName: '橙子',
  boyNameSource: 'config',
  girlName: '子怡',
  girlNameSource: 'member',
  boyAvatar: 'https://cdn.example.com/boy.png',
  boyAvatarSource: 'config',
  girlAvatar: '',
  girlAvatarSource: 'placeholder',
  heroPhoto1: 'https://cdn.example.com/hero-1.png',
  heroPhoto1Source: 'config',
  heroPhoto2: 'https://cdn.example.com/hero-2.png',
  heroPhoto2Source: 'config',
  canEdit: true,
}

function prepareSession(space = NORMAL_SPACE, permissions = []) {
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
  if (!componentOptions) throw new Error('首页未注册')
  const instance = Object.create(null)
  Object.keys(componentOptions).forEach((key) => {
    if (key === 'data' || key === 'methods' || key === 'lifetimes' || key === 'pageLifetimes') return
    instance[key] = componentOptions[key]
  })
  instance.data = JSON.parse(JSON.stringify(componentOptions.data || {}))
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
  Object.keys(componentOptions.methods || {}).forEach((name) => {
    instance[name] = componentOptions.methods[name].bind(instance)
  })
  instance.start = () => componentOptions.lifetimes.attached.call(instance)
  instance.show = () => componentOptions.pageLifetimes.show.call(instance)
  instance.hide = () => componentOptions.pageLifetimes.hide.call(instance)
  instance.destroy = () => componentOptions.lifetimes.detached.call(instance)
  return instance
}

async function settle() {
  for (let i = 0; i < 14; i += 1) await new Promise(resolve => setTimeout(resolve, 0))
}

test.beforeEach(() => {
  storage.clear()
  sessionState.resetForTests()
  requests.length = 0
  handlers.clear()
  navigations.length = 0
  toasts.length = 0
  previews.length = 0
})

test('首页映射真实名称、简介、canEdit、照片与权限', async () => {
  prepareSession(NORMAL_SPACE, ['frontend:story:query'])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))
  handlers.set('/story/milestones', options => options.success(ok([
    { id: 1, title: '第一次见面' },
    { id: 2, title: '第一次旅行' },
  ])))

  const page = createPage()
  await page.start()
  await settle()
  try {
    assert.equal(page.data.pageBlocked, false)
    assert.equal(page.data.homeLoading, false)
    assert.equal(page.data.homeLoaded, true)
    assert.equal(page.data.spaceName, '橙子与子怡的四季')
    assert.equal(page.data.description, '记录认真生活的每一天')
    assert.equal(page.data.canEdit, true)
    assert.equal(page.data.boyName, '橙子')
    assert.equal(page.data.girlName, '子怡')
    assert.deepEqual(page.data.homePhotos.map(item => item.url), [
      'https://cdn.example.com/hero-1.png',
      'https://cdn.example.com/hero-2.png',
    ])
    assert.equal(page.data.hasLoveStart, true)
    assert.match(page.data.loveStartDate, /^2024 · 05 · 20$/)
    assert.ok(page.data.togetherDays >= 1, '已设置开始时间时按真实日期计算天数')
    assert.equal(page.data.showStory, true)
    assert.equal(page.data.showPhoto, false)
    assert.equal(page.data.storyStat, '已收藏 2 个瞬间')
    assert.ok(requests.some(item => item.path === '/space/home/query'))
    assert.ok(requests.some(item => item.path === '/story/milestones'))
  } finally {
    page.destroy()
  }
})

test('首次加载失败展示错误并可重试成功', async () => {
  prepareSession()
  let calls = 0
  handlers.set('/space/home/query', (options) => {
    calls += 1
    if (calls === 1) {
      options.success(fail('50000', '服务暂时不可用'))
      return
    }
    options.success(ok(HOME_DATA))
  })

  const page = createPage()
  await page.start()
  await settle()
  try {
    assert.equal(page.data.homeLoaded, false)
    assert.equal(page.data.homeError, '服务暂时不可用')
    assert.equal(page.data.homeLoading, false)

    page.onRetryHome()
    await settle()
    assert.equal(calls, 2)
    assert.equal(page.data.homeLoaded, true)
    assert.equal(page.data.homeError, '')
    assert.equal(page.data.spaceName, '橙子与子怡的四季')
  } finally {
    page.destroy()
  }
})

test('刷新失败保留已有内容，只展示轻量提示', async () => {
  prepareSession()
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))

  const page = createPage()
  await page.start()
  await settle()
  try {
    assert.equal(page.data.homeLoaded, true)
    handlers.set('/space/home/query', options => options.success(fail('50000', '网络波动')))

    page.show()
    await settle()
    assert.equal(page.data.spaceName, '橙子与子怡的四季', '刷新失败不能清空已有内容')
    assert.equal(page.data.homePhotos.length, 2)
    assert.equal(page.data.refreshError, '网络波动')
    assert.equal(page.data.homeError, '')
  } finally {
    page.destroy()
  }
})

test('计时器跟随页面显示 / 隐藏与销毁，未设置开始时间不启动', async () => {
  prepareSession()
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))

  const activeTimers = new Set()
  let timerId = 7000
  const originalSetInterval = globalThis.setInterval
  const originalClearInterval = globalThis.clearInterval
  globalThis.setInterval = () => {
    timerId += 1
    activeTimers.add(timerId)
    return timerId
  }
  globalThis.clearInterval = (id) => {
    activeTimers.delete(id)
  }

  const page = createPage()
  try {
    await page.start()
    await settle()
    assert.equal(activeTimers.size, 1, '有开始时间时应只启动一个计时器')

    page.hide()
    assert.equal(activeTimers.size, 0, '页面隐藏必须暂停计时器')

    page.show()
    await settle()
    assert.equal(activeTimers.size, 1, '页面恢复时重新启动且不能重复启动')

    page.destroy()
    assert.equal(activeTimers.size, 0, '页面销毁必须清理计时器')
  } finally {
    globalThis.setInterval = originalSetInterval
    globalThis.clearInterval = originalClearInterval
    page.destroy()
  }
})

test('未设置开始时间时不启动计时器', async () => {
  prepareSession()
  handlers.set('/space/home/query', options => options.success(ok({
    ...HOME_DATA,
    loveStartTime: null,
  })))

  const activeTimers = new Set()
  const originalSetInterval = globalThis.setInterval
  const originalClearInterval = globalThis.clearInterval
  globalThis.setInterval = () => {
    activeTimers.add(9999)
    return 9999
  }
  globalThis.clearInterval = (id) => {
    activeTimers.delete(id)
  }

  const page = createPage()
  try {
    await page.start()
    await settle()
    assert.equal(activeTimers.size, 0)
  } finally {
    globalThis.setInterval = originalSetInterval
    globalThis.clearInterval = originalClearInterval
    page.destroy()
  }
})

test('无故事查询权限时不请求里程碑', async () => {
  prepareSession(NORMAL_SPACE, [])
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))

  const page = createPage()
  await page.start()
  await settle()
  try {
    assert.equal(page.data.showStory, false)
    assert.equal(requests.some(item => item.path === '/story/milestones'), false)
  } finally {
    page.destroy()
  }
})

test('页面卸载后忽略过期响应，不覆盖已销毁实例', async () => {
  prepareSession()
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))

  const page = createPage()
  await page.start()
  await settle()
  try {
    let pending = null
    handlers.set('/space/home/query', (options) => { pending = options })
    const refresh = page.loadHomeData({ refresh: true })
    assert.ok(pending, '应发起刷新请求')

    page.destroy()
    pending.success(ok({ ...HOME_DATA, spaceName: '过期响应' }))
    await refresh
    assert.equal(page.data.spaceName, '橙子与子怡的四季', '卸载后旧响应必须被丢弃')
  } finally {
    page.destroy()
  }
})

test('空间切换后旧空间响应不会覆盖新空间', async () => {
  prepareSession()
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))

  const page = createPage()
  await page.start()
  await settle()
  try {
    const pendings = []
    handlers.set('/space/home/query', (options) => { pendings.push(options) })

    page.applySession({
      status: 'authenticated_with_space',
      space: { spaceId: 999, status: 1, memberCount: 2 },
    })
    await settle()
    assert.equal(pendings.length, 1, '切换空间应重新读取首页')

    page.applySession({
      status: 'authenticated_with_space',
      space: { spaceId: 1000, status: 1, memberCount: 2 },
    })
    await settle()
    assert.equal(pendings.length, 2)

    pendings[0].success(ok({ ...HOME_DATA, spaceName: '旧空间的名称' }))
    await settle()
    assert.equal(page.data.spaceName, '橙子与子怡的四季', '旧空间响应必须被丢弃')

    pendings[1].success(ok({ ...HOME_DATA, spaceName: '新空间的名称' }))
    await settle()
    assert.equal(page.data.spaceName, '新空间的名称')
  } finally {
    page.destroy()
  }
})

test('照片加载失败后不进入预览列表', async () => {
  prepareSession()
  handlers.set('/space/home/query', options => options.success(ok(HOME_DATA)))

  const page = createPage()
  await page.start()
  await settle()
  try {
    page.onPhotoError({ currentTarget: { dataset: { index: 0 } } })
    assert.equal(page.data.homePhotos[0].failed, true)

    page.onPreviewPhoto({ currentTarget: { dataset: { index: 0 } } })
    assert.equal(previews.length, 0, '失败项不能打开预览')
    assert.match(toasts[toasts.length - 1], /无法预览/)

    page.onPreviewPhoto({ currentTarget: { dataset: { index: 1 } } })
    assert.equal(previews.length, 1)
    assert.deepEqual(previews[0].urls, ['https://cdn.example.com/hero-2.png'])
  } finally {
    page.destroy()
  }
})

test('空数据：名称为空、无照片、未设置开始时间时保持可展示状态', async () => {
  prepareSession()
  handlers.set('/space/home/query', options => options.success(ok({
    spaceName: '',
    description: '',
    loveStartTime: null,
    boyName: 'HE',
    girlName: 'SHE',
    heroPhoto1: '',
    heroPhoto2: '',
    canEdit: false,
  })))

  const page = createPage()
  await page.start()
  await settle()
  try {
    assert.equal(page.data.homeLoaded, true)
    assert.equal(page.data.spaceName, '')
    assert.equal(page.data.description, '')
    assert.equal(page.data.canEdit, false)
    assert.equal(page.data.hasLoveStart, false)
    assert.deepEqual(page.data.homePhotos, [])
  } finally {
    page.destroy()
  }
})

test('等待另一半加入时从统一会话状态读取等待标记', async () => {
  prepareSession({
    spaceId: 303,
    status: 0,
    spaceName: '刚创建的空间',
    memberCount: 1,
    currentUserRole: 1,
    creator: true,
  })
  handlers.set('/space/home/query', options => options.success(ok({
    ...HOME_DATA,
    status: 0,
    boyName: 'HE',
    girlName: 'SHE',
  })))

  const page = createPage()
  await page.start()
  await settle()
  try {
    assert.equal(page.data.waitingForPartner, true)
    assert.equal(page.data.memberCount, 1)

    page.onOpenInvite()
    assert.deepEqual(navigations[navigations.length - 1], {
      type: 'navigateTo',
      url: '/pages/space-setup/index?mode=settings',
    })
  } finally {
    page.destroy()
  }
})
