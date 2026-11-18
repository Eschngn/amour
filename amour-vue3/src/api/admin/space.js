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
 * 成功时 data 包含恢复后的空间状态、恢复成员数、撤销邀请数以及被安全关闭的
 * 冲突空间列表；若冲突空间已有其他有效成员，后端返回 20090 并拒绝整笔恢复。
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

/**
 * 分页查询「已销毁空间留档」。
 *
 * 默认只看尚未恢复的留档；restored=true 时查看已恢复的历史留档。
 * 与空间列表相同，权限由 @/axios 的认证头 + AdminTokenFilter + AdminPermissionInterceptor
 * （admin:space:query）保证，前端只做展示。
 *
 * @param {{ current: number, size: number, keyword?: string, spaceId?: number|null, restored?: boolean|null }} payload
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function fetchAdminSpaceArchivePage(payload) {
  return api.post('/admin/space/archive/list', payload)
}

/**
 * 查询单条销毁留档详情：完整性、恢复资格与冲突情况。
 *
 * @param {number|string} archiveId
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function fetchAdminSpaceArchiveDetail(archiveId) {
  return api.post('/admin/space/archive/detail', { archiveId: Number(archiveId) })
}

/**
 * 管理员从销毁留档恢复空间。必须填写原因，后台会写审计。
 *
 * 权限要求 admin:space:restore（查询权限不能用于恢复）。成功返回恢复后的状态、
 * 恢复成员数；成员已加入其它空间等冲突会返回 20100 并拒绝整笔恢复，不覆盖现存数据。
 *
 * @param {number|string} archiveId
 * @param {string} reason
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function restoreAdminSpaceFromArchive(archiveId, reason) {
  return api.post('/admin/space/archive/restore', {
    archiveId: Number(archiveId),
    reason: String(reason || '').trim(),
  })
}
