import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 恋爱广场 · 公开照片详情页测试。
 *
 * 覆盖缺陷涉及的关键行为：
 * - 用路由里的 spaceId + photoId 拉取公开空间详情，并按 photoId 精确匹配照片；
 * - 列表顺序 / 分页变化后仍打开正确照片，不会因下标错位而展示别的照片；
 * - 匿名访客可读：只调用 `/gallery/space/detail`，不触发登录、不读私有相册缓存；
 * - 照片不在公开列表（已删除、改为私密、属于其它空间）时展示不可见状态；
 * - 网络失败可重试；非法参数不请求接口；
 * - 左右滑动切换；返回公开空间；卸载后忽略在途响应。
 */

const requests = []
let responseHandler = null
const navigations = []
const toasts = []
const previewCalls = []
const storageReads = []
let pageOptions = null

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getStorageSync(key) {
    storageReads.push(key)
    return ''
  },
  removeStorageSync() {},
  request(options) {
    requests.push(options)
    if (responseHandler) responseHandler(options, requests.length)
  },
  showToast(options) {
    toasts.push(options && options.title)
  },
  navigateBack(options) {
    navigations.push({ type: 'back', delta: options && options.delta })
  },
  reLaunch(options) {
    navigations.push({ type: 'reLaunch', url: options && options.url })
  },
  previewImage(options) {
    previewCalls.push(options)
  },
}

let pageStack = [{ route: 'pages/plaza/index' }, { route: 'pages/plaza-detail/index' }, { route: 'pages/plaza-photo/plaza-photo' }]
globalThis.getCurrentPages = () => pageStack
globalThis.getApp = () => ({ globalData: {} })
globalThis.Page = (options) => {
  pageOptions = options
}

await import('../miniprogram/pages/plaza-photo/plaza-photo.ts')

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function createPage(query) {
  const instance = Object.create(null)
  Object.assign(instance, pageOptions)
  instance.data = JSON.parse(JSON.stringify(pageOptions.data))
  instance.setData = (patch, callback) => {
    Object.keys(patch).forEach((key) => {
      if (key.indexOf('.') === -1 && key.indexOf('[') === -1) {
        instance.data[key] = patch[key]
        return
      }
      const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.')
      let target = instance.data
      parts.slice(0, -1).forEach((part) => {
        if (!target[part] || typeof target[part] !== 'object') target[part] = {}
        target = target[part]
      })
      target[parts[parts.length - 1]] = patch[key]
    })
    if (callback) callback()
  }
  instance.onLoad(query)
  return instance
}

function okBody(data) {
  return { statusCode: 200, data: { success: true, data } }
}

function failBody(message, errorCode) {
  return { statusCode: 200, data: { success: false, message, errorCode } }
}

/** 与后端 GallerySpaceDetailVO 一致：照片按后端返回顺序排列。 */
function spaceDetail(overrides = {}) {
  return Object.assign({
    spaceId: 2001,
    spaceName: '橙子与子怡的四季',
    stories: [{ storyId: 8001, title: '第一次见面' }],
    photos: [
      {
        photoId: 11001,
        title: '周末早餐',
        description: '一起做的第一顿早餐。',
        url: 'https://cdn.example.com/p1.jpg',
        takenTime: '2024-05-20 09:00:00',
        location: '杭州',
      },
      {
        photoId: 11002,
        title: '夏日散步',
        description: '傍晚的风很轻。',
        url: 'https://cdn.example.com/p2.jpg',
        takenTime: '2024-07-01 18:00:00',
        location: '杭州',
      },
    ],
    anniversaries: [],
  }, overrides)
}

test.beforeEach(() => {
  requests.length = 0
  navigations.length = 0
  toasts.length = 0
  previewCalls.length = 0
  storageReads.length = 0
  responseHandler = null
  pageStack = [
    { route: 'pages/plaza/index' },
    { route: 'pages/plaza-detail/index' },
    { route: 'pages/plaza-photo/plaza-photo' },
  ]
})

// ============================ 正常打开 ============================

