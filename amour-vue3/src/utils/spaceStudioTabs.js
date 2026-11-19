/**
 * 空间编辑页的栏目定义与可见性规则。
 *
 * 单独抽成纯函数，便于在不挂载 Vue 的情况下验证：
 * - 首页属于空间基础能力，不依赖模块查询权限；
 * - 故事 / 留言 / 相册 / 纪念日按 `frontend:<module>:query` 权限过滤；
 * - URL 里的 tab 只有在当前可见栏目内才恢复，否则回落到第一个可用栏目。
 */

export const SPACE_STUDIO_TABS = Object.freeze([
  { key: 'home', label: '首页', hint: '空间名称与首页展示', module: 'home' },
  { key: 'story', label: '故事', hint: '章节与故事内容', module: 'story' },
  { key: 'message', label: '留言', hint: '留言与回复管理', module: 'message' },
  { key: 'photo', label: '相册', hint: '分类与照片内容', module: 'photo' },
  { key: 'anniversary', label: '纪念日', hint: '重要日期与提醒', module: 'anniversary' },
])

/**
 * 过滤出当前账号可见的栏目。
 *
 * @param {(module: string) => boolean} hasQueryPermission
 * @returns {Array<{key: string, label: string, hint: string, module: string}>}
 */
export function resolveVisibleStudioTabs(hasQueryPermission) {
  const canQuery = typeof hasQueryPermission === 'function' ? hasQueryPermission : () => false
  return SPACE_STUDIO_TABS.filter(tab => tab.key === 'home' || canQuery(tab.module))
}

/** 指定栏目是否在可见栏目集合内。 */
export function isStudioTabAllowed(key, tabs) {
  if (!key || !Array.isArray(tabs)) return false
  return tabs.some(tab => tab.key === key)
}

/**
 * 解析初始 / 恢复栏目。
 *
 * @param {unknown} requested route.query.tab
 * @param {Array<{key: string}>} tabs 可见栏目
 * @returns {string} 可直接使用的栏目 key，没有可用栏目时返回空字符串
 */
export function resolveStudioTab(requested, tabs) {
  const list = Array.isArray(tabs) ? tabs : []
  const value = typeof requested === 'string' ? requested.trim() : ''
  if (value && isStudioTabAllowed(value, list)) return value
  return list[0]?.key || ''
}
