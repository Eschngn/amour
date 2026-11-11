<template>
  <div class="space-y-5">
    <section class="admin-filter-panel">
      <div class="admin-filter-bar">
        <div class="admin-filter-fields">
          <label class="admin-filter-field admin-filter-field--search">
            <Search class="admin-search-icon" />
            <input
              v-model="keyword"
              type="search"
              aria-label="搜索配置键名、名称或值"
              placeholder="搜索键名、名称或值"
              class="admin-search-input"
              @keyup.enter="applyFilters"
            />
          </label>
          <el-select
            v-model="valueType"
            clearable
            placeholder="全部值类型"
            class="admin-filter-field admin-filter-field--select"
          >
            <el-option v-for="option in typeOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </div>
        <div class="admin-filter-actions">
          <button
            type="button"
            class="admin-filter-button admin-filter-button--secondary admin-filter-button--icon"
            aria-label="刷新配置列表"
            title="刷新配置列表"
            @click="fetchConfigs"
          >
            <Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
          </button>
          <button type="button" class="admin-filter-button admin-filter-button--primary" @click="openEditor()">
            <Plus class="h-3.5 w-3.5" aria-hidden="true" />新增配置
          </button>
        </div>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-24 text-sm text-slate-400"><Loading class="mr-2 h-4 w-4 animate-spin" />加载中…</div>
      <div v-else-if="!configs.length" class="flex flex-col items-center justify-center px-6 py-24 text-center">
        <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><CollectionTag class="h-6 w-6" /></span>
        <p class="mt-4 text-sm font-medium text-slate-600">暂无配置记录</p>
        <p class="mt-1 text-xs text-slate-400">调整搜索条件，或新增一条配置。</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[880px] divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium tracking-wide text-slate-500">
            <tr>
              <th class="px-6 py-3">配置名称</th>
              <th class="px-4 py-3">配置键</th>
              <th class="px-4 py-3">配置值</th>
              <th class="px-4 py-3">更新时间</th>
              <th class="px-6 py-3 admin-table-actions">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="config in configs" :key="config.id">
              <td class="px-6 py-4">
                <div class="max-w-[180px]">
                  <p class="truncate font-medium text-slate-800" :title="config.configName">{{ config.configName }}</p>
                  <p v-if="config.remark" class="mt-1 truncate text-xs text-slate-400" :title="config.remark">{{ config.remark }}</p>
                </div>
              </td>
              <td class="px-4 py-4">
                <code class="block max-w-[14rem] truncate rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600" :title="config.configKey">{{ config.configKey }}</code>
              </td>
              <td class="config-value-cell px-4 py-4">
                <img
                  v-if="config.valueType === 'image' && config.configValue"
                  :src="config.configValue"
                  :alt="config.configName"
                  :title="config.configValue"
                  loading="lazy"
                  class="config-table-image"
                  @click="openImagePreview(config.configValue, config.configName)"
                />
                <span v-else class="block truncate text-xs text-slate-500" :title="config.configValue">{{ config.configValue || '-' }}</span>
              </td>
              <td class="whitespace-nowrap px-4 py-4 text-xs text-slate-400">{{ config.updateTime || '-' }}</td>
              <td class="whitespace-nowrap px-6 py-4 admin-table-actions">
                <div class="admin-table-action-group admin-table-action-group--double">
                  <button type="button" class="admin-table-action text-slate-600 hover:bg-slate-100" @click="openEditor(config)">
                    <Edit class="h-3.5 w-3.5" aria-hidden="true" />编辑
                  </button>
                  <button type="button" class="admin-table-action text-rose-600 hover:bg-rose-50" @click="deleteConfig(config)">
                    <Delete class="h-3.5 w-3.5" aria-hidden="true" />删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-400 sm:flex-row sm:px-6">
        <span>共 {{ total }} 条 · 第 {{ currentPage }} / {{ totalPages }} 页</span>
        <div class="flex items-center gap-1"><button type="button" :disabled="currentPage <= 1 || loading" class="rounded-lg px-3 py-1.5 transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="currentPage -= 1">上一页</button><button type="button" class="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white shadow-sm">{{ currentPage }}</button><button type="button" :disabled="currentPage >= totalPages || loading" class="rounded-lg px-3 py-1.5 transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="currentPage += 1">下一页</button></div>
      </div>
    </section>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.form.id ? '编辑配置' : '新增配置'"
      width="min(640px, calc(100vw - 32px))"
      class="dict-editor-dialog"
      append-to-body
      destroy-on-close
    >
      <el-form :model="dialog.form" label-position="top" @submit.prevent="saveConfig">
        <div class="dict-editor-grid grid gap-4 sm:grid-cols-2">
          <el-form-item label="配置名称" required><el-input v-model="dialog.form.configName" maxlength="50" placeholder="例如：首页标题" class="!w-full" /></el-form-item>
          <el-form-item label="配置键" required><el-input v-model="dialog.form.configKey" maxlength="100" placeholder="例如：site_title" class="!w-full font-mono" /></el-form-item>
          <el-form-item label="配置值" class="sm:col-span-2">
            <el-input v-if="dialog.form.valueType === 'text'" v-model="dialog.form.configValue" type="textarea" :rows="4" placeholder="请输入配置内容" class="!w-full" />
            <el-date-picker
              v-else-if="dialog.form.valueType === 'datetime'"
              v-model="dialog.form.configValue"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择日期时间"
              clearable
              class="dict-date-picker !w-full"
            />
            <div v-else class="config-image-input w-full">
              <div v-if="dialog.form.configValue" class="config-image-preview">
                <img
                  :src="dialog.form.configValue"
                  alt="配置图片预览"
                  title="点击预览大图"
                  @click.stop="openImagePreview(dialog.form.configValue, dialog.form.configName || '配置图片')"
                />
              </div>
              <el-upload
                class="config-image-upload"
                action="#"
                accept="image/*"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleConfigImageChange"
              >
                <button type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50" :disabled="uploadingImage">
                  <Loading v-if="uploadingImage" class="h-4 w-4 animate-spin" />
                  <Upload v-else class="h-4 w-4" />
                  {{ uploadingImage ? '上传中…' : (dialog.form.configValue ? '重新上传图片' : '上传图片') }}
                </button>
              </el-upload>
              <p class="mt-2 text-xs text-slate-400">支持 JPG、PNG、GIF、WEBP 等图片格式。</p>
            </div>
          </el-form-item>
          <el-form-item label="值类型" required><el-select v-model="dialog.form.valueType" class="!w-full" placeholder="请选择值类型" @change="handleValueTypeChange"><el-option v-for="option in editableTypeOptions" :key="option.value" :label="option.label" :value="option.value" /></el-select></el-form-item>
          <el-form-item label="排序"><el-input-number v-model="dialog.form.sortOrder" :min="0" :max="9999" class="!w-full" /></el-form-item>
          <el-form-item label="备注" class="sm:col-span-2"><el-input v-model="dialog.form.remark" type="textarea" :rows="3" maxlength="255" show-word-limit placeholder="补充说明（可选）" class="!w-full" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <el-button @click="dialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveConfig">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <Teleport to="body">
      <div v-if="imagePreview.visible" class="image-preview-overlay" @click.self="closeImagePreview">
        <button type="button" class="image-preview-close" aria-label="关闭图片预览" @click="closeImagePreview">
          <Close class="h-5 w-5" />
        </button>
        <img :src="imagePreview.url" :alt="imagePreview.alt" class="image-preview-full" />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CollectionTag, Close, Delete, Edit, Loading, Plus, Refresh, Search, Upload } from '@element-plus/icons-vue'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import api from '@/axios'

