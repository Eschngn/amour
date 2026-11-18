<template>
  <figure class="admin-dashboard-chart m-0 w-full min-w-0">
    <!-- 可绘制：真实 ECharts 画布；尺寸变化由 host 负责 resize -->
    <div v-if="showCanvas" class="relative">
      <div
        ref="canvasRef"
        class="admin-dashboard-chart-canvas w-full"
        :style="{ height: `${resolvedHeight}px` }"
        role="img"
        :aria-label="ariaLabel"
      />
      <!-- 刷新中：不销毁旧图，只叠加轻量提示，避免图表闪烁 -->
      <p
        v-if="refreshing"
        class="pointer-events-none absolute right-1 top-0 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200"
        role="status"
      >更新中…</p>
    </div>

    <!-- 首次加载 / 切换日期：轻量骨架，不初始化空图表 -->
    <div
      v-else-if="loading"
      class="w-full animate-pulse rounded-xl border border-slate-100 bg-slate-50"
      :style="{ height: `${resolvedHeight}px` }"
      role="status"
      aria-live="polite"
      :aria-label="`${label}加载中`"
    />

    <!-- 不可绘制：空数据 / 老接口 / 该指标暂不可用 / 请求失败 -->
    <div
      v-else-if="!renderError"
      class="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center"
      :style="{ height: `${resolvedHeight}px` }"
      role="status"
    >
      <p class="text-sm font-medium text-slate-600">{{ statusTitle }}</p>
      <p v-if="statusMessage" class="mt-1.5 max-w-md text-xs leading-5 text-slate-400">{{ statusMessage }}</p>
      <slot name="empty-action" />
    </div>

    <!-- 降级：ECharts 初始化失败时退化为文字数据，保证信息不丢，不向用户输出堆栈 -->
    <div v-if="renderError && !loading" class="w-full" role="alert">
      <p class="text-xs text-amber-700">
        图表暂时无法显示，以下为同样的数字明细。
        <button
          type="button"
          class="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          @click="resetRenderError"
        >重新绘制</button>
      </p>
      <p v-if="noticeOnly" class="mt-1 text-xs leading-5 text-slate-500">
        数字仍可在右侧明细中核对。
      </p>
      <p v-else-if="!fallbackRows.length" class="mt-1 text-xs leading-5 text-slate-500">
        {{ statusTitle }}<span v-if="statusMessage">：{{ statusMessage }}</span>
      </p>
      <table v-else class="mt-2 w-full border-collapse text-left text-xs">
        <caption class="sr-only">{{ label }}：图表无法显示时的等价数字明细</caption>
        <thead>
          <tr class="text-slate-400">
            <th scope="col" class="py-1.5 pr-3 font-medium">{{ fallbackMode === 'summary' ? '访问来源' : '日期' }}</th>
            <template v-if="fallbackMode === 'summary'">
              <th scope="col" class="py-1.5 pr-3 font-medium">{{ chart.metricLabel }}</th>
              <th v-if="chart.metric === 'pv'" scope="col" class="py-1.5 font-medium">浏览次数占比</th>
            </template>
            <template v-else>
              <th scope="col" class="py-1.5 pr-3 font-medium">全部来源</th>
              <th v-for="source in sources" :key="source.key" scope="col" class="py-1.5 pr-3 font-medium">{{ source.name }}</th>
            </template>
          </tr>
        </thead>
        <tbody class="text-slate-600">
          <tr v-for="row in fallbackRows" :key="row.key" class="border-t border-slate-100">
            <template v-if="fallbackMode === 'summary'">
              <th scope="row" class="py-1.5 pr-3 font-normal">{{ row.label }}</th>
              <td class="py-1.5 pr-3 tabular-nums">{{ row.value }} {{ chart.metricUnit }}</td>
              <td v-if="chart.metric === 'pv'" class="py-1.5 tabular-nums">{{ row.share }}</td>
            </template>
            <template v-else>
              <th scope="row" class="py-1.5 pr-3 font-normal tabular-nums">{{ row.label }}</th>
              <td class="py-1.5 pr-3 tabular-nums">{{ row.total }}</td>
              <td v-for="source in sources" :key="source.key" class="py-1.5 pr-3 tabular-nums">
                {{ source.key === 'web' ? row.web : row.miniprogram }}
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 读屏等价文字明细（视觉隐藏，不影响布局） -->
    <figcaption v-if="tableRows.length && !loading && !renderError" class="sr-only">
      <table>
        <caption>{{ label }}数据明细（{{ chart.startDate }} 至 {{ chart.endDate }}），单位{{ chart.metricUnit }}</caption>
        <thead>
          <tr>
            <th scope="col">日期</th>
            <th scope="col">全部来源</th>
            <th v-for="source in sources" :key="source.key" scope="col">{{ source.name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.key">
            <th scope="row">{{ row.label }} {{ row.weekday }}</th>
            <td>{{ row.total }}</td>
            <td v-for="source in sources" :key="source.key">
              {{ source.key === 'web' ? row.web : row.miniprogram }}
            </td>
          </tr>
        </tbody>
      </table>
    </figcaption>
  </figure>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CHART_SERIES,
  buildActivityChartTableRows,
  buildSummaryRows,
  setActivityChartReducedMotion,
} from '@/utils/activityChart'
import { createActivityChartHost } from '@/utils/activityChartHost'

const props = defineProps({
  /**
   * normalizeActivityChartData 的输出。组件只按 chart 渲染，
   * 不在模板里做任何字段兼容判断。
   */
  chart: { type: Object, required: true },
  /** 可直接使用的 ECharts option；为空表示当前不可绘制。 */
  option: { type: Object, default: null },
  /** 图表区域的无障碍标题，例如“访问趋势”。 */
  label: { type: String, default: '访问图表' },
  /** 覆盖默认 aria 描述（来源图与趋势图的读屏描述不同）。 */
  ariaLabelOverride: { type: String, default: '' },
  /**
   * 渲染失败时的降级文字：
   * - 'daily'（默认）：逐日明细表；
   * - 'summary'：所选时间的来源合计表。
   */
  fallbackMode: { type: String, default: 'daily' },
  /** 覆盖降级文字行（来源区使用合计行而不是逐日行）。 */
  fallbackOverride: { type: Array, default: null },
  /**
   * 只显示“图表暂时无法显示”的提示，不重复渲染数字表：
   * 来源区的明细列表本身已经包含同样的数字。
   */
  noticeOnly: { type: Boolean, default: false },
  /** 首次加载 / 切换日期加载中：显示骨架，不初始化空图表。 */
  loading: { type: Boolean, default: false },
  /** 已有数据时正在刷新：保留旧图并显示“更新中”，避免图表闪烁。 */
  refreshing: { type: Boolean, default: false },
  /** 图表高度（px）。 */
  height: { type: Number, default: 308 },
  /** 移动端高度（px），窄屏时使用。 */
  mobileHeight: { type: Number, default: 252 },
})

const canvasRef = ref(null)
const renderError = ref('')
const viewportWidth = ref(0)
let motionQuery = null

function syncReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  if (!motionQuery) {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  }
  setActivityChartReducedMotion(motionQuery.matches)
}

