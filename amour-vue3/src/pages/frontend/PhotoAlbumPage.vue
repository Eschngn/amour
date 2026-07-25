<template>
  <CouplePageScaffold>
    <main class="photo-book-page relative z-10 min-h-[calc(100vh-72px)] overflow-hidden px-3 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
      <div class="book-room-light book-room-light-left" aria-hidden="true" />
      <div class="book-room-light book-room-light-right" aria-hidden="true" />

      <header class="relative mx-auto max-w-4xl text-center">
        <p class="text-[11px] font-bold tracking-[0.3em] text-rose-400">OUR PHOTO BOOK</p>
        <h1 class="mt-3 font-display text-3xl font-bold tracking-tight text-rose-950 sm:text-5xl">翻开属于我们的相册</h1>
        <p class="mx-auto mt-4 max-w-2xl text-sm leading-7 text-rose-900/55 sm:text-base">
          一页一页收藏走过的地方、见过的光，还有每一个刚好有彼此的瞬间。
        </p>
      </header>

      <section class="relative mx-auto mt-9 max-w-7xl sm:mt-12" aria-live="polite">
        <div v-if="initialLoading" class="closed-book-stage" aria-label="正在加载相册">
          <div class="closed-book closed-book-loading">
            <div class="h-full w-full animate-pulse rounded-[inherit] bg-gradient-to-br from-rose-200 via-pink-100 to-amber-100" />
          </div>
          <p class="mt-8 text-sm text-rose-800/45">正在整理照片页…</p>
        </div>

        <Transition v-else name="book-mode" mode="out-in">
          <div v-if="!bookOpened" key="cover" class="closed-book-stage">
            <button type="button" class="closed-book group text-left" aria-label="打开相册" @click="openBook">
              <span class="closed-book-pages" aria-hidden="true" />
              <span class="closed-book-spine" aria-hidden="true" />

              <span class="absolute inset-0 overflow-hidden rounded-[inherit] bg-rose-900">
                <img
                  v-if="coverPhoto?.url"
                  :src="coverPhoto.url"
                  :alt="coverPhoto.title"
                  class="h-full w-full object-cover transition duration-1000 group-hover:scale-[1.035]"
                >
                <span v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7f1d3d] via-[#9f3152] to-[#4c1028]">
                  <span class="cover-heart" aria-hidden="true">♥</span>
                </span>
                <span class="absolute inset-0 bg-gradient-to-b from-rose-950/20 via-rose-950/5 to-rose-950/80" aria-hidden="true" />
                <span class="cover-inner-line" aria-hidden="true" />
              </span>

              <span class="absolute inset-x-9 top-10 text-center text-white sm:inset-x-12 sm:top-14">
                <span class="cover-couple-names">
                  <span class="cover-person-name" :title="boyName">{{ boyName }}</span>
                  <span class="cover-name-heart" aria-hidden="true">♥</span>
                  <span class="cover-person-name" :title="girlName">{{ girlName }}</span>
                </span>
                <span class="mt-4 block font-display text-3xl font-bold leading-tight drop-shadow sm:text-4xl">我们的恋爱相册</span>
                <span class="mx-auto mt-4 block h-px w-16 bg-white/55" aria-hidden="true" />
              </span>

              <span class="absolute inset-x-8 bottom-8 text-center text-white sm:inset-x-12 sm:bottom-11">
                <span v-if="coverPhoto" class="block truncate font-display text-lg font-semibold drop-shadow">{{ coverPhoto.title }}</span>
                <span v-else class="block text-sm text-white/75">在后台设置一张照片作为相册封面</span>
                <span class="mt-4 inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/15 px-4 py-2 text-xs font-semibold tracking-wider backdrop-blur-md transition group-hover:bg-white/25">
                  点击翻开
                  <span class="transition group-hover:translate-x-1" aria-hidden="true">→</span>
                </span>
              </span>
            </button>

            <div class="mt-8 text-center">
              <p class="font-display text-lg font-semibold text-rose-900">{{ total }} 张照片 · {{ spreadCount }} 个篇章</p>
              <button v-if="loadError" type="button" class="mt-4 rounded-full border border-rose-200 bg-white/70 px-4 py-2 text-xs font-semibold text-rose-600" @click="reloadAlbum">
                {{ loadError }}，点击重试
              </button>
            </div>
          </div>

          <div v-else key="opened" class="opened-book-view">
            <div class="opened-book-toolbar mb-5 flex items-center gap-4">
              <button type="button" class="book-toolbar-button shrink-0" @click="closeBook">
                <span aria-hidden="true">←</span>
                合上相册
              </button>

              <div class="book-tabs-viewport min-w-0 flex-1" role="tablist" aria-label="照片分类">
                <div class="book-tabs">
                  <button
                    v-for="filter in filters"
                    :key="filter.value"
                    type="button"
                    role="tab"
                    :aria-selected="activeFilter === filter.value"
                    :title="filter.label"
                    class="book-tab"
                    :class="activeFilter === filter.value ? 'book-tab-active' : ''"
                    :disabled="spreadLoading"
                    @click="setFilter(filter.value)"
                  >
                    {{ filter.label }}
                  </button>
                </div>
              </div>

              <p class="book-page-indicator min-w-24 shrink-0 text-right text-xs font-semibold tracking-wider text-rose-800/45">
                第 {{ currentPage }} / {{ totalPages }} 篇
              </p>
            </div>

            <div class="open-book-stage">
              <button
                type="button"
                class="turn-button turn-button-left"
                :disabled="currentPage <= 1 || spreadLoading"
                aria-label="上一篇"
                @click="turnPage(currentPage - 1, 'prev')"
              >
                ‹
              </button>

              <div class="book-shell" :aria-busy="spreadLoading">
                <Transition :name="pageTransitionName" mode="out-in">
                  <div :key="spreadKey" class="book-spread">
                    <article
                      v-for="(photo, index) in spreadPhotos"
                      :key="photo?.id || `empty-${index}`"
                      class="book-page"
                      :class="index === 0 ? 'book-page-left' : 'book-page-right'"
                    >
                      <span class="page-corner" aria-hidden="true" />
                      <span class="page-number">{{ pageNumber(index) }}</span>

                      <button
                        v-if="photo"
                        type="button"
                        class="page-photo group"
                        :aria-label="`查看照片详情：${photo.title}`"
                        @click="openPhoto(photo)"
                      >
                        <span class="page-photo-frame">
                          <img :src="photo.url" :alt="photo.title" class="h-full w-full object-contain">
                          <span class="absolute inset-0 bg-gradient-to-t from-rose-950/35 via-transparent to-transparent opacity-60" aria-hidden="true" />
                          <span class="photo-detail-hint">查看详情</span>
                        </span>
                        <span class="mt-4 block min-w-0 text-left sm:mt-5">
                          <span class="block truncate font-display text-base font-bold text-rose-950 sm:text-xl">{{ photo.title }}</span>
                          <span class="mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wider text-rose-700/45 sm:text-xs">
                            <span class="truncate">{{ photo.categoryName || '共同回忆' }}</span>
                            <time class="shrink-0">{{ formatTakenDate(photo.takenTime) }}</time>
                          </span>
                          <span class="page-description mt-3 text-xs leading-5 text-rose-900/45 sm:text-sm sm:leading-6">{{ photo.description || '这一页还没有写下文字。' }}</span>
                        </span>
                      </button>

                      <div v-else class="empty-page">
                        <span class="font-display text-4xl text-rose-200 sm:text-6xl" aria-hidden="true">♡</span>
                        <p class="mt-4 font-display text-sm font-semibold text-rose-800/40 sm:text-lg">等待下一张照片</p>
                        <p class="mt-2 hidden max-w-44 text-xs leading-5 text-rose-800/30 sm:block">未来的某一天，会有新的回忆被放进这一页。</p>
                      </div>
                    </article>
                  </div>
                </Transition>

                <div v-if="spreadLoading" class="book-loading-overlay">
                  <span class="book-loading-spinner" aria-hidden="true" />
                  <span>正在翻页…</span>
                </div>
              </div>

              <button
                type="button"
                class="turn-button turn-button-right"
                :disabled="currentPage >= totalPages || spreadLoading"
                aria-label="下一篇"
                @click="turnPage(currentPage + 1, 'next')"
              >
                ›
              </button>
            </div>

            <div class="mt-7 flex flex-col items-center justify-center gap-3 text-center">
              <p class="text-xs text-rose-800/40">第 {{ firstVisiblePhotoNumber }}–{{ lastVisiblePhotoNumber }} 张，共 {{ total }} 张</p>
              <div class="flex items-center gap-2">
                <button type="button" class="bottom-page-button" :disabled="currentPage <= 1 || spreadLoading" @click="turnPage(currentPage - 1, 'prev')">上一页</button>
                <span class="font-display text-sm font-bold text-rose-700">{{ currentPage }}</span>
                <button type="button" class="bottom-page-button" :disabled="currentPage >= totalPages || spreadLoading" @click="turnPage(currentPage + 1, 'next')">下一页</button>
              </div>
            </div>
          </div>
        </Transition>
      </section>
    </main>

    <Teleport to="body">
      <Transition name="photo-detail">
        <div v-if="selectedPhoto" class="photo-detail-overlay" role="dialog" aria-modal="true" :aria-label="selectedPhoto.title" @click.self="closePhoto">
          <button type="button" class="detail-close-button" aria-label="关闭照片详情" @click="closePhoto">×</button>
          <article class="photo-detail-card">
            <div class="photo-detail-image-wrap">
              <img :src="selectedPhoto.url" :alt="selectedPhoto.title" class="h-full w-full object-contain">
            </div>
            <div class="photo-detail-copy">
              <div>
                <span class="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600">{{ selectedPhoto.categoryName || '共同回忆' }}</span>
                <h2 class="mt-5 font-display text-3xl font-bold leading-tight text-rose-950 sm:text-4xl">{{ selectedPhoto.title }}</h2>
                <p class="mt-5 text-sm leading-7 text-rose-900/60 sm:text-base sm:leading-8">{{ selectedPhoto.description || '这张照片还没有写下描述。' }}</p>
              </div>
              <dl class="mt-8 space-y-4 border-t border-rose-100 pt-6 text-sm">
                <div class="flex items-center justify-between gap-5">
                  <dt class="text-rose-800/40">拍摄时间</dt>
                  <dd class="font-semibold text-rose-900">{{ formatTakenDate(selectedPhoto.takenTime, true) }}</dd>
                </div>
                <div class="flex items-center justify-between gap-5">
                  <dt class="text-rose-800/40">拍摄地点</dt>
                  <dd class="max-w-[70%] text-right font-semibold text-rose-900">{{ selectedPhoto.location || '地点未记录' }}</dd>
                </div>
              </dl>
            </div>
          </article>
        </div>
      </Transition>
    </Teleport>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api from '@/axios'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'

const pageSize = 2
const categories = ref([])
const filters = computed(() => [
  { label: '全部', value: 'all' },
  ...categories.value,
])

const boyName = ref('HE')
const girlName = ref('SHE')
const coverPhoto = ref(null)
const bookOpened = ref(false)
const initialLoading = ref(true)
const spreadLoading = ref(false)
const loadError = ref('')
const activeFilter = ref('all')
const currentPage = ref(1)
const total = ref(0)
const photos = ref([])
const selectedPhoto = ref(null)
const turnDirection = ref('next')
const spreadKey = ref(0)
let requestSerial = 0

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const spreadCount = computed(() => total.value ? totalPages.value : 0)
const spreadPhotos = computed(() => [photos.value[0] || null, photos.value[1] || null])
const pageTransitionName = computed(() => turnDirection.value === 'prev' ? 'turn-prev' : 'turn-next')
const firstVisiblePhotoNumber = computed(() => total.value ? (currentPage.value - 1) * pageSize + 1 : 0)
const lastVisiblePhotoNumber = computed(() => Math.min(currentPage.value * pageSize, total.value))

function formatTakenDate(value, full = false) {
  if (!value) return '日期未记录'
  const text = String(value)
  return full ? text.slice(0, 16) : text.slice(0, 10).replaceAll('-', '.')
}

function pageNumber(index) {
  const number = (currentPage.value - 1) * pageSize + index + 1
  return number <= total.value ? String(number).padStart(2, '0') : '—'
}

function preloadImage(url) {
  if (!url) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = resolve
    image.onerror = reject
    image.src = url
  })
}

