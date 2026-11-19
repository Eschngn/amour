<template>
  <!--
    危险操作区：日常设置之后的独立区域，不再与日常设置同列、也不吸顶/悬浮。

    展示条件的组织方式（历史缺陷防回退）：
    每个入口只看自己的规则（isRestorableSpace / showUnbindSection / showDestroySection），
    由 hasLifecycle 只决定整个区域是否出现，**不能**让「恢复」「解绑」去充当「销毁」的父级开关。
    创建者 + 另一半尚未加入时只有销毁入口成立，此时整块区域仍必须渲染。
  -->
  <section
    v-if="hasLifecycle"
    id="space-danger-zone"
    class="scroll-mt-24"
    aria-labelledby="space-danger-zone-heading"
  >
    <div class="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-5 sm:p-6">
      <header class="mb-4 border-b border-stone-200/70 pb-3">
        <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">危险操作</p>
        <h2 id="space-danger-zone-heading" class="mt-1 font-display text-lg font-bold text-stone-900">
          空间生命周期
        </h2>
        <p class="mt-1 max-w-2xl text-xs leading-6 text-stone-500">
          恢复、解绑与销毁都会改变空间状态，请确认后再操作。这里只做入口聚合，实际规则仍由服务端校验。
        </p>
      </header>

      <div class="space-y-3">
        <!-- 恢复：独立的视觉层级，轻量、非危险色，不与销毁混在一起 -->
        <div
          v-if="isRestorableSpace(spaceStatus)"
          id="space-restore"
          class="rounded-xl border border-stone-200 bg-white px-4 py-4"
          aria-labelledby="space-restore-heading"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div class="min-w-0">
              <h3 id="space-restore-heading" class="text-sm font-semibold text-stone-900">恢复空间</h3>
              <p class="mt-1 text-xs leading-5 text-stone-500">
                所有成员确认后才会恢复，恢复后仍为私密状态，不会自动重新公开。
              </p>
              <p class="mt-2 text-xs font-semibold text-stone-700" role="status">
                已确认 {{ restoreConfirmedCount }} / {{ restoreRequiredCount }} 人
                <span v-if="spaceStatus.restoreConfirmedByMe" class="ml-1 text-emerald-700">（你已确认）</span>
              </p>
            </div>
            <button
              type="button"
              class="btn-secondary shrink-0"
              :disabled="busy"
              :aria-busy="isBusy('restore') ? 'true' : 'false'"
              @click="restoreSpace"
            >
              {{ isBusy('restore') ? '确认中…' : (spaceStatus.restoreConfirmedByMe ? '再次确认恢复' : '确认恢复空间') }}
            </button>
          </div>
        </div>

        <!-- 解绑：两名有效成员时才有意义 -->
        <div
          v-if="showUnbindSection"
          id="space-unbind"
          class="rounded-xl border border-stone-200 bg-white px-4 py-4 scroll-mt-24"
          aria-labelledby="space-unbind-heading"
        >
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
          >
            <div class="min-w-0">
              <h3 id="space-unbind-heading" class="text-sm font-semibold text-stone-900">解绑情侣空间</h3>
              <p v-if="!unbindPending" id="space-unbind-desc" class="mt-1 text-xs leading-5 text-stone-500">
                申请后需要另一半同意才会解绑，拒绝则空间保持不变。
              </p>

              <!-- 已有待处理申请 -->
              <div
                v-if="unbindPending"
                class="mt-3 rounded-lg border border-stone-200 bg-stone-50/70 px-3.5 py-3"
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
              </div>

              <p
                v-if="!unbindPending && unbindRejectedNotice"
                class="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/85 px-3 py-2 text-[11px] leading-5 text-amber-800"
                role="status"
              >
                {{ unbindRejectedNotice }}
              </p>
              <p
                v-if="!unbindPending && !canRequestUnbindNow"
                class="mt-3 rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-2 text-[11px] leading-5 text-stone-600"
                role="status"
              >
                {{ unbindRequestBlockReason }}
              </p>
            </div>

            <!-- 无待处理申请：发起入口 -->
            <button
              v-if="!unbindPending"
              type="button"
              class="btn-danger w-full shrink-0 sm:w-auto"
              :disabled="busy || !canRequestUnbindNow"
              aria-describedby="space-unbind-desc"
              :aria-busy="isBusy('unbind-request') ? 'true' : 'false'"
              @click="requestUnbind"
            >
              {{ isBusy('unbind-request') ? '提交中…' : '申请解绑' }}
            </button>
          </div>

          <!-- 有待处理申请：按身份给出可执行动作 -->
          <div v-if="unbindPending" class="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              v-if="unbindCanConfirm"
              type="button"
              class="btn-primary w-full sm:w-auto"
              :disabled="busy"
              :aria-busy="isBusy('unbind-confirm') ? 'true' : 'false'"
              @click="confirmUnbind"
            >
              {{ isBusy('unbind-confirm') ? '确认中…' : '同意解绑' }}
            </button>
            <button
              v-if="unbindCanReject"
              type="button"
              class="btn-secondary w-full sm:w-auto"
              :disabled="busy"
              :aria-busy="isBusy('unbind-reject') ? 'true' : 'false'"
              @click="rejectUnbind"
            >
              {{ isBusy('unbind-reject') ? '处理中…' : '拒绝申请' }}
            </button>
            <button
              v-if="unbindCanCancel"
              type="button"
              class="btn-danger w-full sm:w-auto"
              :disabled="busy"
              :aria-busy="isBusy('unbind-cancel') ? 'true' : 'false'"
              @click="cancelUnbind"
            >
              {{ isBusy('unbind-cancel') ? '撤销中…' : '撤销解绑申请' }}
            </button>
          </div>
        </div>

        <!--
          销毁：只在「当前用户是创建者 + 另一半尚未加入」时展示。
          前端隐藏只用于体验；服务端会再次校验创建者身份与成员关系，另一半已加入时拒绝。
          视觉上用克制的浅色边框与浅底，按钮用危险色但不大面积铺红。
        -->
        <div
          v-if="showDestroySection"
          id="space-destroy"
          class="rounded-xl border border-rose-200/80 bg-rose-50/40 px-4 py-4 scroll-mt-24"
          aria-labelledby="space-destroy-heading"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div class="min-w-0">
              <h3 id="space-destroy-heading" class="text-sm font-semibold text-stone-900">销毁并清空空间</h3>
              <p id="space-destroy-desc" class="mt-1 text-xs leading-5 text-stone-600">
                销毁后空间及内容不可见，数据留档；用户无法自行恢复，可联系平台管理员协助恢复。
              </p>
              <p
                v-if="!canDestroyNow"
                class="mt-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[11px] leading-5 text-stone-600"
                role="status"
              >
                {{ destroyBlockReasonText }}
              </p>
            </div>
            <button
              type="button"
              class="btn-danger shrink-0 !border-rose-300 !text-rose-700 hover:!bg-rose-100"
              :disabled="busy || !canDestroyNow"
              aria-describedby="space-destroy-desc"
              :aria-busy="isBusy('destroy') ? 'true' : 'false'"
              @click="destroySpace"
            >
              {{ isBusy('destroy') ? '销毁中…' : '销毁并清空空间' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import {
  cancelCoupleSpaceUnbind,
  confirmCoupleSpaceUnbind,
  confirmSpaceRestore,
  destroyCoupleSpace,
  rejectCoupleSpaceUnbind,
  requestCoupleSpaceUnbind,
} from '@/api/space'
import {
  clearSpaceStatus,
  useFrontendSpace,
} from '@/composables/useFrontendSpace'
import { useSpaceSettingsWriteLock } from '@/composables/useSpaceSettingsWriteLock'
import { clearSpaceLocalCache } from '@/utils/spaceDestroy'
import { buildDestroyConfirmRequest, runDestroySpace } from '@/utils/spaceDestroyFlow'
import { formatSpaceDateTime } from '@/utils/spaceFormat'
import {
  activeSpaceMemberCount,
  canCancelUnbind,
  canConfirmUnbind,
  canDestroySpace,
  canRejectUnbind,
  canRequestUnbind,
  canShowDestroySection,
  canShowUnbindSection,
  destroyBlockReason,
  hasPendingUnbind,
  isRestorableSpace,
  isUnbindRejectedForMe,
  isUnbindRequestConflict,
  isUnbindRequester,
  readSpaceErrorMessage,
  unbindRequestBlockReason as unbindRequestBlockReasonByRule,
} from '@/utils/spaceState'

const emit = defineEmits(['changed'])

const router = useRouter()
const {
  spaceStatus,
  spaceError,
  refreshSpaceStatusAfterLifecycleAction,
} = useFrontendSpace()
const { isBusy, busyAction, set: setBusyAction, end: endBusy } = useSpaceSettingsWriteLock()

/** 任一写操作进行中：所有危险操作按钮禁用。 */
const busy = computed(() => busyAction.value !== '')

const memberCount = computed(() => activeSpaceMemberCount(spaceStatus.value))
const showUnbindSection = computed(() => canShowUnbindSection(spaceStatus.value))
const showDestroySection = computed(() => canShowDestroySection(spaceStatus.value))
/**
 * 整块危险区域是否出现。
 *
 * 这里只看「三个入口的并集」，不参与任何一个入口自身的展示条件，
 * 因此不会出现「只剩销毁时被恢复/解绑的条件挡掉」的历史缺陷。
 */
const hasLifecycle = computed(() => (
  isRestorableSpace(spaceStatus.value) || showUnbindSection.value || showDestroySection.value
))

const unbindPending = computed(() => hasPendingUnbind(spaceStatus.value))
const unbindRequestedByMe = computed(() => isUnbindRequester(spaceStatus.value))
const unbindCanCancel = computed(() => canCancelUnbind(spaceStatus.value))
const unbindCanConfirm = computed(() => canConfirmUnbind(spaceStatus.value))
const unbindCanReject = computed(() => canRejectUnbind(spaceStatus.value))
const canRequestUnbindNow = computed(() => canRequestUnbind(spaceStatus.value))
const canDestroyNow = computed(() => canDestroySpace(spaceStatus.value))
const destroyBlockReasonText = computed(() => destroyBlockReason(spaceStatus.value))
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

const restoreConfirmedCount = computed(() => Number(spaceStatus.value?.restoreConfirmedCount) || 0)
// 后端要求「有几名有效成员就几人确认」，SpaceStatusVO 只返回 memberCount，因此以它为准。
const restoreRequiredCount = computed(() => memberCount.value || 1)

/**
 * 确认恢复。只会提交当前用户的确认；双方都确认后空间才恢复，
 * 且恢复后保持私密，不会自动重新公开。
 */
async function restoreSpace() {
  if (busyAction.value !== '') return
  setBusyAction('restore')
  try {
    const { data } = await confirmSpaceRestore()
    if (!data?.success) {
      ElMessage.error(data?.message || '确认恢复失败，请稍后重试')
      return
    }
    const result = data.data || {}
    await refreshSpaceStatusAfterLifecycleAction({ force: true })
    if (result.restored) {
      ElMessage.success('情侣空间已恢复，当前仍为私密状态，可按需重新公开')
    } else {
      ElMessage.success(`已确认恢复（${result.confirmedCount ?? restoreConfirmedCount.value}/${result.requiredCount ?? restoreRequiredCount.value}），等待另一半确认`)
    }
    emit('changed', { kind: 'restore' })
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '确认恢复失败，请稍后重试'))
  } finally {
    endBusy()
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
  setBusyAction('unbind-request')
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
      emit('changed', { kind: 'unbind' })
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
    emit('changed', { kind: 'unbind' })
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '申请解绑失败，请稍后重试'))
  } finally {
    endBusy()
  }
}

