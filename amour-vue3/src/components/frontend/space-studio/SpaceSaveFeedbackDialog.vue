<template>
  <SpaceStudioDialog
    :model-value="modelValue"
    :title="title"
    :width="dialogWidth"
    :close-on-press-escape="true"
    :close-on-click-modal="true"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="handleClosed"
  >
    <div role="status" aria-live="polite" aria-atomic="true">
      <div v-if="isUnchangedKind" class="overflow-hidden rounded-xl border border-stone-200/90 bg-gradient-to-br from-stone-50 via-white to-rose-50/40">
        <div class="flex items-center gap-4 p-5">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-sm" aria-hidden="true">
            <Minus class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="break-words text-sm font-semibold leading-6 text-stone-800">{{ message }}</p>
            <p class="mt-1 text-xs leading-5 text-stone-500">可以放心继续编辑，本次保存不会产生新的审核记录。</p>
          </div>
        </div>
        <div class="flex items-center gap-2 border-t border-stone-200/70 bg-white/65 px-5 py-3 text-xs text-stone-500">
          <span class="h-1.5 w-1.5 rounded-full bg-stone-300" aria-hidden="true"></span>
          当前内容与已保存版本一致
        </div>
      </div>
      <div v-else class="flex items-start gap-3">
        <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="whitespace-pre-line break-words text-sm leading-6 text-stone-700">{{ message }}</p>
          <p v-if="followUpHint" class="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-500">
            {{ followUpHint }}
          </p>
        </div>
      </div>
    </div>
    <template #footer>
      <button
        type="button"
        class="min-w-24"
        :class="isUnchangedKind ? 'btn-secondary' : 'btn-primary'"
        @click="emit('update:modelValue', false)"
      >
        知道了
      </button>
    </template>
  </SpaceStudioDialog>
</template>

<script setup>
import { computed, watch } from 'vue'
import { Minus } from '@element-plus/icons-vue'
import SpaceStudioDialog from '@/components/frontend/space-studio/SpaceStudioDialog.vue'
import {
  SAVE_FEEDBACK_KIND,
  saveFeedbackTitle,
} from '@/utils/saveFeedback'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  notice: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'closed'])

const title = computed(() => saveFeedbackTitle(props.notice?.kind))
const message = computed(() => props.notice?.message || '')
const isUnchangedKind = computed(() => props.notice?.kind === SAVE_FEEDBACK_KIND.UNCHANGED)
const dialogWidth = computed(() => (
  isUnchangedKind.value ? 'min(460px, calc(100vw - 24px))' : 'min(520px, calc(100vw - 24px))'
))

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

const followUpHint = computed(() => {
  switch (props.notice?.kind) {
    case SAVE_FEEDBACK_KIND.PENDING:
      return '可前往上方「公开审核」卡片查看进度'
    case SAVE_FEEDBACK_KIND.STALE:
      return '审核通过后广场才会更新为最新版本'
    case SAVE_FEEDBACK_KIND.REMOVED:
      return '如需重新公开，请在编辑器中重新设置可见性'
    default:
      return ''
  }
})

let previousFocus = null

watch(() => props.modelValue, open => {
  if (!open || typeof document === 'undefined' || previousFocus) return
  previousFocus = document.activeElement
})

function handleClosed() {
  if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
    previousFocus.focus({ preventScroll: true })
  }
  previousFocus = null
  emit('closed')
}
</script>