const pageSize = 10
const currentPage = ref(1)
const keyword = ref('')
const valueType = ref('')
const loading = ref(false)
const saving = ref(false)
const uploadingImage = ref(false)
const previousValueType = ref('text')
const data = ref({ records: [], total: 0, current: 1, size: pageSize })
const configs = computed(() => data.value.records || [])
const total = computed(() => Number(data.value.total) || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const dialog = reactive({ visible: false, form: createForm() })
const imagePreview = reactive({ visible: false, url: '', alt: '' })
const editableTypeOptions = [
  { value: 'text', label: '文本' },
  { value: 'datetime', label: '日期时间' },
  { value: 'image', label: '图片' },
]
const typeOptions = editableTypeOptions

function createForm() {
  return { id: null, configKey: '', configName: '', configValue: '', valueType: 'text', sortOrder: 0, remark: '' }
}

async function fetchConfigs() {
  loading.value = true
  try {
    const { data: response } = await api.post('/admin/dict/config/list', { current: currentPage.value, size: pageSize, keyword: keyword.value.trim() || undefined, valueType: valueType.value || undefined })
    if (!response.success) throw new Error(response.message || '获取配置失败')
    data.value = response.data || { records: [], total: 0, current: currentPage.value, size: pageSize }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '获取配置失败')
  } finally {
    loading.value = false
  }
}

