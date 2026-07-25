<template>
  <CouplePageScaffold>
    <main class="anniversary-page relative z-10 min-h-[calc(100vh-72px)] pb-16 sm:pb-20">
      <section class="border-b border-rose-100/80 bg-white/45">
        <div class="mx-auto grid max-w-6xl gap-9 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-14 lg:px-8">
          <div class="min-w-0">
            <p class="flex items-center gap-2 text-xs font-bold tracking-[0.22em] text-rose-500">
              <span class="h-px w-7 bg-rose-300" aria-hidden="true" />
              OUR SPECIAL DAYS
            </p>
            <h1 class="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight text-rose-950 sm:text-5xl">
              把重要的日子，<br class="hidden sm:block">留在时间里慢慢发光
            </h1>
            <p class="mt-5 max-w-xl text-sm leading-7 text-rose-900/60 sm:text-base sm:leading-8">
              每一次相遇、出发和庆祝都有日期。从第一次见面开始，我们已经收藏了 {{ anniversaries.length }} 个值得记住的时刻。
            </p>
            <p v-if="apiError" class="mt-3 text-xs font-semibold text-amber-700/75">{{ apiError }}</p>

            <div class="mt-7 flex items-center gap-4">
              <div class="flex -space-x-2" aria-label="我们的头像">
                <img :src="boyAvatar" alt="他的头像" class="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm">
                <img :src="girlAvatar" alt="她的头像" class="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm">
              </div>
              <div class="min-w-0 text-sm">
                <p class="font-semibold text-rose-900">相伴第 {{ togetherDays }} 天</p>
                <p class="mt-0.5 truncate text-xs text-rose-700/50">从 {{ formatFullDate(loveStartDate) }} 开始</p>
              </div>
            </div>
          </div>

          <aside
            v-if="nextAnniversary"
            class="next-day-panel relative overflow-hidden border border-rose-200/80 bg-[#fffaf9] p-6 shadow-[0_22px_60px_rgba(136,57,72,0.13)] sm:p-7"
            :style="themeStyle(nextAnniversary)"
          >
            <div class="absolute inset-y-0 left-0 w-1.5 bg-[var(--accent)]" aria-hidden="true" />
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-bold tracking-[0.18em] text-rose-500">下一份期待</p>
                <p class="mt-2 text-sm text-rose-800/55">{{ formatFullDate(nextOccurrence(nextAnniversary)) }}</p>
              </div>
              <span class="text-xs font-semibold text-[var(--accent)]">{{ repeatLabel(nextAnniversary) }}</span>
            </div>

            <div class="mt-8 grid grid-cols-[1fr_auto] items-end gap-5">
              <div class="min-w-0">
                <p class="truncate font-display text-2xl font-bold text-rose-950 sm:text-3xl">{{ nextAnniversary.title }}</p>
                <p class="mt-2 line-clamp-2 text-sm leading-6 text-rose-800/55">{{ nextAnniversary.description }}</p>
              </div>
              <div class="text-right">
                <p class="font-display text-6xl font-bold leading-none tabular-nums text-[var(--accent)]">{{ daysUntil(nextAnniversary) }}</p>
                <p class="mt-1 text-xs font-semibold text-rose-700/50">天后</p>
              </div>
            </div>

            <div class="mt-7 border-t border-rose-100 pt-5">
              <div class="flex items-center justify-between gap-4 text-xs text-rose-700/50">
                <span>{{ nextAnniversaryLabel(nextAnniversary) }}</span>
                <span>{{ nextAnniversary.location || '只属于我们的地方' }}</span>
              </div>
              <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-rose-100">
                <span class="block h-full rounded-full bg-[var(--accent)] transition-all duration-500" :style="{ width: `${yearProgress}%` }" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section class="border-b border-rose-100/80 bg-white/70" aria-label="纪念日概览">
        <dl class="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div v-for="(stat, index) in overviewStats" :key="stat.label" class="overview-stat" :class="index % 2 ? 'border-l' : ''">
            <dt class="text-xs text-rose-700/45">{{ stat.label }}</dt>
            <dd class="mt-1 flex items-baseline gap-1.5">
              <span class="font-display text-2xl font-bold tabular-nums text-rose-950">{{ stat.value }}</span>
              <span class="text-xs font-semibold text-rose-500">{{ stat.unit }}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-bold tracking-[0.2em] text-rose-400">MEMORY CALENDAR</p>
            <h2 class="mt-2 font-display text-2xl font-bold text-rose-950 sm:text-3xl">我们的纪念日历</h2>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
            <div class="filter-tabs" role="tablist" aria-label="纪念日筛选">
              <button
                v-for="filter in filters"
                :key="filter.value"
                type="button"
                role="tab"
                :aria-selected="activeFilter === filter.value"
                class="filter-tab"
                :class="activeFilter === filter.value ? 'filter-tab-active' : ''"
                @click="activeFilter = filter.value"
              >
                {{ filter.label }}
              </button>
            </div>

            <div class="view-switch" aria-label="视图切换">
              <button type="button" class="view-switch-button" :class="viewMode === 'list' ? 'view-switch-active' : ''" title="列表视图" aria-label="列表视图" @click="viewMode = 'list'">
                <List class="h-4 w-4" />
              </button>
              <button type="button" class="view-switch-button" :class="viewMode === 'year' ? 'view-switch-active' : ''" title="年历视图" aria-label="年历视图" @click="viewMode = 'year'">
                <Grid class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <Transition name="view-fade" mode="out-in">
          <div v-if="viewMode === 'list'" key="list" class="mt-7 grid gap-4 md:grid-cols-2">
            <article
              v-for="item in visibleAnniversaries"
              :key="item.id"
              class="anniversary-card group"
              :style="themeStyle(item)"
            >
              <div class="date-tile" aria-hidden="true">
                <span class="text-[10px] font-bold tracking-wider text-[var(--accent)]">{{ monthLabel(item) }}</span>
                <strong class="font-display text-3xl font-bold leading-none text-rose-950">{{ dayLabel(item) }}</strong>
                <span class="text-[10px] text-rose-700/45">{{ weekdayLabel(item) }}</span>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="truncate font-display text-lg font-bold text-rose-950">{{ item.title }}</h3>
                      <span class="category-tag">{{ categoryLabel(item.category) }}</span>
                    </div>
                    <p class="mt-1.5 line-clamp-2 text-xs leading-5 text-rose-800/50">{{ item.description }}</p>
                  </div>
                  <span class="h-3 w-3 shrink-0 rounded-full bg-[var(--accent)]" :title="`${item.title}卡片颜色`" aria-hidden="true" />
                </div>

                <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rose-100/80 pt-3 text-[11px] text-rose-700/50">
                  <span class="inline-flex items-center gap-1.5">
                    <Timer class="h-3.5 w-3.5 text-[var(--accent)]" />
                    {{ timingLabel(item) }}
                  </span>
                  <span v-if="item.location" class="inline-flex min-w-0 items-center gap-1.5">
                    <Location class="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span class="truncate">{{ item.location }}</span>
                  </span>
                  <span class="ml-auto font-semibold text-[var(--accent)]">{{ repeatLabel(item) }}</span>
                </div>
              </div>
            </article>

            <div v-if="!visibleAnniversaries.length" class="col-span-full border-y border-dashed border-rose-200 py-16 text-center">
              <Calendar class="mx-auto h-8 w-8 text-rose-300" />
              <p class="mt-3 font-display text-lg font-semibold text-rose-900">当前分类还没有纪念日</p>
            </div>
          </div>

          <div v-else key="year" class="mt-7">
            <div class="flex items-center justify-between border-y border-rose-100 bg-white/55 px-2 py-3 sm:px-4">
              <button type="button" class="year-button" title="上一年" aria-label="上一年" @click="selectedYear -= 1">
                <ArrowLeft class="h-4 w-4" />
              </button>
              <p class="font-display text-xl font-bold tabular-nums text-rose-950">{{ selectedYear }} 年</p>
              <button type="button" class="year-button" title="下一年" aria-label="下一年" @click="selectedYear += 1">
                <ArrowRight class="h-4 w-4" />
              </button>
            </div>

            <div class="year-grid">
              <section v-for="month in yearMonths" :key="month.index" class="month-cell">
                <div class="flex items-baseline justify-between gap-3">
                  <h3 class="font-display text-lg font-bold text-rose-950">{{ month.index + 1 }}月</h3>
                  <span class="text-[10px] font-bold tracking-wider text-rose-300">{{ month.english }}</span>
                </div>
                <ul v-if="month.events.length" class="mt-4 space-y-3">
                  <li v-for="event in month.events" :key="event.id" class="flex items-start gap-3" :style="themeStyle(event)">
                    <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-rose-900">{{ event.title }}</p>
                      <p class="mt-0.5 text-[11px] text-rose-700/45">{{ occurrenceDay(event, selectedYear) }}日 · {{ repeatLabel(event) }}</p>
                    </div>
                  </li>
                </ul>
                <p v-else class="mt-8 text-xs text-rose-700/25">等待新的故事</p>
              </section>
            </div>
          </div>
        </Transition>
      </section>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Grid,
  List,
  Location,
  Timer,
} from '@element-plus/icons-vue'
import boyAvatar from '@/assets/boy.jpeg'
import girlAvatar from '@/assets/girl.jpeg'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import api from '@/axios'

