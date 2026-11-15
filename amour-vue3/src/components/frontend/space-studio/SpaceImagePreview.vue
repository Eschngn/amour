<template>
  <Teleport to="body">
    <Transition :name="isDetailLayout ? 'plaza-photo-preview' : 'space-image-preview'">
      <div
        v-if="open"
        class="space-image-preview fixed inset-0 z-[3000] flex overscroll-contain backdrop-blur-sm"
        :class="isDetailLayout
          ? 'items-end justify-center bg-rose-950/55 p-0 sm:items-center sm:p-6'
          : ['flex-col overflow-y-auto p-3 sm:p-6', isAdmin ? 'bg-slate-950/85' : 'bg-stone-950/85']"
        role="dialog"
        aria-modal="true"
        :aria-label="dialogLabel"
        @click.self="close"
      >
        <!-- 广场 / 空间编辑共用的照片详情：照片主体 + 独立信息面板，编辑模式通过 actions 插槽补充管理操作。 -->
        <template v-if="isDetailLayout">
          <div
            class="plaza-photo-dialog relative flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[1.75rem] border border-rose-100 bg-white shadow-2xl sm:h-[min(78dvh,660px)] sm:max-h-[88dvh] sm:flex-row sm:rounded-[1.75rem]"
            @click.stop
          >
            <div
              class="relative flex h-[52dvh] min-h-[15rem] w-full shrink-0 items-center justify-center overflow-hidden bg-stone-950 sm:h-full sm:min-h-0 sm:flex-1"
              @click.self="close"
              @wheel.prevent="handleWheel"
              @touchstart="handleTouchStart"
              @touchend="handleTouchEnd"
            >
              <img
                v-if="currentItem && !failed"
                :key="currentItem.src"
                :src="currentItem.src"
                :alt="currentItem.alt"
                class="plaza-photo-image max-h-full max-w-full select-none object-contain transition duration-200"
                :class="loading ? 'opacity-0' : 'opacity-100'"
                :style="{ transform: `scale(${scale})` }"
                draggable="false"
                @load="handleLoad"
                @error="handleError"
                @click.stop
              >

              <div
                v-if="loading"
                class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
                role="status"
                aria-live="polite"
              >
                <span class="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-white" aria-hidden="true" />
                <span class="text-xs font-medium text-white/80">正在加载图片</span>
              </div>

              <div
                v-else-if="failed"
                class="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-rose-200/50 bg-white px-6 py-7 text-center shadow-2xl"
                role="alert"
              >
                <span class="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500" aria-hidden="true">!</span>
                <p class="mt-3 text-sm font-semibold text-stone-800">图片加载失败</p>
                <p class="mt-1 text-xs leading-5 text-stone-500">图片地址可能已失效，请关闭后重试。</p>
                <button
                  type="button"
                  class="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-white px-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  @click="close"
                >
                  关闭
                </button>
              </div>

              <div
                v-else-if="!currentItem"
                class="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-white/15 bg-stone-900/70 px-6 py-8 text-center"
                role="status"
              >
                <p class="text-sm font-semibold text-white">暂无可预览的图片</p>
                <p class="mt-1 text-xs leading-5 text-white/60">图片地址为空或已失效。</p>
              </div>

              <div
                v-if="currentItem && !failed"
                class="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-stone-950/65 p-1"
                @click.stop
              >
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="缩小照片"
                  title="缩小照片"
                  :disabled="scale <= MIN_SCALE || loading"
                  @click="zoomBy(-SCALE_STEP)"
                >
                  −
                </button>
                <button
                  type="button"
                  class="h-8 min-w-[3.25rem] rounded-full px-2 text-[11px] font-semibold tabular-nums text-white/80 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  aria-label="恢复原始大小"
                  title="恢复原始大小"
                  @click="resetZoom"
                >
                  {{ scalePercent }}%
                </button>
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="放大照片"
                  title="放大照片"
                  :disabled="scale >= MAX_SCALE || loading"
                  @click="zoomBy(SCALE_STEP)"
                >
                  +
                </button>
              </div>
            </div>

            <aside class="flex max-h-[42dvh] min-h-0 w-full flex-col bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-h-none sm:w-[21rem] sm:shrink-0 sm:border-l sm:border-rose-100 sm:p-6 lg:w-[23rem]">
              <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">照片详情</p>
                <h2 class="mt-2 break-words font-display text-xl font-bold leading-snug text-rose-950 sm:text-2xl">
                  {{ currentItem?.title || '未命名照片' }}
                </h2>
                <p v-if="currentItem?.meta" class="mt-2 break-words text-xs leading-6 text-rose-800/55">
                  {{ currentItem.meta }}
                </p>

                <div v-if="currentItem?.description" class="mt-5 border-t border-rose-100 pt-4">
                  <p class="text-[11px] font-semibold tracking-wide text-rose-500">照片描述</p>
                  <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-rose-900/75">
                    {{ currentItem.description }}
                  </p>
                </div>
              </div>

              <div v-if="isEditor && $slots.actions && currentItem" class="mt-3 shrink-0 border-t border-rose-100 pt-3">
                <slot name="actions" :item="currentItem" :index="activeIndex" />
              </div>

              <div v-if="hasMultiple" class="mt-4 flex items-center justify-between gap-3 border-t border-rose-100 pt-4">
                <span class="text-xs font-semibold tabular-nums text-rose-700/60" aria-live="polite">
                  {{ activeIndex + 1 }} / {{ items.length }}
                </span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex h-11 items-center justify-center rounded-full border border-rose-200 bg-white px-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:h-9 sm:px-3.5"
                    aria-label="上一张照片"
                    title="上一张照片"
                    @click.stop="prev"
                  >
                    上一张
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-11 items-center justify-center rounded-full border border-rose-200 bg-white px-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:h-9 sm:px-3.5"
                    aria-label="下一张照片"
                    title="下一张照片"
                    @click.stop="next"
                  >
                    下一张
                  </button>
                </div>
              </div>
            </aside>

            <button
              ref="closeButtonRef"
              type="button"
              class="absolute right-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose-100 bg-white/95 text-rose-600 shadow-md transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 sm:h-10 sm:w-10"
              aria-label="关闭照片详情"
              title="关闭照片详情"
              @click="close"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </template>

        <template v-else>
        <button
          ref="closeButtonRef"
          type="button"
          class="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center border text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:right-6 sm:top-6"
          :class="isAdmin
            ? 'rounded-xl border-white/15 bg-slate-900/75 hover:bg-slate-800'
            : 'rounded-full border-white/25 bg-stone-950/60 hover:bg-stone-800'"
          aria-label="关闭图片预览"
          @click="close"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
          </svg>
        </button>

        <button
          v-if="hasMultiple"
          type="button"
          class="absolute left-1 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:left-4"
          :class="navButtonClass"
          aria-label="上一张图片"
          @click.stop="prev"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <button
          v-if="hasMultiple"
          type="button"
          class="absolute right-1 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:right-4"
          :class="navButtonClass"
          aria-label="下一张图片"
          @click.stop="next"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <div
          class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-12 sm:py-14"
          @click.self="close"
        >
          <div
            class="relative flex min-h-[12rem] w-full flex-1 items-center justify-center overflow-hidden"
            @click.self="close"
            @wheel.prevent="handleWheel"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
          >
            <img
              v-if="currentItem && !failed"
              :key="currentItem.src"
              :src="currentItem.src"
              :alt="currentItem.alt"
              class="max-h-[calc(100dvh-13rem)] max-w-full select-none object-contain shadow-2xl transition duration-200"
              :class="[
                isAdmin ? 'rounded-lg' : 'rounded-xl',
                loading ? 'opacity-0' : 'opacity-100',
              ]"
              :style="{ transform: `scale(${scale})` }"
              draggable="false"
              @load="handleLoad"
              @error="handleError"
              @click.stop
            >

            <div
              v-if="loading"
              class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
              role="status"
              aria-live="polite"
            >
              <span class="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-white" aria-hidden="true" />
              <span class="text-xs font-medium text-white/80">正在加载图片</span>
            </div>

            <div
              v-else-if="failed"
              class="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-rose-200/50 bg-white px-6 py-8 text-center shadow-2xl"
              role="alert"
            >
              <span class="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500" aria-hidden="true">!</span>
              <p class="mt-3 text-sm font-semibold text-stone-800">图片加载失败</p>
              <p class="mt-1 text-xs leading-5 text-stone-500">图片地址可能已失效，请关闭预览后重试。</p>
            </div>

            <div
              v-else-if="!currentItem"
              class="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-white/15 bg-stone-900/70 px-6 py-8 text-center"
              role="status"
            >
              <p class="text-sm font-semibold text-white">暂无可预览的图片</p>
              <p class="mt-1 text-xs leading-5 text-white/60">图片地址为空或已失效。</p>
            </div>

            <div
              v-if="currentItem && !failed"
              class="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 border p-1"
              :class="isAdmin
                ? 'rounded-xl border-white/15 bg-slate-900/80'
                : 'rounded-full border-white/25 bg-stone-950/60'"
              @click.stop
            >
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="缩小图片"
                :disabled="scale <= MIN_SCALE || loading"
                @click="zoomBy(-SCALE_STEP)"
              >
                −
              </button>
              <button
                type="button"
                class="h-8 min-w-[3.25rem] rounded-lg px-2 text-[11px] font-semibold tabular-nums text-white/80 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                aria-label="恢复原始大小"
                @click="resetZoom"
              >
                {{ scalePercent }}%
              </button>
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="放大图片"
                :disabled="scale >= MAX_SCALE || loading"
                @click="zoomBy(SCALE_STEP)"
              >
                +
              </button>
            </div>
          </div>

          <figure
            v-if="currentItem"
            class="w-full max-w-3xl border px-4 py-3 text-white shadow-2xl"
            :class="isAdmin
              ? 'rounded-xl border-white/10 bg-slate-900/80'
              : 'rounded-2xl border-white/15 bg-stone-950/55'"
            @click.stop
          >
            <figcaption class="min-w-0">
              <div class="flex items-start justify-between gap-3">
                <p class="min-w-0 break-words text-sm font-semibold">{{ currentItem.title }}</p>
                <span
                  v-if="hasMultiple"
                  class="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white/75"
                  aria-live="polite"
                >
                  {{ activeIndex + 1 }} / {{ items.length }}
                </span>
              </div>
              <p
                v-if="currentItem.description"
                class="mt-1 max-h-32 overflow-y-auto whitespace-pre-line break-words text-xs leading-5"
                :class="isAdmin ? 'text-slate-200/85' : 'text-white/75'"
              >
                {{ currentItem.description }}
              </p>
              <p
                v-if="currentItem.meta"
                class="mt-1 break-words text-[10px]"
                :class="isAdmin ? 'text-slate-400' : 'text-white/50'"
              >
                {{ currentItem.meta }}
              </p>
            </figcaption>
          </figure>
        </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  normalizePreviewImages,
  resolvePreviewIndex,
  stepPreviewIndex,
} from '@/utils/imagePreview'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 兼容旧调用：单张图片地址。 */
  src: { type: String, default: '' },
  /** 兼容旧调用：单张图片 alt。 */
  alt: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  meta: { type: String, default: '' },
  /** 多图模式：[{ id, src, alt, title, description, meta }]。 */
  images: { type: Array, default: () => [] },
  initialIndex: { type: Number, default: 0 },
  /** default=前台玫瑰/暖灰风格；admin=控制管理台风格；plaza=广场公开照片；editor=空间编辑相册。 */
  variant: { type: String, default: 'default' },
})

