<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <!-- 加载中：保持与详情排版一致的骨架，避免正文加载完成时页面跳动 -->
      <div
        v-if="loading"
        class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8"
        aria-label="正在加载公开故事"
        aria-busy="true"
      >
        <div class="h-72 animate-pulse rounded-[2rem] border border-rose-100 bg-white/60" />
        <div class="mx-auto mt-8 max-w-3xl rounded-3xl border border-rose-100 bg-white/60 p-6 sm:p-10">
          <div class="h-5 w-2/3 animate-pulse rounded-full bg-rose-100" />
          <div class="mt-6 space-y-3">
            <div
              v-for="n in 7"
              :key="n"
              class="h-3.5 animate-pulse rounded-full bg-rose-50"
              :class="n % 3 === 0 ? 'w-4/5' : 'w-full'"
            />
          </div>
        </div>
      </div>

      <!-- 加载失败：网络或服务异常，允许重试 -->
      <section
        v-else-if="loadError"
        class="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 sm:py-32"
        role="alert"
      >
        <div class="rounded-[2rem] border border-rose-100 bg-white/70 px-5 py-16">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-300">
            <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
              <path d="M10.3 3.8 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3l-7.4-13.2a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h1 class="mt-5 font-display text-2xl font-bold text-rose-950">这篇故事暂时打不开</h1>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700/55">{{ loadError }}</p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              class="rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              @click="loadStory"
            >
              重新加载
            </button>
            <RouterLink
              :to="spaceLink"
              class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            >
              返回公开空间
            </RouterLink>
          </div>
        </div>
      </section>

      <!-- 故事不存在 / 已撤回 / 空间不再公开：统一空状态，不泄露任何正文 -->
      <section v-else-if="!story" class="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 sm:py-32">
        <div class="rounded-[2rem] border border-dashed border-rose-200 bg-white/60 px-5 py-16">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl text-rose-300" aria-hidden="true">♡</div>
          <p class="mt-5 font-display text-2xl font-bold text-rose-950">这篇故事暂时无法阅读</p>
          <p class="mt-2 text-sm text-rose-700/50">它可能已被撤回，或者这个空间已经不再公开。</p>
          <RouterLink
            :to="spaceLink"
            class="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-200 transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M19 12H5m6 6-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            返回公开空间
          </RouterLink>
        </div>
      </section>

      <!-- 公开故事详情 -->
      <div v-else class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <RouterLink
          :to="spaceLink"
          class="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/75 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M19 12H5m6 6-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          返回公开空间
        </RouterLink>

        <section class="relative mt-5 overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white/75 shadow-sm shadow-rose-100/50 backdrop-blur-sm">
          <div class="pointer-events-none absolute -left-12 -top-20 h-56 w-56 rounded-full bg-rose-100/60 blur-3xl" aria-hidden="true" />
          <div
            class="relative grid gap-0"
            :class="story.coverImage ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : ''"
          >
            <div class="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-10">
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span v-if="story.tagLabel" class="rounded-full border px-3 py-1 font-semibold" :style="tagPillStyle">{{ story.tagLabel }}</span>
                <span
                  v-if="story.isMilestone"
                  class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700"
                >
                  <svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7Z" />
                  </svg>
                  里程碑
                </span>
                <span class="font-semibold uppercase tracking-[0.18em] text-rose-400">公开故事</span>
              </div>

              <h1 class="mt-4 break-words font-display text-3xl font-extrabold leading-tight tracking-tight text-rose-950 sm:text-4xl lg:text-5xl">
                {{ story.title }}
              </h1>
              <p v-if="story.summary" class="mt-4 max-w-2xl whitespace-pre-line break-words text-sm leading-7 text-rose-800/60 sm:text-base">
                {{ story.summary }}
              </p>

              <div class="mt-7 flex flex-wrap gap-2 text-[11px] text-rose-700/60">
                <span v-if="formattedDate" class="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/75 px-3 py-1.5">
                  <svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M8 3v4M16 3v4M3 10h18" stroke-linecap="round" />
                  </svg>
                  <time>{{ formattedDate }}</time>
                </span>
                <span v-if="story.location" class="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-rose-100 bg-white/75 px-3 py-1.5">
                  <svg class="h-3.5 w-3.5 shrink-0 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  <span class="truncate">{{ story.location }}</span>
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/75 px-3 py-1.5">
                  <svg class="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M6 3h9l3 3v15H6z" />
                    <path d="M9 11h6M9 15h4" />
                  </svg>
                  {{ contentLengthText }}
                </span>
              </div>
            </div>

            <div v-if="story.coverImage" class="relative min-h-64 overflow-hidden bg-rose-50 lg:min-h-[26rem]">
              <img
                v-if="!coverFailed"
                :src="story.coverImage"
                :alt="story.title"
                class="absolute inset-0 h-full w-full object-cover"
                @error="coverFailed = true"
              >
              <div v-else class="absolute inset-0 flex items-center justify-center text-4xl text-rose-300" aria-hidden="true">♥</div>
              <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-rose-950/25 via-transparent to-transparent lg:bg-gradient-to-r lg:from-white/20" aria-hidden="true" />
            </div>
          </div>
        </section>

        <!-- 正文：宽度受控，长单词、链接与代码块不撑破页面 -->
        <article class="public-story-article mt-8 min-w-0 rounded-[1.75rem] border border-rose-100/90 bg-white/90 px-5 py-7 shadow-sm shadow-rose-100/30 backdrop-blur-sm sm:px-9 sm:py-10 lg:px-12">
          <MdPreview
            v-if="story.content"
            :modelValue="story.content"
            :editor-id="`publicStoryDetailPreview-${story.storyId}`"
            :code-foldable="false"
            :show-code-row-number="false"
          />
          <p v-else class="py-10 text-center text-sm text-rose-700/50">这篇故事还没有正文。</p>
        </article>

        <div class="mt-8 flex justify-center">
          <RouterLink
            :to="spaceLink"
            class="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          >
            继续浏览公开空间
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </RouterLink>
        </div>
      </div>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import { fetchPublicStoryDetail } from '@/api/gallery'
