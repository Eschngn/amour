import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHART_SERIES,
  isActivityChartReducedMotion,
  setActivityChartReducedMotion,
  CHART_STATUS,
  TREND_VIEW_BAR,
  TREND_VIEW_LINE,
  buildActivityChartOption,
  buildActivityChartTableRows,
  buildChannelShareOption,
  buildSummaryRows,
  createActivityChartTooltipFormatter,
  findTrendView,
  formatChartAxisNumber,
  isChannelAwareDay,
  normalizeActivityChartData,
  normalizeChartMetric,
  normalizeTrendView,
  resolveAxisLabelInterval,
  toChartCount,
  toChartCountOrNull,
} from './activityChart.js'

/**
 * 运行：npm test（含 test:admin-activity）
 *
 * 访问趋势 / 访问来源图表的数据适配与 option 生成：
 * - 同时保留网页端与微信小程序两个系列，缺失不臆造；
 * - 老接口：只有合计值时明确不可用，绝不把合计拆成来源；
 * - 访客人数只认接口整段去重值，不能按天或按来源相加；
 * - 任何 null / 负数 / NaN / Infinity 都收敛，界面不出现异常值；
 * - option 的系列、颜色、指标字段与 tooltip 输出正确；
 * - 界面文案不出现 PV / UV / Web / 渠道 等旧写法。
 */

function fullPayload(overrides = {}) {
  return {
    startDate: '2026-11-10',
    endDate: '2026-11-12',
    days: 3,
    totalPv: 17,
    totalUv: 9,
    averagePv: 5.7,
    averageUv: 3,
    previousStartDate: '2026-11-07',
    previousEndDate: '2026-11-09',
    previousTotalPv: 10,
    previousTotalUv: 6,
    pvChangeRate: 70,
    uvChangeRate: 50,
    daily: [
      { date: '2026-11-10', pv: 12, uv: 6, webPv: 10, webUv: 5, miniprogramPv: 2, miniprogramUv: 1 },
      { date: '2026-11-11', pv: 5, uv: 3, webPv: 0, webUv: 0, miniprogramPv: 5, miniprogramUv: 3 },
      { date: '2026-11-12', pv: 0, uv: 0, webPv: 0, webUv: 0, miniprogramPv: 0, miniprogramUv: 0 },
    ],
    channels: [
      {
        clientType: 'web',
        clientTypeText: 'Web 网页端',
        totalPv: 10,
        totalUv: 5,
        pvShare: 58.8,
        uvShare: 55.6,
        previousTotalPv: 6,
        previousTotalUv: 3,
        pvChangeRate: 66.7,
        uvChangeRate: 66.7,
      },
      {
        clientType: 'miniprogram',
        clientTypeText: '微信小程序端',
        totalPv: 7,
        totalUv: 4,
        pvShare: 41.2,
        uvShare: 44.4,
        previousTotalPv: 4,
        previousTotalUv: 0,
        pvChangeRate: 75,
        uvChangeRate: null,
      },
    ],
    ...overrides,
  }
}

test('完整来源数据：日期顺序与系列正确，全部来源序列来自接口合计', () => {
  const chart = normalizeActivityChartData(fullPayload())
  assert.equal(chart.status, CHART_STATUS.READY)
  assert.deepEqual(chart.dates, ['2026-11-10', '2026-11-11', '2026-11-12'])
  assert.deepEqual(chart.series.web, [10, 0, 0])
  assert.deepEqual(chart.series.miniprogram, [2, 5, 0])
  assert.deepEqual(chart.series.total, [12, 5, 0], '全部来源使用接口返回的每日合计')
  assert.deepEqual(chart.total, [12, 5, 0])
  assert.equal(chart.metric, 'pv')
  assert.equal(chart.metricUnit, '次')
  assert.equal(chart.trendView, TREND_VIEW_LINE)
  assert.equal(chart.hasChannelData, true)
  assert.equal(chart.channelSource, 'daily')
})

test('区间访客人数只读接口整段去重值，不由每日或来源相加', () => {
  const chart = normalizeActivityChartData(fullPayload(), { metric: 'uv' })
  // 每日访客人数相加 = 6 + 3 + 0 = 9，恰好等于 totalUv，但取值必须来自接口字段；
  // 这里用一个明显不一致的接口值验证“不累加”。
  const odd = normalizeActivityChartData(fullPayload({ totalUv: 4 }), { metric: 'uv' })
  assert.equal(odd.summary.total.uv, 4)
  assert.equal(odd.summary.web.uv, 5)
  assert.equal(odd.summary.miniprogram.uv, 4)
  // 两个来源相加是 9，但全部来源仍然是接口的 4。
  assert.notEqual(odd.summary.total.uv, odd.summary.web.uv + odd.summary.miniprogram.uv)
  assert.equal(chart.summary.total.uv, 9)
})

