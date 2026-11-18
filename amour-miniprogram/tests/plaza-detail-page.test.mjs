import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 公开空间详情承接页测试。
 *
 * 校验：
 * - 合法 spaceId 调用公开详情接口，并把结构转换成展示模型；
 * - 非法 / 缺失 spaceId 不发起请求，直接给出可返回的错误态；
 * - 空间未公开（20046）与网络失败走不同文案；
 * - 卸载后忽略在途响应；
 * - 返回按钮优先 navigateBack，栈底时 reLaunch 回广场；
 * - 公开照片加载失败只回退对应一张。
 */

const requests = []
let responseHandler = null
const navigations = []
const toasts = []
const pendingCompletes = []
const failedNavigations = []
let pageOptions = null

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getStorageSync: () => '',
  removeStorageSync() {},
  request(options) {
    requests.push(options)
    if (responseHandler) responseHandler(options, requests.length)
  },
  showToast(options) {
    toasts.push(options && options.title)
  },
  navigateTo(options) {
    navigations.push({ type: 'navigateTo', url: options && options.url })
    if (options && options.fail) failedNavigations.push(options.fail)
    // 真实小程序里 complete 在导航结束时才回调；测试通过 pendingCompletes 控制时机。
    if (options && options.complete) pendingCompletes.push(options.complete)
  },
  navigateBack(options) {
    navigations.push({ type: 'back', delta: options && options.delta })
  },
  reLaunch(options) {
    navigations.push({ type: 'reLaunch', url: options && options.url })
  },
}

let pageStack = [{ route: 'pages/plaza/index' }, { route: 'pages/plaza-detail/index' }]
globalThis.getCurrentPages = () => pageStack
globalThis.getApp = () => ({ globalData: {} })
globalThis.Page = (options) => {
  pageOptions = options
}

await import('../miniprogram/pages/plaza-detail/index.ts')

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

const detailBody = {
  spaceId: 2001,
  spaceName: '橙子与子怡的四季',
  description: '记录我们认真生活的每一天。',
  coverImage: 'https://cdn.example.com/cover.jpg',
  loveStartTime: '2024-05-20 19:30:00',
  members: [
    { displayName: '橙留香', avatar: 'https://cdn.example.com/a1.jpg', memberRole: 1 },
    { displayName: '子怡', avatar: '', memberRole: 2 },
  ],
  publicStoryCount: 1,
  publicPhotoCount: 1,
  publicAnniversaryCount: 1,
  stories: [{
    storyId: 8001,
    title: '第一次见面',
    summary: '那天在咖啡馆坐了很久。',
    happenedTime: '2024-05-20 19:30:00',
    tagLabel: '初见',
  }],
  photos: [{
    photoId: 11001,
    title: '周末早餐',
    description: '一起做的第一顿早餐。',
    url: 'https://cdn.example.com/p1.jpg',
  }],
  anniversaries: [{
    anniversaryId: 12001,
    title: '在一起的第一天',
    anniversaryDate: '2024-05-20',
  }],
}

test.beforeEach(() => {
  requests.length = 0
  navigations.length = 0
  toasts.length = 0
  pendingCompletes.length = 0
  failedNavigations.length = 0
  responseHandler = null
  pageStack = [{ route: 'pages/plaza/index' }, { route: 'pages/plaza-detail/index' }]
})

test('合法空间标识：请求公开详情并渲染真实内容', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: true, data: detailBody },
  })
  const page = createPage({ spaceId: '2001' })
  assert.equal(page.data.loading, true)
  await flush()

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url.endsWith('/gallery/space/detail'), true)
  assert.deepEqual(requests[0].data, { spaceId: 2001 })
  assert.equal(page.data.loading, false)
  assert.equal(page.data.loadError, '')
  const space = page.data.space
  assert.equal(space.spaceId, '2001')
  assert.equal(space.spaceName, '橙子与子怡的四季')
  assert.equal(space.stories.length, 1)
  assert.equal(space.stories[0].title, '第一次见面')
  assert.equal(space.photos.length, 1)
  assert.equal(space.anniversaries.length, 1)
  // 只有一方头像时另一方仍展示首字占位
  assert.equal(space.members[0].avatarUrl, 'https://cdn.example.com/a1.jpg')
  assert.equal(space.members[1].avatarUrl, '')
  assert.equal(space.members[1].initial, '子')
})

