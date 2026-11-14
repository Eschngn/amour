<template>
  <div>
    <div v-if="loading" class="studio-panel px-5 py-6" aria-label="正在加载空间首页" aria-busy="true">
      <div class="h-5 w-32 animate-pulse rounded bg-stone-100" />
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-lg bg-stone-50" />
      </div>
    </div>

    <div v-else-if="loadError" class="studio-panel px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="btn-secondary mt-4" @click="load">重新加载</button>
    </div>

    <form v-else class="studio-panel" @submit.prevent="save">
      <header class="studio-panel-header">
        <div class="min-w-0">
          <h2 class="section-title">首页设置</h2>
          <p class="section-description">空间名称、成员展示与首页照片会同步展示在空间首页。空间已公开时，这些修改会先进入审核，广场继续展示旧版本。</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span v-if="dirty" class="text-[11px] font-medium text-amber-700" role="status">有未保存的修改</span>
          <button type="button" class="btn-secondary" :disabled="saving || !dirty" @click="reset">
            重置
          </button>
          <button type="submit" class="btn-primary" :disabled="saving || uploading">
            <span v-if="saving" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            {{ saving ? '保存中…' : '保存首页' }}
          </button>
        </div>
      </header>

      <div class="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <section class="border-b border-stone-100 px-5 py-6 lg:border-b-0 lg:border-r" aria-labelledby="studio-home-basic">
          <h3 id="studio-home-basic" class="font-display text-base font-bold text-stone-900">空间基础信息</h3>
          <p class="mt-1 text-xs leading-5 text-stone-500">这些信息也会出现在空间设置与恋爱广场入口。</p>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label for="studio-home-name" class="field-label">空间名称</label>
              <input
                id="studio-home-name"
                v-model="form.spaceName"
                maxlength="30"
                autocomplete="off"
                class="field-input"
                placeholder="例如：我们的故事"
              >
              <p class="field-hint text-right">{{ form.spaceName.length }} / 30</p>
            </div>
            <div>
              <label for="studio-home-love-start" class="field-label">恋爱开始时间</label>
              <ThemeDatePicker
                v-model="form.loveStartTime"
                input-id="studio-home-love-start"
                placeholder="选择恋爱开始时间"
              />
              <p class="field-hint">用于计算首页的相伴天数，留空表示暂不设置。</p>
            </div>
            <div class="sm:col-span-2">
              <label for="studio-home-desc" class="field-label">空间简介</label>
              <textarea
                id="studio-home-desc"
                v-model="form.description"
                rows="3"
                maxlength="500"
                class="field-input resize-y leading-6"
                placeholder="写一句只属于你们的介绍（选填）"
              />
              <p class="field-hint text-right">{{ form.description.length }} / 500</p>
            </div>
          </div>

          <div class="mt-6 border-t border-stone-100 pt-6" aria-labelledby="studio-home-visual">
            <h3 id="studio-home-visual" class="font-display text-base font-bold text-stone-900">首页主视觉照片</h3>
            <p class="mt-1 text-xs leading-5 text-stone-500">两张照片会出现在首页相片卡片里，留空时使用站点示例图。</p>
            <div class="mt-5 grid gap-4">
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
          </div>
        </section>

        <div>
          <section class="px-5 py-6" aria-labelledby="studio-home-members">
            <h3 id="studio-home-members" class="font-display text-base font-bold text-stone-900">首页双方展示</h3>
            <p class="mt-1 text-xs leading-5 text-stone-500">留空时使用各自的个人资料，填写后覆盖首页展示。</p>

            <div class="mt-5 space-y-4">
              <div class="rounded-xl bg-stone-50/70 p-4">
                <p class="text-xs font-bold text-stone-500">发起人</p>
                <div class="mt-3">
                  <label for="studio-home-boy-name" class="field-label">展示名</label>
                  <input
                    id="studio-home-boy-name"
                    v-model="form.boyName"
                    maxlength="30"
                    class="field-input"
                    placeholder="留空使用发起人个人昵称"
                  >
                </div>
                <div class="mt-3">
                  <SpaceImageField
                    v-model="form.boyAvatar"
                    input-id="studio-home-boy-avatar"
                    label="头像"
                    hint="留空使用个人资料头像。"
                    :disabled="saving"
                    @uploading="uploading = $event"
                  />
                </div>
              </div>

              <div class="rounded-xl bg-stone-50/70 p-4">
                <p class="text-xs font-bold text-stone-500">另一半</p>
                <div class="mt-3">
                  <label for="studio-home-girl-name" class="field-label">展示名</label>
                  <input
                    id="studio-home-girl-name"
                    v-model="form.girlName"
                    maxlength="30"
                    class="field-input"
                    placeholder="留空使用另一半个人昵称"
                  >
                </div>
                <div class="mt-3">
                  <SpaceImageField
                    v-model="form.girlAvatar"
                    input-id="studio-home-girl-avatar"
                    label="头像"
                    hint="留空使用个人资料头像。"
                    :disabled="saving"
                    @uploading="uploading = $event"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div v-if="saveError" class="border-t border-rose-200 bg-rose-50/70 px-5 py-3 text-xs leading-5 text-rose-700" role="alert">
        {{ saveError }}
      </div>
      <div v-else-if="saveHint" class="border-t border-emerald-200 bg-emerald-50/60 px-5 py-3 text-xs leading-5 text-emerald-700" role="status">
        {{ saveHint }}
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import SpaceImageField from '@/components/frontend/space-studio/SpaceImageField.vue'
import ThemeDatePicker from '@/components/frontend/space-studio/ThemeDatePicker.vue'
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
    saveHint.value = data.reviewMessage || '首页已保存，刷新页面后仍会保留。'
    ElMessage.success(data.reviewMessage || '空间首页已保存')
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