test('匿名访客按 spaceId + photoId 打开公开照片，展示的照片与点击项一致', async () => {
  responseHandler = (options) => options.success(okBody(spaceDetail()))
  const page = createPage({ spaceId: '2001', photoId: '11002' })

  assert.equal(page.data.loading, true, '首帧展示骨架')
  await flush()

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url.endsWith('/gallery/space/detail'), true, '复用公开空间详情接口')
  assert.deepEqual(requests[0].data, { spaceId: 2001 })
  // 只读公开接口：不读私有相册缓存（photoDetailCollection），也不注入 token
  assert.equal(storageReads.indexOf('photoDetailCollection'), -1)
  assert.equal(requests[0].header.Authorization, undefined)

  assert.equal(page.data.loading, false)
  assert.equal(page.data.error, '')
  assert.equal(page.data.photo.photoId, '11002')
  assert.equal(page.data.photo.title, '夏日散步')
  assert.equal(page.data.photo.description, '傍晚的风很轻。')
  assert.equal(page.data.photo.url, 'https://cdn.example.com/p2.jpg')
  assert.equal(page.data.photoId, '11002')
  assert.equal(page.data.formattedDateTime, '2024年07月01日 18:00')
  assert.equal(page.data.photos.length, 2)
  assert.equal(page.data.index, 1)
})

test('列表顺序变化后仍按 photoId 打开对应照片，而不是错误的下标内容', async () => {
  // 第一次返回顺序 A、B；第二次同一 photoId 11002 落在下标 0。
  const reordered = spaceDetail({ photos: [spaceDetail().photos[1], spaceDetail().photos[0]] })
  responseHandler = (options) => options.success(okBody(reordered))
  const page = createPage({ spaceId: '2001', photoId: '11002' })
  await flush()

  assert.equal(page.data.photo.title, '夏日散步')
  assert.equal(page.data.photo.url, 'https://cdn.example.com/p2.jpg')
  assert.equal(page.data.index, 0, '下标随接口顺序变化，但照片本身不变')

  // 再打开 11001：即使它现在在下标 1，也必须展示它自己的内容。
  responseHandler = (options) => options.success(okBody(reordered))
  const other = createPage({ spaceId: '2001', photoId: '11001' })
  await flush()
  assert.equal(other.data.photo.title, '周末早餐')
  assert.equal(other.data.photo.url, 'https://cdn.example.com/p1.jpg')
  assert.equal(other.data.index, 1)
})

test('空间详情多页 / 照片增删：只要 photoId 仍在公开列表就能定位', async () => {
  const detail = spaceDetail()
  // 模拟后方新增更多照片后重排：目标照片仍是同一张
  const grown = {
    photos: [
      { photoId: 11003, title: '新照片', url: 'https://cdn.example.com/p3.jpg' },
    ].concat(detail.photos),
  }
  const firstResponse = okBody(detail)
  const secondResponse = okBody(grown)
  let call = 0
  responseHandler = (options) => options.success(call++ === 0 ? firstResponse : secondResponse)

  const page = createPage({ spaceId: '2001', photoId: '11002' })
  await flush()
  assert.equal(page.data.photo.title, '夏日散步')
  assert.equal(page.data.index, 1)

  await page.loadPhoto()
  await flush()
  assert.equal(page.data.photo.title, '夏日散步')
  assert.equal(page.data.index, 2)
})

// ============================ 私密 / 不存在 ============================

test('照片不在公开列表（已删除 / 改为私密）：展示不可见状态且不展示任何照片内容', async () => {
  // 私密照片 11003 不会出现在公开快照里
  responseHandler = (options) => options.success(okBody(spaceDetail()))
  const page = createPage({ spaceId: '2001', photoId: '11003' })
  await flush()

  assert.equal(page.data.loading, false)
  assert.equal(page.data.photo, null)
  assert.deepEqual(page.data.photos, [])
  assert.match(page.data.error, /照片暂时无法查看/)
  page.onPrimaryAction()
  assert.deepEqual(navigations, [{ type: 'back', delta: 1 }])
})

