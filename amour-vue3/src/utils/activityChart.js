/**
 * 数据看板「访问趋势」「访问来源」两个 ECharts 图表的数据适配与 option 生成。
 *
 * 这一层是纯函数，不依赖 Vue / 浏览器 / ECharts 实例：
 * - 把接口返回的 daily / channels 归一化成固定两个来源（网页端、微信小程序）；
 * - 兼容老接口（只有 pv / uv / daily）：不把合计值拆成来源，标记为“来源明细暂不可用”；
 * - 任何缺失字段、null、负数、NaN、Infinity 都收敛成 null / 0，界面不出现异常值；
 * - 日期严格保持服务端返回顺序；
 * - 生成可直接交给 ECharts 的 option，颜色、名称、单位与看板其他区域保持一致。
 *
 * 数据准确性约定（不可放宽）：
 * - 所选时间内的访客人数只读取接口返回的整段去重值，不能由每日访客人数相加；
 * - 全部来源访客人数不能由两个来源访客人数相加；
 * - 访客人数是非互斥集合，不使用饼图、环形图或 100% 堆叠；
 * - 浏览次数占比只在数据完整、分母有效时展示，并明确标注“浏览次数占比”。
 */

// 相对路径引入纯工具：node:test 直接加载本文件时没有 Vite 的 @ 别名。
import { ACTIVITY_CHANNELS, resolvePvShare } from './activityChannels.js'
import { formatPercentValue, findMetric } from './activityCopy.js'
import { formatShortDate, formatWeekday } from './activityRange.js'

export const CHART_METRIC_PV = 'pv'
export const CHART_METRIC_UV = 'uv'

/** 趋势区视图：折线趋势 / 每日对比柱状图。 */
export const TREND_VIEW_LINE = 'line'
export const TREND_VIEW_BAR = 'bar'

/**
 * 图表状态：
 * - ready：可以绘制；
 * - empty：数据存在，但所选时间内全部为 0；
 * - unavailable：接口没有分来源数据（或缺少当前指标所需字段），不伪造拆分；
 * - no-data：接口没有返回任何可用数据；
 * - error：请求失败，图表不保留上一次区间的数据。
 */
export const CHART_STATUS = Object.freeze({
  READY: 'ready',
  EMPTY: 'empty',
  UNAVAILABLE: 'unavailable',
  NO_DATA: 'no-data',
  ERROR: 'error',
})

export const TREND_VIEWS = Object.freeze([
  Object.freeze({ key: TREND_VIEW_LINE, label: '趋势' }),
  Object.freeze({ key: TREND_VIEW_BAR, label: '每日对比' }),
])

/**
 * 图表系列（来源）。颜色与图例文字直接复用来源口径配置，保证全页面一致。
 * 全部来源使用中性灰色虚线，避免与两个来源的颜色混淆。
 */
export const CHART_SERIES = Object.freeze([
  Object.freeze({
    key: 'total',
    name: '全部来源',
    shortName: '全部来源',
    color: '#64748b',
    dashed: true,
  }),
  ...ACTIVITY_CHANNELS.map(channel => Object.freeze({
    key: channel.clientType,
    name: channel.label,
    shortName: channel.shortLabel,
    color: channel.color,
    dashed: false,
  })),
])

const CHANNEL_KEYS = Object.freeze(ACTIVITY_CHANNELS.map(channel => channel.clientType))

const CHANNEL_SERIES = Object.freeze(CHART_SERIES.filter(series => series.key !== 'total'))

/** 每日对象上的分来源字段，与后端 AdminDashboardActivityDailyVO 一致。 */
const DAILY_CHANNEL_FIELDS = Object.freeze({
  web: Object.freeze({ pv: 'webPv', uv: 'webUv' }),
  miniprogram: Object.freeze({ pv: 'miniprogramPv', uv: 'miniprogramUv' }),
})

/** 日期数量不超过该值时，在柱顶 / 折线点显示数值标签。 */
export const CHART_VALUE_LABEL_MAX_DAYS = 7

/** 柱体最大宽度：桌面端保持稳定，移动端按可用宽度自动收窄。 */
export const CHART_BAR_MAX_WIDTH = 24

/**
 * 超过该天数后启用 dataZoom（触摸 / 滚轮横向浏览），
 * 避免 30 天以上的分组柱挤成“彩色墙”，同时保证折线仍可读。
 */
export const CHART_DATA_ZOOM_MIN_DAYS = 31

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * 减少动态效果偏好：命中时关闭图表动画。
 * 浏览器端由组件传入；纯函数默认 false，保证测试可预测。
 */
let reducedMotion = false

export function setActivityChartReducedMotion(value) {
  reducedMotion = Boolean(value)
}

export function isActivityChartReducedMotion() {
  return reducedMotion
}

