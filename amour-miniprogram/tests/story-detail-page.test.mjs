import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 私有故事详情页回归测试（本人 / 情侣空间）。
 *
 * 本次修复把 Markdown 正文解析抽到 utils/story-content（供公开详情页复用），
 * 这里验证私有详情页在重构后：
 * - 仍然调用私有接口 `/story/detail`（不是公开接口）；
 * - 正文块、字数、阅读时长、正文图片与重构前一致；
 * - 页面守卫、非法 ID、接口失败、卸载后忽略响应等原有行为不变。
 */

const requests = []
const navigations = []
let responseHandler = null
let pageOptions = null

const storage = new Map([
  ['amour_token', 'token-1'],
  ['amour_permissions', ['frontend:story:query']],
])

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key),
  request(options) {
    requests.push(options)
    if (responseHandler) responseHandler(options, requests.length)
  },
  showToast() {},
  navigateBack() {
    navigations.push('back')
  },
  reLaunch(options) {
    navigations.push(options && options.url)
  },
  getSystemInfoSync: () => ({ windowWidth: 375 }),
  previewImage() {},
}

globalThis.getCurrentPages = () => [{ route: 'pages/plaza/index' }, { route: 'pages/story-detail/story-detail' }]
globalThis.getApp = () => ({ globalData: {} })
globalThis.Page = (options) => {
  pageOptions = options
}

const sessionState = await import('../miniprogram/utils/session-state.js')
await import('../miniprogram/pages/story-detail/story-detail.js')

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

/** 私有接口 /story/detail 的返回结构：含前后篇。 */
function privateStory(overrides = {}) {
  return Object.assign({
    id: 8001,
    title: '第一次见面',
    summary: '那天在咖啡馆坐了很久。',
    content: [
      '# 初见',
      '',
      '我们第一次见面，聊了很多关于未来和旅行的话题。',
      '',
      '![合影](https://cdn.example.com/story.jpg)',
    ].join('\n'),
    happenedTime: '2024-05-20 19:30:00',
    location: '杭州',
    coverImage: '',
    tagLabel: '初见',
    chapterName: '初见',
    preStory: null,
    nextStory: null,
  }, overrides)
}

test.beforeEach(async () => {
  requests.length = 0
  navigations.length = 0
  responseHandler = null
  storage.set('amour_token', 'token-1')
  storage.set('amour_permissions', ['frontend:story:query'])
  // 页面守卫需要已登录 + 有情侣空间
  sessionState.resetForTests()
  responseHandler = (options) => {
    const path = String(options.url).replace(/^https?:\/\/[^/]+/, '')
    if (path.endsWith('/user/profile')) {
      options.success(okBody({
        username: 'u',
        displayName: 'd',
        avatar: '',
        passwordSet: false,
        permissions: ['frontend:story:query'],
      }))
      return
    }
    if (path.endsWith('/space/status')) {
      options.success(okBody({ spaceId: 2001, status: 1, spaceName: '空间' }))
      return
    }
    if (path.endsWith('/story/detail')) {
      options.success(okBody(privateStory()))
      return
    }
    options.success(okBody(null))
  }
  await sessionState.ensureSessionReady()
  requests.length = 0
})

test('私有故事详情：仍调用私有接口并渲染正文块', async () => {
  const page = createPage({ id: '8001' })
  await flush()

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url.endsWith('/story/detail'), true)
  assert.deepEqual(requests[0].data, { id: 8001 })
  assert.equal(page.data.loading, false)
  assert.equal(page.data.error, '')
  assert.equal(page.data.story.title, '第一次见面')
  assert.equal(page.data.story.chapterName, '初见')
  assert.deepEqual(page.data.blocks.map(block => block.type), ['heading', 'paragraph', 'image'])
  assert.equal(page.data.blocks[0].text, '初见')
  assert.equal(page.data.blocks[1].text, '我们第一次见面，聊了很多关于未来和旅行的话题。')
  assert.deepEqual(page.data.contentImages, ['https://cdn.example.com/story.jpg'])
  assert.equal(page.data.readTime, '约 1 分钟')
  assert.ok(page.data.totalWords > 0)
  assert.equal(page.data.formattedDate, '2024.05.20')
})

test('私有故事详情：字数与阅读时长口径与后端一致（去空白计数）', async () => {
  responseHandler = (options) => options.success(okBody(privateStory({
    content: '一 二 三',
  })))
  const page = createPage({ id: '8001' })
  await flush()
  assert.equal(page.data.totalWords, 3)
  assert.equal(page.data.readTime, '约 1 分钟')
})

test('私有故事详情：正文为空时给出空正文提示而不是报错', async () => {
  responseHandler = (options) => options.success(okBody(privateStory({ content: '' })))
  const page = createPage({ id: '8001' })
  await flush()
  assert.equal(page.data.error, '')
  assert.deepEqual(page.data.blocks, [])
  assert.equal(page.data.totalWords, 0)
  assert.equal(page.data.readTime, '小于 1 分钟')
})

test('私有故事详情：非法 ID 不请求接口', async () => {
  const page = createPage({ id: 'abc' })
  await flush()
  assert.equal(page.data.loading, false)
  assert.equal(page.data.error, '故事 ID 无效')
  assert.equal(requests.length, 0)
})

test('私有故事详情：接口失败展示错误并可重试', async () => {
  responseHandler = (options) => options.success({
    statusCode: 200,
    data: { success: false, message: '故事节点不存在', errorCode: '20003' },
  })
  const page = createPage({ id: '8001' })
  await flush()
  assert.equal(page.data.story, null)
  assert.match(page.data.error, /故事不存在或已被删除/)

  responseHandler = (options) => options.success(okBody(privateStory()))
  page.retry()
  await flush()
  assert.equal(page.data.story.title, '第一次见面')
})

test('私有故事详情：正文图片预览使用本次内容里的图片', async () => {
  const page = createPage({ id: '8001' })
  await flush()
  const previews = []
  globalThis.wx.previewImage = (options) => previews.push(options)
  page.previewContentImage({ currentTarget: { dataset: { url: 'https://cdn.example.com/story.jpg' } } })
  assert.equal(previews.length, 1)
  assert.equal(previews[0].current, 'https://cdn.example.com/story.jpg')
})
