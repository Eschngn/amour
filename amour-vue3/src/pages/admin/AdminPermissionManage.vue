<template>
  <div class="space-y-5">
    <section class="grid gap-4 sm:grid-cols-3">
      <div v-for="stat in stats" :key="stat.label" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between"><span class="text-xs font-medium text-slate-400">{{ stat.label }}</span><component :is="stat.icon" class="h-4 w-4" :class="stat.color" /></div>
        <p class="mt-3 text-2xl font-semibold tracking-tight text-slate-800">{{ stat.value }}</p>
        <p class="mt-1 text-xs text-slate-400">{{ stat.note }}</p>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 class="text-sm font-semibold text-slate-900">权限目录</h2><p class="mt-1 text-xs text-slate-400">维护目录、菜单与操作权限，角色授权会实时使用这里的数据</p></div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <label class="relative sm:w-64"><Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input v-model="keyword" type="search" placeholder="搜索名称或权限标识" class="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100" /></label>
          <button type="button" class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800" @click="load"><Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />刷新</button>
          <button type="button" class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-rose-700" @click="openEditor()"><Plus class="h-3.5 w-3.5" />新增目录</button>
        </div>
      </div>
      <div v-if="loading" class="flex items-center justify-center py-24 text-sm text-slate-400"><Loading class="mr-2 h-4 w-4 animate-spin" />加载中...</div>
      <div v-else-if="!filteredTree.length" class="flex flex-col items-center justify-center px-6 py-24 text-center"><Lock class="h-8 w-8 text-slate-200" /><p class="mt-3 text-sm font-medium text-slate-600">暂无匹配权限</p><p class="mt-1 text-xs text-slate-400">调整搜索条件，或新增权限目录。</p></div>
      <div v-else class="permission-tree p-3 sm:p-5"><el-tree :data="filteredTree" node-key="id" default-expand-all :expand-on-click-node="false" :props="{ label: 'name', children: 'children' }"><template #default="{ data }"><div class="flex min-w-0 flex-1 items-center gap-3 py-1.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="typeClass(data.type)"><component :is="iconFor(data.menuIcon)" class="h-4 w-4" /></span><span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-slate-800">{{ data.name }}</span><span class="mt-0.5 block truncate font-mono text-[11px] text-slate-400">{{ data.permissionKey }}<span v-if="data.menuUrl" class="ml-2 font-sans text-slate-300">{{ data.menuUrl }}</span></span></span><span class="hidden shrink-0 items-center gap-2 sm:flex"><span class="rounded-full px-2 py-1 text-[10px] font-medium" :class="statusClass(data.status)">{{ data.status === 0 ? '启用' : '禁用' }}</span><span class="w-12 text-right text-xs text-slate-400">{{ data.roleCount }} 个角色</span></span><button type="button" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="新增子权限" title="新增子权限" @click.stop="openEditor(null, data)"><Plus class="h-4 w-4" /></button><button type="button" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="编辑权限" title="编辑权限" @click.stop="openEditor(data)"><Edit class="h-4 w-4" /></button><button type="button" class="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50" aria-label="删除权限" title="删除权限" @click.stop="remove(data)"><Delete class="h-4 w-4" /></button></div></template></el-tree></div>
    </section>

    <el-dialog v-model="dialog.visible" :title="dialog.form.id ? '编辑权限' : '新增权限'" width="min(640px, calc(100vw - 32px))" class="permission-editor-dialog" append-to-body destroy-on-close>
      <el-form :model="dialog.form" label-position="top">
        <div class="grid gap-4 sm:grid-cols-2"><el-form-item label="权限名称" required><el-input v-model="dialog.form.name" maxlength="16" placeholder="例如：故事管理" /></el-form-item><el-form-item label="权限类型" required><el-select v-model="dialog.form.type" class="!w-full"><el-option :value="1" label="目录" /><el-option :value="2" label="菜单" /><el-option :value="3" label="按钮" /></el-select></el-form-item><el-form-item label="父级权限" class="sm:col-span-2"><el-tree-select v-model="dialog.form.parentId" :data="parentOptions" node-key="id" check-strictly clearable placeholder="顶级目录" class="!w-full" :props="{ label: 'name', children: 'children', value: 'id' }" /></el-form-item><el-form-item label="权限标识" required><el-input v-model="dialog.form.permissionKey" maxlength="64" placeholder="例如：admin:story:query" class="font-mono" /></el-form-item><el-form-item label="排序"><el-input-number v-model="dialog.form.sort" :min="0" :max="9999" class="!w-full" /></el-form-item><el-form-item label="菜单路由"><el-input v-model="dialog.form.menuUrl" maxlength="32" placeholder="按钮权限可留空" /></el-form-item><el-form-item label="菜单图标"><el-input v-model="dialog.form.menuIcon" maxlength="255" placeholder="例如：Collection" /></el-form-item><el-form-item label="状态"><el-select v-model="dialog.form.status" class="!w-full"><el-option :value="0" label="启用" /><el-option :value="1" label="禁用" /></el-select></el-form-item></div>
      </el-form>
      <template #footer><div class="flex justify-end gap-3"><el-button @click="dialog.visible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></div></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Calendar, ChatDotRound, Collection, CollectionTag, Delete, Edit, House, Loading, Lock, Picture, Plus, Refresh, Search, Setting, User, UserFilled } from '@element-plus/icons-vue'
