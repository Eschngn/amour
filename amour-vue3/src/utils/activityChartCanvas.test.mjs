import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { closeRenderer, renderComponent } from '../test-helpers/renderComponent.mjs'
import {
  CHART_STATUS,
  buildActivityChartOption,
  buildChannelShareOption,
  normalizeActivityChartData,
} from './activityChart.js'
import { normalizeActivityChannels } from './activityChannels.js'

/**
 * 运行：npm test（含 test:admin-activity）
 *
 * ECharts 图表容器的工程契约：
 * - 生命周期：初始化 / 更新 / resize / 销毁由 activityChartHost 统一管理，
 *   组件只在卸载时 destroy，空数据只销毁实例（host 可复用）；
 * - 首次加载骨架、刷新提示、空状态、失败状态、渲染失败降级；
 * - 读屏等价表格 + 键盘可操作控件 + 减少动态效果；
 * - 容器高度、响应式高度与 aria 文案。
 *
 * 实例级别的 init / setOption / resize / dispose 行为由 activityChartHost.test.mjs 覆盖；
 * 这里做组件模板与源码契约断言，真实渲染 .vue 单文件组件。
 */

const PAYLOAD = {
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  days: 3,
  totalPv: 17,
  totalUv: 9,
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
    { clientType: 'web', totalPv: 10, totalUv: 5, pvShare: 58.8, previousTotalPv: 6, previousTotalUv: 3, pvChangeRate: 66.7, uvChangeRate: 66.7 },
    { clientType: 'miniprogram', totalPv: 7, totalUv: 4, pvShare: 41.2, previousTotalPv: 4, previousTotalUv: 0, pvChangeRate: 75, uvChangeRate: null },
  ],
}

function chartOf(options = {}) {
  return normalizeActivityChartData(PAYLOAD, options)
}

test.after(async () => {
  await closeRenderer()
})

test('有可绘制数据时渲染画布、aria 描述与读屏等价表格', async () => {
  const chart = chartOf()
  const option = buildActivityChartOption(chart)
  assert.ok(option, '有数据时 option 必须存在')

  const html = await renderComponent('/src/components/admin/AdminActivityChartCanvas.vue', {
    chart,
    option,
    label: '访问趋势',
  })

  assert.match(html, /admin-dashboard-chart-canvas/)
  assert.match(html, /role="img"/)
  assert.match(html, /访问趋势折线图/)
  assert.match(html, /height:308px/, '桌面端趋势图高度约 300～340px')
  // 读屏等价表格提供每天的数字。
  assert.match(html, /<table/)
  assert.match(html, /2026-11-10/)
  assert.match(html, /全部来源/)
  assert.match(html, /网页端/)
  assert.match(html, /微信小程序/)
  assert.doesNotMatch(html, /NaN|Infinity|undefined|null/)
  assert.doesNotMatch(html, /PV|UV/)
})

test('移动端高度收窄，可通过 mobileHeight 控制', async () => {
  const source = readFileSync(
    new URL('../components/admin/AdminActivityChartCanvas.vue', import.meta.url),
    'utf8',
  )
  assert.match(source, /mobileHeight: \{ type: Number, default: 252 \}/)
  assert.match(source, /viewportWidth\.value < 640/)
  // 趋势图在面板中传入 308 / 252，满足桌面 300～340、移动 240～280 的要求。
  const panel = readFileSync(
    new URL('../components/admin/AdminActivityPanel.vue', import.meta.url),
    'utf8',
  )
  assert.match(panel, /:height="308"/)
  assert.match(panel, /:mobile-height="252"/)
})

test('首次加载显示骨架：不初始化空图表、不渲染表格', async () => {
  const html = await renderComponent('/src/components/admin/AdminActivityChartCanvas.vue', {
    chart: chartOf(),
    option: buildActivityChartOption(chartOf()),
    label: '访问趋势',
    loading: true,
  })
  assert.match(html, /访问趋势加载中/)
  assert.match(html, /animate-pulse/)
  assert.doesNotMatch(html, /role="img"/)
  assert.doesNotMatch(html, /<table/)
})

test('刷新中保留旧图并显示“更新中”提示', async () => {
  const html = await renderComponent('/src/components/admin/AdminActivityChartCanvas.vue', {
    chart: chartOf(),
    option: buildActivityChartOption(chartOf()),
    label: '访问趋势',
    refreshing: true,
  })
  assert.match(html, /role="img"/)
  assert.match(html, /更新中…/)
})

test('空数据显示通俗空状态，不显示空坐标轴', async () => {
  const emptyPayload = {
    ...PAYLOAD,
    totalPv: 0,
    totalUv: 0,
    daily: PAYLOAD.daily.map(item => ({
      date: item.date, pv: 0, uv: 0, webPv: 0, webUv: 0, miniprogramPv: 0, miniprogramUv: 0,
    })),
    channels: PAYLOAD.channels.map(item => ({ ...item, totalPv: 0, totalUv: 0 })),
  }
  const chart = normalizeActivityChartData(emptyPayload)
  assert.equal(chart.status, CHART_STATUS.EMPTY)
  assert.equal(buildActivityChartOption(chart), null)

  const html = await renderComponent('/src/components/admin/AdminActivityChartCanvas.vue', {
    chart,
    option: null,
    label: '访问趋势',
  })
  assert.match(html, /所选时间暂无访问数据/)
  assert.match(html, /每天数据都是 0/)
  assert.doesNotMatch(html, /role="img"/)
  assert.doesNotMatch(html, /NaN|Infinity|undefined/)
})

