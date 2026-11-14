<template>
  <div class="space-y-6">
          <!-- 空间概览：状态、成员、公开信息以一条事实带呈现 -->
          <section
            id="space-overview"
            class="panel scroll-mt-24"
            aria-labelledby="space-settings-summary"
          >
            <div class="px-5 py-5 sm:px-6">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="section-kicker">当前空间</p>
                  <h2 id="space-settings-summary" class="mt-1 break-words font-display text-xl font-bold text-stone-900 sm:text-2xl">
                    {{ spaceStatus.spaceName || '我们的故事' }}
                  </h2>
                  <p class="mt-1 max-w-2xl text-xs leading-6 text-stone-500">{{ statusCard.description }}</p>
                </div>
                <div class="flex shrink-0 flex-wrap items-center gap-2">
                  <span
                    class="status-pill"
                    :class="statusCard.badgeClass"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="statusCard.dotClass" aria-hidden="true" />
                    {{ statusCard.label }}
                  </span>
                  <button
                    type="button"
                    class="btn-secondary !py-1.5"
                    :disabled="spaceLoading"
                    @click="refreshStatus"
                  >
                    {{ spaceLoading ? '刷新中…' : '刷新状态' }}
                  </button>
                </div>
              </div>

              <dl class="mt-5 grid gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
                <div class="bg-white px-4 py-3">
                  <dt class="text-[11px] font-semibold text-stone-400">成员</dt>
                  <dd class="mt-2 flex items-center gap-2">
                    <span v-if="members.length" class="flex -space-x-1.5" aria-hidden="true">
                      <span
                        v-for="member in members.slice(0, 2)"
                        :key="member.amourId || member.displayName"
                        class="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white bg-rose-100 text-[9px] font-bold text-rose-700"
                      >
                        {{ memberInitial(member) }}
                        <img
                          v-if="member.avatar"
                          :src="member.avatar"
                          alt=""
                          class="absolute inset-0 h-full w-full object-cover"
                          @error="$event.currentTarget.style.display = 'none'"
                        >
                      </span>
                    </span>
                    <span class="text-sm font-semibold text-stone-900">{{ memberCount }} / {{ spaceStatus.memberLimit || 2 }}</span>
                  </dd>
                </div>
                <div class="bg-white px-4 py-3">
                  <dt class="text-[11px] font-semibold text-stone-400">恋爱广场</dt>
                  <dd class="mt-2 text-sm font-semibold" :class="isPublic ? 'text-emerald-700' : 'text-stone-700'">
                    {{ isPublic ? '公开中' : '私密' }}
                  </dd>
                </div>
                <div class="bg-white px-4 py-3">
                  <dt class="text-[11px] font-semibold text-stone-400">首次公开时间</dt>
                  <dd class="mt-2 text-sm font-semibold text-stone-900">{{ publicAtText }}</dd>
                </div>
                <div class="bg-white px-4 py-3">
                  <dt class="text-[11px] font-semibold text-stone-400">
                    {{ isSpaceWaiting ? '待接受邀请' : '创建时间' }}
                  </dt>
                  <dd class="mt-2 text-sm font-semibold text-stone-900">
                    {{ isSpaceWaiting ? (Number(spaceStatus.pendingInvitationCount) || 0) + ' 条' : createdAtText }}
                  </dd>
                </div>
              </dl>

              <p
                v-if="spaceError"
                class="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/85 px-3.5 py-2.5 text-xs leading-5 text-amber-800"
                role="status"
              >
                空间状态刷新失败：{{ spaceError }}。下面展示的是上一次确认过的状态，操作结果仍以服务器为准。
              </p>
            </div>
          </section>

          <div
            class="grid gap-6 lg:items-start"
            :class="hasLifecycle
              ? 'lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]'
              : 'lg:grid-cols-1'"
          >
            <div class="min-w-0 space-y-6">

          <!-- 父页面按需插入内容：等待绑定阶段会在这里放置邀请区 -->
          <slot name="after-overview" />

          <!-- 编辑空间信息（仅等待另一半加入时可用） -->
          <!-- 空间设置：公开状态与基础信息收进同一组设置行 -->
          <section class="panel" aria-labelledby="space-settings-heading">
            <header class="panel-header">
              <div class="min-w-0">
                <h2 id="space-settings-heading" class="section-title">公开与空间信息</h2>
              </div>
            </header>

            <div class="px-5 sm:px-6">
              <div v-if="canOpenStudio" class="settings-row border-b border-stone-100">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-stone-900">布置空间内容</h3>
                  <p class="mt-1 text-xs leading-6 text-stone-500">
                    编辑首页、故事、留言、相册和纪念日；未公开的内容不会出现在恋爱广场。
                  </p>
                </div>
                <RouterLink to="/space/studio" class="btn-primary shrink-0">
                  进入空间编辑
                </RouterLink>
              </div>

              <div v-if="canEditSpaceInfo" id="space-edit" class="scroll-mt-24 border-b border-stone-100 py-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h3 id="space-edit-heading" class="text-sm font-semibold text-stone-900">编辑空间信息</h3>
                    <p class="mt-1 text-xs leading-6 text-stone-500">
                      另一半加入后，空间名称、简介和恋爱开始时间将不能再修改。
                    </p>
                  </div>
                </div>

                <form class="mt-4" @submit.prevent="saveSpaceInfo">
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label for="space-edit-name" class="field-label">空间名称</label>
                      <input
                        id="space-edit-name"
                        v-model="editForm.spaceName"
                        maxlength="30"
                        class="field-input"
                        placeholder="例如：我们的故事"
                        autocomplete="off"
                        @input="editSpaceError = ''"
                      >
                    </div>
                    <div>
                      <label for="space-edit-love-start" class="field-label">恋爱开始时间</label>
                      <ThemeDatePicker
                        v-model="editForm.loveStartTime"
                        input-id="space-edit-love-start"
                        placeholder="选择恋爱开始时间"
                        @update:model-value="editSpaceError = ''"
                      />
                      <p class="field-hint">选填；修改后会更新首页展示的相伴时间。</p>
                    </div>
                    <div class="sm:col-span-2">
                      <label for="space-edit-description" class="field-label">空间简介</label>
                      <textarea
                        id="space-edit-description"
                        v-model="editForm.description"
                        rows="3"
                        maxlength="500"
                        class="field-input resize-y leading-6"
                        placeholder="写一句只属于你们的介绍（选填）"
                        @input="editSpaceError = ''"
                      />
                    </div>
                  </div>

                  <p v-if="editSpaceError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
                    {{ editSpaceError }}
                  </p>

                  <div class="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      class="btn-primary"
                      :disabled="busyAction !== ''"
                      :aria-busy="isBusy('space-edit') ? 'true' : 'false'"
                    >
                      {{ isBusy('space-edit') ? '保存中…' : '保存修改' }}
                    </button>
                    <button
                      type="button"
                      class="btn-secondary"
                      :disabled="busyAction !== ''"
                      @click="resetEditForm"
                    >
                      重置
                    </button>
                  </div>
                </form>
              </div>

              <div class="settings-row">
                <div class="min-w-0">
                  <h3 id="space-visibility-heading" class="text-sm font-semibold text-stone-900">恋爱广场公开</h3>
                  <p id="space-visibility-desc" class="mt-1 text-xs leading-6 text-stone-500">
                    首次公开需要管理员审核。公开后，空间名称、简介、头像、封面、主页配置以及公开的故事、照片和纪念日修改也会进入审核；审核期间恋爱广场继续展示上一次通过的版本。
                  </p>
                  <p v-if="visibilityNotice" id="space-visibility-reason" class="mt-2 flex items-start gap-1.5 text-xs leading-5" :class="visibilityNotice.textClass" role="status">
                    <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" :class="visibilityNotice.dotClass" aria-hidden="true" />
                    <span>{{ visibilityNotice.text }}</span>
                  </p>
                  <p v-if="isBusy('visibility')" class="mt-2 text-xs font-medium text-stone-500" role="status">
                    正在保存公开设置…
                  </p>
                </div>

                <div class="flex shrink-0 items-center gap-3">
                  <span class="inline-flex items-center gap-1.5 text-xs font-semibold" :class="isPublic ? 'text-emerald-700' : 'text-stone-500'">
                    <span class="h-1.5 w-1.5 rounded-full" :class="isPublic ? 'bg-emerald-500' : 'bg-stone-300'" aria-hidden="true" />
                    {{ isPublic ? '已公开' : '私密' }}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="isPublic ? 'true' : 'false'"
                    aria-labelledby="space-visibility-heading"
                    :aria-describedby="visibilityDescribedBy"
                    class="settings-switch relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    :class="isPublic ? 'settings-switch-on border-rose-500' : 'border-stone-300 bg-stone-200'"
                    :disabled="visibilitySwitchDisabled"
                    :aria-busy="isBusy('visibility') ? 'true' : 'false'"
                    @click="toggleVisibility"
                  >
                    <span class="sr-only">{{ isPublic ? '切换为私密' : '公开到恋爱广场' }}</span>
                    <span
                      class="settings-switch-thumb inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition"
                      :class="isPublic ? 'translate-x-6' : 'translate-x-1'"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <div class="border-t border-stone-100 py-4">
                <SpaceReviewStatusCard :refresh-key="reviewRefreshKey" @submitted="onReviewSubmitted" />
              </div>
            </div>
          </section>
          </div>

          <aside v-if="hasLifecycle" class="space-y-6 lg:sticky lg:top-24">
            <section
              v-if="isRestorableSpace(spaceStatus) || showUnbindSection"
              class="overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50/70"
            >
              <div v-if="isRestorableSpace(spaceStatus)" class="px-5 py-5" aria-labelledby="space-restore-heading">
                <h3 id="space-restore-heading" class="text-sm font-semibold text-stone-900">恢复空间</h3>
                <p class="mt-1 text-xs leading-5 text-stone-500">
                  所有成员确认后才会恢复，恢复后仍为私密状态。
                </p>
                <p class="mt-3 text-xs font-semibold text-stone-700" role="status">
                  已确认 {{ restoreConfirmedCount }} / {{ restoreRequiredCount }} 人
                  <span v-if="spaceStatus.restoreConfirmedByMe" class="ml-1 text-emerald-700">（你已确认）</span>
                </p>

                <button
                  type="button"
                  class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="busyAction !== ''"
                  :aria-busy="isBusy('restore') ? 'true' : 'false'"
                  @click="restoreSpace"
                >
                  {{ isBusy('restore') ? '确认中…' : (spaceStatus.restoreConfirmedByMe ? '再次确认恢复' : '确认恢复空间') }}
                </button>
              </div>

              <div
                v-if="showUnbindSection"
                id="space-unbind"
                class="scroll-mt-24 px-5 py-5"
                :class="isRestorableSpace(spaceStatus) ? 'border-t border-stone-200/70' : ''"
                aria-labelledby="space-unbind-heading"
              >
                <h3 id="space-unbind-heading" class="text-sm font-semibold text-stone-900">解绑情侣空间</h3>
                <p v-if="!unbindPending" id="space-unbind-desc" class="mt-1 text-xs leading-5 text-stone-500">
                  申请后需要另一半同意才会解绑，拒绝则空间保持不变。
                </p>

                <!-- 已有待处理申请：展示发起人、时间与可执行动作 -->
                <div
                  v-if="unbindPending"
                  class="mt-3 rounded-lg border border-rose-200/80 bg-white px-3.5 py-3"
                  role="status"
                >
                  <!-- 发起人视角：等待另一半处理，只能取消申请 -->
                  <template v-if="unbindRequestedByMe">
                    <p class="text-xs font-semibold text-stone-900">申请已提交，等待另一半确认</p>
                    <p class="mt-1 text-[11px] leading-5 text-stone-500">
                      申请时间：{{ unbindRequestedAtText }}。确认前你可以随时撤销。
                    </p>
                  </template>

                  <!-- 另一方视角：展示申请人公开资料与申请时间，可同意或拒绝 -->
                  <template v-else>
                    <div class="flex items-start gap-3">
                      <span class="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-600 text-xs font-bold text-white">
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
                        <p class="text-xs font-semibold text-stone-900">
                          {{ unbindRequesterName }} 想解绑情侣空间
                        </p>
                        <p class="mt-1 text-[11px] leading-5 text-stone-500">
                          <span v-if="unbindRequester?.amourId">恋语 ID：{{ unbindRequester.amourId }} · </span>
                          申请时间：{{ unbindRequestedAtText }}
                        </p>
                        <p class="mt-1 text-[11px] leading-5 text-stone-400">
                          同意后双方都会退出空间；拒绝则空间保持不变。
                        </p>
                      </div>
                    </div>
                  </template>

                  <div class="mt-3 flex flex-col gap-2">
                    <button
                      v-if="unbindCanConfirm"
                      type="button"
                      class="btn-primary w-full"
                      :disabled="busyAction !== ''"
                      :aria-busy="isBusy('unbind-confirm') ? 'true' : 'false'"
                      @click="confirmUnbind"
                    >
                      {{ isBusy('unbind-confirm') ? '确认中…' : '同意解绑' }}
                    </button>
                    <button
                      v-if="unbindCanReject"
                      type="button"
                      class="btn-secondary w-full"
                      :disabled="busyAction !== ''"
                      :aria-busy="isBusy('unbind-reject') ? 'true' : 'false'"
                      @click="rejectUnbind"
                    >
                      {{ isBusy('unbind-reject') ? '处理中…' : '拒绝申请' }}
                    </button>
                    <button
                      v-if="unbindCanCancel"
                      type="button"
                      class="btn-danger w-full"
                      :disabled="busyAction !== ''"
                      :aria-busy="isBusy('unbind-cancel') ? 'true' : 'false'"
                      @click="cancelUnbind"
                    >
                      {{ isBusy('unbind-cancel') ? '撤销中…' : '撤销解绑申请' }}
                    </button>
                  </div>
                </div>

                <!-- 没有待处理申请：发起入口 -->
                <template v-else>
                  <p
                    v-if="unbindRejectedNotice"
                    class="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/85 px-3 py-2 text-[11px] leading-5 text-amber-800"
                    role="status"
                  >
                    {{ unbindRejectedNotice }}
                  </p>
                  <p
                    v-if="!canRequestUnbindNow"
                    class="mt-3 rounded-lg border border-stone-200 bg-white/70 px-3 py-2 text-[11px] leading-5 text-stone-600"
                    role="status"
                  >
                    {{ unbindRequestBlockReason }}
                  </p>
                  <button
                    type="button"
                    class="btn-danger mt-3 w-full"
                    :disabled="busyAction !== '' || !canRequestUnbindNow"
                    aria-describedby="space-unbind-desc"
                    :aria-busy="isBusy('unbind-request') ? 'true' : 'false'"
                    @click="requestUnbind"
                  >
                    {{ isBusy('unbind-request') ? '提交中…' : '申请解绑' }}
                  </button>
                </template>
              </div>
            </section>
          </aside>
        </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import {
  cancelCoupleSpaceUnbind,
  confirmCoupleSpaceUnbind,
  confirmSpaceRestore,
  rejectCoupleSpaceUnbind,
  requestCoupleSpaceUnbind,
  updateCoupleSpace,
  updateCoupleSpaceVisibility,
} from '@/api/space'
import ThemeDatePicker from '@/components/frontend/space-studio/ThemeDatePicker.vue'
import SpaceReviewStatusCard from '@/components/frontend/space-studio/SpaceReviewStatusCard.vue'
import {
  clearSpaceStatus,
  useFrontendSpace,
} from '@/composables/useFrontendSpace'
import { formatSpaceDateTime, parseSpaceDateTime } from '@/utils/spaceFormat'
import {
  SPACE_STATUS,
  activeSpaceMemberCount,
  canCancelUnbind,
  canConfirmUnbind,
  canEditSpaceContent,
  canPublishSpace,
  canRejectUnbind,
  canRequestUnbind,
  canShowUnbindSection,
  hasActiveSpaceMembership,
  hasPendingUnbind,
  isRestorableSpace,
  isSpacePublic,
  isUnbindRejectedForMe,
  isUnbindRequestConflict,
  isUnbindRequester,
  readSpaceErrorMessage,
  unbindRequestBlockReason as unbindRequestBlockReasonByRule,
  visibilityBlockReason,
} from '@/utils/spaceState'

