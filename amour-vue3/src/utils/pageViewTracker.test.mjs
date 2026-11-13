import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PAGE_VIEW_VISITOR_STORAGE_KEY,
  PAGE_VIEW_VISITOR_TTL_DAYS,
  createPageViewTracker,
  createVisitorId,
  readOrCreateVisitorId,
  resolvePageKey,
  shouldTrackRoute,
} from './pageViewTracker.js'

/**
 * 运行：npm test
 * 页面浏览采集必须只上报白名单路由键和第一方随机访客 ID，
 * 不能把完整 URL、后台页面或重复导航计入 PV。
 */

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
    removeItem(key) {
      map.delete(key)
    },
  }
}

function fixedRandom(hex) {
  return () => hex.repeat(32).slice(0, 32)
}

function sequenceRandom() {
  let index = 0
  return () => {
    index += 1
    return index.toString(16).padStart(32, '0').slice(-32)
  }
}

test('路由键映射只覆盖用户内容页面', () => {
  assert.equal(resolvePageKey('/'), 'home')
  assert.equal(resolvePageKey('/plaza'), 'plaza')
  assert.equal(resolvePageKey('/plaza/2001'), 'plaza_detail')
  assert.equal(resolvePageKey('/plaza/2001?from=list'), 'plaza_detail')
  assert.equal(resolvePageKey('/space/setup'), 'space_setup')
  assert.equal(resolvePageKey('/space/setup/'), 'space_setup')
  assert.equal(resolvePageKey('/space/studio'), 'space_studio')
  assert.equal(resolvePageKey('/story'), 'story')
  assert.equal(resolvePageKey('/story/3001'), 'story_detail')
  assert.equal(resolvePageKey('/message'), 'message')
  assert.equal(resolvePageKey('/photo'), 'photo')
  assert.equal(resolvePageKey('/anniversary'), 'anniversary')
  assert.equal(resolvePageKey('/profile'), 'profile')

  for (const path of ['/login', '/admin/dashboard', '/unknown', '/story/3001/edit', '', null]) {
    assert.equal(resolvePageKey(path), '', `不应统计 ${JSON.stringify(path)}`)
  }
})

test('后台、登录页、hash/query-only 变化和重复导航不计 PV', () => {
  assert.equal(shouldTrackRoute({ path: '/', matched: [{}] }, { path: '/', matched: [] }), true)
  assert.equal(shouldTrackRoute({ path: '/plaza', matched: [{}] }, { path: '/', name: 'home', matched: [{}] }), true)
  assert.equal(shouldTrackRoute({ path: '/plaza', name: 'plaza', matched: [{}] }, { path: '/plaza', name: 'plaza', matched: [{}] }), false)
  assert.equal(shouldTrackRoute({ path: '/', matched: [{}] }, { path: '/', matched: [{}] }), false, '首页 hash/query-only 变化不计 PV')
  assert.equal(shouldTrackRoute({ path: '/admin/dashboard' }, { path: '/' }), false)
  assert.equal(shouldTrackRoute({ path: '/login' }, { path: '/' }), false)
  assert.equal(shouldTrackRoute({ path: '/plaza', meta: { trackPageView: false } }, { path: '/' }), false)
  assert.equal(shouldTrackRoute({ path: '/unknown' }, { path: '/' }), false)
  assert.equal(shouldTrackRoute(null, null), false)
})

test('访客 ID 为 32 位十六进制并在有效期内复用', () => {
  const storage = memoryStorage()
  const now = Date.UTC(2026, 10, 11)
  const first = readOrCreateVisitorId(storage, now, fixedRandom('a'))
  assert.match(first, /^[0-9a-f]{32}$/)
  assert.equal(readOrCreateVisitorId(storage, now + 1000, sequenceRandom()), first)

  const saved = JSON.parse(storage.getItem(PAGE_VIEW_VISITOR_STORAGE_KEY))
  assert.equal(saved.id, first)
  assert.equal(saved.createdAt, now)
})

