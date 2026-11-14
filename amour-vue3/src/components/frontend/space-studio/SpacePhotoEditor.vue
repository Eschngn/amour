<template>
  <div>
    <div v-if="loading" class="studio-panel px-5 py-6" aria-label="正在加载相册" aria-busy="true">
      <div class="h-5 w-24 animate-pulse rounded bg-stone-100" />
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="n in 3" :key="n" class="h-44 animate-pulse rounded-lg bg-stone-50" />
      </div>
    </div>

    <div v-else-if="loadError" class="studio-panel px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="btn-secondary mt-4" @click="load">重新加载</button>
    </div>

    <div v-else class="space-y-5">
      <!-- 相册工具条与分类管理：分类按需展开，不再常驻大表单 -->
      <section class="studio-panel" aria-labelledby="studio-photo-heading">
        <header class="studio-panel-header">
          <div class="min-w-0">
            <h2 id="studio-photo-heading" class="section-title">相册</h2>
            <p class="section-description">共 {{ total }} 张照片 · {{ categories.length }} 个分类。分类下仍有照片时不能删除。</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="btn-ghost" @click="load">刷新</button>
            <button type="button" class="btn-secondary" @click="openCategoryCreate">新增分类</button>
            <button type="button" class="btn-primary" :disabled="!categories.length" @click="startNewPhoto">
              新增照片
            </button>
          </div>
        </header>

        <div class="px-5 py-4">
          <div v-if="!categories.length" class="studio-empty">
            <p class="text-sm font-semibold text-stone-800">还没有相册分类</p>
            <p class="mt-1 text-xs text-stone-500">先新增一个分类，再上传照片。</p>
          </div>
          <ul v-else class="flex flex-wrap gap-2" aria-label="相册分类">
            <li
              v-for="category in categories"
              :key="category.id"
              class="flex items-center gap-1 rounded-lg border py-1 pl-2.5 pr-1 text-xs"
              :class="categoryEditorOpen && categoryForm.id === category.id
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-stone-200 bg-stone-50/70 text-stone-700'"
            >
              <span class="max-w-40 truncate font-semibold" :title="category.categoryName">{{ category.categoryName }}</span>
              <span class="text-[10px] text-stone-400">{{ category.isEnabled === false ? '停用' : '启用' }}</span>
              <button
                type="button"
                class="rounded p-1 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`编辑分类 ${category.categoryName}`"
                title="编辑分类"
                @click="editCategory(category)"
              >
                <EditPen class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="rounded p-1 text-stone-400 transition hover:bg-white hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                :aria-label="`删除分类 ${category.categoryName}`"
                title="删除分类"
                @click="removeCategory(category)"
              >
                <Delete class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>

        <div v-if="categoryEditorOpen" class="border-t border-stone-100 bg-stone-50/50 px-5 py-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-display text-base font-bold text-stone-900">
              {{ categoryForm.id ? '编辑分类' : '新增分类' }}
            </h3>
            <button type="button" class="btn-ghost" @click="closeCategoryEditor">关闭</button>
          </div>

          <form class="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_7rem_auto_auto]" @submit.prevent="saveCategory">
            <div>
              <label for="studio-category-name" class="field-label">分类名称</label>
              <input
                id="studio-category-name"
                v-model="categoryForm.name"
                maxlength="50"
                class="field-input"
                placeholder="例如「日常」"
              >
            </div>
            <div>
              <label for="studio-category-sort" class="field-label">排序</label>
              <input
                id="studio-category-sort"
                v-model.number="categoryForm.sortOrder"
                type="number"
                min="0"
                class="field-input"
              >
            </div>
            <label class="flex items-center gap-2 self-end rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-700">
              <input v-model="categoryForm.isEnabled" type="checkbox" class="h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-400">
              启用
            </label>
            <div class="flex items-center gap-2 self-end">
              <button type="submit" class="btn-primary" :disabled="categorySaving">
                {{ categorySaving ? '保存中…' : (categoryForm.id ? '保存分类' : '新增分类') }}
              </button>
              <button v-if="categoryForm.id" type="button" class="btn-secondary" @click="closeCategoryEditor">取消</button>
            </div>
          </form>
          <p v-if="categoryError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">{{ categoryError }}</p>
        </div>
      </section>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] xl:items-start">
        <!-- 照片浏览区 -->
        <section class="studio-panel min-w-0" aria-labelledby="studio-photo-list-heading">
          <header class="studio-panel-header">
            <div class="min-w-0">
              <h3 id="studio-photo-list-heading" class="section-title">照片</h3>
              <p class="section-description">第 {{ current }} / {{ totalPages }} 页 · 新建照片默认仅空间成员可见</p>
            </div>
            <ThemeSelect
              v-model="filterCategoryId"
              input-id="studio-photo-filter"
              size="sm"
              placeholder="全部分类"
              :options="categoryFilterOptions"
            />
          </header>

          <div v-if="!photos.length" class="studio-panel-body">
            <div class="studio-empty">
              <p class="text-sm font-semibold text-stone-800">还没有照片</p>
              <p class="mt-1 text-xs text-stone-500">点击「新增照片」添加第一张。</p>
            </div>
          </div>

          <ul v-else class="grid gap-3 p-4 sm:grid-cols-2" aria-label="照片列表">
            <li
              v-for="photo in photos"
              :key="photo.id"
              class="overflow-hidden rounded-xl border bg-white transition"
              :class="photoForm.id === photo.id ? 'border-rose-300 ring-1 ring-rose-100' : 'border-stone-200 hover:border-stone-300'"
            >
              <button
                type="button"
                class="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300"
                :aria-label="`编辑照片 ${photo.title || '未命名照片'}`"
                :aria-current="photoForm.id === photo.id ? 'true' : undefined"
                @click="editPhoto(photo)"
              >
                <img v-if="photo.url" :src="photo.url" :alt="photo.title || '相册照片'" class="h-32 w-full object-cover" @error="$event.currentTarget.style.display = 'none'">
                <div v-else class="flex h-32 w-full items-center justify-center bg-stone-100 text-2xl text-stone-300" aria-hidden="true">♥</div>
                <div class="p-3">
                  <p class="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                    <span class="truncate">{{ photo.title || '未命名照片' }}</span>
                    <span v-if="photo.isCover" class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">封面</span>
                  </p>
                  <p class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                    <span class="truncate">{{ photo.categoryName || '未分类' }}</span>
                    <span v-if="photo.takenTime" aria-hidden="true">·</span>
                    <span v-if="photo.takenTime">{{ String(photo.takenTime).slice(0, 10) }}</span>
                    <span class="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">{{ visibilityLabel(photo.visibility) }}</span>
                    <span
                      v-if="reviewStatusLabel(photo.reviewStatus)"
                      class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      :class="reviewStatusClass(photo.reviewStatus)"
                    >
                      {{ reviewStatusLabel(photo.reviewStatus) }}
                    </span>
                  </p>
                  <p
                    v-if="photo.reviewStatus === 'REJECTED'"
                    class="mt-1.5 rounded-lg border border-rose-100 bg-rose-50/80 px-2 py-1.5 text-[10px] leading-5 text-rose-700"
                  >
                    <span class="font-semibold">驳回原因：</span>{{ photo.reviewRejectReason || '未填写原因' }}
                    <span class="block text-rose-500">
                      {{ photo.reviewHasPublishedVersion ? '恋爱广场继续展示上一次已通过的版本。' : '该内容尚未公开。' }}
                    </span>
                  </p>
                </div>
              </button>
              <div class="flex items-center justify-end gap-1 border-t border-stone-100 px-2 py-1.5">
                <button type="button" class="btn-ghost !px-2 !py-1 !text-[11px]" @click="editPhoto(photo)">编辑</button>
                <button
                  type="button"
                  class="btn-ghost !px-2 !py-1 !text-[11px] !text-stone-400 hover:!text-rose-600"
                  :aria-label="`删除照片 ${photo.title || '未命名照片'}`"
                  @click="removePhoto(photo)"
                >
                  删除
                </button>
              </div>
            </li>
          </ul>

          <footer v-if="totalPages > 1" class="flex items-center justify-between gap-3 border-t border-stone-100 px-5 py-3">
            <span class="text-xs text-stone-500">{{ current }} / {{ totalPages }}</span>
            <div class="flex gap-2">
              <button type="button" class="btn-secondary !py-1.5" :disabled="current <= 1 || pageLoading" @click="goToPage(current - 1)">上一页</button>
              <button type="button" class="btn-secondary !py-1.5" :disabled="current >= totalPages || pageLoading" @click="goToPage(current + 1)">下一页</button>
            </div>
          </footer>
        </section>

        <!-- 照片编辑区 -->
        <section id="photo-form" class="studio-panel scroll-mt-24" aria-labelledby="studio-photo-editor-heading">
          <header class="studio-panel-header">
            <div class="min-w-0">
              <h3 id="studio-photo-editor-heading" class="section-title">
                {{ photoForm.id ? '编辑照片' : '新增照片' }}
              </h3>
              <p class="section-description">从左侧选择一张照片进行编辑，或在这里新建。</p>
            </div>
            <button v-if="photoForm.id" type="button" class="btn-ghost" @click="resetPhotoForm">取消编辑</button>
          </header>

          <form @submit.prevent="savePhoto">
            <div class="space-y-4 px-5 py-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label for="studio-photo-category" class="field-label">所属分类</label>
                  <ThemeSelect
                    v-model="photoForm.categoryId"
                    input-id="studio-photo-category"
                    class="mt-2"
                    placeholder="请选择分类"
                    :options="categoryOptions"
                  />
                </div>
                <div>
                  <label for="studio-photo-taken" class="field-label">拍摄时间</label>
                  <ThemeDatePicker
                    v-model="photoForm.takenTime"
                    input-id="studio-photo-taken"
                    class="mt-2"
                    mode="datetime"
                    placeholder="选择拍摄时间"
                  />
                </div>
                <div class="sm:col-span-2">
                  <label for="studio-photo-title" class="field-label">标题</label>
                  <input id="studio-photo-title" v-model="photoForm.title" maxlength="100" class="field-input" placeholder="给这张照片起个名字">
                </div>
                <div class="sm:col-span-2">
                  <label for="studio-photo-desc" class="field-label">描述</label>
                  <textarea
                    id="studio-photo-desc"
                    v-model="photoForm.description"
                    rows="2"
                    maxlength="500"
                    class="field-input resize-y leading-6"
                    placeholder="这张照片背后的故事（选填）"
                  />
                </div>
                <div>
                  <label for="studio-photo-location" class="field-label">地点</label>
                  <input id="studio-photo-location" v-model="photoForm.location" maxlength="100" class="field-input" placeholder="拍摄地点（选填）">
                </div>
                <div>
                  <label for="studio-photo-sort" class="field-label">排序</label>
                  <input id="studio-photo-sort" v-model.number="photoForm.sortOrder" type="number" min="0" class="field-input">
                </div>
              </div>

              <div class="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <p class="text-xs font-bold text-stone-500">展示设置</p>
                <div class="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label for="studio-photo-visibility" class="field-label">可见性</label>
                    <ThemeSelect
                      v-model="photoForm.visibility"
                      input-id="studio-photo-visibility"
                      class="mt-2"
                      :options="visibilityOptions"
                    />
                  </div>
                  <label class="flex items-center gap-2 self-end rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-700">
                    <input v-model="photoForm.isCover" type="checkbox" class="h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-400">
                    设为相册封面
                  </label>
                </div>
              </div>

              <SpaceImageField
                v-model="photoForm.url"
                input-id="studio-photo-url"
                label="照片"
                hint="支持 JPG、PNG、WebP、GIF，最大 5MB。"
                :disabled="photoSaving"
                @uploading="uploading = $event"
              />

              <p v-if="photoError" class="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">{{ photoError }}</p>
            </div>

            <div class="flex flex-wrap items-center gap-2 border-t border-stone-100 bg-stone-50/40 px-5 py-4">
              <button type="submit" class="btn-primary" :disabled="photoSaving || uploading || !categories.length">
                {{ photoSaving ? '保存中…' : (uploading ? '图片上传中…' : (photoForm.id ? '保存照片' : '新增照片')) }}
              </button>
              <button type="button" class="btn-secondary" :disabled="photoSaving" @click="resetPhotoForm">清空表单</button>
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
import { Delete, EditPen } from '@element-plus/icons-vue'
import SpaceImageField from '@/components/frontend/space-studio/SpaceImageField.vue'
import ThemeDatePicker from '@/components/frontend/space-studio/ThemeDatePicker.vue'
import ThemeSelect from '@/components/frontend/space-studio/ThemeSelect.vue'
import {
  deletePhotoManageCategory,
  deletePhotoManagePhoto,
  fetchPhotoManageCategories,
  fetchPhotoManagePage,
  savePhotoManageCategory,
  savePhotoManagePhoto,
} from '@/api/spaceContent'
import {
  buildVisibilityOptions,
  ensureSuccess,
  readContentErrorMessage,
  reviewStatusLabel,
  saveSuccessMessage,
  toBackendDateTime,
  toDateTimeLocalInput,
  VISIBILITY_OPTIONS,
} from '@/utils/spaceContent'

