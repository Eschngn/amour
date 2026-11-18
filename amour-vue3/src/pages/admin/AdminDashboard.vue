<template>
  <div class="admin-dashboard space-y-5">
    <!-- 平台概况：不随下面的访问日期筛选变化 -->
    <section aria-labelledby="overview-heading">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="overview-heading" class="text-base font-semibold tracking-tight text-slate-900">平台概况</h2>
          <p class="text-xs text-slate-400">平台当前的整体情况，不随访问日期变化</p>
        </div>
        <p v-if="summaryGeneratedAt" class="text-xs tabular-nums text-slate-400">
          数据更新时间：{{ summaryGeneratedAt }}
        </p>
      </div>

      <div v-if="summaryError" class="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-800" role="alert">
        <span>平台概况加载失败：{{ summaryError }}</span>
        <button
          type="button"
          class="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          @click="loadSummary"
        >重试</button>
      </div>

      <div class="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article
          v-for="card in overviewCards"
          :key="card.key"
          class="admin-dashboard-card admin-dashboard-stat"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-medium text-slate-500">{{ card.label }}</p>
            <component :is="card.icon" class="h-4 w-4 shrink-0" :class="card.tone" aria-hidden="true" />
          </div>
          <p class="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">
            <span v-if="summaryLoading" class="inline-block h-7 w-12 animate-pulse rounded bg-slate-100 align-middle" aria-hidden="true" />
            <template v-else>{{ card.value }}</template>
          </p>
          <p class="mt-1.5 text-xs leading-5 text-slate-400">{{ card.note }}</p>
        </article>
      </div>
    </section>

    <!-- 访问情况：日期筛选只影响这里 -->
    <AdminActivityPanel />

    <!-- 空间状态与待办 -->
    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <article class="admin-dashboard-card" aria-labelledby="space-status-heading">
        <header class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 id="space-status-heading" class="text-base font-semibold tracking-tight text-slate-900">空间状态</h2>
            <p class="mt-1 text-xs text-slate-400">按空间当前状态统计</p>
          </div>
          <RouterLink
            v-if="canSpace"
            to="/admin/space"
            class="admin-dashboard-link"
          >
            进入空间管理
            <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
          </RouterLink>
        </header>

        <dl class="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div
            v-for="item in spaceStatusItems"
            :key="item.key"
            class="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5"
          >
            <dt class="text-xs text-slate-500">{{ item.label }}</dt>
            <dd class="mt-1 text-xl font-semibold tabular-nums text-slate-800">
              {{ summaryLoading ? '—' : item.value }}
            </dd>
          </div>
        </dl>
      </article>

      <article class="admin-dashboard-card" aria-labelledby="todo-heading">
        <header>
          <h2 id="todo-heading" class="text-base font-semibold tracking-tight text-slate-900">待办与入口</h2>
          <p class="mt-1 text-xs text-slate-400">只显示你有权限进入的功能</p>
        </header>

        <ul class="mt-4 space-y-2">
          <li v-if="canSpaceReview">
            <RouterLink
              to="/admin/space-review"
              class="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <span class="flex min-w-0 items-center gap-2 text-sm font-medium text-rose-800">
                <Document class="h-4 w-4 shrink-0" aria-hidden="true" />
                <span class="truncate">空间审核</span>
              </span>
              <span class="flex shrink-0 items-center gap-2">
                <span
                  v-if="pendingReviewText"
                  class="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-100"
                >{{ pendingReviewText }}</span>
                <ArrowRight class="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />
              </span>
            </RouterLink>
          </li>
          <li v-if="canContent">
            <RouterLink
              to="/admin/story"
              class="admin-dashboard-entry"
            >
              <span class="flex items-center gap-2"><Files class="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />内容治理</span>
              <ArrowRight class="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
            </RouterLink>
          </li>
          <li v-if="canAudit">
            <RouterLink
              to="/admin/audit"
              class="admin-dashboard-entry"
            >
              <span class="flex items-center gap-2"><Document class="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />操作审计</span>
              <ArrowRight class="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
            </RouterLink>
          </li>
        </ul>

        <p v-if="!hasAnyEntry" class="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-400">
          暂无待处理事项
        </p>

        <dl class="mt-4 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3">
          <div>
            <dt class="text-xs text-slate-500">用户总数</dt>
            <dd class="mt-1 text-lg font-semibold tabular-nums text-slate-800">{{ summaryLoading ? '—' : formatCount(summary.totalUserCount) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">平台管理员</dt>
            <dd class="mt-1 text-lg font-semibold tabular-nums text-slate-800">{{ summaryLoading ? '—' : formatCount(summary.platformAdminCount) }}</dd>
          </div>
        </dl>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ArrowRight, Connection, Document, Files, Lock } from '@element-plus/icons-vue'
import AdminActivityPanel from '@/components/admin/AdminActivityPanel.vue'
import { fetchAdminDashboardSummary } from '@/api/admin/dashboard'
import { ADMIN_PERMISSIONS, hasAdminPermission } from '@/utils/adminAuth'
import { formatCount } from '@/utils/activityCopy'

const summaryLoading = ref(false)
const summaryError = ref('')
const summary = reactive(defaultSummary())
const hasLoadedSummary = ref(false)

const canSpace = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.SPACE_QUERY))
const canSpaceReview = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.SPACE_REVIEW_QUERY))
const canContent = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.CONTENT_QUERY))
const canAudit = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.AUDIT_QUERY))

