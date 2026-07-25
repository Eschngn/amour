<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <header
          class="relative overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white/70 px-5 py-8 shadow-sm shadow-rose-100/50 backdrop-blur-sm sm:px-8 sm:py-10">
          <div class="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-rose-100/70 blur-2xl"
            aria-hidden="true" />
          <div class="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-rose-500">
                <span class="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
                留言板
              </p>
              <h1 class="mt-3 font-display text-3xl font-bold tracking-tight text-rose-950 sm:text-5xl">
                给 Ta 留一句话
              </h1>
              <p class="mt-3 max-w-xl text-sm leading-7 text-rose-800/65 sm:text-base">
                树洞、晚安、碎碎念都可以。把想说的话留在这里，只有我们两个人看得见。
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3 text-xs text-rose-700/60">
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/80 px-3 py-1.5">
                <svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="1.8" aria-hidden="true">
                  <path d="M20.8 11.2c0 4.8-3.9 8.8-8.8 8.8s-8.8-4-8.8-8.8S7.1 2.4 12 2.4s8.8 4 8.8 8.8Z" />
                  <path d="M8.5 11.4h.01M12 11.4h.01M15.5 11.4h.01" stroke-linecap="round" />
                  <path d="M8.7 15.1c1.9 1.3 4.7 1.3 6.6 0" stroke-linecap="round" />
                </svg>
                仅你们可见
              </span>
              <span class="font-medium"><span class="text-base text-rose-600">{{ total }}</span> 条留言</span>
            </div>
          </div>
        </header>

        <div class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
          <section aria-labelledby="message-list-heading">
            <div class="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 id="message-list-heading" class="font-display text-xl font-bold text-rose-950 sm:text-2xl">你们的留言
                </h2>
                <p class="mt-1 text-xs text-rose-700/50">每一句话，都是被认真保存的心意</p>
              </div>
              <span v-if="total" class="rounded-full bg-rose-100/80 px-3 py-1 text-xs font-semibold text-rose-600">第 {{
                current }} / {{ totalPages }} 页</span>
            </div>

            <!-- 加载状态 -->
            <div v-if="loading" class="space-y-4" aria-label="正在加载留言" aria-busy="true">
              <div v-for="n in 3" :key="n" class="rounded-2xl border border-rose-100/80 bg-white/70 p-5">
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 animate-pulse rounded-full bg-rose-100" />
                  <div class="space-y-2">
                    <div class="h-3 w-24 animate-pulse rounded-full bg-rose-100" />
                    <div class="h-2.5 w-16 animate-pulse rounded-full bg-rose-50" />
                  </div>
                </div>
                <div class="mt-5 h-4 w-11/12 animate-pulse rounded-full bg-rose-50" />
                <div class="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-rose-50" />
              </div>
            </div>

            <!-- 错误状态 -->
            <div v-else-if="loadError"
              class="rounded-2xl border border-rose-100 bg-white/80 px-5 py-12 text-center shadow-sm">
              <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-400"><svg
                  class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                  aria-hidden="true">
                  <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
                  <path d="M10.3 3.8 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3l-7.4-13.2a2 2 0 0 0-3.4 0Z" />
                </svg></div>
              <p class="mt-4 text-sm text-rose-500">{{ loadError }}</p>
              <button type="button"
                class="mt-4 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                @click="fetchMessages()">重新加载</button>
            </div>

            <!-- 留言列表 -->
            <ul v-else-if="messages.length" class="space-y-4" aria-label="留言列表">
              <li v-for="m in messages" :key="m.messageId"
                class="group rounded-2xl border border-rose-100/90 bg-white/85 p-4 shadow-sm shadow-rose-100/30 transition duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md sm:p-5">
                <div class="flex items-start gap-3">
                  <div
                    class="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-sm font-bold text-white shadow-sm shadow-rose-200/70">
                    {{ initials(m.userName) }}
                    <img v-if="m.userAvatar" :src="m.userAvatar" :alt="`${m.userName || '匿名'}的头像`" class="absolute inset-0 h-full w-full object-cover" @load="$event.currentTarget.style.display = ''" @error="$event.currentTarget.style.display = 'none'">
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <p class="text-sm font-semibold text-rose-950">{{ m.userName || '匿名' }}</p>
                      <div class="flex shrink-0 items-center gap-1.5">
                        <time class="text-[11px] text-rose-700/45">{{ m.createTime }}</time>
                        <button v-if="m.canDelete === true" type="button" aria-label="删除这条留言" title="删除这条留言"
                          class="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50/70 px-2.5 py-1 text-xs font-semibold text-rose-500 transition hover:border-rose-200 hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          :disabled="deletingId === m.messageId" @click="deleteMessage(m)">
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                            aria-hidden="true">
                            <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                          {{ deletingId === m.messageId ? '删除中…' : '删除' }}
                        </button>
                      </div>
                    </div>
                    <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-rose-900/85">{{ m.content }}
                    </p>
                  </div>
                </div>
                <div class="mt-4 flex items-center justify-between border-t border-rose-100/80 pt-3">
                  <span class="inline-flex items-center gap-1.5 text-[11px] text-rose-700/45"><svg
                      class="h-3.5 w-3.5 text-rose-300" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="1.8" aria-hidden="true">
                      <path
                        d="M21 11.5a8.3 8.3 0 0 1-8.7 8.3 8.8 8.8 0 0 1-3.6-.8L3 20l1.3-4.7a8.1 8.1 0 0 1-.9-3.8A8.3 8.3 0 0 1 12 3.2a8.3 8.3 0 0 1 9 8.3Z" />
                    </svg>{{ m.replies?.length || 0 }} 条回复</span>
                  <div class="flex items-center gap-1">
                    <button type="button"
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                      @click="toggleReply(m)">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        aria-hidden="true">
                        <path
                          d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8 8 0 0 1-3.3-.7L4 20l1.2-4.2a7.7 7.7 0 0 1-.7-3.3A7.5 7.5 0 0 1 12 5a7.5 7.5 0 0 1 8 6.5Z" />
                      </svg>
                      {{ activeReplyTarget?.key === replyTargetKey(m.messageId) ? '取消' : '回复' }}
                    </button>
                  </div>
                </div>

                <!-- 回复输入框 -->
                <form v-if="activeReplyTarget?.messageId === m.messageId"
                  class="mt-4 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/80 to-pink-50/60 p-3.5 sm:p-4"
                  @submit.prevent="onReply">
                  <label class="block text-xs font-semibold text-rose-700" :for="`reply-${activeReplyTarget.key}`">
                    回复 {{ activeReplyTarget.userName }}
                  </label>
                  <textarea :id="`reply-${activeReplyTarget.key}`" v-model="replyDraft" rows="2"
                    class="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white/90 px-3 py-2.5 text-sm text-rose-950 placeholder:text-rose-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    :placeholder="`写下给 ${activeReplyTarget.userName || 'Ta'} 的回复……`" autofocus />
                  <div class="mt-2 flex justify-end gap-2">
                    <button type="button"
                      class="rounded-full px-4 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                      :disabled="replying" @click="closeReply">
                      取消
                    </button>
                    <button type="submit"
                      class="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="replying || !replyDraft.trim()">
                      {{ replying ? '回复中…' : '发送回复' }}
                    </button>
                  </div>
                </form>

                <!-- 回复列表 -->
                <div v-if="m.replies && m.replies.length" class="mt-4 space-y-2.5 border-t border-rose-100 pt-4">
                  <div v-for="r in m.replies" :key="r.replyId"
                    class="rounded-xl border border-rose-100/80 bg-rose-50/50 px-3.5 py-3">
                    <div class="flex items-start gap-3">
                      <div class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-rose-300 to-pink-400 text-[10px] font-bold text-white">
                        {{ initials(r.fromUserName) }}
                        <img v-if="r.fromUserAvatar" :src="r.fromUserAvatar" alt="" class="absolute inset-0 h-full w-full object-cover" @load="$event.currentTarget.style.display = ''" @error="$event.currentTarget.style.display = 'none'">
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-3">
                          <p class="whitespace-pre-wrap break-words text-sm leading-6 text-rose-800/80">{{ r.content }}</p>
                          <div class="flex shrink-0 items-center gap-1">
                            <button v-if="r.canDelete === true" type="button" aria-label="删除这条回复" title="删除这条回复"
                              class="rounded-full px-2 py-1 text-xs font-medium text-rose-400 transition hover:bg-white hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                              :disabled="deletingReplyId === r.replyId" @click="deleteReply(m, r)">
                              {{ deletingReplyId === r.replyId ? '删除中…' : '删除' }}
                            </button>
                            <button type="button"
                              class="rounded-full px-2 py-1 text-xs font-medium text-rose-500 transition hover:bg-white hover:text-rose-700"
                              @click="toggleReply(m, r)">
                              {{ activeReplyTarget?.key === replyTargetKey(m.messageId, r.replyId) ? '取消' : '回复' }}
                            </button>
                          </div>
                        </div>
                        <p class="mt-2 text-[11px] text-rose-600/50">
                          <span class="font-semibold text-rose-700/65">{{ r.fromUserName }}</span> 回复 {{ r.toUserName }} · {{ r.createTime }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>

            <!-- 空状态 -->
            <div v-else class="rounded-2xl border border-dashed border-rose-200 bg-white/55 px-5 py-14 text-center">
              <div
                class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-300"
                aria-hidden="true">♡</div>
              <p class="mt-4 font-display text-lg font-semibold text-rose-900">这里还很安静</p>
              <p class="mt-1 text-sm text-rose-700/50">还没有留言，写下第一句悄悄话吧。</p>
            </div>

            <!-- 分页 -->
            <nav v-if="totalPages > 1" class="mt-7 flex flex-wrap items-center justify-center gap-2" aria-label="分页导航">
              <button type="button"
                class="rounded-full border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="current === 1 || loading" @click="goToPage(current - 1)">
                上一页
              </button>
              <button v-for="p in visiblePages" :key="p" type="button"
                class="min-w-9 rounded-full border px-3 py-2 text-xs font-semibold transition" :class="p === current
                  ? 'border-rose-400 bg-rose-500 text-white shadow-sm shadow-rose-200'
                  : 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'" :disabled="loading" @click="goToPage(p)">
                {{ p }}
              </button>
              <button type="button"
                class="rounded-full border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="current === totalPages || loading" @click="goToPage(current + 1)">
                下一页
              </button>
            </nav>
          </section>

          <!-- 发布留言 -->
          <aside class="order-first lg:order-last lg:sticky lg:top-24">
            <form
              class="rounded-[1.75rem] border border-rose-100 bg-white/90 p-5 shadow-lg shadow-rose-100/50 backdrop-blur-sm sm:p-6"
              @submit.prevent="onPublish">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.22em] text-rose-400">写下此刻</p>
                  <h2 class="mt-1 font-display text-xl font-bold text-rose-950">给 Ta 的悄悄话</h2>
                </div>
                <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-xl text-rose-400"
                  aria-hidden="true">✎</span>
              </div>
              <label class="sr-only" for="msg-draft">写一条留言</label>
              <textarea id="msg-draft" v-model="draft" maxlength="500" rows="6"
                class="mt-5 w-full resize-y rounded-2xl border border-rose-200 bg-rose-50/25 px-4 py-3 text-sm leading-7 text-rose-950 placeholder:text-rose-400/80 focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100"
                placeholder="今天想对 Ta 说……" />
              <div class="mt-2 flex items-center justify-between gap-3 text-[11px] text-rose-700/45">
                <span>轻轻写下，不必完美</span><span :class="draft.length > 450 ? 'text-rose-500' : ''">{{ draft.length }} /
                  500</span></div>
              <button type="submit"
                class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 py-3 text-sm font-semibold text-white shadow-md shadow-rose-300/40 transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="publishing || !draft.trim()">
                <svg v-if="!publishing" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" aria-hidden="true">
                  <path d="m21 3-7.2 18-3.6-7.2L3 10.2 21 3Z" />
                  <path d="m10.2 13.8 4.5-4.5" />
                </svg>
                {{ publishing ? '发布中…' : '发布留言' }}
              </button>
              <p class="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-rose-700/45"><svg
                  class="h-3.5 w-3.5 text-rose-300" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="1.8" aria-hidden="true">
                  <path d="M12 3 4.5 6v5.6c0 4.3 3.1 7.7 7.5 9.4 4.4-1.7 7.5-5.1 7.5-9.4V6L12 3Z" />
                  <path d="m9 12 2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>只有登录后才能发布和回复</p>
            </form>
          </aside>
        </div>
      </div>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import api from '@/axios'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import { isFrontendAuthenticated } from '@/utils/auth'

