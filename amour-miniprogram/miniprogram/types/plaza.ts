/**
 * 恋爱广场（公开空间）数据类型。
 *
 * 字段以 amour-springboot GalleryController / GallerySpaceCardVO 为准：
 * - POST /gallery/spaces             → PageResult<GallerySpaceCardVO>
 * - POST /gallery/space/detail       → GallerySpaceDetailVO
 * - POST /gallery/space/story/detail → GalleryStoryDetailVO
 * 这些接口匿名可访问，只返回后端审核通过并公开的字段，
 * 前端不补充成员资料、不读取工作版本内容。
 *
 * 注意：小程序端与请求层约定保持一致，全部使用 camelCase 字段名。
 */

/** 后端 PageResult<T>。current/size/total 可能以数字或数字字符串下发。 */
export interface PageResult<T> {
  current?: number | string | null
  size?: number | string | null
  total?: number | string | null
  records?: T[] | null
}

/** 公开空间成员。后端只下发展示名、头像与角色，不含 userId / amourId。 */
export interface GallerySpaceMember {
  displayName?: string | null
  avatar?: string | null
  /** 1-空间发起人 2-另一半 */
  memberRole?: number | string | null
}

/** 公开故事摘要（空间卡片 latestStory 与详情弹层共用）。 */
export interface GalleryStorySummary {
  storyId?: number | string | null
  title?: string | null
  summary?: string | null
  happenedTime?: string | null
  coverImage?: string | null
  tagLabel?: string | null
  isMilestone?: boolean | null
}

/** 公开照片。 */
export interface GalleryPhoto {
  photoId?: number | string | null
  title?: string | null
  description?: string | null
  url?: string | null
  takenTime?: string | null
  location?: string | null
  isCover?: boolean | null
}

/** 公开纪念日。 */
export interface GalleryAnniversary {
  anniversaryId?: number | string | null
  title?: string | null
  description?: string | null
  anniversaryDate?: string | null
  repeatType?: number | string | null
  category?: string | null
  location?: string | null
}

/** 恋爱广场列表卡片（GallerySpaceCardVO）。 */
export interface GallerySpaceCard {
  spaceId?: number | string | null
  spaceName?: string | null
  description?: string | null
  coverImage?: string | null
  loveStartTime?: string | null
  memberCount?: number | string | null
  members?: GallerySpaceMember[] | null
  publicStoryCount?: number | string | null
  publicPhotoCount?: number | string | null
  publicAnniversaryCount?: number | string | null
  latestStory?: GalleryStorySummary | null
  latestPhotos?: GalleryPhoto[] | null
  latestAnniversaries?: GalleryAnniversary[] | null
}

/** 公开空间详情（GallerySpaceDetailVO）：卡片字段 + 公开内容列表。 */
export interface GallerySpaceDetail extends GallerySpaceCard {
  stories?: GalleryStoryListItem[] | null
  photos?: GalleryPhoto[] | null
  anniversaries?: GalleryAnniversary[] | null
}

/** 详情页故事列表项：只含摘要与正文预览，完整正文需另行按需读取。 */
export interface GalleryStoryListItem {
  storyId?: number | string | null
  title?: string | null
  summary?: string | null
  contentPreview?: string | null
  contentLength?: number | string | null
  hasContent?: boolean | null
  happenedTime?: string | null
  location?: string | null
  coverImage?: string | null
  tagLabel?: string | null
  isMilestone?: boolean | null
}

/**
 * 公开故事正文（GalleryStoryDetailVO）。
 *
 * 由 POST /gallery/space/story/detail 按 spaceId + storyId 单独读取：
 * 空间详情的故事列表只有摘要与正文预览，完整正文必须按需加载。
 * 接口不返回成员、审核、章节等私密或后台字段。
 */
export interface GalleryStoryDetail {
  storyId?: number | string | null
  title?: string | null
  summary?: string | null
  content?: string | null
  happenedTime?: string | null
  location?: string | null
  coverImage?: string | null
  tagLabel?: string | null
  isMilestone?: boolean | null
}

/** 广场列表请求参数，对应 GallerySpacePageQueryReqVO。 */
export interface PlazaPageQuery {
  current: number
  size: number
}

