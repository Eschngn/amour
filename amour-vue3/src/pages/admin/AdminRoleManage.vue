<template>
  <div class="space-y-5">
    <section class="role-workspace overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="role-layout">
        <aside class="role-list-panel border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div class="border-b border-slate-100 p-4 sm:p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">角色列表</p>
                <p class="mt-1 text-xs text-slate-400">共 {{ total }} 个角色</p>
              </div>
              <div class="flex items-center gap-1">
                <button type="button" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="刷新角色" title="刷新角色" @click="load"><Refresh class="h-4 w-4" :class="{ 'animate-spin': loading }" /></button>
                <button type="button" class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700" @click="openCreate"><Plus class="h-3.5 w-3.5" />新增</button>
              </div>
            </div>
            <label class="relative mt-4 block">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input v-model="roleKeyword" type="search" placeholder="搜索角色名称或标识" class="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100" />
            </label>
          </div>
          <div v-if="loading" class="flex min-h-[320px] items-center justify-center text-sm text-slate-400">加载中...</div>
          <div v-else-if="!filteredRoles.length" class="flex min-h-[320px] flex-col items-center justify-center px-6 text-center"><UserFilled class="h-8 w-8 text-slate-200" /><p class="mt-3 text-sm text-slate-500">暂无匹配角色</p><p class="mt-1 text-xs text-slate-400">尝试修改搜索条件或新增角色</p></div>
          <div v-else class="role-list p-2 sm:p-3">
            <button v-for="role in filteredRoles" :key="role.id" type="button" class="role-list-item group flex w-full items-center gap-3 rounded-xl p-3 text-left transition" :class="selectedRoleId === role.id ? 'is-active' : ''" @click="selectedRoleId = role.id">
              <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-slate-800">{{ role.roleName }}</span><span class="mt-1 block truncate font-mono text-[11px] text-slate-400">{{ role.roleKey }}</span></span>
              <span class="h-2 w-2 shrink-0 rounded-full" :class="role.status === 0 ? 'bg-emerald-500' : 'bg-slate-300'" :title="role.status === 0 ? '启用' : '禁用'" />
              <ArrowRight class="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" :class="selectedRoleId === role.id ? 'opacity-100 text-rose-500' : ''" />
            </button>
          </div>
        </aside>

        <main v-if="selectedRole" class="role-detail min-w-0">
          <div class="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
            <div class="flex min-w-0 items-center gap-3">
              <div class="min-w-0"><h2 class="truncate text-xl font-semibold text-slate-900">{{ selectedRole.roleName }}</h2><p class="mt-1 truncate font-mono text-xs text-slate-400">{{ selectedRole.roleKey }}</p></div>
            </div>
            <div class="flex shrink-0 items-center gap-2"><span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" :class="selectedRole.status === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"><span class="h-1.5 w-1.5 rounded-full" :class="selectedRole.status === 0 ? 'bg-emerald-500' : 'bg-slate-300'" />{{ selectedRole.status === 0 ? '启用' : '禁用' }}</span><button type="button" class="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50" aria-label="删除角色" title="删除角色" @click="removeRole(selectedRole)"><Delete class="h-4 w-4" /></button></div>
          </div>
          <div class="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-3 sm:p-7"><div><p class="text-xs text-slate-400">角色说明</p><p class="mt-1.5 truncate text-sm font-medium text-slate-700">{{ selectedRole.remark || '暂无备注' }}</p></div><div><p class="text-xs text-slate-400">已分配权限</p><p class="mt-1.5 text-sm font-medium text-slate-700">{{ selectedRole.permissionIds?.length || 0 }} 项</p></div><div><p class="text-xs text-slate-400">最后更新</p><p class="mt-1.5 truncate text-sm font-medium text-slate-700">{{ selectedRole.updateTime || '-' }}</p></div></div>
          <div class="p-5 sm:p-7"><div class="mb-4 flex items-start justify-between gap-4"><div><h3 class="text-sm font-semibold text-slate-800">权限范围</h3><p class="mt-1 text-xs text-slate-400">勾选父权限会同步选中其子权限，取消时也会同步取消</p></div><Lock class="mt-0.5 h-4 w-4 shrink-0 text-slate-300" /></div><div v-if="permissionsLoading" class="py-16 text-center text-sm text-slate-400">加载权限中...</div><div v-else-if="!permissionTree.length" class="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">暂无可用权限</div><div v-else class="permission-tree-scroll rounded-xl border border-slate-200 px-3 py-2"><div class="permission-tree"><el-tree ref="viewTreeRef" :key="selectedRole.id" :data="permissionTree" :props="treeProps" node-key="id" show-checkbox default-expand-all :default-checked-keys="selectedPermissionIds" :check-strictly="true" empty-text="暂无权限" @check="onPermissionCheck" /></div></div><div v-if="!permissionsLoading && permissionTree.length" class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3"><span class="text-xs text-slate-400">已选择 {{ selectedPermissionCount }} 项权限</span><button type="button" class="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="saving" @click="savePermissions"><Loading v-if="saving" class="h-3.5 w-3.5 animate-spin" /><Check v-else class="h-3.5 w-3.5" />{{ saving ? '保存中...' : '保存权限' }}</button></div></div>
        </main>
        <main v-else class="flex min-h-[560px] items-center justify-center p-8 text-center"><div><UserFilled class="mx-auto h-10 w-10 text-slate-200" /><p class="mt-4 text-sm font-medium text-slate-500">暂无角色</p><p class="mt-1 text-xs text-slate-400">请先新增一个角色</p></div></main>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="新增角色" width="min(640px, calc(100vw - 32px))" class="role-editor-dialog" append-to-body destroy-on-close>
      <el-form :model="form" label-position="top" @submit.prevent="save">
        <div class="role-editor-grid grid gap-4 sm:grid-cols-2">
          <el-form-item label="角色名称" required><el-input v-model="form.roleName" maxlength="32" placeholder="例如：内容编辑" class="!w-full" /></el-form-item>
          <el-form-item label="角色标识" required><el-input v-model="form.roleKey" maxlength="32" placeholder="例如：content_editor" class="!w-full font-mono" /></el-form-item>
          <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" :max="9999" class="!w-full" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="form.status" class="!w-full"><el-option :value="0" label="启用" /><el-option :value="1" label="禁用" /></el-select></el-form-item>
          <el-form-item label="备注" class="sm:col-span-2"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="255" show-word-limit placeholder="补充说明（可选）" class="!w-full" /></el-form-item>
          <el-form-item label="权限范围" class="sm:col-span-2"><div class="w-full rounded-xl border border-slate-200 p-3"><el-tree ref="treeRef" :data="permissionTree" node-key="id" show-checkbox default-expand-all :props="treeProps" /></div></el-form-item>
        </div>
      </el-form>
      <template #footer><div class="flex justify-end gap-3"><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</el-button></div></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Check, Delete, Lock, Loading, Plus, Refresh, Search, UserFilled } from '@element-plus/icons-vue'
