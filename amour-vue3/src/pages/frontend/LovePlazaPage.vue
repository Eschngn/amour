<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <!--
          顶部提示区：按“访客 / 已登录无空间 / 空间不可用”三种身份各展示一条，
          同一时刻只出现一条，避免堆叠挤压首屏。
        -->
        <section
          v-if="loginPromptVisible"
          class="mb-8 overflow-hidden rounded-2xl border border-rose-100 bg-white/75 px-5 py-4 text-rose-950 shadow-sm shadow-rose-100/50 sm:mb-10 sm:px-6"
          aria-labelledby="plaza-login-prompt"
        >
          <div class="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div class="flex min-w-0 items-start gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-base text-rose-400" aria-hidden="true">♥</span>
              <div class="min-w-0">
                <p id="plaza-login-prompt" class="font-display text-base font-bold leading-6 sm:text-lg">
                  也想拥有一座只属于你们的小宇宙？
                </p>
                <p class="mt-1 text-xs leading-6 text-rose-800/60">
                  登录后就能创建或绑定自己的恋爱空间，把故事、照片和纪念日一起收藏起来。
                </p>
              </div>
            </div>
            <RouterLink
              :to="loginTarget"
              class="inline-flex shrink-0 items-center justify-center gap-1.5 self-stretch rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 sm:self-auto"
            >
              登录后开始
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M5 12h14m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </RouterLink>
          </div>
        </section>

        <section
          v-else-if="showNoSpacePrompt"
          class="mb-8 overflow-hidden rounded-2xl border border-rose-100 bg-white/75 p-5 shadow-sm shadow-rose-100/50 sm:mb-10 sm:p-6"
          aria-labelledby="no-space-prompt-heading"
        >
          <div class="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-start gap-3">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-lg text-rose-400" aria-hidden="true">♥</span>
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">Start Your Space</p>
                <h2 id="no-space-prompt-heading" class="mt-1 break-words font-display text-xl font-bold text-rose-950 sm:text-2xl">
                  还没有恋爱空间，快去创建或绑定一个吧
                </h2>
                <p class="mt-2 max-w-2xl text-xs leading-6 text-rose-800/65 sm:text-sm">
                  创建属于你们自己的小宇宙，或接受另一半的邀请。完成之后，这里就会成为你们共同记录故事、照片和纪念日的地方。
                </p>
              </div>
            </div>
            <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
              <RouterLink
                :to="{ path: '/space/setup', query: { action: 'create' } }"
                class="inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              >
                创建恋爱空间
              </RouterLink>
              <RouterLink
                :to="{ path: '/space/setup', query: { action: 'bind' } }"
                class="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              >
                绑定恋爱空间
              </RouterLink>
            </div>
          </div>
        </section>

        <section
          v-else-if="unavailablePrompt"
          class="mb-8 overflow-hidden rounded-2xl border border-rose-100 bg-white/75 p-5 shadow-sm shadow-rose-100/50 sm:mb-10 sm:p-6"
          :aria-labelledby="`unavailable-prompt-heading`"
        >
          <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-start gap-3">
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
                :class="unavailablePrompt.iconClass"
                aria-hidden="true"
              >{{ unavailablePrompt.icon }}</span>
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">Your Space · {{ unavailablePrompt.badge }}</p>
                <h2 id="unavailable-prompt-heading" class="mt-1 break-words font-display text-xl font-bold text-rose-950 sm:text-2xl">
                  {{ unavailablePrompt.title }}
                </h2>
                <p class="mt-2 max-w-2xl text-xs leading-6 text-rose-800/65 sm:text-sm">
                  {{ unavailablePrompt.description }}
                </p>
              </div>
            </div>
            <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
              <RouterLink
                to="/"
                class="inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              >
                查看空间状态
              </RouterLink>
              <button
                v-if="unavailablePrompt.canRetry"
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                @click="refreshSpaceStatus"
              >
                重新读取空间
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="plaza-heading">
          <header class="mb-6 border-b border-rose-100/80 pb-5 sm:mb-7 sm:pb-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
              <div class="min-w-0">
                <h1 id="plaza-heading" class="font-display text-3xl font-extrabold leading-none tracking-tight text-rose-950 sm:text-4xl">
                  恋爱<span class="accent-text">广场</span>
                </h1>
                <p class="mt-3 max-w-2xl text-xs leading-6 text-rose-800/60 sm:text-sm sm:leading-7">
                  这里展示的是<span class="font-semibold text-rose-700">整个恋爱空间</span>；空间主人可以自行选择公开哪些故事、照片和纪念日。
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-col sm:items-end">
                <span class="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  {{ loading ? '正在寻找公开空间…' : `${formatCount(total)} 个公开空间` }}
                </span>
                <RouterLink
                  v-if="showMySpaceEntry"
                  to="/"
                  class="group inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                >
                  回到我的恋爱空间
                  <svg class="h-3.5 w-3.5 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M5 12h14m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </RouterLink>
              </div>
            </div>

            <p class="mt-4 flex items-start gap-2 rounded-xl bg-rose-50/70 px-3.5 py-3 text-[11px] leading-5 text-rose-700/65 sm:mt-5 sm:px-4">
              <span class="mt-0.5 shrink-0 text-rose-400" aria-hidden="true">✦</span>
              <span>
                这里出现的只有故事、照片和纪念日；留言板与私密内容不会公开。
                <span class="font-medium text-rose-700/85">浏览别人的空间也不会让你加入对方的空间。</span>
              </span>
            </p>
          </header>

          <div v-if="loading" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="正在加载恋爱广场" aria-busy="true">
            <div v-for="n in 6" :key="n" class="animate-pulse overflow-hidden rounded-[1.75rem] border border-rose-100 bg-white/70">
              <div class="aspect-[16/10] bg-rose-100/80" />
              <div class="space-y-3 p-5 sm:p-6">
                <div class="h-6 w-2/3 rounded-full bg-rose-100" />
                <div class="h-3 w-full rounded-full bg-rose-50" />
                <div class="h-3 w-4/5 rounded-full bg-rose-50" />
                <div class="mt-5 h-16 rounded-2xl bg-rose-50" />
              </div>
            </div>
          </div>

          <section
            v-else-if="loadError"
            class="rounded-[1.75rem] border border-rose-100 bg-white/80 px-6 py-16 text-center shadow-sm shadow-rose-100/40"
            role="alert"
          >
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-400">
              <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
                <path d="M10.3 3.8 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3l-7.4-13.2a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <h2 class="mt-4 font-display text-xl font-bold text-rose-950">恋爱广场暂时没有加载出来</h2>
            <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700/55">{{ loadError }}</p>
            <button
              type="button"
              class="mt-5 rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              @click="loadPlaza()"
            >
              重新加载
            </button>
          </section>

          <div
            v-else-if="!spaces.length"
            class="rounded-[1.75rem] border border-dashed border-rose-200 bg-white/55 px-6 py-16 text-center sm:py-20"
          >
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl text-rose-300" aria-hidden="true">♡</div>
            <h2 class="mt-5 font-display text-xl font-semibold text-rose-900">广场还在等待第一束公开的光</h2>
            <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700/55">
              还没有情侣空间把自己的空间公开出来。等有人愿意分享时，这里会慢慢热闹起来。
            </p>
            <div class="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                class="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                @click="loadPlaza()"
              >
                刷新试试
              </button>
              <RouterLink
                v-if="showMySpaceEntry"
                to="/"
                class="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                回到我的恋爱空间
              </RouterLink>
              <RouterLink
                v-else
                to="/"
                class="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-600"
              >
                回到首页
              </RouterLink>
            </div>
          </div>

          <template v-else>
            <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <PublicSpaceCard v-for="space in spaces" :key="space.spaceId" :space="space" />
            </div>

            <div v-if="hasMore" class="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                :disabled="loadingMore"
                @click="loadMore"
              >
                <span
                  v-if="loadingMore"
                  class="h-4 w-4 animate-spin rounded-full border-2 border-rose-200 border-t-rose-500"
                  aria-hidden="true"
                />
                {{ loadingMore ? '正在加载…' : '加载更多公开空间' }}
              </button>
              <p v-if="loadMoreError" class="max-w-md text-center text-xs leading-5 text-rose-500" role="alert">
                {{ loadMoreError }}
                <button type="button" class="ml-1 font-semibold underline underline-offset-2 hover:text-rose-700" @click="loadMore">
                  重试
                </button>
              </p>
            </div>

            <p v-else-if="spaces.length" class="mt-8 text-center text-xs text-rose-400/70">
              已经看完所有公开空间啦，也可以回去继续写自己的故事。
            </p>
          </template>
        </section>
      </div>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import PublicSpaceCard from '@/components/frontend/PublicSpaceCard.vue'