const SIZE = 10
const route = useRoute()
const router = useRouter()

const messages = ref([])
const current = ref(1)
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const draft = ref('')
const publishing = ref(false)
const activeReplyTarget = ref(null)
const replyDraft = ref('')
const replying = ref(false)
const deletingId = ref(null)
const deletingReplyId = ref(null)

function initials(name) {
  const value = String(name || '匿名').trim()
  return value.slice(0, 2).toUpperCase()
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / SIZE)))

const visiblePages = computed(() => {
  const pages = []
  const tp = totalPages.value
  const cur = current.value
  let start = Math.max(1, cur - 2)
  let end = Math.min(tp, cur + 2)
  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(tp, start + 4)
    } else {
      start = Math.max(1, end - 4)
    }
  }
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

async function fetchMessages(showLoading = true) {
  if (showLoading) loading.value = true
  loadError.value = ''
  try {
    const { data } = await api.post('/message/page', null, {
      params: {
        current: current.value,
        size: SIZE,
      },
    })
    if (data.success && data.data) {
      messages.value = data.data.records || []
      total.value = Number(data.data.total) || 0
      current.value = Number(data.data.current) || 1
    } else {
      loadError.value = data.message || '获取留言失败'
    }
  } catch (err) {
    loadError.value = err.response?.data?.message || '网络异常，请稍后重试'
  } finally {
    if (showLoading) loading.value = false
  }
}

