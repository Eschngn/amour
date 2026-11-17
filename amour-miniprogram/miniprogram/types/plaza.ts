/**
 * 恋爱广场（公开空间）数据类型。
 *
 * 字段以 amour-springboot GalleryController / GallerySpaceCardVO 为准：
 * - POST /gallery/spaces            → PageResult<GallerySpaceCardVO>
 * - POST /gallery/space/detail      → GallerySpaceDetailVO
 * 这两个接口匿名可访问，只返回后端审核通过并公开的字段，
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
  tagColor?: string | null
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
  colorCode?: string | null
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
  tagColor?: string | null
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
}

export interface SpacePhotoView {
  photoId: string
  title: string
  description: string
  url: string
  /** 图片加载失败时由页面置为 true，回退到占位 */
  failed?: boolean
}

export interface SpaceAnniversaryView {
  anniversaryId: string
  title: string
  description: string
  dateText: string
  location: string
}