function onMotionChange() {
  syncReducedMotion()
  if (!props.option) return
  // 偏好变化后重绘：animation:false 的 option 需要通过 setOption 生效。
  nextTick(() => {
    if (canvasRef.value) host.update(props.option)
  })
}
const host = createActivityChartHost({
  onError: () => {
    // 不把原始异常堆栈抛给用户，只展示通俗提示 + 文字明细。
    renderError.value = 'render-failed'
  },
})

const sources = computed(() => CHART_SERIES.filter(series => series.dashed === false))
const tableRows = computed(() => buildActivityChartTableRows(props.chart))
const fallbackRows = computed(() => {
  if (Array.isArray(props.fallbackOverride)) return props.fallbackOverride
  if (props.fallbackMode === 'summary') {
    return buildSummaryRows(props.chart).map(row => ({
      key: row.key,
      label: row.name,
      value: row.valueText,
      share: row.shareText || '—',
      unit: row.unit,
    }))
  }
  return tableRows.value
})

const statusTitle = computed(() => props.chart?.statusTitle || '所选时间暂无访问数据')
const statusMessage = computed(() => props.chart?.statusMessage || '')
const ariaLabel = computed(() => props.ariaLabelOverride || props.chart?.ariaDescription || `${props.label}图表`)

const resolvedHeight = computed(() => {
  if (viewportWidth.value > 0 && viewportWidth.value < 640) {
    return props.mobileHeight
  }
  return props.height
})

// 加载中不渲染画布：骨架是唯一可见状态，避免空图表初始化。
const showCanvas = computed(() => Boolean(props.option) && !renderError.value && !props.loading)

// option 变化时重绘；不可绘制时销毁实例（保留 host），
// 这样从空区间切回有数据时图表仍能重新创建，不会永久失效。
watch(
  () => props.option,
  (next) => {
    renderError.value = ''
    if (!next) {
      host.update(null)
      return
    }
    // 画布可能刚刚从空状态切到可见，等 DOM 更新后再量尺寸 / 挂载。
    nextTick(() => {
      if (!canvasRef.value) return
      host.attach(canvasRef.value)
      host.update(next)
    })
  },
)

// 切换日期（loading 由 false → true 且已有旧图）时立即清空，
// 避免把上一个日期的图形误当成本次结果。
watch(
  () => props.loading,
  (loading) => {
    if (loading) host.update(null)
  },
)

function resetRenderError() {
  renderError.value = ''
  if (!props.option) return
  nextTick(() => {
    if (!canvasRef.value) return
    host.attach(canvasRef.value)
    host.update(props.option)
  })
}

function measureViewport() {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth || 0
  // 容器尺寸变化后（含后台侧栏收起 / 展开）同步 resize，避免图表被裁切。
  host.resize()
}

onMounted(() => {
  syncReducedMotion()
  if (motionQuery) {
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', onMotionChange)
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(onMotionChange)
    }
  }
  measureViewport()
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', measureViewport)
  }
  if (props.option && canvasRef.value) {
    host.attach(canvasRef.value)
    host.update(props.option)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
    window.removeEventListener('resize', measureViewport)
  }
  if (motionQuery) {
    if (typeof motionQuery.removeEventListener === 'function') {
      motionQuery.removeEventListener('change', onMotionChange)
    } else if (typeof motionQuery.removeListener === 'function') {
      motionQuery.removeListener(onMotionChange)
    }
    motionQuery = null
  }
  // 组件卸载必须销毁实例与 resize 监听，避免内存泄漏。
  host.destroy()
})

defineExpose({
  /** 测试用：暴露 option 与 host，便于断言生命周期行为。 */
  getHost: () => host,
})
</script>

<style scoped>
.admin-dashboard-chart-canvas {
  min-width: 0;
}
</style>
