<template>
  <aside
    class="admin-sidebar fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col text-slate-300 transition-[width,transform] duration-300 ease-out lg:relative lg:z-20 lg:translate-x-0"
    :class="[
      open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
      collapsed ? 'lg:w-[88px]' : 'lg:w-[248px]',
    ]"
    aria-label="后台主导航"
  >
    <div class="flex h-[72px] shrink-0 items-center border-b border-white/[0.07] px-5">
      <RouterLink to="/admin/story" class="group flex min-w-0 items-center gap-3" @click="$emit('close')">
        <span
          class="logo-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-lg shadow-rose-950/30"
          aria-hidden="true"
        >A</span>
        <div class="min-w-0 transition-opacity" :class="{ 'lg:hidden': collapsed }">
          <p class="truncate text-[15px] font-semibold tracking-wide text-white">Amour</p>
          <p class="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Content studio
          </p>
        </div>
      </RouterLink>
      <button
        type="button"
        class="ml-auto rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
        aria-label="关闭导航菜单"
        @click="$emit('close')"
      >
        <Close class="h-5 w-5" />
      </button>
    </div>

    <nav class="admin-nav flex-1 overflow-y-auto px-3 py-5">
      <p
        class="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600"
        :class="{ 'lg:text-center lg:px-0': collapsed }"
      >
        {{ collapsed ? '•••' : '内容管理' }}
      </p>
      <RouterLink
        v-for="item in menu"
        :key="item.to"
        :to="item.to"
        class="group relative mb-1 flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
        active-class="admin-nav-active text-white"
        :title="collapsed ? item.label : undefined"
        @click="$emit('close')"
      >
        <component :is="item.icon" class="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
        <span class="truncate" :class="{ 'lg:hidden': collapsed }">{{ item.label }}</span>
        <span
          v-if="item.badge"
          class="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300"
          :class="{ 'lg:hidden': collapsed }"
        >{{ item.badge }}</span>
      </RouterLink>
    </nav>

    <div class="m-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-2">
      <RouterLink
        to="/"
        class="flex h-10 items-center gap-3 rounded-xl px-2.5 text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
        :title="collapsed ? '返回前台' : undefined"
        @click="$emit('close')"
      >
        <House class="h-[18px] w-[18px] shrink-0" />
        <span :class="{ 'lg:hidden': collapsed }">返回前台</span>
        <TopRight class="ml-auto h-3.5 w-3.5" :class="{ 'lg:hidden': collapsed }" />
      </RouterLink>
      <button
        type="button"
        class="flex h-10 w-full items-center gap-3 rounded-xl px-2.5 text-left text-sm text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
        :title="collapsed ? '退出登录' : undefined"
        @click="onLogout"
      >
        <SwitchButton class="h-[18px] w-[18px] shrink-0" />
        <span :class="{ 'lg:hidden': collapsed }">退出登录</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import {
  Calendar,
  ChatDotRound,
  Close,
  Collection,
  CollectionTag,
  House,
  Picture,
  SwitchButton,
  TopRight,
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import api from '@/axios'
import { clearAdminSession } from '@/utils/adminAuth.js'

defineProps({
  open: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
})

defineEmits(['close'])

const router = useRouter()

async function onLogout() {
  try {
    await api.post('/admin/logout')
  } catch {
    // 即使服务端 token 已失效，也要清理本地会话
  } finally {
    clearAdminSession()
    router.replace({ path: '/admin/login' })
  }
}

const menu = [
  { to: '/admin/story', label: '故事管理', icon: Collection },
  { to: '/admin/message', label: '留言板管理', icon: ChatDotRound },
  { to: '/admin/photo', label: '相册管理', icon: Picture },
  { to: '/admin/anniversary', label: '纪念日管理', icon: Calendar },
  { to: '/admin/dict', label: '字典配置', icon: CollectionTag },
]
</script>
