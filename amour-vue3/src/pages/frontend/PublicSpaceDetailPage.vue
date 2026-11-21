<template>
  <CouplePageScaffold>
    <main class="relative z-10">
      <!--
        返回栏常驻：滚到空间内容任意位置都能直接回广场。
        从广场列表进来时走历史回退，恢复分页与滚动位置；直接打开时退回 /plaza。
      -->
      <StoryReturnBar
        label="返回恋爱广场"
        :to="returnTo || '/plaza'"
        :link="!canGoBack"
        aria-label="返回恋爱广场"
        @activate="goBack"
      />

      <div class="mx-auto max-w-5xl px-4 pb-8 pt-2 sm:px-6 sm:pb-12 lg:px-8 lg:pb-16">

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
            <button
              type="button"
              class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              @click="goBack"
            >
              返回恋爱广场
            </button>
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
                    <span
                      class="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rose-300 to-pink-400 text-[10px] font-bold text-white"
                      role="img"
                      :aria-label="`${member.displayName || '成员'}的头像`"
                    >
                      {{ initials(member.displayName) }}
                      <img
                        v-if="member.avatar"
                        :src="member.avatar"
                        :alt="member.displayName || '成员'"
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
                  <li
                    v-for="story in stories"
                    :key="story.storyId"
                    class="overflow-hidden rounded-2xl border border-rose-100/80 bg-rose-50/25 p-4 sm:p-5"
                  >
                    <!-- items-start + 固定封面高度：封面不会被长标题或长摘要拉伸 -->
                    <div
                      class="grid items-start gap-4"
                      :class="story.coverImage ? 'sm:grid-cols-[11rem_minmax(0,1fr)]' : ''"
                    >
                      <div v-if="story.coverImage" class="relative h-44 w-full overflow-hidden rounded-xl bg-rose-100/60 sm:h-36">
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
                          <time>{{ formatSpaceContentDateTime(story.happenedTime, story.showTime, '') }}</time>
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
                        <p
                          v-if="storySummary(story)"
                          class="mt-2 line-clamp-3 break-words text-sm leading-6 text-rose-800/65"
                        >
                          {{ storySummary(story) }}
                        </p>

                        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                          <span
                            v-if="story.hasContent"
                            class="inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-rose-700/50"
                          >
                            {{ storyWordCount(story) }}
                          </span>
                          <!-- 列表只展示摘要，完整正文进入独立公开详情页按需加载 -->
                          <RouterLink
                            v-if="story.hasContent"
                            :to="publicStoryLink(story)"
                            class="group inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                            :aria-label="`阅读全文：${story.title || '未命名故事'}`"
                          >
                            阅读全文
                            <svg
                              class="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          </RouterLink>
                          <span v-else class="text-xs text-rose-700/45">这篇故事还没有正文</span>
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
                    <!-- 透明按钮覆盖图片区域：保持原有卡片结构，同时提供键盘可访问的大图与描述入口。 -->
                    <button
                      v-if="photo.url && !failedImages[`photo-${photo.photoId}`]"
                      type="button"
                      class="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300"
                      :aria-label="`查看照片大图和描述：${photo.title || '公开照片'}`"
                      @click="openPhotoPreview(photo, $event)"
                    />
                    <figcaption class="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-rose-950/80 via-rose-950/35 to-transparent p-3 pt-10">
                      <div class="min-w-0">
                        <p class="truncate text-xs font-semibold text-white">{{ photo.title || '未命名照片' }}</p>
                        <p v-if="photoDescription(photo)" class="mt-0.5 line-clamp-2 break-words text-[10px] leading-4 text-white/80">{{ photoDescription(photo) }}</p>
                        <p v-if="photo.location" class="mt-0.5 truncate text-[10px] text-white/65">{{ photo.location }}</p>
                      </div>
                    </figcaption>
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
          <button
            type="button"
            class="mt-5 inline-flex rounded-full bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-600"
            @click="goBack"
          >
            返回恋爱广场
          </button>
        </section>
      </div>
    </main>

    <SpaceImagePreview
      :open="photoPreviewOpen"
      :images="publicPhotoPreviews"
      :initial-index="photoPreviewIndex"
      variant="plaza"
      @close="photoPreviewOpen = false"
    />
  </CouplePageScaffold>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import StoryReturnBar from '@/components/frontend/StoryReturnBar.vue'
import SpaceImagePreview from '@/components/frontend/space-studio/SpaceImagePreview.vue'
import { fetchPublicSpaceDetail } from '@/api/gallery'
import { buildPublicPhotoPreviews } from '@/utils/imagePreview'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import {
  formatCount,
  formatMemberRole,
  formatRepeatType,
  formatSpaceContentDateTime,
  formatSpaceDate,
  formatTogetherText,
  parseSpaceDateTime,
} from '@/utils/spaceFormat'
import {
  DEFAULT_THEME_COLOR,
  accentTextColor,
  contrastTextColor,
  softenHexColor,
  themeBorderColor,
} from '@/utils/themeColor'
import { readSpaceErrorMessage } from '@/utils/spaceState'
import {
  PLAZA_LIST_PATH,
  buildReturnTarget,
  isPlazaListPath,
  resolvePublicSpaceDetailReturn,
  withReturnState,
} from '@/utils/listViewState'
import { useDetailReturnTarget } from '@/composables/useDetailReturnTarget'
import { restoreScrollPosition } from '@/utils/scrollRestore'
import { useListViewSnapshot } from '@/composables/useListViewSnapshot'