import { fetchPublicSpaces } from '@/api/gallery'
import { frontendLoggedIn } from '@/utils/auth'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { SPACE_STATUS } from '@/utils/spaceState'
import { isUnavailableSpace, readSpaceErrorMessage } from '@/utils/spaceState'
import { formatCount } from '@/utils/spaceFormat'

const route = useRoute()
const {
  isSpaceReady,
  hasCoupleSpace,
  spaceStatus,
  spaceLoading,
  spaceError,
  refreshSpaceStatus,
} = useFrontendSpace()

/**
 * 只有登录且空间处于可正常进入的状态时，才提供“回到我的恋爱空间”入口。
 * 未登录、没有空间、空间冻结或归档都统一回到首页，避免把用户送进状态面板。
 */
const showMySpaceEntry = computed(() => isSpaceReady.value)

/**
 * 顶部提示条按身份互斥展示，同一时刻只出现一条：
 * 1. 未登录：引导登录后创建空间（原来详情页右侧的第一张卡片）。
 * 2. 已登录但没有空间：引导创建/绑定。
 * 3. 已登录但空间冻结/归档/待绑定，或状态读取失败：提示当前空间状态。
 */
const loginPromptVisible = computed(() => !frontendLoggedIn.value)

const showNoSpacePrompt = computed(() => (
  frontendLoggedIn.value
  && !spaceLoading.value
  && !spaceError.value
  && !hasCoupleSpace.value
))

