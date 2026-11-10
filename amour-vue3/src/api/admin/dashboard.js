import api from '@/axios'

/**
 * 工作台真实指标。没有后端指标支持的数据不在页面展示。
 */
export function fetchAdminDashboardSummary() {
  return api.post('/admin/dashboard/summary')
}