test('缺少 totalUv 时不通过来源或每日数值臆造', () => {
  const payload = fullPayload()
  delete payload.totalUv
  const chart = normalizeActivityChartData(payload, { metric: 'uv' })
  assert.equal(chart.summary.total.uv, null, '缺失保持 null，界面显示“—”')
  // 来源的 UV 可以由接口来源字段给出，但合计不能相加得到。
  assert.equal(chart.summary.web.uv, 5)
})

test('只有网页端数据时微信小程序仍保留为 0 系列并给出提示', () => {
  const daily = [
    { date: '2026-11-10', pv: 8, uv: 4, webPv: 8, webUv: 4, miniprogramPv: 0, miniprogramUv: 0 },
    { date: '2026-11-11', pv: 3, uv: 2, webPv: 3, webUv: 2, miniprogramPv: 0, miniprogramUv: 0 },
  ]
  const chart = normalizeActivityChartData(fullPayload({ daily }))
  assert.equal(chart.status, CHART_STATUS.READY)
  assert.deepEqual(chart.series.web, [8, 3])
  assert.deepEqual(chart.series.miniprogram, [0, 0])
  assert.match(chart.notes.join(' '), /微信小程序在所选时间暂无访问记录/)
  // 三个系列始终存在（全部来源 + 两个来源）。
  assert.equal(CHART_SERIES.length, 3)
})

test('两个来源都为 0 时判定为空区间，不生成假图表', () => {
  const daily = [
    { date: '2026-11-10', pv: 0, uv: 0, webPv: 0, webUv: 0, miniprogramPv: 0, miniprogramUv: 0 },
    { date: '2026-11-11', pv: 0, uv: 0, webPv: 0, webUv: 0, miniprogramPv: 0, miniprogramUv: 0 },
  ]
  const chart = normalizeActivityChartData(fullPayload({
    daily,
    totalPv: 0,
    totalUv: 0,
    channels: fullPayload().channels.map(item => ({ ...item, totalPv: 0, totalUv: 0 })),
  }))
  assert.equal(chart.status, CHART_STATUS.EMPTY)
  assert.equal(chart.statusTitle, '所选时间暂无访问数据')
  assert.equal(buildActivityChartOption(chart), null, '空数据不应生成图表 option')
  assert.match(chart.ariaDescription, /都是 0/)
})

test('老接口只有 pv/uv/daily：标记不可用且绝不拆分合计值', () => {
  const legacy = normalizeActivityChartData({
    days: 2,
    totalPv: 10,
    totalUv: 6,
    daily: [
      { date: '2026-11-10', pv: 4, uv: 3 },
      { date: '2026-11-11', pv: 6, uv: 3 },
    ],
  })

  assert.equal(legacy.status, CHART_STATUS.UNAVAILABLE)
  assert.equal(legacy.reason, 'legacy')
  assert.equal(legacy.statusTitle, '来源明细暂不可用')
  assert.equal(legacy.hasChannelData, false)
  // 不臆造拆分：两个来源都保持 null（缺失），合计也没有被归到某一个来源。
  assert.deepEqual(legacy.series.web, [null, null])
  assert.deepEqual(legacy.series.miniprogram, [null, null])
  assert.match(legacy.statusMessage, /不会把合计数拆开显示/)
  assert.match(legacy.statusMessage, /10 次/)
  assert.equal(buildActivityChartOption(legacy), null)
  assert.equal(buildChannelShareOption(legacy), null)
})

test('缺失来源字段的那一天显示为缺失，不会被伪造成 0', () => {
  const chart = normalizeActivityChartData(fullPayload({
    daily: [
      { date: '2026-11-10', pv: 3, uv: 2 }, // 该天没有来源字段
      { date: '2026-11-11', pv: 5, uv: 3, webPv: 5, webUv: 3, miniprogramPv: 0, miniprogramUv: 0 },
    ],
  }))
  assert.equal(chart.status, CHART_STATUS.READY)
  // 缺失保持 null：图表留空、明细显示“—”，不冒充真实 0。
  assert.deepEqual(chart.series.web, [null, 5])
  assert.deepEqual(chart.series.miniprogram, [null, 0])
  // 合计仍取接口给出的 pv，不做猜测。
  assert.deepEqual(chart.total, [3, 5])
  const rows = buildActivityChartTableRows(chart)
  assert.equal(rows[0].web, '—')
  assert.equal(rows[0].miniprogram, '—')
  assert.equal(rows[1].web, '5')
})

