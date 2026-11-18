/**
 * 列表页浏览状态与详情页返回目标的约定（纯函数，便于单测）。
 *
 * 为什么选择 history.state：
 * - 本项目使用 vue-router 5 + createWebHistory，没有引入 Pinia，也没有使用
 *   keep-alive；history.state 天然与“一条历史记录”绑定，浏览器前进/后退、
 *   刷新都会保留，且不需要新增依赖；
 * - 快照只写在“这一次访问”的历史记录上，因此从其它入口重新打开同一个列表时
 *   不会误用上一次的浏览位置；
 * - 不把状态写进 URL，避免影响分享链接、路由守卫与现有查询参数。
 *
 * 两类状态：
 * 1. 列表快照（LIST_VIEW_HISTORY_KEY）：列表页离开时写入自己的历史记录，
 *    返回该记录时读取并恢复章节 / 分页 / 滚动位置。
 * 2. 返回目标（DETAIL_RETURN_HISTORY_KEY）：从列表打开详情时写入详情的历史
 *    记录，详情页据此判断“上一层就是来源列表”，优先走 router.go() 的真正回退；
 *    来源不可信时回退到默认列表页。
 */

/** 列表页快照在 history.state 中的键。 */
export const LIST_VIEW_HISTORY_KEY = 'amourListViewState'
/** 详情页返回目标在 history.state 中的键。 */
export const DETAIL_RETURN_HISTORY_KEY = 'amourReturnTarget'

export const LIST_VIEW_STATE_VERSION = 1
export const RETURN_TARGET_VERSION = 1

/** 详情页之间连续翻篇时最多携带多少跳返回目标，超过后按默认列表处理。 */
export const MAX_RETURN_HOPS = 4
/** 恢复恋爱广场分页时最多补加载多少页，避免异常快照造成过多请求。 */
export const MAX_RESTORE_PLAZA_PAGES = 20

export const STORY_LIST_PATH = '/story'
export const PLAZA_LIST_PATH = '/plaza'

const STORY_DETAIL_PATH_RE = /^\/story\/[^/]+$/
const PUBLIC_SPACE_PATH_RE = /^\/plaza\/[1-9]\d*$/
const PUBLIC_STORY_DETAIL_PATH_RE = /^\/plaza\/[1-9]\d*\/story\/[^/]+$/

/** history.state 里 back 字段记录的是上一个位置的 fullPath，比较时先去掉 query/hash。 */
function stripLocationSuffix(path) {
  if (typeof path !== 'string') return ''
  return path.split('?')[0].split('#')[0]
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toSafePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return ''
  return stripLocationSuffix(path)
}

/** 我们的故事列表页 /story。 */
export function isStoryListPath(path) {
  return toSafePath(path) === STORY_LIST_PATH
}

/** 恋爱广场列表页 /plaza。 */
export function isPlazaListPath(path) {
  return toSafePath(path) === PLAZA_LIST_PATH
}

/** 故事详情页 /story/:id。 */
export function isStoryDetailPath(path) {
  return STORY_DETAIL_PATH_RE.test(stripLocationSuffix(path))
}

/** 公开情侣空间详情页 /plaza/:spaceId。 */
export function isPublicSpacePath(path) {
  return PUBLIC_SPACE_PATH_RE.test(stripLocationSuffix(path))
}

/** 公开故事详情页 /plaza/:spaceId/story/:storyId。 */
export function isPublicStoryDetailPath(path) {
  return PUBLIC_STORY_DETAIL_PATH_RE.test(stripLocationSuffix(path))
}

/**
 * 允许写入浏览快照的页面：我们的故事、恋爱广场、公开情侣空间。
 * 详情页不写列表快照，避免返回时把详情页的滚动位置当成列表位置恢复。
 */
export function isRestorableListViewPath(path) {
  return isStoryListPath(path) || isPlazaListPath(path) || isPublicSpacePath(path)
}

/** 滚动位置统一收敛为非负整数，非法值按 0 处理。 */
export function sanitizeScrollTop(value) {
  const top = Number(value)
  if (!Number.isFinite(top) || top <= 0) return 0
  return Math.round(top)
}

