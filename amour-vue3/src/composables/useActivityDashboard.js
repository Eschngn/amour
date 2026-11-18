import { computed, ref } from 'vue'
// 相对路径引入纯工具：node:test 直接加载本文件时没有 Vite 的 @ 别名。
import {
  ACTIVITY_MAX_RANGE_DAYS,
  ACTIVITY_PRESETS,
  buildActivityPayload,
  resolvePresetRange,
  todayKey,
  validateActivityRange,
} from '../utils/activityRange.js'
import {
  describeComparison,
  findMetric,
  formatCount,
  formatRangeLabel,
  formatTimeZoneLabel,
  normalizeMetric,
} from '../utils/activityCopy.js'
import { ACTIVITY_CHANNELS, isChannelEmpty, normalizeActivityChannels } from '../utils/activityChannels.js'
import {
  CHART_METRIC_PV,
  TREND_VIEW_LINE,
  buildActivityChartOption,
  buildChannelShareOption,
  normalizeActivityChartData,
  normalizeTrendView,
} from '../utils/activityChart.js'

/**
 * 数据看板「访问情况」区域的数据与状态机。
 *
 * 从 AdminActivityPanel 抽出来，便于在没有浏览器 / Element Plus 的环境里测试
 * 加载、错误、空数据、刷新、过期响应与来源归一化行为。
 *
 * 约定（不可放宽）：
 * - 请求按序号丢弃过期响应，快速切换日期时旧响应不会污染界面；
 * - 切换到新日期时立即清空旧数据，绝不把旧日期的数据当成新结果展示；
 * - 同一日期刷新保留旧内容并提示“更新中”，失败时明确标注“上次成功结果”；
 * - 来源固定为网页端、微信小程序两个，缺失保持 null（界面显示“—”），不冒充真实 0；
 * - 访客人数只认接口整段去重值，不由每日或来源相加；
 * - 任何展示值都不产生 NaN / Infinity / undefined。
 *
 * @param {object} options
 * @param {Function} options.fetchActivity 必填，返回 axios 风格响应（{ data: { success, data } }）
 *   或已解包的接口 body。
 * @param {Function} [options.now] 当前时间提供者，测试时固定“今天”。
 */
