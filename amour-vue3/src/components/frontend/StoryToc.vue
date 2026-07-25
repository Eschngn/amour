<template>
  <nav v-if="titles.length > 0" class="w-full rounded-2xl border border-rose-100 bg-white/75 p-4 shadow-sm backdrop-blur-sm" aria-label="文章目录">
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
        <li v-for="(h2, index) in titles" :key="index">
          <button type="button" @click="scrollToView(h2.offsetTop, h2.index)" class="block w-full truncate rounded-lg border-l-2 px-3 py-1.5 text-left text-xs transition"
            :class="h2.index === activeHeadingIndex ? 'border-rose-400 bg-rose-50 font-semibold text-rose-600' : 'border-transparent text-rose-700/55 hover:bg-rose-50/60 hover:text-rose-600'">{{ h2.text }}</button>
          <ul v-if="h2.children && h2.children.length > 0">
            <li v-for="(h3, index2) in h2.children" :key="index2">
              <button type="button" @click="scrollToView(h3.offsetTop, h3.index)" class="block w-full truncate rounded-lg border-l-2 py-1.5 pl-6 pr-3 text-left text-[11px] transition"
                :class="h3.index === activeHeadingIndex ? 'border-rose-300 bg-rose-50/70 font-semibold text-rose-500' : 'border-transparent text-rose-700/40 hover:bg-rose-50/50 hover:text-rose-500'">{{ h3.text }}</button>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
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
const headingCount = computed(() => titles.value.reduce((sum, title) => sum + 1 + (title.children?.length || 0), 0))
let observer = null

function handleContentScroll() {
  const scrollY = window.scrollY + 120
  titles.value.forEach(title => {
    if (scrollY >= title.offsetTop) {
      activeHeadingIndex.value = title.index
    }
    if (title.children) {
      title.children.forEach(child => {
        if (scrollY >= child.offsetTop) {
          activeHeadingIndex.value = child.index
        }
      })
    }
  })
}

function buildTocData(container) {
  if (!container) return
  const headings = container.querySelectorAll('h2, h3')
  const arr = []
  let index = 1
  headings.forEach(heading => {
    const level = parseInt(heading.tagName.substring(1))
    const text = heading.innerText
    const rect = heading.getBoundingClientRect()
    const offsetTop = Math.round(rect.top + window.scrollY)

    if (level === 2) {
      arr.push({ index, level, text, offsetTop, children: [] })
    } else {
      const parent = arr[arr.length - 1]
      if (parent) {
        parent.children.push({ index, level, text, offsetTop })
      }
    }
    index++
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
