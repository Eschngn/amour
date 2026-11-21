import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 恋爱广场 · 公开故事详情页测试。
 *
 * 覆盖缺陷涉及的关键行为：
 * - 按路由里的 spaceId + storyId 拉取 `/gallery/space/story/detail`（不依赖列表下标 / 缓存）；
 * - 展示的正文与点开的故事严格一致（不同 storyId 返回不同正文，不会串内容）；
 * - 匿名访客可读：页面不调用 `/story/detail`、不要求登录态与情侣空间；
 * - 私密 / 已删除 / 已改私密（后端 20003）展示不可见空状态且不展示任何正文；
 * - 网络失败可重试，非法参数不请求接口；
 * - 返回公开空间：优先 navigateBack，栈底按 spaceId 重建公开空间页；
 * - 卸载后忽略在途响应。
 */

const requests = []
let responseHandler = null
const navigations = []
const toasts = []
const previewCalls = []
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

let pageStack = [{ route: 'pages/plaza/index' }, { route: 'pages/plaza-detail/index' }, { route: 'pages/plaza-story/plaza-story' }]
globalThis.getCurrentPages = () => pageStack
globalThis.getApp = () => ({ globalData: {} })
globalThis.Page = (options) => {
  pageOptions = options
}

await import('../miniprogram/pages/plaza-story/plaza-story.ts')

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

/** 页面实例桩：setData 支持 a.b 与 a[0].b 两种路径，并保证每次写入生成新对象。 */
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

/** 与 seed / GalleryPublicApiIntegrationTest 一致的公开故事详情。 */
function storyDetail(overrides = {}) {
  return Object.assign({
    storyId: 8001,
    title: '第一次见面',
    summary: '那天在咖啡馆坐了很久。',
    content: '我们第一次见面，聊了很多关于未来和旅行的话题。',
    happenedTime: '2024-05-20 19:30:00',
    location: '杭州',
    coverImage: '',
    tagLabel: '初见',
    isMilestone: true,
  }, overrides)
}

test.beforeEach(() => {
  requests.length = 0
  navigations.length = 0
  toasts.length = 0
  previewCalls.length = 0
  responseHandler = null
  pageStack = [
    { route: 'pages/plaza/index' },
    { route: 'pages/plaza-detail/index' },
    { route: 'pages/plaza-story/plaza-story' },
  ]
})

// ============================ 正常打开 ============================

test('匿名访客按 spaceId + storyId 打开公开故事，展示的正文与点击项一致', async () => {
  responseHandler = (options) => options.success(okBody(storyDetail()))
  const page = createPage({ spaceId: '2001', storyId: '8001' })

  assert.equal(page.data.loading, true, '首帧展示骨架')
  await flush()

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url.endsWith('/gallery/space/story/detail'), true)
  assert.equal(requests[0].url.endsWith('/gallery/space/story/detail'), true, '必须走公开故事接口')
  // 私有故事详情接口是 POST /story/detail：地址路径的最后两段必须是 gallery/space/story/detail
  assert.equal(/\/gallery\/space\/story\/detail$/.test(requests[0].url), true, '不能走私有故事接口')
  assert.deepEqual(requests[0].data, { spaceId: 2001, storyId: 8001 })
  // 匿名访问不注入 token
  assert.equal(requests[0].header.Authorization, undefined)

  assert.equal(page.data.loading, false)
  assert.equal(page.data.error, '')
  assert.equal(page.data.story.storyId, '8001')
  assert.equal(page.data.story.title, '第一次见面')
  assert.equal(page.data.totalWords, 23)
  assert.equal(page.data.readTime, '约 1 分钟')
  assert.equal(page.data.formattedDate, '2024.05.20')
  // 正文被解析成段落块，内容完整
  assert.equal(page.data.blocks.length, 1)
  assert.equal(page.data.blocks[0].type, 'paragraph')
  assert.equal(page.data.blocks[0].text, '我们第一次见面，聊了很多关于未来和旅行的话题。')
})