function animationConfig(duration) {
  if (reducedMotion) {
    return { animation: false, animationDuration: 0, animationDurationUpdate: 0 }
  }
  return {
    animation: true,
    animationDuration: duration,
    animationDurationUpdate: 240,
    animationEasing: 'cubicOut',
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

/**
 * 计数收敛：null / undefined / 空串 / 非数字 / 负数 / Infinity → 0，
 * 小数四舍五入为整数。用于「图上有真实 0」的场景。
 */
export function toChartCount(value) {
  if (value === null || value === undefined || value === '') return 0
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return Math.round(number)
}

/**
 * 计数收敛为 null 或有效整数，用于“字段缺失”与“真实 0”需要区分的场景。
 */
export function toChartCountOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return null
  return Math.round(number)
}

function readDateKey(value) {
  if (typeof value !== 'string') return ''
  const date = value.trim()
  return DATE_KEY_PATTERN.test(date) ? date : ''
}

function readMetric(value) {
  return value === CHART_METRIC_UV ? CHART_METRIC_UV : CHART_METRIC_PV
}

function readTrendView(value) {
  return value === TREND_VIEW_BAR ? TREND_VIEW_BAR : TREND_VIEW_LINE
}

export function normalizeChartMetric(value) {
  return readMetric(value)
}

export function normalizeTrendView(value) {
  return readTrendView(value)
}

export function findTrendView(key) {
  return TREND_VIEWS.find(item => item.key === readTrendView(key)) || TREND_VIEWS[0]
}

/**
 * 接口是否在这一天返回了分来源字段。
 *
 * 只要字段存在（即使是 null）就认为接口支持来源统计，null 按缺失展示；
 * 只有在完全没有这些字段时才判定为老接口，绝不猜测拆分。
 */
export function isChannelAwareDay(day) {
  if (!day || typeof day !== 'object') return false
  return CHANNEL_KEYS.some((key) => {
    const fields = DAILY_CHANNEL_FIELDS[key]
    return hasOwn(day, fields.pv) || hasOwn(day, fields.uv)
  })
}

/**
 * 来源标识归一化：优先使用 clientType，缺失时按返回顺序兜底到固定来源顺序。
 * 明确给出但不认识的值返回空字符串（丢弃，不猜测成另一个来源）。
 */
function normalizeChannelKey(channel, index) {
  const raw = typeof channel?.clientType === 'string' ? channel.clientType.trim().toLowerCase() : ''
  if (raw) return CHANNEL_KEYS.includes(raw) ? raw : ''
  return CHANNEL_KEYS[index] || ''
}

function createChannelMaps() {
  const totals = {}
  const dailyMaps = {}
  CHANNEL_KEYS.forEach((key) => {
    totals[key] = { pv: null, uv: null, previousPv: null, previousUv: null, pvShare: null, pvChangeRate: null, uvChangeRate: null }
    dailyMaps[key] = new Map()
  })
  return { totals, dailyMaps }
}

/**
 * 读取 channels[]：所选时间合计 + 该来源的每日序列
 * （用于接口只在 channels.daily 里给分来源数据的场景）。
 */
function readChannels(channels) {
  const { totals, dailyMaps } = createChannelMaps()
  channels.forEach((channel, index) => {
    if (!channel || typeof channel !== 'object') return
    const key = normalizeChannelKey(channel, index)
    if (!key) return
    const target = totals[key]
    if (target.pv === null) target.pv = toChartCountOrNull(channel.totalPv)
    if (target.uv === null) target.uv = toChartCountOrNull(channel.totalUv)
    if (target.previousPv === null) target.previousPv = toChartCountOrNull(channel.previousTotalPv)
    if (target.previousUv === null) target.previousUv = toChartCountOrNull(channel.previousTotalUv)
    if (target.pvShare === null) target.pvShare = toChartCountOrNull(channel.pvShare)
    // 注意 Number(null) === 0：null / undefined 必须先判空，否则会被误当成"持平 0%"。
    if (target.pvChangeRate === null) target.pvChangeRate = toFiniteRateOrNull(channel.pvChangeRate)
    if (target.uvChangeRate === null) target.uvChangeRate = toFiniteRateOrNull(channel.uvChangeRate)
    const daily = Array.isArray(channel.daily) ? channel.daily : []
    daily.forEach((item) => {
      const date = readDateKey(item?.date)
      if (!date || dailyMaps[key].has(date)) return
      dailyMaps[key].set(date, {
        pv: toChartCountOrNull(item?.pv),
        uv: toChartCountOrNull(item?.uv),
      })
    })
  })
  return { totals, dailyMaps }
}

/**
 * 从每日对象读取指定来源、指定指标的数值。
 *
 * 字段缺失返回 null（图表上留空），而不是 0：
 * 真实 0 与数据缺失必须区分，缺失不能伪装成 0。
 */
function readDayChannelValue(day, channelKey, metric) {
  if (!day || typeof day !== 'object') return null
  const field = DAILY_CHANNEL_FIELDS[channelKey][metric]
  return hasOwn(day, field) ? toChartCountOrNull(day[field]) : null
}

/**
 * 每天的合计（用于 tooltip 与折线）。优先使用接口返回的合计字段；
 * 缺失时浏览次数可由两来源相加，访客人数不能相加（去重口径），返回 null 表示未知。
 */
function readDayTotal(day, metric, channelAware, webValue, miniValue) {
  if (day && typeof day === 'object') {
    const explicit = toChartCountOrNull(metric === CHART_METRIC_UV ? day.uv : day.pv)
    if (explicit !== null) return explicit
  }
  // 浏览次数可由两个来源相加；任一来源缺失时不臆造合计。访客人数只认接口值。
  if (metric === CHART_METRIC_PV && channelAware && webValue !== null && miniValue !== null) {
    return webValue + miniValue
  }
  return null
}

function sumValues(values) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0)
}

