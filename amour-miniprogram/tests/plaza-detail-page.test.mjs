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
let pageOptions = null

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getStorageSync: () => '',
  removeStorageSync() {},
  request(options) {
    requests.push(options)
    if (responseHandler) responseHandler(options, requests.length)
  },
  showToast() {},
  navigateTo() {},
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
