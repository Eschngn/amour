<template>
  <section id="space-basic-info" class="panel scroll-mt-24" aria-labelledby="space-basic-info-heading">
    <header class="panel-header">
      <div class="min-w-0">
        <p class="section-kicker">基础信息</p>
        <h2 id="space-basic-info-heading" class="mt-1 section-title">空间名称与恋爱时间</h2>
        <p class="mt-1 text-xs leading-5 text-stone-500">
          这些内容会显示在空间首页与恋爱广场；另一半加入后不能再修改。
        </p>
      </div>
      <button
        v-if="canEdit && !editing"
        type="button"
        class="btn-secondary shrink-0"
        @click="startEditing"
      >
        编辑空间信息
      </button>
    </header>

    <div class="px-5 sm:px-6">
      <!-- 只读摘要：默认展示，避免页面始终堆满表单 -->
      <dl v-if="!editing" class="divide-y divide-stone-100">
        <div class="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-6">
          <dt class="w-28 shrink-0 text-xs font-semibold text-stone-500">空间名称</dt>
          <dd class="min-w-0 break-words text-sm font-semibold text-stone-900">{{ form.spaceName || '我们的故事' }}</dd>
        </div>
        <div class="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-6">
          <dt class="w-28 shrink-0 text-xs font-semibold text-stone-500">空间简介</dt>
          <dd class="min-w-0 whitespace-pre-line break-words text-sm leading-6 text-stone-700">
            {{ form.description || '还没有简介' }}
          </dd>
        </div>
        <div class="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-6">
          <dt class="w-28 shrink-0 text-xs font-semibold text-stone-500">恋爱开始时间</dt>
          <dd class="min-w-0 text-sm font-semibold text-stone-900">{{ loveStartText || '未设置' }}</dd>
        </div>
      </dl>

      <!-- 只读且不允许编辑：给出明确原因，而不是一个不可点的按钮 -->
      <p
        v-if="!editing && !canEdit && readOnlyReason"
        class="mt-3 mb-4 rounded-lg border border-stone-200 bg-stone-50/80 px-3.5 py-2.5 text-xs leading-5 text-stone-600"
        role="status"
      >
        {{ readOnlyReason }}
      </p>

      <form v-else-if="editing" class="pb-5" novalidate @submit.prevent="submit">
        <div class="grid gap-4 pt-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="space-basic-info-name" class="field-label">空间名称</label>
            <input
              id="space-basic-info-name"
              :value="draft.spaceName"
              type="text"
              :maxlength="SPACE_NAME_MAX_LENGTH"
              class="field-input"
              placeholder="例如：我们的故事"
              autocomplete="off"
              :aria-invalid="Boolean(errors.spaceName) ? 'true' : 'false'"
              :aria-describedby="errors.spaceName ? 'space-basic-info-name-error' : undefined"
              @input="onNameInput"
            >
            <div class="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <p class="field-hint !mt-0">留空时保存为默认名称「我们的故事」。</p>
              <p class="text-[11px] text-stone-400">{{ nameLength }} / {{ SPACE_NAME_MAX_LENGTH }}</p>
            </div>
            <p v-if="errors.spaceName" id="space-basic-info-name-error" class="mt-1.5 text-xs font-medium text-rose-700" role="alert">
              {{ errors.spaceName }}
            </p>
          </div>

          <div class="sm:col-span-2">
            <label for="space-basic-info-love-start" class="field-label">恋爱开始时间</label>
            <ThemeDatePicker
              :model-value="draft.loveStartTime"
              input-id="space-basic-info-love-start"
              placeholder="选择恋爱开始时间"
              :clearable="true"
              @update:model-value="onLoveStartInput"
            />
            <p class="field-hint">选填；清空后首页会显示「开始日期待补充」。</p>
            <p v-if="errors.loveStartTime" class="mt-1.5 text-xs font-medium text-rose-700" role="alert">
              {{ errors.loveStartTime }}
            </p>
          </div>

          <div class="sm:col-span-2">
            <label for="space-basic-info-description" class="field-label">空间简介</label>
            <textarea
              id="space-basic-info-description"
              :value="draft.description"
              rows="3"
              :maxlength="DESCRIPTION_MAX_LENGTH"
              class="field-input resize-y leading-6"
              placeholder="写一句只属于你们的介绍（选填）"
              aria-describedby="space-basic-info-description-hint"
              @input="onDescriptionInput"
            />
            <div class="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <p id="space-basic-info-description-hint" class="field-hint !mt-0">建议写一句简短介绍，最多 500 字。</p>
              <p class="text-[11px] text-stone-400">{{ descriptionLength }} / {{ DESCRIPTION_MAX_LENGTH }}</p>
            </div>
            <p v-if="errors.description" class="mt-1.5 text-xs font-medium text-rose-700" role="alert">
              {{ errors.description }}
            </p>
          </div>
        </div>

        <p
          v-if="saveError"
          class="mt-3 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700"
          role="alert"
        >
          {{ saveError }}
        </p>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            class="btn-primary"
            :disabled="busy || locked"
            :aria-busy="saving ? 'true' : 'false'"
          >
            {{ saving ? '保存中…' : '保存修改' }}
          </button>
          <button
            type="button"
            class="btn-secondary"
            :disabled="busy"
            @click="cancelEditing"
          >
            取消
          </button>
          <span class="text-[11px] text-stone-400">取消不会提交，也不会改变已保存的内容。</span>
        </div>
      </form>

      <!--
        保存成功、但随后的状态查询失败：独立提示 + 只重试同步的入口。
        放在表单外层，退出编辑态（或用户点取消）后提示依然可见，且不会把已保存说成保存失败。
      -->
      <p
        v-if="syncNotice"
        class="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-amber-50/85 px-3.5 py-2.5 text-xs leading-5 text-amber-800"
        role="status"
      >
        <span>{{ syncNotice }}</span>
        <button
          type="button"
          class="shrink-0 rounded px-2 py-1 font-semibold text-amber-900 underline underline-offset-2 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="busy"
          @click="retrySync"
        >
          {{ retryingSync ? '同步中…' : '只重试同步' }}
        </button>
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { useSpaceSettingsWriteLock } from '@/composables/useSpaceSettingsWriteLock'
import { updateCoupleSpace } from '@/api/space'
import ThemeDatePicker from '@/components/frontend/space-studio/ThemeDatePicker.vue'
import { formatSpaceDateTime } from '@/utils/spaceFormat'
import { readSpaceErrorMessage } from '@/utils/spaceState'
import {
  DESCRIPTION_MAX_LENGTH,
  SPACE_NAME_MAX_LENGTH,
  buildBasicInfoPayload,
  countCharacters,
  createBasicInfoFormFromSpace,
  isBasicInfoUnchanged,
  normalizeMinuteValue,
  validateBasicInfoForm,
} from '@/utils/spaceBasicInfo'

