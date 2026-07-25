<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 items-center gap-4">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
          <Collection class="h-6 w-6" />
        </span>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-slate-900">故事内容</h2>
          <p class="mt-1 text-sm text-slate-500">
            共收录 <span class="font-semibold text-rose-500">{{ totalItems }}</span> 篇故事，继续书写属于你们的时间线。
          </p>
        </div>
      </div>
      <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
        <div class="relative min-w-0 flex-1 sm:w-64">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input v-model="keyword" placeholder="搜索故事标题…"
          class="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-9 text-sm outline-none transition placeholder:text-slate-400" />
        <button v-if="keyword" type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:text-slate-600"
          @click="keyword = ''">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button type="button"
        class="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-xl"
        @click="openEditor()">
        <Plus style="width:1em;height:1em" />
        写故事
      </button>
      </div>
    </div>

    <!-- 分页列表 -->
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <!-- 加载中 -->
      <div v-if="loading" class="flex items-center justify-center py-20 text-sm text-slate-400">
        <svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        加载中…
      </div>
      <div v-show="!loading" class="overflow-x-auto">
      <table class="min-w-[1080px] w-full divide-y divide-slate-200 text-left text-sm">
        <thead class="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3 pl-6 w-28">
              封面
            </th>
            <th class="px-4 py-3">
              故事标题
            </th>
            <th class="px-4 py-3">
              摘要
            </th>
            <th class="px-4 py-3">
              所属章节
            </th>
            <th class="px-4 py-3">
              时间
            </th>
            <th class="px-4 py-3 text-center">
              是否显示
            </th>
            <th class="px-4 py-3 pr-6 text-right">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="row in pagedStories" :key="row.id" class="hover:bg-slate-50/80">
            <td class="px-4 py-3 pl-6">
              <img
                v-if="row.coverImage"
                :src="row.coverImage"
                :alt="row.title"
                class="avatar-sm"
                loading="lazy"
              />
              <el-icon v-else class="avatar-uploader-icon-sm">
                <Plus />
              </el-icon>
            </td>
            <td class="max-w-xs truncate px-4 py-3 font-medium text-slate-800">
              {{ row.title }}
            </td>
            <td class="max-w-[12rem] truncate px-4 py-3 text-sm text-slate-500">
              {{ row.summary }}
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {{ String(row.chapterId).padStart(2, '0') }} · {{ row.chapterName }}
              </span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-slate-500">
              {{ row.happenedTime?.slice(0, 10) }}
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-center">
              <el-switch v-model="row.isVisible" size="small" @change="toggleVisible(row)" />
            </td>
            <td class="whitespace-nowrap px-4 py-3 pr-6 text-right">
              <div class="inline-flex items-center gap-1">
                <button type="button"
                  class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  @click="editStory(row)">
                  <Edit style="width:1em;height:1em" />
                  编辑
                </button>
                <button type="button"
                  class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  @click="previewStory(row)">
                  <View style="width:1em;height:1em" />
                  预览
                </button>
                <button type="button"
                  class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                  @click="deleteStory(row)">
                  <Delete style="width:1em;height:1em" />
                  删除
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !pagedStories.length">
            <td colspan="7" class="px-4 py-16 text-center">
              <div class="mx-auto flex max-w-xs flex-col items-center">
                <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Collection class="h-6 w-6" />
                </span>
                <p class="mt-3 text-sm font-medium text-slate-600">还没有找到故事</p>
                <p class="mt-1 text-xs text-slate-400">试试调整搜索关键词，或写下第一篇故事。</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <!-- 分页器 -->
      <div class="flex items-center justify-between border-t border-slate-100 px-6 py-3">
        <span class="text-xs text-slate-500">共 {{ totalItems }} 条</span>
        <div class="flex items-center gap-1">
          <button type="button" :disabled="currentPage <= 1"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition disabled:text-slate-300 enabled:hover:bg-slate-100"
            @click="currentPage = currentPage - 1">
            上一页
          </button>
          <button v-for="p in totalPages" :key="p" type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition" :class="currentPage === p
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'" @click="currentPage = p">
            {{ p }}
          </button>
          <button type="button" :disabled="currentPage >= totalPages"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition disabled:text-slate-300 enabled:hover:bg-slate-100"
            @click="currentPage = currentPage + 1">
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 写故事 — 全屏编辑器 -->
    <Teleport to="body">
      <div v-if="showEditor" class="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white">
        <!-- 顶栏 -->
        <div class="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-3">
          <div class="flex items-center gap-4">
            <button type="button"
              class="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              @click="showEditor = false">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 class="text-sm font-semibold text-slate-900">{{ editingId ? '编辑故事' : '写故事' }}</h3>
          </div>
          <div class="flex items-center gap-3">
            <button type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              @click="showEditor = false">
              取消
            </button>
            <button type="button" :disabled="saving"
              class="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="submitStory">
              <svg v-if="saving" class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>

        <!-- 表单信息栏 -->
        <div class="flex shrink-0 items-center gap-3 overflow-x-auto border-b border-slate-100 px-6 py-3">
          <span class="shrink-0 text-sm">
            <span class="text-red-500 mr-0.5">*</span><span class="text-slate-500">标题</span>
          </span>
          <input v-model="form.title" placeholder="请输入故事标题"
            class="w-56 shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:ring-1 focus:ring-rose-200" />
          <span class="shrink-0 text-sm">
            <span class="text-red-500 mr-0.5">*</span><span class="text-slate-500">时间</span>
          </span>
          <el-date-picker v-model="form.date" type="datetime" placeholder="选择故事发生日期" value-format="YYYY-MM-DD HH:mm:ss"
            class="!w-50 shrink-0" />
          <span class="shrink-0 text-sm text-slate-500">地点</span>
          <input v-model="form.location" placeholder="地点"
            class="w-40 shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:ring-1 focus:ring-rose-200" />
          <span class="shrink-0 text-sm text-slate-500">标签</span>
          <input v-model="form.tagLabel" placeholder="标签"
            class="w-40 shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:ring-1 focus:ring-rose-200" />
          <span class="shrink-0 text-sm">
            <span class="text-red-500 mr-0.5">*</span><span class="text-slate-500">章节</span>
          </span>
          <el-select v-model="form.chapter" placeholder="所属章节" clearable size="default" class="!w-44 shrink-0">
            <el-option v-for="ch in chapters" :key="ch.id"
              :label="`${String(ch.sortOrder).padStart(2, '0')} · ${ch.name}`" :value="ch.name" />
          </el-select>
          <label class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 select-none">
            <input v-model="form.isMilestone" type="checkbox"
              class="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
            <span class="text-xs text-slate-500">里程碑</span>
          </label>
        </div>

        <!-- Markdown 编辑器 — 撑满剩余空间 -->
        <div class="editor-wrapper min-h-0 flex-1 flex flex-col gap-2 border-t border-slate-100 px-6 py-3">
          <span class="shrink-0 text-sm">
            <span class="text-red-500 mr-0.5">*</span><span class="text-slate-500">内容</span>
          </span>
          <div class="min-h-0 flex-1">
            <MdEditor v-model="form.content" @onUploadImg="onUploadImg"
              editorId="storyEditor" :toolbarsExclude="['github']" :code-style-reverse="false"
              :codeExtensions="cmExtensions" />
          </div>
        </div>

        <!-- 摘要 + 封面 -->
        <div class="flex shrink-0 flex-col gap-3 border-t border-slate-100 px-6 py-3">
          <div class="flex items-center gap-3">
            <span class="shrink-0 text-sm text-slate-500">摘要</span>
            <input v-model="form.summary" placeholder="请输入故事摘要"
              class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:ring-1 focus:ring-rose-200" />
          </div>
          <div class="flex items-center gap-3">
            <span class="shrink-0 text-sm">
              <span class="text-red-500 mr-0.5">*</span><span class="text-slate-500">封面</span>
            </span>
            <el-upload class="avatar-uploader" action="#" :on-change="handleCoverChange" :auto-upload="false"
              :show-file-list="false" accept="image/*">
              <img v-if="form.coverImage" :src="form.coverImage" class="avatar" />
              <el-icon v-else class="avatar-uploader-icon">
                <Plus />
              </el-icon>
            </el-upload>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Collection, Delete, Edit, Plus, Search, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/date-picker/style/css'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { EditorView } from '@codemirror/view'

