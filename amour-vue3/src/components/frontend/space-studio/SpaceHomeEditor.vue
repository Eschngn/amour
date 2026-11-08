<template>
  <div class="space-y-5">
    <div v-if="loading" class="space-y-3" aria-label="正在加载空间首页" aria-busy="true">
      <div v-for="n in 3" :key="n" class="h-28 animate-pulse rounded-2xl border border-rose-100 bg-white/60" />
    </div>

    <div v-else-if="loadError" class="rounded-2xl border border-rose-100 bg-rose-50/50 px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="mt-4 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="load">
        重新加载
      </button>
    </div>

    <form v-else class="space-y-5" @submit.prevent="save">
      <section class="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <h3 class="font-display text-lg font-bold text-rose-950">空间基础信息</h3>
        <p class="mt-1 text-xs leading-6 text-rose-700/50">
          空间名、简介和恋爱开始时间会保存在空间本身，并同步展示在首页与空间设置中。
        </p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="studio-home-name" class="block text-sm font-semibold text-rose-900">空间名称</label>
            <input
              id="studio-home-name"
              v-model="form.spaceName"
              maxlength="30"
              autocomplete="off"
              class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              placeholder="例如：我们的故事"
            >
            <p class="mt-1 text-right text-[11px] text-rose-700/40">{{ form.spaceName.length }} / 30</p>
          </div>
          <div class="sm:col-span-2">
            <label for="studio-home-desc" class="block text-sm font-semibold text-rose-900">空间简介</label>
            <textarea
              id="studio-home-desc"
              v-model="form.description"
              rows="3"
              maxlength="500"
              class="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm leading-6 text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              placeholder="写一句只属于你们的介绍（选填）"
            />
            <p class="mt-1 text-right text-[11px] text-rose-700/40">{{ form.description.length }} / 500</p>
          </div>
          <div>
            <label for="studio-home-love-start" class="block text-sm font-semibold text-rose-900">恋爱开始时间</label>
            <input
              id="studio-home-love-start"
              v-model="form.loveStartTime"
              type="datetime-local"
              step="60"
              class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            >
            <p class="mt-1.5 text-[11px] text-rose-700/45">用于首页的相伴天数，留空表示暂不设置。</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <h3 class="font-display text-lg font-bold text-rose-950">首页双方资料</h3>
        <p class="mt-1 text-xs leading-6 text-rose-700/50">
          留空时自动使用各自的个人资料；只有在这里明确填写，才会覆盖首页展示。
        </p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label for="studio-home-boy-name" class="block text-sm font-semibold text-rose-900">发起人展示名</label>
            <input
              id="studio-home-boy-name"
              v-model="form.boyName"
              maxlength="30"
              class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              placeholder="留空使用发起人个人昵称"
            >
          </div>
          <div>
            <label for="studio-home-girl-name" class="block text-sm font-semibold text-rose-900">另一半展示名</label>
            <input
              id="studio-home-girl-name"
              v-model="form.girlName"
              maxlength="30"
              class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              placeholder="留空使用另一半个人昵称"
            >
          </div>
          <SpaceImageField
            v-model="form.boyAvatar"
            input-id="studio-home-boy-avatar"
            label="发起人头像"
            hint="留空使用个人资料头像。"
            :disabled="saving"
            @uploading="uploading = $event"
          />
          <SpaceImageField
            v-model="form.girlAvatar"
            input-id="studio-home-girl-avatar"
            label="另一半头像"
            hint="留空使用个人资料头像。"
            :disabled="saving"
            @uploading="uploading = $event"
          />
        </div>
      </section>

      <section class="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <h3 class="font-display text-lg font-bold text-rose-950">首页主视觉照片</h3>
        <p class="mt-1 text-xs leading-6 text-rose-700/50">两张照片会出现在首页的相片卡片里，留空时使用站点示例图。</p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <SpaceImageField
            v-model="form.heroPhoto1"
            input-id="studio-home-hero-1"
            label="首页照片一"
            :disabled="saving"
            @uploading="uploading = $event"
          />
          <SpaceImageField
            v-model="form.heroPhoto2"
            input-id="studio-home-hero-2"
            label="首页照片二"
            :disabled="saving"
            @uploading="uploading = $event"
          />
        </div>
      </section>

      <p v-if="saveError" class="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs leading-5 text-rose-600" role="alert">
        {{ saveError }}
      </p>
      <p v-else-if="saveHint" class="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs leading-5 text-emerald-700" role="status">
        {{ saveHint }}
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="saving || uploading"
        >
          {{ saving ? '保存中…' : '保存首页' }}
        </button>
        <button
          type="button"
          class="rounded-full border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="saving || !dirty"
          @click="reset"
        >
          重置
        </button>
        <span v-if="dirty" class="text-[11px] font-medium text-amber-600">有未保存的修改</span>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import SpaceImageField from '@/components/frontend/space-studio/SpaceImageField.vue'
