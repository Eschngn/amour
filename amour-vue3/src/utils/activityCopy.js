/**
 * 管理控制台数据看板面向普通管理员的文案与数字格式。
 *
 * 界面统一使用自然中文：浏览次数 / 访客人数 / 网页端 / 微信小程序 /
 * 访问来源 / 所选时间合计 / 比上一时段。
 * 代码内部继续使用 pv / uv / web / miniprogram 字段，接口协议不变。
 *
 * 这一层是纯函数，不依赖 Vue / 浏览器，便于单元测试。
 */

export const METRIC_PV = 'pv'
export const METRIC_UV = 'uv'

/**
 * 指标展示配置。label / unit / axisLabel 直接用于界面，
 * 不允许在界面出现 PV、UV 等专业缩写。
 */
export const METRIC_CONFIG = Object.freeze({
  [METRIC_PV]: Object.freeze({
    key: METRIC_PV,
    label: '浏览次数',
    unit: '次',
    axisLabel: '浏览次数（次）',
    definition: '打开或刷新一个受统计的用户页面计 1 次。',
  }),
  [METRIC_UV]: Object.freeze({
    key: METRIC_UV,
    label: '访客人数',
    unit: '人',
    axisLabel: '访客人数（人）',
    definition: '所选时间内按访客标识去重后的访客数，不是注册用户数。',
  }),
})

export function normalizeMetric(value) {
  return value === METRIC_UV ? METRIC_UV : METRIC_PV
}

export function findMetric(value) {
  return METRIC_CONFIG[normalizeMetric(value)]
}

function toFiniteNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/**
 * 千分位数字。null / undefined / 非法值显示“—”，绝不显示 NaN。
 */
export function formatCount(value, decimals = 0) {
  const number = toFiniteNumberOrNull(value)
  if (number === null) return '—'
  return number.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 坐标轴与紧凑位置的数字：万位以上使用“万”，不使用 k / w 等英文缩写。
 * 1234 → 1,234；12345 → 1.2万；null → 0（坐标轴需要数字）。
 */
export function formatCountShort(value) {
  const number = toFiniteNumberOrNull(value)
  if (number === null) return '0'
  const abs = Math.abs(number)
  if (abs < 10000) {
    return Math.round(number).toLocaleString('zh-CN')
  }
  const wan = number / 10000
  const rounded = Math.round(wan * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text}万`
}

/**
 * 百分比展示：12.5% / 12% / —。
 */
export function formatPercentValue(value, decimals = 1) {
  const number = toFiniteNumberOrNull(value)
  if (number === null) return '—'
  const rounded = Number(number.toFixed(decimals))
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(decimals)
  return `${text}%`
}

/**
 * 与上一等长时段对比的文案。
 *
 * - 上一时段明确为 0 → “上一时段暂无访问”
 * - 对比数据缺失（服务端没有返回上一时段数值）→ “暂无对比数据”
 * - 增加 / 减少 / 持平都带文字说明，不依赖红绿颜色表达方向
 *
 * @param {number|null|undefined} rate 变化百分比（服务端返回，null 表示无法计算）
 * @param {number|null|undefined} previousValue 上一时段对应的绝对值
 * @param {string} unit 单位：次 / 人
 */
export function describeComparison(rate, previousValue, unit = '次') {
  const previous = toFiniteNumberOrNull(previousValue)
  const value = toFiniteNumberOrNull(rate)
  if (value === null) {
    if (previous === 0) {
      return {
        text: '上一时段暂无访问',
        detail: '',
        tone: 'muted',
        direction: 'none',
      }
    }
    return {
      text: '暂无对比数据',
      detail: '',
      tone: 'muted',
      direction: 'none',
    }
  }
  if (previous === null) {
    // 有变化率但缺少上一时段绝对值时，只展示变化率本身。
    return {
      text: comparisonDirectionText(value),
      detail: '',
      tone: comparisonTone(value),
      direction: comparisonDirection(value),
    }
  }
  const previousText = `上一时段 ${formatCount(previous)} ${unit}`
  if (value === 0) {
    return {
      text: '与上一时段持平',
      detail: previousText,
      tone: 'flat',
      direction: 'flat',
    }
  }
  return {
    text: comparisonDirectionText(value),
    detail: previousText,
    tone: comparisonTone(value),
    direction: comparisonDirection(value),
  }
}

function comparisonDirection(value) {
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}

function comparisonTone(value) {
  return value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
}

function comparisonDirectionText(value) {
  const percent = formatPercentValue(Math.abs(value))
  if (value > 0) return `比上一时段增加 ${percent}`
  if (value < 0) return `比上一时段减少 ${percent}`
  return '与上一时段持平'
}

/**
 * “北京时间”等展示文案：内部时区标识不直接出现在界面上。
 */
export function formatTimeZoneLabel(timezone) {
  if (typeof timezone !== 'string' || !timezone.trim()) return '北京时间'
  if (timezone === 'Asia/Shanghai') return '北京时间'
  return timezone
}

/**
 * 日期范围文案：2026-11-11 至 2026-11-17（共 7 天）。
 */
export function formatRangeLabel(startDate, endDate, days) {
  if (!startDate || !endDate) return '未选择日期'
  const dayCount = toFiniteNumberOrNull(days)
  const tail = dayCount && dayCount > 0 ? `（共 ${formatCount(dayCount)} 天）` : ''
  return `${startDate} 至 ${endDate}${tail}`
}