function hasOnlyZero(values) {
  return values.every(value => toChartCount(value) === 0)
}

/** 变化率收敛：null / undefined / 空串 / 非数字 → null，真实 0 保留。 */
function toFiniteRateOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function createEmptySummary() {
  const channelSummary = () => ({
    pv: null,
    uv: null,
    previousPv: null,
    previousUv: null,
    pvChangeRate: null,
    uvChangeRate: null,
  })
  return {
    web: channelSummary(),
    miniprogram: channelSummary(),
    total: { pv: null, uv: null, previousPv: null, previousUv: null, pvChangeRate: null, uvChangeRate: null },
  }
}

function buildBaseChartData(metric, trendView) {
  const metricConfig = findMetric(metric)
  const viewConfig = findTrendView(trendView)
  return {
    metric: metricConfig.key,
    metricLabel: metricConfig.label,
    metricAxisLabel: metricConfig.axisLabel,
    metricUnit: metricConfig.unit,
    metricConfig,
    trendView: viewConfig.key,
    trendViewLabel: viewConfig.label,
    status: CHART_STATUS.NO_DATA,
    statusTitle: '所选时间暂无访问数据',
    statusMessage: '',
    reason: '',
    startDate: '',
    endDate: '',
    days: 0,
    dates: [],
    /** 各来源每日序列（画图用，缺失按 0）。 */
    series: { total: [], web: [], miniprogram: [] },
    /** 每日合计可能为 null（访客人数缺失时不臆造）。 */
    total: [],
    /** 所选时间合计：来源维度只认接口整段值，缺失为 null。 */
    summary: createEmptySummary(),
    /** 浏览次数占比（只在数据完整、分母有效时非 null）。 */
    pvShares: { web: null, miniprogram: null },
    hasChannelData: false,
    channelSource: 'none',
    notes: [],
    ariaDescription: '',
  }
}

function buildStatusTitle(status, reason) {
  if (status === CHART_STATUS.UNAVAILABLE && reason === 'metric-summary') return '暂时无法汇总该项数据'
  if (status === CHART_STATUS.UNAVAILABLE && reason === 'daily-only') return '缺少每日来源数据'
  if (status === CHART_STATUS.UNAVAILABLE && reason === 'inconsistent') return '来源数据不完整'
  if (status === CHART_STATUS.UNAVAILABLE && reason === 'legacy') return '来源明细暂不可用'
  if (status === CHART_STATUS.EMPTY) return '所选时间暂无访问数据'
  if (status === CHART_STATUS.NO_DATA) return '所选时间暂无访问数据'
  if (status === CHART_STATUS.ERROR) return '访问数据加载失败'
  return ''
}

function buildStatusMessage(status, reason, chartData) {
  const unit = chartData.metricUnit
  const totalText = chartData.metric === CHART_METRIC_UV
    ? (chartData.summary.total.uv === null ? '—' : String(chartData.summary.total.uv.toLocaleString('zh-CN')))
    : (chartData.summary.total.pv === null ? '—' : String(chartData.summary.total.pv.toLocaleString('zh-CN')))
  if (status === CHART_STATUS.UNAVAILABLE && reason === 'legacy') {
    return `当前数据还没有区分网页端与微信小程序，图表不会把合计数拆开显示。`
      + `所选时间合计：${totalText} ${unit}。`
  }
  if (status === CHART_STATUS.UNAVAILABLE && reason === 'metric-summary') {
    return '数据中没有各来源去重后的访客人数，暂时无法按来源对比；可以切换到“浏览次数”或“趋势”查看。'
  }
  if (status === CHART_STATUS.UNAVAILABLE && reason === 'daily-only') {
    return '数据只提供了各来源的合计，没有逐日明细。可以刷新后重试。'
  }
  if (status === CHART_STATUS.UNAVAILABLE && reason === 'inconsistent') {
    return '各来源的合计与每日明细对不上（每日都是 0，合计不为 0），为避免误导不绘制图表。请刷新后重试。'
  }
  if (status === CHART_STATUS.EMPTY) {
    return '所选时间内网页端与微信小程序的每天数据都是 0，图表只保留了 0 值坐标轴。'
  }
  if (status === CHART_STATUS.NO_DATA) {
    return '接口没有返回这段时间的访问数据，可以刷新或调整日期后重试。'
  }
  return ''
}

/**
 * 把接口返回归一化为趋势 / 来源图表数据。
 *
 * 兼容场景：
 * 1. daily[].webPv / webUv / miniprogramPv / miniprogramUv（当前后端）；
 * 2. 只有 daily 的合计字段时 → 标记 unavailable，不拆分；
 * 3. 分来源每日数据只在 channels[].daily 里；
 * 4. channels[] 只给合计（每日对比缺数据时明确提示，不显示全 0 假图表）；
 * 5. 合计字段缺失时，浏览次数可由来源每日数据相加，访客人数只认接口去重值。
 *
 * @param {object|null|undefined} payload 接口返回的 activity 数据
 * @param {{ metric?: string, trendView?: string, error?: boolean|string }} [options]
 */
