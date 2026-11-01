<template>
  <RouterLink
    :to="`/plaza/${space.spaceId}`"
    class="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-rose-100/80 bg-white/85 shadow-lg shadow-rose-100/35 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
    :aria-label="`查看${displayName}的情侣空间`"
  >
    <div class="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-rose-200 via-pink-100 to-rose-50">
      <img
        v-if="coverUrl && !coverFailed"
        :src="coverUrl"
        :alt="`${displayName}的空间封面`"
        class="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        loading="lazy"
        @error="coverFailed = true"
      >
      <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-rose-300">
        <span class="font-display text-5xl leading-none" aria-hidden="true">♥</span>
        <span class="text-[10px] font-bold tracking-[0.26em] text-rose-400/70">LOVE SPACE</span>
      </div>

      <div class="absolute inset-0 bg-gradient-to-t from-rose-950/60 via-rose-950/5 to-transparent" aria-hidden="true" />

      <div class="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
        <div class="flex min-w-0 items-end gap-2.5">
          <div class="flex -space-x-2.5">
            <span
              v-for="(member, index) in memberSlots"
              :key="index"
              class="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-rose-300 to-pink-400 text-[10px] font-bold text-white shadow-md"
              :title="member.name"
            >
              {{ initials(member.name) }}
              <img
                v-if="member.avatar"
                :src="member.avatar"
                :alt="`${member.name}的头像`"
                class="absolute inset-0 h-full w-full object-cover"
                @load="$event.currentTarget.style.display = ''"
                @error="$event.currentTarget.style.display = 'none'"
              >
            </span>
          </div>
          <span class="pb-0.5 text-[11px] font-medium text-white/90 drop-shadow-sm">
            {{ togetherText }}
          </span>
        </div>

        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/20 text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
      <div class="min-w-0">
        <h3 class="line-clamp-2 break-words font-display text-xl font-bold leading-snug text-rose-950 transition group-hover:text-rose-600">
          {{ displayName }}
        </h3>
        <p class="mt-2 line-clamp-3 break-words text-sm leading-6 text-rose-800/55">
          {{ description }}
        </p>
      </div>

      <div v-if="startDateText" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-rose-700/50">
        <span class="inline-flex items-center gap-1.5">
          <svg class="h-3.5 w-3.5 text-rose-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 11h18" stroke-linecap="round" />
          </svg>
          {{ startDateText }}
        </span>
      </div>

      <div v-if="latestItems.length" class="mt-3 space-y-1.5 rounded-2xl border border-rose-100/70 bg-rose-50/40 px-3 py-2.5">
        <p class="text-[9px] font-bold uppercase tracking-[0.18em] text-rose-400">Recently Shared</p>
        <p v-for="item in latestItems" :key="item.key" class="flex min-w-0 items-center gap-1.5 text-[11px] text-rose-700/60">
          <span class="w-4 shrink-0 text-center text-rose-300" aria-hidden="true">{{ item.icon }}</span>
          <span class="shrink-0 text-rose-500/70">{{ item.label }}</span>
          <span class="truncate text-rose-800/70">{{ item.title }}</span>
        </p>
      </div>

      <div class="mt-auto pt-5">
        <dl class="grid grid-cols-3 divide-x divide-rose-100/80 rounded-2xl border border-rose-100/80 bg-rose-50/40 pb-2.5 pt-3 text-center">
          <div class="min-w-0 px-1">
            <dt class="text-[10px] text-rose-700/45">故事</dt>
            <dd class="mt-0.5 font-display text-lg font-bold tabular-nums text-rose-800">{{ counts.story }}</dd>
          </div>
          <div class="min-w-0 px-1">
            <dt class="text-[10px] text-rose-700/45">照片</dt>
            <dd class="mt-0.5 font-display text-lg font-bold tabular-nums text-rose-800">{{ counts.photo }}</dd>
          </div>
          <div class="min-w-0 px-1">
            <dt class="text-[10px] text-rose-700/45">纪念日</dt>
            <dd class="mt-0.5 font-display text-lg font-bold tabular-nums text-rose-800">{{ counts.anniversary }}</dd>
          </div>
        </dl>

        <span class="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200/80 bg-white/70 px-4 py-2 text-xs font-semibold text-rose-600 transition group-hover:border-rose-300 group-hover:bg-rose-50 group-hover:text-rose-700">
          进入这个空间
          <svg class="h-3.5 w-3.5 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M5 12h14m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import defaultBoyAvatar from '@/assets/boy.jpeg'
import defaultGirlAvatar from '@/assets/girl.jpeg'
import {
  formatCount,
  formatSpaceDate,
  formatTogetherText,
} from '@/utils/spaceFormat'

const props = defineProps({
  space: {
    type: Object,
    required: true,
  },
})

const coverFailed = ref(false)
const coverUrl = computed(() => String(props.space?.coverImage || '').trim())
const displayName = computed(() => props.space?.spaceName || '未命名情侣空间')
const description = computed(() => (
  props.space?.description || '还没有写下简介，但属于他们的日子已经在慢慢发生。'
))
const startDateText = computed(() => {
  const date = formatSpaceDate(props.space?.loveStartTime, '')
  return date ? `始于 ${date}` : ''
})
const togetherText = computed(() => formatTogetherText(props.space?.loveStartTime))
const counts = computed(() => ({
  story: formatCount(props.space?.publicStoryCount),
  photo: formatCount(props.space?.publicPhotoCount),
  anniversary: formatCount(props.space?.publicAnniversaryCount),
}))

const latestItems = computed(() => {
  const items = []
  const story = props.space?.latestStory
  if (story?.title) {
    items.push({ key: 'story', icon: '✦', label: '故事', title: story.title })
  }
  const photos = Array.isArray(props.space?.latestPhotos) ? props.space.latestPhotos : []
  if (photos[0]?.title) {
    items.push({ key: 'photo', icon: '◫', label: '照片', title: photos[0].title })
  }
  const anniversaries = Array.isArray(props.space?.latestAnniversaries)
    ? props.space.latestAnniversaries
    : []
  if (anniversaries[0]?.title) {
    items.push({ key: 'anniversary', icon: '⌁', label: '纪念日', title: anniversaries[0].title })
  }
  return items
})

const memberSlots = computed(() => {
  const members = Array.isArray(props.space?.members) ? props.space.members.slice(0, 2) : []
  return [0, 1].map((index) => {
    const member = members[index]
    return {
      name: member?.displayName || (index === 0 ? 'Ta' : '另一半'),
      avatar: member?.avatar || (index === 0 ? defaultBoyAvatar : defaultGirlAvatar),
    }
  })
})

function initials(name) {
  return String(name || '恋人').trim().slice(0, 2).toUpperCase()
}

watch(coverUrl, () => {
  coverFailed.value = false
})

watch(() => props.space, () => {
  coverFailed.value = false
})
</script>
