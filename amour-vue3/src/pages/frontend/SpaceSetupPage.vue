<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <RouterLink
            to="/plaza"
            class="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/75 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M19 12H5m5 5-5-5 5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            返回恋爱广场
          </RouterLink>
          <RouterLink to="/" class="text-xs font-semibold text-rose-500 transition hover:text-rose-700">
            回到首页
          </RouterLink>
        </div>

        <header class="relative overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white/75 px-5 py-8 shadow-sm shadow-rose-100/50 backdrop-blur-sm sm:px-8 sm:py-10">
          <div class="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-rose-100/80 blur-3xl" aria-hidden="true" />
          <div class="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-fuchsia-100/60 blur-3xl" aria-hidden="true" />
          <div class="relative max-w-3xl">
            <p class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-rose-500">
              <span class="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
              Couple Space Setup
            </p>
            <h1 class="mt-3 font-display text-3xl font-extrabold tracking-tight text-rose-950 sm:text-5xl">
              创建或绑定你们的情侣空间
            </h1>
            <p class="mt-3 text-sm leading-7 text-rose-800/65 sm:text-base">
              如果你们刚刚开始，可以创建一个只属于两个人的小宇宙；如果另一半已经发出邀请，也可以凭邀请链接或令牌加入。
            </p>
          </div>
        </header>

        <section v-if="!frontendLoggedIn" class="mt-8 rounded-[1.75rem] border border-rose-100 bg-white/80 px-6 py-16 text-center shadow-sm">
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-300" aria-hidden="true">♥</span>
          <h2 class="mt-4 font-display text-xl font-bold text-rose-950">登录后才能创建或绑定情侣空间</h2>
          <p class="mt-2 text-sm text-rose-700/55">登录后可以创建新的空间，也可以接受另一半的邀请。</p>
          <RouterLink
            :to="{ path: '/login', query: { redirect: route.fullPath } }"
            class="mt-5 inline-flex rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-600"
          >
            去登录
          </RouterLink>
        </section>

        <div v-else-if="statusLoading" class="mt-8 grid gap-6 lg:grid-cols-2" aria-label="正在读取情侣空间状态" aria-busy="true">
          <div class="h-80 animate-pulse rounded-[1.75rem] border border-rose-100 bg-white/60" />
          <div class="h-80 animate-pulse rounded-[1.75rem] border border-rose-100 bg-white/60" />
        </div>

        <section v-else-if="statusError" class="mt-8 rounded-[1.75rem] border border-rose-100 bg-white/80 px-6 py-14 text-center shadow-sm" role="alert">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-400">
            <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
              <path d="M10.3 3.8 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3l-7.4-13.2a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h2 class="mt-4 font-display text-xl font-bold text-rose-950">暂时无法确认你的空间状态</h2>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700/55">{{ spaceError }}</p>
          <p class="mt-2 text-xs text-rose-500/60">这不代表你没有情侣空间，可能只是网络或服务暂时不可用。</p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" class="rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-600" @click="retryStatus">
              重新读取状态
            </button>
            <RouterLink to="/plaza" class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
              返回恋爱广场
            </RouterLink>
          </div>
        </section>

        <section v-else-if="isSpaceReady" class="mt-8 rounded-[1.75rem] border border-emerald-100 bg-white/85 px-6 py-14 text-center shadow-lg shadow-emerald-100/30">
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-500" aria-hidden="true">✓</span>
          <h2 class="mt-4 font-display text-2xl font-bold text-rose-950">你已经拥有情侣空间</h2>
          <p class="mt-2 text-sm leading-6 text-rose-700/55">
            当前空间「{{ spaceStatus?.spaceName || '我们的故事' }}」已经可以正常使用，不需要重复创建或绑定。
          </p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <RouterLink to="/" class="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105">
              返回我的情侣空间
            </RouterLink>
            <RouterLink to="/plaza" class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
              返回恋爱广场
            </RouterLink>
          </div>
        </section>

        <section v-else-if="hasCoupleSpace" class="mt-8 rounded-[1.75rem] border p-6 shadow-sm sm:p-8" :class="statusView.panelClass">
          <div class="flex items-start gap-4">
            <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl" :class="statusView.iconClass" aria-hidden="true">{{ statusView.icon }}</span>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-[0.22em]" :class="statusView.eyebrowClass">{{ statusView.eyebrow }}</p>
              <h2 class="mt-1 break-words font-display text-2xl font-bold text-rose-950">{{ statusView.title }}</h2>
              <p class="mt-2 text-sm leading-6 text-rose-800/60">{{ statusView.description }}</p>
              <p v-if="spaceStatus?.spaceName" class="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-rose-700">
                <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
                <span class="truncate">当前空间 · {{ spaceStatus.spaceName }}</span>
              </p>
              <div class="mt-5 flex flex-wrap gap-2">
                <button type="button" class="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="retryStatus">
                  刷新空间状态
                </button>
                <RouterLink to="/plaza" class="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-600">
                  返回恋爱广场
                </RouterLink>
              </div>
            </div>
          </div>
        </section>

        <template v-else>
          <div class="mt-8 grid items-start gap-6 lg:grid-cols-2">
            <section
              id="space-create"
              class="scroll-mt-24 rounded-[1.75rem] border bg-white/85 p-5 shadow-lg shadow-rose-100/35 sm:p-7"
              :class="action === 'create' ? 'border-rose-300 ring-2 ring-rose-200/70' : 'border-rose-100'"
              aria-labelledby="space-create-heading"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-400">Create A Space</p>
                  <h2 id="space-create-heading" class="mt-1 font-display text-2xl font-bold text-rose-950">创建情侣空间</h2>
                </div>
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-lg text-rose-400" aria-hidden="true">✦</span>
              </div>
              <p class="mt-2 text-xs leading-6 text-rose-700/50">创建后你将成为空间发起人，空间会先进入等待另一半加入的状态。</p>

              <form class="mt-5 space-y-4" @submit.prevent="createSpace">
                <div>
                  <label for="setup-space-name" class="block text-sm font-semibold text-rose-900">空间名称</label>
                  <input
                    id="setup-space-name"
                    v-model="createForm.spaceName"
                    maxlength="30"
                    class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                    placeholder="我们的故事"
                  >
                  <p class="mt-1.5 text-[11px] text-rose-700/45">不填写时默认为「我们的故事」，最多 30 个字符</p>
                </div>
                <div>
                  <label for="setup-love-start" class="block text-sm font-semibold text-rose-900">恋爱开始时间</label>
                  <input
                    id="setup-love-start"
                    v-model="createForm.loveStartTime"
                    type="datetime-local"
                    class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  >
                  <p class="mt-1.5 text-[11px] text-rose-700/45">选填，用于计算你们相伴的天数</p>
                </div>
                <div>
                  <label for="setup-description" class="block text-sm font-semibold text-rose-900">空间简介</label>
                  <textarea
                    id="setup-description"
                    v-model="createForm.description"
                    rows="3"
                    maxlength="500"
                    class="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm leading-7 text-rose-950 outline-none transition placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                    placeholder="写下这个空间想收藏的东西……"
                  />
                  <p class="mt-1.5 text-right text-[11px] text-rose-700/45">{{ createForm.description.length }} / 500</p>
                </div>
                <p v-if="createError" class="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">
                  {{ createError }}
                </p>
                <button
                  type="submit"
                  class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 py-3 text-sm font-semibold text-white shadow-md shadow-rose-300/40 transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="creating"
                >
                  <span v-if="creating" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                  {{ creating ? '正在创建…' : '创建情侣空间' }}
                </button>
              </form>
            </section>

            <section
              id="space-bind"
              class="scroll-mt-24 rounded-[1.75rem] border bg-white/85 p-5 shadow-lg shadow-rose-100/35 sm:p-7"
              :class="action === 'bind' ? 'border-rose-300 ring-2 ring-rose-200/70' : 'border-rose-100'"
              aria-labelledby="space-bind-heading"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-400">Join A Space</p>
                  <h2 id="space-bind-heading" class="mt-1 font-display text-2xl font-bold text-rose-950">绑定情侣空间</h2>
                </div>
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-lg text-amber-400" aria-hidden="true">♡</span>
              </div>
              <p class="mt-2 text-xs leading-6 text-rose-700/50">粘贴另一半发来的邀请链接或邀请令牌，先预览邀请，再确认加入。</p>

              <div class="mt-5">
                <label for="setup-invite-token" class="block text-sm font-semibold text-rose-900">邀请链接或令牌</label>
                <textarea
                  id="setup-invite-token"
                  v-model="inviteToken"
                  rows="3"
                  maxlength="500"
                  class="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm leading-6 text-rose-950 outline-none transition placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  placeholder="https://… 或直接粘贴邀请令牌"
                />
                <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p class="text-[11px] text-rose-700/45">支持完整邀请链接，也支持单独粘贴令牌</p>
                  <button
                    type="button"
                    class="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="previewing"
                    @click="loadInvitationPreview"
                  >
                    {{ previewing ? '预览中…' : '预览邀请' }}
                  </button>
                </div>
                <p v-if="previewError" class="mt-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">
                  {{ previewError }}
                </p>

                <div v-if="preview" class="mt-4 rounded-2xl border border-rose-100 bg-rose-50/35 p-4">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">Invitation Preview</p>
                      <h3 class="mt-1 break-words font-display text-xl font-bold text-rose-950">{{ preview.spaceName || '情侣空间' }}</h3>
                      <p class="mt-1 text-xs text-rose-700/55">
                        来自 {{ preview.inviterName || '恋人' }}
                        <span v-if="preview.inviterAmourId"> · ID {{ preview.inviterAmourId }}</span>
                      </p>
                    </div>
                    <span class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="previewStatusClass">
                      {{ preview.statusText || '未知状态' }}
                    </span>
                  </div>
                  <p v-if="preview.description" class="mt-3 whitespace-pre-line break-words text-xs leading-6 text-rose-800/60">{{ preview.description }}</p>
                  <dl class="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div class="rounded-xl bg-white/70 px-3 py-2">
                      <dt class="text-[10px] text-rose-700/45">空间成员</dt>
                      <dd class="mt-0.5 font-semibold text-rose-900">{{ preview.memberCount || 0 }} / {{ preview.memberLimit || 2 }}</dd>
                    </div>
                    <div class="rounded-xl bg-white/70 px-3 py-2">
                      <dt class="text-[10px] text-rose-700/45">有效期</dt>
                      <dd class="mt-0.5 text-[11px] font-semibold leading-5 text-rose-900">{{ formatInvitationExpiry(preview.expiresAt) }}</dd>
                    </div>
                  </dl>
                  <p v-if="preview.message" class="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-800" role="status">
                    {{ preview.message }}
                  </p>
                  <p v-if="acceptError" class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">
                    {{ acceptError }}
                  </p>
                  <div class="mt-4 flex flex-wrap gap-2">
                    <button
                      v-if="preview.joinable"
                      type="button"
                      class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="acceptingToken"
                      @click="acceptPreviewInvitation"
                    >
                      <span v-if="acceptingToken" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                      {{ acceptingToken ? '正在加入…' : '接受邀请并加入' }}
                    </button>
                    <RouterLink v-if="preview.alreadyMember || preview.inOtherSpace" to="/" class="rounded-full border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
                      返回我的情侣空间
                    </RouterLink>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section class="mt-6 rounded-[1.75rem] border border-rose-100 bg-white/80 p-5 shadow-sm shadow-rose-100/30 sm:p-7" aria-labelledby="received-invitations-heading">
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-400">Received Invitations</p>
                <h2 id="received-invitations-heading" class="mt-1 font-display text-2xl font-bold text-rose-950">收到的邀请</h2>
              </div>
              <button type="button" class="rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50" :disabled="invitationsLoading" @click="refreshReceivedInvitations">
                {{ invitationsLoading ? '刷新中…' : '刷新列表' }}
              </button>
            </div>

            <p v-if="invitationActionError" class="mt-4 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">
              {{ invitationActionError }}
            </p>

            <div v-if="invitationsLoading" class="mt-5 grid gap-3 sm:grid-cols-2" aria-label="正在加载收到的邀请" aria-busy="true">
              <div v-for="n in 2" :key="n" class="h-28 animate-pulse rounded-2xl border border-rose-100 bg-rose-50/60" />
            </div>
            <div v-else-if="invitationsError" class="mt-5 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-8 text-center">
              <p class="text-xs leading-5 text-rose-500">{{ invitationsError }}</p>
              <button type="button" class="mt-3 rounded-full border border-rose-200 bg-white px-4 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="refreshReceivedInvitations">
                重新加载
              </button>
            </div>
            <div v-else-if="!invitations.length" class="mt-5 rounded-2xl border border-dashed border-rose-200 bg-white/55 px-4 py-10 text-center">
              <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-xl text-rose-300" aria-hidden="true">♡</span>
              <p class="mt-3 text-sm font-semibold text-rose-800/70">暂时没有收到邀请</p>
              <p class="mt-1 text-xs text-rose-700/45">当另一半向你发出邀请后，会出现在这里。</p>
            </div>
            <div v-else class="mt-5 space-y-3">
              <article v-for="invitation in invitations" :key="invitation.invitationId" class="rounded-2xl border border-rose-100 bg-rose-50/30 p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs text-rose-700/55">
                      <span class="font-semibold text-rose-900">{{ invitation.inviterName || 'Ta' }}</span>
                      邀请你加入
                    </p>
                    <h3 class="mt-1 break-words font-display text-lg font-bold text-rose-950">{{ invitation.spaceName || '情侣空间' }}</h3>
                    <p class="mt-1 text-[11px] text-rose-700/45">
                      {{ formatInvitationExpiry(invitation.expiresAt) }}
                      <span v-if="invitation.inviterAmourId"> · ID {{ invitation.inviterAmourId }}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="acceptingInvitationId === invitation.invitationId"
                    @click="acceptReceivedInvitation(invitation)"
                  >
                    {{ acceptingInvitationId === invitation.invitationId ? '正在加入…' : '接受邀请' }}
                  </button>
                </div>
              </article>
            </div>
          </section>
        </template>
      </div>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import { frontendLoggedIn } from '@/utils/auth'
