import test from 'node:test'
import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import { createActivityDashboard } from './useActivityDashboard.js'
import { CHART_SERIES, normalizeActivityChartData } from '../utils/activityChart.js'

/**
 * 运行：npm test
 * 数据看板「访问情况」状态机：
 * 加载 / 错误 / 空数据 / 刷新 / 换日期 / 来源归一化 / 过期响应丢弃 / 指标切换不请求接口。
 */

const NOW = new Date(2026, 10, 17, 12, 0, 0)
const VALID_RANGE = { startDate: '2026-11-11', endDate: '2026-11-17' }

function activityResponse(overrides = {}) {
  return {
    data: {
      success: true,
      data: {
        startDate: '2026-11-11',
        endDate: '2026-11-17',
        days: 7,
        totalPv: 100,
        totalUv: 50,
        averagePv: 14.3,
        averageUv: 7.1,
        previousStartDate: '2026-11-04',
        previousEndDate: '2026-11-10',
        previousTotalPv: 80,
        previousTotalUv: 40,
        pvChangeRate: 25,
        uvChangeRate: 25,
        timezone: 'Asia/Shanghai',
        coverage: 'web+miniprogram',
        maxRangeDays: 90,
        retentionDays: 400,
        generatedAt: '2026-11-17 12:00:00',
        daily: [
          { date: '2026-11-16', pv: 10, uv: 6, webPv: 7, webUv: 4, miniprogramPv: 3, miniprogramUv: 2 },
          { date: '2026-11-17', pv: 90, uv: 44, webPv: 33, webUv: 30, miniprogramPv: 57, miniprogramUv: 20 },
        ],
        channels: [
          {
            clientType: 'web',
            clientTypeText: 'Web 网页端',
            totalPv: 40,
            totalUv: 34,
            pvShare: 40,
            uvShare: 68,
            previousTotalPv: 40,
            previousTotalUv: 30,
            pvChangeRate: 0,
            uvChangeRate: 13.3,
            daily: [
              { date: '2026-11-16', pv: 7, uv: 4 },
              { date: '2026-11-17', pv: 33, uv: 30 },
            ],
          },
          {
            clientType: 'miniprogram',
            clientTypeText: '微信小程序端',
            totalPv: 60,
            totalUv: 16,
            pvShare: 60,
            uvShare: 32,
            previousTotalPv: 0,
            previousTotalUv: 0,
            pvChangeRate: null,
            uvChangeRate: null,
            daily: [
              { date: '2026-11-16', pv: 3, uv: 2 },
              { date: '2026-11-17', pv: 57, uv: 20 },
            ],
          },
        ],
        ...overrides,
      },
    },
  }
}

function emptyResponse() {
  return activityResponse({
    totalPv: 0,
    totalUv: 0,
    averagePv: 0,
    averageUv: 0,
    previousTotalPv: 0,
    previousTotalUv: 0,
    pvChangeRate: null,
    uvChangeRate: null,
    daily: [{ date: '2026-11-16', pv: 0, uv: 0, webPv: 0, webUv: 0, miniprogramPv: 0, miniprogramUv: 0 }],
    channels: [
      { clientType: 'web', clientTypeText: 'Web 网页端', totalPv: 0, totalUv: 0, pvShare: null, uvShare: null, previousTotalPv: 0, previousTotalUv: 0, pvChangeRate: null, uvChangeRate: null, daily: [{ date: '2026-11-16', pv: 0, uv: 0 }] },
      { clientType: 'miniprogram', clientTypeText: '微信小程序端', totalPv: 0, totalUv: 0, pvShare: null, uvShare: null, previousTotalPv: 0, previousTotalUv: 0, pvChangeRate: null, uvChangeRate: null, daily: [{ date: '2026-11-16', pv: 0, uv: 0 }] },
    ],
  })
}

