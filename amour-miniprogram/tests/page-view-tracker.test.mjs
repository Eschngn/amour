import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 小程序页面浏览采集测试。
 *
 * 覆盖：
 * - 上报包含 clientType: 'miniprogram'、白名单 pageKey、合法 visitorId / eventId；
 * - visitorId 可生成、读取与复用（含过期轮换）；
 * - 同一页面展示不会因重复生命周期重复上报；
 * - 页面路径映射到合法 pageKey，登录页 / 非内容页不计入；
 * - 统计失败不阻塞页面；
 * - 页面卸载后重新进入会重新计数。
 */

const storage = new Map()
const requests = []
let envVersion = 'develop'
let requestHandler = null

function installWx() {
  globalThis.wx = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion } }),
    getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: key => storage.delete(key),
    request(options) {
      requests.push(options)
      if (requestHandler) requestHandler(options, requests.length)
    },
  }
}

installWx()

const {
  PAGE_VIEW_CLIENT_TYPE,
  PAGE_VIEW_VISITOR_STORAGE_KEY,
  PAGE_VIEW_VISITOR_TTL_DAYS,
  createEventId,
  createPageViewTracker,
  createVisitorId,
  isValidVisitorId,
  readOrCreateVisitorId,
  resolvePageKey,
  SUPPORTED_PAGE_KEYS,
} = await import('../miniprogram/utils/page-view-tracker.ts')

const lifecycle = await import('../miniprogram/utils/page-view-lifecycle.ts')

const VISITOR_PATTERN = /^[0-9a-f]{32}$/
const EVENT_PATTERN = /^[0-9a-fA-F-]{16,64}$/

function fixedRandom(hex) {
  return () => hex.repeat(32).slice(0, 32)
}

test.beforeEach(() => {
  storage.clear()
  requests.length = 0
  requestHandler = null
  envVersion = 'develop'
  installWx()
  lifecycle.resetPageViewLifecycleState()
})

// ============================ 路径映射 ============================

test('页面路径映射到白名单 pageKey', () => {
  assert.equal(resolvePageKey('pages/index/index'), 'home')
  assert.equal(resolvePageKey('/pages/index/index'), 'home')
  assert.equal(resolvePageKey('pages/index/index?from=share'), 'home')
  assert.equal(resolvePageKey('pages/plaza/index'), 'plaza')
  assert.equal(resolvePageKey('pages/plaza-detail/index'), 'plaza_detail')
  assert.equal(resolvePageKey('pages/story/story'), 'story')
  assert.equal(resolvePageKey('pages/story-detail/story-detail?id=3'), 'story_detail')
  assert.equal(resolvePageKey('pages/photo/photo'), 'photo')
  assert.equal(resolvePageKey('pages/photo-detail/photo-detail?id=9'), 'photo_detail')
  assert.equal(resolvePageKey('pages/message/message'), 'message')
  assert.equal(resolvePageKey('pages/profile/profile'), 'profile')

  // 所有映射结果必须落在后端白名单内。
  for (const key of ['home', 'plaza', 'plaza_detail', 'story', 'story_detail', 'photo', 'photo_detail', 'message', 'profile']) {
    assert.ok(SUPPORTED_PAGE_KEYS.includes(key), `${key} 必须与后端白名单一致`)
  }
})

test('登录页、资料编辑、日志与未知页面不计入统计', () => {
  for (const path of [
    'pages/login/login',
    'pages/profile-edit/profile-edit',
    'pages/logs/logs',
    'pages/error/error',
    'pages/unknown/index',
    '',
    null,
    undefined,
    'https://evil.example.com/pages/index/index',
  ]) {
    assert.equal(resolvePageKey(path), '', `${JSON.stringify(path)} 不应被统计`)
  }
})

// ============================ 访客与事件标识 ============================

test('visitorId 可以生成、写入存储并复用', () => {
  const now = Date.UTC(2026, 10, 17)
  const first = readOrCreateVisitorId(now, fixedRandom('a'))
  assert.match(first, VISITOR_PATTERN)
  assert.equal(first, 'a'.repeat(32))
  assert.equal(isValidVisitorId(first), true)

  // 复用：即使随机源变化也返回同一个 ID。
  const second = readOrCreateVisitorId(now + 60_000, fixedRandom('b'))
  assert.equal(second, first)

  const stored = JSON.parse(storage.get(PAGE_VIEW_VISITOR_STORAGE_KEY))
  assert.equal(stored.id, first)
  assert.equal(stored.createdAt, now)
})

