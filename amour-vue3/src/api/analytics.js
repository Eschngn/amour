import api from '@/axios'

/**
 * 用户侧页面浏览上报。
 *
 * 调用方不得等待该请求，也不要在失败时重试或提示用户：
 * 统计采集不能影响页面访问主流程。
 *
 * payload 固定包含：pageKey（白名单页面键）、visitorId（第一方随机访客 ID）、
 * eventId（客户端幂等键）、clientType（渠道，网页端固定为 'web'）。
 * 渠道只是统计维度，服务端会按白名单校验，不用于鉴权。
 */
export function reportPageView(payload) {
  return api.post('/analytics/page-view', payload)
}