test('加载成功后暴露两个来源与三个核心指标', async () => {
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => activityResponse(),
  })
  await dashboard.load()

  assert.equal(dashboard.loading.value, false)
  assert.equal(dashboard.hasLoaded.value, true)
  assert.equal(dashboard.error.value, '')
  assert.equal(dashboard.data.value.totalPv, 100)

  const channels = dashboard.channels.value
  assert.equal(channels.length, 2)
  assert.deepEqual(channels.map(item => item.clientType), ['web', 'miniprogram'])
  assert.equal(channels[0].totalPv, 40)
  assert.equal(channels[1].totalPv, 60)

  // 核心数字只有三个：浏览次数、访客人数、平均每天浏览。
  assert.deepEqual(dashboard.metricCards.value.map(card => card.key), ['pv', 'uv', 'avg-pv'])
  assert.deepEqual(dashboard.metricCards.value.map(card => card.label), ['浏览次数', '访客人数', '平均每天浏览'])
  assert.equal(dashboard.metricCards.value[0].value, '100')
  assert.equal(dashboard.metricCards.value[1].value, '50')
  assert.equal(dashboard.metricCards.value[2].value, '14.3')
  assert.match(dashboard.metricCards.value[0].comparison.text, /比上一时段增加 25%/)
  assert.equal(dashboard.metricCards.value[0].comparison.detail, '上一时段 80 次')
  // 不再展示日均访客人数。
  assert.ok(dashboard.metricCards.value.every(card => card.label !== '日均访客人数'))
  assert.doesNotMatch(JSON.stringify(dashboard.metricCards.value), /PV|UV|日均访客/)
})

test('平均每天浏览 = 浏览次数 ÷ 天数（不改用访客人数）', async () => {
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => activityResponse({ days: 4, averagePv: 25.5 }),
  })
  await dashboard.load()
  const card = dashboard.metricCards.value.find(item => item.key === 'avg-pv')
  assert.equal(card.value, '25.5')
  assert.equal(card.unit, '次/天')
  assert.match(card.hint, /浏览次数 ÷ 4 天/)
  assert.doesNotMatch(card.hint, /访客人数/)
})

test('加载失败时保留错误信息并可重试', async () => {
  let attempt = 0
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => {
      attempt += 1
      if (attempt === 1) throw new Error('网络中断')
      return activityResponse()
    },
  })

  await dashboard.load()
  assert.equal(dashboard.error.value, '网络中断')
  assert.equal(dashboard.hasLoaded.value, false, '首次加载失败不算已加载')
  assert.equal(dashboard.loading.value, false)
  assert.equal(dashboard.data.value, null, '首次加载失败不保留任何旧数据')

  await dashboard.load()
  assert.equal(dashboard.error.value, '')
  assert.equal(dashboard.hasLoaded.value, true)
  assert.equal(dashboard.data.value.totalPv, 100)
})

test('接口返回 success=false 时按失败处理', async () => {
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => ({ data: { success: false, message: '无权限' } }),
  })
  await dashboard.load()
  assert.equal(dashboard.error.value, '无权限')
  assert.equal(dashboard.data.value, null)
  // 失败时来源仍可安全读取（不可用占位），模板不会崩溃。
  assert.equal(dashboard.channels.value.length, 2)
  assert.equal(dashboard.channelsUnavailable.value, true)
})

test('空区间：总量为 0、两个来源仍返回、提示空来源', async () => {
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => emptyResponse(),
  })
  await dashboard.load()

  assert.equal(dashboard.isEmpty.value, true)
  assert.equal(dashboard.metricCards.value[0].value, '0')
  // 上一时段为 0 时文案区分“上一时段暂无访问”。
  assert.equal(dashboard.metricCards.value[0].comparison.text, '上一时段暂无访问')
  assert.equal(dashboard.channels.value.length, 2)
  assert.equal(dashboard.channels.value[0].totalPv, 0)
  assert.deepEqual(dashboard.emptyChannels.value, ['网页端', '微信小程序'])
})

test('上一时段为 0 与对比数据缺失的文案不同', async () => {
  const zeroPrev = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => activityResponse({ pvChangeRate: null, previousTotalPv: 0 }),
  })
  await zeroPrev.load()
  assert.equal(zeroPrev.metricCards.value[0].comparison.text, '上一时段暂无访问')

  const missing = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => {
      const response = activityResponse()
      delete response.data.data.pvChangeRate
      delete response.data.data.previousTotalPv
      return response
    },
  })
  await missing.load()
  assert.equal(missing.metricCards.value[0].comparison.text, '暂无对比数据')
})

test('老接口没有 channels 时仍返回两个来源且不伪造数据', async () => {
  const legacy = activityResponse()
  delete legacy.data.data.channels
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => legacy,
  })
  await dashboard.load()

  assert.equal(dashboard.channels.value.length, 2)
  assert.equal(dashboard.channelsUnavailable.value, true)
  assert.ok(dashboard.channels.value.every(item => item.totalPv === null))
  assert.deepEqual(dashboard.emptyChannels.value, [], '接口不可用时不能谎称来源为空记录')
  assert.equal(dashboard.metricCards.value[0].value, '100', '合计指标仍来自原有字段')
})