const DAY_MS = 86_400_000
const today = startOfDay(new Date())
const loveStartDate = parseDate('2024-08-18')
const activeFilter = ref('all')
const viewMode = ref('list')
const selectedYear = ref(today.getFullYear())

const fallbackAnniversaries = [
  {
    id: 1,
    title: '恋爱纪念日',
    description: '从这一天起，往后的每一个四季都有了共同的名字。',
    date: '2024-08-18',
    repeatType: 'yearly',
    category: 'love',
    location: '江畔公园',
    accent: '#d94f70',
    soft: '#fff0f3',
  },
  {
    id: 2,
    title: '第一次一起旅行',
    description: '临时决定出发，却成了后来反复说起的一段旅程。',
    date: '2024-09-14',
    repeatType: 'yearly',
    category: 'journey',
    location: '青岛',
    accent: '#178f8a',
    soft: '#eaf8f6',
  },
  {
    id: 3,
    title: '她的生日',
    description: '愿新一岁的愿望，都有人陪着慢慢实现。',
    date: '2000-10-06',
    repeatType: 'yearly',
    category: 'birthday',
    location: '',
    accent: '#b36a16',
    soft: '#fff6df',
  },
  {
    id: 4,
    title: '第一次一起看雪',
    description: '路灯下的雪落得很慢，我们也走得很慢。',
    date: '2024-12-07',
    repeatType: 'yearly',
    category: 'memory',
    location: '南京',
    accent: '#4579ad',
    soft: '#edf5fb',
  },
  {
    id: 5,
    title: '第一次见面',
    description: '那天只是普通的初夏，后来却成了故事的第一页。',
    date: '2023-05-20',
    repeatType: 'yearly',
    category: 'memory',
    location: '先锋书店',
    accent: '#7d65ad',
    soft: '#f4effb',
  },
  {
    id: 6,
    title: '第一次看电影',
    description: '散场以后还舍不得回家，于是沿着街道聊了很久。',
    date: '2024-02-14',
    repeatType: 'yearly',
    category: 'memory',
    location: '万达影城',
    accent: '#bc5367',
    soft: '#fff0f2',
  },
  {
    id: 7,
    title: '毕业纪念',
    description: '一起告别校园，也一起走向生活的新章节。',
    date: '2026-06-28',
    repeatType: 'once',
    category: 'milestone',
    location: '大学礼堂',
    accent: '#278064',
    soft: '#eaf7f1',
  },
]

