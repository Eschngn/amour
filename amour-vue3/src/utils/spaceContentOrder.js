/**
 * 故事/照片筛选与排序范围的纯函数工具。
 *
 * 约定：
 * - 未筛选章节/分类时使用后端持久化的全局顺序；
 * - 筛选后使用章节/分类内顺序；
 * - 两套顺序只读取数据，不修改传入列表。
 */

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

/** 全局顺序：globalSortOrder 升序，相同值按 id 升序兜底。 */
export function compareStoryGlobal(left, right) {
  return numberValue(left?.globalSortOrder) - numberValue(right?.globalSortOrder)
    || numberValue(left?.id) - numberValue(right?.id)
}

/** 章节内顺序：sortOrder 升序，再按发生时间与 id 兜底。 */
export function compareStoryLocal(left, right) {
  return numberValue(left?.sortOrder) - numberValue(right?.sortOrder)
    || String(left?.happenedTime || '').localeCompare(String(right?.happenedTime || ''))
    || numberValue(left?.id) - numberValue(right?.id)
}

/**
 * 故事列表视图。
 *
 * @param {Array} nodes 全量故事
 * @param {number|string} chapterId 章节 ID；'all' 表示全部故事
 */
export function sortStoryNodesForFilter(nodes, chapterId = 'all') {
  const list = Array.isArray(nodes) ? nodes.slice() : []
  if (String(chapterId) === 'all') {
    return list.sort(compareStoryGlobal)
  }
  return list
    .filter(node => String(node?.chapterId) === String(chapterId))
    .sort(compareStoryLocal)
}

/** 故事排序范围：全部故事为全局排序，具体章节为章节内排序。 */
export function resolveStorySortScope(chapterId) {
  return String(chapterId) === 'all'
    ? { scope: 'global', chapterId: null }
    : { scope: 'chapter', chapterId: Number(chapterId) }
}

/** 按范围生成故事排序请求，避免把全局排序误提交为章节排序。 */
export function buildStorySortPayload(scope, chapterId, items) {
  return scope === 'global' ? { items } : { chapterId, items }
}

/** 照片排序范围：全部照片为全局排序，具体分类为分类内排序。 */
export function resolvePhotoSortScope(categoryId) {
  return String(categoryId) === 'all'
    ? { scope: 'global', categoryId: null }
    : { scope: 'category', categoryId: Number(categoryId) }
}

/** 按范围生成照片排序请求。 */
export function buildPhotoSortPayload(scope, categoryId, items) {
  return scope === 'global' ? { items } : { categoryId, items }
}

/**
 * 把当前分页的拖拽结果合并回完整排序列表。
 *
 * 分页展示时用户只能调整当前页内记录的位置，因此只替换这些记录在完整列表中的槽位，
 * 其他页记录保持原位，避免把未展示的照片挤到列表末尾。
 */
export function mergePageOrderIntoFullOrder(fullItems, pageItems) {
  const full = Array.isArray(fullItems) ? fullItems.slice() : []
  const page = Array.isArray(pageItems) ? pageItems.slice() : []
  if (!page.length) return full
  const pageIds = new Set(page.map(item => String(item?.id)))
  if (pageIds.size !== page.length) {
    throw new Error('排序数据包含重复记录')
  }
  if (!full.length) return page
  let cursor = 0
  const merged = full.map(item => {
    if (!pageIds.has(String(item?.id))) return item
    const replacement = page[cursor]
    cursor += 1
    return { ...item, ...replacement }
  })
  if (cursor !== page.length) {
    throw new Error('排序数据与完整列表不一致，请刷新后重试')
  }
  return merged
}

/** 判断已选中的章节/分类是否仍然存在，用于删除后清除失效筛选。 */
export function hasSelectedContentScope(items, selectedId) {
  if (String(selectedId) === 'all') return true
  return (Array.isArray(items) ? items : []).some(item => String(item?.id) === String(selectedId))
}