test('null / 负数 / NaN / Infinity 全部收敛，不产生异常值', () => {
  const chart = normalizeActivityChartData(fullPayload({
    daily: [
      {
        date: '2026-11-10',
        pv: 6,
        uv: 4,
        webPv: null,
        webUv: Number.NaN,
        miniprogramPv: Number.POSITIVE_INFINITY,
        miniprogramUv: -5,
      },
    ],
  }))
  // 非法数值收敛为缺失（null），不是伪造的 0。
  assert.deepEqual(chart.series.web, [null])
  assert.deepEqual(chart.series.miniprogram, [null])
  assert.doesNotMatch(JSON.stringify(chart), /NaN|Infinity/)
  assert.equal(chart.total[0], 6)
})

test('非法与重复日期被忽略，合法日期保持服务端顺序', () => {
  const chart = normalizeActivityChartData(fullPayload({
    daily: [
      { date: '2026-11-12', pv: 1, uv: 1, webPv: 1, webUv: 1, miniprogramPv: 0, miniprogramUv: 0 },
      { date: 'not-a-date', pv: 9, uv: 9, webPv: 9, webUv: 9, miniprogramPv: 0, miniprogramUv: 0 },
      { date: '2026-11-10', pv: 2, uv: 2, webPv: 2, webUv: 2, miniprogramPv: 0, miniprogramUv: 0 },
      { date: '2026-11-12', pv: 99, uv: 99, webPv: 99, webUv: 99, miniprogramPv: 0, miniprogramUv: 0 },
    ],
  }))
  // 顺序跟随返回顺序（后端本就有序），重复日期只保留第一条。
  assert.deepEqual(chart.dates, ['2026-11-12', '2026-11-10'])
  assert.deepEqual(chart.series.web, [1, 2])
})

test('完全没有数据时返回 no-data，不生成 option', () => {
  const chart = normalizeActivityChartData({ days: 0, daily: [], channels: [] })
  assert.equal(chart.status, CHART_STATUS.NO_DATA)
  assert.equal(buildActivityChartOption(chart), null)
  assert.deepEqual(buildActivityChartTableRows(chart), [])

  const nullChart = normalizeActivityChartData(null)
  assert.equal(nullChart.status, CHART_STATUS.NO_DATA)
  assert.equal(buildActivityChartOption(nullChart), null)
})

test('请求失败时进入 error 状态，不残留上一次区间数据', () => {
  const chart = normalizeActivityChartData(fullPayload(), { error: '网络中断' })
  assert.equal(chart.status, CHART_STATUS.ERROR)
  assert.equal(chart.statusMessage, '网络中断')
  assert.equal(buildActivityChartOption(chart), null)
  assert.equal(buildChannelShareOption(chart), null)
  assert.deepEqual(chart.series.web, [])
})

test('分来源每日数据只在 channels[].daily 时也能绘制', () => {
  const chart = normalizeActivityChartData({
    startDate: '2026-11-10',
    endDate: '2026-11-11',
    totalPv: 9,
    totalUv: 5,
    daily: [
      { date: '2026-11-10', pv: 4, uv: 2 },
      { date: '2026-11-11', pv: 5, uv: 3 },
    ],
    channels: [
      {
        clientType: 'web',
        totalPv: 6,
        totalUv: 3,
        daily: [{ date: '2026-11-10', pv: 4, uv: 2 }, { date: '2026-11-11', pv: 2, uv: 1 }],
      },
      {
        clientType: 'miniprogram',
        totalPv: 3,
        totalUv: 2,
        daily: [{ date: '2026-11-10', pv: 0, uv: 0 }, { date: '2026-11-11', pv: 3, uv: 2 }],
      },
    ],
  })
  assert.equal(chart.status, CHART_STATUS.READY)
  assert.equal(chart.channelSource, 'channels')
  assert.deepEqual(chart.dates, ['2026-11-10', '2026-11-11'])
  assert.deepEqual(chart.series.web, [4, 2])
  assert.deepEqual(chart.series.miniprogram, [0, 3])
})