/**
 * 章节下标校验：必须是落在章节数量范围内的整数，否则返回 null 表示不可恢复。
 */
export function sanitizeChapterIndex(value, chapterCount) {
  const index = Number(value)
  const count = Number(chapterCount)
  if (!Number.isInteger(index) || index < 0) return null
  if (!Number.isInteger(count) || count <= 0) return null
  return index < count ? index : null
}

/**
 * 恋爱广场已加载页数校验：至少 1 页，并把异常值限制在上限内。
 */
export function sanitizePlazaPageCount(value, max = MAX_RESTORE_PLAZA_PAGES) {
  const page = Number(value)
  if (!Number.isInteger(page) || page < 1) return null
  const limit = Number.isInteger(max) && max >= 1 ? max : MAX_RESTORE_PLAZA_PAGES
  return Math.min(page, limit)
}

/** 读取当前历史记录的 state；不可用时返回 null，任何异常都不向上抛。 */
export function readHistoryState(historyLike = typeof window === 'undefined' ? null : window.history) {
  if (!historyLike) return null
  try {
    const state = historyLike.state
    return isPlainObject(state) ? state : null
  } catch {
    return null
  }
}

/** 读取当前窗口滚动位置，供列表页生成快照。 */
export function readWindowScrollTop(windowRef = typeof window === 'undefined' ? null : window) {
  if (!windowRef) return 0
  return sanitizeScrollTop(windowRef.scrollY ?? windowRef.pageYOffset)
}

/**
 * 生成列表快照。
 *
 * @param {string} path 当前列表路由的 fullPath
 * @param {{ scrollY?: number, data?: object, now?: number }} [options]
 */
export function buildListViewSnapshot(path, options = {}) {
  const fullPath = typeof path === 'string' ? path : ''
  if (!isRestorableListViewPath(fullPath)) return null
  const data = options?.data
  return {
    v: LIST_VIEW_STATE_VERSION,
    path: fullPath,
    scrollY: sanitizeScrollTop(options?.scrollY),
    data: isPlainObject(data) ? { ...data } : {},
    savedAt: Number.isFinite(Number(options?.now)) ? Number(options.now) : Date.now(),
  }
}

/**
 * 校验并归一化快照；expectedPath 存在时必须与快照路径完全一致，
 * 避免把 A 列表（或同列表的不同筛选条件）的状态错误套用到 B 列表。
 */
export function normalizeListViewSnapshot(raw, expectedPath) {
  if (!isPlainObject(raw)) return null
  if (raw.v !== LIST_VIEW_STATE_VERSION) return null
  if (!isRestorableListViewPath(raw.path)) return null
  if (expectedPath != null && expectedPath !== '') {
    // 用完整 fullPath（含 query）比较：不同筛选条件属于不同的浏览状态。
    if (raw.path !== expectedPath) return null
  }
  return {
    v: LIST_VIEW_STATE_VERSION,
    path: raw.path,
    scrollY: sanitizeScrollTop(raw.scrollY),
    data: isPlainObject(raw.data) ? { ...raw.data } : {},
    savedAt: Number.isFinite(Number(raw.savedAt)) ? Number(raw.savedAt) : 0,
  }
}

/**
 * 把列表快照写入当前历史记录。
 *
 * 必须保留 vue-router 自己写入的字段（back / current / forward / position / scroll），
 * 因此这里先复制现有 state 再合并，只替换列表快照键。
 */
export function writeListViewSnapshot(historyLike, snapshot) {
  if (!historyLike || typeof historyLike.replaceState !== 'function') return false
  const normalized = normalizeListViewSnapshot(snapshot, snapshot?.path)
  if (!normalized) return false
  try {
    const current = readHistoryState(historyLike)
    historyLike.replaceState({ ...(current || {}), [LIST_VIEW_HISTORY_KEY]: normalized }, '')
    return true
  } catch {
    return false
  }
}

/** 读取当前历史记录上的列表快照；路径不匹配时返回 null。 */
export function readListViewSnapshot(
  historyLike = typeof window === 'undefined' ? null : window.history,
  expectedPath,
) {
  const state = readHistoryState(historyLike)
  if (!state) return null
  return normalizeListViewSnapshot(state[LIST_VIEW_HISTORY_KEY], expectedPath)
}

