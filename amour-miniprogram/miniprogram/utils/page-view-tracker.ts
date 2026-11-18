/**
 * 小程序端页面浏览采集。
 *
 * 口径（与 Web 端 pageViewTracker 保持一致）：
 * - 只在页面首次展示（onShow 的第一次）与真正切换到新页面时计一次，
 *   不按接口请求计数，也不在每次 onShow 无条件重复计数；
 * - 从后台切回前台（再次 onShow）沿用 Web 端口径：不算新的浏览，
 *   只有重新进入页面（再次 onLoad）或导航到另一个受统计页面才计数；
 * - 同一页面键在短时间内的重复触发会被去重，避免快速跳转重复计数；
 * - 只上报白名单页面键，不上报完整路径、query、referer 或任何身份信息；
 * - 游客访客 ID 保存在小程序本地存储，格式为 32 位十六进制，与后端校验一致；
 * - 上报失败静默丢弃，不阻塞页面、不弹提示；
 * - 页面销毁或快速跳转时旧请求的结果不再影响页面状态（状态由模块内部维护，
 *   页面不持有任何统计回调）。
 *
 * 渠道固定为 miniprogram。它由客户端上报、服务端白名单校验，只是统计维度，
 * 不作为鉴权或权限判断依据。
 */

/** 后端 PageViewConstants：页面键白名单。 */
export const SUPPORTED_PAGE_KEYS = [
  'home',
  'plaza',
  'plaza_detail',
  'space_setup',
  'space_studio',
  'story',
  'story_detail',
  'photo',
  'photo_detail',
  'message',
  'anniversary',
  'profile',
] as const

export type SupportedPageKey = typeof SUPPORTED_PAGE_KEYS[number]

export const PAGE_VIEW_CLIENT_TYPE = 'miniprogram' as const
export const PAGE_VIEW_VISITOR_STORAGE_KEY = 'amour_pv_visitor_id'
export const PAGE_VIEW_VISITOR_TTL_DAYS = 180
export const PAGE_VIEW_DEDUPE_WINDOW_MS = 2000

const VISITOR_ID_PATTERN = /^[0-9a-f]{32}$/
const EVENT_ID_PATTERN = /^[0-9a-fA-F-]{16,64}$/
const TTL_MS = PAGE_VIEW_VISITOR_TTL_DAYS * 24 * 60 * 60 * 1000

/**
 * 小程序页面路径 -> 统计页面键。
 *
 * 只做精确映射，不允许把完整路径直接当 pageKey 发送；
 * 登录页、资料编辑、日志/占位页等不属于“用户内容页面”的路径不在此表中，
 * 因此不会被统计。
 */
const ROUTE_PAGE_KEYS: Record<string, SupportedPageKey> = {
  'pages/index/index': 'home',
  'pages/plaza/index': 'plaza',
  'pages/plaza-detail/index': 'plaza_detail',
  'pages/story/story': 'story',
  'pages/story-detail/story-detail': 'story_detail',
  'pages/photo/photo': 'photo',
  'pages/photo-detail/photo-detail': 'photo_detail',
  'pages/message/message': 'message',
  'pages/profile/profile': 'profile',
}

/**
 * 需要显式排除的非用户内容页。即使以后被误加进上面的映射表，
 * 这里也会优先排除（登录/资料编辑/日志/错误页）。
 */
const EXCLUDED_ROUTE_PATTERN = /(login|profile-edit|logs|error|webview)/i

/** 归一化页面路径：去掉前导斜杠、query 与 hash，去掉 .html 后缀。 */
export function normalizePagePath(path: unknown): string {
  if (typeof path !== 'string') return ''
  const withoutQuery = path.split('?')[0].split('#')[0].trim()
  const withoutLeading = withoutQuery.replace(/^\/+/, '')
  const withoutSuffix = withoutLeading.replace(/\.(html|wxml)$/i, '')
  return withoutSuffix.replace(/\/+$/, '')
}

/**
 * 页面路径 -> 白名单页面键；不在白名单内返回空字符串。
 */
export function resolvePageKey(path: unknown): SupportedPageKey | '' {
  const normalized = normalizePagePath(path)
  if (!normalized) return ''
  if (EXCLUDED_ROUTE_PATTERN.test(normalized)) return ''
  const pageKey = ROUTE_PAGE_KEYS[normalized]
  if (!pageKey) return ''
  return SUPPORTED_PAGE_KEYS.indexOf(pageKey) >= 0 ? pageKey : ''
}

export function isValidVisitorId(value: unknown): value is string {
  return typeof value === 'string' && VISITOR_ID_PATTERN.test(value)
}

/** 取全局 crypto（部分运行环境提供 Web Crypto，微信基础库则由 wx.getRandomValues 兜底）。 */
function getGlobalCrypto(): { getRandomValues?: (array: Uint8Array) => Uint8Array; randomUUID?: () => string } | undefined {
  const candidate = (typeof globalThis !== 'undefined'
    ? (globalThis as { crypto?: unknown }).crypto
    : undefined) as { getRandomValues?: (array: Uint8Array) => Uint8Array; randomUUID?: () => string } | undefined
  return candidate && typeof candidate === 'object' ? candidate : undefined
}

