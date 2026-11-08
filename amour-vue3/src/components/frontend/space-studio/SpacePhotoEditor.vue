<template>
  <div class="space-y-5">
    <div v-if="loading" class="space-y-3" aria-label="正在加载相册" aria-busy="true">
      <div v-for="n in 3" :key="n" class="h-32 animate-pulse rounded-2xl border border-rose-100 bg-white/60" />
    </div>

    <div v-else-if="loadError" class="rounded-2xl border border-rose-100 bg-rose-50/50 px-5 py-10 text-center" role="alert">
      <p class="text-sm text-rose-600">{{ loadError }}</p>
      <button type="button" class="mt-4 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="load">
        重新加载
      </button>
    </div>

    <template v-else>
      <!-- 分类 -->
      <section class="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <h3 class="font-display text-lg font-bold text-rose-950">相册分类</h3>
        <p class="mt-1 text-xs leading-6 text-rose-700/50">分类下仍有照片时不能删除；停用后前台不再展示该分类入口。</p>

        <form class="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_7rem_auto_auto]" @submit.prevent="saveCategory">
          <div>
            <label for="studio-category-name" class="sr-only">分类名称</label>
            <input id="studio-category-name" v-model="categoryForm.name" maxlength="50" class="w-full rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="分类名称，例如「日常」">
          </div>
          <div>
            <label for="studio-category-sort" class="sr-only">排序</label>
            <input id="studio-category-sort" v-model.number="categoryForm.sortOrder" type="number" min="0" class="w-full rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm text-rose-950 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="排序">
          </div>
          <label class="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2.5 text-xs font-semibold text-rose-800">
            <input v-model="categoryForm.isEnabled" type="checkbox" class="h-4 w-4 rounded border-rose-300 text-rose-500 focus:ring-rose-400">
            启用
          </label>
          <div class="flex items-center gap-2">
            <button type="submit" class="rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60" :disabled="categorySaving">
              {{ categorySaving ? '保存中…' : (categoryForm.id ? '保存分类' : '新增分类') }}
            </button>
            <button v-if="categoryForm.id" type="button" class="rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50" @click="resetCategoryForm">
              取消
            </button>
          </div>
        </form>
        <p v-if="categoryError" class="mt-3 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">{{ categoryError }}</p>

        <div v-if="!categories.length" class="mt-4 rounded-2xl border border-dashed border-rose-200 bg-white/55 px-4 py-8 text-center">
          <p class="text-sm font-semibold text-rose-800/70">还没有相册分类</p>
          <p class="mt-1 text-xs text-rose-700/45">先新增一个分类，再上传照片。</p>
        </div>
        <ul v-else class="mt-4 flex flex-wrap gap-2">
          <li v-for="category in categories" :key="category.id" class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs" :class="categoryForm.id === category.id ? 'border-rose-300 bg-rose-50/70' : 'border-rose-100 bg-rose-50/30'">
            <span class="font-semibold text-rose-900">{{ category.categoryName }}</span>
            <span class="text-[10px] text-rose-700/40">{{ category.isEnabled === false ? '已停用' : '启用中' }}</span>
            <button type="button" class="text-[11px] font-semibold text-rose-500 hover:text-rose-700" @click="editCategory(category)">编辑</button>
            <button type="button" class="text-[11px] font-semibold text-rose-400 hover:text-rose-600" @click="removeCategory(category)">删除</button>
          </li>
        </ul>
      </section>

      <!-- 照片列表 -->
      <section class="rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-display text-lg font-bold text-rose-950">照片</h3>
            <p class="mt-1 text-xs text-rose-700/50">共 {{ total }} 张 · 第 {{ current }} / {{ totalPages }} 页 · 新建照片默认仅空间成员可见</p>
          </div>
          <ThemeSelect
            v-model="filterCategoryId"
            input-id="studio-photo-filter"
            size="sm"
            placeholder="全部分类"
            :options="categoryFilterOptions"
          />
        </div>

        <div v-if="!photos.length" class="mt-4 rounded-2xl border border-dashed border-rose-200 bg-white/55 px-4 py-8 text-center">
          <p class="text-sm font-semibold text-rose-800/70">还没有照片</p>
          <p class="mt-1 text-xs text-rose-700/45">在下方表单添加第一张照片。</p>
        </div>
        <ul v-else class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="photo in photos" :key="photo.id" class="overflow-hidden rounded-2xl border border-rose-100 bg-white/80">
            <img v-if="photo.url" :src="photo.url" :alt="photo.title || '相册照片'" class="h-36 w-full object-cover" @error="$event.currentTarget.style.display = 'none'">
            <div v-else class="flex h-36 w-full items-center justify-center bg-rose-50 text-2xl text-rose-300" aria-hidden="true">♥</div>
            <div class="p-3">
              <p class="flex items-center gap-1.5 text-sm font-semibold text-rose-900">
                <span class="truncate">{{ photo.title || '未命名照片' }}</span>
                <span v-if="photo.isCover" class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">封面</span>
                <span class="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-500">{{ visibilityLabel(photo.visibility) }}</span>
              </p>
              <p class="mt-1 text-[11px] text-rose-700/45">{{ photo.categoryName || '未分类' }}<span v-if="photo.takenTime"> · {{ String(photo.takenTime).slice(0, 10) }}</span></p>
              <div class="mt-2 flex gap-2">
                <button type="button" class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-50" @click="editPhoto(photo)">编辑</button>
                <button type="button" class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-400 transition hover:bg-rose-50 hover:text-rose-600" @click="removePhoto(photo)">删除</button>
              </div>
            </div>
          </li>
        </ul>

        <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-2">
          <button type="button" class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50" :disabled="current <= 1 || pageLoading" @click="goToPage(current - 1)">上一页</button>
          <span class="text-xs text-rose-700/50">{{ current }} / {{ totalPages }}</span>
          <button type="button" class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50" :disabled="current >= totalPages || pageLoading" @click="goToPage(current + 1)">下一页</button>
        </div>
      </section>

      <!-- 照片表单 -->
      <section id="photo-form" class="scroll-mt-24 rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-display text-lg font-bold text-rose-950">{{ photoForm.id ? '编辑照片' : '新增照片' }}</h3>
          <button v-if="photoForm.id" type="button" class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-50" @click="resetPhotoForm">取消编辑</button>
        </div>

        <form class="mt-4 space-y-4" @submit.prevent="savePhoto">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="studio-photo-category" class="block text-sm font-semibold text-rose-900">所属分类</label>
              <ThemeSelect
                v-model="photoForm.categoryId"
                input-id="studio-photo-category"
                class="mt-2"
                placeholder="请选择分类"
                :options="categoryOptions"
              />
            </div>
            <div>
              <label for="studio-photo-taken" class="block text-sm font-semibold text-rose-900">拍摄时间</label>
              <ThemeDatePicker
                v-model="photoForm.takenTime"
                input-id="studio-photo-taken"
                class="mt-2"
                mode="datetime"
                placeholder="选择拍摄时间"
              />
            </div>
            <div class="sm:col-span-2">
              <label for="studio-photo-title" class="block text-sm font-semibold text-rose-900">标题</label>
              <input id="studio-photo-title" v-model="photoForm.title" maxlength="100" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="给这张照片起个名字">
            </div>
            <div class="sm:col-span-2">
              <label for="studio-photo-desc" class="block text-sm font-semibold text-rose-900">描述</label>
              <textarea id="studio-photo-desc" v-model="photoForm.description" rows="2" maxlength="500" class="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm leading-6 text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="这张照片背后的故事（选填）" />
            </div>
            <div>
              <label for="studio-photo-location" class="block text-sm font-semibold text-rose-900">地点</label>
              <input id="studio-photo-location" v-model="photoForm.location" maxlength="100" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none placeholder:text-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" placeholder="拍摄地点（选填）">
            </div>
            <div>
              <label for="studio-photo-sort" class="block text-sm font-semibold text-rose-900">排序</label>
              <input id="studio-photo-sort" v-model.number="photoForm.sortOrder" type="number" min="0" class="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm text-rose-950 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100">
            </div>
            <div>
              <label for="studio-photo-visibility" class="block text-sm font-semibold text-rose-900">可见性</label>
              <ThemeSelect
                v-model="photoForm.visibility"
                input-id="studio-photo-visibility"
                class="mt-2"
                :options="visibilityOptions"
              />
            </div>
            <label class="flex items-center gap-2 self-end rounded-xl border border-rose-100 bg-rose-50/40 px-3.5 py-3 text-xs font-semibold text-rose-800">
              <input v-model="photoForm.isCover" type="checkbox" class="h-4 w-4 rounded border-rose-300 text-rose-500 focus:ring-rose-400">
              设为相册封面
            </label>
            <div class="sm:col-span-2">
              <SpaceImageField v-model="photoForm.url" input-id="studio-photo-url" label="照片" hint="支持 JPG、PNG、WebP、GIF，最大 5MB。" :disabled="photoSaving" @uploading="uploading = $event" />
            </div>
          </div>

          <p v-if="photoError" class="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-600" role="alert">{{ photoError }}</p>

          <div class="flex flex-wrap items-center gap-2">
            <button type="submit" class="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-200 transition hover:brightness-105 disabled:opacity-60" :disabled="photoSaving || uploading || !categories.length">
              {{ photoSaving ? '保存中…' : (uploading ? '图片上传中…' : (photoForm.id ? '保存照片' : '新增照片')) }}
            </button>
            <button type="button" class="rounded-full border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50" :disabled="photoSaving" @click="resetPhotoForm">清空表单</button>
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
  toBackendDateTime,
  toDateTimeLocalInput,
  VISIBILITY_OPTIONS,
} from '@/utils/spaceContent'

const PAGE_SIZE = 8

const props = defineProps({
  canPublish: { type: Boolean, default: false },
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

function editCategory(category) {
  categoryForm.id = category.id
  categoryForm.name = category.categoryName || ''
  categoryForm.sortOrder = Number(category.sortOrder) || 0
  categoryForm.isEnabled = category.isEnabled !== false
  categoryError.value = ''
}

function resetPhotoForm() {
  Object.assign(photoForm, emptyPhotoForm())
  photoForm.categoryId = categories.value[0]?.id ?? ''
  photoError.value = ''
  captureBaseline()
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
    ensureSuccess(await savePhotoManagePhoto({
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
    ElMessage.success(photoForm.id ? '照片已更新' : '照片已添加')
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

defineExpose({ dirty, saving: photoSaving })
</script>
