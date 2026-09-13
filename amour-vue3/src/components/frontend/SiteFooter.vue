<template>
  <footer class="relative z-10 border-t border-rose-100 py-10 text-center text-sm text-rose-700/55">
    <p>
      Copyright © {{ year }}
      <a
        href="https://www.chengliuxiang.top/"
        target="_blank"
        rel="noreferrer"
        class="transition hover:text-rose-700 hover:underline"
      >Amour</a>
      <span class="mx-2" aria-hidden="true">·</span>
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noreferrer"
        class="transition hover:text-rose-700 hover:underline"
      >浙ICP备2026073792号</a>
    </p>
  </footer>
</template>

<script setup>
import { computed } from 'vue'

const year = computed(() => new Date().getFullYear())
</script>