const router = useRouter()
const {
  spaceStatus,
  spaceLoading,
  spaceError,
  isSpaceWaiting,
  refreshSpaceStatus,
  refreshSpaceStatusAfterLifecycleAction,
} = useFrontendSpace()

/**
 * 当前进行中的动作名（visibility / space-edit / restore / unbind-request /
 * unbind-cancel / unbind-reject / unbind-confirm）。
 * 从打开确认框到接口返回全程保持非空：既防重复提交，也禁用其它写操作。
 */
const busyAction = ref('')
/** 公开审核状态卡片的刷新标记：写操作成功后递增。 */
const reviewRefreshKey = ref(0)

function isBusy(action) {
  return busyAction.value === action
}

/** 手动刷新空间状态：等待另一半加入时也能及时看到状态变化。 */
async function refreshStatus() {
  if (spaceLoading.value) return
  await refreshSpaceStatus()
}

/** 重新提交公开审核后同步刷新空间状态与审核卡片。 */
function onReviewSubmitted() {
  reviewRefreshKey.value += 1
  refreshSpaceStatus()
}

const memberCount = computed(() => activeSpaceMemberCount(spaceStatus.value))
const members = computed(() => (
  Array.isArray(spaceStatus.value?.members) ? spaceStatus.value.members : []
))

