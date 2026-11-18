<template>
  <section
    class="admin-dashboard-card flex h-full min-w-0 flex-col"
    aria-labelledby="activity-source-heading"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 id="activity-source-heading" class="text-sm font-semibold text-slate-900">访问来源</h3>
        <p class="mt-1 text-xs leading-5 text-slate-400">
          {{ chart.metricLabel }} · 网页端与微信小程序
        </p>
      </div>
      <span
        v-if="unavailable"
        class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
        role="status"
      >暂不可用</span>
    </header>

    <p
      v-if="unavailable"
      class="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2.5 text-xs leading-5 text-amber-800"
      role="status"
    >
      当前数据还没有区分网页端与微信小程序，这里只显示全部来源的合计，不做猜测拆分。
    </p>

    <AdminActivityChartCanvas
      v-if="!unavailable"
      class="mt-2"
      :chart="chart"
      :option="option"
      :loading="loading"
      label="访问来源对比"
      :height="168"
      :mobile-height="152"
      :aria-label-override="sourceAriaLabel"
      fallback-mode="summary"
      notice-only
    />

    <!-- 明细：真实数字、单位与必要的对比信息 -->
    <ul v-if="!unavailable && rows.length" class="mt-3 space-y-2.5" aria-label="访问来源明细">
      <li
        v-for="row in rows"
        :key="row.key"
        class="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-700">
            <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: row.color }" aria-hidden="true" />
            <span class="truncate">{{ row.name }}</span>
          </p>
          <p class="flex shrink-0 items-baseline gap-1">
            <span class="text-base font-semibold tabular-nums text-slate-900">{{ row.valueText }}</span>
            <span class="text-xs text-slate-400">{{ row.unit }}</span>
          </p>
        </div>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5">
          <span
            v-if="row.shareText"
            class="text-slate-500"
          >浏览次数占比 <span class="font-semibold tabular-nums text-slate-600">{{ row.shareText }}</span></span>
          <span
            v-if="row.comparison"
            class="inline-flex items-center gap-1 font-medium"
            :class="toneClass(row.comparison.tone)"
          >
            <span aria-hidden="true">{{ directionIcon(row.comparison.direction) }}</span>
            {{ row.comparison.text }}
          </span>
          <span v-if="row.comparison?.detail" class="text-slate-400">{{ row.comparison.detail }}</span>
        </div>
      </li>
    </ul>

  </section>
</template>

<script setup>
import { computed } from 'vue'
import AdminActivityChartCanvas from '@/components/admin/AdminActivityChartCanvas.vue'
import { ACTIVITY_CHANNELS } from '@/utils/activityChannels'
import { describeComparison, formatCount, formatPercentValue } from '@/utils/activityCopy'
import { buildSourceAriaLabel } from '@/utils/activityChart'

const props = defineProps({
  /** normalizeActivityChartData 的输出。 */
  chart: { type: Object, required: true },
  /** 访问来源条形图的 ECharts option。 */
  option: { type: Object, default: null },
  /** 来源数据不可用（老接口没有 channels）。 */
  unavailable: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const sourceAriaLabel = computed(() => buildSourceAriaLabel(props.chart))

const rows = computed(() => ACTIVITY_CHANNELS.map((config) => {
  const summary = props.chart?.summary?.[config.clientType] || {}
  const metric = props.chart?.metric === 'uv' ? 'uv' : 'pv'
  const value = summary[metric]
  const previous = metric === 'uv' ? summary.previousUv : summary.previousPv
  const rate = metric === 'uv' ? summary.uvChangeRate : summary.pvChangeRate
  const share = metric === 'pv' ? props.chart?.pvShares?.[config.clientType] : null
  return {
    key: config.clientType,
    name: config.label,
    color: config.color,
    valueText: value === null || value === undefined ? '—' : formatCount(value),
    unit: props.chart?.metricUnit || '次',
    shareText: share === null || share === undefined ? '' : formatPercentValue(share),
    // 来源维度的变化率暂不由接口单独返回时，用上一时段绝对值给出说明。
    comparison: describeComparison(rate, previous, props.chart?.metricUnit || '次'),
  }
}))

function toneClass(tone) {
  if (tone === 'up') return 'text-emerald-700'
  if (tone === 'down') return 'text-rose-700'
  return 'text-slate-400'
}

function directionIcon(direction) {
  if (direction === 'up') return '↑'
  if (direction === 'down') return '↓'
  return '·'
}
</script>