import { querySpaceHome, saveSpaceHome } from '@/api/spaceContent'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import {
  ensureSuccess,
  readContentErrorMessage,
  toBackendDateTime,
  toDateTimeLocalInput,
} from '@/utils/spaceContent'

const emit = defineEmits(['update:dirty', 'saved'])

const { refreshSpaceStatusAfterLifecycleAction } = useFrontendSpace()

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const uploading = ref(false)
const saveError = ref('')
const saveHint = ref('')
const snapshot = ref('')

const form = reactive({
  spaceName: '',
  description: '',
  loveStartTime: '',
  boyName: '',
  girlName: '',
  boyAvatar: '',
  girlAvatar: '',
  heroPhoto1: '',
  heroPhoto2: '',
})

const dirty = computed(() => Boolean(snapshot.value) && JSON.stringify(form) !== snapshot.value)

function emitDirty() {
  emit('update:dirty', dirty.value)
}

function applyHome(data) {
  form.spaceName = data.spaceName || ''
  form.description = data.description || ''
  form.loveStartTime = toDateTimeLocalInput(data.loveStartTime)
  // 接口返回的是“生效值”，可能来自成员资料或默认值；输入框里只保留空间配置本身。
  form.boyName = data.boyNameSource === 'config' ? (data.boyName || '') : ''
  form.girlName = data.girlNameSource === 'config' ? (data.girlName || '') : ''
  form.boyAvatar = data.boyAvatarSource === 'config' ? (data.boyAvatar || '') : ''
  form.girlAvatar = data.girlAvatarSource === 'config' ? (data.girlAvatar || '') : ''
  form.heroPhoto1 = data.heroPhoto1 || ''
  form.heroPhoto2 = data.heroPhoto2 || ''
}

function captureSnapshot() {
  snapshot.value = JSON.stringify(form)
  emitDirty()
}

async function load() {
  loading.value = true
  loadError.value = ''
  saveError.value = ''
  saveHint.value = ''
  try {
    const data = ensureSuccess(await querySpaceHome(), '空间首页加载失败')
    applyHome(data)
    captureSnapshot()
  } catch (error) {
    loadError.value = readContentErrorMessage(error, '空间首页加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function reset() {
  const data = JSON.parse(snapshot.value || '{}')
  Object.assign(form, data)
  saveError.value = ''
  saveHint.value = ''
  emitDirty()
}

function validate() {
  if (!form.spaceName.trim()) return '空间名称不能为空'
  if (form.spaceName.trim().length > 30) return '空间名称不能超过 30 个字符'
  if (form.description.length > 500) return '空间简介不能超过 500 个字符'
  if (form.boyName.trim().length > 30 || form.girlName.trim().length > 30) {
    return '展示名不能超过 30 个字符'
  }
  return ''
}

async function save() {
  if (saving.value || uploading.value) return
  saveError.value = ''
  saveHint.value = ''
  const validationError = validate()
  if (validationError) {
    saveError.value = validationError
    return
  }

  saving.value = true
  try {
    const data = ensureSuccess(await saveSpaceHome({
      spaceName: form.spaceName.trim(),
      description: form.description.trim(),
      loveStartTime: toBackendDateTime(form.loveStartTime),
      configs: {
        boy_name: form.boyName.trim(),
        girl_name: form.girlName.trim(),
        boy_avatar: form.boyAvatar.trim(),
        girl_avatar: form.girlAvatar.trim(),
        'home.hero_photo_1': form.heroPhoto1.trim(),
        'home.hero_photo_2': form.heroPhoto2.trim(),
      },
    }), '空间首页保存失败')

    applyHome(data)
    captureSnapshot()
    saveHint.value = '首页已保存，刷新页面后仍会保留。'
    ElMessage.success('空间首页已保存')
    emit('saved', data)
    // 空间名/简介/恋爱开始时间也会影响全局空间上下文，保存后静默刷新。
    refreshSpaceStatusAfterLifecycleAction().catch(() => {})
  } catch (error) {
    saveError.value = readContentErrorMessage(error, '空间首页保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

onMounted(load)

// 表单变化时同步 dirty 状态，供父页面在切换标签/离开时提示。
watch(form, emitDirty, { deep: true })

defineExpose({ dirty, saving })
</script>
