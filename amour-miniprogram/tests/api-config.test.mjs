import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 接口地址与请求回退测试。
 *
 * 背景：微信小程序不允许请求本机 IP（127.0.0.1），且开发者工具默认走系统代理，
 * 代理软件会把 127.0.0.1 再转发一次形成回环，表现为 10s 后 request:fail timeout。
 * 这里锁定修复后的行为：
 * - develop 优先局域网地址，回环地址作为兜底；
 * - 显式覆盖地址时只认覆盖值；
 * - trial / release 固定走正式域名；
 * - 连接层失败才切换候选地址，拿到 HTTP 响应就不切换；
 * - 全部失败时错误里带上尝试过的地址。
 */

const storage = new Map()
let envVersion = 'develop'
let requestHandler = null
const requestLog = []

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion } }),
  getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key),
  request(options) {
    requestLog.push({ url: options.url, timeout: options.timeout })
    if (requestHandler) requestHandler(options, requestLog.length)
  },
}

const config = await import('../miniprogram/utils/api-config.js')
const request = await import('../miniprogram/utils/request.js')

const { resolveBaseUrlCandidates, resolveRequestTimeout, normalizeBaseUrl } = config
const { post, getApiBaseUrl, getApiBaseUrlCandidates, ApiError } = request

test.beforeEach(() => {
  storage.clear()
  requestLog.length = 0
  requestHandler = null
  envVersion = 'develop'
})

test('normalizeBaseUrl 去掉尾部斜杠，空值返回空串', () => {
  assert.equal(normalizeBaseUrl('http://192.168.1.2:8080/'), 'http://192.168.1.2:8080')
  assert.equal(normalizeBaseUrl('  http://a.com//  '), 'http://a.com')
  assert.equal(normalizeBaseUrl(''), '')
  assert.equal(normalizeBaseUrl(null), '')
  assert.equal(normalizeBaseUrl(undefined), '')
})

test('develop 环境：局域网地址优先，回环地址兜底，且不重复', () => {
  const candidates = resolveBaseUrlCandidates({ envVersion: 'develop' })
  assert.equal(candidates.length, 2)
  assert.match(candidates[0], /^http:\/\/192\.168\./)
  assert.equal(candidates[1], 'http://127.0.0.1:8080')
  assert.equal(new Set(candidates).size, candidates.length)
})

test('显式覆盖地址时只请求覆盖的那个后端', () => {
  assert.deepEqual(
    resolveBaseUrlCandidates({ envVersion: 'develop', override: 'http://10.0.0.9:8080/' }),
    ['http://10.0.0.9:8080'],
  )
})

test('trial / release 固定正式域名，忽略覆盖地址', () => {
  const url = 'https://www.chengliuxiang.top/api'
  assert.deepEqual(resolveBaseUrlCandidates({ envVersion: 'trial', override: 'http://127.0.0.1:8080' }), [url])
  assert.deepEqual(resolveBaseUrlCandidates({ envVersion: 'release', override: 'http://127.0.0.1:8080' }), [url])
  assert.deepEqual(resolveBaseUrlCandidates({ envVersion: 'unknown' }), [url])
  assert.deepEqual(resolveBaseUrlCandidates({}), [url])
})

test('开发版超时更短，正式版保持 10s', () => {
  assert.equal(resolveRequestTimeout('develop'), 5000)
  assert.equal(resolveRequestTimeout('release'), 10000)
  assert.equal(resolveRequestTimeout('trial'), 10000)
})

test('getApiBaseUrl 在开发版返回局域网地址，并尊重缓存覆盖', () => {
  assert.match(getApiBaseUrl(), /^http:\/\/192\.168\./)
  storage.set('apiBaseUrl', 'http://10.1.2.3:9000')
  assert.equal(getApiBaseUrl(), 'http://10.1.2.3:9000')
  assert.deepEqual(getApiBaseUrlCandidates(), ['http://10.1.2.3:9000'])
})

test('首个地址连接失败时自动切到下一个候选地址', async () => {
  requestHandler = (options, index) => {
    if (index === 1) {
      options.fail({ errMsg: 'request:fail timeout' })
      return
    }
    options.success({ statusCode: 200, data: { success: true, data: { ok: true } } })
  }
  const data = await post('/gallery/spaces', { current: 1, size: 8 })
  assert.deepEqual(data, { ok: true })
  assert.equal(requestLog.length, 2)
  assert.match(requestLog[0].url, /^http:\/\/192\.168\./)
  assert.equal(requestLog[1].url, 'http://127.0.0.1:8080/gallery/spaces')
  // 开发版使用更短的超时，避免候选地址不可达时干等
  assert.equal(requestLog[0].timeout, 5000)
})

test('拿到 HTTP 响应后不再切换地址：4xx 直接作为业务错误返回', async () => {
  requestHandler = (options) => {
    options.success({
      statusCode: 400,
      data: { success: false, message: '空间ID格式不正确', errorCode: '10001' },
    })
  }
  await assert.rejects(
    () => post('/gallery/space/detail', { spaceId: 0 }),
    (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.statusCode, 400)
      assert.equal(error.errorCode, '10001')
      assert.equal(error.message, '空间ID格式不正确')
      return true
    },
  )
  assert.equal(requestLog.length, 1)
})

test('所有候选地址都失败时，错误里带上实际尝试过的地址', async () => {
  requestHandler = options => options.fail({ errMsg: 'request:fail timeout' })
  await assert.rejects(
    () => post('/gallery/spaces', { current: 1, size: 8 }),
    (error) => {
      assert.equal(error.isNetworkError, true)
      assert.deepEqual(error.attempts, ['http://192.168.7.93:8080', 'http://127.0.0.1:8080'])
      return true
    },
  )
  assert.equal(requestLog.length, 2)
})

test('缓存覆盖了错误地址时不会偷偷回退到别的后端', async () => {
  storage.set('apiBaseUrl', 'http://10.9.9.9:8080')
  requestHandler = options => options.fail({ errMsg: 'request:fail' })
  await assert.rejects(
    () => post('/gallery/spaces', {}),
    (error) => {
      assert.deepEqual(error.attempts, ['http://10.9.9.9:8080'])
      return true
    },
  )
  assert.equal(requestLog.length, 1)
})

test('正式环境只有一个地址：失败即失败，不做多余重试', async () => {
  envVersion = 'release'
  requestHandler = options => options.fail({ errMsg: 'request:fail' })
  await assert.rejects(() => post('/gallery/spaces', {}))
  assert.equal(requestLog.length, 1)
  assert.equal(requestLog[0].url, 'https://www.chengliuxiang.top/api/gallery/spaces')
})
