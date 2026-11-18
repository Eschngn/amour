<template>
  <div class="mt-4 border-t border-slate-100 pt-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        class="admin-dashboard-disclosure inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        :aria-expanded="open ? 'true' : 'false'"
        aria-controls="admin-dashboard-daily-detail"
        @click="$emit('toggle', !open)"
      >
        <span
          class="inline-block transition-transform"
          :class="open ? 'rotate-90' : ''"
          aria-hidden="true"
        >▸</span>
        {{ open ? '收起每日明细' : '查看每日明细' }}
      </button>

      <div v-if="open && pageCount > 1" class="flex items-center gap-1.5">
        <button
          type="button"
          class="admin-dashboard-pager"
          :disabled="safePageIndex === 0"
          aria-label="查看更早的日期"
          @click="goToPage(safePageIndex - 1)"
        >
          <ArrowLeft class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span class="min-w-[74px] text-center text-xs tabular-nums text-slate-500">
          第 {{ safePageIndex + 1 }} / {{ pageCount }} 页
        </span>
        <button
          type="button"
          class="admin-dashboard-pager"
          :disabled="safePageIndex >= pageCount - 1"
          aria-label="查看更新的日期"
          @click="goToPage(safePageIndex + 1)"
        >
          <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="open" id="admin-dashboard-daily-detail" class="mt-3">
      <p v-if="!points.length" class="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400" role="status">
        所选时间没有每日数据。
      </p>

      <div v-else class="overflow-x-auto">
        <table class="admin-dashboard-table w-full min-w-[560px] border-collapse text-left">
          <caption class="sr-only">
            每日访问明细，第 {{ safePageIndex + 1 }} 页，共 {{ pageCount }} 页，单位：浏览次数为次、访客人数为人。
          </caption>
          <thead>
            <tr class="border-b border-slate-100 text-xs font-medium text-slate-400">
              <th scope="col" class="py-2 pr-3">日期</th>
              <th scope="col" class="py-2 pr-3 text-right">全部来源浏览次数</th>
              <th scope="col" class="py-2 pr-3 text-right">全部来源访客人数</th>
              <th scope="col" class="py-2 pr-3 text-right">
                <span class="inline-flex items-center gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />网页端浏览次数
                </span>
              </th>
              <th scope="col" class="py-2 pr-3 text-right">
                <span class="inline-flex items-center gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />网页端访客人数
                </span>
              </th>
              <th scope="col" class="py-2 pr-3 text-right">
                <span class="inline-flex items-center gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden="true" />微信小程序浏览次数
                </span>
              </th>
              <th scope="col" class="py-2 text-right">
                <span class="inline-flex items-center gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden="true" />微信小程序访客人数
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="text-xs text-slate-700">
            <tr
              v-for="row in visibleRows"
              :key="row.date"
              class="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"
            >
              <th scope="row" class="whitespace-nowrap py-2.5 pr-3 font-medium tabular-nums text-slate-700">
                {{ row.date }}
                <span class="ml-1 text-xs font-normal text-slate-400">{{ row.weekday }}</span>
              </th>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ row.totalPvText }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ row.totalUvText }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ row.webPvText }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ row.webUvText }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ row.miniPvText }}</td>
              <td class="py-2.5 text-right tabular-nums">{{ row.miniUvText }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="points.length" class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-slate-400">
        <span>{{ pageRangeLabel }} · 每页最多 7 天</span>
        <span>每日访客人数是当天去重值，不能相加得到所选时间的访客人数。</span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { formatWeekday, paginateActivityDays } from '@/utils/activityRange'
import { formatCount } from '@/utils/activityCopy'

const props = defineProps({
  /**
   * 每日数据，字段与接口 daily 一致：
   * { date, pv, uv, webPv, webUv, miniprogramPv, miniprogramUv }。
   */
  points: { type: Array, default: () => [] },
  /** 是否展开；由父级控制，默认收起。 */
  open: { type: Boolean, default: false },
})

defineEmits(['toggle'])

const pages = computed(() => paginateActivityDays(props.points))
const pageCount = computed(() => Math.max(1, pages.value.length))
const pageIndex = ref(0)
const safePageIndex = computed(() => Math.min(Math.max(pageIndex.value, 0), pageCount.value - 1))
const visibleRows = computed(() => (pages.value[safePageIndex.value] || []).map(normalizeDay))

const pageRangeLabel = computed(() => {
  const rows = visibleRows.value
  if (!rows.length) return ''
  return `${rows[0].date} 至 ${rows[rows.length - 1].date}`
})

// 新数据到达时默认展示最近一页，符合管理员先看近期数据的习惯。
watch(() => props.points, () => {
  pageIndex.value = Math.max(0, pages.value.length - 1)
}, { immediate: true })

function toCountOrDash(value) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return '—'
  return number
}

function normalizeDay(item) {
  const totalPv = toCountOrDash(item?.pv)
  const totalUv = toCountOrDash(item?.uv)
  const webPv = toCountOrDash(item?.webPv)
  const webUv = toCountOrDash(item?.webUv)
  const miniPv = toCountOrDash(item?.miniprogramPv)
  const miniUv = toCountOrDash(item?.miniprogramUv)
  return {
    date: typeof item?.date === 'string' ? item.date : '',
    weekday: formatWeekday(item?.date),
    totalPvText: formatCount(totalPv),
    totalUvText: formatCount(totalUv),
    webPvText: formatCount(webPv),
    webUvText: formatCount(webUv),
    miniPvText: formatCount(miniPv),
    miniUvText: formatCount(miniUv),
  }
}

function goToPage(index) {
  pageIndex.value = Math.min(Math.max(index, 0), pageCount.value - 1)
}
</script>
