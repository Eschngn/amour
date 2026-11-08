<template>
  <Listbox
    v-slot="{ open }"
    :model-value="listboxValue"
    :disabled="disabled"
    @update:model-value="onSelect"
  >
    <div class="relative">
      <ListboxButton
        :id="inputId"
        type="button"
        class="group flex w-full items-center justify-between gap-2 rounded-xl border border-rose-200 bg-white text-left text-rose-950 shadow-[0_1px_2px_rgba(76,5,25,0.03)] outline-none transition hover:border-rose-300 focus-visible:border-rose-400 focus-visible:ring-4 focus-visible:ring-rose-100"
        :class="[
          size === 'sm' ? 'px-3 py-2 text-xs font-semibold' : 'px-3.5 py-3 text-sm',
          open ? 'border-rose-400 ring-4 ring-rose-100' : '',
          disabled ? 'cursor-not-allowed opacity-60' : '',
        ]"
      >
        <span class="min-w-0 truncate" :class="selectedOption ? 'text-rose-950' : 'text-rose-300'">{{ selectedLabel }}</span>
        <svg
          class="h-4 w-4 shrink-0 transition duration-150"
          :class="open ? 'rotate-180 text-rose-500' : 'text-rose-400'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </ListboxButton>

      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <ListboxOptions class="absolute z-[80] mt-1.5 max-h-64 w-full overflow-auto rounded-2xl border border-rose-100 bg-white/95 p-1.5 shadow-xl shadow-rose-950/10 backdrop-blur-md focus:outline-none">
          <ListboxOption
            v-for="option in options"
            :key="String(option.value)"
            :value="option.value"
            :disabled="Boolean(option.disabled)"
            as="template"
            v-slot="{ active, selected, disabled: optionDisabled }"
          >
            <li
              class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition"
              :class="[
                active && !optionDisabled ? 'bg-rose-50 text-rose-700' : 'text-rose-800/75',
                selected ? 'bg-rose-50/80 font-semibold text-rose-700' : '',
                optionDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
              ]"
            >
              <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
              <svg v-if="selected" class="h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <path d="m5 12 4.5 4.5L19 6.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </li>
          </ListboxOption>
          <li v-if="!options.length" class="px-3 py-3 text-center text-xs text-rose-700/45">暂无可选项</li>
        </ListboxOptions>
      </Transition>
    </div>
  </Listbox>
</template>

<script setup>
import { computed } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  inputId: { type: String, default: '' },
  placeholder: { type: String, default: '请选择' },
  size: { type: String, default: 'md' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const selectedOption = computed(() => (
  props.options.find(option => option.value === props.modelValue)
  || props.options.find(option => String(option.value) === String(props.modelValue))
  || null
))

/** 兼容后端 ID 与表单字符串类型不一致的情况，传给 Listbox 时统一为选项自身类型。 */
const listboxValue = computed(() => (
  selectedOption.value ? selectedOption.value.value : props.modelValue
))

const selectedLabel = computed(() => selectedOption.value?.label || props.placeholder)

function onSelect(value) {
  emit('update:modelValue', value)
}
</script>
