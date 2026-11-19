<template>
  <div class="space-y-6">
    <SpaceSettingsOverview />

    <!--
      日常管理区：按「基础信息 → 成员与邀请 → 公开与审核 → 内容管理」分组。
      等待绑定时父页面通过 after-overview 插槽在这里插入邀请区（成员与邀请组的核心内容）。
    -->
    <div class="space-y-6">
      <SpaceBasicInfoSection
        ref="basicInfoRef"
        :can-edit="canEditSpaceInfo"
        :read-only-reason="readOnlyReason"
        @saved="onBasicInfoSaved"
      />

      <slot name="after-overview" />

      <div
        v-if="members.length > 1"
        id="space-members"
        class="panel scroll-mt-24"
        aria-labelledby="space-members-heading"
      >
        <header class="panel-header">
          <div class="min-w-0">
            <p class="section-kicker">成员与邀请</p>
            <h2 id="space-members-heading" class="mt-1 section-title">空间成员</h2>
            <p class="mt-1 text-xs leading-5 text-stone-500">
              {{ membersHint }}
            </p>
          </div>
        </header>

        <ul class="divide-y divide-stone-100 px-5 sm:px-6">
          <li
            v-for="member in members"
            :key="member.amourId || member.displayName"
            class="flex items-center gap-3 py-3"
          >
            <span class="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-100 text-xs font-bold text-rose-700">
              {{ memberInitial(member) }}
              <img
                v-if="member.avatar"
                :src="member.avatar"
                alt=""
                class="absolute inset-0 h-full w-full object-cover"
                @error="$event.currentTarget.style.display = 'none'"
              >
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-stone-900">{{ member.displayName || '恋人' }}</p>
              <p class="text-[11px] text-stone-500">
                {{ memberRoleText(member) }}
                <span v-if="member.amourId"> · 恋语 ID {{ member.amourId }}</span>
              </p>
            </div>
          </li>
        </ul>
      </div>

      <SpaceVisibilitySection @changed="onChildChanged" />

      <SpaceContentEntrySection :can-open-studio="canOpenStudio" />
    </div>

    <!-- 危险操作区固定在日常设置之后，独立成区，不再吸顶或悬浮 -->
    <SpaceDangerZone @changed="onChildChanged" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import SpaceSettingsOverview from '@/components/frontend/space-settings/SpaceSettingsOverview.vue'
import SpaceBasicInfoSection from '@/components/frontend/space-settings/SpaceBasicInfoSection.vue'
import SpaceVisibilitySection from '@/components/frontend/space-settings/SpaceVisibilitySection.vue'
import SpaceContentEntrySection from '@/components/frontend/space-settings/SpaceContentEntrySection.vue'
import SpaceDangerZone from '@/components/frontend/space-settings/SpaceDangerZone.vue'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { formatMemberRole } from '@/utils/spaceFormat'
import {
  canEditSpaceBasicInfo,
  canEditSpaceContent,
  spaceBasicInfoReadOnlyReason,
} from '@/utils/spaceState'

/**
 * 空间设置面板（信息架构入口）。
 *
 * 页面结构：
 * 1. 顶部概览：名称、状态、成员、必要时间、刷新；
 * 2. 日常管理：基础信息 → 成员与邀请（等待绑定时由父页面插槽注入邀请区）→ 公开与审核 → 内容管理；
 * 3. 危险操作：恢复 / 解绑 / 销毁，位于日常设置之后，不再使用右侧吸顶栏。
 *
 * 本组件只做编排与共享状态读取，具体写操作由各分组组件自己持有提交锁
 * （useSpaceSettingsWriteLock 是模块级共享锁，因此跨组件的写操作天然互斥）。
 */
const emit = defineEmits(['changed'])

const { spaceStatus } = useFrontendSpace()
const route = useRoute()

const basicInfoRef = ref(null)

