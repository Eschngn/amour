/**
 * 表单基线与 dirty / 无改动判定工具。
 *
 * 约定：
 * - 基线记录“表单当前内容”的规范化快照，回显后端数据后必须立即重建基线；
 * - 空字符串、null、undefined 视为同一个空值，数字与数字字符串按数值比较，
 *   日期时间统一格式，避免后端回显格式差异被误判为修改；
 * - 基线为空表示尚未建立（例如数据仍在加载），此时一律视为 clean，
 *   也绝不允许据此跳过保存（必须继续走新增或编辑校验流程）。
 */

const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isEmptyScalar(value) {
  return value === null
    || value === undefined
    || (typeof value === 'string' && value.trim() === '')
}

/** 数字字符串只在和数字比较时才按数值处理，避免把 “1” 与 “01” 当成同一段文本。 */
function numericStringValue(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!NUMBER_PATTERN.test(text)) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

/** 字符串统一换行与首尾空白；日期时间统一为 yyyy-MM-dd HH:mm:ss。 */
function normalizeText(value) {
  const text = value.replace(/\r\n?/g, '\n').trim()
  if (!text) return null
  const dateTime = DATE_TIME_PATTERN.exec(text)
  if (dateTime) {
    return `${dateTime[1]}-${dateTime[2]}-${dateTime[3]} `
      + `${dateTime[4]}:${dateTime[5]}:${dateTime[6] || '00'}`
  }
  if (DATE_PATTERN.test(text)) return text
  return text
}

/** 生成用于比较的规范结构：键名排序、丢弃空值字段、统一文本格式。 */
function normalizeFormValue(value) {
  if (Array.isArray(value)) return value.map(normalizeFormValue)
  if (isPlainObject(value)) {
    const normalized = {}
    Object.keys(value).sort().forEach((key) => {
      if (isEmptyScalar(value[key])) return
      normalized[key] = normalizeFormValue(value[key])
    })
    return normalized
  }
  if (typeof value === 'string') return normalizeText(value)
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value
  return value ?? null
}

function equivalentValues(left, right) {
  if (isEmptyScalar(left) && isEmptyScalar(right)) return true

  // 数字与数字字符串等价；两个字符串之间仍按文本比较。
  if (typeof left === 'number' && typeof right === 'string') {
    const number = numericStringValue(right)
    return number !== null && left === number
  }
  if (typeof right === 'number' && typeof left === 'string') {
    const number = numericStringValue(left)
    return number !== null && right === number
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false
    }
    return left.every((item, index) => equivalentValues(item, right[index]))
  }

  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right)) return false
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    if (leftKeys.length !== rightKeys.length) return false
    return leftKeys.every(key => Object.prototype.hasOwnProperty.call(right, key)
      && equivalentValues(left[key], right[key]))
  }

  return Object.is(left, right)
}

/** 把表单内容转换为稳定的快照字符串。 */
export function createFormSnapshot(value) {
  return JSON.stringify(normalizeFormValue(value ?? null))
}

/** 基线尚未建立时视为 clean，避免加载过程中误报未保存。 */
export function isFormDirty(baseline, value) {
  if (!baseline) return false
  let parsed
  try {
    parsed = JSON.parse(baseline)
  } catch {
    // 基线损坏时保守视为有修改，避免错误跳过保存。
    return true
  }
  return !equivalentValues(parsed, normalizeFormValue(value ?? null))
}

/** 基线存在且规范化后完全一致，才表示“编辑无改动”。 */
export function isFormUnchanged(baseline, value) {
  return Boolean(baseline) && !isFormDirty(baseline, value)
}

/**
 * 是否跳过“编辑已有内容但没有任何改动”的保存请求。
 *
 * 新增内容（editing=false）、基线缺失、请求或上传进行中都必须继续走原有流程：
 * 新增仍需必填校验，上传中不能被无改动逻辑绕过。
 */
export function shouldSkipUnchangedSave({
  editing = false,
  baseline = '',
  snapshot,
  busy = false,
} = {}) {
  if (!editing || busy) return false
  return isFormUnchanged(baseline, snapshot)
}
