<template>
  <div class="space-y-5">
    <section class="admin-filter-panel">
      <div class="admin-filter-bar">
        <div class="admin-filter-fields">
          <label class="admin-filter-field admin-filter-field--search">
            <Search class="admin-search-icon" />
            <input
              v-model="filters.keyword"
              type="search"
              aria-label="搜索情侣空间"
              placeholder="搜索空间名、spaceCode 或成员恋语 ID"
              class="admin-search-input"
              @keyup.enter="applyFilters"
            >
          </label>
          <el-select
            v-model="filters.status"
            clearable
            placeholder="全部状态"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          >
            <el-option :value="0" label="等待绑定" />
            <el-option :value="1" label="正常" />
            <el-option :value="2" label="已冻结" />
            <el-option :value="3" label="已归档" />
            <el-option :value="4" label="删除等待期" />
            <el-option :value="5" label="双方已解绑" />
          </el-select>
          <el-select
            v-model="filters.visibility"
            clearable
            placeholder="全部公开状态"
            class="admin-filter-field admin-filter-field--select"
            @change="applyFilters"
          >
            <el-option :value="0" label="私密" />
            <el-option :value="1" label="公开" />
          </el-select>
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
            aria-label="刷新空间列表"
            title="刷新空间列表"
            @click="load"
          >
            <Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-24 text-sm text-slate-400">加载中…</div>
      <div v-else-if="error" class="px-6 py-16 text-center text-sm text-rose-600">
        {{ error }}
        <button type="button" class="ml-2 font-semibold underline" @click="load">重试</button>
      </div>
      <div v-else-if="!rows.length" class="px-6 py-20 text-center">
        <Connection class="mx-auto h-9 w-9 text-slate-200" />
        <p class="mt-3 text-sm font-medium text-slate-600">暂无符合条件的情侣空间</p>
        <p class="mt-1 text-xs text-slate-400">调整关键字、状态或公开状态后再查询。</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium tracking-wide text-slate-500">
            <tr>
              <th class="px-6 py-3">空间</th>
              <th class="px-4 py-3">成员</th>
              <th class="px-4 py-3">状态</th>
              <th class="px-4 py-3">公开</th>
              <th class="px-4 py-3">内容</th>
              <th class="px-6 py-3 admin-table-actions">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in rows" :key="row.spaceId" class="align-top hover:bg-slate-50/70">
              <td class="max-w-[18rem] px-6 py-4">
                <p class="truncate font-medium text-slate-800" :title="row.spaceName || '未命名空间'">{{ row.spaceName || '未命名空间' }}</p>
                <p class="mt-1 truncate font-mono text-[11px] text-slate-400" :title="`空间 ID ${row.spaceId}`">ID {{ row.spaceId }} · {{ row.spaceCode || '-' }}</p>
              </td>
              <td class="px-4 py-4">
                <div v-if="row.members?.length" class="space-y-1.5">
                  <div v-for="member in row.members" :key="`${member.memberRole}-${member.amourId}-${member.status}`" class="flex items-center gap-2">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-100 text-[10px] font-bold text-rose-500">
                      <img v-if="member.avatar" :src="member.avatar" alt="" class="h-7 w-7 rounded-full object-cover">
                      <template v-else>{{ (member.displayName || '恋').slice(0, 1) }}</template>
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-medium text-slate-700">{{ member.displayName || '恋人' }}</p>
                      <p class="truncate font-mono text-[10px] text-slate-400">{{ member.amourId || '-' }} · {{ member.roleText }}</p>
                    </div>
                    <span v-if="member.status !== 1" class="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{{ member.statusText }}</span>
                  </div>
                </div>
                <p v-else class="text-xs text-rose-500">缺少成员关系</p>
              </td>
              <td class="whitespace-nowrap px-4 py-4">
                <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="statusClass(row.status)">{{ row.statusText }}</span>
              </td>
              <td class="whitespace-nowrap px-4 py-4">
                <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="row.visibility === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'">
                  {{ row.visibilityText || '私密' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-4">
                <p class="text-xs font-semibold text-slate-700" :title="contentBreakdown(row)">{{ row.contentCount ?? 0 }} 项</p>
              </td>
              <td class="whitespace-nowrap px-6 py-4 admin-table-actions">
                <div class="admin-table-action-group admin-table-action-group--space">
                  <button type="button" class="admin-table-action text-slate-600 hover:bg-slate-100" @click="openDetail(row)">
                    <View class="h-3.5 w-3.5" aria-hidden="true" /> 详情
                  </button>
                  <button
                    v-if="row.status === 5"
                    type="button"
                    class="admin-table-action text-emerald-600 hover:bg-emerald-50"
                    :disabled="!row.restorable || restoringId !== null"
                    :title="row.restorable ? '' : row.restoreBlockReason"
                    @click="restore(row)"
                  >
                    <CircleCheck class="h-3.5 w-3.5" aria-hidden="true" /> {{ restoringId === row.spaceId ? '恢复中…' : '人工恢复' }}
                  </button>
                </div>
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

    <el-drawer v-model="detailVisible" title="空间详情" size="min(900px, 96vw)" class="admin-dialog-surface" destroy-on-close>
      <div v-if="detailLoading" class="py-20 text-center text-sm text-slate-400">详情加载中…</div>
      <div v-else-if="detail" class="space-y-4">
        <section class="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/70 to-white p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-semibold text-slate-900">{{ detail.spaceName || '未命名空间' }}</h3>
                <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="statusClass(detail.status)">{{ detail.statusText }}</span>
                <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="detail.visibility === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'">{{ detail.visibilityText }}</span>
              </div>
              <p class="mt-2 font-mono text-xs text-slate-400">ID {{ detail.spaceId }} · {{ detail.spaceCode }}</p>
              <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{{ detail.description || '暂无空间简介' }}</p>
            </div>
            <button
              v-if="detail.restore?.restorable"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="restoringId !== null"
              @click="restoreDetail"
            >
              <CircleCheck class="h-4 w-4" /> {{ restoringId === detail.spaceId ? '恢复中…' : '人工恢复' }}
            </button>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div v-for="item in detailCounts" :key="item.label" class="rounded-xl border border-white bg-white/80 px-3 py-2 text-center">
              <p class="text-[10px] text-slate-400">{{ item.label }}</p>
              <p class="mt-1 text-lg font-semibold tabular-nums text-slate-800">{{ item.value }}</p>
            </div>
          </div>
        </section>

        <el-tabs v-model="activeTab" class="space-detail-tabs">
          <el-tab-pane label="概览" name="overview">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="detail-card"><p class="detail-label">创建时间</p><p class="detail-value">{{ detail.createTime || '-' }}</p></div>
              <div class="detail-card"><p class="detail-label">最后更新</p><p class="detail-value">{{ detail.updateTime || '-' }}</p></div>
              <div class="detail-card"><p class="detail-label">恋爱开始</p><p class="detail-value">{{ detail.loveStartTime || '-' }}</p></div>
              <div class="detail-card"><p class="detail-label">首次公开</p><p class="detail-value">{{ detail.publicAt || '-' }}</p></div>
              <div class="detail-card"><p class="detail-label">冻结/归档</p><p class="detail-value">{{ detail.archivedAt || '-' }}</p></div>
              <div class="detail-card"><p class="detail-label">解绑时间</p><p class="detail-value">{{ detail.deletedAt || '-' }}</p></div>
            </div>
            <div class="mt-4 rounded-xl border border-slate-200 p-4">
              <h4 class="text-xs font-semibold text-slate-700">生命周期摘要</h4>
              <ul v-if="detail.timeline?.length" class="mt-3 space-y-2">
                <li v-for="(event, index) in detail.timeline" :key="index" class="flex gap-3 text-xs">
                  <span class="w-32 shrink-0 text-slate-400">{{ event.time }}</span>
                  <span class="min-w-0 text-slate-700">{{ event.title }}<span v-if="event.description" class="text-slate-400"> · {{ event.description }}</span></span>
                </li>
              </ul>
              <p v-else class="mt-2 text-xs text-slate-400">暂无生命周期记录</p>
            </div>
          </el-tab-pane>

          <el-tab-pane :label="`成员与邀请`" name="members">
            <div class="space-y-3">
              <div v-for="member in detail.members || []" :key="`${member.memberRole}-${member.amourId}-${member.status}`" class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
                <span class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-rose-100 text-xs font-bold text-rose-500">
                  <img v-if="member.avatar" :src="member.avatar" alt="" class="h-9 w-9 rounded-full object-cover">
                  <template v-else>{{ (member.displayName || '恋').slice(0, 1) }}</template>
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-slate-800">{{ member.displayName || '恋人' }} <span class="text-[11px] text-slate-400">{{ member.roleText }}</span></p>
                  <p class="mt-1 font-mono text-[11px] text-slate-400">{{ member.amourId || '-' }}</p>
                </div>
                <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">{{ member.statusText }}</span>
                <p class="w-full text-[11px] text-slate-400">加入：{{ member.joinedAt || '-' }} <span v-if="member.leftAt"> · 退出：{{ member.leftAt }}</span></p>
              </div>
              <p v-if="!(detail.members || []).length" class="text-xs text-slate-400">暂无成员关系</p>
            </div>

            <div class="mt-5 rounded-xl border border-slate-200 p-4">
              <h4 class="text-xs font-semibold text-slate-700">邀请记录</h4>
              <div v-if="detail.invitations?.length" class="mt-3 overflow-x-auto">
                <table class="w-full min-w-[560px] text-left text-xs">
                  <thead class="text-slate-400">
                    <tr><th class="py-2">受邀人</th><th class="py-2">发起人</th><th class="py-2">状态</th><th class="py-2">过期时间</th><th class="py-2">令牌摘要</th></tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="invitation in detail.invitations" :key="invitation.invitationId">
                      <td class="py-2 text-slate-700">{{ invitation.inviteeName || '链接邀请' }}</td>
                      <td class="py-2 text-slate-600">{{ invitation.inviterName }}</td>
                      <td class="py-2"><span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{{ invitation.statusText }}</span></td>
                      <td class="py-2 text-slate-500">{{ invitation.expiresAt || '-' }}</td>
                      <td class="py-2 font-mono text-slate-400">{{ invitation.tokenMasked || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="mt-2 text-xs text-slate-400">暂无邀请记录</p>
            </div>
          </el-tab-pane>

          <el-tab-pane label="内容索引" name="content">
            <div class="space-y-4">
              <section v-for="group in contentGroups" :key="group.type" class="rounded-xl border border-slate-200 p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h4 class="text-xs font-semibold text-slate-700">{{ group.label }}（{{ group.items.length }}）</h4>
                  <RouterLink
                    v-if="hasContentPermission"
                    :to="{ path: group.path, query: { spaceId: detail.spaceId } }"
                    class="text-[11px] font-semibold text-rose-600 underline-offset-2 hover:underline"
                  >
                    进入治理
                  </RouterLink>
                </div>
                <ul v-if="group.items.length" class="mt-3 divide-y divide-slate-100">
                  <li v-for="item in group.items" :key="`${item.contentType}-${item.contentId}`" class="flex flex-wrap items-center gap-2 py-2 text-xs">
                    <span class="min-w-0 flex-1 truncate text-slate-700">{{ item.title || '未命名' }}</span>
                    <span class="rounded-full px-2 py-0.5 text-[10px]" :class="visibilityClass(item.visibility)">{{ item.visibilityText }}</span>
                    <span v-if="item.deleted" class="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-500">已删除</span>
                    <span v-if="item.pendingReportCount" class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600">待处理举报 {{ item.pendingReportCount }}</span>
                    <span class="w-28 shrink-0 text-[10px] text-slate-400">{{ item.authorName }} · {{ item.updateTime }}</span>
                  </li>
                </ul>
                <p v-else class="mt-2 text-xs text-slate-400">暂无内容</p>
              </section>
            </div>
          </el-tab-pane>

          <el-tab-pane label="生命周期与恢复" name="lifecycle">
            <div class="grid gap-3 lg:grid-cols-2">
              <section class="rounded-xl border border-slate-200 p-4">
                <h4 class="text-xs font-semibold text-slate-700">解绑申请</h4>
                <div v-if="detail.unbind?.pending" class="mt-2 text-xs leading-6 text-slate-600">
                  <p>待同意 · 发起人 {{ detail.unbind.requesterName }}（{{ detail.unbind.requesterAmourId || '-' }}）</p>
                  <p>申请时间：{{ detail.unbind.requestedAt || '-' }}</p>
                </div>
                <div v-else-if="detail.unbind?.latestStatus" class="mt-2 text-xs leading-6 text-slate-600">
                  <p>最近一次申请：{{ detail.unbind.latestStatusText }}</p>
                  <p>处理时间：{{ detail.unbind.latestResolvedAt || '-' }}</p>
                </div>
                <p v-else class="mt-2 text-xs text-slate-400">无解绑申请记录</p>
              </section>

              <section class="rounded-xl border border-slate-200 p-4">
                <h4 class="text-xs font-semibold text-slate-700">恢复资格</h4>
                <p class="mt-2 text-xs leading-6 text-slate-600">
                  恢复条件：{{ detail.restore?.restorable ? '满足' : (detail.restore?.restoreBlockReason || '不满足') }}
                </p>
                <p class="text-xs leading-6 text-slate-600">
                  双方恢复确认：{{ detail.restore?.confirmedCount ?? 0 }} / {{ detail.restore?.requiredCount ?? 0 }}
                </p>
                <ul v-if="detail.restore?.confirmations?.length" class="mt-2 space-y-1 text-[11px] text-slate-500">
                  <li v-for="confirm in detail.restore.confirmations" :key="confirm.amourId + confirm.confirmedAt">
                    {{ confirm.displayName }}（{{ confirm.amourId || '-' }}）· {{ confirm.confirmedAt }}
                  </li>
                </ul>
                <div v-if="detail.restore?.conflictSpaces?.length" class="mt-3 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2">
                  <p class="text-[11px] font-semibold text-amber-700">
                    检测到 {{ detail.restore.conflictSpaces.length }} 个冲突空间
                  </p>
                  <ul class="mt-1 space-y-1 text-[11px] leading-5 text-amber-700">
                    <li v-for="conflict in detail.restore.conflictSpaces" :key="conflict.spaceId">
                      ID {{ conflict.spaceId }} · {{ conflict.spaceName || '未命名空间' }} · {{ conflict.statusText }} · 有效成员 {{ conflict.activeMemberCount }}
                      <span :class="conflict.autoClosable ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-600'">
                        {{ conflict.autoClosable ? '恢复时自动安全关闭' : (conflict.blockReason || '需先处理后再恢复') }}
                      </span>
                    </li>
                  </ul>
                </div>
                <p class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500">
                  冻结/归档空间必须由双方成员在用户端确认恢复；后台人工恢复仅处理 status=5 且成员关系完整的历史空间，恢复后保持私密。解绑后新建的未绑定单人空间会被安全关闭，内容保留；若冲突空间已有其他有效成员，则拒绝恢复。
                </p>
              </section>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { CircleCheck, Connection, Refresh, Search, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdminSpaceDetail, fetchAdminSpacePage, restoreAdminSpace } from '@/api/admin/space'
import {
  ADMIN_RESTORE_MESSAGE_BOX_CLASS,
  buildRestorePromptMessage,
  buildRestoreSuccessMessage,
} from '@/utils/adminRestore'
import { ADMIN_PERMISSIONS, hasAdminPermission } from '@/utils/adminAuth'

const filters = reactive({ keyword: '', status: null, visibility: null })
const current = ref(1)
const pageSize = 10
const total = ref(0)
const rows = ref([])
const loading = ref(false)
const error = ref('')
const restoringId = ref(null)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const activeTab = ref('overview')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const hasContentPermission = computed(() => hasAdminPermission(ADMIN_PERMISSIONS.CONTENT_QUERY))
const detailCounts = computed(() => {
  if (!detail.value) return []
  return [
    { label: '故事', value: detail.value.storyCount ?? 0 },
    { label: '照片', value: detail.value.photoCount ?? 0 },
    { label: '留言', value: detail.value.messageCount ?? 0 },
    { label: '纪念日', value: detail.value.anniversaryCount ?? 0 },
  ]
})
const contentGroups = computed(() => {
  if (!detail.value) return []
  return [
    { type: 'story', label: '故事', path: '/admin/story', items: detail.value.stories || [] },
    { type: 'photo', label: '照片', path: '/admin/photo', items: detail.value.photos || [] },
    { type: 'message', label: '留言', path: '/admin/message', items: detail.value.messages || [] },
    { type: 'anniversary', label: '纪念日', path: '/admin/anniversary', items: detail.value.anniversaries || [] },
  ]
})

function statusClass(value) {
  const map = {
    0: 'bg-amber-50 text-amber-600',
    1: 'bg-emerald-50 text-emerald-600',
    2: 'bg-sky-50 text-sky-600',
    3: 'bg-slate-100 text-slate-500',
    4: 'bg-orange-50 text-orange-600',
    5: 'bg-rose-50 text-rose-600',
  }
  return map[value] || 'bg-slate-100 text-slate-500'
}

function contentBreakdown(row) {
  return `故事 ${row.storyCount ?? 0} · 照片 ${row.photoCount ?? 0} · 留言 ${row.messageCount ?? 0} · 纪念日 ${row.anniversaryCount ?? 0}`
}

function visibilityClass(value) {
  if (value === 1) return 'bg-emerald-50 text-emerald-600'
  if (value === 2) return 'bg-rose-50 text-rose-600'
  return 'bg-slate-100 text-slate-500'
}

let loadSequence = 0
let detailSequence = 0
async function load() {
  const requestId = ++loadSequence
  loading.value = true
  error.value = ''
  try {
    const { data } = await fetchAdminSpacePage({
      current: current.value,
      size: pageSize,
      keyword: filters.keyword.trim() || undefined,
      status: typeof filters.status === 'number' ? filters.status : undefined,
      visibility: typeof filters.visibility === 'number' ? filters.visibility : undefined,
    })
    if (requestId !== loadSequence) return
    if (!data?.success) throw new Error(data?.message || '空间列表加载失败')
    rows.value = Array.isArray(data.data?.records) ? data.data.records : []
    total.value = Number(data.data?.total) || 0
  } catch (e) {
    if (requestId !== loadSequence) return
    rows.value = []
    total.value = 0
    error.value = e.response?.data?.message || e.message || '空间列表加载失败'
  } finally {
    if (requestId === loadSequence) loading.value = false
  }
}

function applyFilters() {
  if (current.value === 1) load()
  else current.value = 1
}

async function openDetail(row) {
  const requestId = ++detailSequence
  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  activeTab.value = 'overview'
  try {
    const { data } = await fetchAdminSpaceDetail(row.spaceId)
    if (requestId !== detailSequence) return
    if (!data?.success) throw new Error(data?.message || '空间详情加载失败')
    detail.value = data.data
  } catch (e) {
    if (requestId !== detailSequence) return
    ElMessage.error(e.response?.data?.message || e.message || '空间详情加载失败')
    detailVisible.value = false
  } finally {
    if (requestId === detailSequence) detailLoading.value = false
  }
}

async function promptReason(row) {
  try {
    const result = await ElMessageBox.prompt(buildRestorePromptMessage(row), '人工恢复情侣空间', {
      confirmButtonText: '确认恢复',
      cancelButtonText: '取消',
      customClass: ADMIN_RESTORE_MESSAGE_BOX_CLASS,
      inputPlaceholder: '请填写恢复原因（必填）',
      inputValidator: value => (String(value || '').trim().length > 0 ? true : '请填写恢复原因'),
    })
    return String(result.value || '').trim()
  } catch {
    return ''
  }
}

async function restore(row) {
  if (restoringId.value !== null) return
  if (row.status !== 5) {
    ElMessage.warning('只有双方已解绑的空间才能人工恢复')
    return
  }
  if (!row.restorable) {
    ElMessage.warning(row.restoreBlockReason || '当前空间不满足人工恢复条件')
    return
  }
  const reason = await promptReason(row)
  if (!reason) return
  restoringId.value = row.spaceId
  try {
    const { data } = await restoreAdminSpace(row.spaceId, reason)
    if (!data?.success) throw new Error(data?.message || '人工恢复失败')
    ElMessage.success(buildRestoreSuccessMessage(data.data))
    // 恢复成功后详情可能已过期（成员、状态、邀请都被改写），必须重新拉取。
    if (detail.value?.spaceId === row.spaceId) {
      await openDetail({ spaceId: row.spaceId })
    }
    await load()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || e.message || '人工恢复失败')
    // 业务失败（冲突/状态已变化）时同步刷新，避免页面继续展示过期的恢复资格。
    if (e.response?.data?.errorCode) {
      if (detail.value?.spaceId === row.spaceId) {
        await openDetail({ spaceId: row.spaceId })
      }
      await load()
    }
  } finally {
    restoringId.value = null
  }
}

async function restoreDetail() {
  if (!detail.value) return
  const conflicts = Array.isArray(detail.value.restore?.conflictSpaces) ? detail.value.restore.conflictSpaces : []
  await restore({
    spaceId: detail.value.spaceId,
    spaceName: detail.value.spaceName,
    spaceCode: detail.value.spaceCode,
    status: detail.value.status,
    restorable: detail.value.restore?.restorable,
    restoreBlockReason: detail.value.restore?.restoreBlockReason,
    conflictSpaceCount: conflicts.length,
    autoClosableConflictSpaceCount: conflicts.filter(conflict => conflict.autoClosable === true).length,
  })
}

watch(current, load)
onMounted(load)
</script>

<style scoped>
.detail-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
.detail-label { font-size: 11px; color: #94a3b8; }
.detail-value { margin-top: 4px; font-size: 13px; color: #334155; }
.space-detail-tabs :deep(.el-tabs__header) { margin-bottom: 16px; }
</style>
