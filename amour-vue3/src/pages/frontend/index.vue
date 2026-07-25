<template>
  <CouplePageScaffold>
    <main class="home-page">
      <section
        class="relative z-10 mx-auto grid min-h-[calc(100vh-72px)] max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:px-8 lg:py-24"
        aria-labelledby="hero-heading"
      >
        <div class="relative z-10 text-center lg:text-left">
          <p class="hero-kicker inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white/70 px-4 py-2 text-xs font-bold tracking-[0.16em] text-rose-500 shadow-sm backdrop-blur-sm sm:tracking-[0.24em]">
            <span class="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
            {{ homeConfig.boyName }} · {{ homeConfig.girlName }} / OUR LITTLE UNIVERSE
          </p>

          <h1
            id="hero-heading"
            class="mt-7 font-display text-4xl font-bold leading-[1.18] tracking-tight text-rose-950 sm:text-5xl lg:text-6xl"
          >
            把普通的日子，<br class="hidden sm:block">
            <span class="hero-title-accent">过成两个人的纪念册</span>
          </h1>
          <p class="mx-auto mt-6 max-w-xl text-base leading-8 text-rose-900/60 sm:text-lg lg:mx-0">
            从相遇的那一刻起，时间有了温度，日常也有了值得反复翻阅的意义。
          </p>

          <div class="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <RouterLink
              to="/story"
              class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-300/40 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            >
              翻阅我们的故事
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
            </RouterLink>
            <RouterLink
              to="/photo"
              class="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/75 px-6 py-3 text-sm font-semibold text-rose-700 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            >
              看看恋爱相册
            </RouterLink>
          </div>

          <div class="mt-10" aria-live="polite">
            <p class="mb-3 text-xs font-semibold tracking-[0.2em] text-rose-400">我们已经一起走过</p>
            <div class="mx-auto grid max-w-lg grid-cols-4 gap-2 sm:gap-3 lg:mx-0">
              <div v-for="item in elapsedUnits" :key="item.label" class="time-unit">
                <strong class="block font-display text-2xl font-bold tabular-nums text-rose-700 sm:text-3xl">{{ item.value }}</strong>
                <span class="mt-0.5 block text-[11px] font-medium text-rose-800/45 sm:text-xs">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          class="hero-visual relative mx-auto h-[430px] w-full max-w-[470px] sm:h-[520px]"
          :aria-label="`${homeConfig.boyName}与${homeConfig.girlName}的照片`"
        >
          <div class="hero-orbit absolute inset-8 rounded-full border border-dashed border-rose-300/60" aria-hidden="true" />
          <div class="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-200/45 blur-3xl" aria-hidden="true" />

          <figure class="photo-card photo-card-main absolute left-[8%] top-[8%] w-[67%] -rotate-[5deg] overflow-hidden rounded-[2rem] border-[7px] border-white bg-white shadow-2xl shadow-rose-300/35">
            <RouterLink to="/photo" class="group block" aria-label="查看恋爱相册">
              <div class="relative overflow-hidden">
                <img
                  v-if="heroPhotosReady && albumPreview1"
                  :src="albumPreview1"
                  alt="我们的相册照片"
                  class="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                  fetchpriority="high"
                >
                <div v-else class="hero-photo-placeholder aspect-[4/5] w-full" aria-hidden="true" />
                <span class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-rose-950/20 to-transparent opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
              </div>
              <figcaption class="flex min-h-[62px] items-center justify-between gap-3 px-4 py-2.5 text-rose-900/70">
                <span class="min-w-0 text-left">
                  <span class="block text-[9px] font-bold tracking-[0.16em] text-rose-400">OUR FAVORITE</span>
                  <span class="mt-0.5 block truncate font-display text-sm font-semibold text-rose-900/80">Love in every frame</span>
                </span>
                <span class="shrink-0 text-rose-400 transition group-hover:scale-110" aria-hidden="true">♥</span>
              </figcaption>
            </RouterLink>
          </figure>

          <figure class="photo-card photo-card-small absolute bottom-[6%] right-[2%] w-[48%] rotate-[7deg] overflow-hidden rounded-[1.6rem] border-[6px] border-white bg-white shadow-2xl shadow-rose-300/30">
            <img
              v-if="heroPhotosReady && albumPreview2"
              :src="albumPreview2"
              alt="我们一起旅行的照片"
              class="aspect-square w-full object-cover"
            >
            <div v-else class="hero-photo-placeholder aspect-square w-full" aria-hidden="true" />
          </figure>

          <div class="avatar-badge absolute right-[4%] top-[5%] flex items-center rounded-full border border-white/80 bg-white/85 p-2 pr-4 shadow-xl shadow-rose-200/40 backdrop-blur-md">
            <div class="flex -space-x-3">
              <img :src="homeConfig.boyAvatar" :alt="`${homeConfig.boyName}的头像`" class="h-11 w-11 rounded-full border-2 border-white object-cover">
              <img :src="homeConfig.girlAvatar" :alt="`${homeConfig.girlName}的头像`" class="h-11 w-11 rounded-full border-2 border-white object-cover">
            </div>
            <div class="ml-3 text-left">
              <p class="text-[10px] font-bold uppercase tracking-wider text-rose-400">Together</p>
              <p class="text-sm font-bold text-rose-800">{{ togetherTotalDays }} days</p>
            </div>
          </div>

          <div class="floating-note absolute bottom-[19%] left-0 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-lg shadow-rose-200/30 backdrop-blur-md">
            <p class="text-[10px] font-bold tracking-[0.18em] text-rose-400">SINCE</p>
            <p class="mt-0.5 font-display text-base font-bold text-rose-800">{{ formattedLoveStartDate }}</p>
          </div>
        </div>
      </section>

      <section class="relative z-10 mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28" aria-labelledby="explore-heading">
        <div class="mb-8 flex items-end justify-between gap-5">
          <div>
            <p class="text-xs font-bold tracking-[0.22em] text-rose-400">OUR CORNERS</p>
            <h2 id="explore-heading" class="mt-2 font-display text-2xl font-bold text-rose-950 sm:text-3xl">收藏每一种心动</h2>
          </div>
          <p class="hidden max-w-sm text-right text-sm leading-6 text-rose-800/50 sm:block">故事、照片、纪念日和悄悄话，都被放在这里妥善珍藏。</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RouterLink
            v-for="card in exploreCards"
            :key="card.to"
            :to="card.to"
            class="explore-card group relative min-h-[210px] overflow-hidden rounded-3xl border border-white/80 bg-white/75 p-6 shadow-lg shadow-rose-100/50 backdrop-blur-md transition duration-300 hover:-translate-y-1.5 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          >
            <div class="absolute -right-9 -top-9 h-28 w-28 rounded-full transition duration-500 group-hover:scale-125" :class="card.glow" aria-hidden="true" />
            <div class="relative flex h-full flex-col">
              <span class="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm ring-1 ring-white/80" :class="card.iconBg" aria-hidden="true">{{ card.icon }}</span>
              <div class="mt-auto pt-8">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="font-display text-xl font-bold text-rose-950">{{ card.title }}</h3>
                  <svg class="h-5 w-5 -translate-x-1 text-rose-300 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
                  </svg>
                </div>
                <p class="mt-2 text-sm leading-6 text-rose-800/50">{{ card.description }}</p>
                <p v-if="card.stat" class="mt-4 text-xs font-semibold text-rose-500">{{ card.stat }}</p>
              </div>
            </div>
          </RouterLink>
        </div>
      </section>

      <section
        id="story"
        class="story-section relative z-10 overflow-hidden border-y border-rose-100/80 bg-white/65 py-20 backdrop-blur-sm sm:py-24"
        aria-labelledby="story-heading"
      >
        <div class="pointer-events-none absolute -right-24 top-12 h-72 w-72 rounded-full bg-rose-100/70 blur-3xl" aria-hidden="true" />
        <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p class="text-xs font-bold tracking-[0.22em] text-rose-400">OUR STORY</p>
              <h2 id="story-heading" class="mt-2 font-display text-3xl font-bold text-rose-950 sm:text-4xl">一起走过的日子</h2>
              <p class="mt-3 max-w-xl text-sm leading-7 text-rose-800/55 sm:text-base">时间不会停下，但我们可以把那些闪闪发光的瞬间留住。</p>
            </div>
            <RouterLink to="/story" class="group inline-flex items-center gap-2 text-sm font-semibold text-rose-500 transition hover:text-rose-700">
              查看全部故事
              <svg class="h-4 w-4 transition group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
            </RouterLink>
          </div>

          <div v-if="storyLoading" class="mt-12 grid gap-5 md:grid-cols-2">
            <div v-for="i in 2" :key="i" class="animate-pulse overflow-hidden rounded-3xl border border-rose-100 bg-white/80 p-4">
              <div class="aspect-[16/9] rounded-2xl bg-rose-100/80" />
              <div class="mt-5 h-3 w-24 rounded bg-rose-100" />
              <div class="mt-3 h-6 w-2/3 rounded bg-rose-100" />
              <div class="mt-3 h-3 w-full rounded bg-rose-50" />
            </div>
          </div>

          <div v-else-if="storyMilestones.length === 0" class="mt-12 rounded-3xl border border-dashed border-rose-200 bg-rose-50/60 px-6 py-16 text-center">
            <span class="text-3xl" aria-hidden="true">✦</span>
            <h3 class="mt-3 font-display text-lg font-bold text-rose-900">故事正等待被写下</h3>
            <p class="mt-2 text-sm text-rose-800/50">未来的每一个瞬间，都会成为这里的新章节。</p>
          </div>

          <ol v-else class="mt-12 grid gap-5 md:grid-cols-2">
            <li v-for="(item, i) in storyMilestones.slice(0, 4)" :key="item.id">
              <RouterLink
                :to="'/story/' + item.id"
                class="story-card group grid h-full overflow-hidden rounded-3xl border border-rose-100/90 bg-white/90 p-3 shadow-md shadow-rose-100/40 transition duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-200/30 sm:grid-cols-[44%_1fr]"
              >
                <div class="relative min-h-52 overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-rose-100 to-pink-50 sm:min-h-[230px]">
                  <img
                    v-if="item.coverImage"
                    :src="item.coverImage"
                    :alt="item.title"
                    class="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  >
                  <div v-else class="flex h-full items-center justify-center font-display text-4xl text-rose-300" aria-hidden="true">♥</div>
                  <span class="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-[10px] font-bold tracking-wider text-rose-500 shadow-sm backdrop-blur-sm">CHAPTER {{ String(i + 1).padStart(2, '0') }}</span>
                </div>
                <div class="flex flex-col p-4 sm:p-5">
                  <time class="text-xs font-bold tracking-[0.14em] text-rose-400">{{ formatTime(item.happenedTime) }}</time>
                  <h3 class="mt-3 font-display text-xl font-bold text-rose-950 sm:text-2xl">{{ item.title }}</h3>
                  <p class="mt-3 line-clamp-3 text-sm leading-7 text-rose-800/55">{{ item.summary || '这一天的故事，被我们认真地收藏了起来。' }}</p>
                  <span class="mt-auto inline-flex items-center gap-2 pt-6 text-xs font-bold text-rose-500">
                    阅读这一章
                    <span class="transition group-hover:translate-x-1" aria-hidden="true">→</span>
                  </span>
                </div>
              </RouterLink>
            </li>
          </ol>
        </div>
      </section>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import defaultBoyAvatar from '@/assets/boy.jpeg'