export function createActivityDashboard(options = {}) {
  if (typeof options.fetchActivity !== 'function') {
    throw new TypeError('createActivityDashboard 需要注入 fetchActivity')
  }
  const fetchActivity = options.fetchActivity
  const nowProvider = typeof options.now === 'function' ? options.now : () => new Date()

  const presets = ACTIVITY_PRESETS
  const activePreset = ref('7d')
  const selectedRange = ref(resolvePresetRange('7d', nowProvider()))
  const customRange = ref([])
  const data = ref(null)
  /** 当前展示数据对应的日期区间；用于判断“换日期”还是“同日期刷新”。 */
  const loadedRange = ref(null)
  const loading = ref(false)
  const hasLoaded = ref(false)
  const error = ref('')
  /** 同日期刷新失败：保留上次成功数据，但必须明确标注。 */
  const refreshFailed = ref(false)
  /** 首次加载骨架：还没有任何成功数据。 */
  const showSkeleton = ref(false)
  // 指标与图表形式：两个图表共用同一指标切换，纯前端切换，不重新请求接口。
  const metric = ref(CHART_METRIC_PV)
  const trendView = ref(TREND_VIEW_LINE)
  /** 每日明细默认收起。 */
  const detailOpen = ref(false)

  let loadSequence = 0

  const timezone = computed(() => formatTimeZoneLabel(data.value?.timezone))
  const dailyPoints = computed(() => (Array.isArray(data.value?.daily) ? data.value.daily : []))
  const generatedAt = computed(() => data.value?.generatedAt || '')
  const maxRangeDays = computed(() => data.value?.maxRangeDays || ACTIVITY_MAX_RANGE_DAYS)

  /** 当前图表数据：统一由 activityChart 适配层转换。 */
  const chart = computed(() => normalizeActivityChartData(data.value, {
    metric: metric.value,
    trendView: trendView.value,
    error: error.value && !data.value ? error.value : '',
  }))

  /** 来源图表与趋势图表共用同一份 chart 数据。 */
  const trendOption = computed(() => buildActivityChartOption(chart.value))
  const sourceOption = computed(() => buildChannelShareOption(chart.value))

  const metricConfig = computed(() => findMetric(metric.value))

  /**
   * 空区间：只要返回了每日序列且合计全为 0，就认为没有浏览记录。
   * 还没加载过时不算空，避免加载骨架被误判成空数据。
   */
  const isEmpty = computed(() => hasLoaded.value
    && dailyPoints.value.length > 0
    && dailyPoints.value.every(item => !item?.pv && !item?.uv))

  /** 来源数据：始终两个来源，顺序固定。 */
  const channels = computed(() => normalizeActivityChannels(data.value))
  const channelsUnavailable = computed(() => channels.value.some(item => item.unavailable))
  const emptyChannels = computed(() => channels.value
    .filter(item => !item.unavailable && isChannelEmpty(item))
    .map(item => item.clientTypeText))

  const rangeText = computed(() => {
    const range = data.value || selectedRange.value
    return formatRangeLabel(range?.startDate, range?.endDate, data.value?.days)
  })

  const rangeDays = computed(() => {
    const days = Number(data.value?.days)
    return Number.isFinite(days) && days > 0 ? days : 0
  })

  /**
   * 三个核心数字：浏览次数、访客人数、平均每天浏览。
   * 日均访客人数不再展示（容易被误读成每日访客平均值）。
   */
  const metricCards = computed(() => {
    const payload = data.value
    const pvComparison = payload
      ? describeComparison(payload.pvChangeRate, payload.previousTotalPv, '次')
      : null
    const uvComparison = payload
      ? describeComparison(payload.uvChangeRate, payload.previousTotalUv, '人')
      : null
    return [
      {
        key: 'pv',
        label: '浏览次数',
        unit: '次',
        value: payload ? formatCount(payload.totalPv) : '—',
        comparison: pvComparison,
        hint: '所选时间内打开或刷新用户页面的次数合计。',
      },
      {
        key: 'uv',
        label: '访客人数',
        unit: '人',
        tag: '所选时间去重',
        value: payload ? formatCount(payload.totalUv) : '—',
        comparison: uvComparison,
        hint: '所选时间内去重后的访客数；同一访客只计一次，不是注册用户数。',
      },
      {
        key: 'avg-pv',
        label: '平均每天浏览',
        unit: '次/天',
        value: payload ? formatCount(payload.averagePv, 1) : '—',
        comparison: null,
        hint: payload ? `所选时间浏览次数 ÷ ${rangeDays.value || payload.days || 0} 天。` : '所选时间浏览次数 ÷ 天数。',
      },
    ]
  })

  const customValidation = computed(() => {
    const range = Array.isArray(customRange.value) ? customRange.value : []
    return validateActivityRange(range[0], range[1], {
      today: todayKey(nowProvider()),
      maxDays: maxRangeDays.value,
    })
  })

  const customHint = computed(() => {
    if (activePreset.value !== 'custom') return ''
    if (!Array.isArray(customRange.value) || customRange.value.length !== 2) return ''
    return customValidation.value.valid ? '' : customValidation.value.message
  })

  /** 同日期刷新中：已有数据，请求仍在进行。 */
  const refreshing = computed(() => loading.value && Boolean(data.value))
  /** 切换日期加载中：还没有该日期的数据。 */
  const loadingNewRange = computed(() => loading.value && !data.value)

  function sameRange(a, b) {
    return Boolean(a && b && a.startDate === b.startDate && a.endDate === b.endDate)
  }

  function selectPreset(key) {
    activePreset.value = key
    if (key === 'custom') {
      const current = selectedRange.value || resolvePresetRange('30d', nowProvider())
      if (!Array.isArray(customRange.value) || customRange.value.length !== 2) {
        customRange.value = [current.startDate, current.endDate]
      }
      return null
    }
    const range = resolvePresetRange(key, nowProvider())
    if (!range) return null
    selectedRange.value = range
    return load()
  }

  function applyCustomRange() {
    const range = Array.isArray(customRange.value) ? customRange.value : []
    const validation = validateActivityRange(range[0], range[1], {
      today: todayKey(nowProvider()),
      maxDays: maxRangeDays.value,
    })
    if (!validation.valid) return null
    selectedRange.value = buildActivityPayload(range[0], range[1])
    return load()
  }

  function setMetric(next) {
    metric.value = normalizeMetric(next)
  }

  function setTrendView(next) {
    trendView.value = normalizeTrendView(next)
  }

  function toggleDetail(open) {
    detailOpen.value = typeof open === 'boolean' ? open : !detailOpen.value
  }

  async function load() {
    const requestId = ++loadSequence
    const rangeChanged = !sameRange(selectedRange.value, loadedRange.value)
    loading.value = true
    error.value = ''
    refreshFailed.value = false
    if (rangeChanged) {
      // 换日期：立即清空旧区间数据，避免把旧日期结果当成新结果展示。
      data.value = null
      loadedRange.value = null
      hasLoaded.value = false
      showSkeleton.value = true
    }
    try {
      const response = await fetchActivity({ ...selectedRange.value })
      if (requestId !== loadSequence) return
      // 兼容两种返回：{ data: { success, data } }（axios）或已解包的 body。
      const body = response?.data ?? response
      if (!body?.success || !body.data) {
        throw new Error(body?.message || '访问数据加载失败')
      }
      data.value = body.data
      loadedRange.value = { ...selectedRange.value }
      hasLoaded.value = true
      showSkeleton.value = false
    } catch (e) {
      if (requestId !== loadSequence) return
      const message = e?.response?.data?.message || e?.message || '访问数据加载失败'
      error.value = message
      if (!rangeChanged && data.value) {
        // 同日期刷新失败：保留上次成功数据，并明确标注。
        refreshFailed.value = true
        hasLoaded.value = true
      } else {
        // 换日期失败：不保留旧日期数据，全部区域一起显示失败状态。
        data.value = null
        loadedRange.value = null
        hasLoaded.value = false
        showSkeleton.value = false
      }
    } finally {
      if (requestId === loadSequence) {
        loading.value = false
        showSkeleton.value = false
      }
    }
  }

  /** 刷新当前日期：同日期请求失败时保留上次成功数据。 */
  function reload() {
    return load()
  }

  return {
    presets,
    activePreset,
    selectedRange,
    customRange,
    data,
    loadedRange,
    loading,
    refreshing,
    loadingNewRange,
    showSkeleton,
    hasLoaded,
    error,
    refreshFailed,
    metric,
    metricConfig,
    trendView,
    detailOpen,
    chart,
    trendOption,
    sourceOption,
    timezone,
    dailyPoints,
    generatedAt,
    isEmpty,
    channels,
    channelsUnavailable,
    emptyChannels,
    rangeText,
    rangeDays,
    metricCards,
    maxRangeDays,
    customValidation,
    customHint,
    selectPreset,
    applyCustomRange,
    setMetric,
    setTrendView,
    toggleDetail,
    load,
    reload,
  }
}

/** Vue 组件内使用的实例（每个面板独立一份状态）。 */
export function useActivityDashboard(options) {
  return createActivityDashboard(options)
}
