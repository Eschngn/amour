<template>
  <div class="space-y-5">
    <section v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
      {{ error }}
      <button type="button" class="ml-2 font-semibold underline" @click="load">重试</button>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="card in headlineCards"
        :key="card.label"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-400">{{ card.label }}</span>
          <component :is="card.icon" class="h-4 w-4" :class="card.tone" />
        </div>
        <p class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {{ loading ? '—' : card.value }}
        </p>
        <p class="mt-1 text-xs text-slate-400">{{ card.note }}</p>
      </article>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">空间状态</h2>
            <p class="mt-1 text-xs text-slate-400">按空间当前状态统计</p>
          </div>
          <RouterLink
            v-if="canSpace"
            to="/admin/space"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            进入空间管理
          </RouterLink>
        </div>
        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            v-for="item in spaceStatusItems"
            :key="item.key"
            class="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3"
          >
            <p class="text-xs text-slate-400">{{ item.label }}</p>
            <p class="mt-2 text-2xl font-semibold tabular-nums text-slate-800">{{ loading ? '—' : item.value }}</p>
          </div>
        </div>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 class="text-sm font-semibold text-slate-900">待办与入口</h2>
        <div class="mt-4 space-y-2">
          <RouterLink
            v-if="canReport"
            to="/admin/report"
            class="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3 transition hover:bg-rose-50"
          >
            <span class="flex items-center gap-2 text-sm font-medium text-rose-700">
              <Warning class="h-4 w-4" /> 待处理举报
            </span>
            <ArrowRight class="h-3.5 w-3.5 text-rose-300" />
          </RouterLink>
          <RouterLink
            v-if="canContent"
            to="/admin/story"
            class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            <span class="flex items-center gap-2"><Files class="h-4 w-4 text-slate-400" /> 内容治理</span>
            <ArrowRight class="h-3.5 w-3.5 text-slate-300" />
          </RouterLink>
          <RouterLink
            v-if="canAudit"
            to="/admin/audit"
            class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            <span class="flex items-center gap-2"><Document class="h-4 w-4 text-slate-400" /> 操作审计</span>
            <ArrowRight class="h-3.5 w-3.5 text-slate-300" />
          </RouterLink>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <div>
            <p class="text-[11px] text-slate-400">用户总数</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-slate-800">{{ loading ? '—' : summary.totalUserCount }}</p>
          </div>
          <div>
            <p class="text-[11px] text-slate-400">平台管理员</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-slate-800">{{ loading ? '—' : summary.platformAdminCount }}</p>
          </div>
        </div>
      </article>
    </section>

    <p v-if="summary.generatedAt" class="text-right text-[11px] text-slate-400">
      数据生成时间：{{ summary.generatedAt }}
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ArrowRight, Connection, Document, Files, Lock, User, Warning } from '@element-plus/icons-vue'
import { fetchAdminDashboardSummary } from '@/api/admin/dashboard'
import { ADMIN_PERMISSIONS, hasAdminPermission } from '@/utils/adminAuth'

const loading = ref(false)
const error = ref('')
const summary = reactive(defaultSummary())
const canSpace = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.SPACE_QUERY))
const canReport = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.REPORT_QUERY))
const canContent = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.CONTENT_QUERY))
const canAudit = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.AUDIT_QUERY))

function defaultSummary() {
  return {
    pendingReportCount: 0,
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

const headlineCards = computed(() => [
  { label: '待处理举报', value: summary.pendingReportCount, note: '需要审核队列', icon: Warning, tone: 'text-rose-500' },
  { label: '空间总数', value: summary.totalSpaceCount, note: '含等待绑定/解绑历史', icon: Connection, tone: 'text-emerald-500' },
  { label: '公开空间', value: summary.publicSpaceCount, note: '恋爱广场可见', icon: Lock, tone: 'text-sky-500' },
  { label: '活跃用户', value: summary.activeUserCount, note: '未停用账号', icon: User, tone: 'text-indigo-500' },
])

const spaceStatusItems = computed(() => [
  { key: 'waiting', label: '等待绑定', value: summary.waitingSpaceCount },
  { key: 'normal', label: '正常', value: summary.normalSpaceCount },
  { key: 'frozen', label: '已冻结', value: summary.frozenSpaceCount },
  { key: 'archived', label: '已归档', value: summary.archivedSpaceCount },
  { key: 'unbindPending', label: '待确认解绑', value: summary.unbindPendingSpaceCount },
  { key: 'unbound', label: '双方已解绑', value: summary.unboundSpaceCount },
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await fetchAdminDashboardSummary()
    if (!data?.success || !data.data) {
      throw new Error(data?.message || '工作台指标加载失败')
    }
    Object.assign(summary, defaultSummary(), data.data)
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '工作台指标加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
