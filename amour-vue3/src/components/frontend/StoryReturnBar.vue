<template>
  <!--
    详情页顶部返回栏：始终可见（sticky 在顶栏下方），滚动到正文底部也能直接返回。
    - 宽度与正文容器一致，不遮挡内容：外层不再占据额外高度，正文按原布局下移；
    - 背景带模糊与描边，滚动时压在正文之上仍然可读；
    - 顶部偏移读取 --site-header-height，移动端二级导航变高也不会被遮挡；
    - 底部额外留 safe-area，避免 iPhone 横屏时按钮贴到屏幕边缘。
  -->
  <div class="story-return-bar pointer-events-none sticky z-30" :style="barStyle">
    <div class="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between gap-3 py-2.5">
        <component
          :is="asLink ? RouterLink : 'button'"
          v-bind="controlProps"
          :aria-label="ariaLabel || label"
          class="story-return-button pointer-events-auto group inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full border border-rose-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-rose-600 shadow-sm shadow-rose-100/60 backdrop-blur-md transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          @click="onActivate"
        >
          <svg class="h-3.5 w-3.5 shrink-0 transition group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M19 12H5m6 6-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ label }}
        </component>

        <slot name="trailing" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * 详情页返回栏。
 *
 * 优先用 RouterLink 保留真实链接语义（可右键新标签打开、读屏可识别为链接）；
 * 需要在返回前做来源判断时传 `link: false`，此时渲染为 button 并触发 activate。
 */
const props = defineProps({
  /** 返回按钮文字，例如“返回故事列表”。 */
  label: { type: String, default: '返回' },
  /** RouterLink 目标；仅在 link=true 时生效。 */
  to: { type: [String, Object], default: null },
  /** 覆盖读屏名称；默认与可见文案一致，避免名称与视觉文案不一致。 */
  ariaLabel: { type: String, default: '' },
  /** 是否渲染为链接。关闭时渲染 button，由 activate 决定跳转。 */
  link: { type: Boolean, default: true },
  /** 吸顶时与顶栏的额外间距（px）。 */
  offset: { type: Number, default: 0 },
})

const emit = defineEmits(['activate'])

const asLink = computed(() => props.link && props.to != null)

const controlProps = computed(() => (asLink.value ? { to: props.to } : { type: 'button' }))

const barStyle = computed(() => ({
  top: `calc(var(--site-header-height, 64px) + ${props.offset}px)`,
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
}))

function onActivate(event) {
  if (asLink.value) return
  emit('activate', event)
}
</script>

<style scoped>
/*
 * 吸顶背景：从页面底色过渡到透明，让按钮区域的文字不被正文切断。
 * 不用纯色块，避免滚动时出现明显的“贴片”感。
 */
.story-return-bar {
  background: linear-gradient(
    to bottom,
    rgba(252, 250, 247, 0.96) 0%,
    rgba(252, 250, 247, 0.9) 68%,
    rgba(252, 250, 247, 0) 100%
  );
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.story-return-button {
  /* 触控目标不小于 36px 高，移动端更容易点中。 */
  min-width: 0;
}

@media (prefers-reduced-motion: reduce) {
  .story-return-button {
    transition: none;
  }
}
</style>