test('失败状态显示通俗提示与重试按钮，不输出异常堆栈', async () => {
  const chart = normalizeActivityChartData(PAYLOAD, { error: '网络中断，请稍后重试' })
  const html = await renderComponent('/src/components/admin/AdminActivityChartCanvas.vue', {
    chart,
    option: null,
    label: '访问趋势',
  })
  assert.match(html, /访问数据加载失败/)
  assert.match(html, /网络中断，请稍后重试/)
  assert.doesNotMatch(html, /role="img"/)
  assert.doesNotMatch(html, /<table/)
  // 用户可感知文案不应出现原始异常类型名。
  assert.doesNotMatch(html, /TypeError|ReferenceError|at Object\./)
})

test('来源图容器使用来源专属的 aria 描述', async () => {
  const chart = chartOf()
  const html = await renderComponent('/src/components/admin/AdminActivityChannelPanel.vue', {
    chart,
    option: buildChannelShareOption(chart),
  })
  assert.match(html, /访问来源对比条形图/)
  assert.match(html, /浏览次数占比 58\.8%/)
  // 来源图不应误用趋势图的 aria 文案。
  assert.doesNotMatch(html, /访问趋势折线图/)
})

test('组件卸载销毁图表实例与事件监听（源码契约）', () => {
  const source = readFileSync(
    new URL('../components/admin/AdminActivityChartCanvas.vue', import.meta.url),
    'utf8',
  )
  assert.match(source, /onBeforeUnmount\(/)
  assert.match(source, /host\.destroy\(\)/)
  assert.match(source, /removeEventListener\('resize', measureViewport\)/)
  assert.match(source, /addEventListener\('resize', measureViewport\)/)
  // ResizeObserver 由 host 管理，组件内不重复创建。
  assert.doesNotMatch(source, /new ResizeObserver/)
  // 尺寸变化后主动 resize，覆盖后台侧栏收起 / 展开。
  const measure = source.slice(source.indexOf('function measureViewport'), source.indexOf('onMounted('))
  assert.match(measure, /host\.resize\(\)/)
})

test('数据变化时整体替换 option，移除旧系列（源码 + host 契约）', () => {
  const source = readFileSync(
    new URL('../components/admin/AdminActivityChartCanvas.vue', import.meta.url),
    'utf8',
  )
  // 组件把 option 交给 host.update，由 host 用 notMerge 整体替换。
  assert.match(source, /host\.update\(next\)/)
  assert.match(source, /host\.update\(null\)/)
  // 空数据分支不能 destroy host，否则从空区间切回有数据无法重绘。
  const emptyBranch = source.slice(
    source.indexOf('if (!next) {'),
    source.indexOf('if (!next) {') + 200,
  )
  assert.match(emptyBranch, /host\.update\(null\)/)
  assert.doesNotMatch(emptyBranch, /host\.destroy\(\)/)
})

test('趋势与来源两个图表共用同一份指标切换，不产生额外请求', async () => {
  const panel = readFileSync(
    new URL('../components/admin/AdminActivityPanel.vue', import.meta.url),
    'utf8',
  )
  // 指标切换只调用 setMetric（纯前端），且两个图表都从同一 chart 派生。
  assert.match(panel, /@click="setMetric\(option\.key\)"/)
  assert.doesNotMatch(panel, /setMetric[\s\S]{0,80}fetchAdminDashboardActivity/)
  assert.match(panel, /:option="trendOption"/)
  assert.match(panel, /:option="sourceOption"/)
  // 只有一个请求入口：import + 注入到 composable，没有第二条请求路径。
  const calls = panel.match(/fetchAdminDashboardActivity/g) || []
  assert.equal(calls.length, 2, '面板只在 import 与注入处引用请求函数')
  assert.match(panel, /useActivityDashboard\(\{ fetchActivity: fetchAdminDashboardActivity \}\)/)
  assert.doesNotMatch(panel, /fetchAdminDashboardSummary|api\.post\(/)
})

test('ECharts 按需注册折线图与柱状图，且不注册饼图', () => {
  const source = readFileSync(
    new URL('./activityChartEcharts.js', import.meta.url),
    'utf8',
  )
  assert.match(source, /charts\.LineChart/)
  assert.match(source, /charts\.BarChart/)
  assert.match(source, /renderers\.CanvasRenderer/)
  assert.match(source, /components\.AriaComponent/)
  assert.match(source, /components\.DataZoomComponent/)
  assert.doesNotMatch(source, /PieChart|RadarChart|MapChart/)
  // 动态加载：不静态 import 'echarts'。
  assert.doesNotMatch(source, /^import .* from 'echarts'$/m)
  assert.match(source, /await Promise\.all/)
})

test('看板不会新增图表库或升级框架依赖', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  assert.match(pkg.dependencies.echarts, /^\^6\./)
  assert.equal(pkg.dependencies['chart.js'], undefined)
  assert.equal(pkg.dependencies['vue-echarts'], undefined)
  assert.equal(pkg.dependencies.d3, undefined)
})

test('来源数据缺失时来源图仍能渲染来源名称与“—”', async () => {
  const channels = normalizeActivityChannels({
    channels: [
      { clientType: 'web', totalPv: 10, totalUv: 5 },
    ],
  })
  assert.equal(channels.length, 2)
  const chart = chartOf()
  const html = await renderComponent('/src/components/admin/AdminActivityChannelPanel.vue', {
    chart,
    option: buildChannelShareOption(chart),
  })
  assert.match(html, /网页端/)
  assert.match(html, /微信小程序/)
  assert.ok(html.includes('—') || html.includes('>0<'))
})
