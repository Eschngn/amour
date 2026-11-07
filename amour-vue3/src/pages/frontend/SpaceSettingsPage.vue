<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <div class="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header class="rounded-[2rem] border border-rose-100/80 bg-white/75 px-6 py-8 shadow-sm shadow-rose-100/50 backdrop-blur sm:px-9">
          <RouterLink
            :to="isSpaceReady ? '/' : '/plaza'"
            class="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M19 12H5m5 5-5-5 5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ isSpaceReady ? '返回我的情侣空间' : '返回恋爱广场' }}
          </RouterLink>

          <p class="mt-5 text-xs font-bold uppercase tracking-[0.26em] text-rose-400">Space settings</p>
          <h1 class="mt-2 font-display text-3xl font-bold text-rose-950 sm:text-4xl">情侣空间设置</h1>
          <p class="mt-3 max-w-2xl text-sm leading-7 text-rose-800/60">
            管理空间是否公开到恋爱广场、发起或处理解绑申请。解绑需要双方确认后才会生效，所有操作都以服务器的真实状态为准。
          </p>
        </header>

        <!-- 首次加载：还没有任何已确认的空间状态 -->
        <div
          v-if="showInitialSkeleton"
          class="mt-8 space-y-4"
          aria-label="正在读取情侣空间状态"
          aria-busy="true"
        >
          <div class="h-36 animate-pulse rounded-[1.75rem] border border-rose-100 bg-white/60" />
          <div class="h-48 animate-pulse rounded-[1.75rem] border border-rose-100 bg-white/60" />
          <div class="h-40 animate-pulse rounded-[1.75rem] border border-rose-100 bg-white/60" />
        </div>

        <!-- 加载失败且没有可展示的旧状态：给出明确的重试入口 -->
        <section
          v-else-if="spaceError && !hasSpaceIdentity(spaceStatus)"
          class="mt-8 rounded-[1.75rem] border border-rose-100 bg-white/85 px-6 py-14 text-center shadow-sm shadow-rose-100/40"
          role="alert"
        >
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-400">
            <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
              <path d="M10.3 3.8 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3l-7.4-13.2a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h2 class="mt-4 font-display text-xl font-bold text-rose-950">暂时无法读取你的空间状态</h2>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700/55">{{ spaceError }}</p>
          <p class="mt-2 text-xs text-rose-500/60">这不代表你没有情侣空间，可能只是网络或服务暂时不可用。</p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              class="rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="spaceLoading"
              @click="reloadStatus"
            >
              {{ spaceLoading ? '重新读取中…' : '重新读取状态' }}
            </button>
            <RouterLink
              to="/plaza"
              class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              返回恋爱广场
            </RouterLink>
          </div>
        </section>

        <!-- status=5：完成解绑的历史空间只做兼容提示，不能展示旧空间内容或恢复入口 -->
        <section
          v-else-if="isUnboundSpace(spaceStatus)"
          class="mt-8 rounded-[1.75rem] border border-rose-100 bg-white/85 px-6 py-14 text-center shadow-sm shadow-rose-100/40"
        >
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-400" aria-hidden="true">♥</span>
          <h2 class="mt-4 font-display text-2xl font-bold text-rose-950">情侣空间已解除绑定</h2>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700/55">
            你们现在都可以重新创建或加入情侣空间。旧空间的故事、照片和纪念日不会再作为当前空间展示。
          </p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <RouterLink
              to="/space/setup"
              class="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105"
            >
              创建或绑定情侣空间
            </RouterLink>
            <RouterLink
              to="/plaza"
              class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              返回恋爱广场
            </RouterLink>
          </div>
        </section>

        <!-- 已登录但确实没有空间：引导去创建或绑定，而不是伪造设置项 -->
        <section
          v-else-if="!hasCoupleSpace"
          class="mt-8 rounded-[1.75rem] border border-rose-100 bg-white/85 px-6 py-14 text-center shadow-sm shadow-rose-100/40"
        >
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-400" aria-hidden="true">♥</span>
          <h2 class="mt-4 font-display text-2xl font-bold text-rose-950">还没有情侣空间</h2>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700/55">
            创建或绑定情侣空间后，才能在这里设置公开状态、冻结或发起解绑。
          </p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <RouterLink
              to="/space/setup"
              class="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105"
            >
              创建或绑定情侣空间
            </RouterLink>
            <RouterLink
              to="/plaza"
              class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              返回恋爱广场
            </RouterLink>
          </div>
        </section>

        <div v-else class="mt-8 space-y-5">
          <!-- 空间概览：状态、成员、首次公开时间 -->
          <section
            class="rounded-[1.75rem] border p-6 shadow-sm sm:p-7"
            :class="statusCard.panelClass"
            aria-labelledby="space-settings-summary"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-[0.22em]" :class="statusCard.eyebrowClass">Current space</p>
                <h2 id="space-settings-summary" class="mt-1 break-words font-display text-2xl font-bold text-rose-950">
                  {{ spaceStatus.spaceName || '我们的故事' }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-rose-800/60">{{ statusCard.description }}</p>
              </div>
              <span
                class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold"
                :class="statusCard.badgeClass"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="statusCard.dotClass" aria-hidden="true" />
                {{ statusCard.label }}
              </span>
            </div>

            <dl class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl bg-white/70 px-4 py-3">
                <dt class="text-[11px] font-semibold text-rose-700/50">有效成员</dt>
                <dd class="mt-1 text-sm font-semibold text-rose-950">{{ memberCount }} / {{ spaceStatus.memberLimit || 2 }}</dd>
              </div>
              <div class="rounded-2xl bg-white/70 px-4 py-3">
                <dt class="text-[11px] font-semibold text-rose-700/50">恋爱广场</dt>
                <dd class="mt-1 text-sm font-semibold" :class="isPublic ? 'text-emerald-600' : 'text-rose-800/70'">
                  {{ isPublic ? '公开中' : '私密' }}
                </dd>
              </div>
              <div class="rounded-2xl bg-white/70 px-4 py-3">
                <dt class="text-[11px] font-semibold text-rose-700/50">首次公开时间</dt>
                <dd class="mt-1 text-sm font-semibold text-rose-950">{{ publicAtText }}</dd>
              </div>
            </dl>

            <p
              v-if="spaceError"
              class="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/85 px-3.5 py-2.5 text-xs leading-5 text-amber-800"
              role="status"
            >
              空间状态刷新失败：{{ spaceError }}。下面展示的是上一次确认过的状态，操作结果仍以服务器为准。
            </p>
          </section>

          <!-- 1. 恋爱广场公开设置 -->
          <section
            class="rounded-[1.75rem] border border-rose-100 bg-white/90 p-6 shadow-lg shadow-rose-100/40 sm:p-7"
            aria-labelledby="space-visibility-heading"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-400">Plaza visibility</p>
                <h2 id="space-visibility-heading" class="mt-1 font-display text-xl font-bold text-rose-950">恋爱广场公开设置</h2>
                <p id="space-visibility-desc" class="mt-2 text-xs leading-6 text-rose-700/55">
                  公开后整个空间会出现在恋爱广场；隐藏只影响空间入口，不会改动故事、照片、纪念日各自的公开设置。
                </p>
              </div>

              <div class="flex shrink-0 items-center gap-3">
                <span class="text-xs font-semibold" :class="isPublic ? 'text-emerald-600' : 'text-rose-700/60'">
                  {{ isPublic ? '已公开' : '私密' }}
                </span>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="isPublic ? 'true' : 'false'"
                  aria-labelledby="space-visibility-heading"
                  aria-describedby="space-visibility-desc space-visibility-reason"
                  class="settings-switch relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  :class="isPublic ? 'settings-switch-on border-rose-400' : 'border-rose-200 bg-rose-100/80'"
                  :disabled="visibilitySwitchDisabled"
                  :aria-busy="isBusy('visibility') ? 'true' : 'false'"
                  @click="toggleVisibility"
                >
                  <span class="sr-only">{{ isPublic ? '切换为私密' : '公开到恋爱广场' }}</span>
                  <span
                    class="settings-switch-thumb inline-block h-5 w-5 transform rounded-full bg-white shadow transition"
                    :class="isPublic ? 'translate-x-6' : 'translate-x-1'"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            <p
              id="space-visibility-reason"
              class="mt-4 rounded-xl border px-3.5 py-2.5 text-xs leading-5"
              :class="visibilityNotice.class"
              role="status"
            >
              {{ visibilityNotice.text }}
            </p>

            <p v-if="isBusy('visibility')" class="mt-2 text-xs font-medium text-rose-500" role="status">
              正在保存公开设置…
            </p>
          </section>

          <!-- 2. 恢复（仅冻结/归档） -->
          <section
            v-if="isRestorableSpace(spaceStatus)"
            class="rounded-[1.75rem] border border-sky-200/80 bg-sky-50/60 p-6 shadow-sm sm:p-7"
            aria-labelledby="space-restore-heading"
          >
            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-500">Restore</p>
            <h2 id="space-restore-heading" class="mt-1 font-display text-xl font-bold text-rose-950">恢复情侣空间</h2>
            <p class="mt-2 text-xs leading-6 text-rose-800/60">
              冻结或归档的空间需要双方确认后才能恢复。恢复后空间回到正常状态，但<strong class="font-semibold">仍保持私密</strong>，
              需要你在这里手动重新公开。
            </p>

            <p class="mt-4 text-xs font-semibold text-rose-800/70" role="status">
              已确认 {{ restoreConfirmedCount }} / {{ restoreRequiredCount }} 人
              <span v-if="spaceStatus.restoreConfirmedByMe" class="ml-1 text-emerald-600">（你已确认）</span>
            </p>
            <p class="mt-1 text-[11px] leading-5 text-rose-700/45">
              有几名有效成员就需要几人确认；对方确认后空间才会恢复。
            </p>

            <button
              type="button"
              class="mt-4 inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busyAction !== '' || spaceLoading"
              :aria-busy="isBusy('restore') ? 'true' : 'false'"
              @click="restoreSpace"
            >
              {{ isBusy('restore') ? '确认中…' : (spaceStatus.restoreConfirmedByMe ? '再次确认恢复' : '确认恢复空间') }}
            </button>
          </section>

          <!-- 3. 解绑情侣空间（双向申请） -->
          <section
            id="space-unbind"
            class="rounded-[1.75rem] border border-rose-200/90 bg-rose-50/50 p-6 shadow-sm sm:p-7"
            aria-labelledby="space-unbind-heading"
          >
            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-500">Unbind</p>
            <h2 id="space-unbind-heading" class="mt-1 font-display text-xl font-bold text-rose-950">解绑情侣空间</h2>
            <p id="space-unbind-desc" class="mt-2 text-xs leading-6 text-rose-800/60">
              解绑需双方确认：对方同意后才会生效，拒绝则空间保持不变。
            </p>

            <!-- 已有待处理申请：展示发起人、时间与可执行动作 -->
            <div
              v-if="unbindPending"
              class="mt-4 rounded-2xl border border-rose-200/80 bg-white/80 px-4 py-3.5"
              role="status"
            >
              <!-- 发起人视角：等待另一半处理，只能取消申请 -->
              <template v-if="unbindRequestedByMe">
                <p class="text-xs font-semibold text-rose-900">等待另一方确认</p>
                <p class="mt-1 text-[11px] leading-5 text-rose-700/60">
                  已提交解绑申请，申请时间：{{ unbindRequestedAtText }}。对方确认前可随时撤销。
                </p>
              </template>

              <!-- 另一方视角：展示申请人公开资料与申请时间，可同意或拒绝 -->
              <template v-else>
                <div class="flex items-start gap-3">
                  <span class="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-xs font-bold text-white">
                    {{ unbindRequesterInitial }}
                    <img
                      v-if="unbindRequester?.avatar"
                      :src="unbindRequester.avatar"
                      alt=""
                      class="absolute inset-0 h-full w-full object-cover"
                      @error="$event.currentTarget.style.display = 'none'"
                    >
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-rose-900">
                      {{ unbindRequesterName }} 发起了情侣空间解绑申请
                    </p>
                    <p class="mt-1 text-[11px] leading-5 text-rose-700/60">
                      <span v-if="unbindRequester?.amourId">恋语 ID：{{ unbindRequester.amourId }} · </span>
                      申请时间：{{ unbindRequestedAtText }}
                    </p>
                    <p class="mt-1 text-[11px] leading-5 text-rose-700/45">
                      同意后双方都会退出这个空间；拒绝则申请失效，空间保持不变。
                    </p>
                  </div>
                </div>
              </template>

              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-if="unbindCanCancel"
                  type="button"
                  class="inline-flex items-center justify-center rounded-full border border-rose-300 bg-white px-5 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="busyAction !== ''"
                  :aria-busy="isBusy('unbind-cancel') ? 'true' : 'false'"
                  @click="cancelUnbind"
                >
                  {{ isBusy('unbind-cancel') ? '撤销中…' : '撤销解绑申请' }}
                </button>
                <button
                  v-if="unbindCanConfirm"
                  type="button"
                  class="inline-flex items-center justify-center rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="busyAction !== ''"
                  :aria-busy="isBusy('unbind-confirm') ? 'true' : 'false'"
                  @click="confirmUnbind"
                >
                  {{ isBusy('unbind-confirm') ? '确认中…' : '同意解绑' }}
                </button>
                <button
                  v-if="unbindCanReject"
                  type="button"
                  class="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="busyAction !== ''"
                  :aria-busy="isBusy('unbind-reject') ? 'true' : 'false'"
                  @click="rejectUnbind"
                >
                  {{ isBusy('unbind-reject') ? '处理中…' : '拒绝申请' }}
                </button>
              </div>
            </div>

            <!-- 没有待处理申请：发起入口 -->
            <template v-else>
              <p
                v-if="unbindRejectedNotice"
                class="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/85 px-3.5 py-2.5 text-xs leading-5 text-amber-800"
                role="status"
              >
                {{ unbindRejectedNotice }}
              </p>
              <p
                v-if="!canRequestUnbindNow"
                class="mt-3 rounded-xl border border-rose-200/80 bg-white/70 px-3.5 py-2.5 text-xs leading-5 text-rose-700"
                role="status"
              >
                {{ unbindRequestBlockReason }}
              </p>
              <button
                type="button"
                class="mt-4 inline-flex items-center justify-center rounded-full border border-rose-300 bg-white px-5 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="busyAction !== '' || !canRequestUnbindNow"
                aria-describedby="space-unbind-desc"
                :aria-busy="isBusy('unbind-request') ? 'true' : 'false'"
                @click="requestUnbind"
              >
                {{ isBusy('unbind-request') ? '提交中…' : '申请解绑' }}
              </button>
            </template>
          </section>

          <p class="px-1 text-center text-[11px] leading-5 text-rose-700/40">
            隐藏、冻结不会改变成员关系，只有对方同意解绑才会让双方退出空间。
          </p>
        </div>
      </div>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import {
  cancelCoupleSpaceUnbind,
  confirmCoupleSpaceUnbind,
  confirmSpaceRestore,
  rejectCoupleSpaceUnbind,
  requestCoupleSpaceUnbind,
  updateCoupleSpaceVisibility,
} from '@/api/space'
import {
  clearSpaceStatus,
  useFrontendSpace,
} from '@/composables/useFrontendSpace'
import { formatSpaceDateTime } from '@/utils/spaceFormat'
import {
  SPACE_STATUS,
  activeSpaceMemberCount,
  canCancelUnbind,
  canConfirmUnbind,
  canPublishSpace,
  canRejectUnbind,
  canRequestUnbind,
  hasActiveSpaceMembership,
  hasPendingUnbind,
  hasSpaceIdentity,
  isRestorableSpace,
  isSpacePublic,
  isUnbindRejectedForMe,
  isUnbindRequestConflict,
  isUnbindRequester,
  isUnboundSpace,
  readSpaceErrorMessage,
  unbindRequestBlockReason as unbindRequestBlockReasonByRule,
  visibilityBlockReason,
} from '@/utils/spaceState'

const router = useRouter()
const {
  spaceStatus,
  spaceLoading,
  spaceError,
  hasCoupleSpace,
  isSpaceReady,
  refreshSpaceStatus,
  refreshSpaceStatusAfterLifecycleAction,
} = useFrontendSpace()

/**
 * 当前进行中的动作名（visibility / restore / unbind-request / unbind-cancel /
 * unbind-reject / unbind-confirm）。
 * 从打开确认框到接口返回全程保持非空：既防重复提交，也禁用其它写操作。
 */
const busyAction = ref('')

/**
 * 首次进入页面时，共享状态可能尚未确认（spaceLoading 也可能还没来得及置 true）。
 * 在第一次请求返回前统一展示骨架，避免把“加载中”误判成“没有空间”。
 */
const initializing = ref(true)
const showInitialSkeleton = computed(() => (
  !hasSpaceIdentity(spaceStatus.value) && !spaceError.value
  && (spaceLoading.value || initializing.value)
))

function isBusy(action) {
  return busyAction.value === action
}

const memberCount = computed(() => activeSpaceMemberCount(spaceStatus.value))
const isPublic = computed(() => isSpacePublic(spaceStatus.value))
const publishAllowed = computed(() => canPublishSpace(spaceStatus.value))
// 以下解绑状态全部来自服务器返回的 SpaceStatusVO，页面不手工修改任何 unbind 字段。
const unbindPending = computed(() => hasPendingUnbind(spaceStatus.value))
const unbindRequestedByMe = computed(() => isUnbindRequester(spaceStatus.value))
const unbindCanCancel = computed(() => canCancelUnbind(spaceStatus.value))
const unbindCanConfirm = computed(() => canConfirmUnbind(spaceStatus.value))
const unbindCanReject = computed(() => canRejectUnbind(spaceStatus.value))
const canRequestUnbindNow = computed(() => canRequestUnbind(spaceStatus.value))
const unbindRequestBlockReason = computed(() => unbindRequestBlockReasonByRule(spaceStatus.value))
const unbindRequester = computed(() => (
  spaceStatus.value?.unbindRequester && typeof spaceStatus.value.unbindRequester === 'object'
    ? spaceStatus.value.unbindRequester
    : null
))
const unbindRequesterName = computed(() => (
  unbindRequester.value?.displayName || unbindRequester.value?.amourId || '另一半'
))
const unbindRequesterInitial = computed(() => (
  String(unbindRequesterName.value || '恋').trim().slice(0, 1).toUpperCase()
))
const unbindRequestedAtText = computed(() => (
  spaceStatus.value?.unbindRequestedAt
    ? formatSpaceDateTime(spaceStatus.value.unbindRequestedAt)
    : '刚刚'
))
const unbindRejectedNotice = computed(() => {
  if (!isUnbindRejectedForMe(spaceStatus.value)) return ''
  const resolvedAt = spaceStatus.value?.unbindLastResolvedAt
  const timeText = resolvedAt ? `（${formatSpaceDateTime(resolvedAt)}）` : ''
  return `上次解绑申请已被对方拒绝${timeText}，你可以重新申请。`
})

/**
 * 隐藏永远允许有效成员操作；只有「从私密切到公开」才要求 status=1 且两人绑定。
 */
const visibilitySwitchDisabled = computed(() => {
  if (busyAction.value !== '') return true
  if (!hasActiveSpaceMembership(spaceStatus.value)) return true
  return !isPublic.value && !publishAllowed.value
})

const visibilityNotice = computed(() => {
  if (!hasActiveSpaceMembership(spaceStatus.value)) {
    return {
      text: '你不是该情侣空间的有效成员，无法修改公开设置。',
      class: 'border-rose-200/80 bg-rose-50/70 text-rose-700',
    }
  }
  if (isPublic.value) {
    return {
      text: '空间当前公开在恋爱广场。切换为私密后列表和详情都会立即不可见，历史公开时间会保留。',
      class: 'border-emerald-200/80 bg-emerald-50/70 text-emerald-700',
    }
  }
  const reason = visibilityBlockReason(spaceStatus.value)
  if (reason) {
    return {
      text: `${reason}，暂时不能公开。`,
      class: 'border-amber-200/80 bg-amber-50/70 text-amber-800',
    }
  }
  return {
    text: '空间当前为私密状态。公开后两名成员的内容入口都会出现在恋爱广场。',
    class: 'border-rose-200/80 bg-rose-50/70 text-rose-700',
  }
})

const publicAtText = computed(() => (
  spaceStatus.value?.publicAt ? formatSpaceDateTime(spaceStatus.value.publicAt) : '尚未公开过'
))

const statusCard = computed(() => {
  const status = Number(spaceStatus.value?.status)
  if (status === SPACE_STATUS.WAITING) {
    return {
      label: '等待绑定',
      description: '空间已创建，等待另一半接受邀请加入。',
      panelClass: 'border-amber-200/80 bg-amber-50/70',
      eyebrowClass: 'text-amber-500',
      badgeClass: 'text-amber-700',
      dotClass: 'bg-amber-400',
    }
  }
  if (status === SPACE_STATUS.FROZEN) {
    return {
      label: '已冻结',
      description: '空间当前被冻结，内容暂不加载；需要双方确认后才能恢复。',
      panelClass: 'border-sky-200/80 bg-sky-50/70',
      eyebrowClass: 'text-sky-500',
      badgeClass: 'text-sky-700',
      dotClass: 'bg-sky-400',
    }
  }
  if (status === SPACE_STATUS.ARCHIVED) {
    return {
      label: '已归档',
      description: '空间处于历史归档状态并从恋爱广场隐藏，内容全部保留；确认恢复后可继续使用。',
      panelClass: 'border-slate-200 bg-slate-50/80',
      eyebrowClass: 'text-slate-500',
      badgeClass: 'text-slate-700',
      dotClass: 'bg-slate-400',
    }
  }
  if (status === SPACE_STATUS.NORMAL) {
    return {
      label: '正常',
      description: '空间可以正常使用，你可以随时调整公开状态或管理空间生命周期。',
      panelClass: 'border-emerald-200/80 bg-emerald-50/70',
      eyebrowClass: 'text-emerald-500',
      badgeClass: 'text-emerald-700',
      dotClass: 'bg-emerald-400',
    }
  }
  // 删除等待期 / 已删除 / 未知状态：不能当作「正常」展示，也不提供公开或解绑入口。
  return {
    label: '暂不可用',
    description: '当前空间状态无法进入设置操作，请返回恋爱广场或刷新空间状态后再试。',
    panelClass: 'border-rose-200/80 bg-rose-50/70',
    eyebrowClass: 'text-rose-500',
    badgeClass: 'text-rose-700',
    dotClass: 'bg-rose-400',
  }
})

const restoreConfirmedCount = computed(() => Number(spaceStatus.value?.restoreConfirmedCount) || 0)
// 后端要求「有几名有效成员就几人确认」，SpaceStatusVO 只返回 memberCount，因此以它为准。
const restoreRequiredCount = computed(() => memberCount.value || 1)

async function reloadStatus() {
  await refreshSpaceStatus()
}

/**
 * 切换空间公开状态。
 *
 * 失败只提示后端 message，不本地改写 visibility，也不清空共享空间状态；
 * 成功后才强制刷新服务器状态。
 */
async function toggleVisibility() {
  if (busyAction.value !== '') return
  if (visibilitySwitchDisabled.value) return
  const target = isPublic.value ? 0 : 1
  busyAction.value = 'visibility'
  try {
    const { data } = await updateCoupleSpaceVisibility(target)
    if (!data?.success) {
      ElMessage.error(data?.message || '公开设置失败，请稍后重试')
      return
    }
    await refreshSpaceStatusAfterLifecycleAction()
    ElMessage.success(target === 1 ? '已公开到恋爱广场' : '已从恋爱广场隐藏')
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '公开设置失败，请稍后重试'))
  } finally {
    busyAction.value = ''
  }
}

