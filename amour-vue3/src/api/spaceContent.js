import api from '@/axios'

/**
 * 情侣空间内容管理 API 封装。
 *
 * 约定：
 * - 所有接口复用 `@/axios`，认证头与 401 处理由拦截器统一完成；
 * - 目标空间一律由后端根据登录态推导，前端不传 spaceId / userId；
 * - 这里不吞后端错误，调用方统一读取 data.success / data.message 并展示。
 */

/* -------------------- 空间首页 -------------------- */

export function querySpaceHome() {
  return api.post('/space/home/query')
}

/**
 * @param {{ spaceName?: string, description?: string, loveStartTime?: string|null,
 *   configs?: Record<string, string> }} payload
 */
export function saveSpaceHome(payload) {
  return api.post('/space/home/save', payload)
}

/* -------------------- 图片上传 -------------------- */

export function uploadSpaceImage(file) {
  const form = new FormData()
  form.append('file', file)
  return api.post('/space/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/* -------------------- 故事 -------------------- */

export function fetchStoryManageChapters() {
  return api.post('/story/manage/chapters')
}

export function saveStoryManageChapter(payload) {
  return api.post('/story/manage/chapter/save', payload)
}

export function deleteStoryManageChapter(id) {
  return api.post('/story/manage/chapter/delete', { id })
}

export function fetchStoryManageNodes() {
  return api.post('/story/manage/nodes')
}

export function saveStoryManageNode(payload) {
  return api.post('/story/manage/node/save', payload)
}

export function deleteStoryManageNode(id) {
  return api.post('/story/manage/node/delete', { id })
}

/* -------------------- 相册 -------------------- */

export function fetchPhotoManageCategories() {
  return api.post('/photo/manage/categories')
}

export function savePhotoManageCategory(payload) {
  return api.post('/photo/manage/category/save', payload)
}

export function deletePhotoManageCategory(id) {
  return api.post('/photo/manage/category/delete', { id })
}

export function fetchPhotoManagePage(payload = {}) {
  return api.post('/photo/manage/page', payload)
}

export function savePhotoManagePhoto(payload) {
  return api.post('/photo/manage/photo/save', payload)
}

export function deletePhotoManagePhoto(id) {
  return api.post('/photo/manage/photo/delete', { id })
}

/* -------------------- 纪念日 -------------------- */

export function fetchAnniversaryManageList() {
  return api.post('/anniversary/manage/list')
}

export function saveAnniversaryManage(payload) {
  return api.post('/anniversary/manage/save', payload)
}

export function deleteAnniversaryManage(id) {
  return api.post('/anniversary/manage/delete', { id })
}

/* -------------------- 留言（复用现有用户端接口） -------------------- */

export function fetchMessagePage(current, size) {
  return api.post('/message/page', null, { params: { current, size } })
}

export function publishSpaceMessage(content) {
  return api.post('/message/publish', { content })
}

export function replySpaceMessage(payload) {
  return api.post('/message/reply', payload)
}

export function deleteSpaceMessage(messageId) {
  return api.post('/message/delete', { messageId: String(messageId) })
}

export function deleteSpaceMessageReply(replyId) {
  return api.post('/message/reply/delete', { replyId: String(replyId) })
}