function memberInitial(member) {
  return String(member?.displayName || member?.amourId || '恋').trim().slice(0, 1).toUpperCase()
}
// 刚创建、另一半还没加入的单人空间不展示解绑入口。
const showUnbindSection = computed(() => canShowUnbindSection(spaceStatus.value))
const hasLifecycle = computed(() => (
  isRestorableSpace(spaceStatus.value) || showUnbindSection.value
))
const canEditSpaceInfo = computed(() => (
  isSpaceWaiting.value
  && hasActiveSpaceMembership(spaceStatus.value)
  && memberCount.value < 2
))
// 等待绑定与正常状态都可以进入内容编辑；冻结/归档/已解绑不展示入口。
const canOpenStudio = computed(() => canEditSpaceContent(spaceStatus.value))
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

/* -------------------- 等待另一半加入时编辑空间信息 -------------------- */

const editForm = reactive({ spaceName: '', description: '', loveStartTime: '' })
const editSpaceError = ref('')

/** 后端 LocalDateTime -> datetime-local 输入框需要的 yyyy-MM-ddTHH:mm。 */
function toDateTimeLocalValue(value) {
  const date = parseSpaceDateTime(value)
  if (!date) return ''
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** datetime-local 的值转成后端约定的 yyyy-MM-dd HH:mm:ss；空值表示不设置。 */
function toBackendDateTimeValue(value) {
  const text = String(value || '').trim()
  if (!text) return null
  const normalized = text.replace('T', ' ')
  return normalized.length === 16 ? `${normalized}:00` : normalized
}

function syncEditForm() {
  const status = spaceStatus.value
  editForm.spaceName = status?.spaceName || ''
  editForm.description = status?.description || ''
  editForm.loveStartTime = toDateTimeLocalValue(status?.loveStartTime)
  editSpaceError.value = ''
}

watch(
  () => spaceStatus.value?.spaceId,
  () => syncEditForm(),
  { immediate: true },
)

function resetEditForm() {
  syncEditForm()
}

async function saveSpaceInfo() {
  if (busyAction.value !== '' || !canEditSpaceInfo.value) return
  busyAction.value = 'space-edit'
  editSpaceError.value = ''
  try {
    const { data } = await updateCoupleSpace({
      spaceName: editForm.spaceName.trim(),
      description: editForm.description.trim(),
      loveStartTime: toBackendDateTimeValue(editForm.loveStartTime),
    })
    if (!data?.success) {
      editSpaceError.value = data?.message || '保存失败，请稍后重试'
      return
    }

    await refreshSpaceStatusAfterLifecycleAction()
    if (spaceError.value === '') {
      syncEditForm()
      ElMessage.success('空间信息已更新')
    } else {
      ElMessage.warning('空间信息已保存，但状态刷新失败，请重新读取状态')
    }
  } catch (error) {
    editSpaceError.value = readSpaceErrorMessage(error, '保存失败，请稍后重试')
  } finally {
    busyAction.value = ''
  }
}

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
      text: '你不是这个空间的成员，无法修改公开设置。',
      textClass: 'text-rose-700',
      dotClass: 'bg-rose-500',
    }
  }
  if (isPublic.value) {
    return {
      text: '关闭公开后，空间会立即从恋爱广场隐藏；首次公开时间会保留。重新公开需要再次审核。',
      textClass: 'text-emerald-700',
      dotClass: 'bg-emerald-500',
    }
  }
  const reason = visibilityBlockReason(spaceStatus.value)
  if (reason) {
    return {
      text: `${reason}。`,
      textClass: 'text-amber-800',
      dotClass: 'bg-amber-500',
    }
  }
  return null
})

