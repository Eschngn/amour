<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <section class="relative overflow-hidden rounded-3xl border border-rose-100/80 bg-white/70 px-4 py-7 shadow-sm shadow-rose-100/50 backdrop-blur-sm sm:rounded-[2rem] sm:px-8 sm:py-10 lg:px-10">
          <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-rose-100/80 blur-3xl" aria-hidden="true" />
          <div class="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-fuchsia-100/60 blur-3xl" aria-hidden="true" />
          <div class="relative grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div>
              <p class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-rose-500">
                <span class="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
                Our Story
              </p>
              <h1 class="mt-4 font-display text-3xl font-extrabold tracking-tight text-rose-950 sm:text-5xl lg:text-6xl">
                从陌生人，<br class="hidden sm:block" />到彼此
              </h1>
              <p class="mt-4 max-w-xl text-sm leading-7 text-rose-800/65 sm:text-base">
                记录每一个让我们走得更近的瞬间。那些普通又珍贵的日子，拼成了只属于我们的故事。
              </p>
              <p class="mt-5 inline-flex max-w-full items-center gap-2 text-xs text-rose-500/70">
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-400" aria-hidden="true">♡</span>
                从 {{ startYear }} 年开始，故事一直在继续
              </p>
            </div>

            <div class="grid grid-cols-3 gap-2 sm:gap-3">
              <div class="min-w-0 rounded-2xl border border-rose-100 bg-white/80 px-2 py-4 text-center shadow-sm sm:px-4 sm:py-5">
                <p class="font-display text-2xl font-bold text-rose-600 sm:text-3xl">{{ stats.totalNodes }}</p>
                <p class="mt-1 text-[11px] text-rose-800/45">故事节点</p>
              </div>
              <div class="min-w-0 rounded-2xl border border-rose-100 bg-white/80 px-2 py-4 text-center shadow-sm sm:px-4 sm:py-5">
                <p class="font-display text-2xl font-bold text-rose-600 sm:text-3xl">{{ stats.totalSeasons }}</p>
                <p class="mt-1 text-[11px] text-rose-800/45">一起走过</p>
              </div>
              <div class="min-w-0 rounded-2xl border border-rose-100 bg-white/80 px-2 py-4 text-center shadow-sm sm:px-4 sm:py-5">
                <p class="font-display text-2xl font-bold text-rose-600 sm:text-3xl">{{ shortStartYear }}</p>
                <p class="mt-1 text-[11px] text-rose-800/45">故事开始</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 页面加载状态 -->
        <section v-if="loading" class="mt-10 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]" aria-label="正在加载故事" aria-busy="true">
          <div class="h-72 animate-pulse rounded-3xl border border-rose-100 bg-white/60" />
          <div class="space-y-4">
            <div class="h-8 w-48 animate-pulse rounded-full bg-rose-100" />
            <div v-for="n in 3" :key="n" class="h-48 animate-pulse rounded-3xl border border-rose-100 bg-white/60" />
          </div>
        </section>

        <!-- 错误状态 -->
        <section v-else-if="loadError" class="mt-10 rounded-3xl border border-rose-100 bg-white/75 px-5 py-16 text-center shadow-sm">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-300" aria-hidden="true">!</div>
          <p class="mt-4 text-sm text-rose-500">{{ loadError }}</p>
          <button type="button" class="mt-5 rounded-full border border-rose-200 px-5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="init">重新加载</button>
        </section>

        <!-- 章节与时间线 -->
        <section v-else-if="chapters.length" class="mt-8 grid items-start gap-8 sm:mt-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
          <aside class="lg:sticky lg:top-24">
            <div class="mb-4 flex items-end justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.22em] text-rose-400">Chapters</p>
                <h2 class="mt-1 font-display text-xl font-bold text-rose-950">故事章节</h2>
              </div>
              <span class="text-xs text-rose-700/45">{{ chapters.length }} 章</span>
            </div>
            <nav class="story-chapter-nav -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:block lg:space-y-2 lg:overflow-visible lg:px-0 lg:pb-0" aria-label="故事章节">
              <button
                v-for="(chapter, i) in chapters"
                :key="chapter.id"
                type="button"
                class="group flex min-w-[min(15rem,calc(100vw-3rem))] snap-start items-center gap-3 rounded-2xl border p-3.5 text-left transition duration-300 lg:w-full lg:min-w-0"
                :class="activeChapter === i
                  ? 'border-rose-200 bg-white shadow-md shadow-rose-100/60'
                  : 'border-transparent bg-white/45 hover:border-rose-100 hover:bg-white/70'"
                @click="activeChapter = i"
              >
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition" :class="activeChapter === i ? 'bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-sm shadow-rose-200' : 'bg-rose-100 text-rose-500 group-hover:bg-rose-200'">
                  {{ String(i + 1).padStart(2, '0') }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[10px] font-semibold uppercase tracking-wider text-rose-400">{{ chapter.period }}</span>
                  <span class="mt-0.5 block truncate font-display text-sm font-semibold text-rose-900">{{ chapter.title }}</span>
                </span>
                <span v-if="chapter._storyCount !== undefined" class="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-500">{{ chapter._storyCount }}</span>
              </button>
            </nav>
          </aside>

          <div class="min-w-0">
            <header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div class="min-w-0">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">{{ currentChapter?.period ?? '' }}</p>
                <h2 class="mt-1 break-words font-display text-2xl font-bold text-rose-950 sm:text-3xl">{{ currentChapter?.title ?? '' }}</h2>
              </div>
              <span class="inline-flex w-fit items-center gap-2 rounded-full border border-rose-100 bg-white/70 px-3 py-1.5 text-xs text-rose-700/55">
                <span class="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
                {{ currentStories.length }} 个故事
              </span>
            </header>

            <div v-if="storiesLoading" class="space-y-4" aria-label="正在加载本章故事" aria-busy="true">
              <div v-for="n in 3" :key="n" class="h-48 animate-pulse rounded-3xl border border-rose-100 bg-white/60" />
            </div>

            <div v-else-if="storiesError" class="rounded-3xl border border-rose-100 bg-white/70 px-5 py-12 text-center">
              <p class="text-sm text-rose-500">{{ storiesError }}</p>
              <button type="button" class="mt-4 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50" @click="fetchStoriesByChapterId(currentChapter.id)">重试</button>
            </div>

            <Transition name="story-fade" mode="out-in">
              <div v-if="currentStories.length && !storiesLoading && !storiesError" :key="activeChapter" class="relative">
                <div class="absolute bottom-4 left-[0.7rem] top-4 w-px bg-gradient-to-b from-rose-300 via-rose-200 to-transparent sm:left-[1.15rem]" aria-hidden="true" />
                <ol class="space-y-5">
                  <li v-for="story in currentStories" :key="story.id" class="relative pl-7 sm:pl-12">
                    <span class="absolute left-1 top-7 z-10 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-rose-400 shadow-sm ring-1 ring-rose-200 sm:left-3" aria-hidden="true" />
                    <router-link :to="'/story/' + story.id" class="group block min-w-0 overflow-hidden rounded-2xl border border-rose-100/90 bg-white/85 shadow-sm shadow-rose-100/30 transition duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lg sm:rounded-3xl">
                      <div class="grid sm:grid-cols-[minmax(0,1fr)_12rem]" :class="story.coverImage ? '' : 'sm:grid-cols-1'">
                        <div class="min-w-0 p-4 sm:p-6">
                          <div class="flex flex-wrap items-center gap-2 text-[11px] text-rose-600/50">
                            <span class="font-semibold uppercase tracking-[0.12em] text-rose-400 sm:tracking-[0.16em]">{{ story.storyNumber }}</span>
                            <span class="text-rose-200">/</span>
                            <time>{{ story.date }}</time>
                            <span v-if="story.location" class="inline-flex min-w-0 items-center gap-1"><svg class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span class="truncate">{{ story.location }}</span></span>
                          </div>
                          <div class="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <h3 class="min-w-0 break-words font-display text-lg font-bold text-rose-950 transition group-hover:text-rose-600 sm:text-xl">{{ story.title }}</h3>
                            <span v-if="story.tag" class="w-fit max-w-full shrink-0 truncate rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-500 ring-1 ring-rose-100">{{ story.tag }}</span>
                          </div>
                          <p class="mt-3 line-clamp-3 text-sm leading-7 text-rose-800/65">{{ story.content || '这一段故事，等你慢慢打开。' }}</p>
                          <span class="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500">阅读全文<svg class="h-3.5 w-3.5 transition group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
                        </div>
                        <div v-if="story.coverImage" class="relative aspect-[16/10] overflow-hidden bg-rose-50 sm:aspect-auto sm:min-h-full">
                          <img :src="story.coverImage" :alt="story.title" class="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                          <div class="absolute inset-0 bg-gradient-to-t from-rose-950/15 to-transparent sm:bg-gradient-to-r" aria-hidden="true" />
                        </div>
                      </div>
                    </router-link>
                  </li>
                </ol>
                <div class="relative mt-6 pl-7 sm:pl-12"><span class="absolute left-1 top-0 h-3.5 w-3.5 rounded-full border-2 border-rose-200 bg-white sm:left-3" aria-hidden="true" /><p class="text-xs italic text-rose-400/55">未完待续，下一页还在一起书写……</p></div>
              </div>
            </Transition>

            <div v-if="!storiesLoading && !storiesError && !currentStories.length" class="rounded-3xl border border-dashed border-rose-200 bg-white/55 px-5 py-14 text-center">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-300" aria-hidden="true">♡</div>
              <p class="mt-4 font-display text-lg font-semibold text-rose-900">这一章还没有故事</p>
              <p class="mt-1 text-sm text-rose-700/50">值得记录的日子，正在前面等着你们。</p>
            </div>
          </div>
        </section>

        <section v-else class="mt-10 rounded-3xl border border-dashed border-rose-200 bg-white/55 px-5 py-20 text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl text-rose-300" aria-hidden="true">♡</div>
          <p class="mt-5 font-display text-xl font-semibold text-rose-900">故事还在路上</p>
          <p class="mt-2 text-sm text-rose-700/50">等第一个值得纪念的瞬间出现，就从这里开始记录吧。</p>
        </section>
      </div>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import api from '@/axios'

const chapters = ref([])
const currentStories = ref([])
const stats = ref({
  totalNodes: 0,
  totalSeasons: 0,
  totalChapters: 0,
  startDate: '',
})
const loading = ref(true)
const storiesLoading = ref(false)
const loadError = ref('')
const storiesError = ref('')
const activeChapter = ref(0)

async function fetchStoryOverview() {
  const res = await api.post('/story/overview')
  if (res.data.success) {
    const data = res.data.data
    stats.value = {
      totalNodes: data.totalNodes,
      totalSeasons: data.totalSeasons,
      totalChapters: data.totalChapters,
      startDate: data.startDate,
    }

    chapters.value = (data.chapters || []).map(ch => ({
      id: ch.id,
      title: ch.name,
      period: formatPeriod(ch.startDate, ch.endDate),
      _storyCount: Number(ch.nodeCount) || 0,
    }))
  }
}

async function fetchStoriesByChapterId(chapterId) {
  storiesLoading.value = true
  storiesError.value = ''
  try {
    const res = await api.post('/story/getStoryByChapterId', { chapterId: String(chapterId) })
    if (res.data.success) {
      let globalIdx = chapters.value
        .slice(0, activeChapter.value)
        .reduce((sum, ch) => sum + (ch._storyCount ?? 0), 0)

      const stories = (res.data.data || []).map((node, i) => {
        globalIdx++
        return {
          id: node.id,
          date: formatDate(node.happenedTime),
          location: node.location,
          title: node.title,
          tag: node.tagLabel,
          content: node.summary,
          coverImage: node.coverImage,
          storyNumber: `Story #${String(globalIdx).padStart(2, '0')}`,
        }
      })

      // cache story count so subsequent chapters calculate correct global index
      chapters.value[activeChapter.value]._storyCount = stories.length
      currentStories.value = stories
    } else {
      currentStories.value = []
      storiesError.value = res.data.message || '本章故事暂时加载失败，请稍后重试'
    }
  } catch (e) {
    console.error('Failed to fetch stories by chapterId:', e)
    currentStories.value = []
    storiesError.value = '本章故事暂时加载失败，请稍后重试'
  } finally {
    storiesLoading.value = false
  }
}

async function init() {
  loading.value = true
  loadError.value = ''
  activeChapter.value = 0
  try {
    await fetchStoryOverview()
    if (chapters.value.length) {
      await fetchStoriesByChapterId(chapters.value[0].id)
    }
  } catch (e) {
    console.error('Failed to init story page:', e)
    loadError.value = '故事暂时加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

watch(activeChapter, async (newIdx) => {
  const chapter = chapters.value[newIdx]
  if (chapter?.id) {
    await fetchStoriesByChapterId(chapter.id)
  }
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return dateStr.split(' ')[0].replace(/-/g, '.')
}

function formatPeriod(start, end) {
  const s = formatDate(start)
  const e = formatDate(end)
  if (s === e) return s
  return `${s} — ${e}`
}

const shortStartYear = computed(() => {
  if (!stats.value.startDate) return "'24"
  return "'" + stats.value.startDate.slice(2, 4)
})

const startYear = computed(() => {
  if (!stats.value.startDate) return '2024'
  return stats.value.startDate.slice(0, 4)
})

const currentChapter = computed(() => chapters.value[activeChapter.value])

onMounted(init)
</script>

<style scoped>
.story-fade-enter-active,
.story-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.story-fade-enter-from,
.story-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
  .story-fade-enter-active,
  .story-fade-leave-active {
    transition: none;
  }
}
</style>