test('channels 只给合计时，每日对比明确提示缺少逐日数据而不是画全 0', () => {
  const chart = normalizeActivityChartData({
    days: 2,
    totalPv: 9,
    totalUv: 5,
    daily: [
      { date: '2026-11-10', pv: 4, uv: 2 },
      { date: '2026-11-11', pv: 5, uv: 3 },
    ],
    channels: [
      { clientType: 'web', totalPv: 6, totalUv: 3 },
      { clientType: 'miniprogram', totalPv: 3, totalUv: 2 },
    ],
  })
  assert.equal(chart.status, CHART_STATUS.UNAVAILABLE)
  assert.equal(chart.reason, 'daily-only')
  assert.match(chart.statusMessage, /合计/)
})

test('来源顺序颠倒时 daily 仍按字段名读取，channels 合计按 clientType 归位', () => {
  const payload = fullPayload()
  // 只颠倒 channels 数组顺序：clientType 始终是权威标识。
  payload.channels = [payload.channels[1], payload.channels[0]]
  const chart = normalizeActivityChartData(payload)
  // 每日数值来自 daily 的具名字段，与 channels 数组顺序无关。
  assert.deepEqual(chart.series.web, [10, 0, 0])
  assert.deepEqual(chart.series.miniprogram, [2, 5, 0])
  // 区间合计按 clientType 归位，不会因为数组顺序互换。
  assert.equal(chart.summary.web.pv, 10)
  assert.equal(chart.summary.miniprogram.pv, 7)
})

test('不认识的来源值被丢弃，不会被猜测成另一个来源', () => {
  const chart = normalizeActivityChartData({
    days: 1,
    totalPv: 5,
    channels: [
      { clientType: 'android', totalPv: 5, totalUv: 3 },
      { clientType: 'web', totalPv: 0, totalUv: 0 },
    ],
    daily: [{ date: '2026-11-10', pv: 5, uv: 3, webPv: 0, webUv: 0, miniprogramPv: 0, miniprogramUv: 0 }],
  })
  // android 的 5 次没有被归到网页端，也没有被归到微信小程序。
  assert.equal(chart.summary.web.pv, 0)
  assert.equal(chart.summary.miniprogram.pv, 0)
  assert.equal(chart.summary.total.pv, 5, '合计仍如实使用接口的 totalPv')
})

test('浏览次数占比只在数据完整、分母有效时展示，访客人数不计算占比', () => {
  const chart = normalizeActivityChartData(fullPayload())
  assert.equal(chart.pvShares.web, 58.8)
  assert.equal(chart.pvShares.miniprogram, 41.2)

  // 总量为 0 时没有占比。
  const zero = normalizeActivityChartData(fullPayload({
    totalPv: 0,
    totalUv: 0,
    channels: [
      { clientType: 'web', totalPv: 0, totalUv: 0 },
      { clientType: 'miniprogram', totalPv: 0, totalUv: 0 },
    ],
    daily: [{ date: '2026-11-10', pv: 0, uv: 0, webPv: 0, webUv: 0, miniprogramPv: 0, miniprogramUv: 0 }],
  }))
  assert.equal(zero.pvShares.web, null)
  assert.equal(zero.pvShares.miniprogram, null)
  assert.doesNotMatch(JSON.stringify(zero.pvShares), /NaN|Infinity/)

  // 访客人数侧没有占比字段可用。
  const uvChart = normalizeActivityChartData(fullPayload(), { metric: 'uv' })
  const rows = buildSummaryRows(uvChart)
  assert.ok(rows.every(row => row.share === null), '访客人数不计算占比')
  const pvRows = buildSummaryRows(chart)
  assert.equal(pvRows[0].share, 58.8)
})

test('访问来源条形图：两个来源、正确颜色与占比文案', () => {
  const chart = normalizeActivityChartData(fullPayload())
  const option = buildChannelShareOption(chart)
  assert.ok(option, '有数据时应生成来源条形图 option')
  assert.equal(option.series.length, 1)
  assert.equal(option.series[0].type, 'bar')
  assert.deepEqual(option.yAxis.data, ['网页端', '微信小程序'])
  assert.deepEqual(option.series[0].data.map(item => item.value), [10, 7])
  assert.deepEqual(option.series[0].data.map(item => item.itemStyle.color), ['#e11d48', '#0ea5e9'])
  assert.equal(option.xAxis.min, 0, '计数轴从 0 开始')
  // 横向条形图：x 轴是数值，y 轴是来源。
  assert.equal(option.xAxis.type, 'value')
  assert.equal(option.yAxis.type, 'category')
  assert.equal(option.yAxis.inverse, true, '网页端显示在顶部，符合阅读顺序')
  // 条形标签显示真实数字与单位；占比在 tooltip / 明细中展示，不重复在条形上。
  const label = option.series[0].label.formatter({ dataIndex: 0 })
  assert.match(label, /10 次/)
  assert.doesNotMatch(label, /%/)
  // 占比仍通过 tooltip 与 aria 提供。
  const tipHtml = option.tooltip.formatter({ dataIndex: 0 })
  assert.match(tipHtml, /浏览次数占比 58\.8%/)
  assert.match(option.aria.label.description, /浏览次数占比 58\.8%/)
  // 文案不出现 PV / UV / 渠道。
  assert.doesNotMatch(JSON.stringify(option), /PV|UV|"渠道"|Web 网页端|微信小程序端/)
})