/**
 * 确认恢复。只会提交当前用户的确认；双方都确认后空间才恢复，
 * 且恢复后保持私密，不会自动重新公开。
 */
async function restoreSpace() {
  if (busyAction.value !== '') return
  busyAction.value = 'restore'
  try {
    const { data } = await confirmSpaceRestore()
    if (!data?.success) {
      ElMessage.error(data?.message || '确认恢复失败，请稍后重试')
      return
    }
    const result = data.data || {}
    await refreshSpaceStatusAfterLifecycleAction()
    if (result.restored) {
      ElMessage.success('情侣空间已恢复，当前仍为私密状态，可按需重新公开')
    } else {
      ElMessage.success(`已确认恢复（${result.confirmedCount ?? restoreConfirmedCount.value}/${result.requiredCount ?? restoreRequiredCount.value}），等待另一半确认`)
    }
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '确认恢复失败，请稍后重试'))
  } finally {
    busyAction.value = ''
  }
}

/**
 * 刷新解绑写操作之后的空间状态。
 *
 * 申请、取消、拒绝都不清除空间状态，只强制丢弃旧的 in-flight 请求并重新读取服务器状态。
 * 网络失败时保留已有状态并提示重试，不能误判为“已解绑”。
 */
async function refreshAfterUnbindAction() {
  await refreshSpaceStatusAfterLifecycleAction({ force: true })
  return spaceError.value === ''
}

