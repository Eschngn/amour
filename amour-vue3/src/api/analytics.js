import api from '@/axios'

/**
 * 用户侧页面浏览上报。
 *
 * 调用方不得等待该请求，也不要在失败时重试或提示用户：
 * 统计采集不能影响页面访问主流程。
 */
export function reportPageView(payload) {
  return api.post('/analytics/page-view', payload)
}