test('缺失或非法空间标识：不请求接口，给出可返回的不可用状态', () => {
  const missing = createPage({})
  assert.equal(missing.data.loading, false)
  assert.equal(missing.data.unavailable, true)
  assert.match(missing.data.loadError, /空间编号无效/)

  const invalid = createPage({ spaceId: '2001abc' })
  assert.equal(invalid.data.loading, false)
  assert.equal(invalid.data.unavailable, true)
  assert.equal(requests.length, 0)
})

test('空间未公开：展示后端文案并标记不可重试', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: false, message: '该情侣空间未公开', errorCode: '20046' },
  })
  const page = createPage({ spaceId: '2001' })
  await flush()

  assert.equal(page.data.loading, false)
  assert.equal(page.data.space, null)
  assert.equal(page.data.unavailable, true)
  assert.equal(page.data.loadError, '该情侣空间未公开')
})

test('网络失败：展示可重试错误，重新加载成功后恢复', async () => {
  responseHandler = (options, index) => {
    if (index === 1) {
      options.fail({ errMsg: 'request:fail' })
      return
    }
    options.success({ statusCode: 200, data: { success: true, data: detailBody } })
  }
  const page = createPage({ spaceId: '2001' })
  await flush()
  assert.equal(page.data.unavailable, false)
  assert.match(page.data.loadError, /网络连接不太稳定/)

  page.onPrimaryAction()
  await flush()
  assert.equal(requests.length, 2)
  assert.equal(page.data.loadError, '')
  assert.equal(page.data.space.spaceName, '橙子与子怡的四季')
})

test('不可用状态下主按钮直接返回广场', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: false, message: '情侣空间不存在', errorCode: '20032' },
  })
  const page = createPage({ spaceId: '9999' })
  await flush()
  page.onPrimaryAction()
  assert.deepEqual(navigations, [{ type: 'back', delta: 1 }])
})

test('返回：有上级页面用 navigateBack，栈底用 reLaunch', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: true, data: detailBody },
  })
  const page = createPage({ spaceId: '2001' })
  await flush()

  page.goBackToPlaza()
  assert.deepEqual(navigations, [{ type: 'back', delta: 1 }])

  navigations.length = 0
  pageStack = [{ route: 'pages/plaza-detail/index' }]
  page.goBackToPlaza()
  assert.deepEqual(navigations, [{ type: 'reLaunch', url: '/pages/plaza/index' }])
})

test('卸载后忽略在途响应', async () => {
  let release = null
  responseHandler = (options) => {
    release = () => options.success({ statusCode: 200, data: { success: true, data: detailBody } })
  }
  const page = createPage({ spaceId: '2001' })
  page.onUnload()
  const snapshot = JSON.parse(JSON.stringify(page.data))
  release()
  await flush()
  assert.deepEqual(page.data, snapshot)
  assert.equal(page.data.space, null)
})

test('公开照片加载失败只回退对应一张', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: {
      success: true,
      data: Object.assign({}, detailBody, {
        photos: [
          detailBody.photos[0],
          { photoId: 11002, title: '夏日散步', url: 'https://cdn.example.com/p2.jpg' },
        ],
      }),
    },
  })
  const page = createPage({ spaceId: '2001' })
  await flush()

  page.onPhotoError({ currentTarget: { dataset: { index: 0 } } })
  assert.equal(page.data.space.photos[0].failed, true)
  assert.equal(page.data.space.photos[1].failed, undefined)

  // 越界索引不影响任何状态
  page.onPhotoError({ currentTarget: { dataset: { index: 9 } } })
  assert.equal(page.data.space.photos[1].failed, undefined)
})

// ============================ 公开故事 / 照片点击导航 ============================

const listDetailBody = Object.assign({}, detailBody, {
  stories: [
    { storyId: 8001, title: '第一次见面', summary: '', contentPreview: '预览一', contentLength: 12, hasContent: true },
    { storyId: 8002, title: '第一次一起看电影', summary: '散场后还在讨论剧情。', contentLength: 0, hasContent: false },
  ],
  photos: [
    { photoId: 11001, title: '周末早餐', url: 'https://cdn.example.com/p1.jpg' },
    { photoId: 11002, title: '夏日散步', url: 'https://cdn.example.com/p2.jpg' },
  ],
})

