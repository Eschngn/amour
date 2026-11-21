<template>
  <Teleport to="body">
    <Transition name="space-save-toast">
      <div
        v-if="visible && message"
        class="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-4 sm:top-6"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div class="space-save-toast flex max-w-[min(34rem,calc(100vw-2rem))] items-start gap-2.5 rounded-2xl border border-white/90 bg-white/95 px-4 py-3 text-sm leading-6 text-stone-700 shadow-xl shadow-rose-950/10 ring-1 ring-rose-100/80 backdrop-blur">
          <span class="mt-2 h-2 w-2 shrink-0 rounded-full ring-4" :class="toneClass" aria-hidden="true" />
          <p class="min-w-0 break-words font-medium">{{ message }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { SAVE_FEEDBACK_KIND } from '@/utils/saveFeedback'

const props = defineProps({
  visible: { type: Boolean, default: false },
  notice: { type: Object, default: null },
})

const message = computed(() => String(props.notice?.message || '').trim())

const toneClass = computed(() => {
  switch (props.notice?.kind) {
    case SAVE_FEEDBACK_KIND.PENDING:
    case SAVE_FEEDBACK_KIND.STALE:
      return 'bg-amber-400 ring-amber-100'
    case SAVE_FEEDBACK_KIND.REMOVED:
      return 'bg-rose-400 ring-rose-100'
    case SAVE_FEEDBACK_KIND.UNCHANGED:
      return 'bg-stone-400 ring-stone-100'
    default:
      return 'bg-emerald-400 ring-emerald-100'
  }
})
</script>

<style scoped>
.space-save-toast-enter-active,
.space-save-toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.space-save-toast-enter-from,
.space-save-toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
