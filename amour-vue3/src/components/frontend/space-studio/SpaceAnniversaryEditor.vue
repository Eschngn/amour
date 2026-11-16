<template>
  <div>
    <div v-if="loading" class="studio-panel px-5 py-6" aria-label="正在加载纪念日" aria-busy="true">
      <div class="h-5 w-24 animate-pulse rounded bg-stone-100" />
      <div class="mt-6 space-y-3">
        <div v-for="n in 3" :key="n" class="h-20 animate-pulse rounded-lg bg-stone-50" />
      </div>
    </div>

    <div v-else-if="loadError" class="studio-panel px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="btn-secondary mt-4" @click="handleRefresh">重新加载</button>
    </div>

    <div v-else class="space-y-5">
      <section class="studio-panel">
        <header class="studio-panel-header">
          <div class="min-w-0">
            <h2 class="section-title">纪念日</h2>
            <p class="section-description">共 {{ anniversaries.length }} 个重要日子。新建纪念日默认仅空间成员可见。</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span v-if="sort.saving" class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700" role="status">
              <span class="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" aria-hidden="true" />
              正在保存顺序…
            </span>
            <span v-else-if="sort.dragging" class="text-[11px] font-semibold text-rose-700" role="status">松手后自动保存</span>
            <button
              type="button"
              class="btn-ghost"
              :disabled="sort.busy"
              @click="handleRefresh"
            >
              刷新
            </button>
            <button
              ref="newAnniversaryButtonRef"
              type="button"
              class="btn-primary"
              :disabled="sort.busy"
              @click="startNew($event)"
            >
              新增纪念日
            </button>
          </div>
        </header>
        <p v-if="sortError" class="border-t border-rose-200 bg-rose-50/70 px-5 py-3 text-xs leading-5 text-rose-700" role="alert">
          {{ sortError }}
        </p>
        <p class="border-t border-stone-100 px-5 py-3 text-[11px] leading-5 text-stone-500">
          完成两人绑定后，才可以把纪念日主动公开到恋爱广场。
        </p>
      </section>

      <section class="studio-panel min-w-0" aria-labelledby="studio-anniversary-list-heading">
        <header class="studio-panel-header">
          <div class="min-w-0">
            <h3 id="studio-anniversary-list-heading" class="section-title">纪念日列表</h3>
            <p class="section-description">点击纪念日卡片或「编辑」修改；拖动手柄调整排序，松手自动保存。</p>
          </div>
        </header>

        <div v-if="!anniversaries.length" class="studio-panel-body">
          <div class="studio-empty">
            <p class="text-sm font-semibold text-stone-800">还没有纪念日</p>
            <p class="mt-1 text-xs text-stone-500">点击「新增纪念日」记住第一个重要的日子。</p>
          </div>
        </div>

        <div v-else ref="anniversaryListRef">
          <TransitionGroup
            tag="ul"
            name="studio-sort-list"
            class="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3"
            aria-label="纪念日列表"
          >
          <li
            v-for="(item, index) in anniversaries"
            :key="item.id"
            :data-sort-index="index"
            :data-sort-id="item.id"
            :aria-grabbed="sort.dragging && sort.dragIndex === index ? 'true' : 'false'"
            class="studio-sortable-item flex items-start gap-3 rounded-xl border p-3"
            :class="[
              dialogOpen && form.id === item.id ? 'border-rose-200 bg-rose-50/60' : 'border-stone-200 bg-white hover:border-stone-300',
              sort.dragging && sort.dragIndex === index ? 'studio-sort-placeholder relative z-10' : '',
            ]"
            @pointerdown="sort.onRowPointerDown(index, $event)"
          >
            <SortHandleButton
              class="mt-0.5"
              :label="`纪念日 ${item.title}`"
              :position="index + 1"
              :disabled="anniversaries.length < 2 || sort.saving"
              :saving="sort.saving && String(sort.savingId) === String(item.id)"
              :disabled-hint="sort.saving ? '正在保存顺序' : '当前无法调整顺序'"
              @drag-start="sort.startDrag(index, $event)"
              @move-up="sort.moveByOffset(index, -1)"
              @move-down="sort.moveByOffset(index, 1)"
            />
            <span class="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-center" :style="itemDateTileStyle(item)" aria-hidden="true">
              <span class="text-[9px] font-bold leading-none">{{ dateParts(item.anniversaryDate).month }}</span>
              <span class="mt-0.5 font-display text-base font-bold leading-none">{{ dateParts(item.anniversaryDate).day }}</span>
            </span>

            <button
              type="button"
              class="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              :aria-label="`查看并编辑纪念日 ${item.title}`"
              :aria-current="dialogOpen && form.id === item.id ? 'true' : undefined"
              @click="editAnniversary(item, $event)"
            >
              <span class="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-stone-900">
                <span class="truncate">{{ item.title }}</span>
                <span class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold" :style="softTagStyle(item.colorCode)">{{ categoryLabel(item.category) }}</span>
              </span>
              <span class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                <span>{{ item.anniversaryDate }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ Number(item.repeatType) === 0 ? '仅此一次' : '每年重复' }}</span>
                <span v-if="item.location" aria-hidden="true">·</span>
                <span v-if="item.location" class="truncate">{{ item.location }}</span>
              </span>
              <span class="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-stone-400">
                <span>{{ visibilityLabel(item.visibility) }}</span>
                <span
                  v-if="reviewStatusLabel(item.reviewStatus)"
                  class="rounded-full px-1.5 py-0.5 font-semibold"
                  :class="reviewStatusClass(item.reviewStatus)"
                >
                  {{ reviewStatusLabel(item.reviewStatus) }}
                </span>
              </span>
              <span
                v-if="item.reviewStatus === 'REJECTED'"
                class="mt-1.5 block rounded-lg border border-rose-100 bg-rose-50/80 px-2 py-1.5 text-[10px] leading-5 text-rose-700"
              >
                <span class="font-semibold">驳回原因：</span>{{ item.reviewRejectReason || '未填写原因' }}
                <span class="block text-rose-500">
                  {{ item.reviewHasPublishedVersion ? '恋爱广场继续展示上一次已通过的版本。' : '该内容尚未公开。' }}
                </span>
              </span>
            </button>

            <div class="flex shrink-0 flex-col items-center gap-1">
              <button
                type="button"
                class="btn-ghost !px-2 !py-1 !text-[11px]"
                :aria-label="`编辑纪念日 ${item.title}`"
                title="编辑纪念日"
                @click="editAnniversary(item, $event)"
              >
                编辑
              </button>
              <button
                type="button"
                class="rounded p-1.5 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`删除纪念日 ${item.title}`"
                title="删除纪念日"
                @click="removeAnniversary(item)"
              >
                <Delete class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
          </TransitionGroup>
        </div>
      </section>
    </div>

    <!-- 纪念日新增 / 编辑弹窗 -->
    <SpaceStudioDialog
      v-model="dialogOpen"
      :title="form.id ? '编辑纪念日' : '新增纪念日'"
      description="日期、重复方式与主题色会决定它在日历中的展示。"
      width="min(720px, calc(100vw - 24px))"
      :before-close="handleDialogBeforeClose"
      @opened="focusTitle"
      @closed="handleDialogClosed"
    >
      <div class="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button type="button" class="btn-ghost" :disabled="saving" @click="handleResetForm">清空表单</button>
      </div>

      <form id="studio-anniversary-form" @submit.prevent="save">
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="studio-anniversary-title" class="field-label">名称</label>
              <input
                id="studio-anniversary-title"
                ref="titleInputRef"
                v-model="form.title"
                maxlength="100"
                class="field-input"
                placeholder="例如：在一起一周年"
              >
            </div>
            <div>
              <label for="studio-anniversary-date" class="field-label">日期</label>
              <ThemeDatePicker
                v-model="form.anniversaryDate"
                input-id="studio-anniversary-date"
                class="mt-2"
                mode="date"
                placeholder="选择纪念日期"
              />
            </div>
            <div>
              <label for="studio-anniversary-repeat" class="field-label">重复方式</label>
              <ThemeSelect
                v-model="form.repeatType"
                input-id="studio-anniversary-repeat"
                class="mt-2"
                :options="repeatOptions"
              />
            </div>
            <div>
              <label for="studio-anniversary-category" class="field-label">分类</label>
              <ThemeSelect
                v-model="form.category"
                input-id="studio-anniversary-category"
                class="mt-2"
                :options="ANNIVERSARY_CATEGORIES"
              />
            </div>
            <div>
              <label for="studio-anniversary-visibility" class="field-label">可见性</label>
              <ThemeSelect
                v-model="form.visibility"
                input-id="studio-anniversary-visibility"
                class="mt-2"
                :options="visibilityOptions"
              />
            </div>
            <div>
              <label for="studio-anniversary-location" class="field-label">地点</label>
              <input
                id="studio-anniversary-location"
                v-model="form.location"
                maxlength="100"
                class="field-input"
                placeholder="纪念地点（选填）"
              >
            </div>
            <div class="sm:col-span-2">
              <label for="studio-anniversary-desc" class="field-label">描述</label>
              <textarea
                id="studio-anniversary-desc"
                v-model="form.description"
                rows="2"
                maxlength="500"
                class="field-input resize-y leading-6"
                placeholder="写一句关于这个日子的记忆（选填）"
              />
            </div>
          </div>

          <p class="field-hint">
            {{ form.id ? '保存后保留当前顺序，可在列表中调整顺序。' : '保存后默认添加到列表末尾，可在列表中调整顺序。' }}
          </p>

          <div class="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
            <ThemeColorField
              v-model="form.colorCode"
              input-id="studio-anniversary-color"
              label="卡片主题色"
              hint="纪念日卡片、日期块与年历圆点都会使用这个颜色。"
            />
            <div class="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-white px-3 py-2.5" :style="{ borderColor: previewBorderColor }">
              <span class="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-center" :style="previewDateTileStyle" aria-hidden="true">
                <span class="text-[9px] font-bold leading-none">{{ previewDateParts.month }}</span>
                <span class="mt-0.5 font-display text-base font-bold leading-none">{{ previewDateParts.day }}</span>
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate font-display text-sm font-bold text-stone-900">{{ form.title.trim() || '纪念日名称预览' }}</p>
                <p class="mt-0.5 text-[11px] text-stone-500">{{ categoryLabel(form.category) }} · {{ Number(form.repeatType) === 0 ? '仅此一次' : '每年重复' }}</p>
              </div>
              <span class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold" :style="previewTagStyle">主题色</span>
            </div>
          </div>

          <p v-if="error" class="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">{{ error }}</p>
        </div>
      </form>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span v-if="dirty" class="text-[11px] font-medium text-amber-700" role="status">有未保存的修改</span>
          <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button type="button" class="btn-secondary" :disabled="saving" @click="closeDialog">取消</button>
            <button type="submit" form="studio-anniversary-form" class="btn-primary" :disabled="saving">
              {{ saving ? '保存中…' : (form.id ? '保存纪念日' : '新增纪念日') }}
            </button>
          </div>
        </div>
      </template>
    </SpaceStudioDialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import { Delete } from '@element-plus/icons-vue'
