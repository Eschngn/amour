import api from '@/axios'

/**
 * 恋爱广场公开空间分页。
 *
 * @param {{ current?: number, size?: number }} params
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function fetchPublicSpaces(params = {}) {
  const query = params || {}
  return api.post('/gallery/spaces', {
    current: query.current ?? 1,
    size: query.size ?? 10,
  })
}

/**
 * 恋爱广场公开空间详情。
 *
 * @param {number|string} spaceId
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export function fetchPublicSpaceDetail(spaceId) {
  return api.post('/gallery/space/detail', { spaceId })
}