test('visitorId 过期或损坏时重新生成', () => {
  const now = Date.UTC(2026, 10, 17)
  const expiredAt = now - PAGE_VIEW_VISITOR_TTL_DAYS * 24 * 60 * 60 * 1000 - 1
  storage.set(PAGE_VIEW_VISITOR_STORAGE_KEY, JSON.stringify({ id: 'a'.repeat(32), createdAt: expiredAt }))
  const rotated = readOrCreateVisitorId(now, fixedRandom('b'))
  assert.equal(rotated, 'b'.repeat(32))
  assert.notEqual(rotated, 'a'.repeat(32))

  storage.set(PAGE_VIEW_VISITOR_STORAGE_KEY, '{not-json')
  assert.match(readOrCreateVisitorId(now, fixedRandom('c')), VISITOR_PATTERN)

  storage.set(PAGE_VIEW_VISITOR_STORAGE_KEY, JSON.stringify({ id: 'alice@example.com', createdAt: now }))
  assert.equal(readOrCreateVisitorId(now, fixedRandom('d')), 'd'.repeat(32))
})

test('createVisitorId 对非法随机值回退到安全随机来源', () => {
  assert.match(createVisitorId(() => 'not-hex'), VISITOR_PATTERN)
})

test('eventId 格式符合后端要求', () => {
  for (let index = 0; index < 20; index += 1) {
    const eventId = createEventId()
    assert.match(eventId, EVENT_PATTERN, `eventId 非法: ${eventId}`)
    assert.ok(eventId.length >= 16 && eventId.length <= 64)
  }

  // 无 crypto.randomUUID 时退化为时间戳 + 随机十六进制，仍然合法。
  const fallback = createEventId(Date.UTC(2026, 10, 17), fixedRandom('f'))
  assert.match(fallback, EVENT_PATTERN)
  assert.equal(fallback.includes('g'), false)
})

test('同一次页面展示内生成的事件键互不相同', () => {
  const ids = new Set()
  for (let index = 0; index < 50; index += 1) ids.add(createEventId())
  assert.equal(ids.size, 50)
})

// ============================ 采集器行为 ============================

function createTracker(overrides = {}) {
  const sent = []
  const tracker = createPageViewTracker({
    send: payload => sent.push(payload),
    now: () => 1_000,
    random: fixedRandom('a'),
    dedupeWindowMs: 2000,
    getCurrentPath: () => 'pages/index/index',
    ...overrides,
  })
  return { tracker, sent }
}

test('上报包含 clientType: miniprogram 与白名单字段', () => {
  const { tracker, sent } = createTracker()
  assert.equal(tracker.trackPageShow({ routePath: 'pages/index/index', fresh: true }), true)
  assert.equal(sent.length, 1)

  const payload = sent[0]
  assert.deepEqual(Object.keys(payload).sort(), ['clientType', 'eventId', 'pageKey', 'visitorId'])
  assert.equal(payload.clientType, 'miniprogram')
  assert.equal(payload.clientType, PAGE_VIEW_CLIENT_TYPE)
  assert.equal(payload.pageKey, 'home')
  assert.match(payload.visitorId, VISITOR_PATTERN)
  assert.match(payload.eventId, EVENT_PATTERN)
  assert.ok(!JSON.stringify(payload).includes('pages/index/index'), '不能上报完整路径')
  assert.ok(!JSON.stringify(payload).includes('?'), '不能上报 query')
})

test('同一页面展示不会因重复生命周期触发重复上报', () => {
  const { tracker, sent } = createTracker()
  assert.equal(tracker.trackPageShow({ routePath: 'pages/index/index', fresh: true }), true)
  assert.equal(tracker.trackPageShow({ routePath: 'pages/index/index', fresh: false }), false)
  assert.equal(tracker.trackPageShow({ routePath: 'pages/index/index', fresh: false }), false)
  assert.equal(sent.length, 1)
})

test('从后台恢复（再次 onShow 且非新实例）不重复计数', () => {
  const { tracker, sent } = createTracker()
  tracker.trackPageShow({ routePath: 'pages/plaza/index', fresh: true })
  // 模拟切后台再回前台：同一页面实例，fresh=false。
  assert.equal(tracker.trackPageShow({ routePath: 'pages/plaza/index', fresh: false }), false)
  assert.equal(sent.length, 1)
})

test('卸载后重新进入同一页面会重新计数', () => {
  const { tracker, sent } = createTracker()
  tracker.trackPageShow({ routePath: 'pages/plaza/index', fresh: true })
  tracker.trackPageUnload()
  assert.equal(tracker.trackPageShow({ routePath: 'pages/plaza/index', fresh: true }), true)
  assert.equal(sent.length, 2)
  assert.notEqual(sent[0].eventId, sent[1].eventId, '每次新的页面展示都要用新的 eventId')
})