import {
  deleteAnniversaryManage,
  fetchAnniversaryManageList,
  saveAnniversaryManage,
  saveAnniversaryOrder,
} from '@/api/spaceContent'
import ThemeColorField from '@/components/frontend/space-studio/ThemeColorField.vue'
import ThemeDatePicker from '@/components/frontend/space-studio/ThemeDatePicker.vue'
import ThemeSelect from '@/components/frontend/space-studio/ThemeSelect.vue'
import SpaceStudioDialog from '@/components/frontend/space-studio/SpaceStudioDialog.vue'
import SortHandleButton from '@/components/frontend/space-studio/SortHandleButton.vue'
import { useDragSort } from '@/composables/useDragSort'
import { normalizeSortItems } from '@/utils/reorderList'
import {
  DEFAULT_THEME_COLOR,
  accentTextColor,
  normalizeHexColor,
  softenHexColor,
  themeBorderColor,
} from '@/utils/themeColor'
import {
  ANNIVERSARY_CATEGORIES,
  buildVisibilityOptions,
  ensureSuccess,
  readContentErrorMessage,
  reviewStatusLabel,
  VISIBILITY_OPTIONS,
} from '@/utils/spaceContent'
import { createFormSnapshot, isFormDirty, shouldSkipUnchangedSave } from '@/utils/formBaseline'
import { confirmDiscardChanges } from '@/utils/unsavedChanges'
import { resolveSaveFeedback, resolveUnchangedFeedback } from '@/utils/saveFeedback'

