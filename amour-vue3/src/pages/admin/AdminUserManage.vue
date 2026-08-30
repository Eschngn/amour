<template>
  <div class="space-y-5">
    <section class="grid gap-4 sm:grid-cols-3">
      <div v-for="stat in stats" :key="stat.label" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><span class="text-xs font-medium text-slate-400">{{ stat.label }}</span><component :is="stat.icon" class="h-4 w-4" :class="stat.color" /></div><p class="mt-3 text-2xl font-semibold tracking-tight text-slate-800">{{ stat.value }}</p><p class="mt-1 text-xs text-slate-400">{{ stat.note }}</p></div>
    </section>
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 class="text-sm font-semibold text-slate-900">用户列表</h2><p class="mt-1 text-xs text-slate-400">管理后台账号、角色与登录状态</p></div><div class="flex flex-col gap-2 sm:flex-row"><label class="relative sm:w-60"><Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input v-model="keyword" type="search" placeholder="搜索用户名或昵称" class="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100" /></label><el-select v-model="status" clearable placeholder="全部状态" class="status-select"><el-option :value="0" label="启用" /><el-option :value="1" label="停用" /></el-select><button type="button" class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-50" @click="load"><Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />刷新</button><button type="button" class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-rose-700" @click="openEditor()"><Plus class="h-3.5 w-3.5" />新增用户</button></div></div>
      <div v-if="loading" class="flex items-center justify-center py-24 text-sm text-slate-400"><Loading class="mr-2 h-4 w-4 animate-spin" />加载中...</div>
      <div v-else-if="!users.length" class="flex flex-col items-center justify-center px-6 py-24 text-center"><UserFilled class="h-9 w-9 text-slate-200" /><p class="mt-3 text-sm font-medium text-slate-600">暂无用户</p><p class="mt-1 text-xs text-slate-400">调整筛选条件，或新增一个用户。</p></div>
      <div v-else class="overflow-x-auto"><table class="min-w-[980px] w-full divide-y divide-slate-200 text-left text-sm"><thead class="bg-slate-50 text-xs font-medium tracking-wide text-slate-500"><tr><th class="px-6 py-3">用户</th><th class="px-4 py-3">角色</th><th class="px-4 py-3">来源</th><th class="px-4 py-3">状态</th><th class="px-4 py-3">更新时间</th><th class="px-6 py-3 text-right">操作</th></tr></thead><tbody class="divide-y divide-slate-100"><tr v-for="user in users" :key="user.id"><td class="px-6 py-4"><div class="flex items-center gap-3"><img v-if="user.avatar" :src="user.avatar" :alt="user.displayName" class="h-9 w-9 rounded-xl object-cover" /><span v-else class="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-xs font-bold text-rose-500">{{ (user.displayName || user.username || 'U').slice(0, 1) }}</span><div><p class="font-medium text-slate-800">{{ user.displayName || '-' }}</p><p class="mt-1 font-mono text-xs text-slate-400">{{ user.username }}</p></div></div></td><td class="px-4 py-4"><div class="flex max-w-[260px] flex-wrap gap-1.5"><span v-for="name in user.roleNames" :key="name" class="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-600">{{ name }}</span><span v-if="!user.roleNames?.length" class="text-xs text-slate-400">未分配角色</span></div></td><td class="px-4 py-4"><span class="rounded-full px-2.5 py-1 text-[11px] font-medium" :class="user.wechatOpenid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'">{{ user.wechatOpenid ? '微信' : '账号' }}</span></td><td class="px-4 py-4"><span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" :class="user.status ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"><span class="h-1.5 w-1.5 rounded-full" :class="user.status ? 'bg-emerald-500' : 'bg-slate-300'" />{{ user.status ? '启用' : '停用' }}</span></td><td class="whitespace-nowrap px-4 py-4 text-xs text-slate-400">{{ user.updateTime || '-' }}</td><td class="whitespace-nowrap px-6 py-4 text-right"><div class="inline-flex items-center gap-1"><button type="button" class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100" @click="openEditor(user)"><Edit class="h-3.5 w-3.5" />编辑</button><button v-if="user.status" type="button" class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50" @click="remove(user)"><Delete class="h-3.5 w-3.5" />停用</button></div></td></tr></tbody></table></div>
      <div class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-400 sm:flex-row sm:px-6"><span>共 {{ total }} 条 · 第 {{ currentPage }} / {{ totalPages }} 页</span><div class="flex items-center gap-1"><button type="button" :disabled="currentPage <= 1 || loading" class="rounded-lg px-3 py-1.5 transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="currentPage -= 1">上一页</button><button type="button" class="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white shadow-sm">{{ currentPage }}</button><button type="button" :disabled="currentPage >= totalPages || loading" class="rounded-lg px-3 py-1.5 transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="currentPage += 1">下一页</button></div></div>
    </section>
    <el-dialog v-model="dialog.visible" :title="dialog.form.id ? '编辑用户' : '新增用户'" width="min(640px, calc(100vw - 32px))" class="user-editor-dialog" append-to-body destroy-on-close><el-form :model="dialog.form" label-position="top"><div class="grid gap-4 sm:grid-cols-2"><el-form-item label="用户名" required><el-input v-model="dialog.form.username" maxlength="60" placeholder="用于登录的账号" /></el-form-item><el-form-item label="昵称" required><el-input v-model="dialog.form.displayName" maxlength="60" placeholder="前台展示名称" /></el-form-item><el-form-item label="密码" :required="!dialog.form.id" class="sm:col-span-2"><el-input v-model="dialog.form.password" type="password" show-password maxlength="64" :placeholder="dialog.form.id ? '留空表示不修改密码' : '至少 6 位字符'" /></el-form-item><el-form-item label="头像地址" class="sm:col-span-2"><el-input v-model="dialog.form.avatar" maxlength="500" placeholder="可选，填写图片 URL" /></el-form-item><el-form-item label="角色" class="sm:col-span-2"><el-select v-model="dialog.form.roleIds" multiple clearable filterable class="!w-full" placeholder="请选择角色"><el-option v-for="role in roles" :key="role.id" :value="role.id" :label="`${role.roleName} (${role.roleKey})`" /></el-select></el-form-item><el-form-item label="状态"><el-select v-model="dialog.form.status" class="!w-full"><el-option :value="0" label="启用" /><el-option :value="1" label="停用" /></el-select></el-form-item></div></el-form><template #footer><div class="flex justify-end gap-3"><el-button @click="dialog.visible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></div></template></el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Loading, Plus, Refresh, Search, UserFilled } from '@element-plus/icons-vue'
