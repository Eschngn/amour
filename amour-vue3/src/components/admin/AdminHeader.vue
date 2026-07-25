<template>
  <header class="admin-header sticky top-0 z-20 flex h-[72px] shrink-0 items-center border-b px-4 sm:px-6 xl:px-8">
    <button
      type="button"
      class="mr-3 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
      aria-label="打开导航菜单"
      @click="$emit('open-sidebar')"
    >
      <Menu class="h-5 w-5" />
    </button>
    <button
      type="button"
      class="mr-4 hidden rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 lg:inline-flex"
      :aria-label="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
      @click="$emit('toggle-sidebar')"
    >
      <Fold v-if="!sidebarCollapsed" class="h-5 w-5" />
      <Expand v-else class="h-5 w-5" />
    </button>

    <div class="min-w-0">
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <span>管理后台</span>
        <ArrowRight class="h-3 w-3" />
        <span class="truncate text-slate-500">{{ pageTitle }}</span>
      </div>
      <p class="mt-0.5 truncate text-sm font-semibold text-slate-800 sm:text-base">
        {{ pageDescription }}
      </p>
    </div>

    <div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
      <div class="hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs text-slate-500 shadow-sm xl:flex">
        <Calendar class="h-4 w-4 text-rose-400" />
        <span>{{ todayText }}</span>
      </div>
      <div class="flex items-center gap-2.5 rounded-xl py-1 pl-1 sm:pr-2">
        <span class="admin-avatar flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm">
          AM
        </span>
        <div class="hidden leading-tight md:block">
          <p class="text-xs font-semibold text-slate-700">管理员</p>
          <p class="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 在线
          </p>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowRight, Calendar, Expand, Fold, Menu } from '@element-plus/icons-vue'

defineProps({
  sidebarCollapsed: { type: Boolean, default: false },
})

defineEmits(['open-sidebar', 'toggle-sidebar'])

const route = useRoute()

const pageTitle = computed(() => {
  const title = route.meta?.pageTitle
  return typeof title === 'string' && title.length ? title : '控制台'
})

const descriptions = {
  '/admin/story': '记录与整理每一段珍贵故事',
  '/admin/message': '倾听并管理访客留下的声音',
  '/admin/photo': '收藏值得反复回看的美好瞬间',
  '/admin/anniversary': '不错过每一个重要的日子',
  '/admin/dict': '统一维护站点配置与业务字典',
}

const pageDescription = computed(() => descriptions[route.path] || '欢迎回到 Amour 管理控制台')

const todayText = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
}).format(new Date())
</script>