test('快速切换区间时旧响应被丢弃', async () => {
  const resolvers = []
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: () => new Promise(resolve => resolvers.push(resolve)),
  })

  const first = dashboard.load()
  dashboard.selectPreset('30d')
  const second = dashboard.load()
  assert.equal(resolvers.length, 3)

  // 后发起的请求先返回。
  resolvers[2](activityResponse({ totalPv: 300 }))
  await second
  assert.equal(dashboard.data.value.totalPv, 300)

  // 先发起的旧请求后返回，必须被忽略。
  resolvers[0](activityResponse({ totalPv: 100 }))
  resolvers[1](activityResponse({ totalPv: 200 }))
  await first
  await nextTick()
  assert.equal(dashboard.data.value.totalPv, 300)
  assert.equal(dashboard.loading.value, false)
})

test('切换日期时立即清空旧数据，不会把旧日期结果当成新结果', async () => {
  const resolvers = []
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: () => new Promise(resolve => resolvers.push(resolve)),
  })

  const first = dashboard.load()
  resolvers[0](activityResponse({ totalPv: 100 }))
  await first
  assert.equal(dashboard.data.value.totalPv, 100)

  // 切到 30 天：请求还没返回时旧数据必须立即清空。
  const second = dashboard.selectPreset('30d')
  assert.equal(dashboard.data.value, null, '切换日期后不能继续展示旧日期数据')
  assert.equal(dashboard.showSkeleton.value, true)
  assert.equal(dashboard.chart.value.status, 'no-data')

  resolvers[1](activityResponse({ totalPv: 500, startDate: '2026-10-19' }))
  await second
  assert.equal(dashboard.data.value.totalPv, 500)
})

test('切换日期失败时所有区域一起显示失败，不保留旧日期数据', async () => {
  let attempt = 0
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => {
      attempt += 1
      if (attempt === 2) throw new Error('服务暂时不可用')
      return activityResponse()
    },
  })
  await dashboard.load()
  assert.equal(dashboard.data.value.totalPv, 100)

  await dashboard.selectPreset('30d')
  assert.equal(dashboard.data.value, null, '换日期失败后不保留旧数据')
  assert.equal(dashboard.error.value, '服务暂时不可用')
  assert.equal(dashboard.chart.value.status, 'error')
  assert.equal(dashboard.trendOption.value, null)
  assert.equal(dashboard.sourceOption.value, null)
  assert.equal(dashboard.refreshing.value, false)
})

test('同日期刷新保留旧内容并提示更新中，失败时标注保留上次成功结果', async () => {
  let attempt = 0
  let resolveRefresh
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => {
      attempt += 1
      if (attempt === 1) return activityResponse()
      if (attempt === 2) {
        return new Promise((resolve) => { resolveRefresh = resolve })
      }
      throw new Error('刷新失败')
    },
  })

  await dashboard.load()
  const pending = dashboard.load()
  await Promise.resolve()
  // 同日期刷新：旧内容保留，并标记更新中。
  assert.equal(dashboard.data.value.totalPv, 100)
  assert.equal(dashboard.refreshing.value, true)

  resolveRefresh(activityResponse({ totalPv: 120 }))
  await pending
  assert.equal(dashboard.data.value.totalPv, 120)
  assert.equal(dashboard.refreshing.value, false)

  // 再次刷新失败：保留上次成功结果，并明确标注。
  await dashboard.load()
  assert.equal(dashboard.refreshFailed.value, true)
  assert.equal(dashboard.data.value.totalPv, 120, '刷新失败保留上次成功结果')
  assert.equal(dashboard.error.value, '刷新失败')
  // 图表可以继续使用上次成功数据（同日期）。
  assert.equal(dashboard.chart.value.status, 'ready')
})

test('切换预设区间会更新请求参数并重新加载', async () => {
  const calls = []
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async (payload) => {
      calls.push({ ...payload })
      return activityResponse()
    },
  })

  await dashboard.selectPreset('30d')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].endDate, '2026-11-17')
  assert.equal(calls[0].startDate, '2026-10-19')
  assert.equal(dashboard.selectedRange.value.startDate, '2026-10-19')

  // custom 只切换模式，不立即请求。
  dashboard.selectPreset('custom')
  assert.equal(calls.length, 1)
  assert.equal(dashboard.customRange.value.length, 2)
})

