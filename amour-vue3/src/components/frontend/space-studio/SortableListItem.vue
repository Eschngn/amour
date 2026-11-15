<template>
  <li
    :draggable="sorting && !disabled"
    :aria-label="sorting ? `${label}，当前第 ${index + 1} 位` : undefined"
    :class="[
      sorting ? 'sortable-list-item' : '',
      sorting && dragging ? 'opacity-60' : '',
      sorting && dragTarget ? 'ring-2 ring-inset ring-rose-300' : '',
    ]"
    @dragstart="handleDragStart"
    @dragover.prevent
    @dragenter.prevent="handleDragEnter"
    @drop.prevent="handleDrop"
    @dragend="handleDragEnd"
  >
    <div
      v-if="sorting"
      class="flex flex-wrap items-center gap-1.5 border-b border-stone-100 bg-stone-50/80 px-2 py-1.5"
    >
      <span class="min-w-11 rounded bg-white px-1.5 py-0.5 text-center text-[10px] font-bold text-stone-500 ring-1 ring-inset ring-stone-200">
        第 {{ index + 1 }} 位
      </span>
      <span
        class="inline-flex cursor-grab items-center gap-1 rounded px-1 py-0.5 text-[10px] font-semibold text-stone-500"
        :title="`拖动调整 ${label} 的顺序`"
      >
        <Rank class="h-3.5 w-3.5" aria-hidden="true" />
        拖动
      </span>
      <div class="ml-auto flex items-center gap-1">
        <button
          type="button"
          class="sort-move-button"
          :disabled="disabled || index === 0"
          :aria-label="`将 ${label} 移到最前`"
          title="置顶"
          @click.stop="$emit('move-top')"
        >
          <Top class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="sort-move-button"
          :disabled="disabled || index === 0"
          :aria-label="`上移 ${label}`"
          title="上移"
          @click.stop="$emit('move-up')"
        >
          <ArrowUp class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="sort-move-button"
          :disabled="disabled || index >= total - 1"
          :aria-label="`下移 ${label}`"
          title="下移"
          @click.stop="$emit('move-down')"
        >
          <ArrowDown class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="sort-move-button"
          :disabled="disabled || index >= total - 1"
          :aria-label="`将 ${label} 移到末尾`"
          title="移到末尾"
          @click.stop="$emit('move-end')"
        >
          <Bottom class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
    <slot />
  </li>
</template>

<script setup>
import { ArrowDown, ArrowUp, Bottom, Rank, Top } from '@element-plus/icons-vue'

const props = defineProps({
  sorting: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  label: { type: String, default: '条目' },
  disabled: { type: Boolean, default: false },
  dragging: { type: Boolean, default: false },
  dragTarget: { type: Boolean, default: false },
})

const emit = defineEmits(['move-up', 'move-down', 'move-top', 'move-end', 'drag-start', 'drag-over', 'drop', 'drag-end'])

function handleDragStart(event) {
  if (!props.sorting || props.disabled) {
    event.preventDefault()
    return
  }
  emit('drag-start', event)
}

function handleDragEnter() {
  if (!props.sorting || props.disabled) return
  emit('drag-over')
}

function handleDrop(event) {
  if (!props.sorting || props.disabled) return
  emit('drop', event)
}

function handleDragEnd() {
  emit('drag-end')
}
</script>

<style scoped>
.sort-move-button {
  @apply inline-flex h-7 w-7 items-center justify-center rounded border border-stone-200 bg-white text-stone-500 transition hover:border-rose-200 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