test('访问来源条形图在访客人数下不显示占比', () => {
  const chart = normalizeActivityChartData(fullPayload(), { metric: 'uv' })
  const option = buildChannelShareOption(chart)
  assert.ok(option)
  assert.deepEqual(option.series[0].data.map(item => item.value), [5, 4])
  const label = option.series[0].label.formatter({ dataIndex: 0 })
  assert.match(label, /5 人/)
  assert.doesNotMatch(label, /%/)
})

test('趋势折线图包含全部来源 + 两个来源三条线，全部来源是虚线', () => {
  const chart = normalizeActivityChartData(fullPayload())
  const option = buildActivityChartOption(chart)

  assert.equal(option.series.length, 3)
  assert.deepEqual(option.series.map(series => series.name), ['全部来源', '网页端', '微信小程序'])
  assert.deepEqual(option.series.map(series => series.type), ['line', 'line', 'line'])
  // 全部来源用中性虚线，来源用实线。
  assert.equal(option.series[0].lineStyle.type, 'dashed')
  assert.equal(option.series[0].lineStyle.color, '#64748b')
  assert.equal(option.series[1].lineStyle.type, 'solid')
  assert.equal(option.series[1].lineStyle.color, '#e11d48')
  assert.equal(option.series[2].lineStyle.color, '#0ea5e9')
  // 计数轴从 0 开始，单位正确。
  assert.equal(option.yAxis.min, 0)
  assert.equal(option.yAxis.name, '浏览次数（次）')
  assert.deepEqual(option.series[0].data, [12, 5, 0])
  assert.deepEqual(option.series[1].data, [10, 0, 0])
  assert.deepEqual(option.series[2].data, [2, 5, 0])
  assert.deepEqual(option.xAxis.data, ['11-10', '11-11', '11-12'])
})

test('每日对比使用网页端与微信小程序两组柱子，不堆叠', () => {
  const chart = normalizeActivityChartData(fullPayload(), { trendView: TREND_VIEW_BAR })
  const option = buildActivityChartOption(chart)

  assert.equal(option.series.length, 2, '每日对比只有两个来源系列')
  assert.deepEqual(option.series.map(series => series.name), ['网页端', '微信小程序'])
  assert.deepEqual(option.series.map(series => series.type), ['bar', 'bar'])
  assert.ok(option.series.every(series => !series.stack), '不能堆叠，避免错误理解')
  assert.deepEqual(option.series[0].data, [10, 0, 0])
  assert.deepEqual(option.series[1].data, [2, 5, 0])
  assert.deepEqual(option.series.map(series => series.itemStyle.color), ['#e11d48', '#0ea5e9'])
})

test('浏览次数与访客人数切换使用对应字段与单位，且不改变来源颜色', () => {
  const payload = fullPayload()
  const pvOption = buildActivityChartOption(normalizeActivityChartData(payload, { metric: 'pv' }))
  const uvOption = buildActivityChartOption(normalizeActivityChartData(payload, { metric: 'uv' }))

  assert.deepEqual(pvOption.series[1].data, [10, 0, 0])
  assert.deepEqual(uvOption.series[1].data, [5, 0, 0])
  assert.deepEqual(uvOption.series[2].data, [1, 3, 0])
  assert.equal(uvOption.yAxis.name, '访客人数（人）')
  // 颜色与名称保持一致的来源识别方式。
  assert.deepEqual(
    uvOption.series.map(series => series.lineStyle.color),
    pvOption.series.map(series => series.lineStyle.color),
  )
  // UV 提示不能把每日 UV 相加。
  const uvChart = normalizeActivityChartData(payload, { metric: 'uv' })
  assert.match(uvChart.notes.join(' '), /不能把每天或两个来源的访客人数相加/)
})