import api from '@/axios'

const router = useRouter()
const cmExtensions = [EditorView.lineWrapping]

const pageSize = 10
const currentPage = ref(1)
const loading = ref(false)
const keyword = ref('')

const storiesData = ref({ records: [], total: 0, current: 1, size: pageSize })

const totalItems = computed(() => storiesData.value.total)
const totalPages = computed(() => Math.max(1, Math.ceil(storiesData.value.total / pageSize)))
const pagedStories = computed(() => storiesData.value.records)

async function fetchStories() {
  loading.value = true
  try {
    const { data } = await api.post('/admin/story/list', {
      current: currentPage.value,
      size: pageSize,
      title: keyword.value || undefined,
    })
    if (data.success) {
      storiesData.value = data.data
    }
  } finally {
    loading.value = false
  }
}

watch(currentPage, fetchStories)

let searchTimer
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchStories()
  }, 300)
})

onMounted(() => {
  fetchStories()
  fetchChapters()
})

/* ---- Markdown 编辑器弹窗 ---- */

const showEditor = ref(false)
const editingId = ref(null)
const detailLoading = ref(false)
const saving = ref(false)
const form = ref(createEmptyForm())

watch(showEditor, (isOpen) => {
  document.documentElement.classList.toggle('admin-editor-open', isOpen)
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('admin-editor-open')
})

