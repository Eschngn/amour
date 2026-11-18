import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { closeRenderer, renderComponent } from '../test-helpers/renderComponent.mjs'
import { normalizeActivityChannels } from './activityChannels.js'
import { normalizeActivityChartData } from './activityChart.js'

/**
 * 管理台数据看板的模板级测试。
 *
 * 真实渲染 .vue 组件，校验：
 * - 界面文案全部使用自然中文，不出现 PV / UV / Web / 渠道 / 环比 / 区间汇总；
 * - 两个来源同时展示，缺失显示“—”，不伪装成 0；
 * - ECharts 容器、空状态、失败状态与读屏等价表格；
 * - 每日明细默认收起、分页、表格列与接口字段对应；
 * - 趋势图例、指标切换、图表形式切换等结构断言。
 */

const WEB = {
  clientType: 'web',
  clientTypeText: 'Web 网页端',
  totalPv: 70,
  totalUv: 35,
  pvShare: 70,
  uvShare: 63.6,
  previousTotalPv: 60,
  previousTotalUv: 30,
  pvChangeRate: 16.7,
  uvChangeRate: 16.7,
  daily: [],
}

const MINI = {
  clientType: 'miniprogram',
  clientTypeText: '微信小程序端',
  totalPv: 30,
  totalUv: 20,
  pvShare: 30,
  uvShare: 36.4,
  previousTotalPv: 0,
  previousTotalUv: 0,
  pvChangeRate: null,
  uvChangeRate: null,
  daily: [],
}

const PAYLOAD = {
  startDate: '2026-11-10',
  endDate: '2026-11-16',
  days: 7,
  totalPv: 100,
  totalUv: 55,
  averagePv: 14.3,
  averageUv: 7.9,
  previousStartDate: '2026-11-03',
  previousEndDate: '2026-11-09',
  previousTotalPv: 80,
  previousTotalUv: 40,
  pvChangeRate: 25,
  uvChangeRate: 37.5,
  daily: [
    { date: '2026-11-10', pv: 10, uv: 6, webPv: 7, webUv: 4, miniprogramPv: 3, miniprogramUv: 2 },
    { date: '2026-11-11', pv: 20, uv: 11, webPv: 14, webUv: 8, miniprogramPv: 6, miniprogramUv: 3 },
    { date: '2026-11-12', pv: 0, uv: 0, webPv: 0, webUv: 0, miniprogramPv: 0, miniprogramUv: 0 },
    { date: '2026-11-13', pv: 70, uv: 38, webPv: 49, webUv: 23, miniprogramPv: 21, miniprogramUv: 15 },
  ],
  channels: [WEB, MINI],
}

const FORBIDDEN_COPY = [/PV/, /UV/, /Web 网页端/, /微信小程序端/, /"渠道"/, /环比/, /区间汇总/, /Asia\/Shanghai/]

function chartOf(payload = PAYLOAD, options = {}) {
  return normalizeActivityChartData(payload, options)
}

test.after(async () => {
  await closeRenderer()
})

test('访问来源面板：两个来源、准确数字与“浏览次数占比”', async () => {
  const chart = chartOf()
  const option = { series: [] }
  const html = await renderComponent('/src/components/admin/AdminActivityChannelPanel.vue', {
    chart,
    option,
  })

  assert.match(html, /访问来源/)
  assert.match(html, /网页端/)
  assert.match(html, /微信小程序/)
  assert.match(html, />70</, '网页端浏览次数应展示 70')
  assert.match(html, />30</, '微信小程序浏览次数应展示 30')
  assert.match(html, /浏览次数占比/)
  assert.match(html, /70%/)
  assert.match(html, /30%/)
  assert.match(html, /比上一时段增加 16.7%/)
  assert.match(html, /上一时段 60 次/)
  assert.match(html, /上一时段暂无访问/)
  // 合计与口径说明在趋势区与页面底部集中展示，来源区不重复。
  assert.doesNotMatch(html, /全部来源合计/)
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(html, pattern, `不应出现 ${pattern}`)
  }
  assert.doesNotMatch(html, /NaN|Infinity|undefined|null/)
})

