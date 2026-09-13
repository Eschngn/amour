<template>
  <footer class="admin-footer shrink-0 px-5 py-4 text-center text-[11px] text-slate-400 sm:text-left">
    <div class="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-1 sm:flex-row">
      <p>
        © {{ year }} Amour · 管理控制台 ·
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noreferrer"
          class="transition hover:text-slate-600 hover:underline"
        >浙ICP备2026073792号</a>
      </p>
      <p class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        服务运行正常
      </p>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>
