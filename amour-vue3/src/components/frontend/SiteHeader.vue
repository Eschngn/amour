<template>
  <header
    class="sticky top-0 z-40 border-b border-rose-100/90 bg-white/80 shadow-sm shadow-rose-100/50 backdrop-blur-xl"
  >
    <div
      class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
    >
      <RouterLink
        to="/"
        class="group flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-rose-950 sm:text-xl"
      >
        <span
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 text-base text-white shadow-md shadow-rose-300/60 transition group-hover:scale-105"
          aria-hidden="true"
        >♥</span>
        <span class="text-rose-500">我们俩</span>
      </RouterLink>

      <nav
        class="hidden items-center gap-8 text-sm font-medium text-rose-800/70 md:flex"
        aria-label="主导航"
      >
        <RouterLink
          to="/story"
          class="transition hover:text-rose-600"
          active-class="font-semibold text-rose-600"
        >
          我们的故事
        </RouterLink>
        <RouterLink
          to="/message"
          class="transition hover:text-rose-600"
          active-class="font-semibold text-rose-600"
        >
          留言板
        </RouterLink>
        <RouterLink
          to="/photo"
          class="transition hover:text-rose-600"
          active-class="font-semibold text-rose-600"
        >
          相册
        </RouterLink>
        <RouterLink
          to="/anniversary"
          class="transition hover:text-rose-600"
          active-class="font-semibold text-rose-600"
        >
          纪念日
        </RouterLink>
      </nav>

      <div class="flex shrink-0 items-center gap-2 sm:gap-3">
        <RouterLink
          v-if="!frontendLoggedIn"
          to="/login"
          class="rounded-full border border-rose-200 bg-white/90 px-3 py-2 text-sm font-medium text-rose-700/90 shadow-sm transition hover:border-rose-300 hover:bg-rose-50/90 hover:text-rose-600 sm:px-4"
        >
          登录
        </RouterLink>
        <div
          v-else
          class="relative"
        >
          <button
            ref="triggerRef"
            type="button"
            class="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/80 py-1.5 pl-1.5 pr-3 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 sm:pr-4"
            @click="toggleDropdown"
          >
            <span class="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-[10px] font-bold text-white">
              {{ initials(frontendDisplayName || frontendUsername) }}
              <img v-if="frontendAvatar" :src="frontendAvatar" alt="" class="absolute inset-0 h-full w-full object-cover" @load="$event.currentTarget.style.display = ''" @error="$event.currentTarget.style.display = 'none'">
            </span>
            <span class="max-w-24 truncate">{{ frontendDisplayName || frontendUsername }}</span>
            <svg
              class="h-3.5 w-3.5 text-rose-400 transition"
              :class="{ 'rotate-180': dropdownOpen }"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <nav
      class="mobile-nav flex items-center gap-1 overflow-x-auto border-t border-rose-100/70 px-4 pb-2 pt-2 text-xs font-semibold text-rose-700/65 md:hidden"
      aria-label="移动端主导航"
    >
      <RouterLink
        to="/story"
        class="shrink-0 rounded-full px-3 py-1.5 transition hover:bg-rose-50 hover:text-rose-600"
        active-class="bg-rose-100/80 text-rose-600"
      >
        我们的故事
      </RouterLink>
      <RouterLink
        to="/photo"
        class="shrink-0 rounded-full px-3 py-1.5 transition hover:bg-rose-50 hover:text-rose-600"
        active-class="bg-rose-100/80 text-rose-600"
      >
        相册
      </RouterLink>
      <RouterLink
        to="/anniversary"
        class="shrink-0 rounded-full px-3 py-1.5 transition hover:bg-rose-50 hover:text-rose-600"
        active-class="bg-rose-100/80 text-rose-600"
      >
        纪念日
      </RouterLink>
      <RouterLink
        to="/message"
        class="shrink-0 rounded-full px-3 py-1.5 transition hover:bg-rose-50 hover:text-rose-600"
        active-class="bg-rose-100/80 text-rose-600"
      >
        留言板
      </RouterLink>
    </nav>

    <!-- 下拉菜单挂到 body，避免被 Scaffold 的 overflow / 装饰层拦截点击 -->
    <Teleport to="body">
      <div
        v-if="dropdownOpen"
        ref="dropdownRef"
        :style="dropdownStyle"
        class="fixed z-[9999] pt-2"
      >
        <div class="min-w-[120px] rounded-xl border border-rose-100 bg-white p-1.5 shadow-lg shadow-rose-100/40">
          <RouterLink
            to="/profile"
            class="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
            @click="dropdownOpen = false"
          >
            个人设置
          </RouterLink>
          <button
            type="button"
            class="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50 cursor-pointer"
            @click="onLogout"
          >
            退出登录
          </button>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/axios'
import {
  clearFrontendSession,
  frontendDisplayName,
  frontendLoggedIn,
  frontendAvatar,
  frontendUsername,
} from '@/utils/auth'

const router = useRouter()

const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const triggerRef = ref(null)
const dropdownStyle = ref({})

function initials(name) {
  return String(name || '恋人').trim().slice(0, 2).toUpperCase()
}

/** 根据 trigger 按钮位置计算下拉菜单位置 */
function updateDropdownPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    top: rect.bottom + 8 + 'px',
    right: (window.innerWidth - rect.right) + 'px',
  }
}

async function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
  if (dropdownOpen.value) {
    await nextTick()
    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    window.addEventListener('scroll', updateDropdownPosition, true)
  } else {
    window.removeEventListener('resize', updateDropdownPosition)
    window.removeEventListener('scroll', updateDropdownPosition, true)
  }
}

/** 点击外部关闭下拉菜单 */
function onDocumentClick(e) {
  if (!dropdownOpen.value) return
  if (dropdownRef.value && dropdownRef.value.contains(e.target)) return
  if (triggerRef.value && triggerRef.value.contains(e.target)) return
  dropdownOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('resize', updateDropdownPosition)
  window.removeEventListener('scroll', updateDropdownPosition, true)
})

async function onLogout() {
  dropdownOpen.value = false
  try {
    await api.post('/login/logout')
  } catch {
    // 即使服务端 token 已失效，也要清理本地会话
  } finally {
    clearFrontendSession()
    router.push('/')
  }
}
</script>

<style scoped>
.mobile-nav {
  scrollbar-width: none;
}

.mobile-nav::-webkit-scrollbar {
  display: none;
}
</style>