const anniversaries = ref(fallbackAnniversaries)
const apiError = ref('')

const filters = [
  { label: '全部', value: 'all' },
  { label: '近期', value: 'soon' },
  { label: '每年', value: 'yearly' },
  { label: '单次', value: 'once' },
]

const monthEnglish = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const themePresets = {
  love: { accent: '#d94f70', soft: '#fff0f3' },
  journey: { accent: '#178f8a', soft: '#eaf8f6' },
  birthday: { accent: '#b36a16', soft: '#fff6df' },
  memory: { accent: '#4579ad', soft: '#edf5fb' },
  milestone: { accent: '#278064', soft: '#eaf7f1' },
  other: { accent: '#7d65ad', soft: '#f4effb' },
}

function normalizeAnniversary(item) {
  const category = item.category || 'other'
  const preset = themePresets[category] || themePresets.other
  const serverColor = isHexColor(item.colorCode) ? item.colorCode : preset.accent
  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    date: item.anniversaryDate || item.date,
    repeatType: Number(item.repeatType) === 0 ? 'once' : 'yearly',
    category,
    location: item.location || '',
    accent: serverColor,
    soft: item.soft || preset.soft,
  }
}

async function loadAnniversaries() {
  try {
    const { data } = await api.post('/anniversary/list')
    if (!data?.success || !Array.isArray(data.data)) {
      throw new Error(data?.message || '纪念日接口返回格式不正确')
    }
    anniversaries.value = data.data.map(normalizeAnniversary)
  } catch (error) {
    console.error('Failed to load anniversaries:', error)
    apiError.value = '纪念日数据暂时加载失败，当前显示示例数据'
  }
}

