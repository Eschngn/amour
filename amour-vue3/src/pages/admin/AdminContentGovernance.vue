<template>
  <div class="space-y-5">
    <section class="admin-filter-panel">
      <div class="admin-filter-bar">
        <div class="admin-filter-fields">
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
          <label class="admin-filter-field admin-filter-field--search">
            <Search class="admin-search-icon" />
            <input
              v-model="filters.keyword"
              type="search"
              :aria-label="`搜索${contentTypeLabel}`"
              :placeholder="`搜索${contentTypeLabel}`"
              class="admin-search-input"
              @keyup.enter="applyFilters"
            >
          </label>
          <el-select
            v-model="filters.visibility"
            clearable
            placeholder="全部可见性"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          >
            <el-option :value="0" label="仅空间成员" />
            <el-option :value="1" label="公开" />
            <el-option :value="2" label="隐藏" />
          </el-select>
          <label class="admin-filter-field admin-filter-field--check">
            <input v-model="filters.includeDeleted" type="checkbox" @change="applyFilters">
            含已删除
          </label>
        </div>
        <div class="admin-filter-actions">
          <button
            type="button"
            class="admin-filter-button admin-filter-button--primary"
            @click="applyFilters"
          >
            查询
          </button>
          <button
            type="button"
            class="admin-filter-button admin-filter-button--secondary admin-filter-button--icon"
            aria-label="刷新内容列表"
            title="刷新内容列表"
            @click="load"
          >
            <Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>

      <div
        v-if="!canCrossSpace && !filters.spaceId"
        class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700"
      >
        当前账号没有跨空间查询权限，请先选择具体空间后再查看内容。
      </div>
      <div
        v-else-if="routeSpaceId && filters.spaceId === routeSpaceId"
        class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-700"
      >
        <span>已从空间详情进入，当前只显示该空间内容。</span>
        <button type="button" class="font-semibold underline" @click="clearSpaceFilter">查看全部空间</button>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-20 text-sm text-slate-400">加载中…</div>
      <div v-else-if="error" class="px-6 py-16 text-center">
        <p class="text-sm text-rose-600">{{ error }}</p>
        <button type="button" class="mt-3 text-xs font-semibold text-rose-600 underline" @click="load">重试</button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium tracking-wide text-slate-500">
            <tr>
              <th class="px-5 py-3">内容</th>
              <th class="px-4 py-3">所属空间</th>
              <th class="px-4 py-3">作者</th>
              <th v-if="contentType !== 'message'" class="px-4 py-3">可见性</th>
              <th class="px-4 py-3">举报</th>
              <th class="px-5 py-3 admin-table-actions">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in rows" :key="`${row.contentType}-${row.contentId}`" class="align-top hover:bg-slate-50/70">
              <td class="max-w-[20rem] px-5 py-4">
                <div class="flex items-start gap-3">
                  <img
                    v-if="row.coverImage"
                    :src="row.coverImage"
                    alt=""
                    class="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-100"
                  >
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <p class="min-w-0 truncate font-medium text-slate-800" :title="row.title || '未命名内容'">{{ row.title || '未命名内容' }}</p>
                      <span v-if="row.deleted" class="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">已删除</span>
                    </div>
                    <p class="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-400" :title="row.summary || ''">
                      {{ row.summary || (contentType === 'message' ? '私密留言，仅空间成员可见' : row.title) || '暂无摘要' }}
                    </p>
                    <p v-if="row.chapterName || row.categoryName" class="mt-1 text-[11px] text-slate-400">
                      {{ row.chapterName || row.categoryName }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4">
                <p class="max-w-[11rem] truncate font-medium text-slate-700" :title="row.spaceName || '未知空间'">{{ row.spaceName || '未知空间' }}</p>
                <p class="mt-1 truncate font-mono text-[11px] text-slate-400" :title="`空间 ID ${row.spaceId}`">ID {{ row.spaceId }} · {{ row.spaceCode || '-' }}</p>
              </td>
              <td class="px-4 py-4">
                <p class="max-w-[9rem] truncate text-sm text-slate-700" :title="row.authorName || '恋人'">{{ row.authorName || '恋人' }}</p>
                <p class="mt-1 font-mono text-[11px] text-slate-400">{{ row.authorAmourId || '-' }}</p>
              </td>
              <td v-if="contentType !== 'message'" class="px-4 py-4">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="visibilityClass(row.visibility)">
                  {{ row.visibilityText || visibilityText(row.visibility) }}
                </span>
              </td>
              <td class="px-4 py-4">
                <button
                  v-if="row.reportCount"
                  type="button"
                  class="whitespace-nowrap text-xs font-semibold text-rose-600 underline-offset-2 hover:underline"
                  @click="openReports(row)"
                >
                  {{ row.pendingReportCount || 0 }} 待处理 / {{ row.reportCount }} 总
                </button>
                <span v-else class="text-xs text-slate-400">无</span>
              </td>
              <td class="whitespace-nowrap px-5 py-4 admin-table-actions">
                <div class="admin-table-action-group admin-table-action-group--content">
                  <button
                    type="button"
                    class="admin-table-action text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                    @click="openDetail(row)"
                  >
                    <View class="h-3.5 w-3.5" aria-hidden="true" />详情
                  </button>
                  <button
                    v-if="canModerate && !row.deleted && contentType !== 'message' && row.visibility !== 2"
                    type="button"
                    class="admin-table-action text-amber-600 hover:bg-amber-50"
                    @click="moderate(row, 2)"
                  >
                    <Hide class="h-3.5 w-3.5" aria-hidden="true" />隐藏
                  </button>
                  <button
                    v-if="canModerate && !row.deleted && contentType !== 'message' && row.visibility === 2"
                    type="button"
                    class="admin-table-action text-emerald-600 hover:bg-emerald-50"
                    @click="moderate(row, 0)"
                  >
                    <RefreshLeft class="h-3.5 w-3.5" aria-hidden="true" />恢复展示
                  </button>
                  <button
                    v-if="canDelete && !row.deleted"
                    type="button"
                    class="admin-table-action text-rose-600 hover:bg-rose-50"
                    @click="removeContent(row)"
                  >
                    <Delete class="h-3.5 w-3.5" aria-hidden="true" />删除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td :colspan="contentType === 'message' ? 6 : 7" class="px-6 py-16 text-center text-sm text-slate-400">
                {{ canCrossSpace || filters.spaceId ? '暂无符合条件的内容' : '请选择空间后查询' }}
              </td>
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

    <el-drawer v-model="detailVisible" :title="`${contentTypeLabel}详情`" size="min(680px, 94vw)" destroy-on-close>
      <div v-if="detail" class="space-y-5 text-sm">
        <section class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div><p class="text-[11px] text-slate-400">所属空间</p><p class="mt-1 font-medium text-slate-800">{{ detail.spaceName }}（ID {{ detail.spaceId }}）</p></div>
            <div><p class="text-[11px] text-slate-400">空间状态</p><p class="mt-1 text-slate-700">{{ detail.spaceStatusText }} / {{ detail.spaceVisibilityText }}</p></div>
            <div><p class="text-[11px] text-slate-400">作者</p><p class="mt-1 text-slate-700">{{ detail.authorName }} · {{ detail.authorAmourId || '-' }}</p></div>
            <div><p class="text-[11px] text-slate-400">可见性</p><p class="mt-1"><span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="visibilityClass(detail.visibility)">{{ detail.visibilityText }}</span></p></div>
            <div><p class="text-[11px] text-slate-400">创建时间</p><p class="mt-1 text-slate-700">{{ detail.createTime || '-' }}</p></div>
            <div><p class="text-[11px] text-slate-400">更新时间</p><p class="mt-1 text-slate-700">{{ detail.updateTime || '-' }}</p></div>
          </div>
        </section>

        <section class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-semibold text-slate-900">{{ detail.title || '未命名内容' }}</h3>
            <span v-if="detail.deleted" class="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">已删除</span>
          </div>
          <p v-if="detail.summary" class="text-xs leading-6 text-slate-500">{{ detail.summary }}</p>
          <div v-if="detail.photoUrl" class="overflow-hidden rounded-xl border border-slate-200">
            <img :src="detail.photoUrl" alt="" class="max-h-80 w-full object-contain bg-slate-50">
          </div>
          <pre v-if="detail.content" class="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-700">{{ detail.content }}</pre>
          <div v-if="detail.images?.length" class="flex flex-wrap gap-2">
            <img v-for="(image, index) in detail.images" :key="index" :src="image.url" alt="" class="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-100">
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 p-4">
          <h3 class="text-xs font-semibold text-slate-700">关联举报</h3>
          <p v-if="!detail.reports?.length" class="mt-2 text-xs text-slate-400">暂无举报记录</p>
          <ul v-else class="mt-2 space-y-2">
            <li v-for="report in detail.reports" :key="report.reportId" class="rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-medium text-slate-700">{{ report.reporterName }} · {{ report.reporterAmourId || '-' }}</span>
                <span class="rounded-full bg-white px-2 py-0.5 font-semibold text-slate-500">{{ report.statusText }}</span>
              </div>
              <p class="mt-1 whitespace-pre-wrap break-words text-slate-500">{{ report.reason }}</p>
              <p class="mt-1 text-[10px] text-slate-400">{{ report.createTime }}</p>
            </li>
          </ul>
        </section>
      </div>
      <div v-else class="py-16 text-center text-sm text-slate-400">详情加载中…</div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Delete, Hide, Refresh, RefreshLeft, Search, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdminContentDetail, fetchAdminContentPage, deleteAdminContent, moderateAdminContentVisibility } from '@/api/admin/content'
