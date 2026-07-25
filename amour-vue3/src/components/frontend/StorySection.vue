<template>
  <section
    id="story"
    class="relative z-10 py-20"
    aria-labelledby="story-heading"
  >
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div
        class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
      >
        <div>
          <h2
            id="story-heading"
            class="font-display text-3xl font-bold text-rose-950 sm:text-4xl"
          >
            {{ headingLine1 }}
            <br>
            {{ headingLine2 }}
          </h2>
          <p class="mt-6 leading-relaxed text-rose-800/65">
            {{ intro }}
          </p>
          <ul class="mt-8 space-y-4 text-sm text-rose-900/80">
            <li
              v-for="(item, i) in bullets"
              :key="i"
              class="flex gap-3"
            >
              <span
                class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"
              >✓</span>
              {{ item }}
            </li>
          </ul>
        </div>
        <div
          class="relative rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-pink-50 p-8 shadow-lg shadow-rose-200/35 sm:p-10"
        >
          <blockquote class="font-display text-xl leading-relaxed text-rose-900 sm:text-2xl">
            {{ quote }}
          </blockquote>
          <footer class="mt-6 text-sm text-rose-700/55">
            {{ attribution }}
          </footer>
          <div
            class="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-pink-200/50 blur-2xl"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  headingLine1: {
    type: String,
    default: '不是朋友圈，',
  },
  headingLine2: {
    type: String,
    default: '是「回家」的入口',
  },
  intro: {
    type: String,
    default:
      '情侣空间不必热闹，只要安心。你们可以按自己的节奏记录：一次旅行、一顿晚餐、一句晚安。时间越久，这里越像一本会自己变厚的相册。',
  },
  bullets: {
    type: Array,
    default: () => [
      '双人权限：邀请 Ta 加入，共同编辑与浏览',
      '私密链接：不公开搜索，只分享给最重要的人',
      '轻量好用：打开即写，把心思留给对方而不是操作',
    ],
  },
  quote: {
    type: String,
    default: '「以后吵架了，就来这里翻翻——原来我们一起走了这么远。」',
  },
  attribution: {
    type: String,
    default: '— 来自 Amour 内测用户',
  },
})
</script>
