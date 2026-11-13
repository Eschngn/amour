<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    aria-labelledby="activity-heading"
    :aria-busy="loading ? 'true' : 'false'"
  >
    <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 id="activity-heading" class="text-sm font-semibold text-slate-900">平台活跃度</h2>
          <span class="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600">Web 站点</span>
          <span
            v-if="loading && hasLoaded"
            class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
            role="status"
          >更新中…</span>
        </div>
        <p class="mt-1 text-xs leading-5 text-slate-400">
          查看恋语间 Web 站点的页面浏览与访客情况，统计时区 {{ timezone }}，不含管理后台与微信小程序。
        </p>
      </div>

      <div class="flex flex-wrap items-end gap-2">
        <div
          class="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1"
          role="group"
          aria-label="选择统计时间范围"
        >
          <button
            v-for="preset in presets"
            :key="preset.key"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            :class="activePreset === preset.key
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'"
            :aria-pressed="activePreset === preset.key"
            @click="selectPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>

        <el-date-picker
          v-if="activePreset === 'custom'"
          v-model="customRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :clearable="false"
          :disabled-date="disabledDate"
          class="activity-date-picker"
          aria-label="自定义统计日期范围"
        />

        <button
          v-if="activePreset === 'custom'"
          type="button"
          class="admin-filter-button admin-filter-button--primary"
          :disabled="!customValidation.valid || loading"
          @click="applyCustomRange"
        >
          应用区间
        </button>

        <button
          type="button"
          class="admin-filter-button admin-filter-button--secondary admin-filter-button--icon"
          aria-label="刷新活跃度数据"
          title="刷新活跃度数据"
          :disabled="loading"
          @click="load()"
        >
          <Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <p v-if="customHint" class="mt-2 text-xs text-rose-600" role="alert">{{ customHint }}</p>

    <div
      v-if="error"
      class="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      role="alert"
    >
      <span>{{ error }}</span>
      <button type="button" class="font-semibold underline" @click="load()">重试</button>
    </div>

    <template v-if="!hasLoaded && loading">
      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        <div v-for="n in 4" :key="n" class="h-28 animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
      </div>
      <div class="mt-4 h-[330px] animate-pulse rounded-xl border border-slate-100 bg-slate-50" aria-hidden="true" />
    </template>

    <template v-else>
      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in metricCards"
          :key="card.key"
          class="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
          :title="card.hint"
        >
          <p class="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span>{{ card.label }}</span>
            <span
              v-if="card.tag"
              class="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200"
            >{{ card.tag }}</span>
          </p>
          <p class="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">
            {{ card.value }}<span class="ml-1 text-xs font-normal text-slate-400">{{ card.unit }}</span>
          </p>
          <p class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            <span v-if="card.change" class="font-semibold" :class="card.tone">{{ card.change }}</span>
            <span>{{ card.previous }}</span>
          </p>
        </article>
      </div>

      <div class="mt-4 rounded-xl border border-slate-100 bg-slate-50/40 p-4 sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-xs font-semibold text-slate-700">浏览与访客</h3>
            <p class="mt-1 text-[11px] text-slate-400">
              {{ rangeText }} · 浏览次数（次）与访客人数（人）
            </p>
          </div>
          <div
            class="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1"
            role="group"
            aria-label="切换每日数据或趋势视图"
          >
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              :class="viewMode === 'daily'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'"
              :aria-pressed="viewMode === 'daily'"
              @click="viewMode = 'daily'"
            >
              每日数据
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              :class="viewMode === 'trend'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'"
              :aria-pressed="viewMode === 'trend'"
              @click="viewMode = 'trend'"
            >
              趋势
            </button>
          </div>
        </div>

        <template v-if="viewMode === 'trend'">
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p class="text-[11px] text-slate-400">纵轴为计数，两条线使用同一刻度，可直接比较高低</p>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500" aria-hidden="true">
              <span class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-rose-500" />浏览次数（次）
              </span>
              <span class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-indigo-500" />访客人数（人）
              </span>
            </div>
          </div>

          <AdminActivityTrendChart :points="dailyPoints" class="mt-2" />
        </template>

        <AdminActivityDailyGrid v-else :points="dailyPoints" />

        <p v-if="isEmpty" class="mt-2 text-xs text-slate-400" role="status">
          所选区间暂无浏览记录，各日浏览与访客数据均为 0。
        </p>
      </div>
    </template>

    <div class="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-400">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite">
          数据更新时间：{{ generatedAt || '—' }}
          <span v-if="data"> · 统计范围：{{ data.startDate }} 至 {{ data.endDate }}（{{ data.days }} 天） · 统计时区：{{ timezone }}</span>
        </p>
        <p v-if="data">环比基准：{{ data.previousStartDate }} 至 {{ data.previousEndDate }}</p>
      </div>

      <details class="mt-2">
        <summary class="cursor-pointer font-medium text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
          统计口径与限制
        </summary>
        <ul class="mt-2 list-disc space-y-1 pl-4">
          <li>浏览次数（PV）：打开或刷新一个受统计的用户内容页面计 1 次；不按接口请求计数，刷新页面会再次计数。</li>
          <li>访客人数（UV）：在整段所选区间内去重。已登录用户按账号内部标识，游客按浏览器访客标识；同一人切换登录状态会分别计数。区间访客人数不能由每日访客人数相加得到。</li>
          <li>日均访客人数 = 区间去重访客人数 ÷ 天数；它是整段区间去重后的日均值，不是每日访客人数相加后的平均值。</li>
          <li>每日明细按日期顺序分页，每页最多 7 天；无浏览记录的日期按 0 展示。</li>
          <li>覆盖范围：仅恋语间 Web 站点（SPA）的用户内容页面；不含管理后台、静态资源、健康检查和微信小程序。</li>
          <li>时间：按 {{ timezone }} 切分，以服务端接收时间为准，客户端不能补录历史或未来日期。</li>
          <li>保留期限：事件保留 {{ data?.retentionDays || 400 }} 天。当前仅按页面白名单和基础频控过滤明显机器人，不宣称完全识别机器人。</li>
        </ul>
      </details>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import AdminActivityDailyGrid from '@/components/admin/AdminActivityDailyGrid.vue'
