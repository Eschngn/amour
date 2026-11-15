/**
 * 留言板相对时间展示。
 *
 * 后端 LocalDateTime 统一序列化为 "yyyy-MM-dd HH:mm:ss"（不带时区），
 * 这里复用 spaceFormat 的解析规则：
 * - 不带时区的后端时间按用户浏览器本地时区解释；
 * - 带 Z 或时区偏移的 ISO 时间按真实时刻解析。
 *
 * 自然日判断在同一个目标时区下取年月日，再换算成 UTC 日历日序号相减，
 * 因此不会把“24 小时”当成“一个自然日”，也不受夏令时切换影响。
 */

import { parseSpaceDateTime } from './spaceFormat.js'

export const COMMENT_TIME_FALLBACK = '时间未知'
/** 共享时钟建议刷新间隔：覆盖“刚刚 / X分钟前”的分钟级变化。 */
export const COMMENT_TIME_REFRESH_MS = 30_000

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const MAX_RELATIVE_DAY = 7

/** 合法的 ISO 8601 / 后端日期时间字符串，dateTime 属性直接复用原值。 */
const ISO_LIKE_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?$/

/** 拆出年月日与时间，用于拦截 2 月 30 日这类会被 Date 自动进位的非法日期。 */
const CALENDAR_TEXT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

function pad2(value) {
  return String(value).padStart(2, '0')
}

/**
 * Date 会把 2026-02-30 自动进位为 3 月 2 日，这里先校验日历字段。
 * 不符合该格式的字符串交给 parseSpaceDateTime 统一判定。
 */
function hasValidCalendarFields(text) {
  const match = CALENDAR_TEXT_PATTERN.exec(text)
  if (!match) return true
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return false
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day < 1 || day > maxDay) return false
  if (match[4] !== undefined) {
    const hour = Number(match[4])
    const minute = Number(match[5])
    const second = match[6] === undefined ? 0 : Number(match[6])
    if (hour > 23 || minute > 59 || second > 59) return false
  }
  return true
}

function parseCommentDateTime(value) {
  if (typeof value === 'string' && !hasValidCalendarFields(value.trim())) {
    return null
  }
  return parseSpaceDateTime(value)
}

function resolveNow(now) {
  if (now === undefined || now === null || now === '') return new Date()
  const date = now instanceof Date ? now : new Date(now)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

/**
 * 读取目标时区下的年月日时分秒。
 * timeZone 为空时使用浏览器本地时区；非法时区回退到本地时区。
 */
function readZonedParts(date, timeZone) {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(date)
      const pick = type => Number(parts.find(part => part.type === type)?.value)
      const year = pick('year')
      const month = pick('month')
      const day = pick('day')
      const hour = pick('hour')
      const minute = pick('minute')
      const second = pick('second')
      if ([year, month, day, hour, minute, second].every(Number.isFinite)) {
        return { year, month, day, hour: hour % 24, minute, second }
      }
    } catch {
      // 运行时缺少 Intl 或时区非法时回退本地时间。
    }
  }
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  }
}

/** 把目标时区的年月日映射到 UTC 日历日序号，避免夏令时导致的 23/25 小时日。 */
function calendarDayNumber(parts) {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000)
}

function formatFull(date, timeZone) {
  const parts = readZonedParts(date, timeZone)
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`
}

function formatRelative(date, now, timeZone, fallback) {
  const diff = now.getTime() - date.getTime()
  if (!Number.isFinite(diff)) return fallback
  // 包括少量时钟偏差导致的未来时间：不展示负数，统一视为刚刚。
  if (diff < MINUTE_MS) return '刚刚'
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}分钟前`

  const currentParts = readZonedParts(now, timeZone)
  const targetParts = readZonedParts(date, timeZone)
  const dayDiff = calendarDayNumber(currentParts) - calendarDayNumber(targetParts)

  // 同一自然日（跨夏令时可能实际经过 23/25 小时，仍按小时差展示）。
  if (dayDiff <= 0) {
    return `${Math.max(1, Math.floor(diff / HOUR_MS))}小时前`
  }
  if (dayDiff === 1) return '昨天'
  if (dayDiff <= MAX_RELATIVE_DAY) return `${dayDiff}天前`
  if (currentParts.year === targetParts.year) {
    return `${pad2(targetParts.month)}-${pad2(targetParts.day)}`
  }
  return `${targetParts.year}-${pad2(targetParts.month)}-${pad2(targetParts.day)}`
}

function toDateTimeAttribute(value, date) {
  if (typeof value === 'string') {
    const text = value.trim()
    if (ISO_LIKE_PATTERN.test(text)) return text.replace(' ', 'T')
  }
  return date.toISOString()
}

/**
 * 留言板相对时间文本。
 *
 * timeZone 只影响展示与自然日判断；不带时区的后端时间仍按浏览器本地时区解析。
 *
 * @param {string|number|Date} value 后端返回的原始时间
 * @param {{ now?: Date|number|string, timeZone?: string, fallback?: string }} [options]
 * @returns {string} 刚刚 / X分钟前 / X小时前 / 昨天 / X天前 / MM-DD / YYYY-MM-DD
 */
export function formatCommentTime(value, options = {}) {
  const date = parseCommentDateTime(value)
  const fallback = options.fallback ?? COMMENT_TIME_FALLBACK
  if (!date) return fallback
  return formatRelative(date, resolveNow(options.now), options.timeZone, fallback)
}

/** 完整日期时间，用于 title 提示，例如 2024-11-08 14:30:00。 */
export function formatCommentFullTime(value, options = {}) {
  const date = parseCommentDateTime(value)
  if (!date) return options.fallback ?? COMMENT_TIME_FALLBACK
  return formatFull(date, options.timeZone)
}

/**
 * 组件使用的完整展示信息：
 * - text：相对时间；
 * - title：完整日期时间；
 * - dateTime：time 元素的原始时间属性；
 * - valid：原始时间是否可解析。
 */
export function describeCommentTime(value, options = {}) {
  const date = parseCommentDateTime(value)
  const fallback = options.fallback ?? COMMENT_TIME_FALLBACK
  if (!date) {
    return {
      text: fallback,
      title: null,
      dateTime: '',
      valid: false,
    }
  }
  const now = resolveNow(options.now)
  return {
    text: formatRelative(date, now, options.timeZone, fallback),
    title: formatFull(date, options.timeZone),
    dateTime: toDateTimeAttribute(value, date),
    valid: true,
  }
}