/** 撤销自己发起的解绑申请。撤销后成员关系与空间状态仍保持不变。 */
async function cancelUnbind() {
  if (busyAction.value !== '' || !unbindCanCancel.value) return
  setBusyAction('unbind-cancel')
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
    emit('changed', { kind: 'unbind' })
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '撤销解绑申请失败，请稍后重试'))
  } finally {
    endBusy()
  }
}

/** 拒绝另一半发起的解绑申请。拒绝后申请失效，空间保持原状并继续正常使用。 */
async function rejectUnbind() {
  if (busyAction.value !== '' || !unbindCanReject.value) return
  setBusyAction('unbind-reject')
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
    emit('changed', { kind: 'unbind' })
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '拒绝解绑申请失败，请稍后重试'))
  } finally {
    endBusy()
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
  setBusyAction('unbind-confirm')
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
    endBusy()
  }
}

/**
 * 销毁并清空空间（仅创建者、另一半未加入时可用）。
 *
 * 顺序与副作用全部收敛在 runDestroySpace（可注入依赖，已有真实行为测试）：
 * 前置判断 → 占锁 → 二次确认（取消不发请求）→ 请求 → 强制刷新 → 判定结局 → finally 解锁。
 * 组件这里只把真实依赖传进去，不再自己编排，避免组件与规则两处逻辑漂移。
 */
async function destroySpace() {
  await runDestroySpace({
    canDestroyNow: () => canDestroyNow.value,
    readBusyAction: () => busyAction.value,
    setBusyAction: action => setBusyAction(action),
    readSpace: () => spaceStatus.value,
    confirmPrompt: () => {
      const request = buildDestroyConfirmRequest(spaceStatus.value)
      return ElMessageBox.prompt(request.message, request.title, request.options)
    },
    requestDestroy: space => destroyCoupleSpace(space),
    refreshStatus: () => refreshSpaceStatusAfterLifecycleAction({ force: true }),
    readSpaceAfterRefresh: () => spaceStatus.value,
    readSpaceErrorAfterRefresh: () => spaceError.value,
    clearCache: () => clearSpaceLocalCache(),
    clearStatus: () => clearSpaceStatus(),
    notify: (message, kind) => {
      if (kind === 'success') ElMessage.success(message)
      else if (kind === 'warning') ElMessage.warning(message)
      else ElMessage.error(message)
    },
    navigate: path => router.push(path),
  })
}

/** 状态变化后父页面可以据此刷新其它只读信息。 */
watch(
  () => spaceStatus.value?.revision,
  () => emit('changed', { kind: 'revision' }),
)
</script>
