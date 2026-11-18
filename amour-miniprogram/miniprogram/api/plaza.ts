import { ApiError, post } from '../utils/request'
import {
  createPlazaError,
  isPlazaError,
  toPlazaError,
} from '../utils/plaza-error'
import type { PlazaError } from '../utils/plaza-error'
import type {
  GallerySpaceCard,
  GallerySpaceDetail,
  GalleryStoryDetail,
  PageResult,
  PlazaPageQuery,
} from '../types/plaza'

/**
 * 恋爱广场接口层。
 *
 * 约定：
 * - 复用 utils/request 的 post，token 注入 / 401 处理都在请求层完成，本文件不读取 token；
 * - 只访问后端公开只读接口 /gallery/**；这些接口匿名可访问，
 *   因此进入广场不触发微信登录；
 * - 返回值是后端 Response.data 解包后的业务数据，页面只消费业务结构；
 * - 错误统一转换成 utils/plaza-error 的 PlazaError，页面据 retryable / unavailable 区分文案。
 *
 * 后端契约（amour-web GalleryController）：
 *   POST /gallery/spaces             body { current, size }         → PageResult<GallerySpaceCardVO>
 *   POST /gallery/space/detail       body { spaceId }               → GallerySpaceDetailVO
 *   POST /gallery/space/story/detail body { spaceId, storyId }      → GalleryStoryDetailVO
 */

/** 列表默认每页条数；后端把 size 限制在 1~50。 */
export const PLAZA_PAGE_SIZE = 8

const LIST_MESSAGE = '恋爱广场加载失败了，请稍后重试'
const DETAIL_MESSAGE = '这个公开空间暂时无法打开'
const INVALID_DETAIL_MESSAGE = '空间编号无效，请从恋爱广场重新进入'
const STORY_MESSAGE = '这篇公开故事暂时无法阅读'
const INVALID_STORY_MESSAGE = '故事编号无效，请返回公开空间重新打开'

export type { PlazaError }

/** 请求层错误 → 广场错误：保留请求层的状态码与业务错误码。 */
function normalizeRequestError(error: unknown, fallback: string): PlazaError {
  if (isPlazaError(error)) return error
  if (error instanceof ApiError) {
    return toPlazaError({
      message: error.message,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
    }, fallback)
  }
  if (error && typeof error === 'object') {
    const source = error as { message?: string; attempts?: string[] }
    return toPlazaError({
      message: typeof source.message === 'string' ? source.message : '',
      statusCode: 0,
      attempts: Array.isArray(source.attempts) ? source.attempts : [],
    }, fallback)
  }
  return toPlazaError(error, fallback)
}

/** 列表分页查询。current 从 1 开始。 */
export async function fetchPlazaSpaces(query: PlazaPageQuery): Promise<PageResult<GallerySpaceCard>> {
  const current = Math.max(1, Math.floor(Number(query && query.current) || 1))
  const size = Math.max(1, Math.floor(Number(query && query.size) || PLAZA_PAGE_SIZE))
  let result: PageResult<GallerySpaceCard>
  try {
    result = await post<PageResult<GallerySpaceCard>>('/gallery/spaces', { current, size })
  } catch (error) {
    throw normalizeRequestError(error, LIST_MESSAGE)
  }
  if (!result || typeof result !== 'object' || !Array.isArray(result.records)) {
    throw createPlazaError(LIST_MESSAGE, { retryable: true })
  }
  return result
}

/** 公开空间详情。spaceId 必须是后端下发的正整数标识。 */
export async function fetchPlazaSpaceDetail(spaceId: string | number): Promise<GallerySpaceDetail> {
  const normalized = String(spaceId === null || spaceId === undefined ? '' : spaceId).trim()
  if (!/^\d+$/.test(normalized) || Number(normalized) <= 0) {
    throw createPlazaError(INVALID_DETAIL_MESSAGE, { retryable: false, unavailable: true })
  }
  let detail: GallerySpaceDetail
  try {
    detail = await post<GallerySpaceDetail>('/gallery/space/detail', {
      spaceId: Number(normalized),
    })
  } catch (error) {
    throw normalizeRequestError(error, DETAIL_MESSAGE)
  }
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
    throw createPlazaError(DETAIL_MESSAGE, { retryable: true })
  }
  return detail
}

/**
 * 公开故事正文详情。
 *
 * 必须同时携带 spaceId 与 storyId：后端只在对应公开空间的已发布快照内查找故事，
 * 不会按 storyId 直查当前故事表，因此私密故事、其它空间的故事都拿不到。
 */
export async function fetchPlazaStoryDetail(
  spaceId: string | number,
  storyId: string | number,
): Promise<GalleryStoryDetail> {
  const normalizedSpaceId = String(spaceId === null || spaceId === undefined ? '' : spaceId).trim()
  const normalizedStoryId = String(storyId === null || storyId === undefined ? '' : storyId).trim()
  if (!/^\d+$/.test(normalizedSpaceId) || Number(normalizedSpaceId) <= 0) {
    throw createPlazaError(INVALID_DETAIL_MESSAGE, { retryable: false, unavailable: true })
  }
  if (!/^\d+$/.test(normalizedStoryId) || Number(normalizedStoryId) <= 0) {
    throw createPlazaError(INVALID_STORY_MESSAGE, { retryable: false, unavailable: true })
  }
  let story: GalleryStoryDetail
  try {
    story = await post<GalleryStoryDetail>('/gallery/space/story/detail', {
      spaceId: Number(normalizedSpaceId),
      storyId: Number(normalizedStoryId),
    })
  } catch (error) {
    throw normalizeRequestError(error, STORY_MESSAGE)
  }
  if (!story || typeof story !== 'object' || Array.isArray(story)) {
    throw createPlazaError(STORY_MESSAGE, { retryable: true })
  }
  return story
}

