<template>
  <CouplePageScaffold>
    <main v-if="isSpaceReady" class="home-page overflow-x-clip">
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

          <p v-if="spaceName" class="mt-4 inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50/70 px-3 py-1.5 text-[11px] font-semibold text-rose-600">
            <span class="text-rose-400" aria-hidden="true">♥</span>
            我的情侣空间 · {{ spaceName }}
          </p>

          <div class="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <RouterLink
              v-if="hasFrontendQueryPermission('story')"
              to="/story"
              @click="guardNavigation($event, 'story')"
              class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-300/40 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            >
              翻阅我们的故事
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
            </RouterLink>
            <RouterLink
              to="/photo"
              @click="guardNavigation($event, 'photo')"
              class="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/75 px-6 py-3 text-sm font-semibold text-rose-700 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            >
              看看恋爱相册
            </RouterLink>
            <RouterLink
              to="/plaza"
              class="inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-rose-50/70 px-6 py-3 text-sm font-semibold text-rose-600 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            >
              浏览其他情侣空间
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M5 12h14m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
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
            <RouterLink to="/photo" class="group block" aria-label="查看恋爱相册" @click="guardNavigation($event, 'photo')">
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
            @click="guardNavigation($event, card.module)"
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
            <RouterLink v-if="hasFrontendQueryPermission('story')" to="/story" class="group inline-flex items-center gap-2 text-sm font-semibold text-rose-500 transition hover:text-rose-700" @click="guardNavigation($event, 'story')">
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

          <div v-else-if="storyError" class="mt-12 rounded-3xl border border-rose-100 bg-white/80 px-6 py-12 text-center">
            <p class="font-display text-lg font-bold text-rose-900">故事暂时没有加载出来</p>
            <p class="mt-2 text-sm leading-6 text-rose-700/55">{{ storyError }}</p>
            <button
              type="button"
              class="mt-4 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              @click="loadStoryMilestones"
            >
              重新加载故事
            </button>
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
                @click="guardNavigation($event, 'story')"
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

    <main v-else class="relative z-10 overflow-x-clip">
      <div class="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <section class="relative overflow-hidden rounded-[2rem] border p-6 text-center shadow-lg shadow-rose-100/40 sm:p-10" :class="statusView.panelClass">
          <div class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/50 blur-3xl" aria-hidden="true" />
          <div class="relative">
            <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl" :class="statusView.iconClass" aria-hidden="true">
              {{ statusView.icon }}
            </span>
            <p class="mt-5 text-[11px] font-bold uppercase tracking-[0.26em]" :class="statusView.eyebrowClass">
              {{ statusView.eyebrow }}
            </p>
            <h1 class="mt-2 font-display text-3xl font-bold tracking-tight text-rose-950 sm:text-4xl">
              {{ statusView.title }}
            </h1>
            <p class="mx-auto mt-3 max-w-xl text-sm leading-7 text-rose-800/60">
              {{ statusView.description }}
            </p>
            <p v-if="spaceStatus?.spaceName && !isUnboundSpace(spaceStatus)" class="mt-4 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-rose-700">
              <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
              <span class="truncate">当前空间 · {{ spaceStatus.spaceName }}</span>
            </p>

            <div class="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <RouterLink
                v-if="statusView.showStudio"
                to="/space/studio"
                class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-rose-300/40 transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              >
                提前布置空间
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M5 12h14m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </RouterLink>
              <RouterLink
                v-if="statusView.showSetup"
                to="/space/setup"
                class="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                :class="statusView.showStudio
                  ? 'border border-rose-200 bg-white/80 text-rose-700 hover:bg-rose-50'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-300/40 hover:-translate-y-0.5 hover:brightness-105'"
              >
                {{ statusView.setupLabel || '创建或绑定情侣空间' }}
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M5 12h14m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </RouterLink>
              <RouterLink
                to="/plaza"
                class="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                :class="statusView.showSetup
                  ? 'border border-rose-200 bg-white/80 text-rose-700 hover:bg-rose-50'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-300/40 hover:-translate-y-0.5 hover:brightness-105'"
              >
                返回恋爱广场
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M5 12h14m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </RouterLink>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white/80 px-6 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                @click="refreshSpaceStatus"
              >
                刷新空间状态
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 另一半发起解绑后的首次进入提醒：支持去处理或仅对当前这条申请不再提示 -->
    <Teleport to="body">
      <Transition name="unbind-prompt">
        <div
          v-if="unbindPromptVisible"
          class="fixed inset-0 z-[80] flex items-center justify-center bg-rose-950/35 px-4 py-6 backdrop-blur-sm"
          @click.self="postponeUnbindPrompt"
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unbind-prompt-title"
            aria-describedby="unbind-prompt-desc"
            tabindex="-1"
            class="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-2xl shadow-rose-950/25 outline-none sm:p-7"
            @keydown.esc.prevent="postponeUnbindPrompt"
          >
            <div class="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-rose-100/70 blur-2xl" aria-hidden="true" />
            <div class="relative">
              <div class="flex items-start justify-between gap-4">
                <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-xl text-rose-500" aria-hidden="true">♥</span>
                <button
                  type="button"
                  class="rounded-full p-2 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  aria-label="稍后处理"
                  @click="postponeUnbindPrompt"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
                  </svg>
                </button>
              </div>

              <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.24em] text-rose-400">Unbind request</p>
              <h2 id="unbind-prompt-title" class="mt-2 font-display text-2xl font-bold text-rose-950">另一半想解除情侣空间</h2>
              <p id="unbind-prompt-desc" class="mt-3 text-sm leading-7 text-rose-800/60">
                <strong class="font-semibold text-rose-900">{{ unbindRequesterName }}</strong>
                发起了新的解绑申请<span v-if="unbindRequestedAtText">（{{ unbindRequestedAtText }}）</span>。
                同意后双方都会退出空间；拒绝则空间保持不变。
              </p>

              <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  class="rounded-full px-4 py-2.5 text-xs font-semibold text-rose-500 transition hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                  @click="ignoreUnbindPrompt"
                >
                  以后不再提示
                </button>
                <button
                  type="button"
                  class="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                  @click="postponeUnbindPrompt"
                >
                  稍后处理
                </button>
                <button
                  ref="unbindPromptPrimaryRef"
                  type="button"
                  class="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                  @click="goToUnbindSettings"
                >
                  去处理
                </button>
              </div>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import defaultBoyAvatar from '@/assets/boy.jpeg'