async function fetchCover() {
  try {
    const { data } = await api.post('/photo/cover')
    const cover = data?.data
    if (data?.success && cover?.url) {
      await preloadImage(cover.url)
      coverPhoto.value = cover
    } else {
      coverPhoto.value = null
    }
  } catch (error) {
    console.warn('相册封面加载失败', error)
    coverPhoto.value = null
  }
}

async function queryConfigValue(configKey) {
  const { data } = await api.post('/site-config/query', { configKey })
  return data?.success && typeof data.data === 'string' ? data.data.trim() : ''
}

async function loadCoupleNames() {
  const [boyResult, girlResult] = await Promise.allSettled([
    queryConfigValue('boy_name'),
    queryConfigValue('girl_name'),
  ])
  if (boyResult.status === 'fulfilled' && boyResult.value) boyName.value = boyResult.value
  if (girlResult.status === 'fulfilled' && girlResult.value) girlName.value = girlResult.value
}

async function loadCategories() {
  try {
    const { data } = await api.post('/photo/categories')
    if (!data?.success || !Array.isArray(data.data)) return
    categories.value = data.data
      .filter((item) => item?.id && item?.categoryName)
      .map((item) => ({ label: String(item.categoryName).trim(), value: item.id }))
    if (activeFilter.value !== 'all' && !categories.value.some((item) => item.value === activeFilter.value)) {
      activeFilter.value = 'all'
    }
  } catch (error) {
    console.warn('相册分类加载失败', error)
  }
}

