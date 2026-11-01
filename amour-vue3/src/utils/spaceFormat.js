/**
 * 恋爱广场公开数据的日期与展示格式化工具。
 * 后端 LocalDateTime 格式为 "yyyy-MM-dd HH:mm:ss"，LocalDate 为 "yyyy-MM-dd"。
 */

function pad(value) {
  return String(value).padStart(2, '0')
}

/** 兼容后端日期字符串、Date 和 ISO 字符串，按本地时区解析。 */
export function parseSpaceDateTime(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const text = String(value ?? '').trim()
  if (!text) return null
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T00:00:00`
    : text.replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatSpaceDate(value, fallback = '—') {
  const date = parseSpaceDateTime(value)
  if (!date) return fallback
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

export function formatSpaceDateTime(value, fallback = '—') {
  const date = parseSpaceDateTime(value)
  if (!date) return fallback
  return `${formatSpaceDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 按自然日计算已经相伴的完整天数。 */
export function getDaysTogether(value) {
  const start = parseSpaceDateTime(value)
  if (!start) return null
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.max(0, Math.floor((today - startDay) / 86_400_000))
}

export function formatTogetherText(value) {
  const days = getDaysTogether(value)
  if (days == null) return '开始日期待补充'
  return days === 0 ? '今天开始' : `相伴 ${days} 天`
}

export function formatCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count >= 0 ? count : 0
}

export function formatMemberRole(role) {
  if (Number(role) === 1) return '空间发起人'
  if (Number(role) === 2) return '另一半'
  return '空间成员'
}

export function formatRepeatType(value) {
  if (Number(value) === 1) return '每年重复'
  if (Number(value) === 0) return '仅此一次'
  return '纪念日'
}

/** 邀请有效期：同时给出绝对时间和相对剩余时间。 */
export function formatInvitationExpiry(value) {
  const date = parseSpaceDateTime(value)
  if (!date) return '有效期未知'
  const absolute = formatSpaceDateTime(date)
  const diff = date.getTime() - Date.now()
  if (diff <= 0) return `${absolute}（已过期）`
  const hours = Math.ceil(diff / 3_600_000)
  const relative = hours < 24 ? `${hours} 小时后过期` : `${Math.ceil(diff / 86_400_000)} 天后过期`
  return `${absolute}（${relative}）`
}
