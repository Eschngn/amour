<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 items-center gap-4">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 ring-1 ring-violet-100">
          <ChatDotRound class="h-6 w-6" />
        </span>
        <div>
          <h2 class="text-base font-semibold text-slate-900">访客留言</h2>
          <p class="mt-1 text-sm text-slate-500">
            已收到 <span class="font-semibold text-violet-500">{{ totalItems }}</span> 条留言，认真回应每一份真诚。
          </p>
        </div>
      </div>
      <div class="relative w-full lg:w-72">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          v-model="keyword"
          placeholder="搜索留言内容…"
          class="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-9 text-sm outline-none transition placeholder:text-slate-400"
        />
        <button
          v-if="keyword"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:text-slate-600"
          aria-label="清除搜索"
          @click="keyword = ''"
        >
          ×
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-20 text-sm text-slate-400">
        <svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        加载中…
      </div>

      <div v-show="!loading" class="overflow-x-auto">
      <table class="min-w-[820px] w-full divide-y divide-slate-200 text-left text-sm">
        <thead class="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3 pl-6">留言人</th>
            <th class="px-4 py-3">留言内容</th>
            <th class="px-4 py-3 text-center">回复数</th>
            <th class="px-4 py-3">发布时间</th>
            <th class="px-4 py-3 pr-6 text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="message in messages" :key="message.messageId" class="hover:bg-slate-50/80">
            <td class="whitespace-nowrap px-4 py-3 pl-6 font-medium text-slate-800">
              {{ message.userName || '未知用户' }}
            </td>
            <td class="max-w-xl px-4 py-3 text-slate-700">
              <p class="whitespace-pre-wrap break-words">{{ message.content }}</p>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-center text-slate-500">
              {{ message.replyCount || 0 }}
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-slate-500">
              {{ message.createTime || '-' }}
            </td>
            <td class="whitespace-nowrap px-4 py-3 pr-6 text-right">
              <button
                type="button"
                :disabled="deletingId === message.messageId"
                class="rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                @click="deleteMessage(message)"
              >
                {{ deletingId === message.messageId ? '删除中…' : '删除' }}
              </button>
            </td>
          </tr>
          <tr v-if="!loading && !messages.length">
            <td colspan="5" class="px-4 py-12 text-center text-sm text-slate-400">
              暂无留言
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <div class="flex items-center justify-between border-t border-slate-100 px-6 py-3">
        <span class="text-xs text-slate-500">共 {{ totalItems }} 条</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            :disabled="currentPage <= 1 || loading"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition disabled:text-slate-300 enabled:hover:bg-slate-100"
            @click="currentPage -= 1"
          >
            上一页
          </button>
          <button
            v-for="page in totalPages"
            :key="page"
            type="button"
            :disabled="loading"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed"
            :class="currentPage === page
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'"
            @click="currentPage = page"
          >
            {{ page }}
          </button>
          <button
            type="button"
            :disabled="currentPage >= totalPages || loading"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition disabled:text-slate-300 enabled:hover:bg-slate-100"
            @click="currentPage += 1"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ChatDotRound, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import api from '@/axios'

const pageSize = 10
const currentPage = ref(1)
const keyword = ref('')
const loading = ref(false)
const deletingId = ref(null)
const pageData = ref({ records: [], total: 0, current: 1, size: pageSize })

const messages = computed(() => pageData.value.records || [])
const totalItems = computed(() => Number(pageData.value.total) || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize)))

async function fetchMessages() {
  loading.value = true
  try {
    const { data } = await api.post('/admin/message/list', {
      current: currentPage.value,
      size: pageSize,
      content: keyword.value.trim() || undefined,
    })
    if (data.success && data.data) {
      pageData.value = data.data
      currentPage.value = Number(data.data.current) || currentPage.value
    } else {
      ElMessage.error(data.message || '获取留言失败')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '获取留言失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function deleteMessage(message) {
  try {
    await ElMessageBox.confirm(
      `确定删除 ${message.userName || '该用户'} 的这条留言吗？删除后前台将不再显示。`,
      '删除留言',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  deletingId.value = message.messageId
  try {
    const { data } = await api.post('/admin/message/delete', {
      messageId: message.messageId,
    })
    if (!data.success) {
      ElMessage.error(data.message || '删除留言失败')
      return
    }
    ElMessage.success('留言已删除')
    if (messages.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1
    } else {
      await fetchMessages()
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '删除留言失败，请稍后重试')
  } finally {
    deletingId.value = null
  }
}

watch(currentPage, () => {
  fetchMessages()
})

let searchTimer
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (currentPage.value === 1) {
      fetchMessages()
    } else {
      currentPage.value = 1
    }
  }, 300)
})

onMounted(() => {
  fetchMessages()
})
</script>
