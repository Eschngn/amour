import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 端到端验收：从「恋爱广场」进入他人公开空间后，点击故事 / 照片打开正确详情。
 *
 * 用真实页面定义 + 最小小程序运行时桩，把三跳链路串起来跑：
 *   广场列表 →（点卡片，拿 spaceId）→ 公开空间 →（点列表项，拿 spaceId+内容 ID）→ 公开详情。
 * 导航 URL 会被解析成下一页的 query，和真实路由行为一致，
 * 因此这里能验证「点击后进入的详情页确实展示了被点击的那条内容」。
 */

const requests = []
const navigations = []
const toasts = []
let responseHandler = null

/** 最近一次 Page(...) 注册的页面定义（import 时按需捕获）。 */
let lastPageOptions = null
/** 当前页面栈，栈顶为正在交互的页面。 */
let pageStack = []

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getStorageSync: () => '',
  setStorageSync() {},
  removeStorageSync() {},
  request(options) {
    requests.push(options)
    if (responseHandler) responseHandler(options, requests.length)
  },
  showToast(options) {
    toasts.push(options && options.title)
  },
  navigateTo(options) {
    navigations.push(options && options.url)
    if (options && options.complete) options.complete({})
  },
  navigateBack(options) {
    navigations.push(`back:${(options && options.delta) || 1}`)
  },
  reLaunch(options) {
    navigations.push(options && options.url)
  },
  previewImage() {},
}
globalThis.getCurrentPages = () => pageStack
globalThis.getApp = () => ({ globalData: {} })
globalThis.Page = (options) => {
  lastPageOptions = options
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

/** 加载页面模块并返回它注册的 Page(...) 定义。 */
async function loadPage(file) {
  lastPageOptions = null
  await import(file)
  assert.ok(lastPageOptions, `${file} 未注册页面定义`)
  return lastPageOptions
}

const plazaPage = await loadPage('../miniprogram/pages/plaza/index.ts')
const detailPage = await loadPage('../miniprogram/pages/plaza-detail/index.ts')
const storyPage = await loadPage('../miniprogram/pages/plaza-story/plaza-story.ts')
const photoPage = await loadPage('../miniprogram/pages/plaza-photo/plaza-photo.ts')

const ROUTES = {
  'pages/plaza/index': plazaPage,
  'pages/plaza-detail/index': detailPage,
  'pages/plaza-story/plaza-story': storyPage,
  'pages/plaza-photo/plaza-photo': photoPage,
}

function createPage(options, query = {}) {
  const instance = Object.create(null)
  Object.assign(instance, options)
  instance.data = JSON.parse(JSON.stringify(options.data))
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

/** 解析 navigateTo 的 url：返回注册表里的页面定义与 query（与小程序一致，query 值已解码）。 */
function resolveNavigation(url) {
  const [path, queryString = ''] = String(url).split('?')
  const route = path.replace(/^\//, '')
  const query = {}
  queryString.split('&').filter(Boolean).forEach((pair) => {
    const [key, value = ''] = pair.split('=')
    query[decodeURIComponent(key)] = decodeURIComponent(value)
  })
  return { route, query, options: ROUTES[route] }
}

function okBody(data) {
  return { statusCode: 200, data: { success: true, data } }
}

function failBody(message, errorCode) {
  return { statusCode: 200, data: { success: false, message, errorCode } }
}

/** 与 seed / GalleryPublicApiIntegrationTest 一致的公开数据。 */
const publicSpaceDetail = {
  spaceId: 2001,
  spaceName: '橙子与子怡的四季',
  description: '记录我们认真生活的每一天。',
  coverImage: '',
  loveStartTime: '2024-05-20 19:30:00',
  members: [{ displayName: '橙留香' }, { displayName: '子怡' }],
  publicStoryCount: 2,
  publicPhotoCount: 2,
  publicAnniversaryCount: 1,
  stories: [
    {
      storyId: 8001,
      title: '第一次见面',
      summary: '那天在咖啡馆坐了很久。',
      contentPreview: '我们第一次见面，聊了很多关于未来和旅行的话题。',
      contentLength: 23,
      hasContent: true,
      happenedTime: '2024-05-20 19:30:00',
      location: '杭州',
      tagLabel: '初见',
    },
    {
      storyId: 8002,
      title: '第一次一起看电影',
      summary: '散场后还在讨论剧情。',
      contentPreview: '第一次一起看电影，回家路上买了两杯热奶茶。',
      contentLength: 21,
      hasContent: true,
      happenedTime: '2024-06-01 20:00:00',
      location: '杭州',
      tagLabel: '日常',
    },
  ],
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
  anniversaries: [
    { anniversaryId: 12001, title: '在一起的第一天', anniversaryDate: '2024-05-20' },
  ],
}

/** 公开故事正文：按 storyId 返回，模拟后端按快照查找。 */
const publicStories = {
  8001: {
    storyId: 8001,
    title: '第一次见面',
    summary: '那天在咖啡馆坐了很久。',
    content: '我们第一次见面，聊了很多关于未来和旅行的话题。',
    happenedTime: '2024-05-20 19:30:00',
    location: '杭州',
    tagLabel: '初见',
  },
  8002: {
    storyId: 8002,
    title: '第一次一起看电影',
    summary: '散场后还在讨论剧情。',
    content: '第一次一起看电影，回家路上买了两杯热奶茶。',
    happenedTime: '2024-06-01 20:00:00',
    location: '杭州',
    tagLabel: '日常',
  },
}

/** 后端路由分发：与真实接口契约一致，私密内容不会出现在公开响应里。 */
function backend(options) {
  const path = String(options.url).replace(/^https?:\/\/[^/]+/, '')
  if (path.endsWith('/gallery/spaces')) {
    options.success(okBody({
      current: 1,
      size: 8,
      total: 1,
      records: [{
        spaceId: 2001,
        spaceName: publicSpaceDetail.spaceName,
        description: publicSpaceDetail.description,
        members: publicSpaceDetail.members,
        publicStoryCount: 2,
        publicPhotoCount: 2,
      }],
    }))
    return
  }
  if (path.endsWith('/gallery/space/detail')) {
    options.success(okBody(publicSpaceDetail))
    return
  }
  if (path.endsWith('/gallery/space/story/detail')) {
    const story = publicStories[options.data.storyId]
    if (!story) {
      // 私密 / 已删除 / 其它空间的故事：后端统一返回 20003，不泄露存在性
      options.success(failBody('故事节点不存在', '20003'))
      return
    }
    options.success(okBody(story))
    return
  }
  options.success(failBody('未覆盖的接口', '99999'))
}

test.beforeEach(() => {
  requests.length = 0
  navigations.length = 0
  toasts.length = 0
  responseHandler = backend
  pageStack = [{ route: 'pages/plaza/index' }]
})

// ============================ 主链路 ============================

test('端到端：广场 → 他人公开空间 → 点击故事 → 打开该故事的正确详情', async () => {
  // 1. 恋爱广场列表
  const plaza = createPage(plazaPage)
  pageStack = [{ route: 'pages/plaza/index' }]
  plaza.onLoad()
  await flush()
  assert.equal(plaza.data.cards.length, 1)
  const card = plaza.data.cards[0]
  assert.equal(card.spaceId, '2001')

  // 2. 点击卡片进入公开空间
  navigations.length = 0
  plaza.onOpenSpace({ detail: { spaceId: card.spaceId } })
  assert.equal(navigations.length, 1)
  const spaceNav = resolveNavigation(navigations[0])
  assert.equal(spaceNav.route, 'pages/plaza-detail/index')

  const space = createPage(spaceNav.options, spaceNav.query)
  pageStack = [plaza, space]
  await flush()
  assert.equal(space.data.space.spaceId, '2001')
  assert.equal(space.data.space.stories.length, 2)

  // 3. 点击「第一次一起看电影」这一条
  const targetStory = space.data.space.stories[1]
  assert.equal(targetStory.storyId, '8002')
  navigations.length = 0
  space.onOpenStory({ currentTarget: { dataset: { storyId: targetStory.storyId } } })
  assert.equal(navigations.length, 1)
  const storyNav = resolveNavigation(navigations[0])
  assert.equal(storyNav.route, 'pages/plaza-story/plaza-story')
  assert.deepEqual(storyNav.query, { spaceId: '2001', storyId: '8002' })

  // 4. 打开公开故事详情：内容必须与点击项一致
  const story = createPage(storyNav.options, storyNav.query)
  pageStack = [plaza, space, story]
  await flush()
  assert.equal(story.data.error, '')
  assert.equal(story.data.story.storyId, '8002')
  assert.equal(story.data.story.title, '第一次一起看电影')
  assert.equal(story.data.blocks[0].text, '第一次一起看电影，回家路上买了两杯热奶茶。')

  // 5. 返回：回到公开空间，而不是广场 / 故事列表
  navigations.length = 0
  story.backToSpace()
  assert.deepEqual(navigations, ['back:1'])
})

test('端到端：广场 → 他人公开空间 → 点击照片 → 打开该照片的正确详情', async () => {
  const plaza = createPage(plazaPage)
  pageStack = [{ route: 'pages/plaza/index' }]
  plaza.onLoad()
  await flush()
  plaza.onOpenSpace({ detail: { spaceId: plaza.data.cards[0].spaceId } })
  const spaceNav = resolveNavigation(navigations[navigations.length - 1])
  const space = createPage(spaceNav.options, spaceNav.query)
  pageStack = [plaza, space]
  await flush()

  const targetPhoto = space.data.space.photos[1]
  assert.equal(targetPhoto.photoId, '11002')
  navigations.length = 0
  space.onOpenPhoto({ currentTarget: { dataset: { photoId: targetPhoto.photoId } } })
  const photoNav = resolveNavigation(navigations[0])
  assert.equal(photoNav.route, 'pages/plaza-photo/plaza-photo')
  assert.deepEqual(photoNav.query, { spaceId: '2001', photoId: '11002' })

  const photo = createPage(photoNav.options, photoNav.query)
  pageStack = [plaza, space, photo]
  await flush()
  assert.equal(photo.data.error, '')
  assert.equal(photo.data.photo.photoId, '11002')
  assert.equal(photo.data.photo.title, '夏日散步')
  assert.equal(photo.data.photo.description, '傍晚的风很轻。')
  assert.equal(photo.data.photo.url, 'https://cdn.example.com/p2.jpg')

  navigations.length = 0
  photo.backToSpace()
  assert.deepEqual(navigations, ['back:1'])
})

test('端到端：列表顺序变化后点击仍打开对应内容（不依赖下标）', async () => {
  const space = createPage(detailPage, { spaceId: '2001' })
  pageStack = [{ route: 'pages/plaza-detail/index' }]
  await flush()

  // 把列表倒序，模拟后端排序 / 新增内容后顺序变化
  space.data.space.stories.reverse()
  space.data.space.photos.reverse()

  space.onOpenStory({ currentTarget: { dataset: { storyId: '8001' } } })
  const storyNav = resolveNavigation(navigations[navigations.length - 1])
  assert.deepEqual(storyNav.query, { spaceId: '2001', storyId: '8001' })
  const story = createPage(storyNav.options, storyNav.query)
  await flush()
  assert.equal(story.data.story.title, '第一次见面')
  assert.equal(story.data.blocks[0].text, '我们第一次见面，聊了很多关于未来和旅行的话题。')

  navigations.length = 0
  space.onOpenPhoto({ currentTarget: { dataset: { photoId: '11001' } } })
  const photoNav = resolveNavigation(navigations[navigations.length - 1])
  assert.deepEqual(photoNav.query, { spaceId: '2001', photoId: '11001' })
  const photo = createPage(photoNav.options, photoNav.query)
  await flush()
  assert.equal(photo.data.photo.title, '周末早餐')
})

test('端到端：快速连续点击只打开一个详情页', async () => {
  const space = createPage(detailPage, { spaceId: '2001' })
  pageStack = [{ route: 'pages/plaza-detail/index' }]
  await flush()

  // 小程序里 complete 在动画结束后回调；这里先挂起 complete 模拟连击窗口
  const pending = []
  const originalComplete = globalThis.wx.navigateTo
  globalThis.wx.navigateTo = (options) => {
    navigations.push(options.url)
    if (options.complete) pending.push(options.complete)
  }
  try {
    space.onOpenStory({ currentTarget: { dataset: { storyId: '8001' } } })
    space.onOpenStory({ currentTarget: { dataset: { storyId: '8002' } } })
    space.onOpenPhoto({ currentTarget: { dataset: { photoId: '11001' } } })
    assert.equal(navigations.length, 1)
    assert.match(navigations[0], /plaza-story/)
    pending.forEach(complete => complete({}))
    space.onOpenPhoto({ currentTarget: { dataset: { photoId: '11001' } } })
    assert.equal(navigations.length, 2)
  } finally {
    globalThis.wx.navigateTo = originalComplete
  }
})

// ============================ 私密 / 异常 ============================

test('端到端：私密故事不在公开列表内，直接按 ID 访问也被后端拒绝', async () => {
  const space = createPage(detailPage, { spaceId: '2001' })
  pageStack = [{ route: 'pages/plaza-detail/index' }]
  await flush()
  // 私密故事 8003 不会出现在公开空间的故事列表里
  assert.deepEqual(space.data.space.stories.map(story => story.storyId), ['8001', '8002'])

  // 即使有人手工拼出 / 分享私密故事链接，也拿不到正文
  const story = createPage(storyPage, { spaceId: '2001', storyId: '8003' })
  pageStack = [{ route: 'pages/plaza-story/plaza-story' }]
  await flush()
  assert.equal(story.data.story, null)
  assert.deepEqual(story.data.blocks, [])
  assert.equal(story.data.unavailable, true)
  assert.equal(story.data.error, '故事节点不存在')
})

test('端到端：私密照片不在公开列表内，直接按 ID 访问展示不可见状态', async () => {
  const space = createPage(detailPage, { spaceId: '2001' })
  pageStack = [{ route: 'pages/plaza-detail/index' }]
  await flush()
  assert.deepEqual(space.data.space.photos.map(photo => photo.photoId), ['11001', '11002'])

  const photo = createPage(photoPage, { spaceId: '2001', photoId: '11003' })
  pageStack = [{ route: 'pages/plaza-photo/plaza-photo' }]
  await flush()
  assert.equal(photo.data.photo, null)
  assert.equal(photo.data.unavailable, true)
  assert.match(photo.data.error, /照片暂时无法查看/)
})

test('端到端：空间改为私密后，公开空间与公开详情都按不可见处理', async () => {
  responseHandler = (options) => {
    const path = String(options.url).replace(/^https?:\/\/[^/]+/, '')
    if (path.endsWith('/gallery/space/detail') || path.endsWith('/gallery/space/story/detail')) {
      options.success(failBody('该情侣空间未公开', '20046'))
      return
    }
    if (path.endsWith('/gallery/spaces')) {
      options.success(okBody({ current: 1, size: 8, total: 0, records: [] }))
      return
    }
    options.success(failBody('未覆盖的接口', '99999'))
  }

  const space = createPage(detailPage, { spaceId: '2001' })
  await flush()
  assert.equal(space.data.space, null)
  assert.equal(space.data.unavailable, true)
  assert.equal(space.data.loadError, '该情侣空间未公开')

  const story = createPage(storyPage, { spaceId: '2001', storyId: '8001' })
  await flush()
  assert.equal(story.data.story, null)
  assert.equal(story.data.unavailable, true)

  const photo = createPage(photoPage, { spaceId: '2001', photoId: '11001' })
  await flush()
  assert.equal(photo.data.photo, null)
  assert.equal(photo.data.unavailable, true)
})

test('端到端：分享进入公开详情（栈底）时返回会重建公开空间页', async () => {
  const story = createPage(storyPage, { spaceId: '2001', storyId: '8001' })
  pageStack = [{ route: 'pages/plaza-story/plaza-story' }]
  await flush()
  assert.equal(story.data.story.title, '第一次见面')

  navigations.length = 0
  story.backToSpace()
  assert.deepEqual(navigations, ['/pages/plaza-detail/index?spaceId=2001'])
})

test('端到端：本人 / 情侣空间私有详情页的行为未被修改', async () => {
  const { resolvePageAccess } = await import('../miniprogram/utils/session-rules.js')
  const { PAGE_ACCESS } = await import('../miniprogram/utils/session-constants.js')
  // 私有故事 / 相册详情仍然要求登录 + 情侣空间
  assert.equal(resolvePageAccess('pages/story-detail/story-detail'), PAGE_ACCESS.SPACE)
  assert.equal(resolvePageAccess('pages/photo-detail/photo-detail'), PAGE_ACCESS.SPACE)
  // 公开详情页是独立新增页面，不改变私有页面路由与参数约定
  assert.equal(resolvePageAccess('pages/plaza-story/plaza-story'), PAGE_ACCESS.PUBLIC)
  assert.equal(resolvePageAccess('pages/plaza-photo/plaza-photo'), PAGE_ACCESS.PUBLIC)
})

test('端到端：从详情页返回后公开空间保持原有列表与状态，不重新加载', async () => {
  const space = createPage(detailPage, { spaceId: '2001' })
  pageStack = [{ route: 'pages/plaza/index' }, { route: 'pages/plaza-detail/index' }]
  await flush()

  const storyIdsBefore = space.data.space.stories.map(story => story.storyId)
  const photoIdsBefore = space.data.space.photos.map(photo => photo.photoId)
  const requestCountBefore = requests.length

  // 打开故事详情
  space.onOpenStory({ currentTarget: { dataset: { storyId: '8001' } } })
  const storyNav = resolveNavigation(navigations[navigations.length - 1])
  const story = createPage(storyNav.options, storyNav.query)
  await flush()
  assert.equal(story.data.story.storyId, '8001')

  // 返回：navigateBack 只出栈，公开空间页实例与数据保持不变
  story.backToSpace()
  // 退回后公开空间重新可见（onShow 由框架触发；页面本身不做隐式刷新）
  pageStack = [{ route: 'pages/plaza/index' }, { route: 'pages/plaza-detail/index' }]
  if (typeof space.onShow === 'function') space.onShow()
  await flush()

  assert.deepEqual(space.data.space.stories.map(story => story.storyId), storyIdsBefore)
  assert.deepEqual(space.data.space.photos.map(photo => photo.photoId), photoIdsBefore)
  assert.equal(space.data.loading, false)
  assert.equal(space.data.loadError, '')
  // 只新增了详情页自己的请求，空间页没有重新请求
  assert.equal(requests.length, requestCountBefore + 1)
})
