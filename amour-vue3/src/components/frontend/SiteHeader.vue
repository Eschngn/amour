<template>
  <header
    class="sticky top-0 z-40 border-b border-stone-200/80 bg-[#fcfaf7]/90 backdrop-blur-xl"
  >
    <div
      class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
    >
      <RouterLink
        to="/"
        class="group flex shrink-0 items-center gap-2.5"
      >
        <span
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-base text-white transition group-hover:bg-rose-700"
          aria-hidden="true"
        >♥</span>
        <span class="flex flex-col leading-none">
          <span class="font-display text-base font-bold tracking-wide text-stone-900 sm:text-lg">恋语间</span>
          <span class="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400 sm:block">Amour</span>
        </span>
      </RouterLink>

      <nav
        class="hidden min-w-0 items-center gap-0.5 lg:flex"
        aria-label="主导航"
      >
        <RouterLink
          to="/plaza"
          class="nav-link"
          :class="{ 'nav-link-active': isPlazaSection }"
          :aria-current="isPlazaSection ? 'page' : undefined"
        >
          恋爱广场
        </RouterLink>
        <RouterLink
          v-if="isSpaceReady"
          to="/"
          class="nav-link"
          :class="{ 'nav-link-active': isHomeSection }"
          :aria-current="isHomeSection ? 'page' : undefined"
        >
          我的情侣空间
        </RouterLink>
        <RouterLink
          v-if="isSpaceReady && hasFrontendQueryPermission('story')"
          to="/story"
          class="nav-link"
          :class="{ 'nav-link-active': isSection('/story') }"
          :aria-current="isSection('/story') ? 'page' : undefined"
        >
          我们的故事
        </RouterLink>
        <RouterLink
          v-if="isSpaceReady && hasFrontendQueryPermission('message')"
          to="/message"
          class="nav-link"
          :class="{ 'nav-link-active': isSection('/message') }"
          :aria-current="isSection('/message') ? 'page' : undefined"
        >
          留言板
        </RouterLink>
        <RouterLink
          v-if="isSpaceReady && hasFrontendQueryPermission('photo')"
          to="/photo"
          class="nav-link"
          :class="{ 'nav-link-active': isSection('/photo') }"
          :aria-current="isSection('/photo') ? 'page' : undefined"
        >
          相册
        </RouterLink>
        <RouterLink
          v-if="isSpaceReady && hasFrontendQueryPermission('anniversary')"
          to="/anniversary"
          class="nav-link"
          :class="{ 'nav-link-active': isSection('/anniversary') }"
          :aria-current="isSection('/anniversary') ? 'page' : undefined"
        >
          纪念日
        </RouterLink>

        <span
          v-if="canOpenStudio || showSpaceEntry"
          class="mx-2 h-5 w-px shrink-0 bg-stone-200"
          aria-hidden="true"
        />

        <RouterLink
          v-if="canOpenStudio"
          to="/space/studio"
          class="nav-link-utility"
          :class="{ 'nav-link-utility-active': isSection('/space/studio') }"
          :aria-current="isSection('/space/studio') ? 'page' : undefined"
        >
          空间编辑
        </RouterLink>
        <RouterLink
          v-if="showSpaceEntry"
          to="/space/setup"
          class="nav-link-utility"
          :class="{ 'nav-link-utility-active': isSection('/space/setup') }"
          :aria-current="isSection('/space/setup') ? 'page' : undefined"
        >
          {{ spaceEntryLabel }}
        </RouterLink>
      </nav>

      <div class="flex shrink-0 items-center gap-2">
        <RouterLink
          v-if="!frontendLoggedIn"
          to="/login"
          class="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 transition hover:border-rose-300 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 sm:px-4"
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
            class="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
            aria-haspopup="menu"
            :aria-expanded="dropdownOpen ? 'true' : 'false'"
            :aria-label="`打开 ${frontendDisplayName || frontendUsername || '用户'} 的账号菜单`"
            @click="toggleDropdown"
            @keydown.esc="dropdownOpen = false"
          >
            <span class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-600 text-[10px] font-bold text-white">
              {{ initials(frontendDisplayName || frontendUsername) }}
              <img v-if="frontendAvatar" :src="frontendAvatar" alt="" class="absolute inset-0 h-full w-full object-cover" @load="$event.currentTarget.style.display = ''" @error="$event.currentTarget.style.display = 'none'">
            </span>
            <span class="hidden max-w-24 truncate sm:block">{{ frontendDisplayName || frontendUsername }}</span>
            <svg
              class="h-3.5 w-3.5 text-stone-400 transition"
              :class="{ 'rotate-180': dropdownOpen }"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <nav
      class="mobile-nav flex items-center gap-1 overflow-x-auto border-t border-stone-200/70 px-4 pb-2.5 pt-2 text-xs font-semibold text-stone-600 lg:hidden"
      aria-label="移动端主导航"
    >
      <RouterLink
        to="/plaza"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isPlazaSection }"
        :aria-current="isPlazaSection ? 'page' : undefined"
      >
        恋爱广场
      </RouterLink>
      <RouterLink
        v-if="isSpaceReady"
        to="/"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isHomeSection }"
        :aria-current="isHomeSection ? 'page' : undefined"
      >
        我的情侣空间
      </RouterLink>
      <RouterLink
        v-if="isSpaceReady && hasFrontendQueryPermission('story')"
        to="/story"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/story') }"
        :aria-current="isSection('/story') ? 'page' : undefined"
      >
        我们的故事
      </RouterLink>
      <RouterLink
        v-if="isSpaceReady && hasFrontendQueryPermission('photo')"
        to="/photo"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/photo') }"
        :aria-current="isSection('/photo') ? 'page' : undefined"
      >
        相册
      </RouterLink>
      <RouterLink
        v-if="isSpaceReady && hasFrontendQueryPermission('anniversary')"
        to="/anniversary"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/anniversary') }"
        :aria-current="isSection('/anniversary') ? 'page' : undefined"
      >
        纪念日
      </RouterLink>
      <RouterLink
        v-if="isSpaceReady && hasFrontendQueryPermission('message')"
        to="/message"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/message') }"
        :aria-current="isSection('/message') ? 'page' : undefined"
      >
        留言板
      </RouterLink>
      <RouterLink
        v-if="canOpenStudio"
        to="/space/studio"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/space/studio') }"
        :aria-current="isSection('/space/studio') ? 'page' : undefined"
      >
        空间编辑
      </RouterLink>
      <RouterLink
        v-if="showSpaceEntry"
        to="/space/setup"
        class="mobile-nav-link"
        :class="{ 'mobile-nav-link-active': isSection('/space/setup') }"
        :aria-current="isSection('/space/setup') ? 'page' : undefined"
      >
        {{ spaceEntryLabel }}
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
        <div
          class="min-w-[140px] rounded-xl border border-stone-200 bg-white p-1.5 shadow-sm"
          role="menu"
          @keydown.esc="dropdownOpen = false"
        >
          <RouterLink
            v-if="isSpaceReady"
            to="/"
            role="menuitem"
            class="dropdown-link"
            @click="dropdownOpen = false"
          >
            我的情侣空间
          </RouterLink>
          <RouterLink
            v-if="canOpenStudio"
            to="/space/studio"
            role="menuitem"
            class="dropdown-link"
            @click="dropdownOpen = false"
          >
            空间编辑
          </RouterLink>
          <RouterLink
            v-if="showSpaceEntry"
            to="/space/setup"
            role="menuitem"
            class="dropdown-link"
            @click="dropdownOpen = false"
          >
            {{ spaceEntryLabel }}
          </RouterLink>
          <RouterLink
            to="/profile"
            role="menuitem"
            class="dropdown-link"
            @click="dropdownOpen = false"
          >
            个人设置
          </RouterLink>
          <div class="my-1 h-px bg-stone-100" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            class="dropdown-link w-full cursor-pointer text-left"
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
import { canEditSpaceContent, isUnboundSpace } from '@/utils/spaceState'

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