/**
 * 发起解绑申请。
 *
 * 这不是立即解绑：只创建申请，成员关系、空间 status 与 visibility 都不变，
 * 必须另一半同意才会真正解绑。提交锁从打开确认框之前开始，直到接口返回（或取消）才释放。
 */
async function requestUnbind() {
  if (busyAction.value !== '' || !canRequestUnbindNow.value) return
  busyAction.value = 'unbind-request'
  try {
    try {
      await ElMessageBox.confirm(
        '申请后需对方同意才会解绑，拒绝则空间保持不变。确定申请解绑吗？',
        '申请解绑',
        {
          confirmButtonText: '申请解绑',
          cancelButtonText: '取消',
          type: 'warning',
          distinguishCancelAndClose: true,
        },
      )
    } catch {
      // 取消或关闭确认框：不做任何写操作，也不修改本地状态。
      return
    }

    const { data } = await requestCoupleSpaceUnbind()
    // 双方几乎同时申请时，后提交的一方不能当成“申请成功”，需提示并刷新为待处理状态。
    if (isUnbindRequestConflict(data)) {
      if (await refreshAfterUnbindAction()) {
        ElMessage.warning('对方已发起解绑申请，已为你刷新待处理状态，请直接确认或拒绝')
      } else {
        ElMessage.warning('对方已发起解绑申请，但空间状态刷新失败，请重新读取状态')
      }
      return
    }
    if (!data?.success) {
      ElMessage.error(data?.message || '申请解绑失败，请稍后重试')
      return
    }
    if (await refreshAfterUnbindAction()) {
      ElMessage.success('解绑申请已提交，等待另一方确认')
    } else {
      ElMessage.warning('解绑申请已提交，但空间状态刷新失败，请重新读取状态')
    }
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '申请解绑失败，请稍后重试'))
  } finally {
    busyAction.value = ''
  }
}

