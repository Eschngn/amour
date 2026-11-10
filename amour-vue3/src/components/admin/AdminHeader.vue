<template>
  <header class="admin-header sticky top-0 z-20 flex min-h-[84px] shrink-0 items-center border-b px-4 py-3 sm:px-6 xl:px-8">
    <button
      type="button"
      class="mr-3 rounded-xl p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 lg:hidden"
      aria-label="打开导航菜单"
      @click="$emit('open-sidebar')"
    >
      <Menu class="h-5 w-5" />
    </button>
    <button
      type="button"
      class="mr-4 hidden rounded-xl p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-800 lg:inline-flex"
      :aria-label="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
      @click="$emit('toggle-sidebar')"
    >
      <Fold v-if="!sidebarCollapsed" class="h-5 w-5" />
      <Expand v-else class="h-5 w-5" />
    </button>

    <div class="flex min-w-0 items-center gap-3.5 sm:gap-4">
      <span class="admin-page-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" :class="pageIconTone">
        <component :is="pageIcon" class="h-5 w-5" />
      </span>
      <div class="min-w-0">
        <div class="flex items-center gap-2 text-[11px] font-medium tracking-wide text-stone-400">
          <span>管理后台</span>
          <ArrowRight class="h-3 w-3 text-stone-300" />
          <span class="truncate text-stone-500">{{ pageTitle }}</span>
        </div>
        <p class="mt-0.5 truncate text-base font-semibold text-stone-900 sm:text-lg">
          {{ pageTitle }}
        </p>
        <p class="mt-0.5 hidden truncate text-xs text-stone-500 sm:block">{{ pageDescription }}</p>
      </div>
    </div>

    <div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
      <div class="admin-header-meta hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm xl:flex">
        <Calendar class="h-4 w-4 text-rose-500" />
        <span>{{ todayText }}</span>
      </div>
      <div class="flex items-center gap-2.5 rounded-xl py-1 pl-1 sm:pr-2">
        <span class="admin-avatar flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm">
          AM
        </span>
        <div class="hidden leading-tight md:block">
          <p class="text-xs font-semibold text-stone-700">管理员</p>
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
import { ArrowRight, Calendar, ChatDotRound, Collection, CollectionTag, Connection, DataBoard, Document, Expand, Fold, Menu, Picture, User } from '@element-plus/icons-vue'

defineProps({
  sidebarCollapsed: { type: Boolean, default: false },
})

defineEmits(['open-sidebar', 'toggle-sidebar'])

const route = useRoute()

const pageIcons = {
  '/admin/dashboard': DataBoard,
  '/admin/story': Collection,
  '/admin/message': ChatDotRound,
  '/admin/photo': Picture,
  '/admin/anniversary': Calendar,
  '/admin/report': Document,
  '/admin/audit': Document,
  '/admin/dict': CollectionTag,
  '/admin/user': User,
  '/admin/space': Connection,
}

const pageIconTones = {
  '/admin/dashboard': 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
  '/admin/story': 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
  '/admin/message': 'bg-violet-50 text-violet-600 ring-1 ring-violet-100',
  '/admin/photo': 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
  '/admin/anniversary': 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
  '/admin/report': 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
  '/admin/audit': 'bg-stone-100 text-stone-600 ring-1 ring-stone-200',
  '/admin/dict': 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100',
  '/admin/user': 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
  '/admin/space': 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
}

const pageTitle = computed(() => {
  const title = route.meta?.pageTitle
  return typeof title === 'string' && title.length ? title : '控制台'
})

const pageIcon = computed(() => pageIcons[route.path] || Collection)
const pageIconTone = computed(() => pageIconTones[route.path] || 'bg-stone-100 text-stone-500 ring-1 ring-stone-200')

const descriptions = {
  '/admin/dashboard': '待处理举报、空间状态与平台数据概览',
  '/admin/story': '按空间查看故事并处置违规内容',
  '/admin/message': '按空间查看私密留言并处理违规内容',
  '/admin/photo': '按空间查看照片并处置违规内容',
  '/admin/anniversary': '按空间查看纪念日并处置违规内容',
  '/admin/report': '处理恋爱广场公开内容的举报',
  '/admin/audit': '查询后台敏感操作与读取记录',
  '/admin/dict': '统一维护平台配置与业务字典',
  '/admin/user': '管理用户账号、状态与平台管理员标识',
  '/admin/space': '查看空间生命周期、成员、邀请与内容索引',
}

const pageDescription = computed(() => descriptions[route.path] || '欢迎回到 恋语间 管理控制台')

const todayText = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
}).format(new Date())
</script>
