<template>
  <Teleport to="body">
    <Transition name="space-image-preview">
      <div
        v-if="open"
        class="space-image-preview fixed inset-0 z-[3000] flex items-center justify-center overflow-y-auto overscroll-contain bg-stone-950/85 p-4 backdrop-blur-sm sm:p-8"
        role="dialog"
        aria-modal="true"
        :aria-label="dialogLabel"
        @click.self="close"
      >
        <button
          ref="closeButtonRef"
          type="button"
          class="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-stone-950/60 text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:right-6 sm:top-6"
          aria-label="关闭图片预览"
          @click="close"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
          </svg>
        </button>

        <div class="flex w-full max-w-5xl flex-col items-center justify-center gap-3">
          <img
            v-if="!failed"
            :src="src"
            :alt="alt"
            class="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            @error="failed = true"
          >
          <div v-else class="rounded-2xl border border-rose-200/40 bg-white px-6 py-8 text-center" role="alert">
            <p class="text-sm font-semibold text-stone-800">图片加载失败</p>
            <p class="mt-1 text-xs leading-5 text-stone-500">请关闭预览后重新上传图片。</p>
          </div>
          <p v-if="alt && !failed" class="max-w-full truncate rounded-full bg-stone-950/50 px-3 py-1 text-[11px] text-white/80">
            {{ alt }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  src: { type: String, default: '' },
  alt: { type: String, default: '图片预览' },
})

const emit = defineEmits(['close'])

const closeButtonRef = ref(null)
const failed = ref(false)
const dialogLabel = computed(() => (props.alt ? `${props.alt}大图预览` : '图片大图预览'))

let lastFocusedElement = null
let previousBodyOverflow = ''
let scrollLocked = false

function close() {
  emit('close')
}

function handleKeydown(event) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  // 预览层位于编辑弹窗之上，Esc 只关闭预览，不能连带关闭父级弹窗。
  event.stopImmediatePropagation()
  close()
}

function lockPageScroll() {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  scrollLocked = true
}

function restorePageScroll() {
  if (!scrollLocked) return
  document.body.style.overflow = previousBodyOverflow
  scrollLocked = false
}

watch(() => props.open, async (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    failed.value = false
    lastFocusedElement = document.activeElement
    lockPageScroll()
    window.addEventListener('keydown', handleKeydown, true)
    await nextTick()
    closeButtonRef.value?.focus()
    return
  }
  window.removeEventListener('keydown', handleKeydown, true)
  restorePageScroll()
  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus()
    lastFocusedElement = null
  }
}, { immediate: true })

watch(() => props.src, () => {
  failed.value = false
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', handleKeydown, true)
  restorePageScroll()
})
</script>

<style scoped>
.space-image-preview-enter-active,
.space-image-preview-leave-active {
  transition: opacity 0.18s ease;
}

.space-image-preview-enter-from,
.space-image-preview-leave-to {
  opacity: 0;
}
</style>