function bytesToHex(bytes: Uint8Array): string {
  let result = ''
  for (let index = 0; index < bytes.length; index += 1) {
    result += bytes[index].toString(16).padStart(2, '0')
  }
  return result
}

function defaultRandomHex(): string {
  const cryptoApi = getGlobalCrypto()
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)
    return bytesToHex(bytes)
  }
  // 非 Web Crypto 环境：使用 Math.random 生成 32 位十六进制。
  // 访客 ID 只用于同一渠道内的访客去重，不承载身份或安全语义。
  let result = ''
  while (result.length < 32) {
    result += Math.floor(Math.random() * 16).toString(16)
  }
  return result
}

export function createVisitorId(random: () => string = defaultRandomHex): string {
  const value = random()
  return isValidVisitorId(value) ? value : defaultRandomHex()
}

interface VisitorRecord {
  id: string
  createdAt: number
}

/**
 * 内存兜底：只在本地存储不可读/不可写时使用，保证同一小程序进程内仍复用同一个访客 ID。
 * 正常可读写时以存储为准，过期或损坏的记录会重新生成（而不是沿用内存值），
 * 避免“已经被判定过期却仍复用”的语义偏差。
 */
let memoryVisitor: VisitorRecord | null = null
/** 上一次写存储是否失败；失败时后续读取即便拿到空值也继续用内存 ID。 */
let persistFailed = false

type StoredVisitorRead =
  | { status: 'found'; record: VisitorRecord }
  | { status: 'missing' }
  | { status: 'unavailable' }

function readStoredVisitor(now: number): StoredVisitorRead {
  let raw: unknown
  try {
    raw = wx.getStorageSync(PAGE_VIEW_VISITOR_STORAGE_KEY)
  } catch (error) {
    // 存储不可读：交给内存兜底。
    return { status: 'unavailable' }
  }
  if (!raw) return { status: 'missing' }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const id = (parsed as VisitorRecord)?.id
    const createdAt = Number((parsed as VisitorRecord)?.createdAt)
    if (!isValidVisitorId(id) || !Number.isFinite(createdAt)) return { status: 'missing' }
    if (now - createdAt >= TTL_MS) return { status: 'missing' }
    return { status: 'found', record: { id, createdAt } }
  } catch (error) {
    // 本地数据损坏：按缺失处理，生成新的访客 ID。
    return { status: 'missing' }
  }
}

function writeStoredVisitor(record: VisitorRecord): boolean {
  try {
    wx.setStorageSync(PAGE_VIEW_VISITOR_STORAGE_KEY, JSON.stringify(record))
    persistFailed = false
    return true
  } catch (error) {
    // 存储已满或不可写：保留内存 ID，不影响页面访问。
    persistFailed = true
    return false
  }
}

/**
 * 读取或生成小程序访客 ID。过期、损坏或格式非法时重新生成；
 * 生成后写入小程序本地存储复用，格式固定为 32 位十六进制（符合后端校验）。
 */
export function readOrCreateVisitorId(
  nowMs: number = Date.now(),
  random: () => string = defaultRandomHex,
): string {
  const stored = readStoredVisitor(nowMs)
  if (stored.status === 'found') {
    memoryVisitor = stored.record
    return stored.record.id
  }
  const canReuseMemory = Boolean(memoryVisitor)
    && nowMs - (memoryVisitor as VisitorRecord).createdAt < TTL_MS
  if (canReuseMemory && (stored.status === 'unavailable'
    // 之前写存储失败过：存储里读不到值不代表访客换人了，继续用内存 ID。
    || (stored.status === 'missing' && persistFailed))) {
    return (memoryVisitor as VisitorRecord).id
  }

  const record: VisitorRecord = { id: createVisitorId(random), createdAt: nowMs }
  memoryVisitor = record
  if (!writeStoredVisitor(record)) {
    // 存储不可写时保留内存 ID，同一进程内继续复用。
    return record.id
  }
  return record.id
}

/**
 * 客户端幂等键。优先使用 crypto.randomUUID（形如 UUID，符合后端的
 * ^[0-9a-fA-F-]{16,64}$），不支持时退化为“时间戳十六进制 + 随机十六进制”，
 * 长度与字符集同样合法。
 */
export function createEventId(nowMs: number = Date.now(), random: () => string = defaultRandomHex): string {
  const cryptoApi = getGlobalCrypto()
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    const uuid = cryptoApi.randomUUID()
    if (EVENT_ID_PATTERN.test(uuid)) return uuid
  }
  const randomPart = random().replace(/[^0-9a-f]/gi, '').toLowerCase()
  const fallback = `${nowMs.toString(16)}${randomPart}`.slice(0, 32)
  if (EVENT_ID_PATTERN.test(fallback)) return fallback
  // 极端情况下补齐到 16 位合法字符，避免上报被后端拒绝。
  return `${nowMs.toString(16)}0000000000000000`.slice(0, 32)
}

