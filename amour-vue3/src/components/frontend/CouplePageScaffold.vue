<template>
  <div class="flex min-h-screen flex-col bg-[#fcfaf7] font-sans text-stone-900 antialiased">
    <a
      href="#main-content"
      class="sr-only z-[100] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-rose-400"
    >
      跳到主要内容
    </a>

    <SiteHeader />

    <div id="main-content" tabindex="-1" class="flex-1 outline-none">
      <slot />
    </div>

    <SiteFooter />
  </div>
</template>

<script setup>
import SiteFooter from '@/components/frontend/SiteFooter.vue'
import SiteHeader from '@/components/frontend/SiteHeader.vue'
</script>