import defaultGirlAvatar from '@/assets/girl.jpeg'
import api from '@/axios'

const OSS_AMOUR_BASE = 'https://chengliuxiang.oss-cn-hangzhou.aliyuncs.com/amour'
const DEFAULT_LOVE_START_TIME = '2024-05-20 18:30:00'
const DEFAULT_HERO_PHOTO_1 = `${OSS_AMOUR_BASE}/example-photo1.png`
const DEFAULT_HERO_PHOTO_2 = `${OSS_AMOUR_BASE}/example-photo2.png`

const homeConfig = reactive({
  boyName: 'HE',
  girlName: 'SHE',
  loveStartTime: DEFAULT_LOVE_START_TIME,
  boyAvatar: defaultBoyAvatar,
  girlAvatar: defaultGirlAvatar,
  heroPhoto1: '',
  heroPhoto2: '',
})

const HOME_CONFIG_ITEMS = [
  { configKey: 'boy_name', field: 'boyName' },
  { configKey: 'girl_name', field: 'girlName' },
  { configKey: 'love_start_time', field: 'loveStartTime' },
  { configKey: 'boy_avatar', field: 'boyAvatar' },
  { configKey: 'girl_avatar', field: 'girlAvatar' },
  { configKey: 'home.hero_photo_1', field: 'heroPhoto1' },
  { configKey: 'home.hero_photo_2', field: 'heroPhoto2' },
]