test('真正切换到新页面时计一次', () => {
  let path = 'pages/index/index'
  const sent = []
  const tracker = createPageViewTracker({
    send: payload => sent.push(payload),
    now: () => 1_000,
    random: fixedRandom('a'),
    getCurrentPath: () => path,
  })

  assert.equal(tracker.trackPageShow({ fresh: true }), true)
  assert.equal(sent[0].pageKey, 'home')

  path = 'pages/plaza/index'
  assert.equal(tracker.trackPageShow({ fresh: true }), true)
  assert.equal(sent[1].pageKey, 'plaza')

  path = 'pages/plaza-detail/index'
  assert.equal(tracker.trackPageShow({ fresh: true }), true)
  assert.equal(sent[2].pageKey, 'plaza_detail')
  assert.equal(sent.length, 3)
})

test('从详情页返回列表页视为一次新的浏览', () => {
  let path = 'pages/plaza/index'
  const sent = []
  const tracker = createPageViewTracker({
    send: payload => sent.push(payload),
    now: () => 1_000,
    random: fixedRandom('a'),
    getCurrentPath: () => path,
  })

  tracker.trackPageShow({ fresh: true })
  path = 'pages/plaza-detail/index'
  tracker.trackPageShow({ fresh: true })
  // navigateBack：详情页卸载后列表页再次 onShow（同一实例，fresh=false）。
  tracker.trackPageUnload()
  path = 'pages/plaza/index'
  assert.equal(tracker.trackPageShow({ fresh: false }), true)
  assert.deepEqual(sent.map(item => item.pageKey), ['plaza', 'plaza_detail', 'plaza'])
  assert.equal(new Set(sent.map(item => item.eventId)).size, 3)
})

test('快速 reLaunch 到同一页面在去重窗口内只计一次', () => {
  let now = 1_000
  const { tracker, sent } = createTracker({ now: () => now })
  tracker.trackPageShow({ routePath: 'pages/index/index', fresh: true })
  now += 200
  assert.equal(tracker.trackPageShow({ routePath: 'pages/index/index', fresh: true }), false)
  now += 3000
  assert.equal(tracker.trackPageShow({ routePath: 'pages/index/index', fresh: true }), true)
  assert.equal(sent.length, 2)
})

test('登录页 / 非内容页不会上报', () => {
  const { tracker, sent } = createTracker()
  for (const path of ['pages/logs/logs', 'pages/profile-edit/profile-edit', 'pages/login/login', 'pages/unknown/index']) {
    assert.equal(tracker.trackPageShow({ routePath: path, fresh: true }), false)
  }
  assert.equal(sent.length, 0)
})

test('统计发送抛错不会影响页面', () => {
  const tracker = createPageViewTracker({
    send: () => {
      throw new Error('network down')
    },
    now: () => 1_000,
    random: fixedRandom('a'),
    getCurrentPath: () => 'pages/index/index',
  })
  assert.doesNotThrow(() => tracker.trackPageShow({ fresh: true }))
})

test('统计请求失败不会阻塞页面（send 返回 rejected Promise）', async () => {
  // 与 app.ts 的接法一致：调用方自己吞掉请求异常。
  let settled = false
  const tracker = createPageViewTracker({
    send: () => Promise.reject(new Error('failed')).catch(() => {
      settled = true
    }),
    now: () => 1_000,
    random: fixedRandom('a'),
    getCurrentPath: () => 'pages/plaza/index',
  })
  // 采集器的 send 结果不会被 await，也不会向外抛。
  assert.doesNotThrow(() => tracker.trackPageShow({ fresh: true }))
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(settled, true)
})

test('本地存储不可写时仍能生成并复用访客 ID', () => {
  installWx()
  globalThis.wx.setStorageSync = () => {
    throw new Error('quota exceeded')
  }
  const now = Date.UTC(2026, 10, 17)
  const first = readOrCreateVisitorId(now, fixedRandom('9'))
  assert.match(first, VISITOR_PATTERN)
  assert.equal(readOrCreateVisitorId(now + 1000, fixedRandom('8')), first, '内存兜底应复用同一个 ID')
})

// ============================ 生命周期接入 ============================

