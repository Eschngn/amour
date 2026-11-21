<template>
  <CouplePageScaffold>
    <main class="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <nav class="mb-5 flex flex-wrap items-center gap-2 text-xs text-stone-500" aria-label="当前位置">
        <RouterLink to="/space/setup" class="font-semibold text-stone-600 transition hover:text-rose-700">
          空间设置
        </RouterLink>
        <span class="text-stone-300" aria-hidden="true">/</span>
        <span class="font-semibold text-stone-800" aria-current="page">空间编辑</span>
        <RouterLink
          to="/"
          class="ml-auto inline-flex items-center gap-1 font-semibold text-stone-600 transition hover:text-rose-700"
        >
          返回空间主页
          <span aria-hidden="true">→</span>
        </RouterLink>
      </nav>

      <div v-if="statusLoading" class="panel px-6 py-10" aria-label="正在确认空间状态" aria-busy="true">
        <div class="h-5 w-36 animate-pulse rounded bg-stone-100" />
        <div class="mt-4 h-8 w-2/3 max-w-md animate-pulse rounded bg-stone-100" />
        <div class="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-stone-50" />
        <div class="mt-8 grid gap-3 sm:grid-cols-3">
          <div v-for="n in 3" :key="n" class="h-20 animate-pulse rounded-xl border border-stone-100 bg-stone-50/60" />
        </div>
      </div>

      <section v-else-if="statusError" class="panel px-6 py-12 text-center" role="alert">
        <h1 class="font-display text-xl font-bold text-stone-900">暂时无法确认空间状态</h1>
        <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">{{ spaceError }}</p>
        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" class="btn-primary" @click="refreshSpaceStatus">重新读取状态</button>
          <RouterLink to="/space/setup" class="btn-secondary">返回空间设置</RouterLink>
        </div>
      </section>

      <section v-else-if="!canEnterStudio" class="panel px-6 py-12 text-center">
        <h1 class="font-display text-xl font-bold text-stone-900">当前空间暂不支持内容编辑</h1>
        <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">
          只有等待绑定或正常状态下的空间成员可以进入编辑页。冻结、归档或已完成解绑的空间需要先恢复或重新创建空间。
        </p>
        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <RouterLink to="/space/setup" class="btn-primary">去空间设置</RouterLink>
          <RouterLink to="/plaza" class="btn-secondary">返回恋爱广场</RouterLink>
        </div>
      </section>

      <template v-else>
        <FrontendPageHeader
          eyebrow="空间编辑"
          :title="spaceStatus.spaceName || '我们的故事'"
          :description="isWaiting
            ? '另一半加入前，可以先在这里布置内容。'
            : '编辑并保存后，会同步到你们的空间。'"
          heading-id="studio-heading"
        >
          <template #meta>
            <span class="status-pill" :class="statusBadge.class">
              <span class="h-1.5 w-1.5 rounded-full" :class="statusBadge.dot" aria-hidden="true" />
              {{ statusBadge.label }}
            </span>
            <span v-if="isWaiting" class="inline-flex items-center gap-1.5">
              <span class="text-stone-400" aria-hidden="true">·</span>
              内容暂不会出现在恋爱广场
            </span>
          </template>
          <template #actions>
            <RouterLink
              v-if="isWaiting"
              :to="{ path: '/space/setup', hash: '#space-invite-partner' }"
              class="btn-primary"
            >
              邀请另一半
            </RouterLink>
            <RouterLink to="/" class="btn-secondary">查看空间</RouterLink>
          </template>
        </FrontendPageHeader>

        <div class="mt-4">
          <SpaceReviewStatusCard :refresh-key="reviewRefreshKey" @submitted="onReviewSubmitted" />
        </div>

        <!--
          桌面端：左侧纵向栏目导航 + 右侧当前编辑器。
          移动端：导航变为顶部横向滚动条，编辑内容自然落在下方，避免横向溢出。
          审核卡位于两栏之上，保存结果通过统一弹窗展示。
        -->
        <div class="mt-6 grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
          <aside class="min-w-0 lg:sticky lg:top-24" aria-label="空间编辑导航">
            <div class="rounded-2xl border border-stone-200/80 bg-white p-2">
              <div class="flex flex-wrap items-center justify-between gap-2 px-3 pb-1.5 pt-1">
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">编辑栏目</p>
                <p v-if="dirty" class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700" role="status">
                  <span class="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                  有未保存的修改
                </p>
                <p v-else class="hidden text-[11px] text-stone-400 lg:block">切换前会确认未保存修改。</p>
              </div>

              <nav
                class="flex gap-1.5 overflow-x-auto px-1 py-1 lg:flex-col lg:overflow-visible"
                aria-label="空间编辑栏目"
              >
                <button
                  v-for="tab in visibleTabs"
                  :key="tab.key"
                  type="button"
                  class="group flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 lg:w-full"
                  :class="activeTab === tab.key
                    ? 'bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'"
                  :aria-current="activeTab === tab.key ? 'page' : undefined"
                  @click="switchTab(tab.key)"
                >
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition"
                    :class="activeTab === tab.key
                      ? 'border-rose-200 bg-white text-rose-600'
                      : 'border-stone-200 bg-white text-stone-400 group-hover:text-rose-500'"
                    aria-hidden="true"
                  >
                    <component :is="tab.icon" class="h-4 w-4" />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold">{{ tab.label }}</span>
                    <span class="mt-0.5 hidden truncate text-[11px] text-stone-400 lg:block">{{ tab.hint }}</span>
                  </span>
                </button>
              </nav>
            </div>
          </aside>

          <section v-if="!visibleTabs.length" class="studio-empty min-w-0">
            <p class="text-sm font-semibold text-stone-800">当前账号没有可用的内容管理权限</p>
            <p class="mt-1 text-xs leading-5 text-stone-500">请联系管理员开通故事、相册、留言或纪念日的查询权限。</p>
          </section>

          <section v-else class="min-w-0" role="region" :aria-label="activeTabLabel">
            <SpaceHomeEditor
              v-if="activeTab === 'home'"
              @update:dirty="setDirty"
              @saved="onContentSaved"
            />
            <SpaceStoryEditor
              v-else-if="activeTab === 'story'"
              :can-publish="canPublish"
              :refresh-key="reviewRefreshKey"
              @update:dirty="setDirty"
              @saved="onContentSaved"
            />
            <SpaceMessageEditor
              v-else-if="activeTab === 'message'"
              @update:dirty="setDirty"
              @saved="onContentSaved"
            />
            <SpacePhotoEditor
              v-else-if="activeTab === 'photo'"
              :can-publish="canPublish"
              :refresh-key="reviewRefreshKey"
              @update:dirty="setDirty"
              @saved="onContentSaved"
            />
            <SpaceAnniversaryEditor
              v-else-if="activeTab === 'anniversary'"
              :can-publish="canPublish"
              :refresh-key="reviewRefreshKey"
              @update:dirty="setDirty"
              @saved="onContentSaved"
            />
          </section>
        </div>

        <SpaceSaveFeedbackDialog
          v-model="saveDialogOpen"
          :notice="saveFeedback"
          @closed="onSaveDialogClosed"
        />
      </template>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { Calendar, ChatDotRound, House, Notebook, Picture } from '@element-plus/icons-vue'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import FrontendPageHeader from '@/components/frontend/FrontendPageHeader.vue'