function openEditor(config) {
  dialog.form = config ? { ...config } : createForm()
  if (config && !editableTypeOptions.some(option => option.value === config.valueType)) dialog.form.valueType = 'text'
  previousValueType.value = dialog.form.valueType
  dialog.visible = true
}

function handleValueTypeChange(type) {
  if (type !== previousValueType.value) dialog.form.configValue = ''
  previousValueType.value = type
}

function openImagePreview(url, alt) {
  imagePreview.url = url
  imagePreview.alt = alt || '图片预览'
  imagePreview.visible = true
}

function closeImagePreview() {
  imagePreview.visible = false
  imagePreview.url = ''
  imagePreview.alt = ''
}

async function handleConfigImageChange(file) {
  if (!file.raw) return
  if (!file.raw.type?.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }

  const formData = new FormData()
  formData.append('file', file.raw)
  uploadingImage.value = true
  try {
    const { data: response } = await api.post('/admin/file/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (!response.success || !response.data?.url) throw new Error(response.message || '图片上传失败')
    dialog.form.configValue = response.data.url
    ElMessage.success('图片上传成功')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '图片上传失败')
  } finally {
    uploadingImage.value = false
  }
}

async function saveConfig() {
  if (!dialog.form.configKey.trim() || !dialog.form.configName.trim()) return ElMessage.warning('请填写配置键和配置名称')
  saving.value = true
  try {
    const { data: response } = await api.post('/admin/dict/config/save', dialog.form)
    if (!response.success) throw new Error(response.message || '保存配置失败')
    ElMessage.success('配置已保存')
    dialog.visible = false
    await fetchConfigs()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '保存配置失败')
  } finally {
    saving.value = false
  }
}

