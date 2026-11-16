<template>
  <span
    class="couple-avatar relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rose-200 via-rose-100 to-pink-200 font-display font-bold text-rose-600 ring-1 ring-inset ring-white/70"
    role="img"
    :aria-label="accessibleLabel"
  >
    <span class="select-none leading-none" aria-hidden="true">{{ initialText }}</span>
    <img
      v-if="showImage"
      :src="src"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 h-full w-full object-cover"
      @error="failed = true"
    >
  </span>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

/**
 * 情侣空间头像。
 *
 * 只有真实存在的图片地址才渲染 <img>；地址为空或加载失败时回退到昵称首字母占位，
 * 不再使用示例真人头像。尺寸由父组件通过 class 控制，占位与图片共用同一容器尺寸。
 */
const props = defineProps({
  src: { type: String, default: '' },
  /** 用于生成首字母与无障碍文本的昵称。 */
  name: { type: String, default: '' },
  /** 没有昵称时的兜底文本，例如 HE / SHE。 */
  fallback: { type: String, default: '♥' },
  /** 覆盖无障碍文本；为空时按昵称自动生成。 */
  label: { type: String, default: '' },
})

const failed = ref(false)

watch(() => props.src, () => {
  failed.value = false
})

const showImage = computed(() => Boolean(String(props.src || '').trim()) && !failed.value)

const initialText = computed(() => {
  const name = String(props.name || '').trim()
  if (!name) return String(props.fallback || '♥').trim() || '♥'
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2 && /^[a-z]/i.test(words[0])) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 1).toUpperCase()
})

const accessibleLabel = computed(() => {
  const label = String(props.label || '').trim()
  if (label) return label
  const name = String(props.name || '').trim()
  return name ? `${name}的头像` : '情侣空间头像'
})
</script>

<style scoped>
.couple-avatar {
  transition: background-color 200ms ease;
}
</style>
