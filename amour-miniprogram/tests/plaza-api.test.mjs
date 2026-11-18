import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 恋爱广场公开接口层测试。
 *
 * 重点：
 * - 公开故事详情必须同时携带 spaceId + storyId，走 `/gallery/space/story/detail`；
 * - 非法参数在发请求前就被拒绝，不会拼出异常请求体；
 * - 后端业务错误（故事不存在 / 空间未公开）保留文案并标记不可重试；
 * - 匿名访问不注入 Authorization。
 */

const requests = []
let responseHandler = null
const storage = new Map()

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key),
  request(options) {
    requests.push(options)
    if (responseHandler) responseHandler(options, requests.length)
  },
}

const {
  fetchPlazaSpaces,
  fetchPlazaSpaceDetail,
  fetchPlazaStoryDetail,
  PLAZA_PAGE_SIZE,
} = await import('../miniprogram/api/plaza.ts')

function okBody(data) {
  return { statusCode: 200, data: { success: true, data } }
}

function failBody(message, errorCode) {
  return { statusCode: 200, data: { success: false, message, errorCode } }
}

test.beforeEach(() => {
  requests.length = 0
  responseHandler = null
  storage.clear()
})

test('list 分页参数归一化，保持既有契约', async () => {
  responseHandler = options => options.success(okBody({ current: 1, size: PLAZA_PAGE_SIZE, total: 0, records: [] }))
  await fetchPlazaSpaces({ current: 0, size: 999 })
  assert.deepEqual(requests[0].data, { current: 1, size: 999 })
  assert.equal(requests[0].url.endsWith('/gallery/spaces'), true)
})

test('公开故事详情：同时发送 spaceId 与 storyId，匿名不注入 token', async () => {
  responseHandler = options => options.success(okBody({
    storyId: 8001,
    title: '第一次见面',
    content: '正文',
  }))
  const story = await fetchPlazaStoryDetail('2001', '8001')
  assert.equal(story.title, '第一次见面')
  assert.equal(requests[0].url.endsWith('/gallery/space/story/detail'), true)
  assert.deepEqual(requests[0].data, { spaceId: 2001, storyId: 8001 })
  assert.equal(requests[0].header.Authorization, undefined)
})

test('公开故事详情：spaceId 与 storyId 都必须是正整数，否则不请求', async () => {
  await assert.rejects(() => fetchPlazaStoryDetail('abc', '8001'), /空间编号无效/)
  await assert.rejects(() => fetchPlazaStoryDetail('2001', 'abc'), /故事编号无效/)
  await assert.rejects(() => fetchPlazaStoryDetail('0', '8001'), /空间编号无效/)
  await assert.rejects(() => fetchPlazaStoryDetail('2001', '-3'), /故事编号无效/)
  await assert.rejects(() => fetchPlazaStoryDetail('', ''), /空间编号无效/)
  assert.equal(requests.length, 0)
})

test('公开故事详情：20003 / 20046 保留后端文案并标记不可重试', async () => {
  responseHandler = options => options.success(failBody('故事节点不存在', '20003'))
  await assert.rejects(
    () => fetchPlazaStoryDetail('2001', '8003'),
    (error) => {
      assert.equal(error.name, 'PlazaError')
      assert.equal(error.message, '故事节点不存在')
      assert.equal(error.errorCode, '20003')
      assert.equal(error.unavailable, true)
      assert.equal(error.retryable, false)
      return true
    },
  )

  responseHandler = options => options.success(failBody('该情侣空间未公开', '20046'))
  await assert.rejects(
    () => fetchPlazaStoryDetail('2001', '8001'),
    (error) => {
      assert.equal(error.unavailable, true)
      assert.equal(error.retryable, false)
      return true
    },
  )
})

test('公开故事详情：网络失败可重试，文案不暴露内部地址', async () => {
  responseHandler = options => options.fail({ errMsg: 'request:fail' })
  await assert.rejects(
    () => fetchPlazaStoryDetail('2001', '8001'),
    (error) => {
      assert.match(error.message, /网络连接不太稳定/)
      assert.equal(error.retryable, true)
      assert.equal(error.unavailable, false)
      return true
    },
  )
})

test('公开空间详情：保持原有契约不变', async () => {
  responseHandler = options => options.success(okBody({ spaceId: 2001, spaceName: '空间' }))
  const detail = await fetchPlazaSpaceDetail('2001')
  assert.equal(detail.spaceName, '空间')
  assert.deepEqual(requests[0].data, { spaceId: 2001 })

  await assert.rejects(() => fetchPlazaSpaceDetail('not-a-number'), /空间编号无效/)
})