import {
  acceptSpaceInvitation,
  createCoupleSpace,
  fetchReceivedSpaceInvitations,
  previewSpaceInvitation,
} from '@/api/space'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { formatInvitationExpiry } from '@/utils/spaceFormat'
import { readSpaceErrorMessage } from '@/utils/spaceState'

const route = useRoute()
const router = useRouter()
const {
  spaceStatus,
  spaceLoading,
  spaceError,
  hasCoupleSpace,
  isSpaceReady,
  refreshSpaceStatus,
} = useFrontendSpace()

const createForm = reactive({
  spaceName: '',
  description: '',
  loveStartTime: '',
})
const creating = ref(false)
const createError = ref('')

const inviteToken = ref('')
const preview = ref(null)
const previewing = ref(false)
const previewError = ref('')
const acceptingToken = ref(false)
const acceptError = ref('')
const previewToken = ref('')

const invitations = ref([])
const invitationsLoading = ref(false)
const invitationsError = ref('')
const acceptingInvitationId = ref(null)
const invitationActionError = ref('')

const action = computed(() => String(route.query.action || '').toLowerCase())
const statusLoading = computed(() => spaceLoading.value && !spaceStatus.value)
const statusError = computed(() => Boolean(spaceError.value) && !spaceStatus.value)

