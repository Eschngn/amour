<template>
  <div class="space-y-5">
    <section class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div class="flex items-center gap-4">
        <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-100">
          <Calendar class="h-6 w-6" />
        </span>
        <div>
          <h2 class="text-base font-semibold text-slate-900">纪念日管理</h2>
          <p class="mt-1 text-sm text-slate-500">维护日期、展示状态和前台卡片颜色。</p>
        </div>
      </div>
      <button type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700" @click="openEditor()">
        <Plus class="h-4 w-4" /> 新增纪念日
      </button>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_11rem_11rem_11rem_auto]">
        <label class="relative block">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input v-model="filters.title" type="search" placeholder="搜索纪念日标题…" class="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100" @keyup.enter="refreshList">
        </label>
        <el-select v-model="filters.category" clearable placeholder="全部分类" @change="refreshList">
          <el-option v-for="item in categories" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.repeatType" clearable placeholder="全部类型" @change="refreshList">
          <el-option label="每年重复" :value="1" />
          <el-option label="单次记录" :value="0" />
        </el-select>
        <el-select v-model="filters.isVisible" clearable placeholder="全部状态" @change="refreshList">
          <el-option label="前台显示" :value="true" />
          <el-option label="已隐藏" :value="false" />
        </el-select>
        <button type="button" class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600" @click="resetFilters">
          <Refresh class="h-4 w-4" /> 重置
        </button>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h3 class="text-sm font-semibold text-slate-800">纪念日列表</h3>
          <p class="mt-1 text-xs text-slate-400">共 {{ totalItems }} 条记录</p>
        </div>
        <span class="text-xs text-slate-400">颜色由后台统一维护</span>
      </div>
      <div v-if="loading" class="flex items-center justify-center py-20 text-sm text-slate-400">加载中…</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-[980px] w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              <th class="px-6 py-3">纪念日</th><th class="px-4 py-3">日期</th><th class="px-4 py-3">类型</th>
              <th class="px-4 py-3">分类</th><th class="px-4 py-3">颜色</th><th class="px-4 py-3 text-center">前台显示</th><th class="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in rows" :key="row.id" class="hover:bg-slate-50/80">
              <td class="max-w-[18rem] px-6 py-4"><p class="truncate font-medium text-slate-800">{{ row.title }}</p><p class="mt-1 truncate text-xs text-slate-400">{{ row.description || '暂无描述' }}</p></td>
              <td class="whitespace-nowrap px-4 py-4 text-slate-500">{{ row.anniversaryDate }}</td>
              <td class="px-4 py-4"><span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{{ repeatLabel(row.repeatType) }}</span></td>
              <td class="px-4 py-4 text-slate-500">{{ categoryLabel(row.category) }}</td>
              <td class="px-4 py-4"><span class="inline-flex items-center gap-2 text-xs text-slate-500"><i class="h-5 w-5 rounded-md border border-white shadow ring-1 ring-slate-200" :style="{ backgroundColor: row.colorCode || '#d94f70' }" />{{ row.colorCode || '#d94f70' }}</span></td>
              <td class="px-4 py-4 text-center"><el-switch v-model="row.isVisible" size="small" @change="toggleVisible(row)" /></td>
              <td class="whitespace-nowrap px-6 py-4 text-right"><div class="inline-flex items-center gap-1"><button type="button" class="action-button" @click="openEditor(row)"><Edit class="h-3.5 w-3.5" /> 编辑</button><button type="button" class="action-button text-rose-600 hover:bg-rose-50" @click="removeRow(row)"><Delete class="h-3.5 w-3.5" /> 删除</button></div></td>
            </tr>
            <tr v-if="!rows.length"><td colspan="7" class="px-4 py-16 text-center text-sm text-slate-400">暂无符合条件的纪念日</td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:px-6">
        <span class="text-xs text-slate-500">共 {{ totalItems }} 条</span>
        <el-pagination v-model:current-page="page.current" v-model:page-size="page.size" :total="totalItems" :page-sizes="[10, 20, 50]" layout="sizes, prev, pager, next" @current-change="loadList" @size-change="handleSizeChange" />
      </div>
    </section>

    <el-dialog
      v-model="editorVisible"
      :title="editingId ? '编辑纪念日' : '新增纪念日'"
      width="min(640px, calc(100vw - 32px))"
      class="anniversary-editor-dialog"
      append-to-body
      destroy-on-close
    >
      <el-form :model="form" label-position="top" @submit.prevent>
        <div class="anniversary-editor-grid grid gap-4 sm:grid-cols-2">
          <el-form-item label="标题" required><el-input v-model="form.title" maxlength="80" placeholder="例如：恋爱纪念日" class="!w-full" /></el-form-item>
          <el-form-item label="日期" required><el-date-picker v-model="form.anniversaryDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" class="anniversary-date-picker !w-full" /></el-form-item>
          <el-form-item label="重复类型" required><el-select v-model="form.repeatType" class="!w-full"><el-option label="每年重复" :value="1" /><el-option label="单次记录" :value="0" /></el-select></el-form-item>
          <el-form-item label="分类" required><el-select v-model="form.category" class="!w-full"><el-option v-for="item in categories" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
          <el-form-item label="地点"><el-input v-model="form.location" maxlength="120" placeholder="可选" /></el-form-item>
          <el-form-item label="排序值"><el-input-number v-model="form.sortOrder" :min="0" :max="9999" class="!w-full" /></el-form-item>
          <el-form-item label="卡片颜色" required><div class="flex w-full items-center gap-3"><input v-model="form.colorCode" type="color" class="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"><el-input v-model="form.colorCode" maxlength="7" class="flex-1" /></div></el-form-item>
          <el-form-item label="前台显示"><el-switch v-model="form.isVisible" /></el-form-item>
        </div>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="3" maxlength="300" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><div class="flex justify-end gap-3"><el-button @click="editorVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitForm">保存</el-button></div></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Calendar, Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'
