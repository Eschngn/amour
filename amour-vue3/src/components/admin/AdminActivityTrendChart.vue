<template>
  <figure ref="wrapperRef" class="relative w-full min-w-0">
    <svg
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      class="block w-full select-none overflow-visible"
      role="img"
      :aria-label="accessibleLabel"
      tabindex="0"
      @focus="onFocus"
      @blur="activeIndex = -1"
      @keydown.left.prevent="stepActive(-1)"
      @keydown.right.prevent="stepActive(1)"
      @keydown.home.prevent="activate(0)"
      @keydown.end.prevent="activate(points.length - 1)"
      @keydown.escape="activeIndex = -1"
      @pointermove="onPointerMove"
      @pointerdown="onPointerMove"
      @pointerleave="activeIndex = -1"
    >
      <title>{{ accessibleLabel }}</title>
      <desc>{{ accessibleDescription }}</desc>

      <g aria-hidden="true">
        <line
          v-for="tick in yTicks"
          :key="`grid-${tick.value}`"
          :x1="padding.left"
          :x2="width - padding.right"
          :y1="tick.y"
          :y2="tick.y"
          stroke="#e2e8f0"
          stroke-width="1"
          :stroke-dasharray="tick.value === 0 ? '0' : '4 4'"
        />
        <text
          v-for="tick in yTicks"
          :key="`y-${tick.value}`"
          :x="padding.left - 8"
          :y="tick.y + 4"
          text-anchor="end"
          fill="#94a3b8"
          font-size="10"
        >{{ tick.value }}</text>
        <text
          v-for="label in xLabels"
          :key="`x-${label.index}`"
          :x="label.x"
          :y="height - 8"
          text-anchor="middle"
          fill="#94a3b8"
          font-size="10"
        >{{ label.text }}</text>
      </g>

      <g aria-hidden="true">
        <polyline
          v-if="points.length > 1"
          :points="pvPolyline"
          fill="none"
          stroke="#e11d48"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <polyline
          v-if="points.length > 1"
          :points="uvPolyline"
          fill="none"
          stroke="#6366f1"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <template v-if="points.length <= 14">
          <circle
            v-for="(point, index) in chartPoints"
            :key="`pv-dot-${index}`"
            :cx="point.x"
            :cy="point.pvY"
            r="2.5"
            fill="#ffffff"
            stroke="#e11d48"
            stroke-width="1.5"
          />
          <circle
            v-for="(point, index) in chartPoints"
            :key="`uv-dot-${index}`"
            :cx="point.x"
            :cy="point.uvY"
            r="2.5"
            fill="#ffffff"
            stroke="#6366f1"
            stroke-width="1.5"
          />
        </template>
      </g>

      <g v-if="activePoint" aria-hidden="true">
        <line
          :x1="activePoint.x"
          :x2="activePoint.x"
          :y1="padding.top"
          :y2="height - padding.bottom"
          stroke="#cbd5e1"
          stroke-width="1"
          stroke-dasharray="3 3"
        />
        <circle :cx="activePoint.x" :cy="activePoint.pvY" r="4" fill="#e11d48" stroke="#ffffff" stroke-width="2" />
        <circle :cx="activePoint.x" :cy="activePoint.uvY" r="4" fill="#6366f1" stroke="#ffffff" stroke-width="2" />
      </g>
    </svg>

    <div
      v-if="activePoint"
      class="pointer-events-none absolute top-1 z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg shadow-slate-900/5"
      :style="tooltipStyle"
      role="status"
    >
      <p class="font-semibold text-slate-700">{{ activePoint.date }}</p>
      <p class="mt-1 flex items-center gap-1.5 text-slate-500">
        <span class="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
        <span>浏览次数</span>
        <span class="font-semibold tabular-nums text-slate-700">{{ formatActivityNumber(activePoint.pv) }}</span>
        <span class="text-slate-400">次</span>
      </p>
      <p class="mt-0.5 flex items-center gap-1.5 text-slate-500">
        <span class="h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />
        <span>访客人数</span>
        <span class="font-semibold tabular-nums text-slate-700">{{ formatActivityNumber(activePoint.uv) }}</span>
        <span class="text-slate-400">人</span>
      </p>
    </div>

    <p class="sr-only">图表支持键盘查看：左右方向键切换日期，Home 和 End 跳到首尾，Esc 关闭提示。</p>
  </figure>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatActivityNumber, formatShortDate } from '@/utils/activityRange'

const props = defineProps({
  points: { type: Array, default: () => [] },
})

const wrapperRef = ref(null)
const width = ref(720)
const activeIndex = ref(-1)
let resizeObserver = null

const height = computed(() => (width.value < 480 ? 220 : 260))
const padding = computed(() => ({
  top: 16,
  right: width.value < 480 ? 8 : 16,
  bottom: 28,
  left: width.value < 480 ? 34 : 44,
}))

const innerWidth = computed(() => Math.max(1, width.value - padding.value.left - padding.value.right))
const innerHeight = computed(() => Math.max(1, height.value - padding.value.top - padding.value.bottom))

