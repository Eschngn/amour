<template>
  <section
    id="space-overview"
    class="panel scroll-mt-24"
    aria-labelledby="space-settings-summary"
  >
    <div class="px-5 py-4 sm:px-6 sm:py-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="section-kicker">当前空间</p>
          <h2
            id="space-settings-summary"
            class="mt-1 break-words font-display text-xl font-bold leading-tight text-stone-900 sm:text-2xl"
          >
            {{ spaceNameText }}
          </h2>
          <p
            v-if="statusDescription"
            class="mt-1 max-w-2xl text-xs leading-5 text-stone-500"
          >
            {{ statusDescription }}
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap items-center gap-2">
          <span class="status-pill" :class="statusCard.badgeClass">
            <span class="h-1.5 w-1.5 rounded-full" :class="statusCard.dotClass" aria-hidden="true" />
            {{ statusCard.label }}
          </span>
          <button
            type="button"
            class="btn-secondary !py-1.5"
            :disabled="spaceLoading"
            :aria-busy="spaceLoading ? 'true' : 'false'"
            aria-label="刷新空间状态"
            @click="refreshStatus"
          >
            {{ spaceLoading ? '刷新中…' : '刷新状态' }}
          </button>
        </div>
      </div>

      <!-- 一条事实带替代原来的四格卡片，减少首屏占用；长名称靠 break-words 自然换行 -->
      <dl class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-stone-100 pt-3 text-xs">
        <div class="flex min-w-0 items-center gap-1.5">
          <dt class="text-stone-400">成员</dt>
          <dd class="flex items-center gap-1.5 font-semibold text-stone-800">
            <span v-if="members.length" class="flex -space-x-1.5" aria-hidden="true">
              <span
                v-for="member in members.slice(0, 2)"
                :key="member.amourId || member.displayName"
                class="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white bg-rose-100 text-[9px] font-bold text-rose-700"
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
            <span>{{ memberCount }} / {{ spaceStatus.memberLimit || 2 }}</span>
          </dd>
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <dt class="text-stone-400">恋爱广场</dt>
          <dd class="font-semibold" :class="isPublic ? 'text-emerald-700' : 'text-stone-700'">
            {{ isPublic ? '公开中' : '私密' }}
          </dd>
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <dt class="text-stone-400">恋爱开始</dt>
          <dd class="break-words font-semibold text-stone-800">{{ loveStartText }}</dd>
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <dt class="text-stone-400">{{ isSpaceWaiting ? '待接受邀请' : '创建时间' }}</dt>
          <dd class="font-semibold text-stone-800">
            {{ isSpaceWaiting ? `${pendingInvitationCount} 条` : createdAtText }}
          </dd>
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <dt class="text-stone-400">首次公开</dt>
          <dd class="font-semibold text-stone-800">{{ publicAtText }}</dd>
        </div>
      </dl>

      <p
        v-if="spaceError"
        class="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/85 px-3.5 py-2.5 text-xs leading-5 text-amber-800"
        role="status"
      >
        空间状态刷新失败：{{ spaceError }}。下面展示的是上一次确认过的状态，操作结果仍以服务器为准。
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { formatSpaceDateTime } from '@/utils/spaceFormat'
import {
  SPACE_STATUS,
  activeSpaceMemberCount,
  isSpacePublic,
} from '@/utils/spaceState'

/**
 * 空间设置页顶部概览。
 *
 * 只保留「名称 + 状态 + 成员 + 必要时间 + 刷新」这些事实，
 * 不复述下方设置项；等待绑定等非正常状态才补一句说明。
 */
const {
  spaceStatus,
  spaceLoading,
  spaceError,
  refreshSpaceStatus,
} = useFrontendSpace()

/**
 * 是否等待绑定：直接看 spaceStatus.status。
 *
 * 不用 composable 的 isSpaceWaiting —— 它还要求 frontendLoggedIn，
 * 而概览只需要展示服务器已经确认过的状态字段，避免在 SSR / 预览场景下判断失真。
 */
const isSpaceWaiting = computed(() => Number(spaceStatus.value?.status) === SPACE_STATUS.WAITING)

const members = computed(() => (
  Array.isArray(spaceStatus.value?.members) ? spaceStatus.value.members : []
))
const memberCount = computed(() => activeSpaceMemberCount(spaceStatus.value))
const isPublic = computed(() => isSpacePublic(spaceStatus.value))
const pendingInvitationCount = computed(() => Number(spaceStatus.value?.pendingInvitationCount) || 0)

const spaceNameText = computed(() => spaceStatus.value?.spaceName || '我们的故事')

const loveStartText = computed(() => (
  spaceStatus.value?.loveStartTime ? formatSpaceDateTime(spaceStatus.value.loveStartTime) : '未设置'
))
const publicAtText = computed(() => (
  spaceStatus.value?.publicAt ? formatSpaceDateTime(spaceStatus.value.publicAt) : '尚未公开过'
))
const createdAtText = computed(() => (
  spaceStatus.value?.createTime ? formatSpaceDateTime(spaceStatus.value.createTime) : '暂无记录'
))

function memberInitial(member) {
  return String(member?.displayName || member?.amourId || '恋').trim().slice(0, 1).toUpperCase()
}

const statusCard = computed(() => {
  const status = Number(spaceStatus.value?.status)
  if (status === SPACE_STATUS.WAITING) {
    return {
      label: '等待绑定',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
      dotClass: 'bg-amber-500',
    }
  }
  if (status === SPACE_STATUS.FROZEN) {
    return {
      label: '已冻结',
      badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
      dotClass: 'bg-sky-500',
    }
  }
  if (status === SPACE_STATUS.ARCHIVED) {
    return {
      label: '已归档',
      badgeClass: 'border-stone-200 bg-stone-100 text-stone-600',
      dotClass: 'bg-stone-400',
    }
  }
  if (status === SPACE_STATUS.NORMAL) {
    return {
      label: '正常',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dotClass: 'bg-emerald-500',
    }
  }
  // 删除等待期 / 未知状态：不能当作「正常」展示，也不提供写操作入口。
  return {
    label: '暂不可用',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
    dotClass: 'bg-rose-500',
  }
})

/** 正常状态不再重复说明；其它状态给一句必要的上下文。 */
const statusDescription = computed(() => {
  const status = Number(spaceStatus.value?.status)
  if (status === SPACE_STATUS.WAITING) {
    return '等待另一半接受邀请后即可正常使用。在对方加入前，你可以邀请和修改基础信息。'
  }
  if (status === SPACE_STATUS.FROZEN) {
    return '空间已冻结，内容暂不加载；按现有规则确认恢复后可继续使用。'
  }
  if (status === SPACE_STATUS.ARCHIVED) {
    return '空间已归档并从恋爱广场隐藏；按现有规则确认恢复后可继续使用。'
  }
  if (status === SPACE_STATUS.NORMAL) return ''
  return '当前空间状态无法进入设置操作，请返回恋爱广场或刷新空间状态后再试。'
})

/** 手动刷新空间状态：等待另一半加入时也能及时看到状态变化。 */
async function refreshStatus() {
  if (spaceLoading.value) return
  await refreshSpaceStatus()
}
</script>
