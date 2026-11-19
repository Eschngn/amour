/**
 * 情侣空间「空间基础信息」编辑的纯函数。
 *
 * 与 Web 端（SpaceSettingsPanel.vue）保持同一套交互约定，但这里：
 * - 不读写 wx.storage、不发起请求、不依赖页面，便于在 node:test 里直接验证；
 * - 时间字段一律自己按正则拆字段解析，**不使用 `new Date('yyyy-MM-dd HH:mm:ss')`**
 *   （iOS 端对该格式不兼容，会解析成 Invalid Date）；
 * - 组装提交值时一律字符串拼接，**不使用 `toISOString()`**（会引入 UTC 偏移）。
 *
 * 后端的 LocalDateTime 统一按 `yyyy-MM-dd HH:mm:ss` 下发 / 接收。
 */

const { isValidSpaceId, isWaitingForPartner } = require('./session-rules')

/** 与后端 UpdateSpaceReqVO 的长度限制保持一致。 */
const SPACE_INFO_NAME_MAX = 30
const SPACE_INFO_DESCRIPTION_MAX = 500

/**
 * 后端空间信息编辑相关业务错误码（与 amour-springboot ResponseCodeEnum 一致）。
 *
 * - 20034：不是该空间成员；
 * - 20058：空间已完成解绑；
 * - 20064：只有等待另一半加入时才能编辑空间信息。
 */
const SPACE_UPDATE_ERROR_CODE = Object.freeze({
  NOT_ALLOWED: '20064',
  NOT_MEMBER: '20034',
  UNBOUND: '20058',
  /** 请求携带的目标空间与服务端推导不一致（空间已被改写）：必须刷新后重试。 */
  TARGET_CHANGED: '20103',
})

/**
 * 敏感时刻：用户正在编辑时另一半刚好加入 / 空间已解绑，服务端会拒绝更新。
 * 这类失败必须提示原因并强制刷新本地状态，不能只依赖入口隐藏。
 */
const SPACE_INFO_CONFLICT_CODES = Object.freeze([
  SPACE_UPDATE_ERROR_CODE.NOT_ALLOWED,
  SPACE_UPDATE_ERROR_CODE.NOT_MEMBER,
  SPACE_UPDATE_ERROR_CODE.UNBOUND,
  SPACE_UPDATE_ERROR_CODE.TARGET_CHANGED,
])

/** 保存成功、但全局状态刷新失败时的提示（与「保存失败」严格区分）。 */
const SPACE_INFO_SYNC_ERROR_MESSAGE = '空间信息已保存，但状态同步失败'

/** yyyy-MM-dd HH:mm:ss / yyyy-MM-dd HH:mm / yyyy-MM-ddTHH:mm:ss 等格式统一拆字段。 */
const DATE_TIME_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/

function pad2(value) {
  return String(value).padStart(2, '0')
}

function trimText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/** 去掉 ISO 字符串里的小数秒与时区后缀，避免它们干扰字段解析。 */
function stripIsoSuffix(text) {
  return text.replace(/(\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/, '')
}

/**
 * 解析后端时间字符串为年月日时分秒字段。
 *
 * 为什么不用 `new Date('2024-05-20 19:30:47')`：iOS / 部分基础库不接受空格分隔格式，
 * 会得到 Invalid Date；这里按正则拆字段，跨端一致。
 *
 * @param {string|Date|null|undefined} value
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number }|null}
 */
function parseBackendDateTime(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
      hour: value.getHours(),
      minute: value.getMinutes(),
      second: value.getSeconds(),
    }
  }
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return null
  const text = stripIsoSuffix(raw.replace('T', ' ')).replace(/\s+/g, ' ').trim()
  const match = DATE_TIME_PATTERN.exec(text)
  if (!match) return null
  const fields = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    // 只给到日期时按 00:00:00 处理（后端 LocalDate 兼容场景）。
    hour: match[4] === undefined ? 0 : Number(match[4]),
    minute: match[5] === undefined ? 0 : Number(match[5]),
    second: match[6] === undefined ? 0 : Number(match[6]),
  }
  if (fields.month < 1 || fields.month > 12) return null
  if (fields.day < 1 || fields.day > 31) return null
  if (fields.hour < 0 || fields.hour > 23) return null
  if (fields.minute < 0 || fields.minute > 59) return null
  if (fields.second < 0 || fields.second > 59) return null
  // 用本地 Date 仅做「这一天真实存在」的校验（不用于解析后端字符串）。
  const probe = new Date(fields.year, fields.month - 1, fields.day)
  if (probe.getFullYear() !== fields.year
    || probe.getMonth() !== fields.month - 1
    || probe.getDate() !== fields.day) {
    return null
  }
  return fields
}