export function normalizeActivityChartData(payload, options = {}) {
  const metric = readMetric(options.metric)
  const trendView = readTrendView(options.trendView)
  const chartData = buildBaseChartData(metric, trendView)

  // 请求失败：不保留上一次区间的数据，图表区域给出明确失败状态。
  if (options.error) {
    chartData.status = CHART_STATUS.ERROR
    chartData.statusTitle = buildStatusTitle(CHART_STATUS.ERROR, '')
    chartData.statusMessage = typeof options.error === 'string' && options.error
      ? options.error
      : '访问数据加载失败，请点击刷新重试。'
    chartData.ariaDescription = '访问数据加载失败，当前没有可展示的图表数据。'
    return chartData
  }

  if (!payload || typeof payload !== 'object') {
    chartData.statusMessage = buildStatusMessage(CHART_STATUS.NO_DATA, '', chartData)
    chartData.ariaDescription = '当前没有可用于绘制访问图表的数据。'
    return chartData
  }

  const rawDaily = Array.isArray(payload.daily) ? payload.daily : []
  const rawChannels = Array.isArray(payload.channels) ? payload.channels : []
  const { totals: channelTotals, dailyMaps } = readChannels(rawChannels)
  const dailyChannelAware = rawDaily.some(isChannelAwareDay)
  const channelsHaveDaily = CHANNEL_KEYS.some(key => dailyMaps[key].size > 0)
  const channelSource = dailyChannelAware
    ? 'daily'
    : (CHANNEL_KEYS.some(key => channelTotals[key].pv !== null || channelTotals[key].uv !== null) || channelsHaveDaily
      ? 'channels'
      : 'none')
  const channelAware = channelSource !== 'none'

  // 日期：保持服务端顺序，非法日期丢弃，重复日期只保留第一次出现的顺序。
  const seenDates = new Set()
  const dates = []
  rawDaily.forEach((item) => {
    const date = readDateKey(item?.date)
    if (!date || seenDates.has(date)) return
    seenDates.add(date)
    dates.push(date)
  })
  if (dates.length === 0 && channelsHaveDaily) {
    // 没有 daily 时退回 channels[].daily 的日期顺序（网页端优先，再补小程序独有的日期）。
    CHANNEL_KEYS.forEach((key) => {
      dailyMaps[key].forEach((_value, date) => {
        if (seenDates.has(date)) return
        seenDates.add(date)
        dates.push(date)
      })
    })
  }

  const dailyByDate = new Map()
  rawDaily.forEach((item) => {
    const date = readDateKey(item?.date)
    if (date && !dailyByDate.has(date)) dailyByDate.set(date, item)
  })

  const series = { total: [], web: [], miniprogram: [] }
  const total = []
  dates.forEach((date) => {
    const day = dailyByDate.get(date)
    const values = {}
    CHANNEL_KEYS.forEach((key) => {
      let value = null
      if (channelSource === 'daily') {
        value = readDayChannelValue(day, key, metric)
      } else if (channelSource === 'channels') {
        const item = dailyMaps[key].get(date)
        value = item ? toChartCountOrNull(item[metric]) : null
      }
      values[key] = value
      series[key].push(value)
    })
    const dayTotal = readDayTotal(day, metric, channelAware, values.web, values.miniprogram)
    total.push(dayTotal)
    series.total.push(dayTotal)
  })

  // 所选时间合计：优先 channels[]，其次顶层 webPv 等字段，最后浏览次数才允许用每日数据相加。
  const summary = createEmptySummary()
  CHANNEL_KEYS.forEach((key) => {
    summary[key].pv = channelTotals[key].pv
    summary[key].uv = channelTotals[key].uv
    summary[key].previousPv = channelTotals[key].previousPv
    summary[key].previousUv = channelTotals[key].previousUv
    summary[key].pvChangeRate = channelTotals[key].pvChangeRate
    summary[key].uvChangeRate = channelTotals[key].uvChangeRate
    if (summary[key].pv === null) summary[key].pv = toChartCountOrNull(payload[`${key}Pv`])
    if (summary[key].uv === null) summary[key].uv = toChartCountOrNull(payload[`${key}Uv`])
  })
  if (channelAware) {
    if (summary.web.pv === null) summary.web.pv = sumValues(series.web)
    if (summary.miniprogram.pv === null) summary.miniprogram.pv = sumValues(series.miniprogram)
  }
  summary.total.pv = toChartCountOrNull(payload.totalPv)
  if (summary.total.pv === null && summary.web.pv !== null && summary.miniprogram.pv !== null) {
    summary.total.pv = summary.web.pv + summary.miniprogram.pv
  }
  // 访客人数只认接口返回的整段去重值，绝不由每日或来源相加。
  summary.total.uv = toChartCountOrNull(payload.totalUv)
  summary.total.previousPv = toChartCountOrNull(payload.previousTotalPv)
  summary.total.previousUv = toChartCountOrNull(payload.previousTotalUv)
  summary.total.pvChangeRate = toFiniteRateOrNull(payload.pvChangeRate)
  summary.total.uvChangeRate = toFiniteRateOrNull(payload.uvChangeRate)

  // 浏览次数占比：只在两个来源与合计都已知时计算，明确是“浏览次数占比”。
  const pvShares = {
    web: resolvePvShare(summary.web.pv, summary.total.pv),
    miniprogram: resolvePvShare(summary.miniprogram.pv, summary.total.pv),
  }

  chartData.startDate = readDateKey(payload.startDate)
  chartData.endDate = readDateKey(payload.endDate)
  chartData.days = toChartCountOrNull(payload.days) === null ? dates.length : toChartCount(payload.days)
  chartData.dates = dates
  chartData.series = series
  chartData.total = total
  chartData.summary = summary
  chartData.pvShares = pvShares
  chartData.hasChannelData = channelAware
  chartData.channelSource = channelSource

  // 状态判定优先级：
  // 1. 完全没有数据 → no-data；
  // 2. 接口没有分来源字段 → unavailable(legacy)，绝不拆分合计；
  // 3. 每日来源数据缺失或全为 0，但合计有值 → unavailable，不画全 0 假图表；
  // 4. 缺少当前指标的来源合计 → unavailable(metric-summary)；
  // 5. 有来源数据但全为 0 → empty；
  // 6. 其余可绘制 → ready。
  let status = CHART_STATUS.READY
  let reason = ''
  const summaryMetricValues = CHANNEL_KEYS.map(key => summary[key][metric])
  const hasAnySummaryValue = CHANNEL_KEYS.some(key => summary[key].pv !== null || summary[key].uv !== null)
  const summaryMetricKnown = summaryMetricValues.filter(value => value !== null)
  const dailySeriesAllZero = CHANNEL_KEYS.every(key => hasOnlyZero(series[key]))
  const summaryMetricHasValue = summaryMetricKnown.some(value => toChartCount(value) > 0)
  // 逐日来源数据缺失：合计有值但每日来源全为 0 / 缺失。
  // 折线图与每日对比都依赖逐日来源数据，不能画全 0 假图表。
  const dailyDataMissing = summaryMetricHasValue && (dates.length === 0 || dailySeriesAllZero)
  if (dates.length === 0 && !hasAnySummaryValue) {
    status = CHART_STATUS.NO_DATA
  } else if (!channelAware) {
    status = CHART_STATUS.UNAVAILABLE
    reason = 'legacy'
  } else if (dailyDataMissing) {
    status = CHART_STATUS.UNAVAILABLE
    reason = channelSource === 'channels' ? 'daily-only' : 'inconsistent'
  } else if (summaryMetricKnown.length === 0) {
    // 当前指标下两个来源都没有可确认的数字：不画图，也不臆造拆分。
    status = CHART_STATUS.UNAVAILABLE
    reason = 'metric-summary'
  } else if (dailySeriesAllZero && summaryMetricKnown.every(value => toChartCount(value) === 0)) {
    status = CHART_STATUS.EMPTY
  }

  chartData.status = status
  chartData.reason = reason
  chartData.statusTitle = buildStatusTitle(status, reason)
  chartData.statusMessage = buildStatusMessage(status, reason, chartData)
  chartData.notes = buildChartNotes(chartData)
  chartData.ariaDescription = buildAriaDescription(chartData)
  return chartData
}