/* ============================ 页面展示模型 ============================ */
/* 以下类型只描述 WXML 直接消费的扁平结构，与接口结构解耦。 */

/** 卡片的双方展示位：始终保留两个槽位，缺失一方时用占位代替。 */
export interface SpaceMemberView {
  /** 稳定 key，用于 wx:key */
  key: string
  name: string
  avatarUrl: string
  initial: string
}

/** 卡片统计项：只有真实字段存在时才生成，缺失时整项不展示。 */
export interface SpaceStatView {
  key: string
  label: string
  value: string
}

/** 公开空间卡片展示模型。 */
export interface SpaceCardView {
  /** 稳定标识，同时作为 wx:key 与导航参数 */
  spaceId: string
  spaceName: string
  description: string
  coverUrl: string
  members: SpaceMemberView[]
  /** 双方展示名拼接，例如“橙子 · 子怡”；为空时不展示 */
  memberSummary: string
  togetherDays: string
  startDateText: string
  stats: SpaceStatView[]
  /** 最新公开内容的一句摘要，无数据时为空字符串 */
  recentText: string
  /** 无障碍读屏文本 */
  ariaLabel: string
}

/** 详情页展示模型。 */
export interface SpaceDetailView {
  spaceId: string
  spaceName: string
  description: string
  coverUrl: string
  members: SpaceMemberView[]
  memberSummary: string
  togetherDays: string
  startDateText: string
  stats: SpaceStatView[]
  stories: SpaceStoryView[]
  photos: SpacePhotoView[]
  anniversaries: SpaceAnniversaryView[]
}

export interface SpaceStoryView {
  storyId: string
  title: string
  summary: string
  dateText: string
  location: string
  tagLabel: string
  coverUrl: string
  /** 是否有完整正文；为 false 时列表不提供“阅读全文”入口 */
  hasContent: boolean
  /** 去掉 Markdown 标记的正文预览，摘要为空时作为列表文案 */
  contentPreview: string
  /** 正文长度（去空白字符），用于展示“约 N 字” */
  contentLength: number
}

export interface SpacePhotoView {
  photoId: string
  title: string
  description: string
  url: string
  /** 原始拍摄时间（后端 yyyy-MM-dd HH:mm:ss），缺失时为空字符串 */
  takenTime: string
  /** 拍摄时间展示文本（yyyy.MM.dd），缺失时为空字符串 */
  dateText: string
  /** 拍摄地点，缺失时为空字符串 */
  location: string
  /** 图片加载失败时由页面置为 true，回退到占位 */
  failed?: boolean
}

/**
 * 公开故事详情展示模型。
 *
 * story 为详情接口返回的原始结构归一化结果，blocks 为解析后的正文块，
 * 两者都来自 `/gallery/space/story/detail`，不依赖列表索引或临时缓存。
 */
export interface SpaceStoryDetailView {
  spaceId: string
  story: SpaceStoryView
  /** 原样保留的正文 Markdown，用于分享 / 复制等后续能力 */
  content: string
  /** 解析后的正文块，直接交给 WXML 渲染 */
  blocks: StoryContentBlock[]
  /** 正文内图片地址，用于预览 */
  contentImages: string[]
  totalWords: number
  readTime: string
  formattedDate: string
}

/** 正文块：由 utils/story-content 的 Markdown 解析产出。 */
export interface StoryContentBlock {
  /** 稳定 key，用于 wx:key */
  key: string
  type: 'heading' | 'paragraph' | 'quote' | 'list' | 'code' | 'image' | 'divider'
  text?: string
  language?: string
  level?: number
  alt?: string
  url?: string
}

/** 公开照片详情展示模型。 */
export interface SpacePhotoDetailView {
  spaceId: string
  photo: SpacePhotoView
  /** 同一空间的公开照片，按接口顺序，用于左右滑动切换 */
  photos: SpacePhotoView[]
  /** 当前照片在 photos 中的下标 */
  index: number
  /** 拍摄时间展示文本（yyyy年MM月dd日 HH:mm），缺失时为“拍摄时间未记录” */
  formattedDateTime: string
}

export interface SpaceAnniversaryView {
  anniversaryId: string
  title: string
  description: string
  dateText: string
  location: string
}
