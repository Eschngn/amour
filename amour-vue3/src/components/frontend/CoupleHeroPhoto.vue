<template>
  <div class="relative w-full overflow-hidden">
    <img
      v-if="showImage"
      :src="src"
      :alt="alt"
      :class="[ratioClass, 'block w-full object-cover']"
      @error="failed = true"
    >
    <div
      v-else
      :class="[ratioClass, 'hero-photo-empty flex w-full flex-col items-center justify-center gap-2 px-4 text-center']"
      role="img"
      :aria-label="alt"
    >
      <span class="text-2xl text-rose-300" aria-hidden="true">♥</span>
      <span class="text-[11px] font-semibold leading-5 tracking-wide text-rose-400">{{ emptyText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

/**
 * 首页主视觉照片。
 *
 * 未上传或加载失败时展示固定比例的“尚未上传照片”占位，不使用示例照片；
 * ratioClass 同时作用于图片与占位，保证加载前后尺寸稳定不跳动。
 */
const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '首页照片' },
  emptyText: { type: String, default: '尚未上传照片' },
  /** 固定比例，例如 aspect-[4/5]、aspect-square。 */
  ratioClass: { type: String, default: 'aspect-[4/5]' },
})

const failed = ref(false)

watch(() => props.src, () => {
  failed.value = false
})

const showImage = computed(() => Boolean(String(props.src || '').trim()) && !failed.value)
</script>

<style scoped>
.hero-photo-empty {
  background:
    radial-gradient(circle at 28% 24%, rgba(255, 255, 255, 0.9), transparent 24%),
    linear-gradient(135deg, #fff1f2 0%, #fce7f3 48%, #ffe4e6 100%);
}
</style>
