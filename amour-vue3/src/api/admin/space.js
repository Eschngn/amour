import api from '@/axios'

/**
 * 后台情侣空间 API。
 *
 * 权限与管理端登录态统一由 @/axios 的 Authorization 头和 AdminTokenFilter 处理，
 * 这里不额外保存 token，也不吞掉后端错误。
 */

/**
 * 分页查询情侣空间。
 *
 * @param {{ current: number, size: number, keyword?: string, status?: number|null, visibility?: number|null }} payload
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function fetchAdminSpacePage(payload) {
  return api.post('/admin/space/list', payload)
}

/**
 * 空间详情：成员、邀请、生命周期、内容索引与恢复资格。
 */
export function fetchAdminSpaceDetail(spaceId) {
  return api.post('/admin/space/detail', { spaceId: Number(spaceId) })
}

/**
 * 人工恢复双方已解绑（status=5）的情侣空间。必须填写原因，后台会写审计。
 *
 * @param {number} spaceId
 * @param {string} reason
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function restoreAdminSpace(spaceId, reason) {
  return api.post('/admin/space/restore', {
    spaceId: Number(spaceId),
    reason: String(reason || '').trim(),
  })
}