onMounted(loadAnniversaries)

const togetherDays = computed(() => Math.max(0, dayDiff(loveStartDate, today)))
const yearProgress = computed(() => {
  const yearStart = new Date(today.getFullYear(), 0, 1)
  const nextYear = new Date(today.getFullYear() + 1, 0, 1)
  return Math.min(100, Math.max(0, Math.round(((today - yearStart) / (nextYear - yearStart)) * 100)))
})

const sortedAnniversaries = computed(() => [...anniversaries.value].sort((a, b) => {
  const aDate = nextOccurrence(a)
  const bDate = nextOccurrence(b)
  if (!aDate && !bDate) return parseDate(b.date) - parseDate(a.date)
  if (!aDate) return 1
  if (!bDate) return -1
  return aDate - bDate
}))

const nextAnniversary = computed(() => sortedAnniversaries.value.find((item) => nextOccurrence(item)) ?? null)

const visibleAnniversaries = computed(() => {
  if (activeFilter.value === 'all') return sortedAnniversaries.value
  if (activeFilter.value === 'soon') {
    return sortedAnniversaries.value.filter((item) => {
      const days = daysUntil(item)
      return days !== null && days >= 0 && days <= 90
    })
  }
  return sortedAnniversaries.value.filter((item) => item.repeatType === activeFilter.value)
})

const overviewStats = computed(() => [
  { label: '相伴时光', value: togetherDays.value, unit: '天' },
  { label: '今年进度', value: yearProgress.value, unit: '%' },
  { label: '收藏日期', value: anniversaries.value.length, unit: '个' },
  { label: '年度纪念', value: anniversaries.value.filter((item) => item.repeatType === 'yearly').length, unit: '个' },
])

const yearMonths = computed(() => Array.from({ length: 12 }, (_, index) => ({
  index,
  english: monthEnglish[index],
  events: anniversaries.value
    .filter((item) => {
      const original = parseDate(item.date)
      if (item.repeatType === 'once' && original.getFullYear() !== selectedYear.value) return false
      return original.getMonth() === index
    })
    .sort((a, b) => parseDate(a.date).getDate() - parseDate(b.date).getDate()),
})))

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function dayDiff(from, to) {
  return Math.floor((startOfDay(to) - startOfDay(from)) / DAY_MS)
}

function yearlyOccurrence(item, year) {
  const original = parseDate(item.date)
  const lastDay = new Date(year, original.getMonth() + 1, 0).getDate()
  return new Date(year, original.getMonth(), Math.min(original.getDate(), lastDay))
}

function nextOccurrence(item) {
  const original = parseDate(item.date)
  if (item.repeatType === 'once') return original >= today ? original : null
  let occurrence = yearlyOccurrence(item, today.getFullYear())
  if (occurrence < today) occurrence = yearlyOccurrence(item, today.getFullYear() + 1)
  return occurrence
}