const albumPreview1 = computed(() => homeConfig.heroPhoto1)
const albumPreview2 = computed(() => homeConfig.heroPhoto2)
const heroPhotosReady = ref(false)

const nowMs = ref(Date.now())
let tickId = null

onMounted(() => {
  tickId = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (tickId != null) window.clearInterval(tickId)
})

const loveStartMs = computed(() => {
  const normalized = homeConfig.loveStartTime.trim().replace(' ', 'T')
  const timestamp = new Date(normalized).getTime()
  if (Number.isFinite(timestamp)) return timestamp
  return new Date(DEFAULT_LOVE_START_TIME.replace(' ', 'T')).getTime()
})

const formattedLoveStartDate = computed(() => {
  const date = new Date(loveStartMs.value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year} · ${month} · ${day}`
})

const diffMs = computed(() => Math.max(0, nowMs.value - loveStartMs.value))
const togetherTotalDays = computed(() => Math.floor(diffMs.value / 86_400_000))

const elapsed = computed(() => {
  let ms = diffMs.value
  const days = Math.floor(ms / 86_400_000)
  ms %= 86_400_000
  const hours = Math.floor(ms / 3_600_000)
  ms %= 3_600_000
  const minutes = Math.floor(ms / 60_000)
  ms %= 60_000
  const seconds = Math.floor(ms / 1000)
  return { days, hours, minutes, seconds }
})

const elapsedUnits = computed(() => [
  { label: '天', value: elapsed.value.days },
  { label: '小时', value: String(elapsed.value.hours).padStart(2, '0') },
  { label: '分钟', value: String(elapsed.value.minutes).padStart(2, '0') },
  { label: '秒', value: String(elapsed.value.seconds).padStart(2, '0') },
])

const exploreCards = computed(() => [
  {
    to: '/story',
    icon: '✦',
    title: '我们的故事',
    description: '沿着时间线，重温一路走来的重要章节。',
    stat: storyMilestones.value.length ? `已收藏 ${storyMilestones.value.length} 个瞬间` : '等待新的章节',
    iconBg: 'bg-rose-100 text-rose-500',
    glow: 'bg-rose-100/80',
  },
  {
    to: '/photo',
    icon: '◫',
    title: '恋爱相册',
    description: '把旅行、日常和彼此的笑容装进同一本相册。',
    stat: '定格每一次心动',
    iconBg: 'bg-pink-100 text-pink-500',
    glow: 'bg-pink-100/80',
  },
  {
    to: '/anniversary',
    icon: '⌁',
    title: '纪念日',
    description: '记住那些值得期待，也值得庆祝的特殊日期。',
    stat: `相伴第 ${togetherTotalDays.value} 天`,
    iconBg: 'bg-orange-100 text-orange-500',
    glow: 'bg-orange-100/70',
  },
  {
    to: '/message',
    icon: '♡',
    title: '悄悄话',
    description: '写下此刻想说的话，让温柔一直有迹可循。',
    stat: '给 Ta 留一句话',
    iconBg: 'bg-fuchsia-100 text-fuchsia-500',
    glow: 'bg-fuchsia-100/70',
  },
])

const storyMilestones = ref([])
const storyLoading = ref(true)

async function queryConfigValue(configKey) {
  const { data } = await api.post('/site-config/query', { configKey })
  const value = data?.data
  if (!data?.success || typeof value !== 'string' || !value.trim()) {
    throw new Error(data?.message || `配置项 ${configKey} 未返回有效值`)
  }
  return value.trim()
}

async function loadHomeConfig() {
  const results = await Promise.allSettled(
    HOME_CONFIG_ITEMS.map(async (item) => ({
      ...item,
      value: await queryConfigValue(item.configKey),
    })),
  )

  const failedKeys = []
  const loadedConfig = {}
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      loadedConfig[result.value.field] = result.value.value
    } else {
      failedKeys.push(HOME_CONFIG_ITEMS[index].configKey)
    }
  })

  Object.entries(loadedConfig).forEach(([field, value]) => {
    if (field !== 'heroPhoto1' && field !== 'heroPhoto2') {
      homeConfig[field] = value
    }
  })

  const [heroPhoto1, heroPhoto2] = await Promise.all([
    resolveDisplayableImage(loadedConfig.heroPhoto1, DEFAULT_HERO_PHOTO_1),
    resolveDisplayableImage(loadedConfig.heroPhoto2, DEFAULT_HERO_PHOTO_2),
  ])
  homeConfig.heroPhoto1 = heroPhoto1
  homeConfig.heroPhoto2 = heroPhoto2
  heroPhotosReady.value = true

  if (failedKeys.length) {
    console.warn(`以下首页配置读取失败，已使用默认值：${failedKeys.join(', ')}`)
  }
}

function preloadImage(url) {
  if (!url) return Promise.reject(new Error('图片地址为空'))
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = async () => {
      try {
        if (typeof image.decode === 'function') await image.decode()
      } catch {
        // 图片已触发 load，decode 失败不影响使用浏览器缓存后的资源。
      }
      resolve(url)
    }
    image.onerror = () => reject(new Error(`图片加载失败：${url}`))
    image.src = url
  })
}

async function resolveDisplayableImage(configuredUrl, fallbackUrl) {
  try {
    return await preloadImage(configuredUrl || fallbackUrl)
  } catch (error) {
    console.warn(error.message)
    if (configuredUrl && configuredUrl !== fallbackUrl) {
      try {
        return await preloadImage(fallbackUrl)
      } catch (fallbackError) {
        console.warn(fallbackError.message)
      }
    }
    return ''
  }
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

onMounted(async () => {
  loadHomeConfig()
  try {
    const { data } = await api.post('/story/milestones')
    if (data.success && Array.isArray(data.data)) storyMilestones.value = data.data
  } catch (e) {
    console.error('获取故事里程碑失败', e)
  } finally {
    storyLoading.value = false
  }
})
</script>

<style scoped>
.home-page {
  --paper: rgba(255, 255, 255, 0.78);
}

.hero-title-accent {
  background: linear-gradient(105deg, #9f1239 5%, #e11d48 54%, #db2777 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-photo-placeholder {
  background:
    radial-gradient(circle at 28% 24%, rgba(255, 255, 255, 0.9), transparent 24%),
    linear-gradient(135deg, #fff1f2 0%, #fce7f3 48%, #ffe4e6 100%);
}

.time-unit {
  border: 1px solid rgba(254, 205, 211, 0.75);
  border-radius: 1.1rem;
  background: rgba(255, 255, 255, 0.66);
  padding: 0.7rem 0.35rem;
  text-align: center;
  box-shadow: 0 12px 30px rgba(244, 63, 94, 0.07);
  backdrop-filter: blur(10px);
}

.hero-orbit {
  animation: slow-spin 28s linear infinite;
}

.photo-card-main {
  animation: float-main 7s ease-in-out infinite;
}

.photo-card-small {
  animation: float-small 8s ease-in-out 0.8s infinite;
}

.avatar-badge {
  animation: float-note 6s ease-in-out 0.4s infinite;
}

.floating-note {
  animation: float-note 6.5s ease-in-out infinite;
}

.explore-card::after {
  position: absolute;
  right: 1.5rem;
  bottom: 1.5rem;
  width: 2.5rem;
  height: 1px;
  content: '';
  background: linear-gradient(to right, rgba(251, 113, 133, 0), rgba(251, 113, 133, 0.55));
  transition: width 300ms ease;
}

.explore-card:hover::after {
  width: 4rem;
}

@keyframes slow-spin {
  to { transform: rotate(360deg); }
}

@keyframes float-main {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-9px) rotate(-4deg); }
}

@keyframes float-small {
  0%, 100% { transform: translateY(0) rotate(7deg); }
  50% { transform: translateY(8px) rotate(6deg); }
}

@keyframes float-note {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}

@media (max-width: 639px) {
  .hero-visual {
    transform: scale(0.92);
    transform-origin: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-orbit,
  .photo-card-main,
  .photo-card-small,
  .avatar-badge,
  .floating-note {
    animation: none;
  }
}
</style>