import defaultGirlAvatar from '@/assets/girl.jpeg'
import api from '@/axios'
import { hasFrontendQueryPermission } from '@/utils/auth'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { formatSpaceDateTime } from '@/utils/spaceFormat'
import { SPACE_STATUS, isUnbindPendingForPartner, isUnboundSpace } from '@/utils/spaceState'
import { dismissUnbindPrompt, isUnbindPromptDismissed } from '@/utils/spaceUnbindPrompt'

const router = useRouter()
const { spaceStatus, isSpaceReady, refreshSpaceStatus } = useFrontendSpace()

const spaceMembers = computed(() => (
  Array.isArray(spaceStatus.value?.members) ? spaceStatus.value.members : []
))
const creatorMember = computed(() => (
  spaceMembers.value.find(member => Number(member.memberRole) === 1) || spaceMembers.value[0] || null
))
const partnerMember = computed(() => (
  spaceMembers.value.find(member => Number(member.memberRole) === 2) || spaceMembers.value[1] || null
))
const spaceName = computed(() => spaceStatus.value?.spaceName || '我们的故事')

const unbindRequester = computed(() => (
  spaceStatus.value?.unbindRequester && typeof spaceStatus.value.unbindRequester === 'object'
    ? spaceStatus.value.unbindRequester
    : null
))
const unbindRequesterName = computed(() => (
  unbindRequester.value?.displayName || unbindRequester.value?.amourId || '另一半'
))
const unbindRequestedAtText = computed(() => (
  spaceStatus.value?.unbindRequestedAt
    ? formatSpaceDateTime(spaceStatus.value.unbindRequestedAt)
    : ''
))
const unbindPendingForPartner = computed(() => isUnbindPendingForPartner(spaceStatus.value))

/** 解绑提醒只在当前页面生命周期内弹一次；选择“以后不再提示”会按单条申请持久化。 */
const unbindPromptVisible = ref(false)
const unbindPromptSettled = ref(false)
const unbindPromptPrimaryRef = ref(null)

function maybeShowUnbindPrompt() {
  if (unbindPromptSettled.value || unbindPromptVisible.value) return
  if (!isSpaceReady.value || !unbindPendingForPartner.value) return
  if (isUnbindPromptDismissed(spaceStatus.value)) {
    unbindPromptSettled.value = true
    return
  }
  unbindPromptVisible.value = true
}

watch([isSpaceReady, unbindPendingForPartner], maybeShowUnbindPrompt, { immediate: true })