/** 格式化为展示用文本 `yyyy-MM-dd HH:mm`；非法值返回空字符串。 */
function formatLoveStartTime(value) {
  const fields = parseBackendDateTime(value)
  if (!fields) return ''
  return `${fields.year}-${pad2(fields.month)}-${pad2(fields.day)} ${pad2(fields.hour)}:${pad2(fields.minute)}`
}

/** 拆成原生 picker 需要的日期值与时间值（分钟精度）。 */
function splitLoveStartTime(value) {
  const fields = parseBackendDateTime(value)
  if (!fields) return { date: '', time: '' }
  return {
    date: `${fields.year}-${pad2(fields.month)}-${pad2(fields.day)}`,
    time: `${pad2(fields.hour)}:${pad2(fields.minute)}`,
  }
}

/**
 * 提交值归一化：合法时间转成 `yyyy-MM-dd HH:mm:ss`，其余一律 `null`。
 *
 * 关键：清空必须提交 `null`，**绝不能是空字符串**（后端 LocalDateTime 反序列化会失败）。
 * 只精确到分钟的输入补 `:00`，避免因格式不完整被后端拒绝。
 *
 * @param {string|Date|null|undefined} value
 * @returns {string|null}
 */
function normalizeLoveStartTimePayload(value) {
  const fields = parseBackendDateTime(value)
  if (!fields) return null
  return `${fields.year}-${pad2(fields.month)}-${pad2(fields.day)} `
    + `${pad2(fields.hour)}:${pad2(fields.minute)}:${pad2(fields.second)}`
}

function isValidDateText(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const probe = new Date(year, month - 1, day)
  return probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === day
}