test('Page 页面接入后首次展示计一次，重复 onShow 不重复计数', () => {
  const sent = []
  lifecycle.configurePageViewReporting(payload => sent.push(payload))
  lifecycle.resetPageViewLifecycleState()

  const options = lifecycle.withPageViewTracking({
    onLoad() {
      this.loaded = true
    },
    onShow() {
      this.shown = (this.shown || 0) + 1
    },
    onUnload() {
      this.unloaded = true
    },
  }, 'pages/plaza/index')

  const host = {}
  options.onLoad.call(host)
  assert.equal(host.loaded, true, '不能破坏原有 onLoad')
  options.onShow.call(host)
  assert.equal(host.shown, 1, '不能破坏原有 onShow')
  options.onShow.call(host)
  assert.equal(sent.length, 1, '同一实例重复 onShow 不重复计数')
  options.onUnload.call(host)
  assert.equal(host.unloaded, true, '不能破坏原有 onUnload')
})

test('Page 页面重新进入（新实例）会重新计数', () => {
  const sent = []
  lifecycle.configurePageViewReporting(payload => sent.push(payload))
  lifecycle.resetPageViewLifecycleState()

  const options = lifecycle.withPageViewTracking({}, 'pages/photo/photo')
  options.onLoad.call({})
  options.onShow.call({})
  options.onUnload.call({})
  options.onLoad.call({})
  options.onShow.call({})
  assert.equal(sent.length, 2)
  assert.equal(sent[1].pageKey, 'photo')
  assert.equal(sent[1].clientType, 'miniprogram')
})

test('Component 页面接入后 attached + show 计一次，重复 show 不计数', () => {
  const sent = []
  lifecycle.configurePageViewReporting(payload => sent.push(payload))
  lifecycle.resetPageViewLifecycleState()

  const options = lifecycle.withComponentPageViewTracking({
    data: { ready: false },
    lifetimes: {
      attached() {
        this.attachedCalled = true
      },
      detached() {
        this.detachedCalled = true
      },
    },
    pageLifetimes: {
      show() {
        this.showCalled = (this.showCalled || 0) + 1
      },
    },
    methods: {},
  }, 'pages/index/index')

  const host = {}
  options.lifetimes.attached.call(host)
  assert.equal(host.attachedCalled, true)
  options.pageLifetimes.show.call(host)
  assert.equal(host.showCalled, 1)
  options.pageLifetimes.show.call(host)
  assert.equal(sent.length, 1)
  assert.equal(sent[0].pageKey, 'home')
  options.lifetimes.detached.call(host)
  assert.equal(host.detachedCalled, true)
})

test('页面进入后台再回到前台不重复计数', () => {
  const sent = []
  lifecycle.configurePageViewReporting(payload => sent.push(payload))
  lifecycle.resetPageViewLifecycleState()

  const options = lifecycle.withComponentPageViewTracking({ lifetimes: {}, pageLifetimes: {} }, 'pages/story/story')
  options.lifetimes.attached.call({})
  options.pageLifetimes.show.call({})
  // App.onHide：标记进入后台。
  lifecycle.notifyAppHide()
  options.pageLifetimes.show.call({})
  assert.equal(sent.length, 1)
})

test('非内容页面即使接入生命周期 wrapper 也不会统计', () => {
  const sent = []
  lifecycle.configurePageViewReporting(payload => sent.push(payload))
  lifecycle.resetPageViewLifecycleState()

  const options = lifecycle.withPageViewTracking({}, 'pages/profile-edit/profile-edit')
  options.onLoad.call({})
  options.onShow.call({})
  assert.equal(sent.length, 0)
})

// ============================ 真实请求封装 ============================

test('api/analytics 通过 request.post 调用 /analytics/page-view', async () => {
  requestHandler = (options) => {
    options.success({
      statusCode: 200,
      data: { success: true, data: null },
    })
  }
  const analytics = await import('../miniprogram/api/analytics.ts')
  const payload = {
    pageKey: 'home',
    visitorId: 'a'.repeat(32),
    eventId: createEventId(),
    clientType: 'miniprogram',
  }
  await analytics.reportPageView(payload)

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/analytics\/page-view$/)
  assert.equal(requests[0].method, 'POST')
  assert.deepEqual(requests[0].data, payload)
})

test('采集请求失败时 reportPageView 会 reject，由调用方静默处理', async () => {
  requestHandler = (options) => {
    options.success({
      statusCode: 200,
      data: { success: false, errorCode: '20085', message: '页面浏览上报无效' },
    })
  }
  const analytics = await import('../miniprogram/api/analytics.ts')
  await assert.rejects(
    analytics.reportPageView({
      pageKey: 'home',
      visitorId: 'a'.repeat(32),
      eventId: createEventId(),
      clientType: 'miniprogram',
    }),
    /页面浏览上报无效/,
  )
})