import AdminActivityTrendChart from '@/components/admin/AdminActivityTrendChart.vue'
import { fetchAdminDashboardActivity } from '@/api/admin/dashboard'
import {
  ACTIVITY_MAX_RANGE_DAYS,
  ACTIVITY_PRESETS,
  buildActivityPayload,
  formatActivityNumber,
  formatChangeRate,
  resolvePresetRange,
  todayKey,
  toDateKey,
  validateActivityRange,
} from '@/utils/activityRange'

const presets = ACTIVITY_PRESETS
const activePreset = ref('7d')
const selectedRange = ref(resolvePresetRange('7d'))
const customRange = ref([])
const data = ref(null)
const loading = ref(false)
const hasLoaded = ref(false)
const error = ref('')
const viewMode = ref('daily')

let loadSequence = 0

const timezone = computed(() => data.value?.timezone || 'Asia/Shanghai')
const dailyPoints = computed(() => (Array.isArray(data.value?.daily) ? data.value.daily : []))
const generatedAt = computed(() => data.value?.generatedAt || '')
const isEmpty = computed(() => hasLoaded.value
  && dailyPoints.value.length > 0
  && dailyPoints.value.every(item => !item.pv && !item.uv))

const rangeText = computed(() => {
  const range = data.value || selectedRange.value
  if (!range?.startDate || !range?.endDate) return '未选择统计区间'
  const days = data.value?.days
  return `${range.startDate} 至 ${range.endDate}${days ? `（共 ${days} 天）` : ''}`
})

const customValidation = computed(() => {
  const range = Array.isArray(customRange.value) ? customRange.value : []
  return validateActivityRange(range[0], range[1], {
    today: todayKey(),
    maxDays: data.value?.maxRangeDays || ACTIVITY_MAX_RANGE_DAYS,
  })
})

const customHint = computed(() => {
  if (activePreset.value !== 'custom') return ''
  if (!Array.isArray(customRange.value) || customRange.value.length !== 2) return ''
  return customValidation.value.valid ? '' : customValidation.value.message
})

function changeTone(rate) {
  if (rate === null || rate === undefined || Number(rate) === 0) return 'text-slate-400'
  return Number(rate) > 0 ? 'text-emerald-600' : 'text-rose-600'
}

