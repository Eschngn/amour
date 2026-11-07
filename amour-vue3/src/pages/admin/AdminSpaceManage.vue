<template>
  <div class="space-y-5">
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-slate-900">双方已解绑情侣空间</h2>
          <p class="mt-1 max-w-2xl text-xs leading-6 text-slate-400">
            默认筛选 status=5。人工恢复只处理双方都已解绑的历史空间，恢复后空间保持私密，不会自动公开到恋爱广场。
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label class="relative sm:w-64">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model="keyword"
              type="search"
              placeholder="搜索空间名称或编码"
              class="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              @keyup.enter="applyFilters"
            >
          </label>
          <el-select v-model="status" class="space-filter-select" placeholder="全部状态" clearable @change="applyFilters">
            <el-option :value="5" label="双方已解绑" />
            <el-option :value="1" label="正常" />
            <el-option :value="0" label="等待绑定" />
            <el-option :value="2" label="已冻结" />
            <el-option :value="3" label="已归档" />
            <el-option :value="4" label="删除等待期" />
          </el-select>
          <el-select v-model="visibility" class="space-filter-select" placeholder="全部可见性" clearable @change="applyFilters">
            <el-option :value="0" label="私密" />
            <el-option :value="1" label="公开" />
          </el-select>
          <button
            type="button"
            class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="applyFilters"
          >
            <Search class="h-3.5 w-3.5" />
            查询
          </button>
          <button
            type="button"
            class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="load"
          >
            <Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
            刷新
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-24 text-sm text-slate-400">
        <Loading class="mr-2 h-4 w-4 animate-spin" />加载中...
      </div>
      <div v-else-if="!rows.length" class="flex flex-col items-center justify-center px-6 py-24 text-center">
        <Connection class="h-9 w-9 text-slate-200" />
        <p class="mt-3 text-sm font-medium text-slate-600">暂无符合条件的情侣空间</p>
        <p class="mt-1 text-xs text-slate-400">调整关键字、状态或可见性后再查询。</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1180px] divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium tracking-wide text-slate-500">
            <tr>
              <th class="px-6 py-3">情侣空间</th>
              <th class="px-4 py-3">双方成员</th>
              <th class="px-4 py-3">状态</th>
              <th class="px-4 py-3">解绑时间</th>
              <th class="px-4 py-3">内容概览</th>
              <th class="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in rows" :key="row.spaceId">
              <td class="px-6 py-4 align-top">
                <p class="font-medium text-slate-800">{{ row.spaceName || '未命名空间' }}</p>
                <p class="mt-1 font-mono text-xs text-slate-400">{{ row.spaceCode || '-' }}</p>
                <p class="mt-1 text-[11px] text-slate-400">ID {{ row.spaceId }} · 创建于 {{ row.createTime || '-' }}</p>
              </td>
              <td class="px-4 py-4 align-top">
                <div v-if="row.members?.length" class="space-y-2">
                  <div
                    v-for="member in row.members"
                    :key="`${row.spaceId}-${member.memberRole}-${member.amourId}`"
                    class="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                  >
                    <div class="flex items-center gap-2">
                      <span class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-100 text-[10px] font-bold text-rose-500">
                        <img
                          v-if="member.avatar"
                          :src="member.avatar"
                          alt=""
                          class="h-7 w-7 rounded-full object-cover"
                        >
                        <template v-else>{{ (member.displayName || '恋').slice(0, 1) }}</template>
                      </span>
                      <div class="min-w-0">
                        <p class="truncate text-xs font-medium text-slate-700">
                          {{ member.displayName || '恋人' }}
                          <span class="ml-1 text-[10px] font-normal text-slate-400">{{ member.roleText }}</span>
                        </p>
                        <p class="truncate font-mono text-[10px] text-slate-400">{{ member.amourId || '-' }}</p>
                      </div>
                    </div>
                    <p class="mt-1 text-[10px] text-slate-400">
                      <span>{{ member.statusText || '未知状态' }}</span>
                      <span v-if="member.leftAt"> · 退出于 {{ member.leftAt }}</span>
                    </p>
                  </div>
                </div>
                <p v-else class="text-xs text-rose-500">缺少历史成员关系</p>
              </td>
              <td class="px-4 py-4 align-top">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
                  :class="statusClass(row.status)"
                >
                  {{ row.statusText || '未知状态' }}
                </span>
                <p class="mt-2 text-[11px] text-slate-400">
                  可见性：{{ row.visibilityText || '-' }}
                </p>
                <p class="mt-1 text-[11px] text-slate-400">
                  有效成员：{{ row.activeMemberCount ?? 0 }} / {{ row.memberCount ?? 0 }}
                </p>
              </td>
              <td class="px-4 py-4 align-top whitespace-nowrap text-xs text-slate-500">
                {{ row.deletedAt || '-' }}
              </td>
              <td class="px-4 py-4 align-top">
                <p class="text-xs font-semibold text-slate-700">共 {{ row.contentCount ?? 0 }} 项</p>
                <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-400">
                  <span>故事 {{ row.storyCount ?? 0 }}</span>
                  <span>照片 {{ row.photoCount ?? 0 }}</span>
                  <span>留言 {{ row.messageCount ?? 0 }}</span>
                  <span>纪念日 {{ row.anniversaryCount ?? 0 }}</span>
                </div>
              </td>
              <td class="px-6 py-4 align-top text-right">
                <template v-if="row.status === 5">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    :disabled="restoringId !== null || !row.restorable"
                    :title="row.restorable ? '' : row.restoreBlockReason"
                    :aria-busy="restoringId === row.spaceId ? 'true' : 'false'"
                    @click="restore(row)"
                  >
                    <CircleCheck class="h-3.5 w-3.5" />
                    {{ restoringId === row.spaceId ? '恢复中…' : '人工恢复' }}
                  </button>
                  <p v-if="!row.restorable" class="mt-2 max-w-[180px] text-[10px] leading-4 text-rose-500">
                    {{ row.restoreBlockReason }}
                  </p>
                </template>
                <span v-else class="text-[11px] text-slate-400">仅 status=5 可恢复</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-400 sm:flex-row sm:px-6">
        <span>共 {{ total }} 条 · 第 {{ currentPage }} / {{ totalPages }} 页</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            :disabled="currentPage <= 1 || loading"
            class="rounded-lg px-3 py-1.5 transition enabled:hover:bg-slate-100 disabled:text-slate-300"
            @click="currentPage -= 1"
          >
            上一页
          </button>
          <button type="button" class="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white shadow-sm">
            {{ currentPage }}
          </button>
          <button
            type="button"
            :disabled="currentPage >= totalPages || loading"
            class="rounded-lg px-3 py-1.5 transition enabled:hover:bg-slate-100 disabled:text-slate-300"
            @click="currentPage += 1"
          >
            下一页
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import { CircleCheck, Connection, Loading, Refresh, Search } from '@element-plus/icons-vue'
import { fetchAdminSpacePage, restoreAdminSpace } from '@/api/admin/space'

