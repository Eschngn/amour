<template>
  <footer class="border-t border-stone-200/80 bg-white/60">
    <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-stone-500 sm:flex-row sm:px-6 lg:px-8">
      <p>
        Copyright © {{ year }}
        <a
          href="https://www.chengliuxiang.top/"
          target="_blank"
          rel="noreferrer"
          class="font-semibold text-stone-600 transition hover:text-rose-700 hover:underline"
        >恋语间</a>
        <span class="mx-2 text-stone-300" aria-hidden="true">·</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noreferrer"
          class="transition hover:text-rose-700 hover:underline"
        >浙ICP备2026073792号</a>
      </p>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'

const year = computed(() => new Date().getFullYear())
</script>