import api from '@/axios'

const roles = ref([]); const total = ref(0); const roleKeyword = ref(''); const loading = ref(false); const permissionsLoading = ref(false); const saving = ref(false); const dialogVisible = ref(false); const treeRef = ref(); const viewTreeRef = ref(); const permissionTree = ref([]); const selectedRoleId = ref(null); const permissionVersion = ref(0); let syncingPermissions = false
const form = ref({ roleName: '', roleKey: '', status: 0, sort: 0, remark: '', permissionIds: [] })
const treeProps = { label: 'name', children: 'children' }
const filteredRoles = computed(() => {
  const keyword = roleKeyword.value.trim().toLowerCase()
  if (!keyword) return roles.value
  return roles.value.filter((role) => `${role.roleName || ''} ${role.roleKey || ''}`.toLowerCase().includes(keyword))
})
const selectedRole = computed(() => roles.value.find(role => role.id === selectedRoleId.value) || roles.value[0] || null)
const selectedPermissionIds = computed(() => {
  const validIds = new Set(flattenPermissionIds(permissionTree.value).map((id) => String(id)))
  return (selectedRole.value?.permissionIds || []).filter((id) => validIds.has(String(id)))
})
const selectedPermissionCount = computed(() => { permissionVersion.value; return viewTreeRef.value?.getCheckedKeys(false).length || 0 })
function flattenPermissionIds(nodes, result = []) {
  for (const node of nodes || []) {
    result.push(node.id)
    flattenPermissionIds(node.children, result)
  }
  return result
}
function onPermissionCheck(node, state) {
  permissionVersion.value++
  if (syncingPermissions || !node.children?.length || !viewTreeRef.value) return
  syncingPermissions = true
  const checkedIds = new Set(state.checkedKeys || [])
  const childIds = flattenPermissionIds(node.children)
  const isChecked = [...checkedIds].some((id) => String(id) === String(node.id))
  if (isChecked) childIds.forEach((id) => checkedIds.add(id))
  else childIds.forEach((id) => checkedIds.delete(id))
  viewTreeRef.value.setCheckedKeys([...checkedIds])
  syncingPermissions = false
  permissionVersion.value++
}
async function load() { loading.value = true; try { const { data } = await api.post('/admin/role/list', { current: 1, size: 1000 }); if (data.success) { roles.value = data.data.records || []; total.value = Number(data.data.total) || 0; if (!roles.value.some(role => role.id === selectedRoleId.value)) selectedRoleId.value = roles.value[0]?.id || null } else ElMessage.error(data.message || '加载角色失败') } catch (e) { ElMessage.error(e.response?.data?.message || '加载角色失败') } finally { loading.value = false } }
async function loadPermissions() { permissionsLoading.value = true; try { const { data } = await api.post('/admin/role/permissions'); if (data.success) permissionTree.value = data.data || [] } catch (e) { ElMessage.error(e.response?.data?.message || '加载权限失败') } finally { permissionsLoading.value = false } }
function openCreate() { form.value = { roleName: '', roleKey: '', status: 0, sort: 0, remark: '', permissionIds: [] }; dialogVisible.value = true; setTimeout(() => treeRef.value?.setCheckedKeys([])) }
async function save() { if (!form.value.roleName.trim() || !form.value.roleKey.trim()) return ElMessage.warning('请填写角色名称和标识'); saving.value = true; try { const { data } = await api.post('/admin/role/save', { ...form.value, permissionIds: treeRef.value?.getCheckedKeys(false) || [] }); if (!data.success) return ElMessage.error(data.message || '保存失败'); ElMessage.success('角色已保存'); dialogVisible.value = false; load() } catch (e) { ElMessage.error(e.response?.data?.message || '保存失败') } finally { saving.value = false } }
async function savePermissions() { if (!selectedRole.value || !viewTreeRef.value) return; saving.value = true; try { const { data } = await api.post('/admin/role/save', { ...selectedRole.value, permissionIds: viewTreeRef.value.getCheckedKeys(false) }); if (!data.success) return ElMessage.error(data.message || '权限保存失败'); selectedRole.value.permissionIds = viewTreeRef.value.getCheckedKeys(false); ElMessage.success('权限已保存') } catch (e) { ElMessage.error(e.response?.data?.message || '权限保存失败') } finally { saving.value = false } }
async function removeRole(role) { try { await ElMessageBox.confirm(`确定删除角色“${role.roleName}”吗？`, '删除角色', { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }); const { data } = await api.post('/admin/role/delete', { id: role.id }); if (!data.success) return ElMessage.error(data.message || '删除失败'); ElMessage.success('角色已删除'); load() } catch (e) { if (e !== 'cancel') ElMessage.error(e.response?.data?.message || '删除失败') } }
onMounted(() => { load(); loadPermissions() })
</script>