export interface PageViewTrackerOptions {
  send?: (payload: {
    pageKey: SupportedPageKey
    visitorId: string
    eventId: string
    clientType: typeof PAGE_VIEW_CLIENT_TYPE
  }) => unknown
  now?: () => number
  random?: () => string
  dedupeWindowMs?: number
  /** 页面路径提供者；默认取当前页面栈顶。 */
  getCurrentPath?: () => string
}

export interface TrackPageShowOptions {
  /** 页面路径；缺省时取当前页面栈顶。 */
  routePath?: string
  /**
   * 是否是新页面实例的首次展示（onLoad / attached 之后）。
   *
   * 计数规则（与 Web 端 pageViewTracker 的路由口径对齐）：
   * 1. 当前页面键与上次统计的页面键不同 —— 真正切换到另一个页面，计数；
   * 2. 新实例首次展示（fresh），且不在去重窗口内 —— reLaunch / 重新进入，计数；
   * 3. 同一页面实例的再次 onShow（如从后台恢复、页面栈内返回后再次展示）——
   *    不重复计数，除非中间已经统计过其他页面（回到本页视为一次新的浏览）。
   */
  fresh?: boolean
}

export interface PageViewTracker {
  /** 页面展示时调用；返回 true 表示本次计了一次 PV。 */
  trackPageShow: (options?: TrackPageShowOptions) => boolean
  /** 页面卸载时调用，清理当前页面的去重状态。 */
  trackPageUnload: () => void
  reset: () => void
}

function defaultCurrentPath(): string {
  try {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1] as { route?: string; __route__?: string } | undefined
    return current?.route || current?.__route__ || ''
  } catch (error) {
    return ''
  }
}

/**
 * 创建页面浏览采集器。send 由调用方注入（通常来自 api/analytics），
 * 便于测试，也避免统计模块直接依赖请求实现。
 */
export function createPageViewTracker(options: PageViewTrackerOptions = {}): PageViewTracker {
  const send = typeof options.send === 'function' ? options.send : () => undefined
  const now = typeof options.now === 'function' ? options.now : () => Date.now()
  const random = typeof options.random === 'function' ? options.random : defaultRandomHex
  const dedupeWindowMs = Number.isFinite(options.dedupeWindowMs)
    ? Number(options.dedupeWindowMs)
    : PAGE_VIEW_DEDUPE_WINDOW_MS
  const getCurrentPath = typeof options.getCurrentPath === 'function'
    ? options.getCurrentPath
    : defaultCurrentPath

  // 上一次统计的页面：pageKey + 时间 + 本次展示的幂等键。
  let current: { pageKey: SupportedPageKey; at: number; eventId: string } | null = null

  return {
    trackPageShow(showOptions = {}) {
      const routePath = typeof showOptions.routePath === 'string'
        ? showOptions.routePath
        : getCurrentPath()
      const pageKey = resolvePageKey(routePath)
      if (!pageKey) return false

      const timestamp = now()
      const sameAsLast = Boolean(current) && current?.pageKey === pageKey
      if (sameAsLast) {
        // 同一页面的再次展示（从后台恢复、同一实例重复 onShow）不重复计数。
        if (!showOptions.fresh) return false
        // 新实例但距上次统计过近（快速 reLaunch / 连续触发）：去重。
        if (timestamp >= (current as { at: number }).at
          && timestamp - (current as { at: number }).at < dedupeWindowMs) {
          return false
        }
      }

      const eventId = createEventId(timestamp, random)
      current = { pageKey, at: timestamp, eventId }
      try {
        send({
          pageKey,
          visitorId: readOrCreateVisitorId(timestamp, random),
          eventId,
          clientType: PAGE_VIEW_CLIENT_TYPE,
        })
      } catch (error) {
        // 采集失败不能影响页面打开与后续渲染。
      }
      return true
    },
    trackPageUnload() {
      // 只清理去重状态：同一页面重新进入时应当重新计一次。
      current = null
    },
    reset() {
      current = null
    },
  }
}

/**
 * 全局共享采集器：小程序只有一个页面栈，用单例即可跨页面维护“当前页”状态，
 * 无需每个页面各自 new 一个实例。
 */
let sharedTracker: PageViewTracker | null = null
let sharedSend: PageViewTrackerOptions['send'] | null = null

export function configurePageViewTracker(send: PageViewTrackerOptions['send']): void {
  sharedSend = send
  sharedTracker = createPageViewTracker({ send })
}

export function getPageViewTracker(): PageViewTracker {
  if (!sharedTracker) {
    sharedTracker = createPageViewTracker({ send: sharedSend || undefined })
  }
  return sharedTracker
}