function goToPage(page) {
  if (loading.value) return
  if (page < 1 || page > totalPages.value) return
  current.value = page
  closeReply()
  fetchMessages()
}

function redirectToLogin(message = '请先登录后再发布留言') {
  ElMessage.warning(message)
  router.push({
    path: '/login',
    query: {
      redirect: route.fullPath,
      reason: 'login_required',
    },
  })
}

async function onPublish() {
  if (!draft.value.trim()) return
  if (!isFrontendAuthenticated()) {
    redirectToLogin()
    return
  }

  publishing.value = true
  try {
    const { data } = await api.post('/message/publish', {
      content: draft.value.trim(),
    })
    if (data.success) {
      draft.value = ''
      current.value = 1
      fetchMessages()
    } else if (data.errorCode === '20002') {
      redirectToLogin(data.message)
    } else {
      ElMessage.error(data.message || '发布留言失败，请稍后重试')
    }
  } catch (err) {
    const status = err.response?.status
    const errorCode = err.response?.data?.errorCode
    if (status === 401 || errorCode === '20002') {
      redirectToLogin(err.response?.data?.message)
      return
    }
    ElMessage.error(err.response?.data?.message || '发布留言失败，请稍后重试')
  } finally {
    publishing.value = false
  }
}

function replyTargetKey(messageId, replyId = '') {
  return `${messageId}:${replyId || 'message'}`
}