/**
 * 撤销自己发起的解绑申请。撤销后成员关系与空间状态仍保持不变。
 */
async function cancelUnbind() {
  if (busyAction.value !== '' || !unbindCanCancel.value) return
  busyAction.value = 'unbind-cancel'
  try {
    try {
      await ElMessageBox.confirm(
        '撤销后申请失效，空间继续正常使用，对方不会收到撤销通知。确定撤销吗？',
        '撤销解绑申请',
        {
          confirmButtonText: '撤销申请',
          cancelButtonText: '保留申请',
          type: 'warning',
          distinguishCancelAndClose: true,
        },
      )
    } catch {
      return
    }

    const { data } = await cancelCoupleSpaceUnbind()
    if (!data?.success) {
      ElMessage.error(data?.message || '撤销解绑申请失败，请稍后重试')
      return
    }
    if (await refreshAfterUnbindAction()) {
      ElMessage.success('已撤销解绑申请')
    } else {
      ElMessage.warning('解绑申请已撤销，但空间状态刷新失败，请重新读取状态')
    }
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '撤销解绑申请失败，请稍后重试'))
  } finally {
    busyAction.value = ''
  }
}

/**
 * 拒绝另一半发起的解绑申请。拒绝后申请失效，空间保持原状并继续正常使用。
 */
