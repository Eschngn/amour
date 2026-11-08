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
      <button type="button" class="btn-secondary mt-4" @click="load">重新加载</button>
    </div>

    <div v-else class="space-y-5">
      <section class="studio-panel">
        <header class="studio-panel-header">
          <div class="min-w-0">
            <h2 class="section-title">纪念日</h2>
            <p class="section-description">共 {{ anniversaries.length }} 个重要日子。新建纪念日默认仅空间成员可见。</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="btn-ghost" @click="load">刷新</button>
            <button type="button" class="btn-primary" @click="startNew">新增纪念日</button>
          </div>
        </header>
        <p class="border-t border-stone-100 px-5 py-3 text-[11px] leading-5 text-stone-500">
          完成两人绑定后，才可以把纪念日主动公开到恋爱广场。
        </p>
      </section>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
        <section class="studio-panel min-w-0" aria-labelledby="studio-anniversary-list-heading">
          <header class="studio-panel-header">
            <div class="min-w-0">
              <h3 id="studio-anniversary-list-heading" class="section-title">纪念日列表</h3>
              <p class="section-description">选择一项，在右侧编辑。</p>
            </div>
          </header>

          <div v-if="!anniversaries.length" class="studio-panel-body">
            <div class="studio-empty">
              <p class="text-sm font-semibold text-stone-800">还没有纪念日</p>
              <p class="mt-1 text-xs text-stone-500">点击「新增纪念日」记住第一个重要的日子。</p>
            </div>
          </div>

          <ul v-else class="divide-y divide-stone-100" aria-label="纪念日列表">
            <li
              v-for="item in anniversaries"
              :key="item.id"
              class="flex items-start gap-3 px-4 py-3.5 transition"
              :class="form.id === item.id ? 'bg-rose-50/60' : 'hover:bg-stone-50/70'"
            >
              <span class="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-center" :style="itemDateTileStyle(item)" aria-hidden="true">
                <span class="text-[9px] font-bold leading-none">{{ dateParts(item.anniversaryDate).month }}</span>
                <span class="mt-0.5 font-display text-base font-bold leading-none">{{ dateParts(item.anniversaryDate).day }}</span>
              </span>

              <button
                type="button"
                class="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`编辑纪念日 ${item.title}`"
                :aria-current="form.id === item.id ? 'true' : undefined"
                @click="editAnniversary(item)"
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
                <span class="mt-1 block text-[10px] text-stone-400">{{ visibilityLabel(item.visibility) }}</span>
              </button>

              <button
                type="button"
                class="mt-0.5 shrink-0 rounded p-1.5 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`删除纪念日 ${item.title}`"
                title="删除纪念日"
                @click="removeAnniversary(item)"
              >
                <Delete class="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>

        <section id="anniversary-form" class="studio-panel scroll-mt-24" aria-labelledby="studio-anniversary-editor-heading">
          <header class="studio-panel-header">
            <div class="min-w-0">
              <h3 id="studio-anniversary-editor-heading" class="section-title">
                {{ form.id ? '编辑纪念日' : '新增纪念日' }}
              </h3>
              <p class="section-description">日期、重复方式与主题色会决定它在日历中的展示。</p>
            </div>
            <button v-if="form.id" type="button" class="btn-ghost" @click="resetForm">取消编辑</button>
          </header>

          <form @submit.prevent="save">
            <div class="space-y-4 px-5 py-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <label for="studio-anniversary-title" class="field-label">名称</label>
                  <input
                    id="studio-anniversary-title"
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
                <div>
                  <label for="studio-anniversary-sort" class="field-label">排序</label>
                  <input
                    id="studio-anniversary-sort"
                    v-model.number="form.sortOrder"
                    type="number"
                    min="0"
                    class="field-input"
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

            <div class="flex flex-wrap items-center gap-2 border-t border-stone-100 bg-stone-50/40 px-5 py-4">
              <button type="submit" class="btn-primary" :disabled="saving">
                {{ saving ? '保存中…' : (form.id ? '保存纪念日' : '新增纪念日') }}
              </button>
              <button type="button" class="btn-secondary" :disabled="saving" @click="resetForm">清空表单</button>
              <span v-if="dirty" class="text-[11px] font-medium text-amber-700" role="status">有未保存的修改</span>
            </div>
          </form>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import { Delete } from '@element-plus/icons-vue'
import {
  deleteAnniversaryManage,
  fetchAnniversaryManageList,
  saveAnniversaryManage,
} from '@/api/spaceContent'
import ThemeColorField from '@/components/frontend/space-studio/ThemeColorField.vue'
import ThemeDatePicker from '@/components/frontend/space-studio/ThemeDatePicker.vue'
import ThemeSelect from '@/components/frontend/space-studio/ThemeSelect.vue'
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
  VISIBILITY_OPTIONS,
} from '@/utils/spaceContent'

const props = defineProps({
  canPublish: { type: Boolean, default: false },
})

const emit = defineEmits(['update:dirty'])

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
const form = reactive(emptyForm())
let baseline = ''

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
    sortOrder: 0,
    visibility: 0,
  }
}

const dirty = computed(() => Boolean(baseline) && JSON.stringify({ ...form }) !== baseline)

function captureBaseline() {
  baseline = JSON.stringify({ ...form })
  emit('update:dirty', dirty.value)
}

watch(form, () => emit('update:dirty', dirty.value), { deep: true })

function visibilityLabel(value) {
  return VISIBILITY_OPTIONS.find(option => option.value === Number(value))?.label || '仅空间成员可见'
}

function categoryLabel(value) {
  return ANNIVERSARY_CATEGORIES.find(option => option.value === value)?.label || '其他'
}

function resetForm() {
  Object.assign(form, emptyForm())
  error.value = ''
  captureBaseline()
}

function startNew() {
  resetForm()
  document.getElementById('anniversary-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function editAnniversary(item) {
  form.id = item.id
  form.title = item.title || ''
  form.description = item.description || ''
  form.anniversaryDate = String(item.anniversaryDate || '').slice(0, 10)
  form.repeatType = Number(item.repeatType) === 0 ? 0 : 1
  form.category = item.category || 'other'
  form.colorCode = normalizeHexColor(item.colorCode, DEFAULT_THEME_COLOR)
  form.location = item.location || ''
  form.sortOrder = Number(item.sortOrder) || 0
  form.visibility = Number(item.visibility) || 0
  error.value = ''
  document.getElementById('anniversary-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const data = ensureSuccess(await fetchAnniversaryManageList(), '纪念日加载失败')
    anniversaries.value = Array.isArray(data) ? data : []
    resetForm()
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
  saving.value = true
  try {
    ensureSuccess(await saveAnniversaryManage({
      id: form.id,
      title: form.title.trim(),
      description: form.description.trim(),
      anniversaryDate: form.anniversaryDate,
      repeatType: Number(form.repeatType),
      category: form.category,
      colorCode,
      location: form.location.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      visibility: Number(form.visibility),
    }), '纪念日保存失败')
    ElMessage.success(form.id ? '纪念日已更新' : '纪念日已创建')
    await load()
  } catch (err) {
    error.value = readContentErrorMessage(err, '纪念日保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

async function removeAnniversary(item) {
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
    ElMessage.success('纪念日已删除')
    await load()
  } catch (err) {
    ElMessage.error(readContentErrorMessage(err, '删除纪念日失败，请稍后重试'))
  }
}

onMounted(load)

defineExpose({ dirty, saving })
</script>