/**
 * 生成详情页的返回目标。
 *
 * @param {string} path 来源列表的 fullPath
 * @param {{ hop?: number, now?: number }} [options] hop 表示当前详情与来源列表之间
 *   已经隔了几个详情页（直接把列表 → 详情记为 0）
 */
export function buildReturnTarget(path, options = {}) {
  const fullPath = typeof path === 'string' ? path : ''
  if (!isRestorableListViewPath(fullPath)) return null
  const hop = Number(options?.hop ?? 0)
  if (!Number.isInteger(hop) || hop < 0 || hop > MAX_RETURN_HOPS) return null
  return {
    v: RETURN_TARGET_VERSION,
    path: fullPath,
    hop,
    savedAt: Number.isFinite(Number(options?.now)) ? Number(options.now) : Date.now(),
  }
}

/** 校验并归一化返回目标；任何字段不可信都返回 null。 */
export function normalizeReturnTarget(raw) {
  if (!isPlainObject(raw)) return null
  if (raw.v !== RETURN_TARGET_VERSION) return null
  if (!isRestorableListViewPath(raw.path)) return null
  const hop = Number(raw.hop)
  if (!Number.isInteger(hop) || hop < 0 || hop > MAX_RETURN_HOPS) return null
  return {
    v: RETURN_TARGET_VERSION,
    path: raw.path,
    hop,
    savedAt: Number.isFinite(Number(raw.savedAt)) ? Number(raw.savedAt) : 0,
  }
}

/**
 * 详情页里“上一篇 / 下一篇”的返回目标：hop + 1，超过上限时不再携带，
 * 这样用户连续翻很多篇后仍能回到最初的列表，而不是无限追溯。
 */
export function buildChainedReturnTarget(rawTarget, { maxHops = MAX_RETURN_HOPS } = {}) {
  const target = normalizeReturnTarget(rawTarget)
  if (!target) return null
  const nextHop = target.hop + 1
  const limit = Number.isInteger(maxHops) && maxHops >= 0 ? maxHops : MAX_RETURN_HOPS
  if (nextHop > limit) return null
  return { ...target, hop: nextHop }
}

/** 把返回目标包成 router.push / RouterLink 可用的 state 对象。 */
export function buildReturnState(rawTarget) {
  const target = normalizeReturnTarget(rawTarget)
  return target ? { [DETAIL_RETURN_HISTORY_KEY]: target } : undefined
}

/** 给路由地址附加返回目标 state；目标不可信时原样返回地址。 */
export function withReturnState(location, rawTarget) {
  const state = buildReturnState(rawTarget)
  if (!state) return location
  if (typeof location === 'string') return { path: location, state }
  return { ...location, state: { ...(location?.state || {}), ...state } }
}

/**
 * 推导详情页的返回目标（用于详情页之间连续翻篇时继续携带来源信息）。
 *
 * 优先使用显式写入的返回目标（hop 表示中间隔了几个同类详情页）；
 * 没有显式目标时，退回到 vue-router 写在历史记录上的 back 字段：
 * 如果上一层正好是允许的来源列表，说明是“列表 -> 详情”的直接进入，hop=0。
 *
 * @param {object|null} historyState 当前历史记录的 state
 * @param {(path: string) => boolean} isAllowedReturnPath 允许作为返回目标的列表路径
 * @returns {{ v: number, path: string, hop: number, savedAt: number } | null}
 */
export function deriveReturnTarget(historyState, isAllowedReturnPath) {
  const state = isPlainObject(historyState) ? historyState : null
  if (!state) return null

  const hasExplicit = Object.prototype.hasOwnProperty.call(state, DETAIL_RETURN_HISTORY_KEY)
  const explicit = normalizeReturnTarget(state[DETAIL_RETURN_HISTORY_KEY])
  if (explicit) {
    if (typeof isAllowedReturnPath === 'function' && !isAllowedReturnPath(explicit.path)) return null
    return explicit
  }
  // 显式目标存在但已损坏（版本不符、路径非法等）：视为来源不可信，
  // 不再退回到 back 字段猜测，避免返回按钮跳到意料之外的页面。
  if (hasExplicit) return null

  const previousPath = toSafePath(state.back)
  if (!previousPath) return null
  if (typeof isAllowedReturnPath === 'function' && !isAllowedReturnPath(previousPath)) return null
  return { v: RETURN_TARGET_VERSION, path: previousPath, hop: 0, savedAt: 0 }
}