function normalizePhoto(record) {
  return {
    id: record.id,
    title: record?.title?.trim() || '未命名照片',
    description: record?.description?.trim() || '',
    photoCategoryId: record?.photoCategoryId || null,
    categoryName: record?.categoryName?.trim() || '共同回忆',
    url: record.url,
    takenTime: record?.takenTime || '',
    location: record?.location?.trim() || '',
  }
}

async function fetchSpread(targetPage = currentPage.value, options = {}) {
  const serial = ++requestSerial
  if (!options.initial) spreadLoading.value = true
  loadError.value = ''
  try {
    const payload = { current: targetPage, size: pageSize }
    if (activeFilter.value !== 'all') payload.photoCategoryId = activeFilter.value
    const { data } = await api.post('/photo/page', payload)
    if (serial !== requestSerial) return false
    if (!data?.success || !data.data) throw new Error(data?.message || '照片加载失败')

    const pageData = data.data
    const nextTotal = Number(pageData.total) || 0
    const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize))
    const safePage = Math.min(Math.max(1, targetPage), nextTotalPages)
    if (safePage !== targetPage && nextTotal > 0) return fetchSpread(safePage, options)

    photos.value = Array.isArray(pageData.records)
      ? pageData.records.filter((item) => item?.url).map(normalizePhoto)
      : []
    total.value = nextTotal
    currentPage.value = safePage
    spreadKey.value++
    return true
  } catch (error) {
    if (serial === requestSerial) {
      loadError.value = error.response?.data?.message || error.message || '照片加载失败'
    }
    return false
  } finally {
    if (serial === requestSerial) spreadLoading.value = false
  }
}

