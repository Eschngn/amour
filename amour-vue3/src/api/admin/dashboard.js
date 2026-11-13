import api from '@/axios'

/**
 * 工作台真实指标。没有后端指标支持的数据不在页面展示。
 */
export function fetchAdminDashboardSummary() {
  return api.post('/admin/dashboard/summary')
}

/**
 * 页面浏览活跃度趋势。startDate/endDate 为 yyyy-MM-dd，服务端按 Asia/Shanghai 切分。
 */
export function fetchAdminDashboardActivity(payload) {
  return api.post('/admin/dashboard/activity', payload)
}