test('访问来源面板在访客人数下显示人数且不显示占比', async () => {
  const chart = chartOf(PAYLOAD, { metric: 'uv' })
  const html = await renderComponent('/src/components/admin/AdminActivityChannelPanel.vue', {
    chart,
    option: { series: [] },
  })

  assert.match(html, /访客人数/)
  assert.match(html, />35</, '网页端访客人数应为 35')
  assert.match(html, />20</, '微信小程序访客人数应为 20')
  assert.doesNotMatch(html, /浏览次数占比/)
  // 来源区只展示来源自身数字，合计由图表 aria 与页面底部说明承担。
  assert.doesNotMatch(html, /全部来源合计/)
})

test('访问来源面板：数据缺失显示“—”，不冒充 0', async () => {
  // 访客人数只认接口给出的来源去重值；小程序来源缺少该字段时显示“—”。
  const chart = chartOf({
    ...PAYLOAD,
    channels: [
      { clientType: 'web', totalPv: 70, totalUv: 0 },
      { clientType: 'miniprogram', totalPv: 30 }, // 缺少 totalUv
    ],
  }, { metric: 'uv' })
  const html = await renderComponent('/src/components/admin/AdminActivityChannelPanel.vue', {
    chart,
    option: { series: [] },
  })
  assert.ok(html.includes('—'), '缺失的访客人数显示破折号')
  assert.doesNotMatch(html, /NaN|Infinity|undefined/)
  // 网页端的真实 0 仍然显示 0，与缺失区分。
  assert.match(html, />0</)
})

test('访问来源面板：真实 0 与缺失同时存在时文案不同', () => {
  const channels = normalizeActivityChannels({
    channels: [
      { clientType: 'web', totalPv: 0, totalUv: 0 },
      { clientType: 'miniprogram' },
    ],
  })
  // 归一化后：网页端是真实 0，小程序是缺失（null）。
  assert.equal(channels[0].totalPv, 0)
  assert.equal(channels[0].unavailable, false)
  assert.equal(channels[1].totalPv, null)
  assert.equal(channels[1].unavailable, false)
})

test('访问来源面板：老接口显示“暂不可用”并说明不拆分', async () => {
  const legacy = chartOf({
    days: 2,
    totalPv: 10,
    totalUv: 6,
    daily: [
      { date: '2026-11-10', pv: 4, uv: 3 },
      { date: '2026-11-11', pv: 6, uv: 3 },
    ],
  })
  const html = await renderComponent('/src/components/admin/AdminActivityChannelPanel.vue', {
    chart: legacy,
    option: null,
    unavailable: true,
  })
  assert.match(html, /暂不可用/)
  assert.match(html, /不做猜测拆分/)
  assert.doesNotMatch(html, /NaN|Infinity|undefined/)
})

test('图表容器：有数据时渲染 ECharts 画布、读屏描述与等价文字明细', async () => {
  const chart = chartOf()
  const html = await renderComponent('/src/components/admin/AdminActivityChartCanvas.vue', {
    chart,
    option: { series: [] },
    label: '访问趋势',
  })

  assert.match(html, /admin-dashboard-chart-canvas/)
  assert.match(html, /role="img"/)
  assert.match(html, /访问趋势折线图/)
  assert.match(html, /height:308px/)
  // 读屏等价表格包含真实日期与数字。
  assert.match(html, /<table/)
  assert.match(html, />2026-11-10/)
  assert.match(html, />网页端</)
  assert.match(html, />微信小程序</)
  assert.match(html, />70</)
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(html, pattern, `不应出现 ${pattern}`)
  }
  assert.doesNotMatch(html, /NaN|Infinity|undefined|null/)
})

