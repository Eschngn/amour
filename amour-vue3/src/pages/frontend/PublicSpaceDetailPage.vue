<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <RouterLink
            to="/plaza"
            class="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/75 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M19 12H5m5 5-5-5 5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            返回恋爱广场
          </RouterLink>
        </div>

        <div v-if="loading" class="space-y-6" aria-label="正在加载公开情侣空间" aria-busy="true">
          <div class="h-14 animate-pulse rounded-2xl border border-rose-100 bg-white/55" />
          <div class="h-52 animate-pulse rounded-[2rem] border border-rose-100 bg-white/65" />
          <div class="space-y-5">
            <div class="h-48 animate-pulse rounded-[1.75rem] border border-rose-100 bg-white/65" />
            <div class="h-64 animate-pulse rounded-[1.75rem] border border-rose-100 bg-white/65" />
          </div>
        </div>

        <section
          v-else-if="loadError"
          class="rounded-[1.75rem] border border-rose-100 bg-white/80 px-6 py-16 text-center shadow-sm shadow-rose-100/40"
          role="alert"
        >
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-400">
            <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
              <path d="M10.3 3.8 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3l-7.4-13.2a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h1 class="mt-4 font-display text-xl font-bold text-rose-950">这个公开空间暂时无法打开</h1>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700/55">{{ loadError }}</p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <button
              v-if="spaceId"
              type="button"
              class="rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              @click="loadDetail"
            >
              重新加载
            </button>
            <RouterLink
              to="/plaza"
              class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              返回恋爱广场
            </RouterLink>
          </div>
        </section>

        <template v-else-if="space">
          <!-- 空间信息头部：不使用封面大图，保持信息密度与首屏可读性 -->
          <header class="overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white/85 shadow-lg shadow-rose-100/40 backdrop-blur-sm">
            <div class="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-pink-50/80 px-5 py-6 sm:px-8 sm:py-8">
              <div class="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-rose-100/70 blur-3xl" aria-hidden="true" />
              <div class="pointer-events-none absolute -bottom-20 left-1/4 h-32 w-32 rounded-full bg-fuchsia-100/60 blur-3xl" aria-hidden="true" />

              <div class="relative">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-white/80 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-rose-600">
                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    公开空间
                  </span>
                  <span v-if="isOwnPublicSpace" class="rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                    你的公开主页
                  </span>
                </div>

                <h1 class="mt-3 break-words font-display text-3xl font-bold leading-tight tracking-tight text-rose-950 sm:text-4xl">
                  {{ displayName }}
                </h1>

                <p class="mt-3 max-w-2xl whitespace-pre-line break-words text-sm leading-7 text-rose-800/65">
                  {{ description }}
                </p>

                <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-rose-700/55">
                  <span class="inline-flex items-center gap-1.5">
                    <svg class="h-3.5 w-3.5 text-rose-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M16 3v4M8 3v4M3 11h18" stroke-linecap="round" />
                    </svg>
                    {{ togetherText }}
                  </span>
                  <span v-if="startDateText" class="inline-flex items-center gap-1.5">
                    <span class="h-1.5 w-1.5 rounded-full bg-rose-300" aria-hidden="true" />
                    {{ startDateText }}
                  </span>
                </div>
              </div>
            </div>

            <div class="border-t border-rose-100/80 p-5 sm:p-6">
              <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div class="rounded-2xl border border-rose-100/80 bg-rose-50/45 px-3 py-2.5 text-center">
                  <dt class="text-[10px] text-rose-700/45">空间成员</dt>
                  <dd class="mt-0.5 font-display text-lg font-bold tabular-nums text-rose-800">{{ members.length }}</dd>
                </div>
                <div class="rounded-2xl border border-rose-100/80 bg-rose-50/45 px-3 py-2.5 text-center">
                  <dt class="text-[10px] text-rose-700/45">公开故事</dt>
                  <dd class="mt-0.5 font-display text-lg font-bold tabular-nums text-rose-800">{{ counts.story }}</dd>
                </div>
                <div class="rounded-2xl border border-rose-100/80 bg-rose-50/45 px-3 py-2.5 text-center">
                  <dt class="text-[10px] text-rose-700/45">公开照片</dt>
                  <dd class="mt-0.5 font-display text-lg font-bold tabular-nums text-rose-800">{{ counts.photo }}</dd>
                </div>
                <div class="rounded-2xl border border-rose-100/80 bg-rose-50/45 px-3 py-2.5 text-center">
                  <dt class="text-[10px] text-rose-700/45">公开纪念日</dt>
                  <dd class="mt-0.5 font-display text-lg font-bold tabular-nums text-rose-800">{{ counts.anniversary }}</dd>
                </div>
              </dl>

              <div class="mt-5 flex flex-wrap items-center gap-3">
                <p class="text-[11px] font-semibold text-rose-700/50">成员</p>
                <div v-if="members.length" class="flex flex-wrap gap-2">
                  <div
                    v-for="(member, index) in members"
                    :key="member.amourId || member.displayName || index"
                    class="flex items-center gap-2 rounded-full border border-rose-100/80 bg-white/75 py-1 pl-1 pr-3"
                  >
                    <span class="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rose-300 to-pink-400 text-[10px] font-bold text-white">
                      {{ initials(member.displayName) }}
                      <img
                        v-if="memberAvatar(member, index)"
                        :src="memberAvatar(member, index)"
                        :alt="`${member.displayName || '成员'}的头像`"
                        class="absolute inset-0 h-full w-full object-cover"
                        @load="$event.currentTarget.style.display = ''"
                        @error="$event.currentTarget.style.display = 'none'"
                      >
                    </span>
                    <span class="max-w-[10rem] truncate text-xs font-semibold text-rose-800">{{ member.displayName || '恋人' }}</span>
                    <span class="text-[10px] text-rose-700/40">{{ formatMemberRole(member.memberRole) }}</span>
                  </div>
                </div>
                <span v-else class="text-xs text-rose-700/45">成员信息暂未公开</span>
              </div>
            </div>
          </header>

          <div class="mt-8 grid items-start gap-8">
            <div class="min-w-0 space-y-8">
              <section aria-labelledby="public-stories-heading" class="rounded-[1.75rem] border border-rose-100/80 bg-white/80 p-5 shadow-sm shadow-rose-100/30 sm:p-7">
                <div class="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 id="public-stories-heading" class="font-display text-2xl font-bold text-rose-950">公开故事</h2>
                  </div>
                  <span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500">{{ counts.story }} 篇</span>
                </div>

                <div v-if="!stories.length" class="mt-5 rounded-2xl border border-dashed border-rose-200 bg-white/55 px-5 py-10 text-center">
                  <p class="font-display text-base font-semibold text-rose-800/70">还没有公开的故事</p>
                  <p class="mt-1 text-xs text-rose-700/45">空间主人暂时没有把故事公开到广场。</p>
                </div>

                <ol v-else class="mt-5 space-y-4">
                  <li v-for="story in stories" :key="story.storyId" class="overflow-hidden rounded-2xl border border-rose-100/80 bg-rose-50/25 p-4 sm:p-5">
                    <div class="grid gap-4" :class="story.coverImage ? 'sm:grid-cols-[10rem_minmax(0,1fr)]' : ''">
                      <div v-if="story.coverImage" class="relative aspect-[4/3] overflow-hidden rounded-xl bg-rose-100/60 sm:aspect-auto sm:min-h-28">
                        <img
                          v-if="!failedImages[`story-cover-${story.storyId}`]"
                          :src="story.coverImage"
                          :alt="story.title || '公开故事封面'"
                          class="h-full w-full object-cover"
                          loading="lazy"
                          @error="markImageFailed(`story-cover-${story.storyId}`)"
                        >
                        <div v-else class="absolute inset-0 flex items-center justify-center text-2xl text-rose-300" aria-hidden="true">♥</div>
                      </div>
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2 text-[11px] text-rose-600/50">
                          <time>{{ formatSpaceDate(story.happenedTime) }}</time>
                          <span v-if="story.location" class="text-rose-200">/</span>
                          <span v-if="story.location" class="inline-flex min-w-0 items-center gap-1">
                            <svg class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
                              <circle cx="12" cy="10" r="2.5" />
                            </svg>
                            <span class="truncate">{{ story.location }}</span>
                          </span>
                          <span v-if="story.tagLabel" class="rounded-full border px-2 py-0.5 text-[10px] font-semibold" :style="storyTagStyle(story)">{{ story.tagLabel }}</span>
                        </div>
                        <h3 class="mt-2 break-words font-display text-lg font-bold text-rose-950">{{ story.title || '未命名故事' }}</h3>
                        <p v-if="story.summary" class="mt-2 line-clamp-2 break-words text-sm leading-6 text-rose-800/65">{{ story.summary }}</p>
                        <p v-if="story.content" class="mt-2 line-clamp-4 whitespace-pre-line break-words text-sm leading-7 text-rose-800/60">{{ story.content }}</p>

                        <div v-if="story.images?.length" class="mt-3 flex flex-wrap gap-2">
                          <div
                            v-for="(image, index) in story.images.slice(0, 4)"
                            :key="`${story.storyId}-${index}`"
                            class="relative h-12 w-12 overflow-hidden rounded-lg bg-rose-100/70"
                          >
                            <img
                              v-if="image.url && !failedImages[`story-image-${story.storyId}-${index}`]"
                              :src="image.url"
                              :alt="image.altText || '故事图片'"
                              class="h-full w-full object-cover"
                              loading="lazy"
                              @error="markImageFailed(`story-image-${story.storyId}-${index}`)"
                            >
                            <div v-else class="flex h-full w-full items-center justify-center text-rose-300" aria-hidden="true">♡</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ol>
              </section>

              <section aria-labelledby="public-photos-heading" class="rounded-[1.75rem] border border-rose-100/80 bg-white/80 p-5 shadow-sm shadow-rose-100/30 sm:p-7">
                <div class="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 id="public-photos-heading" class="font-display text-2xl font-bold text-rose-950">公开照片</h2>
                  </div>
                  <span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500">{{ counts.photo }} 张</span>
                </div>

                <div v-if="!photos.length" class="mt-5 rounded-2xl border border-dashed border-rose-200 bg-white/55 px-5 py-10 text-center">
                  <p class="font-display text-base font-semibold text-rose-800/70">还没有公开的照片</p>
                  <p class="mt-1 text-xs text-rose-700/45">等空间主人愿意分享时，这里会出现光。</p>
                </div>

                <div v-else class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <figure
                    v-for="photo in photos"
                    :key="photo.photoId"
                    class="group relative aspect-square overflow-hidden rounded-2xl border border-rose-100/80 bg-rose-50/60"
                  >
                    <img
                      v-if="photo.url && !failedImages[`photo-${photo.photoId}`]"
                      :src="photo.url"
                      :alt="photo.title || '公开照片'"
                      class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                      @error="markImageFailed(`photo-${photo.photoId}`)"
                    >
                    <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center text-rose-300">
                      <span class="font-display text-3xl" aria-hidden="true">◫</span>
                      <span class="text-[10px] text-rose-400/70">暂无图片</span>
                    </div>
                    <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-rose-950/65 to-transparent p-3 pt-8">
                      <figcaption class="min-w-0">
                        <p class="truncate text-xs font-semibold text-white">{{ photo.title || '未命名照片' }}</p>
                        <p v-if="photo.location" class="mt-0.5 truncate text-[10px] text-white/65">{{ photo.location }}</p>
                      </figcaption>
                    </div>
                  </figure>
                </div>
              </section>

              <section aria-labelledby="public-anniversaries-heading" class="rounded-[1.75rem] border border-rose-100/80 bg-white/80 p-5 shadow-sm shadow-rose-100/30 sm:p-7">
                <div class="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 id="public-anniversaries-heading" class="font-display text-2xl font-bold text-rose-950">公开纪念日</h2>
                  </div>
                  <span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500">{{ counts.anniversary }} 个</span>
                </div>

                <div v-if="!anniversaries.length" class="mt-5 rounded-2xl border border-dashed border-rose-200 bg-white/55 px-5 py-10 text-center">
                  <p class="font-display text-base font-semibold text-rose-800/70">还没有公开的纪念日</p>
                  <p class="mt-1 text-xs text-rose-700/45">那些重要的日期，暂时只留在他们的私人空间里。</p>
                </div>

                <div v-else class="mt-5 grid gap-3 sm:grid-cols-2">
                  <article
                    v-for="anniversary in anniversaries"
                    :key="anniversary.anniversaryId"
                    class="rounded-2xl border border-rose-100/80 bg-rose-50/30 p-4 transition duration-300 hover:shadow-sm"
                    :style="anniversaryCardStyle(anniversary)"
                  >
                    <div class="flex items-start gap-3">
                      <span
                        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[11px] font-bold shadow-sm"
                        :style="anniversaryTileStyle(anniversary)"
                        aria-hidden="true"
                      >
                        {{ monthDay(anniversary.anniversaryDate) }}
                      </span>
                      <div class="min-w-0">
                        <p class="text-[10px] font-medium tracking-wide text-rose-500/70">{{ formatRepeatType(anniversary.repeatType) }}</p>
                        <h3 class="mt-1 break-words font-display text-base font-bold text-rose-950">{{ anniversary.title || '未命名纪念日' }}</h3>
                        <p v-if="anniversary.description" class="mt-1.5 line-clamp-3 break-words text-xs leading-5 text-rose-800/60">{{ anniversary.description }}</p>
                        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-rose-700/45">
                          <span>{{ formatSpaceDate(anniversary.anniversaryDate) }}</span>
                          <span v-if="anniversary.location" class="inline-flex min-w-0 items-center gap-1">
                            <span class="h-1 w-1 rounded-full" :style="anniversaryDotStyle(anniversary)" aria-hidden="true" />
                            <span class="truncate">{{ anniversary.location }}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </div>

          </div>
        </template>

        <section v-else class="rounded-[1.75rem] border border-dashed border-rose-200 bg-white/60 px-6 py-16 text-center">
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-300" aria-hidden="true">♡</span>
          <h1 class="mt-4 font-display text-xl font-bold text-rose-950">没有找到这个公开空间</h1>
          <p class="mt-2 text-sm text-rose-700/50">它可能还没有公开，或者链接已经失效。</p>
          <RouterLink to="/plaza" class="mt-5 inline-flex rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-600">
            返回恋爱广场
          </RouterLink>
        </section>
      </div>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import defaultBoyAvatar from '@/assets/boy.jpeg'
