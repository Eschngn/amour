<template>
  <div class="space-y-5">
    <section class="admin-filter-panel">
      <div class="admin-filter-bar">
        <div class="admin-filter-fields">
          <el-select
            v-model="filters.status"
            clearable
            placeholder="全部状态"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          >
            <el-option :value="0" label="待处理" />
            <el-option :value="1" label="已处理" />
            <el-option :value="2" label="已驳回" />
          </el-select>
          <el-select
            v-model="filters.contentType"
            clearable
            placeholder="全部类型"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          >
            <el-option value="space" label="情侣空间" />
            <el-option value="story" label="故事" />
            <el-option value="photo" label="照片" />
            <el-option value="anniversary" label="纪念日" />
          </el-select>
          <el-select
            v-if="spaceOptionsLoaded"
            v-model="filters.spaceId"
            filterable
            clearable
            placeholder="全部空间"
            class="admin-filter-field admin-filter-field--wide"
            @change="applyFilters"
          >
            <el-option
              v-for="space in spaceOptions"
              :key="space.spaceId"
              :label="`${space.spaceName || '未命名空间'} · ${space.spaceCode || space.spaceId}`"
              :value="space.spaceId"
            />
          </el-select>
          <el-input-number
            v-else
            v-model="filters.spaceId"
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
            aria-label="刷新举报列表"
            title="刷新举报列表"
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
        <table class="w-full min-w-[900px] divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium tracking-wide text-slate-500">
            <tr>
              <th class="px-5 py-3">举报原因</th>
              <th class="px-4 py-3">目标内容</th>
              <th class="px-4 py-3">所属空间</th>
              <th class="px-4 py-3">举报人</th>
              <th class="px-4 py-3">状态</th>
              <th class="px-4 py-3">时间</th>
              <th class="px-5 py-3 admin-table-actions">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in rows" :key="row.reportId" class="align-top hover:bg-slate-50/70">
              <td class="max-w-[18rem] px-5 py-4">
                <p class="line-clamp-2 break-words text-sm leading-6 text-slate-700" :title="row.reason || '未填写原因'">{{ row.reason || '未填写原因' }}</p>
              </td>
              <td class="max-w-[18rem] px-4 py-4">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{{ row.contentTypeText }}</span>
                  <p class="min-w-0 truncate font-medium text-slate-800" :title="row.targetTitle || '目标内容不存在或已删除'">{{ row.targetTitle || '目标内容不存在或已删除' }}</p>
                  <span v-if="row.targetDeleted" class="shrink-0 text-[11px] text-rose-500">已删除</span>
                </div>
                <p class="mt-1 truncate text-[11px] text-slate-400">
                  ID {{ row.contentId }} · {{ row.targetVisibilityText || '状态未知' }}
                </p>
              </td>
              <td class="px-4 py-4">
                <p class="max-w-[11rem] truncate font-medium text-slate-700" :title="row.spaceName || '未知空间'">{{ row.spaceName || '未知空间' }}</p>
                <p class="mt-1 truncate font-mono text-[11px] text-slate-400" :title="`空间 ID ${row.spaceId}`">ID {{ row.spaceId }} · {{ row.spaceCode || '-' }}</p>
              </td>
              <td class="px-4 py-4">
                <p class="max-w-[8rem] truncate text-sm text-slate-700" :title="row.reporterName || '用户'">{{ row.reporterName || '用户' }}</p>
                <p class="mt-1 font-mono text-[11px] text-slate-400">{{ row.reporterAmourId || '-' }}</p>
              </td>
              <td class="px-4 py-4">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="statusClass(row.status)">
                  {{ row.statusText }}
                </span>
                <p v-if="row.processedByName" class="mt-2 text-[11px] text-slate-400">
                  处理人：{{ row.processedByName }}
                </p>
              </td>
              <td class="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                <p>{{ row.createTime || '-' }}</p>
                <p v-if="row.processedAt" class="mt-1">处理：{{ row.processedAt }}</p>
              </td>
              <td class="whitespace-nowrap px-5 py-4 admin-table-actions">
                <div class="admin-table-action-group admin-table-action-group--single">
                  <button type="button" class="admin-table-action text-slate-600 hover:bg-slate-100" @click="openDetail(row)">
                    <component :is="row.status === 0 ? DocumentChecked : View" class="h-3.5 w-3.5" aria-hidden="true" />
                    {{ row.status === 0 ? '处理' : '详情' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="7" class="px-6 py-16 text-center text-sm text-slate-400">暂无符合条件的举报</td>
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

    <el-drawer v-model="detailVisible" :title="detail?.status === 0 ? '处理举报' : '举报详情'" size="min(720px, 94vw)" destroy-on-close>
      <div v-if="detailLoading" class="py-16 text-center text-sm text-slate-400">详情加载中…</div>
      <div v-else-if="detail" class="space-y-5">
        <section class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div class="grid gap-3 text-sm sm:grid-cols-2">
            <div><p class="text-[11px] text-slate-400">举报编号</p><p class="mt-1 font-mono text-slate-700">#{{ detail.reportId }}</p></div>
            <div><p class="text-[11px] text-slate-400">状态</p><p class="mt-1"><span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="statusClass(detail.status)">{{ detail.statusText }}</span></p></div>
            <div><p class="text-[11px] text-slate-400">举报人</p><p class="mt-1 text-slate-700">{{ detail.reporterName || '用户' }} · {{ detail.reporterAmourId || '-' }}</p></div>
            <div><p class="text-[11px] text-slate-400">举报时间</p><p class="mt-1 text-slate-700">{{ detail.createTime || '-' }}</p></div>
          </div>
          <div class="mt-3">
            <p class="text-[11px] text-slate-400">举报原因</p>
            <p class="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{{ detail.reason }}</p>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 p-4">
          <h3 class="text-xs font-semibold text-slate-700">目标与空间</h3>
          <div class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><p class="text-[11px] text-slate-400">空间</p><p class="mt-1 text-slate-700">{{ detail.spaceName }}（ID {{ detail.spaceId }}）</p><p class="mt-1 text-[11px] text-slate-400">{{ detail.spaceStatusText }} / {{ detail.spaceVisibilityText }}</p></div>
            <div><p class="text-[11px] text-slate-400">目标可见性</p><p class="mt-1 text-slate-700">{{ detail.targetVisibilityText || '未知' }} <span v-if="detail.targetDeleted" class="ml-1 text-rose-500">已删除</span></p></div>
            <div class="sm:col-span-2"><p class="text-[11px] text-slate-400">目标标题</p><p class="mt-1 font-medium text-slate-800">{{ detail.targetTitle || '目标内容不存在或已删除' }}</p></div>
            <div v-if="detail.targetUrl" class="sm:col-span-2 overflow-hidden rounded-xl border border-slate-200">
              <img :src="detail.targetUrl" alt="" class="max-h-72 w-full object-contain bg-slate-50">
            </div>
            <div v-if="detail.targetContent" class="sm:col-span-2">
              <p class="text-[11px] text-slate-400">内容正文</p>
              <pre class="mt-1 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-700">{{ detail.targetContent }}</pre>
            </div>
          </div>
        </section>

        <section v-if="detail.handleNote" class="rounded-xl border border-slate-200 p-4">
          <h3 class="text-xs font-semibold text-slate-700">处理记录</h3>
          <p class="mt-2 text-xs text-slate-500">动作：{{ detail.handleAction === 'confirm' ? '确认违规' : '驳回' }} · {{ detail.handleAt }}</p>
          <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{{ detail.handleNote }}</p>
          <p v-if="detail.processedByName" class="mt-2 text-[11px] text-slate-400">处理人：{{ detail.processedByName }} · {{ detail.processedAt }}</p>
        </section>

        <section v-if="detail.status === 0 && canProcess" class="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
          <h3 class="text-sm font-semibold text-rose-800">处理举报</h3>
          <el-radio-group v-model="processForm.action" class="mt-3">
            <el-radio-button value="reject">驳回举报</el-radio-button>
            <el-radio-button value="confirm">确认违规</el-radio-button>
          </el-radio-group>
          <div v-if="processForm.action === 'confirm'" class="mt-3 space-y-2">
            <label class="flex items-center gap-2 text-xs text-slate-600">
              <input v-model="processForm.hideContent" type="checkbox" class="h-3.5 w-3.5 rounded border-slate-300">
              隐藏目标内容（内容类型为空间时自动设为私密）
            </label>
            <label class="flex items-center gap-2 text-xs text-slate-600">
              <input v-model="processForm.setSpacePrivate" type="checkbox" class="h-3.5 w-3.5 rounded border-slate-300">
              同时将目标空间设为私密
            </label>
          </div>
          <el-input
            v-model="processForm.note"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
            placeholder="请填写处理备注（必填）"
            class="mt-3"
          />
          <div class="mt-3 flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-white" @click="detailVisible = false">取消</button>
            <button type="button" class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="processing" @click="submitProcess">
              {{ processing ? '提交中…' : '确认处理' }}
            </button>
          </div>
        </section>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { DocumentChecked, Refresh, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { fetchAdminReportDetail, fetchAdminReportPage, processAdminReport } from '@/api/admin/report'
import { fetchAdminSpacePage } from '@/api/admin/space'
import { ADMIN_PERMISSIONS, hasAdminPermission } from '@/utils/adminAuth'

const route = useRoute()
const canProcess = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.REPORT_PROCESS))

const filters = reactive({
  status: null,
  contentType: route.query.contentType || null,
  spaceId: Number(route.query.spaceId) > 0 ? Number(route.query.spaceId) : null,
  timeRange: null,
})
const current = ref(1)
const pageSize = 10
const total = ref(0)
const rows = ref([])
const loading = ref(false)
const error = ref('')
const spaceOptions = ref([])
const spaceOptionsLoaded = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const processing = ref(false)
const processForm = reactive({ action: 'reject', note: '', hideContent: true, setSpacePrivate: false })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function statusClass(status) {
  if (status === 0) return 'bg-amber-50 text-amber-600'
  if (status === 1) return 'bg-emerald-50 text-emerald-600'
  return 'bg-slate-100 text-slate-500'
}

async function loadSpaceOptions() {
  try {
    const { data } = await fetchAdminSpacePage({ current: 1, size: 100 })
    if (data?.success) {
      spaceOptions.value = (data.data?.records || []).map(item => ({
        spaceId: item.spaceId,
        spaceName: item.spaceName,
        spaceCode: item.spaceCode,
      }))
      spaceOptionsLoaded.value = true
    }
  } catch {
    spaceOptionsLoaded.value = false
  }
}

let loadSequence = 0
async function load() {
  const requestId = ++loadSequence
  loading.value = true
  error.value = ''
  try {
    const timeRange = Array.isArray(filters.timeRange) ? filters.timeRange : []
    const { data } = await fetchAdminReportPage({
      current: current.value,
      size: pageSize,
      status: typeof filters.status === 'number' ? filters.status : undefined,
      contentType: filters.contentType || undefined,
      spaceId: filters.spaceId || undefined,
      startTime: timeRange[0] || undefined,
      endTime: timeRange[1] || undefined,
    })
    if (requestId !== loadSequence) return
    if (!data?.success) throw new Error(data?.message || '举报列表加载失败')
    rows.value = Array.isArray(data.data?.records) ? data.data.records : []
    total.value = Number(data.data?.total) || 0
  } catch (e) {
    if (requestId !== loadSequence) return
    rows.value = []
    total.value = 0
    error.value = e.response?.data?.message || e.message || '举报列表加载失败'
  } finally {
    if (requestId === loadSequence) loading.value = false
  }
}

function applyFilters() {
  if (current.value === 1) load()
  else current.value = 1
}

async function openDetail(row) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  processForm.action = 'reject'
  processForm.note = ''
  processForm.hideContent = true
  processForm.setSpacePrivate = false
  try {
    const { data } = await fetchAdminReportDetail(row.reportId)
    if (!data?.success) throw new Error(data?.message || '举报详情加载失败')
    detail.value = data.data
    if (data.data?.contentType === 'space') {
      processForm.hideContent = false
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || '举报详情加载失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

async function submitProcess() {
  if (!processForm.note.trim()) {
    ElMessage.warning('请填写处理备注')
    return
  }
  processing.value = true
  try {
    const { data } = await processAdminReport({
      reportId: detail.value.reportId,
      action: processForm.action,
      note: processForm.note.trim(),
      hideContent: processForm.action === 'confirm' ? processForm.hideContent : false,
      setSpacePrivate: processForm.action === 'confirm' ? processForm.setSpacePrivate : false,
    })
    if (!data?.success) throw new Error(data?.message || '举报处理失败')
    ElMessage.success(processForm.action === 'confirm' ? '举报已确认并完成处置' : '举报已驳回')
    detailVisible.value = false
    await load()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || '举报处理失败')
  } finally {
    processing.value = false
  }
}

watch(current, load)
onMounted(() => {
  loadSpaceOptions()
  load()
})
</script>