import { formatSpaceDate } from '@/utils/spaceFormat'
import {
  DEFAULT_THEME_COLOR,
  accentTextColor,
  normalizeHexColor,
  softenHexColor,
  themeBorderColor,
} from '@/utils/themeColor'
import { readSpaceErrorMessage } from '@/utils/spaceState'

const route = useRoute()

/** 后端已明确的“不可阅读”错误码：故事不存在、空间不存在、未公开、当前不可访问。 */
const UNAVAILABLE_ERROR_CODES = new Set(['20003', '20032', '20046', '20049'])

const story = ref(null)
const loading = ref(true)
const loadError = ref('')
const coverFailed = ref(false)
let requestId = 0

function readPositiveRouteParam(raw) {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isInteger(value) && value > 0 ? value : null
}

const spaceId = computed(() => readPositiveRouteParam(route.params.spaceId))
const storyId = computed(() => readPositiveRouteParam(route.params.storyId))
const spaceLink = computed(() => (
  spaceId.value ? `/plaza/${spaceId.value}` : '/plaza'
))

const tagAccent = computed(() => normalizeHexColor(story.value?.tagColor, DEFAULT_THEME_COLOR))
const tagPillStyle = computed(() => ({
  backgroundColor: softenHexColor(tagAccent.value),
  borderColor: themeBorderColor(tagAccent.value),
  color: accentTextColor(tagAccent.value),
}))

const formattedDate = computed(() => formatSpaceDate(story.value?.happenedTime, ''))
const contentLengthText = computed(() => {
  const count = Number(story.value?.contentLength)
  if (!Number.isFinite(count) || count <= 0) return '还没有正文'
  return `约 ${count.toLocaleString('zh-CN')} 字`
})

/** 只取公开详情允许展示的字段，避免把响应中的其他字段带入页面状态。 */
function toPublicStory(detail) {
  return {
    storyId: detail.storyId,
    title: detail.title || '未命名故事',
    summary: detail.summary || '',
    content: detail.content || '',
    contentLength: String(detail.content || '').replace(/\s/g, '').length,
    happenedTime: detail.happenedTime || '',
    location: detail.location || '',
    coverImage: detail.coverImage || '',
    tagLabel: detail.tagLabel || '',
    tagColor: detail.tagColor || '',
    isMilestone: detail.isMilestone === true,
  }
}