test('自定义区间校验不通过时不发请求', async () => {
  const calls = []
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async (payload) => {
      calls.push(payload)
      return activityResponse()
    },
  })
  dashboard.selectPreset('custom')
  dashboard.customRange.value = ['2026-11-17', '2026-11-11']
  assert.equal(dashboard.customValidation.value.valid, false)
  assert.match(dashboard.customHint.value, /结束日期不能早于开始日期/)

  const pending = dashboard.applyCustomRange()
  assert.equal(pending, null)
  assert.equal(calls.length, 0)

  // 合法区间才请求。
  dashboard.customRange.value = ['2026-11-10', '2026-11-17']
  assert.equal(dashboard.customValidation.value.valid, true)
  await dashboard.applyCustomRange()
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], { startDate: '2026-11-10', endDate: '2026-11-17' })
})

test('刷新期间 loading 为 true，结束后复位', async () => {
  let resolve
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: () => new Promise((r) => { resolve = r }),
  })
  const pending = dashboard.load()
  await Promise.resolve()
  assert.equal(dashboard.loading.value, true)
  assert.equal(dashboard.showSkeleton.value, true)
  resolve(activityResponse())
  await pending
  assert.equal(dashboard.loading.value, false)
  assert.equal(dashboard.showSkeleton.value, false)
})

test('趋势图例固定为全部来源、网页端、微信小程序', () => {
  // 图表系列定义在 activityChart.CHART_SERIES，与来源口径共用同一份配置。
  assert.deepEqual(CHART_SERIES.map(item => item.name), ['全部来源', '网页端', '微信小程序'])
  assert.equal(CHART_SERIES[0].dashed, true, '全部来源用中性虚线，避免与来源颜色混淆')
  assert.equal(CHART_SERIES[0].color, '#64748b')
  assert.equal(CHART_SERIES[1].color, '#e11d48')
  assert.equal(CHART_SERIES[2].color, '#0ea5e9')
})

test('时区显示为北京时间，日期范围带天数', async () => {
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => activityResponse(),
  })
  await dashboard.load()
  assert.equal(dashboard.timezone.value, '北京时间')
  assert.equal(dashboard.rangeText.value, '2026-11-11 至 2026-11-17（共 7 天）')
})

test('趋势图默认折线且只展示浏览次数', async () => {
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => activityResponse(),
  })
  await dashboard.load()

  assert.equal(dashboard.metric.value, 'pv')
  assert.equal(dashboard.trendView.value, 'line')
  const chart = dashboard.chart.value
  assert.equal(chart.metric, 'pv')
  assert.equal(chart.trendView, 'line')
  assert.equal(chart.status, 'ready')
  assert.deepEqual(chart.dates, ['2026-11-16', '2026-11-17'], '日期顺序与接口一致')
  assert.deepEqual(chart.series.web, [7, 33])
  assert.deepEqual(chart.series.miniprogram, [3, 57])
  assert.deepEqual(chart.series.total, [10, 90])
  assert.ok(dashboard.trendOption.value, '默认应生成趋势图 option')
  assert.ok(dashboard.sourceOption.value, '默认应生成来源图 option')
})

test('指标切换只改变图表数据，不再请求接口', async () => {
  let calls = 0
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => {
      calls += 1
      return activityResponse()
    },
  })
  await dashboard.load()
  assert.equal(calls, 1)

  dashboard.setMetric('uv')
  await nextTick()
  const uvChart = dashboard.chart.value
  assert.equal(uvChart.metric, 'uv')
  assert.equal(uvChart.metricUnit, '人')
  assert.deepEqual(uvChart.series.web, [4, 30], '访客人数取 webUv 字段')
  assert.deepEqual(uvChart.series.miniprogram, [2, 20])
  assert.equal(calls, 1, '切换指标不应重新请求接口')

  dashboard.setMetric('invalid')
  await nextTick()
  assert.equal(dashboard.metric.value, 'pv', '非法指标回落到浏览次数')
  assert.equal(calls, 1)
})

test('趋势 / 每日对比切换只改变图表形式，不再请求接口', async () => {
  let calls = 0
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => {
      calls += 1
      return activityResponse()
    },
  })
  await dashboard.load()

  dashboard.setTrendView('bar')
  await nextTick()
  assert.equal(dashboard.trendView.value, 'bar')
  assert.equal(dashboard.chart.value.trendView, 'bar')
  const barOption = dashboard.trendOption.value
  assert.deepEqual(barOption.series.map(series => series.type), ['bar', 'bar'])
  assert.equal(calls, 1, '切换图表形式不应重新请求接口')

  dashboard.setTrendView('line')
  await nextTick()
  assert.equal(dashboard.chart.value.trendView, 'line')
  assert.equal(calls, 1)
})

