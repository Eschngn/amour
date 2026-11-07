<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <RouterLink
            to="/space/setup"
            class="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/75 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M19 12H5m5 5-5-5 5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            返回空间设置
          </RouterLink>
          <RouterLink to="/" class="text-xs font-semibold text-rose-500 transition hover:text-rose-700">
            返回我的情侣空间
          </RouterLink>
        </div>

        <div v-if="statusLoading" class="grid gap-5" aria-label="正在确认空间状态" aria-busy="true">
          <div class="h-40 animate-pulse rounded-[1.75rem] border border-rose-100 bg-white/60" />
          <div class="h-72 animate-pulse rounded-[1.75rem] border border-rose-100 bg-white/60" />
        </div>

        <section v-else-if="statusError" class="rounded-[1.75rem] border border-rose-100 bg-white/80 px-6 py-14 text-center shadow-sm" role="alert">
          <h1 class="font-display text-2xl font-bold text-rose-950">暂时无法确认你的空间状态</h1>
          <p class="mx-auto mt-3 max-w-md text-sm leading-7 text-rose-700/55">{{ spaceError }}</p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" class="rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-600" @click="refreshSpaceStatus">
              重新读取状态
            </button>
            <RouterLink to="/space/setup" class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
              返回空间设置
            </RouterLink>
          </div>
        </section>

        <section v-else-if="!canEnterStudio" class="rounded-[1.75rem] border border-rose-100 bg-white/80 px-6 py-14 text-center shadow-sm">
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-300" aria-hidden="true">♥</span>
          <h1 class="mt-4 font-display text-2xl font-bold text-rose-950">当前空间暂不支持内容编辑</h1>
          <p class="mx-auto mt-3 max-w-lg text-sm leading-7 text-rose-700/55">
            只有等待绑定或正常状态下的空间成员可以进入编辑页。冻结、归档或已完成解绑的空间需要先恢复或重新创建空间。
          </p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <RouterLink to="/space/setup" class="rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-600">
              去空间设置
            </RouterLink>
            <RouterLink to="/plaza" class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
              返回恋爱广场
            </RouterLink>
          </div>
        </section>

        <template v-else>
          <header class="relative overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white/75 px-5 py-7 shadow-sm shadow-rose-100/50 backdrop-blur-sm sm:px-8 sm:py-9">
            <div class="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-rose-100/80 blur-3xl" aria-hidden="true" />
            <div class="relative flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.26em] text-rose-500">
                  <span class="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
                  Space Studio
                </p>
                <h1 class="mt-2 break-words font-display text-3xl font-extrabold tracking-tight text-rose-950 sm:text-4xl">
                  {{ spaceStatus.spaceName || '我们的故事' }}
                </h1>
                <p class="mt-2 max-w-2xl text-sm leading-7 text-rose-800/60">
                  在这里提前布置空间首页、故事、留言、相册和纪念日。所有内容都会保存到当前空间，另一半加入后可以直接看到。
                </p>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" :class="statusBadge.class">
                  <span class="h-1.5 w-1.5 rounded-full" :class="statusBadge.dot" aria-hidden="true" />
                  {{ statusBadge.label }}
                </span>
                <RouterLink
                  v-if="isWaiting"
                  :to="{ path: '/space/setup', hash: '#space-invite-partner' }"
                  class="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105"
                >
                  邀请另一半
                </RouterLink>
              </div>
            </div>

            <p v-if="isWaiting" class="relative mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 text-xs leading-5 text-amber-800" role="status">
              空间还在等待另一半加入。你现在写下的内容会先保存在自己的空间里，不会公开到恋爱广场。
            </p>
            <p v-else class="relative mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5 text-xs leading-5 text-emerald-700" role="status">
              空间已正常绑定，你和另一半都可以继续在这里维护内容。
            </p>
          </header>

          <nav class="mt-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-rose-100 bg-white/70 p-1.5" aria-label="空间内容编辑导航">
            <button
              v-for="tab in visibleTabs"
              :key="tab.key"
              type="button"
              class="shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition"
              :class="activeTab === tab.key ? 'bg-rose-500 text-white shadow-sm shadow-rose-200' : 'text-rose-700/65 hover:bg-rose-50 hover:text-rose-700'"
              :aria-current="activeTab === tab.key ? 'page' : undefined"
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
            </button>
          </nav>

          <section v-if="!visibleTabs.length" class="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-10 text-center">
            <p class="text-sm font-semibold text-amber-800">当前账号没有可用的内容管理权限</p>
            <p class="mt-1 text-xs leading-6 text-amber-700/70">请联系管理员开通故事、相册、留言或纪念日的查询权限。</p>
          </section>

          <div v-else class="mt-5">
            <SpaceHomeEditor
              v-if="activeTab === 'home'"
              @update:dirty="setDirty"
              @saved="onHomeSaved"
            />
            <SpaceStoryEditor
              v-else-if="activeTab === 'story'"
              :can-publish="canPublish"
              @update:dirty="setDirty"
            />
            <SpaceMessageEditor
              v-else-if="activeTab === 'message'"
              @update:dirty="setDirty"
            />
            <SpacePhotoEditor
              v-else-if="activeTab === 'photo'"
              :can-publish="canPublish"
              @update:dirty="setDirty"
            />
            <SpaceAnniversaryEditor
              v-else-if="activeTab === 'anniversary'"
              :can-publish="canPublish"
              @update:dirty="setDirty"
            />
          </div>
        </template>
      </div>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import SpaceHomeEditor from '@/components/frontend/space-studio/SpaceHomeEditor.vue'
