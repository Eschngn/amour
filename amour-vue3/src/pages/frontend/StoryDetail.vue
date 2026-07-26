<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <!-- 加载中 -->
      <div v-if="loading" class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20" aria-label="正在加载故事" aria-busy="true">
        <div class="h-80 animate-pulse rounded-[2rem] border border-rose-100 bg-white/60" />
        <div class="mx-auto mt-8 max-w-3xl rounded-3xl border border-rose-100 bg-white/60 p-6 sm:p-10">
          <div class="h-5 w-2/3 animate-pulse rounded-full bg-rose-100" />
          <div class="mt-6 space-y-3"><div v-for="n in 7" :key="n" class="h-3.5 animate-pulse rounded-full bg-rose-50" :class="n % 3 === 0 ? 'w-4/5' : 'w-full'" /></div>
        </div>
      </div>

      <!-- 故事不存在 -->
      <div v-else-if="!story" class="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 sm:py-32">
        <div class="rounded-[2rem] border border-dashed border-rose-200 bg-white/60 px-5 py-16">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl text-rose-300" aria-hidden="true">♡</div>
          <p class="mt-5 font-display text-2xl font-bold text-rose-950">故事不在这里</p>
          <p class="mt-2 text-sm text-rose-700/50">它可能已被删除，或者还没有被写下。</p>
          <router-link to="/story" class="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-200 transition hover:-translate-y-0.5 hover:brightness-105">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
            返回故事列表
          </router-link>
        </div>
      </div>

      <!-- 故事详情 -->
      <div v-else class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <!-- Hero：封面 + 标题 + Meta -->
        <section class="relative overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white/75 shadow-sm shadow-rose-100/50 backdrop-blur-sm">
          <div class="pointer-events-none absolute -left-12 -top-20 h-56 w-56 rounded-full bg-rose-100/70 blur-3xl" aria-hidden="true" />
          <div class="relative grid lg:grid-cols-[minmax(0,1fr)_24rem]" :class="story.coverImage ? '' : 'lg:grid-cols-1'">
            <div class="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
              <router-link to="/story" class="mb-7 inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
                返回故事列表
              </router-link>

              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span v-if="story.tagLabel" class="rounded-full bg-rose-100/80 px-3 py-1 font-semibold text-rose-600">{{ story.tagLabel }}</span>
                <span class="font-semibold uppercase tracking-[0.18em] text-rose-400">{{ story.chapterName }}</span>
              </div>
              <h1 class="mt-4 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-rose-950 sm:text-5xl lg:text-6xl">{{ story.title }}</h1>
              <p v-if="story.summary" class="mt-4 max-w-2xl text-sm leading-7 text-rose-800/60 sm:text-base">{{ story.summary }}</p>

              <div class="mt-7 flex flex-wrap gap-2 text-[11px] text-rose-700/60">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/75 px-3 py-1.5"><svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{{ readTime }}</span>
                <span class="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/75 px-3 py-1.5"><svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h4"/></svg>{{ totalWords }} 字</span>
                <time class="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/75 px-3 py-1.5"><svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>{{ formattedDate }}</time>
                <span v-if="story.location" class="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/75 px-3 py-1.5"><svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>{{ story.location }}</span>
              </div>
            </div>

            <div v-if="story.coverImage" class="relative min-h-72 overflow-hidden bg-rose-50 lg:min-h-[30rem]">
              <img :src="story.coverImage" :alt="story.title" class="absolute inset-0 h-full w-full object-cover" />
              <div class="absolute inset-0 bg-gradient-to-t from-rose-950/30 via-transparent to-transparent lg:bg-gradient-to-r lg:from-white/20" aria-hidden="true" />
              <span class="absolute bottom-5 right-5 rounded-full border border-white/40 bg-white/25 px-3 py-1 text-[10px] font-semibold tracking-widest text-white backdrop-blur-md">OUR MEMORY</span>
            </div>
          </div>
        </section>

        <!-- 故事正文 + 目录 -->
        <section class="mt-8">
          <div class="overflow-hidden rounded-[1.75rem] border border-rose-100/90 bg-white/90 shadow-sm shadow-rose-100/30 backdrop-blur-sm lg:overflow-visible">
            <div :class="hasToc ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start' : ''">
              <!-- 正文区域 -->
              <article class="story-article min-w-0 px-5 py-7 sm:px-9 sm:py-10 lg:px-12">
                <MdPreview :modelValue="story.content" editorId="storyDetailPreview" :customIcon="markdownPreviewIcons" :codeFoldable="false" :showCodeRowNumber="false" />
              </article>

              <!-- 目录侧边栏 -->
              <aside v-if="hasToc" class="hidden border-l border-rose-100/80 px-4 py-6 lg:sticky lg:top-24 lg:block lg:self-start">
                <StoryToc :content="story.content" embedded />
              </aside>
            </div>
          </div>

          <!-- 最后更新时间 -->
          <div v-if="story.updateTime" class="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-rose-700/45">
            <svg class="h-3.5 w-3.5 text-rose-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
            最后编辑于 {{ story.updateTime }}
          </div>

          <!-- 上下篇导航 -->
          <nav class="mt-8 grid gap-3 sm:grid-cols-2" aria-label="故事翻篇导航">
            <div class="min-w-0 flex-1">
              <router-link
                v-if="story.preStory"
                :to="'/story/' + story.preStory.id"
                class="group flex h-full flex-col rounded-2xl border border-rose-100 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
              >
                <span class="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                  </svg>
                  上一篇
                </span>
                <span class="mt-2 truncate font-display text-sm font-semibold text-rose-900 group-hover:text-rose-600">
                  {{ story.preStory.title }}
                </span>
              </router-link>
            </div>

            <div class="min-w-0 flex-1">
              <router-link
                v-if="story.nextStory"
                :to="'/story/' + story.nextStory.id"
                class="group flex h-full flex-col rounded-2xl border border-rose-100 bg-white/80 p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
              >
                <span class="inline-flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                  下一篇
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h12"/><path d="M12 5l7 7-7 7"/>
                  </svg>
                </span>
                <span class="mt-2 truncate font-display text-sm font-semibold text-rose-900 group-hover:text-rose-600">
                  {{ story.nextStory.title }}
                </span>
              </router-link>
            </div>
          </nav>
        </section>
      </div>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import StoryToc from '@/components/frontend/StoryToc.vue'