function daysUntil(item) {
  const occurrence = nextOccurrence(item)
  return occurrence ? dayDiff(today, occurrence) : null
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function monthLabel(item) {
  return `${parseDate(item.date).getMonth() + 1}月`
}

function dayLabel(item) {
  return String(parseDate(item.date).getDate()).padStart(2, '0')
}

function weekdayLabel(item) {
  const occurrence = nextOccurrence(item) ?? parseDate(item.date)
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(occurrence)
}

function occurrenceDay(item, year) {
  if (item.repeatType === 'once') return parseDate(item.date).getDate()
  return yearlyOccurrence(item, year).getDate()
}

function timingLabel(item) {
  const remaining = daysUntil(item)
  if (remaining === null) return `已过去 ${dayDiff(parseDate(item.date), today)} 天`
  if (remaining === 0) return '就是今天'
  return `还有 ${remaining} 天`
}

function repeatLabel(item) {
  return item.repeatType === 'yearly' ? '每年纪念' : '单次记录'
}

function categoryLabel(category) {
  return {
    love: '恋爱',
    journey: '旅行',
    birthday: '生日',
    memory: '回忆',
    milestone: '里程碑',
  }[category] ?? '其他'
}

function nextAnniversaryLabel(item) {
  if (item.repeatType === 'once') return '一次特别记录'
  const occurrence = nextOccurrence(item)
  const started = parseDate(item.date)
  const years = occurrence.getFullYear() - started.getFullYear()
  return years > 0 ? `即将迎来第 ${years} 年` : '故事从这里开始'
}

function themeStyle(item) {
  const accent = isHexColor(item.accent) ? item.accent : '#d94f70'
  return {
    '--accent': accent,
    '--soft': softenColor(accent),
  }
}

function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

function softenColor(hex) {
  const value = hex.slice(1)
  const red = parseInt(value.slice(0, 2), 16)
  const green = parseInt(value.slice(2, 4), 16)
  const blue = parseInt(value.slice(4, 6), 16)
  const mix = (channel) => Math.round(channel * 0.12 + 255 * 0.88)
  return `rgb(${mix(red)}, ${mix(green)}, ${mix(blue)})`
}

</script>

<style scoped>
.anniversary-page {
  background:
    linear-gradient(rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.48)),
    repeating-linear-gradient(90deg, transparent 0, transparent 39px, rgba(225, 29, 72, 0.025) 40px),
    repeating-linear-gradient(0deg, transparent 0, transparent 39px, rgba(225, 29, 72, 0.025) 40px);
}

.next-day-panel {
  border-radius: 8px;
}

.year-button,
.view-switch-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  transition: border-color 180ms ease, background-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.overview-stat {
  min-height: 92px;
  padding: 20px 16px;
  border-color: rgba(254, 205, 211, 0.7);
}

.filter-tabs,
.view-switch {
  display: flex;
  align-items: center;
  width: fit-content;
  min-height: 40px;
  padding: 3px;
  border: 1px solid rgba(254, 205, 211, 0.9);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
}

.filter-tabs {
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  min-height: 32px;
  padding: 0 13px;
  border-radius: 6px;
  color: rgba(159, 18, 57, 0.56);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  transition: background-color 180ms ease, color 180ms ease, box-shadow 180ms ease;
}

.filter-tab:hover {
  color: #be123c;
}

.filter-tab-active {
  background: #fff1f2;
  box-shadow: 0 1px 3px rgba(136, 19, 55, 0.08);
  color: #be123c;
}

.view-switch-button {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: rgba(159, 18, 57, 0.45);
}

.view-switch-button:hover,
.view-switch-active {
  background: #fff1f2;
  color: #be123c;
}

.anniversary-card {
  display: flex;
  align-items: stretch;
  gap: 16px;
  min-height: 168px;
  padding: 18px;
  border: 1px solid rgba(254, 205, 211, 0.76);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 8px 28px rgba(136, 19, 55, 0.055);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.anniversary-card:hover {
  border-color: color-mix(in srgb, var(--accent) 42%, white);
  box-shadow: 0 14px 34px rgba(87, 47, 55, 0.09);
  transform: translateY(-2px);
}

.date-tile {
  display: flex;
  width: 68px;
  min-height: 126px;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 6px;
  background: var(--soft);
}

.category-tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--soft);
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
}

.year-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: rgba(159, 18, 57, 0.55);
}

.year-button:hover {
  background: #fff1f2;
  color: #be123c;
}

.year-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-left: 1px solid rgba(254, 205, 211, 0.75);
}

.month-cell {
  min-height: 180px;
  padding: 20px;
  border-right: 1px solid rgba(254, 205, 211, 0.75);
  border-bottom: 1px solid rgba(254, 205, 211, 0.75);
  background: rgba(255, 255, 255, 0.66);
}

.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.view-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (min-width: 640px) {
  .overview-stat {
    padding-right: 24px;
    padding-left: 24px;
  }
}

@media (min-width: 1024px) {
  .overview-stat + .overview-stat {
    border-left-width: 1px;
  }
}

@media (max-width: 1023px) {
  .year-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .overview-stat:nth-child(n + 3) {
    border-top: 1px solid rgba(254, 205, 211, 0.7);
  }

  .year-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .month-cell {
    min-height: 160px;
    padding: 16px;
  }

  .anniversary-card {
    gap: 12px;
    padding: 14px;
  }

  .date-tile {
    width: 58px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .anniversary-page *,
  .anniversary-page *::before,
  .anniversary-page *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