const visibilityDescribedBy = computed(() => (
  visibilityNotice.value
    ? 'space-visibility-desc space-visibility-reason'
    : 'space-visibility-desc'
))

const publicAtText = computed(() => (
  spaceStatus.value?.publicAt ? formatSpaceDateTime(spaceStatus.value.publicAt) : '尚未公开过'
))

const createdAtText = computed(() => (
  spaceStatus.value?.createTime ? formatSpaceDateTime(spaceStatus.value.createTime) : '暂无记录'
))

const statusCard = computed(() => {
  const status = Number(spaceStatus.value?.status)
  if (status === SPACE_STATUS.WAITING) {
    return {
      label: '等待绑定',
      description: '等待另一半接受邀请后即可正常使用。',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
      dotClass: 'bg-amber-500',
    }
  }
  if (status === SPACE_STATUS.FROZEN) {
    return {
      label: '已冻结',
      description: '空间已冻结，内容暂不加载；恢复后可继续使用。',
      badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
      dotClass: 'bg-sky-500',
    }
  }
  if (status === SPACE_STATUS.ARCHIVED) {
    return {
      label: '已归档',
      description: '空间已归档，并从恋爱广场隐藏；恢复后可继续使用。',
      badgeClass: 'border-stone-200 bg-stone-100 text-stone-600',
      dotClass: 'bg-stone-400',
    }
  }
  if (status === SPACE_STATUS.NORMAL) {
    return {
      label: '正常',
      description: '空间可以正常使用，可调整公开状态或申请解绑。',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dotClass: 'bg-emerald-500',
    }
  }
  // 删除等待期 / 已删除 / 未知状态：不能当作「正常」展示，也不提供公开或解绑入口。
  return {
    label: '暂不可用',
    description: '当前空间状态无法进入设置操作，请返回恋爱广场或刷新空间状态后再试。',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
    dotClass: 'bg-rose-500',
  }
})

const restoreConfirmedCount = computed(() => Number(spaceStatus.value?.restoreConfirmedCount) || 0)
// 后端要求「有几名有效成员就几人确认」，SpaceStatusVO 只返回 memberCount，因此以它为准。
const restoreRequiredCount = computed(() => memberCount.value || 1)

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
    reviewRefreshKey.value += 1
    ElMessage.success(target === 1
      ? '已提交公开审核，审核通过后会出现在恋爱广场'
      : '已从恋爱广场隐藏')
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
  // 从情侣空间首页的解绑提醒跳转过来时，直接定位到解绑操作区。
  if (router.currentRoute.value?.hash === '#space-unbind') {
    await nextTick()
    document.getElementById('space-unbind')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})
</script>

<style scoped>
.settings-switch-on {
  background-color: #e11d48;
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