/**
 * 空间状态与空间设置已合并到 /space/setup：
 * - 有未解绑空间时显示“空间设置”；
 * - 没有有效空间或已完成解绑时显示“创建/绑定情侣空间”。
 */
const showSpaceEntry = computed(() => {
  if (!frontendLoggedIn.value) return false
  if (spaceLoading.value || spaceError.value || isSpaceStatusUnknown.value) return false
  return hasCoupleSpace.value || !spaceStatus.value
})
const spaceEntryLabel = computed(() => (
  hasCoupleSpace.value && !isUnboundSpace(spaceStatus.value)
    ? '空间设置'
    : '创建/绑定情侣空间'
))
// 等待绑定与正常状态的有效成员可以进入空间内容编辑。
const canOpenStudio = computed(() => (
  frontendLoggedIn.value && canEditSpaceContent(spaceStatus.value)
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
/* 桌面端主导航：中性文字 + 当前栏目短下划线，不使用整块胶囊背景 */
.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 0.7rem;
  border-radius: 0.5rem;
  color: #57534e;
  font-weight: 500;
  transition: color 0.18s ease;
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 0.7rem;
  right: 0.7rem;
  bottom: 0.1rem;
  height: 2px;
  border-radius: 9999px;
  background: #e11d48;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.2s ease;
}

.nav-link:hover {
  color: #be123c;
}

.nav-link:focus-visible {
  outline: 2px solid #fb7185;
  outline-offset: 2px;
}

.nav-link-active {
  color: #be123c;
  font-weight: 700;
}

.nav-link-active::after {
  transform: scaleX(1);
}

/* 空间管理入口：与内容导航做轻度区分，但不做成独立卡片 */
.nav-link-utility {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.65rem;
  border-radius: 0.5rem;
  color: #78716c;
  font-size: 0.72rem;
  font-weight: 600;
  transition: color 0.18s ease, background-color 0.18s ease;
}

.nav-link-utility:hover {
  color: #be123c;
  background-color: #f5f5f4;
}

.nav-link-utility:focus-visible {
  outline: 2px solid #fb7185;
  outline-offset: 2px;
}

.nav-link-utility-active {
  color: #be123c;
  background-color: #fff1f2;
}

/* 移动端导航：横向滚动，当前项用浅底与文字加深 */
.mobile-nav-link {
  flex-shrink: 0;
  padding: 0.4rem 0.7rem;
  border-radius: 0.5rem;
  color: #57534e;
  transition: color 0.18s ease, background-color 0.18s ease;
}

.mobile-nav-link:hover {
  color: #be123c;
  background-color: #f5f5f4;
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

.mobile-nav {
  scrollbar-width: none;
}

.mobile-nav::-webkit-scrollbar {
  display: none;
}

.dropdown-link {
  display: block;
  width: 100%;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: #44403c;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.dropdown-link:hover,
.dropdown-link:focus-visible {
  background-color: #fff1f2;
  color: #be123c;
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .nav-link::after,
  .nav-link,
  .nav-link-utility,
  .mobile-nav-link {
    transition: none;
  }
}
</style>
