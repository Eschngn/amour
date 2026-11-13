/**
 * 工作台活跃度统计的日期范围工具。
 *
 * 所有日期都以本地日历的 yyyy-MM-dd 字符串处理，避免 new Date('yyyy-MM-dd')
 * 按 UTC 解析导致跨时区偏移一天。服务端同样按 Asia/Shanghai 切分统计日期。
 */

export const ACTIVITY_MAX_RANGE_DAYS = 90

/**
 * 与后端 PageViewConstants.TIME_ZONE 保持一致。
 * “今天”按北京时间计算，避免浏览器所在时区与服务端统计口径错位一天。
 */
export const ACTIVITY_TIME_ZONE = 'Asia/Shanghai'

export const ACTIVITY_PRESETS = Object.freeze([
  { key: '7d', label: '近 7 天', days: 7 },
  { key: '30d', label: '近 30 天', days: 30 },
  { key: 'custom', label: '自定义', days: 0 },
])

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 24 * 60 * 60 * 1000

function pad2(value) {
  return String(value).padStart(2, '0')
}

/**
 * Date -> 本地日期字符串 yyyy-MM-dd。
 */
export function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * yyyy-MM-dd -> Date（本地 00:00），非法日期返回 null。
 */
export function parseDateKey(dateKey) {
  if (typeof dateKey !== 'string') return null
  const match = DATE_KEY_PATTERN.exec(dateKey.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

export function todayKey(now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ACTIVITY_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)
    const value = type => parts.find(part => part.type === type)?.value || ''
    const year = value('year')
    const month = value('month')
    const day = value('day')
    if (year && month && day) return `${year}-${month}-${day}`
  } catch {
    // 旧环境缺少 Intl 时回退到浏览器本地日期。
  }
  return toDateKey(now)
}

/**
 * 日期字符串加减天数，自动处理跨月、跨年与闰年。
 */
export function addDays(dateKey, days) {
  const date = parseDateKey(dateKey)
  if (!date || !Number.isInteger(days)) return ''
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/**
 * 含首尾的天数；任一日期非法或结束早于开始时返回 0。
 */
export function countDays(startDate, endDate) {
  const start = parseDateKey(startDate)
  const end = parseDateKey(endDate)
  if (!start || !end || end < start) return 0
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.round((endUtc - startUtc) / DAY_MS) + 1
}

/**
 * 快捷范围。custom 返回 null，由调用方保留用户选择的区间。
 */
export function resolvePresetRange(presetKey, now = new Date()) {
  const preset = ACTIVITY_PRESETS.find(item => item.key === presetKey)
  if (!preset || !preset.days) return null
  const endDate = todayKey(now)
  return {
    startDate: addDays(endDate, -(preset.days - 1)),
    endDate,
  }
}

/**
 * 校验自定义区间。返回 { valid, message }，message 可直接展示给用户。
 */
export function validateActivityRange(startDate, endDate, options = {}) {
  const maxDays = Number.isInteger(options.maxDays) ? options.maxDays : ACTIVITY_MAX_RANGE_DAYS
  const today = options.today || todayKey()

  if (!startDate || !endDate) {
    return { valid: false, message: '请选择开始和结束日期' }
  }
  if (!parseDateKey(startDate) || !parseDateKey(endDate)) {
    return { valid: false, message: '日期格式应为 YYYY-MM-DD' }
  }
  if (endDate < startDate) {
    return { valid: false, message: '结束日期不能早于开始日期' }
  }
  if (endDate > today) {
    return { valid: false, message: '结束日期不能晚于今天' }
  }
  if (countDays(startDate, endDate) > maxDays) {
    return { valid: false, message: `统计区间最长支持 ${maxDays} 天` }
  }
  return { valid: true, message: '' }
}

export function buildActivityPayload(startDate, endDate) {
  return { startDate, endDate }
}

/**
 * 环比变化显示；服务端在上一周期为 0 时返回 null。
 */
export function formatChangeRate(value) {
  if (value === null || value === undefined || value === '') return '—'
  const rate = Number(value)
  if (!Number.isFinite(rate)) return '—'
  const abs = Math.abs(rate)
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1)
  if (rate > 0) return `+${text}%`
  if (rate < 0) return `-${text}%`
  return '0%'
}

/**
 * 千分位数字；decimals 用于日均值等需要一位小数的场景。
 */
export function formatActivityNumber(value, decimals = 0) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return number.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 2026-11-11 -> 11-11，用于坐标轴与明细方格。
 */
export function formatShortDate(dateKey) {
  return typeof dateKey === 'string' && dateKey.length >= 10 ? dateKey.slice(5) : dateKey
}

const WEEKDAY_LABELS = Object.freeze(['周日', '周一', '周二', '周三', '周四', '周五', '周六'])

/**
 * 2026-11-11 -> 周三。日期非法时返回空字符串。
 */
export function formatWeekday(dateKey) {
  const date = parseDateKey(dateKey)
  return date ? WEEKDAY_LABELS[date.getDay()] : ''
}

/**
 * 每日数据分页：最多 pageSize 天一组，并尽量均分，避免最后一页只剩一两天。
 * 返回按日期顺序连续排列的页数组；空数据返回空数组。
 */
export function paginateActivityDays(days, pageSize = 7) {
  if (!Array.isArray(days) || days.length === 0) return []
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 7
  const pageCount = Math.ceil(days.length / size)
  const base = Math.floor(days.length / pageCount)
  const extra = days.length % pageCount
  const pages = []
  let offset = 0
  for (let index = 0; index < pageCount; index += 1) {
    const length = base + (index < extra ? 1 : 0)
    pages.push(days.slice(offset, offset + length))
    offset += length
  }
  return pages
}