async function rejectUnbind() {
  if (busyAction.value !== '' || !unbindCanReject.value) return
  busyAction.value = 'unbind-reject'
  try {
    try {
      await ElMessageBox.confirm(
        '拒绝后申请失效，空间保持不变。确定拒绝吗？',
        '拒绝解绑申请',
        {
          confirmButtonText: '拒绝申请',
          cancelButtonText: '再看一下',
          type: 'warning',
          distinguishCancelAndClose: true,
        },
      )
    } catch {
      return
    }

    const { data } = await rejectCoupleSpaceUnbind()
    if (!data?.success) {
      ElMessage.error(data?.message || '拒绝解绑申请失败，请稍后重试')
      return
    }
    if (await refreshAfterUnbindAction()) {
      ElMessage.success('已拒绝解绑申请，空间保持不变')
    } else {
      ElMessage.warning('解绑申请已拒绝，但空间状态刷新失败，请重新读取状态')
    }
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '拒绝解绑申请失败，请稍后重试'))
  } finally {
    busyAction.value = ''
  }
}

/**
 * 同意解绑（仅另一方有效成员可操作）。
 *
 * 二次确认后调用 /space/unbind/confirm；成功后必须先强制刷新 /space/status，
 * 只有刷新成功才清理共享状态并回到恋爱广场。页面不会在本地伪造 spaceStatus。
 */
