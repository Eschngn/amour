<template>
  <header class="admin-header sticky top-0 z-20 flex min-h-[84px] shrink-0 items-center border-b px-4 py-3 sm:px-6 xl:px-8">
    <button
      type="button"
      class="admin-header-icon-button mr-3 inline-flex lg:hidden"
      aria-label="打开导航菜单"
      @click="$emit('open-sidebar')"
    >
      <Menu class="h-5 w-5" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="admin-header-icon-button mr-4 hidden lg:inline-flex"
      :aria-label="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
      @click="$emit('toggle-sidebar')"
    >
      <Fold v-if="!sidebarCollapsed" class="h-5 w-5" aria-hidden="true" />
      <Expand v-else class="h-5 w-5" aria-hidden="true" />
    </button>

    <div class="flex min-w-0 items-center gap-3.5 sm:gap-4">
      <span
        class="admin-page-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
        :class="pageIconTone"
        aria-hidden="true"
      >
        <component :is="pageIcon" class="h-5 w-5" />
      </span>
      <div class="min-w-0">
        <p class="whitespace-nowrap text-[11px] font-medium tracking-wide text-stone-400">管理后台</p>
        <h1 class="mt-0.5 truncate text-base font-semibold text-stone-900 sm:text-lg">{{ pageTitle }}</h1>
        <p class="mt-0.5 hidden truncate text-xs text-stone-500 sm:block">{{ pageDescription }}</p>
      </div>
    </div>

    <div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
      <div class="admin-header-meta hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm xl:flex">
        <Calendar class="h-4 w-4 text-rose-500" aria-hidden="true" />
        <span>{{ todayText }}</span>
      </div>
      <div
        class="admin-header-meta flex h-9 w-9 items-center justify-center gap-2 rounded-xl border text-xs sm:w-auto sm:px-2.5"
        role="img"
        aria-label="当前登录身份：管理员"
        title="当前登录身份：管理员"
      >
        <UserFilled class="h-4 w-4" aria-hidden="true" />
        <span class="hidden text-xs font-medium sm:inline">管理员</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Calendar, ChatDotRound, Collection, CollectionTag, Connection, DataBoard, Document, Expand, Fold, Menu, Picture, User, UserFilled } from '@element-plus/icons-vue'

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
  '/admin/space-review': Document,
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
  '/admin/space-review': 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
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
  '/admin/dashboard': '空间状态、公开审核待办与平台数据概览',
  '/admin/story': '按空间查看故事并处置违规内容',
  '/admin/message': '按空间查看私密留言并处理违规内容',
  '/admin/photo': '按空间查看照片并处置违规内容',
  '/admin/anniversary': '按空间查看纪念日并处置违规内容',
  '/admin/space-review': '审核首次公开与公开内容修改',
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