const summaryGeneratedAt = computed(() => (hasLoadedSummary.value ? summary.generatedAt : ''))

const overviewCards = computed(() => [
  {
    key: 'pending-space',
    label: '待审核空间',
    value: formatCount(summary.pendingSpaceReviewCount),
    note: '等待处理的公开提交',
    icon: Document,
    tone: 'text-rose-500',
  },
  {
    key: 'pending-content',
    label: '待审核内容',
    value: formatCount(summary.pendingContentReviewCount),
    note: '故事、照片与纪念日',
    icon: Files,
    tone: 'text-amber-500',
  },
  {
    key: 'space-total',
    label: '空间总数',
    value: formatCount(summary.totalSpaceCount),
    note: '含等待绑定与已解绑',
    icon: Connection,
    tone: 'text-emerald-500',
  },
  {
    key: 'space-public',
    label: '公开空间',
    value: formatCount(summary.publicSpaceCount),
    note: '在恋爱广场可见',
    icon: Lock,
    tone: 'text-sky-500',
  },
])

const spaceStatusItems = computed(() => [
  { key: 'waiting', label: '等待绑定', value: formatCount(summary.waitingSpaceCount) },
  { key: 'normal', label: '正常', value: formatCount(summary.normalSpaceCount) },
  { key: 'frozen', label: '已冻结', value: formatCount(summary.frozenSpaceCount) },
  { key: 'archived', label: '已归档', value: formatCount(summary.archivedSpaceCount) },
  { key: 'unbindPending', label: '待确认解绑', value: formatCount(summary.unbindPendingSpaceCount) },
  { key: 'unbound', label: '双方已解绑', value: formatCount(summary.unboundSpaceCount) },
])

// 无待办时不显示空徽标。
const pendingReviewText = computed(() => {
  const count = Number(summary.pendingReviewItemCount)
  return Number.isFinite(count) && count > 0 ? `${formatCount(count)} 项待处理` : ''
})

const hasAnyEntry = computed(() => canSpaceReview.value || canContent.value || canAudit.value)

function defaultSummary() {
  return {
    pendingSpaceReviewCount: 0,
    pendingReviewItemCount: 0,
    pendingContentReviewCount: 0,
    recentRejectedReviewCount: 0,
    recentUnpublishedCount: 0,
    totalSpaceCount: 0,
    waitingSpaceCount: 0,
    normalSpaceCount: 0,
    frozenSpaceCount: 0,
    archivedSpaceCount: 0,
    unbindPendingSpaceCount: 0,
    unboundSpaceCount: 0,
    publicSpaceCount: 0,
    totalUserCount: 0,
    activeUserCount: 0,
    platformAdminCount: 0,
    generatedAt: '',
  }
}

async function loadSummary() {
  summaryLoading.value = true
  summaryError.value = ''
  try {
    const { data } = await fetchAdminDashboardSummary()
    if (!data?.success || !data.data) {
      throw new Error(data?.message || '平台概况加载失败')
    }
    Object.assign(summary, defaultSummary(), data.data)
    hasLoadedSummary.value = true
  } catch (e) {
    summaryError.value = e.response?.data?.message || e.message || '平台概况加载失败'
  } finally {
    summaryLoading.value = false
  }
}

onMounted(loadSummary)
</script>