async function reloadAlbum() {
  initialLoading.value = true
  await Promise.all([fetchCover(), fetchSpread(1, { initial: true }), loadCoupleNames(), loadCategories()])
  initialLoading.value = false
}

function openBook() {
  bookOpened.value = true
}

function closeBook() {
  selectedPhoto.value = null
  bookOpened.value = false
}

async function turnPage(page, direction) {
  if (spreadLoading.value || page < 1 || page > totalPages.value || page === currentPage.value) return
  turnDirection.value = direction
  await fetchSpread(page)
}

async function setFilter(value) {
  if (spreadLoading.value || value === activeFilter.value) return
  activeFilter.value = value
  turnDirection.value = 'next'
  await fetchSpread(1)
}

function openPhoto(photo) {
  selectedPhoto.value = photo
}

function closePhoto() {
  selectedPhoto.value = null
}

function handleKeydown(event) {
  if (event.key === 'Escape' && selectedPhoto.value) {
    closePhoto()
    return
  }
  if (!bookOpened.value || selectedPhoto.value || spreadLoading.value) return
  if (event.key === 'ArrowLeft') turnPage(currentPage.value - 1, 'prev')
  if (event.key === 'ArrowRight') turnPage(currentPage.value + 1, 'next')
}

watch(selectedPhoto, (photo) => {
  document.documentElement.classList.toggle('photo-detail-open', Boolean(photo))
})

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await Promise.all([fetchCover(), fetchSpread(1, { initial: true }), loadCoupleNames(), loadCategories()])
  initialLoading.value = false
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.documentElement.classList.remove('photo-detail-open')
})
</script>

