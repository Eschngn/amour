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
              aria-label="搜索用户名或昵称"
              placeholder="搜索用户名或昵称"
              class="admin-search-input"
              @keyup.enter="applyFilters"
            />
          </label>
          <el-select
            v-model="status"
            clearable
            placeholder="全部状态"
            class="admin-filter-field admin-filter-field--select"
          >
            <el-option :value="0" label="启用" />
            <el-option :value="1" label="停用" />
          </el-select>
        </div>
        <div class="admin-filter-actions">
          <button
            type="button"
            class="admin-filter-button admin-filter-button--secondary admin-filter-button--icon"
            aria-label="刷新用户列表"
            title="刷新用户列表"
            @click="load"
          >
            <Refresh class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
          </button>
          <button type="button" class="admin-filter-button admin-filter-button--primary" @click="openEditor()">
            <Plus class="h-3.5 w-3.5" aria-hidden="true" />新增用户
          </button>
        </div>
      </div>
    </section>
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-24 text-sm text-slate-400"><Loading class="mr-2 h-4 w-4 animate-spin" />加载中...</div>
      <div v-else-if="!users.length" class="flex flex-col items-center justify-center px-6 py-24 text-center"><UserFilled class="h-9 w-9 text-slate-200" /><p class="mt-3 text-sm font-medium text-slate-600">暂无用户</p><p class="mt-1 text-xs text-slate-400">调整筛选条件，或新增一个用户。</p></div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[880px] divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium tracking-wide text-slate-500">
            <tr>
              <th class="px-6 py-3">用户</th>
              <th class="px-4 py-3">恋语 ID</th>
              <th class="px-4 py-3">身份</th>
              <th class="px-4 py-3">状态</th>
              <th class="px-4 py-3">更新时间</th>
              <th class="px-6 py-3 admin-table-actions">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="user in users" :key="user.id">
              <td class="px-6 py-4">
                <div class="flex max-w-[18rem] items-center gap-3">
                  <img v-if="user.avatar" :src="user.avatar" :alt="user.displayName" class="h-9 w-9 shrink-0 rounded-xl object-cover">
                  <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-xs font-bold text-rose-500">{{ (user.displayName || user.username || 'U').slice(0, 1) }}</span>
                  <div class="min-w-0">
                    <p class="truncate font-medium text-slate-800" :title="user.displayName || ''">{{ user.displayName || '-' }}</p>
                    <p class="mt-1 truncate font-mono text-xs text-slate-400" :title="user.username">{{ user.username }}</p>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-500">{{ user.amourId || '-' }}</td>
              <td class="whitespace-nowrap px-4 py-4">
                <span class="rounded-full px-2.5 py-1 text-[11px] font-medium" :class="user.platformAdmin ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'">{{ user.platformAdmin ? '平台管理员' : '普通用户' }}</span>
              </td>
              <td class="whitespace-nowrap px-4 py-4">
                <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" :class="user.status ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'">
                  <span class="h-1.5 w-1.5 rounded-full" :class="user.status ? 'bg-emerald-500' : 'bg-slate-300'" />{{ user.status ? '启用' : '停用' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-4 text-xs text-slate-400">{{ user.updateTime || '-' }}</td>
              <td class="whitespace-nowrap px-6 py-4 admin-table-actions">
                <div class="admin-table-action-group admin-table-action-group--double">
                  <button type="button" class="admin-table-action text-slate-600 hover:bg-slate-100" @click="openEditor(user)">
                    <Edit class="h-3.5 w-3.5" aria-hidden="true" />编辑
                  </button>
                  <button v-if="user.status" type="button" class="admin-table-action text-rose-600 hover:bg-rose-50" @click="remove(user)">
                    <Lock class="h-3.5 w-3.5" aria-hidden="true" />停用
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-400 sm:flex-row sm:px-6"><span>共 {{ total }} 条 · 第 {{ currentPage }} / {{ totalPages }} 页</span><div class="flex items-center gap-1"><button type="button" :disabled="currentPage <= 1 || loading" class="rounded-lg px-3 py-1.5 transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="currentPage -= 1">上一页</button><button type="button" class="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white shadow-sm">{{ currentPage }}</button><button type="button" :disabled="currentPage >= totalPages || loading" class="rounded-lg px-3 py-1.5 transition enabled:hover:bg-slate-100 disabled:text-slate-300" @click="currentPage += 1">下一页</button></div></div>
    </section>
    <el-dialog v-model="dialog.visible" :title="dialog.form.id ? '编辑用户' : '新增用户'" width="min(640px, calc(100vw - 32px))" class="user-editor-dialog admin-dialog-surface" append-to-body destroy-on-close><el-form :model="dialog.form" label-position="top"><div class="grid gap-4 sm:grid-cols-2"><el-form-item label="用户名" required><el-input v-model="dialog.form.username" maxlength="60" placeholder="用于登录的账号" /></el-form-item><el-form-item label="昵称" required><el-input v-model="dialog.form.displayName" maxlength="60" placeholder="前台展示名称" /></el-form-item><el-form-item label="密码" :required="!dialog.form.id" class="sm:col-span-2"><el-input v-model="dialog.form.password" type="password" show-password maxlength="64" :placeholder="dialog.form.id ? '留空表示不修改密码' : '至少 6 位字符'" /></el-form-item><el-form-item label="头像地址" class="sm:col-span-2"><el-input v-model="dialog.form.avatar" maxlength="500" placeholder="可选，填写图片 URL" /></el-form-item><el-form-item label="状态"><el-select v-model="dialog.form.status" class="!w-full"><el-option :value="0" label="启用" /><el-option :value="1" label="停用" /></el-select></el-form-item><el-form-item v-if="dialog.form.id && dialog.form.status === 1" label="停用原因" class="sm:col-span-2" required><el-input v-model="dialog.form.reason" type="textarea" :rows="2" maxlength="1000" show-word-limit placeholder="停用会立即退出登录，请填写原因用于审计" /></el-form-item><el-form-item label="平台管理员" class="sm:col-span-2"><el-switch v-model="dialog.form.platformAdmin" /></el-form-item></div></el-form><template #footer><div class="flex justify-end gap-3"><el-button @click="dialog.visible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></div></template></el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Loading, Lock, Plus, Refresh, Search, UserFilled } from '@element-plus/icons-vue'
import { ADMIN_MESSAGE_BOX_CLASS } from '@/utils/adminRestore'
import api from '@/axios'
const pageSize = 10; const currentPage = ref(1); const keyword = ref(''); const status = ref(null); const loading = ref(false); const saving = ref(false); const users = ref([]); const total = ref(0); const dialog = reactive({ visible: false, form: createForm() })
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
function createForm() { return { id: null, username: '', displayName: '', password: '', avatar: '', status: 0, platformAdmin: false, reason: '' } }
async function load() { loading.value = true; try { const { data } = await api.post('/admin/user/list', { current: currentPage.value, size: pageSize, keyword: keyword.value.trim() || undefined, status: status.value }); if (!data.success) throw new Error(data.message || '加载用户失败'); users.value = data.data?.records || []; total.value = Number(data.data?.total) || 0 } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '加载用户失败') } finally { loading.value = false } }
function resetAndLoad() { if (currentPage.value === 1) load(); else currentPage.value = 1 }
function applyFilters() { clearTimeout(timer); resetAndLoad() }
function openEditor(user) { dialog.form = user ? { ...user, password: '', status: user.status ? 0 : 1, platformAdmin: !!user.platformAdmin, reason: '' } : createForm(); dialog.visible = true }
async function save() { if (!dialog.form.username.trim() || !dialog.form.displayName.trim()) return ElMessage.warning('请填写用户名和昵称'); if (!dialog.form.id && dialog.form.password.length < 6) return ElMessage.warning('新用户密码至少需要 6 位'); if (dialog.form.id && dialog.form.status === 1 && !String(dialog.form.reason || '').trim()) return ElMessage.warning('停用用户前请填写原因'); saving.value = true; try { const { data } = await api.post('/admin/user/save', dialog.form); if (!data.success) throw new Error(data.message || '保存用户失败'); ElMessage.success('用户已保存'); dialog.visible = false; await load() } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '保存用户失败') } finally { saving.value = false } }
async function remove(user) { let reason; try { const result = await ElMessageBox.prompt(`确定停用用户“${user.displayName || user.username}”吗？停用后将无法登录，并立即退出当前会话。请填写原因用于审计。`, '停用用户', { confirmButtonText: '确认停用', cancelButtonText: '取消', customClass: ADMIN_MESSAGE_BOX_CLASS, inputPlaceholder: '请填写停用原因（必填）', inputValidator: value => (String(value || '').trim().length > 0 ? true : '请填写停用原因') }); reason = String(result.value || '').trim() } catch { return } try { const { data } = await api.post('/admin/user/delete', { id: user.id, reason }); if (!data.success) throw new Error(data.message || '停用用户失败'); ElMessage.success('用户已停用'); await load() } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '停用用户失败') } }
watch(currentPage, load); watch(status, applyFilters); let timer; watch(keyword, () => { clearTimeout(timer); timer = setTimeout(resetAndLoad, 250) }); onMounted(load)
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
</style>
