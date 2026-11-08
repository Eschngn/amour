<template>
  <div class="space-y-5">
    <div v-if="loading" class="space-y-3" aria-label="正在加载纪念日" aria-busy="true">
      <div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-2xl border border-rose-100 bg-white/60" />
    </div>

    <div v-else-if="loadError" class="rounded-2xl border border-rose-100 bg-rose-50/50 px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="mt-4 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="load">
        重新加载
      </button>
    </div>

    <template v-else>
      <section class="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-display text-lg font-bold text-rose-950">纪念日</h3>
            <p class="mt-1 text-xs leading-6 text-rose-700/50">新建纪念日默认仅空间成员可见；完成两人绑定后才可公开到恋爱广场。</p>
          </div>
          <button type="button" class="rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="load">刷新</button>
        </div>

        <div v-if="!anniversaries.length" class="mt-4 rounded-2xl border border-dashed border-rose-200 bg-white/55 px-4 py-8 text-center">
          <p class="text-sm font-semibold text-rose-800/70">还没有纪念日</p>
          <p class="mt-1 text-xs text-rose-700/45">在下方表单记住第一个重要的日子。</p>
        </div>
        <ul v-else class="mt-4 space-y-2">
          <li v-for="item in anniversaries" :key="item.id" class="relative flex flex-wrap items-start justify-between gap-3 overflow-hidden rounded-2xl border border-rose-100 bg-rose-50/25 py-3 pl-4 pr-4">
            <span class="absolute inset-y-0 left-0 w-1.5" :style="{ backgroundColor: itemAccent(item) }" aria-hidden="true" />
            <div class="flex min-w-0 flex-1 items-start gap-3">
              <span class="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-center shadow-sm" :style="itemDateTileStyle(item)" aria-hidden="true">
                <span class="text-[9px] font-bold leading-none">{{ dateParts(item.anniversaryDate).month }}</span>
                <span class="mt-0.5 font-display text-sm font-bold leading-none">{{ dateParts(item.anniversaryDate).day }}</span>
              </span>
              <div class="min-w-0">
                <p class="flex flex-wrap items-center gap-2 text-sm font-semibold text-rose-900">
                  <span class="truncate">{{ item.title }}</span>
                  <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold" :style="softTagStyle(item.colorCode)">{{ categoryLabel(item.category) }}</span>
                  <span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-500">{{ visibilityLabel(item.visibility) }}</span>
                </p>
                <p class="mt-1 text-[11px] text-rose-700/45">
                  {{ item.anniversaryDate }} · {{ Number(item.repeatType) === 0 ? '仅此一次' : '每年重复' }}
                  <span v-if="item.location"> · {{ item.location }}</span>
                </p>
                <p v-if="item.description" class="mt-1 line-clamp-2 text-xs leading-5 text-rose-800/60">{{ item.description }}</p>
              </div>
            </div>
            <div class="flex shrink-0 gap-1.5">
              <button type="button" class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-white" @click="editAnniversary(item)">编辑</button>
              <button type="button" class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-400 transition hover:bg-white hover:text-rose-600" @click="removeAnniversary(item)">删除</button>
            </div>
          </li>
        </ul>
      </section>

      <section id="anniversary-form" class="scroll-mt-24 rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-display text-lg font-bold text-rose-950">{{ form.id ? '编辑纪念日' : '新增纪念日' }}</h3>
          <button v-if="form.id" type="button" class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-50" @click="resetForm">取消编辑</button>
        </div>

        <form class="mt-4 space-y-4" @submit.prevent="save">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="studio-anniversary-title" class="block text-sm font-semibold text-rose-900">名称</label>
              <input id="studio-anniversary-title" v-model="form.title" maxlength="100" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="例如：在一起一周年">
            </div>
            <div>
              <label for="studio-anniversary-date" class="block text-sm font-semibold text-rose-900">日期</label>
              <ThemeDatePicker
                v-model="form.anniversaryDate"
                input-id="studio-anniversary-date"
                class="mt-2"
                mode="date"
                placeholder="选择纪念日期"
              />
            </div>
            <div>
              <label for="studio-anniversary-repeat" class="block text-sm font-semibold text-rose-900">重复方式</label>
              <ThemeSelect
                v-model="form.repeatType"
                input-id="studio-anniversary-repeat"
                class="mt-2"
                :options="repeatOptions"
              />
            </div>
            <div>
              <label for="studio-anniversary-category" class="block text-sm font-semibold text-rose-900">分类</label>
              <ThemeSelect
                v-model="form.category"
                input-id="studio-anniversary-category"
                class="mt-2"
                :options="ANNIVERSARY_CATEGORIES"
              />
            </div>
            <div class="sm:col-span-2 rounded-2xl border border-rose-100 bg-rose-50/30 p-4">
              <ThemeColorField
                v-model="form.colorCode"
                input-id="studio-anniversary-color"
                label="卡片主题色"
                hint="纪念日卡片、日期块与年历圆点都会使用这个颜色。"
              />
              <div class="mt-3 flex flex-wrap items-center gap-3 rounded-xl border bg-white/85 px-3 py-2.5" :style="{ borderColor: previewBorderColor }">
                <span class="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-center shadow-sm" :style="previewDateTileStyle" aria-hidden="true">
                  <span class="text-[9px] font-bold leading-none">{{ previewDateParts.month }}</span>
                  <span class="mt-0.5 font-display text-base font-bold leading-none">{{ previewDateParts.day }}</span>
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-display text-sm font-bold text-rose-950">{{ form.title.trim() || '纪念日名称预览' }}</p>
                  <p class="mt-0.5 text-[11px] text-rose-700/55">{{ categoryLabel(form.category) }} · {{ Number(form.repeatType) === 0 ? '仅此一次' : '每年重复' }}</p>
                </div>
                <span class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold" :style="previewTagStyle">主题色</span>
              </div>
            </div>
            <div>
              <label for="studio-anniversary-location" class="block text-sm font-semibold text-rose-900">地点</label>
              <input id="studio-anniversary-location" v-model="form.location" maxlength="100" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="纪念地点（选填）">
            </div>
            <div>
              <label for="studio-anniversary-sort" class="block text-sm font-semibold text-rose-900">排序</label>
              <input id="studio-anniversary-sort" v-model.number="form.sortOrder" type="number" min="0" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100">
            </div>
            <div>
              <label for="studio-anniversary-visibility" class="block text-sm font-semibold text-rose-900">可见性</label>
              <ThemeSelect
                v-model="form.visibility"
                input-id="studio-anniversary-visibility"
                class="mt-2"
                :options="visibilityOptions"
              />
            </div>
            <div class="sm:col-span-2">
              <label for="studio-anniversary-desc" class="block text-sm font-semibold text-rose-900">描述</label>
              <textarea id="studio-anniversary-desc" v-model="form.description" rows="3" maxlength="500" class="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm leading-6 text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="写一句关于这个日子的记忆（选填）" />
            </div>
          </div>

          <p v-if="error" class="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">{{ error }}</p>

          <div class="flex flex-wrap items-center gap-2">
            <button type="submit" class="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105 disabled:opacity-60" :disabled="saving">
              {{ saving ? '保存中…' : (form.id ? '保存纪念日' : '新增纪念日') }}
            </button>
            <button type="button" class="rounded-full border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50" :disabled="saving" @click="resetForm">清空表单</button>
            <span v-if="dirty" class="text-[11px] font-medium text-amber-600">有未保存的修改</span>
          </div>
        </form>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
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
    ensureSuccess(await deleteAnniversaryManage(item.id), '删除纪念日失败')
    ElMessage.success('纪念日已删除')
    await load()
  } catch (err) {
    ElMessage.error(readContentErrorMessage(err, '删除纪念日失败，请稍后重试'))
  }
}

onMounted(load)

defineExpose({ dirty, saving })
</script>
