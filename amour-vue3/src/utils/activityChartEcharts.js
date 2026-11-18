/**
 * 按需 ECharts 入口（懒加载）。
 *
 * 数据看板只在管理控制台出现，公共站点不应该为它付出下载体积，
 * 因此这里用动态 import 把 echarts 拆成独立 chunk，只有图表真正要绘制时才加载。
 *
 * 只注册用到的模块：
 * - LineChart / BarChart：访问趋势折线、每日对比柱、访问来源横向条；
 * - Grid / Tooltip / Aria / DataZoom：坐标轴、提示框、读屏描述、长区间横向浏览；
 * - CanvasRenderer：本页唯一的渲染器。
 * 不注册饼图 / 环形图：访客人数是非互斥集合，本看板不做占比图。
 */

let modulePromise = null

async function loadEchartsCore() {
  const [echarts, charts, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ])
  return { echarts, charts, components, renderers }
}

/**
 * 加载（并只注册一次）看板所需的 ECharts 模块。
 * 返回 { version, init } 形状的轻量封装，避免调用方直接依赖 echarts 的模块结构。
 */
export function loadActivityEcharts() {
  if (modulePromise) return modulePromise
  modulePromise = loadEchartsCore().then(({ echarts, charts, components, renderers }) => {
    echarts.use([
      charts.LineChart,
      charts.BarChart,
      components.GridComponent,
      components.TooltipComponent,
      components.LegendComponent,
      components.AriaComponent,
      components.DataZoomComponent,
      components.DataZoomInsideComponent,
      renderers.CanvasRenderer,
    ])
    return {
      version: echarts.version,
      init: (element, theme, options) => echarts.init(element, theme, options),
    }
  }).catch((error) => {
    // 加载失败不要缓存失败的 Promise，否则重试永远失败。
    modulePromise = null
    throw error
  })
  return modulePromise
}

/** 测试与诊断用：当前是否已经完成模块加载。 */
export function isActivityEchartsLoaded() {
  return Boolean(modulePromise)
}
