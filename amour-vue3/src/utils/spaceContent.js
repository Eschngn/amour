import { parseSpaceDateTime } from './spaceFormat.js'

/**
 * 空间内容编辑相关的纯展示/格式化工具。
 */

/** 后端 LocalDateTime -> datetime-local 需要的 yyyy-MM-ddTHH:mm:ss（保留秒，避免编辑时丢失精度）。 */
export function toDateTimeLocalInput(value) {
  const date = parseSpaceDateTime(value)
  if (!date) return ''
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** datetime-local 的值转为后端约定的 yyyy-MM-dd HH:mm:ss；空值表示清空。 */
export function toBackendDateTime(value) {
  const text = String(value || '').trim()
  if (!text) return null
  const normalized = text.replace('T', ' ')
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return `${normalized} 00:00:00`
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`
  return normalized
}

/** 只取日期部分，供“仅展示日期”模式的日期选择器使用。 */
export function toDateInputValue(value) {
  return String(value || '').trim().slice(0, 10)
}

/** 只取时间部分；缺失时返回 00:00:00，不能用当前时刻猜测。 */
export function toTimeInputValue(value) {
  const text = String(value || '').trim().replace('T', ' ')
  const match = /^\d{4}-\d{2}-\d{2} (\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text)
  if (!match) return '00:00:00'
  return `${match[1]}:${match[2]}:${match[3] || '00'}`
}

/**
 * 时间展示精度：true-日期和时间 false-仅日期。
 * 历史记录与旧接口缺失字段时按 true 兼容。
 */
export function normalizeShowTime(value, fallback = true) {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'boolean') return value
  const text = String(value).trim().toLowerCase()
  if (text === 'false' || text === '0') return false
  if (text === 'true' || text === '1') return true
  const number = Number(value)
  return Number.isFinite(number) ? number !== 0 : fallback
}

/**
 * 提交给后端的内容时间。
 *
 * 仅日期模式显式规范化为当天 00:00:00，服务端仍会再次归一化，
 * 避免残留时分秒影响排序与展示。
 */
export function toBackendContentDateTime(value, showTime) {
  const normalized = toBackendDateTime(value)
  if (!normalized) return null
  return normalizeShowTime(showTime) ? normalized : `${normalized.slice(0, 10)} 00:00:00`
}

/** 仅日期模式选择日期后，把日期与已有时间合成为完整值。 */
export function applyDatePart(value, date) {
  const text = String(date || '').trim().slice(0, 10)
  if (!text) return ''
  return `${text} ${toTimeInputValue(value)}`
}

/** 后端 LocalDate -> yyyy-MM-dd；空值返回空字符串。 */
export function toDateInput(value) {
  const date = parseSpaceDateTime(value)
  if (!date) return ''
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 统一读取接口错误：优先后端业务提示，其次网络层提示。 */
export function readContentErrorMessage(error, fallback = '操作失败，请稍后重试') {
  const backendMessage = error?.response?.data?.message
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage.trim()
  }
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return '网络连接不稳定，请检查网络后重试'
  }
  if (error?.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试'
  }
  const message = error?.message
  return typeof message === 'string' && message.trim() ? message.trim() : fallback
}

/** 接口返回 success=false 时抛出带后端文案的异常，避免页面重复处理。 */
export function ensureSuccess(response, fallback) {
  const body = response?.data
  if (!body?.success) {
    const error = new Error(body?.message || fallback)
    error.errorCode = body?.errorCode
    throw error
  }
  return body.data
}

/** 只允许 http(s) 或站内相对路径，防止 javascript: 等地址进入 img src。 */
export function isSafeImageUrl(value) {
  const text = String(value || '').trim()
  return text.length === 0 || /^(https?:\/\/|\/)[^\s]*$/i.test(text)
}

export const VISIBILITY_OPTIONS = Object.freeze([
  { value: 0, label: '仅空间成员可见' },
  { value: 1, label: '公开到恋爱广场' },
  { value: 2, label: '隐藏' },
])

/** 故事发生时间 / 照片拍摄时间的展示精度。 */
export const SHOW_TIME_OPTIONS = Object.freeze([
  { value: true, label: '展示日期和时间' },
  { value: false, label: '仅展示日期' },
])

/**
 * 公开审核状态文案。null 表示该内容不需要审核。
 */
export const REVIEW_STATUS_LABELS = Object.freeze({
  PENDING: '审核中',
  REJECTED: '审核未通过',
  PUBLISHED: '已公开',
  UNPUBLISHED: '已下架',
})

export function reviewStatusLabel(status) {
  return REVIEW_STATUS_LABELS[status] || ''
}

/** 可见性下拉选项：未完成绑定的一方不能选择公开，同时保留禁用说明。 */
export function buildVisibilityOptions(canPublish) {
  return VISIBILITY_OPTIONS.map(option => {
    const disabled = option.value === 1 && !canPublish
    return {
      value: option.value,
      label: disabled ? `${option.label}（完成绑定后可用）` : option.label,
      disabled,
    }
  })
}

export const ANNIVERSARY_CATEGORIES = Object.freeze([
  { value: 'love', label: '恋爱' },
  { value: 'birthday', label: '生日' },
  { value: 'journey', label: '旅行' },
  { value: 'memory', label: '回忆' },
  { value: 'milestone', label: '里程碑' },
  { value: 'other', label: '其他' },
])