import api from '@/axios'

const categories = [
  { value: 'love', label: '恋爱' }, { value: 'journey', label: '旅行' }, { value: 'birthday', label: '生日' },
  { value: 'memory', label: '回忆' }, { value: 'milestone', label: '里程碑' }, { value: 'other', label: '其他' },
]
const filters = reactive({ title: '', category: '', repeatType: null, isVisible: null })
const page = reactive({ current: 1, size: 10 })
const rows = ref([])
const totalItems = ref(0)
const loading = ref(false)
const saving = ref(false)
const editorVisible = ref(false)
const editingId = ref(null)
const form = reactive(defaultForm())

function defaultForm() { return { title: '', description: '', anniversaryDate: '', repeatType: 1, category: 'love', colorCode: '#d94f70', location: '', sortOrder: 0, isVisible: true } }
function resetForm() { Object.assign(form, defaultForm()) }
function categoryLabel(value) { return categories.find((item) => item.value === value)?.label || '其他' }
function repeatLabel(value) { return Number(value) === 0 ? '单次记录' : '每年重复' }

async function loadList() {
  loading.value = true
  try {
    const response = await api.post('/admin/anniversary/list', { current: page.current, size: page.size, ...filters })
    if (!response.data?.success) throw new Error(response.data?.message || '加载失败')
    rows.value = response.data.data?.records || []
    totalItems.value = response.data.data?.total || 0
  } catch (error) { ElMessage.error(error.message || '纪念日列表加载失败') } finally { loading.value = false }
}
function refreshList() { page.current = 1; loadList() }
function resetFilters() { Object.assign(filters, { title: '', category: '', repeatType: null, isVisible: null }); refreshList() }
function handleSizeChange() { page.current = 1; loadList() }

async function openEditor(row) {
  resetForm(); editingId.value = row?.id || null
  if (row?.id) {
    try {
      const response = await api.post('/admin/anniversary/detail', { id: row.id })
      if (!response.data?.success) throw new Error(response.data?.message || '详情加载失败')
      Object.assign(form, response.data.data || {})
    } catch (error) { ElMessage.error(error.message || '详情加载失败'); return }
  }
  editorVisible.value = true
}
async function submitForm() {
  if (!form.title.trim() || !form.anniversaryDate || !form.category || !/^#[0-9a-f]{6}$/i.test(form.colorCode)) { ElMessage.warning('请完整填写标题、日期、分类和六位颜色值'); return }
  saving.value = true
  try {
    const payload = { ...form, ...(editingId.value ? { id: editingId.value } : {}) }
    const response = await api.post(editingId.value ? '/admin/anniversary/update' : '/admin/anniversary/add', payload)
    if (!response.data?.success) throw new Error(response.data?.message || '保存失败')
    ElMessage.success('保存成功'); editorVisible.value = false; await loadList()
  } catch (error) { ElMessage.error(error.message || '保存失败') } finally { saving.value = false }
}
async function toggleVisible(row) {
  const nextValue = row.isVisible
  try {
    const response = await api.post('/admin/anniversary/updateVisibleStatus', { id: row.id, isVisible: nextValue })
    if (!response.data?.success) throw new Error(response.data?.message || '状态更新失败')
  } catch (error) { row.isVisible = !nextValue; ElMessage.error(error.message || '状态更新失败') }
}
async function removeRow(row) {
  try {
    await ElMessageBox.confirm(`确定删除“${row.title}”吗？删除后前台将不再显示。`, '删除纪念日', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    const response = await api.post('/admin/anniversary/delete', { id: row.id })
    if (!response.data?.success) throw new Error(response.data?.message || '删除失败')
    ElMessage.success('已删除'); await loadList()
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '删除失败') }
}

onMounted(loadList)
</script>

<style scoped>
.action-button { display: inline-flex; align-items: center; gap: 0.25rem; border-radius: 0.375rem; padding: 0.375rem 0.625rem; font-size: 0.75rem; font-weight: 500; color: rgb(71 85 105); transition: background-color 160ms ease; }
.action-button:hover { background: rgb(241 245 249); }

:global(.anniversary-editor-dialog .anniversary-editor-grid > .el-form-item),
:global(.anniversary-editor-dialog .anniversary-editor-grid .el-form-item__content) { min-width: 0; }

:global(.anniversary-editor-dialog .anniversary-editor-grid .el-input),
:global(.anniversary-editor-dialog .anniversary-editor-grid .el-select),
:global(.anniversary-editor-dialog .anniversary-editor-grid .el-input-number),
:global(.anniversary-editor-dialog .anniversary-editor-grid .el-date-editor) {
  width: 100%;
  min-width: 0;
}

:global(.anniversary-editor-dialog .anniversary-date-picker .el-input__wrapper),
:global(.anniversary-editor-dialog .anniversary-date-picker .el-input__inner) {
  box-sizing: border-box;
  min-width: 0;
}
</style>