function createEmptyForm() {
  return { title: '', location: '', date: '', chapter: '', content: '', summary: '', coverImage: '', isMilestone: false, tagLabel: '' }
}

const chapters = ref([])

async function fetchChapters() {
  try {
    const { data } = await api.post('/admin/chapter/findChapterList')
    if (data.success) {
      chapters.value = data.data
    }
  } catch { /* ignore */ }
}

function openEditor() {
  editingId.value = null
  form.value = createEmptyForm()
  showEditor.value = true
}

async function editStory(row) {
  // 先用列表数据预填，详情接口返回后再覆盖
  form.value = {
    title: row.title || '',
    location: row.location || '',
    date: row.happenedTime ? dayjs(row.happenedTime).format('YYYY-MM-DD HH:mm:ss') : '',
    chapter: row.chapterName || '',
    content: '',
    summary: row.summary || '',
    coverImage: row.coverImage || '',
    isMilestone: row.isMilestone || false,
    tagLabel: row.tagLabel || '',
  }
  showEditor.value = true
  detailLoading.value = true
  try {
    const { data } = await api.post('/admin/story/detail', { id: row.id })
    if (data.success) {
      const d = data.data
      editingId.value = d.id
      form.value = {
        title: d.title || '',
        location: d.location || '',
        date: d.happenedTime ? dayjs(d.happenedTime).format('YYYY-MM-DD HH:mm:ss') : '',
        chapter: d.chapterName || '',
        content: d.content || '',
        summary: d.summary || row.summary || '',
        coverImage: d.coverImage || row.coverImage || '',
        isMilestone: d.isMilestone || false,
        tagLabel: d.tagLabel || '',
      }
    }
  } catch { /* ignore */ }
  finally { detailLoading.value = false }
}

async function handleCoverChange(file) {
  const formData = new FormData()
  formData.append('file', file.raw)
  try {
    const { data } = await api.post('/admin/file/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (data.success) {
      form.value.coverImage = data.data.url
    } else {
      ElMessage.error(data.message || '上传失败')
    }
  } catch {
    ElMessage.error('上传失败，请稍后重试')
  }
}