/**
 * 图表下方的提示语：只保留必要的口径说明，避免在图表区域堆文字。
 */
function buildChartNotes(chartData) {
  const notes = []
  if (chartData.status === CHART_STATUS.READY || chartData.status === CHART_STATUS.EMPTY) {
    const emptyChannels = CHANNEL_SERIES
      .filter(series => hasOnlyZero(chartData.series[series.key]))
      .map(series => series.name)
    const missingChannels = CHANNEL_SERIES
      .filter(series => chartData.series[series.key].every(value => value === null))
      .map(series => series.name)
    if (missingChannels.length === 1) {
      notes.push(`${missingChannels[0]}没有返回数据，图表中显示为空白，不代表访问量为 0。`)
    } else if (emptyChannels.length === 1) {
      notes.push(`${emptyChannels[0]}在所选时间暂无访问记录，已按 0 展示。`)
    }
    if (chartData.metric === CHART_METRIC_UV) {
      notes.push('访客人数是所选时间内的去重值，不能把每天或两个来源的访客人数相加。')
    }
  }
  return notes.filter(Boolean)
}

function buildAriaDescription(chartData) {
  if (chartData.status === CHART_STATUS.NO_DATA) return '当前没有可用于绘制访问图表的数据。'
  if (chartData.status === CHART_STATUS.UNAVAILABLE) return chartData.statusMessage
  if (chartData.status === CHART_STATUS.ERROR) return chartData.statusMessage
  const range = chartData.dates.length
    ? `${chartData.dates[0]} 至 ${chartData.dates[chartData.dates.length - 1]}`
    : '所选时间'
  const isBar = chartData.trendView === TREND_VIEW_BAR
  const chartName = isBar ? '每日访问对比柱状图' : '访问趋势折线图'
  const head = `${chartName}，${range}，纵轴为${chartData.metricAxisLabel}。`
  if (chartData.status === CHART_STATUS.EMPTY) {
    return `${head}所选时间内网页端与微信小程序每天的数值都是 0。`
  }
  // 读屏描述必须对应真实区间值：区间合计只引用接口整段去重 / 累计值，不做每日累加。
  const unit = chartData.metricUnit
  const totalValue = chartData.summary.total[chartData.metric]
  const totalText = totalValue === null
    ? '所选时间合计暂不可用'
    : `所选时间合计 ${totalValue.toLocaleString('zh-CN')} ${unit}`
  const seriesText = CHANNEL_SERIES
    .map((series) => {
      const value = chartData.summary[series.key][chartData.metric]
      const text = value === null ? '—' : value.toLocaleString('zh-CN')
      return `${series.name} ${text} ${unit}`
    })
    .join('，')
  const metricNote = chartData.metric === CHART_METRIC_UV
    ? '访客人数为所选时间内的去重值，不是每天或各来源访客人数相加。'
    : ''
  const tail = isBar
    ? '每个日期并排显示网页端与微信小程序两组柱子，不堆叠，可直接比较高低。'
    : '灰色虚线表示全部来源，玫瑰色实线表示网页端，天蓝色实线表示微信小程序，使用同一刻度。'
  return `${head}${totalText}；${seriesText}。${tail}${metricNote}`
}

