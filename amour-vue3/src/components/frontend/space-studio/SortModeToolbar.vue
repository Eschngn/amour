<template>
  <div class="flex flex-wrap items-center gap-2">
    <template v-if="sorting">
      <p class="text-[11px] font-semibold text-stone-600" role="status">
        <span v-if="scopeLabel" class="text-stone-800">{{ scopeLabel }}</span>
        <span v-if="scopeLabel" aria-hidden="true"> · </span>
        共 {{ count }} 项，拖动或使用按钮调整顺序
      </p>
      <button type="button" class="btn-primary !py-1.5" :disabled="saving" @click="$emit('save')">
        {{ saving ? '保存中…' : '保存排序' }}
      </button>
      <button type="button" class="btn-secondary !py-1.5" :disabled="saving" @click="$emit('cancel')">
        取消
      </button>
    </template>
    <template v-else>
      <button
        type="button"
        class="btn-secondary"
        :disabled="disabled"
        :aria-describedby="disabled && disabledReason ? hintId : undefined"
        @click="$emit('start')"
      >
        调整顺序
      </button>
      <span v-if="disabled && disabledReason" :id="hintId" class="text-[11px] text-stone-500">
        {{ disabledReason }}
      </span>
    </template>
  </div>
</template>

<script setup>
import { useId } from 'vue'

defineProps({
  sorting: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  disabledReason: { type: String, default: '' },
  /** 排序范围说明，例如当前章节或当前分类名称。 */
  scopeLabel: { type: String, default: '' },
  count: { type: Number, default: 0 },
})

defineEmits(['start', 'save', 'cancel'])

const hintId = useId()
</script>
