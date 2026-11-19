<template>
  <section
    v-if="canOpenStudio"
    id="space-content-entry"
    class="panel scroll-mt-24"
    aria-labelledby="space-content-heading"
  >
    <header class="panel-header">
      <div class="min-w-0">
        <p class="section-kicker">内容管理</p>
        <h2 id="space-content-heading" class="mt-1 section-title">布置空间内容</h2>
        <p class="mt-1 text-xs leading-5 text-stone-500">
          编辑首页、故事、留言、相册和纪念日；未公开的内容不会出现在恋爱广场。
        </p>
      </div>
      <RouterLink to="/space/studio" class="btn-primary shrink-0">
        去内容编辑
      </RouterLink>
    </header>
  </section>
</template>

<script setup>
/**
 * 「内容管理入口」与「基础信息编辑」必须是两个不同名字的动作：
 * - 本卡片进入 /space/studio，编辑首页/故事/照片等内容；
 * - 基础信息卡片只改空间名称、简介与恋爱开始时间。
 */
defineProps({
  canOpenStudio: { type: Boolean, default: false },
})
</script>
