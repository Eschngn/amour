<template>
  <header :class="['border-b border-stone-200/80 pb-4 sm:pb-5', className]">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div class="min-w-0">
        <p v-if="eyebrow" class="section-kicker">{{ eyebrow }}</p>
        <h1
          :id="headingId"
          class="mt-1 break-words font-display text-2xl font-bold leading-tight text-stone-900 sm:text-3xl"
        >
          {{ title }}
        </h1>
        <p v-if="description" class="mt-1.5 max-w-2xl text-xs leading-5 text-stone-500 sm:text-sm sm:leading-6">
          {{ description }}
        </p>
        <div v-if="$slots.meta" class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
          <slot name="meta" />
        </div>
      </div>

      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="$slots.default" class="mt-3">
      <slot />
    </div>
  </header>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  headingId: { type: String, default: 'page-title' },
  className: { type: String, default: '' },
})
</script>