watch(unbindPromptVisible, async (visible) => {
  if (!visible) return
  await nextTick()
  unbindPromptPrimaryRef.value?.focus?.()
})

function postponeUnbindPrompt() {
  unbindPromptVisible.value = false
  unbindPromptSettled.value = true
}

function ignoreUnbindPrompt() {
  dismissUnbindPrompt(spaceStatus.value)
  postponeUnbindPrompt()
}

function goToUnbindSettings() {
  unbindPromptVisible.value = false
  unbindPromptSettled.value = true
  router.push({ name: 'space-setup', hash: '#space-unbind' })
}

const statusView = computed(() => {
  const status = Number(spaceStatus.value?.status)
  if (status === 0) {
    return {
      icon: '◷',
      eyebrow: 'Waiting For Partner',
      title: '空间已创建，等待另一半加入',
      description: '你可以先布置空间内容；另一半接受邀请后就能一起使用。',
      iconClass: 'bg-amber-100 text-amber-500',
      panelClass: 'border-amber-200/80 bg-amber-50/70',
      eyebrowClass: 'text-amber-500',
      showStudio: true,
      showSetup: true,
      setupLabel: '邀请另一半',
    }
  }
  if (status === 2) {
    return {
      icon: '❄',
      eyebrow: 'Space Frozen',
      title: '情侣空间已冻结',
      description: '空间内容暂时不可用，可以稍后刷新状态。',
      iconClass: 'bg-sky-100 text-sky-500',
      panelClass: 'border-sky-200/80 bg-sky-50/70',
      eyebrowClass: 'text-sky-500',
    }
  }
  if (status === 3) {
    // 旧 status=3 数据只做兼容提示；用户端已不提供新的归档动作。
    return {
      icon: '▣',
      eyebrow: 'Space Archived',
      title: '情侣空间已归档',
      description: '私密内容不再加载，你仍可以浏览恋爱广场里公开的空间。',
      iconClass: 'bg-slate-100 text-slate-500',
      panelClass: 'border-slate-200 bg-slate-50/80',
      eyebrowClass: 'text-slate-500',
    }
  }
  if (status === SPACE_STATUS.DELETED) {
    return {
      icon: '♥',
      eyebrow: 'Space Unbound',
      title: '情侣空间已解除绑定',
      description: '你们现在都可以重新创建或加入情侣空间。',
      iconClass: 'bg-rose-100 text-rose-500',
      panelClass: 'border-rose-200/80 bg-rose-50/70',
      eyebrowClass: 'text-rose-500',
      showSetup: true,
      setupLabel: '创建或绑定情侣空间',
    }
  }
  return {
    icon: '!',
    eyebrow: 'Space Unavailable',
    title: '情侣空间暂时不可用',
    description: '可以刷新状态后再试，或先浏览恋爱广场。',
    iconClass: 'bg-rose-100 text-rose-500',
    panelClass: 'border-rose-200/80 bg-rose-50/70',
    eyebrowClass: 'text-rose-500',
  }
})

const OSS_AMOUR_BASE = 'https://chengliuxiang.oss-cn-hangzhou.aliyuncs.com/amour'
const DEFAULT_LOVE_START_TIME = '2024-05-20 18:30:00'
const DEFAULT_HERO_PHOTO_1 = `${OSS_AMOUR_BASE}/example-photo1.png`
const DEFAULT_HERO_PHOTO_2 = `${OSS_AMOUR_BASE}/example-photo2.png`

const MODULE_LABELS = { story: '故事', photo: '相册', anniversary: '纪念日', message: '留言' }

function guardNavigation(event, module) {
  if (hasFrontendQueryPermission(module)) return
  event.preventDefault()
  ElMessage.warning(`暂无${MODULE_LABELS[module] || '该模块'}查询权限`)
}