test('不同 storyId 拉到各自正文：不会因为列表顺序或缓存串内容', async () => {
  const bodies = {
    8001: storyDetail(),
    8002: storyDetail({
      storyId: 8002,
      title: '第一次一起看电影',
      summary: '散场后还在讨论剧情。',
      content: '第一次一起看电影，回家路上买了两杯热奶茶。',
      happenedTime: '2024-06-01 20:00:00',
      tagLabel: '日常',
    }),
  }
  responseHandler = (options) => options.success(okBody(bodies[options.data.storyId]))
  const first = createPage({ spaceId: '2001', storyId: '8001' })
  await flush()
  const second = createPage({ spaceId: '2001', storyId: '8002' })
  await flush()

  assert.equal(first.data.story.storyId, '8001')
  assert.equal(first.data.story.title, '第一次见面')
  assert.equal(second.data.story.storyId, '8002')
  assert.equal(second.data.story.title, '第一次一起看电影')
  assert.equal(second.data.blocks[0].text, '第一次一起看电影，回家路上买了两杯热奶茶。')
  assert.deepEqual(requests.map(item => item.data), [
    { spaceId: 2001, storyId: 8001 },
    { spaceId: 2001, storyId: 8002 },
  ])
})

test('Markdown 正文解析：标题 / 段落 / 引用 / 列表 / 代码 / 图片与私有详情共用同一套语义', async () => {
  const content = [
    '# 初见',
    '',
    '第一段正文。',
    '',
    '> 引用一句话',
    '',
    '- 列表项',
    '',
    '```js',
    'const a = 1',
    '```',
    '',
    '![合影](https://cdn.example.com/story.jpg)',
  ].join('\n')
  responseHandler = (options) => options.success(okBody(storyDetail({ content })))
  const page = createPage({ spaceId: '2001', storyId: '8001' })
  await flush()

  const types = page.data.blocks.map(block => block.type)
  assert.deepEqual(types, ['heading', 'paragraph', 'quote', 'list', 'code', 'image'])
  assert.equal(page.data.blocks[0].text, '初见')
  assert.equal(page.data.blocks[4].language, 'JS')
  assert.deepEqual(page.data.contentImages, ['https://cdn.example.com/story.jpg'])
})

// ============================ 私密 / 不存在 ============================

test('私密或已删除的故事（20003）：展示不可见空状态，不渲染任何正文', async () => {
  responseHandler = (options) => options.success(failBody('故事节点不存在', '20003'))
  const page = createPage({ spaceId: '2001', storyId: '8003' })
  await flush()

  assert.equal(page.data.loading, false)
  assert.equal(page.data.story, null)
  assert.deepEqual(page.data.blocks, [])
  assert.equal(page.data.unavailable, true)
  assert.equal(page.data.error, '故事节点不存在')
  // 不可见时主按钮直接返回公开空间，不再重试
  page.onPrimaryAction()
  assert.deepEqual(navigations, [{ type: 'back', delta: 1 }])
})

test('空间已不公开（20046）：同样不可重试并可直接返回', async () => {
  responseHandler = (options) => options.success(failBody('该情侣空间未公开', '20046'))
  const page = createPage({ spaceId: '2001', storyId: '8001' })
  await flush()

  assert.equal(page.data.unavailable, true)
  assert.equal(page.data.error, '该情侣空间未公开')
  assert.equal(page.data.story, null)
})

test('网络失败：可重试，成功后展示正文', async () => {
  responseHandler = (options, index) => {
    if (index === 1) {
      options.fail({ errMsg: 'request:fail' })
      return
    }
    options.success(okBody(storyDetail()))
  }
  const page = createPage({ spaceId: '2001', storyId: '8001' })
  await flush()
  assert.match(page.data.error, /网络连接不太稳定/)

  page.onPrimaryAction()
  await flush()
  assert.equal(requests.length, 2)
  assert.equal(page.data.error, '')
  assert.equal(page.data.story.storyId, '8001')
})

// ============================ 参数校验 ============================

test('缺失或非法参数：不请求接口，直接给出可返回的错误态', async () => {
  const missing = createPage({})
  assert.equal(missing.data.loading, false)
  assert.equal(missing.data.unavailable, true)
  assert.match(missing.data.error, /故事编号无效/)

  const badSpace = createPage({ spaceId: 'abc', storyId: '8001' })
  assert.equal(badSpace.data.unavailable, true)

  const badStory = createPage({ spaceId: '2001', storyId: '../../etc/passwd' })
  assert.equal(badStory.data.unavailable, true)

  assert.equal(requests.length, 0)
})

// ============================ 返回与生命周期 ============================