function isUnavailableResponse(body) {
  return UNAVAILABLE_ERROR_CODES.has(String(body?.errorCode ?? ''))
}

async function loadStory() {
  const currentSpaceId = spaceId.value
  const currentStoryId = storyId.value
  const currentRequestId = ++requestId

  story.value = null
  loadError.value = ''
  coverFailed.value = false

  if (!currentSpaceId || !currentStoryId) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const { data } = await fetchPublicStoryDetail(currentSpaceId, currentStoryId)
    // 路由已切换时丢弃旧请求，避免旧数据覆盖新故事。
    if (currentRequestId !== requestId) return

    if (!data?.success) {
      if (!isUnavailableResponse(data)) {
        loadError.value = data?.message || '公开故事加载失败'
      }
      return
    }
    if (!data.data) return

    story.value = toPublicStory(data.data)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  } catch (error) {
    if (currentRequestId !== requestId) return
    loadError.value = readSpaceErrorMessage(error, '公开故事加载失败，请稍后重试')
  } finally {
    if (currentRequestId === requestId) {
      loading.value = false
    }
  }
}

watch(
  () => [spaceId.value, storyId.value],
  () => loadStory(),
  { immediate: true },
)
</script>

<style scoped>
/* 公开故事正文：参考私密故事详情排版，但只通过匿名公开接口取数。 */
.public-story-article :deep(.md-editor),
.public-story-article :deep(.md-editor-preview-wrapper) {
  background: transparent;
}

.public-story-article :deep(.md-editor-preview-wrapper) {
  padding: 0;
}

.public-story-article :deep(.md-editor-preview) {
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: 16px;
  line-height: 2;
  color: #3b2f2f;
}

.public-story-article :deep(.md-editor-preview h1),
.public-story-article :deep(.md-editor-preview h2),
.public-story-article :deep(.md-editor-preview h3),
.public-story-article :deep(.md-editor-preview h4) {
  font-family: 'Noto Serif SC', serif;
  color: #4a1d2f;
  letter-spacing: -0.02em;
}

.public-story-article :deep(.md-editor-preview h1) {
  margin-top: 0;
  font-size: 2rem;
}

.public-story-article :deep(.md-editor-preview h2) {
  margin-top: 2.5rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid #ffe4e6;
  font-size: 1.55rem;
}

.public-story-article :deep(.md-editor-preview h3) {
  margin-top: 2rem;
  font-size: 1.2rem;
}

.public-story-article :deep(.md-editor-preview p) {
  margin: 1.15rem 0;
}

.public-story-article :deep(.md-editor-preview a) {
  color: #e11d48;
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
}

.public-story-article :deep(.md-editor-preview img) {
  max-width: 100%;
  height: auto;
  margin: 1.75rem auto;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(159, 18, 57, 0.1);
}

.public-story-article :deep(.md-editor-preview blockquote) {
  margin: 1.75rem 0;
  padding: 1rem 1.25rem;
  border-radius: 0 14px 14px 0;
  border-left-color: #fda4af;
  background: rgba(255, 241, 242, 0.65);
  color: #9f5468;
}

.public-story-article :deep(.md-editor-preview ol) {
  list-style: decimal !important;
  padding-left: 2em;
}

.public-story-article :deep(.md-editor-preview ul) {
  list-style: disc !important;
  padding-left: 2em;
}

.public-story-article :deep(.md-editor-preview code) {
  border-radius: 6px;
  background: #fff1f2;
  color: #be123c;
  overflow-wrap: anywhere;
}

.public-story-article :deep(.md-editor-preview pre) {
  max-width: 100%;
  margin: 1.75rem 0;
  overflow-x: auto;
  border: 1px solid #ffe4e6;
  border-radius: 16px;
  background: #fffafb;
}

.public-story-article :deep(.md-editor-preview table) {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.public-story-article :deep(.md-editor-preview hr) {
  margin: 2.5rem 0;
  border-color: #ffe4e6;
}

@media (max-width: 640px) {
  .public-story-article :deep(.md-editor-preview) {
    font-size: 15px;
    line-height: 1.9;
  }

  .public-story-article :deep(.md-editor-preview h1) {
    font-size: 1.65rem;
  }

  .public-story-article :deep(.md-editor-preview h2) {
    font-size: 1.35rem;
  }
}
</style>