const props = defineProps({
  /** 是否允许编辑（由父组件按 canEditSpaceBasicInfo 计算）。 */
  canEdit: { type: Boolean, default: false },
  /** 只读原因：允许编辑时为空字符串。 */
  readOnlyReason: { type: String, default: '' },
})

const emit = defineEmits(['saved'])

const {
  spaceStatus,
  refreshSpaceStatusAfterLifecycleAction,
  spaceError,
} = useFrontendSpace()
const { isLocked, begin, end } = useSpaceSettingsWriteLock()

const editing = ref(false)
const saving = ref(false)
const retryingSync = ref(false)
const saveError = ref('')
const syncNotice = ref('')
const errors = reactive({ spaceName: '', description: '', loveStartTime: '' })

/** 表单草稿：进入编辑态后只由用户输入修改，后台刷新不会覆盖。 */
const draft = reactive({ spaceName: '', description: '', loveStartTime: '' })
/** 最近一次服务端确认的数据；保存成功后更新，作为取消与无改动判断的基线。 */
const baselineSpace = ref(null)
const busy = computed(() => saving.value || retryingSync.value)
const locked = computed(() => isLocked())
const nameLength = computed(() => countCharacters(draft.spaceName))
const descriptionLength = computed(() => countCharacters(draft.description))

/** 只读摘要展示的是服务端确认值，而不是用户草稿。 */
const form = computed(() => createBasicInfoFormFromSpace(baselineSpace.value || spaceStatus.value))
const loveStartText = computed(() => {
  const value = baselineSpace.value?.loveStartTime ?? spaceStatus.value?.loveStartTime
  return value ? formatSpaceDateTime(value) : ''
})

/** 回填：首次进入、切换空间、或服务端确认值变化且当前不在编辑态时同步。 */
function syncFromServer(force = false) {
  const status = spaceStatus.value
  baselineSpace.value = status ? { ...status } : null
  if (editing.value && !force) return
  const next = createBasicInfoFormFromSpace(status)
  draft.spaceName = next.spaceName
  draft.description = next.description
  draft.loveStartTime = next.loveStartTime
}

watch(
  () => spaceStatus.value?.spaceId,
  () => {
    // 切换空间：无论是否在编辑，都必须放弃旧草稿。
    editing.value = false
    saveError.value = ''
    syncNotice.value = ''
    syncFromServer(true)
  },
  { immediate: true },
)

watch(
  () => spaceStatus.value?.revision,
  () => {
    if (editing.value) return
    syncFromServer()
  },
)

/** 服务端已不允许编辑（另一半加入 / 状态变化）时立刻退出编辑态，避免继续提交必然失败的请求。 */
watch(
  () => props.canEdit,
  (allowed) => {
    if (allowed) return
    editing.value = false
    saveError.value = ''
    syncFromServer(true)
  },
)