const members = computed(() => (
  Array.isArray(spaceStatus.value?.members) ? spaceStatus.value.members : []
))
const canEditSpaceInfo = computed(() => canEditSpaceBasicInfo(spaceStatus.value))
const readOnlyReason = computed(() => spaceBasicInfoReadOnlyReason(spaceStatus.value))
const canOpenStudio = computed(() => canEditSpaceContent(spaceStatus.value))
/**
 * 成员卡片只在真正有两名成员时出现。
 *
 * 等待绑定时「成员与邀请」的内容已经是父页面注入的邀请区，
 * 再补一张只含自己的成员卡会重复分组标题、拉长页面。
 */
const membersHint = computed(() => '两位成员都已加入，空间内容对双方可见。')

function memberInitial(member) {
  return String(member?.displayName || member?.amourId || '恋').trim().slice(0, 1).toUpperCase()
}

function memberRoleText(member) {
  return formatMemberRole(member?.memberRole ?? member?.role)
}

function onBasicInfoSaved(payload) {
  if (payload?.message) ElMessage.success(payload.message)
  else if (payload?.warning) ElMessage.warning(payload.warning)
  emit('changed', { kind: 'basic-info' })
}

function onChildChanged(payload) {
  emit('changed', payload)
}

/**
 * 保留既有 hash 锚点定位行为。
 *
 * 外部入口仍在使用这些锚点：
 * - `#space-unbind`：情侣空间首页的解绑提醒跳转；
 * - `#space-invite-partner`：空间内容编辑页「去邀请另一半」；
 * - `#space-destroy` / `#space-basic-info`：旧入口与文档链接。
 *
 * 重构后危险操作区在页面底部，锚点目标依旧存在，因此这里只需按 hash 滚动，
 * 不再需要每个区域自己监听。
 */
const HASH_SCROLL_TARGETS = new Set([
  'space-overview',
  'space-basic-info',
  'space-invite-partner',
  'space-members',
  'space-visibility',
  'space-content-entry',
  'space-danger-zone',
  'space-restore',
  'space-unbind',
  'space-destroy',
])

async function scrollToHash() {
  if (typeof document === 'undefined') return
  const hash = String(route?.hash || '').replace(/^#/, '')
  if (!HASH_SCROLL_TARGETS.has(hash)) return
  await nextTick()
  const target = document.getElementById(hash)
  if (!target) return false
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

/**
 * 首屏定位需要重试：
 * - 面板内的审核状态卡等区域是异步加载的，加载完成后上方内容变高，
 *   一次性滚动可能在高度稳定前就被「顶回去」；
 * - 直接打开 /space/setup#hash 时，空间状态也可能比面板挂载稍晚到达。
 *
 * 因此在短时间内重试若干次，命中后即停止；页面卸载时清理定时器。
 */
const HASH_SCROLL_RETRY_DELAYS = [0, 250, 700, 1500]
let hashScrollTimers = []

function scheduleHashScroll() {
  clearHashScrollTimers()
  hashScrollTimers = HASH_SCROLL_RETRY_DELAYS.map(delay => setTimeout(() => {
    scrollToHash().then((scrolled) => {
      if (scrolled) clearHashScrollTimers()
    })
  }, delay))
}

function clearHashScrollTimers() {
  hashScrollTimers.forEach(timer => clearTimeout(timer))
  hashScrollTimers = []
}

onMounted(() => {
  scheduleHashScroll()
})

onBeforeUnmount(() => {
  clearHashScrollTimers()
})

watch(() => route?.hash, () => {
  scheduleHashScroll()
})

// 空间状态刷新后区域可能才出现（例如刷新后才渲染出解绑入口），补一次定位。
watch(
  () => spaceStatus.value?.revision,
  () => { scheduleHashScroll() },
)

/** 兼容旧调用：父页面/测试可以要求直接打开基础信息编辑。 */
function focusBasicInfo() {
  basicInfoRef.value?.startEditing?.()
}

defineExpose({ focusBasicInfo })
</script>