const props = defineProps({
  canPublish: { type: Boolean, default: false },
  /** 重新提交公开审核后由父组件触发刷新。 */
  refreshKey: { type: [String, Number], default: '' },
})

const emit = defineEmits(['update:dirty', 'saved'])

const repeatOptions = [
  { value: 1, label: '每年重复' },
  { value: 0, label: '仅此一次' },
]
const visibilityOptions = computed(() => buildVisibilityOptions(props.canPublish))

const loading = ref(true)
const loadError = ref('')
const anniversaries = ref([])
const saving = ref(false)
const error = ref('')
const dialogOpen = ref(false)
const titleInputRef = ref(null)
const newAnniversaryButtonRef = ref(null)
let dialogTrigger = null
const form = reactive(emptyForm())
const baseline = ref('')

/** 纪念日卡片直接拖拽：空间级全局排序，松手即保存。 */
const sortError = ref('')
const dragSort = useDragSort({
  items: anniversaries,
  enabled: () => !dialogOpen.value && !saving.value,
  onDrop: async (orderedItems) => {
    sortError.value = ''
    ensureSuccess(
      await saveAnniversaryOrder({ items: normalizeSortItems(orderedItems) }),
      '纪念日排序保存失败',
    )
    orderedItems.forEach((item, index) => {
      item.sortOrder = (index + 1) * 10
    })
    emitSimpleSaved('纪念日顺序已保存')
  },
  onError: (err) => {
    sortError.value = readContentErrorMessage(err, '纪念日排序未保存，已恢复原顺序，请重试')
    ElMessage.error(sortError.value)
  },
})
const anniversaryListRef = dragSort.listRef
const sort = reactive({
  saving: dragSort.saving,
  savingId: dragSort.savingId,
  dragging: dragSort.dragging,
  dragIndex: dragSort.dragIndex,
  busy: dragSort.busy,
  startDrag: dragSort.startDrag,
  onRowPointerDown: dragSort.onRowPointerDown,
  moveByOffset: dragSort.moveByOffset,
  cancelDrag: dragSort.cancelDrag,
})

