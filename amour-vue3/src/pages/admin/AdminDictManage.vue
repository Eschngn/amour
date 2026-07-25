<template>
  <div class="space-y-5">
    <section class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 items-center gap-4">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100">
          <CollectionTag class="h-6 w-6" />
        </span>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-slate-900">配置中心</h2>
          <p class="mt-1 text-sm text-slate-500">统一维护站点配置、字典值与前端展示参数。</p>
        </div>
      </div>
      <button type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-xl" @click="openEditor()">
        <Plus class="h-4 w-4" /> 新增配置
      </button>
    </section>

    <section class="grid gap-4 sm:grid-cols-3">
      <div v-for="stat in stats" :key="stat.label" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between"><span class="text-xs font-medium text-slate-400">{{ stat.label }}</span><component :is="stat.icon" class="h-4 w-4" :class="stat.color" /></div>
        <p class="mt-3 text-2xl font-semibold tracking-tight text-slate-800">{{ stat.value }}</p>
        <p class="mt-1 text-xs text-slate-400">{{ stat.note }}</p>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="text-sm font-semibold text-slate-800">全部配置</h3>
          <p class="mt-1 text-xs text-slate-400">一条配置对应 `site_config` 表中的一条记录</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <div class="relative sm:w-64">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input v-model="keyword" type="search" placeholder="搜索键名、名称或值" class="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400" />
          </div>
          <div class="config-type-filter relative sm:w-40">
            <Filter class="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <el-select v-model="valueType" clearable placeholder="全部类型" class="config-type-select w-full">
              <el-option v-for="option in typeOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </div>
          <button type="button" class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800" @click="fetchConfigs">
            <Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" /> 刷新
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-24 text-sm text-slate-400"><Loading class="mr-2 h-4 w-4 animate-spin" />加载中…</div>
      <div v-else-if="!configs.length" class="flex flex-col items-center justify-center px-6 py-24 text-center">
        <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><CollectionTag class="h-6 w-6" /></span>
        <p class="mt-4 text-sm font-medium text-slate-600">暂无配置记录</p>
        <p class="mt-1 text-xs text-slate-400">调整搜索条件，或新增一条配置。</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-[1080px] w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium tracking-wide text-slate-500">
            <tr>
              <th class="px-6 py-3">配置名称</th>
              <th class="px-4 py-3">配置键</th>
              <th class="px-4 py-3">配置值</th>
              <th class="px-4 py-3">值类型</th>
              <th class="px-4 py-3">排序</th>
              <th class="px-4 py-3">更新时间</th>
              <th class="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="config in configs" :key="config.id">
              <td class="px-6 py-4"><div class="max-w-[180px]"><p class="truncate font-medium text-slate-800">{{ config.configName }}</p><p v-if="config.remark" class="mt-1 truncate text-xs text-slate-400">{{ config.remark }}</p></div></td>
              <td class="px-4 py-4"><code class="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">{{ config.configKey }}</code></td>
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
              <td class="px-4 py-4"><span class="rounded-full px-2.5 py-1 text-[11px] font-medium" :class="typeClass(config.valueType)">{{ typeLabel(config.valueType) }}</span></td>
              <td class="px-4 py-4 text-slate-500">{{ config.sortOrder ?? 0 }}</td>
              <td class="whitespace-nowrap px-4 py-4 text-xs text-slate-400">{{ config.updateTime || '-' }}</td>
              <td class="whitespace-nowrap px-6 py-4 text-right"><div class="inline-flex gap-1"><button type="button" class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" @click="openEditor(config)"><Edit class="h-3.5 w-3.5" />编辑</button><button type="button" class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-500 transition hover:bg-rose-50" @click="deleteConfig(config)"><Delete class="h-3.5 w-3.5" />删除</button></div></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-400 sm:flex-row sm:px-6">
        <span>共 {{ total }} 条 · 第 {{ currentPage }} / {{ totalPages }} 页</span>
        <div class="flex items-center gap-1"><button type="button" :disabled="currentPage <= 1 || loading" class="rounded-lg px-3 py-1.5 transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="currentPage -= 1">上一页</button><button type="button" class="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white shadow-sm">{{ currentPage }}</button><button type="button" :disabled="currentPage >= totalPages || loading" class="rounded-lg px-3 py-1.5 transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="currentPage += 1">下一页</button></div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="dialog.visible" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm" @click.self="dialog.visible = false">
        <form class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl" @submit.prevent="saveConfig">
          <div class="flex items-start justify-between"><div><h3 class="text-base font-semibold text-slate-900">{{ dialog.form.id ? '编辑配置' : '新增配置' }}</h3><p class="mt-1 text-xs text-slate-400">配置键必须唯一，供前台或业务接口引用。</p></div><button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="关闭" @click="dialog.visible = false"><Close class="h-4 w-4" /></button></div>
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <label><span class="form-label">配置名称</span><input v-model="dialog.form.configName" class="form-input" placeholder="例如：首页标题" /></label>
            <label><span class="form-label">配置键</span><input v-model="dialog.form.configKey" class="form-input font-mono" placeholder="例如：site_title" /></label>
            <div class="sm:col-span-2">
              <span class="form-label">配置值</span>
              <textarea v-if="dialog.form.valueType === 'text'" v-model="dialog.form.configValue" class="form-input min-h-24 resize-y" placeholder="请输入配置内容" />
              <el-date-picker
                v-else-if="dialog.form.valueType === 'datetime'"
                v-model="dialog.form.configValue"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择日期时间"
                clearable
                class="form-date-picker w-full"
              />
              <div v-else class="config-image-input">
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
                  <button type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50" :disabled="uploadingImage">
                    <Loading v-if="uploadingImage" class="h-4 w-4 animate-spin" />
                    <Upload v-else class="h-4 w-4" />
                    {{ uploadingImage ? '上传中…' : (dialog.form.configValue ? '重新上传图片' : '上传图片') }}
                  </button>
                </el-upload>
                <p class="mt-2 text-xs text-slate-400">支持 JPG、PNG、GIF、WEBP 等图片格式。</p>
              </div>
            </div>
            <label><span class="form-label">值类型</span><el-select v-model="dialog.form.valueType" class="form-type-select w-full" placeholder="请选择值类型" @change="handleValueTypeChange"><el-option v-for="option in editableTypeOptions" :key="option.value" :label="option.label" :value="option.value" /></el-select></label>
            <label><span class="form-label">排序</span><input v-model.number="dialog.form.sortOrder" type="number" min="0" class="form-input" /></label>
            <label class="sm:col-span-2"><span class="form-label">备注</span><textarea v-model="dialog.form.remark" class="form-input min-h-20 resize-y" placeholder="补充说明（可选）" /></label>
          </div>
          <div class="mt-7 flex justify-end gap-2"><button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" @click="dialog.visible = false">取消</button><button type="submit" :disabled="saving" class="rounded-xl bg-rose-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-50">{{ saving ? '保存中…' : '保存' }}</button></div>
        </form>
      </div>
    </Teleport>

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
import { CollectionTag, Close, Delete, Edit, Filter, Loading, Plus, Refresh, Search, Setting, Upload } from '@element-plus/icons-vue'
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