function toggleReply(message, targetReply = null) {
  if (!isFrontendAuthenticated()) {
    redirectToLogin('请先登录后再回复留言')
    return
  }
  const target = {
    messageId: message.messageId,
    replyId: targetReply?.replyId || '',
    userName: targetReply?.fromUserName || message.userName || 'Ta',
  }
  target.key = replyTargetKey(target.messageId, target.replyId)
  if (activeReplyTarget.value?.key === target.key) {
    closeReply()
    return
  }
  activeReplyTarget.value = target
  replyDraft.value = ''
}

function closeReply() {
  if (replying.value) return
  activeReplyTarget.value = null
  replyDraft.value = ''
}

async function onReply() {
  const content = replyDraft.value.trim()
  const target = activeReplyTarget.value
  if (!content || !target || replying.value) return
  if (!isFrontendAuthenticated()) {
    redirectToLogin('请先登录后再回复留言')
    return
  }

  replying.value = true
  try {
    const { data } = await api.post('/message/reply', {
      messageId: target.messageId,
      ...(target.replyId ? { replyId: target.replyId } : {}),
      content,
    })
    if (data.success) {
      activeReplyTarget.value = null
      replyDraft.value = ''
      ElMessage.success('回复成功')
      await fetchMessages(false)
    } else if (data.errorCode === '20002') {
      redirectToLogin(data.message)
    } else {
      ElMessage.error(data.message || '回复失败，请稍后重试')
      if (data.errorCode === '20006' || data.errorCode === '20007') {
        activeReplyTarget.value = null
        replyDraft.value = ''
        await fetchMessages(false)
      }
    }
  } catch (err) {
    const status = err.response?.status
    const errorCode = err.response?.data?.errorCode
    if (status === 401 || errorCode === '20002') {
      redirectToLogin(err.response?.data?.message)
      return
    }
    ElMessage.error(err.response?.data?.message || '回复失败，请稍后重试')
  } finally {
    replying.value = false
  }
}

