<template>
  <div class="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
    <!--
      桌面端：左侧纵向分区导航，右侧只渲染当前分区。
      移动端：导航变为顶部横向滚动条，分区内容落在下方，不产生横向溢出。
    -->
    <aside class="min-w-0 lg:sticky lg:top-24" aria-label="空间设置分区导航">
      <div class="rounded-2xl border border-stone-200/80 bg-white p-2 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <p class="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">设置分区</p>

        <nav
          class="flex gap-1.5 overflow-x-auto px-1 py-1 lg:flex-col lg:overflow-visible"
          aria-label="空间设置分区"
        >
          <button
            v-for="section in availableSections"
            :key="section.key"
            type="button"
            class="group flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 lg:w-full"
            :class="activeSection === section.key
              ? 'bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200'
              : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'"
            :aria-current="activeSection === section.key ? 'page' : undefined"
            @click="selectSection(section.key)"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold"
              :class="activeSection === section.key
                ? 'border-rose-200 bg-white text-rose-600'
                : 'border-stone-200 bg-white text-stone-400 group-hover:text-rose-500'"
              aria-hidden="true"
            >
              {{ sectionIndex(section.key) }}
            </span>
            <span class="min-w-0">
              <span class="block whitespace-nowrap text-sm font-semibold">{{ section.label }}</span>
              <span class="mt-0.5 hidden truncate text-[11px] text-stone-400 lg:block">{{ section.hint }}</span>
            </span>
          </button>
        </nav>
      </div>
    </aside>

    <div class="min-w-0 space-y-5" role="region" :aria-label="activeSectionLabel">
      <!-- 空间概况：概览、基础信息、内容编辑入口按层级排列在同一分区内。 -->
      <div v-if="activeSection === 'overview'" class="space-y-5">
        <SpaceSettingsOverview />
        <SpaceBasicInfoSection
          ref="basicInfoRef"
          :can-edit="canEditSpaceInfo"
          :read-only-reason="readOnlyReason"
          @saved="onBasicInfoSaved"
        />
        <SpaceContentEntrySection :can-open-studio="canOpenStudio" />
      </div>

      <!-- 邀请与成员共用一个导航位置：由服务器返回的绑定状态动态选择内容。 -->
      <template v-else-if="activeSection === 'partner'">
        <slot v-if="showInviteSection" name="after-overview" />
        <div
          v-else
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
      </template>

      <SpaceVisibilitySection
        v-else-if="activeSection === 'visibility'"
        @changed="onChildChanged"
      />

      <SpaceDangerZone
        v-else-if="activeSection === 'danger'"
        @changed="onChildChanged"
      />

      <section v-else class="studio-empty">
        <p class="text-sm font-semibold text-stone-800">当前没有可用的设置分区</p>
        <p class="mt-1 text-xs leading-5 text-stone-500">请刷新空间状态，或返回恋爱广场后再试。</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import SpaceSettingsOverview from '@/components/frontend/space-settings/SpaceSettingsOverview.vue'
import SpaceBasicInfoSection from '@/components/frontend/space-settings/SpaceBasicInfoSection.vue'
import SpaceVisibilitySection from '@/components/frontend/space-settings/SpaceVisibilitySection.vue'
import SpaceContentEntrySection from '@/components/frontend/space-settings/SpaceContentEntrySection.vue'
import SpaceDangerZone from '@/components/frontend/space-settings/SpaceDangerZone.vue'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { formatMemberRole } from '@/utils/spaceFormat'
import { confirmDiscardChanges } from '@/utils/unsavedChanges'
import {
  canEditSpaceBasicInfo,
  canEditSpaceContent,
  spaceBasicInfoReadOnlyReason,
} from '@/utils/spaceState'
import {
  buildSpaceSettingsSections,
  canShowInviteSection,
  canShowMembersSection,
  resolveAvailableSettingsSection,
  resolveSettingsHashSection,
  settingsSectionHash,
} from '@/utils/spaceSettingsSections'