test('空间已不公开 / 已解绑：不可重试并可直接返回', async () => {
  responseHandler = (options) => options.success(failBody('该情侣空间未公开', '20046'))
  const page = createPage({ spaceId: '2001', photoId: '11001' })
  await flush()

  assert.equal(page.data.unavailable, true)
  assert.equal(page.data.error, '该情侣空间未公开')
  assert.equal(page.data.photo, null)
  page.onPrimaryAction()
  assert.deepEqual(navigations, [{ type: 'back', delta: 1 }])
})

test('公开列表里没有可加载地址的照片（相对路径）按不存在处理', async () => {
  responseHandler = (options) => options.success(okBody(spaceDetail({
    photos: [{ photoId: 11001, title: '相对路径', url: '/assets/album/1.jpg' }],
  })))
  const page = createPage({ spaceId: '2001', photoId: '11001' })
  await flush()
  assert.equal(page.data.photo, null)
  assert.match(page.data.error, /照片暂时无法查看/)
})

test('网络失败：可重试，成功后展示照片', async () => {
  responseHandler = (options, index) => {
    if (index === 1) {
      options.fail({ errMsg: 'request:fail' })
      return
    }
    options.success(okBody(spaceDetail()))
  }
  const page = createPage({ spaceId: '2001', photoId: '11001' })
  await flush()
  assert.match(page.data.error, /网络连接不太稳定/)

  page.onPrimaryAction()
  await flush()
  assert.equal(requests.length, 2)
  assert.equal(page.data.error, '')
  assert.equal(page.data.photo.photoId, '11001')
})

// ============================ 参数校验 ============================

test('缺失或非法参数：不请求接口，直接给出可返回的错误态', async () => {
  const missing = createPage({})
  assert.equal(missing.data.unavailable, true)
  assert.match(missing.data.error, /照片编号无效/)

  const badSpace = createPage({ spaceId: 'x', photoId: '11001' })
  assert.equal(badSpace.data.unavailable, true)

  const badPhoto = createPage({ spaceId: '2001', photoId: '../1' })
  assert.equal(badPhoto.data.unavailable, true)

  assert.equal(requests.length, 0)
})

// ============================ 交互 ============================

test('左右滑动在同一空间的公开照片内切换，并同步 photoId', async () => {
  responseHandler = (options) => options.success(okBody(spaceDetail()))
  const page = createPage({ spaceId: '2001', photoId: '11001' })
  await flush()
  assert.equal(page.data.photo.photoId, '11001')

  // 左滑 → 下一张
  page.onTouchStart({ touches: [{ clientX: 300, clientY: 400 }] })
  page.onTouchEnd({ changedTouches: [{ clientX: 150, clientY: 405 }] })
  assert.equal(page.data.photo.photoId, '11002')
  assert.equal(page.data.photoId, '11002')

  // 右滑 → 上一张
  page.onTouchStart({ touches: [{ clientX: 150, clientY: 400 }] })
  page.onTouchEnd({ changedTouches: [{ clientX: 300, clientY: 400 }] })
  assert.equal(page.data.photo.photoId, '11001')

  // 到头后继续右滑不越界
  page.onTouchStart({ touches: [{ clientX: 150, clientY: 400 }] })
  page.onTouchEnd({ changedTouches: [{ clientX: 300, clientY: 400 }] })
  assert.equal(page.data.photo.photoId, '11001')
})

test('纵向滑动与过小位移不触发切换', async () => {
  responseHandler = (options) => options.success(okBody(spaceDetail()))
  const page = createPage({ spaceId: '2001', photoId: '11001' })
  await flush()

  page.onTouchStart({ touches: [{ clientX: 300, clientY: 100 }] })
  page.onTouchEnd({ changedTouches: [{ clientX: 290, clientY: 400 }] })
  assert.equal(page.data.photo.photoId, '11001')

  page.onTouchStart({ touches: [{ clientX: 300, clientY: 400 }] })
  page.onTouchEnd({ changedTouches: [{ clientX: 280, clientY: 400 }] })
  assert.equal(page.data.photo.photoId, '11001')
})