test('公开故事列表项点击：带 spaceId + storyId 进入公开故事详情（不使用列表下标）', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: true, data: listDetailBody },
  })
  const page = createPage({ spaceId: '2001' })
  await flush()

  page.onOpenStory({ currentTarget: { dataset: { storyId: '8002' } } })
  assert.deepEqual(navigations, [{
    type: 'navigateTo',
    url: '/pages/plaza-story/plaza-story?spaceId=2001&storyId=8002',
  }])
  // 列表顺序变化后再点同一篇，URL 里的内容标识不变，仍然打开同一篇。
  pendingCompletes.forEach(complete => complete({}))
  pendingCompletes.length = 0
  page.data.space.stories.reverse()
  navigations.length = 0
  page.onOpenStory({ currentTarget: { dataset: { storyId: '8002' } } })
  assert.deepEqual(navigations, [{
    type: 'navigateTo',
    url: '/pages/plaza-story/plaza-story?spaceId=2001&storyId=8002',
  }])
})

test('公开故事列表项点击：非法或缺失标识不导航并提示', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: true, data: listDetailBody },
  })
  const page = createPage({ spaceId: '2001' })
  await flush()

  page.onOpenStory({ currentTarget: { dataset: {} } })
  page.onOpenStory({ currentTarget: { dataset: { storyId: '../../etc/passwd' } } })
  page.onOpenStory({ currentTarget: {} })
  assert.deepEqual(navigations, [])
  assert.equal(toasts.length, 3)
})

test('公开照片列表项点击：带 spaceId + photoId 进入公开照片详情', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: true, data: listDetailBody },
  })
  const page = createPage({ spaceId: '2001' })
  await flush()

  page.onOpenPhoto({ currentTarget: { dataset: { photoId: '11002' } } })
  assert.deepEqual(navigations, [{
    type: 'navigateTo',
    url: '/pages/plaza-photo/plaza-photo?spaceId=2001&photoId=11002',
  }])

  // 列表排序变化不影响定位：仍然按 photoId 传参
  pendingCompletes.forEach(complete => complete({}))
  pendingCompletes.length = 0
  page.data.space.photos.reverse()
  navigations.length = 0
  page.onOpenPhoto({ currentTarget: { dataset: { photoId: '11002' } } })
  assert.deepEqual(navigations, [{
    type: 'navigateTo',
    url: '/pages/plaza-photo/plaza-photo?spaceId=2001&photoId=11002',
  }])
})

test('公开照片列表项点击：非法标识不导航并提示', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: true, data: listDetailBody },
  })
  const page = createPage({ spaceId: '2001' })
  await flush()

  page.onOpenPhoto({ currentTarget: { dataset: { photoId: 'abc' } } })
  page.onOpenPhoto({ currentTarget: { dataset: {} } })
  assert.deepEqual(navigations, [])
  assert.equal(toasts.length, 2)
})

test('快速连续点击只导航一次，导航结束后可再次点击', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: true, data: listDetailBody },
  })
  const page = createPage({ spaceId: '2001' })
  await flush()

  const event = { currentTarget: { dataset: { storyId: '8001' } } }
  page.onOpenStory(event)
  // 导航尚未 complete 时的连击被导航锁挡住，不会叠加多个详情页。
  page.onOpenStory(event)
  page.onOpenPhoto({ currentTarget: { dataset: { photoId: '11001' } } })
  assert.equal(navigations.length, 1)

  pendingCompletes.forEach(complete => complete({}))
  pendingCompletes.length = 0
  page.onOpenStory(event)
  assert.equal(navigations.length, 2)
})

test('导航失败时提示并解锁，用户可以再次点击', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: true, data: listDetailBody },
  })
  const page = createPage({ spaceId: '2001' })
  await flush()

  page.onOpenPhoto({ currentTarget: { dataset: { photoId: '11001' } } })
  assert.equal(failedNavigations.length, 1)
  // 小程序里 fail 之后仍会回调 complete，两者都要能安全释放导航锁。
  failedNavigations.forEach(fail => fail({ errMsg: 'navigateTo:fail' }))
  pendingCompletes.forEach(complete => complete({}))
  pendingCompletes.length = 0
  assert.equal(toasts.length, 1)
  assert.match(String(toasts[0]), /无法打开详情/)

  page.onOpenPhoto({ currentTarget: { dataset: { photoId: '11001' } } })
  assert.equal(navigations.length, 2)
})

test('故事列表项渲染出 hasContent 与正文预览字段，供整行可点击入口使用', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: true, data: listDetailBody },
  })
  const page = createPage({ spaceId: '2001' })
  await flush()

  const [withContent, withoutContent] = page.data.space.stories
  assert.equal(withContent.hasContent, true)
  assert.equal(withContent.contentPreview, '预览一')
  assert.equal(withoutContent.hasContent, false)
  // 摘要为空时回退到正文预览，与后端 contentPreview 语义一致
  assert.equal(withContent.summary, '预览一')
})