import { fetchAdminSpacePage } from '@/api/admin/space'
import { hasAdminPermission, ADMIN_PERMISSIONS } from '@/utils/adminAuth'

const route = useRoute()
const router = useRouter()

const contentTypeLabelMap = { story: '故事', photo: '照片', anniversary: '纪念日', message: '留言' }
const contentType = computed(() => route.meta?.contentType || 'story')
const contentTypeLabel = computed(() => contentTypeLabelMap[contentType.value] || '内容')
const canCrossSpace = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.CONTENT_CROSS_SPACE))
const canModerate = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.CONTENT_MODERATE))
const canDelete = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.CONTENT_DELETE))

const routeSpaceId = computed(() => {
  const value = Number(route.query.spaceId)
  return Number.isInteger(value) && value > 0 ? value : null
})

const filters = reactive({
  spaceId: routeSpaceId.value,
  keyword: '',
  visibility: null,
  includeDeleted: false,
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
const detail = ref(null)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function visibilityText(value) {
  if (value === 0) return '仅空间成员'
  if (value === 1) return '公开'
  if (value === 2) return '隐藏'
  return '-'
}

function visibilityClass(value) {
  if (value === 1) return 'bg-emerald-50 text-emerald-600'
  if (value === 2) return 'bg-rose-50 text-rose-600'
  return 'bg-slate-100 text-slate-600'
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
  if (!canCrossSpace.value && !filters.spaceId) {
    rows.value = []
    total.value = 0
    error.value = ''
    return
  }
  const requestId = ++loadSequence
  loading.value = true
  error.value = ''
  try {
    const { data } = await fetchAdminContentPage({
      current: current.value,
      size: pageSize,
      contentType: contentType.value,
      spaceId: filters.spaceId || undefined,
      keyword: filters.keyword.trim() || undefined,
      visibility: typeof filters.visibility === 'number' ? filters.visibility : undefined,
      includeDeleted: filters.includeDeleted || undefined,
    })
    if (requestId !== loadSequence) return
    if (!data?.success) throw new Error(data?.message || '内容列表加载失败')
    rows.value = Array.isArray(data.data?.records) ? data.data.records : []
    total.value = Number(data.data?.total) || 0
  } catch (e) {
    if (requestId !== loadSequence) return
    rows.value = []
    total.value = 0
    error.value = e.response?.data?.message || e.message || '内容列表加载失败'
  } finally {
    if (requestId === loadSequence) loading.value = false
  }
}

function applyFilters() {
  if (current.value === 1) load()
  else current.value = 1
}

function clearSpaceFilter() {
  filters.spaceId = null
  const query = { ...route.query }
  delete query.spaceId
  router.replace({ path: route.path, query })
}

async function openDetail(row) {
  detailVisible.value = true
  detail.value = null
  try {
    const { data } = await fetchAdminContentDetail({
      contentType: row.contentType,
      contentId: row.contentId,
      spaceId: row.spaceId,
    })
    if (!data?.success) throw new Error(data?.message || '详情加载失败')
    detail.value = data.data
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || '详情加载失败')
  }
}

async function moderate(row, visibility) {
  const actionLabel = visibility === 2 ? '隐藏' : '恢复展示（仅空间成员可见）'
  let reason
  try {
    const result = await ElMessageBox.prompt(
      visibility === 2
        ? '隐藏后该内容不会出现在恋爱广场，也不会显示给空间成员。请填写操作原因。'
        : '恢复后内容仅对空间成员可见；如需再次公开，请由空间成员在用户端编辑。请填写操作原因。',
      actionLabel,
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputPlaceholder: '请填写原因（必填）',
        inputValidator: value => (String(value || '').trim().length > 0 ? true : '请填写操作原因'),
      },
    )
    reason = result.value
  } catch {
    return
  }
  try {
    const { data } = await moderateAdminContentVisibility({
      contentType: row.contentType,
      contentId: row.contentId,
      spaceId: row.spaceId,
      visibility,
      reason,
    })
    if (!data?.success) throw new Error(data?.message || '操作失败')
    ElMessage.success(visibility === 2 ? '内容已隐藏' : '内容已恢复为仅空间成员可见')
    await load()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || '操作失败')
  }
}

async function removeContent(row) {
  let reason
  try {
    const result = await ElMessageBox.prompt(
      '删除为逻辑删除，内容仍保留用于审计，但不会再出现在用户端。请填写删除原因。',
      '删除内容',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        inputPlaceholder: '请填写原因（必填）',
        inputValidator: value => (String(value || '').trim().length > 0 ? true : '请填写删除原因'),
      },
    )
    reason = result.value
  } catch {
    return
  }
  try {
    const { data } = await deleteAdminContent({
      contentType: row.contentType,
      contentId: row.contentId,
      spaceId: row.spaceId,
      reason,
    })
    if (!data?.success) throw new Error(data?.message || '删除失败')
    ElMessage.success('内容已逻辑删除')
    await load()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || '删除失败')
  }
}

function openReports(row) {
  if (!hasAdminPermission(ADMIN_PERMISSIONS.REPORT_QUERY)) return
  router.push({
    path: '/admin/report',
    query: { spaceId: row.spaceId, contentType: row.contentType },
  })
}

watch(current, load)
watch(() => contentType.value, () => {
  filters.spaceId = routeSpaceId.value
  current.value = 1
  load()
})

onMounted(() => {
  loadSpaceOptions()
  load()
})
</script>