import defaultGirlAvatar from '@/assets/girl.jpeg'
import { fetchPublicSpaceDetail } from '@/api/gallery'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import {
  formatCount,
  formatMemberRole,
  formatRepeatType,
  formatSpaceDate,
  formatTogetherText,
  parseSpaceDateTime,
} from '@/utils/spaceFormat'
import {
  DEFAULT_THEME_COLOR,
  accentTextColor,
  contrastTextColor,
  normalizeHexColor,
  softenHexColor,
  themeBorderColor,
} from '@/utils/themeColor'
import { readSpaceErrorMessage } from '@/utils/spaceState'

const route = useRoute()
const { spaceStatus, isSpaceReady } = useFrontendSpace()

const space = ref(null)
const loading = ref(true)
const loadError = ref('')
const failedImages = ref({})
let detailRequestId = 0

const spaceId = computed(() => {
  const raw = Array.isArray(route.params.spaceId) ? route.params.spaceId[0] : route.params.spaceId
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : null
})
const displayName = computed(() => space.value?.spaceName || '未命名情侣空间')
const description = computed(() => (
  space.value?.description || 'Ta 们还没有写下简介，但公开的故事已经在慢慢发生。'
))
const members = computed(() => (Array.isArray(space.value?.members) ? space.value.members : []))
const stories = computed(() => (Array.isArray(space.value?.stories) ? space.value.stories : []))
const photos = computed(() => (Array.isArray(space.value?.photos) ? space.value.photos : []))
const anniversaries = computed(() => (
  Array.isArray(space.value?.anniversaries) ? space.value.anniversaries : []
))