function onUploadImg(files, callback) {
  const promises = Array.from(files).map(file => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/file/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data.data.url)
  })
  Promise.all(promises).then(urls => callback(urls)).catch(() => {
    ElMessage.error('图片上传失败')
  })
}

function previewStory(row) {
  router.push('/story/' + row.id)
}

async function toggleVisible(row) {
  try {
    const { data } = await api.post('/admin/story/updatePublishStatus', {
      id: row.id,
      isVisible: row.isVisible ? 1 : 0,
    })
    if (!data.success) {
      row.isVisible = !row.isVisible
      ElMessage.error(data.message || '操作失败')
    }
  } catch {
    row.isVisible = !row.isVisible
    ElMessage.error('请求失败，请稍后重试')
  }
}

async function deleteStory(row) {
  try {
    await ElMessageBox({
      title: '提示',
      message: '确定要删除该故事吗？',
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    const { data } = await api.post('/admin/story/delete', { id: row.id })
    if (data.success) {
      ElMessage.success('删除成功')
      fetchStories()
    } else {
      ElMessage.error(data.message || '删除失败')
    }
  } catch {
    ElMessage.error('请求失败，请稍后重试')
  }
}

async function submitStory() {
  if (!form.value.title.trim()) return ElMessage.warning('故事标题不能为空')
  if (!form.value.date) return ElMessage.warning('请选择故事发生时间')
  if (!form.value.chapter) return ElMessage.warning('所属章节不能为空')
  if (!form.value.content.trim()) return ElMessage.warning('故事内容不能为空')
  if (!form.value.coverImage) return ElMessage.warning('故事封面不能为空')
  saving.value = true
  try {
    const ch = chapters.value.find(c => c.name === form.value.chapter)
    const isUpdate = !!editingId.value
    const url = isUpdate ? '/admin/story/update' : '/admin/story/add'
    const payload = {
      title: form.value.title.trim(),
      happenedTime: form.value.date ? form.value.date : '',
      location: form.value.location.trim(),
      tagLabel: form.value.tagLabel.trim(),
      chapterId: ch?.id,
      isMilestone: form.value.isMilestone,
      content: form.value.content.trim(),
      summary: form.value.summary.trim(),
      coverImage: form.value.coverImage.trim(),
    }
    if (isUpdate) {
      payload.id = editingId.value
    }
    const { data } = await api.post(url, payload)
    if (data.success) {
      ElMessage.success('保存成功')
      showEditor.value = false
      fetchStories()
    } else {
      ElMessage.error(data.message || '保存失败')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('请求失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<style>
html.admin-editor-open,
html.admin-editor-open body {
  overflow: hidden !important;
}

/* 封面上传 */
.avatar-uploader .el-upload {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  width: 178px;
  height: 178px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.3s;
}
.avatar-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar {
  width: 178px;
  height: 178px;
  object-fit: cover;
  border-radius: 6px;
}

.avatar-sm {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0,0,0,.06);
}

.avatar-uploader-icon-sm {
  font-size: 24px;
  color: #8c939d;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
}

/* Tailwind 重置恢复 md-editor 有序列表 */
.md-editor-preview ol {
  list-style: decimal !important;
  padding-left: 2em;
}

/* 全屏编辑器：md-editor 撑满父容器 */
.editor-wrapper .md-editor {
  height: 100% !important;
}

/* ✅ 核心修复：编辑区容器不能 overflow:hidden */
.editor-wrapper .md-editor-input-wrapper {
  overflow-x: auto !important;
}

/* ✅ 核心修复：cm-content 允许长行换行 */
.editor-wrapper .cm-content,
.editor-wrapper .cm-line {
  white-space: pre-wrap !important;
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
}

.chapter-select-popper {
  max-width: 260px !important;
}

.chapter-select-popper .el-select-dropdown__item {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ✅ 防止 CodeMirror 滚动容器裁剪内容 */
.editor-wrapper .cm-scroller {
  overflow-x: auto !important;
}
</style>