const emit = defineEmits(['close'])

const MIN_SCALE = 1
const MAX_SCALE = 4
const SCALE_STEP = 0.25
const SWIPE_THRESHOLD = 48

const closeButtonRef = ref(null)
const activeIndex = ref(0)
const loading = ref(false)
const failed = ref(false)
const scale = ref(MIN_SCALE)

const items = computed(() => normalizePreviewImages({
  images: props.images,
  src: props.src,
  alt: props.alt,
  title: props.title,
  description: props.description,
  meta: props.meta,
}))
const currentItem = computed(() => items.value[activeIndex.value] || null)
const hasMultiple = computed(() => items.value.length > 1)
const isAdmin = computed(() => props.variant === 'admin')
const isPlaza = computed(() => props.variant === 'plaza')
const isEditor = computed(() => props.variant === 'editor')
const isDetailLayout = computed(() => isPlaza.value || isEditor.value)
const dialogLabel = computed(() => {
  if (isDetailLayout.value) {
    return `照片详情：${currentItem.value?.title || currentItem.value?.alt || '照片'}`
  }
  return `${currentItem.value?.alt || props.alt || '图片'}大图预览`
})
const scalePercent = computed(() => Math.round(scale.value * 100))
const navButtonClass = computed(() => (
  isAdmin.value
    ? 'rounded-xl border-white/15 bg-slate-900/75 hover:bg-slate-800'
    : 'rounded-full border-white/25 bg-stone-950/60 hover:bg-stone-800'
))

