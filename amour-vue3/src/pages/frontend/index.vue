<template>
  <CouplePageScaffold v-if="showInitialSkeleton">
    <main class="relative z-10" aria-busy="true" aria-label="正在确认你的情侣空间">
      <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div class="mb-6 h-24 animate-pulse rounded-2xl border border-rose-100 bg-white/50 sm:h-28" />
        <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div v-for="n in 6" :key="n" class="h-72 animate-pulse rounded-[1.75rem] border border-rose-100 bg-white/55" />
        </div>
      </div>
    </main>
  </CouplePageScaffold>

  <CouplePageScaffold v-else-if="showStatusError">
    <main class="relative z-10">
      <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <section class="rounded-[2rem] border border-rose-100 bg-white/80 px-6 py-14 text-center shadow-lg shadow-rose-100/40" role="alert">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-400">
            <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
              <path d="M10.3 3.8 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3l-7.4-13.2a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h1 class="mt-5 font-display text-2xl font-bold text-rose-950 sm:text-3xl">情侣空间状态暂时没有读取出来</h1>
          <p class="mx-auto mt-3 max-w-md text-sm leading-7 text-rose-700/55">{{ spaceError }}</p>
          <p class="mx-auto mt-2 max-w-md text-xs leading-6 text-rose-500/60">
            这不代表你没有情侣空间，可能只是网络或服务暂时不可用。可以重试，或先去恋爱广场看看。
          </p>
          <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-rose-300/40 transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              @click="refreshSpaceStatus"
            >
              重新读取空间状态
            </button>
            <RouterLink
              to="/plaza"
              class="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            >
              先逛逛恋爱广场
            </RouterLink>
          </div>
        </section>
      </div>
    </main>
  </CouplePageScaffold>

  <LovePlazaPage v-else-if="isPlazaMode" />

  <MyCoupleSpaceHome v-else :key="viewMode" />
</template>

<script setup>
import { computed } from 'vue'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import LovePlazaPage from '@/pages/frontend/LovePlazaPage.vue'
import MyCoupleSpaceHome from '@/pages/frontend/MyCoupleSpaceHome.vue'
import { frontendLoggedIn } from '@/utils/auth'
import { useFrontendSpace } from '@/composables/useFrontendSpace'

const {
  spaceStatus,
  spaceLoading,
  spaceError,
  viewMode,
  refreshSpaceStatus,
} = useFrontendSpace()

/**
 * 登录用户首次进入时先展示稳定的加载骨架，避免 plaza -> private 闪动。
 * 匿名用户不需要确认空间状态，直接进入广场。
 */
const showInitialSkeleton = computed(() => (
  frontendLoggedIn.value
  && spaceLoading.value
  && !spaceStatus.value
  && !spaceError.value
))

/**
 * 状态读取失败且没有任何缓存空间时，展示可重试错误页。
 * 不能把失败误判为“没有情侣空间”。
 */
const showStatusError = computed(() => (
  frontendLoggedIn.value
  && !spaceLoading.value
  && Boolean(spaceError.value)
  && !spaceStatus.value
))

const isPlazaMode = computed(() => viewMode.value === 'plaza')
</script>
