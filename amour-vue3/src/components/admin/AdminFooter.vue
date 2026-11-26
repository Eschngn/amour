<template>
  <footer class="admin-footer shrink-0 px-5 py-4 text-center text-[11px] text-stone-500 sm:text-left">
    <div class="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-1 sm:flex-row">
      <p>
        © {{ year }} 恋语间 · 管理控制台 ·
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer"
          class="transition hover:text-stone-700 hover:underline">浙ICP备2026073792号</a>
      </p>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>