const PAGE_SIZE = 8

const props = defineProps({
  canPublish: { type: Boolean, default: false },
  /** 重新提交公开审核后由父组件触发刷新。 */
  refreshKey: { type: [String, Number], default: '' },
})

const emit = defineEmits(['update:dirty'])

const loading = ref(true)
const pageLoading = ref(false)
const loadError = ref('')
const categories = ref([])
const photos = ref([])
const total = ref(0)
const current = ref(1)
const filterCategoryId = ref('all')

const categoryOptions = computed(() => categories.value.map(category => ({ value: category.id, label: category.categoryName })))
const categoryFilterOptions = computed(() => [{ value: 'all', label: '全部分类' }, ...categoryOptions.value])
const visibilityOptions = computed(() => buildVisibilityOptions(props.canPublish))

const categoryForm = reactive({ id: null, name: '', sortOrder: 10, isEnabled: true })
const categorySaving = ref(false)
const categoryError = ref('')
const categoryEditorOpen = ref(false)

const photoForm = reactive(emptyPhotoForm())
const photoSaving = ref(false)
const uploading = ref(false)
const photoError = ref('')
let baseline = ''

function emptyPhotoForm() {
  return {
    id: null,
    categoryId: '',
    title: '',
    description: '',
    url: '',
    takenTime: '',
    location: '',
    sortOrder: 0,
    isCover: false,
    visibility: 0,
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const dirty = computed(() => Boolean(baseline) && JSON.stringify({ categoryForm: { ...categoryForm }, photoForm: { ...photoForm } }) !== baseline)

function captureBaseline() {
  baseline = JSON.stringify({ categoryForm: { ...categoryForm }, photoForm: { ...photoForm } })
  emit('update:dirty', dirty.value)
}

watch([categoryForm, photoForm], () => emit('update:dirty', dirty.value), { deep: true })

function visibilityLabel(value) {
  return VISIBILITY_OPTIONS.find(option => option.value === Number(value))?.label || '仅空间成员可见'
}

function reviewStatusClass(status) {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700'
  if (status === 'REJECTED') return 'bg-rose-100 text-rose-700'
  if (status === 'UNPUBLISHED') return 'bg-slate-200 text-slate-600'
  return 'bg-emerald-100 text-emerald-700'
}

function nextCategorySort() {
  return categories.value.reduce((max, category) => Math.max(max, Number(category.sortOrder) || 0), 0) + 10
}

function resetCategoryForm() {
  categoryForm.id = null
  categoryForm.name = ''
  categoryForm.sortOrder = nextCategorySort()
  categoryForm.isEnabled = true
  categoryError.value = ''
  captureBaseline()
}

function openCategoryCreate() {
  resetCategoryForm()
  categoryEditorOpen.value = true
}

function closeCategoryEditor() {
  categoryEditorOpen.value = false
  resetCategoryForm()
}

function editCategory(category) {
  categoryForm.id = category.id
  categoryForm.name = category.categoryName || ''
  categoryForm.sortOrder = Number(category.sortOrder) || 0
  categoryForm.isEnabled = category.isEnabled !== false
  categoryError.value = ''
  categoryEditorOpen.value = true
}

function resetPhotoForm() {
  Object.assign(photoForm, emptyPhotoForm())
  photoForm.categoryId = categories.value[0]?.id ?? ''
  photoError.value = ''
  captureBaseline()
}

function startNewPhoto() {
  resetPhotoForm()
  document.getElementById('photo-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function editPhoto(photo) {
  photoForm.id = photo.id
  photoForm.categoryId = photo.photoCategoryId
  photoForm.title = photo.title || ''
  photoForm.description = photo.description || ''
  photoForm.url = photo.url || ''
  photoForm.takenTime = toDateTimeLocalInput(photo.takenTime)
  photoForm.location = photo.location || ''
  photoForm.sortOrder = Number(photo.sortOrder) || 0
  photoForm.isCover = photo.isCover === true
  photoForm.visibility = Number(photo.visibility) || 0
  photoError.value = ''
  document.getElementById('photo-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const categoryData = ensureSuccess(await fetchPhotoManageCategories(), '相册分类加载失败')
    categories.value = Array.isArray(categoryData) ? categoryData : []
    await loadPhotos()
    categoryEditorOpen.value = false
    resetCategoryForm()
    resetPhotoForm()
  } catch (error) {
    loadError.value = readContentErrorMessage(error, '相册加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function loadPhotos() {
  const payload = { current: current.value, size: PAGE_SIZE }
  if (filterCategoryId.value !== 'all') payload.photoCategoryId = filterCategoryId.value
  const data = ensureSuccess(await fetchPhotoManagePage(payload), '照片加载失败')
  photos.value = Array.isArray(data?.records) ? data.records : []
  total.value = Number(data?.total) || 0
  current.value = Number(data?.current) || 1
}

async function goToPage(page) {
  if (pageLoading.value || page < 1 || page > totalPages.value) return
  current.value = page
  pageLoading.value = true
  try {
    await loadPhotos()
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '照片加载失败'))
  } finally {
    pageLoading.value = false
  }
}

async function saveCategory() {
  if (categorySaving.value) return
  const name = categoryForm.name.trim()
  if (!name) {
    categoryError.value = '分类名称不能为空'
    return
  }
  categorySaving.value = true
  categoryError.value = ''
  try {
    ensureSuccess(await savePhotoManageCategory({
      id: categoryForm.id,
      categoryName: name,
      sortOrder: Number(categoryForm.sortOrder) || 0,
      isEnabled: categoryForm.isEnabled,
    }), '分类保存失败')
    ElMessage.success(categoryForm.id ? '分类已更新' : '分类已创建')
    await load()
  } catch (error) {
    categoryError.value = readContentErrorMessage(error, '分类保存失败，请稍后重试')
  } finally {
    categorySaving.value = false
  }
}

async function removeCategory(category) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${category.categoryName}」吗？分类下仍有照片时无法删除。`, '删除分类', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
  } catch {
    return
  }
  try {
    ensureSuccess(await deletePhotoManageCategory(category.id), '删除分类失败')
    ElMessage.success('分类已删除')
    await load()
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '删除分类失败，请稍后重试'))
  }
}

async function savePhoto() {
  if (photoSaving.value || uploading.value) return
  photoError.value = ''
  if (!photoForm.categoryId) {
    photoError.value = '请先创建并选择分类'
    return
  }
  if (!photoForm.url.trim()) {
    photoError.value = '请上传照片或填写图片地址'
    return
  }
  if (photoForm.isCover && Number(photoForm.visibility) === 2) {
    photoError.value = '封面照片不能设置为隐藏'
    return
  }

  photoSaving.value = true
  try {
    const result = ensureSuccess(await savePhotoManagePhoto({
      id: photoForm.id,
      photoCategoryId: Number(photoForm.categoryId),
      title: photoForm.title.trim(),
      description: photoForm.description.trim(),
      url: photoForm.url.trim(),
      takenTime: toBackendDateTime(photoForm.takenTime),
      location: photoForm.location.trim(),
      sortOrder: Number(photoForm.sortOrder) || 0,
      isCover: photoForm.isCover,
      visibility: Number(photoForm.visibility),
    }), '照片保存失败')
    ElMessage.success(saveSuccessMessage(result, photoForm.id ? '照片已更新' : '照片已添加'))
    await load()
  } catch (error) {
    photoError.value = readContentErrorMessage(error, '照片保存失败，请稍后重试')
  } finally {
    photoSaving.value = false
  }
}

async function removePhoto(photo) {
  try {
    await ElMessageBox.confirm(`确定删除照片「${photo.title || '未命名照片'}」吗？`, '删除照片', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
  } catch {
    return
  }
  try {
    ensureSuccess(await deletePhotoManagePhoto(photo.id), '删除照片失败')
    ElMessage.success('照片已删除')
    await load()
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '删除照片失败，请稍后重试'))
  }
}

watch(filterCategoryId, async () => {
  current.value = 1
  pageLoading.value = true
  try {
    await loadPhotos()
  } catch (error) {
    ElMessage.error(readContentErrorMessage(error, '照片加载失败'))
  } finally {
    pageLoading.value = false
  }
})

onMounted(load)

watch(() => props.refreshKey, () => load())

defineExpose({ dirty, saving: photoSaving })
</script>
