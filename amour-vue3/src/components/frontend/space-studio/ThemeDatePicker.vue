<template>
  <div
    ref="rootRef"
    class="theme-date-picker"
    @click="syncMenuPlacement"
    @keydown="syncMenuPlacement"
  >
    <div class="theme-date-picker__row">
      <VueDatePicker
        :model-value="pickerValue"
        :locale="zhCN"
        :formats="pickerFormats"
        :action-row="actionRow"
        :enable-time-picker="false"
        :input-attrs="inputAttrs"
        :dark="false"
        :teleport="inDialog"
        :floating="floatingConfig"
        :placeholder="placeholder"
        model-type="format"
        @update:model-value="onDateUpdate"
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

      <!-- 时间独立取值：新建只选日期时默认 00:00:00，选择时间时才写入具体时分秒。 -->
      <input
        v-if="mode === 'datetime'"
        type="time"
        class="theme-date-picker__time"
        :value="timePart"
        :step="enableSeconds ? 1 : 60"
        :disabled="!datePart"
        :aria-label="enableSeconds ? '选择时间（含秒）' : '选择时间'"
        @input="onTimeInput"
      >
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { zhCN } from 'date-fns/locale'

const rootRef = ref(null)
/**
 * 弹窗 body 会垂直滚动，absolute 定位的日历面板会被 overflow 裁剪。
 * 只有身处前台编辑弹窗时才 teleport 到 body，其它页面保持原有内联定位。
 */
const inDialog = ref(false)
const menuPlacement = ref('bottom-start')
const menuMaxHeight = ref('')

const MENU_ESTIMATED_HEIGHT = 420
const VIEWPORT_GAP = 16

const floatingConfig = computed(() => (
  inDialog.value
    ? { placement: menuPlacement.value, strategy: 'fixed', flip: false, shift: false }
    : undefined
))

/** 弹窗内按输入框上下剩余空间选择展开方向，并为小屏限制面板高度。 */
function syncMenuPlacement() {
  if (!inDialog.value || typeof window === 'undefined') return
  const trigger = rootRef.value?.querySelector('.dp--main')
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP
  const spaceAbove = rect.top - VIEWPORT_GAP
  const openUp = spaceBelow < MENU_ESTIMATED_HEIGHT && spaceAbove > spaceBelow
  menuPlacement.value = openUp ? 'top-start' : 'bottom-start'
  const available = openUp ? spaceAbove : spaceBelow
  menuMaxHeight.value = available < MENU_ESTIMATED_HEIGHT
    ? `${Math.max(180, available)}px`
    : ''
  applyMenuMaxHeight()
}

function applyMenuMaxHeight() {
  if (typeof document === 'undefined') return
  const style = document.documentElement.style
  if (menuMaxHeight.value) style.setProperty('--space-dp-menu-max-height', menuMaxHeight.value)
  else style.removeProperty('--space-dp-menu-max-height')
}

function handleViewportChange() {
  syncMenuPlacement()
}

onMounted(() => {
  inDialog.value = Boolean(rootRef.value?.closest('.space-studio-dialog'))
  if (!inDialog.value) return
  window.addEventListener('scroll', handleViewportChange, true)
  window.addEventListener('resize', handleViewportChange)
})

onUnmounted(() => {
  if (!inDialog.value) return
  window.removeEventListener('scroll', handleViewportChange, true)
  window.removeEventListener('resize', handleViewportChange)
  document.documentElement.style.removeProperty('--space-dp-menu-max-height')
})

