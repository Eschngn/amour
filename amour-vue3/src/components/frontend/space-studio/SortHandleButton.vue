<template>
  <button
    type="button"
    data-drag-handle
    class="inline-flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-transparent text-stone-400 transition hover:border-stone-200 hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-40 active:cursor-grabbing"
    :disabled="disabled || saving"
    :aria-label="saving
      ? `正在保存${label}的顺序`
      : `拖动调整${label}的顺序，当前第 ${position} 位；聚焦后可用上下方向键移动`"
    aria-roledescription="拖动排序手柄"
    aria-keyshortcuts="ArrowUp ArrowDown"
    :title="saving ? '正在保存顺序' : (disabled ? disabledHint : '按住拖动调整顺序；聚焦后可用上下方向键')"
    @pointerdown.stop.prevent="$emit('drag-start', $event)"
    @keydown.up.prevent="$emit('move-up')"
    @keydown.down.prevent="$emit('move-down')"
  >
    <Loading v-if="saving" class="h-4 w-4 animate-spin" aria-hidden="true" />
    <Rank v-else class="h-4 w-4" aria-hidden="true" />
  </button>
</template>

<script setup>
import { Loading, Rank } from '@element-plus/icons-vue'

defineProps({
  label: { type: String, default: '条目' },
  position: { type: Number, default: 1 },
  disabled: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  disabledHint: { type: String, default: '当前无法调整顺序' },
})

defineEmits(['drag-start', 'move-up', 'move-down'])
</script>