const statusView = computed(() => {
  const status = Number(spaceStatus.value?.status)
  if (status === 0) {
    return {
      icon: '◷',
      eyebrow: 'Waiting For Partner',
      title: '空间已创建，等待另一半加入',
      description: '空间已经准备好，只等另一半接受邀请。对方加入后，就可以一起使用故事、相册和纪念日。',
      iconClass: 'bg-amber-100 text-amber-500',
      panelClass: 'border-amber-200/80 bg-amber-50/70',
      eyebrowClass: 'text-amber-500',
    }
  }
  if (status === 2) {
    return {
      icon: '❄',
      eyebrow: 'Space Frozen',
      title: '情侣空间已冻结',
      description: '当前空间暂时不可用。你可以返回恋爱广场，或稍后刷新空间状态。',
      iconClass: 'bg-sky-100 text-sky-500',
      panelClass: 'border-sky-200/80 bg-sky-50/70',
      eyebrowClass: 'text-sky-500',
    }
  }
  if (status === 3) {
    return {
      icon: '▣',
      eyebrow: 'Space Archived',
      title: '情侣空间已归档',
      description: '当前空间已经归档，不能继续创建或绑定其他空间。你仍然可以浏览恋爱广场。',
      iconClass: 'bg-slate-100 text-slate-500',
      panelClass: 'border-slate-200 bg-slate-50/80',
      eyebrowClass: 'text-slate-500',
    }
  }
  return {
    icon: '!',
    eyebrow: 'Space Unavailable',
    title: '情侣空间暂时不可用',
    description: '当前空间状态暂时无法进入，请返回恋爱广场或刷新状态后再试。',
    iconClass: 'bg-rose-100 text-rose-500',
    panelClass: 'border-rose-200/80 bg-rose-50/70',
    eyebrowClass: 'text-rose-500',
  }
})

