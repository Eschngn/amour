<template>
  <footer class="relative z-10 border-t border-rose-100 py-10 text-center text-sm text-rose-700/55">
    <p>© {{ year }} Amour    只属于我们两个人的地方</p>
  </footer>
</template>

<script setup>
import { computed } from 'vue'

const year = computed(() => new Date().getFullYear())
</script>