<style scoped>
.photo-book-page {
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.92), transparent 30rem),
    linear-gradient(180deg, rgba(255, 247, 248, 0.58), rgba(253, 242, 248, 0.28));
}

.book-room-light {
  position: absolute;
  width: 28rem;
  height: 28rem;
  border-radius: 999px;
  filter: blur(70px);
  pointer-events: none;
}

.book-room-light-left {
  left: -15rem;
  top: 20%;
  background: rgba(251, 207, 232, 0.36);
}

.book-room-light-right {
  right: -15rem;
  top: 8%;
  background: rgba(254, 215, 170, 0.28);
}

.closed-book-stage {
  display: flex;
  min-height: 610px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  perspective: 1400px;
}

.closed-book {
  position: relative;
  width: min(350px, 76vw);
  aspect-ratio: 0.74;
  border-radius: 0.5rem 1.35rem 1.35rem 0.5rem;
  background: #881337;
  box-shadow:
    -18px 22px 45px rgba(76, 5, 25, 0.22),
    8px 18px 25px rgba(76, 5, 25, 0.16);
  transform: rotateY(-8deg) rotateZ(-1.5deg);
  transform-style: preserve-3d;
  transition: transform 500ms ease, box-shadow 500ms ease;
}

.closed-book:hover {
  box-shadow: -22px 30px 55px rgba(76, 5, 25, 0.27), 10px 22px 30px rgba(76, 5, 25, 0.18);
  transform: rotateY(-3deg) rotateZ(0deg) translateY(-7px);
}

.closed-book-loading {
  overflow: hidden;
  pointer-events: none;
}

.closed-book-pages {
  position: absolute;
  z-index: -1;
  top: 0.55rem;
  right: -0.85rem;
  bottom: 0.55rem;
  width: 1.2rem;
  border-radius: 0 0.85rem 0.85rem 0;
  background: repeating-linear-gradient(90deg, #fffdf7 0, #fffdf7 2px, #eadfce 3px, #fffdf7 4px);
  box-shadow: 8px 10px 18px rgba(76, 5, 25, 0.16);
  transform: translateZ(-4px);
}

.closed-book-spine {
  position: absolute;
  z-index: 4;
  inset-block: 0;
  left: 0;
  width: 2.1rem;
  border-radius: 0.5rem 0 0 0.5rem;
  background: linear-gradient(90deg, rgba(49, 7, 24, 0.58), rgba(255, 255, 255, 0.07), rgba(49, 7, 24, 0.32));
  box-shadow: inset -1px 0 rgba(255, 255, 255, 0.18);
}

.cover-inner-line {
  position: absolute;
  inset: 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 0.75rem;
  box-shadow: inset 0 0 0 3px rgba(76, 5, 25, 0.12);
}

.cover-heart {
  color: rgba(255, 255, 255, 0.16);
  font-family: Georgia, serif;
  font-size: 8rem;
  text-shadow: 0 12px 35px rgba(49, 7, 24, 0.25);
}

.cover-couple-names {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.46);
  border-radius: 999px;
  background: rgba(76, 5, 25, 0.4);
  padding: 0.45rem 0.85rem;
  box-shadow: 0 8px 24px rgba(49, 7, 24, 0.2), inset 0 1px rgba(255, 255, 255, 0.16);
  color: white;
  backdrop-filter: blur(10px);
}