async function deleteConfig(config) {
  try {
    await ElMessageBox.confirm(`确定删除配置“${config.configName}”吗？删除后引用该配置的页面可能恢复默认值。`, '删除配置', { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' })
  } catch { return }
  try {
    const { data: response } = await api.post('/admin/dict/config/delete', { id: config.id })
    if (!response.success) throw new Error(response.message || '删除配置失败')
    ElMessage.success('配置已删除')
    if (configs.value.length === 1 && currentPage.value > 1) currentPage.value -= 1
    else await fetchConfigs()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '删除配置失败')
  }
}

let searchTimer
function resetAndLoad() { if (currentPage.value === 1) fetchConfigs(); else currentPage.value = 1 }
function applyFilters() { clearTimeout(searchTimer); resetAndLoad() }

watch(currentPage, fetchConfigs)
watch(valueType, applyFilters)
watch(keyword, () => { clearTimeout(searchTimer); searchTimer = setTimeout(resetAndLoad, 250) })
onMounted(fetchConfigs)
</script>

<style scoped>
:global(.dict-editor-dialog) {
  --el-color-primary: #e11d48;
  --el-color-primary-light-3: #fb7185;
  --el-color-primary-light-5: #fda4af;
  --el-color-primary-light-7: #fecdd3;
  --el-color-primary-light-8: #ffe4e6;
  --el-color-primary-light-9: #fff1f2;
  --el-color-primary-dark-2: #be123c;
}

:global(.dict-editor-dialog .el-form-item) { margin-right: 0; }

:global(.dict-editor-dialog .dict-editor-grid > .el-form-item),
:global(.dict-editor-dialog .dict-editor-grid .el-form-item__content) { min-width: 0; }

:global(.dict-editor-dialog .dict-editor-grid .el-form-item__content) { width: 100%; }

:global(.dict-editor-dialog .dict-editor-grid .el-input),
:global(.dict-editor-dialog .dict-editor-grid .el-select),
:global(.dict-editor-dialog .dict-editor-grid .el-input-number),
:global(.dict-editor-dialog .dict-editor-grid .el-date-editor) {
  width: 100%;
  min-width: 0;
}

:global(.dict-editor-dialog .dict-date-picker .el-input__wrapper),
:global(.dict-editor-dialog .dict-date-picker .el-input__inner) {
  box-sizing: border-box;
  min-width: 0;
}

:global(.dict-editor-dialog .el-input),
:global(.dict-editor-dialog .el-select),
:global(.dict-editor-dialog .el-input-number),
:global(.dict-editor-dialog .el-date-editor),
:global(.dict-editor-dialog .el-form-item__content),
:global(.dict-editor-dialog .el-input__wrapper),
:global(.dict-editor-dialog .el-select__wrapper) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

:global(.dict-editor-dialog .el-input__inner),
:global(.dict-editor-dialog .el-textarea__inner) {
  outline: none !important;
  box-shadow: none !important;
}

:global(.dict-editor-dialog .el-input__wrapper),
:global(.dict-editor-dialog .el-select__wrapper) {
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

:global(.dict-editor-dialog .el-input__wrapper.is-focus),
:global(.dict-editor-dialog .el-select__wrapper.is-focused),
:global(.dict-editor-dialog .el-input__wrapper:focus-within),
:global(.dict-editor-dialog .el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #fb7185 inset, 0 0 0 3px rgba(244, 63, 94, 0.09) !important;
}

.config-value-cell { width: 1%; min-width: 140px; }
.config-table-image { display: block; width: auto; height: auto; max-width: min(280px, 32vw); max-height: 140px; cursor: zoom-in; border-radius: 0.5rem; background: #f8fafc; object-fit: contain; box-shadow: 0 0 0 1px #e2e8f0; }
.config-image-input { display: flex; min-height: 116px; flex-wrap: wrap; align-items: center; gap: 1rem; border: 1px dashed #cbd5e1; border-radius: 0.75rem; padding: 0.75rem; }
.config-image-preview { display: flex; height: 3rem; width: 5rem; overflow: hidden; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 0.5rem; background: #f1f5f9; }
.config-image-preview img { height: 3rem; width: 5rem; cursor: zoom-in; object-fit: contain; }
.config-image-upload { display: block; }
.image-preview-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 2rem; background: rgba(15, 23, 42, 0.84); backdrop-filter: blur(4px); }
.image-preview-full { max-height: 90vh; max-width: 92vw; object-fit: contain; border-radius: 0.75rem; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
.image-preview-close { position: absolute; right: 1.25rem; top: 1.25rem; display: inline-flex; align-items: center; justify-content: center; border-radius: 0.75rem; padding: 0.625rem; color: #fff; background: rgba(255, 255, 255, 0.14); transition: background 160ms ease; }
.image-preview-close:hover { background: rgba(255, 255, 255, 0.24); }
</style>