/**
 * 坐标轴标签：万位以上使用“万”，不使用 k / w 等英文缩写。
 * tooltip 始终显示完整数值。
 */
export function formatChartAxisNumber(value) {
  const number = toChartCount(value)
  if (number < 10000) return String(number)
  const wan = number / 10000
  const rounded = Math.round(wan * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}万`
}

/** x 轴日期标签：2026-11-11 → 11-11。 */
export function formatChartDateLabel(dateKey) {
  return formatShortDate(dateKey)
}

/**
 * x 轴标签间隔：日期较多时减少标签，避免拥挤；配合 hideOverlap 适配窄屏。
 */
export function resolveAxisLabelInterval(dateCount) {
  const count = toChartCount(dateCount)
  if (count <= 7) return 0
  if (count <= 31) return Math.max(0, Math.ceil(count / 8) - 1)
  return Math.max(0, Math.ceil(count / 10) - 1)
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tooltipValueText(value) {
  return value === null || value === undefined ? '—' : Number(value).toLocaleString('zh-CN')
}

function legendDot(color, dashed = false) {
  if (dashed) {
    return `<span style="display:inline-block;width:10px;height:0;border-top:2px dashed ${color}"></span>`
  }
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color}"></span>`
}

/**
 * tooltip formatter。独立导出便于单元测试，同时保证图表与文字明细口径一致。
 *
 * - 折线趋势：显示完整日期、星期、全部来源 / 网页端 / 微信小程序；
 * - 每日对比：同样展示完整日期与三组数值；
 * - 只有请求失败 / 无数据时返回空字符串。
 */
export function createActivityChartTooltipFormatter(chartData) {
  return function formatter(params) {
    if (!chartData || (chartData.status !== CHART_STATUS.READY && chartData.status !== CHART_STATUS.EMPTY)) return ''
    const list = Array.isArray(params) ? params : [params]
    if (!list.length) return ''
    const index = Number.isInteger(list[0]?.dataIndex) ? list[0].dataIndex : 0
    const date = chartData.dates[index]
    if (!date) return ''
    const unit = chartData.metricUnit
    const titleStyle = 'font-weight:600;color:#334155;margin-bottom:4px;'
    const rowStyle = 'display:flex;align-items:center;gap:6px;line-height:20px;color:#475569;'
    const valueStyle = 'font-weight:600;color:#1e293b;font-variant-numeric:tabular-nums;'

    const weekday = formatWeekday(date)
    let html = `<div style="${titleStyle}">${escapeHtml(date)}${weekday ? ` ${escapeHtml(weekday)}` : ''} · ${escapeHtml(chartData.metricLabel)}</div>`
    CHART_SERIES.forEach((config) => {
      const value = chartData.series[config.key][index]
      html += `<div style="${rowStyle}">${legendDot(config.color, config.dashed)}`
        + `<span>${escapeHtml(config.name)}</span>`
        + `<span style="${valueStyle}">${tooltipValueText(value)}</span><span style="color:#94a3b8">${unit}</span></div>`
    })
    if (chartData.metric === CHART_METRIC_UV) {
      html += '<div style="margin-top:4px;color:#94a3b8;font-size:11px;line-height:16px">访客人数是当天去重值，不能相加得到所选时间的访客人数。</div>'
    }
    return html
  }
}

function buildTooltip(chartData) {
  return {
    trigger: 'axis',
    triggerOn: 'mousemove|click',
    confine: true,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: '#334155', fontSize: 12 },
    extraCssText: 'box-shadow:0 8px 24px rgba(15,23,42,0.08);border-radius:12px;max-width:300px;white-space:normal;',
    axisPointer: {
      type: chartData.trendView === TREND_VIEW_BAR ? 'shadow' : 'line',
      lineStyle: { color: '#cbd5e1' },
      shadowStyle: { color: 'rgba(148,163,184,0.12)' },
    },
    formatter: createActivityChartTooltipFormatter(chartData),
  }
}

function buildYAxis(chartData) {
  return {
    type: 'value',
    min: 0,
    minInterval: 1,
    splitNumber: 4,
    name: chartData.metricAxisLabel,
    nameLocation: 'end',
    nameGap: 12,
    nameTextStyle: { color: '#94a3b8', fontSize: 11 },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#94a3b8', fontSize: 11, formatter: formatChartAxisNumber },
    splitLine: { lineStyle: { color: '#eef2f7' } },
  }
}

function buildXAxis(chartData) {
  const dateCount = chartData.dates.length
  return {
    type: 'category',
    data: chartData.dates.map(formatChartDateLabel),
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisTick: { show: false },
    axisLabel: {
      color: '#94a3b8',
      fontSize: 11,
      interval: resolveAxisLabelInterval(dateCount),
      hideOverlap: true,
      margin: 10,
    },
  }
}

