/**
 * 用户侧页面浏览采集。
 *
 * 口径：
 * - 只在 SPA 首次进入和有效路由切换时上报一次，不按 API 请求计数；
 * - 忽略 hash / query-only 变化、重复导航、后台路由与登录页；
 * - 只上报白名单页面键，不上报完整 URL、referer 或任何身份信息；
 * - 游客使用第一方随机访客 ID（180 天轮换），登录用户由服务端按账号内部 ID 去重；
 * - 上报是 fire-and-forget，失败不影响页面主流程。
 */

export const PAGE_VIEW_VISITOR_STORAGE_KEY = 'amour_pv_visitor_id'
export const PAGE_VIEW_VISITOR_TTL_DAYS = 180
export const PAGE_VIEW_DEDUPE_WINDOW_MS = 2000

/**
 * 服务端白名单必须与本表保持一致（见 PageViewConstants）。
 */
const ROUTE_RULES = [
  { pattern: /^\/$/, pageKey: 'home' },
  { pattern: /^\/plaza$/, pageKey: 'plaza' },
  { pattern: /^\/plaza\/[^/]+$/, pageKey: 'plaza_detail' },
  { pattern: /^\/space\/setup$/, pageKey: 'space_setup' },
  { pattern: /^\/space\/studio$/, pageKey: 'space_studio' },
  { pattern: /^\/story$/, pageKey: 'story' },
  { pattern: /^\/story\/[^/]+$/, pageKey: 'story_detail' },
  { pattern: /^\/message$/, pageKey: 'message' },
  { pattern: /^\/photo$/, pageKey: 'photo' },
  { pattern: /^\/anniversary$/, pageKey: 'anniversary' },
  { pattern: /^\/profile$/, pageKey: 'profile' },
]

function normalizePath(path) {
  if (typeof path !== 'string' || path.length === 0) return ''
  const withoutQuery = path.split('?')[0].split('#')[0]
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.replace(/\/+$/, '')
  }
  return withoutQuery
}

/**
 * 路由路径 -> 统计页面键；不在白名单内返回空字符串。
 */
export function resolvePageKey(path) {
  const normalized = normalizePath(path)
  if (!normalized) return ''
  const rule = ROUTE_RULES.find(item => item.pattern.test(normalized))
  return rule ? rule.pageKey : ''
}

/**
 * 判断一次路由变化是否应计入 PV。
 */
export function shouldTrackRoute(to, from) {
  const toPath = normalizePath(to?.path)
  if (!toPath) return false
  if (to?.meta?.trackPageView === false) return false
  if (toPath.startsWith('/admin')) return false
  if (toPath === '/login') return false
  // 仅 hash / query 变化、或者重复导航到同一路径，不算新的页面浏览。
  // START_LOCATION 的 matched 为空，因此首次进入仍然计数。
  const fromHasRoute = Boolean(from?.name)
    || Boolean(Array.isArray(from?.matched) && from.matched.length > 0)
  if (fromHasRoute && normalizePath(from.path) === toPath) return false
  return Boolean(resolvePageKey(toPath))
}

function isValidVisitorId(value) {
  return typeof value === 'string' && /^[0-9a-f]{32}$/.test(value)
}

function defaultRandomHex() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('')
  }
  let result = ''
  while (result.length < 32) {
    result += Math.floor(Math.random() * 16).toString(16)
  }
  return result
}

export function createVisitorId(random = defaultRandomHex) {
  const value = random()
  return isValidVisitorId(value) ? value : defaultRandomHex()
}

function defaultStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/** 存储不可写时的内存兜底，按存储对象隔离，避免不同会话互相影响。 */
const memoryVisitors = new WeakMap()
let nullStorageVisitor = null

function readMemoryVisitor(storage, nowMs, ttlMs) {
  const record = storage ? memoryVisitors.get(storage) : nullStorageVisitor
  if (record && isValidVisitorId(record.id) && nowMs - record.createdAt < ttlMs) {
    return record.id
  }
  return ''
}

function writeMemoryVisitor(storage, record) {
  if (storage) {
    memoryVisitors.set(storage, record)
  } else {
    nullStorageVisitor = record
  }
}

/**
 * 读取或生成第一方访客 ID。过期或损坏时重新生成；
 * 本地存储不可读写时退化为当前页面的内存 ID，保证同一会话内仍能正确去重。
 */
export function readOrCreateVisitorId(storage = defaultStorage(), nowMs = Date.now(), random = defaultRandomHex) {
  const ttlMs = PAGE_VIEW_VISITOR_TTL_DAYS * 24 * 60 * 60 * 1000
  if (storage) {
    try {
      const raw = storage.getItem(PAGE_VIEW_VISITOR_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const createdAt = Number(parsed?.createdAt)
        if (isValidVisitorId(parsed?.id) && Number.isFinite(createdAt) && nowMs - createdAt < ttlMs) {
          return parsed.id
        }
      }
    } catch {
      // 本地数据损坏或不可读时走内存兜底。
    }
  }

  const cached = readMemoryVisitor(storage, nowMs, ttlMs)
  if (cached) return cached

  const visitorId = createVisitorId(random)
  const record = { id: visitorId, createdAt: nowMs }
  writeMemoryVisitor(storage, record)
  if (storage) {
    try {
      storage.setItem(PAGE_VIEW_VISITOR_STORAGE_KEY, JSON.stringify(record))
    } catch {
      // 隐私模式或存储已满：保留内存 ID，不影响页面访问。
    }
  }
  return visitorId
}

export function createEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(16)}${defaultRandomHex()}`.slice(0, 32)
}

/**
 * 创建采集器。send 由调用方注入，便于测试且避免工具模块直接依赖 axios。
 */
export function createPageViewTracker(options = {}) {
  const send = typeof options.send === 'function' ? options.send : () => {}
  const now = typeof options.now === 'function' ? options.now : () => Date.now()
  const storage = options.storage === undefined ? defaultStorage() : options.storage
  const random = typeof options.random === 'function' ? options.random : defaultRandomHex
  const dedupeWindowMs = Number.isFinite(options.dedupeWindowMs)
    ? options.dedupeWindowMs
    : PAGE_VIEW_DEDUPE_WINDOW_MS
  let lastTracked = null

  return {
    track(to, from) {
      if (!shouldTrackRoute(to, from)) return false
      const pageKey = resolvePageKey(to.path)
      if (!pageKey) return false

      const timestamp = now()
      if (lastTracked
        && lastTracked.pageKey === pageKey
        && timestamp >= lastTracked.at
        && timestamp - lastTracked.at < dedupeWindowMs) {
        return false
      }
      lastTracked = { pageKey, at: timestamp }

      try {
        send({
          pageKey,
          visitorId: readOrCreateVisitorId(storage, timestamp, random),
          eventId: createEventId(),
        })
      } catch {
        // 采集失败不能影响路由跳转和页面渲染。
      }
      return true
    },
    reset() {
      lastTracked = null
    },
  }
}