function storyAccent(story) {
  return normalizeHexColor(story?.tagColor, DEFAULT_THEME_COLOR)
}

function storyTagStyle(story) {
  const accent = storyAccent(story)
  return {
    backgroundColor: softenHexColor(accent),
    borderColor: themeBorderColor(accent),
    color: accentTextColor(accent),
  }
}

function anniversaryAccent(item) {
  return normalizeHexColor(item?.colorCode, DEFAULT_THEME_COLOR)
}

function anniversaryTileStyle(item) {
  const accent = anniversaryAccent(item)
  return {
    backgroundColor: accent,
    color: contrastTextColor(accent),
  }
}

function anniversaryCardStyle(item) {
  return { borderColor: themeBorderColor(anniversaryAccent(item), DEFAULT_THEME_COLOR, 0.3) }
}

function anniversaryDotStyle(item) {
  return { backgroundColor: anniversaryAccent(item) }
}

const counts = computed(() => ({
  story: formatCount(space.value?.publicStoryCount ?? stories.value.length),
  photo: formatCount(space.value?.publicPhotoCount ?? photos.value.length),
  anniversary: formatCount(space.value?.publicAnniversaryCount ?? anniversaries.value.length),
}))
const togetherText = computed(() => formatTogetherText(space.value?.loveStartTime))
const startDateText = computed(() => {
  const date = formatSpaceDate(space.value?.loveStartTime, '')
  return date ? `开始于 ${date}` : ''
})
const isOwnPublicSpace = computed(() => (
  isSpaceReady.value
  && Number(spaceStatus.value?.spaceId) === Number(space.value?.spaceId)
))
function initials(name) {
  return String(name || '恋人').trim().slice(0, 2).toUpperCase()
}