import SpaceStoryEditor from '@/components/frontend/space-studio/SpaceStoryEditor.vue'
import SpaceMessageEditor from '@/components/frontend/space-studio/SpaceMessageEditor.vue'
import SpacePhotoEditor from '@/components/frontend/space-studio/SpacePhotoEditor.vue'
import SpaceAnniversaryEditor from '@/components/frontend/space-studio/SpaceAnniversaryEditor.vue'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { hasFrontendQueryPermission } from '@/utils/auth'
import { canEditSpaceContent, SPACE_STATUS } from '@/utils/spaceState'

const route = useRoute()
const router = useRouter()
const {
  spaceStatus,
  spaceLoading,
  spaceError,
  refreshSpaceStatus,
} = useFrontendSpace()

const TABS = [
  { key: 'home', label: '空间首页', module: 'home' },
  { key: 'story', label: '故事', module: 'story' },
  { key: 'message', label: '留言', module: 'message' },
  { key: 'photo', label: '相册', module: 'photo' },
  { key: 'anniversary', label: '纪念日', module: 'anniversary' },
]

const statusLoading = computed(() => spaceLoading.value && !spaceStatus.value)
const statusError = computed(() => Boolean(spaceError.value) && !spaceStatus.value)
const canEnterStudio = computed(() => canEditSpaceContent(spaceStatus.value))
const isWaiting = computed(() => Number(spaceStatus.value?.status) === SPACE_STATUS.WAITING)
const canPublish = computed(() => Number(spaceStatus.value?.status) === SPACE_STATUS.NORMAL)

// 首页编辑属于空间基础能力，沿用现有首页的准入方式（有效成员即可）；
// 故事/留言/相册/纪念日仍按各自模块的查询权限展示，避免绕过模块权限。
const visibleTabs = computed(() => TABS.filter(tab => (
  tab.key === 'home' || hasFrontendQueryPermission(tab.module)
)))

const statusBadge = computed(() => (
  isWaiting.value
    ? { label: '等待绑定', class: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-400' }
    : { label: '正常绑定', class: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400' }
))

const activeTab = ref('home')
const dirty = ref(false)

function setDirty(value) {
  dirty.value = Boolean(value)
}

function isTabAllowed(key) {
  return visibleTabs.value.some(tab => tab.key === key)
}

function resolveInitialTab() {
  const requested = typeof route.query.tab === 'string' ? route.query.tab : ''
  if (requested && isTabAllowed(requested)) return requested
  return visibleTabs.value[0]?.key || ''
}

async function confirmDiscard(message) {
  try {
    await ElMessageBox.confirm(message, '有未保存的内容', {
      confirmButtonText: '放弃修改',
      cancelButtonText: '继续编辑',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
    return true
  } catch {
    return false
  }
}

async function switchTab(key) {
  if (key === activeTab.value || !isTabAllowed(key)) return
  if (dirty.value && !(await confirmDiscard('切换栏目会丢失当前未保存的修改，确定继续吗？'))) {
    return
  }
  dirty.value = false
  activeTab.value = key
  await router.replace({ query: { ...route.query, tab: key } })
}

function onHomeSaved() {
  dirty.value = false
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