async function confirmUnbind() {
  if (busyAction.value !== '' || !unbindCanConfirm.value) return
  busyAction.value = 'unbind-confirm'
  try {
    try {
      await ElMessageBox.confirm(
        '同意后双方将退出空间，内容保留但不再对外开放，且无法在页面撤销。确定同意解绑吗？',
        '同意解绑',
        {
          confirmButtonText: '同意解绑',
          cancelButtonText: '取消',
          type: 'warning',
          distinguishCancelAndClose: true,
        },
      )
    } catch {
      // 取消确认：保持当前页面与本地状态不变。
      return
    }

    const { data } = await confirmCoupleSpaceUnbind()
    if (!data?.success) {
      ElMessage.error(data?.message || '确认解绑失败，请稍后重试')
      return
    }

    // 关键：先以服务器返回的 /space/status 为准；刷新失败时保持旧状态，绝不误判为已解绑。
    if (!(await refreshAfterUnbindAction())) {
      ElMessage.warning('解绑已确认，但空间状态刷新失败，请重新读取状态后再离开页面')
      return
    }

    clearSpaceStatus()
    ElMessage.success('情侣空间已解除绑定，你们现在都可以重新创建或加入情侣空间')
    await router.push('/plaza')
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '确认解绑失败，请稍后重试'))
  } finally {
    busyAction.value = ''
  }
}

onMounted(async () => {
  // 路由守卫已保证登录；这里只负责拿到最新空间状态。
  try {
    await refreshSpaceStatus()
  } finally {
    initializing.value = false
  }
  // 从情侣空间首页的解绑提醒跳转过来时，直接定位到解绑操作区。
  if (router.currentRoute.value?.hash === '#space-unbind') {
    await nextTick()
    document.getElementById('space-unbind')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})
</script>

<style scoped>
.settings-switch-on {
  background: linear-gradient(90deg, #fb7185, #ec4899);
}

.settings-switch-thumb {
  transition-property: transform;
  transition-duration: 0.2s;
  transition-timing-function: ease;
}

@media (prefers-reduced-motion: reduce) {
  .settings-switch-thumb {
    transition: none;
  }
}
</style>
