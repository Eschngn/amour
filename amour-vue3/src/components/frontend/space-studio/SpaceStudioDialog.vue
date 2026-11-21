<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :fullscreen="fullscreen"
    append-to-body
    align-center
    destroy-on-close
    lock-scroll
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :before-close="handleBeforeClose"
    class="space-studio-dialog"
    modal-class="space-studio-dialog-overlay"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <p v-if="description" class="-mt-1 mb-4 text-xs leading-5 text-stone-500">
      {{ description }}
    </p>
    <slot />
    <template #footer>
      <slot name="footer" />
    </template>
  </el-dialog>
</template>

<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'
import 'element-plus/es/components/dialog/style/css'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  /** 使用 min() 限制宽度的原因：桌面端保持宽敞，小屏自动收窄且不产生横向滚动。 */
  width: { type: String, default: 'min(720px, calc(100vw - 24px))' },
  /** 全屏模式：占满视口，页头与操作栏固定，仅中间内容区滚动。 */
  fullscreen: { type: Boolean, default: false },
  /** 父级传入的关闭前拦截：只有调用 done 才真正关闭。 */
  beforeClose: { type: Function, default: null },
  closeOnPressEscape: { type: Boolean, default: true },
  /** 编辑弹窗默认防止误触关闭；只读的保存结果弹窗可按需开启。 */
  closeOnClickModal: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'closed'])

// 日期选择器的弹出面板会 teleport 到 body，需要 body 级标记来恢复玫瑰主题。
let openDialogCount = 0

function syncBodyClass(open) {
  if (typeof document === 'undefined') return
  if (open) {
    openDialogCount += 1
    document.body.classList.add('space-studio-dialog-open')
    return
  }
  openDialogCount = Math.max(0, openDialogCount - 1)
  if (!openDialogCount) document.body.classList.remove('space-studio-dialog-open')
}

watch(() => props.modelValue, syncBodyClass, { immediate: true })

/**
 * 日期面板和下拉选项挂在 body 上，Esc 会先关闭它们。
 * Element Plus 的 Esc 监听在 document 冒泡阶段，这里提前记录一次“弹层已消费 Esc”，
 * 避免同一次按键把整个编辑弹窗也关掉。
 */
let skipNextEscapeClose = false
let escapeResetTimer = null

function hasOpenPopup() {
  if (typeof document === 'undefined') return false
  return [document.querySelector('.dp--menu-wrapper'), document.querySelector('[role="listbox"]')]
    .some(el => el && el.offsetParent !== null)
}

function handleWindowKeydown(event) {
  if (event.key !== 'Escape' || !hasOpenPopup()) return
  skipNextEscapeClose = true
  if (escapeResetTimer) clearTimeout(escapeResetTimer)
  escapeResetTimer = setTimeout(() => {
    skipNextEscapeClose = false
  }, 0)
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown, true)
  if (escapeResetTimer) clearTimeout(escapeResetTimer)
  if (props.modelValue) syncBodyClass(false)
})

function handleBeforeClose(done) {
  if (skipNextEscapeClose) {
    skipNextEscapeClose = false
    if (escapeResetTimer) clearTimeout(escapeResetTimer)
    return
  }
  if (typeof props.beforeClose === 'function') {
    props.beforeClose(done)
    return
  }
  done()
}
</script>