function isValidTimeText(text) {
  const match = /^(\d{2}):(\d{2})$/.exec(text)
  if (!match) return false
  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

/** 本地「今天」（picker 默认值）；只用于默认展示，不做后端字符串解析。 */
function todayLocalDate(now) {
  const date = now instanceof Date ? now : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * 由「日期 + 时间」草稿组装提交值。
 *
 * 秒数规则（重要）：
 * - 只有用户确实修改到分钟级的时间时，才把秒按 `00` 处理；
 * - 只改名称 / 简介时，日期与时间与基线一致，必须原样保留服务端返回的秒数
 *   （例如原 `2024-05-20 19:30:47`，只改名称后提交仍是 `19:30:47`）；
 * - 日期或时间任一为空 → 未设置，返回 `null`（清空语义）。
 *
 * @param {{ loveDate?: string, loveTime?: string }} draft
 * @param {string|null|undefined} baselineLoveStartTime 服务端最近一次确认的原值
 * @returns {string|null}
 */
function composeLoveStartTime(draft, baselineLoveStartTime) {
  const source = draft || {}
  const date = trimText(source.loveDate)
  const time = trimText(source.loveTime)
  if (!date || !time) return null
  if (!isValidDateText(date) || !isValidTimeText(time)) return null
  const baseline = parseBackendDateTime(baselineLoveStartTime)
  if (baseline) {
    const baselineMinute = `${baseline.year}-${pad2(baseline.month)}-${pad2(baseline.day)} `
      + `${pad2(baseline.hour)}:${pad2(baseline.minute)}`
    if (baselineMinute === `${date} ${time}`) {
      // 分钟级时间没有变化：保留原始秒数，避免「只改名称却把秒抹成 00」。
      return `${date} ${time}:${pad2(baseline.second)}`
    }
  }
  return `${date} ${time}:00`
}

/**
 * 服务端空间数据 → 编辑基线。
 *
 * @param {object|null|undefined} space
 * @returns {{ spaceId: number|string|'', spaceName: string, description: string, loveStartTime: string }}
 */
function buildSpaceInfoBaseline(space) {
  const source = space && typeof space === 'object' ? space : {}
  return {
    spaceId: isValidSpaceId(source.spaceId) ? source.spaceId : '',
    spaceName: typeof source.spaceName === 'string' ? source.spaceName : '',
    description: typeof source.description === 'string' ? source.description : '',
    loveStartTime: typeof source.loveStartTime === 'string' ? source.loveStartTime : '',
  }
}

/** 服务端空间数据 → 只读摘要（含格式化后的恋爱开始时间）。 */
function describeSpaceInfo(space) {
  const baseline = buildSpaceInfoBaseline(space)
  return {
    spaceName: trimText(baseline.spaceName),
    description: trimText(baseline.description),
    loveStartTime: baseline.loveStartTime,
    loveStartTimeText: formatLoveStartTime(baseline.loveStartTime),
  }
}

/** 基线 → 编辑草稿（回填输入框与 picker）。 */
function buildSpaceInfoDraft(baseline) {
  const base = baseline || {}
  const time = splitLoveStartTime(base.loveStartTime)
  return {
    spaceName: typeof base.spaceName === 'string' ? base.spaceName : '',
    description: typeof base.description === 'string' ? base.description : '',
    loveDate: time.date,
    loveTime: time.time,
  }
}

/** 文本长度（小程序端按 JS 字符数计数，与后端 @Size 的字符数语义一致）。 */
function measureText(value) {
  return String(value === null || value === undefined ? '' : value).length
}

/**
 * 草稿是否与基线不同。
 *
 * 比较规则：
 * - 名称 / 简介按 trim 后比较（空字符串与缺失等价）；
 * - 时间先按「组装后的秒级字符串」归一，再比较（空值等价为未设置）。
 *
 * @param {object|null|undefined} draft
 * @param {object|null|undefined} baseline
 * @returns {boolean}
 */
function isSpaceInfoDirty(draft, baseline) {
  const source = draft || {}
  const base = baseline || {}
  if (trimText(source.spaceName) !== trimText(base.spaceName)) return true
  if (trimText(source.description) !== trimText(base.description)) return true
  const nextTime = composeLoveStartTime(source, base.loveStartTime)
  const baselineTime = normalizeLoveStartTimePayload(base.loveStartTime)
  return (nextTime || '') !== (baselineTime || '')
}

/**
 * 组装 `POST /space/update` 的请求体。
 *
 * 三个字段都显式提交（提交的是「完整基础信息」而不是补丁）：
 * - 空白名称提交空字符串，后端会落回默认名「我们的故事」；
 * - 空白简介提交空字符串，用于清空简介；
 * - 时间提交 `yyyy-MM-dd HH:mm:ss` 字符串或 `null`（清空），绝不为空字符串。
 *
 * @param {object|null|undefined} draft
 * @param {object|null|undefined} baseline
 * @returns {{ spaceName: string, description: string, loveStartTime: string|null }}
 */
function buildSpaceInfoUpdatePayload(draft, baseline) {
  const source = draft || {}
  const base = baseline || {}
  return {
    spaceName: trimText(source.spaceName),
    description: trimText(source.description),
    loveStartTime: composeLoveStartTime(source, base.loveStartTime),
  }
}

/**
 * 保存前校验：长度超限或时间只选了一半（缺日期 / 缺时间）时给出明确错误。
 *
 * input / textarea 已经声明 maxlength，这里仍然防御（例如页面状态被异常写入）。
 *
 * @param {object|null|undefined} draft
 * @returns {string} 空字符串表示校验通过
 */
function buildSpaceInfoValidationError(draft) {
  const source = draft || {}
  const name = trimText(source.spaceName)
  if (name.length > SPACE_INFO_NAME_MAX) {
    return `空间名称不能超过 ${SPACE_INFO_NAME_MAX} 个字符`
  }
  const description = trimText(source.description)
  if (description.length > SPACE_INFO_DESCRIPTION_MAX) {
    return `空间简介不能超过 ${SPACE_INFO_DESCRIPTION_MAX} 个字符`
  }
  const date = trimText(source.loveDate)
  const time = trimText(source.loveTime)
  if (Boolean(date) !== Boolean(time)) {
    return '请同时选择恋爱开始的日期和时间'
  }
  if (date && !isValidDateText(date)) return '恋爱开始日期格式不正确'
  if (time && !isValidTimeText(time)) return '恋爱开始时间格式不正确'
  return ''
}

/**
 * 是否允许编辑空间基础信息（纯前端体验判断，后端仍会再次校验）。
 *
 * 后端规则：只有「等待绑定（status=0）且只有 1 名有效成员」时允许编辑。
 * 因此这里只判断空间是否处于等待绑定 + 有效成员不足 2 人。
 *
 * @param {object|null|undefined} space
 * @returns {boolean}
 */
function canEditSpaceInfo(space) {
  if (!isWaitingForPartner(space)) return false
  const count = Number(space.memberCount)
  return !Number.isFinite(count) || count < 2
}

/** 编辑是否被服务端以「状态已过期 / 关系已变化」为由拒绝。 */
function isSpaceInfoUpdateConflict(error) {
  if (!error || typeof error !== 'object') return false
  const code = String(error.errorCode || '')
  return SPACE_INFO_CONFLICT_CODES.indexOf(code) !== -1
}

/**
 * 保存失败提示：优先给出针对业务错误码的可读文案，其次用服务端 message。
 *
 * @param {object|null} error 请求层错误（ApiError 含 errorCode / message）
 * @param {string} [fallback]
 * @returns {string}
 */
function buildSpaceInfoErrorMessage(error, fallback) {
  const defaultMessage = fallback || '空间信息保存失败，请稍后重试'
  if (!error || typeof error !== 'object') return defaultMessage
  const code = String(error.errorCode || '')
  if (code === SPACE_UPDATE_ERROR_CODE.NOT_ALLOWED) {
    return '另一半已经加入，空间名称、简介和恋爱开始时间不能再修改'
  }
  if (code === SPACE_UPDATE_ERROR_CODE.NOT_MEMBER) {
    return '你不是这个空间的成员，无法修改空间信息'
  }
  if (code === SPACE_UPDATE_ERROR_CODE.UNBOUND) {
    return '情侣空间已完成解绑，无法再修改空间信息'
  }
  if (code === SPACE_UPDATE_ERROR_CODE.TARGET_CHANGED) {
    return '空间状态已经发生变化，请刷新后重试'
  }
  const message = typeof error.message === 'string' ? error.message.trim() : ''
  return message || defaultMessage
}

module.exports = {
  SPACE_INFO_NAME_MAX,
  SPACE_INFO_DESCRIPTION_MAX,
  SPACE_UPDATE_ERROR_CODE,
  SPACE_INFO_SYNC_ERROR_MESSAGE,
  parseBackendDateTime,
  formatLoveStartTime,
  splitLoveStartTime,
  normalizeLoveStartTimePayload,
  todayLocalDate,
  composeLoveStartTime,
  buildSpaceInfoBaseline,
  describeSpaceInfo,
  buildSpaceInfoDraft,
  measureText,
  isSpaceInfoDirty,
  buildSpaceInfoUpdatePayload,
  buildSpaceInfoValidationError,
  canEditSpaceInfo,
  isSpaceInfoUpdateConflict,
  buildSpaceInfoErrorMessage,
}
