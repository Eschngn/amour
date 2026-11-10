import api from '@/axios'

/**
 * 用户端内容举报。只能举报恋爱广场中已公开的空间或公开内容。
 */
export function submitContentReport(payload) {
  return api.post('/report/submit', payload)
}
