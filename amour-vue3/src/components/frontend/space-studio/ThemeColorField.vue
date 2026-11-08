<template>
  <div :class="disabled ? 'opacity-60' : ''">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <label :for="inputId" class="block text-sm font-semibold text-rose-900">{{ label }}</label>
      <span class="text-[11px] font-semibold tracking-wider" :class="hasCustomColor ? 'text-rose-500' : 'text-rose-400/70'">
        {{ hasCustomColor ? '自定义颜色' : '默认颜色' }}
      </span>
    </div>

    <div class="mt-2 flex items-center gap-3 rounded-xl border border-rose-200 bg-white px-3 py-2.5 transition focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-100">
      <label
        class="relative flex h-12 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-rose-200 shadow-sm transition hover:border-rose-300"
        :style="{ backgroundColor: previewColor }"
        :title="`点击选择${label}`"
      >
        <svg
          class="pointer-events-none h-4 w-4"
          :style="{ color: swatchIconColor }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M12 3s6 6.6 6 10.5A6 6 0 0 1 6 13.5C6 9.6 12 3 12 3Z" />
        </svg>
        <input
          :id="inputId"
          type="color"
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          :value="pickerValue"
          :disabled="disabled"
          :aria-label="`选择${label}`"
          @input="onPickerInput"
        >
      </label>

      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold text-rose-800">点击色块打开取色器</p>
        <p class="mt-0.5 text-[11px] leading-5 text-rose-700/45">选中的颜色会实时应用到下方预览</p>
      </div>

      <button
        v-if="allowClear && modelValue"
        type="button"
        class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-400 transition hover:bg-rose-50 hover:text-rose-600"
        :disabled="disabled"
        @click="clear"
      >
        清除
      </button>
    </div>

    <div v-if="presets.length" class="mt-2.5 flex flex-wrap items-center gap-1.5">
      <button
        v-for="color in presets"
        :key="color"
        type="button"
        class="h-6 w-6 rounded-full border border-white shadow-sm ring-1 ring-rose-100 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        :class="selectedColor === color.toUpperCase() ? 'scale-105 ring-2 ring-rose-400' : ''"
        :style="{ backgroundColor: color }"
        :aria-label="`使用预设颜色 ${color}`"
        :aria-pressed="selectedColor === color.toUpperCase()"
        :disabled="disabled"
        @click="pick(color)"
      />
    </div>

    <p v-if="hint" class="mt-2 text-[11px] leading-5 text-rose-700/45">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  DEFAULT_THEME_COLOR,
  THEME_COLOR_PRESETS,
  contrastTextColor,
  normalizeHexColor,
} from '@/utils/themeColor'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '主题色' },
  inputId: { type: String, required: true },
  hint: { type: String, default: '' },
  presets: { type: Array, default: () => THEME_COLOR_PRESETS },
  allowClear: { type: Boolean, default: false },
  fallback: { type: String, default: DEFAULT_THEME_COLOR },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const normalizedValue = computed(() => normalizeHexColor(props.modelValue))
const selectedColor = computed(() => normalizedValue.value.toUpperCase())
const previewColor = computed(() => normalizedValue.value || props.fallback)
const pickerValue = computed(() => previewColor.value.toLowerCase())
const swatchIconColor = computed(() => contrastTextColor(previewColor.value))
const hasCustomColor = computed(() => Boolean(normalizedValue.value))

function onPickerInput(event) {
  emit('update:modelValue', String(event.target.value || '').toUpperCase())
}

function pick(color) {
  emit('update:modelValue', color)
}

function clear() {
  emit('update:modelValue', '')
}
</script>