test('tooltip 显示完整日期、星期、全部来源与两个来源', () => {
  const chart = normalizeActivityChartData(fullPayload())
  const formatter = createActivityChartTooltipFormatter(chart)
  const html = formatter([{ dataIndex: 1 }])

  assert.match(html, /2026-11-11/)
  assert.match(html, /周三/)
  assert.match(html, /全部来源/)
  assert.match(html, /网页端/)
  assert.match(html, /微信小程序/)
  assert.match(html, /浏览次数/)
  // 数值完整千位分隔，不出现 k / w 缩写。
  assert.doesNotMatch(html, /PV|UV|渠道/)
  assert.doesNotMatch(html, /NaN|Infinity|undefined|null/)

  // 大数字在 tooltip 中保留完整千位分隔。
  const big = normalizeActivityChartData(fullPayload({
    daily: [{ date: '2026-11-10', pv: 12345, uv: 6000, webPv: 12000, webUv: 5000, miniprogramPv: 345, miniprogramUv: 1000 }],
  }))
  const bigHtml = createActivityChartTooltipFormatter(big)([{ dataIndex: 0 }])
  assert.match(bigHtml, /12,000/)
})

test('tooltip 在访客人数下明确说明不能相加', () => {
  const chart = normalizeActivityChartData(fullPayload(), { metric: 'uv' })
  const html = createActivityChartTooltipFormatter(chart)([{ dataIndex: 0 }])
  assert.match(html, /访客人数/)
  assert.match(html, /不能相加/)
})

test('tooltip formatter 对异常索引与空数据安全', () => {
  const chart = normalizeActivityChartData(fullPayload())
  const formatter = createActivityChartTooltipFormatter(chart)
  assert.doesNotThrow(() => formatter([]))
  assert.equal(formatter([]), '')
  const outOfRange = formatter([{ dataIndex: 99 }])
  assert.equal(typeof outOfRange, 'string')
  assert.doesNotMatch(outOfRange, /NaN|Infinity|undefined/)

  const empty = normalizeActivityChartData({ daily: [], channels: [] })
  assert.equal(createActivityChartTooltipFormatter(empty)([{ dataIndex: 0 }]), '')
})

test('日期较多时减少 x 轴标签并隐藏柱顶数值', () => {
  const daily = Array.from({ length: 40 }, (_, index) => ({
    date: `2026-10-${String(index + 1).padStart(2, '0')}`,
    pv: index + 1,
    uv: 1,
    webPv: index + 1,
    webUv: 1,
    miniprogramPv: 0,
    miniprogramUv: 0,
  }))
  const chart = normalizeActivityChartData({ days: 40, totalPv: 820, daily }, { trendView: TREND_VIEW_BAR })
  const option = buildActivityChartOption(chart)

  assert.ok(option.xAxis.axisLabel.interval > 0, '日期较多时应减少标签')
  assert.equal(option.series[0].label.show, false, '日期较多时不应显示所有柱顶数值')
  assert.equal(option.xAxis.axisLabel.hideOverlap, true)
})

test('1 到 7 天显示完整日期与柱顶数值', () => {
  const chart = normalizeActivityChartData(fullPayload(), { trendView: TREND_VIEW_BAR })
  const option = buildActivityChartOption(chart)
  assert.equal(option.xAxis.axisLabel.interval, 0)
  assert.equal(option.series[0].label.show, true)
  assert.equal(resolveAxisLabelInterval(7), 0)
  assert.ok(resolveAxisLabelInterval(30) > 0)
})

test('坐标轴数字使用“万”，tooltip 保留完整数值', () => {
  assert.equal(formatChartAxisNumber(0), '0')
  assert.equal(formatChartAxisNumber(999), '999')
  assert.equal(formatChartAxisNumber(1234), '1234')
  assert.equal(formatChartAxisNumber(12000), '1.2万')
  assert.equal(formatChartAxisNumber(null), '0')
  assert.equal(formatChartAxisNumber(Number.NaN), '0')
  assert.doesNotMatch(formatChartAxisNumber(12000), /k|w/)
})

test('计数收敛函数对异常输入安全', () => {
  assert.equal(toChartCount(null), 0)
  assert.equal(toChartCount(undefined), 0)
  assert.equal(toChartCount(''), 0)
  assert.equal(toChartCount('12'), 12)
  assert.equal(toChartCount(-3), 0)
  assert.equal(toChartCount(Number.NaN), 0)
  assert.equal(toChartCount(Number.POSITIVE_INFINITY), 0)
  assert.equal(toChartCount(3.6), 4)
  assert.equal(toChartCountOrNull(null), null)
  assert.equal(toChartCountOrNull(-1), null)
  assert.equal(toChartCountOrNull(0), 0)
})