const route = useRoute()
const { spaceStatus, isSpaceReady } = useFrontendSpace()

/**
 * 公开空间也是“可返回的浏览位置”：从公开故事详情退回来时恢复滚动位置，
 * 刷新后也能停在原处。快照绑定在 /plaza/:spaceId 这一条历史记录上。
 */
const {
  snapshot: savedListView,
} = useListViewSnapshot({
  route,
  collect: () => ({}),
})

let cancelScrollRestore = null

/**
 * 返回恋爱广场：从广场列表进来时历史回退（恢复分页与滚动），
 * 直接打开时退回 /plaza。
 */
const {
  returnTo,
  canGoBack,
  goBack,
} = useDetailReturnTarget({
  resolveReturn: resolvePublicSpaceDetailReturn,
  isAllowedReturnPath: isPlazaListPath,
  fallbackPath: PLAZA_LIST_PATH,
})

const space = ref(null)
const loading = ref(true)
const loadError = ref('')
const failedImages = ref({})
const photoPreviewOpen = ref(false)
const photoPreviewIndex = ref(0)
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
// 只把允许公开展示的字段交给预览层，描述为空时组件不会渲染空白说明区。
const publicPhotoPreviews = computed(() => buildPublicPhotoPreviews(photos.value))
// 列表刷新、空间切换或照片被删除时关闭详情，避免旧照片描述残留。
watch(publicPhotoPreviews, () => {
  photoPreviewOpen.value = false
})
const anniversaries = computed(() => (
  Array.isArray(space.value?.anniversaries) ? space.value.anniversaries : []
))

function storyAccent() {
  return DEFAULT_THEME_COLOR
}

/**
 * 列表展示文案：优先用户摘要，摘要为空时回退到后端生成的纯文本预览。
 * 两者都没有时返回空字符串，由“还没有正文”提示兜底。
 */
function storySummary(story) {
  const summary = typeof story?.summary === 'string' ? story.summary.trim() : ''
  if (summary) return summary
  return typeof story?.contentPreview === 'string' ? story.contentPreview.trim() : ''
}

function storyWordCount(story) {
  const count = Number(story?.contentLength)
  return Number.isFinite(count) && count > 0 ? `约 ${count.toLocaleString('zh-CN')} 字` : ''
}

function storyTagStyle(story) {
  const accent = storyAccent(story)
  return {
    backgroundColor: softenHexColor(accent),
    borderColor: themeBorderColor(accent),
    color: accentTextColor(accent),
  }
}

function anniversaryAccent() {
  return DEFAULT_THEME_COLOR
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

function markImageFailed(key) {
  failedImages.value = { ...failedImages.value, [key]: true }
}

/** 照片描述为空或仅空白时不渲染说明区域，避免卡片出现空白间距。 */
function photoDescription(photo) {
  const value = photo?.description
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 公开故事详情链接：携带当前公开空间作为返回来源，
 * 从故事详情返回时回到这个空间（滚动位置由浏览器与快照共同保证）。
 */
function publicStoryLink(story) {
  return withReturnState(
    `/plaza/${spaceId.value}/story/${story.storyId}`,
    buildReturnTarget(route.fullPath),
  )
}

/** 打开公开照片大图：图片下方展示标题、描述与拍摄信息。 */
function openPhotoPreview(photo, event) {
  const index = publicPhotoPreviews.value.findIndex(item => String(item.id) === String(photo?.photoId))
  if (index < 0) return
  if (event?.currentTarget instanceof HTMLElement) {
    event.currentTarget.focus({ preventScroll: true })
  }
  photoPreviewIndex.value = index
  photoPreviewOpen.value = true
}

function monthDay(value) {
  const date = parseSpaceDateTime(value)
  if (!date) return '—'
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

async function loadDetail({ restoreScroll = false, restoreScrollY = 0 } = {}) {
  const id = spaceId.value
  const requestId = ++detailRequestId

  space.value = null
  failedImages.value = {}
  photoPreviewOpen.value = false
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

  // 内容渲染完成后再还原滚动位置：从公开故事详情退回本页时停回原处。
  if (restoreScroll && restoreScrollY > 0 && !loadError.value) {
    await nextTick()
    cancelScrollRestore?.()
    cancelScrollRestore = restoreScrollPosition(restoreScrollY)
  }
}

watch(
  () => route.params.spaceId,
  () => {
    // 首次进入（含从故事详情回退）时尝试恢复快照；切换到另一个空间则回到顶部。
    const pending = savedListView.value
    if (pending && pending.path === route.fullPath) {
      loadDetail({ restoreScroll: true, restoreScrollY: pending.scrollY })
      // 快照只用于这一次恢复，避免同一记录内重复应用。
      savedListView.value = null
      return
    }
    loadDetail()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  cancelScrollRestore?.()
  cancelScrollRestore = null
})
</script>

