import api from '@/axios'

export function fetchAdminReportPage(payload) {
  return api.post('/admin/report/list', payload)
}

export function fetchAdminReportDetail(reportId) {
  return api.post('/admin/report/detail', { reportId: Number(reportId) })
}

/**
 * @param {{reportId: number, action: 'reject'|'confirm', note: string,
 *   hideContent?: boolean, setSpacePrivate?: boolean}} payload
 */
export function processAdminReport(payload) {
  return api.post('/admin/report/process', payload)
}