const loginTarget = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath },
}))

const unavailablePrompt = computed(() => {
  if (!frontendLoggedIn.value) return null
  if (spaceLoading.value && !spaceStatus.value) return null

  // 网络异常但没有缓存空间：只提示重试，不误判为“没有空间”。
  if (spaceError.value && !spaceStatus.value) {
    return {
      icon: '!',
      iconClass: 'bg-sky-100 text-sky-500',
      badge: 'Unavailable',
      title: '恋爱空间状态暂时没有读取出来',
      description: spaceError.value,
      canRetry: true,
    }
  }

  if (!hasCoupleSpace.value) return null

  // 绑定成功（status=1）后空间就是可用的：此时不该再出现任何“不可用”提示，
  // 入口交给右上角的“回到我的恋爱空间”。这一步必须先于下面的状态兜底判断，
  // 否则正常空间会掉进最后的未映射分支，被误报为 Unavailable。
  if (!isUnavailableSpace(spaceStatus.value)) return null

  const status = Number(spaceStatus.value?.status)
  const spaceName = spaceStatus.value?.spaceName || '你的恋爱空间'

  if (status === SPACE_STATUS.WAITING) {
    return {
      icon: '◷',
      iconClass: 'bg-amber-100 text-amber-500',
      badge: 'Waiting For Partner',
      title: `${spaceName} 还在等待另一半加入`,
      description: '空间已经准备好了，等对方接受邀请后，就可以一起使用故事、相册和纪念日。',
      canRetry: false,
    }
  }
  if (status === SPACE_STATUS.FROZEN) {
    return {
      icon: '❄',
      iconClass: 'bg-sky-100 text-sky-500',
      badge: 'Frozen',
      title: `${spaceName} 已冻结`,
      description: '空间内容暂时不可用。你可以进入空间查看状态，或稍后重新读取。',
      canRetry: true,
    }
  }
  if (status === SPACE_STATUS.ARCHIVED) {
    return {
      icon: '▣',
      iconClass: 'bg-slate-100 text-slate-500',
      badge: 'Archived',
      title: `${spaceName} 已归档`,
      description: '这个空间已经归档，私人内容不会继续加载。你仍然可以浏览恋爱广场里别人公开的空间。',
      canRetry: false,
    }
  }
  return {
    icon: '!',
    iconClass: 'bg-sky-100 text-sky-500',
    badge: 'Unavailable',
    title: `${spaceName} 暂时不可用`,
    description: '当前空间状态无法进入，你可以到空间页面查看详情，或稍后重试。',
    canRetry: true,
  }
})

const PAGE_SIZE = 9

const spaces = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref('')
const loadMoreError = ref('')
const total = ref(0)
const current = ref(1)
let requestInFlight = false

const hasMore = computed(() => !loading.value && spaces.value.length < total.value)

function fallbackMessage(error) {
  return readSpaceErrorMessage(error, '恋爱广场加载失败，请稍后重试')
}

async function loadPlaza({ reset = true } = {}) {
  if (requestInFlight) return
  requestInFlight = true

  if (reset) {
    loading.value = true
    loadError.value = ''
    loadMoreError.value = ''
    spaces.value = []
    total.value = 0
    current.value = 1
  } else {
    loadingMore.value = true
    loadMoreError.value = ''
  }

  const target = reset ? 1 : current.value + 1

  try {
    const { data } = await fetchPublicSpaces({ current: target, size: PAGE_SIZE })
    if (!data?.success) {
      throw new Error(data?.message || '恋爱广场加载失败')
    }
    if (!data.data || !Array.isArray(data.data.records)) {
      throw new Error('恋爱广场返回数据格式异常')
    }

    const records = data.data.records
    spaces.value = reset ? records : [...spaces.value, ...records]
    current.value = Number(data.data.current) || target
    total.value = Number(data.data.total) || spaces.value.length
  } catch (error) {
    if (reset) {
      loadError.value = fallbackMessage(error)
    } else {
      loadMoreError.value = fallbackMessage(error)
    }
  } finally {
    requestInFlight = false
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  loadPlaza({ reset: false })
}

onMounted(() => loadPlaza())
</script>

<style scoped>
.accent-text {
  background: linear-gradient(105deg, #9f1239 5%, #e11d48 54%, #db2777 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
</style>
