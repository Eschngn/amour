import api from '@/axios'

/**
 * 当前管理员的有效权限键。
 * 只用于菜单/路由/按钮显隐；真正的授权边界在后端。
 */
export function fetchAdminPermissions() {
  return api.post('/admin/auth/permissions')
}