test('所选时间访客人数取接口整段去重值，不按天或按来源相加', async () => {
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => activityResponse(),
  })
  await dashboard.load()

  // 每日 UV 相加 = 6 + 44 = 50，接口 totalUv 也是 50；这里用不一致的接口值确认取值来源。
  const inconsistent = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => activityResponse({ totalUv: 33 }),
  })
  await inconsistent.load()
  assert.equal(inconsistent.data.value.totalUv, 33)
  assert.equal(inconsistent.metricCards.value[1].value, '33')

  // 两个来源 UV 相加 = 34 + 16 = 50，与接口 totalUv 独立。
  const chart = dashboard.chart.value
  assert.equal(chart.summary.total.uv, 50)
  assert.equal(chart.summary.web.uv, 34)
  assert.equal(chart.summary.miniprogram.uv, 16)
  // 全部来源的 UV 由接口给出，不是两个来源相加的结果（此处数值恰好相同，用字段来源保证）。
  const payload = activityResponse({ totalUv: 7 }).data.data
  const odd = normalizeActivityChartData(payload, { metric: 'uv' })
  assert.equal(odd.summary.total.uv, 7)
  assert.notEqual(odd.summary.total.uv, odd.summary.web.uv + odd.summary.miniprogram.uv)
})

test('看板请求失败时图表不残留上一次区间数据', async () => {
  let attempt = 0
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => {
      attempt += 1
      // 第一次成功；之后的所有请求都失败，用于验证刷新失败与换日期失败。
      if (attempt > 1) throw new Error('网络中断')
      return activityResponse()
    },
  })
  await dashboard.load()
  assert.equal(dashboard.chart.value.status, 'ready')

  // 同日期刷新失败：保留上次成功数据。
  await dashboard.load()
  assert.equal(dashboard.chart.value.status, 'ready')
  assert.equal(dashboard.refreshFailed.value, true)

  // 换日期失败：清空旧数据并显示失败状态。
  await dashboard.selectPreset('30d')
  assert.equal(dashboard.chart.value.status, 'error')
  assert.equal(dashboard.chart.value.statusMessage, '网络中断')
  assert.deepEqual(dashboard.chart.value.series.web, [], '失败后不能残留旧数据')
})

test('老接口下图表为 unavailable，绝不把合计拆成来源', async () => {
  const legacy = activityResponse()
  delete legacy.data.data.channels
  legacy.data.data.daily = legacy.data.data.daily.map(({ date, pv, uv }) => ({ date, pv, uv }))

  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => legacy,
  })
  await dashboard.load()

  const chart = dashboard.chart.value
  assert.equal(chart.status, 'unavailable')
  assert.equal(chart.reason, 'legacy')
  assert.ok(chart.series.web.every(value => value === null), '缺失保持 null，不冒充 0')
  assert.ok(chart.series.miniprogram.every(value => value === null))
  assert.match(chart.statusMessage, /不会把合计数拆开显示/)
  assert.equal(dashboard.trendOption.value, null)
  assert.equal(dashboard.sourceOption.value, null)
})

test('空区间下图表为 empty，两个来源仍保留', async () => {
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => emptyResponse(),
  })
  await dashboard.load()

  const chart = dashboard.chart.value
  assert.equal(chart.status, 'empty')
  assert.equal(chart.dates.length, 1)
  assert.deepEqual(chart.series.web, [0])
  assert.deepEqual(chart.series.miniprogram, [0])
  assert.equal(dashboard.trendOption.value, null)
})

test('切换区间后图表日期跟随新数据', async () => {
  let range = { startDate: '2026-11-11', endDate: '2026-11-17' }
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async (payload) => {
      range = payload
      return activityResponse()
    },
  })
  await dashboard.load()
  assert.equal(dashboard.chart.value.dates.length, 2)

  await dashboard.selectPreset('30d')
  assert.equal(range.startDate, '2026-10-19')
  assert.equal(dashboard.chart.value.status, 'ready')
  assert.equal(dashboard.chart.value.trendView, 'line', '切换区间保留当前图表形式')
})

test('每日明细默认收起，可切换展开', () => {
  const dashboard = createActivityDashboard({
    now: () => NOW,
    fetchActivity: async () => activityResponse(),
  })
  assert.equal(dashboard.detailOpen.value, false, '每日明细默认收起')
  dashboard.toggleDetail()
  assert.equal(dashboard.detailOpen.value, true)
  dashboard.toggleDetail()
  assert.equal(dashboard.detailOpen.value, false)
  dashboard.toggleDetail(true)
  assert.equal(dashboard.detailOpen.value, true)
})