<style scoped>
.role-workspace { min-height: 560px; }
.role-layout { display: grid; grid-template-columns: minmax(0, 1fr); min-height: 560px; }
.role-list-panel { min-width: 0; background: #fbfcfe; }
.role-list { max-height: 510px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
.role-list-item:hover { background: #f8fafc; }
.role-list-item.is-active { background: #fff1f2; box-shadow: inset 3px 0 0 #f43f5e; }
.role-detail { background: #fff; }
.permission-tree-scroll { max-height: 390px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
.permission-tree :deep(.el-tree-node__content) { min-height: 38px; height: auto; padding: 3px 0; }
:global(.role-editor-dialog) { --el-color-primary: #e11d48; --el-color-primary-light-3: #fb7185; --el-color-primary-light-5: #fda4af; --el-color-primary-light-7: #fecdd3; --el-color-primary-light-8: #ffe4e6; --el-color-primary-light-9: #fff1f2; --el-color-primary-dark-2: #be123c; height: min(720px, calc(100vh - 32px)); max-height: calc(100vh - 32px); margin: 16px auto; display: flex; flex-direction: column; overflow: hidden; }
:global(.role-editor-dialog .el-dialog__header) { flex: 0 0 auto; margin: 0; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
:global(.role-editor-dialog .el-dialog__body) { min-height: 0; flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; }
:global(.role-editor-dialog .el-dialog__footer) { flex: 0 0 auto; border-top: 1px solid #f1f5f9; background: #fff; }
:global(.role-editor-dialog .el-form-item) { margin-right: 0; }
:global(.role-editor-dialog .role-editor-grid > .el-form-item), :global(.role-editor-dialog .role-editor-grid .el-form-item__content) { min-width: 0; }
:global(.role-editor-dialog .role-editor-grid .el-form-item__content), :global(.role-editor-dialog .role-editor-grid .el-input), :global(.role-editor-dialog .role-editor-grid .el-select), :global(.role-editor-dialog .role-editor-grid .el-input-number) { width: 100%; min-width: 0; }
:global(.role-editor-dialog .el-input__wrapper), :global(.role-editor-dialog .el-select__wrapper) {
  box-sizing: border-box;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

:global(.role-editor-dialog .el-input__inner), :global(.role-editor-dialog .el-textarea__inner) {
  outline: none !important;
  box-shadow: none !important;
}

:global(.role-editor-dialog .el-input__wrapper.is-focus), :global(.role-editor-dialog .el-select__wrapper.is-focused), :global(.role-editor-dialog .el-input__wrapper:focus-within), :global(.role-editor-dialog .el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #fb7185 inset !important;
}
@media (min-width: 1024px) {
  .role-layout { grid-template-columns: 300px minmax(0, 1fr); }
  .role-list-panel { border-right: 1px solid #e2e8f0; }
  .role-list { max-height: 510px; }
}
</style>