import api from '@/axios'

const loading = ref(false); const saving = ref(false); const keyword = ref(''); const tree = ref([])
const dialog = reactive({ visible: false, form: createForm() })
const iconMap = { Calendar, ChatDotRound, Collection, CollectionTag, House, Picture, Setting, User, UserFilled }
const allNodes = computed(() => flatten(tree.value)); const stats = computed(() => [{ label: '权限总数', value: allNodes.value.length, note: '当前有效权限', icon: Lock, color: 'text-rose-500' }, { label: '菜单数量', value: allNodes.value.filter(item => item.type === 2).length, note: '可访问的菜单', icon: Collection, color: 'text-sky-500' }, { label: '操作权限', value: allNodes.value.filter(item => item.type === 3).length, note: '按钮级权限', icon: Setting, color: 'text-emerald-500' }])
const filteredTree = computed(() => { const q = keyword.value.trim().toLowerCase(); if (!q) return tree.value; const filter = nodes => nodes.flatMap(node => { const children = filter(node.children || []); return `${node.name} ${node.permissionKey} ${node.menuUrl || ''}`.toLowerCase().includes(q) || children.length ? [{ ...node, children }] : [] }); return filter(tree.value) })
const parentOptions = computed(() => {
  const removeCurrent = nodes => (nodes || []).filter(node => node.id !== dialog.form.id).map(node => ({ ...node, children: removeCurrent(node.children) }))
  return removeCurrent(tree.value)
})
function createForm() { return { id: null, parentId: 0, name: '', type: 1, menuUrl: '', menuIcon: '', sort: 0, permissionKey: '', status: 0 } }
function flatten(nodes, result = []) { for (const node of nodes || []) { result.push(node); flatten(node.children, result) } return result }
function typeClass(type) { return type === 1 ? 'bg-amber-50 text-amber-500' : type === 2 ? 'bg-sky-50 text-sky-500' : 'bg-violet-50 text-violet-500' }
function statusClass(status) { return status === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500' }
function iconFor(name) { return iconMap[name] || (name ? Setting : Lock) }
async function load() { loading.value = true; try { const { data } = await api.post('/admin/permission/list'); if (!data.success) throw new Error(data.message || '加载权限失败'); tree.value = data.data || [] } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '加载权限失败') } finally { loading.value = false } }
function openEditor(item, parent) { dialog.form = item ? { ...item } : { ...createForm(), parentId: parent?.id || 0, type: parent ? Math.min(3, parent.type + 1) : 1 }; dialog.visible = true }
async function save() { if (!dialog.form.name.trim() || !dialog.form.permissionKey.trim()) return ElMessage.warning('请填写权限名称和权限标识'); saving.value = true; try { const { data } = await api.post('/admin/permission/save', dialog.form); if (!data.success) throw new Error(data.message || '保存权限失败'); ElMessage.success('权限已保存'); dialog.visible = false; await load() } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '保存权限失败') } finally { saving.value = false } }
async function remove(item) { try { await ElMessageBox.confirm(`确定删除权限“${item.name}”吗？被角色引用或仍有子权限时无法删除。`, '删除权限', { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }) } catch { return } try { const { data } = await api.post('/admin/permission/delete', { id: item.id }); if (!data.success) throw new Error(data.message || '删除权限失败'); ElMessage.success('权限已删除'); await load() } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '删除权限失败') } }
watch(() => dialog.form.type, type => { if (type === 1) { dialog.form.menuUrl = ''; dialog.form.menuIcon = '' } })
onMounted(load)
</script>

<style scoped>
:global(.permission-editor-dialog) {
  --el-color-primary: #e11d48;
  --el-color-primary-light-3: #fb7185;
  --el-color-primary-light-5: #fda4af;
  --el-color-primary-light-7: #fecdd3;
  --el-color-primary-light-8: #ffe4e6;
  --el-color-primary-light-9: #fff1f2;
  --el-color-primary-dark-2: #be123c;
}

.permission-tree :deep(.el-tree-node__content) { min-height: 54px; height: auto; padding: 4px 8px; border-radius: 10px; }
.permission-tree :deep(.el-tree-node__content:hover) { background: #fff1f2; }
:global(.permission-editor-dialog .el-form-item) { margin-right: 0; }
:global(.permission-editor-dialog .el-form-item__content),
:global(.permission-editor-dialog .el-input),
:global(.permission-editor-dialog .el-select),
:global(.permission-editor-dialog .el-tree-select),
:global(.permission-editor-dialog .el-input-number),
:global(.permission-editor-dialog .el-input__wrapper),
:global(.permission-editor-dialog .el-select__wrapper),
:global(.permission-editor-dialog .el-tree-select .el-select__wrapper) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

:global(.permission-editor-dialog .el-input__inner),
:global(.permission-editor-dialog .el-textarea__inner) {
  outline: none !important;
  box-shadow: none !important;
}

:global(.permission-editor-dialog .el-input__wrapper),
:global(.permission-editor-dialog .el-select__wrapper) {
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

:global(.permission-editor-dialog .el-input__wrapper.is-focus),
:global(.permission-editor-dialog .el-select__wrapper.is-focused),
:global(.permission-editor-dialog .el-input__wrapper:focus-within),
:global(.permission-editor-dialog .el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #fb7185 inset !important;
}
</style>