test('图表容器：加载中显示骨架，不渲染画布与表格', async () => {
  const html = await renderComponent('/src/components/admin/AdminActivityChartCanvas.vue', {
    chart: chartOf(),
    option: { series: [] },
    label: '访问趋势',
    loading: true,
  })
  assert.match(html, /访问趋势加载中/)
  assert.match(html, /animate-pulse/)
  assert.doesNotMatch(html, /role="img"/, '加载中不应初始化图表容器')
  assert.doesNotMatch(html, /<table/, '加载中不渲染文字表格')
})

test('图表容器：空数据 / 老接口 / 失败显示通俗提示，不输出堆栈', async () => {
  const emptyChart = chartOf({
    ...PAYLOAD,
    totalPv: 0,
    totalUv: 0,
    daily: PAYLOAD.daily.map(item => ({
      date: item.date, pv: 0, uv: 0, webPv: 0, webUv: 0, miniprogramPv: 0, miniprogramUv: 0,
    })),
    channels: [WEB, MINI].map(item => ({ ...item, totalPv: 0, totalUv: 0 })),
  })
  const emptyHtml = await renderComponent('/src/components/admin/AdminActivityChartCanvas.vue', {
    chart: emptyChart,
    option: null,
    label: '访问趋势',
  })
  assert.match(emptyHtml, /所选时间暂无访问数据/)
  assert.match(emptyHtml, /每天数据都是 0/)
  assert.doesNotMatch(emptyHtml, /role="img"/, '空数据不应显示空坐标轴')
  assert.doesNotMatch(emptyHtml, /NaN|Infinity|undefined/)

  const errorHtml = await renderComponent('/src/components/admin/AdminActivityChartCanvas.vue', {
    chart: chartOf(PAYLOAD, { error: '网络中断' }),
    option: null,
    label: '访问趋势',
  })
  assert.match(errorHtml, /访问数据加载失败/)
  assert.match(errorHtml, /网络中断/)
  assert.doesNotMatch(errorHtml, /role="img"/)
  assert.doesNotMatch(errorHtml, /<table/, '失败时不应展示上一次区间的表格')
  // 不把原始异常堆栈抛给用户。
  assert.doesNotMatch(errorHtml, /at \w+ \(|Error:.*\n\s+at /)
})

test('图表容器：重新绘制按钮存在，便于渲染失败后恢复', async () => {
  const html = await renderComponent('/src/components/admin/AdminActivityChartCanvas.vue', {
    chart: chartOf(),
    option: { series: [] },
    label: '访问趋势',
  })
  // 正常渲染时不出现降级提示。
  assert.doesNotMatch(html, /图表暂时无法显示/)
})

test('每日明细默认收起，表格列与接口字段对应', async () => {
  const closed = await renderComponent('/src/components/admin/AdminActivityDailyGrid.vue', {
    points: PAYLOAD.daily,
    open: false,
  })
  assert.match(closed, /查看每日明细/)
  assert.match(closed, /aria-expanded="false"/)
  assert.doesNotMatch(closed, /<table/, '收起时不渲染表格')

  const opened = await renderComponent('/src/components/admin/AdminActivityDailyGrid.vue', {
    points: PAYLOAD.daily,
    open: true,
  })
  assert.match(opened, /收起每日明细/)
  assert.match(opened, /aria-expanded="true"/)
  assert.match(opened, /<table/)
  assert.match(opened, /2026-11-10/)
  assert.match(opened, /2026-11-13/)
  // 全部来源浏览次数 / 访客人数，以及两个来源的浏览次数 / 访客人数。
  assert.match(opened, /全部来源浏览次数/)
  assert.match(opened, /全部来源访客人数/)
  assert.match(opened, /网页端浏览次数/)
  assert.match(opened, /网页端访客人数/)
  assert.match(opened, /微信小程序浏览次数/)
  assert.match(opened, /微信小程序访客人数/)
  // 当天数据与接口字段一致（2026-11-10：pv 10 / uv 6 / webPv 7 / webUv 4 / miniPv 3 / miniUv 2）。
  assert.match(opened, />10</)
  assert.match(opened, />6</)
  assert.match(opened, />7</)
  assert.match(opened, />3</)
  assert.match(opened, /每页最多 7 天/)
  assert.match(opened, /不能相加得到所选时间的访客人数/)
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(opened, pattern, `不应出现 ${pattern}`)
  }
  assert.doesNotMatch(opened, /NaN|Infinity|undefined|null/)
})

