import type {
  GallerySpaceCard,
  GallerySpaceDetail,
  GallerySpaceMember,
  SpaceAnniversaryView,
  SpaceCardView,
  SpaceDetailView,
  SpaceMemberView,
  SpacePhotoView,
  SpaceStatView,
  SpaceStoryView,
} from '../types/plaza'

/**
 * 恋爱广场数据适配层。
 *
 * 职责：把后端 GallerySpaceCardVO / GallerySpaceDetailVO 转换成扁平、可直接渲染的视图模型。
 * - 这里是唯一处理日期格式、图片地址、可选字段和统计值的地方；
 * - 缺失字段不编造：没有头像 / 封面 / 简介 / 开始时间时返回空值，由组件展示占位或直接省略；
 * - 不做任何网络请求，纯函数便于单测。
 */

const DEFAULT_SPACE_NAME = '未命名的空间'
const MAX_DESCRIPTION_LENGTH = 240
const DAY_MS = 86400000

/** 只接受后端下发的正整数空间标识。 */
export function normalizeSpaceId(value: unknown): string {
  const text = String(value === null || value === undefined ? '' : value).trim()
  if (!/^\d+$/.test(text)) return ''
  const numeric = Number(text)
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return ''
  return String(numeric)
}

/** 合并空白字符：卡片里的简介、标题统一压成单行。 */
export function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

/** 多行文本保留换行，只去掉首尾空白和行内多余空格。 */
export function normalizeMultilineText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 图片地址归一化。
 *
 * 后端只会下发两种地址：OSS 绝对地址，或迁移遗留的站内相对路径（/assets/...）。
 * 小程序 <image> 无法加载相对路径，这里只保留 http(s) 绝对地址；
 * 其余一律返回空字符串，让卡片稳定回退到设计好的占位样式，避免破图。
 */
export function normalizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  if (text.indexOf('//') === 0) return `https:${text}`
  return ''
}

/** 头像 / 昵称占位文字：英文取前两个词首字母，中文取首个字符。 */
export function initialOf(name: unknown): string {
  const text = normalizeText(name)
  if (!text) return ''
  const graphemes = Array.from(text)
  const words = text.split(' ').filter(Boolean)
  if (words.length >= 2 && /^[a-z]/i.test(words[0])) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return graphemes[0] ? graphemes[0].toUpperCase() : ''
}

interface DateParts {
  year: number
  month: number
  day: number
}

/**
 * 解析后端 LocalDateTime / LocalDate 字符串（yyyy-MM-dd HH:mm:ss / yyyy-MM-dd）。
 *
 * 不直接 new Date('2024-05-20 19:30:00')，因为该格式在部分 iOS / 小程序环境解析结果不稳定。
 * 只关心年月日，时间部分允许缺省。
 */
export function parseDateParts(value: unknown): DateParts | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]\d{1,2}:\d{1,2}(?::\d{1,2})?)?/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const utc = Date.UTC(year, month - 1, day)
  const check = new Date(utc)
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null
  }
  return { year, month, day }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function todayParts(now: number): DateParts {
  const date = new Date(now)
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
}

function dayStamp(parts: DateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day)
}

/** 按自然日计算相伴天数；开始时间缺失、非法或晚于今天时返回 null。 */
export function getTogetherDays(startTime: unknown, now: number = Date.now()): number | null {
  const start = parseDateParts(startTime)
  if (!start) return null
  const diff = dayStamp(todayParts(now)) - dayStamp(start)
  if (!Number.isFinite(diff) || diff < 0) return null
  return Math.floor(diff / DAY_MS)
}

/** “今天开始” / “相伴 128 天”；无有效开始时间返回空字符串。 */
export function formatTogetherDays(startTime: unknown, now: number = Date.now()): string {
  const days = getTogetherDays(startTime, now)
  if (days === null) return ''
  return days === 0 ? '今天开始' : `相伴 ${days} 天`
}

