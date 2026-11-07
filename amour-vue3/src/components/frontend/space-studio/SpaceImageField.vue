<template>
  <div>
    <label v-if="label" :for="inputId" class="block text-sm font-semibold text-rose-900">{{ label }}</label>
    <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
      <div class="min-w-0 flex-1">
        <input
          :id="inputId"
          :value="modelValue"
          type="url"
          inputmode="url"
          maxlength="500"
          class="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-rose-50/50"
          :placeholder="placeholder"
          :disabled="disabled"
          @input="$emit('update:modelValue', $event.target.value)"
        >
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          class="sr-only"
          tabindex="-1"
          @change="onFileChange"
        >
        <button
          type="button"
          class="rounded-xl border border-rose-200 bg-white px-4 py-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="disabled || uploading"
          @click="fileInputRef?.click()"
        >
          {{ uploading ? '上传中…' : '上传图片' }}
        </button>
        <button
          v-if="modelValue"
          type="button"
          class="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-3 text-xs font-semibold text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="disabled || uploading"
          @click="$emit('update:modelValue', '')"
        >
          清除
        </button>
      </div>
    </div>
    <p v-if="hint" class="mt-1.5 text-[11px] leading-5 text-rose-700/45">{{ hint }}</p>
    <p v-if="error" class="mt-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">
      {{ error }}
    </p>
    <p v-else-if="justUploaded" class="mt-2 text-[11px] leading-5 text-emerald-600" role="status">
      图片已上传，记得保存当前内容。
    </p>
    <img
      v-if="previewUrl"
      :src="previewUrl"
      alt=""
      class="mt-2 h-20 w-20 rounded-xl border border-rose-100 object-cover"
      @error="$event.currentTarget.style.display = 'none'"
    >
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { uploadSpaceImage } from '@/api/spaceContent'
import { ensureSuccess, isSafeImageUrl, readContentErrorMessage } from '@/utils/spaceContent'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  inputId: { type: String, required: true },
  hint: { type: String, default: '' },
  placeholder: { type: String, default: 'https://… 或上传一张图片' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'uploading'])

const fileInputRef = ref(null)
const uploading = ref(false)
const error = ref('')
const justUploaded = ref(false)

const previewUrl = computed(() => (
  props.modelValue && isSafeImageUrl(props.modelValue) ? props.modelValue.trim() : ''
))

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024

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