.cover-person-name {
  min-width: 0;
  max-width: 7.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-shadow: 0 2px 8px rgba(49, 7, 24, 0.5);
}

.cover-name-heart {
  flex-shrink: 0;
  color: #fda4af;
  font-size: 0.75rem;
  filter: drop-shadow(0 2px 4px rgba(49, 7, 24, 0.36));
}

.opened-book-view {
  position: relative;
}

.book-toolbar-button,
.bottom-page-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba(251, 113, 133, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.55rem 0.95rem;
  color: #be123c;
  font-size: 0.75rem;
  font-weight: 700;
  transition: 180ms ease;
}

.book-toolbar-button:hover,
.bottom-page-button:hover:not(:disabled) {
  border-color: rgba(244, 63, 94, 0.4);
  background: white;
  transform: translateY(-1px);
}

.bottom-page-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.book-tabs-viewport {
  width: 100%;
  max-width: 35.25rem;
  margin-inline: auto;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  border: 1px solid rgba(254, 205, 211, 0.7);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42), 0 4px 14px rgba(159, 49, 82, 0.06);
  scrollbar-width: none;
}

.book-tabs-viewport::-webkit-scrollbar {
  display: none;
}

.book-tabs {
  display: flex;
  width: max-content;
  min-width: 100%;
  gap: 0.25rem;
  border-radius: 999px;
  background: transparent;
  padding: 0.25rem;
}

.book-tab {
  width: 6.75rem;
  flex: 0 0 6.75rem;
  overflow: hidden;
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  color: rgba(136, 19, 55, 0.52);
  font-size: 0.75rem;
  font-weight: 700;
  text-overflow: ellipsis;
  transition: 180ms ease;
  white-space: nowrap;
}

.book-tab:hover:not(:disabled) {
  color: #be123c;
}

.book-tab-active,
.book-tab-active:hover:not(:disabled) {
  background: #e11d48;
  color: white;
  box-shadow: 0 5px 14px rgba(225, 29, 72, 0.2);
}

.open-book-stage {
  position: relative;
  padding-inline: 2.75rem;
  perspective: 1800px;
}

.book-shell {
  position: relative;
  min-height: 570px;
  border-radius: 1.2rem;
  background: #6b2639;
  padding: 0.55rem;
  box-shadow:
    0 32px 65px rgba(76, 5, 25, 0.2),
    0 10px 24px rgba(76, 5, 25, 0.14);
}

