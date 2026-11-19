/**
 * 小程序空间内容编辑接口封装。
 *
 * 约定：
 * - 复用 utils/request 的 post / get / uploadFile（token、401、候选地址与超时都在请求层完成）；
 * - 目标空间由后端按登录态推导，客户端不传 spaceId / userId；
 * - 字段与后端 VO / 控制器保持一致，不自行发明接口。
 */
const { get, post, uploadFile } = require('./request')

/* -------------------- 空间首页 -------------------- */

function querySpaceHome() {
  return post('/space/home/query')
}

function saveSpaceHome(payload) {
  return post('/space/home/save', payload || {})
}

/* -------------------- 图片上传 -------------------- */

/** 返回后端 UploadImageRspVO（{ url }）。 */
function uploadSpaceImage(filePath) {
  return uploadFile('/space/media/upload', filePath, 'file').then((data) => {
    const url = data && typeof data.url === 'string' ? data.url.trim() : ''
    if (!url) throw new Error('图片上传成功，但没有返回可用地址')
    return url
  })
}

/* -------------------- 故事 -------------------- */

function fetchStoryChapters() {
  return post('/story/manage/chapters').then(data => (Array.isArray(data) ? data : []))
}

function saveStoryChapter(payload) {
  return post('/story/manage/chapter/save', payload)
}

function saveStoryChapterOrder(items) {
  return post('/story/manage/chapter/order', { items })
}

function deleteStoryChapter(id) {
  return post('/story/manage/chapter/delete', { id })
}

function fetchStoryNodes() {
  return post('/story/manage/nodes').then(data => (Array.isArray(data) ? data : []))
}

function saveStoryNode(payload) {
  return post('/story/manage/node/save', payload)
}

function saveStoryNodeOrder(chapterId, items) {
  return post('/story/manage/node/order', { chapterId, items })
}

function saveStoryNodeGlobalOrder(items) {
  return post('/story/manage/node/global-order', { items })
}

function deleteStoryNode(id) {
  return post('/story/manage/node/delete', { id })
}

/* -------------------- 相册 -------------------- */

function fetchPhotoCategories() {
  return post('/photo/manage/categories').then(data => (Array.isArray(data) ? data : []))
}

function savePhotoCategory(payload) {
  return post('/photo/manage/category/save', payload)
}

function savePhotoCategoryOrder(items) {
  return post('/photo/manage/category/order', { items })
}

function deletePhotoCategory(id) {
  return post('/photo/manage/category/delete', { id })
}

function fetchPhotoManagePage(current, size, categoryId) {
  const body = { current, size }
  if (categoryId) body.photoCategoryId = categoryId
  return post('/photo/manage/page', body)
}

function fetchPhotoSortList(categoryId) {
  return post('/photo/manage/photo/sort-list', { categoryId: categoryId || null })
}

function savePhoto(payload) {
  return post('/photo/manage/photo/save', payload)
}

function savePhotoOrder(categoryId, items) {
  return post('/photo/manage/photo/order', { categoryId, items })
}

function savePhotoGlobalOrder(items) {
  return post('/photo/manage/photo/global-order', { items })
}

function deletePhoto(id) {
  return post('/photo/manage/photo/delete', { id })
}

/* -------------------- 纪念日 -------------------- */

function fetchAnniversaries() {
  return post('/anniversary/manage/list').then(data => (Array.isArray(data) ? data : []))
}

function saveAnniversary(payload) {
  return post('/anniversary/manage/save', payload)
}

function saveAnniversaryOrder(items) {
  return post('/anniversary/manage/order', { items })
}

function deleteAnniversary(id) {
  return post('/anniversary/manage/delete', { id })
}

/* -------------------- 留言（复用现有用户端接口） -------------------- */

/** 后端 MessageController 用 query 参数绑定 current / size。 */
function buildMessagePagePath(current, size) {
  const page = Number.isFinite(Number(current)) && Number(current) > 0 ? Number(current) : 1
  const pageSize = Number.isFinite(Number(size)) && Number(size) > 0 ? Number(size) : 10
  return `/message/page?current=${encodeURIComponent(page)}&size=${encodeURIComponent(pageSize)}`
}

function fetchMessagePage(current, size) {
  return post(buildMessagePagePath(current, size))
}

function publishMessage(content) {
  return post('/message/publish', { content })
}

function replyMessage(payload) {
  return post('/message/reply', payload)
}

function deleteMessage(messageId) {
  return post('/message/delete', { messageId: String(messageId) })
}

function deleteMessageReply(replyId) {
  return post('/message/reply/delete', { replyId: String(replyId) })
}

/* -------------------- 公开审核 -------------------- */

function fetchSpaceReviewStatus() {
  return get('/space/review/status')
}

function resubmitSpaceReview() {
  return post('/space/review/resubmit')
}

module.exports = {
  querySpaceHome,
  saveSpaceHome,
  uploadSpaceImage,
  fetchStoryChapters,
  saveStoryChapter,
  saveStoryChapterOrder,
  deleteStoryChapter,
  fetchStoryNodes,
  saveStoryNode,
  saveStoryNodeOrder,
  saveStoryNodeGlobalOrder,
  deleteStoryNode,
  fetchPhotoCategories,
  savePhotoCategory,
  savePhotoCategoryOrder,
  deletePhotoCategory,
  fetchPhotoManagePage,
  fetchPhotoSortList,
  savePhoto,
  savePhotoOrder,
  savePhotoGlobalOrder,
  deletePhoto,
  fetchAnniversaries,
  saveAnniversary,
  saveAnniversaryOrder,
  deleteAnniversary,
  buildMessagePagePath,
  fetchMessagePage,
  publishMessage,
  replyMessage,
  deleteMessage,
  deleteMessageReply,
  fetchSpaceReviewStatus,
  resubmitSpaceReview,
}