/** “始于 2024.05.20”；无有效开始时间返回空字符串。 */
export function formatStartDate(startTime: unknown): string {
  const parts = parseDateParts(startTime)
  if (!parts) return ''
  return `始于 ${parts.year}.${pad2(parts.month)}.${pad2(parts.day)}`
}

/** 日期展示为 2024.05.20，非法时返回空字符串。 */
export function formatDate(value: unknown): string {
  const parts = parseDateParts(value)
  if (!parts) return ''
  return `${parts.year}.${pad2(parts.month)}.${pad2(parts.day)}`
}

/** 只接受真实的非负数字（或数字字符串）；否则返回 null，不强行补 0。 */
export function toOptionalCount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim())
  }
  return null
}

function buildStats(raw: GallerySpaceCard): SpaceStatView[] {
  const defs: Array<{ key: string; label: string; value: unknown }> = [
    { key: 'story', label: '公开故事', value: raw.publicStoryCount },
    { key: 'photo', label: '公开照片', value: raw.publicPhotoCount },
    { key: 'anniversary', label: '公开纪念日', value: raw.publicAnniversaryCount },
  ]
  const stats: SpaceStatView[] = []
  defs.forEach((item) => {
    const count = toOptionalCount(item.value)
    if (count === null) return
    stats.push({ key: item.key, label: item.label, value: String(count) })
  })
  return stats
}

function buildMembers(rawMembers: GallerySpaceMember[] | null | undefined): SpaceMemberView[] {
  if (!Array.isArray(rawMembers)) return []
  const members: SpaceMemberView[] = []
  rawMembers.slice(0, 2).forEach((member, index) => {
    if (!member || typeof member !== 'object') return
    const name = normalizeText(member.displayName)
    const avatarUrl = normalizeImageUrl(member.avatar)
    // 既没有昵称也没有头像的成员没有任何可展示信息，直接跳过，不生成空壳。
    if (!name && !avatarUrl) return
    members.push({
      key: `member-${index}`,
      name,
      avatarUrl,
      initial: initialOf(name),
    })
  })
  return members
}

function buildMemberSummary(members: SpaceMemberView[]): string {
  const names = members.map(member => member.name).filter(Boolean)
  return names.join(' · ')
}

function buildRecentText(raw: GallerySpaceCard): string {
  const storyTitle = raw.latestStory && typeof raw.latestStory === 'object'
    ? normalizeText(raw.latestStory.title)
    : ''
  if (storyTitle) return `最近更新 · ${storyTitle}`

  const photos = Array.isArray(raw.latestPhotos) ? raw.latestPhotos : []
  const photoTitle = photos.length ? normalizeText(photos[0] && photos[0].title) : ''
  if (photoTitle) return `最新照片 · ${photoTitle}`

  const anniversaries = Array.isArray(raw.latestAnniversaries) ? raw.latestAnniversaries : []
  const anniversaryTitle = anniversaries.length
    ? normalizeText(anniversaries[0] && anniversaries[0].title)
    : ''
  if (anniversaryTitle) return `纪念日 · ${anniversaryTitle}`

  return ''
}

/**
 * 列表卡片适配。
 *
 * 返回 null 表示这条记录没有可用空间标识，无法导航，直接丢弃而不是渲染不可点击的卡片。
 */
export function adaptSpaceCard(raw: GallerySpaceCard | null | undefined, now: number = Date.now()): SpaceCardView | null {
  if (!raw || typeof raw !== 'object') return null
  const spaceId = normalizeSpaceId(raw.spaceId)
  if (!spaceId) return null

  const spaceName = normalizeText(raw.spaceName) || DEFAULT_SPACE_NAME
  const description = normalizeText(raw.description).slice(0, MAX_DESCRIPTION_LENGTH)
  const coverUrl = normalizeImageUrl(raw.coverImage)
  const members = buildMembers(raw.members)
  const memberSummary = buildMemberSummary(members)
  const stats = buildStats(raw)

  return {
    spaceId,
    spaceName,
    description,
    coverUrl,
    members,
    memberSummary,
    togetherDays: formatTogetherDays(raw.loveStartTime, now),
    startDateText: formatStartDate(raw.loveStartTime),
    stats,
    recentText: buildRecentText(raw),
    ariaLabel: memberSummary ? `查看${spaceName}的公开空间，${memberSummary}` : `查看${spaceName}的公开空间`,
  }
}