/**
 * 空间设置面板（信息架构入口）。
 *
 * 结构（四组）：
 * - 空间概况：概览、基础信息与内容编辑入口；
 * - 邀请另一半 / 空间成员：共用同一导航位置，由服务器绑定状态动态决定；
 * - 公开与审核：公开状态、审核状态与现有操作；
 * - 空间操作：恢复、解绑、销毁。
 *
 * 桌面端左侧纵向导航 + 右侧按层级组织的内容；移动端导航横向滚动。
 * 分区可用性由 spaceSettingsSections 统一推导，不可用分区直接隐藏；
 * 本组件只做编排与共享状态读取，具体写操作由各分组组件自己持有提交锁。
 */
const props = defineProps({
  /** 测试 / 受控场景可直接指定初始分区；留空时按 URL hash 解析。 */
  initialSection: { type: String, default: '' },
})

const emit = defineEmits(['changed'])

const { spaceStatus } = useFrontendSpace()
const route = useRoute()
const router = useRouter()

const basicInfoRef = ref(null)

const members = computed(() => (
  Array.isArray(spaceStatus.value?.members) ? spaceStatus.value.members : []
))
const canEditSpaceInfo = computed(() => canEditSpaceBasicInfo(spaceStatus.value))
const readOnlyReason = computed(() => spaceBasicInfoReadOnlyReason(spaceStatus.value))
const canOpenStudio = computed(() => canEditSpaceContent(spaceStatus.value))

const sections = computed(() => buildSpaceSettingsSections(spaceStatus.value))
/** 导航只展示可用分区，不再保留灰色禁用项或用说明重复占位。 */
const availableSections = computed(() => sections.value.filter(section => section.available))
const showInviteSection = computed(() => canShowInviteSection(spaceStatus.value)
  && !canShowMembersSection(spaceStatus.value))

/** 兼容测试 / 旧调用传入的旧分区 key，统一归并到四组。 */
function normalizeInitialSection(value) {
  const key = String(value || '').trim()
  if (!key) return resolveSettingsHashSection(route?.hash)
  if (key === 'overview' || key === 'partner' || key === 'visibility' || key === 'danger') return key
  if (key === 'basic-info' || key === 'content-entry') return 'overview'
  if (key === 'invite-partner' || key === 'members') return 'partner'
  return resolveSettingsHashSection(key.startsWith('#') ? key : `#${key}`)
}

function resolveInitialSection() {
  const requested = normalizeInitialSection(props.initialSection)
  return resolveAvailableSettingsSection(requested || 'overview', sections.value) || 'overview'
}

const activeSection = ref(resolveInitialSection())
const activeSectionLabel = computed(() => (
  sections.value.find(section => section.key === activeSection.value)?.label || '空间设置'
))

function sectionIndex(key) {
  const index = availableSections.value.findIndex(section => section.key === key)
  return index < 0 ? '' : String(index + 1).padStart(2, '0')
}

const membersHint = computed(() => '两位成员都已加入，空间内容对双方可见。')

function memberInitial(member) {
  return String(member?.displayName || member?.amourId || '恋').trim().slice(0, 1).toUpperCase()
}

function memberRoleText(member) {
  return formatMemberRole(member?.memberRole ?? member?.role)
}

/** 同步地址栏 hash，便于刷新 / 分享时回到同一个分区。 */
function syncSectionHash(section) {
  if (!section || typeof router?.replace !== 'function') return
  const hash = settingsSectionHash(section.key, sections.value)
  if (!hash || route?.hash === hash) return
  router.replace({ query: route?.query || {}, hash })
}

/**
 * 切换分区。
 *
 * 空间概况包含可能处于编辑态的基础信息：离开前按未保存修改规则确认，
 * 避免点击导航时静默丢失草稿。
 */
async function selectSection(key) {
  const section = sections.value.find(item => item.key === key)
  if (!section || !section.available) return
  if (key === activeSection.value) {
    scrollToSection(section.anchor)
    return
  }
  if (activeSection.value === 'overview' && basicInfoRef.value?.hasUnsavedChanges?.()) {
    const confirmed = await confirmDiscardChanges('切换分区会丢失当前未保存的空间信息修改，确定继续吗？')
    if (!confirmed) return
  }
  activeSection.value = key
  syncSectionHash(section)
  await nextTick()
  scrollToSection(section.anchor)
}