const previewStatusClass = computed(() => {
  const status = Number(preview.value?.status)
  if (status === 0) return 'bg-amber-100 text-amber-700'
  if (status === 1) return 'bg-emerald-100 text-emerald-700'
  if (status === 3) return 'bg-rose-100 text-rose-600'
  return 'bg-slate-100 text-slate-600'
})

function toBackendDateTime(value) {
  const text = String(value || '').trim()
  if (!text) return null
  const normalized = text.replace('T', ' ')
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized) ? `${normalized}:00` : normalized
}

/** 支持完整邀请链接、带 token 参数的 URL 或纯 token。 */
function extractInvitationToken(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  try {
    const url = new URL(text)
    const fromQuery = url.searchParams.get('token')
    if (fromQuery?.trim()) return fromQuery.trim()
    const match = url.pathname.match(/\/(?:space\/)?invitation\/([^/]+)\/?$/)
    if (match?.[1]) return decodeURIComponent(match[1]).trim()
  } catch {
    const match = text.match(/[?&]token=([^&]+)/)
    if (match?.[1]) return decodeURIComponent(match[1]).trim()
  }
  return text
}

function safeRedirect() {
  const raw = route.query.redirect
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/'
  if (raw.startsWith('/admin') || raw.startsWith('/login') || raw.startsWith('/space/setup')) return '/'
  return raw
}

