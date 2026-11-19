import { formatSpaceContentDateTime } from './spaceFormat.js'

/**
 * 图片大图预览的数据归一化工具。
 *
 * 这里只做纯数据转换，方便在 Node 测试中直接验证：
 * - 过滤空地址与不安全协议，避免 javascript: 等地址进入 img src；
 * - 统一补齐标题、描述、元信息与 alt，组件只负责渲染；
 * - 管理台按“当前图片 / 待审核图片”分组生成 alt，便于审核人员区分版本。
 */

const SAFE_IMAGE_SRC_PATTERN = /^(https?:\/\/|\/)[^\s]*$/i
const DEFAULT_IMAGE_ALT = '图片预览'

function toText(value) {
  return String(value ?? '').trim()
}

/** 只允许 http(s) 或站内相对路径作为大图地址。 */
export function isPreviewableImageSrc(value) {
  const text = toText(value)
  return text.length > 0 && SAFE_IMAGE_SRC_PATTERN.test(text)
}

function normalizePreviewImage(raw, fallbackAlt = DEFAULT_IMAGE_ALT) {
  const source = typeof raw === 'string' ? { src: raw } : raw
  if (!source || typeof source !== 'object') return null

  const src = toText(source.src ?? source.url)
  if (!isPreviewableImageSrc(src)) return null

  const title = toText(source.title)
  const alt = toText(source.alt) || title || fallbackAlt

  return {
    id: source.id ?? null,
    src,
    alt,
    title: title || alt,
    description: toText(source.description),
    meta: toText(source.meta),
  }
}

/**
 * 统一 images 数组与旧的单图 src 调用方式。
 *
 * @param {{
 *   images?: Array<{ id?: unknown, src?: string, url?: string, alt?: string, title?: string, description?: string, meta?: string }>,
 *   src?: string,
 *   alt?: string,
 *   title?: string,
 *   description?: string,
 *   meta?: string,
 * }} options
 * @returns {Array<{ id: unknown, src: string, alt: string, title: string, description: string, meta: string }>}
 */
export function normalizePreviewImages(options = {}) {
  const fallbackAlt = toText(options.alt) || DEFAULT_IMAGE_ALT
  const list = Array.isArray(options.images) ? options.images : []
  const normalized = list
    .map(item => normalizePreviewImage(item, fallbackAlt))
    .filter(Boolean)

  if (normalized.length) return normalized

  const legacy = normalizePreviewImage({
    src: options.src,
    alt: options.alt,
    title: options.title,
    description: options.description,
    meta: options.meta,
  }, fallbackAlt)
  return legacy ? [legacy] : []
}

/** 把任意索引收敛到 [0, total - 1]，空列表返回 0。 */
export function resolvePreviewIndex(value, total) {
  const size = Number.isFinite(total) ? Math.floor(total) : 0
  if (size <= 0) return 0
  const index = Number(value)
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(Math.floor(index), 0), size - 1)
}

/** 上一张 / 下一张：首尾循环，单图时保持 0。 */
export function stepPreviewIndex(current, delta, total) {
  const size = Number.isFinite(total) ? Math.floor(total) : 0
  if (size <= 1) return 0
  const index = resolvePreviewIndex(current, size)
  const step = Number.isFinite(delta) ? Math.trunc(delta) : 0
  return (index + step + size) % size
}

/**
 * 管理台审核详情图片：按分组过滤空地址，生成包含标题与版本说明的 alt。
 *
 * @param {object} item 审核项
 * @param {'before'|'after'} group before=当前已发布版本，after=待审核版本
 */
export function buildReviewImagePreviews(item, group = 'after') {
  const isBefore = group === 'before'
  const groupLabel = isBefore ? '当前图片' : '待审核图片'
  const rawList = isBefore ? item?.beforeImages : item?.afterImages
  const summary = isBefore ? item?.beforeSummary : item?.afterSummary
  const sourceTitle = toText(item?.title) || toText(item?.itemTypeText) || '审核内容'
  const sources = (Array.isArray(rawList) ? rawList : [])
    .map(toText)
    .filter(isPreviewableImageSrc)

  return sources.map((src, index) => ({
    id: item?.itemId ?? null,
    src,
    alt: `${sourceTitle} · ${groupLabel}${sources.length > 1 ? ` ${index + 1}` : ''}`,
    title: `${sourceTitle} · ${groupLabel}`,
    description: toText(summary?.subtitle),
    meta: [toText(item?.itemTypeText), groupLabel].filter(Boolean).join(' · '),
  }))
}

/**
 * 恋爱广场公开照片：只取展示需要的字段，不引入任何后台管理字段。
 *
 * @param {Array<Record<string, unknown>>} photos
 */
export function buildPublicPhotoPreviews(photos) {
  const list = Array.isArray(photos) ? photos : []
  return list
    .map(photo => {
      const src = toText(photo?.url)
      if (!isPreviewableImageSrc(src)) return null

      const description = toText(photo?.description)
      const rawTitle = toText(photo?.title)
      const title = rawTitle || '未命名照片'
      // 没有标题时用描述摘要作为 alt，仍为空时使用通用文本；不把内部 ID 暴露给用户。
      const alt = rawTitle || (description ? `照片描述：${description.slice(0, 80)}` : '公开照片')
      const takenDate = formatSpaceContentDateTime(photo?.takenTime, photo?.showTime, '')
      const location = toText(photo?.location)
      const meta = [takenDate ? `拍摄于 ${takenDate}` : '', location].filter(Boolean).join(' · ')

      return {
        id: photo?.photoId ?? null,
        src,
        alt,
        title,
        description,
        meta,
      }
    })
    .filter(Boolean)
}
