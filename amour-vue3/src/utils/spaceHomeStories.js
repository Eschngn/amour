/**
 * 情侣空间首页故事数据。
 *
 * 首页需要展示“当前空间已有的故事”，而不是只展示勾选了里程碑的故事：
 * - /story/overview 提供按 sort_order 升序的可见章节；
 * - /story/getStoryByChapterId 提供章节内按发生时间升序的可见故事。
 *
 * 这里把两个接口组合成完整列表，章节顺序优先，章节内沿用发生时间排序。
 */

/** 首页故事区域最多展示 4 条。 */
export const HOME_STORY_LIMIT = 4

function readSuccessPayload(response, fallback) {
  const body = response?.data
  if (!body?.success) {
    const error = new Error(body?.message || fallback)
    error.errorCode = body?.errorCode
    throw error
  }
  return body.data
}

function chapterSortValue(chapter) {
  const value = Number(chapter?.sortOrder)
  return Number.isFinite(value) ? value : null
}

/** 章节顺序以 sort_order 为准，缺失时保留接口返回顺序（Array#sort 稳定）。 */
function compareChapters(left, right) {
  const leftOrder = chapterSortValue(left)
  const rightOrder = chapterSortValue(right)
  if (leftOrder === null || rightOrder === null) return 0
  return leftOrder - rightOrder
}

function happenedTimeValue(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const timestamp = Date.parse(text.includes('T') ? text : text.replace(' ', 'T'))
  return Number.isFinite(timestamp) ? timestamp : null
}

function storyIdValue(story) {
  const value = Number(story?.id)
  return Number.isFinite(value) ? value : 0
}

/** 章节内顺序：发生时间升序（空值最后），同一时间按故事 ID 升序。 */
function compareStories(left, right) {
  const leftTime = happenedTimeValue(left?.happenedTime)
  const rightTime = happenedTimeValue(right?.happenedTime)
  if (leftTime !== rightTime) {
    if (leftTime === null) return 1
    if (rightTime === null) return -1
    return leftTime - rightTime
  }
  return storyIdValue(left) - storyIdValue(right)
}

/** 只透出首页模板真正使用的字段，避免把管理字段带到展示页。 */
export function normalizeHomeStory(story) {
  return {
    id: story?.id,
    title: story?.title || '',
    summary: story?.summary || '',
    happenedTime: story?.happenedTime || '',
    showTime: story?.showTime !== false,
    coverImage: story?.coverImage || '',
  }
}

/**
 * 读取当前空间全部可见故事。
 *
 * 接口失败会向上抛出，调用方必须区分“加载失败”和“确实没有故事”，
 * 不能把失败当成空列表展示“故事正等待被写下”。
 *
 * @param {{
 *   fetchOverview: () => Promise<object>,
 *   fetchChapterStories: (chapterId: number|string) => Promise<object>,
 * }} options
 * @returns {Promise<Array<{ id: *, title: string, summary: string, happenedTime: string, coverImage: string }>>}
 */
export async function loadSpaceHomeStories({ fetchOverview, fetchChapterStories } = {}) {
  if (typeof fetchOverview !== 'function' || typeof fetchChapterStories !== 'function') {
    throw new TypeError('缺少故事接口调用方法')
  }

  const overview = readSuccessPayload(await fetchOverview(), '故事加载失败')
  const chapters = Array.isArray(overview?.chapters) ? overview.chapters.slice() : []
  if (!chapters.length) return []

  // 保持章节顺序并发请求，Promise.all 的结果顺序与提交顺序一致。
  const chapterStoryGroups = await Promise.all(
    chapters.sort(compareChapters).map(async (chapter) => {
      const nodes = readSuccessPayload(
        await fetchChapterStories(chapter.id),
        '故事加载失败',
      )
      return Array.isArray(nodes) ? nodes.slice().sort(compareStories) : []
    }),
  )

  return chapterStoryGroups.flat().map(normalizeHomeStory)
}
