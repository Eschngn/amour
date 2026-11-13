<template>
  <div class="mt-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span class="flex items-center gap-1.5">
          <span class="h-2 w-5 rounded-full bg-rose-400" aria-hidden="true" />
          条形长度表示当日浏览次数
        </span>
        <span class="flex items-center gap-1.5">
          <span class="rounded bg-indigo-50 px-1 text-[10px] text-indigo-500" aria-hidden="true">人</span>
          访客人数为当日去重值
        </span>
      </div>

      <div v-if="pageCount > 1" class="flex items-center gap-1.5">
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          :disabled="safePageIndex === 0"
          aria-label="查看更早的每日数据"
          @click="goToPage(safePageIndex - 1)"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
        </button>
        <span class="min-w-[72px] text-center text-[11px] tabular-nums text-slate-500">
          第 {{ safePageIndex + 1 }} / {{ pageCount }} 页
        </span>
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          :disabled="safePageIndex >= pageCount - 1"
          aria-label="查看更新的每日数据"
          @click="goToPage(safePageIndex + 1)"
        >
          <ArrowRight class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <p
      v-if="!points.length"
      class="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400"
      role="status"
    >
      当前区间暂无每日浏览数据。
    </p>

    <ul
      v-else
      class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
      :aria-label="`每日浏览与访客明细，第 ${safePageIndex + 1} 页，共 ${pageCount} 页`"
    >
      <li
        v-for="item in visibleDays"
        :key="item.date"
        class="rounded-xl border px-3 py-2.5"
        :class="Number(item.pv) > 0 ? 'border-slate-100 bg-white' : 'border-slate-100 bg-slate-50/70'"
        :aria-label="`${item.date} ${formatWeekday(item.date)}，浏览次数 ${formatActivityNumber(item.pv)} 次，访客人数 ${formatActivityNumber(item.uv)} 人`"
      >
        <div class="flex items-center justify-between gap-1">
          <p class="text-xs font-medium tabular-nums text-slate-600">{{ formatShortDate(item.date) }}</p>
          <span class="text-[10px] text-slate-400">{{ formatWeekday(item.date) }}</span>
        </div>

        <p class="mt-2 text-[10px] text-slate-400">浏览次数</p>
        <p class="flex items-baseline gap-1">
          <span
            class="text-xl font-semibold tabular-nums"
            :class="Number(item.pv) > 0 ? 'text-slate-900' : 'text-slate-400'"
          >{{ formatActivityNumber(item.pv) }}</span>
          <span class="text-[11px] text-slate-400">次</span>
          <span
            v-if="isPeak(item)"
            class="ml-auto rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-600"
          >峰值</span>
        </p>

        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div class="h-full rounded-full bg-rose-400" :style="{ width: barWidth(item) }" />
        </div>

        <div class="mt-2 flex items-center justify-between gap-1 rounded-lg bg-indigo-50/80 px-2 py-1 text-[11px] text-indigo-600">
          <span>访客人数</span>
          <span class="font-semibold tabular-nums">{{ formatActivityNumber(item.uv) }} 人</span>
        </div>
      </li>
    </ul>

    <p v-if="points.length && pageCount > 1" class="mt-2 text-[11px] text-slate-400">
      {{ pageRangeLabel }} · 共 {{ points.length }} 天，每页最多 7 天
    </p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import {
  formatActivityNumber,
  formatShortDate,
  formatWeekday,
  paginateActivityDays,
} from '@/utils/activityRange'

const props = defineProps({
  points: { type: Array, default: () => [] },
})

const pages = computed(() => paginateActivityDays(props.points))
const pageCount = computed(() => Math.max(1, pages.value.length))
const pageIndex = ref(0)
const safePageIndex = computed(() => Math.min(Math.max(pageIndex.value, 0), pageCount.value - 1))
const visibleDays = computed(() => pages.value[safePageIndex.value] || [])
const maxPv = computed(() => props.points.reduce((max, item) => Math.max(max, Number(item?.pv) || 0), 0))

const pageRangeLabel = computed(() => {
  const items = visibleDays.value
  if (!items.length) return ''
  return `${items[0].date} 至 ${items[items.length - 1].date}`
})

// 新数据到达时默认展示最近一页，符合管理员先看近期数据的习惯。
watch(() => props.points, () => {
  pageIndex.value = Math.max(0, pages.value.length - 1)
}, { immediate: true })

function goToPage(index) {
  pageIndex.value = Math.min(Math.max(index, 0), pageCount.value - 1)
}

function isPeak(item) {
  return maxPv.value > 0 && Number(item?.pv) === maxPv.value
}

function barWidth(item) {
  const pv = Number(item?.pv) || 0
  if (pv <= 0 || maxPv.value <= 0) return '0%'
  // 保留最小可见宽度，避免极低值完全看不见；实际数值仍以文字为准。
  return `${Math.max(2, (pv / maxPv.value) * 100).toFixed(1)}%`
}
</script>
