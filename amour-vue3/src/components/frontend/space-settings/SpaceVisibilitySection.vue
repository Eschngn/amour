<template>
  <section id="space-visibility" class="panel scroll-mt-24" aria-labelledby="space-visibility-heading">
    <header class="panel-header">
      <div class="min-w-0">
        <p class="section-kicker">公开与审核</p>
        <h2 id="space-visibility-heading" class="mt-1 section-title">恋爱广场公开</h2>
      </div>
    </header>

    <div class="px-5 sm:px-6">
      <div class="settings-row">
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-stone-900">在恋爱广场展示这个空间</h3>
          <p id="space-visibility-desc" class="mt-1 text-xs leading-6 text-stone-500">
            首次公开需要管理员审核。公开后，空间名称、简介、头像、封面、主页配置以及公开的故事、照片和纪念日修改也会进入审核；审核期间恋爱广场继续展示上一次通过的版本。
          </p>
          <p
            v-if="visibilityNotice"
            id="space-visibility-reason"
            class="mt-2 flex items-start gap-1.5 text-xs leading-5"
            :class="visibilityNotice.textClass"
            role="status"
          >
            <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" :class="visibilityNotice.dotClass" aria-hidden="true" />
            <span>{{ visibilityNotice.text }}</span>
          </p>
          <p v-if="busy" class="mt-2 text-xs font-medium text-stone-500" role="status">
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
            :disabled="switchDisabled"
            :aria-busy="busy ? 'true' : 'false'"
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
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import { updateCoupleSpaceVisibility } from '@/api/space'
import SpaceReviewStatusCard from '@/components/frontend/space-studio/SpaceReviewStatusCard.vue'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { useSpaceSettingsWriteLock } from '@/composables/useSpaceSettingsWriteLock'
import {
  canPublishSpace,
  hasActiveSpaceMembership,
  isSpacePublic,
  readSpaceErrorMessage,
  visibilityBlockReason,
} from '@/utils/spaceState'

/**
 * 公开设置与审核状态。
 *
 * 公开开关只提交空间级 visibility；真正的权限与「是否具备公开资格」仍由后端判定。
 */
const emit = defineEmits(['changed'])

const { spaceStatus, refreshSpaceStatusAfterLifecycleAction } = useFrontendSpace()
const { isBusy, begin, end } = useSpaceSettingsWriteLock()

const busy = computed(() => isBusy('visibility'))
const reviewRefreshKey = ref(0)
const isPublic = computed(() => isSpacePublic(spaceStatus.value))
const publishAllowed = computed(() => canPublishSpace(spaceStatus.value))
const switchDisabled = computed(() => {
  if (busy.value) return true
  if (!hasActiveSpaceMembership(spaceStatus.value)) return true
  // 隐藏永远允许有效成员操作；只有「从私密切到公开」才要求 status=1 且两人绑定。
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

/** 重新提交公开审核后同步刷新空间状态与审核卡片；无改动时使用中性提示。 */
function onReviewSubmitted(payload) {
  reviewRefreshKey.value += 1
  refreshSpaceStatusAfterLifecycleAction({ force: true })
  emit('changed', payload)
  const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
  if (!message) return
  ElMessage({
    message,
    type: payload?.kind === 'unchanged' ? 'info' : 'success',
  })
}

/**
 * 切换空间公开状态。
 *
 * 失败只提示后端 message，不本地改写 visibility，也不清空共享空间状态；
 * 成功后才强制刷新服务器状态。
 */
async function toggleVisibility() {
  if (switchDisabled.value) return
  if (!begin('visibility')) return
  const target = isPublic.value ? 0 : 1
  try {
    const { data } = await updateCoupleSpaceVisibility(target)
    if (!data?.success) {
      ElMessage.error(data?.message || '公开设置失败，请稍后重试')
      return
    }
    await refreshSpaceStatusAfterLifecycleAction({ force: true })
    reviewRefreshKey.value += 1
    ElMessage.success(target === 1
      ? '已提交公开审核，审核通过后会出现在恋爱广场'
      : '已从恋爱广场隐藏')
  } catch (error) {
    ElMessage.error(readSpaceErrorMessage(error, '公开设置失败，请稍后重试'))
  } finally {
    end()
  }
}
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