function buildLegend(chartData) {
  return {
    show: false,
    data: CHART_SERIES.map(series => ({
      name: series.name,
      icon: series.dashed ? 'rect' : 'roundRect',
      itemStyle: {
        color: series.color,
        borderColor: series.color,
        borderWidth: series.dashed ? 0 : 0,
      },
    })),
  }
}

/**
 * 日期较多时启用 dataZoom：默认展示最近 31 天，可拖动 / 滚轮浏览更早数据。
 */
function resolveDataZoom(dateCount) {
  if (dateCount <= CHART_DATA_ZOOM_MIN_DAYS) return null
  const zoomStart = Math.max(0, Number((100 - (CHART_DATA_ZOOM_MIN_DAYS / dateCount) * 100).toFixed(2)))
  return [
    {
      type: 'inside',
      start: zoomStart,
      end: 100,
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      moveOnMouseWheel: false,
    },
    {
      type: 'slider',
      start: zoomStart,
      end: 100,
      height: 16,
      bottom: 6,
      borderColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
      fillerColor: 'rgba(225,29,72,0.08)',
      handleStyle: { color: '#ffffff', borderColor: '#cbd5e1' },
      moveHandleStyle: { color: '#e2e8f0' },
      dataBackground: {
        lineStyle: { color: '#cbd5e1', width: 1 },
        areaStyle: { color: '#f1f5f9' },
      },
      selectedDataBackground: {
        lineStyle: { color: '#fda4af', width: 1 },
        areaStyle: { color: '#ffe4e6' },
      },
      textStyle: { color: '#94a3b8', fontSize: 11 },
      showDetail: false,
      brushSelect: false,
    },
  ]
}

function buildLineSeries(chartData) {
  const dateCount = chartData.dates.length
  const showSymbol = dateCount <= 31
  return CHART_SERIES.map((series) => {
    const isTotal = series.key === 'total'
    const data = chartData.series[series.key]
    return {
      name: series.name,
      type: 'line',
      data,
      smooth: false,
      showSymbol,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: isTotal ? 1.8 : 2.2,
        type: isTotal ? 'dashed' : 'solid',
        color: series.color,
      },
      itemStyle: { color: series.color, borderColor: '#ffffff', borderWidth: 1.5 },
      emphasis: {
        focus: 'series',
        scale: 1.25,
        lineStyle: { width: isTotal ? 2.2 : 2.8 },
      },
      z: isTotal ? 2 : 3,
    }
  })
}

function buildBarSeries(chartData) {
  const dateCount = chartData.dates.length
  const showValueLabels = dateCount <= CHART_VALUE_LABEL_MAX_DAYS
  return CHANNEL_SERIES.map(series => ({
    name: series.name,
    type: 'bar',
    data: chartData.series[series.key],
    barMaxWidth: CHART_BAR_MAX_WIDTH,
    barGap: '18%',
    barCategoryGap: '36%',
    itemStyle: { color: series.color, borderRadius: [3, 3, 0, 0] },
    emphasis: { focus: 'series' },
    label: {
      show: showValueLabels,
      position: 'top',
      distance: 4,
      color: '#64748b',
      fontSize: 11,
      formatter: params => (toChartCount(params?.value) > 0 ? formatChartAxisNumber(params.value) : ''),
    },
  }))
}

/**
 * 生成 ECharts option；数据不可绘制时返回 null，由组件展示空状态，
 * 避免生成带 NaN / 空坐标轴的“假图表”。
 */
export function buildActivityChartOption(chartData) {
  if (!chartData || chartData.status !== CHART_STATUS.READY) return null
  const isBar = chartData.trendView === TREND_VIEW_BAR
  const dateCount = chartData.dates.length
  const dataZoom = resolveDataZoom(dateCount)
  const showValueLabels = isBar && dateCount <= CHART_VALUE_LABEL_MAX_DAYS
  return {
    ...animationConfig(320),
    grid: {
      top: showValueLabels ? 40 : 30,
      right: 12,
      bottom: dataZoom ? 40 : 6,
      left: 6,
      containLabel: true,
    },
    tooltip: buildTooltip(chartData),
    legend: buildLegend(chartData),
    xAxis: buildXAxis(chartData),
    yAxis: buildYAxis(chartData),
    dataZoom: dataZoom || undefined,
    series: isBar ? buildBarSeries(chartData) : buildLineSeries(chartData),
    aria: { enabled: true, label: { description: chartData.ariaDescription } },
  }
}

/**
 * 「访问来源」水平条形图：对比两个来源在所选时间内的数值。
 *
 * - 用横向柱状图（不是饼图）：访客人数是非互斥集合，不能做占比图；
 * - 浏览次数时可在标签里显示“浏览次数占比”，访客人数时不显示占比；
 * - 数据缺失显示“—”，不伪装成 0。
 */
