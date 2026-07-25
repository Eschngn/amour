<template>
  <div class="relative min-h-screen overflow-x-clip bg-gradient-to-b from-rose-50 via-pink-50/80 to-white font-sans text-rose-950 antialiased">
    <div
      class="pointer-events-none fixed inset-0"
      aria-hidden="true"
    >
      <div
        class="hero-glow absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-rose-200/50 blur-[100px]"
      />
      <div
        class="absolute -right-20 top-1/3 h-[420px] w-[420px] rounded-full bg-pink-200/45 blur-[90px]"
      />
      <div
        class="absolute bottom-0 left-1/2 h-[380px] w-[90%] max-w-4xl -translate-x-1/2 rounded-full bg-fuchsia-100/40 blur-[80px]"
      />
    </div>

    <SiteHeader />

    <slot />

    <SiteFooter />
  </div>
</template>

<script setup>
import SiteFooter from '@/components/frontend/SiteFooter.vue'
import SiteHeader from '@/components/frontend/SiteHeader.vue'
</script>

<style scoped>
@keyframes pulse-soft {
  0%,
  100% {
    opacity: 0.65;
    transform: scale(1);
  }
  50% {
    opacity: 0.95;
    transform: scale(1.04);
  }
}

.hero-glow {
  animation: pulse-soft 8s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .hero-glow {
    animation: none;
  }
}
</style>
