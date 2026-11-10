import api from '@/axios'

export function fetchAdminAuditPage(payload) {
  return api.post('/admin/audit/list', payload)
}