function scrollToSection(anchor) {
  if (typeof document === 'undefined' || !anchor) return
  document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
 * 旧 hash 深链仍可直接打开对应分区：
 * - `#space-unbind`：情侣空间首页的解绑提醒跳转；
 * - `#space-invite-partner`：空间编辑页「邀请另一半」；
 * - `#space-destroy` / `#space-basic-info`：旧入口与文档链接；
 * - 危险操作内部的锚点在打开危险分区后继续按元素定位。
 */
async function scrollToHash() {
  if (typeof document === 'undefined') return false
  const hash = String(route?.hash || '').replace(/^#/, '')
  const sectionKey = resolveSettingsHashSection(hash)
  if (!sectionKey) return false
  const section = sections.value.find(item => item.key === sectionKey)
  if (!section?.available) return false
  await nextTick()
  const rawTarget = document.getElementById(hash)
  if (rawTarget) {
    rawTarget.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return true
  }
  // 邀请 / 成员共用分区：另一种状态的目标不存在时，落到当前实际内容的锚点。
  if (hash === 'space-invite-partner' || hash === 'space-members') {
    const fallback = document.getElementById(section.anchor)
    if (!fallback) return false
    fallback.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return true
  }
  // 概览 / 危险操作的子锚点尚未渲染时返回 false，保留重试，避免只滚到分区顶部。
  return false
}

/**
 * 首屏定位需要重试：
 * - 直接打开 /space/setup#hash 时，空间状态可能比面板挂载稍晚到达；
 * - 分区切换后内容高度变化，一次滚动可能被后续渲染顶回去。
 */
const HASH_SCROLL_RETRY_DELAYS = [0, 250, 700, 1500, 2500]
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

/**
 * hash 变化时切换到对应分区；不可用时保持当前分区。
 *
 * 浏览器前进 / 后退或手动改 hash 同样可能离开基础信息编辑态，
 * 因此与点击导航一样先确认未保存修改，拒绝时把地址栏恢复到当前分区。
 */
async function applyHashSection({ initial = false } = {}) {
  const sectionKey = resolveSettingsHashSection(route?.hash)
  if (!sectionKey) return false
  const section = sections.value.find(item => item.key === sectionKey)
  if (!section?.available) return false
  if (activeSection.value === sectionKey) return true
  if (!initial && activeSection.value === 'overview' && basicInfoRef.value?.hasUnsavedChanges?.()) {
    const confirmed = await confirmDiscardChanges('切换分区会丢失当前未保存的空间信息修改，确定继续吗？')
    if (!confirmed) {
      const current = sections.value.find(item => item.key === activeSection.value)
      if (current) syncSectionHash(current)
      return false
    }
  }
  activeSection.value = sectionKey
  return true
}

watch(() => route?.hash, async () => {
  await applyHashSection()
  scheduleHashScroll()
})

/** 空间状态变化后，当前分区可能不再适用：回落到第一个可用分区。 */
watch(sections, (next) => {
  const resolved = resolveAvailableSettingsSection(activeSection.value, next)
  if (resolved && resolved !== activeSection.value) activeSection.value = resolved
  // 仅邀请 ↔ 成员切换需要同步锚点；概览子锚点与危险操作子锚点必须保留原始定位。
  const current = next.find(section => section.key === activeSection.value)
  const hash = String(route?.hash || '')
  if (current?.key === 'partner'
    && (hash === '#space-invite-partner' || hash === '#space-members')
    && hash !== `#${current.anchor}`) {
    syncSectionHash(current)
  }
  // 空间状态到达后，子区域才真正渲染；继续按原 hash 定位。
  if (hash) scheduleHashScroll()
})

onMounted(async () => {
  await applyHashSection({ initial: true })
  const sectionKey = resolveSettingsHashSection(route?.hash)
  if (!sectionKey) return
  await nextTick()
  scheduleHashScroll()
})

onBeforeUnmount(() => {
  clearHashScrollTimers()
})

/** 兼容旧调用：父页面/测试可以要求直接打开基础信息编辑。 */
async function focusBasicInfo() {
  await selectSection('overview')
  await nextTick()
  basicInfoRef.value?.startEditing?.()
}

defineExpose({ focusBasicInfo, selectSection, activeSection })
</script>