let lastFocusedElement = null
let previousBodyOverflow = ''
let savedScrollTop = 0
let scrollLocked = false
let touchStart = null

/**
 * 重置当前图片的加载、错误与缩放状态。
 * 切图或重新打开预览时都必须回到 100%，避免沿用上一张的缩放比例。
 */
function resetItemView() {
  loading.value = Boolean(currentItem.value)
  failed.value = false
  scale.value = MIN_SCALE
}

function close() {
  emit('close')
}

function prev() {
  if (!hasMultiple.value) return
  activeIndex.value = stepPreviewIndex(activeIndex.value, -1, items.value.length)
}

function next() {
  if (!hasMultiple.value) return
  activeIndex.value = stepPreviewIndex(activeIndex.value, 1, items.value.length)
}

function setScale(value) {
  scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))))
}

function zoomBy(delta) {
  if (loading.value || failed.value || !currentItem.value) return
  setScale(scale.value + delta)
}

function resetZoom() {
  setScale(MIN_SCALE)
}

function handleWheel(event) {
  if (loading.value || failed.value || !currentItem.value) return
  zoomBy(event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP)
}

function handleTouchStart(event) {
  if (!hasMultiple.value || scale.value > MIN_SCALE || event.touches.length !== 1) {
    touchStart = null
    return
  }
  touchStart = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY,
  }
}