test('指标与趋势形式参数归一化', () => {
  assert.equal(normalizeChartMetric('uv'), 'uv')
  assert.equal(normalizeChartMetric('unknown'), 'pv')
  assert.equal(normalizeChartMetric(undefined), 'pv')
  assert.equal(normalizeTrendView('bar'), TREND_VIEW_BAR)
  assert.equal(normalizeTrendView('line'), TREND_VIEW_LINE)
  assert.equal(normalizeTrendView('other'), TREND_VIEW_LINE)
  assert.equal(findTrendView('bar').label, '每日对比')
  assert.equal(findTrendView('line').label, '趋势')
})

test('文字明细表提供等价数据，缺失显示破折号', () => {
  const daily = buildActivityChartTableRows(normalizeActivityChartData(fullPayload()))
  assert.equal(daily.length, 3)
  assert.equal(daily[0].label, '2026-11-10')
  assert.equal(daily[0].weekday, '周二')
  assert.equal(daily[0].web, '10')
  assert.equal(daily[0].miniprogram, '2')
  assert.equal(daily[0].total, '12')
  assert.doesNotMatch(JSON.stringify(daily), /NaN|Infinity|undefined|null/)
})

test('isChannelAwareDay 只在字段存在时判定为支持来源', () => {
  assert.equal(isChannelAwareDay({ date: '2026-11-10', pv: 1 }), false)
  assert.equal(isChannelAwareDay({ date: '2026-11-10', webPv: 1 }), true)
  assert.equal(isChannelAwareDay({ date: '2026-11-10', miniprogramUv: null }), true)
  assert.equal(isChannelAwareDay(null), false)
})

test('option 带 aria 描述，且区间合计来自真实接口值', () => {
  const chart = normalizeActivityChartData(fullPayload())
  const option = buildActivityChartOption(chart)
  assert.equal(option.aria.enabled, true)
  assert.match(option.aria.label.description, /访问趋势折线图/)
  assert.match(option.aria.label.description, /网页端/)
  assert.match(option.aria.label.description, /微信小程序/)
  // 区间合计必须对应接口 totalPv，而不是把每日数值累加后换名字。
  assert.match(option.aria.label.description, /所选时间合计 17 次/)
  assert.doesNotMatch(option.aria.label.description, /PV|UV|渠道/)

  const uvChart = normalizeActivityChartData(fullPayload(), { metric: 'uv' })
  const uvOption = buildActivityChartOption(uvChart)
  assert.match(uvOption.aria.label.description, /所选时间合计 9 人/)
  assert.match(uvOption.aria.label.description, /去重值/)
})

test('aria 描述在缺少区间合计时不臆造数字', () => {
  const payload = fullPayload()
  delete payload.totalUv
  const chart = normalizeActivityChartData(payload, { metric: 'uv' })
  assert.match(chart.ariaDescription, /所选时间合计暂不可用/)
  assert.doesNotMatch(chart.ariaDescription, /NaN|Infinity|undefined/)
})

test('超过 31 天启用 dataZoom，短区间不启用', () => {
  const makeDaily = (count) => Array.from({ length: count }, (_, index) => {
    const day = String((index % 28) + 1).padStart(2, '0')
    const month = String(11 + Math.floor(index / 28)).padStart(2, '0')
    return { date: `2026-${month}-${day}`, pv: index + 1, uv: 1, webPv: index + 1, webUv: 1, miniprogramPv: 0, miniprogramUv: 0 }
  })

  const short = buildActivityChartOption(normalizeActivityChartData({ days: 7, daily: makeDaily(7) }))
  assert.equal(short.dataZoom, undefined, '短区间不应出现 dataZoom，避免占用垂直空间')

  const long = buildActivityChartOption(normalizeActivityChartData({ days: 60, daily: makeDaily(60) }))
  assert.ok(Array.isArray(long.dataZoom) && long.dataZoom.length === 2, '长区间应启用 inside + slider dataZoom')
  assert.equal(long.dataZoom[0].type, 'inside')
  assert.equal(long.dataZoom[1].type, 'slider')
  // 默认窗口聚焦最近 31 天，而不是把 60 天全挤在一屏。
  assert.ok(long.dataZoom[0].start > 0, `默认 start 应大于 0，实际 ${long.dataZoom[0].start}`)
  assert.equal(long.dataZoom[0].end, 100)
  // 底部为 slider 预留空间，避免遮挡 x 轴标签。
  assert.ok(long.grid.bottom >= 36)
  // dataZoom 场景下仍然不显示柱顶数值。
  assert.equal(long.xAxis.axisLabel.hideOverlap, true)
})