const homeConfig = reactive({
  boyName: 'HE',
  girlName: 'SHE',
  loveStartTime: DEFAULT_LOVE_START_TIME,
  boyAvatar: defaultBoyAvatar,
  girlAvatar: defaultGirlAvatar,
  heroPhoto1: '',
  heroPhoto2: '',
})

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
  { module: 'story', to: '/story', icon: '✦', title: '我们的故事', description: '沿着时间线，重温一路走来的重要章节。', stat: storyMilestones.value.length ? `已收藏 ${storyMilestones.value.length} 个瞬间` : '等待新的章节', iconBg: 'bg-rose-100 text-rose-500', glow: 'bg-rose-100/80' },
  { module: 'photo', to: '/photo', icon: '◫', title: '恋爱相册', description: '把旅行、日常和彼此的笑容装进同一本相册。', stat: '定格每一次心动', iconBg: 'bg-pink-100 text-pink-500', glow: 'bg-pink-100/80' },
  { module: 'anniversary', to: '/anniversary', icon: '⌁', title: '纪念日', description: '记住那些值得期待，也值得庆祝的特殊日期。', stat: `相伴第 ${togetherTotalDays.value} 天`, iconBg: 'bg-orange-100 text-orange-500', glow: 'bg-orange-100/70' },
  { module: 'message', to: '/message', icon: '♡', title: '悄悄话', description: '写下此刻想说的话，让温柔一直有迹可循。', stat: '给 Ta 留一句话', iconBg: 'bg-fuchsia-100 text-fuchsia-500', glow: 'bg-fuchsia-100/70' },
].filter(card => hasFrontendQueryPermission(card.module)))

const storyMilestones = ref([])
const storyLoading = ref(true)
const storyError = ref('')

/**
 * 首页数据全部读取当前空间的 space-level 配置。
 *
 * 不再使用 /site-config/query（platform_config）：那是平台全局配置，
 * 不能代表某一对情侣的空间首页，也会导致不同空间互相串数据。
 */
async function loadHomeConfig() {
  let homeData = null
  try {
    const { data } = await api.post('/space/home/query')
    if (!data?.success) {
      throw new Error(data?.message || '空间首页加载失败')
    }
    homeData = data.data
  } catch (error) {
    console.warn('空间首页配置加载失败，使用默认值', error)
  }

  if (homeData) {
    if (homeData.boyName?.trim()) homeConfig.boyName = homeData.boyName.trim()
    if (homeData.girlName?.trim()) homeConfig.girlName = homeData.girlName.trim()
    if (homeData.loveStartTime) homeConfig.loveStartTime = homeData.loveStartTime
    if (homeData.boyAvatar?.trim()) homeConfig.boyAvatar = homeData.boyAvatar.trim()
    if (homeData.girlAvatar?.trim()) homeConfig.girlAvatar = homeData.girlAvatar.trim()
  } else {
    // 接口失败时退回到成员资料，仍然不读取平台全局配置。
    if (creatorMember.value?.displayName?.trim()) homeConfig.boyName = creatorMember.value.displayName.trim()
    if (partnerMember.value?.displayName?.trim()) homeConfig.girlName = partnerMember.value.displayName.trim()
    if (creatorMember.value?.avatar?.trim()) homeConfig.boyAvatar = creatorMember.value.avatar.trim()
    if (partnerMember.value?.avatar?.trim()) homeConfig.girlAvatar = partnerMember.value.avatar.trim()
    if (spaceStatus.value?.loveStartTime) homeConfig.loveStartTime = spaceStatus.value.loveStartTime
  }

  const [heroPhoto1, heroPhoto2] = await Promise.all([
    resolveDisplayableImage(homeData?.heroPhoto1, DEFAULT_HERO_PHOTO_1),
    resolveDisplayableImage(homeData?.heroPhoto2, DEFAULT_HERO_PHOTO_2),
  ])
  homeConfig.heroPhoto1 = heroPhoto1
  homeConfig.heroPhoto2 = heroPhoto2
  heroPhotosReady.value = true
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

async function loadStoryMilestones() {
  storyLoading.value = true
  storyError.value = ''
  try {
    const { data } = await api.post('/story/milestones')
    if (!data?.success) {
      throw new Error(data?.message || '故事加载失败')
    }
    storyMilestones.value = Array.isArray(data.data) ? data.data : []
  } catch (error) {
    storyMilestones.value = []
    storyError.value = error?.response?.data?.message || error?.message || '故事加载失败，请稍后重试'
  } finally {
    storyLoading.value = false
  }
}

onMounted(async () => {
  // 只有确认当前空间 status=1 后才允许请求私密故事数据。
  if (!isSpaceReady.value) {
    storyLoading.value = false
    return
  }
  loadHomeConfig()
  await loadStoryMilestones()
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

.unbind-prompt-enter-active,
.unbind-prompt-leave-active {
  transition: opacity 0.2s ease;
}

.unbind-prompt-enter-from,
.unbind-prompt-leave-to {
  opacity: 0;
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

  .unbind-prompt-enter-active,
  .unbind-prompt-leave-active {
    transition: none;
  }
}
</style>