/** 移动端横向滑动切换图片；放大状态下交给缩放查看，不触发切图。 */
function handleTouchEnd(event) {
  if (!touchStart || scale.value > MIN_SCALE || event.changedTouches.length !== 1) {
    touchStart = null
    return
  }
  const deltaX = event.changedTouches[0].clientX - touchStart.x
  const deltaY = event.changedTouches[0].clientY - touchStart.y
  touchStart = null
  if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return
  if (deltaX < 0) next()
  else prev()
}

function handleLoad() {
  loading.value = false
}

function handleError() {
  failed.value = true
  loading.value = false
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    // 预览层位于编辑弹窗 / 审核抽屉之上，Esc 只关闭预览，不能连带关闭父级弹层。
    event.stopImmediatePropagation()
    close()
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    event.stopImmediatePropagation()
    prev()
    return
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    event.stopImmediatePropagation()
    next()
  }
}

function lockPageScroll() {
  previousBodyOverflow = document.body.style.overflow
  savedScrollTop = typeof window === 'undefined'
    ? 0
    : window.scrollY || document.documentElement.scrollTop || 0
  document.body.style.overflow = 'hidden'
  scrollLocked = true
}

function restorePageScroll() {
  if (!scrollLocked) return
  document.body.style.overflow = previousBodyOverflow
  scrollLocked = false
  if (typeof window === 'undefined') return
  // 移动端浏览器在锁定 body 滚动时可能改变滚动位置，关闭后恢复打开前的位置。
  const currentTop = window.scrollY || document.documentElement.scrollTop || 0
  if (Math.abs(currentTop - savedScrollTop) > 1) {
    window.scrollTo({ top: savedScrollTop, behavior: 'auto' })
  }
}

watch(activeIndex, resetItemView)
watch(() => currentItem.value?.src, resetItemView)

watch(() => props.open, async (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    activeIndex.value = resolvePreviewIndex(props.initialIndex, items.value.length)
    resetItemView()
    lastFocusedElement = document.activeElement
    lockPageScroll()
    window.addEventListener('keydown', handleKeydown, true)
    await nextTick()
    closeButtonRef.value?.focus({ preventScroll: true })
    return
  }
  window.removeEventListener('keydown', handleKeydown, true)
  restorePageScroll()
  if (lastFocusedElement instanceof HTMLElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus({ preventScroll: true })
  }
  lastFocusedElement = null
}, { immediate: true })

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', handleKeydown, true)
  restorePageScroll()
})
</script>

<style scoped>
.space-image-preview-enter-active,
.space-image-preview-leave-active {
  transition: opacity 0.18s ease;
}

.space-image-preview-enter-from,
.space-image-preview-leave-to {
  opacity: 0;
}

/* 恋爱广场照片详情：遮罩淡入，面板轻量上移；退出使用匹配的短动画。 */
.plaza-photo-preview-enter-active,
.plaza-photo-preview-leave-active {
  transition: opacity 0.2s ease;
}

.plaza-photo-preview-enter-active .plaza-photo-dialog,
.plaza-photo-preview-leave-active .plaza-photo-dialog {
  transition: transform 0.24s cubic-bezier(0.22, 0.8, 0.25, 1), opacity 0.2s ease;
}

.plaza-photo-preview-enter-from,
.plaza-photo-preview-leave-to {
  opacity: 0;
}

.plaza-photo-preview-enter-from .plaza-photo-dialog {
  opacity: 0;
  transform: translateY(16px) scale(0.985);
}

.plaza-photo-preview-leave-to .plaza-photo-dialog {
  opacity: 0;
  transform: translateY(8px) scale(0.99);
}

@media (min-width: 640px) {
  .plaza-photo-preview-enter-from .plaza-photo-dialog {
    transform: translateY(10px) scale(0.985);
  }
}

@media (prefers-reduced-motion: reduce) {
  .plaza-photo-preview-enter-active,
  .plaza-photo-preview-leave-active,
  .plaza-photo-preview-enter-active .plaza-photo-dialog,
  .plaza-photo-preview-leave-active .plaza-photo-dialog {
    transition: none;
  }

  .plaza-photo-preview-enter-from .plaza-photo-dialog,
  .plaza-photo-preview-leave-to .plaza-photo-dialog {
    opacity: 1;
    transform: none;
  }

  .plaza-photo-image {
    transition: none !important;
  }
}
</style>