/** 把分页记录批量适配，并按 spaceId 去重（保留首次出现的顺序）。 */
export function adaptSpaceCards(records: unknown, now: number = Date.now()): SpaceCardView[] {
  if (!Array.isArray(records)) return []
  const seen: Record<string, true> = {}
  const cards: SpaceCardView[] = []
  records.forEach((record) => {
    const card = adaptSpaceCard(record as GallerySpaceCard, now)
    if (!card || seen[card.spaceId]) return
    seen[card.spaceId] = true
    cards.push(card)
  })
  return cards
}

/* ============================ 详情页适配 ============================ */

function buildStories(raw: GallerySpaceDetail): SpaceStoryView[] {
  const list = Array.isArray(raw.stories) ? raw.stories : []
  const stories: SpaceStoryView[] = []
  list.forEach((story) => {
    if (!story || typeof story !== 'object') return
    const storyId = normalizeSpaceId(story.storyId)
    if (!storyId) return
    const summary = normalizeText(story.summary) || normalizeText(story.contentPreview)
    stories.push({
      storyId,
      title: normalizeText(story.title) || '未命名故事',
      summary,
      dateText: formatDate(story.happenedTime),
      location: normalizeText(story.location),
      tagLabel: normalizeText(story.tagLabel),
      coverUrl: normalizeImageUrl(story.coverImage),
    })
  })
  return stories
}

function buildPhotos(raw: GallerySpaceDetail): SpacePhotoView[] {
  const list = Array.isArray(raw.photos) ? raw.photos : []
  const photos: SpacePhotoView[] = []
  list.forEach((photo) => {
    if (!photo || typeof photo !== 'object') return
    const photoId = normalizeSpaceId(photo.photoId)
    const url = normalizeImageUrl(photo.url)
    if (!photoId || !url) return
    photos.push({
      photoId,
      title: normalizeText(photo.title) || '未命名照片',
      description: normalizeText(photo.description),
      url,
    })
  })
  return photos
}

function buildAnniversaries(raw: GallerySpaceDetail): SpaceAnniversaryView[] {
  const list = Array.isArray(raw.anniversaries) ? raw.anniversaries : []
  const anniversaries: SpaceAnniversaryView[] = []
  list.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const anniversaryId = normalizeSpaceId(item.anniversaryId)
    if (!anniversaryId) return
    anniversaries.push({
      anniversaryId,
      title: normalizeText(item.title) || '未命名纪念日',
      description: normalizeText(item.description),
      dateText: formatDate(item.anniversaryDate),
      location: normalizeText(item.location),
    })
  })
  return anniversaries
}

/** 详情适配：卡片字段复用列表适配逻辑，再补充公开故事 / 照片 / 纪念日。 */
export function adaptSpaceDetail(raw: GallerySpaceDetail | null | undefined, now: number = Date.now()): SpaceDetailView | null {
  if (!raw || typeof raw !== 'object') return null
  const spaceId = normalizeSpaceId(raw.spaceId)
  if (!spaceId) return null
  const spaceName = normalizeText(raw.spaceName) || DEFAULT_SPACE_NAME
  const members = buildMembers(raw.members)
  const memberSummary = buildMemberSummary(members)

  return {
    spaceId,
    spaceName,
    description: normalizeMultilineText(raw.description).slice(0, MAX_DESCRIPTION_LENGTH),
    coverUrl: normalizeImageUrl(raw.coverImage),
    members,
    memberSummary,
    togetherDays: formatTogetherDays(raw.loveStartTime, now),
    startDateText: formatStartDate(raw.loveStartTime),
    stats: buildStats(raw),
    stories: buildStories(raw),
    photos: buildPhotos(raw),
    anniversaries: buildAnniversaries(raw),
  }
}
