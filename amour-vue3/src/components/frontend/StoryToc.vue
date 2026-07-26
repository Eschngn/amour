<template>
  <nav
    v-if="titles.length > 0"
    class="w-full p-4"
    :class="embedded
      ? 'rounded-2xl border border-rose-100/90 bg-white/95 shadow-[0_18px_45px_rgba(244,63,94,0.10)] backdrop-blur-md'
      : 'rounded-2xl border border-rose-100 bg-white/75 shadow-sm backdrop-blur-sm'"
    aria-label="文章目录"
  >
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="flex items-center gap-2 font-display text-sm font-bold text-rose-950">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-400">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 4h14M5 9h14M5 14h9M5 19h9"/></svg>
        </span>
        故事目录
      </h2>
      <span class="text-[10px] text-rose-700/40">{{ headingCount }} 节</span>
    </div>
    <div class="toc-wrapper">
      <ul class="toc space-y-0.5">
        <li v-for="title in titles" :key="title.index">
          <button
            type="button"
            @click="scrollToView(title.offsetTop, title.index)"
            class="block w-full truncate rounded-lg border-l-2 py-1.5 text-left transition"
            :class="getHeadingButtonClass(title)"
          >
            {{ title.text }}
          </button>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false
  },
  containerSelector: {
    type: String,
    default: '.md-editor-preview'
  },
  content: {
    type: String,
    default: ''
  }
})

const titles = ref([])
const activeHeadingIndex = ref(-1)
const headingCount = computed(() => titles.value.length)
let observer = null

function handleContentScroll() {
  const scrollY = window.scrollY + 120
  let currentIndex = -1
  for (const title of titles.value) {
    if (scrollY >= title.offsetTop) {
      currentIndex = title.index
    } else {
      break
    }
  }
  activeHeadingIndex.value = currentIndex
}

function getHeadingButtonClass(title) {
  const depthClass = title.depth === 0
    ? 'px-3 text-xs'
    : title.depth === 1
      ? 'pl-6 pr-3 text-[11px]'
      : 'pl-9 pr-3 text-[11px]'

  const stateClass = title.index === activeHeadingIndex.value
    ? title.depth === 0
      ? 'border-rose-400 bg-rose-50 font-semibold text-rose-600'
      : 'border-rose-300 bg-rose-50/70 font-semibold text-rose-500'
    : title.depth === 0
      ? 'border-transparent text-rose-700/55 hover:bg-rose-50/60 hover:text-rose-600'
      : 'border-transparent text-rose-700/40 hover:bg-rose-50/50 hover:text-rose-500'

  return [depthClass, stateClass]
}

function buildTocData(container) {
  if (!container) return
  const headings = Array.from(container.querySelectorAll('h1, h2, h3'))
    .map(heading => ({
      element: heading,
      level: parseInt(heading.tagName.substring(1)),
      text: heading.innerText.trim()
    }))
    .filter(heading => heading.text)

  const minLevel = Math.min(...headings.map(heading => heading.level))
  const arr = headings.map((heading, index) => {
    const level = heading.level
    const rect = heading.element.getBoundingClientRect()
    const offsetTop = Math.round(rect.top + window.scrollY)

    return {
      index: index + 1,
      level,
      depth: Math.min(level - minLevel, 2),
      text: heading.text,
      offsetTop
    }
  })
  titles.value = arr
}

function initToc(container) {
  if (!container) return

  buildTocData(container)

  if (observer) {
    observer.disconnect()
  }

  observer = new MutationObserver(() => {
    titles.value = []
    buildTocData(container)

    // 图片加载完成后重新计算 offsetTop
    container.querySelectorAll('img').forEach(img => {
      img.addEventListener('load', () => buildTocData(container), { once: true })
    })
  })

  observer.observe(container, { childList: true, subtree: true })

  // 图片加载完成后重新计算 offsetTop
  container.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', () => buildTocData(container), { once: true })
  })

  window.addEventListener('scroll', handleContentScroll)
}

// 监听 content 变化（切换故事时重新初始化目录）
watch(() => props.content, () => {
  window.removeEventListener('scroll', handleContentScroll)
  observer?.disconnect()
  titles.value = []
  activeHeadingIndex.value = -1

  nextTick(() => {
    const container = document.querySelector(props.containerSelector)
    if (container) initToc(container)
  })
})

onMounted(() => {
  nextTick(() => {
    const container = document.querySelector(props.containerSelector)
    if (container) initToc(container)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleContentScroll)
  observer?.disconnect()
})

function scrollToView(offsetTop, headingIndex) {
  activeHeadingIndex.value = headingIndex
  window.scrollTo({ top: Math.max(0, offsetTop - 96), behavior: 'smooth' })
}
</script>

<style scoped>
.toc-wrapper {
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  max-height: 75vh;
  text-overflow: ellipsis;
  white-space: nowrap;
  scroll-behavior: smooth;
}

</style>