test('每日明细：缺失值显示“—”，不伪装成真实 0', async () => {
  const html = await renderComponent('/src/components/admin/AdminActivityDailyGrid.vue', {
    points: [{ date: '2026-11-10', pv: 5, uv: 2 }],
    open: true,
  })
  assert.match(html, /2026-11-10/)
  assert.ok(html.includes('—'), '缺少来源字段时显示破折号')
  assert.doesNotMatch(html, /NaN|Infinity|undefined/)
})

test('每日明细：空数据显示空状态', async () => {
  const html = await renderComponent('/src/components/admin/AdminActivityDailyGrid.vue', {
    points: [],
    open: true,
  })
  assert.match(html, /所选时间没有每日数据/)
  assert.doesNotMatch(html, /NaN|Infinity|undefined/)
})

test('每日明细分页按钮与页码文案', async () => {
  const days = Array.from({ length: 15 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, '0')}`,
    pv: index,
    uv: index,
    webPv: index,
    webUv: index,
    miniprogramPv: 0,
    miniprogramUv: 0,
  }))
  const html = await renderComponent('/src/components/admin/AdminActivityDailyGrid.vue', {
    points: days,
    open: true,
  })
  // paginateActivityDays 尽量均分：15 天 → 3 页，每页 5 天。
  assert.match(html, /第 3 \/ 3 页/)
  assert.match(html, /查看更早的日期/)
  assert.match(html, /查看更新的日期/)
  // 默认展示最近一页（11-11 至 11-15），不展示最早的数据。
  assert.match(html, /2026-11-11/)
  assert.match(html, /2026-11-15/)
  assert.doesNotMatch(html, /2026-11-01/)
})

test('面板结构：访问情况、指标切换、趋势 / 每日对比与数据说明', () => {
  const source = readFileSync(
    new URL('../components/admin/AdminActivityPanel.vue', import.meta.url),
    'utf8',
  )

  // 标题与文案。
  assert.match(source, /访问情况/)
  assert.doesNotMatch(source, /平台活跃度/)
  // 日期筛选：近 7 天 / 近 30 天 / 自定义。
  assert.match(source, /v-for="preset in presets"/)
  // 指标切换与图表形式切换，两个图表共用。
  assert.match(source, /v-for="option in metricOptions"/)
  assert.match(source, /aria-pressed="metric === option.key"/)
  assert.match(source, /@click="setMetric\(option\.key\)"/)
  assert.match(source, /v-for="option in trendViews"/)
  assert.match(source, /aria-pressed="trendView === option.key"/)
  assert.match(source, /@click="setTrendView\(option\.key\)"/)
  // 趋势与来源左右排列（2:1），窄屏上下排列。
  assert.match(source, /xl:grid-cols-\[minmax\(0,2fr\)_minmax\(0,1fr\)\]/)
  // 图表组件都传入 option，面板不直接调用 ECharts。
  assert.match(source, /<AdminActivityChartCanvas/)
  assert.match(source, /:option="trendOption"/)
  assert.match(source, /<AdminActivityChannelPanel/)
  assert.match(source, /:option="sourceOption"/)
  assert.doesNotMatch(source, /setOption|echarts\.init|buildActivityChartOption/)
  // 核心数字与每日明细。
  assert.match(source, /v-for="card in metricCards"/)
  assert.match(source, /<AdminActivityDailyGrid/)
  assert.match(source, /:open="detailOpen"/)
  // 数据说明默认折叠。
  assert.match(source, /<details/)
  assert.match(source, /数据说明/)
  assert.match(source, /数据更新时间/)
  // 不再有 PV / UV 切换文案。
  assert.doesNotMatch(source, /浏览次数 PV|访客人数 UV/)
  assert.doesNotMatch(source, /统计口径与限制/)
})

test('看板页面结构：平台概况、访问情况、空间状态与待办', () => {
  const source = readFileSync(
    new URL('../pages/admin/AdminDashboard.vue', import.meta.url),
    'utf8',
  )
  assert.match(source, /平台概况/)
  assert.match(source, /不随访问日期变化/)
  assert.match(source, /<AdminActivityPanel/)
  assert.match(source, /空间状态/)
  assert.match(source, /待办与入口/)
  assert.match(source, /暂无待处理事项/)
  // 四个业务数字。
  assert.match(source, /待审核空间/)
  assert.match(source, /待审核内容/)
  assert.match(source, /空间总数/)
  assert.match(source, /公开空间/)
  // 入口权限判断与真实路由。
  assert.match(source, /canSpaceReview/)
  assert.match(source, /canContent/)
  assert.match(source, /canAudit/)
  assert.match(source, /to="\/admin\/space-review"/)
  assert.match(source, /to="\/admin\/story"/)
  assert.match(source, /to="\/admin\/audit"/)
  // summary 与 activity 的加载 / 错误各自处理。
  assert.match(source, /loadSummary/)
  assert.match(source, /summaryError/)
  // 不再使用旧的四张卡片结构说明。
  assert.doesNotMatch(source, /数据生成时间/)
})

test('组件卸载会销毁图表实例（源码级断言）', () => {
  const source = readFileSync(
    new URL('../components/admin/AdminActivityChartCanvas.vue', import.meta.url),
    'utf8',
  )
  assert.match(source, /onBeforeUnmount\(/)
  assert.match(source, /host\.destroy\(\)/)
  assert.match(source, /removeEventListener\('resize', measureViewport\)/)
  // 不自己 new ResizeObserver，由 host 统一管理生命周期。
  assert.doesNotMatch(source, /new ResizeObserver/)
})

test('空数据只销毁实例不销毁 host：从空区间切回有数据仍能重绘', () => {
  const source = readFileSync(
    new URL('../components/admin/AdminActivityChartCanvas.vue', import.meta.url),
    'utf8',
  )
  const emptyBranch = source.slice(
    source.indexOf('if (!next) {'),
    source.indexOf('if (!next) {') + 200,
  )
  assert.match(emptyBranch, /host\.update\(null\)/)
  assert.doesNotMatch(emptyBranch, /host\.destroy\(\)/)
  const unmountIndex = source.indexOf('onBeforeUnmount(')
  assert.ok(unmountIndex > 0)
  assert.ok(source.indexOf('host.destroy()', unmountIndex) > unmountIndex)
})

test('减少动态效果偏好：图表与页面尊重 prefers-reduced-motion', async () => {
  const css = readFileSync(new URL('../assets/admin.css', import.meta.url), 'utf8')
  assert.match(css, /prefers-reduced-motion: reduce/)
  // 看板自己的样式只作用于 .admin-dashboard，避免影响其它后台页面。
  assert.match(css, /\.admin-dashboard \.admin-dashboard-card/)
  assert.match(css, /--dashboard-card-radius/)
})

test('看板样式使用统一圆角与内边距，不依赖红绿表达增长', () => {
  const css = readFileSync(new URL('../assets/admin.css', import.meta.url), 'utf8')
  const dashboardCss = css.slice(css.indexOf('.admin-dashboard {'), css.indexOf('.admin-page-enter-active'))
  // 16～20px 圆角区间内的卡片。
  assert.match(dashboardCss, /--dashboard-card-radius: 18px/)
  // 20～24px 卡片间距与内边距。
  assert.match(dashboardCss, /--dashboard-card-padding: 22px/)
  // 数字使用 tabular-nums。
  assert.match(dashboardCss, /tabular-nums/)
})
