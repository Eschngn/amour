/**
 * 情侣空间「基础信息」编辑的纯逻辑。
 *
 * 为什么单独放一个文件：
 * - 基础信息编辑里最容易出错的是「时间」：后端是 `yyyy-MM-dd HH:mm:ss`，
 *   datetime-local 只有分钟精度；如果每次保存都按分钟重新拼装，用户只改空间名称
 *   也会把原本的秒数抹成 00。这里用纯函数保证「只有用户真的改了时间才按分钟精度提交」。
 * - 名称 / 简介的空白归一化、提交体构造、字段级校验、无改动判断都可以脱离 Vue 单测，
 *   页面只负责交互与请求，避免同类判断在组件与测试里各写一份。
 */
import { createFormSnapshot, isFormUnchanged } from './formBaseline.js'

export const SPACE_NAME_MAX_LENGTH = 30
export const DESCRIPTION_MAX_LENGTH = 500

const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/

function pad(value) {
  return String(value).padStart(2, '0')
}

/**
 * 解析后端 `yyyy-MM-dd HH:mm:ss`（也兼容 T 分隔与缺省秒）为字段对象。
 *
 * 不使用 `new Date(string)`：Safari / iOS 对 `yyyy-MM-dd HH:mm:ss` 的解析不可靠，
 * 时区也可能被当成 UTC，导致展示与提交出现偏移。
 *
 * @param {unknown} value
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number }|null}
 */
export function parseSpaceDateTimeParts(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const matched = DATE_TIME_PATTERN.exec(text)
  if (!matched) return null
  const parts = {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3]),
    hour: Number(matched[4]),
    minute: Number(matched[5]),
    second: matched[6] == null ? 0 : Number(matched[6]),
  }
  // 逐字段校验：不依赖 Date 的宽松解析，非法值直接视为未设置。
  if (parts.month < 1 || parts.month > 12) return null
  if (parts.day < 1 || parts.day > 31) return null
  if (parts.hour > 23 || parts.minute > 59 || parts.second > 59) return null
  return parts
}

