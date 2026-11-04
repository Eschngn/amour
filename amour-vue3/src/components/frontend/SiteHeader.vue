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
        <span class="text-rose-500">恋语间</span>
      </RouterLink>

      <nav
        class="hidden items-center gap-0.5 text-sm font-medium text-rose-800/70 md:flex lg:gap-1"
        aria-label="主导航"
      >
        <RouterLink
          to="/plaza"
          class="nav-link"
          :class="{ 'nav-link-active': isPlazaSection }"
        >
          恋爱广场
        </RouterLink>
        <RouterLink
          v-if="isSpaceReady"
          to="/"
          class="nav-link"
          :class="{ 'nav-link-active': isHomeSection }"
        >
          我的情侣空间
        </RouterLink>
        <RouterLink
          v-if="isSpaceReady && hasFrontendQueryPermission('story')"
          to="/story"
          class="nav-link"
          :class="{ 'nav-link-active': isSection('/story') }"
        >
          我们的故事
        </RouterLink>
        <RouterLink
          v-if="isSpaceReady && hasFrontendQueryPermission('message')"
          to="/message"
          class="nav-link"
          :class="{ 'nav-link-active': isSection('/message') }"
        >
          留言板
        </RouterLink>
        <RouterLink
          v-if="isSpaceReady && hasFrontendQueryPermission('photo')"
          to="/photo"
          class="nav-link"
          :class="{ 'nav-link-active': isSection('/photo') }"
        >
          相册
        </RouterLink>
        <RouterLink
          v-if="isSpaceReady && hasFrontendQueryPermission('anniversary')"
          to="/anniversary"
          class="nav-link"
          :class="{ 'nav-link-active': isSection('/anniversary') }"
        >
          纪念日
        </RouterLink>
        <RouterLink
          v-if="showSetupEntry"
          to="/space/setup"
          class="nav-link"
          :class="{ 'nav-link-active': isSection('/space/setup') }"
        >
          {{ setupLabel }}
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
      class="mobile-nav flex items-center gap-1.5 overflow-x-auto border-t border-rose-100/70 px-4 pb-2.5 pt-2 text-xs font-semibold text-rose-700/65 md:hidden"
      aria-label="移动端主导航"
    >
      <RouterLink
        to="/plaza"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isPlazaSection }"
      >
        恋爱广场
      </RouterLink>
      <RouterLink
        v-if="isSpaceReady"
        to="/"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isHomeSection }"
      >
        我的情侣空间
      </RouterLink>
      <RouterLink
        v-if="isSpaceReady && hasFrontendQueryPermission('story')"
        to="/story"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/story') }"
      >
        我们的故事
      </RouterLink>
      <RouterLink
        v-if="isSpaceReady && hasFrontendQueryPermission('photo')"
        to="/photo"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/photo') }"
      >
        相册
      </RouterLink>
      <RouterLink
        v-if="isSpaceReady && hasFrontendQueryPermission('anniversary')"
        to="/anniversary"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/anniversary') }"
      >
        纪念日
      </RouterLink>
      <RouterLink
        v-if="isSpaceReady && hasFrontendQueryPermission('message')"
        to="/message"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/message') }"
      >
        留言板
      </RouterLink>
      <RouterLink
        v-if="showSetupEntry"
        to="/space/setup"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/space/setup') }"
      >
        {{ setupLabel }}
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
            v-if="isSpaceReady"
            to="/"
            class="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
            @click="dropdownOpen = false"
          >
            我的情侣空间
          </RouterLink>
          <RouterLink
            v-else-if="showSetupEntry"
            to="/space/setup"
            class="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
            @click="dropdownOpen = false"
          >
            {{ setupLabel }}
          </RouterLink>
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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/axios'
import {
  clearFrontendSession,
  frontendDisplayName,
  frontendLoggedIn,
  frontendAvatar,
  frontendUsername,
  hasFrontendQueryPermission,
} from '@/utils/auth'
import { useFrontendSpace } from '@/composables/useFrontendSpace'

const router = useRouter()
const route = useRoute()

/**
 * RouterLink 自带的 active-class 只能匹配“当前路由记录及其父记录”，
 * 而 /plaza/:spaceId、/story/:id 这类详情页是平级路由，不会点亮列表页入口。
 * 因此导航高亮统一按路径前缀判断，详情页也能正确归属到所属栏目。
 */
function isSection(prefix) {
  const path = route.path || '/'
  return path === prefix || path.startsWith(`${prefix}/`)
}

const isPlazaSection = computed(() => isSection('/plaza'))
// 首页同时承载“我的情侣空间”和广场兜底，只有停留在根路径时才高亮这一项。
const isHomeSection = computed(() => route.path === '/')
const {
  isSpaceReady,
  hasCoupleSpace,
  spaceStatus,
  spaceLoading,
  spaceError,
  isSpaceStatusUnknown,
  clearSpaceStatus,
} = useFrontendSpace()

const showSetupEntry = computed(() => {
  if (!frontendLoggedIn.value || isSpaceReady.value) return false
  // status=0（等待绑定）也属于“已有空间”，必须保留入口去管理邀请。
  if (hasCoupleSpace.value) return true
  // 状态尚未确认时不要展示“没有空间”入口，避免网络问题造成误判。
  if (spaceLoading.value || spaceError.value || isSpaceStatusUnknown.value) return false
  return !spaceStatus.value
})
const setupLabel = computed(() => (
  hasCoupleSpace.value ? '空间状态' : '创建/绑定情侣空间'
))

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
    clearSpaceStatus()
    clearFrontendSession()
    router.push('/plaza')
  }
}
</script>

<style scoped>
/* 桌面端导航项：默认图标式文字，选中时加粗、加深并出现渐变下划线 */
.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  color: rgb(136 19 55 / 0.62);
  transition: color 0.2s ease, background-color 0.2s ease;
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  bottom: 0.15rem;
  height: 2px;
  border-radius: 9999px;
  background: linear-gradient(90deg, #fb7185 0%, #f43f5e 50%, #db2777 100%);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.24s ease;
}

.nav-link:hover {
  color: rgb(225 29 72);
  background-color: rgb(255 241 242 / 0.75);
}

.nav-link:focus-visible {
  outline: 2px solid #fb7185;
  outline-offset: 2px;
}

.nav-link-active {
  font-weight: 700;
  color: rgb(190 18 60);
  background-color: rgb(255 241 242 / 0.9);
}

.nav-link-active::after {
  transform: scaleX(1);
}

/* 移动端导航项：用实心胶囊 + 下划线双重强调 */
.mobile-nav-link {
  position: relative;
  flex-shrink: 0;
  padding: 0.4rem 0.75rem 0.5rem;
  border-radius: 9999px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.mobile-nav-link:hover {
  color: rgb(225 29 72);
  background-color: rgb(255 241 242 / 0.8);
}

.mobile-nav-link:focus-visible {
  outline: 2px solid #fb7185;
  outline-offset: 2px;
}

.mobile-nav-link-active {
  color: #be123c;
  background-color: #ffe4e6;
  font-weight: 700;
}

.mobile-nav-link-active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0.1rem;
  height: 2px;
  width: 1.1rem;
  transform: translateX(-50%);
  border-radius: 9999px;
  background: linear-gradient(90deg, #fb7185, #db2777);
}

.mobile-nav {
  scrollbar-width: none;
}

.mobile-nav::-webkit-scrollbar {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .nav-link::after,
  .nav-link,
  .mobile-nav-link {
    transition: none;
  }
}
</style>
