<template>
  <aside
    class="admin-sidebar fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col transition-[width,transform] duration-300 ease-out lg:relative lg:z-20 lg:translate-x-0"
    :class="[
      open ? 'translate-x-0 shadow-xl' : '-translate-x-full',
      collapsed ? 'lg:w-[88px]' : 'lg:w-[248px]',
    ]"
    aria-label="后台主导航"
  >
    <div
      class="admin-sidebar-brand flex h-[72px] shrink-0 items-center px-5"
      :class="{ 'lg:justify-center lg:px-0': collapsed }"
    >
      <RouterLink
        :to="entryPath"
        class="group flex min-w-0 items-center gap-3"
        :class="{ 'lg:justify-center': collapsed }"
        @click="$emit('close')"
      >
        <span
          class="brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" class="h-[22px] w-[22px]">
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <div class="min-w-0 transition-opacity" :class="{ 'lg:hidden': collapsed }">
          <p class="truncate font-display text-[17px] font-semibold tracking-wide text-stone-900">恋语间</p>
          <p class="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.16em] text-stone-500">
            Admin Console
          </p>
        </div>
      </RouterLink>
      <button
        type="button"
        class="admin-sidebar-icon-button ml-auto rounded-lg p-2 lg:hidden"
        aria-label="关闭导航菜单"
        @click="$emit('close')"
      >
        <Close class="h-5 w-5" />
      </button>
    </div>

    <nav class="admin-nav flex-1 overflow-y-auto px-3 py-4">
      <div v-for="group in visibleGroups" :key="group.label" class="mb-4">
        <p
          class="admin-nav-group-label mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
          :class="{ 'lg:text-center lg:px-0': collapsed }"
        >
          {{ collapsed ? '•••' : group.label }}
        </p>
        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="admin-nav-link group relative mb-1 flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 text-sm font-medium transition-colors duration-200"
          :class="{ 'lg:justify-center lg:px-0': collapsed }"
          active-class="admin-nav-active"
          :title="collapsed ? item.label : undefined"
          @click="$emit('close')"
        >
          <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" />
          <span class="truncate" :class="{ 'lg:hidden': collapsed }">{{ item.label }}</span>
        </RouterLink>
      </div>
      <p v-if="!visibleGroups.length" class="admin-nav-empty px-3 py-6 text-center text-xs leading-5">
        当前账号暂无可访问的后台菜单
      </p>
    </nav>

    <div class="admin-sidebar-actions m-3 rounded-2xl p-2">
      <RouterLink
        to="/"
        class="admin-sidebar-action flex h-10 items-center gap-3 rounded-xl px-2.5 text-sm transition-colors"
        :class="{ 'lg:justify-center lg:px-0': collapsed }"
        :title="collapsed ? '返回前台' : undefined"
        @click="$emit('close')"
      >
        <House class="h-[18px] w-[18px] shrink-0" />
        <span :class="{ 'lg:hidden': collapsed }">返回前台</span>
        <TopRight class="ml-auto h-3.5 w-3.5" :class="{ 'lg:hidden': collapsed }" />
      </RouterLink>
      <button
        type="button"
        class="admin-sidebar-action admin-sidebar-action--danger flex h-10 w-full items-center gap-3 rounded-xl px-2.5 text-left text-sm transition-colors"
        :class="{ 'lg:justify-center lg:px-0': collapsed }"
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
  Connection,
  DataBoard,
  Document,
  Files,
  House,
  Picture,
  SwitchButton,
  TopRight,
  User,
} from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/axios'
import {
  ADMIN_PERMISSIONS,
  clearAdminSession,
  hasAdminPermission,
  resolveAdminEntryPath,
} from '@/utils/adminAuth.js'

defineProps({
  open: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
})

defineEmits(['close'])

const router = useRouter()
const entryPath = computed(() => resolveAdminEntryPath())

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

const groups = [
  {
    label: '平台治理',
    items: [
      { to: '/admin/dashboard', label: '工作台', icon: DataBoard, permission: ADMIN_PERMISSIONS.DASHBOARD_QUERY },
      { to: '/admin/space', label: '空间管理', icon: Connection, permission: ADMIN_PERMISSIONS.SPACE_QUERY },
      { to: '/admin/space-review', label: '空间审核', icon: Document, permission: ADMIN_PERMISSIONS.SPACE_REVIEW_QUERY },
    ],
  },
  {
    label: '内容治理',
    items: [
      { to: '/admin/story', label: '故事治理', icon: Collection, permission: ADMIN_PERMISSIONS.CONTENT_QUERY },
      { to: '/admin/photo', label: '照片治理', icon: Picture, permission: ADMIN_PERMISSIONS.CONTENT_QUERY },
      { to: '/admin/message', label: '留言治理', icon: ChatDotRound, permission: ADMIN_PERMISSIONS.CONTENT_QUERY },
      { to: '/admin/anniversary', label: '纪念日治理', icon: Calendar, permission: ADMIN_PERMISSIONS.CONTENT_QUERY },
    ],
  },
  {
    label: '平台管理',
    items: [
      { to: '/admin/user', label: '用户管理', icon: User, permission: ADMIN_PERMISSIONS.USER_QUERY },
      { to: '/admin/dict', label: '平台配置', icon: CollectionTag, permission: ADMIN_PERMISSIONS.DICT_QUERY },
    ],
  },
  {
    label: '后台安全',
    items: [
      { to: '/admin/audit', label: '操作审计', icon: Document, permission: ADMIN_PERMISSIONS.AUDIT_QUERY },
    ],
  },
]

const visibleGroups = computed(() => groups
  .map(group => ({
    ...group,
    items: group.items.filter(item => hasAdminPermission(item.permission)),
  }))
  .filter(group => group.items.length > 0))
</script>
