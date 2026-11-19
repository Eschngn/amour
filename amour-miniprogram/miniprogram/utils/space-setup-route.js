/**
 * 情侣空间设置页的路由与 query 解析（纯函数）。
 *
 * 为什么单独抽一个文件：
 * - 入口散布在「我的」、底部导航、分享链接、登录回跳等多个位置，
 *   如果每处都各自拼 `?action=create` / `?mode=settings`，很容易出现参数不一致；
 * - 页面 onLoad 需要把 query 还原成「视图模式」，同样是一段纯字符串判断，
 *   放在页面里既不好测也容易和入口拼装逻辑漂移；
 * - 这里不依赖 wx、不发起请求、不读写状态，可在 node:test 中直接验证。
 *
 * 两种入口参数（保持向后兼容）：
 * - 创建 / 绑定：`/pages/space-setup/index?action=create`、`?action=bind`（原有语义，不变）；
 * - 空间设置：`/pages/space-setup/index?mode=settings`（已有空间的用户停留在设置页）。
 *
 * 解析优先级：`mode` 优先于 `action`；这样即使分享链接里同时带了两个参数，
 * 也以更明确的视图模式为准，不会被旧参数改回创建 / 绑定流程。
 */
const { SPACE_SETUP_ROUTE } = require('./session-constants')

/** 页面视图模式；空字符串表示沿用默认的「创建 / 绑定」页面。 */
const SPACE_SETUP_MODE = Object.freeze({
  NONE: '',
  CREATE: 'create',
  BIND: 'bind',
  SETTINGS: 'settings',
})

/** 规范化入口参数：只接受白名单值，其余一律按默认页面处理。 */
function normalizeSpaceSetupAction(action) {
  const raw = typeof action === 'string' ? action.trim().toLowerCase() : ''
  if (raw === SPACE_SETUP_MODE.CREATE) return SPACE_SETUP_MODE.CREATE
  if (raw === SPACE_SETUP_MODE.BIND) return SPACE_SETUP_MODE.BIND
  if (raw === SPACE_SETUP_MODE.SETTINGS) return SPACE_SETUP_MODE.SETTINGS
  return SPACE_SETUP_MODE.NONE
}

/**
 * 生成情侣空间页地址。
 *
 * @param {'create'|'bind'|'settings'|''} [action] 进入后要展示的视图 / 分区
 * @returns {string} 站内绝对路径（可直接交给 navigateTo / reLaunch）
 */
function buildSpaceSetupUrl(action) {
  const mode = normalizeSpaceSetupAction(action)
  if (mode === SPACE_SETUP_MODE.SETTINGS) return `${SPACE_SETUP_ROUTE}?mode=${SPACE_SETUP_MODE.SETTINGS}`
  if (mode === SPACE_SETUP_MODE.CREATE) return `${SPACE_SETUP_ROUTE}?action=${SPACE_SETUP_MODE.CREATE}`
  if (mode === SPACE_SETUP_MODE.BIND) return `${SPACE_SETUP_ROUTE}?action=${SPACE_SETUP_MODE.BIND}`
  return SPACE_SETUP_ROUTE
}

/** 读取 query 中的字符串参数：非字符串（数组 / 对象）一律忽略。 */
function readQueryValue(query, key) {
  if (!query || typeof query !== 'object') return ''
  const value = query[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 解析页面 onLoad 的 query。
 *
 * @param {Record<string, unknown>|null|undefined} query
 * @returns {{ mode: string, action: string, isSettings: boolean }}
 *   mode 为最终视图模式（'' | 'create' | 'bind' | 'settings'）；
 *   action 为查询串里显式给出的动作（用于兼容旧的 ?action=bind 语义）；
 *   isSettings 为「是否为空间设置模式」的直接标记。
 */
function parseSpaceSetupQuery(query) {
  const mode = normalizeSpaceSetupAction(readQueryValue(query, 'mode'))
  const action = normalizeSpaceSetupAction(readQueryValue(query, 'action'))
  const resolved = mode || action
  return {
    mode: resolved,
    action,
    isSettings: resolved === SPACE_SETUP_MODE.SETTINGS,
  }
}

module.exports = {
  SPACE_SETUP_MODE,
  normalizeSpaceSetupAction,
  buildSpaceSetupUrl,
  parseSpaceSetupQuery,
}