const pageSize = 10
const currentPage = ref(1)
const keyword = ref('')
// 默认只看双方已解绑空间，方便管理员直接处理 status=5 数据。
const status = ref(5)
const visibility = ref(null)
const loading = ref(false)
const restoringId = ref(null)
const rows = ref([])
const total = ref(0)
/** 查询序号：筛选条件快速变化时只采用最后一次响应。 */
let loadSequence = 0

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function load() {
  const requestId = ++loadSequence
  loading.value = true
  try {
    const { data } = await fetchAdminSpacePage({
      current: currentPage.value,
      size: pageSize,
      keyword: keyword.value.trim() || undefined,
      status: typeof status.value === 'number' ? status.value : undefined,
      visibility: typeof visibility.value === 'number' ? visibility.value : undefined,
    })
    if (requestId !== loadSequence) return
    if (!data?.success) {
      throw new Error(data?.message || '加载情侣空间失败')
    }
    rows.value = Array.isArray(data.data?.records) ? data.data.records : []
    total.value = Number(data.data?.total) || 0
  } catch (error) {
    if (requestId !== loadSequence) return
    rows.value = []
    total.value = 0
    ElMessage.error(error.response?.data?.message || error.message || '加载情侣空间失败')
  } finally {
    if (requestId === loadSequence) loading.value = false
  }
}

function applyFilters() {
  if (currentPage.value === 1) {
    load()
    return
  }
  // 页码 watcher 会触发一次新的查询。
  currentPage.value = 1
}

async function restore(row) {
  if (restoringId.value !== null || row.status !== 5 || !row.restorable) return
  try {
    await ElMessageBox.confirm(
      `确定人工恢复情侣空间“${row.spaceName || row.spaceCode}”吗？`
      + '恢复后两名原成员都会重新成为有效成员，空间回到正常但私密状态；不会自动公开到恋爱广场，既有内容全部保留。',
      '人工恢复情侣空间',
      {
        confirmButtonText: '确认恢复',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true,
      },
    )
  } catch {
    return
  }

  restoringId.value = row.spaceId
  try {
    const { data } = await restoreAdminSpace(row.spaceId)
    if (!data?.success) {
      ElMessage.error(data?.message || '人工恢复失败，请稍后重试')
      return
    }
    ElMessage.success('情侣空间已恢复为正常且私密状态')
    await load()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '人工恢复失败，请稍后重试')
  } finally {
    restoringId.value = null
  }
}

function statusClass(value) {
  switch (Number(value)) {
    case 1:
      return 'bg-emerald-50 text-emerald-600'
    case 5:
      return 'bg-rose-50 text-rose-600'
    case 0:
      return 'bg-amber-50 text-amber-600'
    case 2:
      return 'bg-sky-50 text-sky-600'
    case 3:
      return 'bg-slate-100 text-slate-500'
    default:
      return 'bg-slate-100 text-slate-500'
  }
}

watch(currentPage, load)
onMounted(load)
</script>

<style scoped>
.space-filter-select {
  width: 150px;
}

:deep(.space-filter-select .el-select__wrapper) {
  min-height: 40px;
}
</style>
