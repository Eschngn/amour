/**
 * 故事正文编辑器配置。
 *
 * 故事正文使用 Markdown 编辑 + 右侧实时预览；粘贴或选择图片时先上传到
 * 现有的 /space/media/upload 接口，再把返回的 URL 以 Markdown 图片语法插入正文，
 * 因此正文里只保存远端地址，不会出现 base64 或 blob 地址。
 */

export const STORY_CONTENT_MAX_LENGTH = 20000

/** 正文图片沿用封面图片的上传限制；最终校验仍以服务端为准。 */
export const STORY_IMAGE_ACCEPTED_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export const STORY_IMAGE_MAX_SIZE = 5 * 1024 * 1024

/** 工具栏保留长文写作常用项，并允许通过工具栏按钮选择图片上传。 */
export const STORY_EDITOR_TOOLBARS = [
  'bold',
  'italic',
  'strikeThrough',
  'title',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  'codeRow',
  'code',
  'link',
  'image',
  '-',
  'revoke',
  'next',
  'preview',
]

/** 页脚展示 Markdown 字数统计。 */
export const STORY_EDITOR_FOOTERS = ['markdownTotal', '=']

export function isStoryContentEmpty(content) {
  return !String(content ?? '').trim()
}

export function isStoryContentTooLong(content) {
  return String(content ?? '').length > STORY_CONTENT_MAX_LENGTH
}

/** 客户端预检：返回可读错误文案，通过时返回空字符串。 */
export function validateStoryImage(file) {
  if (!file || !STORY_IMAGE_ACCEPTED_TYPES.includes(file.type)) {
    return '只支持 JPG、PNG、WebP 或 GIF 图片'
  }
  if (file.size > STORY_IMAGE_MAX_SIZE) {
    return '图片不能超过 5MB'
  }
  return ''
}

/**
 * 批量上传正文图片。
 *
 * 任一图片失败都会让整个上传失败，调用方拿不到部分 URL，
 * 从而避免把无效地址插入正文。
 */
export async function uploadStoryImages(files, upload) {
  const list = Array.from(files ?? [])
  if (!list.length) throw new Error('没有可上传的图片')
  return Promise.all(list.map(async (file) => {
    const invalidMessage = validateStoryImage(file)
    if (invalidMessage) throw new Error(invalidMessage)
    const data = await upload(file)
    const url = typeof data?.url === 'string' ? data.url.trim() : ''
    if (!url) throw new Error('上传成功但没有返回图片地址')
    return url
  }))
}
