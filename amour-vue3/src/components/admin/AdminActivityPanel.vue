<template>
  <section
    class="admin-dashboard-card"
    aria-labelledby="activity-heading"
    :aria-busy="loading ? 'true' : 'false'"
  >
    <!-- 标题与日期筛选 -->
    <header class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 id="activity-heading" class="text-base font-semibold tracking-tight text-slate-900">访问情况</h2>
          <span
            v-if="refreshing"
            class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
            role="status"
          >更新中…</span>
          <span
            v-else-if="refreshFailed"
            class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
            role="status"
          >刷新失败，正在显示上次成功结果</span>
        </div>
        <p class="mt-1 text-xs leading-5 text-slate-400">
          统计网页端与微信小程序的页面访问，按北京时间自然日计算，不含管理后台与登录页。
        </p>
      </div>

      <div class="flex w-full flex-wrap items-center gap-2 xl:w-auto">
        <div
          class="admin-dashboard-segmented admin-dashboard-segmented--presets"
          role="group"
          aria-label="选择日期范围"
        >
          <button
            v-for="preset in presets"
            :key="preset.key"
            type="button"
            class="admin-dashboard-segmented-button"
            :class="{ 'is-active': activePreset === preset.key }"
            :aria-pressed="activePreset === preset.key"
            @click="selectPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>

        <button
          type="button"
          class="admin-filter-button admin-filter-button--secondary admin-filter-button--icon"
          aria-label="刷新访问数据"
          title="刷新访问数据"
          :disabled="loading"
          @click="reload()"
        >
          <Refresh class="h-4 w-4" :class="{ 'animate-spin': loading }" aria-hidden="true" />
        </button>
      </div>
    </header>

    <!-- 自定义日期 -->
    <div v-if="activePreset === 'custom'" class="mt-3 flex flex-wrap items-center gap-2">
      <el-date-picker
        v-model="customRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :clearable="false"
        :disabled-date="disabledDate"
        class="activity-date-picker admin-filter-field admin-filter-field--date"
        aria-label="选择自定义日期范围"
      />
      <button
        type="button"
        class="admin-filter-button admin-filter-button--primary"
        :disabled="!customValidation.valid || loading"
        @click="applyCustomRange"
      >
        查看
      </button>
      <p v-if="customHint" class="text-xs text-rose-600" role="alert">{{ customHint }}</p>
    </div>

    <!-- 概况：随日期变化 -->
    <template v-if="showSkeleton">
      <div class="mt-5 grid gap-3 sm:grid-cols-3" aria-hidden="true">
        <div v-for="n in 3" :key="n" class="h-[104px] animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
      </div>
      <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div class="h-[380px] animate-pulse rounded-xl border border-slate-100 bg-slate-50" aria-hidden="true" />
        <div class="h-[380px] animate-pulse rounded-xl border border-slate-100 bg-slate-50" aria-hidden="true" />
      </div>
    </template>

    <template v-else-if="loadFailed">
      <div class="mt-5 flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-4" role="alert">
        <div>
          <p class="text-sm font-medium text-rose-800">访问数据加载失败</p>
          <p class="mt-1 text-xs leading-5 text-rose-700">{{ error }}</p>
        </div>
        <button type="button" class="admin-filter-button admin-filter-button--primary" @click="reload()">重试</button>
      </div>
    </template>

    <template v-else>
      <!-- 核心数字：浏览次数、访客人数、平均每天浏览 -->
      <div class="mt-5 grid gap-3 sm:grid-cols-3">
        <article
          v-for="card in metricCards"
          :key="card.key"
          class="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5"
        >
          <div class="flex flex-wrap items-center gap-1.5">
            <p class="text-xs font-medium text-slate-500">{{ card.label }}</p>
            <span
              v-if="card.tag"
              class="rounded-full bg-white px-1.5 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200"
            >{{ card.tag }}</span>
          </div>
          <p class="mt-1.5 flex items-baseline gap-1">
            <span class="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">{{ card.value }}</span>
            <span class="text-xs font-normal text-slate-400">{{ card.unit }}</span>
          </p>
          <p v-if="card.comparison" class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5">
            <span class="inline-flex items-center gap-1 font-medium" :class="toneClass(card.comparison.tone)">
              <span aria-hidden="true">{{ directionIcon(card.comparison.direction) }}</span>
              {{ card.comparison.text }}
            </span>
            <span v-if="card.comparison.detail" class="text-slate-400">{{ card.comparison.detail }}</span>
          </p>
          <p v-else class="mt-2 text-xs leading-5 text-slate-400">{{ card.hint }}</p>
        </article>
      </div>

      <!-- 访问趋势（约 2/3）与访问来源（约 1/3） -->
      <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <!-- 访问趋势 -->
        <section class="admin-dashboard-card admin-dashboard-card--nested min-w-0" aria-labelledby="trend-heading">
          <header class="flex flex-col gap-2.5">
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h3 id="trend-heading" class="text-sm font-semibold text-slate-900">访问趋势</h3>
              <p class="text-xs leading-5 text-slate-400">
                {{ rangeText }} · {{ metricConfig.label }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- 指标切换：两个图表共用 -->
              <div class="admin-dashboard-segmented" role="group" aria-label="切换查看浏览次数或访客人数">
                <button
                  v-for="option in metricOptions"
                  :key="option.key"
                  type="button"
                  class="admin-dashboard-segmented-button"
                  :class="{ 'is-active': metric === option.key }"
                  :aria-pressed="metric === option.key"
                  @click="setMetric(option.key)"
                >
                  {{ option.label }}
                </button>
              </div>
              <!-- 趋势 / 每日对比 -->
              <div class="admin-dashboard-segmented" role="group" aria-label="切换趋势图或每日对比">
                <button
                  v-for="option in trendViews"
                  :key="option.key"
                  type="button"
                  class="admin-dashboard-segmented-button"
                  :class="{ 'is-active': trendView === option.key }"
                  :aria-pressed="trendView === option.key"
                  @click="setTrendView(option.key)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </header>

          <!-- 图例：全部来源用中性虚线，来源颜色全页面一致 -->
          <ul class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500" aria-label="图例">
            <li v-for="series in legend" :key="series.key" class="flex items-center gap-1.5">
              <span
                class="inline-block"
                :class="series.dashed ? 'h-0 w-4 border-t border-dashed border-slate-400' : 'h-0.5 w-4 rounded-full'"
                :style="series.dashed ? {} : { backgroundColor: series.color }"
                aria-hidden="true"
              />
              {{ series.name }}
            </li>
          </ul>

          <AdminActivityChartCanvas
            class="mt-2"
            :chart="chart"
            :option="trendOption"
            :loading="loadingNewRange"
            :refreshing="refreshing"
            label="访问趋势"
            :height="308"
            :mobile-height="252"
          >
            <template #empty-action>
              <button type="button" class="mt-3 text-xs font-semibold text-rose-700 underline underline-offset-2" @click="reload()">
                重新加载
              </button>
            </template>
          </AdminActivityChartCanvas>

          <p v-if="chart.notes?.length" class="mt-2 text-xs leading-5 text-slate-400">
            {{ chart.notes.join(' ') }}
          </p>
        </section>

        <!-- 访问来源 -->
        <AdminActivityChannelPanel
          :chart="chart"
          :option="sourceOption"
          :unavailable="channelsUnavailable"
          :loading="loadingNewRange"
        />
      </div>

      <!-- 每日明细：默认收起 -->
      <AdminActivityDailyGrid
        :points="dailyPoints"
        :open="detailOpen"
        @toggle="toggleDetail"
      />

      <!-- 数据说明 -->
      <footer class="mt-4 border-t border-slate-100 pt-3">
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs leading-5 text-slate-400">
          <p aria-live="polite">
            数据更新时间：{{ generatedAt || '—' }}
            <span v-if="data"> · {{ rangeText }}</span>
          </p>
          <p v-if="data?.previousStartDate">对比时段：{{ data.previousStartDate }} 至 {{ data.previousEndDate }}</p>
        </div>

        <p class="mt-1.5 text-xs leading-5 text-slate-400">
          日期按北京时间划分，含起止两天；同一访客只计一次，网页端与微信小程序的访客人数不能直接相加。
        </p>

        <details class="mt-2">
          <summary class="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
            数据说明
          </summary>
          <ul class="mt-2 space-y-1.5 pl-4 text-xs leading-5 text-slate-400">
            <li class="list-disc">
              浏览次数：打开或刷新一个受统计的用户页面计 1 次。网页端在首次进入和有效页面切换时各计一次，
              微信小程序在页面首次展示和真正切换页面时各计一次；两端都不按接口请求次数计数。
            </li>
            <li class="list-disc">
              访客人数：所选时间内按访客标识去重后的数量，不是注册用户数，也不是精确识别到的自然人数。
              已登录用户按账号区分，未登录访客按各自的本地访客标识区分，切换登录状态会分别计数。
            </li>
            <li class="list-disc">
              区间访客人数只能读取接口在所选时间内去重后的合计，不能把每天的访客人数相加。
            </li>
            <li class="list-disc">
              同一访客可能同时出现在网页端与微信小程序，因此两个来源的访客人数不能直接相加，
              各来源访客人数之和也不等于全部来源的访客人数。
            </li>
            <li class="list-disc">
              浏览次数占比只在网页端、微信小程序与全部来源的浏览次数都完整有效时展示，
              访客人数不计算占比。
            </li>
            <li class="list-disc">
              比上一时段：与紧邻当前时间之前的同一长度时段对比。上一时段没有访问时显示“上一时段暂无访问”，
              缺少对比数据时显示“暂无对比数据”。
            </li>
            <li class="list-disc">
              来源区分依据为客户端上报的类型标识，仅用于统计分组，不作为权限判断依据；
              来源字段上线之前的历史记录没有来源信息，统一归入网页端，因此较早时间的网页端数据可能偏高。
            </li>
            <li class="list-disc">
              统计范围：恋语间网页端与微信小程序的用户内容页面，不含管理后台、小程序登录与管理页、
              静态资源、健康检查和错误页。当前只按页面类型和基础频率限制过滤明显的异常访问，
              不承诺完全识别机器人。
            </li>
            <li class="list-disc">
              数据保留 {{ data?.retentionDays || 400 }} 天，最长可查看 {{ maxRangeDays }} 天；以服务器接收时间为准，不补录历史或未来日期。
            </li>
          </ul>
        </details>
      </footer>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import AdminActivityChannelPanel from '@/components/admin/AdminActivityChannelPanel.vue'
import AdminActivityChartCanvas from '@/components/admin/AdminActivityChartCanvas.vue'
import AdminActivityDailyGrid from '@/components/admin/AdminActivityDailyGrid.vue'
import { useActivityDashboard } from '@/composables/useActivityDashboard'
import { fetchAdminDashboardActivity } from '@/api/admin/dashboard'
import { toDateKey, todayKey } from '@/utils/activityRange'
import { CHART_SERIES, TREND_VIEWS, normalizeChartMetric } from '@/utils/activityChart'

const {
  presets,
  activePreset,
  customRange,
  data,
  loading,
  refreshing,
  loadingNewRange,
  showSkeleton,
  error,
  refreshFailed,
  metric,
  metricConfig,
  trendView,
  detailOpen,
  chart,
  trendOption,
  sourceOption,
  dailyPoints,
  generatedAt,
  channelsUnavailable,
  rangeText,
  metricCards,
  maxRangeDays,
  customHint,
  customValidation,
  selectPreset,
  applyCustomRange,
  setMetric,
  setTrendView,
  toggleDetail,
  reload,
} = useActivityDashboard({ fetchActivity: fetchAdminDashboardActivity })

const metricOptions = [
  { key: 'pv', label: '浏览次数' },
  { key: 'uv', label: '访客人数' },
].map(option => ({ ...option, key: normalizeChartMetric(option.key) }))

const trendViews = TREND_VIEWS
const legend = CHART_SERIES

const loadFailed = computed(() => Boolean(error.value) && !data.value)

function disabledDate(date) {
  return toDateKey(date) > todayKey()
}

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

onMounted(reload)
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