const stats = computed(() => [
  { label: '配置总数', value: total.value, note: '当前数据库记录', icon: CollectionTag, color: 'text-indigo-500' },
  { label: '类型数量', value: new Set(configs.value.map(item => item.valueType).filter(Boolean)).size, note: '当前页统计', icon: Setting, color: 'text-violet-500' },
  { label: '当前页', value: configs.value.length, note: `第 ${currentPage.value} 页`, icon: Refresh, color: 'text-emerald-500' },
])

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

function typeClass(type) {
  if (type === 'image') return 'bg-sky-50 text-sky-600'
  if (type === 'datetime') return 'bg-amber-50 text-amber-600'
  return 'bg-slate-100 text-slate-600'
}

function typeLabel(type) {
  return editableTypeOptions.find(option => option.value === type)?.label || type
}

watch(currentPage, fetchConfigs)
watch(valueType, () => { currentPage.value = 1; fetchConfigs() })
let searchTimer
watch(keyword, () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage.value = 1; fetchConfigs() }, 250) })
onMounted(fetchConfigs)
</script>

<style scoped>
.form-label { display: block; margin-bottom: 0.5rem; font-size: 0.75rem; font-weight: 600; color: #475569; }
.form-input { width: 100%; min-height: 40px; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.625rem 0.75rem; font-size: 0.875rem; color: #334155; outline: none; transition: border-color 160ms ease, box-shadow 160ms ease; }
.form-input:focus { border-color: rgba(99, 102, 241, 0.48); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.09); }
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
:deep(.config-type-select .el-select__wrapper),
:deep(.form-type-select .el-select__wrapper),
:deep(.form-date-picker .el-input__wrapper) { min-height: 40px; border-radius: 12px; background: #fff; box-shadow: 0 0 0 1px #e2e8f0 inset; transition: box-shadow 160ms ease, transform 160ms ease; }
:deep(.config-type-select .el-select__wrapper) { padding-left: 34px; }
:deep(.config-type-select .el-select__wrapper:hover),
:deep(.form-type-select .el-select__wrapper:hover),
:deep(.form-date-picker .el-input__wrapper:hover) { box-shadow: 0 0 0 1px #c7d2fe inset; }
:deep(.config-type-select .el-select__wrapper.is-focused),
:deep(.form-type-select .el-select__wrapper.is-focused),
:deep(.form-date-picker .el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px #818cf8 inset, 0 0 0 3px rgba(99, 102, 241, 0.1); }
:deep(.config-type-select .el-select__placeholder),
:deep(.form-type-select .el-select__placeholder),
:deep(.form-date-picker .el-input__inner) { font-size: 13px; color: #64748b; }
</style>