/** 主题色预览：日期块使用浅色主题底，保持与展示页一致。 */
const previewAccent = computed(() => normalizeHexColor(form.colorCode, DEFAULT_THEME_COLOR))
const previewDateParts = computed(() => dateParts(form.anniversaryDate))
const previewBorderColor = computed(() => themeBorderColor(previewAccent.value))
const previewDateTileStyle = computed(() => dateTileStyle(previewAccent.value))
const previewTagStyle = computed(() => softTagStyle(previewAccent.value))

function dateParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').slice(0, 10))
  if (!match) return { month: '日期', day: '--' }
  return { month: `${Number(match[2])}月`, day: match[3] }
}

function itemAccent(item) {
  return normalizeHexColor(item?.colorCode, DEFAULT_THEME_COLOR)
}

function dateTileStyle(color) {
  const accent = normalizeHexColor(color, DEFAULT_THEME_COLOR)
  return {
    backgroundColor: softenHexColor(accent),
    color: accentTextColor(accent),
    boxShadow: `inset 0 0 0 1px ${themeBorderColor(accent)}`,
  }
}

function itemDateTileStyle(item) {
  return dateTileStyle(itemAccent(item))
}

function softTagStyle(color) {
  const accent = normalizeHexColor(color, DEFAULT_THEME_COLOR)
  return {
    backgroundColor: softenHexColor(accent),
    borderColor: themeBorderColor(accent),
    color: accentTextColor(accent),
  }
}

