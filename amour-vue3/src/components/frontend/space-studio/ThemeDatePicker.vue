<template>
  <div class="theme-date-picker">
    <VueDatePicker
      :model-value="pickerValue"
      :locale="zhCN"
      :formats="pickerFormats"
      :time-config="timeConfig"
      :action-row="actionRow"
      :enable-time-picker="mode === 'datetime'"
      :input-attrs="{ id: inputId, clearable }"
      :dark="false"
      :teleport="false"
      :placeholder="placeholder"
      model-type="format"
      @update:model-value="onUpdate"
    >
      <template #input-icon>
        <span class="theme-date-picker__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
            <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" />
            <path d="M8 3.2v3.4M16 3.2v3.4M3.5 10h17" stroke-linecap="round" />
            <path d="M12 17.2c-2.4-1.5-3.6-2.6-3.6-4a1.9 1.9 0 0 1 3.6-.9 1.9 1.9 0 0 1 3.6.9c0 1.4-1.2 2.5-3.6 4Z" fill="currentColor" stroke="none" />
          </svg>
        </span>
      </template>
    </VueDatePicker>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { zhCN } from 'date-fns/locale'

const props = defineProps({
  modelValue: { type: String, default: '' },
  mode: { type: String, default: 'datetime' },
  inputId: { type: String, default: '' },
  placeholder: { type: String, default: '选择时间' },
  clearable: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

/** 兼容 datetime-local 的 T 分隔符，交给日历组件前统一为 yyyy-MM-dd HH:mm。 */
const pickerValue = computed(() => {
  const text = String(props.modelValue || '').trim()
  if (!text) return null
  if (props.mode === 'date') return text.slice(0, 10)
  return text.replace('T', ' ')
})

const pickerFormats = computed(() => (
  props.mode === 'date'
    ? {
        month: 'M 月',
        year: 'yyyy 年',
        weekDay: 'EEEEE',
        input: 'yyyy-MM-dd',
        preview: 'yyyy 年 M 月 d 日',
      }
    : {
        month: 'M 月',
        year: 'yyyy 年',
        weekDay: 'EEEEE',
        input: 'yyyy-MM-dd HH:mm',
        preview: 'yyyy 年 M 月 d 日 HH:mm',
      }
))

const timeConfig = {
  enableTimePicker: true,
  is24: true,
  enableSeconds: false,
  minutesGridIncrement: 5,
}

const actionRow = computed(() => ({
  showNow: true,
  showSelect: true,
  selectBtnLabel: '确定',
  cancelBtnLabel: '取消',
  nowBtnLabel: props.mode === 'date' ? '今天' : '此刻',
}))

function pad(value) {
  return String(value).padStart(2, '0')
}

function onUpdate(value) {
  if (value instanceof Date) {
    const date = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    emit('update:modelValue', props.mode === 'date' ? date : `${date} ${pad(value.getHours())}:${pad(value.getMinutes())}`)
    return
  }
  emit('update:modelValue', String(value || '').trim())
}
</script>

<style scoped>
/* 主题色日历：变量同时定义在输入框与弹出面板上，覆盖组件自带的蓝色主题。 */
.theme-date-picker :deep(.dp--main),
.theme-date-picker :deep(.dp--menu) {
  --dp-font-family: 'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --dp-font-size: 0.875rem;
  --dp-border-radius: 0.75rem;
  --dp-cell-border-radius: 0.6rem;
  --dp-background-color: #ffffff;
  --dp-text-color: #4c0519;
  --dp-primary-color: #f43f5e;
  --dp-primary-disabled-color: #fda4af;
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #d8c4c9;
  --dp-border-color: #fecdd3;
  --dp-border-color-hover: #fda4af;
  --dp-border-color-focus: #fb7185;
  --dp-menu-border-color: #ffe4e6;
  --dp-hover-color: #fff1f2;
  --dp-hover-text-color: #be123c;
  --dp-hover-icon-color: #e11d48;
  --dp-icon-color: #fb7185;
  --dp-highlight-color: rgb(244 63 94 / 0.12);
  --dp-menu-min-width: 21rem;
  --dp-cell-size: 2.2rem;
  --dp-input-padding: 0.75rem 2.6rem 0.75rem 1rem;
  --dp-menu-padding: 0.65rem 0.7rem;
  --dp-action-buttons-padding: 0.25rem 0.6rem;
  --dp-preview-font-size: 0.75rem;
}

.theme-date-picker :deep(.dp--main) {
  width: 100%;
}

.theme-date-picker :deep(.dp--input) {
  width: 100%;
  border: 1px solid #fecdd3;
  box-shadow: 0 1px 2px rgb(76 5 25 / 0.03);
  color: #4c0519;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.theme-date-picker :deep(.dp--input::placeholder) {
  color: #fda4af;
  opacity: 1;
}

.theme-date-picker :deep(.dp--input:hover:not(.dp--input-focus)) {
  border-color: #fda4af;
}

.theme-date-picker :deep(.dp--input-focus) {
  border-color: #fb7185;
  box-shadow: 0 0 0 4px #ffe4e6;
}

.theme-date-picker :deep(.dp--input-icon) {
  inset-inline-start: 0.95rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fb7185;
  transition: color 160ms ease, transform 160ms ease;
}

.theme-date-picker :deep(.dp--input-icon:hover) {
  color: #e11d48;
  transform: translateY(-50%) scale(1.06);
}

.theme-date-picker__icon svg {
  width: 1.15rem;
  height: 1.15rem;
}

.theme-date-picker :deep(.dp--action-row) {
  gap: 0.35rem;
  align-items: center;
}

.theme-date-picker :deep(.dp--selection-preview) {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.theme-date-picker :deep(.dp--menu) {
  z-index: 80;
  border-radius: 1rem;
  box-shadow: 0 18px 45px rgb(76 5 25 / 0.13);
  font-family: 'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.theme-date-picker :deep(.dp--calendar-header-cell) {
  border-bottom-color: #ffe4e6;
  color: #9f1239;
  font-weight: 600;
}

.theme-date-picker :deep(.dp--cell-inner) {
  font-weight: 500;
}

.theme-date-picker :deep(.dp--today) {
  border-color: #fb7185;
  font-weight: 700;
}

.theme-date-picker :deep(.dp--active) {
  background: linear-gradient(135deg, #fb7185 0%, #f43f5e 100%);
  box-shadow: 0 4px 12px rgb(244 63 94 / 0.28);
}

.theme-date-picker :deep(.dp--inner-nav:hover) {
  background: #fff1f2;
  color: #e11d48;
}

.theme-date-picker :deep(.dp--time-col-block) {
  font-family: 'Nunito', 'PingFang SC', sans-serif;
  font-weight: 600;
  color: #9f1239;
}

.theme-date-picker :deep(.dp--tp-inline-btn-bar) {
  background-color: #ffe4e6;
}

.theme-date-picker :deep(.dp--action-select) {
  border-radius: 0.55rem;
  font-weight: 600;
}

.theme-date-picker :deep(.dp--action-cancel) {
  border-radius: 0.55rem;
  color: #9f1239;
}
</style>