const props = defineProps({
  modelValue: { type: String, default: '' },
  mode: { type: String, default: 'datetime' },
  inputId: { type: String, default: '' },
  placeholder: { type: String, default: '选择时间' },
  clearable: { type: Boolean, default: true },
  /** 是否支持秒级展示与取值；故事 / 照片的日期时间模式开启。 */
  enableSeconds: { type: Boolean, default: false },
  /** 必填字段：把 aria-required 透传到真实输入框，而不是只靠视觉标记。 */
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const inputAttrs = computed(() => ({
  id: props.inputId,
  clearable: props.clearable,
  'aria-required': props.required ? 'true' : 'false',
}))

/** 只把日期部分交给日历组件，时间由独立输入框维护。 */
const datePart = computed(() => String(props.modelValue || '').trim().slice(0, 10))

const timePart = computed(() => {
  if (props.mode !== 'datetime') return ''
  const text = String(props.modelValue || '').trim().replace('T', ' ')
  const match = /^\d{4}-\d{2}-\d{2} (\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text)
  if (match) {
    return props.enableSeconds
      ? `${match[1]}:${match[2]}:${match[3] || '00'}`
      : `${match[1]}:${match[2]}`
  }
  // 有日期但没有时间：显式展示零点，而不是用当前时刻补全。
  return datePart.value ? '00:00:00' : ''
})

/** 日历组件的输入值只包含日期。 */
const pickerValue = computed(() => datePart.value || null)

const pickerFormats = {
  month: 'M 月',
  year: 'yyyy 年',
  weekDay: 'EEEEE',
  input: 'yyyy-MM-dd',
  preview: 'yyyy 年 M 月 d 日',
}

const actionRow = computed(() => ({
  showNow: true,
  showSelect: true,
  selectBtnLabel: '确定',
  cancelBtnLabel: '取消',
  nowBtnLabel: '今天',
}))

function pad(value) {
  return String(value).padStart(2, '0')
}

/** 选择日期：仅日期模式直接输出日期；日期时间模式沿用当前时间（空时为 00:00:00）。 */
function onDateUpdate(value) {
  if (value instanceof Date) {
    const date = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    if (props.mode === 'date') {
      emit('update:modelValue', date)
      return
    }
    emit('update:modelValue', `${date} ${timePart.value || '00:00:00'}`)
    return
  }
  emit('update:modelValue', String(value || '').trim())
}

/** 手动选择时间：原生 time 输入在启用秒时给出 HH:mm:ss，否则补零。 */
function onTimeInput(event) {
  const date = datePart.value
  if (!date) return
  const text = String(event?.target?.value || '').trim()
  if (!text) {
    emit('update:modelValue', `${date} 00:00:00`)
    return
  }
  const normalized = /^\d{2}:\d{2}$/.test(text) ? `${text}:00` : text
  emit('update:modelValue', `${date} ${normalized}`)
}
</script>

<style scoped>
/* 玫瑰色日历：变量同时定义在输入框与弹出面板上，覆盖组件自带的蓝色主题。 */
.theme-date-picker :deep(.dp--main),
.theme-date-picker :deep(.dp--menu) {
  --dp-font-family: 'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --dp-font-size: 0.875rem;
  --dp-border-radius: 0.5rem;
  --dp-cell-border-radius: 0.45rem;
  --dp-background-color: #ffffff;
  --dp-text-color: #292524;
  --dp-primary-color: #e11d48;
  --dp-primary-disabled-color: #fda4af;
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #d6d3d1;
  --dp-border-color: #e7e5e4;
  --dp-border-color-hover: #d6d3d1;
  --dp-border-color-focus: #fb7185;
  --dp-menu-border-color: #e7e5e4;
  --dp-hover-color: #f5f5f4;
  --dp-hover-text-color: #be123c;
  --dp-hover-icon-color: #e11d48;
  --dp-icon-color: #a8a29e;
  --dp-highlight-color: rgb(244 63 94 / 0.12);
  --dp-menu-min-width: 21rem;
  --dp-cell-size: 2.2rem;
  --dp-input-padding: 0.75rem 2.6rem 0.75rem 1rem;
  --dp-menu-padding: 0.65rem 0.7rem;
  --dp-action-buttons-padding: 0.25rem 0.6rem;
  --dp-preview-font-size: 0.75rem;
}

.theme-date-picker__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.theme-date-picker__row :deep(.dp--main) {
  flex: 1 1 12rem;
  min-width: 0;
}

/* 独立时间输入：与日期输入保持同一高度和主题描边。 */
.theme-date-picker__time {
  flex: 1 1 8.5rem;
  min-width: 8rem;
  min-height: 2.75rem;
  border: 1px solid #e7e5e4;
  border-radius: 0.5rem;
  background: #ffffff;
  padding: 0.6rem 0.75rem;
  font-family: 'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 0.875rem;
  color: #292524;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.theme-date-picker__time:hover:not(:disabled) {
  border-color: #d6d3d1;
}

.theme-date-picker__time:focus {
  border-color: #fb7185;
  box-shadow: 0 0 0 2px #ffe4e6;
}

.theme-date-picker__time:disabled {
  cursor: not-allowed;
  background: #fafaf9;
  color: #a8a29e;
}

.theme-date-picker :deep(.dp--main) {
  width: 100%;
  cursor: pointer;
}

.theme-date-picker :deep(.dp--input) {
  width: 100%;
  min-height: 2.75rem;
  cursor: pointer;
  border: 1px solid #e7e5e4;
  box-shadow: none;
  color: #292524;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.theme-date-picker :deep(.dp--input::placeholder) {
  color: #a8a29e;
  opacity: 1;
}

.theme-date-picker :deep(.dp--input:hover:not(.dp--input-focus)) {
  border-color: #d6d3d1;
}

.theme-date-picker :deep(.dp--input-focus) {
  border-color: #fb7185;
  box-shadow: 0 0 0 2px #ffe4e6;
}

.theme-date-picker :deep(.dp--input-icon) {
  inset-inline-start: 0.95rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #a8a29e;
  cursor: pointer;
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
  border-radius: 0.75rem;
  box-shadow: 0 16px 40px rgb(41 37 36 / 0.12);
  font-family: 'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.theme-date-picker :deep(.dp--calendar-header-cell) {
  border-bottom-color: #f5f5f4;
  color: #57534e;
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
  background: #e11d48;
  box-shadow: none;
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