import SpaceHomeEditor from '@/components/frontend/space-studio/SpaceHomeEditor.vue'
import SpaceStoryEditor from '@/components/frontend/space-studio/SpaceStoryEditor.vue'
import SpaceMessageEditor from '@/components/frontend/space-studio/SpaceMessageEditor.vue'
import SpacePhotoEditor from '@/components/frontend/space-studio/SpacePhotoEditor.vue'
import SpaceAnniversaryEditor from '@/components/frontend/space-studio/SpaceAnniversaryEditor.vue'
import SpaceReviewStatusCard from '@/components/frontend/space-studio/SpaceReviewStatusCard.vue'
import SpaceSaveFeedbackDialog from '@/components/frontend/space-studio/SpaceSaveFeedbackDialog.vue'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { hasFrontendQueryPermission } from '@/utils/auth'
import { canEditSpaceContent, SPACE_STATUS } from '@/utils/spaceState'
import { confirmDiscardChanges } from '@/utils/unsavedChanges'
import { SAVE_FEEDBACK_KIND } from '@/utils/saveFeedback'
import {
  isStudioTabAllowed,
  resolveStudioTab,
  resolveVisibleStudioTabs,
} from '@/utils/spaceStudioTabs'

const route = useRoute()
const router = useRouter()
const {
  spaceStatus,
  spaceLoading,
  spaceError,
  refreshSpaceStatus,
} = useFrontendSpace()

/** 栏目图标只属于视图层，栏目定义与可见性规则由 spaceStudioTabs 统一维护。 */
const TAB_ICONS = {
  home: House,
  story: Notebook,
  message: ChatDotRound,
  photo: Picture,
  anniversary: Calendar,
}

const statusLoading = computed(() => spaceLoading.value && !spaceStatus.value)
const statusError = computed(() => Boolean(spaceError.value) && !spaceStatus.value)
const canEnterStudio = computed(() => canEditSpaceContent(spaceStatus.value))
const isWaiting = computed(() => Number(spaceStatus.value?.status) === SPACE_STATUS.WAITING)
const canPublish = computed(() => Number(spaceStatus.value?.status) === SPACE_STATUS.NORMAL)
const reviewRefreshKey = ref(0)