test('返回公开空间：有上级页面用 navigateBack，栈底按 spaceId 重建公开空间页', async () => {
  responseHandler = (options) => options.success(okBody(storyDetail()))
  const page = createPage({ spaceId: '2001', storyId: '8001' })
  await flush()

  page.backToSpace()
  assert.deepEqual(navigations, [{ type: 'back', delta: 1 }])

  navigations.length = 0
  pageStack = [{ route: 'pages/plaza-story/plaza-story' }]
  page.backToSpace()
  assert.deepEqual(navigations, [{ type: 'reLaunch', url: '/pages/plaza-detail/index?spaceId=2001' }])
})

test('栈底且 spaceId 非法时退回恋爱广场，不会拼出异常路由', async () => {
  const page = createPage({})
  pageStack = [{ route: 'pages/plaza-story/plaza-story' }]
  page.backToSpace()
  assert.deepEqual(navigations, [{ type: 'reLaunch', url: '/pages/plaza/index' }])
})

test('卸载后忽略在途响应', async () => {
  let release = null
  responseHandler = (options) => {
    release = () => options.success(okBody(storyDetail()))
  }
  const page = createPage({ spaceId: '2001', storyId: '8001' })
  page.onUnload()
  const snapshot = JSON.parse(JSON.stringify(page.data))
  release()
  await flush()
  assert.deepEqual(page.data, snapshot)
  assert.equal(page.data.story, null)
})

// ============================ 正文图片预览 ============================

test('正文图片预览只使用本次响应里的公开图片地址', async () => {
  const content = [
    '![一](https://cdn.example.com/a.jpg)',
    '![二](https://cdn.example.com/b.jpg)',
  ].join('\n\n')
  responseHandler = (options) => options.success(okBody(storyDetail({ content })))
  const page = createPage({ spaceId: '2001', storyId: '8001' })
  await flush()

  page.onPreviewImage({ currentTarget: { dataset: { url: 'https://cdn.example.com/b.jpg' } } })
  assert.equal(previewCalls.length, 1)
  assert.equal(previewCalls[0].current, 'https://cdn.example.com/b.jpg')
  assert.deepEqual(previewCalls[0].urls, [
    'https://cdn.example.com/a.jpg',
    'https://cdn.example.com/b.jpg',
  ])

  // 非法地址不触发预览
  page.onPreviewImage({ currentTarget: { dataset: { url: 'javascript:alert(1)' } } })
  assert.equal(previewCalls.length, 1)
})

// ============================ 访问级别 ============================

test('公开故事详情页属于 public：匿名 / 无空间用户都能直接进入', async () => {
  const { resolvePageAccess, canAccessPage } = await import('../miniprogram/utils/session-rules.js')
  const { SESSION_STATUS, PAGE_ACCESS } = await import('../miniprogram/utils/session-constants.js')
  assert.equal(resolvePageAccess('pages/plaza-story/plaza-story'), PAGE_ACCESS.PUBLIC)
  for (const status of [
    SESSION_STATUS.LOADING,
    SESSION_STATUS.UNAUTHENTICATED,
    SESSION_STATUS.AUTHENTICATED_WITHOUT_SPACE,
    SESSION_STATUS.ERROR,
    SESSION_STATUS.AUTHENTICATED_WITH_SPACE,
  ]) {
    assert.equal(canAccessPage(PAGE_ACCESS.PUBLIC, status), true, status)
  }
  // 隐私不靠页面权限兜底：访问级别是 public，内容仍由后端公开快照过滤
  assert.equal(resolvePageAccess('pages/story-detail/story-detail'), PAGE_ACCESS.SPACE)
})

// ============================ 导航栏返回兜底 ============================

test('导航栏返回：从公开空间进入时交给 navigateBack，栈底时按 spaceId 重建公开空间页', async () => {
  responseHandler = (options) => options.success(okBody(storyDetail()))
  const page = createPage({ spaceId: '2001', storyId: '8001' })
  await flush()

  // 从公开空间进入：栈里有上级页面，navigation-bar 组件自身的 navigateBack 已生效
  pageStack = [{ route: 'pages/plaza/index' }, { route: 'pages/plaza-detail/index' }, { route: 'pages/plaza-story/plaza-story' }]
  page.onShow()
  navigations.length = 0
  page.onNavBack()
  assert.deepEqual(navigations, [])

  // 分享 / 扫码直达：栈底没有再多的页面，需要兜底重建公开空间页
  pageStack = [{ route: 'pages/plaza-story/plaza-story' }]
  page.onShow()
  navigations.length = 0
  page.onNavBack()
  assert.deepEqual(navigations, [{ type: 'reLaunch', url: '/pages/plaza-detail/index?spaceId=2001' }])
})