/**
 * 解析详情页“返回来源列表”的导航方式。
 *
 * 返回 { type: 'go', delta } 时表示上一层（或上 N 层）确实是我们记录的来源列表，
 * 走浏览器回退可以保留原来的历史记录（含列表快照），不额外产生一条列表记录；
 * 返回 { type: 'push', path } 时表示来源不可信（直接打开、来源被替换、历史记录
 * 不够等），改为跳转到默认列表页，保证不会出现空白页或错误路由。
 *
 * @param {object|null} historyState 当前历史记录的 state
 * @param {{
 *   isAllowedReturnPath: (path: string) => boolean,
 *   isPreviousDetailPath?: (path: string) => boolean,
 *   fallbackPath: string,
 *   maxHops?: number,
 * }} options
 */
export function resolveReturnNavigation(historyState, options = {}) {
  const fallbackPath = toSafePath(options?.fallbackPath) || '/'
  const fallback = { type: 'push', path: fallbackPath }
  const state = isPlainObject(historyState) ? historyState : null
  if (!state) return fallback

  const target = deriveReturnTarget(state, options?.isAllowedReturnPath)
  if (!target) return fallback

  const limit = Number.isInteger(options?.maxHops) && options.maxHops >= 0
    ? options.maxHops
    : MAX_RETURN_HOPS
  const delta = target.hop + 1
  if (delta > limit + 1) return fallback

  const previousPath = typeof state.back === 'string' ? state.back : ''
  if (target.hop === 0) {
    // 直接由列表进入详情：上一层历史必须正好是来源列表。
    if (stripLocationSuffix(previousPath) !== stripLocationSuffix(target.path)) return fallback
  } else {
    // 连续翻篇：上一层必须是同类详情页，否则说明历史记录已被替换。
    if (typeof options?.isPreviousDetailPath !== 'function'
      || !options.isPreviousDetailPath(previousPath)) {
      return fallback
    }
  }

  // position 从 0 开始计数，回退步数不能超过当前记录位置。
  const position = Number(state.position)
  if (Number.isFinite(position) && position >= 0 && position < delta) return fallback

  return { type: 'go', delta: -delta }
}

/** 故事详情页：来源只接受“我们的故事”列表。 */
export function resolveStoryDetailReturn(historyState, options = {}) {
  return resolveReturnNavigation(historyState, {
    isAllowedReturnPath: isStoryListPath,
    isPreviousDetailPath: isStoryDetailPath,
    fallbackPath: options?.fallbackPath || STORY_LIST_PATH,
  })
}

/** 公开故事详情页：来源接受恋爱广场列表或公开情侣空间详情。 */
export function resolvePublicStoryDetailReturn(historyState, options = {}) {
  const fallbackPath = isPlazaListPath(options?.fallbackPath) || isPublicSpacePath(options?.fallbackPath)
    ? options.fallbackPath
    : PLAZA_LIST_PATH
  return resolveReturnNavigation(historyState, {
    isAllowedReturnPath: path => isPlazaListPath(path) || isPublicSpacePath(path),
    isPreviousDetailPath: isPublicStoryDetailPath,
    fallbackPath,
  })
}

/** 公开情侣空间详情页：来源只接受恋爱广场列表。 */
export function resolvePublicSpaceDetailReturn(historyState, options = {}) {
  return resolveReturnNavigation(historyState, {
    isAllowedReturnPath: isPlazaListPath,
    isPreviousDetailPath: isPublicSpacePath,
    fallbackPath: options?.fallbackPath || PLAZA_LIST_PATH,
  })
}

/** 详情页连续翻篇时使用的返回目标（hop + 1，超过上限则不再携带）。 */
export function deriveChainedReturnTarget(historyState, options = {}) {
  const target = deriveReturnTarget(historyState, options?.isAllowedReturnPath)
  return buildChainedReturnTarget(target, { maxHops: options?.maxHops })
}