function previousLabel(rate, previousValue, unit) {
  if (rate === null || rate === undefined) return '上一周期为 0，暂不计算环比'
  return `上期 ${formatActivityNumber(previousValue)} ${unit}`
}

const metricCards = computed(() => {
  const payload = data.value
  return [
    {
      key: 'pv',
      label: '区间浏览总次数',
      tag: '',
      unit: '次',
      value: payload ? formatActivityNumber(payload.totalPv) : '—',
      change: payload ? `环比 ${formatChangeRate(payload.pvChangeRate)}` : '',
      tone: changeTone(payload?.pvChangeRate),
      previous: payload
        ? previousLabel(payload.pvChangeRate, payload.previousTotalPv, '次')
        : '对比上一等长区间',
      hint: '所选区间内累计的有效页面浏览次数',
    },
    {
      key: 'uv',
      label: '区间访客人数',
      tag: '整段去重',
      unit: '人',
      value: payload ? formatActivityNumber(payload.totalUv) : '—',
      change: payload ? `环比 ${formatChangeRate(payload.uvChangeRate)}` : '',
      tone: changeTone(payload?.uvChangeRate),
      previous: payload
        ? previousLabel(payload.uvChangeRate, payload.previousTotalUv, '人')
        : '对比上一等长区间',
      hint: '整段所选区间内去重后的访客人数，不是每日访客人数相加',
    },
    {
      key: 'avg-pv',
      label: '日均浏览次数',
      tag: '',
      unit: '次/天',
      value: payload ? formatActivityNumber(payload.averagePv, 1) : '—',
      change: '',
      tone: 'text-slate-400',
      previous: payload ? `按 ${payload.days} 天平均` : '按所选天数平均',
      hint: '区间浏览总次数 ÷ 天数',
    },
    {
      key: 'avg-uv',
      label: '日均访客人数',
      tag: '',
      unit: '人/天',
      value: payload ? formatActivityNumber(payload.averageUv, 1) : '—',
      change: '',
      tone: 'text-slate-400',
      previous: payload ? `区间去重访客 ÷ ${payload.days} 天` : '区间去重访客 ÷ 天数',
      hint: '区间去重访客人数 ÷ 天数，不是每日访客人数相加后的平均值',
    },
  ]
})

function disabledDate(date) {
  return toDateKey(date) > todayKey()
}

function selectPreset(key) {
  activePreset.value = key
  if (key === 'custom') {
    const current = selectedRange.value || resolvePresetRange('30d')
    if (!Array.isArray(customRange.value) || customRange.value.length !== 2) {
      customRange.value = [current.startDate, current.endDate]
    }
    return
  }
  const range = resolvePresetRange(key)
  if (!range) return
  selectedRange.value = range
  load()
}

function applyCustomRange() {
  const range = Array.isArray(customRange.value) ? customRange.value : []
  const validation = validateActivityRange(range[0], range[1], {
    today: todayKey(),
    maxDays: data.value?.maxRangeDays || ACTIVITY_MAX_RANGE_DAYS,
  })
  if (!validation.valid) {
    return
  }
  selectedRange.value = buildActivityPayload(range[0], range[1])
  load()
}

async function load() {
  const requestId = ++loadSequence
  loading.value = true
  error.value = ''
  try {
    const { data: body } = await fetchAdminDashboardActivity({ ...selectedRange.value })
    if (requestId !== loadSequence) return
    if (!body?.success || !body.data) {
      throw new Error(body?.message || '活跃度数据加载失败')
    }
    data.value = body.data
    hasLoaded.value = true
  } catch (e) {
    if (requestId !== loadSequence) return
    error.value = e.response?.data?.message || e.message || '活跃度数据加载失败'
    hasLoaded.value = true
  } finally {
    if (requestId === loadSequence) {
      loading.value = false
    }
  }
}

onMounted(load)
</script>

<style scoped>
.activity-date-picker {
  width: 260px;
}

.activity-date-picker :deep(.el-input__wrapper) {
  min-height: 38px;
  border-radius: 12px;
}

@media (max-width: 639px) {
  .activity-date-picker {
    width: 100%;
  }
}
</style>