/** 重新提交公开审核后，同步刷新空间状态与内容编辑器的审核标记。 */
function onReviewSubmitted(payload) {
  reviewRefreshKey.value += 1
  refreshSpaceStatus()
  showSaveFeedback(payload)
}

// 首页编辑属于空间基础能力，沿用现有首页的准入方式（有效成员即可）；
// 故事/留言/相册/纪念日仍按各自模块的查询权限展示，避免绕过模块权限。
const visibleTabs = computed(() => (
  resolveVisibleStudioTabs(hasFrontendQueryPermission)
    .map(tab => ({ ...tab, icon: TAB_ICONS[tab.key] }))
))

const statusBadge = computed(() => (
  isWaiting.value
    ? { label: '等待绑定', class: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' }
    : { label: '正常', class: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' }
))

const activeTab = ref('home')
const activeTabLabel = computed(() => (
  visibleTabs.value.find(tab => tab.key === activeTab.value)?.label || '内容编辑'
))
const dirty = ref(false)
const saveFeedback = ref(null)
const saveDialogOpen = ref(false)
let saveFeedbackSeq = 0

function setDirty(value) {
  dirty.value = Boolean(value)
}

/**
 * 编辑器保存成功后统一在这里展示保存结果。
 *
 * 普通保存、排序与审核重新提交共用同一个弹窗，连续保存只更新内容不叠层；
 * dirty 使用编辑器重建基线后的结果，避免同栏目其他表单的修改被误清。
 */
function onContentSaved(payload) {
  // 编辑器在重建被保存表单的基线后会带上整体 dirty；同栏目其他表单仍有修改时不能误清。
  if (typeof payload?.dirtyAfterSave === 'boolean') {
    dirty.value = payload.dirtyAfterSave
  }
  // 排序结果与普通保存共用同一个弹窗，避免出现两套反馈通道。
  if (payload?.action === 'reorder') {
    showSaveFeedback(payload)
    return
  }
  // 保存可能新增或撤回待审核项（例如改回公开版本），刷新状态卡展示真实审核状态。
  if (payload?.reviewStatus || payload?.kind === SAVE_FEEDBACK_KIND.RESTORED) {
    reviewRefreshKey.value += 1
  }
  showSaveFeedback(payload)
}

/** 保存结果统一用弹窗展示；同一时间只允许一个，连续保存时覆盖内容不叠层。 */
function showSaveFeedback(payload) {
  const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
  if (!message) return
  saveFeedback.value = {
    id: ++saveFeedbackSeq,
    message,
    kind: payload?.kind || 'success',
    reviewStatus: payload?.reviewStatus || '',
    published: typeof payload?.published === 'boolean' ? payload.published : null,
  }
  saveDialogOpen.value = true
}

/** 弹窗关闭后清空反馈，避免下次打开闪现上一条文案。 */
function onSaveDialogClosed() {
  saveFeedback.value = null
}

function isTabAllowed(key) {
  return isStudioTabAllowed(key, visibleTabs.value)
}

function resolveInitialTab() {
  return resolveStudioTab(route.query.tab, visibleTabs.value)
}

async function confirmDiscard(message) {
  return confirmDiscardChanges(message)
}

let switchingTab = false

async function switchTab(key) {
  if (key === activeTab.value || !isTabAllowed(key) || switchingTab) return
  switchingTab = true
  try {
    if (dirty.value && !(await confirmDiscard('切换栏目会丢失当前未保存的修改，确定继续吗？'))) {
      return
    }
    activeTab.value = key
    // 旧编辑器随栏目切换卸载，新编辑器加载后会重新建立 clean 基线。
    dirty.value = false
    // 旧栏目的保存提示不再适用于新栏目，随切换一起收起。
    saveDialogOpen.value = false
    saveFeedback.value = null
    await router.replace({ query: { ...route.query, tab: key } })
  } finally {
    switchingTab = false
  }
}

function handleBeforeUnload(event) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  const confirmed = await confirmDiscard('离开编辑页会丢失当前未保存的修改，确定离开吗？')
  if (confirmed) dirty.value = false
  return confirmed
})

watch(visibleTabs, () => {
  if (!isTabAllowed(activeTab.value)) {
    activeTab.value = resolveInitialTab()
    // 权限变化导致栏目被移除时，旧编辑器已卸载，避免残留的 dirty 影响后续切换。
    dirty.value = false
  }
})

onMounted(async () => {
  await refreshSpaceStatus()
  await nextTick()
  activeTab.value = resolveInitialTab()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>