async function deleteMessage(message) {
  if (!message?.canDelete || deletingId.value) return
  if (!isFrontendAuthenticated()) {
    redirectToLogin('请先登录后再删除留言')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定删除这条留言吗？留言下的回复也会一并删除，且无法恢复。',
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
    const { data } = await api.post('/message/delete', {
      messageId: message.messageId,
    })
    if (data.success) {
      ElMessage.success('留言已删除')
      if (activeReplyTarget.value?.messageId === message.messageId) {
        activeReplyTarget.value = null
        replyDraft.value = ''
      }
      const remainingTotal = Math.max(0, total.value - 1)
      current.value = Math.min(current.value, Math.max(1, Math.ceil(remainingTotal / SIZE)))
      await fetchMessages(false)
    } else if (data.errorCode === '20002') {
      redirectToLogin(data.message)
    } else {
      ElMessage.error(data.message || '删除留言失败，请稍后重试')
      if (data.errorCode === '20006' || data.errorCode === '20026') {
        await fetchMessages(false)
      }
    }
  } catch (err) {
    const status = err.response?.status
    const errorCode = err.response?.data?.errorCode
    if (status === 401 || errorCode === '20002') {
      redirectToLogin(err.response?.data?.message)
      return
    }
    ElMessage.error(err.response?.data?.message || '删除留言失败，请稍后重试')
  } finally {
    deletingId.value = null
  }
}

async function deleteReply(message, reply) {
  if (!reply?.canDelete || deletingReplyId.value) return
  if (!isFrontendAuthenticated()) {
    redirectToLogin('请先登录后再删除回复')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定删除这条回复吗？其他人对这条回复的后续回复也会一并删除，且无法恢复。',
      '删除回复',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  deletingReplyId.value = reply.replyId
  try {
    const { data } = await api.post('/message/reply/delete', {
      replyId: reply.replyId,
    })
    if (data.success) {
      ElMessage.success('回复已删除')
      if (activeReplyTarget.value?.key === replyTargetKey(message.messageId, reply.replyId)) {
        activeReplyTarget.value = null
        replyDraft.value = ''
      }
      await fetchMessages(false)
    } else if (data.errorCode === '20002') {
      redirectToLogin(data.message)
    } else {
      ElMessage.error(data.message || '删除回复失败，请稍后重试')
      if (data.errorCode === '20007' || data.errorCode === '20027') {
        await fetchMessages(false)
      }
    }
  } catch (err) {
    const status = err.response?.status
    const errorCode = err.response?.data?.errorCode
    if (status === 401 || errorCode === '20002') {
      redirectToLogin(err.response?.data?.message)
      return
    }
    ElMessage.error(err.response?.data?.message || '删除回复失败，请稍后重试')
  } finally {
    deletingReplyId.value = null
  }
}

onMounted(() => {
  fetchMessages()
})
</script>
