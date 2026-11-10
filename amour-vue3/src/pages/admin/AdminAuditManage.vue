<template>
  <div class="space-y-5">
    <section class="admin-filter-panel">
      <div class="admin-filter-bar">
        <div class="admin-filter-fields">
          <el-select
            v-model="filters.action"
            clearable
            filterable
            placeholder="全部动作"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          >
            <el-option v-for="item in actionOptions" :key="item.value" :value="item.value" :label="item.label" />
          </el-select>
          <el-select
            v-model="filters.targetType"
            clearable
            placeholder="全部目标"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          >
            <el-option value="space" label="情侣空间" />
            <el-option value="content" label="内容" />
            <el-option value="user" label="用户" />
            <el-option value="report" label="举报" />
          </el-select>
          <el-input-number
            v-model="filters.targetSpaceId"
            :min="1"
            :controls="false"
            placeholder="空间 ID"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          />
          <el-date-picker
            v-model="filters.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            class="admin-filter-field admin-filter-field--date"
            @change="applyFilters"
          />
        </div>
        <div class="admin-filter-actions">
          <button
            type="button"
            class="admin-filter-button admin-filter-button--secondary admin-filter-button--icon"
            aria-label="刷新审计日志"
            title="刷新审计日志"
            @click="load"
          >
            <Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-20 text-sm text-slate-400">加载中…</div>
      <div v-else-if="error" class="px-6 py-16 text-center text-sm text-rose-600">
        {{ error }}
        <button type="button" class="ml-2 font-semibold underline" @click="load">重试</button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-[1100px] w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium tracking-wide text-slate-500">
            <tr>
              <th class="px-5 py-3">时间</th>
              <th class="px-4 py-3">管理员</th>
              <th class="px-4 py-3">动作</th>
              <th class="px-4 py-3">目标</th>
              <th class="px-4 py-3">原因</th>
              <th class="px-4 py-3">结果</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in rows" :key="row.id" class="align-top hover:bg-slate-50/70">
              <td class="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{{ row.createTime || '-' }}</td>
              <td class="px-4 py-4">
                <p class="text-sm text-slate-700">{{ row.adminDisplayName || '管理员' }}</p>
                <p class="mt-1 font-mono text-[11px] text-slate-400">{{ row.adminAmourId || '-' }}</p>
              </td>
              <td class="px-4 py-4">
                <p class="font-medium text-slate-800">{{ row.actionText || row.action }}</p>
                <p class="mt-1 font-mono text-[11px] text-slate-400">{{ row.action }}</p>
              </td>
              <td class="max-w-[20rem] px-4 py-4 text-xs text-slate-600">
                <p>{{ row.targetTypeText || row.targetType || '-' }}</p>
                <p class="mt-1 font-mono text-[11px] text-slate-400">
                  <span v-if="row.targetSpaceId">空间 #{{ row.targetSpaceId }}</span>
                  <span v-if="row.targetContentType"> · {{ row.targetContentType }} #{{ row.targetContentId }}</span>
                  <span v-if="row.targetUserId"> · 用户 #{{ row.targetUserId }}</span>
                  <span v-if="row.targetReportId"> · 举报 #{{ row.targetReportId }}</span>
                </p>
                <p v-if="row.detail" class="mt-1 break-words text-[11px] text-slate-400">{{ row.detail }}</p>
              </td>
              <td class="max-w-[18rem] px-4 py-4 text-xs leading-5 text-slate-600">
                <p class="line-clamp-3 break-words">{{ row.reason || '-' }}</p>
              </td>
              <td class="px-4 py-4">
                <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="row.result === 'FAILURE' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'">
                  {{ row.result === 'FAILURE' ? '失败' : '成功' }}
                </span>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6" class="px-6 py-16 text-center text-sm text-slate-400">暂无审计记录</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:px-6">
        <span class="text-xs text-slate-400">共 {{ total }} 条</span>
        <div class="flex items-center gap-1">
          <button type="button" :disabled="current <= 1 || loading" class="rounded-lg px-3 py-1.5 text-xs transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="current -= 1">上一页</button>
          <span class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white">{{ current }}</span>
          <button type="button" :disabled="current >= totalPages || loading" class="rounded-lg px-3 py-1.5 text-xs transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="current += 1">下一页</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { fetchAdminAuditPage } from '@/api/admin/audit'

const actionOptions = [
  { value: 'SPACE_DETAIL_VIEW', label: '查看空间详情' },
  { value: 'SPACE_RESTORE', label: '人工恢复空间' },
  { value: 'CONTENT_VIEW', label: '查看内容详情' },
  { value: 'CONTENT_VISIBILITY', label: '调整内容可见性' },
  { value: 'CONTENT_DELETE', label: '逻辑删除内容' },
  { value: 'REPORT_VIEW', label: '查看举报详情' },
  { value: 'REPORT_PROCESS', label: '处理举报' },
  { value: 'USER_DISABLE', label: '停用用户' },
  { value: 'USER_UPDATE', label: '更新用户' },
]

const filters = reactive({ action: null, targetType: null, targetSpaceId: null, timeRange: null })
const current = ref(1)
const pageSize = 10
const total = ref(0)
const rows = ref([])
const loading = ref(false)
const error = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

let loadSequence = 0
async function load() {
  const requestId = ++loadSequence
  loading.value = true
  error.value = ''
  try {
    const timeRange = Array.isArray(filters.timeRange) ? filters.timeRange : []
    const { data } = await fetchAdminAuditPage({
      current: current.value,
      size: pageSize,
      action: filters.action || undefined,
      targetType: filters.targetType || undefined,
      targetSpaceId: filters.targetSpaceId || undefined,
      startTime: timeRange[0] || undefined,
      endTime: timeRange[1] || undefined,
    })
    if (requestId !== loadSequence) return
    if (!data?.success) throw new Error(data?.message || '审计日志加载失败')
    rows.value = Array.isArray(data.data?.records) ? data.data.records : []
    total.value = Number(data.data?.total) || 0
  } catch (e) {
    if (requestId !== loadSequence) return
    rows.value = []
    total.value = 0
    error.value = e.response?.data?.message || e.message || '审计日志加载失败'
  } finally {
    if (requestId === loadSequence) loading.value = false
  }
}

function applyFilters() {
  if (current.value === 1) load()
  else current.value = 1
}

watch(current, load)
onMounted(load)
</script>