import api from '@/axios'
const pageSize = 10; const currentPage = ref(1); const keyword = ref(''); const status = ref(null); const loading = ref(false); const saving = ref(false); const users = ref([]); const roles = ref([]); const total = ref(0); const dialog = reactive({ visible: false, form: createForm() })
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize))); const stats = computed(() => [{ label: '用户总数', value: total.value, note: '当前筛选结果', icon: UserFilled, color: 'text-rose-500' }, { label: '启用用户', value: users.value.filter(item => item.status).length, note: '当前页统计', icon: UserFilled, color: 'text-emerald-500' }, { label: '已分配角色', value: users.value.filter(item => item.roleIds?.length).length, note: '当前页统计', icon: UserFilled, color: 'text-indigo-500' }])
function createForm() { return { id: null, username: '', displayName: '', password: '', avatar: '', status: 0, roleIds: [] } }
async function load() { loading.value = true; try { const { data } = await api.post('/admin/user/list', { current: currentPage.value, size: pageSize, keyword: keyword.value.trim() || undefined, status: status.value }); if (!data.success) throw new Error(data.message || '加载用户失败'); users.value = data.data?.records || []; total.value = Number(data.data?.total) || 0 } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '加载用户失败') } finally { loading.value = false } }
async function loadRoles() { try { const { data } = await api.post('/admin/user/roles'); if (data.success) roles.value = data.data || [] } catch (e) { ElMessage.error(e.response?.data?.message || '加载角色失败') } }
function openEditor(user) { dialog.form = user ? { ...user, password: '', roleIds: [...(user.roleIds || [])], status: user.status ? 0 : 1 } : createForm(); dialog.visible = true }
async function save() { if (!dialog.form.username.trim() || !dialog.form.displayName.trim()) return ElMessage.warning('请填写用户名和昵称'); if (!dialog.form.id && dialog.form.password.length < 6) return ElMessage.warning('新用户密码至少需要 6 位'); saving.value = true; try { const { data } = await api.post('/admin/user/save', dialog.form); if (!data.success) throw new Error(data.message || '保存用户失败'); ElMessage.success('用户已保存'); dialog.visible = false; await load() } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '保存用户失败') } finally { saving.value = false } }
async function remove(user) { try { await ElMessageBox.confirm(`确定停用用户“${user.displayName || user.username}”吗？停用后将无法登录。`, '停用用户', { confirmButtonText: '确认停用', cancelButtonText: '取消', type: 'warning' }) } catch { return } try { const { data } = await api.post('/admin/user/delete', { id: user.id }); if (!data.success) throw new Error(data.message || '停用用户失败'); ElMessage.success('用户已停用'); await load() } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '停用用户失败') } }
watch(currentPage, load); watch(status, () => { currentPage.value = 1; load() }); let timer; watch(keyword, () => { clearTimeout(timer); timer = setTimeout(() => { currentPage.value = 1; load() }, 250) }); onMounted(() => { load(); loadRoles() })
</script>
<style scoped>
:global(.user-editor-dialog) {
  --el-color-primary: #e11d48;
  --el-color-primary-light-3: #fb7185;
  --el-color-primary-light-5: #fda4af;
  --el-color-primary-light-7: #fecdd3;
  --el-color-primary-light-8: #ffe4e6;
  --el-color-primary-light-9: #fff1f2;
  --el-color-primary-dark-2: #be123c;
}

:global(.user-editor-dialog .el-form-item) { margin-right: 0; }
:global(.user-editor-dialog .el-form-item__content),
:global(.user-editor-dialog .el-input),
:global(.user-editor-dialog .el-select),
:global(.user-editor-dialog .el-input-number),
:global(.user-editor-dialog .el-input__wrapper),
:global(.user-editor-dialog .el-select__wrapper) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

:global(.user-editor-dialog .el-input__inner),
:global(.user-editor-dialog .el-select__input),
:global(.user-editor-dialog .el-textarea__inner) {
  outline: none !important;
  box-shadow: none !important;
}

:global(.user-editor-dialog .el-input__wrapper),
:global(.user-editor-dialog .el-select__wrapper) {
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

:global(.user-editor-dialog .el-input__wrapper.is-focus),
:global(.user-editor-dialog .el-select__wrapper.is-focused),
:global(.user-editor-dialog .el-input__wrapper:focus-within),
:global(.user-editor-dialog .el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #fb7185 inset !important;
}

.status-select {
  width: 140px;
}

:deep(.status-select .el-select__wrapper) {
  min-height: 40px;
}
</style>