.book-shell::before {
  position: absolute;
  right: 2.5%;
  bottom: -0.8rem;
  left: 2.5%;
  height: 1rem;
  border-radius: 0 0 1rem 1rem;
  background: repeating-linear-gradient(180deg, #fdf8ee 0, #fdf8ee 2px, #dfd0bc 3px, #f8f0e4 4px);
  box-shadow: 0 10px 18px rgba(76, 5, 25, 0.12);
  content: '';
}

.book-spread {
  position: relative;
  display: grid;
  min-height: 560px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border-radius: 0.85rem;
  transform-origin: center;
}

.book-spread::after {
  position: absolute;
  z-index: 5;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2rem;
  content: '';
  pointer-events: none;
  transform: translateX(-50%);
  background: linear-gradient(90deg, transparent, rgba(96, 59, 42, 0.15), rgba(255, 255, 255, 0.38), rgba(96, 59, 42, 0.14), transparent);
}

.book-page {
  position: relative;
  min-width: 0;
  padding: clamp(1.25rem, 3vw, 2.35rem);
  color: #4c0519;
  background:
    radial-gradient(circle at 12% 8%, rgba(255, 255, 255, 0.9), transparent 18rem),
    repeating-linear-gradient(0deg, rgba(120, 78, 48, 0.018) 0, rgba(120, 78, 48, 0.018) 1px, transparent 1px, transparent 4px),
    #fffaf0;
}

.book-page-left {
  border-radius: 0.75rem 0.15rem 0.15rem 0.75rem;
  box-shadow: inset -18px 0 25px -24px rgba(66, 32, 24, 0.55);
}

.book-page-right {
  border-radius: 0.15rem 0.75rem 0.75rem 0.15rem;
  box-shadow: inset 18px 0 25px -24px rgba(66, 32, 24, 0.55);
}

.page-corner {
  position: absolute;
  width: 2.2rem;
  height: 2.2rem;
  border-color: rgba(190, 18, 60, 0.12);
}

.book-page-left .page-corner {
  top: 0.8rem;
  left: 0.8rem;
  border-top: 1px solid;
  border-left: 1px solid;
}

.book-page-right .page-corner {
  top: 0.8rem;
  right: 0.8rem;
  border-top: 1px solid;
  border-right: 1px solid;
}

.page-number {
  position: absolute;
  bottom: 0.75rem;
  color: rgba(136, 19, 55, 0.25);
  font-family: Georgia, serif;
  font-size: 0.7rem;
  font-style: italic;
}

.book-page-left .page-number { left: 1.25rem; }
.book-page-right .page-number { right: 1.25rem; }

.page-photo {
  display: flex;
  height: 100%;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
}

.page-photo-frame {
  position: relative;
  display: block;
  height: clamp(230px, 32vw, 355px);
  overflow: hidden;
  border: 0.45rem solid white;
  background: #fce7f3;
  box-shadow: 0 12px 26px rgba(76, 5, 25, 0.14), 0 2px 6px rgba(76, 5, 25, 0.08);
  transform: rotate(-0.7deg);
  transition: transform 260ms ease, box-shadow 260ms ease;
}

.book-page-right .page-photo-frame {
  transform: rotate(0.7deg);
}

.page-photo:hover .page-photo-frame {
  box-shadow: 0 17px 34px rgba(76, 5, 25, 0.19), 0 3px 8px rgba(76, 5, 25, 0.1);
  transform: rotate(0deg) translateY(-3px);
}

.photo-detail-hint {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 999px;
  background: rgba(76, 5, 25, 0.42);
  padding: 0.35rem 0.65rem;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  opacity: 0;
  backdrop-filter: blur(8px);
  transform: translateY(5px);
  transition: 200ms ease;
}

.page-photo:hover .photo-detail-hint {
  opacity: 1;
  transform: translateY(0);
}

.page-description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.empty-page {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.turn-button {
  position: absolute;
  z-index: 15;
  top: 50%;
  display: flex;
  width: 2.5rem;
  height: 3.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(251, 113, 133, 0.25);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  color: #be123c;
  font-family: Georgia, serif;
  font-size: 2rem;
  box-shadow: 0 8px 22px rgba(76, 5, 25, 0.1);
  transform: translateY(-50%);
  transition: 180ms ease;
}

.turn-button:hover:not(:disabled) {
  background: white;
  box-shadow: 0 10px 28px rgba(76, 5, 25, 0.16);
  transform: translateY(-50%) scale(1.05);
}

.turn-button:disabled {
  cursor: not-allowed;
  opacity: 0.28;
}

.turn-button-left { left: 0; }
.turn-button-right { right: 0; }

.book-loading-overlay {
  position: absolute;
  z-index: 20;
  inset: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  border-radius: 0.8rem;
  background: rgba(255, 250, 240, 0.58);
  color: rgba(136, 19, 55, 0.62);
  font-size: 0.75rem;
  font-weight: 700;
  backdrop-filter: blur(3px);
}

.book-loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(225, 29, 72, 0.2);
  border-top-color: #e11d48;
  border-radius: 999px;
  animation: spin 700ms linear infinite;
}

.photo-detail-overlay {
  position: fixed;
  z-index: 110;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(48, 8, 24, 0.86);
  backdrop-filter: blur(12px);
}

.photo-detail-card {
  display: grid;
  max-height: 90vh;
  width: min(1050px, 94vw);
  grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.72fr);
  overflow: hidden;
  border-radius: 1.75rem;
  background: #fffaf4;
  box-shadow: 0 35px 90px rgba(31, 4, 15, 0.42);
}