function scrollToAction() {
  if (action.value !== 'create' && action.value !== 'bind') return
  const target = document.getElementById(action.value === 'create' ? 'space-create' : 'space-bind')
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function loadReceivedInvitations() {
  if (invitationsLoading.value) return
  if (hasCoupleSpace.value || spaceError.value) return

  invitationsLoading.value = true
  invitationsError.value = ''
  try {
    const { data } = await fetchReceivedSpaceInvitations()
    if (!data?.success) {
      throw new Error(data?.message || '收到的邀请加载失败')
    }
    invitations.value = Array.isArray(data.data) ? data.data : []
  } catch (error) {
    invitationsError.value = readSpaceErrorMessage(error, '收到的邀请加载失败，请稍后重试')
  } finally {
    invitationsLoading.value = false
  }
}

function refreshReceivedInvitations() {
  invitationActionError.value = ''
  loadReceivedInvitations()
}

function redirectBackWhenReady() {
  if (!isSpaceReady.value || typeof route.query.redirect !== 'string') return false
  router.replace(safeRedirect())
  return true
}

async function retryStatus() {
  await refreshSpaceStatus()
  if (redirectBackWhenReady()) return
  if (!hasCoupleSpace.value && !spaceError.value) {
    await loadReceivedInvitations()
  }
}

async function createSpace() {
  if (creating.value) return
  const spaceName = createForm.spaceName.trim()
  const description = createForm.description.trim()
  if (spaceName.length > 30) {
    createError.value = '空间名称不能超过 30 个字符'
    return
  }
  if (description.length > 500) {
    createError.value = '空间简介不能超过 500 个字符'
    return
  }

  creating.value = true
  createError.value = ''
  try {
    const { data } = await createCoupleSpace({
      spaceName,
      description,
      loveStartTime: toBackendDateTime(createForm.loveStartTime),
    })
    if (!data?.success) {
      if (String(data?.errorCode ?? '') === '20033') {
        await refreshSpaceStatus()
      }
      throw new Error(data?.message || '创建情侣空间失败')
    }
    ElMessage.success('情侣空间创建成功')
    // 不能只依赖创建接口的返回值，必须重新拉取 /space/status 确认上下文。
    await refreshSpaceStatus()
    router.replace('/')
  } catch (error) {
    createError.value = readSpaceErrorMessage(error, '创建情侣空间失败，请稍后重试')
  } finally {
    creating.value = false
  }
}

async function loadInvitationPreview() {
  const token = extractInvitationToken(inviteToken.value)
  if (!token) {
    previewError.value = '请输入邀请链接或邀请令牌'
    preview.value = null
    return
  }

  previewing.value = true
  previewError.value = ''
  acceptError.value = ''
  preview.value = null
  previewToken.value = token
  try {
    const { data } = await previewSpaceInvitation(token)
    if (!data?.success) {
      throw new Error(data?.message || '邀请不存在或已失效')
    }
    preview.value = data.data || null
    if (!preview.value) {
      throw new Error('邀请不存在或已失效')
    }
  } catch (error) {
    previewError.value = readSpaceErrorMessage(error, '邀请预览失败，请稍后重试')
  } finally {
    previewing.value = false
  }
}

async function finishBinding() {
  ElMessage.success('已加入情侣空间')
  // 同样必须重新获取空间状态，不能只依赖 accept 返回体。
  await refreshSpaceStatus()
  router.replace(isSpaceReady.value ? safeRedirect() : '/')
}

async function acceptPreviewInvitation() {
  if (acceptingToken.value || !preview.value?.joinable) return
  acceptingToken.value = true
  acceptError.value = ''
  try {
    const { data } = await acceptSpaceInvitation({ token: previewToken.value })
    if (!data?.success) {
      throw new Error(data?.message || '接受邀请失败')
    }
    await finishBinding()
  } catch (error) {
    acceptError.value = readSpaceErrorMessage(error, '接受邀请失败，请稍后重试')
  } finally {
    acceptingToken.value = false
  }
}

async function acceptReceivedInvitation(invitation) {
  if (acceptingInvitationId.value != null) return
  acceptingInvitationId.value = invitation.invitationId
  invitationActionError.value = ''
  try {
    const { data } = await acceptSpaceInvitation({ invitationId: invitation.invitationId })
    if (!data?.success) {
      throw new Error(data?.message || '接受邀请失败')
    }
    await finishBinding()
  } catch (error) {
    invitationActionError.value = readSpaceErrorMessage(error, '接受邀请失败，请稍后重试')
    await loadReceivedInvitations()
  } finally {
    acceptingInvitationId.value = null
  }
}

watch(inviteToken, () => {
  if (previewing.value) return
  preview.value = null
  previewError.value = ''
  acceptError.value = ''
})

onMounted(async () => {
  if (!frontendLoggedIn.value) return

  const tokenFromQuery = typeof route.query.token === 'string' ? route.query.token.trim() : ''
  if (tokenFromQuery) inviteToken.value = tokenFromQuery

  await refreshSpaceStatus()
  if (redirectBackWhenReady()) return
  if (!hasCoupleSpace.value && !spaceError.value) {
    await loadReceivedInvitations()
    if (tokenFromQuery) await loadInvitationPreview()
  }
  await nextTick()
  scrollToAction()
})
</script>