test('预览原图使用公开照片地址，不包含私有相册数据', async () => {
  responseHandler = (options) => options.success(okBody(spaceDetail()))
  const page = createPage({ spaceId: '2001', photoId: '11002' })
  await flush()

  page.onPreviewImage()
  assert.equal(previewCalls.length, 1)
  assert.equal(previewCalls[0].current, 'https://cdn.example.com/p2.jpg')
  assert.deepEqual(previewCalls[0].urls, [
    'https://cdn.example.com/p1.jpg',
    'https://cdn.example.com/p2.jpg',
  ])
})

test('照片加载失败标记当前照片但仍展示文字信息', async () => {
  responseHandler = (options) => options.success(okBody(spaceDetail()))
  const page = createPage({ spaceId: '2001', photoId: '11001' })
  await flush()

  page.onPhotoError({ currentTarget: { dataset: { index: 0 } } })
  assert.equal(page.data.photos[0].failed, true)
  assert.equal(page.data.photo.failed, true)
  assert.equal(page.data.photo.title, '周末早餐')
})

// ============================ 返回与生命周期 ============================

test('返回公开空间：有上级页面用 navigateBack，栈底按 spaceId 重建公开空间页', async () => {
  responseHandler = (options) => options.success(okBody(spaceDetail()))
  const page = createPage({ spaceId: '2001', photoId: '11001' })
  await flush()

  page.backToSpace()
  assert.deepEqual(navigations, [{ type: 'back', delta: 1 }])

  navigations.length = 0
  pageStack = [{ route: 'pages/plaza-photo/plaza-photo' }]
  page.backToSpace()
  assert.deepEqual(navigations, [{ type: 'reLaunch', url: '/pages/plaza-detail/index?spaceId=2001' }])
})

test('卸载后忽略在途响应', async () => {
  let release = null
  responseHandler = (options) => {
    release = () => options.success(okBody(spaceDetail()))
  }
  const page = createPage({ spaceId: '2001', photoId: '11001' })
  page.onUnload()
  const snapshot = JSON.parse(JSON.stringify(page.data))
  release()
  await flush()
  assert.deepEqual(page.data, snapshot)
  assert.equal(page.data.photo, null)
})

// ============================ 访问级别 ============================

test('公开照片详情页属于 public：匿名 / 无空间用户都能直接进入', async () => {
  const { resolvePageAccess, canAccessPage } = await import('../miniprogram/utils/session-rules.js')
  const { SESSION_STATUS, PAGE_ACCESS } = await import('../miniprogram/utils/session-constants.js')
  assert.equal(resolvePageAccess('pages/plaza-photo/plaza-photo'), PAGE_ACCESS.PUBLIC)
  for (const status of [
    SESSION_STATUS.LOADING,
    SESSION_STATUS.UNAUTHENTICATED,
    SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE,
    SESSION_STATUS.ERROR,
    SESSION_STATUS.AUTHENTICATED_WITH_SPACE,
  ]) {
    assert.equal(canAccessPage(PAGE_ACCESS.PUBLIC, status), true, status)
  }
  // 私有相册详情仍然是 space 级别，未被这次修复放宽
  assert.equal(resolvePageAccess('pages/photo-detail/photo-detail'), PAGE_ACCESS.SPACE)
})

// ============================ 导航栏返回兜底 ============================

test('导航栏返回：从公开空间进入时交给 navigateBack，栈底时按 spaceId 重建公开空间页', async () => {
  responseHandler = (options) => options.success(okBody(spaceDetail()))
  const page = createPage({ spaceId: '2001', photoId: '11001' })
  await flush()

  pageStack = [{ route: 'pages/plaza/index' }, { route: 'pages/plaza-detail/index' }, { route: 'pages/plaza-photo/plaza-photo' }]
  page.onShow()
  navigations.length = 0
  page.onNavBack()
  assert.deepEqual(navigations, [])

  pageStack = [{ route: 'pages/plaza-photo/plaza-photo' }]
  page.onShow()
  navigations.length = 0
  page.onNavBack()
  assert.deepEqual(navigations, [{ type: 'reLaunch', url: '/pages/plaza-detail/index?spaceId=2001' }])
})
