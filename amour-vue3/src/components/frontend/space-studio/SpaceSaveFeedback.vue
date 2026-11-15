<template>
  <section
    v-if="notice"
    class="rounded-xl border px-4 py-3 text-xs leading-5"
    :class="toneClass"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <div class="flex items-start gap-2.5">
      <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <p class="font-semibold">{{ title }}</p>
        <p class="mt-0.5 break-words leading-5">{{ notice.message }}</p>
      </div>
      <button
        type="button"
        class="-mr-1 shrink-0 rounded-md p-1 text-current opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        aria-label="关闭保存提示"
        @click="emit('close')"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onUnmounted, watch } from 'vue'
import {
  SAVE_FEEDBACK_DURATION_MS,
  SAVE_FEEDBACK_KIND,
  saveFeedbackTitle,
} from '@/utils/saveFeedback'

const props = defineProps({
  /** 父页面每次保存生成一个新的 { message, kind } 对象。 */
  notice: { type: Object, default: null },
  duration: { type: Number, default: SAVE_FEEDBACK_DURATION_MS },
})

const emit = defineEmits(['close'])

const title = computed(() => saveFeedbackTitle(props.notice?.kind))

const toneClass = computed(() => {
  switch (props.notice?.kind) {
    case SAVE_FEEDBACK_KIND.PENDING:
    case SAVE_FEEDBACK_KIND.STALE:
      return 'border-amber-200 bg-amber-50/80 text-amber-900'
    case SAVE_FEEDBACK_KIND.REMOVED:
      return 'border-rose-200 bg-rose-50/80 text-rose-800'
    case SAVE_FEEDBACK_KIND.UNCHANGED:
      return 'border-stone-200 bg-stone-50 text-stone-700'
    default:
      return 'border-emerald-200 bg-emerald-50/80 text-emerald-800'
  }
})

const dotClass = computed(() => {
  switch (props.notice?.kind) {
    case SAVE_FEEDBACK_KIND.PENDING:
    case SAVE_FEEDBACK_KIND.STALE:
      return 'bg-amber-500'
    case SAVE_FEEDBACK_KIND.REMOVED:
      return 'bg-rose-500'
    case SAVE_FEEDBACK_KIND.UNCHANGED:
      return 'bg-stone-400'
    default:
      return 'bg-emerald-500'
  }
})

let hideTimer = null

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function scheduleHide() {
  clearHideTimer()
  // 仅浏览器端需要自动隐藏；服务端渲染不应留下计时器。
  if (typeof window === 'undefined' || !props.notice || props.duration <= 0) return
  hideTimer = setTimeout(() => emit('close'), props.duration)
}

watch(() => props.notice, scheduleHide, { immediate: true })

onUnmounted(clearHideTimer)
</script>
