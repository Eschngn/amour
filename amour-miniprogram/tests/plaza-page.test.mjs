import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 恋爱广场页面级行为测试。
 *
 * 用最小的小程序运行时桩（Page / wx）加载真实的页面定义，
 * 校验页面在以下场景的数据状态与导航参数：
 * - 首次加载成功 / 失败 / 空列表；
 * - 触底重复触发只发一次请求；
 * - 下一页失败保留列表，重试同一页；
 * - 下拉刷新失败保留旧列表并关闭 refresher；
 * - 刷新与旧分页响应竞争时旧响应被丢弃；
 * - 卡片点击只携带公开空间标识，非法标识不导航。
 */

const requests = []
let responseHandler = null
const toasts = []
const navigations = []
let pageOptions = null

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
    if (options && options.success) options.success({})
  },
  navigateBack() {
    navigations.push('back')
  },
  reLaunch(options) {
    navigations.push(options && options.url)
  },
}

globalThis.getApp = () => ({ globalData: {} })
globalThis.getCurrentPages = () => [{ route: 'pages/plaza/index' }]
globalThis.Page = (options) => {
  pageOptions = options
}

const { PLAZA_PAGE_SIZE } = await import('../miniprogram/api/plaza.ts')
await import('../miniprogram/pages/plaza/index.ts')