function emptyForm() {
  return {
    id: null,
    title: '',
    description: '',
    anniversaryDate: '',
    repeatType: 1,
    category: 'love',
    colorCode: '#D94F70',
    location: '',
    visibility: 0,
  }
}

/** 快照与保存请求保持一致：文本 trim、数字字段保持数字类型。 */
function formSnapshot() {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    anniversaryDate: form.anniversaryDate,
    repeatType: Number(form.repeatType),
    category: form.category,
    colorCode: normalizeHexColor(form.colorCode),
    location: form.location.trim(),
    visibility: Number(form.visibility),
  }
}

const dirty = computed(() => isFormDirty(baseline.value, formSnapshot()))

function captureBaseline() {
  baseline.value = createFormSnapshot(formSnapshot())
  emit('update:dirty', dirty.value)
}

/** 排序、删除等无审核语义的成功操作统一走页面级保存反馈。 */
function emitSimpleSaved(message) {
  emit('saved', {
    ...resolveSaveFeedback(null, message),
    dirtyAfterSave: dirty.value,
  })
}

watch(dirty, () => emit('update:dirty', dirty.value))

/** 统一的覆盖前确认：只有真正 dirty 时才询问。 */
async function confirmOverwrite(message) {
  if (!dirty.value) return true
  return confirmDiscardChanges(message)
}

function visibilityLabel(value) {
  return VISIBILITY_OPTIONS.find(option => option.value === Number(value))?.label || '仅空间成员可见'
}

function reviewStatusClass(status) {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700'
  if (status === 'REJECTED') return 'bg-rose-100 text-rose-700'
  if (status === 'UNPUBLISHED') return 'bg-slate-200 text-slate-600'
  return 'bg-emerald-100 text-emerald-700'
}

function categoryLabel(value) {
  return ANNIVERSARY_CATEGORIES.find(option => option.value === value)?.label || '其他'
}

function resetForm() {
  Object.assign(form, emptyForm())
  error.value = ''
  captureBaseline()
}

async function handleResetForm() {
  if (!(await confirmOverwrite('清空表单会丢弃当前未保存的修改，确定继续吗？'))) return
  resetForm()
  focusTitle()
}

/** 记住触发弹窗的元素，关闭后把焦点还回去。 */
function rememberDialogTrigger(event) {
  if (event?.currentTarget instanceof HTMLElement) return event.currentTarget
  return null
}

function restoreDialogFocus() {
  const trigger = dialogTrigger
  dialogTrigger = null
  const target = trigger?.isConnected ? trigger : newAnniversaryButtonRef.value
  nextTick(() => {
    target?.focus({ preventScroll: true })
  })
}

async function startNew(event) {
  if (sort.busy) return
  if (!(await confirmOverwrite('新增纪念日会丢弃当前未保存的修改，确定继续吗？'))) return
  dialogTrigger = rememberDialogTrigger(event)
  resetForm()
  dialogOpen.value = true
  focusTitle()
}

function focusTitle() {
  nextTick(() => {
    titleInputRef.value?.focus({ preventScroll: true })
  })
}

async function closeDialog() {
  if (saving.value) return
  if (!(await confirmOverwrite('关闭纪念日弹窗会丢弃当前未保存的修改，确定继续吗？'))) return
  dialogOpen.value = false
}

async function handleDialogBeforeClose(done) {
  if (saving.value) return
  if (!(await confirmOverwrite('关闭纪念日弹窗会丢弃当前未保存的修改，确定继续吗？'))) return
  done()
}

function handleDialogClosed() {
  resetForm()
  restoreDialogFocus()
}

