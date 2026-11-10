import api from '@/axios'

/**
 * 内容治理 API。所有写操作必须带 spaceId、visibility/原因。
 * 前端不提供代用户新增/编辑正文的能力。
 */

export function fetchAdminContentPage(payload) {
  return api.post('/admin/content/list', payload)
}

export function fetchAdminContentDetail(payload) {
  return api.post('/admin/content/detail', payload)
}

/**
 * @param {{contentType: string, contentId: number, spaceId: number, visibility: 0|2, reason: string}} payload
 */
export function moderateAdminContentVisibility(payload) {
  return api.post('/admin/content/moderate', payload)
}

/**
 * @param {{contentType: string, contentId: number, spaceId: number, reason: string}} payload
 */
export function deleteAdminContent(payload) {
  return api.post('/admin/content/delete', payload)
}

export function fetchAdminPhotoCategories(spaceId) {
  return api.post('/admin/photo/category/list', { spaceId: Number(spaceId) })
}
