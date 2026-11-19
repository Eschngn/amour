<template>
  <div>
    <label v-if="label" :for="inputId" class="field-label">{{ label }}</label>

    <!-- 文件选择器是唯一入口；上传接口返回的 URL 只在内部保存，不展示给用户。 -->
    <input
      :id="inputId"
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="sr-only"
      tabindex="-1"
      :disabled="disabled || uploading"
      :aria-required="required ? 'true' : 'false'"
      @change="onFileChange"
    >

    <div v-if="previewUrl" class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
      <button
        type="button"
        class="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 transition hover:border-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        :aria-label="previewAriaLabel"
        @click="openPreview"
      >
        <img
          v-if="!thumbnailFailed"
          :src="previewUrl"
          :alt="thumbnailAlt"
          class="h-full w-full object-cover"
          @error="thumbnailFailed = true"
        >
        <span v-else class="flex h-full w-full items-center justify-center px-2 text-center text-[10px] leading-4 text-stone-400">
          图片无法加载
        </span>
        <span class="pointer-events-none absolute inset-x-0 bottom-0 bg-stone-950/55 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
          点击放大
        </span>
      </button>

      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-secondary" :disabled="disabled || uploading" @click="openPreview">
          预览
        </button>
        <button
          type="button"
          class="btn-secondary"
          :data-image-field-trigger="inputId"
          :disabled="disabled || uploading"
          @click="fileInputRef?.click()"
        >
          {{ uploading ? '上传中…' : '重新上传' }}
        </button>        <button type="button" class="btn-ghost" :disabled="disabled || uploading" @click="clearImage">
          清除
        </button>
      </div>
    </div>

    <div v-else class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        class="btn-secondary w-fit"
        :data-image-field-trigger="inputId"
        :disabled="disabled || uploading"
        @click="fileInputRef?.click()"
      >
        {{ uploading ? '上传中…' : '上传图片' }}
      </button>
      <span class="text-[11px] text-stone-400">从本地选择图片</span>
    </div>

    <p v-if="hint" class="field-hint">{{ hint }}</p>
    <p v-else class="field-hint">支持 JPG、PNG、WebP、GIF，最大 5MB。</p>
    <p v-if="error" class="mt-2 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
      {{ error }}
    </p>
    <p v-else-if="justUploaded" class="mt-2 text-[11px] leading-5 text-emerald-600" role="status">
      图片已上传，记得保存当前内容。
    </p>

    <SpaceImagePreview
      :open="previewOpen"
      :src="previewUrl"
      :alt="thumbnailAlt"
      @close="closePreview"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import SpaceImagePreview from '@/components/frontend/space-studio/SpaceImagePreview.vue'
import { uploadSpaceImage } from '@/api/spaceContent'
import { ensureSuccess, isSafeImageUrl, readContentErrorMessage } from '@/utils/spaceContent'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  inputId: { type: String, required: true },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'uploading'])

const fileInputRef = ref(null)
const uploading = ref(false)
const error = ref('')
const justUploaded = ref(false)
const thumbnailFailed = ref(false)
const previewOpen = ref(false)

const previewUrl = computed(() => (
  props.modelValue && isSafeImageUrl(props.modelValue) ? props.modelValue.trim() : ''
))
const thumbnailAlt = computed(() => `${props.label || '已上传图片'}预览`)
const previewAriaLabel = computed(() => `放大预览${props.label || '图片'}`)

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024

watch(previewUrl, () => {
  thumbnailFailed.value = false
  if (!previewUrl.value) previewOpen.value = false
})

function openPreview() {
  if (!previewUrl.value) return
  thumbnailFailed.value = false
  previewOpen.value = true
}

function closePreview() {
  previewOpen.value = false
}

function clearImage() {
  error.value = ''
  justUploaded.value = false
  previewOpen.value = false
  emit('update:modelValue', '')
}

async function onFileChange(event) {
  const file = event.target.files?.[0]
  // 允许连续选择同一个文件时仍然触发 change。
  event.target.value = ''
  if (!file) return

  error.value = ''
  justUploaded.value = false
  if (!ALLOWED_TYPES.includes(file.type)) {
    error.value = '只支持 JPG、PNG、WebP 或 GIF 图片'
    return
  }
  if (file.size > MAX_SIZE) {
    error.value = '图片不能超过 5MB'
    return
  }

  uploading.value = true
  emit('uploading', true)
  try {
    const data = ensureSuccess(await uploadSpaceImage(file), '图片上传失败，请稍后重试')
    if (!data?.url) throw new Error('上传成功但没有返回图片地址')
    emit('update:modelValue', data.url)
    justUploaded.value = true
  } catch (err) {
    error.value = readContentErrorMessage(err, '图片上传失败，请稍后重试')
  } finally {
    uploading.value = false
    emit('uploading', false)
  }
}
</script>