.photo-detail-image-wrap {
  min-height: 36rem;
  background: #2f111d;
}

.photo-detail-copy {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: auto;
  padding: clamp(1.75rem, 4vw, 3.25rem);
}

.detail-close-button {
  position: fixed;
  z-index: 120;
  top: 1.25rem;
  right: 1.25rem;
  display: flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1.75rem;
  line-height: 1;
  backdrop-filter: blur(8px);
}

.book-mode-enter-active,
.book-mode-leave-active,
.photo-detail-enter-active,
.photo-detail-leave-active {
  transition: opacity 260ms ease, transform 260ms ease;
}

.book-mode-enter-from,
.book-mode-leave-to,
.photo-detail-enter-from,
.photo-detail-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
}

.turn-next-enter-active,
.turn-next-leave-active,
.turn-prev-enter-active,
.turn-prev-leave-active {
  transition: opacity 180ms ease, transform 260ms ease;
}

.turn-next-enter-from { opacity: 0; transform: rotateY(-7deg) translateX(1.5%); }
.turn-next-leave-to { opacity: 0; transform: rotateY(7deg) translateX(-1.5%); }
.turn-prev-enter-from { opacity: 0; transform: rotateY(7deg) translateX(-1.5%); }
.turn-prev-leave-to { opacity: 0; transform: rotateY(-7deg) translateX(1.5%); }

@keyframes spin { to { transform: rotate(360deg); } }

:global(html.photo-detail-open),
:global(html.photo-detail-open body) {
  overflow: hidden;
}

@media (max-width: 767px) {
  .closed-book-stage { min-height: 530px; }
  .opened-book-toolbar { flex-wrap: wrap; }
  .opened-book-toolbar .book-tabs-viewport {
    order: 3;
    flex-basis: 100%;
    max-width: none;
    margin-inline: 0;
  }
  .opened-book-toolbar .book-page-indicator { order: 2; }
  .open-book-stage { padding-inline: 1.75rem; }
  .book-shell { min-height: 455px; padding: 0.35rem; }
  .book-spread { min-height: 448px; }
  .book-page { padding: 1.55rem 0.7rem 1.6rem; }
  .page-photo-frame { height: clamp(165px, 47vw, 255px); border-width: 0.3rem; }
  .page-description { display: none; }
  .photo-detail-hint { display: none; }
  .book-spread::after { width: 1.1rem; }
  .turn-button { width: 2rem; height: 3rem; font-size: 1.65rem; }
  .photo-detail-card { max-height: 92vh; grid-template-columns: 1fr; overflow-y: auto; }
  .photo-detail-image-wrap { min-height: 0; height: min(52vh, 28rem); }
  .photo-detail-copy { overflow: visible; }
}

@media (max-width: 430px) {
  .book-page { padding-inline: 0.5rem; }
  .page-photo-frame { height: 175px; }
  .book-page .font-display { font-size: 0.82rem; }
  .book-tab { padding-inline: 0.72rem; }
  .cover-couple-names { gap: 0.4rem; padding-inline: 0.65rem; }
  .cover-person-name { max-width: 5.5rem; font-size: 0.7rem; }
}

@media (prefers-reduced-motion: reduce) {
  .closed-book,
  .page-photo-frame,
  .page-photo img,
  .book-mode-enter-active,
  .book-mode-leave-active,
  .turn-next-enter-active,
  .turn-next-leave-active,
  .turn-prev-enter-active,
  .turn-prev-leave-active {
    transition-duration: 0.01ms !important;
  }
}
</style>