import api from '@/axios'

const route = useRoute()

const markdownPreviewIcons = {
  copy: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="md-editor-icon"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>'
}

const story = ref(null)
const loading = ref(true)

const hasToc = computed(() => {
  if (!story.value?.content) return false
  return /^#{1,3}\s/m.test(story.value.content)
})

const totalWords = computed(() => {
  if (!story.value?.content) return 0
  return story.value.content.replace(/\s/g, '').length
})

const readTime = computed(() => {
  const words = totalWords.value
  if (!words) return '小于 1 分钟'
  const minutes = Math.ceil(words / 400)
  return `约 ${minutes} 分钟`
})

const formattedDate = computed(() => {
  if (!story.value?.happenedTime) return ''
  return story.value.happenedTime.split(' ')[0]
})

async function fetchStory() {
  loading.value = true
  try {
    const id = route.params.id
    const { data } = await api.post('/story/detail', { id })
    if (data.success) {
      story.value = data.data
    } else {
      story.value = null
    }
  } catch (e) {
    console.error('Failed to fetch story detail:', e)
    story.value = null
  } finally {
    loading.value = false
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
}

onMounted(fetchStory)

// 监听路由变化，切换上一篇/下一篇时重新加载
watch(() => route.params.id, (newId) => {
  if (newId) fetchStory()
})
</script>

<style>
/* md-editor 预览样式：匹配故事阅读场景 */
.story-article .md-editor,
.story-article .md-editor-preview-wrapper {
  background: transparent;
}

.story-article .md-editor-preview {
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: 0;
  font-size: 16px;
  line-height: 2;
  color: #3b2f2f;
}

.story-article .md-editor-preview h1,
.story-article .md-editor-preview h2,
.story-article .md-editor-preview h3 {
  font-family: 'Noto Serif SC', serif;
  color: #4a1d2f;
  letter-spacing: -0.02em;
}

.story-article .md-editor-preview h1 {
  margin-top: 0;
  font-size: 2rem;
}

.story-article .md-editor-preview h2 {
  margin-top: 2.5rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid #ffe4e6;
  font-size: 1.55rem;
}

.story-article .md-editor-preview h3 {
  margin-top: 2rem;
  font-size: 1.2rem;
}

.story-article .md-editor-preview p {
  margin: 1.15rem 0;
}

.story-article .md-editor-preview a {
  color: #e11d48;
  text-underline-offset: 3px;
}

.story-article .md-editor-preview img {
  margin: 1.75rem auto;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(159, 18, 57, 0.1);
}

.story-article .md-editor-preview blockquote {
  margin: 1.75rem 0;
  padding: 1rem 1.25rem;
  border-radius: 0 14px 14px 0;
  background: rgba(255, 241, 242, 0.65);
  border-left-color: #fda4af;
  color: #9f5468;
}

.story-article .md-editor-preview ol {
  list-style: decimal !important;
  padding-left: 2em;
}

.story-article .md-editor-preview ul {
  list-style: disc !important;
  padding-left: 2em;
}

.story-article .md-editor-preview code {
  border-radius: 6px;
  background: #fff1f2;
  color: #be123c;
}

.story-article .md-editor-preview .md-editor-code {
  --md-theme-code-block-color: #4a2933;
  --md-theme-code-block-bg-color: #fffafb;
  --md-theme-code-before-bg-color: #fffafb;
  --md-theme-code-copy-tips-color: #881337;
  --md-theme-code-copy-tips-bg-color: #fff1f2;
  --md-theme-code-block-radius: 16px;
  margin: 1.75rem 0;
  overflow: hidden;
  border: 1px solid #ffe4e6;
  border-radius: 16px;
  background: #fffafb;
  box-shadow: 0 12px 30px rgba(159, 18, 57, 0.08);
}

.story-article .md-editor-preview .md-editor-code .md-editor-code-head {
  position: relative;
  top: auto;
  z-index: 1;
  display: flex;
  height: 2.5rem;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ffe4e6;
  background: #fff1f2;
}

.story-article .md-editor-preview .md-editor-code .md-editor-code-flag {
  display: flex;
  min-width: 3.25rem;
  align-items: center;
  margin-inline-start: 0.875rem;
}

.story-article .md-editor-preview .md-editor-code .md-editor-code-flag span {
  margin-block-start: 0;
}

.story-article .md-editor-preview .md-editor-code .md-editor-code-action {
  position: relative;
  display: flex;
  min-width: 4rem;
  height: 2rem;
  align-items: center;
  justify-content: flex-end;
  margin-inline-end: 0.75rem;
}

.story-article .md-editor-preview .md-editor-code .md-editor-code-action > * {
  margin-inline-end: 0;
}

.story-article .md-editor-preview .md-editor-code .md-editor-code-lang {
  display: inline-flex;
  min-height: 1.625rem;
  max-width: 8rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #fecdd3;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0 0.625rem;
  color: #9f1239;
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 160ms ease, transform 160ms ease;
}

.story-article .md-editor-preview .md-editor-code .md-editor-code-lang:empty::before {
  content: 'CODE';
}

.story-article .md-editor-preview .md-editor-code .md-editor-copy-button {
  position: absolute;
  right: 0;
  display: inline-flex;
  width: 1.875rem;
  height: 1.875rem;
  align-items: center;
  justify-content: center;
  border: 1px solid #fecdd3;
  border-radius: 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  color: #be123c;
  opacity: 0;
  transform: translateY(2px) scale(0.92);
  transition: opacity 160ms ease, transform 160ms ease, background 160ms ease, border-color 160ms ease;
}

.story-article .md-editor-preview .md-editor-code .md-editor-copy-button .md-editor-icon {
  width: 0.9375rem;
  height: 0.9375rem;
}

.story-article .md-editor-preview .md-editor-code .md-editor-copy-button:hover {
  border-color: #fda4af;
  background: #ffe4e6;
}

.story-article .md-editor-preview .md-editor-code .md-editor-collapse-tips {
  display: none;
}

.story-article .md-editor-preview .md-editor-code:hover .md-editor-code-lang,
.story-article .md-editor-preview .md-editor-code:focus-within .md-editor-code-lang {
  opacity: 0;
  transform: translateY(-2px) scale(0.95);
}

.story-article .md-editor-preview .md-editor-code:hover .md-editor-copy-button,
.story-article .md-editor-preview .md-editor-code:focus-within .md-editor-copy-button {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.story-article .md-editor-preview .md-editor-code pre code {
  overflow: auto;
  padding: 1.125rem 1.25rem;
  background: #fffafb;
  color: #4a2933;
  font-size: 0.875rem;
  line-height: 1.75;
}

.story-article .md-editor-preview .md-editor-code span[rn-wrapper] {
  display: none;
}

.story-article .md-editor-preview .md-editor-code pre code .md-editor-code-block {
  color: inherit;
}

.story-article .md-editor-preview hr {
  margin: 2.5rem 0;
  border-color: #ffe4e6;
}

@media (max-width: 640px) {
  .story-article .md-editor-preview {
    font-size: 15px;
    line-height: 1.9;
  }

  .story-article .md-editor-preview h1 {
    font-size: 1.65rem;
  }

  .story-article .md-editor-preview h2 {
    font-size: 1.35rem;
  }
}
</style>