/** 创建一个最小页面实例：setData 支持简单键与 a.b 路径。 */
function createPage() {
  if (!pageOptions) throw new Error('页面未注册')
  const instance = Object.create(null)
  Object.assign(instance, pageOptions)
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

/** 让所有已 resolve 的 Promise 链跑完。 */
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function okBody(data) {
  return { statusCode: 200, data: { success: true, data } }
}

function pageBody(ids, total, current = 1) {
  return okBody({
    current,
    size: PLAZA_PAGE_SIZE,
    total,
    records: ids.map(id => ({
      spaceId: id,
      spaceName: `空间 ${id}`,
      description: '简介',
      members: [{ displayName: `成员${id}` }],
      publicStoryCount: 1,
      publicPhotoCount: 0,
    })),
  })
}

test.beforeEach(() => {
  requests.length = 0
  toasts.length = 0
  navigations.length = 0
  responseHandler = null
})

test('首次加载：骨架 → 卡片，页码与底部状态正确', async () => {
  responseHandler = (options) => options.success(pageBody([1, 2, 3], 3))
  const page = createPage()
  page.onLoad()

  assert.equal(page.data.status, 'loading')
  assert.deepEqual(page.data.cards, [])

  await flush()
  assert.equal(page.data.status, 'ready')
  assert.deepEqual(page.data.cards.map(item => item.spaceId), ['1', '2', '3'])
  assert.equal(page.data.total, 3)
  assert.equal(page.data.hasMore, false)
  assert.equal(page.data.showEnd, true)
  assert.equal(page.data.loadingMore, false)
  assert.equal(page.data.loadMoreError, '')
  assert.equal(requests[0].url.endsWith('/gallery/spaces'), true)
  assert.deepEqual(requests[0].data, { current: 1, size: PLAZA_PAGE_SIZE })
})

test('首次加载失败：错误态与重试文案，页码不推进', async () => {
  responseHandler = (options, index) => {
    if (index === 1) {
      options.fail({ errMsg: 'request:fail' })
      return
    }
    options.success(pageBody([5], 1))
  }
  const page = createPage()
  page.onLoad()
  await flush()

  assert.equal(page.data.status, 'error')
  assert.equal(page.data.loadError, '网络连接不太稳定，请稍后重试')
  assert.deepEqual(page.data.cards, [])

  // 点击重试：重新请求第一页
  await page.onRetryFirst()
  await flush()
  assert.equal(page.data.status, 'ready')
  assert.deepEqual(page.data.cards.map(item => item.spaceId), ['5'])
  assert.equal(requests.length, 2)
  assert.deepEqual(requests[1].data, { current: 1, size: PLAZA_PAGE_SIZE })
})

test('空列表：ready + 空卡片 + 不显示到底文案', async () => {
  responseHandler = (options) => options.success(pageBody([], 0))
  const page = createPage()
  page.onLoad()
  await flush()

  assert.equal(page.data.status, 'ready')
  assert.deepEqual(page.data.cards, [])
  assert.equal(page.data.total, 0)
  assert.equal(page.data.showEnd, false)
})

test('连续触底只发起一次分页请求', async () => {
  let releaseMore = null
  responseHandler = (options, index) => {
    if (index === 1) {
      options.success(pageBody([1, 2, 3, 4, 5, 6, 7, 8], 16))
      return
    }
    releaseMore = () => options.success(pageBody([9, 10, 11, 12, 13, 14, 15, 16], 16, 2))
  }
  const page = createPage()
  page.onLoad()
  await flush()

  page.onScrollToLower()
  page.onScrollToLower()
  page.onScrollToLower()
  assert.equal(requests.length, 2)
  assert.equal(page.data.loadingMore, true)

  releaseMore()
  await flush()
  assert.equal(requests.length, 2)
  assert.equal(page.data.cards.length, 16)
  assert.equal(page.data.hasMore, false)
  assert.equal(page.data.showEnd, true)
})

test('下一页失败：保留已有卡片，重试请求同一页', async () => {
  const firstPage = [1, 2, 3, 4, 5, 6, 7, 8]
  responseHandler = (options, index) => {
    if (index === 1) {
      options.success(pageBody(firstPage, 16))
      return
    }
    if (index === 2) {
      options.fail({ errMsg: 'request:fail timeout' })
      return
    }
    options.success(pageBody([9, 10, 11, 12, 13, 14, 15, 16], 16, 2))
  }
  const page = createPage()
  page.onLoad()
  await flush()

  await page.onLoadMore()
  await flush()
  assert.deepEqual(page.data.cards.map(item => item.spaceId), firstPage.map(String))
  assert.equal(page.data.loadMoreError, '这次加载等得有点久，请稍后重试')
  assert.equal(page.data.loadingMore, false)

  await page.onLoadMore()
  await flush()
  assert.deepEqual(requests[2].data, { current: 2, size: PLAZA_PAGE_SIZE })
  assert.equal(page.data.cards.length, 16)
  assert.equal(page.data.cards[8].spaceId, '9')
  assert.equal(page.data.loadMoreError, '')
})

test('下拉刷新失败：保留旧列表并关闭 refresher', async () => {
  responseHandler = (options, index) => {
    if (index === 1) {
      options.success(pageBody([1, 2], 2))
      return
    }
    options.fail({ errMsg: 'request:fail' })
  }
  const page = createPage()
  page.onLoad()
  await flush()
  const before = page.data.cards

  await page.onRefresh()
  await flush()
  assert.deepEqual(page.data.cards, before)
  assert.equal(page.data.refresherTriggered, false)
  assert.equal(page.data.refreshing, false)
  assert.equal(page.data.status, 'ready')
})

test('刷新期间旧分页响应返回：丢弃旧响应，保留刷新结果', async () => {
  let releaseMore = null
  let releaseRefresh = null
  responseHandler = (options, index) => {
    if (index === 1) {
      options.success(pageBody([1, 2, 3, 4, 5, 6, 7, 8], 16))
      return
    }
    if (index === 2) {
      releaseMore = () => options.success(pageBody([9, 10, 11, 12, 13, 14, 15, 16], 16, 2))
      return
    }
    releaseRefresh = () => options.success(pageBody([99, 98], 2))
  }
  const page = createPage()
  page.onLoad()
  await flush()

  page.onScrollToLower()
  const refreshing = page.onRefresh()
  assert.equal(requests.length, 3)
  assert.equal(page.data.loadingMore, false)

  releaseRefresh()
  await refreshing
  await flush()
  assert.deepEqual(page.data.cards.map(item => item.spaceId), ['99', '98'])

  releaseMore()
  await flush()
  assert.deepEqual(page.data.cards.map(item => item.spaceId), ['99', '98'])
  assert.equal(page.data.loadingMore, false)
})

test('卡片点击只导航到详情页并携带公开标识', async () => {
  responseHandler = (options) => options.success(pageBody([2001], 1))
  const page = createPage()
  page.onLoad()
  await flush()

  page.onOpenSpace({ detail: { spaceId: '2001' } })
  assert.deepEqual(navigations, ['/pages/plaza-detail/index?spaceId=2001'])

  navigations.length = 0
  page.onOpenSpace({ detail: { spaceId: '../../etc/passwd' } })
  page.onOpenSpace({ detail: {} })
  assert.deepEqual(navigations, [])
  assert.equal(toasts.length, 2)
})

test('页面卸载后忽略在途响应，不再 setData', async () => {
  let release = null
  responseHandler = (options) => {
    release = () => options.success(pageBody([1], 1))
  }
  const page = createPage()
  page.onLoad()
  page.onUnload()
  const snapshot = JSON.parse(JSON.stringify(page.data))
  release()
  await flush()
  assert.deepEqual(page.data, snapshot)
})

test('非详情返回的 onShow 不重复加载列表（如从后台恢复）', async () => {
  responseHandler = (options) => options.success(pageBody([1, 2, 3], 3))
  const page = createPage()
  page.onLoad()
  await flush()
  const cards = page.data.cards
  page.onShow()
  await flush()
  assert.equal(requests.length, 1)
  assert.deepEqual(page.data.cards, cards)
})

test('从详情返回：静默刷新已加载页，期间保留卡片且不进入加载态', async () => {
  let version = 1
  responseHandler = (options) => {
    const current = Number(options.data && options.data.current) || 1
    if (version === 1) {
      options.success(current === 1
        ? pageBody([1, 2, 3, 4, 5, 6, 7, 8], 16)
        : pageBody([9, 10, 11, 12, 13, 14, 15, 16], 16, 2))
      return
    }
    options.success(current === 1
      ? pageBody([101, 102, 103, 104, 105, 106, 107, 108], 16)
      : pageBody([109, 110, 111, 112, 113, 114, 115, 116], 16, 2))
  }
  const page = createPage()
  page.onLoad()
  await flush()
  await page.onLoadMore()
  await flush()
  const beforeIds = page.data.cards.map(item => item.spaceId)
  assert.equal(beforeIds.length, 16)
  assert.equal(page.data.status, 'ready')

  page.onOpenSpace({ detail: { spaceId: '2001' } })
  version = 2
  const requestsBefore = requests.length
  const showTask = page.onShow()

  assert.equal(page.data.status, 'ready', '静默刷新不能切回骨架屏')
  assert.deepEqual(page.data.cards.map(item => item.spaceId), beforeIds, '刷新期间不能清空旧列表')

  await showTask
  await flush()
  assert.equal(requests.length, requestsBefore + 2, '应重新读取已加载的两页')
  assert.deepEqual(
    page.data.cards.map(item => item.spaceId),
    ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112', '113', '114', '115', '116'],
  )
  assert.equal(page.data.status, 'ready')
  assert.equal(Object.prototype.hasOwnProperty.call(page.data, 'scrollTop'), false)
})

test('从详情返回刷新失败：保留卡片与分页状态，不展示错误页', async () => {
  let shouldFail = false
  responseHandler = (options) => {
    if (shouldFail) {
      options.fail({ errMsg: 'request:fail timeout' })
      return
    }
    const current = Number(options.data && options.data.current) || 1
    options.success(current === 1
      ? pageBody([1, 2, 3, 4, 5, 6, 7, 8], 16)
      : pageBody([9, 10, 11, 12, 13, 14, 15, 16], 16, 2))
  }
  const page = createPage()
  page.onLoad()
  await flush()
  await page.onLoadMore()
  await flush()
  const before = page.data.cards.map(item => item.spaceId)

  page.onOpenSpace({ detail: { spaceId: '2001' } })
  shouldFail = true
  await page.onShow()
  await flush()

  assert.deepEqual(page.data.cards.map(item => item.spaceId), before)
  assert.equal(page.data.status, 'ready')
  assert.equal(page.data.loadError, '')
  assert.equal(page.data.loadMoreError, '')
  assert.equal(page.data.refreshing, false)
})