test('1 天数据、全 0、单来源、极大值与极小值都不产生异常 option', () => {
  const oneDay = normalizeActivityChartData({
    days: 1,
    totalPv: 1,
    totalUv: 1,
    daily: [{ date: '2026-11-17', pv: 1, uv: 1, webPv: 1, webUv: 1, miniprogramPv: 0, miniprogramUv: 0 }],
    channels: [{ clientType: 'web', totalPv: 1, totalUv: 1 }, { clientType: 'miniprogram', totalPv: 0, totalUv: 0 }],
  })
  assert.equal(oneDay.status, CHART_STATUS.READY)
  assert.deepEqual(oneDay.series.web, [1])
  const oneDayOption = buildActivityChartOption(oneDay)
  assert.ok(oneDayOption)
  assert.doesNotMatch(JSON.stringify(oneDayOption), /NaN|Infinity/)

  const extremes = normalizeActivityChartData(fullPayload({
    days: 2,
    totalPv: 9999999,
    totalUv: 5,
    daily: [
      { date: '2026-11-10', pv: 9999999, uv: 5, webPv: 9999999, webUv: 5, miniprogramPv: 0, miniprogramUv: 0 },
      { date: '2026-11-11', pv: 0, uv: 0, webPv: 0, webUv: 0, miniprogramPv: 0, miniprogramUv: 0 },
    ],
  }))
  const extremeOption = buildActivityChartOption(extremes)
  assert.ok(extremeOption)
  assert.doesNotMatch(JSON.stringify(extremeOption), /NaN|Infinity/)
  const yAxis = extremeOption.yAxis.axisLabel.formatter
  assert.equal(yAxis(9999999), '999.9999万'.slice(0, 0) + yAxis(9999999))
  assert.doesNotMatch(yAxis(9999999), /k|w/)
})

test('所有生成文案都不出现 PV / UV / Web / 渠道 / 环比 / 区间汇总', () => {
  const chart = normalizeActivityChartData(fullPayload())
  const texts = [
    chart.statusTitle,
    chart.statusMessage,
    chart.ariaDescription,
    ...chart.notes,
    JSON.stringify(buildActivityChartOption(chart)),
    JSON.stringify(buildChannelShareOption(chart)),
    ...buildActivityChartTableRows(chart).map(row => JSON.stringify(row)),
    ...buildSummaryRows(chart).map(row => JSON.stringify(row)),
    createActivityChartTooltipFormatter(chart)([{ dataIndex: 0 }]),
  ].join(' ')

  const forbidden = [/PV/, /UV/, /Web 网页端/, /微信小程序端/, /渠道/, /环比/, /区间汇总/, /Asia\/Shanghai/]
  for (const pattern of forbidden) {
    assert.doesNotMatch(texts, pattern, `不应出现 ${pattern}`)
  }
  assert.match(texts, /浏览次数/)
  assert.match(texts, /网页端/)
  assert.match(texts, /微信小程序/)

  // 访客人数维度同样不出现旧缩写。
  const uvChart = normalizeActivityChartData(fullPayload(), { metric: 'uv' })
  const uvTexts = [
    uvChart.ariaDescription,
    ...uvChart.notes,
    JSON.stringify(buildActivityChartOption(uvChart)),
    JSON.stringify(buildChannelShareOption(uvChart)),
    createActivityChartTooltipFormatter(uvChart)([{ dataIndex: 0 }]),
  ].join(' ')
  for (const pattern of forbidden) {
    assert.doesNotMatch(uvTexts, pattern, `访客人数维度不应出现 ${pattern}`)
  }
  assert.match(uvTexts, /访客人数/)
})

test('减少动态效果偏好会关闭图表动画', () => {
  const chart = normalizeActivityChartData(fullPayload())
  const normal = buildActivityChartOption(chart)
  assert.equal(normal.animation, true)
  assert.ok(normal.animationDuration > 0)

  try {
    setActivityChartReducedMotion(true)
    assert.equal(isActivityChartReducedMotion(), true)
    const reduced = buildActivityChartOption(chart)
    assert.equal(reduced.animation, false, '命中减少动态效果时关闭动画')
    assert.equal(reduced.animationDuration, 0)
    const source = buildChannelShareOption(chart)
    assert.equal(source.animation, false)
  } finally {
    setActivityChartReducedMotion(false)
  }
  assert.equal(buildActivityChartOption(chart).animation, true, '恢复后重新开启动画')
})