/** 字段对象 -> 后端约定的 `yyyy-MM-dd HH:mm:ss`；null 表示未设置。 */
export function formatBackendDateTime(parts) {
  if (!parts || typeof parts !== 'object') return null
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} `
    + `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`
}

/** 后端时间 -> datetime-local 输入框需要的 `yyyy-MM-ddTHH:mm`。 */
export function toDateTimeLocalValue(value) {
  const parts = parseSpaceDateTimeParts(value)
  if (!parts) return ''
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

/** datetime-local 的值规范化为 `yyyy-MM-dd HH:mm`；空值返回空字符串。 */
export function normalizeMinuteValue(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.replace('T', ' ').slice(0, 16)
}

/**
 * 构造提交给 `POST /space/update` 的恋爱开始时间。
 *
 * 规则：
 * - 表单为空 -> null（明确清空，不能提交空字符串，否则后端 LocalDateTime 反序列化失败）；
 * - 用户没有改动分钟值 -> 原样返回后端值（保留秒数，避免只改名称时丢秒）；
 * - 用户确实改了时间 -> 按选择器精度补 `:00`。
 *
 * @param {string} minuteValue datetime-local 当前值
 * @param {string|null|undefined} originalBackendValue 最近一次服务端确认的原始值
 * @returns {string|null}
 */
export function composeLoveStartTimeForSave(minuteValue, originalBackendValue) {
  const nextMinute = normalizeMinuteValue(minuteValue)
  if (!nextMinute) return null
  const originalParts = parseSpaceDateTimeParts(originalBackendValue)
  if (originalParts) {
    const originalMinute = `${originalParts.year}-${pad(originalParts.month)}-${pad(originalParts.day)} `
      + `${pad(originalParts.hour)}:${pad(originalParts.minute)}`
    if (originalMinute === nextMinute) return formatBackendDateTime(originalParts)
  }
  const parts = parseSpaceDateTimeParts(`${nextMinute}:00`)
  return parts ? formatBackendDateTime(parts) : null
}

/** 从 SpaceStatusVO 读取可作为表单基线的快照。 */
export function createBasicInfoFormFromSpace(spaceStatus) {
  const source = spaceStatus && typeof spaceStatus === 'object' ? spaceStatus : {}
  return {
    spaceName: typeof source.spaceName === 'string' ? source.spaceName : '',
    description: typeof source.description === 'string' ? source.description : '',
    loveStartTime: toDateTimeLocalValue(source.loveStartTime),
  }
}

/** 表单字段的展示字符数（按用户可见字符计，避免 emoji 被多算）。 */
export function countCharacters(value) {
  return Array.from(String(value ?? '')).length
}

/**
 * 字段级校验；返回 `{ spaceName?, description?, loveStartTime? }`，空对象表示通过。
 *
 * 前端校验只用于即时反馈，最终长度与权限仍由服务端强制校验。
 */
export function validateBasicInfoForm(form) {
  const errors = {}
  const name = String(form?.spaceName ?? '').trim()
  const description = String(form?.description ?? '').trim()
  if (countCharacters(name) > SPACE_NAME_MAX_LENGTH) {
    errors.spaceName = `空间名称不能超过 ${SPACE_NAME_MAX_LENGTH} 个字符`
  }
  if (countCharacters(description) > DESCRIPTION_MAX_LENGTH) {
    errors.description = `空间简介不能超过 ${DESCRIPTION_MAX_LENGTH} 个字符`
  }
  const minuteValue = normalizeMinuteValue(form?.loveStartTime)
  if (minuteValue && !parseSpaceDateTimeParts(`${minuteValue}:00`)) {
    errors.loveStartTime = '恋爱开始时间格式不正确，请重新选择'
  }
  return errors
}

/**
 * 构造请求体。
 *
 * 三个字段都显式提交：这是「提交完整基础信息」的语义，
 * 避免只改名称时把简介或恋爱开始时间意外清空。
 */
export function buildBasicInfoPayload(form, originalBackendValue) {
  return {
    spaceName: String(form?.spaceName ?? '').trim(),
    description: String(form?.description ?? '').trim(),
    loveStartTime: composeLoveStartTimeForSave(form?.loveStartTime, originalBackendValue),
  }
}

/**
 * 表单基线快照。
 *
 * 用 formBaseline 的规范化逻辑：日期时间 `yyyy-MM-dd HH:mm` 与 `HH:mm:ss`
 * 会被统一成 `HH:mm:00`，但基线记录的是「带原始秒数」的值，
 * 因此「只打开编辑、不动时间」不会被误判成已修改。
 */
export function createBasicInfoBaseline(spaceStatus) {
  const source = spaceStatus && typeof spaceStatus === 'object' ? spaceStatus : {}
  return createFormSnapshot({
    spaceName: source.spaceName || '',
    description: source.description || '',
    loveStartTime: formatBackendDateTime(parseSpaceDateTimeParts(source.loveStartTime)) || '',
  })
}

/**
 * 当前表单是否与最近一次确认的数据一致。
 *
 * 比较时把表单时间按「实际会提交的值」展开：没改分钟的保留原秒数，
 * 这样「打开编辑后直接保存」与「改完名称保存」都不会误判为有时间改动。
 */
export function isBasicInfoUnchanged(spaceStatus, form) {
  const baseline = createBasicInfoBaseline(spaceStatus)
  const originalBackendValue = spaceStatus?.loveStartTime || ''
  return isFormUnchanged(baseline, {
    spaceName: String(form?.spaceName ?? '').trim(),
    description: String(form?.description ?? '').trim(),
    loveStartTime: composeLoveStartTimeForSave(form?.loveStartTime, originalBackendValue) || '',
  })
}
