<template>
  <div class="space-y-5">
    <div v-if="loading" class="space-y-3" aria-label="正在加载留言" aria-busy="true">
      <div v-for="n in 3" :key="n" class="h-28 animate-pulse rounded-2xl border border-rose-100 bg-white/60" />
    </div>

    <div v-else-if="loadError" class="rounded-2xl border border-rose-100 bg-rose-50/50 px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="mt-4 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="load">
        重新加载
      </button>
    </div>

    <template v-else>
      <section class="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <h3 class="font-display text-lg font-bold text-rose-950">写下一条留言</h3>
        <p class="mt-1 text-xs leading-6 text-rose-700/50">留言只有当前空间成员能看到；等待另一半加入时也可以先写下来。</p>
        <form class="mt-4" @submit.prevent="publish">
          <label for="studio-message-draft" class="sr-only">留言内容</label>
          <textarea
            id="studio-message-draft"
            v-model="draft"
            rows="4"
            maxlength="500"
            class="w-full resize-y rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm leading-7 text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            placeholder="今天想对 Ta 说……"
          />
          <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span class="text-[11px] text-rose-700/45">{{ draft.length }} / 500</span>
            <button type="submit" class="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" :disabled="publishing || !draft.trim()">
              {{ publishing ? '发布中…' : '发布留言' }}
            </button>
          </div>
          <p v-if="actionError" class="mt-3 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">
            {{ actionError }}
          </p>
        </form>
      </section>

      <section class="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-display text-lg font-bold text-rose-950">空间留言</h3>
            <p class="mt-1 text-xs text-rose-700/50">共 {{ total }} 条 · 第 {{ current }} / {{ totalPages }} 页</p>
          </div>
          <button type="button" class="rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" :disabled="loading" @click="load">
            刷新
          </button>
        </div>

        <div v-if="!messages.length" class="mt-4 rounded-2xl border border-dashed border-rose-200 bg-white/55 px-4 py-10 text-center">
          <p class="text-sm font-semibold text-rose-800/70">还没有留言</p>
          <p class="mt-1 text-xs text-rose-700/45">写下第一句话，等另一半加入后一起看。</p>
        </div>

        <ul v-else class="mt-4 space-y-3">
          <li v-for="message in messages" :key="message.messageId" class="rounded-2xl border border-rose-100 bg-rose-50/25 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-rose-900">{{ message.userName || '匿名' }}</p>
                <p class="mt-0.5 text-[11px] text-rose-700/45">{{ message.createTime }}</p>
              </div>
              <button
                v-if="message.canDelete === true"
                type="button"
                class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-400 transition hover:bg-white hover:text-rose-600 disabled:opacity-50"
                :disabled="deletingMessageId === message.messageId"
                @click="removeMessage(message)"
              >
                {{ deletingMessageId === message.messageId ? '删除中…' : '删除' }}
              </button>
            </div>
            <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-rose-900/85">{{ message.content }}</p>

            <div v-if="message.replies?.length" class="mt-3 space-y-2 border-t border-rose-100 pt-3">
              <div v-for="reply in message.replies" :key="reply.replyId" class="rounded-xl bg-white/70 px-3 py-2">
                <div class="flex items-start justify-between gap-2">
                  <p class="min-w-0 whitespace-pre-wrap break-words text-xs leading-6 text-rose-800/80">
                    <span class="font-semibold text-rose-900">{{ reply.fromUserName }}</span>
                    <span v-if="reply.toUserName" class="text-rose-500"> 回复 {{ reply.toUserName }}</span>
                    ：{{ reply.content }}
                  </p>
                  <button
                    v-if="reply.canDelete === true"
                    type="button"
                    class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-rose-400 transition hover:text-rose-600 disabled:opacity-50"
                    :disabled="deletingReplyId === reply.replyId"
                    @click="removeReply(reply)"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" class="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-50" @click="startReply(message)">
                回复
              </button>
            </div>

            <form v-if="replyTarget?.messageId === message.messageId" class="mt-3 rounded-xl border border-rose-100 bg-white/80 p-3" @submit.prevent="submitReply">
              <label :for="`studio-reply-${message.messageId}`" class="block text-[11px] font-semibold text-rose-700">回复 {{ replyTarget.userName }}</label>
              <textarea
                :id="`studio-reply-${message.messageId}`"
                v-model="replyDraft"
                rows="2"
                maxlength="500"
                class="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs leading-6 text-rose-950 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                :placeholder="`写给 ${replyTarget.userName || 'Ta'} 的回复……`"
              />
              <div class="mt-2 flex justify-end gap-2">
                <button type="button" class="rounded-full px-3 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-50" @click="cancelReply">取消</button>
                <button type="submit" class="rounded-full bg-rose-500 px-3.5 py-1 text-[11px] font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60" :disabled="replying || !replyDraft.trim()">
                  {{ replying ? '回复中…' : '发送回复' }}
                </button>
              </div>
            </form>
          </li>
        </ul>

        <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-2">
          <button type="button" class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50" :disabled="current <= 1 || loading" @click="goToPage(current - 1)">
            上一页
          </button>
          <span class="text-xs text-rose-700/50">{{ current }} / {{ totalPages }}</span>
          <button type="button" class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50" :disabled="current >= totalPages || loading" @click="goToPage(current + 1)">
            下一页
          </button>
        </div>
      </section>
    </template>
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

const PAGE_SIZE = 10

const emit = defineEmits(['update:dirty'])

const loading = ref(true)
const loadError = ref('')
const messages = ref([])
const current = ref(1)
const total = ref(0)

const draft = ref('')
const publishing = ref(false)
const actionError = ref('')

const replyTarget = ref(null)
const replyDraft = ref('')
const replying = ref(false)
const deletingMessageId = ref(null)
const deletingReplyId = ref(null)

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
  actionError.value = ''
  try {
    ensureSuccess(await publishSpaceMessage(draft.value.trim()), '留言发布失败')
    draft.value = ''
    current.value = 1
    emit('update:dirty', false)
    ElMessage.success('留言已发布')
    await load()
  } catch (error) {
    actionError.value = readContentErrorMessage(error, '留言发布失败，请稍后重试')
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