function clearMessages() {
  saveError.value = ''
  syncNotice.value = ''
  errors.spaceName = ''
  errors.description = ''
  errors.loveStartTime = ''
}

function startEditing() {
  if (!props.canEdit || editing.value) return
  clearMessages()
  // 编辑草稿从「最近确认的数据」重建，而不是从可能已被用户改过的 draft。
  const next = createBasicInfoFormFromSpace(baselineSpace.value || spaceStatus.value)
  draft.spaceName = next.spaceName
  draft.description = next.description
  draft.loveStartTime = next.loveStartTime
  editing.value = true
}

function onNameInput(event) {
  draft.spaceName = String(event?.target?.value ?? '')
  errors.spaceName = ''
  saveError.value = ''
}

function onDescriptionInput(event) {
  draft.description = String(event?.target?.value ?? '')
  errors.description = ''
  saveError.value = ''
}

function onLoveStartInput(value) {
  draft.loveStartTime = normalizeMinuteValue(value)
  errors.loveStartTime = ''
  saveError.value = ''
}

function cancelEditing() {
  if (saving.value) return
  // 取消 = 放弃草稿，恢复最近一次服务端确认的数据；不发起任何请求。
  const next = createBasicInfoFormFromSpace(baselineSpace.value || spaceStatus.value)
  draft.spaceName = next.spaceName
  draft.description = next.description
  draft.loveStartTime = next.loveStartTime
  editing.value = false
  clearMessages()
}

/** 同步失败后的「只重试同步」：只重新读取状态，绝不重复提交更新。 */
async function retrySync() {
  if (retryingSync.value || saving.value) return
  retryingSync.value = true
  try {
    await refreshSpaceStatusAfterLifecycleAction({ force: true })
    if (spaceError.value === '') {
      syncNotice.value = ''
      syncFromServer(true)
    } else {
      syncNotice.value = '已保存，但状态同步仍然失败，请检查网络后再试。'
    }
  } finally {
    retryingSync.value = false
  }
}

async function submit() {
  if (!props.canEdit) {
    saveError.value = '当前状态不允许编辑空间信息，请刷新空间状态后再试。'
    return
  }
  if (busy.value || !begin('space-basic-info')) return
  errors.spaceName = ''
  errors.description = ''
  errors.loveStartTime = ''
  saveError.value = ''
  syncNotice.value = ''

  const nextErrors = validateBasicInfoForm(draft)
  if (Object.keys(nextErrors).length) {
    Object.assign(errors, nextErrors)
    end()
    return
  }

  // 未修改时不发无意义请求：直接退出编辑态。
  if (isBasicInfoUnchanged(baselineSpace.value || spaceStatus.value, draft)) {
    editing.value = false
    end()
    return
  }

  const originalSpace = baselineSpace.value || spaceStatus.value
  const payload = buildBasicInfoPayload(draft, originalSpace?.loveStartTime)
  saving.value = true
  try {
    const { data } = await updateCoupleSpace(payload)
    if (!data?.success) {
      saveError.value = data?.message || '保存失败，请稍后重试'
      return
    }

    // 用接口返回的最新 SpaceStatusVO 确认本次保存结果（不改全局缓存，交给共享状态刷新）。
    const savedSpace = data.data && typeof data.data === 'object' ? data.data : null
    if (savedSpace) {
      baselineSpace.value = { ...savedSpace }
      const next = createBasicInfoFormFromSpace(savedSpace)
      draft.spaceName = next.spaceName
      draft.description = next.description
      draft.loveStartTime = next.loveStartTime
    }
    await refreshSpaceStatusAfterLifecycleAction({ force: true })
    if (spaceError.value === '') {
      editing.value = false
      emit('saved', { message: '空间信息已更新' })
    } else {
      // 保存明确成功、只是后续查询失败：不能说成保存失败，也不能自动重发。
      // 保留编辑态与草稿，用户可以直接点「只重试同步」，不需要重新输入。
      syncNotice.value = '空间信息已保存，但状态同步失败。你看到的内容可能需要刷新后才会更新。'
      emit('saved', { warning: '空间信息已保存，但状态同步失败' })
    }
  } catch (error) {
    // 失败保留用户输入，方便直接改完再提交。
    saveError.value = readSpaceErrorMessage(error, '保存失败，请稍后重试')
  } finally {
    saving.value = false
    end()
  }
}

/** 供父组件在「刷新状态」后让本组件重建基线（不打断正在编辑的草稿）。 */
function hasUnsavedChanges() {
  if (!editing.value) return false
  return !isBasicInfoUnchanged(baselineSpace.value || spaceStatus.value, draft)
}

defineExpose({
  startEditing,
  hasUnsavedChanges,
  isEditing: () => editing.value,
})
</script>

<style scoped>
/* 与空间设置页其它表单共用同一套字段规范，这里只补必要的可读性细节。 */
.space-basic-info :deep(.dp--main) {
  width: 100%;
}
</style>