const maxValue = computed(() => props.points.reduce(
  (max, point) => Math.max(max, Number(point?.pv) || 0, Number(point?.uv) || 0),
  0,
))

/**
 * 取整且能被 4 等分的刻度上限，保证浏览次数与访客人数的整数标签可读。
 */
const yAxis = computed(() => {
  const rawStep = Math.max(1, maxValue.value) / 4
  const exponent = Math.floor(Math.log10(rawStep))
  const base = 10 ** exponent
  const normalized = rawStep / base
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  const step = Math.max(1, nice * base)
  return { step, max: step * 4 }
})

const yTicks = computed(() => Array.from({ length: 5 }, (_, index) => {
  const value = Math.round(yAxis.value.step * index)
  return {
    value,
    y: padding.value.top + innerHeight.value * (1 - index / 4),
  }
}))

function xOf(index) {
  if (props.points.length <= 1) {
    return padding.value.left + innerWidth.value / 2
  }
  return padding.value.left + (innerWidth.value * index) / (props.points.length - 1)
}

function yOf(value) {
  const safeValue = Math.max(0, Number(value) || 0)
  return padding.value.top + innerHeight.value * (1 - safeValue / yAxis.value.max)
}

const chartPoints = computed(() => props.points.map((point, index) => ({
  date: point?.date || '',
  pv: Number(point?.pv) || 0,
  uv: Number(point?.uv) || 0,
  x: xOf(index),
  pvY: yOf(point?.pv),
  uvY: yOf(point?.uv),
})))

const pvPolyline = computed(() => chartPoints.value.map(point => `${point.x},${point.pvY}`).join(' '))
const uvPolyline = computed(() => chartPoints.value.map(point => `${point.x},${point.uvY}`).join(' '))

const xLabels = computed(() => {
  const total = props.points.length
  if (total === 0) return []
  const maxLabels = width.value < 420 ? 3 : width.value < 640 ? 4 : 5
  const indexes = new Set()
  for (let i = 0; i < maxLabels; i += 1) {
    indexes.add(Math.round((i * (total - 1)) / Math.max(1, maxLabels - 1)))
  }
  return [...indexes]
    .sort((a, b) => a - b)
    .map(index => ({
      index,
      x: xOf(index),
      text: formatShortDate(props.points[index]?.date),
    }))
})

const activePoint = computed(() => {
  if (activeIndex.value < 0 || activeIndex.value >= chartPoints.value.length) return null
  return chartPoints.value[activeIndex.value]
})

const tooltipStyle = computed(() => {
  if (!activePoint.value) return {}
  const placeLeft = activePoint.value.x > width.value * 0.55
  return {
    left: `${activePoint.value.x}px`,
    transform: placeLeft ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
  }
})

const totalPv = computed(() => props.points.reduce((sum, point) => sum + (Number(point?.pv) || 0), 0))

const accessibleLabel = computed(() => {
  const first = props.points[0]?.date || '—'
  const last = props.points[props.points.length - 1]?.date || '—'
  return `浏览次数与访客人数趋势图，${first} 至 ${last}，共 ${props.points.length} 天，`
    + `区间浏览次数合计 ${formatActivityNumber(totalPv.value)} 次。`
    + '访客人数为每日去重值，不能相加作为区间访客人数。'
})

const accessibleDescription = computed(() => {
  if (props.points.length === 0) return '当前没有可用于绘制趋势的数据。'
  return '横轴为日期，纵轴为计数。玫瑰色折线表示每日浏览次数（单位：次），'
    + '靛蓝色折线表示每日访客人数（单位：人），两条线使用同一刻度，可直接比较高低。'
})

function activate(index) {
  if (!Number.isInteger(index) || props.points.length === 0) {
    activeIndex.value = -1
    return
  }
  activeIndex.value = Math.min(props.points.length - 1, Math.max(0, index))
}

function stepActive(delta) {
  if (props.points.length === 0) return
  if (activeIndex.value < 0) {
    activeIndex.value = delta > 0 ? 0 : props.points.length - 1
    return
  }
  activate(activeIndex.value + delta)
}

function onFocus() {
  if (activeIndex.value < 0 && props.points.length > 0) {
    activate(props.points.length - 1)
  }
}

function onPointerMove(event) {
  if (props.points.length === 0) return
  const rect = event.currentTarget.getBoundingClientRect()
  if (!rect.width) return
  const x = ((event.clientX - rect.left) / rect.width) * width.value
  const ratio = (x - padding.value.left) / innerWidth.value
  activate(Math.round(ratio * (props.points.length - 1)))
}

function measure() {
  const element = wrapperRef.value
  if (!element) return
  const measured = element.clientWidth
  if (measured > 0) {
    width.value = Math.max(280, Math.floor(measured))
  }
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && wrapperRef.value) {
    resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(wrapperRef.value)
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', measure)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  } else if (typeof window !== 'undefined') {
    window.removeEventListener('resize', measure)
  }
})
</script>
