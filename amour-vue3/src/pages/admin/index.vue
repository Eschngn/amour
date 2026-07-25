<template>
  <div class="admin-shell flex h-dvh overflow-hidden font-sans text-slate-900 antialiased">
    <button
      v-if="mobileSidebarOpen"
      type="button"
      class="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
      aria-label="关闭导航菜单"
      @click="mobileSidebarOpen = false"
    />

    <AdminSidebar
      :open="mobileSidebarOpen"
      :collapsed="sidebarCollapsed"
      @close="mobileSidebarOpen = false"
    />

    <div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <AdminHeader
        :sidebar-collapsed="sidebarCollapsed"
        @open-sidebar="mobileSidebarOpen = true"
        @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
      />

      <main class="admin-main min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 xl:px-8 xl:py-8">
        <div class="mx-auto w-full max-w-[1600px]">
          <router-view v-slot="{ Component }">
            <Transition name="admin-page" mode="out-in">
              <component :is="Component" :key="route.fullPath" />
            </Transition>
          </router-view>
        </div>
      </main>

      <AdminFooter />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import AdminFooter from '@/components/admin/AdminFooter.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import '@/assets/admin.css'

const route = useRoute()
const mobileSidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
</script>
