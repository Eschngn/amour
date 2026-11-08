<template>
  <div>
    <div v-if="loading" class="studio-panel px-5 py-6" aria-label="正在加载留言" aria-busy="true">
      <div class="h-5 w-24 animate-pulse rounded bg-stone-100" />
      <div class="mt-6 space-y-4">
        <div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-lg bg-stone-50" />
      </div>
    </div>

    <div v-else-if="loadError" class="studio-panel px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="btn-secondary mt-4" @click="load">重新加载</button>
    </div>

    <div v-else class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <!-- 已有留言：只负责浏览、回复与删除 -->
      <section class="studio-panel min-w-0" aria-labelledby="studio-message-list-heading">
        <header class="studio-panel-header">
          <div class="min-w-0">
            <h2 id="studio-message-list-heading" class="section-title">已有留言</h2>
            <p class="section-description">共 {{ total }} 条 · 第 {{ current }} / {{ totalPages }} 页</p>
          </div>
          <button type="button" class="btn-ghost" :disabled="loading" @click="load">刷新</button>
        </header>

        <div v-if="!messages.length" class="studio-panel-body">
          <div class="studio-empty">
            <p class="text-sm font-semibold text-stone-800">还没有留言</p>
            <p class="mt-1 text-xs text-stone-500">在右侧写下第一句话，等另一半加入后一起看。</p>
          </div>
        </div>

        <ul v-else class="divide-y divide-stone-100" aria-label="空间留言列表">
          <li v-for="message in messages" :key="message.messageId" class="px-5 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-stone-900">{{ message.userName || '匿名' }}</p>
                <p class="mt-0.5 text-[11px] text-stone-400">{{ message.createTime }}</p>
              </div>
              <button
                v-if="message.canDelete === true"
                type="button"
                class="shrink-0 rounded px-2 py-1 text-[11px] font-semibold text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-50"
                :disabled="deletingMessageId === message.messageId"
                :aria-label="`删除 ${message.userName || '匿名'} 的留言`"
                @click="removeMessage(message)"
              >
                {{ deletingMessageId === message.messageId ? '删除中…' : '删除' }}
              </button>
            </div>

            <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-stone-700">{{ message.content }}</p>

            <div v-if="message.replies?.length" class="mt-3 space-y-2 border-l-2 border-stone-100 pl-3">
              <div v-for="reply in message.replies" :key="reply.replyId">
                <div class="flex items-start justify-between gap-2">
                  <p class="min-w-0 whitespace-pre-wrap break-words text-xs leading-6 text-stone-600">
                    <span class="font-semibold text-stone-800">{{ reply.fromUserName }}</span>
                    <span v-if="reply.toUserName" class="text-rose-600"> 回复 {{ reply.toUserName }}</span>
                    ：{{ reply.content }}
                  </p>
                  <button
                    v-if="reply.canDelete === true"
                    type="button"
                    class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-stone-400 transition hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-50"
                    :disabled="deletingReplyId === reply.replyId"
                    :aria-label="`删除 ${reply.fromUserName} 的回复`"
                    @click="removeReply(reply)"
                  >
                    {{ deletingReplyId === reply.replyId ? '删除中…' : '删除' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-3">
              <button type="button" class="btn-ghost !px-2 !py-1 !text-[11px]" @click="startReply(message)">
                回复这条留言
              </button>
            </div>

            <form v-if="replyTarget?.messageId === message.messageId" class="mt-3 rounded-lg border border-stone-200 bg-stone-50/70 p-3" @submit.prevent="submitReply">
              <label :for="`studio-reply-${message.messageId}`" class="text-[11px] font-semibold text-stone-700">
                回复 {{ replyTarget.userName }}
              </label>
              <textarea
                :id="`studio-reply-${message.messageId}`"
                v-model="replyDraft"
                rows="2"
                maxlength="500"
                class="field-input resize-y text-xs leading-6"
                :placeholder="`写给 ${replyTarget.userName || 'Ta'} 的回复……`"
              />
              <div class="mt-2 flex justify-end gap-2">
                <button type="button" class="btn-ghost" @click="cancelReply">取消</button>
                <button type="submit" class="btn-primary !px-3 !py-1.5 !text-[11px]" :disabled="replying || !replyDraft.trim()">
                  {{ replying ? '回复中…' : '发送回复' }}
                </button>
              </div>
            </form>
          </li>
        </ul>

        <div v-if="actionError" class="border-t border-rose-200 bg-rose-50/70 px-5 py-3 text-xs leading-5 text-rose-700" role="alert">
          {{ actionError }}
        </div>

        <footer v-if="totalPages > 1" class="flex items-center justify-between gap-3 border-t border-stone-100 px-5 py-3">
          <span class="text-xs text-stone-500">{{ current }} / {{ totalPages }}</span>
          <div class="flex gap-2">
            <button type="button" class="btn-secondary !py-1.5" :disabled="current <= 1 || loading" @click="goToPage(current - 1)">
              上一页
            </button>
            <button type="button" class="btn-secondary !py-1.5" :disabled="current >= totalPages || loading" @click="goToPage(current + 1)">
              下一页
            </button>
          </div>
        </footer>
      </section>

      <!-- 新建留言：与列表明确分开，说明发布身份 -->
      <aside class="lg:sticky lg:top-24">
        <form class="studio-panel" @submit.prevent="publish">
          <header class="studio-panel-header">
            <div class="min-w-0">
              <h2 class="section-title">写一条新留言</h2>
              <p class="section-description">将以 {{ currentUserName }} 的身份发布。</p>
            </div>
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-400" aria-hidden="true">
              ✎
            </span>
          </header>

          <div class="px-5 py-5">
            <label for="studio-message-draft" class="sr-only">留言内容</label>
            <textarea
              id="studio-message-draft"
              v-model="draft"
              rows="6"
              maxlength="500"
              class="field-input !mt-0 w-full resize-y leading-7"
              placeholder="今天想对 Ta 说……"
            />
            <div class="mt-2 flex items-center justify-between text-[11px] text-stone-400">
              <span>只有当前空间成员能看到</span>
              <span :class="draft.length > 450 ? 'font-semibold text-rose-600' : ''">{{ draft.length }} / 500</span>
            </div>

            <p v-if="publishError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
              {{ publishError }}
            </p>
          </div>

          <div class="border-t border-stone-100 bg-stone-50/40 px-5 py-3.5">
            <button type="submit" class="btn-primary w-full" :disabled="publishing || !draft.trim()">
              {{ publishing ? '发布中…' : '发布留言' }}
            </button>
          </div>
        </form>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import {
  deleteSpaceMessage,
  deleteSpaceMessageReply,
  fetchMessagePage,
  publishSpaceMessage,
  replySpaceMessage,
} from '@/api/spaceContent'
import { ensureSuccess, readContentErrorMessage } from '@/utils/spaceContent'
import { frontendDisplayName } from '@/utils/auth'

const PAGE_SIZE = 10

const emit = defineEmits(['update:dirty'])

const loading = ref(true)
const loadError = ref('')
const messages = ref([])
const current = ref(1)
const total = ref(0)

const draft = ref('')
const publishing = ref(false)
const publishError = ref('')
const actionError = ref('')

const replyTarget = ref(null)
const replyDraft = ref('')
const replying = ref(false)
const deletingMessageId = ref(null)
const deletingReplyId = ref(null)

const currentUserName = computed(() => frontendDisplayName.value || '当前账号')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const dirty = computed(() => Boolean(draft.value.trim() || replyDraft.value.trim()))

watch(dirty, value => emit('update:dirty', value))

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const data = ensureSuccess(await fetchMessagePage(current.value, PAGE_SIZE), '留言加载失败')
    messages.value = Array.isArray(data?.records) ? data.records : []
    total.value = Number(data?.total) || 0
    current.value = Number(data?.current) || 1
  } catch (error) {
    loadError.value = readContentErrorMessage(error, '留言加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function publish() {
  if (publishing.value || !draft.value.trim()) return
  publishing.value = true
  publishError.value = ''
  try {
    ensureSuccess(await publishSpaceMessage(draft.value.trim()), '留言发布失败')
    draft.value = ''
    current.value = 1
    emit('update:dirty', false)
    ElMessage.success('留言已发布')
    await load()
  } catch (error) {
    publishError.value = readContentErrorMessage(error, '留言发布失败，请稍后重试')
  } finally {
    publishing.value = false
  }
}

function startReply(message) {
  replyTarget.value = { messageId: message.messageId, userName: message.userName || 'Ta' }
  replyDraft.value = ''
}

function cancelReply() {
  replyTarget.value = null
  replyDraft.value = ''
}

async function submitReply() {
  if (replying.value || !replyTarget.value || !replyDraft.value.trim()) return
  replying.value = true
  actionError.value = ''
  try {
    ensureSuccess(await replySpaceMessage({
      messageId: replyTarget.value.messageId,
      content: replyDraft.value.trim(),
    }), '回复失败')
    ElMessage.success('回复已发送')
    cancelReply()
    await load()
  } catch (error) {
    actionError.value = readContentErrorMessage(error, '回复失败，请稍后重试')
  } finally {
    replying.value = false
  }
}

async function removeMessage(message) {
  if (deletingMessageId.value) return
  try {
    await ElMessageBox.confirm('确定删除这条留言及它的回复吗？', '删除留言', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
  } catch {
    return
  }
  deletingMessageId.value = message.messageId
  actionError.value = ''
  try {
    ensureSuccess(await deleteSpaceMessage(message.messageId), '删除留言失败')
    ElMessage.success('留言已删除')
    await load()
  } catch (error) {
    actionError.value = readContentErrorMessage(error, '删除留言失败，请稍后重试')
  } finally {
    deletingMessageId.value = null
  }
}

async function removeReply(reply) {
  if (deletingReplyId.value) return
  deletingReplyId.value = reply.replyId
  actionError.value = ''
  try {
    ensureSuccess(await deleteSpaceMessageReply(reply.replyId), '删除回复失败')
    ElMessage.success('回复已删除')
    await load()
  } catch (error) {
    actionError.value = readContentErrorMessage(error, '删除回复失败，请稍后重试')
  } finally {
    deletingReplyId.value = null
  }
}

function goToPage(page) {
  if (loading.value || page < 1 || page > totalPages.value) return
  current.value = page
  cancelReply()
  load()
}

onMounted(load)

defineExpose({ dirty })
</script>