test('访客 ID 过期或损坏时重新生成', () => {
  const now = Date.UTC(2026, 10, 11)
  const expiredAt = now - PAGE_VIEW_VISITOR_TTL_DAYS * 24 * 60 * 60 * 1000 - 1
  const storage = memoryStorage({
    [PAGE_VIEW_VISITOR_STORAGE_KEY]: JSON.stringify({ id: 'a'.repeat(32), createdAt: expiredAt }),
  })
  const rotated = readOrCreateVisitorId(storage, now, fixedRandom('b'))
  assert.equal(rotated, 'b'.repeat(32))
  assert.notEqual(rotated, 'a'.repeat(32))

  const broken = memoryStorage({ [PAGE_VIEW_VISITOR_STORAGE_KEY]: '{not-json' })
  assert.match(readOrCreateVisitorId(broken, now, fixedRandom('c')), /^[0-9a-f]{32}$/)

  const invalidId = memoryStorage({
    [PAGE_VIEW_VISITOR_STORAGE_KEY]: JSON.stringify({ id: 'alice@example.com', createdAt: now }),
  })
  assert.equal(readOrCreateVisitorId(invalidId, now, fixedRandom('d')), 'd'.repeat(32))
})

test('createVisitorId 对非法随机值回退到安全随机来源', () => {
  assert.match(createVisitorId(() => 'not-hex'), /^[0-9a-f]{32}$/)
})

test('本地存储不可用时同一会话复用内存访客 ID', () => {
  const now = Date.UTC(2026, 10, 11)
  const first = readOrCreateVisitorId(null, now, fixedRandom('9'))
  const second = readOrCreateVisitorId(null, now + 1000, sequenceRandom())
  assert.equal(first, '9'.repeat(32))
  assert.equal(second, first)
})

test('本地存储写入失败时仍复用内存访客 ID', () => {
  const now = Date.UTC(2026, 10, 11)
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('quota exceeded')
    },
  }
  const first = readOrCreateVisitorId(storage, now, fixedRandom('8'))
  const second = readOrCreateVisitorId(storage, now + 500, sequenceRandom())
  assert.equal(first, '8'.repeat(32))
  assert.equal(second, first)
})

test('采集器只发送白名单字段，并在短时重复导航时去重', () => {
  const sent = []
  const storage = memoryStorage()
  let now = 1000
  const tracker = createPageViewTracker({
    send: payload => sent.push(payload),
    now: () => now,
    storage,
    random: sequenceRandom(),
    dedupeWindowMs: 2000,
  })

  assert.equal(tracker.track({ path: '/' }, { path: '/' }), true)
  assert.equal(sent.length, 1)
  assert.deepEqual(Object.keys(sent[0]).sort(), ['eventId', 'pageKey', 'visitorId'])
  assert.equal(sent[0].pageKey, 'home')
  assert.match(sent[0].visitorId, /^[0-9a-f]{32}$/)
  assert.ok(!JSON.stringify(sent[0]).includes('?'))

  now += 1000
  assert.equal(tracker.track({ path: '/' }, { path: '/' }), false, '短时重复导航应被去重')
  assert.equal(sent.length, 1)

  now += 2000
  assert.equal(tracker.track({ path: '/plaza' }, { path: '/', name: 'home' }), true)
  assert.equal(sent.length, 2)
  assert.equal(sent[1].pageKey, 'plaza')

  assert.equal(tracker.track({ path: '/admin/dashboard' }, { path: '/plaza' }), false)
  assert.equal(tracker.track({ path: '/login' }, { path: '/plaza' }), false)
  assert.equal(sent.length, 2)
})

test('上报失败不会抛到路由流程', () => {
  const tracker = createPageViewTracker({
    send: () => {
      throw new Error('network down')
    },
    now: () => 1000,
    storage: memoryStorage(),
    random: fixedRandom('e'),
  })
  assert.doesNotThrow(() => tracker.track({ path: '/plaza' }, { path: '/' }))
})

test('reset 后允许立即重新统计同一页面', () => {
  const sent = []
  const tracker = createPageViewTracker({
    send: payload => sent.push(payload),
    now: () => 1000,
    storage: memoryStorage(),
    random: fixedRandom('f'),
  })
  assert.equal(tracker.track({ path: '/story' }, { path: '/' }), true)
  assert.equal(tracker.track({ path: '/story' }, { path: '/' }), false)
  tracker.reset()
  assert.equal(tracker.track({ path: '/story' }, { path: '/' }), true)
  assert.equal(sent.length, 2)
})
