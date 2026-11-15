/**
 * 表单基线与 dirty 判定工具。
 *
 * 约定：
 * - 基线记录“表单当前内容”的快照，回显后端数据后必须立即重建基线；
 * - 快照按字段名排序后序列化，避免对象键顺序不同造成误判；
 * - 基线为空表示尚未建立（例如数据仍在加载），此时一律视为 clean。
 */

function normalizeValue(value) {
  if (Array.isArray(value)) return value.map(normalizeValue)
  if (value && typeof value === 'object') {
    const normalized = {}
    Object.keys(value).sort().forEach((key) => {
      normalized[key] = normalizeValue(value[key])
    })
    return normalized
  }
  return value
}

/** 把表单内容转换为稳定的快照字符串。 */
export function createFormSnapshot(value) {
  return JSON.stringify(normalizeValue(value ?? null))
}

/** 基线尚未建立时视为 clean，避免加载过程中误报未保存。 */
export function isFormDirty(baseline, value) {
  if (!baseline) return false
  return createFormSnapshot(value) !== baseline
}
