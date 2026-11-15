/**
 * 排序列表纯函数工具。
 *
 * 约定：
 * - 所有函数都返回新数组，不原地修改传入列表；
 * - 获取顺序只依赖列表下标，便于拖拽与键盘操作共用同一套逻辑；
 * - 内部排序值统一从 10 开始，每项递增 10，界面只展示序号。
 */

function toList(value) {
  return Array.isArray(value) ? value.slice() : []
}

export function moveItem(list, fromIndex, toIndex) {
  const items = toList(list)
  if (!items.length) return items
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return items
  if (fromIndex < 0 || fromIndex >= items.length) return items
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return items
  const [moved] = items.splice(fromIndex, 1)
  items.splice(toIndex, 0, moved)
  return items
}

export function moveItemUp(list, index) {
  return moveItem(list, index, index - 1)
}

export function moveItemDown(list, index) {
  return moveItem(list, index, index + 1)
}

export function moveItemToTop(list, index) {
  return moveItem(list, index, 0)
}

export function moveItemToEnd(list, index) {
  return moveItem(list, index, toList(list).length - 1)
}

/** 生成保存接口需要的排序项：10、20、30…… */
export function normalizeSortItems(list) {
  return toList(list).map((item, index) => ({
    id: item?.id,
    sortOrder: (index + 1) * 10,
  }))
}

/** 提取稳定 ID 序列，用于判断顺序是否真的发生变化。 */
export function sortItemIds(list) {
  return toList(list).map(item => item?.id)
}

export function hasOrderChanged(before, after) {
  const left = Array.isArray(before) ? before : sortItemIds(before)
  const right = Array.isArray(after) ? after : sortItemIds(after)
  return left.length !== right.length
    || left.some((id, index) => String(id) !== String(right[index]))
}