export function buildChannelShareOption(chartData) {
  if (!chartData || chartData.status !== CHART_STATUS.READY) return null
  const metric = chartData.metric
  const units = chartData.metricUnit
  const rows = CHANNEL_SERIES.map(series => ({
    key: series.key,
    name: series.name,
    color: series.color,
    value: chartData.summary[series.key][metric],
  }))
  if (rows.every(row => row.value === null)) return null

  return {
    ...animationConfig(320),
    // right 预留数值标签宽度（例如“1.2万 次”），避免被容器右边缘裁切。
    grid: { top: 8, right: 46, bottom: 8, left: 6, containLabel: true },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#334155', fontSize: 12 },
      extraCssText: 'box-shadow:0 8px 24px rgba(15,23,42,0.08);border-radius:12px;',
      formatter: (params) => {
        const row = rows[params?.dataIndex]
        if (!row) return ''
        const valueText = row.value === null ? '—' : Number(row.value).toLocaleString('zh-CN')
        let html = `<div style="font-weight:600;color:#334155;margin-bottom:4px;">${escapeHtml(row.name)}</div>`
        html += `<div style="color:#475569;">${escapeHtml(chartData.metricLabel)} <span style="font-weight:600;color:#1e293b;font-variant-numeric:tabular-nums;">${valueText}</span> ${units}</div>`
        if (metric === CHART_METRIC_PV) {
          const share = chartData.pvShares[row.key]
          html += `<div style="color:#94a3b8;">浏览次数占比 ${formatPercentValue(share)}</div>`
        }
        return html
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      splitNumber: 2,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11, formatter: formatChartAxisNumber },
      splitLine: { lineStyle: { color: '#eef2f7' } },
    },
    yAxis: {
      type: 'category',
      // inverse：让第一个来源（网页端）显示在顶部，符合阅读顺序。
      inverse: true,
      data: rows.map(row => row.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#57534e', fontSize: 12, margin: 12 },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 22,
        barCategoryGap: '46%',
        data: rows.map(row => ({
          // 缺失时用 null：条形不绘制，避免把“没有数据”画成“0 次”。
          value: row.value === null ? null : row.value,
          itemStyle: { color: row.color, borderRadius: [0, 4, 4, 0] },
        })),
        label: {
          show: true,
          position: 'right',
          distance: 8,
          color: '#475569',
          fontSize: 12,
          fontWeight: 600,
          // 条形图只标数值与单位：占比在下方明细与 tooltip 中展示，
          // 避免窄栏里标签被裁切，也避免同一信息重复两次。
          formatter: (params) => {
            const row = rows[params?.dataIndex]
            if (!row) return ''
            if (row.value === null) return '—'
            return `${formatChartAxisNumber(row.value)} ${units}`
          },
        },
        emphasis: { focus: 'item' },
      },
    ],
    aria: {
      enabled: true,
      label: {
        description: buildChannelShareAria(chartData),
      },
    },
  }
}

/**
 * 「访问来源」图表的读屏描述（同样用于图表容器的 aria-label）。
 * 文案使用普通中文，访客人数不提及占比。
 */
export function buildChannelShareAria(chartData) {
  const unit = chartData.metricUnit
  const rows = CHANNEL_SERIES.map((series) => {
    const value = chartData.summary[series.key][chartData.metric]
    const text = value === null ? '暂不可用' : `${value.toLocaleString('zh-CN')} ${unit}`
    if (chartData.metric === CHART_METRIC_PV) {
      const share = chartData.pvShares[series.key]
      const shareText = share === null ? '占比暂不可用' : `浏览次数占比 ${formatPercentValue(share)}`
      return `${series.name} ${text}，${shareText}`
    }
    return `${series.name} ${text}`
  })
  return `访问来源对比条形图，${rows.join('；')}。`
}

/** 图表容器的 aria-label：来源区与趋势区各自使用对应描述。 */
export function buildSourceAriaLabel(chartData) {
  if (!chartData) return '访问来源对比图'
  if (chartData.status !== CHART_STATUS.READY && chartData.status !== CHART_STATUS.EMPTY) {
    return chartData.ariaDescription || '访问来源对比图'
  }
  return buildChannelShareAria(chartData)
}

/**
 * 文字明细行（组件渲染为读屏等价表格与图表降级内容）。
 *
 * 区间合计行只引用接口整段值：访客人数绝不由每日或来源相加。
 */
export function buildActivityChartTableRows(chartData) {
  if (!chartData || (chartData.status !== CHART_STATUS.READY && chartData.status !== CHART_STATUS.EMPTY)) {
    return []
  }
  return chartData.dates.map((date, index) => ({
    key: date,
    label: date,
    weekday: formatWeekday(date),
    total: chartData.total[index] === null ? '—' : Number(chartData.total[index]).toLocaleString('zh-CN'),
    web: chartData.series.web[index] === null
      ? '—'
      : Number(chartData.series.web[index]).toLocaleString('zh-CN'),
    miniprogram: chartData.series.miniprogram[index] === null
      ? '—'
      : Number(chartData.series.miniprogram[index]).toLocaleString('zh-CN'),
  }))
}

/**
 * 所选时间合计（来源区使用）。访客人数只认接口整段去重值。
 */
export function buildSummaryRows(chartData) {
  if (!chartData) return []
  return CHANNEL_SERIES.map((series) => {
    const value = chartData.summary[series.key][chartData.metric]
    return {
      key: series.key,
      name: series.name,
      color: series.color,
      value,
      valueText: value === null ? '—' : Number(value).toLocaleString('zh-CN'),
      unit: chartData.metricUnit,
      share: chartData.metric === CHART_METRIC_PV ? chartData.pvShares[series.key] : null,
      shareText: chartData.metric === CHART_METRIC_PV ? formatPercentValue(chartData.pvShares[series.key]) : '',
    }
  })
}
