<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <section
          v-if="showNoSpacePrompt"
          class="relative mb-9 overflow-hidden rounded-[2rem] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-rose-50 to-white p-5 shadow-lg shadow-amber-100/40 sm:mb-10 sm:p-6"
          aria-labelledby="no-space-prompt-heading"
        >
          <div class="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-100/70 blur-2xl" aria-hidden="true" />
          <div class="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-start gap-3">
              <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-xl text-rose-400 shadow-sm" aria-hidden="true">♥</span>
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-600/80">Start Your Space</p>
                <h2 id="no-space-prompt-heading" class="mt-1 break-words font-display text-xl font-bold text-rose-950 sm:text-2xl">
                  还没有情侣空间，快去创建或绑定一个吧
                </h2>
                <p class="mt-2 max-w-2xl text-xs leading-6 text-rose-800/55 sm:text-sm">
                  创建属于你们自己的小宇宙，或接受另一半的邀请。完成之后，这里就会成为你们共同记录故事、照片和纪念日的地方。
                </p>
              </div>
            </div>
            <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
              <RouterLink
                :to="{ path: '/space/setup', query: { action: 'create' } }"
                class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              >
                创建情侣空间
              </RouterLink>
              <RouterLink
                :to="{ path: '/space/setup', query: { action: 'bind' } }"
                class="inline-flex items-center justify-center rounded-full border border-amber-300/80 bg-white/80 px-5 py-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              >
                绑定情侣空间
              </RouterLink>
            </div>
          </div>
        </section>

        <section aria-labelledby="plaza-heading">
          <header class="mb-6 flex flex-col gap-4 border-b border-rose-100/80 pb-5 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
            <div class="min-w-0">
              <p class="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-rose-400">
                <span class="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
                Love Plaza
              </p>
              <h1 id="plaza-heading" class="mt-2.5 font-display text-3xl font-extrabold tracking-tight text-rose-950 sm:text-4xl">
                恋爱<span class="accent-text">广场</span>
              </h1>
              <p class="mt-2 max-w-xl text-xs leading-6 text-rose-700/50 sm:text-sm">
                被公开出来的是情侣空间本身。每个空间里展示哪些故事、照片和纪念日，由空间主人自己决定。
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <span class="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white/75 px-3.5 py-2 text-xs font-semibold text-rose-600 shadow-sm">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                {{ loading ? '正在寻找公开空间…' : `${formatCount(total)} 个公开空间` }}
              </span>
              <RouterLink
                v-if="showMySpaceEntry"
                to="/"
                class="group inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              >
                回到我的恋爱空间
                <svg class="h-3.5 w-3.5 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M5 12h14m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </RouterLink>
            </div>
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
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import PublicSpaceCard from '@/components/frontend/PublicSpaceCard.vue'
import { fetchPublicSpaces } from '@/api/gallery'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { readSpaceErrorMessage } from '@/utils/spaceState'
import { formatCount } from '@/utils/spaceFormat'

defineProps({
  showNoSpacePrompt: {
    type: Boolean,
    default: false,
  },
})

/**
 * 只有登录且空间处于可正常进入的状态时，才提供“回到我的恋爱空间”入口。
 * 未登录、没有空间、空间冻结或归档都统一回到首页，避免把用户送进状态面板。
 */
const { isSpaceReady } = useFrontendSpace()
const showMySpaceEntry = computed(() => isSpaceReady.value)

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