async function editAnniversary(item, event) {
  if (sort.busy) return
  if (dialogOpen.value && String(form.id) === String(item.id)) {
    focusTitle()
    return
  }
  if (!(await confirmOverwrite('切换纪念日会丢弃当前未保存的修改，确定继续吗？'))) return
  dialogTrigger = rememberDialogTrigger(event)
  form.id = item.id
  form.title = item.title || ''
  form.description = item.description || ''
  form.anniversaryDate = String(item.anniversaryDate || '').slice(0, 10)
  form.repeatType = Number(item.repeatType) === 0 ? 0 : 1
  form.category = item.category || 'other'
  form.colorCode = normalizeHexColor(item.colorCode, DEFAULT_THEME_COLOR)
  form.location = item.location || ''
  form.visibility = Number(item.visibility) || 0
  error.value = ''
  captureBaseline()
  dialogOpen.value = true
  focusTitle()
}

async function handleRefresh() {
  if (sort.busy) return
  if (!(await confirmOverwrite('刷新会重新加载数据并丢弃当前未保存的修改，确定继续吗？'))) return
  await load()
}

/**
 * @param {{ resetForms?: boolean }} options
 * resetForms=false 时只刷新列表数据，保留当前表单，避免覆盖正在编辑的内容。
 */
async function load({ resetForms = true } = {}) {
  loading.value = true
  loadError.value = ''
  try {
    const data = ensureSuccess(await fetchAnniversaryManageList(), '纪念日加载失败')
    anniversaries.value = Array.isArray(data) ? data : []
    if (resetForms) {
      dragSort.cancelDrag()
      dialogOpen.value = false
      resetForm()
    }
  } catch (err) {
    loadError.value = readContentErrorMessage(err, '纪念日加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value) return
  error.value = ''
  if (!form.title.trim()) {
    error.value = '纪念日名称不能为空'
    return
  }
  if (!form.anniversaryDate) {
    error.value = '请选择纪念日期'
    return
  }
  const colorCode = normalizeHexColor(form.colorCode)
  if (!colorCode) {
    error.value = '请选择卡片主题色'
    return
  }
  // 编辑已有纪念日但没有任何改动：不调用保存接口，也不创建或提交审核。
  if (shouldSkipUnchangedSave({
    editing: Boolean(form.id),
    baseline: baseline.value,
    snapshot: formSnapshot(),
    busy: saving.value || sort.busy,
  })) {
    dialogOpen.value = false
    resetForm()
    emit('saved', { ...resolveUnchangedFeedback(), dirtyAfterSave: dirty.value })
    return
  }
  saving.value = true
  try {
    const result = ensureSuccess(await saveAnniversaryManage({
      id: form.id,
      title: form.title.trim(),
      description: form.description.trim(),
      anniversaryDate: form.anniversaryDate,
      repeatType: Number(form.repeatType),
      category: form.category,
      colorCode,
      location: form.location.trim(),
      visibility: Number(form.visibility),
    }), '纪念日保存失败')
    const feedback = resolveSaveFeedback(result, form.id ? '纪念日已更新' : '纪念日已创建')
    // 保存成功后重建基线，避免自动刷新再次触发放弃确认。
    await load({ resetForms: false })
    dialogOpen.value = false
    resetForm()
    emit('saved', { ...feedback, dirtyAfterSave: dirty.value })
  } catch (err) {
    error.value = readContentErrorMessage(err, '纪念日保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

async function removeAnniversary(item) {
  if (sort.busy) return
  try {
    await ElMessageBox.confirm(`确定删除纪念日「${item.title}」吗？`, '删除纪念日', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
  } catch {
    return
  }
  try {
    ensureSuccess(await deleteAnniversaryManage(item.id), '纪念日删除失败')
    emitSimpleSaved('纪念日已删除')
    await load({ resetForms: false })
    if (String(form.id) === String(item.id)) {
      dialogOpen.value = false
      resetForm()
    }
  } catch (err) {
    ElMessage.error(readContentErrorMessage(err, '删除纪念日失败，请稍后重试'))
  }
}

onMounted(load)

/** 审核状态刷新只同步列表；用户正在编辑时保留表单内容。 */
watch(() => props.refreshKey, () => {
  if (sort.saving) return
  load({ resetForms: !dirty.value })
})

defineExpose({ dirty, saving })
</script>