function memberAvatar(member, index) {
  return member?.avatar || (index === 0 ? defaultBoyAvatar : defaultGirlAvatar)
}

function markImageFailed(key) {
  failedImages.value = { ...failedImages.value, [key]: true }
}

function monthDay(value) {
  const date = parseSpaceDateTime(value)
  if (!date) return '—'
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

async function loadDetail() {
  const id = spaceId.value
  const requestId = ++detailRequestId

  space.value = null
  failedImages.value = {}
  loadError.value = ''

  if (!id) {
    loading.value = false
    loadError.value = '空间编号无效，请从恋爱广场重新进入。'
    return
  }

  loading.value = true
  try {
    const { data } = await fetchPublicSpaceDetail(id)
    if (requestId !== detailRequestId) return
    if (!data?.success) {
      throw new Error(data?.message || '公开情侣空间加载失败')
    }
    if (!data.data) {
      throw new Error('这个公开空间暂时不可访问')
    }

    const detail = data.data
    space.value = {
      ...detail,
      members: Array.isArray(detail.members) ? detail.members : [],
      stories: Array.isArray(detail.stories) ? detail.stories : [],
      photos: Array.isArray(detail.photos) ? detail.photos : [],
      anniversaries: Array.isArray(detail.anniversaries) ? detail.anniversaries : [],
    }
  } catch (error) {
    if (requestId !== detailRequestId) return
    loadError.value = readSpaceErrorMessage(error, '公开情侣空间加载失败，请稍后重试')
  } finally {
    if (requestId === detailRequestId) {
      loading.value = false
    }
  }
}

watch(
  () => route.params.spaceId,
  () => {
    loadDetail()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  },
  { immediate: true },
)
</script>
